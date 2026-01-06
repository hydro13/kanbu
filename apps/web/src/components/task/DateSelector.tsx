/*
 * DateSelector Component
 * Version: 1.0.0
 *
 * Inline date editor for task dates (due date, start date).
 * Supports both date picker and manual input.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T12:45 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Calendar, X, Loader2, Play } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export type DateType = 'due' | 'start'

export interface DateSelectorProps {
  taskId: number
  dateType: DateType
  currentDate: string | null
  onDateChange?: (date: string | null) => void
  disabled?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function formatDateForDisplay(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().split('T')[0] ?? ''
}

function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false
  return new Date(dateString) < new Date()
}

// =============================================================================
// Component
// =============================================================================

export function DateSelector({
  taskId,
  dateType,
  currentDate,
  onDateChange,
  disabled = false,
}: DateSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()

  // Use task.update for both date types
  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId })
      utils.task.list.invalidate() // Also invalidate list for Timeline/Calendar views
      setIsEditing(false)
    },
  })

  // Set input value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setInputValue(formatDateForInput(currentDate))
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isEditing, currentDate])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isEditing) {
          handleSave()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, inputValue])

  const handleSave = () => {
    const newDate = inputValue.trim() || null

    // Only save if different
    if (formatDateForInput(currentDate) !== (newDate || '')) {
      const updateData = dateType === 'due'
        ? { taskId, dateDue: newDate }
        : { taskId, dateStarted: newDate }

      updateMutation.mutate(updateData, {
        onSuccess: () => {
          onDateChange?.(newDate)
        },
      })
    } else {
      setIsEditing(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    const updateData = dateType === 'due'
      ? { taskId, dateDue: null }
      : { taskId, dateStarted: null }

    updateMutation.mutate(updateData, {
      onSuccess: () => {
        onDateChange?.(null)
        setIsEditing(false)
      },
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  // Only show overdue for due dates
  const overdue = dateType === 'due' && isOverdue(currentDate)

  // Config based on date type
  const config = {
    due: {
      icon: Calendar,
      placeholder: 'Set due date',
      clearTitle: 'Clear due date',
    },
    start: {
      icon: Play,
      placeholder: 'Set start date',
      clearTitle: 'Clear start date',
    },
  }[dateType]

  const Icon = config.icon

  if (isEditing) {
    return (
      <div ref={containerRef} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={updateMutation.isPending}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {updateMutation.isPending && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="group">
      <button
        onClick={() => !disabled && setIsEditing(true)}
        disabled={disabled || updateMutation.isPending}
        className={`flex items-center gap-2 w-full text-left py-0 transition-colors ${
          disabled ? 'cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded'
        }`}
      >
        {updateMutation.isPending ? (
          <span className="text-sm text-gray-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </span>
        ) : currentDate ? (
          <div className="flex items-center gap-2 flex-1">
            <span className={`text-sm ${overdue ? 'text-red-500 font-medium' : 'text-gray-900 dark:text-white'}`}>
              {formatDateForDisplay(currentDate)}
              {overdue && ' (Overdue)'}
            </span>
            {!disabled && (
              <button
                onClick={handleClear}
                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                title={config.clearTitle}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Icon className="w-4 h-4" />
            {config.placeholder}
          </span>
        )}
      </button>
    </div>
  )
}

export default DateSelector
