/*
 * Project Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for project management within workspaces.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 *
 * Modified by:
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:47 CET
 * Change: Added activeTaskCount and completedTaskCount to project.list (USER-02)
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import {
  createDefaultColumns,
  createDefaultSwimlane,
  generateProjectIdentifier,
} from '../../lib/project'
import { permissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const createProjectSchema = z.object({
  workspaceId: z.number(),
  name: z.string().min(1).max(255),
  identifier: z.string().max(10).optional(),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().default(false),
})

const updateProjectSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
})

const projectIdSchema = z.object({
  projectId: z.number(),
})

const workspaceProjectsSchema = z.object({
  workspaceId: z.number(),
  includeArchived: z.boolean().default(false),
})

const addMemberSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']).default('MEMBER'),
})

const updateMemberRoleSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']),
})

const removeMemberSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
})

// =============================================================================
// Project Router
// =============================================================================

export const projectRouter = router({
  /**
   * Create a new project in a workspace
   * Requires MEMBER or higher workspace access
   * Creator becomes project OWNER
   */
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Check workspace access
      await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'MEMBER')

      // Generate identifier if not provided
      const identifier = input.identifier || await generateProjectIdentifier(input.name, input.workspaceId)

      // Create project with creator as OWNER
      const project = await ctx.prisma.project.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          identifier,
          description: input.description,
          isPublic: input.isPublic,
          members: {
            create: {
              userId: ctx.user.id,
              role: 'OWNER',
            },
          },
        },
        select: {
          id: true,
          name: true,
          identifier: true,
          description: true,
          isPublic: true,
          createdAt: true,
        },
      })

      // Create default columns and swimlane
      await Promise.all([
        createDefaultColumns(project.id),
        createDefaultSwimlane(project.id),
      ])

      return project
    }),

  /**
   * List projects in a workspace
   * Requires workspace access (VIEWER sees public projects, members see assigned)
   */
  list: protectedProcedure
    .input(workspaceProjectsSchema)
    .query(async ({ ctx, input }) => {
      const access = await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'VIEWER')

      // Workspace OWNER/ADMIN sees all projects
      const isWorkspaceAdmin = access.role === 'OWNER' || access.role === 'ADMIN'

      const projects = await ctx.prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          isActive: input.includeArchived ? undefined : true,
          ...(isWorkspaceAdmin ? {} : {
            OR: [
              // Public projects
              { isPublic: true },
              // Projects user is direct member of (via ProjectMember)
              { members: { some: { userId: ctx.user.id } } },
              // Projects user is member of via PROJECT groups
              {
                groups: {
                  some: {
                    type: 'PROJECT',
                    members: { some: { userId: ctx.user.id } },
                  },
                },
              },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          identifier: true,
          description: true,
          isPublic: true,
          isActive: true,
          startDate: true,
          endDate: true,
          lastActivityAt: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
            },
          },
          tasks: {
            select: { isActive: true },
          },
          members: {
            where: { userId: ctx.user.id },
            select: { role: true },
          },
          // Check if user is member via PROJECT groups
          groups: {
            where: {
              type: 'PROJECT',
              members: { some: { userId: ctx.user.id } },
            },
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { lastActivityAt: { sort: 'desc', nulls: 'last' } },
          { name: 'asc' },
        ],
      })

      return projects.map((p) => {
        const activeTaskCount = p.tasks.filter((t) => t.isActive).length
        const completedTaskCount = p.tasks.filter((t) => !t.isActive).length
        // Get user role from direct membership
        // For group-based membership, default to MEMBER role
        const directRole = p.members[0]?.role
        const isGroupMember = p.groups.length > 0
        const userRole = directRole ?? (isGroupMember ? 'MEMBER' : null)
        return {
          id: p.id,
          name: p.name,
          identifier: p.identifier,
          description: p.description,
          isPublic: p.isPublic,
          isActive: p.isActive,
          startDate: p.startDate,
          endDate: p.endDate,
          lastActivityAt: p.lastActivityAt,
          createdAt: p.createdAt,
          taskCount: p.tasks.length,
          activeTaskCount,
          completedTaskCount,
          memberCount: p._count.members,
          userRole,
        }
      })
    }),

  /**
   * Get project details with columns and swimlanes
   * Requires at least VIEWER access
   */
  get: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const access = await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: {
          id: true,
          workspaceId: true,
          name: true,
          identifier: true,
          description: true,
          isPublic: true,
          isActive: true,
          startDate: true,
          endDate: true,
          settings: true,
          lastActivityAt: true,
          createdAt: true,
          updatedAt: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          columns: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              position: true,
              taskLimit: true,
              isCollapsed: true,
              showClosed: true,
            },
          },
          swimlanes: {
            where: { isActive: true },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              position: true,
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      return {
        ...project,
        taskCount: project._count.tasks,
        memberCount: project._count.members,
        userRole: access.role,
      }
    }),

  /**
   * Update project settings
   * Requires MANAGER or OWNER access
   */
  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER')

      const { projectId, startDate, endDate, ...updateData } = input

      const project = await ctx.prisma.project.update({
        where: { id: projectId },
        data: {
          ...updateData,
          ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        },
        select: {
          id: true,
          name: true,
          identifier: true,
          description: true,
          isPublic: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
        },
      })

      return project
    }),

  /**
   * Soft delete a project (set isActive = false)
   * Requires OWNER access
   */
  delete: protectedProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'OWNER')

      if (!permissionService.hasMinProjectRole(access.role, 'OWNER')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the project owner can delete it',
        })
      }

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { isActive: false },
      })

      return { success: true }
    }),

  /**
   * Archive a project (same as soft delete for now)
   * Requires MANAGER or OWNER access
   */
  archive: protectedProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER')

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { isActive: false },
      })

      return { success: true }
    }),

  /**
   * Unarchive a project
   * Requires MANAGER or OWNER access
   */
  unarchive: protectedProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      // Need to check archived project - skip isActive check
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Check workspace admin access for unarchiving
      await permissionService.requireWorkspaceAccess(ctx.user.id, project.workspaceId, 'ADMIN')

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { isActive: true },
      })

      return { success: true }
    }),

  /**
   * Get project members
   * Requires VIEWER access
   */
  getMembers: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const members = await ctx.prisma.projectMember.findMany({
        where: { projectId: input.projectId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' }, // OWNER, MANAGER, MEMBER, VIEWER (alphabetically works here)
          { joinedAt: 'asc' },
        ],
      })

      return members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      }))
    }),

  /**
   * Add a member to the project
   * Requires MANAGER or OWNER access
   * User must be a workspace member
   */
  addMember: protectedProcedure
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER')

      // Get project to check workspace
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      })

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }

      // Check if target user is a workspace member
      const workspaceMember = await ctx.prisma.workspaceUser.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: input.userId,
          },
        },
      })

      if (!workspaceMember) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User must be a workspace member first',
        })
      }

      // Check if already a member
      const existingMember = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
      })

      if (existingMember) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a project member',
        })
      }

      // Only OWNER can add MANAGER role
      if (input.role === 'MANAGER' && !permissionService.hasMinProjectRole(access.role, 'OWNER')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only project owner can add managers',
        })
      }

      await ctx.prisma.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
        },
      })

      return { success: true }
    }),

  /**
   * Remove a member from the project
   * Requires MANAGER or OWNER access
   * Cannot remove OWNER
   */
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER')

      // Get target member
      const targetMember = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
      })

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Cannot remove OWNER
      if (targetMember.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove the project owner',
        })
      }

      // MANAGER cannot remove other MANAGERs (only OWNER can)
      if (targetMember.role === 'MANAGER' && !permissionService.hasMinProjectRole(access.role, 'OWNER')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the owner can remove managers',
        })
      }

      await ctx.prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
      })

      return { success: true }
    }),

  /**
   * Update a member's role
   * Requires OWNER access for MANAGER role changes
   * MANAGER can change MEMBER/VIEWER roles
   */
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER')

      // Get target member
      const targetMember = await ctx.prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
      })

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        })
      }

      // Cannot change OWNER role
      if (targetMember.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change the owner role',
        })
      }

      // Only OWNER can promote to/demote from MANAGER
      if (
        (input.role === 'MANAGER' || targetMember.role === 'MANAGER') &&
        !permissionService.hasMinProjectRole(access.role, 'OWNER')
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the owner can manage manager roles',
        })
      }

      await ctx.prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId: input.projectId,
            userId: input.userId,
          },
        },
        data: { role: input.role },
      })

      return { success: true, newRole: input.role }
    }),
})
