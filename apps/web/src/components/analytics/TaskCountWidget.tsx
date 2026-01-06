/*
 * TaskCountWidget Component
 * Version: 1.0.0
 *
 * Displays task counts with trend indicator.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Loader2, TrendingUp, TrendingDown, CheckCircle, Circle, ListTodo, Clock } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface ProjectStats {
  totalTasks: number
  openTasks: number
  closedTasks: number
  completionRate: number
  trend: number
  recentCompletions: number
  tasksByPriority: Array<{ priority: number; count: number }>
  tasksByColumn: Array<{ columnId: number; columnName: string; count: number }>
  timeEstimated: number
  timeSpent: number
}

export interface TaskCountWidgetProps {
  stats: ProjectStats | undefined
  isLoading: boolean
}

// =============================================================================
// Helpers
// =============================================================================

const priorityLabels: Record<number, { label: string; color: string }> = {
  0: { label: 'Low', color: 'bg-gray-400' },
  1: { label: 'Medium', color: 'bg-blue-500' },
  2: { label: 'High', color: 'bg-orange-500' },
  3: { label: 'Urgent', color: 'bg-red-500' },
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`
  return `${Math.round(hours / 24)}d`
}

// =============================================================================
// Component
// =============================================================================

export function TaskCountWidget({ stats, isLoading }: TaskCountWidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">No data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Total Tasks */}
        <div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <ListTodo className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Total Tasks</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalTasks}
          </p>
        </div>

        {/* Open Tasks */}
        <div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <Circle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Open</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats.openTasks}
          </p>
        </div>

        {/* Closed Tasks */}
        <div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Closed</span>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.closedTasks}
          </p>
        </div>

        {/* Completion Rate */}
        <div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
            <span className="text-xs font-medium uppercase">Completion Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.completionRate}%
            </p>
            {stats.trend !== 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  stats.trend > 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {stats.trend > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(stats.trend)}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.recentCompletions} completed this week
          </p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        {/* Priority Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            By Priority
          </h4>
          <div className="space-y-2">
            {[3, 2, 1, 0].map((priority) => {
              const data = stats.tasksByPriority.find((p) => p.priority === priority)
              const count = data?.count ?? 0
              const config = priorityLabels[priority]!
              const percent = stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0

              return (
                <div key={priority} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.color}`} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-14">
                    {config.label}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Column Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            By Column (Open)
          </h4>
          <div className="space-y-2">
            {stats.tasksByColumn.slice(0, 5).map((column) => {
              const percent = stats.openTasks > 0 ? (column.count / stats.openTasks) * 100 : 0

              return (
                <div key={column.columnId} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate">
                    {column.columnName}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                    {column.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Time Tracking */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Time Tracking
          </h4>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Estimated
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatHours(stats.timeEstimated)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Spent
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatHours(stats.timeSpent)}
                </span>
              </div>
            </div>
            {stats.timeEstimated > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 dark:text-gray-400">Progress</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {Math.round((stats.timeSpent / stats.timeEstimated) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stats.timeSpent > stats.timeEstimated ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (stats.timeSpent / stats.timeEstimated) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCountWidget
