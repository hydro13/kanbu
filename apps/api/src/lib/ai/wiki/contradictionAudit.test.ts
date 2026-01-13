/**
 * Unit Tests: Contradiction Audit Service (Fase 17.3)
 *
 * Tests for the contradiction audit trail functionality.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ContradictionAuditService,
  ResolutionStrategy,
  DEFAULT_RESOLUTION_STRATEGIES,
  DEFAULT_WORKSPACE_RESOLUTION_CONFIG,
  type LogContradictionInput,
  type ContradictionAuditEntry,
} from './contradictionAudit'
import { ContradictionCategory } from './prompts'

// =============================================================================
// Mock Prisma Client
// =============================================================================

const createMockPrisma = () => {
  let auditIdCounter = 1
  const audits = new Map<number, any>()

  return {
    wikiContradictionAudit: {
      create: vi.fn().mockImplementation(({ data }) => {
        const id = auditIdCounter++
        const audit = {
          id,
          ...data,
          createdAt: new Date(),
          revertedAt: null,
          revertedBy: null,
        }
        audits.set(id, audit)
        return Promise.resolve(audit)
      }),
      findMany: vi.fn().mockImplementation(({ where }) => {
        const results = Array.from(audits.values()).filter((a) => {
          if (where?.wikiPageId !== undefined && a.wikiPageId !== where.wikiPageId) return false
          if (where?.workspaceId !== undefined && a.workspaceId !== where.workspaceId) return false
          if (where?.projectId !== undefined && a.projectId !== where.projectId) return false
          // Handle revertedAt filter
          if (where?.revertedAt === null && a.revertedAt !== null) return false
          return true
        })
        return Promise.resolve(results)
      }),
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return Promise.resolve(audits.get(where.id) ?? null)
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const audit = audits.get(where.id)
        if (audit) {
          Object.assign(audit, data)
        }
        return Promise.resolve(audit)
      }),
    },
    workspace: {
      findUnique: vi.fn().mockResolvedValue({
        id: 1,
        settings: {},
      }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    },
    _audits: audits,
    _resetAudits: () => {
      audits.clear()
      auditIdCounter = 1
    },
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('ContradictionAuditService', () => {
  let service: ContradictionAuditService
  let mockPrisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    service = new ContradictionAuditService(mockPrisma as any)
  })

  // ===========================================================================
  // ResolutionStrategy Enum Tests
  // ===========================================================================

  describe('ResolutionStrategy', () => {
    it('should have all expected values', () => {
      expect(ResolutionStrategy.INVALIDATE_OLD).toBe('INVALIDATE_OLD')
      expect(ResolutionStrategy.INVALIDATE_NEW).toBe('INVALIDATE_NEW')
      expect(ResolutionStrategy.KEEP_BOTH).toBe('KEEP_BOTH')
      expect(ResolutionStrategy.MERGE).toBe('MERGE')
      expect(ResolutionStrategy.ASK_USER).toBe('ASK_USER')
    })
  })

  // ===========================================================================
  // Default Strategies Tests
  // ===========================================================================

  describe('DEFAULT_RESOLUTION_STRATEGIES', () => {
    it('should have strategy for each category', () => {
      expect(DEFAULT_RESOLUTION_STRATEGIES[ContradictionCategory.FACTUAL]).toBe(ResolutionStrategy.INVALIDATE_OLD)
      expect(DEFAULT_RESOLUTION_STRATEGIES[ContradictionCategory.ATTRIBUTE]).toBe(ResolutionStrategy.INVALIDATE_OLD)
      expect(DEFAULT_RESOLUTION_STRATEGIES[ContradictionCategory.TEMPORAL]).toBe(ResolutionStrategy.ASK_USER)
      expect(DEFAULT_RESOLUTION_STRATEGIES[ContradictionCategory.SEMANTIC]).toBe(ResolutionStrategy.ASK_USER)
    })
  })

  // ===========================================================================
  // logContradictionResolution Tests
  // ===========================================================================

  describe('logContradictionResolution', () => {
    it('should create an audit entry with correct data', async () => {
      const input: LogContradictionInput = {
        workspaceId: 1,
        projectId: 10,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-new-123',
        newFact: 'Jan works at TechStart',
        invalidatedFacts: [
          { id: 'edge-old-456', fact: 'Jan works at Acme' },
        ],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.95,
        category: ContradictionCategory.FACTUAL,
        reasoning: 'Employment facts are mutually exclusive',
      }

      const result = await service.logContradictionResolution(input)

      expect(result.id).toBeDefined()
      expect(result.workspaceId).toBe(1)
      expect(result.projectId).toBe(10)
      expect(result.wikiPageId).toBe(100)
      expect(result.userId).toBe(5)
      expect(result.newFactId).toBe('edge-new-123')
      expect(result.newFact).toBe('Jan works at TechStart')
      expect(result.invalidatedFacts).toHaveLength(1)
      expect(result.invalidatedFacts[0].id).toBe('edge-old-456')
      expect(result.strategy).toBe(ResolutionStrategy.INVALIDATE_OLD)
      expect(result.confidence).toBe(0.95)
      expect(result.category).toBe(ContradictionCategory.FACTUAL)
      expect(result.reasoning).toBe('Employment facts are mutually exclusive')
      expect(result.canRevert).toBe(true)
    })

    it('should set correct revert expiry based on window hours', async () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const input: LogContradictionInput = {
        workspaceId: 1,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-new',
        newFact: 'Test fact',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
        revertWindowHours: 48, // Custom 48h window
      }

      const result = await service.logContradictionResolution(input)

      const expectedExpiry = new Date(now + 48 * 60 * 60 * 1000)
      expect(result.revertExpiresAt.getTime()).toBe(expectedExpiry.getTime())

      vi.useRealTimers()
    })

    it('should handle workspace wiki (null projectId)', async () => {
      const input: LogContradictionInput = {
        workspaceId: 1,
        // No projectId - workspace wiki
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-new',
        newFact: 'Test fact',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
      }

      const result = await service.logContradictionResolution(input)

      expect(result.projectId).toBeNull()
    })
  })

  // ===========================================================================
  // getAuditEntriesForPage Tests
  // ===========================================================================

  describe('getAuditEntriesForPage', () => {
    it('should return audit entries for a specific page', async () => {
      // Create some audits
      await service.logContradictionResolution({
        workspaceId: 1,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-1',
        newFact: 'Fact 1',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
      })

      await service.logContradictionResolution({
        workspaceId: 1,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-2',
        newFact: 'Fact 2',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.8,
        category: ContradictionCategory.ATTRIBUTE,
      })

      const results = await service.getAuditEntriesForPage(100)

      expect(results).toHaveLength(2)
    })
  })

  // ===========================================================================
  // canRevertAudit Tests
  // ===========================================================================

  describe('canRevertAudit', () => {
    it('should allow revert within window', () => {
      const audit: ContradictionAuditEntry = {
        id: 1,
        workspaceId: 1,
        projectId: null,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-1',
        newFact: 'Test',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
        reasoning: null,
        createdAt: new Date(),
        revertedAt: null,
        revertedBy: null,
        revertExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        canRevert: true,
      }

      const result = service.canRevertAudit(audit)

      expect(result.canRevert).toBe(true)
    })

    it('should not allow revert after window expired', () => {
      const audit: ContradictionAuditEntry = {
        id: 1,
        workspaceId: 1,
        projectId: null,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-1',
        newFact: 'Test',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
        reasoning: null,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h ago
        revertedAt: null,
        revertedBy: null,
        revertExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago (expired)
        canRevert: false,
      }

      const result = service.canRevertAudit(audit)

      expect(result.canRevert).toBe(false)
      expect(result.reason).toBe('Revert window expired')
    })

    it('should not allow revert if already reverted', () => {
      const audit: ContradictionAuditEntry = {
        id: 1,
        workspaceId: 1,
        projectId: null,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-1',
        newFact: 'Test',
        invalidatedFacts: [],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
        reasoning: null,
        createdAt: new Date(),
        revertedAt: new Date(), // Already reverted
        revertedBy: 10,
        revertExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        canRevert: false,
      }

      const result = service.canRevertAudit(audit)

      expect(result.canRevert).toBe(false)
      expect(result.reason).toBe('Already reverted')
    })
  })

  // ===========================================================================
  // revertContradictionResolution Tests
  // ===========================================================================

  describe('revertContradictionResolution', () => {
    it('should revert and return edge IDs to restore', async () => {
      // Create an audit entry first
      const audit = await service.logContradictionResolution({
        workspaceId: 1,
        wikiPageId: 100,
        userId: 5,
        newFactId: 'edge-new',
        newFact: 'New fact',
        invalidatedFacts: [
          { id: 'edge-old-1', fact: 'Old fact 1' },
          { id: 'edge-old-2', fact: 'Old fact 2' },
        ],
        strategy: ResolutionStrategy.INVALIDATE_OLD,
        confidence: 0.9,
        category: ContradictionCategory.FACTUAL,
      })

      const result = await service.revertContradictionResolution(audit.id, 10)

      expect(result.success).toBe(true)
      expect(result.auditId).toBe(audit.id)
      expect(result.edgeIdsToRestore).toEqual(['edge-old-1', 'edge-old-2'])
    })

    it('should fail for non-existent audit', async () => {
      const result = await service.revertContradictionResolution(99999, 10)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Audit entry not found')
    })
  })

  // ===========================================================================
  // getStrategyForContradiction Tests
  // ===========================================================================

  describe('getStrategyForContradiction', () => {
    it('should return FACTUAL category default strategy', async () => {
      const result = await service.getStrategyForContradiction(
        1,
        ContradictionCategory.FACTUAL,
        0.9
      )

      expect(result.strategy).toBe(ResolutionStrategy.INVALIDATE_OLD)
      expect(result.autoResolve).toBe(true)
    })

    it('should return ASK_USER for TEMPORAL category', async () => {
      const result = await service.getStrategyForContradiction(
        1,
        ContradictionCategory.TEMPORAL,
        0.9
      )

      expect(result.strategy).toBe(ResolutionStrategy.ASK_USER)
      expect(result.autoResolve).toBe(false)
    })

    it('should not auto-resolve below confidence threshold', async () => {
      const result = await service.getStrategyForContradiction(
        1,
        ContradictionCategory.FACTUAL,
        0.5 // Below default threshold of 0.8
      )

      expect(result.strategy).toBe(ResolutionStrategy.INVALIDATE_OLD)
      expect(result.autoResolve).toBe(false)
      expect(result.reason).toContain('below threshold')
    })
  })

  // ===========================================================================
  // Default Config Tests
  // ===========================================================================

  describe('DEFAULT_WORKSPACE_RESOLUTION_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_WORKSPACE_RESOLUTION_CONFIG.defaultStrategy).toBe(ResolutionStrategy.INVALIDATE_OLD)
      expect(DEFAULT_WORKSPACE_RESOLUTION_CONFIG.autoResolveThreshold).toBe(0.8)
      expect(DEFAULT_WORKSPACE_RESOLUTION_CONFIG.revertWindowHours).toBe(24)
    })
  })
})
