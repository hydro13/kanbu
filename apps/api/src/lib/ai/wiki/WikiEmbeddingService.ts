/**
 * Wiki Embedding Service
 * Version: 1.1.0
 *
 * Vector storage and semantic search for Wiki pages using Qdrant.
 * Stores embeddings generated via WikiAiService (Fase 14 providers).
 *
 * Features:
 * - Store/retrieve wiki page embeddings in Qdrant
 * - Semantic search over wiki content
 * - Content hash-based caching (Fase 15.5)
 * - Conditional re-embedding (skip if unchanged)
 *
 * Fase 15.2 - Semantic Search
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 *
 * Modified: 2026-01-12
 * Change: Fase 15.5 - Added checkEmbeddingStatus and storePageEmbeddingIfChanged
 *         for content hash-based caching
 * =============================================================================
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import type { PrismaClient } from '@prisma/client'
import { getWikiAiService, type WikiAiService, type WikiContext } from './WikiAiService'
import { ChunkingService } from './ChunkingService'

// =============================================================================
// Types
// =============================================================================

export interface WikiEmbeddingConfig {
  qdrantHost: string
  qdrantPort: number
  collectionName: string
}

export interface WikiPageEmbedding {
  pageId: number
  workspaceId: number
  projectId?: number
  groupId: string
  title: string
  embedding: number[]
  contentHash: string
  updatedAt: Date
}

export interface SemanticSearchResult {
  pageId: number
  title: string
  score: number
  groupId: string
}

export interface SemanticSearchOptions {
  workspaceId: number
  projectId?: number
  groupId?: string
  limit?: number
  scoreThreshold?: number
}

// =============================================================================
// Wiki Embedding Service Class
// =============================================================================

export class WikiEmbeddingService {
  private client: QdrantClient
  private collectionName: string
  private wikiAiService: WikiAiService
  private initialized: boolean = false
  private embeddingDimensions: number | null = null

  constructor(prisma: PrismaClient, config?: Partial<WikiEmbeddingConfig>) {
    const host = config?.qdrantHost ?? process.env.QDRANT_HOST ?? 'localhost'
    const port = config?.qdrantPort ?? parseInt(process.env.QDRANT_PORT ?? '6333')
    this.collectionName = config?.collectionName ?? 'kanbu_wiki_embeddings'

    this.client = new QdrantClient({ host, port })
    this.wikiAiService = getWikiAiService(prisma)
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the Qdrant collection for wiki embeddings
   * Auto-detects embedding dimensions from the configured provider
   */
  async initialize(context: WikiContext): Promise<void> {
    if (this.initialized) return

    // Get embedding dimensions from provider
    const embeddingInfo = await this.wikiAiService.getEmbeddingInfo(context)
    if (!embeddingInfo.available || !embeddingInfo.dimensions) {
      console.warn('[WikiEmbeddingService] No embedding provider available, skipping initialization')
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
        // Optimize for filtering by workspace/project
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
        field_name: 'groupId',
        field_schema: 'keyword',
      })

      console.log(
        `[WikiEmbeddingService] Created collection "${this.collectionName}" with ${this.embeddingDimensions} dimensions`
      )
    } else {
      console.log(`[WikiEmbeddingService] Collection "${this.collectionName}" already exists`)
    }

    this.initialized = true
  }

  // ===========================================================================
  // Embedding Operations
  // ===========================================================================

  /**
   * Generate and store embedding for a wiki page
   */
  async storePageEmbedding(
    context: WikiContext,
    pageId: number,
    title: string,
    content: string,
    groupId: string
  ): Promise<boolean> {
    try {
      // Initialize if needed
      await this.initialize(context)

      if (!this.initialized || !this.embeddingDimensions) {
        console.warn(`[WikiEmbeddingService] Not initialized, skipping embedding for page ${pageId}`)
        return false
      }

      // Create text for embedding (title + content preview)
      const textForEmbedding = this.createEmbeddingText(title, content)

      // Generate embedding via WikiAiService
      const embeddingResult = await this.wikiAiService.embed(context, textForEmbedding)

      // Store in Qdrant
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: pageId, // Use pageId as point ID for easy updates
            vector: embeddingResult.embedding,
            payload: {
              pageId,
              workspaceId: context.workspaceId,
              projectId: context.projectId ?? null,
              groupId,
              title,
              contentHash: this.hashContent(content),
              updatedAt: new Date().toISOString(),
            },
          },
        ],
      })

      console.log(
        `[WikiEmbeddingService] Stored embedding for page ${pageId}: "${title}" (${embeddingResult.dimensions} dim)`
      )
      return true
    } catch (error) {
      console.error(
        `[WikiEmbeddingService] Failed to store embedding for page ${pageId}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Delete embedding for a wiki page
   */
  async deletePageEmbedding(pageId: number): Promise<boolean> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [pageId],
      })

      console.log(`[WikiEmbeddingService] Deleted embedding for page ${pageId}`)
      return true
    } catch (error) {
      console.error(
        `[WikiEmbeddingService] Failed to delete embedding for page ${pageId}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  // ===========================================================================
  // Semantic Search
  // ===========================================================================

  /**
   * Search for semantically similar wiki pages
   */
  async semanticSearch(
    context: WikiContext,
    query: string,
    options: Partial<SemanticSearchOptions> = {}
  ): Promise<SemanticSearchResult[]> {
    const limit = options.limit ?? 10
    const scoreThreshold = options.scoreThreshold ?? 0.5

    try {
      // Initialize if needed
      await this.initialize(context)

      if (!this.initialized || !this.embeddingDimensions) {
        console.warn('[WikiEmbeddingService] Not initialized, returning empty results')
        return []
      }

      // Generate query embedding
      const queryEmbedding = await this.wikiAiService.embed(context, query)

      // Build filter for workspace/project/group
      const filter = this.buildSearchFilter(context, options.groupId)

      // Search in Qdrant
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding.embedding,
        filter,
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      })

      // Map results
      return searchResult.map(result => ({
        pageId: result.payload?.pageId as number,
        title: result.payload?.title as string,
        score: result.score,
        groupId: result.payload?.groupId as string,
      }))
    } catch (error) {
      console.error(
        '[WikiEmbeddingService] Semantic search failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Find similar pages to a given page
   */
  async findSimilarPages(
    context: WikiContext,
    pageId: number,
    limit: number = 5
  ): Promise<SemanticSearchResult[]> {
    try {
      // Initialize if needed
      await this.initialize(context)

      if (!this.initialized) {
        return []
      }

      // Get the embedding for the source page
      const points = await this.client.retrieve(this.collectionName, {
        ids: [pageId],
        with_vector: true,
      })

      const point = points[0]
      if (!point || !point.vector) {
        console.warn(`[WikiEmbeddingService] No embedding found for page ${pageId}`)
        return []
      }

      const sourceVector = point.vector as number[]

      // Build filter (same workspace, exclude source page)
      const filter = {
        must: [
          { key: 'workspaceId', match: { value: context.workspaceId } },
        ],
        must_not: [
          { has_id: [pageId] },
        ],
      }

      // Search for similar pages
      const searchResult = await this.client.search(this.collectionName, {
        vector: sourceVector,
        filter,
        limit,
        with_payload: true,
      })

      return searchResult.map(result => ({
        pageId: result.payload?.pageId as number,
        title: result.payload?.title as string,
        score: result.score,
        groupId: result.payload?.groupId as string,
      }))
    } catch (error) {
      console.error(
        '[WikiEmbeddingService] Find similar pages failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Get statistics about stored embeddings
   */
  async getStats(): Promise<{ totalPages: number; collectionExists: boolean }> {
    try {
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(c => c.name === this.collectionName)

      if (!exists) {
        return { totalPages: 0, collectionExists: false }
      }

      const info = await this.client.getCollection(this.collectionName)
      return {
        totalPages: info.points_count ?? 0,
        collectionExists: true,
      }
    } catch {
      return { totalPages: 0, collectionExists: false }
    }
  }

  /**
   * Check if a page has an embedding stored
   */
  async hasEmbedding(pageId: number): Promise<boolean> {
    try {
      const points = await this.client.retrieve(this.collectionName, {
        ids: [pageId],
      })
      return points.length > 0
    } catch {
      return false
    }
  }

  /**
   * Check if a page's embedding is up-to-date based on content hash
   * Returns { needsUpdate: boolean, currentHash?: string }
   */
  async checkEmbeddingStatus(pageId: number, content: string): Promise<{
    needsUpdate: boolean
    hasEmbedding: boolean
    currentHash?: string
  }> {
    try {
      const points = await this.client.retrieve(this.collectionName, {
        ids: [pageId],
        with_payload: true,
      })

      const point = points[0]
      if (!point) {
        return { needsUpdate: true, hasEmbedding: false }
      }

      const storedHash = point.payload?.contentHash as string
      const currentHash = this.hashContent(content)

      return {
        needsUpdate: storedHash !== currentHash,
        hasEmbedding: true,
        currentHash: storedHash,
      }
    } catch {
      return { needsUpdate: true, hasEmbedding: false }
    }
  }

  /**
   * Conditionally store embedding only if content has changed
   * Returns 'stored' | 'skipped' | 'error'
   */
  async storePageEmbeddingIfChanged(
    context: WikiContext,
    pageId: number,
    title: string,
    content: string,
    groupId: string
  ): Promise<'stored' | 'skipped' | 'error'> {
    try {
      const status = await this.checkEmbeddingStatus(pageId, content)

      if (!status.needsUpdate) {
        console.log(
          `[WikiEmbeddingService] Skipping embedding for page ${pageId}: content unchanged`
        )
        return 'skipped'
      }

      const success = await this.storePageEmbedding(context, pageId, title, content, groupId)
      return success ? 'stored' : 'error'
    } catch (error) {
      console.error(
        `[WikiEmbeddingService] Failed to check/store embedding for page ${pageId}:`,
        error instanceof Error ? error.message : error
      )
      return 'error'
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Create text for embedding from title and content
   *
   * Fase 25: Uses ChunkingService for intelligent content handling
   * - Small content: uses as-is
   * - Large content: uses first chunk + indicator of remaining sections
   *
   * @param title - Page title
   * @param content - Page content
   */
  private createEmbeddingText(title: string, content: string): string {
    const chunkingService = new ChunkingService()

    // Small content - use as-is
    if (!chunkingService.needsChunking(content)) {
      return `${title}\n\n${content}`
    }

    // Large content - use first chunk with context about total size
    const result = chunkingService.chunkMarkdown(content)
    const firstChunk = result.chunks[0]?.text ?? content

    // Add note about remaining content if multiple chunks
    const suffix = result.chunks.length > 1
      ? `\n\n[...${result.chunks.length - 1} more sections, ${result.totalTokens} total tokens]`
      : ''

    console.log(
      `[WikiEmbeddingService] Large content chunked: ${result.totalTokens} tokens → ` +
      `using first chunk (${result.chunks[0]?.tokenCount ?? 0} tokens)`
    )

    return `${title}\n\n${firstChunk}${suffix}`
  }

  /**
   * Create simple hash of content for change detection
   */
  private hashContent(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  /**
   * Build Qdrant filter for search
   */
  private buildSearchFilter(context: WikiContext, groupId?: string): Record<string, unknown> {
    const must: unknown[] = [
      { key: 'workspaceId', match: { value: context.workspaceId } },
    ]

    // Filter by project if specified
    if (context.projectId) {
      must.push({ key: 'projectId', match: { value: context.projectId } })
    }

    // Filter by group if specified
    if (groupId) {
      must.push({ key: 'groupId', match: { value: groupId } })
    }

    return { must }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let embeddingServiceInstance: WikiEmbeddingService | null = null

/**
 * Get or create the singleton WikiEmbeddingService
 */
export function getWikiEmbeddingService(prisma: PrismaClient): WikiEmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new WikiEmbeddingService(prisma)
  }
  return embeddingServiceInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetWikiEmbeddingService(): void {
  embeddingServiceInstance = null
}
