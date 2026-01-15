/*
 * Sprint Board Page
 * Version: 1.0.0
 *
 * Sprint-filtered board view with sprint header and progress indicator.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:50 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Loader2,
  AlertCircle,
  Clock,
  PlayCircle,
  StopCircle,
  BarChart3,
  Settings,
  ArrowLeft,
  Calendar,
} from 'lucide-react'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { Board } from '@/components/board/Board'
import { LiveCursors } from '@/components/board/LiveCursors'
import { SprintSelector } from '@/components/sprint/SprintSelector'
import { trpc } from '@/lib/trpc'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'

// =============================================================================
// Types
// =============================================================================

interface SprintHeaderProps {
  sprint: {
    id: number
    name: string
    status: string
    description?: string | null
    dateStart: string
    dateEnd: string
    totalTasks: number
    completedTasks: number
    openTasks: number
    progress: number
  }
  projectId: number
  onStart: () => void
  onComplete: () => void
  isStarting: boolean
  isCompleting: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-yellow-500'
  return 'bg-gray-400'
}

// =============================================================================
// Sprint Header Component
// =============================================================================

function SprintHeader({
  sprint,
  projectId,
  onStart,
  onComplete,
  isStarting,
  isCompleting,
}: SprintHeaderProps) {
  const daysRemaining = getDaysRemaining(sprint.dateEnd)
  const progressColor = getProgressColor(sprint.progress)

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Sprint info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {sprint.name}
            </h2>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                sprint.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : sprint.status === 'PLANNING'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {sprint.status}
            </span>
          </div>

          {sprint.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {sprint.description}
            </p>
          )}

          {/* Sprint dates and stats */}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(sprint.dateStart)} - {formatDate(sprint.dateEnd)}
              </span>
            </div>
            {sprint.status === 'ACTIVE' && daysRemaining >= 0 && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  {daysRemaining === 0
                    ? 'Ends today'
                    : daysRemaining === 1
                      ? '1 day left'
                      : `${daysRemaining} days left`}
                </span>
              </div>
            )}
            {sprint.status === 'ACTIVE' && daysRemaining < 0 && (
              <div className="flex items-center gap-1.5 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span>Overdue by {Math.abs(daysRemaining)} days</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress and actions */}
        <div className="flex items-center gap-4">
          {/* Progress circle */}
          <div className="text-center">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${sprint.progress * 1.76} 176`}
                  className={progressColor.replace('bg-', 'text-')}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {sprint.progress}%
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {sprint.completedTasks}/{sprint.totalTasks} done
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {sprint.status === 'PLANNING' && (
              <button
                onClick={onStart}
                disabled={isStarting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                Start Sprint
              </button>
            )}
            {sprint.status === 'ACTIVE' && (
              <button
                onClick={onComplete}
                disabled={isCompleting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <StopCircle className="w-4 h-4" />
                )}
                Complete Sprint
              </button>
            )}
            <Link
              to={`/project/${projectId}/sprint/${sprint.id}/burndown`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Burndown
            </Link>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-all duration-300`}
            style={{ width: `${sprint.progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function SprintBoard() {
  const { projectIdentifier, sprintId } = useParams<{
    projectIdentifier: string
    sprintId?: string
  }>()
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const currentUser = useAppSelector(selectUser)
  const sprintContainerRef = useRef<HTMLDivElement>(null)

  const sprintIdNum = sprintId ? parseInt(sprintId, 10) : null

  // Fetch project by identifier (SEO-friendly URL)
  const { data: project, isLoading: isProjectLoading, error: projectError } = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectIdNum = project?.id ?? 0

  // Real-time collaboration sync
  useRealtimeSync({
    projectId: projectIdNum,
    currentUserId: currentUser?.id ?? 0,
  })

  // State for selected sprint (from URL or selector)
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(sprintIdNum)

  // Queries - Sprint details
  const { data: sprint, isLoading: isSprintLoading } = trpc.sprint.get.useQuery(
    { sprintId: selectedSprintId ?? 0, includeTasks: false },
    { enabled: selectedSprintId !== null && selectedSprintId > 0 }
  )

  // Queries - Tasks filtered by sprint
  const { data: tasks, isLoading: isTasksLoading } = trpc.task.list.useQuery(
    {
      projectId: projectIdNum,
      sprintId: selectedSprintId ?? undefined,
      isActive: true,
      limit: 500,
    },
    { enabled: projectIdNum > 0 }
  )

  // Mutations
  const startSprintMutation = trpc.sprint.start.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate()
      utils.sprint.get.invalidate()
    },
  })

  const completeSprintMutation = trpc.sprint.complete.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate()
      utils.sprint.get.invalidate()
      utils.task.list.invalidate()
    },
  })

  // Handle sprint change
  const handleSprintChange = (newSprintId: number | null) => {
    setSelectedSprintId(newSprintId)
    if (newSprintId) {
      navigate(`/project/${projectIdNum}/sprint/${newSprintId}`)
    } else {
      navigate(`/project/${projectIdNum}/board`)
    }
  }

  // Handle sprint actions
  const handleStartSprint = () => {
    if (selectedSprintId) {
      startSprintMutation.mutate({ sprintId: selectedSprintId })
    }
  }

  const handleCompleteSprint = () => {
    if (selectedSprintId) {
      completeSprintMutation.mutate({
        sprintId: selectedSprintId,
        moveRemainingToBacklog: true,
      })
    }
  }

  // Loading state
  if (isProjectLoading || isTasksLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ProjectLayout>
    )
  }

  // Error state
  if (projectError || !project) {
    return (
      <ProjectLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Project not found
          </h2>
          <Link
            to="/"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
          >
            Return to projects
          </Link>
        </div>
      </ProjectLayout>
    )
  }

  // Extract data from project
  const columns = project.columns ?? []
  const swimlanes = project.swimlanes ?? []
  const taskList = tasks ?? []

  return (
    <ProjectLayout>
      <div className="flex flex-col h-full" ref={sprintContainerRef}>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to={`/project/${projectIdNum}/board`}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-section-title text-foreground">
                  Sprint Board
                </h1>
                <p className="text-sm text-muted-foreground">
                  {project.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <SprintSelector
                projectId={projectIdNum}
                selectedSprintId={selectedSprintId}
                onSprintChange={handleSprintChange}
                showAllOption={true}
              />
              <Link
                to={`/project/${projectIdNum}/settings`}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sprint header (if sprint selected and loaded) */}
        {sprint && !isSprintLoading && (
          <SprintHeader
            sprint={sprint}
            projectId={projectIdNum}
            onStart={handleStartSprint}
            onComplete={handleCompleteSprint}
            isStarting={startSprintMutation.isPending}
            isCompleting={completeSprintMutation.isPending}
          />
        )}

        {/* Board */}
        <div className="flex-1 overflow-hidden">
          <Board
            columns={columns}
            swimlanes={swimlanes}
            tasks={taskList}
            projectId={projectIdNum}
          />
        </div>
      </div>

      {/* Live cursors overlay */}
      {currentUser && (
        <LiveCursors
          projectId={projectIdNum}
          currentUserId={currentUser.id}
          containerRef={sprintContainerRef}
        />
      )}
    </ProjectLayout>
  )
}

export default SprintBoard
