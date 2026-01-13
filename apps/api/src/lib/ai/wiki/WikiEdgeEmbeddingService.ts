/**
 * Wiki Edge Embedding Service
 * Version: 1.1.0
 *
 * Vector storage and semantic search for Wiki edge facts using Qdrant.
 * Stores embeddings for edge facts (relationships between entities).
 *
 * Features:
 * - Store/retrieve edge fact embeddings in Qdrant
 * - Semantic search over edge facts
 * - Content hash-based caching (skip unchanged edges)
 * - Hybrid search (pages + edges)
 *
 * Fase 19.2 - Schema & Storage Design
 * Fase 19.4 - Search Integration (hybridSemanticSearch)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Date: 2026-01-13
 *
 * Modified: 2026-01-13
 * Change: Fase 19.4 - Added hybridSemanticSearch() for combined page+edge search
 * =============================================================================
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import type { PrismaClient } from '@prisma/client'
import { getWikiAiService, type WikiAiService, type WikiContext } from './WikiAiService'
import { getWikiEmbeddingService, type SemanticSearchResult } from './WikiEmbeddingService'

// =============================================================================
// Types
// =============================================================================

export interface WikiEdgeEmbeddingConfig {
  qdrantHost: string
  qdrantPort: number
  collectionName: string
}

/**
 * Edge embedding point stored in Qdrant
 * Contains the vector and metadata for a single edge fact
 */
export interface EdgeEmbeddingPoint {
  /** Unique ID for this edge embedding (format: edge-{edgeId}) */
  id: string
  /** The embedding vector (1536 dimensions for OpenAI) */
  vector: number[]
  /** Metadata payload for filtering and display */
  payload: EdgeEmbeddingPayload
}

/**
 * Payload stored with each edge embedding in Qdrant
 */
export interface EdgeEmbeddingPayload {
  /** Workspace ID for multi-tenant filtering */
  workspaceId: number
  /** Project ID (optional) for project-scoped filtering */
  projectId: number | null
  /** Source wiki page ID */
  pageId: number
  /** Source node ID in the graph */
  sourceNodeId: string
  /** Target node ID in the graph */
  targetNodeId: string
  /** Edge type (MENTIONS, LINKS_TO, etc.) */
  edgeType: string
  /** The human-readable fact description */
  fact: string
  /** Hash of the fact for change detection */
  factHash: string
  /** When the fact became valid (ISO timestamp) */
  validAt?: string
  /** When the fact stopped being valid (ISO timestamp) */
  invalidAt?: string
  /** When the embedding was created (ISO timestamp) */
  createdAt: string
}

/**
 * Result from edge semantic search
 */
export interface EdgeSearchResult {
  /** The edge embedding ID */
  edgeId: string
  /** Similarity score (0-1) */
  score: number
  /** The fact description */
  fact: string
  /** Edge type */
  edgeType: string
  /** Source node ID */
  sourceNodeId: string
  /** Target node ID */
  targetNodeId: string
  /** Source wiki page ID */
  pageId: number
  /** Valid from timestamp */
  validAt?: string
  /** Valid until timestamp */
  invalidAt?: string
}

/**
 * Result from hybrid search (pages + edges)
 */
export interface HybridSearchResult {
  /** Result type: page or edge */
  type: 'page' | 'edge'
  /** Similarity score (0-1) */
  score: number
  /** Page fields (when type === 'page') */
  pageId?: number
  title?: string
  groupId?: string
  /** Edge fields (when type === 'edge') */
  edgeId?: string
  fact?: string
  edgeType?: string
  sourceNodeId?: string
  targetNodeId?: string
}

/**
 * Edge data for embedding generation
 */
export interface EdgeForEmbedding {
  /** Unique edge identifier */
  id: string
  /** The fact description to embed */
  fact: string
  /** Edge type (MENTIONS, LINKS_TO, etc.) */
  edgeType: string
  /** Source node name */
  sourceNode: string
  /** Target node name */
  targetNode: string
  /** Valid from timestamp */
  validAt?: string
  /** Valid until timestamp */
  invalidAt?: string
  /** When edge was created */
  createdAt?: string
}

/**
 * Options for edge semantic search
 */
export interface EdgeSearchOptions {
  workspaceId: number
  projectId?: number
  pageId?: number
  edgeType?: string
  limit?: number
  scoreThreshold?: number
}

/**
 * Result of batch edge embedding generation
 */
export interface BatchEmbeddingResult {
  /** Number of embeddings stored */
  stored: number
  /** Number of embeddings skipped (unchanged) */
  skipped: number
  /** Number of errors */
  errors: number
}

/**
 * Options for hybrid semantic search (pages + edges)
 */
