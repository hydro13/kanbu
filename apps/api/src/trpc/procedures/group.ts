/*
 * Group Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for AD-style group management.
 * Groups provide LDAP-compatible permission structure.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-05
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { groupPermissionService, scopeService, auditService, AUDIT_ACTIONS } from '../../services';
import {
  emitGroupCreated,
  emitGroupUpdated,
  emitGroupDeleted,
  emitGroupMemberAdded,
  emitGroupMemberRemoved,
} from '../../socket/emitter';

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Check if user can manage groups.
 * Returns the workspaces they can admin (or 'all' for Domain Admins/Super Admins).
 */
async function getGroupManagementScope(
  userId: number,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<{ isDomainAdmin: boolean; adminWorkspaceIds: number[] }> {
  // Check if Super Admin (AppRole.ADMIN) first
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === 'ADMIN') {
    return { isDomainAdmin: true, adminWorkspaceIds: [] };
  }

  // Check if Domain Admin (member of "Domain Admins" group)
  const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
  if (isDomainAdmin) {
    return { isDomainAdmin: true, adminWorkspaceIds: [] };
  }

  // Get workspaces where user is admin
  const adminMemberships = await prisma.groupMember.findMany({
    where: {
      userId,
      group: {
        type: 'WORKSPACE_ADMIN',
        isActive: true,
      },
    },
    include: {
      group: { select: { workspaceId: true } },
    },
  });

  const adminWorkspaceIds = adminMemberships
    .map((m) => m.group.workspaceId)
    .filter((id): id is number => id !== null);

  return { isDomainAdmin: false, adminWorkspaceIds };
}

/**
 * Check if user can access/manage a specific group.
 */
async function canManageGroup(
  userId: number,
  groupId: number,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<{
  canManage: boolean;
  group: {
    id: number;
    type: string;
    workspaceId: number | null;
    isSystem: boolean;
    name: string;
    displayName: string;
    description: string | null;
    isActive: boolean;
  } | null;
}> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      type: true,
      workspaceId: true,
      isSystem: true,
      name: true,
      displayName: true,
      description: true,
      isActive: true,
    },
  });

  if (!group) {
    return { canManage: false, group: null };
  }

  const scope = await getGroupManagementScope(userId, prisma);

  // Domain Admins can manage all groups
  if (scope.isDomainAdmin) {
    return { canManage: true, group };
  }

  // SYSTEM groups can ONLY be managed by Domain Admins
  if (group.type === 'SYSTEM') {
    return { canManage: false, group };
  }

  // Workspace-scoped groups: check if user is admin of that workspace
  if (group.workspaceId && scope.adminWorkspaceIds.includes(group.workspaceId)) {
    return { canManage: true, group };
  }

  return { canManage: false, group };
}

/**
 * Check if a user can add members to a group.
 * Prevents privilege escalation attacks.
 */
