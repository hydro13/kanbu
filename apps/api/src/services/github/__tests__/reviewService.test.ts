/*
 * Review Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub PR review tracking and management.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 12 - Code Review Integratie
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    gitHubReview: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    gitHubReviewComment: {
      upsert: vi.fn(),
    },
    gitHubPullRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock githubService
vi.mock('../githubService', () => ({
  getInstallationOctokit: vi.fn(),
}));

import { prisma } from '../../../lib/prisma';
import { getInstallationOctokit } from '../githubService';
import {
  upsertReview,
  upsertReviewComment,
  getReviewsForPR,
  getPRReviewSummary,
  getReviewsForTask,
  getTaskReviewSummary,
  requestReview,
  getSuggestedReviewers,
  getPendingReviewRequests,
  syncReviewsFromGitHub,
  type ReviewData,
  type ReviewCommentData,
} from '../reviewService';

// =============================================================================
// Test Data
// =============================================================================

const mockReviewData: ReviewData = {
  pullRequestId: 1,
  reviewId: BigInt(12345),
  authorLogin: 'reviewer1',
  state: 'APPROVED',
  body: 'LGTM!',
  htmlUrl: 'https://github.com/owner/repo/pull/1#pullrequestreview-12345',
  submittedAt: new Date('2026-01-09T10:00:00Z'),
};

const mockReviewCommentData: ReviewCommentData = {
  reviewId: 1,
  commentId: BigInt(67890),
  path: 'src/index.ts',
  line: 42,
  side: 'RIGHT',
  body: 'Consider using a constant here.',
  authorLogin: 'reviewer1',
  htmlUrl: 'https://github.com/owner/repo/pull/1#discussion_r67890',
};

const mockReview = {
  id: 1,
  pullRequestId: 1,
  reviewId: BigInt(12345),
  authorLogin: 'reviewer1',
  state: 'APPROVED',
  body: 'LGTM!',
  htmlUrl: 'https://github.com/owner/repo/pull/1#pullrequestreview-12345',
  submittedAt: new Date('2026-01-09T10:00:00Z'),
  createdAt: new Date('2026-01-09T10:00:00Z'),
  updatedAt: new Date('2026-01-09T10:00:00Z'),
  comments: [],
};

const mockReviewComment = {
  id: 1,
  reviewId: 1,
  commentId: BigInt(67890),
  path: 'src/index.ts',
  line: 42,
  side: 'RIGHT',
  body: 'Consider using a constant here.',
  authorLogin: 'reviewer1',
  htmlUrl: 'https://github.com/owner/repo/pull/1#discussion_r67890',
  createdAt: new Date('2026-01-09T10:00:00Z'),
  updatedAt: new Date('2026-01-09T10:00:00Z'),
};

// =============================================================================
// Test Suite
// =============================================================================

describe('reviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // upsertReview
  // ===========================================================================

  describe('upsertReview', () => {
    it('should create a new review', async () => {
      vi.mocked(prisma.gitHubReview.upsert).mockResolvedValue({ id: 1 } as any);

      const result = await upsertReview(mockReviewData);

      expect(result).toEqual({ id: 1 });
      expect(prisma.gitHubReview.upsert).toHaveBeenCalledWith({
        where: {
          pullRequestId_reviewId: {
            pullRequestId: 1,
            reviewId: BigInt(12345),
          },
        },
        create: {
          pullRequestId: 1,
          reviewId: BigInt(12345),
          authorLogin: 'reviewer1',
          state: 'APPROVED',
          body: 'LGTM!',
          htmlUrl: 'https://github.com/owner/repo/pull/1#pullrequestreview-12345',
          submittedAt: mockReviewData.submittedAt,
        },
        update: {
          state: 'APPROVED',
          body: 'LGTM!',
          htmlUrl: 'https://github.com/owner/repo/pull/1#pullrequestreview-12345',
          submittedAt: mockReviewData.submittedAt,
        },
        select: { id: true },
      });
    });

    it('should update an existing review', async () => {
      vi.mocked(prisma.gitHubReview.upsert).mockResolvedValue({ id: 1 } as any);

      const updatedData: ReviewData = {
        ...mockReviewData,
        state: 'CHANGES_REQUESTED',
        body: 'Please fix the issues',
      };

      const result = await upsertReview(updatedData);

      expect(result).toEqual({ id: 1 });
    });
  });

  // ===========================================================================
  // upsertReviewComment
  // ===========================================================================

  describe('upsertReviewComment', () => {
    it('should create a new review comment', async () => {
      vi.mocked(prisma.gitHubReviewComment.upsert).mockResolvedValue({ id: 1 } as any);

      const result = await upsertReviewComment(mockReviewCommentData);

      expect(result).toEqual({ id: 1 });
      expect(prisma.gitHubReviewComment.upsert).toHaveBeenCalledWith({
        where: {
          reviewId_commentId: {
            reviewId: 1,
            commentId: BigInt(67890),
          },
        },
        create: {
          reviewId: 1,
          commentId: BigInt(67890),
          path: 'src/index.ts',
          line: 42,
          side: 'RIGHT',
          body: 'Consider using a constant here.',
          authorLogin: 'reviewer1',
          htmlUrl: 'https://github.com/owner/repo/pull/1#discussion_r67890',
        },
        update: {
          path: 'src/index.ts',
          line: 42,
          side: 'RIGHT',
          body: 'Consider using a constant here.',
          htmlUrl: 'https://github.com/owner/repo/pull/1#discussion_r67890',
        },
        select: { id: true },
      });
    });
  });

  // ===========================================================================
  // getReviewsForPR
  // ===========================================================================

  describe('getReviewsForPR', () => {
    it('should return all reviews for a PR', async () => {
      const reviews = [
        { ...mockReview, comments: [mockReviewComment] },
        {
          ...mockReview,
          id: 2,
          reviewId: BigInt(12346),
          authorLogin: 'reviewer2',
          state: 'CHANGES_REQUESTED',
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.gitHubReview.findMany).mockResolvedValue(reviews as any);

      const result = await getReviewsForPR(1);

      expect(result).toEqual(reviews);
      expect(prisma.gitHubReview.findMany).toHaveBeenCalledWith({
        where: { pullRequestId: 1 },
        orderBy: { submittedAt: 'desc' },
        include: {
          comments: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  });

  // ===========================================================================
  // getPRReviewSummary
  // ===========================================================================

  describe('getPRReviewSummary', () => {
    it('should return summary with approved count', async () => {
      const reviews = [
        {
          authorLogin: 'reviewer1',
          state: 'APPROVED',
          submittedAt: new Date('2026-01-09T10:00:00Z'),
        },
        {
          authorLogin: 'reviewer2',
          state: 'APPROVED',
          submittedAt: new Date('2026-01-09T11:00:00Z'),
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.gitHubReview.findMany).mockResolvedValue(reviews as any);
      vi.mocked(prisma.gitHubReview.count).mockResolvedValue(0);

      const result = await getPRReviewSummary(1);

      expect(result.approved).toBe(2);
      expect(result.changesRequested).toBe(0);
      expect(result.latestState).toBe('APPROVED');
      expect(result.reviewers).toHaveLength(2);
    });

    it('should prioritize changes_requested over approved', async () => {
      const reviews = [
        {
          authorLogin: 'reviewer1',
          state: 'APPROVED',
          submittedAt: new Date('2026-01-09T10:00:00Z'),
        },
        {
          authorLogin: 'reviewer2',
          state: 'CHANGES_REQUESTED',
          submittedAt: new Date('2026-01-09T11:00:00Z'),
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.gitHubReview.findMany).mockResolvedValue(reviews as any);
      vi.mocked(prisma.gitHubReview.count).mockResolvedValue(0);

      const result = await getPRReviewSummary(1);

      expect(result.approved).toBe(1);
      expect(result.changesRequested).toBe(1);
      expect(result.latestState).toBe('CHANGES_REQUESTED');
    });

    it('should use latest review per author', async () => {
      const reviews = [
        {
          authorLogin: 'reviewer1',
          state: 'CHANGES_REQUESTED',
          submittedAt: new Date('2026-01-09T10:00:00Z'),
        },
        {
          authorLogin: 'reviewer1',
          state: 'APPROVED',
          submittedAt: new Date('2026-01-09T12:00:00Z'),
        },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.gitHubReview.findMany).mockResolvedValue(reviews as any);
      vi.mocked(prisma.gitHubReview.count).mockResolvedValue(0);

      const result = await getPRReviewSummary(1);

      // Since results are ordered desc, first entry is the latest
      expect(result.reviewers).toHaveLength(1);
      expect(result.approved).toBe(0); // Changes requested came first in the desc list
    });

    it('should count pending reviews', async () => {
      vi.mocked(prisma.gitHubReview.findMany).mockResolvedValue([]);
      vi.mocked(prisma.gitHubReview.count).mockResolvedValue(2);

      const result = await getPRReviewSummary(1);

      expect(result.pending).toBe(2);
      expect(result.latestState).toBeNull();
    });
  });

  // ===========================================================================
  // getReviewsForTask
  // ===========================================================================

  describe('getReviewsForTask', () => {
    it('should return reviews from all linked PRs', async () => {
      const prs = [
        {
          prNumber: 1,
          title: 'PR 1',
          reviews: [mockReview],
        },
        {
          prNumber: 2,
          title: 'PR 2',
          reviews: [{ ...mockReview, id: 2, authorLogin: 'reviewer2' }],
        },
      ];
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue(prs as any);

      const result = await getReviewsForTask(123);

      expect(result).toHaveLength(2);
      expect(result[0]!.prNumber).toBe(1);
      expect(result[1]!.prNumber).toBe(2);
    });

    it('should return empty array for task without PRs', async () => {
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([]);

      const result = await getReviewsForTask(123);

      expect(result).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getTaskReviewSummary
  // ===========================================================================

  describe('getTaskReviewSummary', () => {
    it('should aggregate reviews across all PRs', async () => {
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([{ id: 1 }, { id: 2 }] as any);
      vi.mocked(prisma.gitHubReview.findMany).mockResolvedValue([
        { authorLogin: 'reviewer1', state: 'APPROVED', submittedAt: new Date() },
        { authorLogin: 'reviewer2', state: 'CHANGES_REQUESTED', submittedAt: new Date() },
      ] as any);
      vi.mocked(prisma.gitHubReview.count).mockResolvedValue(0);

      const result = await getTaskReviewSummary(123);

      expect(result.prCount).toBe(2);
      expect(result.approved).toBe(1);
      expect(result.changesRequested).toBe(1);
      expect(result.latestState).toBe('CHANGES_REQUESTED');
    });

    it('should return empty summary for task without PRs', async () => {
      vi.mocked(prisma.gitHubPullRequest.findMany).mockResolvedValue([]);

      const result = await getTaskReviewSummary(123);

      expect(result.prCount).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.latestState).toBeNull();
    });
  });

  // ===========================================================================
  // requestReview
  // ===========================================================================

  describe('requestReview', () => {
    it('should request review from specified users', async () => {
      const mockOctokit = {
        pulls: {
          requestReviewers: vi.fn().mockResolvedValue({
            data: {
              requested_reviewers: [{ login: 'reviewer1' }, { login: 'reviewer2' }],
            },
          }),
        },
      };
      vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

      const result = await requestReview(1, 'owner', 'repo', 42, ['reviewer1', 'reviewer2']);

      expect(result.success).toBe(true);
      expect(result.requestedReviewers).toEqual(['reviewer1', 'reviewer2']);
      expect(mockOctokit.pulls.requestReviewers).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 42,
        reviewers: ['reviewer1', 'reviewer2'],
      });
    });
  });

  // ===========================================================================
  // getSuggestedReviewers
  // ===========================================================================

  describe('getSuggestedReviewers', () => {
    it('should return contributors except PR author', async () => {
      const mockOctokit = {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: { user: { login: 'author' } },
          }),
        },
        repos: {
          listContributors: vi.fn().mockResolvedValue({
            data: [
              { login: 'author', avatar_url: 'https://example.com/author.png' },
              { login: 'contributor1', avatar_url: 'https://example.com/c1.png' },
              { login: 'contributor2', avatar_url: 'https://example.com/c2.png' },
            ],
          }),
        },
      };
      vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

      const result = await getSuggestedReviewers(1, 'owner', 'repo', 42);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.login)).toEqual(['contributor1', 'contributor2']);
    });
  });

  // ===========================================================================
  // getPendingReviewRequests
  // ===========================================================================

  describe('getPendingReviewRequests', () => {
    it('should return pending review requests', async () => {
      const mockOctokit = {
        pulls: {
          listRequestedReviewers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { login: 'reviewer1', avatar_url: 'https://example.com/r1.png' },
                { login: 'reviewer2', avatar_url: 'https://example.com/r2.png' },
              ],
            },
          }),
        },
      };
      vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

      const result = await getPendingReviewRequests(1, 'owner', 'repo', 42);

      expect(result).toHaveLength(2);
      expect(result[0]!.login).toBe('reviewer1');
      expect(result[1]!.login).toBe('reviewer2');
    });
  });

  // ===========================================================================
  // syncReviewsFromGitHub
  // ===========================================================================

  describe('syncReviewsFromGitHub', () => {
    it('should sync reviews from GitHub API', async () => {
      const mockOctokit = {
        pulls: {
          listReviews: vi.fn().mockResolvedValue({
            data: [
              {
                id: 12345,
                user: { login: 'reviewer1' },
                state: 'APPROVED',
                body: 'LGTM!',
                html_url: 'https://github.com/owner/repo/pull/1#pullrequestreview-12345',
                submitted_at: '2026-01-09T10:00:00Z',
              },
            ],
          }),
          listCommentsForReview: vi.fn().mockResolvedValue({
            data: [
              {
                id: 67890,
                path: 'src/index.ts',
                line: 42,
                side: 'RIGHT',
                body: 'Nice!',
                user: { login: 'reviewer1' },
                html_url: 'https://github.com/owner/repo/pull/1#discussion_r67890',
              },
            ],
          }),
        },
      };
      vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);
      vi.mocked(prisma.gitHubReview.upsert).mockResolvedValue(mockReview);
      vi.mocked(prisma.gitHubReview.findUnique).mockResolvedValue(mockReview);
      vi.mocked(prisma.gitHubReviewComment.upsert).mockResolvedValue(mockReviewComment);

      const result = await syncReviewsFromGitHub(1, 'owner', 'repo', 42, 1);

      expect(result.synced).toBe(1);
      expect(prisma.gitHubReview.upsert).toHaveBeenCalled();
      expect(prisma.gitHubReviewComment.upsert).toHaveBeenCalled();
    });

    it('should handle empty reviews', async () => {
      const mockOctokit = {
        pulls: {
          listReviews: vi.fn().mockResolvedValue({ data: [] }),
        },
      };
      vi.mocked(getInstallationOctokit).mockResolvedValue(mockOctokit as any);

      const result = await syncReviewsFromGitHub(1, 'owner', 'repo', 42, 1);

      expect(result.synced).toBe(0);
    });
  });
});
