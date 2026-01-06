/*
 * TimeDisplay Component
 * Version: 1.0.0
 *
 * Displays formatted time with estimated vs actual comparison.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 404dd64e-7f41-4608-bb62-2cc5ead5fd6a
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:40 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface TimeDisplayProps {
  /** Time spent in hours */
  timeSpent: number
  /** Estimated time in hours */
  timeEstimated?: number
  /** Show icon */
  showIcon?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show comparison bar */
  showBar?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format hours as human-readable string
 */
export function formatTime(hours: number): string {
  if (hours <= 0) return '0m'

  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60

  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Format hours as short string for compact display
 */
export function formatTimeShort(hours: number): string {
  if (hours <= 0) return '0m'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

/**
 * Calculate percentage of time used
 */
function getTimePercentage(spent: number, estimated: number): number {
  if (estimated <= 0) return 0
  return Math.min(200, Math.round((spent / estimated) * 100))
}

/**
 * Get status based on time comparison
 */
function getTimeStatus(
  spent: number,
  estimated: number
): 'under' | 'on-track' | 'over' {
  if (estimated <= 0) return 'on-track'
  const percentage = (spent / estimated) * 100
  if (percentage < 90) return 'under'
  if (percentage <= 110) return 'on-track'
  return 'over'
}

// =============================================================================
// Size Classes
// =============================================================================

const sizeClasses = {
  sm: {
    text: 'text-xs',
    icon: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    text: 'text-sm',
    icon: 'w-4 h-4',
    gap: 'gap-1.5',
  },
  lg: {
    text: 'text-base',
    icon: 'w-5 h-5',
    gap: 'gap-2',
  },
}

// =============================================================================
// TimeDisplay Component
// =============================================================================

export function TimeDisplay({
  timeSpent,
  timeEstimated,
  showIcon = true,
  size = 'md',
  showBar = false,
}: TimeDisplayProps) {
  const hasEstimate = timeEstimated !== undefined && timeEstimated > 0
  const percentage = hasEstimate ? getTimePercentage(timeSpent, timeEstimated) : 0
  const status = hasEstimate ? getTimeStatus(timeSpent, timeEstimated) : 'on-track'

  const classes = sizeClasses[size]

  const statusColors = {
    under: 'text-green-600 dark:text-green-400',
    'on-track': 'text-blue-600 dark:text-blue-400',
    over: 'text-red-600 dark:text-red-400',
  }

  const barColors = {
    under: 'bg-green-500',
    'on-track': 'bg-blue-500',
    over: 'bg-red-500',
  }

  return (
    <div className="space-y-1">
      <div className={`flex items-center ${classes.gap}`}>
        {showIcon && <Clock className={`${classes.icon} text-gray-400`} />}

        <span className={`${classes.text} font-medium`}>
          {formatTime(timeSpent)}
        </span>

        {hasEstimate && (
          <>
            <span className={`${classes.text} text-gray-400`}>/</span>
            <span className={`${classes.text} text-gray-500 dark:text-gray-400`}>
              {formatTime(timeEstimated)}
            </span>

            {/* Status indicator */}
            {status === 'over' && (
              <AlertTriangle className={`${classes.icon} text-red-500`} />
            )}
            {status === 'under' && percentage > 0 && (
              <CheckCircle className={`${classes.icon} text-green-500`} />
            )}
          </>
        )}
      </div>

      {/* Progress bar */}
      {showBar && hasEstimate && (
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColors[status]}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}

      {/* Percentage text */}
      {showBar && hasEstimate && (
        <span className={`${classes.text} ${statusColors[status]}`}>
          {percentage}% of estimate
        </span>
      )}
    </div>
  )
}

// =============================================================================
// TimeCompact Component (for inline display)
// =============================================================================

export interface TimeCompactProps {
  timeSpent: number
  timeEstimated?: number
  showEstimate?: boolean
}

export function TimeCompact({
  timeSpent,
  timeEstimated,
  showEstimate = true,
}: TimeCompactProps) {
  const hasEstimate = timeEstimated !== undefined && timeEstimated > 0
  const status = hasEstimate ? getTimeStatus(timeSpent, timeEstimated) : 'on-track'

  const statusColors = {
    under: '',
    'on-track': '',
    over: 'text-red-500',
  }

  return (
    <span className={`text-xs text-gray-500 dark:text-gray-400 ${statusColors[status]}`}>
      {formatTimeShort(timeSpent)}
      {showEstimate && hasEstimate && (
        <span className="text-gray-400">/{formatTimeShort(timeEstimated)}</span>
      )}
    </span>
  )
}

export default TimeDisplay
