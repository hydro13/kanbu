/*
 * TimeTracker Component
 * Version: 1.0.0
 *
 * Interactive time tracker for subtasks.
 * - Start/stop timer button
 * - Running timer display (live updating)
 * - Manual time entry
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 404dd64e-7f41-4608-bb62-2cc5ead5fd6a
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:45 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react'
import { Play, Square, Plus, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimer } from '@/hooks/useTimer'
import { formatTime } from './TimeDisplay'

// =============================================================================
// Types
// =============================================================================

export interface TimeTrackerProps {
  /** Subtask ID */
  subtaskId: number
  /** Current status */
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  /** Current time spent in hours */
  timeSpent: number
  /** Timer started at (when status changed to IN_PROGRESS) */
  timerStartedAt?: Date | string | null
  /** Callback when timer starts */
  onStart: () => Promise<unknown>
  /** Callback when timer stops (receives time to add in hours) */
  onStop: (addTimeSpent: number) => Promise<unknown>
  /** Callback when time is logged manually */
  onLogTime: (hours: number) => Promise<unknown>
  /** Is any mutation pending */
  isPending?: boolean
}

// =============================================================================
// ManualTimeInput Component
// =============================================================================

function ManualTimeInput({
  onSubmit,
  isPending,
}: {
  onSubmit: (hours: number) => void
  isPending: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(() => {
    // Parse time input (supports "1h 30m", "1.5", "90m", "1:30")
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) {
      setError('Enter a time value')
      return
    }

    let hours: number | null = null

    // Try "Xh Ym" format
    const hmMatch = trimmed.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/)
    if (hmMatch && (hmMatch[1] || hmMatch[2])) {
      const h = parseFloat(hmMatch[1] || '0')
      const m = parseInt(hmMatch[2] || '0', 10)
      hours = h + m / 60
    }

    // Try "X:Y" format
    if (hours === null) {
      const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
      if (colonMatch && colonMatch[1] && colonMatch[2]) {
        const h = parseInt(colonMatch[1], 10)
        const m = parseInt(colonMatch[2], 10)
        if (m < 60) {
          hours = h + m / 60
        }
      }
    }

    // Try plain number (assumes hours)
    if (hours === null) {
      const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
      if (numMatch && numMatch[1]) {
        hours = parseFloat(numMatch[1])
      }
    }

    if (hours === null || hours <= 0) {
      setError('Invalid time format')
      return
    }

    onSubmit(hours)
    setValue('')
    setError(null)
    setIsOpen(false)
  }, [value, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      } else if (e.key === 'Escape') {
        setValue('')
        setError(null)
        setIsOpen(false)
      }
    },
    [handleSubmit]
  )

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <Plus className="w-3 h-3" />
        Log time
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder="1h 30m"
          className={`w-20 px-2 py-1 text-xs border rounded ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-input focus:border-blue-500'
          } bg-white dark:bg-gray-800 focus:outline-none`}
          autoFocus
          disabled={isPending}
        />
        {error && (
          <div className="absolute top-full left-0 mt-1 text-xs text-red-500">
            {error}
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleSubmit}
        disabled={isPending}
        className="h-6 px-2 text-xs"
      >
        Add
      </Button>
      <button
        onClick={() => {
          setValue('')
          setError(null)
          setIsOpen(false)
        }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        &times;
      </button>
    </div>
  )
}

// =============================================================================
// TimeTracker Component
// =============================================================================

