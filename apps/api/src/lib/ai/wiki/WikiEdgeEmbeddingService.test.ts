/**
 * Unit Tests: Wiki Edge Embedding Service (Fase 19.5)
 *
 * Tests for edge fact embeddings:
 * - Embedding generation and storage
 * - Semantic search over edges
 * - Hybrid search (pages + edges)
 * - Change detection (fact hash)
 * - Batch processing
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  WikiEdgeEmbeddingService,
  resetWikiEdgeEmbeddingService,
  type EdgeForEmbedding,
} from './WikiEdgeEmbeddingService'
import type { WikiContext } from './WikiAiService'

// =============================================================================
// Mock Types
// =============================================================================

interface MockPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

// =============================================================================
// Mock Qdrant Client
// =============================================================================

const createMockQdrantClient = () => {
  const points = new Map<string, MockPoint>()

  return {
    getCollections: vi.fn().mockResolvedValue({
      collections: [{ name: 'kanbu_edge_embeddings' }],
    }),
    createCollection: vi.fn().mockResolvedValue(true),
    createPayloadIndex: vi.fn().mockResolvedValue(true),
    getCollection: vi.fn().mockImplementation(() => ({
      points_count: points.size,
    })),
    upsert: vi.fn().mockImplementation((_collection: string, params: { points: MockPoint[] }) => {
      for (const point of params.points) {
        points.set(point.id, point)
      }
      return Promise.resolve({ status: 'completed' })
    }),
    retrieve: vi.fn().mockImplementation((_collection: string, params: { ids: string[] }) => {
      return Promise.resolve(
        params.ids.map(id => points.get(id)).filter(Boolean)
      )
    }),
    search: vi.fn().mockImplementation((_collection: string, params: {
      vector: number[]
      limit: number
      score_threshold?: number
    }) => {
      // Return all stored points as search results
      const results = Array.from(points.values()).map(p => ({
        id: p.id,
        score: 0.85,
        payload: p.payload,
      }))
      return Promise.resolve(results.slice(0, params.limit))
    }),
    delete: vi.fn().mockResolvedValue({ status: 'completed' }),
    _points: points,
    _reset: () => points.clear(),
  }
}

// =============================================================================
// Mock WikiAiService
// =============================================================================

const createMockWikiAiService = () => ({
  embed: vi.fn().mockImplementation((_context: unknown, text: string) => ({
    embedding: generateMockEmbedding(text),
    model: 'text-embedding-3-small',
    tokenCount: text.split(' ').length,
  })),
  getEmbeddingInfo: vi.fn().mockResolvedValue({
    available: true,
    dimensions: 1536,
    model: 'text-embedding-3-small',
  }),
})

// Generate deterministic mock embedding based on text
function generateMockEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0)
  for (let i = 0; i < text.length && i < 100; i++) {
    embedding[i * 15] = text.charCodeAt(i) / 255
  }
  return embedding
}

// =============================================================================
// Mock WikiEmbeddingService (for hybrid search)
// =============================================================================

const createMockWikiEmbeddingService = () => ({
  semanticSearch: vi.fn().mockResolvedValue([
    {
      pageId: 1,
      title: 'Test Page',
      score: 0.9,
      groupId: 'group-1',
    },
    {
      pageId: 2,
      title: 'Another Page',
      score: 0.75,
      groupId: 'group-2',
    },
  ]),
})

// =============================================================================
// Test Fixtures
// =============================================================================

const testContext: WikiContext = {
  workspaceId: 1,
  projectId: 10,
}

const testEdges: EdgeForEmbedding[] = [
  {
    id: 'edge-1',
    fact: 'Robin wrote the Authentication Flow documentation',
    edgeType: 'MENTIONS',
    sourceNode: 'Auth Page',
    targetNode: 'Robin',
    validAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'edge-2',
    fact: 'API Gateway uses OAuth2 protocol',
    edgeType: 'MENTIONS',
    sourceNode: 'API Gateway',
    targetNode: 'OAuth2',
    validAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'edge-3',
    fact: 'Architecture document links to API Gateway',
    edgeType: 'LINKS_TO',
    sourceNode: 'Architecture',
    targetNode: 'API Gateway',
  },
]

// =============================================================================
// Tests
// =============================================================================

describe('WikiEdgeEmbeddingService', () => {
  let service: WikiEdgeEmbeddingService
  let mockQdrant: ReturnType<typeof createMockQdrantClient>
  let mockWikiAiService: ReturnType<typeof createMockWikiAiService>
  let mockWikiEmbeddingService: ReturnType<typeof createMockWikiEmbeddingService>

  beforeEach(() => {
    // Reset singleton
    resetWikiEdgeEmbeddingService()

    // Create fresh mocks
    mockQdrant = createMockQdrantClient()
    mockWikiAiService = createMockWikiAiService()
    mockWikiEmbeddingService = createMockWikiEmbeddingService()

    // Create service with mocked dependencies
    service = new WikiEdgeEmbeddingService({} as any)

    // Inject mocks using private property access
    ;(service as any).client = mockQdrant
    ;(service as any).wikiAiService = mockWikiAiService
    ;(service as any).initialized = true
    ;(service as any).embeddingDimensions = 1536
  })

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe('initialize', () => {
    it('should create collection if it does not exist', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] })
      ;(service as any).initialized = false

      await service['initialize'](testContext)

      expect(mockQdrant.createCollection).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          vectors: { size: 1536, distance: 'Cosine' },
        })
      )
    })

    it('should skip creation if collection exists', async () => {
      mockQdrant.getCollections.mockResolvedValue({
        collections: [{ name: 'kanbu_edge_embeddings' }],
      })
      ;(service as any).initialized = false

      await service['initialize'](testContext)

      expect(mockQdrant.createCollection).not.toHaveBeenCalled()
    })

    it('should create payload indexes on new collection', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] })
      ;(service as any).initialized = false

      await service['initialize'](testContext)

      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledTimes(4)
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({ field_name: 'workspaceId' })
      )
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({ field_name: 'edgeType' })
      )
    })
  })

  // ===========================================================================
  // Edge Format Tests
  // ===========================================================================

  describe('formatEdgeForEmbedding', () => {
    it('should format edge with context', () => {
      const edge: EdgeForEmbedding = {
        id: 'test-1',
        fact: 'Robin wrote the docs',
        edgeType: 'MENTIONS',
        sourceNode: 'Page A',
        targetNode: 'Robin',
      }

      const formatted = service['formatEdgeForEmbedding'](edge)

      expect(formatted).toBe('[MENTIONS] Page A -> Robin: Robin wrote the docs')
    })

    it('should handle different edge types', () => {
      const linksTo: EdgeForEmbedding = {
        id: 'test-2',
        fact: 'Architecture links to API',
        edgeType: 'LINKS_TO',
        sourceNode: 'Architecture',
        targetNode: 'API Gateway',
      }

      const formatted = service['formatEdgeForEmbedding'](linksTo)

      expect(formatted).toBe('[LINKS_TO] Architecture -> API Gateway: Architecture links to API')
    })
  })

  // ===========================================================================
  // Hash Function Tests
  // ===========================================================================

  describe('hashFact', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = service['hashFact']('Test fact')
      const hash2 = service['hashFact']('Test fact')

      expect(hash1).toBe(hash2)
    })

    it('should generate different hash for different input', () => {
      const hash1 = service['hashFact']('Test fact 1')
      const hash2 = service['hashFact']('Test fact 2')

      expect(hash1).not.toBe(hash2)
    })

    it('should return hex string', () => {
      const hash = service['hashFact']('Test')

      expect(hash).toMatch(/^-?[0-9a-f]+$/i)
    })
  })

  // ===========================================================================
  // Embedding Storage Tests
  // ===========================================================================

  describe('storeEdgeEmbedding', () => {
    it('should generate and store embedding', async () => {
      const edge = testEdges[0]!

      const result = await service.storeEdgeEmbedding(testContext, edge, 100)

      expect(result).toBe(true)
      expect(mockWikiAiService.embed).toHaveBeenCalled()
      expect(mockQdrant.upsert).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number), // Numeric point ID generated from edge.id
              payload: expect.objectContaining({
                edgeId: edge.id, // Original string ID stored in payload
                workspaceId: testContext.workspaceId,
                projectId: testContext.projectId,
                pageId: 100,
                fact: edge.fact,
                edgeType: edge.edgeType,
              }),
            }),
          ]),
        })
      )
    })

    it('should include temporal fields in payload', async () => {
      const edge = testEdges[0]!

      await service.storeEdgeEmbedding(testContext, edge, 100)

      const upsertCall = mockQdrant.upsert.mock.calls[0]!
      const payload = upsertCall[1].points[0]!.payload

      expect(payload.validAt).toBe(edge.validAt)
      expect(payload.factHash).toBeDefined()
      expect(payload.createdAt).toBeDefined()
    })

    it('should return false when not initialized and provider unavailable', async () => {
      ;(service as any).initialized = false
      ;(service as any).embeddingDimensions = null
      // Mock provider as unavailable
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const result = await service.storeEdgeEmbedding(testContext, testEdges[0]!, 100)

      expect(result).toBe(false)
    })
  })

  // ===========================================================================
  // Batch Processing Tests
  // ===========================================================================

  describe('generateAndStoreEdgeEmbeddings', () => {
    it('should process multiple edges', async () => {
      const result = await service.generateAndStoreEdgeEmbeddings(
        testContext,
        100,
        testEdges
      )

      expect(result.stored).toBe(3)
      expect(result.skipped).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should skip edges without fact', async () => {
      const edgesWithEmpty = [
        ...testEdges,
        { id: 'empty-1', fact: '', edgeType: 'MENTIONS', sourceNode: 'A', targetNode: 'B' },
        { id: 'empty-2', fact: '   ', edgeType: 'MENTIONS', sourceNode: 'C', targetNode: 'D' },
      ]

      const result = await service.generateAndStoreEdgeEmbeddings(
        testContext,
        100,
        edgesWithEmpty
      )

      expect(result.stored).toBe(3)
      expect(result.skipped).toBe(2)
    })

    it('should skip unchanged edges', async () => {
      // First run - store all
      await service.generateAndStoreEdgeEmbeddings(testContext, 100, testEdges)

      // Setup mock to return existing points with matching hashes
      // Now uses numeric IDs via generatePointId
      mockQdrant.retrieve.mockImplementation((_: string, params: { ids: number[] }) => {
        return Promise.resolve(
          params.ids.map(numericId => {
            // Find edge that matches this numeric ID
            const edge = testEdges.find(e => service['generatePointId'](e.id) === numericId)
            if (edge) {
              return {
                id: numericId,
                payload: {
                  edgeId: edge.id,
                  factHash: service['hashFact'](edge.fact),
                },
              }
            }
            return undefined
          }).filter(Boolean)
        )
      })

      // Second run - should skip all
      const result = await service.generateAndStoreEdgeEmbeddings(
        testContext,
        100,
        testEdges
      )

      expect(result.stored).toBe(0)
      expect(result.skipped).toBe(3)
    })

    it('should handle errors gracefully', async () => {
      mockWikiAiService.embed.mockRejectedValueOnce(new Error('API Error'))

      const result = await service.generateAndStoreEdgeEmbeddings(
        testContext,
        100,
        testEdges
      )

      // First edge fails, others succeed
      expect(result.errors).toBe(1)
      expect(result.stored).toBe(2)
    })
  })

  // ===========================================================================
  // Change Detection Tests
  // ===========================================================================

  describe('checkEdgeEmbeddingStatus', () => {
    it('should return exists=false for non-existent edge', async () => {
      mockQdrant.retrieve.mockResolvedValue([])

      const status = await service.checkEdgeEmbeddingStatus('edge-999', 'Some fact')

      expect(status.exists).toBe(false)
      expect(status.needsUpdate).toBe(true)
    })

    it('should return needsUpdate=false for unchanged fact', async () => {
      const fact = 'Test fact'
      mockQdrant.retrieve.mockResolvedValue([
        { id: 'edge-1', payload: { factHash: service['hashFact'](fact) } },
      ])

      const status = await service.checkEdgeEmbeddingStatus('edge-1', fact)

      expect(status.exists).toBe(true)
      expect(status.needsUpdate).toBe(false)
    })

    it('should return needsUpdate=true for changed fact', async () => {
      mockQdrant.retrieve.mockResolvedValue([
        { id: 'edge-1', payload: { factHash: 'old-hash' } },
      ])

      const status = await service.checkEdgeEmbeddingStatus('edge-1', 'New fact')

      expect(status.exists).toBe(true)
      expect(status.needsUpdate).toBe(true)
    })
  })

  // ===========================================================================
  // Edge Semantic Search Tests
  // ===========================================================================

  describe('edgeSemanticSearch', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      for (const edge of testEdges) {
        await service.storeEdgeEmbedding(testContext, edge, 100)
      }
    })

    it('should return matching edges', async () => {
      const results = await service.edgeSemanticSearch(
        testContext,
        'who wrote authentication docs',
        { limit: 10 }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!).toMatchObject({
        edgeId: expect.any(String),
        score: expect.any(Number),
        fact: expect.any(String),
        edgeType: expect.any(String),
      })
    })

    it('should respect score threshold', async () => {
      mockQdrant.search.mockResolvedValue([
        { id: 'edge-1', score: 0.9, payload: { fact: 'High score' } },
        { id: 'edge-2', score: 0.3, payload: { fact: 'Low score' } },
      ])

      await service.edgeSemanticSearch(
        testContext,
        'test query',
        { scoreThreshold: 0.5 }
      )

      // Qdrant handles threshold filtering
      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          score_threshold: 0.5,
        })
      )
    })

    it('should filter by workspace', async () => {
      await service.edgeSemanticSearch(testContext, 'test query')

      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'workspaceId', match: { value: testContext.workspaceId } },
            ]),
          }),
        })
      )
    })

    it('should filter by edge type when specified', async () => {
      await service.edgeSemanticSearch(
        testContext,
        'test query',
        { edgeType: 'MENTIONS' }
      )

      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'edgeType', match: { value: 'MENTIONS' } },
            ]),
          }),
        })
      )
    })

    it('should return empty array when not initialized and provider unavailable', async () => {
      ;(service as any).initialized = false
      ;(service as any).embeddingDimensions = null
      // Mock provider as unavailable
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const results = await service.edgeSemanticSearch(testContext, 'test')

      expect(results).toEqual([])
    })
  })

  // ===========================================================================
  // Hybrid Search Tests
  // ===========================================================================

  describe('hybridSemanticSearch', () => {
    beforeEach(() => {
      // Mock the page search method
      ;(service as any).searchPages = mockWikiEmbeddingService.semanticSearch
    })

    it('should combine page and edge results', async () => {
      // Store test edges
      for (const edge of testEdges) {
        await service.storeEdgeEmbedding(testContext, edge, 100)
      }

      const results = await service.hybridSemanticSearch(
        testContext,
        'authentication',
        { includePages: true, includeEdges: true }
      )

      // Should have both page and edge results
      const pageResults = results.filter(r => r.type === 'page')
      const edgeResults = results.filter(r => r.type === 'edge')

      expect(pageResults.length).toBeGreaterThan(0)
      expect(edgeResults.length).toBeGreaterThan(0)
    })

    it('should sort results by score descending', async () => {
      ;(service as any).searchPages = vi.fn().mockResolvedValue([
        { pageId: 1, title: 'Page', score: 0.7, groupId: 'g1' },
      ])

      mockQdrant.search.mockResolvedValue([
        { id: 'e1', score: 0.9, payload: { fact: 'High score edge' } },
        { id: 'e2', score: 0.5, payload: { fact: 'Low score edge' } },
      ])

      const results = await service.hybridSemanticSearch(testContext, 'test')

      // Results should be sorted: edge 0.9, page 0.7, edge 0.5
      expect(results[0]!.score).toBeGreaterThanOrEqual(results[1]!.score)
      expect(results[1]!.score).toBeGreaterThanOrEqual(results[2]!.score)
    })

    it('should respect limit', async () => {
      const results = await service.hybridSemanticSearch(
        testContext,
        'test',
        { limit: 2 }
      )

      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should exclude pages when includePages is false', async () => {
      ;(service as any).searchPages = vi.fn()

      await service.hybridSemanticSearch(
        testContext,
        'test',
        { includePages: false, includeEdges: true }
      )

      expect((service as any).searchPages).not.toHaveBeenCalled()
    })

    it('should exclude edges when includeEdges is false', async () => {
      const edgeSearchSpy = vi.spyOn(service, 'edgeSemanticSearch')

      await service.hybridSemanticSearch(
        testContext,
        'test',
        { includePages: true, includeEdges: false }
      )

      expect(edgeSearchSpy).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Delete Operations Tests
  // ===========================================================================

  describe('deleteEdgeEmbedding', () => {
    it('should delete single edge embedding', async () => {
      const result = await service.deleteEdgeEmbedding('edge-1')

      expect(result).toBe(true)
      expect(mockQdrant.delete).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          points: [expect.any(Number)], // Numeric point ID generated from 'edge-1'
        })
      )
    })

    it('should return false on error', async () => {
      mockQdrant.delete.mockRejectedValue(new Error('Delete failed'))

      const result = await service.deleteEdgeEmbedding('edge-1')

      expect(result).toBe(false)
    })
  })

  describe('deletePageEdgeEmbeddings', () => {
    it('should delete all embeddings for a page', async () => {
      await service.deletePageEdgeEmbeddings(100)

      expect(mockQdrant.delete).toHaveBeenCalledWith(
        'kanbu_edge_embeddings',
        expect.objectContaining({
          filter: {
            must: [{ key: 'pageId', match: { value: 100 } }],
          },
        })
      )
    })
  })

  // ===========================================================================
  // Stats Tests
  // ===========================================================================

  describe('getStats', () => {
    it('should return collection stats', async () => {
      mockQdrant._points.set('edge-1', { id: 'edge-1', vector: [], payload: {} })
      mockQdrant._points.set('edge-2', { id: 'edge-2', vector: [], payload: {} })

      const stats = await service.getStats()

      expect(stats.collectionExists).toBe(true)
      expect(stats.totalEdges).toBe(2)
    })

    it('should return zeros when collection does not exist', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] })

      const stats = await service.getStats()

      expect(stats.collectionExists).toBe(false)
      expect(stats.totalEdges).toBe(0)
    })
  })
})
