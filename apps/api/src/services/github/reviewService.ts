/*
 * GitHub Review Service
 * Version: 1.0.0
 *
 * Handles GitHub PR review tracking and management.
 * Features:
 * - Review status tracking (approved, changes_requested, etc.)
 * - Review comments sync
 * - Request review functionality
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 12 - Code Review Integratie
 * =============================================================================
 */

import { prisma } from '../../lib/prisma';
import { getInstallationOctokit } from './githubService';

// =============================================================================
// Types
// =============================================================================

export interface ReviewData {
  pullRequestId: number;
  reviewId: bigint;
  authorLogin: string;
  state: 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED';
  body: string | null;
  htmlUrl: string | null;
  submittedAt: Date | null;
}

export interface ReviewCommentData {
  reviewId: number;
  commentId: bigint;
  path: string;
  line: number | null;
  side: 'LEFT' | 'RIGHT' | null;
  body: string;
  authorLogin: string;
  htmlUrl: string | null;
}

export type ReviewState = 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED';

export interface PRReviewSummary {
  approved: number;
  changesRequested: number;
  commented: number;
  pending: number;
  latestState: ReviewState | null;
  reviewers: Array<{
    login: string;
    state: ReviewState;
    submittedAt: Date | null;
  }>;
}

// =============================================================================
// Review Management
// =============================================================================

/**
 * Create or update a review from webhook data
 */
export async function upsertReview(data: ReviewData): Promise<{ id: number }> {
  const review = await prisma.gitHubReview.upsert({
    where: {
      pullRequestId_reviewId: {
        pullRequestId: data.pullRequestId,
        reviewId: data.reviewId,
      },
    },
    create: {
      pullRequestId: data.pullRequestId,
      reviewId: data.reviewId,
      authorLogin: data.authorLogin,
      state: data.state,
      body: data.body,
      htmlUrl: data.htmlUrl,
      submittedAt: data.submittedAt,
    },
    update: {
      state: data.state,
      body: data.body,
      htmlUrl: data.htmlUrl,
      submittedAt: data.submittedAt,
    },
    select: { id: true },
  });

  return review;
}

/**
 * Create or update a review comment
 */
export async function upsertReviewComment(data: ReviewCommentData): Promise<{ id: number }> {
  const comment = await prisma.gitHubReviewComment.upsert({
    where: {
      reviewId_commentId: {
        reviewId: data.reviewId,
        commentId: data.commentId,
      },
    },
    create: {
      reviewId: data.reviewId,
      commentId: data.commentId,
      path: data.path,
      line: data.line,
      side: data.side,
      body: data.body,
      authorLogin: data.authorLogin,
      htmlUrl: data.htmlUrl,
    },
    update: {
      path: data.path,
      line: data.line,
      side: data.side,
      body: data.body,
      htmlUrl: data.htmlUrl,
    },
    select: { id: true },
  });

  return comment;
}

// =============================================================================
// Review Queries
// =============================================================================

/**
 * Get reviews for a pull request
 */
