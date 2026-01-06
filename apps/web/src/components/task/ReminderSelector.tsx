/*
 * ReminderSelector Component
 * Version: 1.0.0
 *
 * Reminder timing selector with preset options and custom datetime.
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
import { ChevronDown, Bell, BellOff, Clock, X, Loader2, Check } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface ReminderSelectorProps {
  taskId: number
  currentDueDate: Date | string | null
  currentReminder: Date | string | null
  onReminderChange?: (reminderAt: Date | null) => void
  disabled?: boolean
}

type ReminderPreset = 'none' | '15min' | '1hour' | '1day' | '1week' | 'custom'

interface PresetOption {
  value: ReminderPreset
  label: string
  description: string
}

// =============================================================================
// Constants
// =============================================================================

const PRESET_OPTIONS: PresetOption[] = [
  { value: 'none', label: 'No reminder', description: 'No notification' },
  { value: '15min', label: '15 minutes before', description: 'Quick reminder' },
  { value: '1hour', label: '1 hour before', description: 'Standard reminder' },
  { value: '1day', label: '1 day before', description: 'Plan ahead' },
  { value: '1week', label: '1 week before', description: 'Early warning' },
  { value: 'custom', label: 'Custom time', description: 'Set specific datetime' },
]

// =============================================================================
// Helper Functions
// =============================================================================

function formatReminderDisplay(
  reminderAt: Date | null,
  dueDate: Date | null
): string {
  if (!reminderAt) return 'No reminder'

  if (!dueDate) {
    return reminderAt.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const diffMs = dueDate.getTime() - reminderAt.getTime()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 60) {
    return `${diffMinutes} min before`
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} before`
  }
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} before`
}

function getPresetFromReminder(
  reminderAt: Date | null,
  dueDate: Date | null
): ReminderPreset {
  if (!reminderAt) return 'none'
  if (!dueDate) return 'custom'

  const diffMs = dueDate.getTime() - reminderAt.getTime()

  // Check with 5% tolerance
  const presetMs: Record<ReminderPreset, number> = {
    none: 0,
    '15min': 15 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
    '1week': 7 * 24 * 60 * 60 * 1000,
    custom: 0,
  }

  for (const [preset, ms] of Object.entries(presetMs)) {
    if (ms === 0) continue
    const tolerance = ms * 0.05
    if (Math.abs(diffMs - ms) <= tolerance) {
      return preset as ReminderPreset
    }
  }

  return 'custom'
}

function formatDateTimeForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// =============================================================================
// ReminderSelector Component
// =============================================================================

export function ReminderSelector({
  taskId,
  currentDueDate,
  currentReminder,
  onReminderChange,
  disabled = false,
}: ReminderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customDateTime, setCustomDateTime] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse dates
  const parsedDueDate = currentDueDate
    ? typeof currentDueDate === 'string'
      ? new Date(currentDueDate)
      : currentDueDate
    : null

  const parsedReminder = currentReminder
    ? typeof currentReminder === 'string'
      ? new Date(currentReminder)
      : currentReminder
    : null

  const currentPreset = getPresetFromReminder(parsedReminder, parsedDueDate)

  // Initialize custom datetime when opening
  useEffect(() => {
    if (isOpen) {
      if (parsedReminder) {
        setCustomDateTime(formatDateTimeForInput(parsedReminder))
      } else if (parsedDueDate) {
        // Default to 1 hour before due date
        const defaultReminder = new Date(parsedDueDate.getTime() - 60 * 60 * 1000)
        setCustomDateTime(formatDateTimeForInput(defaultReminder))
      }
    }
  }, [isOpen, parsedReminder, parsedDueDate])

  // Mutations
  const utils = trpc.useUtils()

  const setReminderMutation = trpc.task.setReminder.useMutation({
    onSuccess: (result) => {
      utils.task.get.invalidate({ taskId })
      onReminderChange?.(result.reminderAt ? new Date(result.reminderAt) : null)
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

  const handlePresetSelect = (preset: ReminderPreset) => {
    if (disabled) return

    if (preset === 'custom') {
      // Don't submit yet, show custom input
      return
    }

    if (preset === 'none') {
      setReminderMutation.mutate({
        taskId,
        reminderAt: null,
        preset: 'none',
      })
    } else {
      if (!parsedDueDate) {
        // Can't set preset reminder without due date
        return
      }
      setReminderMutation.mutate({
        taskId,
        reminderAt: null,
        preset,
      })
    }
  }

  const handleCustomReminder = () => {
    if (!customDateTime) return

    setReminderMutation.mutate({
      taskId,
      reminderAt: new Date(customDateTime).toISOString(),
      preset: 'custom',
    })
  }

  const handleClearReminder = () => {
    setReminderMutation.mutate({
      taskId,
      reminderAt: null,
      preset: 'none',
    })
  }

  const isMutating = setReminderMutation.isPending
  const hasNoDueDate = !parsedDueDate

  return (
    <div ref={containerRef} className="relative">
      {/* Current Reminder Display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isMutating}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
        } border-gray-300 dark:border-gray-600`}
      >
        {parsedReminder ? (
          <Bell className="w-4 h-4 text-blue-500" />
        ) : (
          <BellOff className="w-4 h-4 text-gray-400" />
        )}
        <span
          className={`flex-1 text-left ${
            parsedReminder ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {formatReminderDisplay(parsedReminder, parsedDueDate)}
        </span>
        {isMutating ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : parsedReminder ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClearReminder()
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Clear reminder"
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
          {/* Warning if no due date */}
          {hasNoDueDate && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                Set a due date first to use preset reminders
              </p>
            </div>
          )}

          {/* Preset Options */}
          <div className="p-2 space-y-1">
            {PRESET_OPTIONS.filter((opt) => opt.value !== 'custom').map((option) => {
              const isSelected = currentPreset === option.value
              const isDisabled = option.value !== 'none' && hasNoDueDate

              return (
                <button
                  key={option.value}
                  onClick={() => handlePresetSelect(option.value)}
                  disabled={isMutating || isDisabled}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.value === 'none' ? (
                    <BellOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Bell className="w-4 h-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">{option.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Custom DateTime */}
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Custom reminder time
              </p>
            </div>

            <input
              type="datetime-local"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleCustomReminder}
              disabled={!customDateTime || isMutating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Set reminder
            </button>
          </div>

          {/* Clear Option */}
          {parsedReminder && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={handleClearReminder}
                disabled={isMutating}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="w-4 h-4" />
                Remove reminder
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ReminderSelector
