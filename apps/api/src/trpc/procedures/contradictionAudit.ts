/**
 * Contradiction Audit Procedures
 *
 * Fase 17.4 - UI Notifications & User Feedback
 *
 * tRPC procedures for:
 * - Querying contradiction audit entries
 * - Reverting contradiction resolutions
 * - Getting workspace resolution configuration
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import {
  getContradictionAuditService,
  ResolutionStrategy,
  ContradictionCategory,
  type ContradictionAuditEntry,
} from '../../lib/ai/wiki'

// =============================================================================
// Input Schemas
// =============================================================================

const pageAuditSchema = z.object({
  wikiPageId: z.number(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  includeReverted: z.boolean().optional().default(false),
})

const workspaceAuditSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  includeReverted: z.boolean().optional().default(false),
})

const auditEntrySchema = z.object({
  auditId: z.number(),
})

const revertSchema = z.object({
  auditId: z.number(),
})

const updateConfigSchema = z.object({
  workspaceId: z.number(),
  config: z.object({
    defaultStrategy: z.nativeEnum(ResolutionStrategy).optional(),
    categoryStrategies: z.record(
      z.nativeEnum(ContradictionCategory),
      z.nativeEnum(ResolutionStrategy)
    ).optional(),
    autoResolveThreshold: z.number().min(0).max(1).optional(),
    revertWindowHours: z.number().min(1).max(168).optional(), // Max 1 week
  }),
})

const getStrategySchema = z.object({
  workspaceId: z.number(),
  category: z.nativeEnum(ContradictionCategory),
  confidence: z.number().min(0).max(1),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Verify user has access to the workspace
 */
async function verifyWorkspaceAccess(
  userId: number,
  workspaceId: number
): Promise<void> {
  await permissionService.requireWorkspaceAccess(userId, workspaceId, 'VIEWER')
}

/**
 * Verify user has write access to the workspace (for config changes)
 */
async function verifyWorkspaceWriteAccess(
  userId: number,
  workspaceId: number
): Promise<void> {
  await permissionService.requireWorkspaceAccess(userId, workspaceId, 'ADMIN')
}

/**
 * Convert audit entry to API response format
 */
function formatAuditEntry(entry: ContradictionAuditEntry) {
  return {
    id: entry.id,
    workspaceId: entry.workspaceId,
    projectId: entry.projectId,
    wikiPageId: entry.wikiPageId,
    userId: entry.userId,
    newFactId: entry.newFactId,
    newFact: entry.newFact,
    invalidatedFacts: entry.invalidatedFacts,
    strategy: entry.strategy,
    confidence: entry.confidence,
    category: entry.category,
    reasoning: entry.reasoning,
    createdAt: entry.createdAt.toISOString(),
    revertedAt: entry.revertedAt?.toISOString() ?? null,
    revertedBy: entry.revertedBy,
    revertExpiresAt: entry.revertExpiresAt.toISOString(),
    canRevert: entry.canRevert,
  }
}

// =============================================================================
// Contradiction Audit Router
// =============================================================================

