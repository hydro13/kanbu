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

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { router, protectedProcedure } from '../router';
import {
  createDefaultColumns,
  createDefaultSwimlane,
  generateProjectIdentifier,
} from '../../lib/project';
import { permissionService } from '../../services';
import { aclService, ACL_PERMISSIONS, ACL_PRESETS } from '../../services/aclService';
import { auditService, AUDIT_ACTIONS } from '../../services/auditService';

// =============================================================================
// Input Schemas
// =============================================================================

const createProjectSchema = z.object({
  workspaceId: z.number(),
  name: z.string().min(1).max(255),
  identifier: z.string().max(10).optional(),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().default(false),
});

const updateProjectSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  isPublic: z.boolean().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
});

const projectIdSchema = z.object({
  projectId: z.number(),
});

const projectIdentifierSchema = z.object({
  identifier: z.string().min(1).max(10),
});

const workspaceProjectsSchema = z.object({
  workspaceId: z.number(),
  includeArchived: z.boolean().default(false),
});

const addMemberSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
  role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']),
});

const removeMemberSchema = z.object({
  projectId: z.number(),
  userId: z.number(),
});

// =============================================================================
// Project Router
// =============================================================================

export const projectRouter = router({
  /**
   * Create a new project in a workspace
   * Requires MEMBER or higher workspace access
   * Creator becomes project OWNER
   */
  create: protectedProcedure.input(createProjectSchema).mutation(async ({ ctx, input }) => {
    // Check workspace access
    await permissionService.requireWorkspaceAccess(ctx.user.id, input.workspaceId, 'MEMBER');

    // Generate identifier if not provided
    const identifier =
      input.identifier || (await generateProjectIdentifier(input.name, input.workspaceId));

    // Create project (ACL-only, no legacy ProjectMember)
    const project = await ctx.prisma.project.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        identifier,
        description: input.description,
        isPublic: input.isPublic,
      },
      select: {
        id: true,
        name: true,
        identifier: true,
        description: true,
        isPublic: true,
        createdAt: true,
      },
    });

    // Create ACL entry for creator with FULL_CONTROL
    await aclService.grantPermission({
      resourceType: 'project',
      resourceId: project.id,
      principalType: 'user',
      principalId: ctx.user.id,
      permissions: ACL_PRESETS.FULL_CONTROL,
      inheritToChildren: false, // Projects don't inherit to children (tasks use different model)
      createdById: ctx.user.id,
    });

    // Create default columns and swimlane
    await Promise.all([createDefaultColumns(project.id), createDefaultSwimlane(project.id)]);

    return project;
  }),

  /**
   * List projects in a workspace
   * Requires workspace access (VIEWER sees public projects, members see assigned)
   * Also includes projects accessible via ACL
   */
  list: protectedProcedure.input(workspaceProjectsSchema).query(async ({ ctx, input }) => {
    const access = await permissionService.requireWorkspaceAccess(
      ctx.user.id,
      input.workspaceId,
      'VIEWER'
    );

    // Workspace OWNER/ADMIN sees all projects
    const isWorkspaceAdmin = access.role === 'OWNER' || access.role === 'ADMIN';

    // Get user's group IDs for ACL check
    const userGroups = await ctx.prisma.groupMember.findMany({
      where: { userId: ctx.user.id },
      select: { groupId: true },
    });
    const groupIds = userGroups.map((g) => g.groupId);

    // Get project IDs accessible via ACL (user or group entries with READ permission)
    const aclProjectEntries = await ctx.prisma.aclEntry.findMany({
      where: {
        resourceType: 'project',
        resourceId: { not: null },
        deny: false,
        OR: [
          { principalType: 'user', principalId: ctx.user.id },
          ...(groupIds.length > 0
            ? [{ principalType: 'group', principalId: { in: groupIds } }]
            : []),
        ],
      },
      select: { resourceId: true, permissions: true },
    });
    // Filter to only entries with READ permission
    const aclProjectIds = aclProjectEntries
      .filter((e) => e.resourceId !== null && (e.permissions & ACL_PERMISSIONS.READ) !== 0)
      .map((e) => e.resourceId as number);

    const projects = await ctx.prisma.project.findMany({
      where: {
        workspaceId: input.workspaceId,
        isActive: input.includeArchived ? undefined : true,
        ...(isWorkspaceAdmin
          ? {}
          : {
              OR: [
                // Public projects
                { isPublic: true },
                // Projects user is member of via PROJECT groups
                {
                  groups: {
                    some: {
                      type: 'PROJECT',
                      members: { some: { userId: ctx.user.id } },
                    },
                  },
                },
                // Projects accessible via ACL
                ...(aclProjectIds.length > 0 ? [{ id: { in: aclProjectIds } }] : []),
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
        tasks: {
          select: { isActive: true },
        },
        // GitHub repository info
        githubRepositories: {
          select: {
            id: true,
            fullName: true,
            syncEnabled: true,
            lastSyncAt: true,
            isPrimary: true,
          },
          orderBy: { isPrimary: 'desc' },
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
      orderBy: [{ lastActivityAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    });

    // Create a map of project ID -> ACL permissions for quick lookup
    const aclPermissionsMap = new Map<number, number>();
    for (const entry of aclProjectEntries) {
      if (entry.resourceId !== null) {
        const existing = aclPermissionsMap.get(entry.resourceId) ?? 0;
        aclPermissionsMap.set(entry.resourceId, existing | entry.permissions);
      }
    }

    // Get member counts from ACL entries for all projects in this list
    const projectIds = projects.map((p) => p.id);
    const memberCounts = await ctx.prisma.aclEntry.groupBy({
      by: ['resourceId'],
      where: {
        resourceType: 'project',
        resourceId: { in: projectIds },
        principalType: 'user',
        deny: false,
      },
      _count: { principalId: true },
    });
    const memberCountMap = new Map(memberCounts.map((m) => [m.resourceId, m._count.principalId]));

    return projects.map((p) => {
      const activeTaskCount = p.tasks.filter((t) => t.isActive).length;
      const completedTaskCount = p.tasks.filter((t) => !t.isActive).length;
      // For group-based membership, default to MEMBER role
      // For ACL-based access, map permissions to role
      const isGroupMember = p.groups.length > 0;
      const aclPerms = aclPermissionsMap.get(p.id);

      type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
      let userRole: ProjectRole | null = null;
      if (isGroupMember) {
        userRole = 'MEMBER';
      }
      if (!userRole && aclPerms !== undefined) {
        // Map ACL permissions to role
        if (aclPerms & ACL_PERMISSIONS.PERMISSIONS) userRole = 'OWNER';
        else if (aclPerms & ACL_PERMISSIONS.DELETE) userRole = 'MANAGER';
        else if (aclPerms & ACL_PERMISSIONS.WRITE) userRole = 'MEMBER';
        else if (aclPerms & ACL_PERMISSIONS.READ) userRole = 'VIEWER';
      }

      // Get primary GitHub repo (first one, which is primary due to orderBy)
      const primaryRepo = p.githubRepositories[0];
      const hasGitHub = p.githubRepositories.length > 0;

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
        memberCount: memberCountMap.get(p.id) ?? 0,
        userRole,
        // GitHub integration info
        hasGitHub,
        github: hasGitHub
          ? {
              repoCount: p.githubRepositories.length,
              primaryRepo: primaryRepo
                ? {
                    fullName: primaryRepo.fullName,
                    syncEnabled: primaryRepo.syncEnabled,
                    lastSyncAt: primaryRepo.lastSyncAt,
                  }
                : null,
            }
          : null,
      };
    });
  }),

  /**
   * Get project details with columns and swimlanes
   * Requires at least VIEWER access
   */
  get: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    const access = await permissionService.requireProjectAccess(
      ctx.user.id,
      input.projectId,
      'VIEWER'
    );

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
            isArchive: true,
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
          },
        },
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Get member count from ACL entries
    const memberCount = await ctx.prisma.aclEntry.count({
      where: {
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        deny: false,
      },
    });

    return {
      ...project,
      taskCount: project._count.tasks,
      memberCount,
      userRole: access.role,
    };
  }),

  /**
   * Get project details by identifier (SEO-friendly URL support)
   * Requires at least VIEWER access
   */
  getByIdentifier: protectedProcedure
    .input(projectIdentifierSchema)
    .query(async ({ ctx, input }) => {
      // First find the project by identifier
      const projectLookup = await ctx.prisma.project.findFirst({
        where: { identifier: input.identifier },
        select: { id: true },
      });

      if (!projectLookup) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check access
      const access = await permissionService.requireProjectAccess(
        ctx.user.id,
        projectLookup.id,
        'VIEWER'
      );

      // Get full project details
      const project = await ctx.prisma.project.findUnique({
        where: { id: projectLookup.id },
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
              isArchive: true,
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
            },
          },
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Get member count from ACL entries
      const memberCount = await ctx.prisma.aclEntry.count({
        where: {
          resourceType: 'project',
          resourceId: projectLookup.id,
          principalType: 'user',
          deny: false,
        },
      });

      return {
        ...project,
        taskCount: project._count.tasks,
        memberCount,
        userRole: access.role,
      };
    }),

  /**
   * Update project settings
   * Requires MANAGER or OWNER access
   */
  update: protectedProcedure.input(updateProjectSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER');

    const { projectId, startDate, endDate, ...updateData } = input;

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
    });

    return project;
  }),

  /**
   * Update project settings JSON
   * Requires MANAGER or OWNER access
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        settings: z
          .object({
            showArchiveColumn: z.boolean().optional(),
          })
          .passthrough(), // Allow other settings
      })
    )
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER');

      // Get current settings
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { settings: true },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Merge new settings with existing
      const currentSettings = (project.settings ?? {}) as Record<string, unknown>;
      const newSettings = { ...currentSettings, ...input.settings };

      const updated = await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { settings: newSettings as Prisma.InputJsonValue },
        select: {
          id: true,
          settings: true,
          updatedAt: true,
        },
      });

      // Audit Log
      await auditService.logProjectEvent({
        action: AUDIT_ACTIONS.PROJECT_UPDATED,
        resourceType: 'project',
        resourceId: updated.id,
        /**
         * @todo Retrieve name if essential, skipping for perf optimization
         */
        resourceName: 'Project Settings',
        userId: ctx.user.id,
        changes: { settings: input.settings } as Prisma.InputJsonValue,
        metadata: {
          via: ctx.assistantContext ? 'assistant' : 'web',
          ...(ctx.assistantContext && {
            machineId: ctx.assistantContext.machineId,
            machineName: ctx.assistantContext.machineName,
            bindingId: ctx.assistantContext.bindingId,
          }),
        },
      });

      return updated;
    }),

  /**
   * Soft delete a project (set isActive = false)
   * Requires OWNER access
   */
  delete: protectedProcedure.input(projectIdSchema).mutation(async ({ ctx, input }) => {
    const access = await permissionService.requireProjectAccess(
      ctx.user.id,
      input.projectId,
      'OWNER'
    );

    if (!permissionService.hasMinProjectRole(access.role, 'OWNER')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the project owner can delete it',
      });
    }

    await ctx.prisma.project.update({
      where: { id: input.projectId },
      data: { isActive: false },
    });

    // Audit Log
    await auditService.logProjectEvent({
      action: AUDIT_ACTIONS.PROJECT_ARCHIVED,
      resourceType: 'project',
      resourceId: input.projectId,
      resourceName: `Project ${input.projectId}`,
      userId: ctx.user.id,
      metadata: {
        via: ctx.assistantContext ? 'assistant' : 'web',
        ...(ctx.assistantContext && {
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        }),
      },
    });

    return { success: true };
  }),

  /**
   * Archive a project (same as soft delete for now)
   * Requires MANAGER or OWNER access
   */
  archive: protectedProcedure.input(projectIdSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER');

    await ctx.prisma.project.update({
      where: { id: input.projectId },
      data: { isActive: false },
    });

    // Audit Log
    await auditService.logProjectEvent({
      action: AUDIT_ACTIONS.PROJECT_ARCHIVED,
      resourceType: 'project',
      resourceId: input.projectId,
      resourceName: `Project ${input.projectId}`,
      userId: ctx.user.id,
      metadata: {
        via: ctx.assistantContext ? 'assistant' : 'web',
        ...(ctx.assistantContext && {
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        }),
      },
    });

    return { success: true };
  }),

  /**
   * Unarchive a project
   * Requires MANAGER or OWNER access
   */
  unarchive: protectedProcedure.input(projectIdSchema).mutation(async ({ ctx, input }) => {
    // Need to check archived project - skip isActive check
    const project = await ctx.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check workspace admin access for unarchiving
    await permissionService.requireWorkspaceAccess(ctx.user.id, project.workspaceId, 'ADMIN');

    await ctx.prisma.project.update({
      where: { id: input.projectId },
      data: { isActive: true },
    });

    // Audit Log
    await auditService.logProjectEvent({
      action: AUDIT_ACTIONS.PROJECT_RESTORED,
      resourceType: 'project',
      resourceId: input.projectId,
      resourceName: `Project ${input.projectId}`,
      userId: ctx.user.id,
      workspaceId: project.workspaceId,
      metadata: {
        via: ctx.assistantContext ? 'assistant' : 'web',
        ...(ctx.assistantContext && {
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        }),
      },
    });

    return { success: true };
  }),

  /**
   * Get project members from ACL
   * Requires VIEWER access
   */
  getMembers: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    // Get members from ACL entries for this project
    const aclEntries = await ctx.prisma.aclEntry.findMany({
      where: {
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        deny: false,
      },
    });

    // Get user details for all principals
    const userIds = aclEntries.map((e) => e.principalId);
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatarUrl: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Map ACL permissions to project roles
    const members: Array<{
      id: number;
      email: string;
      username: string;
      name: string | null;
      avatarUrl: string | null;
      role: string;
      joinedAt: Date;
    }> = [];

    for (const entry of aclEntries) {
      const user = userMap.get(entry.principalId);
      if (!user) continue;

      // Determine role based on permissions
      let role: string;
      if (entry.permissions & ACL_PERMISSIONS.PERMISSIONS) {
        role = 'OWNER'; // Has P bit = can manage permissions = owner
      } else if (entry.permissions & ACL_PERMISSIONS.DELETE) {
        role = 'MANAGER'; // Has D bit = can delete = manager
      } else if (entry.permissions & ACL_PERMISSIONS.WRITE) {
        role = 'MEMBER'; // Has W bit = can modify = member
      } else if (entry.permissions & ACL_PERMISSIONS.READ) {
        role = 'VIEWER'; // R bit only = viewer
      } else {
        continue; // No relevant permissions
      }

      members.push({
        ...user,
        role,
        joinedAt: entry.createdAt,
      });
    }

    // Sort: OWNER first, then MANAGER, MEMBER, VIEWER
    const roleOrder: Record<string, number> = { OWNER: 0, MANAGER: 1, MEMBER: 2, VIEWER: 3 };
    members.sort((a, b) => {
      const roleCompare = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
      if (roleCompare !== 0) return roleCompare;
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    return members;
  }),

  /**
   * Add a member to the project
   * Requires MANAGER or OWNER access
   * User must be a workspace member
   */
  addMember: protectedProcedure.input(addMemberSchema).mutation(async ({ ctx, input }) => {
    const access = await permissionService.requireProjectAccess(
      ctx.user.id,
      input.projectId,
      'MANAGER'
    );

    // Get project to check workspace
    const project = await ctx.prisma.project.findUnique({
      where: { id: input.projectId },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if target user is a workspace member (via ACL)
    const workspaceAcl = await ctx.prisma.aclEntry.findFirst({
      where: {
        resourceType: 'workspace',
        resourceId: project.workspaceId,
        principalType: 'user',
        principalId: input.userId,
        deny: false,
      },
    });

    if (!workspaceAcl) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User must be a workspace member first',
      });
    }

    // Check if already a project member (via ACL)
    const existingAcl = await ctx.prisma.aclEntry.findFirst({
      where: {
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        principalId: input.userId,
        deny: false,
      },
    });

    if (existingAcl) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a project member',
      });
    }

    // Only OWNER can add MANAGER role
    if (input.role === 'MANAGER' && !permissionService.hasMinProjectRole(access.role, 'OWNER')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only project owner can add managers',
      });
    }

    // Create ACL entry for the user (ACL-only, no legacy ProjectMember)
    const aclPermissions =
      input.role === 'MANAGER'
        ? ACL_PRESETS.EDITOR
        : input.role === 'MEMBER'
          ? ACL_PRESETS.CONTRIBUTOR
          : ACL_PRESETS.READ_ONLY; // VIEWER

    await aclService.grantPermission({
      resourceType: 'project',
      resourceId: input.projectId,
      principalType: 'user',
      principalId: input.userId,
      permissions: aclPermissions,
      inheritToChildren: false,
      createdById: ctx.user.id,
    });

    return { success: true };
  }),

  /**
   * Remove a member from the project
   * Requires MANAGER or OWNER access
   * Cannot remove OWNER
   */
  removeMember: protectedProcedure.input(removeMemberSchema).mutation(async ({ ctx, input }) => {
    const access = await permissionService.requireProjectAccess(
      ctx.user.id,
      input.projectId,
      'MANAGER'
    );

    // Get target member from ACL
    const targetAcl = await ctx.prisma.aclEntry.findFirst({
      where: {
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        principalId: input.userId,
        deny: false,
      },
    });

    if (!targetAcl) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found',
      });
    }

    // Check if target is owner (has P bit = FULL_CONTROL)
    const isTargetOwner = (targetAcl.permissions & ACL_PERMISSIONS.PERMISSIONS) !== 0;
    if (isTargetOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot remove the project owner',
      });
    }

    // Check if target is manager (has D bit = EDITOR)
    const isTargetManager = (targetAcl.permissions & ACL_PERMISSIONS.DELETE) !== 0;

    // MANAGER cannot remove other MANAGERs (only OWNER can)
    if (isTargetManager && !permissionService.hasMinProjectRole(access.role, 'OWNER')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the owner can remove managers',
      });
    }

    // Revoke ACL permissions for this project (ACL-only, no legacy)
    await aclService.revokePermission({
      resourceType: 'project',
      resourceId: input.projectId,
      principalType: 'user',
      principalId: input.userId,
    });

    return { success: true };
  }),

  /**
   * Update a member's role
   * Requires OWNER access for MANAGER role changes
   * MANAGER can change MEMBER/VIEWER roles
   */
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await permissionService.requireProjectAccess(
        ctx.user.id,
        input.projectId,
        'MANAGER'
      );

      // Get target member from ACL
      const targetAcl = await ctx.prisma.aclEntry.findFirst({
        where: {
          resourceType: 'project',
          resourceId: input.projectId,
          principalType: 'user',
          principalId: input.userId,
          deny: false,
        },
      });

      if (!targetAcl) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      // Check if target is owner (has P bit)
      const isTargetOwner = (targetAcl.permissions & ACL_PERMISSIONS.PERMISSIONS) !== 0;
      if (isTargetOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change the owner role',
        });
      }

      // Check if target is currently manager (has D bit)
      const isTargetManager = (targetAcl.permissions & ACL_PERMISSIONS.DELETE) !== 0;

      // Only OWNER can promote to/demote from MANAGER
      if (
        (input.role === 'MANAGER' || isTargetManager) &&
        !permissionService.hasMinProjectRole(access.role, 'OWNER')
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the owner can manage manager roles',
        });
      }

      // Update ACL permissions based on new role (ACL-only, no legacy)
      const aclPermissions =
        input.role === 'MANAGER'
          ? ACL_PRESETS.EDITOR
          : input.role === 'MEMBER'
            ? ACL_PRESETS.CONTRIBUTOR
            : ACL_PRESETS.READ_ONLY; // VIEWER

      await aclService.revokePermission({
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        principalId: input.userId,
      });

      await aclService.grantPermission({
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        principalId: input.userId,
        permissions: aclPermissions,
        inheritToChildren: false,
        createdById: ctx.user.id,
      });

      return { success: true, newRole: input.role };
    }),
});
