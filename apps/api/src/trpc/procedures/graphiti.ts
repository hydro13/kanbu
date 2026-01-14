/*
 * Graphiti tRPC Procedures
 * Version: 2.3.0
 *
 * tRPC endpoints for Wiki knowledge graph queries:
 * - Backlinks (pages that link to a page)
 * - Related pages (via shared entities)
 * - Search across wiki
 * - Temporal search ("What did we know at time X?")
 * - Graph statistics and visualization
 * - Temporal facts query ("getFactsAsOf" - Fase 16.4)
 * - Entity suggestions ("entitySuggest" - Fase 21.5)
 * - Duplicate detection ("findDuplicates" - Fase 22.6)
 * - Entity deduplication ("getDuplicatesOf", "getCanonicalNode", etc. - Fase 22.6)
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Fase 9 - Added temporal search endpoint
 * Change: Fase 16.4 - Added getFactsAsOf endpoint with FalkorDB bi-temporal support
 * Change: Fase 21.5 - Added entitySuggest and findDuplicates for entity resolution
 * Change: Fase 22.6 - Enhanced findDuplicates, added deduplication endpoints
 * ===================================================================
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../router'
import { getGraphitiService } from '../../services/graphitiService'
import {
  getWikiNodeEmbeddingService,
  getWikiDeduplicationService,
  type EmbeddableNodeType,
} from '../../lib/ai/wiki'

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

// Fase 21.5 - Entity Resolution Schemas
const entitySuggestSchema = z.object({
  name: z.string().min(1).max(200),
  workspaceId: z.number(),
  projectId: z.number().optional(),
  groupId: z.string().optional(),
  nodeType: z.enum(['Concept', 'Person', 'Task', 'Project']).optional(),
  limit: z.number().min(1).max(20).default(10),
  threshold: z.number().min(0).max(1).default(0.85),
  excludeNodeId: z.string().optional(),
})

const findDuplicatesSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  groupId: z.string().optional(),
  nodeType: z.enum(['Concept', 'Person', 'Task', 'Project']).optional(),
  threshold: z.number().min(0).max(1).default(0.90),
  limit: z.number().min(1).max(100).default(50),
})

// Fase 22.6 - Entity Deduplication Schemas
const getDuplicatesOfSchema = z.object({
  nodeUuid: z.string(),
})

const getCanonicalNodeSchema = z.object({
  nodeUuid: z.string(),
})

const markAsDuplicateSchema = z.object({
  sourceUuid: z.string(),
  targetUuid: z.string(),
  confidence: z.number().min(0).max(1).default(1.0),
})

const unmarkDuplicateSchema = z.object({
  sourceUuid: z.string(),
  targetUuid: z.string(),
})

const mergeDuplicatesSchema = z.object({
  sourceUuid: z.string(),
  targetUuid: z.string(),
  keepTarget: z.boolean().default(true),
})

const runBatchDedupSchema = z.object({
  workspaceId: z.number(),
  projectId: z.number().optional(),
  groupId: z.string().optional(),
  nodeTypes: z.array(z.enum(['Concept', 'Person', 'Task', 'Project'])).optional(),
  threshold: z.number().min(0).max(1).default(0.85),
  dryRun: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(50),
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

  /**
   * Find similar entities using semantic vector search (Fase 21.5)
   *
   * Use for entity resolution: typing "Jan" might suggest "Jan Janssen"
   * Returns entities sorted by similarity score.
   */
  entitySuggest: protectedProcedure
    .input(entitySuggestSchema)
    .query(async ({ ctx, input }) => {
      const nodeEmbeddingService = getWikiNodeEmbeddingService(ctx.prisma)

      const context = {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
      }

      const suggestions = await nodeEmbeddingService.findSimilarEntities(
        context,
        input.name,
        {
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          groupId: input.groupId,
          nodeType: input.nodeType as EmbeddableNodeType | undefined,
          limit: input.limit,
          threshold: input.threshold,
          excludeNodeId: input.excludeNodeId,
        }
      )

      return {
        query: input.name,
        suggestions,
        count: suggestions.length,
      }
    }),

  /**
   * Find potential duplicate entities (Fase 22.6)
   *
   * Uses WikiDeduplicationService to scan entity embeddings and find pairs
   * with high similarity scores using MinHash/LSH and Jaccard similarity.
   */
  findDuplicates: protectedProcedure
    .input(findDuplicatesSchema)
    .query(async ({ ctx, input }) => {
      const graphiti = getGraphitiService()
      const nodeEmbeddingService = getWikiNodeEmbeddingService(ctx.prisma)
      const deduplicationService = getWikiDeduplicationService(nodeEmbeddingService)

      // Build groupId from workspace/project
      const groupId = input.groupId || (input.projectId
        ? `wiki-proj-${input.projectId}`
        : `wiki-ws-${input.workspaceId}`)

      // Get all nodes in workspace
      const nodeTypes = input.nodeType
        ? [input.nodeType]
        : ['Concept', 'Person', 'Task', 'Project']

      const nodes = await graphiti.getWorkspaceNodes(groupId, nodeTypes)

      if (nodes.length === 0) {
        return {
          duplicates: [],
          count: 0,
          totalNodes: 0,
          message: 'No nodes found in workspace',
        }
      }

      // Use WikiDeduplicationService to find duplicates
      const duplicates = await deduplicationService.findDuplicatesInWorkspace(
        nodes.map(n => ({
          uuid: n.uuid,
          name: n.name,
          type: n.type,
          groupId: n.groupId,
        })),
        { threshold: input.threshold, limit: input.limit }
      )

      return {
        duplicates: duplicates.map(d => ({
          sourceUuid: d.sourceNode.uuid,
          sourceName: d.sourceNode.name,
          sourceType: d.sourceNode.type,
          targetUuid: d.targetNode.uuid,
          targetName: d.targetNode.name,
          targetType: d.targetNode.type,
          confidence: d.confidence,
          matchType: d.matchType,
        })),
        count: duplicates.length,
        totalNodes: nodes.length,
        threshold: input.threshold,
      }
    }),

  // =========================================================================
  // Fase 22.6 - Entity Deduplication Endpoints
  // =========================================================================

  /**
   * Get all nodes marked as duplicates of a given node
   */
  getDuplicatesOf: protectedProcedure
    .input(getDuplicatesOfSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const duplicates = await graphiti.getDuplicatesOf(input.nodeUuid)
      return {
        duplicates,
        count: duplicates.length,
      }
    }),

  /**
   * Get canonical (root) node by following IS_DUPLICATE_OF chain
   */
  getCanonicalNode: protectedProcedure
    .input(getCanonicalNodeSchema)
    .query(async ({ input }) => {
      const graphiti = getGraphitiService()
      const canonical = await graphiti.getCanonicalNode(input.nodeUuid)
      return {
        canonical,
        isCanonical: canonical?.uuid === input.nodeUuid,
      }
    }),

  /**
   * Mark two nodes as duplicates (manual user action)
   */
  markAsDuplicate: protectedProcedure
    .input(markAsDuplicateSchema)
    .mutation(async ({ ctx, input }) => {
      const graphiti = getGraphitiService()

      // Check if edge already exists
      const exists = await graphiti.duplicateEdgeExists(input.sourceUuid, input.targetUuid)
      if (exists) {
        return {
          success: false,
          message: 'Duplicate relationship already exists',
        }
      }

      // Create IS_DUPLICATE_OF edge with 'manual' matchType
      await graphiti.createDuplicateOfEdge(
        input.sourceUuid,
        input.targetUuid,
        input.confidence,
        'exact', // Manual marking treated as exact match
        ctx.user?.id?.toString() || null
      )

      return {
        success: true,
        sourceUuid: input.sourceUuid,
        targetUuid: input.targetUuid,
      }
    }),

  /**
   * Remove duplicate relationship between two nodes
   */
  unmarkDuplicate: protectedProcedure
    .input(unmarkDuplicateSchema)
    .mutation(async ({ input }) => {
      const graphiti = getGraphitiService()

      // Check if edge exists
      const exists = await graphiti.duplicateEdgeExists(input.sourceUuid, input.targetUuid)
      if (!exists) {
        return {
          success: false,
          message: 'No duplicate relationship found',
        }
      }

      await graphiti.removeDuplicateEdge(input.sourceUuid, input.targetUuid)

      return {
        success: true,
        sourceUuid: input.sourceUuid,
        targetUuid: input.targetUuid,
      }
    }),

  /**
   * Merge duplicate nodes: transfer all edges to canonical node
   */
  mergeDuplicates: protectedProcedure
    .input(mergeDuplicatesSchema)
    .mutation(async ({ input }) => {
      const graphiti = getGraphitiService()

      const canonicalUuid = input.keepTarget ? input.targetUuid : input.sourceUuid
      const duplicateUuid = input.keepTarget ? input.sourceUuid : input.targetUuid

      const result = await graphiti.mergeNodes(duplicateUuid, canonicalUuid)

      return {
        success: true,
        canonicalUuid,
        mergedUuid: duplicateUuid,
        edgesTransferred: result.edgesTransferred,
      }
    }),

  /**
   * Run batch deduplication scan for workspace (Fase 22.6)
   *
   * Scans all nodes in a workspace and returns potential duplicates.
   * With dryRun=true (default), only returns candidates without creating edges.
   * With dryRun=false, creates IS_DUPLICATE_OF edges for matches.
   */
  runBatchDedup: protectedProcedure
    .input(runBatchDedupSchema)
    .mutation(async ({ ctx, input }) => {
      const graphiti = getGraphitiService()
      const nodeEmbeddingService = getWikiNodeEmbeddingService(ctx.prisma)
      const deduplicationService = getWikiDeduplicationService(nodeEmbeddingService)

      // Build groupId from workspace/project
      const groupId = input.groupId || (input.projectId
        ? `wiki-proj-${input.projectId}`
        : `wiki-ws-${input.workspaceId}`)

      // Get all nodes in workspace
      const nodeTypes = input.nodeTypes || ['Concept', 'Person', 'Task', 'Project']
      const nodes = await graphiti.getWorkspaceNodes(groupId, nodeTypes)

      if (nodes.length === 0) {
        return {
          duplicatesFound: 0,
          edgesCreated: 0,
          totalNodes: 0,
          dryRun: input.dryRun,
          message: 'No nodes found in workspace',
        }
      }

      // Filter out nodes without valid names (prevents toLowerCase errors)
      const validNodes = nodes.filter(n => n.name && typeof n.name === 'string' && n.name.trim() !== '')

      if (validNodes.length === 0) {
        return {
          duplicatesFound: 0,
          edgesCreated: 0,
          totalNodes: nodes.length,
          validNodes: 0,
          dryRun: input.dryRun,
          message: `Found ${nodes.length} nodes but none have valid names`,
        }
      }

      // Find duplicates using WikiDeduplicationService
      const duplicates = await deduplicationService.findDuplicatesInWorkspace(
        validNodes.map(n => ({
          uuid: n.uuid,
          name: n.name,
          type: n.type,
          groupId: n.groupId,
        })),
        { threshold: input.threshold, limit: input.limit }
      )

      let edgesCreated = 0

      // If not dry run, create IS_DUPLICATE_OF edges
      if (!input.dryRun) {
        for (const dup of duplicates) {
          const exists = await graphiti.duplicateEdgeExists(
            dup.sourceNode.uuid,
            dup.targetNode.uuid
          )

          if (!exists) {
            await graphiti.createDuplicateOfEdge(
              dup.sourceNode.uuid,
              dup.targetNode.uuid,
              dup.confidence,
              dup.matchType,
              ctx.user?.id?.toString() || 'batch'
            )
            edgesCreated++
          }
        }
      }

      return {
        duplicatesFound: duplicates.length,
        edgesCreated,
        totalNodes: nodes.length,
        validNodes: validNodes.length,
        dryRun: input.dryRun,
        threshold: input.threshold,
        candidates: duplicates.map(d => ({
          sourceUuid: d.sourceNode.uuid,
          sourceName: d.sourceNode.name,
          targetUuid: d.targetNode.uuid,
          targetName: d.targetNode.name,
          confidence: d.confidence,
          matchType: d.matchType,
        })),
      }
    }),
})
