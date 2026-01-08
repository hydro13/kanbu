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

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { aclService, ACL_PERMISSIONS, ACL_PRESETS } from '../../services/aclService'
import { scopeService } from '../../services/scopeService'
import { emitAclGranted, emitAclDenied, emitAclDeleted } from '../../socket/emitter'

// =============================================================================
// Schemas
// =============================================================================

// Extended resource types (Fase 4C: added root, system, dashboard)
const resourceTypeSchema = z.enum(['root', 'system', 'dashboard', 'workspace', 'project', 'admin', 'profile'])
const principalTypeSchema = z.enum(['user', 'group'])

const aclEntrySchema = z.object({
  resourceType: resourceTypeSchema,
  resourceId: z.number().nullable(),
  principalType: principalTypeSchema,
  principalId: z.number(),
  permissions: z.number().min(0).max(31),
  inheritToChildren: z.boolean().optional().default(true),
})

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
  })
  if (user?.role === 'ADMIN') {
    return true
  }

  // Check if user has PERMISSIONS permission on this resource
  return aclService.hasPermission(userId, resourceType as 'root' | 'system' | 'dashboard' | 'workspace' | 'project' | 'admin' | 'profile', resourceId, ACL_PERMISSIONS.PERMISSIONS)
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
  const canManage = await canManageAcl(userId, resourceType, resourceId, prisma)
  if (!canManage) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Je hebt geen rechten om ACLs te beheren voor deze resource',
    })
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
    .input(z.object({
      resourceType: resourceTypeSchema,
      resourceId: z.number().nullable(),
    }))
    .query(async ({ ctx, input }) => {
      // For now, allow viewing ACLs if user has READ permission or is admin
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: { role: true },
      })

      const isAdmin = user?.role === 'ADMIN'
      const hasRead = await aclService.hasPermission(
        ctx.user!.id,
        input.resourceType,
        input.resourceId,
        ACL_PERMISSIONS.READ
      )

      if (!isAdmin && !hasRead) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Geen toegang tot deze resource',
        })
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
      })

      // Enrich with principal names
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          let principalName = ''
          let principalDisplayName = ''

          if (entry.principalType === 'user') {
            const user = await ctx.prisma.user.findUnique({
              where: { id: entry.principalId },
              select: { username: true, name: true },
            })
            principalName = user?.username ?? `User #${entry.principalId}`
            principalDisplayName = user?.name ?? principalName
          } else {
            const group = await ctx.prisma.group.findUnique({
              where: { id: entry.principalId },
              select: { name: true, displayName: true },
            })
            principalName = group?.name ?? `Group #${entry.principalId}`
            principalDisplayName = group?.displayName ?? principalName
          }

          return {
            ...entry,
            principalName,
            principalDisplayName,
            permissionNames: aclService.permissionToArray(entry.permissions),
            presetName: aclService.getPresetName(entry.permissions),
          }
        })
      )

      return enrichedEntries
    }),

  /**
   * Get effective permissions for a user on a resource.
   * Useful for debugging and showing "effective access" in UI.
   */
  checkPermission: protectedProcedure
    .input(z.object({
      userId: z.number(),
      resourceType: resourceTypeSchema,
      resourceId: z.number().nullable(),
    }))
    .query(async ({ ctx, input }) => {
      // Only admins can check other users' permissions
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: { role: true },
      })

      if (user?.role !== 'ADMIN' && input.userId !== ctx.user!.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Je kunt alleen je eigen permissies bekijken',
        })
      }

      const result = await aclService.checkPermission(
        input.userId,
        input.resourceType,
        input.resourceId
      )

      return {
        ...result,
        effectivePermissionNames: aclService.permissionToArray(result.effectivePermissions),
        deniedPermissionNames: aclService.permissionToArray(result.deniedPermissions),
        presetName: aclService.getPresetName(result.effectivePermissions),
      }
    }),

  /**
   * Grant permissions to a user or group.
   */
  grant: protectedProcedure
    .input(aclEntrySchema)
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma)

      const entry = await aclService.grantPermission({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principalType: input.principalType,
        principalId: input.principalId,
        permissions: input.permissions,
        inheritToChildren: input.inheritToChildren,
        createdById: ctx.user!.id,
      })

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
      })

      return { success: true }
    }),

  /**
   * Deny permissions to a user or group.
   */
  deny: protectedProcedure
    .input(aclEntrySchema)
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma)

      const entry = await aclService.denyPermission({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principalType: input.principalType,
        principalId: input.principalId,
        permissions: input.permissions,
        inheritToChildren: input.inheritToChildren,
        createdById: ctx.user!.id,
      })

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
      })

      return { success: true }
    }),

  /**
   * Revoke all permissions for a principal on a resource.
   */
  revoke: protectedProcedure
    .input(z.object({
      resourceType: resourceTypeSchema,
      resourceId: z.number().nullable(),
      principalType: principalTypeSchema,
      principalId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireAclManagement(ctx.user!.id, input.resourceType, input.resourceId, ctx.prisma)

      await aclService.revokePermission({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        principalType: input.principalType,
        principalId: input.principalId,
      })

      return { success: true }
    }),

  /**
   * Update an existing ACL entry by ID.
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      permissions: z.number().min(0).max(31),
      inheritToChildren: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the entry first to check authorization
      const entry = await ctx.prisma.aclEntry.findUnique({
        where: { id: input.id },
      })

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ACL entry niet gevonden',
        })
      }

      await requireAclManagement(ctx.user!.id, entry.resourceType, entry.resourceId, ctx.prisma)

      await ctx.prisma.aclEntry.update({
        where: { id: input.id },
        data: {
          permissions: input.permissions,
          ...(input.inheritToChildren !== undefined && { inheritToChildren: input.inheritToChildren }),
        },
      })

      return { success: true }
    }),

  /**
   * Delete an ACL entry by ID.
   */
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the entry first to check authorization
      const entry = await ctx.prisma.aclEntry.findUnique({
        where: { id: input.id },
      })

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'ACL entry niet gevonden',
        })
      }

      await requireAclManagement(ctx.user!.id, entry.resourceType, entry.resourceId, ctx.prisma)

      await ctx.prisma.aclEntry.delete({
        where: { id: input.id },
      })

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
      })

      return { success: true }
    }),

  /**
   * Get available permission presets.
   */
  getPresets: protectedProcedure
    .query(() => {
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
          READ_ONLY: { value: ACL_PRESETS.READ_ONLY, label: 'Read Only', description: 'Alleen lezen (R)' },
          CONTRIBUTOR: { value: ACL_PRESETS.CONTRIBUTOR, label: 'Contributor', description: 'Lezen, schrijven, uitvoeren (R+W+X)' },
          EDITOR: { value: ACL_PRESETS.EDITOR, label: 'Editor', description: 'Alles behalve rechten beheren (R+W+X+D)' },
          FULL_CONTROL: { value: ACL_PRESETS.FULL_CONTROL, label: 'Full Control', description: 'Volledige controle (R+W+X+D+P)' },
        },
      }
    }),

  /**
   * Get all users and groups for ACL assignment.
   * Used by the UI to populate dropdowns.
   */
  getPrincipals: protectedProcedure
    .input(z.object({
      workspaceId: z.number().optional(),
      search: z.string().optional(),
    }))
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
      })

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
      })

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
      }
    }),

  /**
   * Get all resources that can have ACLs.
   * Used by the UI for resource selection.
   * Filtered based on user's scope (Fase 6).
   */
  getResources: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user!.id

      // Get user's scope to filter resources
      const userScope = await scopeService.getUserScope(userId)

      // Super Admin check (role-based)
      const user = await ctx.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      const isSuperAdmin = user?.role === 'ADMIN'
      const isDomainAdmin = userScope.isDomainAdmin

      // Get workspaces - filtered by scope
      const workspaceWhereClause = await scopeService.getWorkspaceWhereClause(userId)
      const workspaces = await ctx.prisma.workspace.findMany({
        where: { isActive: true, ...workspaceWhereClause },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      })

      // Get projects - filtered by scope
      const projectWhereClause = await scopeService.getProjectWhereClause(userId)
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
      })

      // Build resource types based on scope
      // Domain Admins can see root, system, dashboard
      // Workspace Admins can only see workspace/project
      const resourceTypes = [
        ...(isDomainAdmin ? [
          { type: 'root', label: 'Root (Kanbu)', supportsRoot: true },
          { type: 'system', label: 'System', supportsRoot: true },
          { type: 'dashboard', label: 'Dashboard', supportsRoot: true },
        ] : []),
        { type: 'workspace', label: 'Workspace', supportsRoot: true },
        { type: 'project', label: 'Project', supportsRoot: true },
        ...(isSuperAdmin ? [
          { type: 'admin', label: 'Administration', supportsRoot: true },
          { type: 'profile', label: 'Profile', supportsRoot: true },
        ] : []),
      ]

      return {
        // Extended resource types hierarchy (Fase 4C, filtered by scope in Fase 6)
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
      }
    }),

  /**
   * Get ACL statistics.
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Only admins can see stats
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user!.id },
        select: { role: true },
      })

      if (user?.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Alleen admins kunnen ACL statistieken bekijken',
        })
      }

      const [total, byType, denyCount] = await Promise.all([
        ctx.prisma.aclEntry.count(),
        ctx.prisma.aclEntry.groupBy({
          by: ['resourceType'],
          _count: true,
        }),
        ctx.prisma.aclEntry.count({ where: { deny: true } }),
      ])

      return {
        total,
        byType: byType.reduce((acc, item) => {
          acc[item.resourceType] = item._count
          return acc
        }, {} as Record<string, number>),
        denyCount,
        allowCount: total - denyCount,
      }
    }),
})
