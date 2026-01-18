/**
 * Unit Tests: Detect Contradictions (Fase 16.3)
 *
 * Tests for the contradiction detection prompt utilities.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect } from 'vitest';
import {
  getDetectContradictionsSystemPrompt,
  getDetectContradictionsUserPrompt,
  parseDetectContradictionsResponse,
  type ExistingFact,
  type ContradictionDetail,
} from './detectContradictions';

describe('detectContradictions', () => {
  // ===========================================================================
  // Prompt Generation Tests
  // ===========================================================================

  describe('getDetectContradictionsSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getDetectContradictionsSystemPrompt();
      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('should contain key guidelines', () => {
      const prompt = getDetectContradictionsSystemPrompt();
      expect(prompt).toContain('MUTUALLY EXCLUSIVE');
      expect(prompt).toContain('NON-CONTRADICTIONS');
      expect(prompt).toContain('TEMPORAL CONTEXT');
      expect(prompt).toContain('BE CONSERVATIVE');
    });

    it('should specify JSON response format', () => {
      const prompt = getDetectContradictionsSystemPrompt();
      expect(prompt).toContain('contradicted_fact_ids');
      expect(prompt).toContain('reasoning');
      expect(prompt).toContain('JSON');
    });
  });

  describe('getDetectContradictionsUserPrompt', () => {
    it('should format context with existing facts', () => {
      const existingFacts: ExistingFact[] = [
        {
          id: 'edge-1',
          fact: 'Jan works at Acme',
          validAt: '2024-01-01T00:00:00.000Z',
          invalidAt: null,
        },
        { id: 'edge-2', fact: 'Jan likes pizza', validAt: null, invalidAt: null },
      ];

      const prompt = getDetectContradictionsUserPrompt({
        newFact: 'Jan works at Beta Corp',
        existingFacts,
      });

      expect(prompt).toContain('<EXISTING_FACTS>');
      expect(prompt).toContain('[edge-1] Jan works at Acme');
      expect(prompt).toContain('(valid since: 2024-01-01T00:00:00.000Z)');
      expect(prompt).toContain('[edge-2] Jan likes pizza');
      expect(prompt).toContain('<NEW_FACT>');
      expect(prompt).toContain('Jan works at Beta Corp');
    });

    it('should format temporal info correctly', () => {
      const existingFacts: ExistingFact[] = [
        {
          id: 'edge-1',
          fact: 'Past employment',
          validAt: '2020-01-01T00:00:00.000Z',
          invalidAt: '2023-12-31T23:59:59.999Z',
        },
      ];

      const prompt = getDetectContradictionsUserPrompt({
        newFact: 'Current job',
        existingFacts,
      });

      expect(prompt).toContain('(valid since: 2020-01-01T00:00:00.000Z)');
      expect(prompt).toContain('(invalid since: 2023-12-31T23:59:59.999Z)');
    });

    it('should handle empty existing facts', () => {
      const prompt = getDetectContradictionsUserPrompt({
        newFact: 'Some new fact',
        existingFacts: [],
      });

      expect(prompt).toContain('(no existing facts)');
      expect(prompt).toContain('<NEW_FACT>');
      expect(prompt).toContain('Some new fact');
    });

    it('should handle facts without temporal info', () => {
      const existingFacts: ExistingFact[] = [
        { id: 'edge-1', fact: 'Simple fact', validAt: null, invalidAt: null },
      ];

      const prompt = getDetectContradictionsUserPrompt({
        newFact: 'Another fact',
        existingFacts,
      });

      expect(prompt).toContain('[edge-1] Simple fact');
      expect(prompt).not.toContain('(valid since:');
      expect(prompt).not.toContain('(invalid since:');
    });
  });

  // ===========================================================================
  // Response Parsing Tests
  // ===========================================================================

  describe('parseDetectContradictionsResponse', () => {
    it('should parse valid JSON response with contradictions', () => {
      const response = `{
        "contradicted_fact_ids": ["edge-1", "edge-3"],
        "reasoning": "Both claim different employers for same person"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['edge-1', 'edge-3']);
      expect(result.reasoning).toBe('Both claim different employers for same person');
    });

    it('should parse valid JSON with no contradictions', () => {
      const response = `{
        "contradicted_fact_ids": [],
        "reasoning": "No contradictions found - the new fact is compatible with existing facts"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual([]);
      expect(result.reasoning).toContain('No contradictions');
    });

    it('should handle camelCase field names', () => {
      const response = `{
        "contradictedFactIds": ["id-1", "id-2"],
        "reasoning": "CamelCase format"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['id-1', 'id-2']);
    });

    it('should handle alternative field name "contradicted_facts"', () => {
      const response = `{
        "contradicted_facts": ["id-A"],
        "reasoning": "Alternative field name"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['id-A']);
    });

    it('should convert numeric IDs to strings', () => {
      const response = `{
        "contradicted_fact_ids": [1, 2, 3],
        "reasoning": "Numeric IDs"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['1', '2', '3']);
    });

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Based on my analysis:
\`\`\`json
{
  "contradicted_fact_ids": ["edge-5"],
  "reasoning": "Clear contradiction"
}
\`\`\`
`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['edge-5']);
      expect(result.reasoning).toBe('Clear contradiction');
    });

    it('should extract JSON from surrounding text', () => {
      const response = `Let me analyze this...
{"contradicted_fact_ids": ["x"], "reasoning": "Found it"}
That's my conclusion.`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['x']);
    });

    it('should handle invalid JSON gracefully', () => {
      const response = 'This is not valid JSON at all';

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual([]);
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should provide default reasoning when missing', () => {
      const response = `{"contradicted_fact_ids": ["id-1"]}`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual(['id-1']);
      expect(result.reasoning).toBe('No reasoning provided');
    });

    it('should handle missing contradicted_fact_ids field', () => {
      const response = `{"reasoning": "Only reasoning"}`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual([]);
      expect(result.reasoning).toBe('Only reasoning');
    });
  });

  // ===========================================================================
  // Scenario Tests (simulating expected LLM outputs)
  // ===========================================================================

  describe('contradiction scenarios', () => {
    it('should handle employment contradiction scenario', () => {
      // Simulated LLM response for: "Jan works at Beta" contradicting "Jan works at Acme"
      const response = `{
        "contradicted_fact_ids": ["edge-employment-acme"],
        "reasoning": "Jan cannot work at both Acme and Beta simultaneously as primary employer"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toContain('edge-employment-acme');
    });

    it('should handle non-contradicting preferences scenario', () => {
      // Simulated LLM response for: "Jan likes sushi" with existing "Jan likes pizza"
      const response = `{
        "contradicted_fact_ids": [],
        "reasoning": "Liking sushi does not contradict liking pizza - a person can have multiple food preferences"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual([]);
    });

    it('should handle temporal non-contradiction scenario', () => {
      // Simulated LLM response for present vs past employment
      const response = `{
        "contradicted_fact_ids": [],
        "reasoning": "The new fact about current employment does not contradict past employment at a different company"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual([]);
    });

    it('should handle role change contradiction scenario', () => {
      // Simulated LLM response for: "Jan is now a manager" contradicting "Jan is a developer"
      const response = `{
        "contradicted_fact_ids": ["edge-role-developer"],
        "reasoning": "If Jan is now a manager, the previous role of developer is superseded"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toContain('edge-role-developer');
    });

    it('should handle multi-value attribute non-contradiction', () => {
      // Simulated LLM response for: "System supports German" with existing "System supports Dutch"
      const response = `{
        "contradicted_fact_ids": [],
        "reasoning": "A system can support multiple languages simultaneously"
      }`;

      const result = parseDetectContradictionsResponse(response);

      expect(result.contradictedFactIds).toEqual([]);
    });
  });
});

// =============================================================================
// Enhanced Contradiction Detection Tests (Fase 17.2)
// =============================================================================

import {
  ContradictionCategory,
  getEnhancedDetectContradictionsSystemPrompt,
  getEnhancedDetectContradictionsUserPrompt,
  parseEnhancedDetectContradictionsResponse,
  toBasicContradictionResult,
} from './detectContradictions';

describe('enhancedDetectContradictions (Fase 17.2)', () => {
  // ===========================================================================
  // Enhanced Prompt Tests
  // ===========================================================================

  describe('getEnhancedDetectContradictionsSystemPrompt', () => {
    it('should include confidence scoring guidelines', () => {
      const prompt = getEnhancedDetectContradictionsSystemPrompt();
      expect(prompt).toContain('CONFIDENCE SCORING');
      expect(prompt).toContain('0.7');
      expect(prompt).toContain('0.9');
      expect(prompt).toContain('1.0');
    });

    it('should include contradiction categories', () => {
      const prompt = getEnhancedDetectContradictionsSystemPrompt();
      expect(prompt).toContain('SEMANTIC');
      expect(prompt).toContain('TEMPORAL');
      expect(prompt).toContain('FACTUAL');
      expect(prompt).toContain('ATTRIBUTE');
    });

    it('should include resolution options', () => {
      const prompt = getEnhancedDetectContradictionsSystemPrompt();
      expect(prompt).toContain('INVALIDATE_OLD');
      expect(prompt).toContain('INVALIDATE_NEW');
      expect(prompt).toContain('MERGE');
      expect(prompt).toContain('ASK_USER');
    });
  });

  describe('getEnhancedDetectContradictionsUserPrompt', () => {
    it('should mark already invalid facts clearly', () => {
      const existingFacts: ExistingFact[] = [
        {
          id: 'edge-1',
          fact: 'Old fact',
          validAt: '2020-01-01T00:00:00.000Z',
          invalidAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const prompt = getEnhancedDetectContradictionsUserPrompt({
        newFact: 'New fact',
        existingFacts,
      });

      expect(prompt).toContain('ALREADY INVALID');
      expect(prompt).toContain('2024-01-01');
    });
  });

  // ===========================================================================
  // Enhanced Response Parsing Tests
  // ===========================================================================

  describe('parseEnhancedDetectContradictionsResponse', () => {
    it('should parse valid enhanced response', () => {
      const response = `{
        "contradictions": [
          {
            "factId": "edge-123",
            "confidence": 0.95,
            "category": "FACTUAL",
            "conflictDescription": "Both claim different employers"
          }
        ],
        "reasoning": "Clear factual contradiction",
        "suggestedResolution": "INVALIDATE_OLD"
      }`;

      const result = parseEnhancedDetectContradictionsResponse(response);

      expect(result.contradictions).toHaveLength(1);
      expect(result.contradictions[0]?.factId).toBe('edge-123');
      expect(result.contradictions[0]?.confidence).toBe(0.95);
      expect(result.contradictions[0]?.category).toBe(ContradictionCategory.FACTUAL);
      expect(result.contradictions[0]?.conflictDescription).toBe('Both claim different employers');
      expect(result.reasoning).toBe('Clear factual contradiction');
      expect(result.suggestedResolution).toBe('INVALIDATE_OLD');
    });

    it('should filter out low confidence contradictions', () => {
      const response = `{
        "contradictions": [
          { "factId": "edge-1", "confidence": 0.95, "category": "FACTUAL", "conflictDescription": "High" },
          { "factId": "edge-2", "confidence": 0.5, "category": "SEMANTIC", "conflictDescription": "Low" },
          { "factId": "edge-3", "confidence": 0.75, "category": "ATTRIBUTE", "conflictDescription": "Medium" }
        ],
        "reasoning": "Mixed confidence"
      }`;

      const result = parseEnhancedDetectContradictionsResponse(response);

      // Only edge-1 (0.95) and edge-3 (0.75) should be included (>= 0.7)
      expect(result.contradictions).toHaveLength(2);
      expect(result.contradictions.map((c) => c.factId)).toEqual(['edge-1', 'edge-3']);
    });

    it('should handle snake_case field names', () => {
      const response = `{
        "contradictions": [
          {
            "fact_id": "edge-456",
            "confidence": 0.85,
            "category": "SEMANTIC",
            "conflict_description": "Snake case test"
          }
        ],
        "reasoning": "Test",
        "suggested_resolution": "MERGE"
      }`;

      const result = parseEnhancedDetectContradictionsResponse(response);

      expect(result.contradictions[0]?.factId).toBe('edge-456');
      expect(result.contradictions[0]?.conflictDescription).toBe('Snake case test');
      expect(result.suggestedResolution).toBe('MERGE');
    });

    it('should parse all category types', () => {
      const categories = ['SEMANTIC', 'TEMPORAL', 'FACTUAL', 'ATTRIBUTE'];

      for (const category of categories) {
        const response = `{
          "contradictions": [
            { "factId": "edge-1", "confidence": 0.9, "category": "${category}", "conflictDescription": "Test" }
          ],
          "reasoning": "Test"
        }`;

        const result = parseEnhancedDetectContradictionsResponse(response);
        expect(result.contradictions[0]?.category).toBe(category);
      }
    });

    it('should default unknown categories to FACTUAL', () => {
      const response = `{
        "contradictions": [
          { "factId": "edge-1", "confidence": 0.9, "category": "UNKNOWN_TYPE", "conflictDescription": "Test" }
        ],
        "reasoning": "Test"
      }`;

      const result = parseEnhancedDetectContradictionsResponse(response);
      expect(result.contradictions[0]?.category).toBe(ContradictionCategory.FACTUAL);
    });

    it('should handle empty contradictions', () => {
      const response = `{
        "contradictions": [],
        "reasoning": "No contradictions found"
      }`;

      const result = parseEnhancedDetectContradictionsResponse(response);

      expect(result.contradictions).toEqual([]);
      expect(result.reasoning).toBe('No contradictions found');
      expect(result.suggestedResolution).toBeUndefined();
    });

    it('should handle invalid JSON gracefully', () => {
      const result = parseEnhancedDetectContradictionsResponse('not valid json');

      expect(result.contradictions).toEqual([]);
      expect(result.reasoning).toContain('Failed to parse');
    });
  });

  // ===========================================================================
  // Utility Function Tests
  // ===========================================================================

  describe('toBasicContradictionResult', () => {
    it('should convert enhanced result to basic result', () => {
      const enhanced = {
        contradictions: [
          {
            factId: 'edge-1',
            confidence: 0.95,
            category: ContradictionCategory.FACTUAL,
            conflictDescription: 'Test 1',
          },
          {
            factId: 'edge-2',
            confidence: 0.85,
            category: ContradictionCategory.SEMANTIC,
            conflictDescription: 'Test 2',
          },
        ],
        reasoning: 'Multiple contradictions found',
      };

      const basic = toBasicContradictionResult(enhanced);

      expect(basic.contradictedFactIds).toEqual(['edge-1', 'edge-2']);
      expect(basic.reasoning).toBe('Multiple contradictions found');
    });
  });
});

// =============================================================================
// Batch Contradiction Detection Tests (Fase 17.2)
// =============================================================================

import {
  MAX_BATCH_SIZE,
  getBatchDetectContradictionsSystemPrompt,
  getBatchDetectContradictionsUserPrompt,
  parseBatchDetectContradictionsResponse,
  type BatchNewFact,
} from './detectContradictions';

describe('batchDetectContradictions (Fase 17.2)', () => {
  describe('MAX_BATCH_SIZE', () => {
    it('should be 10', () => {
      expect(MAX_BATCH_SIZE).toBe(10);
    });
  });

  describe('getBatchDetectContradictionsSystemPrompt', () => {
    it('should include batch-specific instructions', () => {
      const prompt = getBatchDetectContradictionsSystemPrompt();
      expect(prompt).toContain('MULTIPLE new facts');
      expect(prompt).toContain('EACH new fact');
      expect(prompt).toContain('newFactId');
    });

    it('should include all categories', () => {
      const prompt = getBatchDetectContradictionsSystemPrompt();
      expect(prompt).toContain('SEMANTIC');
      expect(prompt).toContain('TEMPORAL');
      expect(prompt).toContain('FACTUAL');
      expect(prompt).toContain('ATTRIBUTE');
    });
  });

  describe('getBatchDetectContradictionsUserPrompt', () => {
    it('should format multiple new facts', () => {
      const newFacts: BatchNewFact[] = [
        { id: 'new-1', fact: 'Jan works at Acme' },
        { id: 'new-2', fact: 'Jan lives in Amsterdam' },
      ];
      const existingFacts: ExistingFact[] = [
        {
          id: 'edge-1',
          fact: 'Jan works at TechCorp',
          validAt: '2024-01-01T00:00:00.000Z',
          invalidAt: null,
        },
      ];

      const prompt = getBatchDetectContradictionsUserPrompt({ newFacts, existingFacts });

      expect(prompt).toContain('<NEW_FACTS>');
      expect(prompt).toContain('[new-1] Jan works at Acme');
      expect(prompt).toContain('[new-2] Jan lives in Amsterdam');
      expect(prompt).toContain('<EXISTING_FACTS>');
      expect(prompt).toContain('[edge-1] Jan works at TechCorp');
    });

    it('should handle empty existing facts', () => {
      const newFacts: BatchNewFact[] = [{ id: 'new-1', fact: 'Some fact' }];

      const prompt = getBatchDetectContradictionsUserPrompt({ newFacts, existingFacts: [] });

      expect(prompt).toContain('(no existing facts)');
    });
  });

  describe('parseBatchDetectContradictionsResponse', () => {
    it('should parse valid batch response', () => {
      const response = `{
        "results": [
          {
            "newFactId": "new-1",
            "contradictions": [
              { "factId": "edge-1", "confidence": 0.95, "category": "FACTUAL", "conflictDescription": "Different employers" }
            ],
            "reasoning": "Clear contradiction",
            "suggestedResolution": "INVALIDATE_OLD"
          },
          {
            "newFactId": "new-2",
            "contradictions": [],
            "reasoning": "No contradictions"
          }
        ],
        "summary": "Processed 2 facts"
      }`;

      const result = parseBatchDetectContradictionsResponse(response, ['new-1', 'new-2']);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.newFactId).toBe('new-1');
      expect(result.results[0]?.contradictions).toHaveLength(1);
      expect(result.results[0]?.contradictions[0]?.factId).toBe('edge-1');
      expect(result.results[1]?.newFactId).toBe('new-2');
      expect(result.results[1]?.contradictions).toHaveLength(0);
      expect(result.summary).toBe('Processed 2 facts');
      expect(result.errorCount).toBe(0);
    });

    it('should handle missing results for some facts', () => {
      const response = `{
        "results": [
          { "newFactId": "new-1", "contradictions": [], "reasoning": "OK" }
        ],
        "summary": "Partial"
      }`;

      const result = parseBatchDetectContradictionsResponse(response, ['new-1', 'new-2', 'new-3']);

      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.error).toBeUndefined();
      expect(result.results[1]?.error).toBe('Missing from LLM response');
      expect(result.results[2]?.error).toBe('Missing from LLM response');
      expect(result.errorCount).toBe(2);
    });

    it('should filter low confidence contradictions', () => {
      const response = `{
        "results": [
          {
            "newFactId": "new-1",
            "contradictions": [
              { "factId": "edge-1", "confidence": 0.95, "category": "FACTUAL", "conflictDescription": "High" },
              { "factId": "edge-2", "confidence": 0.5, "category": "SEMANTIC", "conflictDescription": "Low" }
            ],
            "reasoning": "Mixed"
          }
        ],
        "summary": "Done"
      }`;

      const result = parseBatchDetectContradictionsResponse(response, ['new-1']);

      expect(result.results[0]?.contradictions).toHaveLength(1);
      expect(result.results[0]?.contradictions[0]?.factId).toBe('edge-1');
    });

    it('should handle invalid JSON gracefully', () => {
      const result = parseBatchDetectContradictionsResponse('not json', ['new-1', 'new-2']);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.error).toContain('Parse error');
      expect(result.results[1]?.error).toContain('Parse error');
      expect(result.errorCount).toBe(2);
    });

    it('should handle snake_case field names', () => {
      const response = `{
        "results": [
          {
            "new_fact_id": "new-1",
            "contradictions": [
              { "fact_id": "edge-1", "confidence": 0.9, "category": "FACTUAL", "conflict_description": "Test" }
            ],
            "reasoning": "OK",
            "suggested_resolution": "INVALIDATE_OLD"
          }
        ],
        "summary": "Done"
      }`;

      const result = parseBatchDetectContradictionsResponse(response, ['new-1']);

      expect(result.results[0]?.newFactId).toBe('new-1');
      expect(result.results[0]?.contradictions[0]?.factId).toBe('edge-1');
      expect(result.results[0]?.suggestedResolution).toBe('INVALIDATE_OLD');
    });
  });
});

// =============================================================================
// Category-Specific Handling Tests (Fase 17.2)
// =============================================================================

import {
  ResolutionAction,
  DEFAULT_CATEGORY_HANDLING,
  getResolutionAction,
  filterContradictionsByCategory,
  getContradictionNotification,
} from './detectContradictions';

describe('categoryHandling (Fase 17.2)', () => {
  describe('DEFAULT_CATEGORY_HANDLING', () => {
    it('should have config for all categories', () => {
      expect(DEFAULT_CATEGORY_HANDLING[ContradictionCategory.FACTUAL]).toBeDefined();
      expect(DEFAULT_CATEGORY_HANDLING[ContradictionCategory.ATTRIBUTE]).toBeDefined();
      expect(DEFAULT_CATEGORY_HANDLING[ContradictionCategory.TEMPORAL]).toBeDefined();
      expect(DEFAULT_CATEGORY_HANDLING[ContradictionCategory.SEMANTIC]).toBeDefined();
    });

    it('should auto-invalidate FACTUAL contradictions', () => {
      expect(DEFAULT_CATEGORY_HANDLING[ContradictionCategory.FACTUAL].action).toBe(
        ResolutionAction.AUTO_INVALIDATE
      );
    });

    it('should require confirmation for TEMPORAL contradictions', () => {
      expect(DEFAULT_CATEGORY_HANDLING[ContradictionCategory.TEMPORAL].action).toBe(
        ResolutionAction.REQUIRE_CONFIRMATION
      );
    });
  });

  describe('getResolutionAction', () => {
    it('should return AUTO_INVALIDATE for high confidence FACTUAL', () => {
      const contradiction: ContradictionDetail = {
        factId: 'edge-1',
        confidence: 0.95,
        category: ContradictionCategory.FACTUAL,
        conflictDescription: 'Test',
      };

      expect(getResolutionAction(contradiction)).toBe(ResolutionAction.AUTO_INVALIDATE);
    });

    it('should return WARN_ONLY for low confidence FACTUAL', () => {
      const contradiction: ContradictionDetail = {
        factId: 'edge-1',
        confidence: 0.75, // Below FACTUAL threshold of 0.8
        category: ContradictionCategory.FACTUAL,
        conflictDescription: 'Test',
      };

      expect(getResolutionAction(contradiction)).toBe(ResolutionAction.WARN_ONLY);
    });

    it('should return REQUIRE_CONFIRMATION for SEMANTIC', () => {
      const contradiction: ContradictionDetail = {
        factId: 'edge-1',
        confidence: 0.9,
        category: ContradictionCategory.SEMANTIC,
        conflictDescription: 'Test',
      };

      expect(getResolutionAction(contradiction)).toBe(ResolutionAction.REQUIRE_CONFIRMATION);
    });
  });

  describe('filterContradictionsByCategory', () => {
    it('should separate contradictions by action type', () => {
      const contradictions: ContradictionDetail[] = [
        {
          factId: 'edge-1',
          confidence: 0.95,
          category: ContradictionCategory.FACTUAL,
          conflictDescription: 'High FACTUAL',
        },
        {
          factId: 'edge-2',
          confidence: 0.75,
          category: ContradictionCategory.FACTUAL,
          conflictDescription: 'Low FACTUAL',
        },
        {
          factId: 'edge-3',
          confidence: 0.9,
          category: ContradictionCategory.TEMPORAL,
          conflictDescription: 'TEMPORAL',
        },
        {
          factId: 'edge-4',
          confidence: 0.8,
          category: ContradictionCategory.ATTRIBUTE,
          conflictDescription: 'ATTRIBUTE',
        },
      ];

      const filtered = filterContradictionsByCategory(contradictions);

      // High confidence FACTUAL and ATTRIBUTE should auto-invalidate
      expect(filtered.toAutoInvalidate.map((c) => c.factId)).toContain('edge-1');
      expect(filtered.toAutoInvalidate.map((c) => c.factId)).toContain('edge-4');

      // TEMPORAL should require confirmation
      expect(filtered.toConfirm.map((c) => c.factId)).toContain('edge-3');

      // Low confidence FACTUAL should warn only
      expect(filtered.toWarn.map((c) => c.factId)).toContain('edge-2');
    });

    it('should return empty arrays when no contradictions', () => {
      const filtered = filterContradictionsByCategory([]);

      expect(filtered.toAutoInvalidate).toEqual([]);
      expect(filtered.toConfirm).toEqual([]);
      expect(filtered.toWarn).toEqual([]);
      expect(filtered.toSkip).toEqual([]);
    });
  });

  describe('getContradictionNotification', () => {
    it('should generate notification from template', () => {
      const contradiction: ContradictionDetail = {
        factId: 'edge-123',
        confidence: 0.95,
        category: ContradictionCategory.FACTUAL,
        conflictDescription: 'Jan now works at different company',
      };

      const notification = getContradictionNotification(contradiction);

      expect(notification).toContain('Jan now works at different company');
      expect(notification).toContain('Factual');
    });

    it('should replace all placeholders', () => {
      const contradiction: ContradictionDetail = {
        factId: 'edge-456',
        confidence: 0.85,
        category: ContradictionCategory.ATTRIBUTE,
        conflictDescription: 'Color changed',
      };

      const notification = getContradictionNotification(contradiction);

      expect(notification).toContain('Color changed');
    });
  });
});
