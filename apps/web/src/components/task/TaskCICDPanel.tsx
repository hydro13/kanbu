/*
 * TaskCICDPanel Component
 * Version: 1.0.0
 *
 * Displays CI/CD workflow runs linked to a task.
 * Shows status badges, job details, and allows re-run/cancel actions.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10 - CI/CD Integratie
 * =============================================================================
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  XSquare,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Play,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface TaskCICDPanelProps {
  taskId: number
}

interface WorkflowRun {
  id: number
  workflowName: string
  runNumber: number
  status: string
  conclusion: string | null
  headBranch: string
  htmlUrl: string
  actor: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface WorkflowJob {
  id: number
  name: string
  status: string
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  steps: Array<{
    name: string
    status: string
    conclusion: string | null
    number: number
  }>
}

// =============================================================================
// Status Badge Component
// =============================================================================

function StatusBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  // Determine badge appearance
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Success
          </span>
        )
      case 'failure':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <XSquare className="w-3 h-3" />
            Cancelled
          </span>
        )
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            Skipped
          </span>
        )
      case 'timed_out':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <AlertCircle className="w-3 h-3" />
            Timed Out
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {conclusion || 'Unknown'}
          </span>
        )
    }
  }

  // In progress states
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Running
      </span>
    )
  }

  if (status === 'queued' || status === 'waiting') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        <Clock className="w-3 h-3" />
        {status === 'queued' ? 'Queued' : 'Waiting'}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      {status}
    </span>
  )
}

// =============================================================================
// Workflow Run Item Component
// =============================================================================

function WorkflowRunItem({
  run,
  onRerun,
  onCancel,
  isRerunning,
  isCancelling,
}: {
  run: WorkflowRun
  onRerun: (runId: number, failedOnly: boolean) => void
  onCancel: (runId: number) => void
  isRerunning: boolean
  isCancelling: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showJobs, setShowJobs] = useState(false)

  // Format duration
  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return null
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const durationMs = endDate.getTime() - startDate.getTime()
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const canRerun = run.status === 'completed'
  const canCancel = run.status === 'in_progress' || run.status === 'queued'
  const duration = formatDuration(run.startedAt, run.completedAt)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Main row */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
          isExpanded && 'bg-gray-50 dark:bg-gray-800/50'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse icon */}
        <div className="text-gray-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Workflow info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {run.workflowName}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              #{run.runNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <GitBranch className="w-3 h-3" />
            <span className="truncate">{run.headBranch}</span>
            {run.actor && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span>{run.actor}</span>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>{formatRelativeTime(run.createdAt)}</span>
            {duration && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <Clock className="w-3 h-3" />
                <span>{duration}</span>
              </>
            )}
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge status={run.status} conclusion={run.conclusion} />

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canRerun && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRerun(run.id, false)}
              disabled={isRerunning}
              title="Re-run all jobs"
            >
              {isRerunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(run.id)}
              disabled={isCancelling}
              title="Cancel workflow"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XSquare className="w-4 h-4" />
              )}
            </Button>
          )}
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-accent"
            title="View on GitHub"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Expanded content - Job details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/50 dark:bg-gray-800/25">
          <WorkflowJobsList
            workflowRunId={run.id}
            showJobs={showJobs}
            onToggle={() => setShowJobs(!showJobs)}
          />

          {/* Re-run failed jobs button */}
          {run.conclusion === 'failure' && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRerun(run.id, true)}
                disabled={isRerunning}
              >
                {isRerunning ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Re-run failed jobs
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Workflow Jobs List Component
// =============================================================================

function WorkflowJobsList({
  workflowRunId,
  showJobs,
  onToggle,
}: {
  workflowRunId: number
  showJobs: boolean
  onToggle: () => void
}) {
  const jobsQuery = trpc.github.getWorkflowJobs.useQuery(
    { workflowRunId },
    { enabled: showJobs }
  )

  return (
    <div>
      <button
        onClick={onToggle}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        {showJobs ? (
          <>
            <ChevronDown className="w-3 h-3" />
            Hide jobs
          </>
        ) : (
          <>
            <ChevronRight className="w-3 h-3" />
            Show jobs
          </>
        )}
      </button>

      {showJobs && (
        <div className="mt-2 space-y-2">
          {jobsQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading jobs...
            </div>
          )}
          {jobsQuery.isError && (
            <div className="text-sm text-red-500">
              Failed to load jobs
            </div>
          )}
          {jobsQuery.data?.jobs.map((job) => (
            <JobItem key={job.id} job={job} />
          ))}
          {jobsQuery.data?.jobs.length === 0 && (
            <div className="text-sm text-gray-500">No jobs found</div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Job Item Component
// =============================================================================

function JobItem({ job }: { job: WorkflowJob }) {
  const [showSteps, setShowSteps] = useState(false)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setShowSteps(!showSteps)}
      >
        {showSteps ? (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-gray-400" />
        )}
        <StatusIcon status={job.status} conclusion={job.conclusion} />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {job.name}
        </span>
      </div>

      {showSteps && job.steps.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="space-y-1">
            {job.steps.map((step) => (
              <div key={step.number} className="flex items-center gap-2 text-xs">
                <StatusIcon status={step.status} conclusion={step.conclusion} size="sm" />
                <span className="text-gray-600 dark:text-gray-400">{step.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Status Icon Component
// =============================================================================

function StatusIcon({
  status,
  conclusion,
  size = 'md',
}: {
  status: string
  conclusion: string | null
  size?: 'sm' | 'md'
}) {
  const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return <CheckCircle2 className={cn(iconClass, 'text-green-500')} />
      case 'failure':
        return <XCircle className={cn(iconClass, 'text-red-500')} />
      case 'cancelled':
        return <XSquare className={cn(iconClass, 'text-gray-400')} />
      case 'skipped':
        return <Clock className={cn(iconClass, 'text-gray-400')} />
      default:
        return <AlertCircle className={cn(iconClass, 'text-gray-400')} />
    }
  }

  if (status === 'in_progress') {
    return <Loader2 className={cn(iconClass, 'text-yellow-500 animate-spin')} />
  }

  return <Clock className={cn(iconClass, 'text-blue-400')} />
}

// =============================================================================
// Empty State Component
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <Play className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        No workflow runs found
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Workflow runs will appear here when triggered by this task's branch
      </p>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function TaskCICDPanel({ taskId }: TaskCICDPanelProps) {
  const utils = trpc.useUtils()

  // Fetch workflow runs for this task
  const workflowRunsQuery = trpc.github.getTaskWorkflowRuns.useQuery(
    { taskId, limit: 10 },
    {
      refetchInterval: 30000, // Refresh every 30 seconds for in-progress runs
    }
  )

  // Mutations
  const rerunMutation = trpc.github.rerunWorkflow.useMutation({
    onSuccess: () => {
      utils.github.getTaskWorkflowRuns.invalidate({ taskId })
    },
  })

  const cancelMutation = trpc.github.cancelWorkflow.useMutation({
    onSuccess: () => {
      utils.github.getTaskWorkflowRuns.invalidate({ taskId })
    },
  })

  // Handlers
  const handleRerun = (workflowRunId: number, failedOnly: boolean) => {
    rerunMutation.mutate({ workflowRunId, failedJobsOnly: failedOnly })
  }

  const handleCancel = (workflowRunId: number) => {
    cancelMutation.mutate({ workflowRunId })
  }

  // Loading state
  if (workflowRunsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // Error state
  if (workflowRunsQuery.isError) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-500">Failed to load workflow runs</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => workflowRunsQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  const runs = workflowRunsQuery.data?.runs ?? []

  // Empty state
  if (runs.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Workflow Runs
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => workflowRunsQuery.refetch()}
          disabled={workflowRunsQuery.isFetching}
        >
          {workflowRunsQuery.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Workflow runs list */}
      <div className="space-y-2">
        {runs.map((run: WorkflowRun) => (
          <WorkflowRunItem
            key={run.id}
            run={run}
            onRerun={handleRerun}
            onCancel={handleCancel}
            isRerunning={rerunMutation.isPending && rerunMutation.variables?.workflowRunId === run.id}
            isCancelling={cancelMutation.isPending && cancelMutation.variables?.workflowRunId === run.id}
          />
        ))}
      </div>
    </div>
  )
}

export default TaskCICDPanel