export function TimeTracker({
  subtaskId: _subtaskId,
  status,
  timeSpent,
  timerStartedAt,
  onStart,
  onStop,
  onLogTime,
  isPending = false,
}: TimeTrackerProps) {
  const isRunning = status === 'IN_PROGRESS'
  const isDone = status === 'DONE'

  // Parse timerStartedAt
  const startedAt = timerStartedAt
    ? typeof timerStartedAt === 'string'
      ? new Date(timerStartedAt)
      : timerStartedAt
    : null

  // Use timer hook for live updates
  const { elapsedHours, formattedElapsed } = useTimer({
    isRunning,
    startedAt,
  })

  // Calculate total time (existing + elapsed)
  const totalHours = timeSpent + (isRunning ? elapsedHours : 0)

  const handleStart = useCallback(async () => {
    await onStart()
  }, [onStart])

  const handleStop = useCallback(async () => {
    // Pass elapsed time to onStop
    await onStop(elapsedHours)
  }, [onStop, elapsedHours])

  const handleLogTime = useCallback(
    async (hours: number) => {
      await onLogTime(hours)
    },
    [onLogTime]
  )

  return (
    <div className="flex items-center gap-3">
      {/* Timer display */}
      <div className="flex items-center gap-1.5">
        <Clock className={`w-4 h-4 ${isRunning ? 'text-green-500' : 'text-gray-400'}`} />
        <span className={`text-sm font-mono ${isRunning ? 'text-green-600 dark:text-green-400' : ''}`}>
          {isRunning ? formattedElapsed : formatTime(timeSpent)}
        </span>
        {isRunning && timeSpent > 0 && (
          <span className="text-xs text-gray-400">
            (+{formatTime(timeSpent)})
          </span>
        )}
      </div>

      {/* Start/Stop button */}
      {!isDone && (
        <Button
          size="sm"
          variant={isRunning ? 'destructive' : 'default'}
          onClick={isRunning ? handleStop : handleStart}
          disabled={isPending}
          className="h-7 gap-1"
        >
          {isRunning ? (
            <>
              <Square className="w-3 h-3" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Start
            </>
          )}
        </Button>
      )}

      {/* Manual time entry (only when not running) */}
      {!isRunning && !isDone && (
        <ManualTimeInput onSubmit={handleLogTime} isPending={isPending} />
      )}

      {/* Total when running */}
      {isRunning && (
        <span className="text-xs text-gray-500">
          Total: {formatTime(totalHours)}
        </span>
      )}
    </div>
  )
}

// =============================================================================
// SubtaskTimeTracker (simplified version for subtask list)
// =============================================================================

export interface SubtaskTimeTrackerProps {
  subtaskId: number
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  timeSpent: number
  timeEstimated: number
  timerStartedAt?: Date | string | null
  onStatusChange: (status: 'TODO' | 'IN_PROGRESS' | 'DONE') => Promise<unknown>
  isPending?: boolean
}

export function SubtaskTimeTracker({
  status,
  timeSpent,
  timeEstimated,
  timerStartedAt,
  onStatusChange,
  isPending = false,
}: SubtaskTimeTrackerProps) {
  const isRunning = status === 'IN_PROGRESS'

  const startedAt = timerStartedAt
    ? typeof timerStartedAt === 'string'
      ? new Date(timerStartedAt)
      : timerStartedAt
    : null

  const { formattedElapsed } = useTimer({
    isRunning,
    startedAt,
  })

  const handleToggle = useCallback(async () => {
    if (isRunning) {
      await onStatusChange('DONE')
    } else {
      await onStatusChange('IN_PROGRESS')
    }
  }, [isRunning, onStatusChange])

  return (
    <div className="flex items-center gap-2">
      {/* Time display */}
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Clock className={`w-3 h-3 ${isRunning ? 'text-green-500' : ''}`} />
        <span className={isRunning ? 'text-green-600 dark:text-green-400 font-mono' : ''}>
          {isRunning ? formattedElapsed : formatTime(timeSpent)}
        </span>
        {timeEstimated > 0 && (
          <>
            <span>/</span>
            <span className="text-gray-400">{formatTime(timeEstimated)}</span>
          </>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`p-1 rounded transition-colors ${
          isRunning
            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
        }`}
        title={isRunning ? 'Stop timer' : 'Start timer'}
      >
        {isRunning ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
    </div>
  )
}

export default TimeTracker
