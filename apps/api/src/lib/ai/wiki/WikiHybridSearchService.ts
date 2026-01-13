/**
 * Wiki Hybrid Search Service
 * Version: 1.0.0
 *
 * Combines BM25 (keyword), Vector (semantic), and Edge (relationship) search
 * using Reciprocal Rank Fusion (RRF) for optimal result ranking.
 *
 * Features:
 * - Parallel execution of multiple search backends
 * - RRF fusion algorithm for rank combination
 * - Configurable weights per search type
 * - Feature flag for BM25 disable/fallback
 * - Graceful degradation on failures
 *
 * Fase 20.4 - Hybrid Fusion (RRF)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Date: 2026-01-13
 * =============================================================================
 */

import type { PrismaClient } from '@prisma/client'
import { WikiBm25Service, type Bm25SearchResult } from './WikiBm25Service'
import { WikiEmbeddingService, type SemanticSearchResult } from './WikiEmbeddingService'
import {
  WikiEdgeEmbeddingService,
  type EdgeSearchResult,
} from './WikiEdgeEmbeddingService'
import { type WikiContext } from './WikiAiService'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for hybrid search
 */
export interface HybridSearchOptions {
  /** Workspace ID (required) */
  workspaceId: number
  /** Project ID (optional, for project-specific search) */
  projectId?: number
  /** Maximum results to return (default: 20) */
  limit?: number
  /** Enable BM25 keyword search (default: true) */
  useBm25?: boolean
  /** Enable semantic vector search (default: true) */
  useVector?: boolean
  /** Enable edge/relationship search (default: true) */
  useEdge?: boolean
  /** RRF smoothing factor k (default: 60) */
  rrfK?: number
  /** Weight for BM25 results (default: 1.0) */
  bm25Weight?: number
  /** Weight for vector results (default: 1.0) */
  vectorWeight?: number
  /** Weight for edge results (default: 0.5) */
  edgeWeight?: number
}

/**
 * Combined hybrid search result
 */
export interface HybridSearchResult {
  /** Page ID */
  pageId: number
  /** Page title */
  title: string
  /** Page slug (if available) */
  slug?: string
  /** Combined RRF score */
  score: number
  /** Source types that matched this result */
  sources: Array<'bm25' | 'vector' | 'edge'>
  /** Individual scores per source */
  sourceScores: {
    bm25?: number
    vector?: number
    edge?: number
  }
  /** BM25 headline with highlights (if available) */
  headline?: string
  /** Matching edge facts (if available) */
  edgeFacts?: string[]
}

/**
 * Internal page entry for RRF calculation
 */
interface PageEntry {
  pageId: number
  title: string
  slug?: string
  rrfScore: number
  sources: Set<'bm25' | 'vector' | 'edge'>
  sourceScores: { bm25?: number; vector?: number; edge?: number }
  headline?: string
  edgeFacts: string[]
}

// =============================================================================
// WikiHybridSearchService Class
// =============================================================================

