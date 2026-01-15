/*
 * ProjectAnalyticsPanel Component
 * Version: 1.0.0
 *
 * Displays GitHub analytics for a project.
 * Shows cycle time, review metrics, contributors, and throughput.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 13 - Analytics & Insights
 * =============================================================================
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Users,
  GitPullRequest,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertCircle,
  BarChart3,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface ProjectAnalyticsPanelProps {
  projectId: number
}

interface ContributorStats {
  login: string
  commits: number
  prsOpened: number
  prsMerged: number
  reviewsGiven: number
  commentsGiven: number
}

interface ThroughputStats {
  periodStart: string
  tasksCompleted: number
  prsMerged: number
  issuesClosed: number
}

// =============================================================================
// Metric Card Component
// =============================================================================

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  color = 'blue',
}: {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green:
      'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple:
      'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange:
      'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  }

  return (
    <div className="bg-card rounded-card border border-border p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </span>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Contributor Row Component
// =============================================================================

function ContributorRow({ contributor }: { contributor: ContributorStats }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3">
        <img
          src={`https://github.com/${contributor.login}.png?size=32`}
          alt={contributor.login}
          className="w-8 h-8 rounded-full"
        />
        <span className="font-medium text-foreground">
          {contributor.login}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span title="Commits">{contributor.commits} commits</span>
        <span title="PRs Merged">{contributor.prsMerged} merged</span>
        <span title="Reviews">{contributor.reviewsGiven} reviews</span>
      </div>
    </div>
  )
}

// =============================================================================
// Throughput Chart (Simple Bar)
// =============================================================================

function ThroughputChart({ data }: { data: ThroughputStats[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        No throughput data available
      </div>
    )
  }

  const maxValue = Math.max(...data.map((d) => d.prsMerged + d.tasksCompleted))

  return (
    <div className="space-y-2">
      {data.slice(-8).map((period, idx) => {
        const date = new Date(period.periodStart)
        const label = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
        const total = period.prsMerged + period.tasksCompleted
        const width = maxValue > 0 ? (total / maxValue) * 100 : 0

        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-16 text-xs text-gray-500 dark:text-gray-400">
              {label}
            </span>
            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 dark:bg-blue-400 rounded flex items-center justify-end pr-2"
                style={{ width: `${Math.max(width, 5)}%` }}
              >
                {total > 0 && (
                  <span className="text-xs text-white font-medium">{total}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Loading State
// =============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  )
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        No analytics data
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Analytics will appear once you have PRs, commits, and reviews linked to this project.
      </p>
    </div>
  )
}

// =============================================================================
// Error State
// =============================================================================

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        Failed to load analytics
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

export function ProjectAnalyticsPanel({ projectId }: ProjectAnalyticsPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const analyticsQuery = trpc.github.getProjectAnalytics.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await analyticsQuery.refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (analyticsQuery.isLoading) {
    return <LoadingState />
  }

  if (analyticsQuery.isError) {
    return (
      <ErrorState
        message={analyticsQuery.error?.message ?? 'Unknown error'}
        onRetry={handleRefresh}
      />
    )
  }

  const analytics = analyticsQuery.data

  if (!analytics) {
    return <EmptyState />
  }

  const { cycleTime, reviewTime, contributors, throughput } = analytics

  // Check if we have any data
  const hasData =
    cycleTime.totalCompleted > 0 ||
    reviewTime.totalPRsReviewed > 0 ||
    contributors.length > 0

  if (!hasData) {
    return <EmptyState />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Project Analytics
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          title="Avg Cycle Time"
          value={`${cycleTime.averageDays}d`}
          subtitle={`${cycleTime.totalCompleted} completed`}
          color="blue"
        />
        <MetricCard
          icon={GitPullRequest}
          title="Time to Review"
          value={`${reviewTime.averageHoursToFirstReview}h`}
          subtitle={`${reviewTime.totalPRsReviewed} PRs reviewed`}
          color="green"
        />
        <MetricCard
          icon={Users}
          title="Contributors"
          value={contributors.length}
          subtitle="Active contributors"
          color="purple"
        />
        <MetricCard
          icon={TrendingUp}
          title="Reviews/PR"
          value={reviewTime.averageReviewsPerPR}
          subtitle={`${reviewTime.averageCommentsPerReview} comments avg`}
          color="orange"
        />
      </div>

      {/* Cycle Time Details */}
      {cycleTime.totalCompleted > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-3">
            Cycle Time Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {cycleTime.minDays}d
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Fastest
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {cycleTime.medianDays}d
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Median
              </div>
            </div>
            <div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {cycleTime.maxDays}d
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Slowest
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Throughput Chart */}
      {throughput.length > 0 && (
        <div className="bg-card rounded-card border border-border p-4">
          <h4 className="font-medium text-foreground mb-4">
            Weekly Throughput
          </h4>
          <ThroughputChart data={throughput as ThroughputStats[]} />
        </div>
      )}

      {/* Top Contributors */}
      {contributors.length > 0 && (
        <div className="bg-card rounded-card border border-border p-4">
          <h4 className="font-medium text-foreground mb-4">
            Top Contributors
          </h4>
          <div className="space-y-1">
            {(contributors as ContributorStats[]).slice(0, 5).map((contributor) => (
              <ContributorRow key={contributor.login} contributor={contributor} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectAnalyticsPanel
