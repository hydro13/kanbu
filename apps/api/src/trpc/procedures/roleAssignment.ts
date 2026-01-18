/*
 * Role Assignment Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for managing AD-style role assignments.
 * Allows Security Groups to be assigned to multiple workspaces/projects with roles.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { groupPermissionService } from '../../services/groupPermissions';
import * as roleAssignmentService from '../../services/roleAssignmentService';
import { emitRoleAssignmentCreated, emitRoleAssignmentRemoved } from '../../socket/emitter';

// =============================================================================
// Input Schemas
// =============================================================================

const assignGroupSchema = z
  .object({
    groupId: z.number(),
    workspaceId: z.number().optional(),
    projectId: z.number().optional(),
    role: z.enum(['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER']),
    inheritToChildren: z.boolean().default(true),
  })
  .refine(
    (data) => (data.workspaceId && !data.projectId) || (!data.workspaceId && data.projectId),
    { message: 'Exactly one of workspaceId or projectId must be provided' }
  );

const removeAssignmentSchema = z.object({
  assignmentId: z.number(),
});

const removeAssignmentByScopeSchema = z
  .object({
    groupId: z.number(),
    workspaceId: z.number().optional(),
    projectId: z.number().optional(),
  })
  .refine(
    (data) => (data.workspaceId && !data.projectId) || (!data.workspaceId && data.projectId),
    { message: 'Exactly one of workspaceId or projectId must be provided' }
  );

const listWorkspaceAssignmentsSchema = z.object({
  workspaceId: z.number(),
});

const listProjectAssignmentsSchema = z.object({
  projectId: z.number(),
  includeInherited: z.boolean().default(true),
});

const listGroupAssignmentsSchema = z.object({
  groupId: z.number(),
});

const getUserWorkspaceRoleSchema = z.object({
  userId: z.number().optional(),
  workspaceId: z.number(),
});

const getUserProjectRoleSchema = z.object({
  userId: z.number().optional(),
  projectId: z.number(),
});

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Check if user can manage role assignments for a scope.
 * Must be Domain Admin or workspace admin for that workspace.
 */
async function canManageAssignments(
  userId: number,
  workspaceId?: number,
  projectId?: number,
  prisma?: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<boolean> {
  const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
  if (isDomainAdmin) {
    return true;
  }

  // For workspace assignments
  if (workspaceId) {
    return groupPermissionService.isWorkspaceAdmin(userId, workspaceId);
  }

  // For project assignments, check workspace admin of parent workspace
  if (projectId && prisma) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (project) {
      return groupPermissionService.isWorkspaceAdmin(userId, project.workspaceId);
    }
  }

  return false;
}

/**
 * Check if user can view role assignments for a scope.
 * Must have access to the workspace or project.
 */
async function canViewAssignments(
  userId: number,
  workspaceId?: number,
  projectId?: number
): Promise<boolean> {
  const isDomainAdmin = await groupPermissionService.isDomainAdmin(userId);
  if (isDomainAdmin) {
    return true;
  }

  if (workspaceId) {
    return groupPermissionService.canAccessWorkspace(userId, workspaceId);
  }

  if (projectId) {
    return groupPermissionService.canAccessProject(userId, projectId);
  }

  return false;
}

// =============================================================================
// Role Assignment Router
// =============================================================================

