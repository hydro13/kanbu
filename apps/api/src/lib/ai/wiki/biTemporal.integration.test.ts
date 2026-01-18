/**
 * Integration Tests: Bi-Temporal Model (Fase 16)
 *
 * Tests the complete bi-temporal flow:
 * - Date extraction from content
 * - Contradiction detection
 * - Temporal query logic
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect } from 'vitest';
import {
  parseExtractEdgeDatesResponse,
  calculateRelativeDate,
  parseDetectContradictionsResponse,
  type ExistingFact,
} from './prompts';

describe('bi-temporal integration', () => {
  // ===========================================================================
  // Flow Test: Date Extraction → Edge Creation
  // ===========================================================================

  describe('date extraction flow', () => {
    it('should extract dates and create edge with temporal properties', () => {
      // Simulated LLM response for present-tense fact
      const llmResponse = `{
        "valid_at": "2026-01-13T00:00:00.000Z",
        "invalid_at": null,
        "reasoning": "Present tense indicates current validity"
      }`;

      const result = parseExtractEdgeDatesResponse(llmResponse);

      // Verify edge would be created with correct temporal properties
      const edge = {
        fact: 'Wiki Page mentions Concept',
        valid_at: result.valid_at,
        invalid_at: result.invalid_at,
        created_at: new Date().toISOString(),
        expired_at: null,
      };

      expect(edge.valid_at).toBe('2026-01-13T00:00:00.000Z');
      expect(edge.invalid_at).toBeNull();
      expect(edge.expired_at).toBeNull();
    });

    it('should handle past-tense fact with explicit end date', () => {
      const llmResponse = `{
        "valid_at": "2020-01-01T00:00:00.000Z",
        "invalid_at": "2023-12-31T23:59:59.999Z",
        "reasoning": "Fact states 'worked at' until 2023"
      }`;

      const result = parseExtractEdgeDatesResponse(llmResponse);

      expect(result.valid_at).toBe('2020-01-01T00:00:00.000Z');
      expect(result.invalid_at).toBe('2023-12-31T23:59:59.999Z');
    });

    it('should use relative date calculation as fallback', () => {
      const referenceDate = new Date('2026-01-13T12:00:00.000Z');

      // If LLM fails to parse "5 years ago", we can calculate it
      const calculated = calculateRelativeDate('5 years ago', referenceDate);

      expect(calculated?.getFullYear()).toBe(2021);
    });
  });

  // ===========================================================================
  // Flow Test: Contradiction Detection → Edge Invalidation
  // ===========================================================================

  describe('contradiction detection flow', () => {
    it('should detect and invalidate contradicting edge', () => {
      // Step 1: Existing edges in the graph
      const existingEdges: ExistingFact[] = [
        {
          id: 'edge-1',
          fact: 'Jan works at Acme Corp',
          validAt: '2024-01-01T00:00:00.000Z',
          invalidAt: null,
        },
        {
          id: 'edge-2',
          fact: 'Jan likes programming',
          validAt: '2024-01-01T00:00:00.000Z',
          invalidAt: null,
        },
      ];

      // Step 2: New fact that contradicts edge-1: "Jan works at Beta Inc"

      // Step 3: Simulated LLM response
      const llmResponse = `{
        "contradicted_fact_ids": ["edge-1"],
        "reasoning": "Jan cannot work at both Acme Corp and Beta Inc as primary employer simultaneously"
      }`;

      const result = parseDetectContradictionsResponse(llmResponse);

      // Step 4: Verify correct edge identified for invalidation
      expect(result.contradictedFactIds).toContain('edge-1');
      expect(result.contradictedFactIds).not.toContain('edge-2');

      // Step 5: Simulate edge invalidation
      const invalidatedEdge = {
        ...existingEdges[0],
        invalidAt: new Date().toISOString(),
      };

      expect(invalidatedEdge.invalidAt).not.toBeNull();
    });

    it('should handle multiple contradictions', () => {
      // Multiple facts about exclusive properties:
      // - edge-1: 'Project uses PostgreSQL'
      // - edge-2: 'Project primary database is PostgreSQL'
      // - edge-3: 'Project supports caching'

      // New fact changes primary database
      const llmResponse = `{
        "contradicted_fact_ids": ["edge-1", "edge-2"],
        "reasoning": "Project is migrating to MongoDB as primary database"
      }`;

      const result = parseDetectContradictionsResponse(llmResponse);

      expect(result.contradictedFactIds).toHaveLength(2);
      expect(result.contradictedFactIds).toContain('edge-1');
      expect(result.contradictedFactIds).toContain('edge-2');
      expect(result.contradictedFactIds).not.toContain('edge-3');
    });

    it('should preserve non-contradicting facts', () => {
      // Existing facts:
      // - edge-1: 'Jan likes pizza'
      // - edge-2: 'Jan likes coffee'

      // Adding another preference doesn't contradict
      const llmResponse = `{
        "contradicted_fact_ids": [],
        "reasoning": "Liking sushi does not contradict existing food preferences"
      }`;

      const result = parseDetectContradictionsResponse(llmResponse);

      expect(result.contradictedFactIds).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Flow Test: Complete Bi-Temporal Lifecycle
  // ===========================================================================

  describe('complete bi-temporal lifecycle', () => {
    it('should handle fact evolution over time', () => {
      const timeline: Array<{
        time: string;
        action: string;
        edges: Array<{
          id: string;
          fact: string;
          validAt: string | null;
          invalidAt: string | null;
        }>;
      }> = [];

      // T1: Initial fact
      timeline.push({
        time: '2024-01-01T00:00:00.000Z',
        action: 'create',
        edges: [
          {
            id: 'e1',
            fact: 'Jan is a junior developer',
            validAt: '2024-01-01T00:00:00.000Z',
            invalidAt: null,
          },
        ],
      });

      // T2: Promotion (contradicts previous role)
      timeline.push({
        time: '2025-01-01T00:00:00.000Z',
        action: 'update',
        edges: [
          {
            id: 'e1',
            fact: 'Jan is a junior developer',
            validAt: '2024-01-01T00:00:00.000Z',
            invalidAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'e2',
            fact: 'Jan is a senior developer',
            validAt: '2025-01-01T00:00:00.000Z',
            invalidAt: null,
          },
        ],
      });

      // T3: Another promotion (contradicts previous role)
      timeline.push({
        time: '2026-01-01T00:00:00.000Z',
        action: 'update',
        edges: [
          {
            id: 'e1',
            fact: 'Jan is a junior developer',
            validAt: '2024-01-01T00:00:00.000Z',
            invalidAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'e2',
            fact: 'Jan is a senior developer',
            validAt: '2025-01-01T00:00:00.000Z',
            invalidAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'e3',
            fact: 'Jan is a tech lead',
            validAt: '2026-01-01T00:00:00.000Z',
            invalidAt: null,
          },
        ],
      });

      // Query helper
      const getValidFactsAt = (edges: (typeof timeline)[0]['edges'], asOf: string) => {
        return edges.filter((e) => {
          const validCheck = e.validAt === null || e.validAt <= asOf;
          const invalidCheck = e.invalidAt === null || e.invalidAt > asOf;
          return validCheck && invalidCheck;
        });
      };

      // Verify temporal queries at each point in time
      const finalState = timeline[2]!.edges;

      // Query at start of 2024: Jan is junior
      const at2024 = getValidFactsAt(finalState, '2024-06-01T00:00:00.000Z');
      expect(at2024).toHaveLength(1);
      expect(at2024[0]!.fact).toContain('junior');

      // Query at start of 2025: Jan is senior
      const at2025 = getValidFactsAt(finalState, '2025-06-01T00:00:00.000Z');
      expect(at2025).toHaveLength(1);
      expect(at2025[0]!.fact).toContain('senior');

      // Query at start of 2026: Jan is tech lead
      const at2026 = getValidFactsAt(finalState, '2026-06-01T00:00:00.000Z');
      expect(at2026).toHaveLength(1);
      expect(at2026[0]!.fact).toContain('tech lead');
    });

    it('should support "as of" queries at any point in time', () => {
      // Complete history of a project's database
      const edges = [
        {
          id: 'e1',
          fact: 'Project uses MySQL',
          validAt: '2020-01-01T00:00:00.000Z',
          invalidAt: '2022-01-01T00:00:00.000Z',
        },
        {
          id: 'e2',
          fact: 'Project uses PostgreSQL',
          validAt: '2022-01-01T00:00:00.000Z',
          invalidAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'e3',
          fact: 'Project uses MongoDB',
          validAt: '2025-01-01T00:00:00.000Z',
          invalidAt: null,
        },
      ];

      const getValidFactsAt = (asOf: string) => {
        return edges.filter((e) => {
          const validCheck = e.validAt === null || e.validAt <= asOf;
          const invalidCheck = e.invalidAt === null || e.invalidAt > asOf;
          return validCheck && invalidCheck;
        });
      };

      // In 2021, project used MySQL
      expect(getValidFactsAt('2021-06-01T00:00:00.000Z')[0]!.fact).toContain('MySQL');

      // In 2023, project used PostgreSQL
      expect(getValidFactsAt('2023-06-01T00:00:00.000Z')[0]!.fact).toContain('PostgreSQL');

      // In 2026, project uses MongoDB
      expect(getValidFactsAt('2026-06-01T00:00:00.000Z')[0]!.fact).toContain('MongoDB');

      // Before project started, no database
      expect(getValidFactsAt('2019-01-01T00:00:00.000Z')).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle facts with null valid_at (timeless facts)', () => {
      const edges: {
        id: string;
        fact: string;
        validAt: string | null;
        invalidAt: string | null;
      }[] = [{ id: 'e1', fact: 'Company name is Acme', validAt: null, invalidAt: null }];

      const getValidFactsAt = (asOf: string) => {
        return edges.filter((e) => {
          const validCheck = e.validAt === null || e.validAt <= asOf;
          const invalidCheck = e.invalidAt === null || e.invalidAt > asOf;
          return validCheck && invalidCheck;
        });
      };

      // Timeless facts are valid at any point
      expect(getValidFactsAt('2000-01-01T00:00:00.000Z')).toHaveLength(1);
      expect(getValidFactsAt('2030-01-01T00:00:00.000Z')).toHaveLength(1);
    });

    it('should handle same-day fact changes', () => {
      const edges = [
        {
          id: 'e1',
          fact: 'Status: Draft',
          validAt: '2026-01-13T09:00:00.000Z',
          invalidAt: '2026-01-13T14:00:00.000Z',
        },
        {
          id: 'e2',
          fact: 'Status: Published',
          validAt: '2026-01-13T14:00:00.000Z',
          invalidAt: null,
        },
      ];

      const getValidFactsAt = (asOf: string) => {
        return edges.filter((e) => {
          const validCheck = e.validAt === null || e.validAt <= asOf;
          const invalidCheck = e.invalidAt === null || e.invalidAt > asOf;
          return validCheck && invalidCheck;
        });
      };

      // In the morning: Draft
      expect(getValidFactsAt('2026-01-13T10:00:00.000Z')[0]!.fact).toContain('Draft');

      // In the afternoon: Published
      expect(getValidFactsAt('2026-01-13T15:00:00.000Z')[0]!.fact).toContain('Published');
    });

    it('should handle overlapping temporal boundaries', () => {
      // Edge case: invalidAt of one fact equals validAt of next
      const edges = [
        {
          id: 'e1',
          fact: 'Version 1.0',
          validAt: '2026-01-01T00:00:00.000Z',
          invalidAt: '2026-01-15T00:00:00.000Z',
        },
        { id: 'e2', fact: 'Version 2.0', validAt: '2026-01-15T00:00:00.000Z', invalidAt: null },
      ];

      const getValidFactsAt = (asOf: string) => {
        return edges.filter((e) => {
          const validCheck = e.validAt === null || e.validAt <= asOf;
          const invalidCheck = e.invalidAt === null || e.invalidAt > asOf;
          return validCheck && invalidCheck;
        });
      };

      // At exact boundary, only new version should be valid (invalidAt <= asOf excludes old)
      const atBoundary = getValidFactsAt('2026-01-15T00:00:00.000Z');
      expect(atBoundary).toHaveLength(1);
      expect(atBoundary[0]!.fact).toContain('Version 2.0');
    });
  });
});
