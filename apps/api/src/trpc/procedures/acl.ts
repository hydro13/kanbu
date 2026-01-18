/*
 * ACL Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for filesystem-style ACL management.
 * Provides CRUD operations for Access Control List entries.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { aclService, ACL_PERMISSIONS, ACL_PRESETS } from '../../services/aclService';
import { scopeService } from '../../services/scopeService';
import { auditService, AUDIT_ACTIONS } from '../../services/auditService';
import { emitAclGranted, emitAclDenied, emitAclDeleted } from '../../socket/emitter';

// =============================================================================
// Schemas
// =============================================================================

// Extended resource types (Fase 4C: added root, system, dashboard; Fase 8B: added feature)
const resourceTypeSchema = z.enum([
  'root',
  'system',
  'dashboard',
  'workspace',
  'project',
  'feature',
  'admin',
  'profile',
]);
const principalTypeSchema = z.enum(['user', 'group']);

const aclEntrySchema = z.object({
  resourceType: resourceTypeSchema,
  resourceId: z.number().nullable(),
  principalType: principalTypeSchema,
  principalId: z.number(),
  permissions: z.number().min(0).max(31),
  inheritToChildren: z.boolean().optional().default(true),
});

// =============================================================================
// Authorization Helpers
// =============================================================================

/**
 * Check if user can manage ACLs for a resource.
 * Requires PERMISSIONS permission (P=16) on the resource, or Super Admin.
 */
async function canManageAcl(
  userId: number,
  resourceType: string,
  resourceId: number | null,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<boolean> {
  // Super Admins can manage all ACLs
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === 'ADMIN') {
    return true;
  }

  // Check if user has PERMISSIONS permission on this resource
  return aclService.hasPermission(
    userId,
    resourceType as 'root' | 'system' | 'dashboard' | 'workspace' | 'project' | 'admin' | 'profile',
    resourceId,
    ACL_PERMISSIONS.PERMISSIONS
  );
}

/**
 * Require ACL management permission, throw FORBIDDEN if not.
 */
async function requireAclManagement(
  userId: number,
  resourceType: string,
  resourceId: number | null,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<void> {
  const canManage = await canManageAcl(userId, resourceType, resourceId, prisma);
  if (!canManage) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Je hebt geen rechten om ACLs te beheren voor deze resource',
    });
  }
}

/**
 * Get principal name for audit logging.
 */