export class WikiHybridSearchService {
  constructor(
    private bm25Service: WikiBm25Service,
    private embeddingService: WikiEmbeddingService,
    private edgeService: WikiEdgeEmbeddingService
  ) {}

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Perform hybrid search combining multiple search methods
   *
   * Executes BM25, vector, and edge searches in parallel, then combines
   * results using Reciprocal Rank Fusion (RRF).
   *
   * @example
   * const results = await hybridService.search('kanban board', {
   *   workspaceId: 1,
   *   useBm25: true,
   *   useVector: true,
   *   useEdge: true
   * })
   *
   * @example
   * // Keyword-only search
   * const results = await hybridService.search('exact term', {
   *   workspaceId: 1,
   *   useBm25: true,
   *   useVector: false,
   *   useEdge: false
   * })
   */
  async search(query: string, options: HybridSearchOptions): Promise<HybridSearchResult[]> {
    const {
      workspaceId,
      projectId,
      limit = 20,
      useBm25 = true,
      useVector = true,
      useEdge = true,
      rrfK = 60,
      bm25Weight = 1.0,
      vectorWeight = 1.0,
      edgeWeight = 0.5,
    } = options

    // Validate input
    if (!query || query.trim().length === 0) {
      return []
    }

    // Check feature flag for BM25 disable
    const bm25Enabled = useBm25 && process.env.DISABLE_BM25_SEARCH !== 'true'

    // If only vector is enabled and BM25 is disabled, use vector-only search
    if (!bm25Enabled && !useEdge && useVector) {
      return this.vectorOnlySearch(query, options)
    }

    // Build WikiContext for embedding services
    const context: WikiContext = { workspaceId, projectId }

    // Collect results from all enabled sources in parallel
    const resultPromises: Promise<void>[] = []
    let bm25Results: Bm25SearchResult[] = []
    let vectorResults: SemanticSearchResult[] = []
    let edgeResults: EdgeSearchResult[] = []

    // Fetch more results than needed for better RRF fusion
    const fetchLimit = limit * 2

    if (bm25Enabled) {
      resultPromises.push(
        this.bm25Service
          .search(query, { workspaceId, projectId, limit: fetchLimit })
          .then((r) => {
            bm25Results = r
          })
          .catch((err) => {
            console.error('[WikiHybridSearchService] BM25 search failed:', err)
          })
      )
    }

    if (useVector) {
      resultPromises.push(
        this.embeddingService
          .semanticSearch(context, query, { limit: fetchLimit })
          .then((r) => {
            vectorResults = r
          })
          .catch((err) => {
            console.error('[WikiHybridSearchService] Vector search failed:', err)
          })
      )
    }

    if (useEdge) {
      resultPromises.push(
        this.edgeService
          .edgeSemanticSearch(context, query, { limit: fetchLimit })
          .then((r) => {
            edgeResults = r
          })
          .catch((err) => {
            console.error('[WikiHybridSearchService] Edge search failed:', err)
          })
      )
    }

    // Wait for all searches to complete
    await Promise.all(resultPromises)

    // Apply RRF fusion
    return this.rrfFusion(bm25Results, vectorResults, edgeResults, {
      rrfK,
      bm25Weight,
      vectorWeight,
      edgeWeight,
      limit,
    })
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Reciprocal Rank Fusion (RRF) algorithm
   *
   * Combines multiple ranked lists into a single list using:
   * RRF_score(d) = Σ weight_i / (k + rank_i(d))
   *
   * Where:
   * - k = smoothing constant (default 60)
   * - rank_i(d) = rank of document d in result set i (1-indexed)
   * - weight_i = weight for result set i
   *
   * Documents appearing in multiple result sets get higher scores.
   */
  rrfFusion(
    bm25Results: Bm25SearchResult[],
    vectorResults: SemanticSearchResult[],
    edgeResults: EdgeSearchResult[],
    options: {
      rrfK: number
      bm25Weight: number
      vectorWeight: number
      edgeWeight: number
      limit: number
    }
  ): HybridSearchResult[] {
    const { rrfK, bm25Weight, vectorWeight, edgeWeight, limit } = options

    // Map to track scores per page
    const pageScores = new Map<number, PageEntry>()

    // Helper to get or create page entry
    const getPageEntry = (pageId: number, title: string, slug?: string): PageEntry => {
      if (!pageScores.has(pageId)) {
        pageScores.set(pageId, {
          pageId,
          title,
          slug,
          rrfScore: 0,
          sources: new Set(),
          sourceScores: {},
          edgeFacts: [],
        })
      }
      const entry = pageScores.get(pageId)!
      // Update title/slug if we have better info
      if (title && title !== 'Unknown') entry.title = title
      if (slug) entry.slug = slug
      return entry
    }

    // Process BM25 results
    bm25Results.forEach((result, index) => {
      const rank = index + 1
      const rrfContribution = bm25Weight / (rrfK + rank)

      const entry = getPageEntry(result.pageId, result.title, result.slug)
      entry.rrfScore += rrfContribution
      entry.sources.add('bm25')
      entry.sourceScores.bm25 = result.rank
      if (result.headline) entry.headline = result.headline
    })

    // Process vector results
    vectorResults.forEach((result, index) => {
      const rank = index + 1
      const rrfContribution = vectorWeight / (rrfK + rank)

      const entry = getPageEntry(result.pageId, result.title)
      entry.rrfScore += rrfContribution
      entry.sources.add('vector')
      entry.sourceScores.vector = result.score
    })

    // Process edge results (group by page first)
    const edgesByPage = new Map<number, EdgeSearchResult[]>()
    edgeResults.forEach((result) => {
      if (!edgesByPage.has(result.pageId)) {
        edgesByPage.set(result.pageId, [])
      }
      edgesByPage.get(result.pageId)!.push(result)
    })

    // Rank pages by best edge score, then apply RRF
    const pagesByEdgeScore = Array.from(edgesByPage.entries())
      .map(([pageId, edges]) => ({
        pageId,
        bestScore: Math.max(...edges.map((e) => e.score)),
        edges,
      }))
      .sort((a, b) => b.bestScore - a.bestScore)

    pagesByEdgeScore.forEach((item, index) => {
      const rank = index + 1
      const rrfContribution = edgeWeight / (rrfK + rank)

      // Edge results don't have title/slug, use placeholder
      const entry = getPageEntry(item.pageId, 'Unknown')
      entry.rrfScore += rrfContribution
      entry.sources.add('edge')
      entry.sourceScores.edge = item.bestScore
      // Collect top 3 edge facts
      entry.edgeFacts = item.edges.map((e) => e.fact).slice(0, 3)
    })

    // Convert to array, sort by RRF score, and limit
    return Array.from(pageScores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit)
      .map((entry) => ({
        pageId: entry.pageId,
        title: entry.title,
        slug: entry.slug,
        score: entry.rrfScore,
        sources: Array.from(entry.sources),
        sourceScores: entry.sourceScores,
        headline: entry.headline,
        edgeFacts: entry.edgeFacts.length > 0 ? entry.edgeFacts : undefined,
      }))
  }

  /**
   * Fallback: vector-only search when BM25 is disabled
   */
  private async vectorOnlySearch(
    query: string,
    options: HybridSearchOptions
  ): Promise<HybridSearchResult[]> {
    const { workspaceId, projectId, limit = 20 } = options
    const context: WikiContext = { workspaceId, projectId }

    try {
      const results = await this.embeddingService.semanticSearch(context, query, { limit })

      return results.map((r) => ({
        pageId: r.pageId,
        title: r.title,
        score: r.score,
        sources: ['vector'] as Array<'bm25' | 'vector' | 'edge'>,
        sourceScores: { vector: r.score },
      }))
    } catch (error) {
      console.error('[WikiHybridSearchService] Vector-only search failed:', error)
      return []
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a WikiHybridSearchService instance with all dependencies
 */
export function createWikiHybridSearchService(
  prisma: PrismaClient,
  embeddingService: WikiEmbeddingService,
  edgeService: WikiEdgeEmbeddingService
): WikiHybridSearchService {
  const bm25Service = new WikiBm25Service(prisma)
  return new WikiHybridSearchService(bm25Service, embeddingService, edgeService)
}
