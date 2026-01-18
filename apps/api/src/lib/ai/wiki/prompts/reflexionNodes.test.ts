/**
 * Unit Tests: Reflexion Nodes (Fase 23.7)
 *
 * Tests for the reflexion node extraction prompt utilities.
 * Tests prompt generation and response parsing for missed entity detection.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import { describe, it, expect } from 'vitest';
import {
  getReflexionNodesSystemPrompt,
  getReflexionNodesUserPrompt,
  parseReflexionNodesResponse,
} from './reflexionNodes';

describe('reflexionNodes', () => {
  // ===========================================================================
  // Prompt Generation Tests
  // ===========================================================================

  describe('getReflexionNodesSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getReflexionNodesSystemPrompt();
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should contain key instructions', () => {
      const prompt = getReflexionNodesSystemPrompt();
      expect(prompt).toContain('entities');
      expect(prompt).toContain('CURRENT MESSAGE');
      expect(prompt).toContain('missed');
    });

    it('should mention entity types', () => {
      const prompt = getReflexionNodesSystemPrompt();
      expect(prompt).toContain('Person');
      expect(prompt).toContain('Concept');
      expect(prompt).toContain('WikiPage');
    });
  });

  describe('getReflexionNodesUserPrompt', () => {
    it('should format context correctly with entities', () => {
      const prompt = getReflexionNodesUserPrompt({
        episodeContent: 'Jan works at Acme Corp with Maria on the Alpha project.',
        extractedEntities: ['Jan', 'Acme Corp'],
      });

      expect(prompt).toContain('<CURRENT MESSAGE>');
      expect(prompt).toContain('Jan works at Acme Corp');
      expect(prompt).toContain('<EXTRACTED ENTITIES>');
      expect(prompt).toContain('1. Jan');
      expect(prompt).toContain('2. Acme Corp');
    });

    it('should handle empty extracted entities', () => {
      const prompt = getReflexionNodesUserPrompt({
        episodeContent: 'Some content here.',
        extractedEntities: [],
      });

      expect(prompt).toContain('(none extracted)');
    });

    it('should include previous episodes when provided', () => {
      const prompt = getReflexionNodesUserPrompt({
        episodeContent: 'Current page content.',
        extractedEntities: ['Entity1'],
        previousEpisodes: ['Previous page 1', 'Previous page 2'],
      });

      expect(prompt).toContain('<PREVIOUS MESSAGES>');
      expect(prompt).toContain('[1] Previous page 1');
      expect(prompt).toContain('[2] Previous page 2');
    });

    it('should not include previous section when no previous episodes', () => {
      const prompt = getReflexionNodesUserPrompt({
        episodeContent: 'Current content.',
        extractedEntities: ['Test'],
      });

      expect(prompt).not.toContain('<PREVIOUS MESSAGES>');
    });

    it('should include JSON format instructions', () => {
      const prompt = getReflexionNodesUserPrompt({
        episodeContent: 'Test content.',
        extractedEntities: ['Test'],
      });

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('missed_entities');
      expect(prompt).toContain('reasoning');
    });
  });

  // ===========================================================================
  // Response Parsing Tests
  // ===========================================================================

  describe('parseReflexionNodesResponse', () => {
    it('should parse valid JSON response with missed entities', () => {
      const response = `{
        "missed_entities": [
          {
            "name": "Maria",
            "reason": "Mentioned as colleague but not extracted",
            "suggested_type": "Person"
          },
          {
            "name": "Alpha project",
            "reason": "Project reference not captured",
            "suggested_type": "Project"
          }
        ],
        "reasoning": "Found two entities that were not in the extracted list"
      }`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities).toHaveLength(2);
      expect(result.missedEntities[0]!.name).toBe('Maria');
      expect(result.missedEntities[0]!.reason).toBe('Mentioned as colleague but not extracted');
      expect(result.missedEntities[0]!.suggestedType).toBe('Person');
      expect(result.missedEntities[1]!.name).toBe('Alpha project');
      expect(result.reasoning).toBe('Found two entities that were not in the extracted list');
    });

    it('should parse empty missed entities array', () => {
      const response = `{
        "missed_entities": [],
        "reasoning": "All entities were properly extracted"
      }`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities).toHaveLength(0);
      expect(result.reasoning).toBe('All entities were properly extracted');
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Here is my analysis:
\`\`\`json
{
  "missed_entities": [
    {"name": "TestEntity", "reason": "Was missed"}
  ],
  "reasoning": "Found one"
}
\`\`\`
That's the result.`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities).toHaveLength(1);
      expect(result.missedEntities[0]!.name).toBe('TestEntity');
    });

    it('should handle string-only entity names', () => {
      const response = `{
        "missed_entities": ["Entity1", "Entity2"],
        "reasoning": "Simple format"
      }`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities).toHaveLength(2);
      expect(result.missedEntities[0]!.name).toBe('Entity1');
      expect(result.missedEntities[1]!.name).toBe('Entity2');
    });

    it('should filter out empty entity names', () => {
      const response = `{
        "missed_entities": [
          {"name": "ValidEntity"},
          {"name": ""},
          {"name": "  "}
        ],
        "reasoning": "Test"
      }`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities).toHaveLength(1);
      expect(result.missedEntities[0]!.name).toBe('ValidEntity');
    });

    it('should handle missing optional fields', () => {
      const response = `{
        "missed_entities": [
          {"name": "SimpleEntity"}
        ],
        "reasoning": "Minimal response"
      }`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities[0]!.name).toBe('SimpleEntity');
      expect(result.missedEntities[0]!.reason).toBeUndefined();
      expect(result.missedEntities[0]!.suggestedType).toBeUndefined();
    });

    it('should handle malformed JSON gracefully with bullet list fallback', () => {
      const response = `The following entities were missed:
- Entity One
- Entity Two
* Entity Three`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities.length).toBeGreaterThan(0);
      expect(result.missedEntities.map((e) => e.name)).toContain('Entity One');
      expect(result.reasoning).toBe('Parsed from unstructured response');
    });

    it('should handle numbered list fallback', () => {
      const response = `Missed entities:
1. First Entity
2. Second Entity`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities.length).toBe(2);
      expect(result.missedEntities[0]!.name).toBe('First Entity');
      expect(result.missedEntities[1]!.name).toBe('Second Entity');
    });

    it('should handle missing reasoning field', () => {
      const response = `{
        "missed_entities": [{"name": "Test"}]
      }`;

      const result = parseReflexionNodesResponse(response);

      expect(result.missedEntities).toHaveLength(1);
      expect(result.reasoning).toBe('');
    });
  });
});
