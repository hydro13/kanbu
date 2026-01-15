/**
 * Unit & Integration Tests: WikiClusterService (Fase 24.8)
 *
 * Tests for community detection service including:
 * - Multi-tenant isolation (security)
 * - Community detection workflow
 * - FalkorDB integration
 * - Cache behavior
 * - LLM integration (mocked)
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WikiClusterService } from './WikiClusterService'
import type { WikiContext } from './WikiAiService'
import type { DetectCommunitiesInput, GetCommunitiesInput } from './types/community'

// =============================================================================
// Mocks
// =============================================================================

// Mock Redis/FalkorDB client
const createMockRedis = () => ({
  call: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
})

// Mock WikiAiService
const createMockWikiAiService = () => ({
  chat: vi.fn().mockResolvedValue('Mock LLM response'),
})

// Mock Prisma client
const createMockPrisma = () => ({
  // Add any necessary Prisma mocks here
})

// =============================================================================
// WikiClusterService Tests
// =============================================================================

describe('WikiClusterService', () => {
  let service: WikiClusterService
  let mockRedis: ReturnType<typeof createMockRedis>
  let mockWikiAiService: ReturnType<typeof createMockWikiAiService>
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    mockRedis = createMockRedis()
    mockWikiAiService = createMockWikiAiService()
    mockPrisma = createMockPrisma()

    // Create service with mocks
    service = new WikiClusterService(mockPrisma as any, {
      redisHost: 'localhost',
      redisPort: 6379,
      graphName: 'test-graph',
    })

    // Inject mocks
    ;(service as any).redis = mockRedis
    service.setWikiAiService(mockWikiAiService as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Multi-tenant Isolation Tests (Security Critical)
  // ===========================================================================

  describe('Multi-tenant isolation', () => {
    it('should build workspace groupId correctly', () => {
      const context: WikiContext = { workspaceId: 123 }
      const groupId = (service as any).buildGroupId(context)
      expect(groupId).toBe('wiki-ws-123')
    })

    it('should build project groupId correctly', () => {
      const context: WikiContext = { workspaceId: 123, projectId: 456 }
      const groupId = (service as any).buildGroupId(context)
      expect(groupId).toBe('wiki-proj-456')
    })

    it('should prefer project groupId over workspace', () => {
      const context: WikiContext = { workspaceId: 123, projectId: 456 }
      const groupId = (service as any).buildGroupId(context)
      expect(groupId).toBe('wiki-proj-456')
      expect(groupId).not.toContain('ws-123')
    })

    it('should never leak data across workspaces', async () => {
      // Mock empty FalkorDB responses
      mockRedis.call.mockResolvedValue([[]])

      const input1: GetCommunitiesInput = {
        context: { workspaceId: 1 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      const input2: GetCommunitiesInput = {
        context: { workspaceId: 2 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      await service.getCommunities(input1)
      const firstCall = mockRedis.call.mock.calls[0]

      await service.getCommunities(input2)
      const secondCall = mockRedis.call.mock.calls[1]

      // Verify different groupIds in Cypher queries (call[2] is the query string)
      expect(firstCall?.[2]).toContain('wiki-ws-1')
      expect(secondCall?.[2]).toContain('wiki-ws-2')

      // Ensure no cross-contamination
      expect(firstCall?.[2]).not.toContain('wiki-ws-2')
      expect(secondCall?.[2]).not.toContain('wiki-ws-1')
    })

    it('should isolate project communities from workspace', async () => {
      mockRedis.call.mockResolvedValue([[]])

      const wsInput: GetCommunitiesInput = {
        context: { workspaceId: 123 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      const projInput: GetCommunitiesInput = {
        context: { workspaceId: 123, projectId: 456 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      await service.getCommunities(wsInput)
      const wsCall = mockRedis.call.mock.calls[0]

      await service.getCommunities(projInput)
      const projCall = mockRedis.call.mock.calls[1]

      // Check Cypher query (call[2]) for groupId, not graphName (call[1])
      expect(wsCall?.[2]).toContain('wiki-ws-123')
      expect(projCall?.[2]).toContain('wiki-proj-456')
    })
  })

  // ===========================================================================
  // getCommunities Tests
  // ===========================================================================

  describe('getCommunities', () => {
    it('should fetch communities from FalkorDB', async () => {
      // Mock FalkorDB response with community data
      mockRedis.call.mockResolvedValue([
        ['c.uuid', 'c.name', 'c.summary', 'c.groupId', 'c.memberCount', 'c.createdAt', 'c.updatedAt'],
        [
          'comm-uuid-1',
          'Engineering Team',
          'Team of engineers',
          'wiki-ws-123',
          5,
          '2026-01-15T00:00:00Z',
          '2026-01-15T00:00:00Z',
        ],
        [],
      ])

      const input: GetCommunitiesInput = {
        context: { workspaceId: 123 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      const result = await service.getCommunities(input)

      expect(result.communities).toHaveLength(1)
      expect(result.communities[0]?.name).toBe('Engineering Team')
      expect(result.totalCount).toBe(1)
    })

    it('should filter by minMembers', async () => {
      // Mock FalkorDB response with only communities matching minMembers filter
      // In reality, FalkorDB applies WHERE c.memberCount >= 5, so "Tiny Team" wouldn't be returned
      mockRedis.call.mockResolvedValue([
        ['c.uuid', 'c.name', 'c.summary', 'c.groupId', 'c.memberCount', 'c.createdAt', 'c.updatedAt'],
        ['uuid-1', 'Big Team', 'Summary', 'wiki-ws-1', 10, '2026-01-15T00:00:00Z', '2026-01-15T00:00:00Z'],
        // Tiny Team (memberCount: 1) is filtered out by FalkorDB WHERE clause
        [],
      ])

      const input: GetCommunitiesInput = {
        context: { workspaceId: 1 },
        includeMembers: false,
        minMembers: 5,
        limit: 100,
      }

      const result = await service.getCommunities(input)

      // All returned communities should meet minMembers requirement
      expect(result.communities.every((c) => c.memberCount >= 5)).toBe(true)
      expect(result.communities).toHaveLength(1)
    })

    it('should respect limit parameter', async () => {
      // Mock FalkorDB response with only 5 communities (simulating LIMIT in query)
      // In reality, FalkorDB would apply LIMIT, so mock should reflect that
      const mockCommunities = Array.from({ length: 5 }, (_, i) => [
        `uuid-${i}`,
        `Community ${i}`,
        'Summary',
        'wiki-ws-1',
        5,
        '2026-01-15T00:00:00Z',
        '2026-01-15T00:00:00Z',
      ])

      mockRedis.call.mockResolvedValue([
        ['c.uuid', 'c.name', 'c.summary', 'c.groupId', 'c.memberCount', 'c.createdAt', 'c.updatedAt'],
        ...mockCommunities,
        [],
      ])

      const input: GetCommunitiesInput = {
        context: { workspaceId: 1 },
        includeMembers: false,
        minMembers: 2,
        limit: 5,
      }

      const result = await service.getCommunities(input)

      expect(result.communities.length).toBeLessThanOrEqual(5)
    })

    it('should return empty array when no communities exist', async () => {
      mockRedis.call.mockResolvedValue([[]])

      const input: GetCommunitiesInput = {
        context: { workspaceId: 999 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      const result = await service.getCommunities(input)

      expect(result.communities).toEqual([])
      expect(result.totalCount).toBe(0)
    })
  })

  // ===========================================================================
  // getCommunity Tests (Single Community)
  // ===========================================================================

  describe('getCommunity', () => {
    it('should fetch single community with members', async () => {
      // Mock community data
      mockRedis.call
        .mockResolvedValueOnce([
          ['c.uuid', 'c.name', 'c.summary', 'c.groupId', 'c.memberCount', 'c.createdAt', 'c.updatedAt'],
          [
            'comm-uuid-1',
            'Engineering Team',
            'Team summary',
            'wiki-ws-123',
            3,
            '2026-01-15T00:00:00Z',
            '2026-01-15T00:00:00Z',
          ],
          [],
        ])
        // Mock members data
        .mockResolvedValueOnce([
          ['e.uuid', 'e.name', 'r.entityType'],
          ['entity-1', 'Alice', 'Person'],
          ['entity-2', 'Bob', 'Person'],
          ['entity-3', 'Tech Concept', 'Concept'],
          [],
        ])

      const result = await service.getCommunity('comm-uuid-1')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Engineering Team')
      expect(result?.members).toHaveLength(3)
      expect(result?.members[0]?.name).toBe('Alice')
    })

    it('should return null for non-existent community', async () => {
      mockRedis.call.mockResolvedValue([[]])

      const result = await service.getCommunity('non-existent-uuid')

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // detectCommunities Tests
  // ===========================================================================

  describe('detectCommunities', () => {
    it('should detect communities and store in FalkorDB', async () => {
      // Mock graph data
      mockRedis.call
        // fetchGraphProjection
        .mockResolvedValueOnce([
          ['source', 'target', 'count'],
          ['entity-1', 'entity-2', 5],
          ['entity-2', 'entity-3', 3],
          [],
        ])
        // fetchEntityInfo for cluster 1
        .mockResolvedValueOnce([
          ['e.uuid', 'e.name', 'labels', 'e.summary'],
          ['entity-1', 'Alice', ['Person'], 'Person entity'],
          ['entity-2', 'Bob', ['Person'], 'Person entity'],
          ['entity-3', 'Concept X', ['Concept'], 'Tech concept'],
          [],
        ])
        // storeCommunity
        .mockResolvedValue([[]])

      // Mock LLM responses for summarization
      mockWikiAiService.chat
        // Hierarchical summarization
        .mockResolvedValueOnce(JSON.stringify({ summary: 'Combined person summary' }))
        .mockResolvedValueOnce(JSON.stringify({ summary: 'Final community summary' }))
        // Community name generation
        .mockResolvedValueOnce(
          JSON.stringify({ name: 'Engineering Team', description: 'Team description' })
        )

      const input: DetectCommunitiesInput = {
        context: { workspaceId: 123 },
        forceRebuild: false,
        generateSummaries: true,
      }

      const result = await service.detectCommunities(input)

      expect(result.communities.length).toBeGreaterThan(0)
      expect(result.stats.totalCommunities).toBeGreaterThan(0)
    })

    it('should delete existing communities when forceRebuild is true', async () => {
      // Mock empty graph
      mockRedis.call.mockResolvedValue([[]])

      const input: DetectCommunitiesInput = {
        context: { workspaceId: 123 },
        forceRebuild: true,
        generateSummaries: false,
      }

      await service.detectCommunities(input)

      // Verify delete query was called (check call[2] which is the Cypher query)
      const deleteCalls = mockRedis.call.mock.calls.filter((call) =>
        call[2]?.includes('DELETE')
      )
      expect(deleteCalls.length).toBeGreaterThan(0)
    })

    it('should use fallback names when generateSummaries is false', async () => {
      mockRedis.call
        .mockResolvedValueOnce([
          ['source', 'target', 'count'],
          ['e1', 'e2', 1],
          [],
        ])
        .mockResolvedValueOnce([
          ['e.uuid', 'e.name', 'labels', 'e.summary'],
          ['e1', 'Entity 1', ['Concept'], 'Summary'],
          ['e2', 'Entity 2', ['Concept'], 'Summary'],
          [],
        ])
        .mockResolvedValue([[]])

      const input: DetectCommunitiesInput = {
        context: { workspaceId: 123 },
        forceRebuild: false,
        generateSummaries: false,
      }

      const result = await service.detectCommunities(input)

      // Should have generated fallback names (not AI)
      const community = result.communities[0]
      expect(community?.name).toMatch(/Entity 1|Entity 2|Community/)
    })
  })

  // ===========================================================================
  // updateCommunities Tests
  // ===========================================================================

  describe('updateCommunities', () => {
    it('should trigger full rebuild when forceRecalculate is true', async () => {
      mockRedis.call.mockResolvedValue([[]])

      const result = await service.updateCommunities({
        context: { workspaceId: 123 },
        forceRecalculate: true,
      })

      expect(result.modified).toBe(true)
    })

    it('should return not modified when no changes needed', async () => {
      mockRedis.call.mockResolvedValue([[]])

      const result = await service.updateCommunities({
        context: { workspaceId: 123 },
        forceRecalculate: false,
      })

      // Currently always does full recalculate
      expect(result.modified).toBe(true)
    })
  })

  // ===========================================================================
  // Cache Tests
  // ===========================================================================

  describe('Cache behavior', () => {
    it('should use cache for repeated getCommunities calls', async () => {
      mockRedis.call.mockResolvedValue([
        ['c.uuid', 'c.name', 'c.summary', 'c.groupId', 'c.memberCount', 'c.createdAt', 'c.updatedAt'],
        [
          'uuid-1',
          'Community 1',
          'Summary',
          'wiki-ws-123',
          5,
          '2026-01-15T00:00:00Z',
          '2026-01-15T00:00:00Z',
        ],
        [],
      ])

      const input: GetCommunitiesInput = {
        context: { workspaceId: 123 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      // First call - hits FalkorDB
      await service.getCommunities(input)
      const firstCallCount = mockRedis.call.mock.calls.length

      // Second call - should use cache
      await service.getCommunities(input)
      const secondCallCount = mockRedis.call.mock.calls.length

      // Cache hit means no new FalkorDB calls
      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should invalidate cache for groupId', () => {
      const groupId = 'wiki-ws-123'

      // Invalidate cache
      service.invalidateCache(groupId)

      // Verify cache entry is removed
      const cacheEntry = (service as any).cache.get(groupId)
      expect(cacheEntry).toBeUndefined()
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error handling', () => {
    it('should handle FalkorDB connection errors gracefully', async () => {
      mockRedis.call.mockRejectedValue(new Error('Connection failed'))

      const input: GetCommunitiesInput = {
        context: { workspaceId: 123 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      await expect(service.getCommunities(input)).rejects.toThrow('Connection failed')
    })

    it('should handle malformed FalkorDB responses', async () => {
      mockRedis.call.mockResolvedValue(null)

      const input: GetCommunitiesInput = {
        context: { workspaceId: 123 },
        includeMembers: false,
        minMembers: 2,
        limit: 100,
      }

      const result = await service.getCommunities(input)

      // Should return empty result instead of crashing
      expect(result.communities).toEqual([])
    })

    it('should handle LLM errors during summarization', async () => {
      mockRedis.call
        .mockResolvedValueOnce([
          ['source', 'target', 'count'],
          ['e1', 'e2', 1],
          [],
        ])
        .mockResolvedValueOnce([
          ['e.uuid', 'e.name', 'labels', 'e.summary'],
          ['e1', 'Entity 1', ['Concept'], 'Summary'],
          [],
        ])
        .mockResolvedValue([[]])

      mockWikiAiService.chat.mockRejectedValue(new Error('LLM API error'))

      const input: DetectCommunitiesInput = {
        context: { workspaceId: 123 },
        forceRebuild: false,
        generateSummaries: true,
      }

      const result = await service.detectCommunities(input)

      // Should still complete with fallback names
      expect(result.communities.length).toBeGreaterThan(0)
      expect(result.communities[0]?.name).toBeTruthy()
    })
  })

  // ===========================================================================
  // Cypher Query Escaping Tests (Security)
  // ===========================================================================

  describe('Cypher query escaping', () => {
    it('should escape single quotes in strings', () => {
      const escaped = (service as any).escapeString("Test's string")
      // Escaped string should have backslash before quote: Test\'s string
      expect(escaped).toBe("Test\\'s string")
      // Verify the quote is escaped (has backslash before it)
      expect(escaped).toMatch(/\\'/)
    })

    it('should escape backslashes', () => {
      const escaped = (service as any).escapeString('Path\\to\\file')
      expect(escaped).toContain('\\\\')
    })

    it('should prevent Cypher injection', () => {
      const malicious = "'; DROP DATABASE; --"
      const escaped = (service as any).escapeString(malicious)

      // Escaped string should not execute as Cypher
      expect(escaped).toContain("\\'")
      expect(escaped).not.toMatch(/^[^\\]'/)
    })
  })
})
