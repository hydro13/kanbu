/*
 * Project Group Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for managing project groups within workspaces.
 * Project groups are used to categorize/organize projects.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 * ===================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'

// =============================================================================
// Input Schemas
// =============================================================================

const listGroupsSchema = z.object({
  workspaceId: z.number(),
  includeArchived: z.boolean().default(false),
})

const getGroupSchema = z.object({
  id: z.number(),
})

const createGroupSchema = z.object({
  workspaceId: z.number(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.enum(['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'pink', 'cyan']).default('blue'),
})

const updateGroupSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  color: z.enum(['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'pink', 'cyan']).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
})

const deleteGroupSchema = z.object({
  id: z.number(),
})

const addProjectSchema = z.object({
  groupId: z.number(),
  projectId: z.number(),
})

const removeProjectSchema = z.object({
  groupId: z.number(),
  projectId: z.number(),
})

const reorderProjectsSchema = z.object({
  groupId: z.number(),
  projectOrders: z.array(z.object({
    projectId: z.number(),
    position: z.number(),
  })),
})

// =============================================================================
// Project Group Router
// =============================================================================

export const projectGroupRouter = router({
  /**
   * List project groups in a workspace
   */
  list: protectedProcedure
    .input(listGroupsSchema)
    .query(async ({ ctx, input }) => {
      const groups = await ctx.prisma.projectGroup.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.includeArchived ? {} : { status: { not: 'CLOSED' } }),
        },
        include: {
          projects: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  identifier: true,
                  description: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
          _count: {
            select: { projects: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        color: g.color,
        status: g.status,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        projectCount: g._count.projects,
        projects: g.projects.map((p) => ({
          id: p.project.id,
          name: p.project.name,
          identifier: p.project.identifier,
          description: p.project.description,
          position: p.position,
        })),
      }))
    }),

  /**
   * Get a single project group
   */
  get: protectedProcedure
    .input(getGroupSchema)
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.projectGroup.findUnique({
        where: { id: input.id },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          projects: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  identifier: true,
                  description: true,
                },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      })

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project group not found',
        })
      }

      return {
        ...group,
        projects: group.projects.map((p) => ({
          id: p.project.id,
          name: p.project.name,
          identifier: p.project.identifier,
          description: p.project.description,
          position: p.position,
        })),
      }
    }),

  /**
   * Create a new project group
   */
  create: protectedProcedure
    .input(createGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.projectGroup.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          description: input.description,
          color: input.color,
          status: 'ACTIVE',
        },
      })

      return group
    }),

  /**
   * Update a project group
   */
  update: protectedProcedure
    .input(updateGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input

      const group = await ctx.prisma.projectGroup.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.color ? { color: data.color } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
      })

      return group
    }),

  /**
   * Delete a project group (removes group, not projects)
   */
  delete: protectedProcedure
    .input(deleteGroupSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.projectGroup.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * Add a project to a group
   */
  addProject: protectedProcedure
    .input(addProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Get max position
      const maxPos = await ctx.prisma.projectGroupMember.aggregate({
        where: { projectGroupId: input.groupId },
        _max: { position: true },
      })

      const member = await ctx.prisma.projectGroupMember.create({
        data: {
          projectGroupId: input.groupId,
          projectId: input.projectId,
          position: (maxPos._max.position ?? 0) + 1,
        },
      })

      return member
    }),

  /**
   * Remove a project from a group
   */
  removeProject: protectedProcedure
    .input(removeProjectSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.projectGroupMember.deleteMany({
        where: {
          projectGroupId: input.groupId,
          projectId: input.projectId,
        },
      })

      return { success: true }
    }),

  /**
   * Reorder projects in a group
   */
  reorderProjects: protectedProcedure
    .input(reorderProjectsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.projectOrders.map((order) =>
          ctx.prisma.projectGroupMember.updateMany({
            where: {
              projectGroupId: input.groupId,
              projectId: order.projectId,
            },
            data: { position: order.position },
          })
        )
      )

      return { success: true }
    }),

  /**
   * Get ungrouped projects in a workspace
   */
  getUngrouped: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get all project IDs that are in a group
      const groupedProjectIds = await ctx.prisma.projectGroupMember.findMany({
        where: {
          projectGroup: { workspaceId: input.workspaceId },
        },
        select: { projectId: true },
      })

      const groupedIds = groupedProjectIds.map((p) => p.projectId)

      // Get projects not in any group
      const ungrouped = await ctx.prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          isActive: true,
          ...(groupedIds.length > 0 ? { id: { notIn: groupedIds } } : {}),
        },
        select: {
          id: true,
          name: true,
          identifier: true,
          description: true,
        },
        orderBy: { name: 'asc' },
      })

      return ungrouped
    }),
})
