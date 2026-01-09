/*
 * Milestone Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub milestone sync operations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 11 - Geavanceerde Sync
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../../../lib/prisma'
import {
  upsertMilestone,
  getMilestones,
  getMilestoneByNumber,
  getProjectMilestones,
  getMilestoneStats,
  deleteMilestone,
  syncMilestoneFromWebhook,
} from '../milestoneService'

// Mock Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    gitHubMilestone: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    gitHubRepository: {
      findUnique: vi.fn(),
    },
  },
}))

describe('milestoneService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // upsertMilestone
  // ===========================================================================

  describe('upsertMilestone', () => {
    it('should create or update a milestone', async () => {
      vi.mocked(prisma.gitHubMilestone.upsert).mockResolvedValue({ id: 1 } as any)

      const result = await upsertMilestone({
        repositoryId: 1,
        milestoneNumber: 1,
        milestoneId: BigInt(12345),
        title: 'v1.0.0',
        description: 'First release',
        state: 'open',
        dueOn: new Date('2026-02-01'),
        openIssues: 5,
        closedIssues: 10,
        htmlUrl: 'https://github.com/owner/repo/milestone/1',
      })

      expect(result).toEqual({ id: 1 })
      expect(prisma.gitHubMilestone.upsert).toHaveBeenCalledWith({
        where: {
          repositoryId_milestoneNumber: {
            repositoryId: 1,
            milestoneNumber: 1,
          },
        },
        create: expect.objectContaining({
          repositoryId: 1,
          milestoneNumber: 1,
          title: 'v1.0.0',
          state: 'open',
        }),
        update: expect.objectContaining({
          title: 'v1.0.0',
          state: 'open',
        }),
        select: { id: true },
      })
    })
  })

  // ===========================================================================
  // getMilestones
  // ===========================================================================

  describe('getMilestones', () => {
    it('should return milestones with progress calculation', async () => {
      vi.mocked(prisma.gitHubMilestone.findMany).mockResolvedValue([
        {
          id: 1,
          repositoryId: 1,
          milestoneNumber: 1,
          milestoneId: BigInt(12345),
          title: 'v1.0.0',
          description: 'First release',
          state: 'open',
          dueOn: new Date('2026-02-01'),
          closedAt: null,
          openIssues: 3,
          closedIssues: 7,
          htmlUrl: 'https://github.com/owner/repo/milestone/1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      const result = await getMilestones(1)

      expect(result).toHaveLength(1)
      expect(result[0].progress).toBe(70) // 7/(3+7) * 100 = 70%
    })

    it('should filter by state', async () => {
      vi.mocked(prisma.gitHubMilestone.findMany).mockResolvedValue([])

      await getMilestones(1, { state: 'open' })

      expect(prisma.gitHubMilestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repositoryId: 1, state: 'open' },
        })
      )
    })

    it('should handle zero issues without division by zero', async () => {
      vi.mocked(prisma.gitHubMilestone.findMany).mockResolvedValue([
        {
          id: 1,
          repositoryId: 1,
          milestoneNumber: 1,
          milestoneId: BigInt(12345),
          title: 'Empty milestone',
          description: null,
          state: 'open',
          dueOn: null,
          closedAt: null,
          openIssues: 0,
          closedIssues: 0,
          htmlUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      const result = await getMilestones(1)

      expect(result[0].progress).toBe(0)
    })
  })

  // ===========================================================================
  // getMilestoneByNumber
  // ===========================================================================

  describe('getMilestoneByNumber', () => {
    it('should return a single milestone with progress', async () => {
      vi.mocked(prisma.gitHubMilestone.findUnique).mockResolvedValue({
        id: 1,
        repositoryId: 1,
        milestoneNumber: 1,
        milestoneId: BigInt(12345),
        title: 'v1.0.0',
        description: 'First release',
        state: 'closed',
        dueOn: new Date('2026-02-01'),
        closedAt: new Date('2026-01-31'),
        openIssues: 0,
        closedIssues: 10,
        htmlUrl: 'https://github.com/owner/repo/milestone/1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const result = await getMilestoneByNumber(1, 1)

      expect(result).not.toBeNull()
      expect(result!.title).toBe('v1.0.0')
      expect(result!.progress).toBe(100)
    })

    it('should return null when milestone not found', async () => {
      vi.mocked(prisma.gitHubMilestone.findUnique).mockResolvedValue(null)

      const result = await getMilestoneByNumber(1, 999)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // getProjectMilestones
  // ===========================================================================

  describe('getProjectMilestones', () => {
    it('should return empty array when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findUnique).mockResolvedValue(null)

      const result = await getProjectMilestones(1)

      expect(result).toEqual([])
    })

    it('should return milestones for linked repository', async () => {
      vi.mocked(prisma.gitHubRepository.findUnique).mockResolvedValue({ id: 1 } as any)
      vi.mocked(prisma.gitHubMilestone.findMany).mockResolvedValue([
        {
          id: 1,
          repositoryId: 1,
          milestoneNumber: 1,
          milestoneId: BigInt(12345),
          title: 'v1.0.0',
          description: null,
          state: 'open',
          dueOn: null,
          closedAt: null,
          openIssues: 5,
          closedIssues: 5,
          htmlUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any)

      const result = await getProjectMilestones(1)

      expect(result).toHaveLength(1)
      expect(result[0].progress).toBe(50)
    })
  })

  // ===========================================================================
  // getMilestoneStats
  // ===========================================================================

  describe('getMilestoneStats', () => {
    it('should return zero stats when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findUnique).mockResolvedValue(null)

      const result = await getMilestoneStats(1)

      expect(result).toEqual({
        total: 0,
        open: 0,
        closed: 0,
        overdue: 0,
        upcomingDue: 0,
      })
    })

    it('should return aggregated stats', async () => {
      vi.mocked(prisma.gitHubRepository.findUnique).mockResolvedValue({ id: 1 } as any)
      vi.mocked(prisma.gitHubMilestone.count)
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // open
        .mockResolvedValueOnce(4) // closed
        .mockResolvedValueOnce(2) // overdue
        .mockResolvedValueOnce(1) // upcomingDue

      const result = await getMilestoneStats(1)

      expect(result).toEqual({
        total: 10,
        open: 6,
        closed: 4,
        overdue: 2,
        upcomingDue: 1,
      })
    })
  })

  // ===========================================================================
  // syncMilestoneFromWebhook
  // ===========================================================================

  describe('syncMilestoneFromWebhook', () => {
    it('should upsert milestone on create/edit action', async () => {
      vi.mocked(prisma.gitHubMilestone.upsert).mockResolvedValue({ id: 1 } as any)

      const result = await syncMilestoneFromWebhook(1, 'created', {
        number: 1,
        id: 12345,
        title: 'v1.0.0',
        description: 'First release',
        state: 'open',
        due_on: '2026-02-01T00:00:00Z',
        closed_at: null,
        open_issues: 5,
        closed_issues: 10,
        html_url: 'https://github.com/owner/repo/milestone/1',
      })

      expect(result).toEqual({ id: 1 })
      expect(prisma.gitHubMilestone.upsert).toHaveBeenCalled()
    })

    it('should delete milestone on delete action', async () => {
      vi.mocked(prisma.gitHubMilestone.delete).mockResolvedValue({ id: 1 } as any)

      const result = await syncMilestoneFromWebhook(1, 'deleted', {
        number: 1,
        id: 12345,
        title: 'v1.0.0',
        state: 'open',
        open_issues: 0,
        closed_issues: 0,
        html_url: 'https://github.com/owner/repo/milestone/1',
      })

      expect(result).toBeNull()
      expect(prisma.gitHubMilestone.delete).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // deleteMilestone
  // ===========================================================================

  describe('deleteMilestone', () => {
    it('should delete a milestone', async () => {
      vi.mocked(prisma.gitHubMilestone.delete).mockResolvedValue({ id: 1 } as any)

      await deleteMilestone(1, 1)

      expect(prisma.gitHubMilestone.delete).toHaveBeenCalledWith({
        where: {
          repositoryId_milestoneNumber: {
            repositoryId: 1,
            milestoneNumber: 1,
          },
        },
      })
    })
  })
})
