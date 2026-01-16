/**
 * Unit Tests: Wiki BM25 Search Service (Fase 20.3)
 *
 * Tests for PostgreSQL full-text search:
 * - Query parsing (buildTsQuery)
 * - Workspace wiki search
 * - Project wiki search
 * - Search suggestions (autocomplete)
 * - Error handling
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WikiBm25Service, resetWikiBm25Service } from './WikiBm25Service'

// =============================================================================
// Mock Prisma Client
// =============================================================================

const createMockPrismaClient = () => {
  return {
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  }
}

// =============================================================================
// Test Suite
// =============================================================================

describe('WikiBm25Service', () => {
  let service: WikiBm25Service
  let mockPrisma: ReturnType<typeof createMockPrismaClient>

  beforeEach(() => {
    resetWikiBm25Service()
    mockPrisma = createMockPrismaClient()
    service = new WikiBm25Service(mockPrisma as any)
  })

  // ===========================================================================
  // buildTsQuery Tests
  // ===========================================================================

  describe('buildTsQuery', () => {
    it('should convert simple query to tsquery format', () => {
      const result = service.buildTsQuery('kanban board')
      expect(result).toBe('kanban:* & board:*')
    })

    it('should handle single word', () => {
      const result = service.buildTsQuery('wiki')
      expect(result).toBe('wiki:*')
    })

    it('should escape special characters', () => {
      const result = service.buildTsQuery('foo & bar')
      expect(result).toBe('foo:* & bar:*')
    })

    it('should escape all tsquery operators', () => {
      const result = service.buildTsQuery('test | (query) ! <word>')
      expect(result).toBe('test:* & query:* & word:*')
    })

    it('should handle empty query', () => {
      const result = service.buildTsQuery('')
      expect(result).toBe('')
    })

    it('should handle whitespace-only query', () => {
      const result = service.buildTsQuery('   ')
      expect(result).toBe('')
    })

    it('should handle multiple spaces between words', () => {
      const result = service.buildTsQuery('hello    world')
      expect(result).toBe('hello:* & world:*')
    })

    it('should handle query with only special characters', () => {
      const result = service.buildTsQuery('& | ! ()')
      expect(result).toBe('')
    })

    it('should handle mixed alphanumeric and special chars', () => {
      // Apostrophe is escaped, so "user's" becomes "user" and "s" separate words
      const result = service.buildTsQuery("user's guide (2024)")
      expect(result).toBe('user:* & s:* & guide:* & 2024:*')
    })

    it('should handle numeric queries', () => {
      const result = service.buildTsQuery('123 456')
      expect(result).toBe('123:* & 456:*')
    })
  })

  // ===========================================================================
  // search() Tests
  // ===========================================================================

  describe('search', () => {
    it('should return empty array for empty query', async () => {
      const results = await service.search('', { workspaceId: 1 })
      expect(results).toEqual([])
      expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled()
    })

    it('should return empty array for whitespace query', async () => {
      const results = await service.search('   ', { workspaceId: 1 })
      expect(results).toEqual([])
    })

    it('should throw error if neither workspaceId nor projectId provided', async () => {
      await expect(service.search('test', {})).rejects.toThrow(
        'Either workspaceId or projectId must be provided'
      )
    })

    it('should search workspace wiki pages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 1, title: 'Kanban Guide', slug: 'kanban-guide', rank: 0.5, headline: 'Test <mark>kanban</mark>' },
        { id: 2, title: 'Kanban Tips', slug: 'kanban-tips', rank: 0.3, headline: 'More <mark>kanban</mark>' },
      ])

      const results = await service.search('kanban', { workspaceId: 1 })

      expect(results).toHaveLength(2)
      expect(results[0]!.pageId).toBe(1)
      expect(results[0]!.title).toBe('Kanban Guide')
      expect(results[0]!.source).toBe('workspace')
      expect(results[0]!.headline).toContain('<mark>')
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1)
    })

    it('should search project wiki pages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 10, title: 'Project Docs', slug: 'project-docs', rank: 0.4, headline: 'Test' },
      ])

      const results = await service.search('docs', { projectId: 5 })

      expect(results).toHaveLength(1)
      expect(results[0]!.pageId).toBe(10)
      expect(results[0]!.source).toBe('project')
    })

    it('should search both workspace and project when both provided', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          { id: 1, title: 'WS Page', slug: 'ws-page', rank: 0.5, headline: null },
        ])
        .mockResolvedValueOnce([
          { id: 10, title: 'Proj Page', slug: 'proj-page', rank: 0.6, headline: null },
        ])

      const results = await service.search('test', { workspaceId: 1, projectId: 5 })

      expect(results).toHaveLength(2)
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2)
      // Should be sorted by rank (project result first with 0.6)
      expect(results[0]!.source).toBe('project')
      expect(results[1]!.source).toBe('workspace')
    })

    it('should respect limit parameter', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 1, title: 'Page 1', slug: 'page-1', rank: 0.5, headline: null },
        { id: 2, title: 'Page 2', slug: 'page-2', rank: 0.4, headline: null },
        { id: 3, title: 'Page 3', slug: 'page-3', rank: 0.3, headline: null },
      ])

      const results = await service.search('test', { workspaceId: 1, limit: 2 })

      expect(results).toHaveLength(2)
    })

    it('should filter by minRank', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 1, title: 'High', slug: 'high', rank: 0.5, headline: null },
        { id: 2, title: 'Low', slug: 'low', rank: 0.0001, headline: null },
      ])

      const results = await service.search('test', { workspaceId: 1, minRank: 0.01 })

      expect(results).toHaveLength(1)
      expect(results[0]!.title).toBe('High')
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('DB Error'))

      const results = await service.search('test', { workspaceId: 1 })

      expect(results).toEqual([])
    })

    it('should pass correct language to tsquery', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([])

      await service.search('test', { workspaceId: 1, language: 'dutch' })

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'dutch',
        'test:*',
        1,
        expect.any(Number)
      )
    })
  })

  // ===========================================================================
  // getSuggestions() Tests
  // ===========================================================================

  describe('getSuggestions', () => {
    it('should return empty array for short prefix', async () => {
      const results = await service.getSuggestions('a', 1)
      expect(results).toEqual([])
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled()
    })

    it('should return empty array for empty prefix', async () => {
      const results = await service.getSuggestions('', 1)
      expect(results).toEqual([])
    })

    it('should return suggestions for valid prefix', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { word: 'kanban' },
        { word: 'kanbu' },
      ])

      const results = await service.getSuggestions('kan', 1)

      expect(results).toEqual(['kanban', 'kanbu'])
    })

    it('should filter out single character words', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { word: 'a' },
        { word: 'kanban' },
      ])

      const results = await service.getSuggestions('ka', 1)

      expect(results).toEqual(['kanban'])
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Error'))

      const results = await service.getSuggestions('test', 1)

      expect(results).toEqual([])
    })
  })

  // ===========================================================================
  // isSearchAvailable() Tests
  // ===========================================================================

  describe('isSearchAvailable', () => {
    it('should return true when pages have search_vector', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(5) }])

      const result = await service.isSearchAvailable(1)

      expect(result).toBe(true)
    })

    it('should return false when no pages have search_vector', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(0) }])

      const result = await service.isSearchAvailable(1)

      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB Error'))

      const result = await service.isSearchAvailable(1)

      expect(result).toBe(false)
    })
  })
})