export const contradictionAuditRouter = router({
  /**
   * Get audit entries for a specific wiki page
   */
  getForPage: protectedProcedure
    .input(pageAuditSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id
      const auditService = getContradictionAuditService(ctx.prisma)

      // Get the wiki page to find its workspace
      const wikiPage = await ctx.prisma.wikiPage.findUnique({
        where: { id: input.wikiPageId },
        select: { project: { select: { workspaceId: true } } },
      })

      const workspaceWikiPage = wikiPage
        ? null
        : await ctx.prisma.workspaceWikiPage.findUnique({
            where: { id: input.wikiPageId },
            select: { workspaceId: true },
          })

      const workspaceId = wikiPage?.project.workspaceId ?? workspaceWikiPage?.workspaceId

      if (!workspaceId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      // Verify access
      await verifyWorkspaceAccess(userId, workspaceId)

      const entries = await auditService.getAuditEntriesForPage(input.wikiPageId, {
        limit: input.limit,
        offset: input.offset,
        includeReverted: input.includeReverted,
      })

      return {
        success: true,
        entries: entries.map(formatAuditEntry),
        count: entries.length,
        wikiPageId: input.wikiPageId,
      }
    }),

  /**
   * Get audit entries for a workspace (all wiki pages)
   */
  getForWorkspace: protectedProcedure
    .input(workspaceAuditSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const auditService = getContradictionAuditService(ctx.prisma)

      const entries = await auditService.getAuditEntriesForWorkspace(input.workspaceId, {
        projectId: input.projectId,
        limit: input.limit,
        offset: input.offset,
        includeReverted: input.includeReverted,
      })

      // Enrich with page titles and user names
      const wikiPageIds = [...new Set(entries.map((e) => e.wikiPageId))]
      const userIds = [...new Set(entries.map((e) => e.userId))]

      // Get wiki page titles (both project and workspace wikis)
      const projectWikiPages = await ctx.prisma.wikiPage.findMany({
        where: { id: { in: wikiPageIds } },
        select: { id: true, title: true },
      })
      const workspaceWikiPages = await ctx.prisma.workspaceWikiPage.findMany({
        where: { id: { in: wikiPageIds } },
        select: { id: true, title: true },
      })
      const pageTitleMap = new Map([
        ...projectWikiPages.map((p) => [p.id, p.title] as const),
        ...workspaceWikiPages.map((p) => [p.id, p.title] as const),
      ])

      // Get user names
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
      const userNameMap = new Map(users.map((u) => [u.id, u.name]))

      // Get reverted by user names
      const revertedByIds = entries
        .filter((e) => e.revertedBy !== null)
        .map((e) => e.revertedBy!)
      const revertedByUsers = revertedByIds.length > 0
        ? await ctx.prisma.user.findMany({
            where: { id: { in: revertedByIds } },
            select: { id: true, name: true },
          })
        : []
      const revertedByNameMap = new Map(revertedByUsers.map((u) => [u.id, u.name]))

      return {
        success: true,
        entries: entries.map((entry) => ({
          ...formatAuditEntry(entry),
          wikiPageTitle: pageTitleMap.get(entry.wikiPageId) ?? null,
          userName: userNameMap.get(entry.userId) ?? null,
          revertedByName: entry.revertedBy
            ? revertedByNameMap.get(entry.revertedBy) ?? null
            : null,
        })),
        count: entries.length,
        workspaceId: input.workspaceId,
        projectId: input.projectId ?? null,
      }
    }),

  /**
   * Get a single audit entry by ID
   */
  get: protectedProcedure
    .input(auditEntrySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id
      const auditService = getContradictionAuditService(ctx.prisma)

      const entry = await auditService.getAuditEntry(input.auditId)

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audit entry not found',
        })
      }

      // Verify access
      await verifyWorkspaceAccess(userId, entry.workspaceId)

      // Get additional info
      const user = await ctx.prisma.user.findUnique({
        where: { id: entry.userId },
        select: { name: true },
      })

      // Get wiki page title
      const projectWikiPage = await ctx.prisma.wikiPage.findUnique({
        where: { id: entry.wikiPageId },
        select: { title: true },
      })
      const workspaceWikiPage = projectWikiPage
        ? null
        : await ctx.prisma.workspaceWikiPage.findUnique({
            where: { id: entry.wikiPageId },
            select: { title: true },
          })
      const wikiPageTitle = projectWikiPage?.title ?? workspaceWikiPage?.title

      return {
        success: true,
        entry: {
          ...formatAuditEntry(entry),
          wikiPageTitle: wikiPageTitle ?? null,
          userName: user?.name ?? null,
        },
      }
    }),

  /**
   * Revert a contradiction resolution
   *
   * This marks the audit entry as reverted and returns the edge IDs
   * that need to be restored. The actual FalkorDB restoration should
   * be done by the caller via graphitiService.
   */
  revert: protectedProcedure
    .input(revertSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id
      const auditService = getContradictionAuditService(ctx.prisma)

      // Get the entry first to check access
      const entry = await auditService.getAuditEntry(input.auditId)

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audit entry not found',
        })
      }

      // Verify write access (need EDITOR or higher to revert)
      await verifyWorkspaceAccess(userId, entry.workspaceId)

      const result = await auditService.revertContradictionResolution(
        input.auditId,
        userId
      )

      if (!result.success) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.error ?? 'Failed to revert contradiction resolution',
        })
      }

      return {
        success: true,
        auditId: result.auditId,
        edgeIdsToRestore: result.edgeIdsToRestore ?? [],
        message: 'Contradiction resolution reverted successfully',
      }
    }),

  /**
   * Check if an audit entry can be reverted
   */
  canRevert: protectedProcedure
    .input(auditEntrySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id
      const auditService = getContradictionAuditService(ctx.prisma)

      const entry = await auditService.getAuditEntry(input.auditId)

      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Audit entry not found',
        })
      }

      // Verify access
      await verifyWorkspaceAccess(userId, entry.workspaceId)

      const result = auditService.canRevertAudit(entry)

      return {
        success: true,
        auditId: input.auditId,
        canRevert: result.canRevert,
        reason: result.reason ?? null,
      }
    }),

  /**
   * Get the resolution strategy for a contradiction
   *
   * Returns the strategy based on workspace config, category, and confidence.
   * Also indicates whether it should be auto-resolved.
   */
  getStrategy: protectedProcedure
    .input(getStrategySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify access
      await verifyWorkspaceAccess(userId, input.workspaceId)

      const auditService = getContradictionAuditService(ctx.prisma)

      const result = await auditService.getStrategyForContradiction(
        input.workspaceId,
        input.category,
        input.confidence
      )

      return {
        success: true,
        strategy: result.strategy,
        autoResolve: result.autoResolve,
        reason: result.reason,
      }
    }),

  /**
   * Update workspace resolution configuration
   *
   * Requires MANAGER or higher access.
   */
  updateConfig: protectedProcedure
    .input(updateConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Verify write access (need MANAGER or higher)
      await verifyWorkspaceWriteAccess(userId, input.workspaceId)

      const auditService = getContradictionAuditService(ctx.prisma)

      await auditService.updateWorkspaceResolutionConfig(
        input.workspaceId,
        input.config
      )

      return {
        success: true,
        workspaceId: input.workspaceId,
        message: 'Resolution configuration updated',
      }
    }),
})
