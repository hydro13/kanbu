/*
 * ProjectMilestonesPanel Component
 * Version: 1.0.0
 *
 * Displays GitHub milestones for a project.
 * Shows milestone progress, due dates, and issue counts.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 11 - Geavanceerde Sync
 * =============================================================================
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  Target,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface ProjectMilestonesPanelProps {
  projectId: number
}

interface MilestoneInfo {
  id: number
  milestoneNumber: number
  title: string
  description: string | null
  state: string
  dueOn: string | null
  openIssues: number
  closedIssues: number
  progress: number
  htmlUrl: string | null
}

// =============================================================================
// Milestone Card Component
// =============================================================================

function MilestoneCard({ milestone }: { milestone: MilestoneInfo }) {
  const isOverdue = milestone.state === 'open' && milestone.dueOn && new Date(milestone.dueOn) < new Date()
  const dueDate = milestone.dueOn
    ? new Date(milestone.dueOn).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {milestone.state === 'open' ? (
            <Target className="w-5 h-5 text-blue-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          )}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {milestone.title}
            </h4>
            {dueDate && (
              <span
                className={`text-xs ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Calendar className="w-3 h-3 inline mr-1" />
                Due {dueDate}
                {isOverdue && ' (overdue)'}
              </span>
            )}
          </div>
        </div>
        {milestone.htmlUrl && (
          <a
            href={milestone.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {milestone.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {milestone.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{milestone.progress}% complete</span>
          <span>
            {milestone.closedIssues} / {milestone.openIssues + milestone.closedIssues} issues
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              milestone.state === 'closed'
                ? 'bg-green-500'
                : milestone.progress >= 75
                ? 'bg-blue-500'
                : milestone.progress >= 50
                ? 'bg-yellow-500'
                : 'bg-gray-400'
            }`}
            style={{ width: `${milestone.progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Stats Summary Component
// =============================================================================

function StatsSummary({ stats }: { stats: { total: number; open: number; closed: number; overdue: number; upcomingDue: number } }) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
      </div>
      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Open</div>
      </div>
      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.closed}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Closed</div>
      </div>
      <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="text-xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Overdue</div>
      </div>
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
      <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No milestones found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        Milestones will appear here once they are created in the linked GitHub repository.
      </p>
    </div>
  )
}

// =============================================================================
// Error State
// =============================================================================

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Failed to load milestones
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

export function ProjectMilestonesPanel({ projectId }: ProjectMilestonesPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('all')

  const milestonesQuery = trpc.github.getProjectMilestones.useQuery(
    { projectId, state: stateFilter },
    { enabled: !!projectId }
  )

  const statsQuery = trpc.github.getMilestoneStats.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([milestonesQuery.refetch(), statsQuery.refetch()])
    } finally {
      setIsRefreshing(false)
    }
  }

  if (milestonesQuery.isLoading) {
    return <LoadingState />
  }

  if (milestonesQuery.isError) {
    return (
      <ErrorState
        message={milestonesQuery.error?.message ?? 'Unknown error'}
        onRetry={handleRefresh}
      />
    )
  }

  const milestones = (milestonesQuery.data ?? []) as MilestoneInfo[]
  const stats = statsQuery.data

  if (milestones.length === 0 && stateFilter === 'all') {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-5 h-5" />
          Milestones
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as 'all' | 'open' | 'closed')}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 bg-white dark:bg-gray-800"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
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
      </div>

      {/* Stats */}
      {stats && <StatsSummary stats={stats} />}

      {/* Milestones list */}
      {milestones.length > 0 ? (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No {stateFilter} milestones found
        </div>
      )}
    </div>
  )
}

export default ProjectMilestonesPanel
