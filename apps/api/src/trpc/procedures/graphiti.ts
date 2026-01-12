/*
 * Graphiti tRPC Procedures
 * Version: 1.0.0
 *
 * tRPC endpoints for Wiki knowledge graph queries:
 * - Backlinks (pages that link to a page)
 * - Related pages (via shared entities)
 * - Search across wiki
 * - Graph statistics
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation for Fase 2
 * ===================================================================
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../router'
import { getGraphitiService } from '../../services/graphitiService'

// =============================================================================
// Input Schemas
// =============================================================================

const getBacklinksSchema = z.object({
  pageId: z.number(),
})

const getRelatedSchema = z.object({
  pageId: z.number(),
  limit: z.number().min(1).max(20).default(5),
})

const getEntitiesSchema = z.object({
  pageId: z.number(),
})

const searchSchema = z.object({
  query: z.string().min(1).max(200),
  groupId: z.string().optional(), // e.g., 'wiki-ws-1' or 'wiki-proj-5'
  limit: z.number().min(1).max(50).default(10),
})

const getStatsSchema = z.object({
  groupId: z.string().optional(),
})

const syncPageSchema = z.object({
  pageId: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  groupId: z.string(),
})

// =============================================================================
// Graphiti Router
// =============================================================================

export const graphitiRouter = router({
  /**
   * Get pages that link to a specific page (backlinks)
   */
  getBacklinks: protectedProcedure
    .input(getBacklinksSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const backlinks = await graphiti.getBacklinks(input.pageId)
      return backlinks
    }),

  /**
   * Get pages related through shared entities
   */
  getRelated: protectedProcedure
    .input(getRelatedSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const related = await graphiti.getRelatedPages(input.pageId, input.limit)
      return related
    }),

  /**
   * Get entities mentioned in a page
   */
  getEntities: protectedProcedure
    .input(getEntitiesSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const entities = await graphiti.getPageEntities(input.pageId)
      return entities
    }),

  /**
   * Search wiki pages by content/entities
   */
  search: protectedProcedure
    .input(searchSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const results = await graphiti.search(input.query, input.groupId, input.limit)
      return results
    }),

  /**
   * Get graph statistics
   */
  getStats: protectedProcedure
    .input(getStatsSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const stats = await graphiti.getStats(input.groupId)
      return stats
    }),

  /**
   * Check if Graphiti service is connected
   */
  isConnected: protectedProcedure
    .query(async () => {
      const graphiti = getGraphitiService()
      const connected = await graphiti.isConnected()
      return { connected }
    }),

  /**
   * Manually trigger sync for a page (for admin/debugging)
   */
  syncPage: protectedProcedure
    .input(syncPageSchema)
    .mutation(async ({ ctx, input }) => {
      const graphiti = getGraphitiService()

      await graphiti.syncWikiPage({
        pageId: input.pageId,
        title: input.title,
        slug: input.slug,
        content: input.content,
        groupId: input.groupId,
        userId: ctx.user.id,
        timestamp: new Date(),
      })

      return { success: true, pageId: input.pageId }
    }),
})