export interface HybridSearchOptions {
  workspaceId: number
  projectId?: number
  /** Include page results (default: true) */
  includePages?: boolean
  /** Include edge results (default: true) */
  includeEdges?: boolean
  /** Max results per type (default: 10) */
  limitPerType?: number
  /** Max total results (default: 20) */
  limit?: number
  /** Minimum score threshold (default: 0.5) */
  scoreThreshold?: number
}

// =============================================================================
// Wiki Edge Embedding Service Class
// =============================================================================

export class WikiEdgeEmbeddingService {
  private client: QdrantClient
  private collectionName: string
  private wikiAiService: WikiAiService
  private prisma: PrismaClient
  private initialized: boolean = false
  private embeddingDimensions: number | null = null

  constructor(prisma: PrismaClient, config?: Partial<WikiEdgeEmbeddingConfig>) {
    const host = config?.qdrantHost ?? process.env.QDRANT_HOST ?? 'localhost'
    const port = config?.qdrantPort ?? parseInt(process.env.QDRANT_PORT ?? '6333')
    this.collectionName = config?.collectionName ?? 'kanbu_edge_embeddings'

    this.prisma = prisma
    this.client = new QdrantClient({ host, port })
    this.wikiAiService = getWikiAiService(prisma)
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the Qdrant collection for edge embeddings
   * Auto-detects embedding dimensions from the configured provider
   */
  async initialize(context: WikiContext): Promise<void> {
    if (this.initialized) return

    // Get embedding dimensions from provider
    const embeddingInfo = await this.wikiAiService.getEmbeddingInfo(context)
    if (!embeddingInfo.available || !embeddingInfo.dimensions) {
      console.warn('[WikiEdgeEmbeddingService] No embedding provider available, skipping initialization')
      return
    }

    this.embeddingDimensions = embeddingInfo.dimensions

    // Check if collection exists
    const collections = await this.client.getCollections()
    const exists = collections.collections.some(c => c.name === this.collectionName)

    if (!exists) {
      // Create collection with vector config
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.embeddingDimensions,
          distance: 'Cosine',
        },
        optimizers_config: {
          indexing_threshold: 1000,
        },
      })