async function getPrincipalName(
  principalType: 'user' | 'group',
  principalId: number,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<string> {
  if (principalType === 'user') {
    const user = await prisma.user.findUnique({
      where: { id: principalId },
      select: { name: true, username: true },
    });
    return user?.name || user?.username || `User #${principalId}`;
  } else {
    const group = await prisma.group.findUnique({
      where: { id: principalId },
      select: { displayName: true, name: true },
    });
    return group?.displayName || group?.name || `Group #${principalId}`;
  }
}

/**
 * Get resource name and workspaceId for audit logging.
 */
async function getResourceInfo(
  resourceType: string,
  resourceId: number | null,
  prisma: typeof import('@prisma/client').PrismaClient extends new () => infer R ? R : never
): Promise<{ name: string; workspaceId: number | null }> {
  if (resourceId === null) {
    return { name: resourceType, workspaceId: null };
  }

  switch (resourceType) {
    case 'workspace': {
      const ws = await prisma.workspace.findUnique({
        where: { id: resourceId },
        select: { name: true },
      });
      return { name: ws?.name || `Workspace #${resourceId}`, workspaceId: resourceId };
    }
    case 'project': {
      const proj = await prisma.project.findUnique({
        where: { id: resourceId },
        select: { name: true, workspaceId: true },
      });
      return {
        name: proj?.name || `Project #${resourceId}`,
        workspaceId: proj?.workspaceId || null,
      };
    }
    case 'feature': {
      const feat = await prisma.feature.findUnique({
        where: { id: resourceId },
        select: { name: true, projectId: true, project: { select: { workspaceId: true } } },
      });
      return {
        name: feat?.name || `Feature #${resourceId}`,
        workspaceId: feat?.project?.workspaceId || null,
      };
    }
    default:
      return { name: `${resourceType} #${resourceId}`, workspaceId: null };
  }
}

// =============================================================================
// Router
// =============================================================================

export const aclRouter = router({
  /**
   * List ACL entries for a resource.
   */
  list: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      // For now, allow viewing ACLs if user has READ permission or is admin
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: { role: true },
      });

      const isAdmin = user?.role === 'ADMIN';
      const hasRead = await aclService.hasPermission(
        ctx.user!.id,
        input.resourceType,
        input.resourceId,
        ACL_PERMISSIONS.READ
      );

      if (!isAdmin && !hasRead) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Geen toegang tot deze resource',
        });
      }

      // Get ACL entries with principal info
      const entries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
        include: {
          createdBy: {
            select: { id: true, username: true, name: true },
          },
        },
        orderBy: [
          { deny: 'desc' }, // Deny entries first
          { principalType: 'asc' },
          { principalId: 'asc' },
        ],
      });

      // Enrich with principal names
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          let principalName = '';
          let principalDisplayName = '';

          if (entry.principalType === 'user') {
            const user = await ctx.prisma.user.findUnique({
              where: { id: entry.principalId },
              select: { username: true, name: true },
            });
            principalName = user?.username ?? `User #${entry.principalId}`;
            principalDisplayName = user?.name ?? principalName;
          } else {
            const group = await ctx.prisma.group.findUnique({
              where: { id: entry.principalId },
              select: { name: true, displayName: true },
            });
            principalName = group?.name ?? `Group #${entry.principalId}`;
            principalDisplayName = group?.displayName ?? principalName;
          }

          return {
            ...entry,
            principalName,
            principalDisplayName,
            permissionNames: aclService.permissionToArray(entry.permissions),
            presetName: aclService.getPresetName(entry.permissions),
          };
        })
      );

      return enrichedEntries;
    }),

  /**
   * Get effective permissions for a user on a resource.
   * Useful for debugging and showing "effective access" in UI.
   */
  checkPermission: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only admins can check other users' permissions
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && input.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Je kunt alleen je eigen permissies bekijken',
        });
      }

      const result = await aclService.checkPermission(
        input.userId,
        input.resourceType,
        input.resourceId
      );

      return {
        ...result,
        effectivePermissionNames: aclService.permissionToArray(result.effectivePermissions),
        deniedPermissionNames: aclService.permissionToArray(result.deniedPermissions),
        presetName: aclService.getPresetName(result.effectivePermissions),
      };
    }),

  /**
   * Get current user's effective ACL permissions on a resource.
   * Used by frontend for conditional rendering (AclGate component).
   * Returns bitmask and permission names for easy checking.
   */
  myPermission: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await aclService.checkPermission(
        ctx.user!.id,
        input.resourceType,
        input.resourceId
      );

      return {
        allowed: result.allowed,
        effectivePermissions: result.effectivePermissions,
        deniedPermissions: result.deniedPermissions,
        effectivePermissionNames: aclService.permissionToArray(result.effectivePermissions),
        deniedPermissionNames: aclService.permissionToArray(result.deniedPermissions),
        presetName: aclService.getPresetName(result.effectivePermissions),
        // Convenience flags
        canRead: (result.effectivePermissions & ACL_PERMISSIONS.READ) !== 0,
        canWrite: (result.effectivePermissions & ACL_PERMISSIONS.WRITE) !== 0,
        canExecute: (result.effectivePermissions & ACL_PERMISSIONS.EXECUTE) !== 0,
        canDelete: (result.effectivePermissions & ACL_PERMISSIONS.DELETE) !== 0,
        canManagePermissions: (result.effectivePermissions & ACL_PERMISSIONS.PERMISSIONS) !== 0,
      };
    }),

  /**
   * Grant permissions to a user or group.
   */
  grant: protectedProcedure.input(aclEntrySchema).mutation(async ({ ctx, input }) => {
    await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

    const entry = await aclService.grantPermission({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      principalType: input.principalType,
      principalId: input.principalId,
      permissions: input.permissions,
      inheritToChildren: input.inheritToChildren,
      createdById: ctx.user!.id,
    });

    // Emit real-time event
    emitAclGranted({
      entryId: entry.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      principalType: input.principalType,
      principalId: input.principalId,
      permissions: input.permissions,
      deny: false,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    const [principalName, resourceInfo] = await Promise.all([
      getPrincipalName(input.principalType, input.principalId, ctx.prisma),
      getResourceInfo(input.resourceType, input.resourceId, ctx.prisma),
    ]);
    await auditService.logAclEvent({
      action: AUDIT_ACTIONS.ACL_GRANTED,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: resourceInfo.name,
      targetType: input.principalType,
      targetId: input.principalId,
      targetName: principalName,
      changes: {
        after: { permissions: input.permissions, inheritToChildren: input.inheritToChildren },
      },
      userId: ctx.user!.id,
      workspaceId: resourceInfo.workspaceId,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return { success: true };
  }),

  /**
   * Deny permissions to a user or group.
   */
  deny: protectedProcedure.input(aclEntrySchema).mutation(async ({ ctx, input }) => {
    await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

    const entry = await aclService.denyPermission({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      principalType: input.principalType,
      principalId: input.principalId,
      permissions: input.permissions,
      inheritToChildren: input.inheritToChildren,
      createdById: ctx.user!.id,
    });

    // Emit real-time event
    emitAclDenied({
      entryId: entry.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      principalType: input.principalType,
      principalId: input.principalId,
      permissions: input.permissions,
      deny: true,
      triggeredBy: {
        id: ctx.user!.id,
        username: ctx.user!.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging
    const [principalName, resourceInfo] = await Promise.all([
      getPrincipalName(input.principalType, input.principalId, ctx.prisma),
      getResourceInfo(input.resourceType, input.resourceId, ctx.prisma),
    ]);
    await auditService.logAclEvent({
      action: AUDIT_ACTIONS.ACL_DENIED,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: resourceInfo.name,
      targetType: input.principalType,
      targetId: input.principalId,
      targetName: principalName,
      changes: {
        after: {
          permissions: input.permissions,
          inheritToChildren: input.inheritToChildren,
          deny: true,
        },
      },
      userId: ctx.user!.id,
      workspaceId: resourceInfo.workspaceId,
      ipAddress:
        ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
    });

    return { success: true };
  }),

  /**
   * Revoke all permissions for a principal on a resource.
   */
  revoke: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
        principalType: principalTypeSchema,
        principalId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

      // Get current permissions before revoking for audit log
      const existingEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          principalType: input.principalType,
          principalId: input.principalId,
        },
        select: { permissions: true, deny: true },
      });

      await aclService.revokePermission({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principalType: input.principalType,
        principalId: input.principalId,
      });

      // Audit logging
      const [principalName, resourceInfo] = await Promise.all([
        getPrincipalName(input.principalType, input.principalId, ctx.prisma),
        getResourceInfo(input.resourceType, input.resourceId, ctx.prisma),
      ]);
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_REVOKED,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceName: resourceInfo.name,
        targetType: input.principalType,
        targetId: input.principalId,
        targetName: principalName,
        changes: { before: { entries: existingEntries } },
        userId: ctx.user!.id,
        workspaceId: resourceInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true };
    }),

  /**
   * Update an existing ACL entry by ID.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        permissions: z.number().min(0).max(31),
        inheritToChildren: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the entry first to check authorization
      const entry = await ctx.prisma.aclEntry.findUnique({
        where: { id: input.id },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ACL entry niet gevonden',
        });
      }

      await requireAclManagement(ctx.user!.id, entry.resourceType, entry.resourceId, ctx.prisma);

      await ctx.prisma.aclEntry.update({
        where: { id: input.id },
        data: {
          permissions: input.permissions,
          ...(input.inheritToChildren !== undefined && {
            inheritToChildren: input.inheritToChildren,
          }),
        },
      });

      return { success: true };
    }),

  /**
   * Delete an ACL entry by ID.
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the entry first to check authorization
      const entry = await ctx.prisma.aclEntry.findUnique({
        where: { id: input.id },
      });

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ACL entry niet gevonden',
        });
      }

      await requireAclManagement(ctx.user!.id, entry.resourceType, entry.resourceId, ctx.prisma);

      await ctx.prisma.aclEntry.delete({
        where: { id: input.id },
      });

      // Emit real-time event
      emitAclDeleted({
        entryId: entry.id,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        principalType: entry.principalType as 'user' | 'group',
        principalId: entry.principalId,
        triggeredBy: {
          id: ctx.user!.id,
          username: ctx.user!.username,
        },
        timestamp: new Date().toISOString(),
      });

      // Audit logging
      const [principalName, resourceInfo] = await Promise.all([
        getPrincipalName(entry.principalType as 'user' | 'group', entry.principalId, ctx.prisma),
        getResourceInfo(entry.resourceType, entry.resourceId, ctx.prisma),
      ]);
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_DELETED,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        resourceName: resourceInfo.name,
        targetType: entry.principalType,
        targetId: entry.principalId,
        targetName: principalName,
        changes: {
          before: {
            permissions: entry.permissions,
            deny: entry.deny,
            inheritToChildren: entry.inheritToChildren,
          },
        },
        userId: ctx.user!.id,
        workspaceId: resourceInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { success: true };
    }),

  // ===========================================================================
  // Bulk Operations (Fase 9.4)
  // ===========================================================================

  /**
   * Bulk grant permissions to multiple principals on a resource.
   */
  bulkGrant: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
        principals: z
          .array(
            z.object({
              type: principalTypeSchema,
              id: z.number(),
            })
          )
          .min(1)
          .max(100),
        permissions: z.number().min(0).max(31),
        inheritToChildren: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

      const result = await aclService.bulkGrantPermission({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principals: input.principals,
        permissions: input.permissions,
        inheritToChildren: input.inheritToChildren,
        createdById: ctx.user!.id,
      });

      // Emit real-time event for each principal
      for (const principal of input.principals) {
        emitAclGranted({
          entryId: 0, // Bulk operation, individual IDs not tracked
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          principalType: principal.type,
          principalId: principal.id,
          permissions: input.permissions,
          deny: false,
          triggeredBy: {
            id: ctx.user!.id,
            username: ctx.user!.username,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Audit logging - single entry for bulk operation
      const resourceInfo = await getResourceInfo(input.resourceType, input.resourceId, ctx.prisma);
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_BULK_GRANTED,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceName: resourceInfo.name,
        changes: {
          principalCount: input.principals.length,
          permissions: input.permissions,
          inheritToChildren: input.inheritToChildren,
        },
        metadata: {
          success: result.success,
          failed: result.failed,
          principals: input.principals,
        },
        userId: ctx.user!.id,
        workspaceId: resourceInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    }),

  /**
   * Bulk revoke permissions from multiple principals on a resource.
   */
  bulkRevoke: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
        principals: z
          .array(
            z.object({
              type: principalTypeSchema,
              id: z.number(),
            })
          )
          .min(1)
          .max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

      const result = await aclService.bulkRevokePermission({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principals: input.principals,
      });

      // Emit real-time event for each principal
      for (const principal of input.principals) {
        emitAclDeleted({
          entryId: 0, // Bulk operation, individual IDs not tracked
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          principalType: principal.type,
          principalId: principal.id,
          triggeredBy: {
            id: ctx.user!.id,
            username: ctx.user!.username,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Audit logging - single entry for bulk operation
      const resourceInfo = await getResourceInfo(input.resourceType, input.resourceId, ctx.prisma);
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_BULK_REVOKED,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceName: resourceInfo.name,
        changes: {
          principalCount: input.principals.length,
        },
        metadata: {
          success: result.success,
          failed: result.failed,
          principals: input.principals,
        },
        userId: ctx.user!.id,
        workspaceId: resourceInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    }),

  /**
   * Copy ACL entries from one resource to other resources.
   */
  copyPermissions: protectedProcedure
    .input(
      z.object({
        sourceResourceType: resourceTypeSchema,
        sourceResourceId: z.number().nullable(),
        targetResources: z
          .array(
            z.object({
              type: resourceTypeSchema,
              id: z.number().nullable(),
            })
          )
          .min(1)
          .max(50),
        overwrite: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check permission on source
      await requireAclManagement(
        ctx.user!.id,
        input.sourceResourceType,
        input.sourceResourceId,
        ctx.prisma
      );

      // Check permission on each target
      for (const target of input.targetResources) {
        await requireAclManagement(ctx.user!.id, target.type, target.id, ctx.prisma);
      }

      const result = await aclService.copyAclEntries({
        sourceResourceType: input.sourceResourceType,
        sourceResourceId: input.sourceResourceId,
        targetResources: input.targetResources,
        overwrite: input.overwrite,
        createdById: ctx.user!.id,
      });

      // Emit real-time events for each target
      for (const target of input.targetResources) {
        emitAclGranted({
          entryId: 0, // Copy operation
          resourceType: target.type,
          resourceId: target.id,
          principalType: 'user', // Placeholder
          principalId: 0, // Placeholder
          permissions: 0, // Placeholder
          deny: false,
          triggeredBy: {
            id: ctx.user!.id,
            username: ctx.user!.username,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Audit logging
      const [sourceInfo] = await Promise.all([
        getResourceInfo(input.sourceResourceType, input.sourceResourceId, ctx.prisma),
      ]);
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_COPIED,
        resourceType: input.sourceResourceType,
        resourceId: input.sourceResourceId,
        resourceName: sourceInfo.name,
        changes: {
          copiedCount: result.copiedCount,
          skippedCount: result.skippedCount,
          overwrite: input.overwrite,
        },
        metadata: {
          targetResources: input.targetResources,
        },
        userId: ctx.user!.id,
        workspaceId: sourceInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    }),

  /**
   * Apply a permission template to multiple principals on a resource.
   */
  applyTemplate: protectedProcedure
    .input(
      z.object({
        templateName: z.enum(['read_only', 'contributor', 'editor', 'full_control']),
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
        principals: z
          .array(
            z.object({
              type: principalTypeSchema,
              id: z.number(),
            })
          )
          .min(1)
          .max(100),
        inheritToChildren: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

      const result = await aclService.applyTemplate({
        templateName: input.templateName,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principals: input.principals,
        inheritToChildren: input.inheritToChildren,
        createdById: ctx.user!.id,
      });

      // Emit real-time events
      for (const principal of input.principals) {
        emitAclGranted({
          entryId: 0, // Template operation
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          principalType: principal.type,
          principalId: principal.id,
          permissions: 0, // Template applied, exact value depends on template
          deny: false,
          triggeredBy: {
            id: ctx.user!.id,
            username: ctx.user!.username,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Audit logging
      const resourceInfo = await getResourceInfo(input.resourceType, input.resourceId, ctx.prisma);
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_TEMPLATE_APPLIED,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        resourceName: resourceInfo.name,
        changes: {
          templateName: input.templateName,
          principalCount: input.principals.length,
          inheritToChildren: input.inheritToChildren,
        },
        metadata: {
          success: result.success,
          failed: result.failed,
          principals: input.principals,
        },
        userId: ctx.user!.id,
        workspaceId: resourceInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return result;
    }),

  /**
   * Get available permission presets.
   */
  getPresets: protectedProcedure.query(() => {
    return {
      permissions: {
        READ: ACL_PERMISSIONS.READ,
        WRITE: ACL_PERMISSIONS.WRITE,
        EXECUTE: ACL_PERMISSIONS.EXECUTE,
        DELETE: ACL_PERMISSIONS.DELETE,
        PERMISSIONS: ACL_PERMISSIONS.PERMISSIONS,
      },
      presets: {
        NONE: { value: ACL_PRESETS.NONE, label: 'None', description: 'Geen rechten' },
        READ_ONLY: {
          value: ACL_PRESETS.READ_ONLY,
          label: 'Read Only',
          description: 'Alleen lezen (R)',
        },
        CONTRIBUTOR: {
          value: ACL_PRESETS.CONTRIBUTOR,
          label: 'Contributor',
          description: 'Lezen, schrijven, uitvoeren (R+W+X)',
        },
        EDITOR: {
          value: ACL_PRESETS.EDITOR,
          label: 'Editor',
          description: 'Alles behalve rechten beheren (R+W+X+D)',
        },
        FULL_CONTROL: {
          value: ACL_PRESETS.FULL_CONTROL,
          label: 'Full Control',
          description: 'Volledige controle (R+W+X+D+P)',
        },
      },
    };
  }),

  /**
   * Get all users and groups for ACL assignment.
   * Used by the UI to populate dropdowns.
   */
  getPrincipals: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get users
      const users = await ctx.prisma.user.findMany({
        where: {
          isActive: true,
          ...(input.search && {
            OR: [
              { username: { contains: input.search, mode: 'insensitive' } },
              { name: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
        take: 50,
        orderBy: { name: 'asc' },
      });

      // Get groups (optionally filtered by workspace)
      const groups = await ctx.prisma.group.findMany({
        where: {
          isActive: true,
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { displayName: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          workspaceId: true,
          _count: {
            select: { members: true },
          },
        },
        take: 50,
        orderBy: { displayName: 'asc' },
      });

      return {
        users: users.map((u) => ({
          id: u.id,
          type: 'user' as const,
          name: u.username,
          displayName: u.name,
          email: u.email,
          avatarUrl: u.avatarUrl,
        })),
        groups: groups.map((g) => ({
          id: g.id,
          type: 'group' as const,
          name: g.name,
          displayName: g.displayName,
          groupType: g.type,
          workspaceId: g.workspaceId,
          memberCount: g._count.members,
        })),
      };
    }),

  /**
   * Get all resources that can have ACLs.
   * Used by the UI for resource selection.
   * Filtered based on user's scope (Fase 6).
   */
  getResources: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user!.id;

    // Get user's scope to filter resources
    const userScope = await scopeService.getUserScope(userId);

    // Super Admin check (role-based)
    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isSuperAdmin = user?.role === 'ADMIN';
    const isDomainAdmin = userScope.isDomainAdmin;

    // Get workspaces - filtered by scope
    const workspaceWhereClause = await scopeService.getWorkspaceWhereClause(userId);
    const workspaces = await ctx.prisma.workspace.findMany({
      where: { isActive: true, ...workspaceWhereClause },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    // Get projects - filtered by scope
    const projectWhereClause = await scopeService.getProjectWhereClause(userId);
    const projects = await ctx.prisma.project.findMany({
      where: { isActive: true, ...projectWhereClause },
      select: {
        id: true,
        name: true,
        identifier: true,
        workspaceId: true,
        workspace: { select: { name: true, slug: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Get features - system-wide features (Fase 8B + 8C)
    // Now includes scope field to group features by section
    const features = await ctx.prisma.feature.findMany({
      where: { isActive: true, projectId: null }, // System-wide features only
      select: {
        id: true,
        scope: true, // Fase 8C: dashboard | profile | admin | project
        slug: true,
        name: true,
        description: true,
        icon: true,
        sortOrder: true,
      },
      orderBy: [{ scope: 'asc' }, { sortOrder: 'asc' }],
    });

    // Build resource types based on scope
    // Domain Admins can see root, system, dashboard
    // Workspace Admins can only see workspace/project/feature
    const resourceTypes = [
      ...(isDomainAdmin
        ? [
            { type: 'root', label: 'Root (Kanbu)', supportsRoot: true },
            { type: 'system', label: 'System', supportsRoot: true },
            { type: 'dashboard', label: 'Dashboard', supportsRoot: true },
          ]
        : []),
      { type: 'workspace', label: 'Workspace', supportsRoot: true },
      { type: 'project', label: 'Project', supportsRoot: true },
      { type: 'feature', label: 'Feature', supportsRoot: false }, // Features are always under projects
      ...(isSuperAdmin
        ? [
            { type: 'admin', label: 'Administration', supportsRoot: true },
            { type: 'profile', label: 'Profile', supportsRoot: true },
          ]
        : []),
    ];

    return {
      // Extended resource types hierarchy (Fase 4C, 8B, filtered by scope in Fase 6)
      resourceTypes,
      workspaces: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        resourceType: 'workspace' as const,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        identifier: p.identifier,
        workspaceId: p.workspaceId,
        workspaceName: p.workspace.name,
        resourceType: 'project' as const,
      })),
      // System features grouped by scope (Fase 8C)
      // - dashboard: Dashboard menu items
      // - profile: User profile features
      // - admin: Administration features
      // - project: Project-specific features
      features: features.map((f) => ({
        id: f.id,
        scope: f.scope, // 'dashboard' | 'profile' | 'admin' | 'project'
        slug: f.slug,
        name: f.name,
        description: f.description,
        icon: f.icon,
        sortOrder: f.sortOrder,
        resourceType: 'feature' as const,
      })),
    };
  }),

  // ===========================================================================
  // Advanced UI (Fase 9.5)
  // ===========================================================================

  /**
   * Get permission matrix - grid of principals × resources with effective permissions.
   * Used for the Permission Matrix page.
   */
  getPermissionMatrix: protectedProcedure
    .input(
      z.object({
        resourceTypes: z.array(resourceTypeSchema).optional(),
        workspaceId: z.number().optional(),
        includeInherited: z.boolean().default(true),
        principalTypes: z.array(principalTypeSchema).optional(),
        limit: z.number().max(100).default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Require admin access
      const userScope = await scopeService.getUserScope(ctx.user!.id);
      if (!userScope.isDomainAdmin && !userScope.permissions.canManageAcl) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Je hebt geen rechten om de permission matrix te bekijken',
        });
      }

      // Build resource filter
      const resourceWhere: Record<string, unknown> = {};
      if (input.resourceTypes && input.resourceTypes.length > 0) {
        resourceWhere.resourceType = { in: input.resourceTypes };
      }
      if (input.workspaceId) {
        // Filter to workspace and its projects
        resourceWhere.OR = [
          { resourceType: 'workspace', resourceId: input.workspaceId },
          {
            resourceType: 'project',
            resourceId: {
              in: await ctx.prisma.project
                .findMany({
                  where: { workspaceId: input.workspaceId },
                  select: { id: true },
                })
                .then((p) => p.map((x) => x.id)),
            },
          },
        ];
      }

      // Get principals based on filter
      const principalFilter =
        input.principalTypes && input.principalTypes.length > 0
          ? { principalType: { in: input.principalTypes } }
          : {};

      // Get distinct ACL entries for principals
      const aclEntries = await ctx.prisma.aclEntry.findMany({
        where: { ...resourceWhere, ...principalFilter },
        select: {
          resourceType: true,
          resourceId: true,
          principalType: true,
          principalId: true,
          permissions: true,
          deny: true,
          inheritToChildren: true,
        },
        orderBy: [
          { principalType: 'asc' },
          { principalId: 'asc' },
          { resourceType: 'asc' },
          { resourceId: 'asc' },
        ],
      });

      // Get unique principals
      const principalSet = new Set<string>();
      aclEntries.forEach((e) => principalSet.add(`${e.principalType}:${e.principalId}`));
      const principalKeys = Array.from(principalSet).slice(
        input.offset,
        input.offset + input.limit
      );

      // Fetch principal details
      const userIds = principalKeys
        .filter((k) => k.startsWith('user:'))
        .map((k) => parseInt(k.split(':')[1] ?? '0'));
      const groupIds = principalKeys
        .filter((k) => k.startsWith('group:'))
        .map((k) => parseInt(k.split(':')[1] ?? '0'));

      const [users, groups] = await Promise.all([
        ctx.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, name: true },
        }),
        ctx.prisma.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true, displayName: true },
        }),
      ]);

      const principals = [
        ...users.map((u) => ({
          type: 'user' as const,
          id: u.id,
          name: u.username,
          displayName: u.name,
        })),
        ...groups.map((g) => ({
          type: 'group' as const,
          id: g.id,
          name: g.name,
          displayName: g.displayName,
        })),
      ];

      // Get unique resources
      const resourceSet = new Set<string>();
      aclEntries.forEach((e) => resourceSet.add(`${e.resourceType}:${e.resourceId ?? 'null'}`));

      // Fetch resource details
      const workspaceIds = Array.from(resourceSet)
        .filter((k) => k.startsWith('workspace:') && !k.endsWith(':null'))
        .map((k) => parseInt(k.split(':')[1] ?? '0'));
      const projectIds = Array.from(resourceSet)
        .filter((k) => k.startsWith('project:') && !k.endsWith(':null'))
        .map((k) => parseInt(k.split(':')[1] ?? '0'));

      const [workspaces, projects] = await Promise.all([
        ctx.prisma.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, name: true },
        }),
        ctx.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true, workspace: { select: { name: true } } },
        }),
      ]);

      const resources = Array.from(resourceSet).map((key) => {
        const parts = key.split(':');
        const type = parts[0] ?? '';
        const idStr = parts[1] ?? 'null';
        const id = idStr === 'null' ? null : parseInt(idStr);
        let name = type;
        let path = type;

        if (type === 'workspace' && id) {
          const ws = workspaces.find((w) => w.id === id);
          name = ws?.name ?? `Workspace #${id}`;
          path = name;
        } else if (type === 'project' && id) {
          const proj = projects.find((p) => p.id === id);
          name = proj?.name ?? `Project #${id}`;
          path = `${proj?.workspace?.name ?? 'Unknown'} > ${name}`;
        } else if (id === null) {
          name = `All ${type}s`;
          path = `${type} (root)`;
        }

        return { type, id, name, path };
      });

      // Build cells - each principal × resource combination
      const cells = aclEntries
        .filter((e) => principalKeys.includes(`${e.principalType}:${e.principalId}`))
        .map((e) => ({
          principalType: e.principalType,
          principalId: e.principalId,
          resourceType: e.resourceType,
          resourceId: e.resourceId,
          effectivePermissions: e.deny ? 0 : e.permissions,
          isDirect: true,
          isDenied: e.deny,
          inheritedFrom: undefined,
        }));

      return {
        principals,
        resources,
        cells,
        totals: {
          principals: principalSet.size,
          resources: resourceSet.size,
        },
      };
    }),

  /**
   * Calculate effective permissions with detailed breakdown.
   * Shows exactly why a user has certain permissions.
   */
  calculateEffective: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Only admins can check other users' permissions
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: { role: true },
      });

      if (user?.role !== 'ADMIN' && input.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Je kunt alleen je eigen permissies bekijken',
        });
      }

      // Get target user info
      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, username: true, name: true, email: true },
      });
      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gebruiker niet gevonden' });
      }

      // Get resource info
      const resourceInfo = await getResourceInfo(input.resourceType, input.resourceId, ctx.prisma);

      // Get user's group memberships
      const groupMemberships = await ctx.prisma.groupMember.findMany({
        where: { userId: input.userId },
        include: { group: { select: { id: true, name: true, displayName: true } } },
      });
      const groupIds = groupMemberships.map((gm) => gm.groupId);

      // Get direct user entries for this resource
      const directEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          principalType: 'user',
          principalId: input.userId,
        },
        select: {
          id: true,
          permissions: true,
          deny: true,
          inheritToChildren: true,
        },
      });

      // Get group entries for this resource
      const groupEntries =
        groupIds.length > 0
          ? await ctx.prisma.aclEntry.findMany({
              where: {
                resourceType: input.resourceType,
                resourceId: input.resourceId,
                principalType: 'group',
                principalId: { in: groupIds },
              },
              select: {
                principalId: true,
                permissions: true,
                deny: true,
              },
            })
          : [];

      // Get inherited entries from parent resources
      const inheritedEntries: Array<{
        fromResourceType: string;
        fromResourceId: number | null;
        fromResourceName: string;
        permissions: number;
        presetName: string | null;
        deny: boolean;
        source: 'user' | 'group';
        groupName?: string;
      }> = [];

      // Check parent resources for inherited permissions
      if (input.resourceType === 'project' && input.resourceId) {
        const project = await ctx.prisma.project.findUnique({
          where: { id: input.resourceId },
          select: { workspaceId: true, workspace: { select: { name: true } } },
        });
        if (project) {
          // Check workspace-level entries
          const workspaceEntries = await ctx.prisma.aclEntry.findMany({
            where: {
              resourceType: 'workspace',
              resourceId: project.workspaceId,
              inheritToChildren: true,
              OR: [
                { principalType: 'user', principalId: input.userId },
                { principalType: 'group', principalId: { in: groupIds } },
              ],
            },
            select: {
              principalType: true,
              principalId: true,
              permissions: true,
              deny: true,
            },
          });
          for (const entry of workspaceEntries) {
            const groupName =
              entry.principalType === 'group'
                ? groupMemberships.find((gm) => gm.groupId === entry.principalId)?.group.displayName
                : undefined;
            inheritedEntries.push({
              fromResourceType: 'workspace',
              fromResourceId: project.workspaceId,
              fromResourceName: project.workspace.name,
              permissions: entry.permissions,
              presetName: aclService.getPresetName(entry.permissions),
              deny: entry.deny,
              source: entry.principalType as 'user' | 'group',
              groupName,
            });
          }
        }
      }

      // Calculate effective permissions
      let allowedBits = 0;
      let deniedBits = 0;

      // Process direct entries
      for (const entry of directEntries) {
        if (entry.deny) {
          deniedBits |= entry.permissions;
        } else {
          allowedBits |= entry.permissions;
        }
      }

      // Process group entries
      for (const entry of groupEntries) {
        if (entry.deny) {
          deniedBits |= entry.permissions;
        } else {
          allowedBits |= entry.permissions;
        }
      }

      // Process inherited entries
      for (const entry of inheritedEntries) {
        if (entry.deny) {
          deniedBits |= entry.permissions;
        } else {
          allowedBits |= entry.permissions;
        }
      }

      const finalBits = allowedBits & ~deniedBits;

      return {
        user: targetUser,
        resource: {
          type: input.resourceType,
          id: input.resourceId,
          name: resourceInfo.name,
          path: resourceInfo.name,
        },
        effectivePermissions: finalBits,
        effectivePreset: aclService.getPresetName(finalBits),
        directEntries: directEntries.map((e) => ({
          ...e,
          presetName: aclService.getPresetName(e.permissions),
        })),
        groupEntries: groupEntries.map((e) => {
          const group = groupMemberships.find((gm) => gm.groupId === e.principalId);
          return {
            groupId: e.principalId,
            groupName: group?.group.displayName ?? `Group #${e.principalId}`,
            permissions: e.permissions,
            presetName: aclService.getPresetName(e.permissions),
            deny: e.deny,
          };
        }),
        inheritedEntries,
        calculation: {
          allowedBits,
          deniedBits,
          finalBits,
          formula: `${allowedBits} & ~${deniedBits} = ${finalBits}`,
        },
      };
    }),

  /**
   * Simulate an ACL change without persisting it.
   * Used for the What-If Simulator.
   */
  simulateChange: protectedProcedure
    .input(
      z.object({
        action: z.enum(['grant', 'deny', 'revoke', 'template']),
        resourceType: resourceTypeSchema,
        resourceId: z.number().nullable(),
        principals: z
          .array(
            z.object({
              type: principalTypeSchema,
              id: z.number(),
            })
          )
          .min(1)
          .max(100),
        permissions: z.number().optional(),
        templateName: z.enum(['read_only', 'contributor', 'editor', 'full_control']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma);

      // Map template to permissions
      const targetPermissions = input.templateName
        ? ACL_PRESETS[input.templateName.toUpperCase() as keyof typeof ACL_PRESETS]
        : (input.permissions ?? 0);

      // Get current entries for each principal
      const currentEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          OR: input.principals.map((p) => ({
            principalType: p.type,
            principalId: p.id,
          })),
        },
        select: {
          principalType: true,
          principalId: true,
          permissions: true,
          deny: true,
        },
      });

      // Get principal names
      const userIds = input.principals.filter((p) => p.type === 'user').map((p) => p.id);
      const groupIds = input.principals.filter((p) => p.type === 'group').map((p) => p.id);
      const [users, groups] = await Promise.all([
        ctx.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, username: true },
        }),
        ctx.prisma.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true, displayName: true },
        }),
      ]);

      // Build changes preview
      const changes = input.principals.map((principal) => {
        const current = currentEntries.find(
          (e) => e.principalType === principal.type && e.principalId === principal.id && !e.deny
        );
        const currentDeny = currentEntries.find(
          (e) => e.principalType === principal.type && e.principalId === principal.id && e.deny
        );

        // Get name
        const name =
          principal.type === 'user'
            ? (users.find((u) => u.id === principal.id)?.name ?? `User #${principal.id}`)
            : (groups.find((g) => g.id === principal.id)?.displayName ?? `Group #${principal.id}`);

        const before = current
          ? {
              permissions: current.permissions,
              presetName: aclService.getPresetName(current.permissions),
              deny: false,
            }
          : currentDeny
            ? {
                permissions: currentDeny.permissions,
                presetName: aclService.getPresetName(currentDeny.permissions),
                deny: true,
              }
            : null;

        let after: { permissions: number; presetName: string | null; deny: boolean } | null = null;
        let impact: 'new' | 'upgraded' | 'downgraded' | 'unchanged' | 'removed' = 'unchanged';
        let bitsDiff = 0;

        if (input.action === 'revoke') {
          after = null;
          impact = before ? 'removed' : 'unchanged';
          bitsDiff = before ? -before.permissions : 0;
        } else if (input.action === 'deny') {
          after = {
            permissions: targetPermissions,
            presetName: aclService.getPresetName(targetPermissions),
            deny: true,
          };
          impact = before ? (before.deny ? 'unchanged' : 'downgraded') : 'new';
          bitsDiff = before ? -before.permissions : 0;
        } else {
          // grant or template
          after = {
            permissions: targetPermissions,
            presetName: aclService.getPresetName(targetPermissions),
            deny: false,
          };
          if (!before) {
            impact = 'new';
            bitsDiff = targetPermissions;
          } else if (before.deny) {
            impact = 'upgraded';
            bitsDiff = targetPermissions;
          } else if (targetPermissions > before.permissions) {
            impact = 'upgraded';
            bitsDiff = targetPermissions - before.permissions;
          } else if (targetPermissions < before.permissions) {
            impact = 'downgraded';
            bitsDiff = targetPermissions - before.permissions;
          } else {
            impact = 'unchanged';
            bitsDiff = 0;
          }
        }

        return {
          principal: { type: principal.type, id: principal.id, name },
          before,
          after,
          impact,
          bitsDiff,
        };
      });

      // Build summary
      const summary = {
        new: changes.filter((c) => c.impact === 'new').length,
        upgraded: changes.filter((c) => c.impact === 'upgraded').length,
        downgraded: changes.filter((c) => c.impact === 'downgraded').length,
        unchanged: changes.filter((c) => c.impact === 'unchanged').length,
        removed: changes.filter((c) => c.impact === 'removed').length,
      };

      // Generate warnings
      const warnings: string[] = [];
      if (targetPermissions === ACL_PRESETS.FULL_CONTROL && summary.new + summary.upgraded > 0) {
        warnings.push(`Dit geeft Full Control aan ${summary.new + summary.upgraded} principal(s)`);
      }
      if (
        input.resourceType === 'admin' ||
        input.resourceType === 'system' ||
        input.resourceType === 'root'
      ) {
        warnings.push(`Let op: Dit is een systeem-level resource`);
      }

      return { changes, summary, warnings };
    }),

  /**
   * Export ACL configuration.
   * Returns ACL entries in JSON or CSV format.
   */
  exportAcl: protectedProcedure
    .input(
      z.object({
        resourceType: resourceTypeSchema.optional(),
        resourceId: z.number().nullable().optional(),
        format: z.enum(['json', 'csv']),
        includeChildren: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      // Require admin access
      const userScope = await scopeService.getUserScope(ctx.user!.id);
      if (!userScope.isDomainAdmin && !userScope.permissions.canManageAcl) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Je hebt geen rechten om ACL te exporteren',
        });
      }

      // Build where clause
      const where: Record<string, unknown> = {};
      if (input.resourceType) {
        if (input.includeChildren && input.resourceId) {
          // Include children (e.g., workspace + its projects)
          if (input.resourceType === 'workspace') {
            const projects = await ctx.prisma.project.findMany({
              where: { workspaceId: input.resourceId },
              select: { id: true },
            });
            where.OR = [
              { resourceType: 'workspace', resourceId: input.resourceId },
              { resourceType: 'project', resourceId: { in: projects.map((p) => p.id) } },
            ];
          } else {
            where.resourceType = input.resourceType;
            where.resourceId = input.resourceId;
          }
        } else {
          where.resourceType = input.resourceType;
          if (input.resourceId !== undefined) {
            where.resourceId = input.resourceId;
          }
        }
      }

      // Get entries with principal info
      const entries = await ctx.prisma.aclEntry.findMany({
        where,
        orderBy: [
          { resourceType: 'asc' },
          { resourceId: 'asc' },
          { principalType: 'asc' },
          { principalId: 'asc' },
        ],
      });

      // Enrich with names
      const userIds = [
        ...new Set(entries.filter((e) => e.principalType === 'user').map((e) => e.principalId)),
      ];
      const groupIds = [
        ...new Set(entries.filter((e) => e.principalType === 'group').map((e) => e.principalId)),
      ];
      const workspaceIds = [
        ...new Set(
          entries
            .filter((e) => e.resourceType === 'workspace' && e.resourceId)
            .map((e) => e.resourceId as number)
        ),
      ];
      const projectIds = [
        ...new Set(
          entries
            .filter((e) => e.resourceType === 'project' && e.resourceId)
            .map((e) => e.resourceId as number)
        ),
      ];

      const [users, groups, workspaces, projects] = await Promise.all([
        ctx.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true },
        }),
        ctx.prisma.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true },
        }),
        ctx.prisma.workspace.findMany({
          where: { id: { in: workspaceIds } },
          select: { id: true, name: true },
        }),
        ctx.prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, name: true },
        }),
      ]);

      const enrichedEntries = entries.map((e) => {
        const principalName =
          e.principalType === 'user'
            ? (users.find((u) => u.id === e.principalId)?.username ?? `user#${e.principalId}`)
            : (groups.find((g) => g.id === e.principalId)?.name ?? `group#${e.principalId}`);

        let resourceName = e.resourceType;
        if (e.resourceId) {
          if (e.resourceType === 'workspace') {
            resourceName =
              workspaces.find((w) => w.id === e.resourceId)?.name ?? `workspace#${e.resourceId}`;
          } else if (e.resourceType === 'project') {
            resourceName =
              projects.find((p) => p.id === e.resourceId)?.name ?? `project#${e.resourceId}`;
          }
        }

        return {
          resourceType: e.resourceType,
          resourceId: e.resourceId,
          resourceName,
          principalType: e.principalType,
          principalId: e.principalId,
          principalName,
          permissions: e.permissions,
          permissionNames: aclService.permissionToArray(e.permissions),
          presetName: aclService.getPresetName(e.permissions),
          deny: e.deny,
          inheritToChildren: e.inheritToChildren,
        };
      });

      // Build scope info
      const scopeInfo =
        input.resourceType && input.resourceId
          ? await getResourceInfo(input.resourceType, input.resourceId, ctx.prisma)
          : { name: 'All resources', workspaceId: null };

      // Audit log
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_EXPORTED,
        resourceType: input.resourceType ?? 'all',
        resourceId: input.resourceId ?? null,
        resourceName: scopeInfo.name,
        metadata: {
          format: input.format,
          includeChildren: input.includeChildren,
          entryCount: entries.length,
        },
        userId: ctx.user!.id,
        workspaceId: scopeInfo.workspaceId,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      if (input.format === 'json') {
        return {
          format: 'json' as const,
          data: JSON.stringify(
            {
              version: '1.0',
              exportedAt: new Date().toISOString(),
              exportedBy: ctx.user!.username,
              scope: {
                type: input.resourceType ?? 'all',
                id: input.resourceId ?? null,
                name: scopeInfo.name,
              },
              entries: enrichedEntries,
              metadata: {
                totalEntries: entries.length,
                userCount: new Set(
                  entries.filter((e) => e.principalType === 'user').map((e) => e.principalId)
                ).size,
                groupCount: new Set(
                  entries.filter((e) => e.principalType === 'group').map((e) => e.principalId)
                ).size,
              },
            },
            null,
            2
          ),
        };
      } else {
        // CSV format
        const header =
          'resource_type,resource_id,resource_name,principal_type,principal_id,principal_name,permissions,preset,deny,inherit';
        const rows = enrichedEntries.map(
          (e) =>
            `${e.resourceType},${e.resourceId ?? ''},${e.resourceName},${e.principalType},${e.principalId},${e.principalName},${e.permissions},${e.presetName ?? ''},${e.deny},${e.inheritToChildren}`
        );
        return {
          format: 'csv' as const,
          data: [header, ...rows].join('\n'),
        };
      }
    }),

  /**
   * Preview ACL import (dry run).
   * Parses input and shows what will be imported.
   */
  importPreview: protectedProcedure
    .input(
      z.object({
        data: z.string(),
        format: z.enum(['json', 'csv']),
        mode: z.enum(['skip', 'overwrite', 'merge']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Require admin access
      const userScope = await scopeService.getUserScope(ctx.user!.id);
      if (!userScope.isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Alleen Domain Admins kunnen ACL importeren',
        });
      }

      // Parse input
      const entries: Array<{
        resourceType: string;
        resourceId: number | null;
        principalType: string;
        principalId: number;
        principalName?: string;
        permissions: number;
        deny: boolean;
        inheritToChildren: boolean;
      }> = [];

      if (input.format === 'json') {
        try {
          const parsed = JSON.parse(input.data);
          if (!parsed.entries || !Array.isArray(parsed.entries)) {
            throw new Error('Invalid JSON format: missing entries array');
          }
          for (const e of parsed.entries) {
            entries.push({
              resourceType: e.resourceType,
              resourceId: e.resourceId ?? null,
              principalType: e.principalType,
              principalId: e.principalId,
              principalName: e.principalName,
              permissions: e.permissions,
              deny: e.deny ?? false,
              inheritToChildren: e.inheritToChildren ?? true,
            });
          }
        } catch (err) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `JSON parse error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      } else {
        // CSV format
        const lines = input.data.trim().split('\n');
        if (lines.length < 2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'CSV must have header and at least one data row',
          });
        }
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = line.split(',');
          if (cols.length < 10) continue;
          entries.push({
            resourceType: cols[0] ?? '',
            resourceId: cols[1] ? parseInt(cols[1]) : null,
            principalType: cols[3] ?? '',
            principalId: parseInt(cols[4] ?? '0'),
            principalName: cols[5] ?? '',
            permissions: parseInt(cols[6] ?? '0'),
            deny: cols[8] === 'true',
            inheritToChildren: cols[9] !== 'false',
          });
        }
      }

      // Check existing entries
      const existingEntries = await ctx.prisma.aclEntry.findMany({
        where: {
          OR: entries.map((e) => ({
            resourceType: e.resourceType,
            resourceId: e.resourceId,
            principalType: e.principalType,
            principalId: e.principalId,
          })),
        },
        select: {
          resourceType: true,
          resourceId: true,
          principalType: true,
          principalId: true,
          permissions: true,
          deny: true,
        },
      });

      // Build preview
      const preview = entries.map((e) => {
        const existing = existingEntries.find(
          (ex) =>
            ex.resourceType === e.resourceType &&
            ex.resourceId === e.resourceId &&
            ex.principalType === e.principalType &&
            ex.principalId === e.principalId
        );

        let action: 'create' | 'update' | 'skip' = 'create';
        if (existing) {
          if (input.mode === 'skip') {
            action = 'skip';
          } else if (input.mode === 'overwrite') {
            action = 'update';
          } else {
            // merge - only update if new permissions are different
            action = e.permissions !== existing.permissions ? 'update' : 'skip';
          }
        }

        return {
          ...e,
          action,
          existing: existing ? { permissions: existing.permissions, deny: existing.deny } : null,
        };
      });

      return {
        totalEntries: entries.length,
        toCreate: preview.filter((p) => p.action === 'create').length,
        toUpdate: preview.filter((p) => p.action === 'update').length,
        toSkip: preview.filter((p) => p.action === 'skip').length,
        entries: preview,
      };
    }),

  /**
   * Execute ACL import.
   */
  importExecute: protectedProcedure
    .input(
      z.object({
        data: z.string(),
        format: z.enum(['json', 'csv']),
        mode: z.enum(['skip', 'overwrite', 'merge']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Require admin access
      const userScope = await scopeService.getUserScope(ctx.user!.id);
      if (!userScope.isDomainAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Alleen Domain Admins kunnen ACL importeren',
        });
      }

      // Parse input (same as preview)
      const entries: Array<{
        resourceType: string;
        resourceId: number | null;
        principalType: string;
        principalId: number;
        permissions: number;
        deny: boolean;
        inheritToChildren: boolean;
      }> = [];

      if (input.format === 'json') {
        const parsed = JSON.parse(input.data);
        for (const e of parsed.entries) {
          entries.push({
            resourceType: e.resourceType,
            resourceId: e.resourceId ?? null,
            principalType: e.principalType,
            principalId: e.principalId,
            permissions: e.permissions,
            deny: e.deny ?? false,
            inheritToChildren: e.inheritToChildren ?? true,
          });
        }
      } else {
        const lines = input.data.trim().split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = line.split(',');
          if (cols.length < 10) continue;
          entries.push({
            resourceType: cols[0] ?? '',
            resourceId: cols[1] ? parseInt(cols[1]) : null,
            principalType: cols[3] ?? '',
            principalId: parseInt(cols[4] ?? '0'),
            permissions: parseInt(cols[6] ?? '0'),
            deny: cols[8] === 'true',
            inheritToChildren: cols[9] !== 'false',
          });
        }
      }

      // Execute import in transaction
      let created = 0;
      let updated = 0;
      let skipped = 0;

      await ctx.prisma.$transaction(async (tx) => {
        for (const e of entries) {
          const existing = await tx.aclEntry.findFirst({
            where: {
              resourceType: e.resourceType,
              resourceId: e.resourceId,
              principalType: e.principalType,
              principalId: e.principalId,
            },
          });

          if (existing) {
            if (input.mode === 'skip') {
              skipped++;
            } else if (
              input.mode === 'overwrite' ||
              (input.mode === 'merge' && e.permissions !== existing.permissions)
            ) {
              await tx.aclEntry.update({
                where: { id: existing.id },
                data: {
                  permissions: e.permissions,
                  deny: e.deny,
                  inheritToChildren: e.inheritToChildren,
                },
              });
              updated++;
            } else {
              skipped++;
            }
          } else {
            await tx.aclEntry.create({
              data: {
                resourceType: e.resourceType,
                resourceId: e.resourceId,
                principalType: e.principalType,
                principalId: e.principalId,
                permissions: e.permissions,
                deny: e.deny,
                inheritToChildren: e.inheritToChildren,
                createdById: ctx.user!.id,
              },
            });
            created++;
          }
        }
      });

      // Audit log
      await auditService.logAclEvent({
        action: AUDIT_ACTIONS.ACL_IMPORTED,
        resourceType: 'all',
        resourceId: null,
        resourceName: 'ACL Import',
        metadata: {
          format: input.format,
          mode: input.mode,
          created,
          updated,
          skipped,
          totalEntries: entries.length,
        },
        userId: ctx.user!.id,
        workspaceId: null,
        ipAddress:
          ctx.req?.headers?.['x-forwarded-for']?.toString() || ctx.req?.socket?.remoteAddress,
      });

      return { created, updated, skipped };
    }),

  /**
   * Get ACL statistics.
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can see stats
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user!.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Alleen admins kunnen ACL statistieken bekijken',
      });
    }

    const [total, byType, denyCount] = await Promise.all([
      ctx.prisma.aclEntry.count(),
      ctx.prisma.aclEntry.groupBy({
        by: ['resourceType'],
        _count: true,
      }),
      ctx.prisma.aclEntry.count({ where: { deny: true } }),
    ]);

    return {
      total,
      byType: byType.reduce(
        (acc, item) => {
          acc[item.resourceType] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      denyCount,
      allowCount: total - denyCount,
    };
  }),
});