async function canAddMemberToGroup(
  actorId: number,
  _targetUserId: number,
  groupId: number,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<{ canAdd: boolean; reason?: string }> {
  const { canManage, group } = await canManageGroup(actorId, groupId, prisma);

  if (!group) {
    return { canAdd: false, reason: 'Group not found' };
  }

  if (!canManage) {
    return { canAdd: false, reason: 'You do not have permission to manage this group' };
  }

  const scope = await getGroupManagementScope(actorId, prisma);

  // Non-Domain-Admins cannot add users to:
  // 1. SYSTEM groups (Domain Admins)
  // 2. WORKSPACE_ADMIN groups of workspaces they don't admin
  if (!scope.isDomainAdmin) {
    if (group.type === 'SYSTEM') {
      return { canAdd: false, reason: 'Only Domain Admins can manage system groups' };
    }

    if (group.type === 'WORKSPACE_ADMIN') {
      // Workspace admins CAN add users to their own workspace admin groups
      // But verify they actually admin this workspace
      if (!group.workspaceId || !scope.adminWorkspaceIds.includes(group.workspaceId)) {
        return {
          canAdd: false,
          reason: 'You cannot add members to admin groups of other workspaces',
        };
      }
    }
  }

  return { canAdd: true };
}

// =============================================================================
// Input Schemas
// =============================================================================

const listGroupsSchema = z.object({
  type: z
    .enum(['SYSTEM', 'WORKSPACE', 'WORKSPACE_ADMIN', 'PROJECT', 'PROJECT_ADMIN', 'CUSTOM'])
    .optional(),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getGroupSchema = z.object({
  groupId: z.number(),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum(['CUSTOM']), // Only custom groups can be created manually
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
});

const createSecurityGroupSchema = z.object({
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateGroupSchema = z.object({
  groupId: z.number(),
  displayName: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

const deleteGroupSchema = z.object({
  groupId: z.number(),
});

const addMemberSchema = z.object({
  groupId: z.number(),
  userId: z.number(),
});

const removeMemberSchema = z.object({
  groupId: z.number(),
  userId: z.number(),
});

const listMembersSchema = z.object({
  groupId: z.number(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const getUserGroupsSchema = z.object({
  userId: z.number().optional(), // Optional - defaults to current user
  type: z
    .enum(['SYSTEM', 'WORKSPACE', 'WORKSPACE_ADMIN', 'PROJECT', 'PROJECT_ADMIN', 'CUSTOM'])
    .optional(),
});

// Permission schemas
const listPermissionsSchema = z.object({
  category: z.string().optional(),
});

const getGroupPermissionsSchema = z.object({
  groupId: z.number(),
});

const grantPermissionSchema = z.object({
  groupId: z.number(),
  permissionName: z.string(),
  accessType: z.enum(['ALLOW', 'DENY']),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
});

const revokePermissionSchema = z.object({
  groupId: z.number(),
  permissionName: z.string(),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
});

const setGroupPermissionsSchema = z.object({
  groupId: z.number(),
  permissions: z.array(
    z.object({
      name: z.string(),
      accessType: z.enum(['ALLOW', 'DENY']),
    })
  ),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
});

const getUserEffectivePermissionsSchema = z.object({
  userId: z.number().optional(),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
});

const checkPermissionSchema = z.object({
  permissionName: z.string(),
  workspaceId: z.number().optional(),
  projectId: z.number().optional(),
});

// =============================================================================
// Group Router
// =============================================================================

export const groupRouter = router({
  // ===========================================================================
  // Query Procedures
  // ===========================================================================

  /**
   * List groups visible to the current user based on their scope.
   * - Domain Admins: All groups
   * - Workspace Admins: Groups in their workspace(s) + system groups they're members of
   */
  list: protectedProcedure.input(listGroupsSchema).query(async ({ ctx, input }) => {
    const { type, workspaceId, projectId, search, limit, offset } = input;
    const userId = ctx.user!.id;

    // Get user's scope from scopeService
    const userScope = await scopeService.getUserScope(userId);
    const visibleGroupIds = await scopeService.getGroupsInScope(userId);

    // Non-admin users cannot access this endpoint at all
    if (!userScope.permissions.canAccessAdminPanel) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage groups',
      });
    }

    // Build where clause with scope filter
    const where: Record<string, unknown> = {
      isActive: true,
      id: { in: visibleGroupIds },
    };

    if (type) {
      where.type = type;
    }

    // Workspace filtering
    if (workspaceId) {
      // If specific workspace requested, verify user can access it
      if (!userScope.isDomainAdmin && !userScope.workspaceIds.includes(workspaceId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to groups in this workspace',
        });
      }
      where.workspaceId = workspaceId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (search) {
      // Combine search with existing OR clause if present
      const searchCondition = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        // Need to AND the workspace filter with search
        where.AND = [{ OR: where.OR }, { OR: searchCondition }];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [groups, total] = await Promise.all([
      ctx.prisma.group.findMany({
        where,
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true,
          type: true,
          workspaceId: true,
          projectId: true,
          source: true,
          isSystem: true,
          isSecurityGroup: true,
          isActive: true,
          createdAt: true,
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          project: {
            select: { id: true, name: true, identifier: true },
          },
          _count: {
            select: { members: true, roleAssignments: true },
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      ctx.prisma.group.count({ where }),
    ]);

    // Mark which groups the user can actually manage
    return {
      groups: groups.map((g) => ({
        ...g,
        memberCount: g._count.members,
        assignmentCount: g._count.roleAssignments,
        // User can manage if: Domain Admin OR (not SYSTEM and workspace matches)
        // Security groups (no workspace) can only be managed by Domain Admins
        canManage:
          userScope.isDomainAdmin ||
          (g.type !== 'SYSTEM' &&
            !g.isSecurityGroup &&
            g.workspaceId !== null &&
            userScope.workspaceIds.includes(g.workspaceId)),
      })),
      total,
      limit,
      offset,
      hasMore: offset + groups.length < total,
    };
  }),

  /**
   * Get a single group by ID (with authorization check)
   */
  get: protectedProcedure.input(getGroupSchema).query(async ({ ctx, input }) => {
    const { canManage, group: groupInfo } = await canManageGroup(
      ctx.user!.id,
      input.groupId,
      ctx.prisma
    );

    if (!groupInfo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    // Only users who can manage a group can view it
    // SYSTEM groups are only visible to Domain Admins
    const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this group',
      });
    }

    const group = await ctx.prisma.group.findUnique({
      where: { id: input.groupId },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        type: true,
        workspaceId: true,
        projectId: true,
        externalId: true,
        source: true,
        isSystem: true,
        isSecurityGroup: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        project: {
          select: { id: true, name: true, identifier: true },
        },
        _count: {
          select: { members: true, roleAssignments: true },
        },
      },
    });

    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    return {
      ...group,
      memberCount: group._count.members,
      assignmentCount: group._count.roleAssignments,
      canManage: scope.isDomainAdmin || canManage,
    };
  }),

  /**
   * Get groups for current user (or specified user for admins)
   */
  myGroups: protectedProcedure.input(getUserGroupsSchema).query(async ({ ctx, input }) => {
    const userId = input.userId ?? ctx.user!.id;

    // Non-admins can only see their own groups
    if (input.userId && input.userId !== ctx.user!.id && ctx.user!.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot view other users groups',
      });
    }

    const groups = await groupPermissionService.getUserGroups(userId);

    // Filter by type if specified
    if (input.type) {
      return groups.filter((g) => g.groupType === input.type);
    }

    return groups;
  }),

  /**
   * List members of a group (with authorization check)
   */
  listMembers: protectedProcedure.input(listMembersSchema).query(async ({ ctx, input }) => {
    const { groupId, limit, offset } = input;

    const { canManage, group: groupInfo } = await canManageGroup(ctx.user!.id, groupId, ctx.prisma);

    if (!groupInfo) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    // Only users who can manage a group can view its members
    const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to view this group',
      });
    }

    const [members, total] = await Promise.all([
      ctx.prisma.groupMember.findMany({
        where: { groupId },
        select: {
          id: true,
          addedAt: true,
          externalSync: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
              avatarUrl: true,
              isActive: true,
            },
          },
          addedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      ctx.prisma.groupMember.count({ where: { groupId } }),
    ]);

    return {
      members: members.map((m) => ({
        id: m.id,
        user: m.user,
        addedAt: m.addedAt,
        addedBy: m.addedBy,
        externalSync: m.externalSync,
      })),
      total,
      limit,
      offset,
      hasMore: offset + members.length < total,
      canManage: scope.isDomainAdmin || canManage,
    };
  }),

  // ===========================================================================
  // Mutation Procedures
  // ===========================================================================

  /**
   * Create a custom group (with authorization check)
   */
  create: protectedProcedure.input(createGroupSchema).mutation(async ({ ctx, input }) => {
    const { name, displayName, description, type, workspaceId, projectId } = input;

    // Get user's management scope
    const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);

    // Must be Domain Admin or Workspace Admin to create groups
    if (!scope.isDomainAdmin && scope.adminWorkspaceIds.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to create groups',
      });
    }

    // Workspace admins can only create groups in their own workspace
    if (workspaceId && !scope.isDomainAdmin && !scope.adminWorkspaceIds.includes(workspaceId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only create groups in workspaces you administer',
      });
    }

    // Non-Domain-Admins must specify a workspace
    if (!scope.isDomainAdmin && !workspaceId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You must specify a workspace for the group',
      });
    }

    // Check if group name already exists
    const existing = await ctx.prisma.group.findUnique({
      where: { name },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A group with this name already exists',
      });
    }

    // Validate workspace/project if specified
    if (workspaceId) {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        });
      }
    }

    if (projectId) {
      const project = await ctx.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }
    }

    const group = await ctx.prisma.group.create({
      data: {
        name,
        displayName,
        description,
        type,
        workspaceId,
        projectId,
        isSystem: false,
        isActive: true,
        source: 'LOCAL',
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        createdAt: true,
      },
    });

    // Emit WebSocket event for real-time Permission Tree updates
    emitGroupCreated({
      groupId: group.id,
      groupName: group.name,
      data: { displayName: group.displayName, type: group.type },
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    await auditService.logGroupEvent({
      action: AUDIT_ACTIONS.GROUP_CREATED,
      resourceType: 'group',
      resourceId: group.id,
      resourceName: group.displayName || group.name,
      changes: { after: { name, displayName, description, type, workspaceId, projectId } },
      userId: ctx.user!.id,
      workspaceId: workspaceId || null,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return group;
  }),

  /**
   * Create a Security Group (Domain Admins only)
   * Security Groups can be assigned to multiple workspaces/projects via Role Assignments.
   */
  createSecurityGroup: protectedProcedure
    .input(createSecurityGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, displayName, description } = input;

      // Only Domain Admins (or Super Admins) can create Security Groups
      const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
      if (!scope.isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can create Security Groups',
        });
      }

      // Check if group name already exists
      const existing = await ctx.prisma.group.findUnique({
        where: { name },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A group with this name already exists',
        });
      }

      const group = await ctx.prisma.group.create({
        data: {
          name,
          displayName,
          description,
          type: 'CUSTOM',
          isSecurityGroup: true,
          isSystem: false,
          isActive: true,
          source: 'LOCAL',
          // Security groups have no workspace/project binding
          workspaceId: null,
          projectId: null,
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          isSecurityGroup: true,
          createdAt: true,
        },
      });

      // Emit WebSocket event for real-time Permission Tree updates
      emitGroupCreated({
        groupId: group.id,
        groupName: group.name,
        data: { displayName: group.displayName, type: group.type, isSecurityGroup: true },
        triggeredBy: {
          id: ctx.user!.id,
          username: ctx.user!.username,
        },
        timestamp: new Date().toISOString(),
      });

      // Audit logging
      await auditService.logGroupEvent({
        action: AUDIT_ACTIONS.GROUP_CREATED,
        resourceType: 'group',
        resourceId: group.id,
        resourceName: group.displayName || group.name,
        changes: {
          after: { name, displayName, description, type: 'CUSTOM', isSecurityGroup: true },
        },
        metadata: { isSecurityGroup: true },
        userId: ctx.user!.id,
        workspaceId: null,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return group;
    }),

  /**
   * Update a group (with authorization check)
   * Cannot update system groups or change name/type
   */
  update: protectedProcedure.input(updateGroupSchema).mutation(async ({ ctx, input }) => {
    const { groupId, ...data } = input;

    const { canManage, group } = await canManageGroup(ctx.user!.id, groupId, ctx.prisma);

    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this group',
      });
    }

    // Cannot modify system groups (except isActive by Domain Admins)
    if (group.isSystem && (data.displayName || data.description !== undefined)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot modify system groups',
      });
    }

    const updated = await ctx.prisma.group.update({
      where: { id: groupId },
      data,
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Emit WebSocket event for real-time Permission Tree updates
    emitGroupUpdated({
      groupId: updated.id,
      groupName: updated.name,
      data: {
        displayName: updated.displayName,
        description: updated.description,
        isActive: updated.isActive,
      },
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    await auditService.logGroupEvent({
      action: AUDIT_ACTIONS.GROUP_UPDATED,
      resourceType: 'group',
      resourceId: group.id,
      resourceName: updated.displayName || updated.name,
      changes: {
        before: {
          displayName: group.displayName,
          description: group.description,
          isActive: group.isActive,
        },
        after: {
          displayName: updated.displayName,
          description: updated.description,
          isActive: updated.isActive,
        },
      },
      userId: ctx.user!.id,
      workspaceId: group.workspaceId,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return updated;
  }),

  /**
   * Delete a group (with authorization check)
   * Cannot delete system groups
   */
  delete: protectedProcedure.input(deleteGroupSchema).mutation(async ({ ctx, input }) => {
    const { canManage, group } = await canManageGroup(ctx.user!.id, input.groupId, ctx.prisma);

    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this group',
      });
    }

    if (group.isSystem) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot delete system groups',
      });
    }

    // Delete all memberships first
    await ctx.prisma.groupMember.deleteMany({
      where: { groupId: input.groupId },
    });

    await ctx.prisma.group.delete({
      where: { id: input.groupId },
    });

    // Emit WebSocket event for real-time Permission Tree updates
    emitGroupDeleted({
      groupId: input.groupId,
      groupName: group.name,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    await auditService.logGroupEvent({
      action: AUDIT_ACTIONS.GROUP_DELETED,
      resourceType: 'group',
      resourceId: group.id,
      resourceName: group.displayName || group.name,
      changes: { before: { name: group.name, displayName: group.displayName, type: group.type } },
      userId: ctx.user!.id,
      workspaceId: group.workspaceId,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return { success: true };
  }),

  /**
   * Add a user to a group (with privilege escalation prevention)
   */
  addMember: protectedProcedure.input(addMemberSchema).mutation(async ({ ctx, input }) => {
    const { groupId, userId } = input;

    // Check if actor can add members to this group
    const { canAdd, reason } = await canAddMemberToGroup(ctx.user!.id, userId, groupId, ctx.prisma);

    if (!canAdd) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: reason || 'You do not have permission to add members to this group',
      });
    }

    const group = await ctx.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    if (!group.isActive) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot add members to inactive group',
      });
    }

    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Check if already a member
    const existing = await ctx.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member of this group',
      });
    }

    const membership = await ctx.prisma.groupMember.create({
      data: {
        groupId,
        userId,
        addedById: ctx.user!.id,
        externalSync: false,
      },
      select: {
        id: true,
        addedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit WebSocket event for real-time Permission Tree updates
    emitGroupMemberAdded({
      groupId,
      groupName: group.name,
      userId: membership.user.id,
      username: membership.user.username,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    await auditService.logGroupEvent({
      action: AUDIT_ACTIONS.GROUP_MEMBER_ADDED,
      resourceType: 'group',
      resourceId: group.id,
      resourceName: group.displayName || group.name,
      targetType: 'user',
      targetId: membership.user.id,
      targetName: membership.user.name || membership.user.username,
      userId: ctx.user!.id,
      workspaceId: group.workspaceId,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return membership;
  }),

  /**
   * Remove a user from a group (with authorization check)
   */
  removeMember: protectedProcedure.input(removeMemberSchema).mutation(async ({ ctx, input }) => {
    const { groupId, userId } = input;

    const { canManage, group } = await canManageGroup(ctx.user!.id, groupId, ctx.prisma);

    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage this group',
      });
    }

    // Additional check for SYSTEM groups (only Domain Admins)
    const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
    if (group.type === 'SYSTEM' && !scope.isDomainAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Domain Admins can manage system groups',
      });
    }

    // Non-Domain-Admins cannot remove users from WORKSPACE_ADMIN groups of other workspaces
    if (group.type === 'WORKSPACE_ADMIN' && !scope.isDomainAdmin) {
      if (!group.workspaceId || !scope.adminWorkspaceIds.includes(group.workspaceId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot manage admin groups of other workspaces',
        });
      }
    }

    const membership = await ctx.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User is not a member of this group',
      });
    }

    // Prevent removing the last Domain Admin
    if (group.name === 'Domain Admins') {
      const memberCount = await ctx.prisma.groupMember.count({
        where: { groupId },
      });

      if (memberCount <= 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot remove the last Domain Admin',
        });
      }
    }

    await ctx.prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    // Emit WebSocket event for real-time Permission Tree updates
    emitGroupMemberRemoved({
      groupId,
      groupName: group.name,
      userId: membership.user.id,
      username: membership.user.username,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    await auditService.logGroupEvent({
      action: AUDIT_ACTIONS.GROUP_MEMBER_REMOVED,
      resourceType: 'group',
      resourceId: groupId,
      resourceName: group.name,
      targetType: 'user',
      targetId: membership.user.id,
      targetName: membership.user.username,
      userId: ctx.user!.id,
      workspaceId: group.workspaceId,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return { success: true };
  }),

  // ===========================================================================
  // Permission Check Helpers (for use by other routers)
  // ===========================================================================

  /**
   * Check if current user is a Domain Admin
   */
  isDomainAdmin: protectedProcedure.query(async ({ ctx }) => {
    const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user!.id);
    return { isDomainAdmin };
  }),

  /**
   * Check if current user can access a workspace
   */
  canAccessWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const canAccess = await groupPermissionService.canAccessWorkspace(
        ctx.user!.id,
        input.workspaceId
      );
      const isAdmin = await groupPermissionService.isWorkspaceAdmin(
        ctx.user!.id,
        input.workspaceId
      );

      return { canAccess, isAdmin };
    }),

  /**
   * Check if current user can access a project
   */
  canAccessProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const access = await groupPermissionService.getProjectAccess(ctx.user!.id, input.projectId);

      return {
        canAccess: access !== null,
        isAdmin: access?.isAdmin ?? false,
        effectiveRole: access?.effectiveRole ?? null,
      };
    }),

  // ===========================================================================
  // Permission Management (Allow/Deny)
  // ===========================================================================

  /**
   * List all available permissions (accessible to group managers)
   */
  listPermissions: protectedProcedure.input(listPermissionsSchema).query(async ({ ctx, input }) => {
    // Any group manager can view available permissions
    const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
    if (!scope.isDomainAdmin && scope.adminWorkspaceIds.length === 0) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage groups',
      });
    }

    const where: Record<string, unknown> = {};

    if (input.category) {
      where.category = input.category;
    }

    const permissions = await ctx.prisma.permission.findMany({
      where,
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        parentId: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Group by category for tree structure
    const categories = new Map<string, typeof permissions>();
    for (const perm of permissions) {
      const existing = categories.get(perm.category) ?? [];
      existing.push(perm);
      categories.set(perm.category, existing);
    }

    return {
      permissions,
      categories: Object.fromEntries(categories),
    };
  }),

  /**
   * Get permissions for a group (with authorization check)
   */
  getGroupPermissions: protectedProcedure
    .input(getGroupPermissionsSchema)
    .query(async ({ ctx, input }) => {
      const { canManage, group: groupInfo } = await canManageGroup(
        ctx.user!.id,
        input.groupId,
        ctx.prisma
      );

      if (!groupInfo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // Only users who can manage a group can view its permissions
      const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this group',
        });
      }

      const group = await ctx.prisma.group.findUnique({
        where: { id: input.groupId },
        select: { id: true, name: true, type: true },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      const permissions = await groupPermissionService.getGroupPermissions(input.groupId);

      return {
        group: { id: group.id, name: group.name, type: group.type },
        permissions,
        canManage: scope.isDomainAdmin || canManage,
      };
    }),

  /**
   * Grant a permission to a group (with authorization check)
   */
  grantPermission: protectedProcedure
    .input(grantPermissionSchema)
    .mutation(async ({ ctx, input }) => {
      const { canManage, group } = await canManageGroup(ctx.user!.id, input.groupId, ctx.prisma);

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage this group',
        });
      }

      // Only Domain Admins can modify SYSTEM group permissions
      const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
      if (group.type === 'SYSTEM' && !scope.isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can modify system group permissions',
        });
      }

      await groupPermissionService.grantPermission(
        input.groupId,
        input.permissionName,
        input.accessType,
        input.workspaceId,
        input.projectId,
        ctx.user!.id
      );

      return { success: true };
    }),

  /**
   * Revoke a permission from a group (with authorization check)
   */
  revokePermission: protectedProcedure
    .input(revokePermissionSchema)
    .mutation(async ({ ctx, input }) => {
      const { canManage, group } = await canManageGroup(ctx.user!.id, input.groupId, ctx.prisma);

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage this group',
        });
      }

      // Only Domain Admins can modify SYSTEM group permissions
      const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
      if (group.type === 'SYSTEM' && !scope.isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can modify system group permissions',
        });
      }

      await groupPermissionService.revokePermission(
        input.groupId,
        input.permissionName,
        input.workspaceId,
        input.projectId
      );

      return { success: true };
    }),

  /**
   * Set all permissions for a group (with authorization check)
   */
  setGroupPermissions: protectedProcedure
    .input(setGroupPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      const { canManage, group } = await canManageGroup(ctx.user!.id, input.groupId, ctx.prisma);

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage this group',
        });
      }

      // Only Domain Admins can modify SYSTEM group permissions
      const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
      if (group.type === 'SYSTEM' && !scope.isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only Domain Admins can modify system group permissions',
        });
      }

      await groupPermissionService.setGroupPermissions(
        input.groupId,
        input.permissions,
        input.workspaceId,
        input.projectId,
        ctx.user!.id
      );

      return { success: true };
    }),

  /**
   * Get effective permissions for a user (admin only for other users)
   */
  getUserEffectivePermissions: protectedProcedure
    .input(getUserEffectivePermissionsSchema)
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user!.id;

      // Users can view their own permissions
      // Admins can view other users' permissions
      if (userId !== ctx.user!.id) {
        const scope = await getGroupManagementScope(ctx.user!.id, ctx.prisma);
        if (!scope.isDomainAdmin && scope.adminWorkspaceIds.length === 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only view your own permissions',
          });
        }
      }

      const permissions = await groupPermissionService.getUserEffectivePermissions(
        userId,
        input.workspaceId,
        input.projectId
      );

      return { permissions };
    }),

  /**
   * Check if current user has a specific permission
   */
  checkPermission: protectedProcedure.input(checkPermissionSchema).query(async ({ ctx, input }) => {
    const effective = await groupPermissionService.getEffectivePermission(
      ctx.user!.id,
      input.permissionName,
      input.workspaceId,
      input.projectId
    );

    return effective;
  }),

  /**
   * Get my effective permissions (for current user)
   */
  myPermissions: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number().optional(),
        projectId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const permissions = await groupPermissionService.getUserEffectivePermissions(
        ctx.user!.id,
        input.workspaceId,
        input.projectId
      );

      // Only return allowed permissions for simpler client usage
      return {
        allowed: permissions.filter((p) => p.allowed).map((p) => p.permissionName),
        denied: permissions.filter((p) => p.reason === 'DENY').map((p) => p.permissionName),
        full: permissions,
      };
    }),

  /**
   * Get current user's admin scope.
   * Returns comprehensive scope information for filtering admin panel views.
   * Used by frontend to show/hide admin menu items and filter resources.
   */
  myAdminScope: protectedProcedure.query(async ({ ctx }) => {
    const userScope = await scopeService.getUserScope(ctx.user!.id);

    return {
      // Scope level and flags
      level: userScope.level,
      isDomainAdmin: userScope.isDomainAdmin,

      // Accessible resource IDs
      workspaceIds: userScope.workspaceIds,
      projectIds: userScope.projectIds,

      // Permission flags for UI
      permissions: userScope.permissions,

      // Convenience flags
      hasAnyAdminAccess: userScope.permissions.canAccessAdminPanel,
      canSeeAllUsers: userScope.isDomainAdmin,
      canSeeAllGroups: userScope.isDomainAdmin,
      canSeeSystemSettings: userScope.isDomainAdmin,
    };
  }),
});
