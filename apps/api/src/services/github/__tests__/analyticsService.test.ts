/*
 * Analytics Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub analytics calculations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 13 - Analytics & Insights
 * =============================================================================
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../lib/prisma';
import {
  getCycleTimeStats,
  getReviewTimeStats,
  getContributorStats,
  getThroughputStats,
  getProjectAnalytics,
} from '../analyticsService';

// Mock Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    gitHubRepository: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    gitHubPullRequest: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    gitHubCommit: {
      groupBy: vi.fn(),
    },
    gitHubReview: {
      groupBy: vi.fn(),
    },
    gitHubReviewComment: {
      groupBy: vi.fn(),
    },
    gitHubIssue: {
      findMany: vi.fn(),
    },
  },
}));

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // getCycleTimeStats
  // ===========================================================================

  describe('getCycleTimeStats', () => {
    it('should return empty stats when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await getCycleTimeStats(1);

      expect(result).toEqual({
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        totalCompleted: 0,
        byWeek: [],
      });
    });

    it('should return empty stats when no merged PRs', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([]);

      const result = await getCycleTimeStats(1);

      expect(result.totalCompleted).toBe(0);
    });

    it('should calculate correct cycle time statistics', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([
        {
          id: 1,
          taskId: 1,
          mergedAt: now,
          task: { createdAt: threeDaysAgo },
        },
        {
          id: 2,
          taskId: 2,
          mergedAt: now,
          task: { createdAt: fiveDaysAgo },
        },
        {
          id: 3,
          taskId: 3,
          mergedAt: now,
          task: { createdAt: sevenDaysAgo },
        },
      ] as any);

      const result = await getCycleTimeStats(1);

      expect(result.totalCompleted).toBe(3);
      expect(result.averageDays).toBe(5); // (3+5+7)/3 = 5
      expect(result.medianDays).toBe(5); // middle value
      expect(result.minDays).toBe(3);
      expect(result.maxDays).toBe(7);
    });
  });

  // ===========================================================================
  // getReviewTimeStats
  // ===========================================================================

  describe('getReviewTimeStats', () => {
    it('should return empty stats when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await getReviewTimeStats(1);

      expect(result).toEqual({
        averageHoursToFirstReview: 0,
        averageHoursToApproval: 0,
        averageReviewsPerPR: 0,
        averageCommentsPerReview: 0,
        totalPRsReviewed: 0,
      });
    });

    it('should calculate review time statistics', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([
        {
          id: 1,
          createdAt: sixHoursAgo,
          reviews: [
            {
              id: 1,
              state: 'COMMENTED',
              submittedAt: fourHoursAgo,
              comments: [{ id: 1 }, { id: 2 }],
            },
            {
              id: 2,
              state: 'APPROVED',
              submittedAt: twoHoursAgo,
              comments: [],
            },
          ],
        },
      ] as any);

      const result = await getReviewTimeStats(1);

      expect(result.totalPRsReviewed).toBe(1);
      expect(result.averageReviewsPerPR).toBe(2);
      expect(result.averageHoursToFirstReview).toBe(2); // 6h - 4h = 2h
      expect(result.averageHoursToApproval).toBe(4); // 6h - 2h = 4h
      expect(result.averageCommentsPerReview).toBe(1); // 2 comments / 2 reviews
    });
  });

  // ===========================================================================
  // getContributorStats
  // ===========================================================================

  describe('getContributorStats', () => {
    it('should return empty array when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await getContributorStats(1);

      expect(result).toEqual([]);
    });

    it('should aggregate contributor statistics', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);

      vi.mocked(prisma.gitHubCommit.groupBy).mockResolvedValue([
        { authorLogin: 'user1', _count: { id: 10 } },
        { authorLogin: 'user2', _count: { id: 5 } },
      ] as any);

      vi.mocked(prisma.gitHubPullRequest.groupBy)
        .mockResolvedValueOnce([
          // PRs opened
          { authorLogin: 'user1', _count: { id: 3 } },
          { authorLogin: 'user2', _count: { id: 2 } },
        ] as any)
        .mockResolvedValueOnce([
          // PRs merged
          { authorLogin: 'user1', _count: { id: 2 } },
        ] as any);

      vi.mocked(prisma.gitHubReview.groupBy).mockResolvedValue([
        { authorLogin: 'user2', _count: { id: 5 } },
      ] as any);

      vi.mocked(prisma.gitHubReviewComment.groupBy).mockResolvedValue([
        { authorLogin: 'user2', _count: { id: 8 } },
      ] as any);

      const result = await getContributorStats(1);

      expect(result).toHaveLength(2);

      const user1 = result.find((c) => c.login === 'user1');
      expect(user1).toBeDefined();
      expect(user1!.commits).toBe(10);
      expect(user1!.prsOpened).toBe(3);
      expect(user1!.prsMerged).toBe(2);

      const user2 = result.find((c) => c.login === 'user2');
      expect(user2).toBeDefined();
      expect(user2!.commits).toBe(5);
      expect(user2!.reviewsGiven).toBe(5);
      expect(user2!.commentsGiven).toBe(8);
    });

    it('should sort contributors by total activity', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);

      vi.mocked(prisma.gitHubCommit.groupBy).mockResolvedValue([
        { authorLogin: 'low-activity', _count: { id: 1 } },
        { authorLogin: 'high-activity', _count: { id: 100 } },
      ] as any);

      vi.mocked(prisma.gitHubPullRequest.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.gitHubReview.groupBy).mockResolvedValue([] as any);
      vi.mocked(prisma.gitHubReviewComment.groupBy).mockResolvedValue([] as any);

      const result = await getContributorStats(1);

      expect(result[0]!.login).toBe('high-activity');
      expect(result[1]!.login).toBe('low-activity');
    });
  });

  // ===========================================================================
  // getThroughputStats
  // ===========================================================================

  describe('getThroughputStats', () => {
    it('should return empty array when no repository linked', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue(null);

      const result = await getThroughputStats(1);

      expect(result).toEqual([]);
    });

    it('should calculate weekly throughput', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);

      const now = new Date();

      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([
        { mergedAt: now, taskId: 1 },
        { mergedAt: now, taskId: 2 },
        { mergedAt: now, taskId: null },
      ] as any);

      vi.mocked(prisma.gitHubIssue.findMany).mockResolvedValue([{ updatedAt: now }] as any);

      const result = await getThroughputStats(1, 'week');

      expect(result.length).toBeGreaterThan(0);
      const latestPeriod = result[result.length - 1]!;
      expect(latestPeriod.prsMerged).toBe(3);
      expect(latestPeriod.tasksCompleted).toBe(2); // Only PRs with taskId
      expect(latestPeriod.issuesClosed).toBe(1);
    });
  });

  // ===========================================================================
  // getProjectAnalytics
  // ===========================================================================

  describe('getProjectAnalytics', () => {
    it('should return combined analytics', async () => {
      vi.mocked(prisma.gitHubRepository.findFirst).mockResolvedValue({
        id: 1,
        projectId: 1,
      } as any);
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.gitHubCommit.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.gitHubPullRequest.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.gitHubReview.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.gitHubReviewComment.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.gitHubIssue.findMany).mockResolvedValue([]);

      const result = await getProjectAnalytics(1);

      expect(result).toHaveProperty('cycleTime');
      expect(result).toHaveProperty('reviewTime');
      expect(result).toHaveProperty('contributors');
      expect(result).toHaveProperty('throughput');
    });
  });
});
