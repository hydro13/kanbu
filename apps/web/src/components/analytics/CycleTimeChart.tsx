/*
 * CycleTimeChart Component
 * Version: 1.0.0
 *
 * Time in each column with bottleneck identification.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react'
import { Loader2, Info, AlertTriangle } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface CycleTimeData {
  cycleTimeByColumn: Array<{
    columnId: number
    columnName: string
    position: number
    avgHours: number
    avgDays: number
    taskCount: number
  }>
  bottleneck: {
    columnId: number
    columnName: string
    avgHours: number
    avgDays: number
  } | null
  avgTotalCycleHours: number
  avgTotalCycleDays: number
  completedTasksAnalyzed: number
}

export interface CycleTimeChartProps {
  data: CycleTimeData | undefined
  isLoading: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`
  return `${Math.round((hours / 24) * 10) / 10}d`
}

// =============================================================================
// Component
// =============================================================================

export function CycleTimeChart({ data, isLoading }: CycleTimeChartProps) {
  const chartData = useMemo(() => {
    if (!data?.cycleTimeByColumn || data.cycleTimeByColumn.length === 0) return null

    const maxHours = Math.max(...data.cycleTimeByColumn.map((c) => c.avgHours), 1)

    return {
      columns: data.cycleTimeByColumn,
      maxHours,
      bottleneck: data.bottleneck,
      avgTotalCycleHours: data.avgTotalCycleHours,
      avgTotalCycleDays: data.avgTotalCycleDays,
      completedTasksAnalyzed: data.completedTasksAnalyzed,
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!chartData || chartData.columns.every((c) => c.taskCount === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <Info className="w-5 h-5 mr-2" />
        Not enough data to calculate cycle time
      </div>
    )
  }

  return (
    <div>
      {/* Summary Stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Avg Total Cycle:</span>
          <span className="ml-1.5 font-medium text-foreground">
            {formatDuration(chartData.avgTotalCycleHours)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Tasks Analyzed:</span>
          <span className="ml-1.5 font-medium text-foreground">
            {chartData.completedTasksAnalyzed}
          </span>
        </div>
      </div>

      {/* Bottleneck Alert */}
      {chartData.bottleneck && chartData.bottleneck.avgHours > 24 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-orange-700 dark:text-orange-400">
            <strong>Bottleneck:</strong> &ldquo;{chartData.bottleneck.columnName}&rdquo; has the longest
            average time ({formatDuration(chartData.bottleneck.avgHours)})
          </span>
        </div>
      )}

      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {chartData.columns.map((column) => {
          const widthPercent = (column.avgHours / chartData.maxHours) * 100
          const isBottleneck = chartData.bottleneck?.columnId === column.columnId

          return (
            <div key={column.columnId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  {column.columnName}
                  {isBottleneck && (
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                  )}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatDuration(column.avgHours)}
                </span>
              </div>
              <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${
                    isBottleneck
                      ? 'bg-orange-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.max(widthPercent, column.taskCount > 0 ? 2 : 0)}%` }}
                />
                {column.taskCount > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                    {column.taskCount} tasks
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Flow visualization */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Task Flow</p>
        <div className="flex items-center gap-1">
          {chartData.columns.map((column, index) => (
            <div key={column.columnId} className="flex items-center flex-1">
              <div
                className={`flex-1 h-2 rounded ${
                  chartData.bottleneck?.columnId === column.columnId
                    ? 'bg-orange-500'
                    : 'bg-blue-500'
                }`}
                style={{ opacity: 0.3 + (column.avgHours / chartData.maxHours) * 0.7 }}
              />
              {index < chartData.columns.length - 1 && (
                <div className="w-2 h-0 border-t-2 border-input" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Start</span>
          <span>Done</span>
        </div>
      </div>
    </div>
  )
}

export default CycleTimeChart
