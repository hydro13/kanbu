/*
 * Sprint Burndown Page
 * Version: 1.0.0
 *
 * Page displaying the burndown chart for a specific sprint.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:25 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useParams, Link } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft, Calendar, Clock, CheckSquare } from 'lucide-react'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { BurndownChart } from '@/components/sprint/BurndownChart'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
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

// =============================================================================
// Main Component
// =============================================================================

export function SprintBurndown() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>()
  const projectIdNum = parseInt(projectId ?? '0', 10)
  const sprintIdNum = parseInt(sprintId ?? '0', 10)

  // Queries
  const { data: project, isLoading: isProjectLoading } = trpc.project.get.useQuery(
    { projectId: projectIdNum },
    { enabled: projectIdNum > 0 }
  )

  const { data: sprint, isLoading: isSprintLoading } = trpc.sprint.get.useQuery(
    { sprintId: sprintIdNum, includeTasks: false },
    { enabled: sprintIdNum > 0 }
  )

  const { data: burndownData, isLoading: isBurndownLoading } = trpc.sprint.getBurndown.useQuery(
    { sprintId: sprintIdNum },
    { enabled: sprintIdNum > 0 }
  )

  const isLoading = isProjectLoading || isSprintLoading || isBurndownLoading

  // Loading state
  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ProjectLayout>
    )
  }

  // Error state
  if (!project || !sprint) {
    return (
      <ProjectLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sprint not found
          </h2>
          <Link
            to={`/project/${projectIdNum}/sprints`}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
          >
            Return to sprint planning
          </Link>
        </div>
      </ProjectLayout>
    )
  }

  const daysRemaining = getDaysRemaining(sprint.dateEnd)

  return (
    <ProjectLayout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to={`/project/${projectIdNum}/sprint/${sprintIdNum}`}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {sprint.name} - Burndown
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.name}
              </p>
            </div>
          </div>

          {/* Sprint Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Duration</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(sprint.dateStart)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                to {formatDate(sprint.dateEnd)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Time Left</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {daysRemaining > 0 ? `${daysRemaining} days` : daysRemaining === 0 ? 'Today' : 'Ended'}
              </p>
              {sprint.status === 'ACTIVE' && daysRemaining < 0 && (
                <p className="text-xs text-red-500">
                  Overdue by {Math.abs(daysRemaining)} days
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <CheckSquare className="w-4 h-4" />
                <span className="text-xs font-medium uppercase">Tasks</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {sprint.completedTasks} / {sprint.totalTasks}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sprint.openTasks} remaining
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <span className="text-xs font-medium uppercase">Progress</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {sprint.progress}%
              </p>
              <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    sprint.progress >= 75
                      ? 'bg-green-500'
                      : sprint.progress >= 50
                        ? 'bg-blue-500'
                        : sprint.progress >= 25
                          ? 'bg-yellow-500'
                          : 'bg-gray-400'
                  }`}
                  style={{ width: `${sprint.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Burndown Chart */}
        <BurndownChart
          data={burndownData?.dataPoints ?? []}
          totalTasks={sprint.totalTasks}
        />

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Link
            to={`/project/${projectIdNum}/sprint/${sprintIdNum}`}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            View Sprint Board
          </Link>
          <Link
            to={`/project/${projectIdNum}/sprints`}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Sprint Planning
          </Link>
        </div>
      </div>
    </ProjectLayout>
  )
}

export default SprintBurndown
