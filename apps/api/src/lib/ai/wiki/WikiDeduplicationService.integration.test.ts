/**
 * Integration Tests: WikiDeduplicationService (Fase 22)
 *
 * End-to-end tests for the complete entity deduplication flow:
 * - Exact matching (case-insensitive)
 * - Fuzzy matching (MinHash/LSH + Jaccard)
 * - Embedding matching (vector similarity)
 * - LLM matching (AI resolution)
 * - Edge creation verification
 * - Statistics correctness
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  WikiDeduplicationService,
} from './WikiDeduplicationService'
import type {
  EntityNodeInfo,
  DeduplicationOptions,
  DuplicateCandidate,
} from './types'
import type { WikiAiService, WikiContext } from './WikiAiService'
import type { WikiNodeEmbeddingService } from './WikiNodeEmbeddingService'

// ===========================================================================
// Mock Factories
// ===========================================================================

/**
 * Create a mock WikiNodeEmbeddingService
 */
function createMockNodeEmbeddingService(
  similarityMap: Map<string, Map<string, number>> = new Map()
): Partial<WikiNodeEmbeddingService> {
  return {
    findSimilarNodes: vi.fn().mockImplementation(
      async (_node: EntityNodeInfo, nodes: EntityNodeInfo[], _context: WikiContext, _threshold: number) => {
        // Return empty by default, override with similarityMap for specific tests
        const results: Array<{ node: EntityNodeInfo; similarity: number }> = []
        return results
      }
    ),
  }
}

/**
 * Create a mock WikiAiService with predefined LLM responses
 */
function createMockWikiAiService(
  duplicateResponses: Map<string, string[]> = new Map()
): Partial<WikiAiService> {
  return {
    detectNodeDuplicates: vi.fn().mockImplementation(
      async (nodes: EntityNodeInfo[], _existingNodes: EntityNodeInfo[], _episodeContent?: string) => {
        // Return predefined duplicates for testing
        const duplicateUuids: string[] = []

        for (const node of nodes) {
          const duplicates = duplicateResponses.get(node.uuid) || []
          duplicateUuids.push(...duplicates)
        }

        return { duplicateUuids }
      }
    ),
  }
}

// ===========================================================================
// Test Data Factory
// ===========================================================================

function createTestNode(
  uuid: string,
  name: string,
  type: 'Concept' | 'Person' | 'Task' | 'Project' = 'Concept',
  groupId = 'wiki-ws-1'
): EntityNodeInfo {
  return { uuid, name, type, groupId }
}

// ===========================================================================
// Integration Tests
// ===========================================================================

