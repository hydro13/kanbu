/*
 * VelocityChart Component
 * Version: 1.0.0
 *
 * Weekly velocity bar chart with rolling average.
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
import { Loader2, Info } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface VelocityData {
  dataPoints: Array<{
    weekStart: string
    tasksCompleted: number
    pointsCompleted: number
  }>
  avgVelocity: number
  totalCompleted: number
}

export interface VelocityChartProps {
  data: VelocityData | undefined
  isLoading: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// =============================================================================
// Component
// =============================================================================

export function VelocityChart({ data, isLoading }: VelocityChartProps) {
  const chartData = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) return null

    const maxValue = Math.max(...data.dataPoints.map((d) => d.tasksCompleted), 1)

    return {
      points: data.dataPoints,
      maxValue,
      avgVelocity: data.avgVelocity,
      totalCompleted: data.totalCompleted,
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <Info className="w-5 h-5 mr-2" />
        No velocity data available
      </div>
    )
  }

  return (
    <div>
      {/* Summary Stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Avg Velocity:</span>
          <span className="ml-1.5 font-medium text-gray-900 dark:text-white">
            {chartData.avgVelocity} tasks/week
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Total:</span>
          <span className="ml-1.5 font-medium text-gray-900 dark:text-white">
            {chartData.totalCompleted} completed
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="relative h-48">
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <span className="text-xs text-gray-400 w-6 text-right mr-2">
                {Math.round((chartData.maxValue / 4) * (4 - i))}
              </span>
              <div className="flex-1 border-t border-gray-100 dark:border-gray-700" />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-1 pl-8 pb-6">
          {chartData.points.map((point, index) => {
            const heightPercent = (point.tasksCompleted / chartData.maxValue) * 100
            const isAboveAvg = point.tasksCompleted >= chartData.avgVelocity

            return (
              <div
                key={point.weekStart}
                className="flex-1 flex flex-col items-center group"
              >
                {/* Bar */}
                <div className="w-full relative" style={{ height: '100%' }}>
                  <div
                    className={`absolute bottom-0 left-1 right-1 rounded-t transition-all ${
                      isAboveAvg
                        ? 'bg-green-500 group-hover:bg-green-400'
                        : 'bg-blue-500 group-hover:bg-blue-400'
                    }`}
                    style={{ height: `${heightPercent}%`, minHeight: point.tasksCompleted > 0 ? '4px' : '0' }}
                  />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {point.tasksCompleted} tasks
                      {point.pointsCompleted > 0 && ` (${point.pointsCompleted} pts)`}
                    </div>
                  </div>
                </div>

                {/* X-axis label */}
                {index % 2 === 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full">
                    {formatWeekLabel(point.weekStart)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Average line */}
        {chartData.avgVelocity > 0 && (
          <div
            className="absolute left-8 right-0 border-t-2 border-dashed border-orange-400"
            style={{
              bottom: `calc(${(chartData.avgVelocity / chartData.maxValue) * 100}% + 24px)`,
            }}
          >
            <span className="absolute right-0 -top-4 text-xs text-orange-500 font-medium">
              avg
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Above average</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Below average</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0 border-t-2 border-dashed border-orange-400" />
          <span>Average</span>
        </div>
      </div>
    </div>
  )
}

export default VelocityChart
