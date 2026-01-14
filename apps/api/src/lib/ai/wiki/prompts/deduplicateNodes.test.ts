/**
 * Unit Tests: Deduplicate Nodes (Fase 22.4 / 22.8.4)
 *
 * Tests for the node and edge deduplication prompt utilities.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import { describe, it, expect } from 'vitest'
import {
  getDeduplicateNodesSystemPrompt,
  getDeduplicateNodesUserPrompt,
  parseDeduplicateNodesResponse,
  getDeduplicateEdgeSystemPrompt,
  getDeduplicateEdgeUserPrompt,
  parseDeduplicateEdgeResponse,
  type DeduplicateNodesContext,
  type DeduplicateEdgeContext,
  type ExtractedNodeContext,
  type ExistingNodeContext,
} from './deduplicateNodes'

// =============================================================================
// Node Deduplication Tests
// =============================================================================

describe('deduplicateNodes', () => {
  // ===========================================================================
  // System Prompt Tests
  // ===========================================================================

  describe('getDeduplicateNodesSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getDeduplicateNodesSystemPrompt()
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('should contain key guidelines', () => {
      const prompt = getDeduplicateNodesSystemPrompt()
      expect(prompt).toContain('SAME ENTITY')
      expect(prompt).toContain('SEMANTIC EQUIVALENCE')
      expect(prompt).toContain('DO NOT MARK AS DUPLICATES')
      expect(prompt).toContain('BEST NAME')
    })

    it('should specify JSON response format', () => {
      const prompt = getDeduplicateNodesSystemPrompt()
      expect(prompt).toContain('entityResolutions')
      expect(prompt).toContain('duplicateIdx')
      expect(prompt).toContain('duplicates')
      expect(prompt).toContain('JSON')
    })

    it('should contain examples of what NOT to mark as duplicates', () => {
      const prompt = getDeduplicateNodesSystemPrompt()
      expect(prompt).toContain('Related but distinct')
      expect(prompt).toContain('Similar names')
      expect(prompt).toContain('Generic vs specific')
    })
  })

  // ===========================================================================
  // User Prompt Tests
  // ===========================================================================

  describe('getDeduplicateNodesUserPrompt', () => {
    it('should format context with extracted and existing nodes', () => {
      const extractedNodes: ExtractedNodeContext[] = [
        { id: 0, name: 'John Smith', entity_type: ['Person'] },
        { id: 1, name: 'Acme Corp', entity_type: ['Company'] },
      ]

      const existingNodes: ExistingNodeContext[] = [
        { idx: 0, name: 'John', entity_types: ['Person'], summary: 'Employee' },
        { idx: 1, name: 'Acme Corporation', entity_types: ['Company'] },
      ]

      const context: DeduplicateNodesContext = {
        extractedNodes,
        existingNodes,
        episodeContent: 'John Smith works at Acme Corp.',
        previousEpisodes: ['Previous context about John.'],
      }

      const prompt = getDeduplicateNodesUserPrompt(context)

      expect(prompt).toContain('<PREVIOUS MESSAGES>')
      expect(prompt).toContain('Previous context about John')
      expect(prompt).toContain('<CURRENT MESSAGE>')
      expect(prompt).toContain('John Smith works at Acme Corp')
      expect(prompt).toContain('<NEW ENTITIES>')
      expect(prompt).toContain('John Smith')
      expect(prompt).toContain('<EXISTING ENTITIES>')
      expect(prompt).toContain('Acme Corporation')
    })

    it('should handle empty previous episodes', () => {
      const context: DeduplicateNodesContext = {
        extractedNodes: [{ id: 0, name: 'Test', entity_type: ['Concept'] }],
        existingNodes: [],
        episodeContent: 'Test content',
        previousEpisodes: [],
      }

      const prompt = getDeduplicateNodesUserPrompt(context)

      expect(prompt).toContain('No previous messages')
    })

    it('should handle undefined previous episodes', () => {
      const context: DeduplicateNodesContext = {
        extractedNodes: [{ id: 0, name: 'Test', entity_type: ['Concept'] }],
        existingNodes: [],
        episodeContent: 'Test content',
      }

      const prompt = getDeduplicateNodesUserPrompt(context)

      expect(prompt).toContain('No previous messages')
    })

    it('should include entity count in prompt', () => {
      const extractedNodes: ExtractedNodeContext[] = [
        { id: 0, name: 'Entity1', entity_type: ['Type1'] },
        { id: 1, name: 'Entity2', entity_type: ['Type2'] },
        { id: 2, name: 'Entity3', entity_type: ['Type3'] },
      ]

      const context: DeduplicateNodesContext = {
        extractedNodes,
        existingNodes: [],
        episodeContent: 'Content',
      }

      const prompt = getDeduplicateNodesUserPrompt(context)

      expect(prompt).toContain('IDs 0 through 2')
      expect(prompt).toContain('3 entities')
    })

    it('should properly JSON stringify entities', () => {
      const extractedNodes: ExtractedNodeContext[] = [
        { id: 0, name: 'Test "Entity"', entity_type: ['Type'] },
      ]

      const context: DeduplicateNodesContext = {
        extractedNodes,
        existingNodes: [],
        episodeContent: 'Content',
      }

      const prompt = getDeduplicateNodesUserPrompt(context)

      // JSON.stringify should escape quotes
      expect(prompt).toContain('\\"Entity\\"')
    })
  })

  // ===========================================================================
  // Response Parsing Tests
  // ===========================================================================

  describe('parseDeduplicateNodesResponse', () => {
    it('should parse valid JSON response with duplicates', () => {
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "John Smith",
            "duplicateIdx": 2,
            "duplicates": [2, 5]
          },
          {
            "id": 1,
            "name": "Acme Corporation",
            "duplicateIdx": -1,
            "duplicates": []
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 2)

      expect(result.entityResolutions).toHaveLength(2)
      expect(result.entityResolutions[0]?.id).toBe(0)
      expect(result.entityResolutions[0]?.name).toBe('John Smith')
      expect(result.entityResolutions[0]?.duplicateIdx).toBe(2)
      expect(result.entityResolutions[0]?.duplicates).toEqual([2, 5])
      expect(result.entityResolutions[1]?.duplicateIdx).toBe(-1)
    })

    it('should parse valid JSON with no duplicates found', () => {
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "Unique Entity",
            "duplicateIdx": -1,
            "duplicates": []
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions).toHaveLength(1)
      expect(result.entityResolutions[0]?.duplicateIdx).toBe(-1)
      expect(result.entityResolutions[0]?.duplicates).toEqual([])
    })

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Based on my analysis:
\`\`\`json
{
  "entityResolutions": [
    { "id": 0, "name": "Test", "duplicateIdx": 3, "duplicates": [3] }
  ]
}
\`\`\`
`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions).toHaveLength(1)
      expect(result.entityResolutions[0]?.duplicateIdx).toBe(3)
    })

    it('should extract JSON from surrounding text', () => {
      const response = `Let me analyze this...
{"entityResolutions": [{"id": 0, "name": "Found", "duplicateIdx": 1, "duplicates": [1]}]}
That's my conclusion.`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions).toHaveLength(1)
      expect(result.entityResolutions[0]?.name).toBe('Found')
    })

    it('should handle invalid JSON gracefully', () => {
      const response = 'This is not valid JSON at all'

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions).toEqual([])
    })

    it('should handle malformed JSON gracefully', () => {
      const response = '{ "entityResolutions": [invalid] }'

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions).toEqual([])
    })

    it('should handle missing entityResolutions field', () => {
      const response = '{ "otherField": "value" }'

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions).toEqual([])
    })

    it('should validate resolution IDs are within range', () => {
      const response = `{
        "entityResolutions": [
          { "id": 0, "name": "Valid", "duplicateIdx": 1, "duplicates": [] },
          { "id": 999, "name": "Invalid ID", "duplicateIdx": 0, "duplicates": [] },
          { "id": -1, "name": "Negative ID", "duplicateIdx": 0, "duplicates": [] }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 2)

      // Only id=0 should be valid (0-1 range for expectedCount=2)
      expect(result.entityResolutions).toHaveLength(1)
      expect(result.entityResolutions[0]?.id).toBe(0)
    })

    it('should validate required fields', () => {
      const response = `{
        "entityResolutions": [
          { "id": 0, "duplicateIdx": 1, "duplicates": [] },
          { "id": 1, "name": "Missing fields", "duplicates": [] },
          { "id": 2, "name": "Complete", "duplicateIdx": -1, "duplicates": [] }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 3)

      // Only complete entry should be valid
      expect(result.entityResolutions.some(r => r.id === 2)).toBe(true)
    })

    it('should handle empty entityResolutions array', () => {
      const response = '{ "entityResolutions": [] }'

      const result = parseDeduplicateNodesResponse(response, 3)

      expect(result.entityResolutions).toEqual([])
    })

    it('should warn when resolution count does not match expected', () => {
      const response = `{
        "entityResolutions": [
          { "id": 0, "name": "Only one", "duplicateIdx": -1, "duplicates": [] }
        ]
      }`

      // Should log a warning but still return valid results
      const result = parseDeduplicateNodesResponse(response, 5)

      expect(result.entityResolutions).toHaveLength(1)
    })
  })

  // ===========================================================================
  // Scenario Tests (simulating expected LLM outputs)
  // ===========================================================================

  describe('deduplication scenarios', () => {
    it('should handle exact name match scenario', () => {
      // Simulated LLM response for: "Microsoft" matching existing "Microsoft"
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "Microsoft",
            "duplicateIdx": 0,
            "duplicates": [0]
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions[0]?.duplicateIdx).toBe(0)
    })

    it('should handle semantic equivalence scenario', () => {
      // Simulated LLM response for: "The CEO" matching "John Smith" (who is the CEO)
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "John Smith",
            "duplicateIdx": 3,
            "duplicates": [3]
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions[0]?.name).toBe('John Smith')
      expect(result.entityResolutions[0]?.duplicateIdx).toBe(3)
    })

    it('should handle no duplicates scenario', () => {
      // Simulated LLM response for completely new entity
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "New Company Inc",
            "duplicateIdx": -1,
            "duplicates": []
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions[0]?.duplicateIdx).toBe(-1)
      expect(result.entityResolutions[0]?.duplicates).toEqual([])
    })

    it('should handle multiple duplicates scenario', () => {
      // Simulated LLM response for entity matching multiple existing entries
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "John Smith",
            "duplicateIdx": 1,
            "duplicates": [1, 4, 7]
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions[0]?.duplicates).toHaveLength(3)
      expect(result.entityResolutions[0]?.duplicateIdx).toBe(1)
    })

    it('should handle all entities as duplicates scenario', () => {
      const response = `{
        "entityResolutions": [
          { "id": 0, "name": "Entity A", "duplicateIdx": 0, "duplicates": [0] },
          { "id": 1, "name": "Entity B", "duplicateIdx": 2, "duplicates": [2] },
          { "id": 2, "name": "Entity C", "duplicateIdx": 5, "duplicates": [5] }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 3)

      expect(result.entityResolutions).toHaveLength(3)
      expect(result.entityResolutions.every(r => r.duplicateIdx >= 0)).toBe(true)
    })

    it('should handle related but distinct entities scenario', () => {
      // Microsoft vs Microsoft Teams - should NOT be duplicates
      const response = `{
        "entityResolutions": [
          {
            "id": 0,
            "name": "Microsoft Teams",
            "duplicateIdx": -1,
            "duplicates": []
          }
        ]
      }`

      const result = parseDeduplicateNodesResponse(response, 1)

      expect(result.entityResolutions[0]?.duplicateIdx).toBe(-1)
    })
  })
})

// =============================================================================
// Edge Deduplication Tests
// =============================================================================

describe('deduplicateEdge', () => {
  // ===========================================================================
  // System Prompt Tests
  // ===========================================================================

  describe('getDeduplicateEdgeSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getDeduplicateEdgeSystemPrompt()
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('should contain duplicate detection guidelines', () => {
      const prompt = getDeduplicateEdgeSystemPrompt()
      expect(prompt).toContain('DUPLICATE DETECTION')
      expect(prompt).toContain('IDENTICAL factual information')
      expect(prompt).toContain('Minor wording differences')
    })

    it('should contain contradiction detection guidelines', () => {
      const prompt = getDeduplicateEdgeSystemPrompt()
      expect(prompt).toContain('CONTRADICTION DETECTION')
      expect(prompt).toContain('mutually exclusive')
    })

    it('should specify JSON response format', () => {
      const prompt = getDeduplicateEdgeSystemPrompt()
      expect(prompt).toContain('duplicateFacts')
      expect(prompt).toContain('contradictedFacts')
      expect(prompt).toContain('factType')
      expect(prompt).toContain('JSON')
    })
  })

  // ===========================================================================
  // User Prompt Tests
  // ===========================================================================

  describe('getDeduplicateEdgeUserPrompt', () => {
    it('should format context with existing and new edges', () => {
      const context: DeduplicateEdgeContext = {
        existingEdges: [
          { idx: 0, fact: 'John works at Acme', sourceUuid: 'uuid-1', targetUuid: 'uuid-2' },
          { idx: 1, fact: 'John likes coffee', sourceUuid: 'uuid-1', targetUuid: 'uuid-3' },
        ],
        newEdge: {
          fact: 'John is employed at Acme Corporation',
          sourceUuid: 'uuid-1',
          targetUuid: 'uuid-4',
        },
      }

      const prompt = getDeduplicateEdgeUserPrompt(context)

      expect(prompt).toContain('<EXISTING FACTS>')
      expect(prompt).toContain('John works at Acme')
      expect(prompt).toContain('<NEW FACT>')
      expect(prompt).toContain('John is employed at Acme Corporation')
    })

    it('should handle empty existing edges', () => {
      const context: DeduplicateEdgeContext = {
        existingEdges: [],
        newEdge: {
          fact: 'New fact',
          sourceUuid: 'uuid-1',
          targetUuid: 'uuid-2',
        },
      }

      const prompt = getDeduplicateEdgeUserPrompt(context)

      expect(prompt).toContain('[]')
      expect(prompt).toContain('New fact')
    })
  })

  // ===========================================================================
  // Response Parsing Tests
  // ===========================================================================

  describe('parseDeduplicateEdgeResponse', () => {
    it('should parse valid response with duplicates', () => {
      const response = `{
        "duplicateFacts": [0, 2],
        "contradictedFacts": [],
        "factType": "RELATIONSHIP"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([0, 2])
      expect(result.contradictedFacts).toEqual([])
      expect(result.factType).toBe('RELATIONSHIP')
    })

    it('should parse valid response with contradictions', () => {
      const response = `{
        "duplicateFacts": [],
        "contradictedFacts": [1, 3],
        "factType": "STATUS_UPDATE"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([])
      expect(result.contradictedFacts).toEqual([1, 3])
      expect(result.factType).toBe('STATUS_UPDATE')
    })

    it('should parse valid response with both duplicates and contradictions', () => {
      const response = `{
        "duplicateFacts": [0],
        "contradictedFacts": [2],
        "factType": "ATTRIBUTE_CHANGE"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([0])
      expect(result.contradictedFacts).toEqual([2])
    })

    it('should filter out-of-range indices', () => {
      const response = `{
        "duplicateFacts": [0, 1, 999, -1],
        "contradictedFacts": [2, 100],
        "factType": "DEFAULT"
      }`

      const result = parseDeduplicateEdgeResponse(response, 3)

      expect(result.duplicateFacts).toEqual([0, 1])
      expect(result.contradictedFacts).toEqual([2])
    })

    it('should handle invalid JSON gracefully', () => {
      const response = 'Not valid JSON'

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([])
      expect(result.contradictedFacts).toEqual([])
      expect(result.factType).toBe('DEFAULT')
    })

    it('should handle missing fields gracefully', () => {
      const response = '{ "factType": "TEST" }'

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([])
      expect(result.contradictedFacts).toEqual([])
      expect(result.factType).toBe('TEST')
    })

    it('should default factType to DEFAULT', () => {
      const response = '{ "duplicateFacts": [0] }'

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.factType).toBe('DEFAULT')
    })

    it('should extract JSON from surrounding text', () => {
      const response = `Analysis complete:
{"duplicateFacts": [1], "contradictedFacts": [], "factType": "DEFAULT"}
End of analysis.`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([1])
    })
  })

  // ===========================================================================
  // Edge Scenario Tests
  // ===========================================================================

  describe('edge deduplication scenarios', () => {
    it('should handle identical facts scenario', () => {
      const response = `{
        "duplicateFacts": [0],
        "contradictedFacts": [],
        "factType": "DEFAULT"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toContain(0)
      expect(result.contradictedFacts).toEqual([])
    })

    it('should handle contradicting employment facts scenario', () => {
      const response = `{
        "duplicateFacts": [],
        "contradictedFacts": [0],
        "factType": "RELATIONSHIP"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([])
      expect(result.contradictedFacts).toContain(0)
    })

    it('should handle compatible facts scenario', () => {
      const response = `{
        "duplicateFacts": [],
        "contradictedFacts": [],
        "factType": "DEFAULT"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([])
      expect(result.contradictedFacts).toEqual([])
    })

    it('should handle numeric value contradiction scenario', () => {
      // "Revenue was $1M" vs "Revenue was $2M" - not duplicates, potentially contradictory
      const response = `{
        "duplicateFacts": [],
        "contradictedFacts": [0],
        "factType": "ATTRIBUTE_CHANGE"
      }`

      const result = parseDeduplicateEdgeResponse(response, 5)

      expect(result.duplicateFacts).toEqual([])
      expect(result.contradictedFacts).toEqual([0])
      expect(result.factType).toBe('ATTRIBUTE_CHANGE')
    })
  })
})
