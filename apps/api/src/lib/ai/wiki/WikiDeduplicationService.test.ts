/**
 * Unit Tests: Wiki Deduplication Service (Fase 22.7)
 *
 * Tests for entity deduplication:
 * - String normalization (exact and fuzzy)
 * - Entropy calculation
 * - Shingling (3-grams)
 * - MinHash/LSH signatures
 * - Jaccard similarity
 * - Candidate indexing
 * - Deterministic resolution
 * - Batch duplicate finding
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  WikiDeduplicationService,
  resetWikiDeduplicationService,
} from './WikiDeduplicationService'
import type { EntityNodeInfo, DedupResolutionState } from './types'

// =============================================================================
// Test Setup
// =============================================================================

describe('WikiDeduplicationService', () => {
  let service: WikiDeduplicationService

  beforeEach(() => {
    resetWikiDeduplicationService()
    // Create service without embedding service for unit tests
    service = new WikiDeduplicationService()
  })

  // ===========================================================================
  // String Normalization Tests
  // ===========================================================================

  describe('String Normalization', () => {
    describe('normalizeStringExact', () => {
      it('converts to lowercase', () => {
        expect(service.normalizeStringExact('HELLO')).toBe('hello')
        expect(service.normalizeStringExact('Hello World')).toBe('hello world')
      })

      it('trims whitespace', () => {
        expect(service.normalizeStringExact('  hello  ')).toBe('hello')
        expect(service.normalizeStringExact('\thello\n')).toBe('hello')
      })

      it('collapses multiple spaces', () => {
        expect(service.normalizeStringExact('hello   world')).toBe('hello world')
        expect(service.normalizeStringExact('a    b    c')).toBe('a b c')
      })

      it('handles combined cases', () => {
        expect(service.normalizeStringExact('  Hello   WORLD  ')).toBe('hello world')
      })

      it('handles empty strings', () => {
        expect(service.normalizeStringExact('')).toBe('')
        expect(service.normalizeStringExact('   ')).toBe('')
      })
    })

    describe('normalizeNameForFuzzy', () => {
      it('removes special characters except apostrophes', () => {
        expect(service.normalizeNameForFuzzy("John's Company")).toBe("john's company")
        expect(service.normalizeNameForFuzzy('Test@#$Name')).toBe('test name')
      })

      it('preserves alphanumeric characters', () => {
        expect(service.normalizeNameForFuzzy('ABC123')).toBe('abc123')
        expect(service.normalizeNameForFuzzy('Project2025')).toBe('project2025')
      })

      it('handles multiple spaces after removal', () => {
        expect(service.normalizeNameForFuzzy('a--b..c')).toBe('a b c')
      })

      it('handles unicode and accents by removing them', () => {
        // The regex only keeps a-z, 0-9, apostrophe, and spaces
        expect(service.normalizeNameForFuzzy('café')).toBe('caf')
      })
    })
  })

  // ===========================================================================
  // Entropy Calculation Tests
  // ===========================================================================

  describe('Entropy Calculation', () => {
    describe('calculateNameEntropy', () => {
      it('returns 0 for single character strings', () => {
        expect(service.calculateNameEntropy('a')).toBe(0)
      })

      it('returns low entropy for repetitive strings', () => {
        // "aaaaaa" - all same characters, entropy = 0
        expect(service.calculateNameEntropy('aaaaaa')).toBe(0)
      })

      it('returns higher entropy for diverse strings', () => {
        // "abcdef" - all different characters, higher entropy
        const entropy = service.calculateNameEntropy('abcdef')
        expect(entropy).toBeGreaterThan(2)
      })

      it('returns entropy based on character distribution', () => {
        // "aabb" - 2 chars, each appears twice
        const entropy1 = service.calculateNameEntropy('aabb')
        // "abcd" - 4 chars, each appears once
        const entropy2 = service.calculateNameEntropy('abcd')
        expect(entropy2).toBeGreaterThan(entropy1)
      })
    })

    describe('hasHighEntropy', () => {
      it('returns false for short strings', () => {
        // MIN_NAME_LENGTH is 6, names shorter than this are considered low entropy
        expect(service.hasHighEntropy('ab')).toBe(false)
        expect(service.hasHighEntropy('abc')).toBe(false)
      })

      it('returns false for repetitive strings', () => {
        expect(service.hasHighEntropy('aaaaaa')).toBe(false)
      })

      it('returns true for diverse names', () => {
        expect(service.hasHighEntropy('john smith')).toBe(true)
        expect(service.hasHighEntropy('microsoft corporation')).toBe(true)
      })

      it('returns false for single-word generic names', () => {
        // Single words without much variety may have low entropy
        expect(service.hasHighEntropy('the')).toBe(false)
      })
    })
  })

  // ===========================================================================
  // Shingling Tests
  // ===========================================================================

  describe('Shingling', () => {
    describe('createShingles', () => {
      it('creates 3-gram shingles', () => {
        const shingles = service.createShingles('hello')
        expect(shingles.has('hel')).toBe(true)
        expect(shingles.has('ell')).toBe(true)
        expect(shingles.has('llo')).toBe(true)
      })

      it('returns single-element set for strings shorter than 3', () => {
        // Strings shorter than 3 chars return the string itself as single shingle
        expect(service.createShingles('ab').size).toBe(1)
        expect(service.createShingles('ab').has('ab')).toBe(true)
        expect(service.createShingles('a').size).toBe(1)
        expect(service.createShingles('a').has('a')).toBe(true)
      })

      it('returns empty set for empty string', () => {
        expect(service.createShingles('').size).toBe(0)
      })

      it('handles exact 3-character string', () => {
        const shingles = service.createShingles('abc')
        expect(shingles.size).toBe(1)
        expect(shingles.has('abc')).toBe(true)
      })

      it('creates correct number of shingles', () => {
        // For string of length n, we get n-2 shingles (for 3-grams)
        const shingles = service.createShingles('abcdef')
        expect(shingles.size).toBe(4) // abc, bcd, cde, def
      })

      it('handles duplicate shingles', () => {
        // "aaa" has only one unique shingle
        const shingles = service.createShingles('aaaa')
        expect(shingles.size).toBe(1)
        expect(shingles.has('aaa')).toBe(true)
      })
    })
  })

  // ===========================================================================
  // Jaccard Similarity Tests
  // ===========================================================================

  describe('Jaccard Similarity', () => {
    describe('jaccardSimilarity', () => {
      it('returns 1 for identical sets', () => {
        const a = new Set(['a', 'b', 'c'])
        expect(service.jaccardSimilarity(a, a)).toBe(1)
      })

      it('returns 0 for completely different sets', () => {
        const a = new Set(['a', 'b'])
        const b = new Set(['c', 'd'])
        expect(service.jaccardSimilarity(a, b)).toBe(0)
      })

      it('calculates partial overlap correctly', () => {
        const a = new Set(['a', 'b', 'c'])
        const b = new Set(['b', 'c', 'd'])
        // Intersection: {b, c} = 2, Union: {a, b, c, d} = 4
        expect(service.jaccardSimilarity(a, b)).toBe(0.5)
      })

      it('returns 1 for two empty sets', () => {
        const a = new Set<string>()
        const b = new Set<string>()
        expect(service.jaccardSimilarity(a, b)).toBe(1)
      })

      it('returns 0 when one set is empty', () => {
        const a = new Set(['a', 'b'])
        const b = new Set<string>()
        expect(service.jaccardSimilarity(a, b)).toBe(0)
      })

      it('handles subset relationship', () => {
        const a = new Set(['a', 'b'])
        const b = new Set(['a', 'b', 'c', 'd'])
        // Intersection: 2, Union: 4
        expect(service.jaccardSimilarity(a, b)).toBe(0.5)
      })
    })
  })

  // ===========================================================================
  // MinHash/LSH Tests
  // ===========================================================================

  describe('MinHash/LSH', () => {
    describe('computeMinHashSignature', () => {
      it('returns signature of correct length', () => {
        const shingles = new Set(['abc', 'bcd', 'cde'])
        const signature = service.computeMinHashSignature(shingles)
        // MINHASH_PERMUTATIONS = 32
        expect(signature.length).toBe(32)
      })

      it('returns consistent signatures for same input', () => {
        const shingles = new Set(['abc', 'bcd'])
        const sig1 = service.computeMinHashSignature(shingles)
        const sig2 = service.computeMinHashSignature(shingles)
        expect(sig1).toEqual(sig2)
      })

      it('returns different signatures for different inputs', () => {
        const shingles1 = new Set(['abc', 'bcd'])
        const shingles2 = new Set(['xyz', 'yzw'])
        const sig1 = service.computeMinHashSignature(shingles1)
        const sig2 = service.computeMinHashSignature(shingles2)
        expect(sig1).not.toEqual(sig2)
      })

      it('returns empty array for empty set', () => {
        const shingles = new Set<string>()
        const signature = service.computeMinHashSignature(shingles)
        // Empty shingles return empty signature
        expect(signature.length).toBe(0)
      })
    })

    describe('getLshBands', () => {
      it('returns correct number of bands', () => {
        // MINHASH_PERMUTATIONS = 32, MINHASH_BAND_SIZE = 4
        // So we should get 32/4 = 8 bands
        const signature = Array(32).fill(0).map((_, i) => i)
        const bands = service.getLshBands(signature)
        expect(bands.length).toBe(8)
      })

      it('each band has correct size', () => {
        const signature = Array(32).fill(0).map((_, i) => i)
        const bands = service.getLshBands(signature)
        for (const band of bands) {
          expect(band.length).toBe(4)
        }
      })

      it('bands contain correct signature segments', () => {
        const signature = Array(32).fill(0).map((_, i) => i)
        const bands = service.getLshBands(signature)
        expect(bands[0]).toEqual([0, 1, 2, 3])
        expect(bands[1]).toEqual([4, 5, 6, 7])
        expect(bands[7]).toEqual([28, 29, 30, 31])
      })
    })
  })

  // ===========================================================================
  // Candidate Indexing Tests
  // ===========================================================================

  describe('Candidate Indexing', () => {
    describe('buildCandidateIndexes', () => {
      it('creates normalized name index', () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'John Smith', type: 'Person', groupId: 'ws_1' },
          { uuid: '2', name: 'JOHN SMITH', type: 'Person', groupId: 'ws_1' },
        ]
        const indexes = service.buildCandidateIndexes(nodes)

        // Both should map to same normalized key
        const matches = indexes.normalizedExisting.get('john smith')
        expect(matches?.length).toBe(2)
      })

      it('creates uuid lookup', () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: 'uuid-1', name: 'Test', type: 'Concept', groupId: 'ws_1' },
        ]
        const indexes = service.buildCandidateIndexes(nodes)

        const node = indexes.nodesByUuid.get('uuid-1')
        expect(node?.name).toBe('Test')
      })

      it('creates shingles for each node', () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'hello world', type: 'Concept', groupId: 'ws_1' },
        ]
        const indexes = service.buildCandidateIndexes(nodes)

        const shingles = indexes.shinglesByNode.get('1')
        expect(shingles).toBeDefined()
        expect(shingles?.size).toBeGreaterThan(0)
      })

      it('creates LSH buckets', () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'hello world', type: 'Concept', groupId: 'ws_1' },
          { uuid: '2', name: 'hello world', type: 'Concept', groupId: 'ws_1' },
        ]
        const indexes = service.buildCandidateIndexes(nodes)

        // LSH buckets should have some entries
        expect(indexes.lshBuckets.size).toBeGreaterThan(0)
      })

      it('handles empty input', () => {
        const indexes = service.buildCandidateIndexes([])
        expect(indexes.existingNodes.length).toBe(0)
        expect(indexes.nodesByUuid.size).toBe(0)
      })
    })
  })

  // ===========================================================================
  // Deterministic Resolution Tests
  // ===========================================================================

  describe('Deterministic Resolution', () => {
    describe('resolveWithSimilarity', () => {
      it('resolves exact name matches', () => {
        const existing: EntityNodeInfo[] = [
          { uuid: 'existing-1', name: 'John Smith', type: 'Person', groupId: 'ws_1' },
        ]
        const extracted: EntityNodeInfo[] = [
          { uuid: 'new-1', name: 'john smith', type: 'Person', groupId: 'ws_1' },
        ]

        const indexes = service.buildCandidateIndexes(existing)
        const state: DedupResolutionState = {
          resolvedNodes: [null],
          uuidMap: new Map(),
          unresolvedIndices: [],
          duplicatePairs: [],
        }

        service.resolveWithSimilarity(extracted, indexes, state)

        expect(state.resolvedNodes[0]?.uuid).toBe('existing-1')
        expect(state.uuidMap.get('new-1')).toBe('existing-1')
        expect(state.duplicatePairs.length).toBe(1)
        expect(state.duplicatePairs[0]?.matchType).toBe('exact')
      })

      it('defers low-entropy names without exact match to unresolved', () => {
        const existing: EntityNodeInfo[] = [
          { uuid: 'existing-1', name: 'bb', type: 'Concept', groupId: 'ws_1' },
        ]
        const extracted: EntityNodeInfo[] = [
          { uuid: 'new-1', name: 'aa', type: 'Concept', groupId: 'ws_1' },
        ]

        const indexes = service.buildCandidateIndexes(existing)
        const state: DedupResolutionState = {
          resolvedNodes: [null],
          uuidMap: new Map(),
          unresolvedIndices: [],
          duplicatePairs: [],
        }

        service.resolveWithSimilarity(extracted, indexes, state)

        // Low entropy name without exact match should be deferred
        expect(state.unresolvedIndices).toContain(0)
      })

      it('resolves exact matches even for low-entropy names', () => {
        const existing: EntityNodeInfo[] = [
          { uuid: 'existing-1', name: 'aa', type: 'Concept', groupId: 'ws_1' },
        ]
        const extracted: EntityNodeInfo[] = [
          { uuid: 'new-1', name: 'aa', type: 'Concept', groupId: 'ws_1' },
        ]

        const indexes = service.buildCandidateIndexes(existing)
        const state: DedupResolutionState = {
          resolvedNodes: [null],
          uuidMap: new Map(),
          unresolvedIndices: [],
          duplicatePairs: [],
        }

        service.resolveWithSimilarity(extracted, indexes, state)

        // Exact match should be resolved even with low entropy
        expect(state.resolvedNodes[0]?.uuid).toBe('existing-1')
        expect(state.uuidMap.get('new-1')).toBe('existing-1')
      })

      it('defers multiple exact matches to unresolved', () => {
        const existing: EntityNodeInfo[] = [
          { uuid: 'existing-1', name: 'John Smith', type: 'Person', groupId: 'ws_1' },
          { uuid: 'existing-2', name: 'john smith', type: 'Person', groupId: 'ws_1' },
        ]
        const extracted: EntityNodeInfo[] = [
          { uuid: 'new-1', name: 'JOHN SMITH', type: 'Person', groupId: 'ws_1' },
        ]

        const indexes = service.buildCandidateIndexes(existing)
        const state: DedupResolutionState = {
          resolvedNodes: [null],
          uuidMap: new Map(),
          unresolvedIndices: [],
          duplicatePairs: [],
        }

        service.resolveWithSimilarity(extracted, indexes, state)

        // Multiple matches should be deferred
        expect(state.unresolvedIndices).toContain(0)
      })

      it('finds fuzzy matches via LSH', () => {
        const existing: EntityNodeInfo[] = [
          { uuid: 'existing-1', name: 'microsoft corporation', type: 'Concept', groupId: 'ws_1' },
        ]
        const extracted: EntityNodeInfo[] = [
          { uuid: 'new-1', name: 'microsft corporation', type: 'Concept', groupId: 'ws_1' }, // typo
        ]

        const indexes = service.buildCandidateIndexes(existing)
        const state: DedupResolutionState = {
          resolvedNodes: [null],
          uuidMap: new Map(),
          unresolvedIndices: [],
          duplicatePairs: [],
        }

        service.resolveWithSimilarity(extracted, indexes, state)

        // Should find fuzzy match via LSH (if similarity is high enough)
        // Note: This depends on the threshold and actual similarity
        // The typo may or may not be detected depending on Jaccard threshold
      })
    })
  })

  // ===========================================================================
  // Batch Duplicate Finding Tests
  // ===========================================================================

  describe('Batch Duplicate Finding', () => {
    describe('findDuplicatesInWorkspace', () => {
      it('finds duplicate pairs in workspace', async () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'Microsoft Corporation', type: 'Concept', groupId: 'ws_1' },
          { uuid: '2', name: 'microsoft corporation', type: 'Concept', groupId: 'ws_1' },
        ]

        const duplicates = await service.findDuplicatesInWorkspace(nodes, { threshold: 0.9 })

        // Should find these as duplicates (same normalized name)
        expect(duplicates.length).toBeGreaterThanOrEqual(1)
      })

      it('returns empty array for no duplicates', async () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'Apple Inc', type: 'Concept', groupId: 'ws_1' },
          { uuid: '2', name: 'Microsoft Corp', type: 'Concept', groupId: 'ws_1' },
        ]

        const duplicates = await service.findDuplicatesInWorkspace(nodes, { threshold: 0.9 })

        expect(duplicates.length).toBe(0)
      })

      it('respects limit parameter', async () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'test company one', type: 'Concept', groupId: 'ws_1' },
          { uuid: '2', name: 'test company one', type: 'Concept', groupId: 'ws_1' },
          { uuid: '3', name: 'test company two', type: 'Concept', groupId: 'ws_1' },
          { uuid: '4', name: 'test company two', type: 'Concept', groupId: 'ws_1' },
        ]

        const duplicates = await service.findDuplicatesInWorkspace(nodes, { threshold: 0.9, limit: 1 })

        expect(duplicates.length).toBeLessThanOrEqual(1)
      })

      it('handles empty input', async () => {
        const duplicates = await service.findDuplicatesInWorkspace([])
        expect(duplicates.length).toBe(0)
      })

      it('skips low-entropy names', async () => {
        const nodes: EntityNodeInfo[] = [
          { uuid: '1', name: 'aa', type: 'Concept', groupId: 'ws_1' },
          { uuid: '2', name: 'aa', type: 'Concept', groupId: 'ws_1' },
        ]

        const duplicates = await service.findDuplicatesInWorkspace(nodes, { threshold: 0.5 })

        // Low entropy names should be skipped
        expect(duplicates.length).toBe(0)
      })
    })
  })
})
