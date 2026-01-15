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
    periodStart?: string
    tasksCompleted: number
    pointsCompleted: number
  }>
  avgVelocity: number
  totalCompleted: number
  granularity?: 'day' | 'week'
}

export interface VelocityChartProps {
  data: VelocityData | undefined
  isLoading: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function formatPeriodLabel(dateStr: string, granularity: 'day' | 'week'): string {
  const date = new Date(dateStr)
  if (granularity === 'day') {
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// =============================================================================
// Component
// =============================================================================

export function VelocityChart({ data, isLoading }: VelocityChartProps) {
  const chartData = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) return null

    const maxValue = Math.max(...data.dataPoints.map((d) => d.tasksCompleted), 1)
    const granularity = data.granularity ?? 'week'

    return {
      points: data.dataPoints,
      maxValue,
      avgVelocity: data.avgVelocity,
      totalCompleted: data.totalCompleted,
      granularity,
      periodLabel: granularity === 'day' ? 'day' : 'week',
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
            {chartData.avgVelocity} tasks/{chartData.periodLabel}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Total:</span>
          <span className="ml-1.5 font-medium text-gray-900 dark:text-white">
            {chartData.totalCompleted} completed
          </span>
        </div>
      </div>

      {/* Line Chart */}
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

        {/* SVG Line Chart */}
        <div className="absolute inset-0 pl-8 pb-6">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Velocity line */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartData.points
                .map((point, index) => {
                  const x = (index / (chartData.points.length - 1 || 1)) * 100
                  const y = 100 - (point.tasksCompleted / chartData.maxValue) * 100
                  return `${x},${y}`
                })
                .join(' ')}
            />
            {/* Data points */}
            {chartData.points.map((point, index) => {
              const x = (index / (chartData.points.length - 1 || 1)) * 100
              const y = 100 - (point.tasksCompleted / chartData.maxValue) * 100
              const isAboveAvg = point.tasksCompleted >= chartData.avgVelocity
              return (
                <circle
                  key={point.weekStart}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={isAboveAvg ? '#22c55e' : '#3b82f6'}
                  stroke="white"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer"
                >
                  <title>
                    {formatPeriodLabel(point.periodStart ?? point.weekStart, chartData.granularity)}: {point.tasksCompleted} tasks
                  </title>
                </circle>
              )
            })}
            {/* Average line */}
            {chartData.avgVelocity > 0 && (
              <line
                x1="0"
                y1={100 - (chartData.avgVelocity / chartData.maxValue) * 100}
                x2="100"
                y2={100 - (chartData.avgVelocity / chartData.maxValue) * 100}
                stroke="#f97316"
                strokeWidth="2"
                strokeDasharray="6,4"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-8 right-0 flex justify-between">
          {chartData.points.map((point, index) => {
            const totalPoints = chartData.points.length
            const labelInterval = totalPoints > 14 ? Math.ceil(totalPoints / 6) : totalPoints > 7 ? 2 : 1
            if (index % labelInterval !== 0 && index !== totalPoints - 1) return null
            return (
              <span
                key={point.weekStart}
                className="text-xs text-gray-500 dark:text-gray-400 truncate"
                style={{
                  position: 'absolute',
                  left: `${(index / (totalPoints - 1 || 1)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {formatPeriodLabel(point.periodStart ?? point.weekStart, chartData.granularity)}
              </span>
            )
          })}
        </div>
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