describe('WikiDeduplicationService Integration', () => {
  let service: WikiDeduplicationService

  beforeEach(() => {
    service = new WikiDeduplicationService()
  })

  // =========================================================================
  // Flow: Exact Match Resolution
  // =========================================================================

  describe('exact match flow', () => {
    it('should resolve exact duplicates (case insensitive)', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Machine Learning'),
        createTestNode('new-2', 'Deep Learning'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'machine learning'), // Exact match (lowercase)
        createTestNode('existing-2', 'Neural Networks'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: false,
        useLlm: false,
      }

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should find 1 exact match
      expect(result.duplicatePairs).toHaveLength(1)
      expect(result.duplicatePairs[0].matchType).toBe('exact')
      expect(result.duplicatePairs[0].sourceNode.name).toBe('Machine Learning')
      expect(result.duplicatePairs[0].targetNode.name).toBe('machine learning')
      expect(result.duplicatePairs[0].confidence).toBe(1.0)

      // Stats should reflect exact match
      expect(result.stats.exactMatches).toBe(1)
      expect(result.stats.fuzzyMatches).toBe(0)
      expect(result.stats.embeddingMatches).toBe(0)
      expect(result.stats.llmMatches).toBe(0)
    })

    it('should handle whitespace variations', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Natural  Language   Processing'), // Multiple spaces
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'Natural Language Processing'), // Single spaces
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: false,
        useLlm: false,
      }

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should normalize whitespace and find match
      expect(result.duplicatePairs).toHaveLength(1)
      expect(result.duplicatePairs[0].matchType).toBe('exact')
    })
  })

  // =========================================================================
  // Flow: Fuzzy Match Resolution
  // =========================================================================

  describe('fuzzy match flow', () => {
    it('should resolve near-duplicates with fuzzy matching', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Project Management Tool'),
        createTestNode('new-2', 'User Authentication System'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'Project Management Tools'), // Slight variation
        createTestNode('existing-2', 'Data Storage'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        threshold: 0.7, // Lower threshold for fuzzy
        useFuzzy: true,
        useEmbeddings: false,
        useLlm: false,
      }

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should find fuzzy match for Project Management
      const fuzzyMatches = result.duplicatePairs.filter(p => p.matchType === 'fuzzy')
      expect(fuzzyMatches.length).toBeGreaterThanOrEqual(1)
      expect(fuzzyMatches[0].confidence).toBeGreaterThan(0.7)
    })

    it('should skip low-entropy names in fuzzy matching', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'API'), // Short, low entropy
        createTestNode('new-2', 'XX'),  // Very short
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'api'),
        createTestNode('existing-2', 'xx'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: true,
        useEmbeddings: false,
        useLlm: false,
      }

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should still find exact matches but not fuzzy (low entropy)
      const fuzzyMatches = result.duplicatePairs.filter(p => p.matchType === 'fuzzy')
      expect(fuzzyMatches).toHaveLength(0)
    })
  })

  // =========================================================================
  // Flow: Embedding Match Resolution
  // =========================================================================

  describe('embedding match flow', () => {
    it('should resolve semantic duplicates via embeddings', async () => {
      // Create mock that returns high similarity for specific pairs
      const mockEmbeddingService = {
        findSimilarNodes: vi.fn().mockImplementation(
          async (node: EntityNodeInfo, nodes: EntityNodeInfo[]) => {
            // Return semantic match for "Artificial Intelligence" -> "AI Systems"
            if (node.name === 'Artificial Intelligence') {
              const match = nodes.find(n => n.name === 'AI Systems')
              if (match) {
                return [{ node: match, similarity: 0.92 }]
              }
            }
            return []
          }
        ),
      }

      const serviceWithEmbeddings = new WikiDeduplicationService(
        mockEmbeddingService as unknown as WikiNodeEmbeddingService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Artificial Intelligence'),
        createTestNode('new-2', 'Database Design'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'AI Systems'), // Semantic match
        createTestNode('existing-2', 'Web Development'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: true,
        useLlm: false,
        embeddingThreshold: 0.85,
      }

      const result = await serviceWithEmbeddings.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should find embedding match
      const embeddingMatches = result.duplicatePairs.filter(p => p.matchType === 'embedding')
      expect(embeddingMatches).toHaveLength(1)
      expect(embeddingMatches[0].sourceNode.name).toBe('Artificial Intelligence')
      expect(embeddingMatches[0].targetNode.name).toBe('AI Systems')
      expect(embeddingMatches[0].confidence).toBe(0.92)

      expect(result.stats.embeddingMatches).toBe(1)
    })

    it('should skip nodes below embedding threshold', async () => {
      const mockEmbeddingService = {
        findSimilarNodes: vi.fn().mockImplementation(
          async (node: EntityNodeInfo, nodes: EntityNodeInfo[]) => {
            // Return low similarity
            if (node.name === 'Frontend Framework') {
              const match = nodes.find(n => n.name === 'Backend System')
              if (match) {
                return [{ node: match, similarity: 0.5 }] // Below threshold
              }
            }
            return []
          }
        ),
      }

      const serviceWithEmbeddings = new WikiDeduplicationService(
        mockEmbeddingService as unknown as WikiNodeEmbeddingService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Frontend Framework'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'Backend System'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: true,
        useLlm: false,
        embeddingThreshold: 0.85, // High threshold
      }

      const result = await serviceWithEmbeddings.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should not find match (below threshold)
      expect(result.duplicatePairs).toHaveLength(0)
      expect(result.stats.embeddingMatches).toBe(0)
    })
  })

  // =========================================================================
  // Flow: LLM Match Resolution
  // =========================================================================

  describe('LLM match flow', () => {
    it('should resolve complex duplicates via LLM', async () => {
      // Mock LLM service that recognizes abbreviations
      const mockAiService = {
        detectNodeDuplicates: vi.fn().mockResolvedValue({
          duplicateUuids: ['existing-1'], // LLM identifies match
        }),
      }

      const serviceWithLlm = new WikiDeduplicationService(
        undefined,
        mockAiService as unknown as WikiAiService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Natural Language Processing'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'NLP'), // Abbreviation
        createTestNode('existing-2', 'Machine Learning'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: false,
        useLlm: true,
      }

      const result = await serviceWithLlm.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options,
        'Content about NLP techniques' // Episode content for context
      )

      // Should find LLM match
      const llmMatches = result.duplicatePairs.filter(p => p.matchType === 'llm')
      expect(llmMatches).toHaveLength(1)
      expect(llmMatches[0].sourceNode.name).toBe('Natural Language Processing')
      expect(llmMatches[0].targetNode.name).toBe('NLP')
      expect(llmMatches[0].confidence).toBe(0.85) // Default LLM confidence

      expect(result.stats.llmMatches).toBe(1)
    })

    it('should skip LLM when useLlm is false', async () => {
      const mockAiService = {
        detectNodeDuplicates: vi.fn(),
      }

      const serviceWithLlm = new WikiDeduplicationService(
        undefined,
        mockAiService as unknown as WikiAiService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Natural Language Processing'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'NLP'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: false,
        useLlm: false, // Disabled
      }

      const result = await serviceWithLlm.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // LLM should not be called
      expect(mockAiService.detectNodeDuplicates).not.toHaveBeenCalled()
      expect(result.stats.llmMatches).toBe(0)
    })
  })

  // =========================================================================
  // Flow: Complete Pipeline (All Methods)
  // =========================================================================

  describe('complete pipeline flow', () => {
    it('should try methods in order: exact -> fuzzy -> embedding -> LLM', async () => {
      const mockEmbeddingService = {
        findSimilarNodes: vi.fn().mockResolvedValue([]),
      }

      const mockAiService = {
        detectNodeDuplicates: vi.fn().mockResolvedValue({
          duplicateUuids: ['existing-3'],
        }),
      }

      const serviceWithAll = new WikiDeduplicationService(
        mockEmbeddingService as unknown as WikiNodeEmbeddingService,
        mockAiService as unknown as WikiAiService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Machine Learning'),           // Exact match
        createTestNode('new-2', 'Data Science Framework'),     // Fuzzy match
        createTestNode('new-3', 'Computer Vision Systems'),    // Will go to LLM
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'machine learning'),        // Exact for new-1
        createTestNode('existing-2', 'Data Science Frameworks'), // Fuzzy for new-2
        createTestNode('existing-3', 'CV Systems'),              // LLM for new-3
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        threshold: 0.7,
        useFuzzy: true,
        useEmbeddings: true,
        useLlm: true,
      }

      const result = await serviceWithAll.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Should have matches from different methods
      expect(result.duplicatePairs.length).toBeGreaterThanOrEqual(1)

      // Verify exact match was found first
      const exactMatches = result.duplicatePairs.filter(p => p.matchType === 'exact')
      expect(exactMatches).toHaveLength(1)
      expect(exactMatches[0].sourceNode.name).toBe('Machine Learning')
    })

    it('should not re-process already resolved nodes', async () => {
      const mockEmbeddingService = {
        findSimilarNodes: vi.fn().mockResolvedValue([]),
      }

      const serviceWithEmbedding = new WikiDeduplicationService(
        mockEmbeddingService as unknown as WikiNodeEmbeddingService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Machine Learning'), // Exact match
        createTestNode('new-2', 'Deep Learning'),    // No exact match
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'machine learning'),
        createTestNode('existing-2', 'Neural Networks'),
      ]

      const options: DeduplicationOptions = {
        workspaceId: 1,
        useFuzzy: false,
        useEmbeddings: true,
        useLlm: false,
      }

      await serviceWithEmbedding.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        options
      )

      // Embedding should only be called for unresolved node (new-2)
      expect(mockEmbeddingService.findSimilarNodes).toHaveBeenCalledTimes(1)
      expect(mockEmbeddingService.findSimilarNodes).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: 'new-2' }),
        expect.any(Array),
        expect.any(Object),
        expect.any(Number)
      )
    })
  })

  // =========================================================================
  // Flow: Workspace Duplicate Detection
  // =========================================================================

  describe('workspace duplicate detection flow', () => {
    it('should find all duplicates in workspace', async () => {
      const nodes: EntityNodeInfo[] = [
        createTestNode('node-1', 'Machine Learning'),
        createTestNode('node-2', 'machine learning'),       // Duplicate of 1
        createTestNode('node-3', 'Deep Learning'),
        createTestNode('node-4', 'Deep Learning System'),   // Similar to 3
        createTestNode('node-5', 'Web Development'),
      ]

      const duplicates = await service.findDuplicatesInWorkspace(
        nodes,
        { threshold: 0.7, limit: 50 }
      )

      // Should find at least the exact match
      expect(duplicates.length).toBeGreaterThanOrEqual(1)

      // Check that we found the exact match
      const exactMatch = duplicates.find(
        d => d.matchType === 'exact' &&
        ((d.sourceNode.uuid === 'node-1' && d.targetNode.uuid === 'node-2') ||
         (d.sourceNode.uuid === 'node-2' && d.targetNode.uuid === 'node-1'))
      )
      expect(exactMatch).toBeDefined()
      expect(exactMatch?.confidence).toBe(1.0)
    })

    it('should respect limit parameter', async () => {
      // Create many potential duplicates
      const nodes: EntityNodeInfo[] = []
      for (let i = 0; i < 20; i++) {
        nodes.push(createTestNode(`node-${i}`, `Concept Number ${i}`))
        nodes.push(createTestNode(`node-${i}-dup`, `concept number ${i}`))
      }

      const duplicates = await service.findDuplicatesInWorkspace(
        nodes,
        { threshold: 0.5, limit: 5 }
      )

      expect(duplicates.length).toBeLessThanOrEqual(5)
    })

    it('should avoid duplicate pairs (A->B and B->A)', async () => {
      const nodes: EntityNodeInfo[] = [
        createTestNode('node-1', 'Machine Learning'),
        createTestNode('node-2', 'machine learning'),
      ]

      const duplicates = await service.findDuplicatesInWorkspace(
        nodes,
        { threshold: 0.85 }
      )

      // Should only have one pair, not both directions
      expect(duplicates).toHaveLength(1)
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('edge cases', () => {
    it('should handle empty extracted nodes', async () => {
      const result = await service.resolveExtractedNodes(
        [],
        [createTestNode('existing-1', 'Test')],
        { workspaceId: 1 }
      )

      expect(result.duplicatePairs).toHaveLength(0)
      expect(result.stats.extractedCount).toBe(0)
    })

    it('should handle empty existing nodes', async () => {
      const result = await service.resolveExtractedNodes(
        [createTestNode('new-1', 'Test')],
        [],
        { workspaceId: 1 }
      )

      expect(result.duplicatePairs).toHaveLength(0)
      expect(result.stats.existingCount).toBe(0)
    })

    it('should handle nodes with special characters', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'C++ Programming'),
        createTestNode('new-2', 'Node.js Framework'),
        createTestNode('new-3', "O'Reilly Books"),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'c++ programming'),
        createTestNode('existing-2', 'node.js framework'),
        createTestNode('existing-3', "o'reilly books"),
      ]

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        { workspaceId: 1, useFuzzy: false, useEmbeddings: false, useLlm: false }
      )

      // Should find all exact matches
      expect(result.duplicatePairs).toHaveLength(3)
    })

    it('should handle unicode characters', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Café Culture'),
        createTestNode('new-2', '日本語処理'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'café culture'),
        createTestNode('existing-2', '日本語処理'),
      ]

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        { workspaceId: 1, useFuzzy: false, useEmbeddings: false, useLlm: false }
      )

      // Should find matches (lowercase handling)
      expect(result.duplicatePairs).toHaveLength(2)
    })

    it('should handle nodes with same name but different types', async () => {
      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Testing', 'Concept'),
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'testing', 'Task'), // Same name, different type
      ]

      const result = await service.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        { workspaceId: 1, useFuzzy: false, useEmbeddings: false, useLlm: false }
      )

      // Should still find exact match (type doesn't matter for matching)
      expect(result.duplicatePairs).toHaveLength(1)
    })
  })

  // =========================================================================
  // Statistics Verification
  // =========================================================================

  describe('statistics correctness', () => {
    it('should correctly count all statistics', async () => {
      const mockEmbeddingService = {
        findSimilarNodes: vi.fn().mockImplementation(
          async (node: EntityNodeInfo, nodes: EntityNodeInfo[]) => {
            if (node.uuid === 'new-3') {
              const match = nodes.find(n => n.uuid === 'existing-3')
              if (match) {
                return [{ node: match, similarity: 0.91 }]
              }
            }
            return []
          }
        ),
      }

      const mockAiService = {
        detectNodeDuplicates: vi.fn().mockResolvedValue({
          duplicateUuids: ['existing-4'],
        }),
      }

      const serviceWithAll = new WikiDeduplicationService(
        mockEmbeddingService as unknown as WikiNodeEmbeddingService,
        mockAiService as unknown as WikiAiService
      )

      const extractedNodes: EntityNodeInfo[] = [
        createTestNode('new-1', 'Machine Learning'),             // Exact
        createTestNode('new-2', 'Data Science Framework'),       // Fuzzy
        createTestNode('new-3', 'Artificial Intelligence'),      // Embedding
        createTestNode('new-4', 'Natural Language Processing'),  // LLM
        createTestNode('new-5', 'Quantum Computing'),            // No match
      ]

      const existingNodes: EntityNodeInfo[] = [
        createTestNode('existing-1', 'machine learning'),
        createTestNode('existing-2', 'Data Science Frameworks'),
        createTestNode('existing-3', 'AI'),
        createTestNode('existing-4', 'NLP'),
        createTestNode('existing-5', 'Web Development'),
      ]

      const result = await serviceWithAll.resolveExtractedNodes(
        extractedNodes,
        existingNodes,
        {
          workspaceId: 1,
          threshold: 0.7,
          useFuzzy: true,
          useEmbeddings: true,
          useLlm: true,
        }
      )

      // Verify statistics
      expect(result.stats.extractedCount).toBe(5)
      expect(result.stats.existingCount).toBe(5)
      expect(result.stats.exactMatches).toBeGreaterThanOrEqual(1)

      // Total matches should be consistent
      const totalMatches = result.stats.exactMatches +
                          result.stats.fuzzyMatches +
                          result.stats.embeddingMatches +
                          result.stats.llmMatches

      expect(result.duplicatePairs).toHaveLength(totalMatches)
    })
  })
})
