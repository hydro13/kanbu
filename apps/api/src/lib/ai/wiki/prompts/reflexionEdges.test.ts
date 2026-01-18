/**
 * Unit Tests: Reflexion Edges (Fase 23.7)
 *
 * Tests for the reflexion edge/fact extraction prompt utilities.
 * Tests prompt generation and response parsing for missed relationship detection.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import { describe, it, expect } from 'vitest';
import {
  getReflexionEdgesSystemPrompt,
  getReflexionEdgesUserPrompt,
  parseReflexionEdgesResponse,
} from './reflexionEdges';

describe('reflexionEdges', () => {
  // ===========================================================================
  // Prompt Generation Tests
  // ===========================================================================

  describe('getReflexionEdgesSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getReflexionEdgesSystemPrompt();
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should contain key instructions', () => {
      const prompt = getReflexionEdgesSystemPrompt();
      expect(prompt).toContain('facts');
      expect(prompt).toContain('relationships');
      expect(prompt).toContain('missed');
    });

    it('should mention relationship types', () => {
      const prompt = getReflexionEdgesSystemPrompt();
      expect(prompt).toContain('WORKS_ON');
      expect(prompt).toContain('BELONGS_TO');
      expect(prompt).toContain('RELATES_TO');
    });
  });

  describe('getReflexionEdgesUserPrompt', () => {
    it('should format context correctly with nodes and facts', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Jan works at Acme Corp on the Alpha project.',
        extractedNodes: ['Jan', 'Acme Corp', 'Alpha project'],
        extractedFacts: [{ source: 'Jan', target: 'Acme Corp', fact: 'Jan works at Acme Corp' }],
      });

      expect(prompt).toContain('<CURRENT MESSAGE>');
      expect(prompt).toContain('Jan works at Acme Corp');
      expect(prompt).toContain('<EXTRACTED ENTITIES>');
      expect(prompt).toContain('1. Jan');
      expect(prompt).toContain('2. Acme Corp');
      expect(prompt).toContain('<EXTRACTED FACTS>');
      expect(prompt).toContain('Jan → Acme Corp');
    });

    it('should handle empty extracted facts', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Some content here.',
        extractedNodes: ['Entity1'],
        extractedFacts: [],
      });

      expect(prompt).toContain('(no facts extracted)');
    });

    it('should handle empty extracted nodes', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Some content.',
        extractedNodes: [],
        extractedFacts: [],
      });

      expect(prompt).toContain('(none)');
    });

    it('should include previous episodes when provided', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Current page content.',
        extractedNodes: ['Entity1'],
        extractedFacts: [],
        previousEpisodes: ['Previous page 1', 'Previous page 2'],
      });

      expect(prompt).toContain('<PREVIOUS MESSAGES>');
      expect(prompt).toContain('[1] Previous page 1');
      expect(prompt).toContain('[2] Previous page 2');
    });

    it('should not include previous section when no previous episodes', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Current content.',
        extractedNodes: ['Test'],
        extractedFacts: [],
      });

      expect(prompt).not.toContain('<PREVIOUS MESSAGES>');
    });

    it('should include JSON format instructions', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Test content.',
        extractedNodes: ['Test'],
        extractedFacts: [],
      });

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('missed_facts');
      expect(prompt).toContain('reasoning');
    });

    it('should format multiple facts correctly', () => {
      const prompt = getReflexionEdgesUserPrompt({
        episodeContent: 'Content.',
        extractedNodes: ['A', 'B', 'C'],
        extractedFacts: [
          { source: 'A', target: 'B', fact: 'A relates to B' },
          { source: 'B', target: 'C', fact: 'B connects C' },
        ],
      });

      expect(prompt).toContain('1. A → B: "A relates to B"');
      expect(prompt).toContain('2. B → C: "B connects C"');
    });
  });

  // ===========================================================================
  // Response Parsing Tests
  // ===========================================================================

  describe('parseReflexionEdgesResponse', () => {
    it('should parse valid JSON response with missed facts', () => {
      const response = `{
        "missed_facts": [
          {
            "source_name": "Jan",
            "target_name": "Alpha project",
            "relation_type": "WORKS_ON",
            "fact": "Jan works on the Alpha project",
            "reason": "Project relationship not captured"
          }
        ],
        "reasoning": "Found one missed relationship"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(1);
      expect(result.missedFacts[0]!.sourceName).toBe('Jan');
      expect(result.missedFacts[0]!.targetName).toBe('Alpha project');
      expect(result.missedFacts[0]!.relationType).toBe('WORKS_ON');
      expect(result.missedFacts[0]!.fact).toBe('Jan works on the Alpha project');
      expect(result.missedFacts[0]!.reason).toBe('Project relationship not captured');
      expect(result.reasoning).toBe('Found one missed relationship');
    });

    it('should parse empty missed facts array', () => {
      const response = `{
        "missed_facts": [],
        "reasoning": "All relationships were properly extracted"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(0);
      expect(result.reasoning).toBe('All relationships were properly extracted');
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Here is my analysis:
\`\`\`json
{
  "missed_facts": [
    {
      "source_name": "Entity1",
      "target_name": "Entity2",
      "relation_type": "RELATES_TO",
      "fact": "Test fact"
    }
  ],
  "reasoning": "Found one"
}
\`\`\`
That's the result.`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(1);
      expect(result.missedFacts[0]!.sourceName).toBe('Entity1');
    });

    it('should default relation_type to RELATES_TO when missing', () => {
      const response = `{
        "missed_facts": [
          {
            "source_name": "A",
            "target_name": "B",
            "fact": "A and B are connected"
          }
        ],
        "reasoning": "Test"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts[0]!.relationType).toBe('RELATES_TO');
    });

    it('should filter out facts with empty source or target', () => {
      const response = `{
        "missed_facts": [
          {"source_name": "Valid", "target_name": "Also Valid", "fact": "Good"},
          {"source_name": "", "target_name": "B", "fact": "Bad"},
          {"source_name": "A", "target_name": "", "fact": "Also bad"},
          {"source_name": "  ", "target_name": "B", "fact": "Whitespace"}
        ],
        "reasoning": "Test"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(1);
      expect(result.missedFacts[0]!.sourceName).toBe('Valid');
    });

    it('should handle missing optional reason field', () => {
      const response = `{
        "missed_facts": [
          {
            "source_name": "A",
            "target_name": "B",
            "relation_type": "WORKS_ON",
            "fact": "A works on B"
          }
        ],
        "reasoning": "Minimal"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts[0]!.reason).toBeUndefined();
    });

    it('should handle malformed JSON gracefully', () => {
      const response = `This is not valid JSON at all`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(0);
      expect(result.reasoning).toBe('Failed to parse response');
    });

    it('should handle null objects in array', () => {
      const response = `{
        "missed_facts": [
          null,
          {"source_name": "Valid", "target_name": "Target", "fact": "Test"}
        ],
        "reasoning": "Test"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(1);
      expect(result.missedFacts[0]!.sourceName).toBe('Valid');
    });

    it('should handle missing reasoning field', () => {
      const response = `{
        "missed_facts": [
          {"source_name": "A", "target_name": "B", "fact": "Test"}
        ]
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(1);
      expect(result.reasoning).toBe('');
    });

    it('should parse multiple missed facts', () => {
      const response = `{
        "missed_facts": [
          {"source_name": "A", "target_name": "B", "relation_type": "WORKS_ON", "fact": "Fact 1"},
          {"source_name": "B", "target_name": "C", "relation_type": "BELONGS_TO", "fact": "Fact 2"},
          {"source_name": "C", "target_name": "A", "relation_type": "MANAGES", "fact": "Fact 3"}
        ],
        "reasoning": "Found three relationships"
      }`;

      const result = parseReflexionEdgesResponse(response);

      expect(result.missedFacts).toHaveLength(3);
      expect(result.missedFacts[0]!.relationType).toBe('WORKS_ON');
      expect(result.missedFacts[1]!.relationType).toBe('BELONGS_TO');
      expect(result.missedFacts[2]!.relationType).toBe('MANAGES');
    });
  });
});