      // Create payload indexes for filtering
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'workspaceId',
        field_schema: 'integer',
      })
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'projectId',
        field_schema: 'integer',
      })
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'pageId',
        field_schema: 'integer',
      })
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'edgeType',
        field_schema: 'keyword',
      })

      console.log(
        `[WikiEdgeEmbeddingService] Created collection "${this.collectionName}" with ${this.embeddingDimensions} dimensions`
      )
    } else {
      console.log(`[WikiEdgeEmbeddingService] Collection "${this.collectionName}" already exists`)
    }

    this.initialized = true
  }

  // ===========================================================================
  // Embedding Generation
  // ===========================================================================

  /**
   * Format edge for embedding - includes context for better search
   * Format: "[edgeType] sourceNode -> targetNode: fact"
   */
  private formatEdgeForEmbedding(edge: EdgeForEmbedding): string {
    return `[${edge.edgeType}] ${edge.sourceNode} -> ${edge.targetNode}: ${edge.fact}`
  }

  /**
   * Generate embedding for a single edge fact
   */
  async generateEdgeEmbedding(
    context: WikiContext,
    edge: EdgeForEmbedding
  ): Promise<number[]> {
    const embeddingText = this.formatEdgeForEmbedding(edge)
    const result = await this.wikiAiService.embed(context, embeddingText)
    return result.embedding
  }

  /**
   * Store embedding for a single edge
   */
  async storeEdgeEmbedding(
    context: WikiContext,
    edge: EdgeForEmbedding,
    pageId: number
  ): Promise<boolean> {
    try {
      await this.initialize(context)

      if (!this.initialized || !this.embeddingDimensions) {
        console.warn(`[WikiEdgeEmbeddingService] Not initialized, skipping embedding for edge ${edge.id}`)
        return false
      }

      // Generate embedding
      const embedding = await this.generateEdgeEmbedding(context, edge)

      // Store in Qdrant
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: edge.id,
            vector: embedding,
            payload: {
              workspaceId: context.workspaceId,
              projectId: context.projectId ?? null,
              pageId,
              sourceNodeId: edge.sourceNode,
              targetNodeId: edge.targetNode,
              edgeType: edge.edgeType,
              fact: edge.fact,
              factHash: this.hashFact(edge.fact),
              validAt: edge.validAt,
              invalidAt: edge.invalidAt,
              createdAt: new Date().toISOString(),
            },
          },
        ],
      })

      console.log(
        `[WikiEdgeEmbeddingService] Stored embedding for edge ${edge.id}: "${edge.fact.substring(0, 50)}..."`
      )
      return true
    } catch (error) {
      console.error(
        `[WikiEdgeEmbeddingService] Failed to store embedding for edge ${edge.id}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Generate and store embeddings for multiple edges (batch)
   * Skips edges that haven't changed (based on fact hash)
   */
  async generateAndStoreEdgeEmbeddings(
    context: WikiContext,
    pageId: number,
    edges: EdgeForEmbedding[]
  ): Promise<BatchEmbeddingResult> {
    const result: BatchEmbeddingResult = { stored: 0, skipped: 0, errors: 0 }

    try {
      await this.initialize(context)

      if (!this.initialized || !this.embeddingDimensions) {
        console.warn(`[WikiEdgeEmbeddingService] Not initialized, skipping batch embedding`)
        return result
      }

      for (const edge of edges) {
        // Skip if fact is empty
        if (!edge.fact || edge.fact.trim().length === 0) {
          result.skipped++
          continue
        }

        try {
          // Check if embedding already exists and is unchanged
          const status = await this.checkEdgeEmbeddingStatus(edge.id, edge.fact)
          if (status.exists && !status.needsUpdate) {
            result.skipped++
            continue
          }

          // Generate and store embedding
          const success = await this.storeEdgeEmbedding(context, edge, pageId)
          if (success) {
            result.stored++
          } else {
            result.errors++
          }
        } catch (edgeError) {
          console.error(
            `[WikiEdgeEmbeddingService] Error processing edge ${edge.id}:`,
            edgeError instanceof Error ? edgeError.message : edgeError
          )
          result.errors++
        }
      }

      console.log(
        `[WikiEdgeEmbeddingService] Batch complete: ${result.stored} stored, ${result.skipped} skipped, ${result.errors} errors`
      )
      return result
    } catch (error) {
      console.error(
        `[WikiEdgeEmbeddingService] Batch embedding failed:`,
        error instanceof Error ? error.message : error
      )
      return result
    }
  }

  // ===========================================================================
  // Change Detection
  // ===========================================================================

  /**
   * Check if an edge embedding exists and if it needs updating
   */
  async checkEdgeEmbeddingStatus(
    edgeId: string,
    currentFact: string
  ): Promise<{ exists: boolean; needsUpdate: boolean; currentHash?: string }> {
    try {
      const points = await this.client.retrieve(this.collectionName, {
        ids: [edgeId],
        with_payload: true,
      })

      const point = points[0]
      if (!point) {
        return { exists: false, needsUpdate: true }
      }

      const storedHash = point.payload?.factHash as string
      const currentHash = this.hashFact(currentFact)

      return {
        exists: true,
        needsUpdate: storedHash !== currentHash,
        currentHash: storedHash,
      }
    } catch {
      return { exists: false, needsUpdate: true }
    }
  }

  /**
   * Create simple hash of fact for change detection
   */
  private hashFact(fact: string): string {
    let hash = 0
    for (let i = 0; i < fact.length; i++) {
      const char = fact.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  // ===========================================================================
  // Semantic Search
  // ===========================================================================

  /**
   * Semantic search over edge embeddings
   */
  async edgeSemanticSearch(
    context: WikiContext,
    query: string,
    options: Partial<EdgeSearchOptions> = {}
  ): Promise<EdgeSearchResult[]> {
    const limit = options.limit ?? 20
    const scoreThreshold = options.scoreThreshold ?? 0.5

    try {
      await this.initialize(context)

      if (!this.initialized || !this.embeddingDimensions) {
        console.warn('[WikiEdgeEmbeddingService] Not initialized, returning empty results')
        return []
      }

      // Generate query embedding
      const queryResult = await this.wikiAiService.embed(context, query)

      // Build filter
      const filter = this.buildSearchFilter(context, options)

      // Search in Qdrant
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryResult.embedding,
        filter,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      })

      // Map results
      return searchResult.map(result => ({
        edgeId: result.id as string,
        score: result.score,
        fact: result.payload?.fact as string,
        edgeType: result.payload?.edgeType as string,
        sourceNodeId: result.payload?.sourceNodeId as string,
        targetNodeId: result.payload?.targetNodeId as string,
        pageId: result.payload?.pageId as number,
        validAt: result.payload?.validAt as string | undefined,
        invalidAt: result.payload?.invalidAt as string | undefined,
      }))
    } catch (error) {
      console.error(
        '[WikiEdgeEmbeddingService] Edge semantic search failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Build Qdrant filter for edge search
   */
  private buildSearchFilter(
    context: WikiContext,
    options: Partial<EdgeSearchOptions>
  ): Record<string, unknown> {
    const must: unknown[] = [
      { key: 'workspaceId', match: { value: context.workspaceId } },
    ]

    if (context.projectId) {
      must.push({ key: 'projectId', match: { value: context.projectId } })
    }

    if (options.pageId) {
      must.push({ key: 'pageId', match: { value: options.pageId } })
    }

    if (options.edgeType) {
      must.push({ key: 'edgeType', match: { value: options.edgeType } })
    }

    return { must }
  }

  // ===========================================================================
  // Hybrid Search (Fase 19.4)
  // ===========================================================================

  /**
   * Hybrid semantic search: combines page embeddings and edge embeddings
   *
   * Searches both:
   * 1. Wiki page embeddings (whole documents)
   * 2. Edge fact embeddings (relationships)
   *
   * Results are merged and sorted by score.
   */
  async hybridSemanticSearch(
    context: WikiContext,
    query: string,
    options: Partial<HybridSearchOptions> = {}
  ): Promise<HybridSearchResult[]> {
    const includePages = options.includePages !== false
    const includeEdges = options.includeEdges !== false
    const limitPerType = options.limitPerType ?? 10
    const limit = options.limit ?? 20
    const scoreThreshold = options.scoreThreshold ?? 0.5

    const results: HybridSearchResult[] = []

    try {
      // Run page and edge searches in parallel
      const [pageResults, edgeResults] = await Promise.all([
        // Page search
        includePages
          ? this.searchPages(context, query, limitPerType, scoreThreshold)
          : Promise.resolve([]),
        // Edge search
        includeEdges
          ? this.edgeSemanticSearch(context, query, {
              limit: limitPerType,
              scoreThreshold,
            })
          : Promise.resolve([]),
      ])

      // Add page results
      for (const page of pageResults) {
        results.push({
          type: 'page',
          score: page.score,
          pageId: page.pageId,
          title: page.title,
          groupId: page.groupId,
        })
      }

      // Add edge results
      for (const edge of edgeResults) {
        results.push({
          type: 'edge',
          score: edge.score,
          pageId: edge.pageId,
          edgeId: edge.edgeId,
          fact: edge.fact,
          edgeType: edge.edgeType,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
        })
      }

      // Sort by score (descending) and limit
      results.sort((a, b) => b.score - a.score)
      return results.slice(0, limit)
    } catch (error) {
      console.error(
        '[WikiEdgeEmbeddingService] Hybrid semantic search failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Search wiki page embeddings
   * Delegates to WikiEmbeddingService
   */
  private async searchPages(
    context: WikiContext,
    query: string,
    limit: number,
    scoreThreshold: number
  ): Promise<SemanticSearchResult[]> {
    try {
      const pageEmbeddingService = getWikiEmbeddingService(this.prisma)
      return await pageEmbeddingService.semanticSearch(context, query, {
        limit,
        scoreThreshold,
      })
    } catch (error) {
      console.error(
        '[WikiEdgeEmbeddingService] Page search failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Delete embedding for an edge
   */
  async deleteEdgeEmbedding(edgeId: string): Promise<boolean> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [edgeId],
      })

      console.log(`[WikiEdgeEmbeddingService] Deleted embedding for edge ${edgeId}`)
      return true
    } catch (error) {
      console.error(
        `[WikiEdgeEmbeddingService] Failed to delete embedding for edge ${edgeId}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Delete all embeddings for a page
   */
  async deletePageEdgeEmbeddings(pageId: number): Promise<number> {
    try {
      const result = await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [{ key: 'pageId', match: { value: pageId } }],
        },
      })

      console.log(`[WikiEdgeEmbeddingService] Deleted embeddings for page ${pageId}`)
      return typeof result === 'object' ? 1 : 0
    } catch (error) {
      console.error(
        `[WikiEdgeEmbeddingService] Failed to delete embeddings for page ${pageId}:`,
        error instanceof Error ? error.message : error
      )
      return 0
    }
  }

  /**
   * Get statistics about stored edge embeddings
   */
  async getStats(): Promise<{
    totalEdges: number
    collectionExists: boolean
  }> {
    try {
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(c => c.name === this.collectionName)

      if (!exists) {
        return { totalEdges: 0, collectionExists: false }
      }

      const info = await this.client.getCollection(this.collectionName)
      return {
        totalEdges: info.points_count ?? 0,
        collectionExists: true,
      }
    } catch {
      return { totalEdges: 0, collectionExists: false }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let edgeEmbeddingServiceInstance: WikiEdgeEmbeddingService | null = null

/**
 * Get or create the singleton WikiEdgeEmbeddingService
 */
export function getWikiEdgeEmbeddingService(prisma: PrismaClient): WikiEdgeEmbeddingService {
  if (!edgeEmbeddingServiceInstance) {
    edgeEmbeddingServiceInstance = new WikiEdgeEmbeddingService(prisma)
  }
  return edgeEmbeddingServiceInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetWikiEdgeEmbeddingService(): void {
  edgeEmbeddingServiceInstance = null
}