export async function getReviewsForPR(pullRequestId: number) {
  return prisma.gitHubReview.findMany({
    where: { pullRequestId },
    orderBy: { submittedAt: 'desc' },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Get review summary for a pull request
 */
export async function getPRReviewSummary(pullRequestId: number): Promise<PRReviewSummary> {
  const reviews = await prisma.gitHubReview.findMany({
    where: {
      pullRequestId,
      state: { not: 'PENDING' }, // Exclude pending reviews (not yet submitted)
    },
    orderBy: { submittedAt: 'desc' },
    select: {
      authorLogin: true,
      state: true,
      submittedAt: true,
    },
  });

  // Get latest review per author (most recent takes precedence)
  const latestByAuthor = new Map<string, { state: ReviewState; submittedAt: Date | null }>();
  for (const review of reviews) {
    if (!latestByAuthor.has(review.authorLogin)) {
      latestByAuthor.set(review.authorLogin, {
        state: review.state as ReviewState,
        submittedAt: review.submittedAt,
      });
    }
  }

  // Count by state
  let approved = 0;
  let changesRequested = 0;
  let commented = 0;

  const reviewers: PRReviewSummary['reviewers'] = [];

  for (const [login, data] of latestByAuthor) {
    reviewers.push({ login, state: data.state, submittedAt: data.submittedAt });
    if (data.state === 'APPROVED') approved++;
    else if (data.state === 'CHANGES_REQUESTED') changesRequested++;
    else if (data.state === 'COMMENTED') commented++;
  }

  // Determine latest state (priority: changes_requested > approved > commented)
  let latestState: ReviewState | null = null;
  if (changesRequested > 0) latestState = 'CHANGES_REQUESTED';
  else if (approved > 0) latestState = 'APPROVED';
  else if (commented > 0) latestState = 'COMMENTED';

  // Get pending count
  const pending = await prisma.gitHubReview.count({
    where: {
      pullRequestId,
      state: 'PENDING',
    },
  });

  return {
    approved,
    changesRequested,
    commented,
    pending,
    latestState,
    reviewers,
  };
}

/**
 * Get reviews for a task via its linked PRs
 */
export async function getReviewsForTask(taskId: number) {
  const prs = await prisma.gitHubPullRequest.findMany({
    where: { taskId },
    include: {
      reviews: {
        orderBy: { submittedAt: 'desc' },
        include: {
          comments: true,
        },
      },
    },
  });

  return prs.flatMap((pr) =>
    pr.reviews.map((review) => ({
      ...review,
      prNumber: pr.prNumber,
      prTitle: pr.title,
    }))
  );
}

/**
 * Get review summary for a task (aggregates all PR reviews)
 */
export async function getTaskReviewSummary(
  taskId: number
): Promise<PRReviewSummary & { prCount: number }> {
  const prs = await prisma.gitHubPullRequest.findMany({
    where: { taskId },
    select: { id: true },
  });

  if (prs.length === 0) {
    return {
      approved: 0,
      changesRequested: 0,
      commented: 0,
      pending: 0,
      latestState: null,
      reviewers: [],
      prCount: 0,
    };
  }

  // Get all reviews across all PRs
  const reviews = await prisma.gitHubReview.findMany({
    where: {
      pullRequestId: { in: prs.map((pr) => pr.id) },
      state: { not: 'PENDING' },
    },
    orderBy: { submittedAt: 'desc' },
    select: {
      authorLogin: true,
      state: true,
      submittedAt: true,
    },
  });

  // Get latest review per author across all PRs
  const latestByAuthor = new Map<string, { state: ReviewState; submittedAt: Date | null }>();
  for (const review of reviews) {
    if (!latestByAuthor.has(review.authorLogin)) {
      latestByAuthor.set(review.authorLogin, {
        state: review.state as ReviewState,
        submittedAt: review.submittedAt,
      });
    }
  }

  let approved = 0;
  let changesRequested = 0;
  let commented = 0;

  const reviewers: PRReviewSummary['reviewers'] = [];

  for (const [login, data] of latestByAuthor) {
    reviewers.push({ login, state: data.state, submittedAt: data.submittedAt });
    if (data.state === 'APPROVED') approved++;
    else if (data.state === 'CHANGES_REQUESTED') changesRequested++;
    else if (data.state === 'COMMENTED') commented++;
  }

  let latestState: ReviewState | null = null;
  if (changesRequested > 0) latestState = 'CHANGES_REQUESTED';
  else if (approved > 0) latestState = 'APPROVED';
  else if (commented > 0) latestState = 'COMMENTED';

  const pending = await prisma.gitHubReview.count({
    where: {
      pullRequestId: { in: prs.map((pr) => pr.id) },
      state: 'PENDING',
    },
  });

  return {
    approved,
    changesRequested,
    commented,
    pending,
    latestState,
    reviewers,
    prCount: prs.length,
  };
}

// =============================================================================
// Review Actions via GitHub API
// =============================================================================

/**
 * Request a review from specific users on a PR
 */
export async function requestReview(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  reviewers: string[]
): Promise<{ success: boolean; requestedReviewers: string[] }> {
  const octokit = await getInstallationOctokit(installationId);

  const response = await octokit.pulls.requestReviewers({
    owner,
    repo,
    pull_number: prNumber,
    reviewers,
  });

  return {
    success: true,
    requestedReviewers: response.data.requested_reviewers?.map((r) => r.login) ?? [],
  };
}

/**
 * Get suggested reviewers for a PR
 */
export async function getSuggestedReviewers(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Array<{ login: string; avatarUrl: string }>> {
  const octokit = await getInstallationOctokit(installationId);

  // Get PR details to see who already reviewed or is requested
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  // Get list of contributors (potential reviewers)
  const { data: contributors } = await octokit.repos.listContributors({
    owner,
    repo,
    per_page: 20,
  });

  // Filter out the PR author
  const suggestions = contributors
    .filter((c) => c.login !== pr.user?.login)
    .map((c) => ({
      login: c.login ?? '',
      avatarUrl: c.avatar_url ?? '',
    }))
    .filter((c) => c.login !== '');

  return suggestions;
}

/**
 * Get pending review requests for a PR
 */
export async function getPendingReviewRequests(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<Array<{ login: string; avatarUrl: string }>> {
  const octokit = await getInstallationOctokit(installationId);

  const { data: reviewRequests } = await octokit.pulls.listRequestedReviewers({
    owner,
    repo,
    pull_number: prNumber,
  });

  return (
    reviewRequests.users?.map((u) => ({
      login: u.login,
      avatarUrl: u.avatar_url,
    })) ?? []
  );
}

/**
 * Fetch and sync reviews from GitHub API (for initial sync or resync)
 */
export async function syncReviewsFromGitHub(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  pullRequestId: number
): Promise<{ synced: number }> {
  const octokit = await getInstallationOctokit(installationId);

  // Get all reviews from GitHub
  const { data: reviews } = await octokit.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  let synced = 0;

  for (const review of reviews) {
    await upsertReview({
      pullRequestId,
      reviewId: BigInt(review.id),
      authorLogin: review.user?.login ?? 'unknown',
      state: (review.state?.toUpperCase() ?? 'COMMENTED') as ReviewData['state'],
      body: review.body ?? null,
      htmlUrl: review.html_url ?? null,
      submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
    });
    synced++;

    // Optionally sync review comments
    if (review.id) {
      const { data: comments } = await octokit.pulls.listCommentsForReview({
        owner,
        repo,
        pull_number: prNumber,
        review_id: review.id,
        per_page: 100,
      });

      const dbReview = await prisma.gitHubReview.findUnique({
        where: {
          pullRequestId_reviewId: {
            pullRequestId,
            reviewId: BigInt(review.id),
          },
        },
        select: { id: true },
      });

      if (dbReview) {
        for (const comment of comments) {
          await upsertReviewComment({
            reviewId: dbReview.id,
            commentId: BigInt(comment.id),
            path: comment.path ?? '',
            line: comment.line ?? comment.original_line ?? null,
            side: (comment.side?.toUpperCase() as 'LEFT' | 'RIGHT') ?? null,
            body: comment.body,
            authorLogin: comment.user?.login ?? 'unknown',
            htmlUrl: comment.html_url ?? null,
          });
        }
      }
    }
  }

  return { synced };
}

// =============================================================================
// Exports
// =============================================================================

export default {
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
};
