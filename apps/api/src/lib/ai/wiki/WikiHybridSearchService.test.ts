/**
 * Unit Tests: Wiki Hybrid Search Service (Fase 20.4)
 *
 * Tests for Reciprocal Rank Fusion (RRF):
 * - RRF algorithm correctness
 * - Parallel search execution
 * - Feature flag handling
 * - Graceful degradation
 * - Weight configuration
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  WikiHybridSearchService,
  type HybridSearchOptions,
  type HybridSearchResult,
} from './WikiHybridSearchService'
import type { Bm25SearchResult } from './WikiBm25Service'
import type { SemanticSearchResult } from './WikiEmbeddingService'
import type { EdgeSearchResult } from './WikiEdgeEmbeddingService'

// =============================================================================
// Mock Services
// =============================================================================

const createMockBm25Service = () => ({
  search: vi.fn().mockResolvedValue([]),
})

const createMockEmbeddingService = () => ({
  semanticSearch: vi.fn().mockResolvedValue([]),
})

const createMockEdgeService = () => ({
  edgeSemanticSearch: vi.fn().mockResolvedValue([]),
})

// =============================================================================
// Test Data
// =============================================================================

const mockBm25Results: Bm25SearchResult[] = [
  { pageId: 1, title: 'Kanban Guide', slug: 'kanban-guide', rank: 0.8, headline: '<mark>Kanban</mark> intro', source: 'workspace' },
  { pageId: 2, title: 'Project Management', slug: 'project-management', rank: 0.6, source: 'workspace' },
  { pageId: 3, title: 'Agile Methods', slug: 'agile-methods', rank: 0.4, source: 'workspace' },
]

const mockVectorResults: SemanticSearchResult[] = [
  { pageId: 2, title: 'Project Management', score: 0.9, groupId: 'wiki-ws-1' },
  { pageId: 1, title: 'Kanban Guide', score: 0.85, groupId: 'wiki-ws-1' },
  { pageId: 4, title: 'Scrum Basics', score: 0.7, groupId: 'wiki-ws-1' },
]

const mockEdgeResults: EdgeSearchResult[] = [
  { edgeId: 'e1', pageId: 1, score: 0.75, fact: 'Kanban is a visual method', edgeType: 'DESCRIBES', sourceNodeId: 'n1', targetNodeId: 'n2' },
  { edgeId: 'e2', pageId: 5, score: 0.65, fact: 'Sprint planning involves team', edgeType: 'RELATES_TO', sourceNodeId: 'n3', targetNodeId: 'n4' },
]

// =============================================================================
// Test Suite
// =============================================================================

describe('WikiHybridSearchService', () => {
  let service: WikiHybridSearchService
  let mockBm25: ReturnType<typeof createMockBm25Service>
  let mockEmbedding: ReturnType<typeof createMockEmbeddingService>
  let mockEdge: ReturnType<typeof createMockEdgeService>

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    delete process.env.DISABLE_BM25_SEARCH

    mockBm25 = createMockBm25Service()
    mockEmbedding = createMockEmbeddingService()
    mockEdge = createMockEdgeService()

    service = new WikiHybridSearchService(
      mockBm25 as any,
      mockEmbedding as any,
      mockEdge as any
    )
  })

  // ===========================================================================
  // RRF Algorithm Tests
  // ===========================================================================

  describe('rrfFusion', () => {
    it('should calculate correct RRF scores for single source', () => {
      const results = service.rrfFusion(
        mockBm25Results,
        [],
        [],
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 10 }
      )

      expect(results).toHaveLength(3)
      // First result: rank 1 → score = 1/(60+1) ≈ 0.0164
      expect(results[0].pageId).toBe(1)
      expect(results[0].score).toBeCloseTo(1 / 61, 4)
      expect(results[0].sources).toEqual(['bm25'])
    })

    it('should boost documents appearing in multiple sources', () => {
      const results = service.rrfFusion(
        mockBm25Results,
        mockVectorResults,
        [],
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 10 }
      )

      // Page 1 appears in both BM25 (rank 1) and Vector (rank 2)
      // Page 2 appears in both BM25 (rank 2) and Vector (rank 1)
      const page1 = results.find(r => r.pageId === 1)
      const page2 = results.find(r => r.pageId === 2)
      const page3 = results.find(r => r.pageId === 3)

      // Both page 1 and 2 should have higher scores than page 3 (single source)
      expect(page1!.sources).toContain('bm25')
      expect(page1!.sources).toContain('vector')
      expect(page2!.sources).toContain('bm25')
      expect(page2!.sources).toContain('vector')
      expect(page3!.sources).toEqual(['bm25'])

      // Multi-source should have higher score
      expect(page1!.score).toBeGreaterThan(page3!.score)
      expect(page2!.score).toBeGreaterThan(page3!.score)
    })

    it('should respect weights', () => {
      // With high BM25 weight, BM25 rank 1 should win
      const highBm25 = service.rrfFusion(
        mockBm25Results,
        mockVectorResults,
        [],
        { rrfK: 60, bm25Weight: 2.0, vectorWeight: 0.5, edgeWeight: 0.5, limit: 10 }
      )

      // With high vector weight, vector rank 1 should win
      const highVector = service.rrfFusion(
        mockBm25Results,
        mockVectorResults,
        [],
        { rrfK: 60, bm25Weight: 0.5, vectorWeight: 2.0, edgeWeight: 0.5, limit: 10 }
      )

      // BM25 rank 1 = page 1, Vector rank 1 = page 2
      expect(highBm25[0].pageId).toBe(1) // Page 1 wins with high BM25 weight
      expect(highVector[0].pageId).toBe(2) // Page 2 wins with high vector weight
    })

    it('should handle edge results correctly', () => {
      const results = service.rrfFusion(
        [],
        [],
        mockEdgeResults,
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 1.0, limit: 10 }
      )

      expect(results).toHaveLength(2)
      expect(results[0].sources).toEqual(['edge'])
      expect(results[0].edgeFacts).toContain('Kanban is a visual method')
    })

    it('should preserve headline from BM25 results', () => {
      const results = service.rrfFusion(
        mockBm25Results,
        mockVectorResults,
        [],
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 10 }
      )

      const page1 = results.find(r => r.pageId === 1)
      expect(page1!.headline).toBe('<mark>Kanban</mark> intro')
    })

    it('should respect limit parameter', () => {
      const results = service.rrfFusion(
        mockBm25Results,
        mockVectorResults,
        mockEdgeResults,
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 2 }
      )

      expect(results).toHaveLength(2)
    })

    it('should handle empty results', () => {
      const results = service.rrfFusion(
        [],
        [],
        [],
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 10 }
      )

      expect(results).toEqual([])
    })

    it('should store individual source scores', () => {
      const results = service.rrfFusion(
        mockBm25Results,
        mockVectorResults,
        [],
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 10 }
      )

      const page1 = results.find(r => r.pageId === 1)
      expect(page1!.sourceScores.bm25).toBe(0.8) // rank from BM25
      expect(page1!.sourceScores.vector).toBe(0.85) // score from vector
    })

    it('should verify RRF formula with known values', () => {
      // Manual calculation:
      // Page 1: BM25 rank=1, Vector rank=2
      //   RRF = 1/(60+1) + 1/(60+2) = 0.01639 + 0.01613 = 0.03252
      // Page 2: BM25 rank=2, Vector rank=1
      //   RRF = 1/(60+2) + 1/(60+1) = 0.01613 + 0.01639 = 0.03252

      const results = service.rrfFusion(
        mockBm25Results.slice(0, 2),
        mockVectorResults.slice(0, 2),
        [],
        { rrfK: 60, bm25Weight: 1.0, vectorWeight: 1.0, edgeWeight: 0.5, limit: 10 }
      )

      const page1 = results.find(r => r.pageId === 1)
      const page2 = results.find(r => r.pageId === 2)

      const expectedScore = 1/61 + 1/62
      expect(page1!.score).toBeCloseTo(expectedScore, 4)
      expect(page2!.score).toBeCloseTo(expectedScore, 4)
    })
  })

  // ===========================================================================
  // search() Tests
  // ===========================================================================

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const results = await service.search('', { workspaceId: 1 })
      expect(results).toEqual([])
      expect(mockBm25.search).not.toHaveBeenCalled()
    })

    it('should call all search services in parallel', async () => {
      mockBm25.search.mockResolvedValue(mockBm25Results)
      mockEmbedding.semanticSearch.mockResolvedValue(mockVectorResults)
      mockEdge.edgeSemanticSearch.mockResolvedValue(mockEdgeResults)

      await service.search('kanban', { workspaceId: 1 })

      expect(mockBm25.search).toHaveBeenCalledTimes(1)
      expect(mockEmbedding.semanticSearch).toHaveBeenCalledTimes(1)
      expect(mockEdge.edgeSemanticSearch).toHaveBeenCalledTimes(1)
    })

    it('should only call enabled services', async () => {
      await service.search('test', {
        workspaceId: 1,
        useBm25: true,
        useVector: false,
        useEdge: false,
      })

      expect(mockBm25.search).toHaveBeenCalledTimes(1)
      expect(mockEmbedding.semanticSearch).not.toHaveBeenCalled()
      expect(mockEdge.edgeSemanticSearch).not.toHaveBeenCalled()
    })

    it('should handle BM25 failure gracefully', async () => {
      mockBm25.search.mockRejectedValue(new Error('BM25 error'))
      mockEmbedding.semanticSearch.mockResolvedValue(mockVectorResults)
      mockEdge.edgeSemanticSearch.mockResolvedValue([])

      const results = await service.search('test', { workspaceId: 1 })

      // Should still return vector results
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].sources).toContain('vector')
    })

    it('should handle vector failure gracefully', async () => {
      mockBm25.search.mockResolvedValue(mockBm25Results)
      mockEmbedding.semanticSearch.mockRejectedValue(new Error('Vector error'))
      mockEdge.edgeSemanticSearch.mockResolvedValue([])

      const results = await service.search('test', { workspaceId: 1 })

      // Should still return BM25 results
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].sources).toContain('bm25')
    })

    it('should pass correct options to BM25 service', async () => {
      await service.search('test', { workspaceId: 123, projectId: 456, limit: 10 })

      expect(mockBm25.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          workspaceId: 123,
          projectId: 456,
          limit: 20, // 2x requested limit for better fusion
        })
      )
    })

    it('should pass WikiContext to embedding services', async () => {
      await service.search('test', { workspaceId: 123, projectId: 456 })

      expect(mockEmbedding.semanticSearch).toHaveBeenCalledWith(
        { workspaceId: 123, projectId: 456 },
        'test',
        expect.any(Object)
      )

      expect(mockEdge.edgeSemanticSearch).toHaveBeenCalledWith(
        { workspaceId: 123, projectId: 456 },
        'test',
        expect.any(Object)
      )
    })
  })

  // ===========================================================================
  // Feature Flag Tests
  // ===========================================================================

  describe('feature flag', () => {
    it('should disable BM25 when DISABLE_BM25_SEARCH is true', async () => {
      process.env.DISABLE_BM25_SEARCH = 'true'
      mockEmbedding.semanticSearch.mockResolvedValue(mockVectorResults)

      await service.search('test', { workspaceId: 1, useEdge: false })

      expect(mockBm25.search).not.toHaveBeenCalled()
      expect(mockEmbedding.semanticSearch).toHaveBeenCalled()
    })

    it('should use vector-only search when BM25 disabled and edge disabled', async () => {
      process.env.DISABLE_BM25_SEARCH = 'true'
      mockEmbedding.semanticSearch.mockResolvedValue(mockVectorResults)

      const results = await service.search('test', {
        workspaceId: 1,
        useBm25: true,
        useVector: true,
        useEdge: false,
      })

      expect(results.every(r => r.sources.includes('vector'))).toBe(true)
      expect(results.every(r => !r.sources.includes('bm25'))).toBe(true)
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle duplicate page IDs from different sources', async () => {
      mockBm25.search.mockResolvedValue([
        { pageId: 1, title: 'Page One', slug: 'page-one', rank: 0.9, source: 'workspace' },
      ])
      mockEmbedding.semanticSearch.mockResolvedValue([
        { pageId: 1, title: 'Page One', score: 0.85, groupId: 'g1' },
      ])

      const results = await service.search('test', { workspaceId: 1, useEdge: false })

      // Should merge into single result with both sources
      expect(results).toHaveLength(1)
      expect(results[0].pageId).toBe(1)
      expect(results[0].sources).toContain('bm25')
      expect(results[0].sources).toContain('vector')
    })

    it('should use slug from BM25 when vector has none', async () => {
      mockBm25.search.mockResolvedValue([
        { pageId: 1, title: 'Page', slug: 'my-slug', rank: 0.9, source: 'workspace' },
      ])
      mockEmbedding.semanticSearch.mockResolvedValue([
        { pageId: 1, title: 'Page', score: 0.85, groupId: 'g1' }, // No slug
      ])

      const results = await service.search('test', { workspaceId: 1, useEdge: false })

      expect(results[0].slug).toBe('my-slug')
    })

    it('should handle very large result sets', async () => {
      const largeBm25 = Array.from({ length: 100 }, (_, i) => ({
        pageId: i + 1,
        title: `Page ${i + 1}`,
        slug: `page-${i + 1}`,
        rank: 1 - i * 0.01,
        source: 'workspace' as const,
      }))

      mockBm25.search.mockResolvedValue(largeBm25)

      const results = await service.search('test', {
        workspaceId: 1,
        useVector: false,
        useEdge: false,
        limit: 10,
      })

      expect(results).toHaveLength(10)
    })
  })
})
