/*
 * Graphiti tRPC Procedures
 * Version: 2.1.0
 *
 * tRPC endpoints for Wiki knowledge graph queries:
 * - Backlinks (pages that link to a page)
 * - Related pages (via shared entities)
 * - Search across wiki
 * - Temporal search ("What did we know at time X?")
 * - Graph statistics and visualization
 * - Temporal facts query ("getFactsAsOf" - Fase 16.4)
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Fase 9 - Added temporal search endpoint
 * Change: Fase 16.4 - Added getFactsAsOf endpoint with FalkorDB bi-temporal support
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

const getGraphSchema = z.object({
  groupId: z.string(), // e.g., 'wiki-ws-1' or 'wiki-proj-5'
})

const syncPageSchema = z.object({
  pageId: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  groupId: z.string(),
})

const temporalSearchSchema = z.object({
  query: z.string().min(1).max(200),
  groupId: z.string(),
  asOf: z.string().datetime(), // ISO datetime string: "What did we know at this time?"
  limit: z.number().min(1).max(50).default(10),
})

const getFactsAsOfSchema = z.object({
  groupId: z.string(), // e.g., 'wiki-ws-1' or 'wiki-proj-5'
  asOf: z.string().datetime(), // ISO datetime string: "Show facts valid at this time"
  limit: z.number().min(1).max(200).default(100),
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
   * Get full graph data for visualization
   */
  getGraph: protectedProcedure
    .input(getGraphSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const graph = await graphiti.getGraph(input.groupId)
      return graph
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
   * Temporal search - "What did we know at time X?"
   * Returns facts that were valid at the specified point in time.
   * Only available when Python Graphiti service is running.
   */
  temporalSearch: protectedProcedure
    .input(temporalSearchSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const asOfDate = new Date(input.asOf)
      const results = await graphiti.temporalSearch(
        input.query,
        input.groupId,
        asOfDate,
        input.limit
      )
      return {
        results,
        asOf: input.asOf,
        query: input.query,
      }
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

  /**
   * Get all facts valid at a specific point in time (Fase 16.4)
   *
   * Uses bi-temporal fields to query what was known at a given moment:
   * - Transaction time: facts that exist in the system
   * - Valid time: facts that were true at the query time
   *
   * Works without Python service by querying FalkorDB directly.
   */
  getFactsAsOf: protectedProcedure
    .input(getFactsAsOfSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const asOfDate = new Date(input.asOf)
      const facts = await graphiti.getFactsAsOf(
        input.groupId,
        asOfDate,
        input.limit
      )
      return {
        facts,
        asOf: input.asOf,
        groupId: input.groupId,
        count: facts.length,
      }
    }),
})
