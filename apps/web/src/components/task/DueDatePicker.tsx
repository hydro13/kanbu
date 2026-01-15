/*
 * DueDatePicker Component
 * Version: 1.0.0
 *
 * Date/time picker for task due dates with quick options.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:XX CET
 * ===================================================================
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '../../lib/trpc'
import {
  ChevronDown,
  Calendar,
  Clock,
  X,
  Loader2,
  CalendarDays,
  Sun,
  CalendarRange,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface DueDatePickerProps {
  taskId: number
  currentDueDate: Date | string | null
  onDueDateChange?: (dueDate: Date | null) => void
  disabled?: boolean
  showTime?: boolean
}

interface QuickOption {
  label: string
  icon: React.ReactNode
  getDate: () => Date
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function formatDueDateDisplay(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return diffDays === -1 ? 'Yesterday' : `${Math.abs(diffDays)} days ago`
  }
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays <= 7) return `In ${diffDays} days`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// =============================================================================
// Quick Options
// =============================================================================

function getQuickOptions(): QuickOption[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0) // 5 PM

  return [
    {
      label: 'Today',
      icon: <Sun className="w-4 h-4" />,
      getDate: () => today,
    },
    {
      label: 'Tomorrow',
      icon: <CalendarDays className="w-4 h-4" />,
      getDate: () => new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
    {
      label: 'Next week',
      icon: <CalendarRange className="w-4 h-4" />,
      getDate: () => new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  ]
}

// =============================================================================
// DueDatePicker Component
// =============================================================================

export function DueDatePicker({
  taskId,
  currentDueDate,
  onDueDateChange,
  disabled = false,
  showTime = false,
}: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('17:00')
  const [includeTime, setIncludeTime] = useState(showTime)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse current due date
  const parsedDueDate = currentDueDate
    ? typeof currentDueDate === 'string'
      ? new Date(currentDueDate)
      : currentDueDate
    : null

  // Initialize form values when opening
  useEffect(() => {
    if (isOpen && parsedDueDate) {
      setSelectedDate(formatDateForInput(parsedDueDate))
      setSelectedTime(formatTimeForInput(parsedDueDate))
    }
  }, [isOpen, parsedDueDate])

  // Mutations
  const utils = trpc.useUtils()

  const setDueDateMutation = trpc.task.setDueDate.useMutation({
    onSuccess: (result) => {
      utils.task.get.invalidate({ taskId })
      utils.task.list.invalidate()
      onDueDateChange?.(result.dateDue ? new Date(result.dateDue) : null)
      setIsOpen(false)
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleQuickOption = (option: QuickOption) => {
    if (disabled) return
    const date = option.getDate()
    setDueDateMutation.mutate({
      taskId,
      dateDue: date.toISOString(),
      includeTime: false,
    })
  }

  const handleCustomDate = () => {
    if (!selectedDate) return

    let dateTime: Date
    if (includeTime && selectedTime) {
      const parts = selectedTime.split(':').map(Number)
      const hours = parts[0] ?? 17
      const minutes = parts[1] ?? 0
      dateTime = new Date(selectedDate)
      dateTime.setHours(hours, minutes, 0, 0)
    } else {
      dateTime = new Date(selectedDate)
      dateTime.setHours(17, 0, 0, 0) // Default to 5 PM
    }

    setDueDateMutation.mutate({
      taskId,
      dateDue: dateTime.toISOString(),
      includeTime,
    })
  }

  const handleClearDueDate = () => {
    setDueDateMutation.mutate({
      taskId,
      dateDue: null,
      includeTime: false,
    })
  }

  const isMutating = setDueDateMutation.isPending
  const quickOptions = getQuickOptions()

  return (
    <div ref={containerRef} className="relative">
      {/* Current Due Date Display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isMutating}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
        } border-input`}
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        {parsedDueDate ? (
          <span className="flex-1 text-left text-gray-900 dark:text-white">
            {formatDueDateDisplay(parsedDueDate)}
          </span>
        ) : (
          <span className="flex-1 text-left text-gray-500 dark:text-gray-400">No due date</span>
        )}
        {isMutating ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : parsedDueDate ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClearDueDate()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Clear due date"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Quick Options */}
          <div className="p-2 space-y-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">
              Quick options
            </p>
            {quickOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => handleQuickOption(option)}
                disabled={isMutating}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {option.icon}
                <span className="text-gray-900 dark:text-white">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Custom Date */}
          <div className="p-3 space-y-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Custom date</p>

            {/* Date Input */}
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTime}
                  onChange={(e) => setIncludeTime(e.target.checked)}
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include time</span>
              </label>
            </div>

            {/* Time Input */}
            {includeTime && (
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Apply Button */}
            <button
              onClick={handleCustomDate}
              disabled={!selectedDate || isMutating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              Set due date
            </button>
          </div>

          {/* Clear Option */}
          {parsedDueDate && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={handleClearDueDate}
                disabled={isMutating}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="w-4 h-4" />
                Remove due date
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default DueDatePicker
