/**
 * Unit Tests: Wiki Node Embedding Service (Fase 21.5)
 *
 * Tests for entity node embeddings:
 * - Embedding generation and storage
 * - Semantic entity search (entity resolution)
 * - Name normalization and hashing
 * - Change detection (name hash)
 * - Batch processing
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  WikiNodeEmbeddingService,
  resetWikiNodeEmbeddingService,
  type NodeForEmbedding,
} from './WikiNodeEmbeddingService'
import type { WikiContext } from './WikiAiService'

// =============================================================================
// Mock Types
// =============================================================================

interface MockPoint {
  id: number
  vector: number[]
  payload: Record<string, unknown>
}

// =============================================================================
// Mock Qdrant Client
// =============================================================================

const createMockQdrantClient = () => {
  const points = new Map<number, MockPoint>()

  return {
    getCollections: vi.fn().mockResolvedValue({
      collections: [{ name: 'kanbu_node_embeddings' }],
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
    retrieve: vi.fn().mockImplementation((_collection: string, params: { ids: number[] }) => {
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
        score: 0.90,
        payload: p.payload,
      }))
      return Promise.resolve(results.slice(0, params.limit))
    }),
    scroll: vi.fn().mockImplementation((_collection: string, params: {
      filter: Record<string, unknown>
      limit: number
    }) => {
      // Return points matching filter (simplified)
      const results = Array.from(points.values()).slice(0, params.limit)
      return Promise.resolve({ points: results })
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
// Test Fixtures
// =============================================================================

const testContext: WikiContext = {
  workspaceId: 1,
  projectId: 10,
}

const testNodes: NodeForEmbedding[] = [
  {
    id: 'node-1-person-robin',
    name: 'Robin Waslander',
    type: 'Person',
    groupId: 'wiki-ws-1',
  },
  {
    id: 'node-2-concept-auth',
    name: 'Authentication',
    type: 'Concept',
    groupId: 'wiki-ws-1',
  },
  {
    id: 'node-3-project-kanbu',
    name: 'Kanbu Project',
    type: 'Project',
    groupId: 'wiki-ws-1',
  },
  {
    id: 'node-4-person-jan',
    name: 'Jan Janssen',
    type: 'Person',
    groupId: 'wiki-ws-1',
  },
]

// =============================================================================
// Tests
// =============================================================================

describe('WikiNodeEmbeddingService', () => {
  let service: WikiNodeEmbeddingService
  let mockQdrant: ReturnType<typeof createMockQdrantClient>
  let mockWikiAiService: ReturnType<typeof createMockWikiAiService>

  beforeEach(() => {
    // Reset singleton
    resetWikiNodeEmbeddingService()

    // Create fresh mocks
    mockQdrant = createMockQdrantClient()
    mockWikiAiService = createMockWikiAiService()

    // Create service with mocked dependencies
    service = new WikiNodeEmbeddingService({} as any)

    // Inject mocks using private property access
    ;(service as any).client = mockQdrant
    ;(service as any).wikiAiService = mockWikiAiService
    ;(service as any).initialized = true
    ;(service as any).embeddingDimensions = 1536
  })

  // ===========================================================================
  // Initialization Tests
  // ===========================================================================

  describe('ensureCollection', () => {
    it('should create collection if it does not exist', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] })
      ;(service as any).initialized = false

      await service.ensureCollection(testContext)

      expect(mockQdrant.createCollection).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          vectors: { size: 1536, distance: 'Cosine' },
        })
      )
    })

    it('should skip creation if collection exists', async () => {
      mockQdrant.getCollections.mockResolvedValue({
        collections: [{ name: 'kanbu_node_embeddings' }],
      })
      ;(service as any).initialized = false

      await service.ensureCollection(testContext)

      expect(mockQdrant.createCollection).not.toHaveBeenCalled()
    })

    it('should create payload indexes on new collection', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] })
      ;(service as any).initialized = false

      await service.ensureCollection(testContext)

      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledTimes(4)
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({ field_name: 'workspaceId' })
      )
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({ field_name: 'nodeType' })
      )
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({ field_name: 'groupId' })
      )
      expect(mockQdrant.createPayloadIndex).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({ field_name: 'normalizedName' })
      )
    })

    it('should return false when embedding provider unavailable', async () => {
      ;(service as any).initialized = false
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const result = await service.ensureCollection(testContext)

      expect(result).toBe(false)
    })
  })

  // ===========================================================================
  // Node Format Tests
  // ===========================================================================

  describe('formatNodeForEmbedding', () => {
    it('should format node with type prefix', () => {
      const node: NodeForEmbedding = {
        id: 'test-1',
        name: 'Robin Waslander',
        type: 'Person',
        groupId: 'wiki-ws-1',
      }

      const formatted = service.formatNodeForEmbedding(node)

      expect(formatted).toBe('[Person] Robin Waslander')
    })

    it('should handle Concept type', () => {
      const node: NodeForEmbedding = {
        id: 'test-2',
        name: 'OAuth2 Protocol',
        type: 'Concept',
        groupId: 'wiki-ws-1',
      }

      const formatted = service.formatNodeForEmbedding(node)

      expect(formatted).toBe('[Concept] OAuth2 Protocol')
    })

    it('should handle Project type', () => {
      const node: NodeForEmbedding = {
        id: 'test-3',
        name: 'Kanbu Board',
        type: 'Project',
        groupId: 'wiki-ws-1',
      }

      const formatted = service.formatNodeForEmbedding(node)

      expect(formatted).toBe('[Project] Kanbu Board')
    })

    it('should handle Task type', () => {
      const node: NodeForEmbedding = {
        id: 'test-4',
        name: 'Implement Login',
        type: 'Task',
        groupId: 'wiki-ws-1',
      }

      const formatted = service.formatNodeForEmbedding(node)

      expect(formatted).toBe('[Task] Implement Login')
    })
  })

  // ===========================================================================
  // Name Normalization Tests
  // ===========================================================================

  describe('normalizeName', () => {
    it('should lowercase name', () => {
      const result = service.normalizeName('Robin WASLANDER')

      expect(result).toBe('robin waslander')
    })

    it('should trim whitespace', () => {
      const result = service.normalizeName('  Robin  ')

      expect(result).toBe('robin')
    })

    it('should collapse multiple spaces', () => {
      const result = service.normalizeName('Robin    Waslander')

      expect(result).toBe('robin waslander')
    })

    it('should handle empty string', () => {
      const result = service.normalizeName('')

      expect(result).toBe('')
    })
  })

  // ===========================================================================
  // Hash Function Tests
  // ===========================================================================

  describe('hashName (private)', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = (service as any).hashName('Robin')
      const hash2 = (service as any).hashName('Robin')

      expect(hash1).toBe(hash2)
    })

    it('should generate different hash for different input', () => {
      const hash1 = (service as any).hashName('Robin')
      const hash2 = (service as any).hashName('Jan')

      expect(hash1).not.toBe(hash2)
    })

    it('should return hex string', () => {
      const hash = (service as any).hashName('Test')

      expect(hash).toMatch(/^-?[0-9a-f]+$/i)
    })

    it('should normalize before hashing (case insensitive)', () => {
      const hash1 = (service as any).hashName('Robin')
      const hash2 = (service as any).hashName('robin')

      expect(hash1).toBe(hash2)
    })
  })

  // ===========================================================================
  // Point ID Generation Tests
  // ===========================================================================

  describe('generatePointId (private)', () => {
    it('should generate consistent numeric ID from string', () => {
      const id1 = (service as any).generatePointId('node-1')
      const id2 = (service as any).generatePointId('node-1')

      expect(id1).toBe(id2)
      expect(typeof id1).toBe('number')
    })

    it('should generate different IDs for different nodes', () => {
      const id1 = (service as any).generatePointId('node-1')
      const id2 = (service as any).generatePointId('node-2')

      expect(id1).not.toBe(id2)
    })

    it('should return positive number', () => {
      const id = (service as any).generatePointId('any-node-id')

      expect(id).toBeGreaterThan(0)
    })
  })

  // ===========================================================================
  // Embedding Storage Tests
  // ===========================================================================

  describe('storeNodeEmbedding', () => {
    it('should store embedding with correct payload', async () => {
      const node = testNodes[0]!
      const embedding = generateMockEmbedding('[Person] Robin Waslander')

      const result = await service.storeNodeEmbedding(testContext, node, embedding)

      expect(result).toBe(true)
      expect(mockQdrant.upsert).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              payload: expect.objectContaining({
                nodeId: node.id,
                workspaceId: testContext.workspaceId,
                projectId: testContext.projectId,
                groupId: node.groupId,
                nodeType: node.type,
                name: node.name,
                normalizedName: 'robin waslander',
              }),
            }),
          ]),
        })
      )
    })

    it('should include nameHash for change detection', async () => {
      const node = testNodes[0]!
      const embedding = generateMockEmbedding('[Person] Robin Waslander')

      await service.storeNodeEmbedding(testContext, node, embedding)

      const upsertCall = mockQdrant.upsert.mock.calls[0]!
      const payload = upsertCall[1].points[0]!.payload

      expect(payload.nameHash).toBeDefined()
      expect(typeof payload.nameHash).toBe('string')
    })

    it('should return false when not initialized', async () => {
      ;(service as any).initialized = false
      ;(service as any).embeddingDimensions = null
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const result = await service.storeNodeEmbedding(
        testContext,
        testNodes[0]!,
        generateMockEmbedding('test')
      )

      expect(result).toBe(false)
    })
  })

  describe('generateAndStoreNodeEmbedding', () => {
    it('should generate and store embedding', async () => {
      const node = testNodes[0]!

      const result = await service.generateAndStoreNodeEmbedding(testContext, node)

      expect(result).toBe(true)
      expect(mockWikiAiService.embed).toHaveBeenCalledWith(
        testContext,
        '[Person] Robin Waslander'
      )
      expect(mockQdrant.upsert).toHaveBeenCalled()
    })

    it('should skip unchanged node', async () => {
      const node = testNodes[0]!

      // First store
      await service.generateAndStoreNodeEmbedding(testContext, node)

      // Setup mock to return existing point with matching hash
      const pointId = (service as any).generatePointId(node.id)
      mockQdrant.retrieve.mockResolvedValue([
        {
          id: pointId,
          payload: {
            nodeId: node.id,
            nameHash: (service as any).hashName(node.name),
          },
        },
      ])

      // Reset call counts
      mockWikiAiService.embed.mockClear()
      mockQdrant.upsert.mockClear()

      // Second store should skip
      const result = await service.generateAndStoreNodeEmbedding(testContext, node)

      expect(result).toBe(true)
      expect(mockWikiAiService.embed).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Batch Processing Tests
  // ===========================================================================

  describe('generateAndStoreBatchNodeEmbeddings', () => {
    it('should process multiple nodes', async () => {
      const result = await service.generateAndStoreBatchNodeEmbeddings(
        testContext,
        testNodes
      )

      expect(result.stored).toBe(4)
      expect(result.skipped).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should skip nodes without name', async () => {
      const nodesWithEmpty: NodeForEmbedding[] = [
        ...testNodes,
        { id: 'empty-1', name: '', type: 'Concept', groupId: 'wiki-ws-1' },
        { id: 'empty-2', name: '   ', type: 'Person', groupId: 'wiki-ws-1' },
      ]

      const result = await service.generateAndStoreBatchNodeEmbeddings(
        testContext,
        nodesWithEmpty
      )

      expect(result.stored).toBe(4)
      expect(result.skipped).toBe(2)
    })

    it('should skip unchanged nodes', async () => {
      // First run - store all
      await service.generateAndStoreBatchNodeEmbeddings(testContext, testNodes)

      // Setup mock to return existing points with matching hashes
      mockQdrant.retrieve.mockImplementation((_: string, params: { ids: number[] }) => {
        return Promise.resolve(
          params.ids.map(numericId => {
            const node = testNodes.find(n => (service as any).generatePointId(n.id) === numericId)
            if (node) {
              return {
                id: numericId,
                payload: {
                  nodeId: node.id,
                  nameHash: (service as any).hashName(node.name),
                },
              }
            }
            return undefined
          }).filter(Boolean)
        )
      })

      // Second run - should skip all
      const result = await service.generateAndStoreBatchNodeEmbeddings(
        testContext,
        testNodes
      )

      expect(result.stored).toBe(0)
      expect(result.skipped).toBe(4)
    })

    it('should handle errors gracefully', async () => {
      mockWikiAiService.embed.mockRejectedValueOnce(new Error('API Error'))

      const result = await service.generateAndStoreBatchNodeEmbeddings(
        testContext,
        testNodes
      )

      // First node fails, others succeed
      expect(result.errors).toBe(1)
      expect(result.stored).toBe(3)
    })

    it('should return empty result when not initialized', async () => {
      ;(service as any).initialized = false
      ;(service as any).embeddingDimensions = null
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const result = await service.generateAndStoreBatchNodeEmbeddings(
        testContext,
        testNodes
      )

      expect(result.stored).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.errors).toBe(0)
    })
  })

  // ===========================================================================
  // Change Detection Tests
  // ===========================================================================

  describe('checkNodeEmbeddingStatus', () => {
    it('should return exists=false for non-existent node', async () => {
      mockQdrant.retrieve.mockResolvedValue([])

      const status = await service.checkNodeEmbeddingStatus('node-999', 'Some Name')

      expect(status.exists).toBe(false)
      expect(status.needsUpdate).toBe(true)
    })

    it('should return needsUpdate=false for unchanged name', async () => {
      const name = 'Robin'
      const pointId = (service as any).generatePointId('node-1')
      mockQdrant.retrieve.mockResolvedValue([
        { id: pointId, payload: { nameHash: (service as any).hashName(name) } },
      ])

      const status = await service.checkNodeEmbeddingStatus('node-1', name)

      expect(status.exists).toBe(true)
      expect(status.needsUpdate).toBe(false)
    })

    it('should return needsUpdate=true for changed name', async () => {
      const pointId = (service as any).generatePointId('node-1')
      mockQdrant.retrieve.mockResolvedValue([
        { id: pointId, payload: { nameHash: 'old-hash' } },
      ])

      const status = await service.checkNodeEmbeddingStatus('node-1', 'New Name')

      expect(status.exists).toBe(true)
      expect(status.needsUpdate).toBe(true)
    })
  })

  // ===========================================================================
  // Entity Resolution / Similarity Search Tests
  // ===========================================================================

  describe('findSimilarEntities', () => {
    beforeEach(async () => {
      // Pre-populate with test data
      for (const node of testNodes) {
        const embedding = generateMockEmbedding(`[${node.type}] ${node.name}`)
        await service.storeNodeEmbedding(testContext, node, embedding)
      }
    })

    it('should return matching entities', async () => {
      const results = await service.findSimilarEntities(
        testContext,
        'Robin',
        { limit: 10 }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toMatchObject({
        nodeId: expect.any(String),
        score: expect.any(Number),
        name: expect.any(String),
        nodeType: expect.any(String),
      })
    })

    it('should respect score threshold', async () => {
      await service.findSimilarEntities(
        testContext,
        'Robin',
        { threshold: 0.90 }
      )

      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          score_threshold: 0.90,
        })
      )
    })

    it('should filter by workspace', async () => {
      await service.findSimilarEntities(testContext, 'Robin')

      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'workspaceId', match: { value: testContext.workspaceId } },
            ]),
          }),
        })
      )
    })

    it('should filter by node type when specified', async () => {
      await service.findSimilarEntities(
        testContext,
        'Robin',
        { nodeType: 'Person' }
      )

      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'nodeType', match: { value: 'Person' } },
            ]),
          }),
        })
      )
    })

    it('should filter by groupId when specified', async () => {
      await service.findSimilarEntities(
        testContext,
        'Robin',
        { groupId: 'wiki-ws-1' }
      )

      expect(mockQdrant.search).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'groupId', match: { value: 'wiki-ws-1' } },
            ]),
          }),
        })
      )
    })

    it('should exclude specified node from results', async () => {
      mockQdrant.search.mockResolvedValue([
        { id: 1, score: 0.95, payload: { nodeId: 'node-1-person-robin', name: 'Robin', nodeType: 'Person', groupId: 'wiki-ws-1' } },
        { id: 2, score: 0.90, payload: { nodeId: 'node-4-person-jan', name: 'Jan', nodeType: 'Person', groupId: 'wiki-ws-1' } },
      ])

      const results = await service.findSimilarEntities(
        testContext,
        'Robin',
        { excludeNodeId: 'node-1-person-robin', limit: 10 }
      )

      // Should exclude the first result
      expect(results.find(r => r.nodeId === 'node-1-person-robin')).toBeUndefined()
    })

    it('should return empty array when not initialized', async () => {
      ;(service as any).initialized = false
      ;(service as any).embeddingDimensions = null
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const results = await service.findSimilarEntities(testContext, 'Robin')

      expect(results).toEqual([])
    })
  })

  // ===========================================================================
  // Exact Name Matching Tests
  // ===========================================================================

  describe('findByNormalizedName', () => {
    it('should find exact matches', async () => {
      // Store a node
      const node = testNodes[0]!
      const embedding = generateMockEmbedding(`[${node.type}] ${node.name}`)
      await service.storeNodeEmbedding(testContext, node, embedding)

      // Mock scroll to return the stored node
      mockQdrant.scroll.mockResolvedValue({
        points: [{
          id: (service as any).generatePointId(node.id),
          payload: {
            nodeId: node.id,
            name: node.name,
            nodeType: node.type,
            groupId: node.groupId,
          },
        }],
      })

      const results = await service.findByNormalizedName(
        testContext,
        'robin waslander'
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.score).toBe(1.0) // Exact match has score 1.0
    })

    it('should normalize name before searching', async () => {
      await service.findByNormalizedName(testContext, 'ROBIN WASLANDER')

      expect(mockQdrant.scroll).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'normalizedName', match: { value: 'robin waslander' } },
            ]),
          }),
        })
      )
    })

    it('should filter by node type', async () => {
      await service.findByNormalizedName(
        testContext,
        'Robin',
        { nodeType: 'Person' }
      )

      expect(mockQdrant.scroll).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              { key: 'nodeType', match: { value: 'Person' } },
            ]),
          }),
        })
      )
    })

    it('should return empty array when not initialized', async () => {
      ;(service as any).initialized = false
      ;(service as any).embeddingDimensions = null
      mockWikiAiService.getEmbeddingInfo.mockResolvedValue({
        available: false,
        dimensions: null,
        model: null,
      })

      const results = await service.findByNormalizedName(testContext, 'Robin')

      expect(results).toEqual([])
    })
  })

  // ===========================================================================
  // Delete Operations Tests
  // ===========================================================================

  describe('deleteNodeEmbedding', () => {
    it('should delete single node embedding', async () => {
      const result = await service.deleteNodeEmbedding('node-1')

      expect(result).toBe(true)
      expect(mockQdrant.delete).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          points: [expect.any(Number)],
        })
      )
    })

    it('should return false on error', async () => {
      mockQdrant.delete.mockRejectedValue(new Error('Delete failed'))

      const result = await service.deleteNodeEmbedding('node-1')

      expect(result).toBe(false)
    })
  })

  describe('deleteWorkspaceEmbeddings', () => {
    it('should delete all embeddings for a workspace', async () => {
      await service.deleteWorkspaceEmbeddings(1)

      expect(mockQdrant.delete).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: {
            must: [{ key: 'workspaceId', match: { value: 1 } }],
          },
        })
      )
    })
  })

  describe('deleteGroupEmbeddings', () => {
    it('should delete all embeddings for a group', async () => {
      await service.deleteGroupEmbeddings('wiki-ws-1')

      expect(mockQdrant.delete).toHaveBeenCalledWith(
        'kanbu_node_embeddings',
        expect.objectContaining({
          filter: {
            must: [{ key: 'groupId', match: { value: 'wiki-ws-1' } }],
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
      // Add some points
      const pointId1 = (service as any).generatePointId('node-1')
      const pointId2 = (service as any).generatePointId('node-2')
      mockQdrant._points.set(pointId1, { id: pointId1, vector: [], payload: {} })
      mockQdrant._points.set(pointId2, { id: pointId2, vector: [], payload: {} })

      const stats = await service.getStats()

      expect(stats.collectionExists).toBe(true)
      expect(stats.totalNodes).toBe(2)
    })

    it('should return zeros when collection does not exist', async () => {
      mockQdrant.getCollections.mockResolvedValue({ collections: [] })

      const stats = await service.getStats()

      expect(stats.collectionExists).toBe(false)
      expect(stats.totalNodes).toBe(0)
    })
  })

  // ===========================================================================
  // Entity Resolution Use Cases
  // ===========================================================================

  describe('Entity Resolution Use Cases', () => {
    beforeEach(async () => {
      // Store test entities
      for (const node of testNodes) {
        const embedding = generateMockEmbedding(`[${node.type}] ${node.name}`)
        await service.storeNodeEmbedding(testContext, node, embedding)
      }
    })

    it('should find "Jan" when searching for "J. Janssen"', async () => {
      mockQdrant.search.mockResolvedValue([
        {
          id: (service as any).generatePointId('node-4-person-jan'),
          score: 0.88,
          payload: {
            nodeId: 'node-4-person-jan',
            name: 'Jan Janssen',
            nodeType: 'Person',
            groupId: 'wiki-ws-1',
          },
        },
      ])

      const results = await service.findSimilarEntities(
        testContext,
        'J. Janssen',
        { nodeType: 'Person', threshold: 0.80 }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.name).toBe('Jan Janssen')
    })

    it('should find "Robin Waslander" with partial name', async () => {
      mockQdrant.search.mockResolvedValue([
        {
          id: (service as any).generatePointId('node-1-person-robin'),
          score: 0.92,
          payload: {
            nodeId: 'node-1-person-robin',
            name: 'Robin Waslander',
            nodeType: 'Person',
            groupId: 'wiki-ws-1',
          },
        },
      ])

      const results = await service.findSimilarEntities(
        testContext,
        'Robin',
        { threshold: 0.85 }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.name).toBe('Robin Waslander')
    })

    it('should find similar concepts', async () => {
      mockQdrant.search.mockResolvedValue([
        {
          id: (service as any).generatePointId('node-2-concept-auth'),
          score: 0.91,
          payload: {
            nodeId: 'node-2-concept-auth',
            name: 'Authentication',
            nodeType: 'Concept',
            groupId: 'wiki-ws-1',
          },
        },
      ])

      const results = await service.findSimilarEntities(
        testContext,
        'Auth',
        { nodeType: 'Concept', threshold: 0.85 }
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0]!.nodeType).toBe('Concept')
    })
  })
})
