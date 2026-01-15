/**
 * Wiki Community Detection Procedures (Fase 24.6)
 *
 * tRPC endpoints for community detection in the Wiki knowledge graph.
 * Uses Label Propagation algorithm to find clusters of related entities.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { getWikiClusterService } from '../../lib/ai/wiki'
import type { WikiContext } from '../../lib/ai/wiki'

// ============================================================================
// Input Schemas
// ============================================================================

const detectCommunitiesSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  forceRebuild: z.boolean().default(false),
  lpConfig: z.object({
    maxIterations: z.number().min(1).max(1000).optional(),
    minClusterSize: z.number().min(1).max(100).optional(),
    seed: z.number().optional(),
  }).optional(),
  generateSummaries: z.boolean().default(true),
})

const getCommunitiesSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  includeMembers: z.boolean().default(false),
  minMembers: z.number().min(1).default(2),
  limit: z.number().min(1).max(500).default(100),
})

const getCommunitySchema = z.object({
  communityUuid: z.string().uuid(),
})

const updateCommunitiesSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  entityUuid: z.string().uuid().optional(),
  forceRecalculate: z.boolean().default(false),
})

const invalidateCacheSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
})

// ============================================================================
// Wiki Community Router
// ============================================================================

export const wikiCommunityRouter = router({
  /**
   * Detect communities in the knowledge graph
   *
   * Runs Label Propagation algorithm on the entity graph to find clusters.
   * Generates AI summaries and names for each community.
   */
  detect: protectedProcedure
    .input(detectCommunitiesSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // TODO: Add permissions check for workspace/project access
        // For now, assume user has access if they can call this endpoint

        const clusterService = getWikiClusterService(ctx.prisma)

        const context: WikiContext = {
          workspaceId: input.workspaceId,
          ...(input.projectId ? { projectId: input.projectId } : {}),
        }

        const result = await clusterService.detectCommunities({
          context,
          forceRebuild: input.forceRebuild,
          lpConfig: input.lpConfig,
          generateSummaries: input.generateSummaries,
        })

        return {
          success: true,
          communities: result.communities.map((c) => ({
            uuid: c.uuid,
            name: c.name,
            summary: c.summary,
            memberCount: c.memberCount,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
          stats: result.stats,
        }
      } catch (error) {
        console.error('[wikiCommunityRouter] detect error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to detect communities',
        })
      }
    }),

  /**
   * Get communities for a workspace/project
   *
   * Fetches existing communities from the graph database.
   * Optionally includes member details.
   */
  list: protectedProcedure
    .input(getCommunitiesSchema)
    .query(async ({ ctx, input }) => {
      try {
        const clusterService = getWikiClusterService(ctx.prisma)

        const context: WikiContext = {
          workspaceId: input.workspaceId,
          ...(input.projectId ? { projectId: input.projectId } : {}),
        }

        const result = await clusterService.getCommunities({
          context,
          includeMembers: input.includeMembers,
          minMembers: input.minMembers,
          limit: input.limit,
        })

        return {
          communities: result.communities.map((c) => ({
            uuid: c.uuid,
            name: c.name,
            summary: c.summary,
            memberCount: c.memberCount,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            ...(input.includeMembers && 'members' in c
              ? {
                  members: c.members?.map((m) => ({
                    uuid: m.uuid,
                    name: m.name,
                    type: m.type,
                  })),
                }
              : {}),
          })),
          totalCount: result.totalCount,
        }
      } catch (error) {
        console.error('[wikiCommunityRouter] list error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch communities',
        })
      }
    }),

  /**
   * Get a single community with members
   */
  get: protectedProcedure
    .input(getCommunitySchema)
    .query(async ({ ctx, input }) => {
      try {
        const clusterService = getWikiClusterService(ctx.prisma)

        const community = await clusterService.getCommunity(input.communityUuid)

        if (!community) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Community not found',
          })
        }

        return {
          community: {
            uuid: community.uuid,
            name: community.name,
            summary: community.summary,
            memberCount: community.memberCount,
            createdAt: community.createdAt,
            updatedAt: community.updatedAt,
          },
          members: (community.members || []).map((m) => ({
            uuid: m.uuid,
            name: m.name,
            type: m.type,
          })),
        }
      } catch (error) {
        console.error('[wikiCommunityRouter] get error:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch community',
        })
      }
    }),

  /**
   * Update communities after graph changes (incremental)
   *
   * For now, triggers a full rebuild. Future: incremental updates.
   */
  update: protectedProcedure
    .input(updateCommunitiesSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const clusterService = getWikiClusterService(ctx.prisma)

        const context: WikiContext = {
          workspaceId: input.workspaceId,
          ...(input.projectId ? { projectId: input.projectId } : {}),
        }

        const result = await clusterService.updateCommunities({
          context,
          entityUuid: input.entityUuid,
          forceRecalculate: input.forceRecalculate,
        })

        return {
          success: true,
          modified: result.modified,
          communitiesAffected: result.communitiesAffected,
          newCommunity: result.newCommunity
            ? {
                uuid: result.newCommunity.uuid,
                name: result.newCommunity.name,
                summary: result.newCommunity.summary,
                memberCount: result.newCommunity.memberCount,
              }
            : undefined,
        }
      } catch (error) {
        console.error('[wikiCommunityRouter] update error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update communities',
        })
      }
    }),

  /**
   * Invalidate community cache for a workspace/project
   */
  invalidateCache: protectedProcedure
    .input(invalidateCacheSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const clusterService = getWikiClusterService(ctx.prisma)

        const groupId = input.projectId
          ? `wiki-proj-${input.projectId}`
          : `wiki-ws-${input.workspaceId}`

        clusterService.invalidateCache(groupId)

        return {
          success: true,
          message: 'Cache invalidated',
        }
      } catch (error) {
        console.error('[wikiCommunityRouter] invalidateCache error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to invalidate cache',
        })
      }
    }),

  /**
   * Get community detection status
   *
   * Check if communities exist for a workspace/project
   */
  status: protectedProcedure
    .input(z.object({
      workspaceId: z.number(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const clusterService = getWikiClusterService(ctx.prisma)

        const context: WikiContext = {
          workspaceId: input.workspaceId,
          ...(input.projectId ? { projectId: input.projectId } : {}),
        }

        // Quick check: get communities with limit 1
        const result = await clusterService.getCommunities({
          context,
          includeMembers: false,
          minMembers: 1,
          limit: 1,
        })

        return {
          hasCommunities: result.totalCount > 0,
          totalCount: result.totalCount,
        }
      } catch (error) {
        console.error('[wikiCommunityRouter] status error:', error)
        // Don't throw error, return status as unknown
        return {
          hasCommunities: false,
          totalCount: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }),
})