export const roleAssignmentRouter = router({
  // ===========================================================================
  // Query Procedures
  // ===========================================================================

  /**
   * List role assignments for a workspace.
   * Shows all security groups assigned to this workspace.
   */
  listForWorkspace: protectedProcedure
    .input(listWorkspaceAssignmentsSchema)
    .query(async ({ ctx, input }) => {
      const canView = await canViewAssignments(ctx.user!.id, input.workspaceId);
      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this workspace',
        });
      }

      const canManage = await canManageAssignments(ctx.user!.id, input.workspaceId);

      const assignments = await roleAssignmentService.getWorkspaceAssignments(input.workspaceId);

      return {
        assignments: assignments.map((a) => ({
          id: a.id,
          role: a.role,
          inheritToChildren: a.inheritToChildren,
          createdAt: a.createdAt,
          group: {
            id: a.group.id,
            name: a.group.name,
            displayName: a.group.displayName,
            type: a.group.type,
            isSecurityGroup: a.group.isSecurityGroup,
            memberCount: a.group._count.members,
          },
        })),
        canManage,
      };
    }),

  /**
   * List role assignments for a project.
   * Optionally includes inherited assignments from parent workspace.
   */
  listForProject: protectedProcedure
    .input(listProjectAssignmentsSchema)
    .query(async ({ ctx, input }) => {
      const canView = await canViewAssignments(ctx.user!.id, undefined, input.projectId);
      if (!canView) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      const canManage = await canManageAssignments(
        ctx.user!.id,
        undefined,
        input.projectId,
        ctx.prisma
      );

      if (input.includeInherited) {
        const result = await roleAssignmentService.getProjectAssignmentsWithInherited(
          input.projectId
        );

        const mapAssignment = (a: (typeof result.direct)[0]) => ({
          id: a.id,
          role: a.role,
          inheritToChildren: a.inheritToChildren,
          createdAt: a.createdAt,
          group: {
            id: a.group.id,
            name: a.group.name,
            displayName: a.group.displayName,
            type: a.group.type,
            isSecurityGroup: a.group.isSecurityGroup,
          },
        });

        return {
          direct: result.direct.map(mapAssignment),
          inherited: result.inherited.map((a) => ({
            ...mapAssignment(a),
            _inherited: true,
            _sourceWorkspaceId: (a as { _sourceWorkspaceId?: number })._sourceWorkspaceId,
          })),
          canManage,
        };
      }

      const assignments = await roleAssignmentService.getProjectAssignments(input.projectId);

      return {
        direct: assignments.map((a) => ({
          id: a.id,
          role: a.role,
          inheritToChildren: a.inheritToChildren,
          createdAt: a.createdAt,
          group: {
            id: a.group.id,
            name: a.group.name,
            displayName: a.group.displayName,
            type: a.group.type,
            isSecurityGroup: a.group.isSecurityGroup,
            memberCount: a.group._count.members,
          },
        })),
        inherited: [],
        canManage,
      };
    }),

  /**
   * List all places where a group is assigned.
   * Shows all workspaces and projects this group has access to.
   */
  listForGroup: protectedProcedure
    .input(listGroupAssignmentsSchema)
    .query(async ({ ctx, input }) => {
      // Check if user can manage this group
      const group = await ctx.prisma.group.findUnique({
        where: { id: input.groupId },
        select: { id: true, workspaceId: true, type: true },
      });

      if (!group) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Group not found',
        });
      }

      // Only Domain Admins or workspace admins of the group's workspace can view
      const isDomainAdmin = await groupPermissionService.isDomainAdmin(ctx.user!.id);
      if (!isDomainAdmin) {
        if (!group.workspaceId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Domain Admins can view system group assignments',
          });
        }
        const isWsAdmin = await groupPermissionService.isWorkspaceAdmin(
          ctx.user!.id,
          group.workspaceId
        );
        if (!isWsAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to view this group',
          });
        }
      }

      const assignments = await roleAssignmentService.getGroupAssignments(input.groupId);

      return {
        assignments: assignments.map((a) => ({
          id: a.id,
          role: a.role,
          inheritToChildren: a.inheritToChildren,
          createdAt: a.createdAt,
          workspace: a.workspace
            ? {
                id: a.workspace.id,
                name: a.workspace.name,
                slug: a.workspace.slug,
              }
            : null,
          project: a.project
            ? {
                id: a.project.id,
                name: a.project.name,
                identifier: a.project.identifier,
                workspace: a.project.workspace,
              }
            : null,
        })),
      };
    }),

  /**
   * Get a user's effective role in a workspace via security groups.
   * Returns the role and which group granted it.
   */
  getUserWorkspaceRole: protectedProcedure
    .input(getUserWorkspaceRoleSchema)
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user!.id;

      // Users can check their own role, admins can check others
      if (userId !== ctx.user!.id) {
        const canManage = await canManageAssignments(ctx.user!.id, input.workspaceId);
        if (!canManage) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only check your own role',
          });
        }
      }

      const result = await roleAssignmentService.getUserWorkspaceRoleViaGroups(
        userId,
        input.workspaceId
      );

      return result;
    }),

  /**
   * Get a user's effective role in a project via security groups.
   * Includes roles inherited from workspace assignments.
   */
  getUserProjectRole: protectedProcedure
    .input(getUserProjectRoleSchema)
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user!.id;

      // Users can check their own role, admins can check others
      if (userId !== ctx.user!.id) {
        const canManage = await canManageAssignments(
          ctx.user!.id,
          undefined,
          input.projectId,
          ctx.prisma
        );
        if (!canManage) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You can only check your own role',
          });
        }
      }

      const result = await roleAssignmentService.getUserProjectRoleViaGroups(
        userId,
        input.projectId
      );

      return result;
    }),

  // ===========================================================================
  // Mutation Procedures
  // ===========================================================================

  /**
   * Assign a security group to a workspace or project with a role.
   * Only works for groups with isSecurityGroup = true or type = SYSTEM/CUSTOM.
   */
  assign: protectedProcedure.input(assignGroupSchema).mutation(async ({ ctx, input }) => {
    const { groupId, workspaceId, projectId, role, inheritToChildren } = input;

    // Check if user can manage assignments for this scope
    const canManage = await canManageAssignments(ctx.user!.id, workspaceId, projectId, ctx.prisma);
    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage role assignments',
      });
    }

    // Verify the group exists and is a security group
    const group = await ctx.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        isSecurityGroup: true,
        type: true,
      },
    });

    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found',
      });
    }

    // Only security groups, SYSTEM groups, or CUSTOM groups can have role assignments
    if (!group.isSecurityGroup && group.type !== 'SYSTEM' && group.type !== 'CUSTOM') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Only security groups can be assigned via role assignments. Auto-groups (WORKSPACE, PROJECT) have implicit access.',
      });
    }

    // Verify workspace/project exists
    if (workspaceId) {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true },
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
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }
    }

    const assignment = await roleAssignmentService.assignGroupToScope({
      groupId,
      workspaceId,
      projectId,
      role,
      inheritToChildren,
      createdById: ctx.user!.id,
    });

    // Get names for the WebSocket event
    let workspaceName: string | undefined;
    let projectName: string | undefined;

    if (workspaceId) {
      const ws = await ctx.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      workspaceName = ws?.name;
    }

    if (projectId) {
      const proj = await ctx.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });
      projectName = proj?.name;
    }

    // Emit WebSocket event for real-time Permission Tree updates
    emitRoleAssignmentCreated({
      groupId,
      groupName: group.name,
      workspaceId,
      workspaceName,
      projectId,
      projectName,
      role,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      id: assignment.id,
      groupId: assignment.groupId,
      workspaceId: assignment.workspaceId,
      projectId: assignment.projectId,
      role: assignment.role,
      inheritToChildren: assignment.inheritToChildren,
      createdAt: assignment.createdAt,
    };
  }),

  /**
   * Remove a role assignment by ID.
   */
  remove: protectedProcedure.input(removeAssignmentSchema).mutation(async ({ ctx, input }) => {
    // Get the assignment with all details for the event
    const assignment = await ctx.prisma.roleAssignment.findUnique({
      where: { id: input.assignmentId },
      include: {
        group: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!assignment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Role assignment not found',
      });
    }

    // Check if user can manage assignments for this scope
    const canManage = await canManageAssignments(
      ctx.user!.id,
      assignment.workspaceId ?? undefined,
      assignment.projectId ?? undefined,
      ctx.prisma
    );
    if (!canManage) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to manage role assignments',
      });
    }

    await roleAssignmentService.removeAssignment(input.assignmentId);

    // Emit WebSocket event for real-time Permission Tree updates
    emitRoleAssignmentRemoved({
      groupId: assignment.group.id,
      groupName: assignment.group.name,
      workspaceId: assignment.workspaceId ?? undefined,
      workspaceName: assignment.workspace?.name,
      projectId: assignment.projectId ?? undefined,
      projectName: assignment.project?.name,
      role: assignment.role,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }),

  /**
   * Remove a role assignment by group and scope.
   */
  removeByScope: protectedProcedure
    .input(removeAssignmentByScopeSchema)
    .mutation(async ({ ctx, input }) => {
      const { groupId, workspaceId, projectId } = input;

      // Check if user can manage assignments for this scope
      const canManage = await canManageAssignments(
        ctx.user!.id,
        workspaceId,
        projectId,
        ctx.prisma
      );
      if (!canManage) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage role assignments',
        });
      }

      // Get assignment details for the event before deleting
      const assignment = await ctx.prisma.roleAssignment.findFirst({
        where: {
          groupId,
          workspaceId: workspaceId ?? null,
          projectId: projectId ?? null,
        },
        include: {
          group: { select: { id: true, name: true } },
          workspace: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Role assignment not found',
        });
      }

      await roleAssignmentService.removeAssignmentByScope(groupId, workspaceId, projectId);

      // Emit WebSocket event for real-time Permission Tree updates
      emitRoleAssignmentRemoved({
        groupId: assignment.group.id,
        groupName: assignment.group.name,
        workspaceId: assignment.workspaceId ?? undefined,
        workspaceName: assignment.workspace?.name,
        projectId: assignment.projectId ?? undefined,
        projectName: assignment.project?.name,
        role: assignment.role,
        triggeredBy: {
          id: ctx.user!.id,
          username: ctx.user!.username,
        },
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    }),
});
