/*
 * TaskReviewPanel Component
 * Version: 1.0.0
 *
 * Displays code review status for PRs linked to a task.
 * Shows reviewers, approval status, and allows requesting reviews.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 12 - Code Review Integratie
 * =============================================================================
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
  Users,
  GitPullRequest,
  AlertCircle,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface TaskReviewPanelProps {
  taskId: number
}

interface ReviewSummary {
  approved: number
  changesRequested: number
  commented: number
  pending: number
  prCount: number
  latestState: string | null
  reviewers: Array<{
    login: string
    state: string
    submittedAt: string | null
  }>
}

interface Review {
  id: number
  pullRequestId: number
  reviewId: string
  authorLogin: string
  state: string
  body: string | null
  htmlUrl: string | null
  submittedAt: string | null
  createdAt: string
}

// =============================================================================
// Review State Badge Component
// =============================================================================

function ReviewStateBadge({ state }: { state: string }) {
  switch (state) {
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      )
    case 'CHANGES_REQUESTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          Changes Requested
        </span>
      )
    case 'COMMENTED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <MessageSquare className="w-3 h-3" />
          Commented
        </span>
      )
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      )
    case 'DISMISSED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <AlertCircle className="w-3 h-3" />
          Dismissed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {state}
        </span>
      )
  }
}

// =============================================================================
// Summary Card Component
// =============================================================================

function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  const hasReviews = summary.reviewers.length > 0

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <GitPullRequest className="w-4 h-4" />
          Review Summary
        </h4>
        {summary.latestState && <ReviewStateBadge state={summary.latestState} />}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {summary.approved}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Approved</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            {summary.changesRequested}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Changes</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {summary.commented}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
          <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            {summary.pending}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Pending</div>
        </div>
      </div>

      {/* Reviewers list */}
      {hasReviews && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Reviewers ({summary.reviewers.length})
          </h5>
          <div className="space-y-2">
            {summary.reviewers.map((reviewer) => (
              <div
                key={reviewer.login}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={`https://github.com/${reviewer.login}.png?size=24`}
                    alt={reviewer.login}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {reviewer.login}
                  </span>
                </div>
                <ReviewStateBadge state={reviewer.state} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasReviews && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
          No reviews yet
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Review Item Component
// =============================================================================

function ReviewItem({ review }: { review: Review }) {
  const submittedDate = review.submittedAt
    ? new Date(review.submittedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="bg-card rounded-card border border-border p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src={`https://github.com/${review.authorLogin}.png?size=32`}
            alt={review.authorLogin}
            className="w-6 h-6 rounded-full"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {review.authorLogin}
            </span>
            {submittedDate && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {submittedDate}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReviewStateBadge state={review.state} />
          {review.htmlUrl && (
            <a
              href={review.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {review.body && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">
          {review.body}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Empty State Component
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <GitPullRequest className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No reviews found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Reviews will appear here when pull requests linked to this task receive code reviews on GitHub.
      </p>
    </div>
  )
}

// =============================================================================
// Loading State Component
// =============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  )
}

// =============================================================================
// Error State Component
// =============================================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Failed to load reviews
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function TaskReviewPanel({ taskId }: TaskReviewPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch review summary
  const summaryQuery = trpc.github.getTaskReviewSummary.useQuery(
    { taskId },
    { enabled: !!taskId }
  )

  // Fetch detailed reviews
  const reviewsQuery = trpc.github.getTaskReviews.useQuery(
    { taskId },
    { enabled: !!taskId }
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        summaryQuery.refetch(),
        reviewsQuery.refetch(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Loading state
  if (summaryQuery.isLoading || reviewsQuery.isLoading) {
    return <LoadingState />
  }

  // Error state
  if (summaryQuery.isError) {
    return (
      <ErrorState
        message={summaryQuery.error?.message ?? 'Unknown error'}
        onRetry={handleRefresh}
      />
    )
  }

  const summary = summaryQuery.data as ReviewSummary | undefined
  const reviews = (reviewsQuery.data ?? []) as Review[]

  // Empty state - no PRs linked
  if (!summary || summary.prCount === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {summary.prCount} Pull Request{summary.prCount !== 1 ? 's' : ''} linked
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Summary card */}
      <ReviewSummaryCard summary={summary} />

      {/* Reviews list */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Recent Reviews
          </h4>
          {reviews.slice(0, 10).map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
          {reviews.length > 10 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              + {reviews.length - 10} more reviews
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskReviewPanel
