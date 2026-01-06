/*
 * Milestone Selector Component
 * Version: 1.0.0
 *
 * Dropdown selector for assigning a task to a milestone.
 * Used in task detail/edit views.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 114f11bf-23b9-4a07-bc94-a4e80ec0c02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:20 CET
 *
 * Modified by:
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T11:25 CET
 * Change: Fixed FlagIcon missing size classes in trigger button
 *
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T12:15 CET
 * Change: Removed padding/border from trigger for sidebar alignment
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface MilestoneSelectorProps {
  projectId: number
  taskId: number
  currentMilestoneId: number | null
  onMilestoneChange?: (milestoneId: number | null) => void
  disabled?: boolean
  className?: string
}

// =============================================================================
// Icons
// =============================================================================

function FlagIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-blue-500'
  if (progress >= 50) return 'bg-yellow-500'
  return 'bg-gray-400'
}

function getDueStatusIndicator(status: string): string {
  switch (status) {
    case 'overdue':
      return 'border-l-2 border-red-500'
    case 'due_soon':
      return 'border-l-2 border-orange-500'
    case 'on_track':
      return 'border-l-2 border-green-500'
    default:
      return ''
  }
}

// =============================================================================
// Component
// =============================================================================

export function MilestoneSelector({
  projectId,
  taskId,
  currentMilestoneId,
  onMilestoneChange,
  disabled = false,
  className = '',
}: MilestoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()

  // Fetch milestones for project
  const { data: milestones, isLoading } = trpc.milestone.list.useQuery(
    { projectId, includeCompleted: false },
    { enabled: projectId > 0 }
  )

  // Set milestone mutation
  const setMilestoneMutation = trpc.milestone.setForTask.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate()
      utils.milestone.list.invalidate()
      setIsOpen(false)
    },
  })

  // Find current milestone
  const currentMilestone = milestones?.find((m) => m.id === currentMilestoneId)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle select
  const handleSelect = (milestoneId: number | null) => {
    if (milestoneId === currentMilestoneId) {
      setIsOpen(false)
      return
    }

    setMilestoneMutation.mutate(
      { taskId, milestoneId },
      {
        onSuccess: () => {
          onMilestoneChange?.(milestoneId)
        },
      }
    )
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || setMilestoneMutation.isPending}
        className={`flex items-center gap-2 pl-0 pr-2 py-0 w-full text-left transition-colors ${
          disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'hover:bg-gray-50 cursor-pointer rounded'
        }`}
      >
        <FlagIcon className={`h-4 w-4 flex-shrink-0 ${currentMilestone ? 'text-blue-500' : 'text-gray-400'}`} />

        <div className="flex-1 min-w-0">
          {setMilestoneMutation.isPending ? (
            <span className="text-gray-400 flex items-center gap-2">
              <LoadingSpinner />
              Saving...
            </span>
          ) : currentMilestone ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-900 truncate">{currentMilestone.name}</span>
              <span className="text-xs text-gray-500">({currentMilestone.progress}%)</span>
            </div>
          ) : (
            <span className="text-gray-400">No milestone</span>
          )}
        </div>

        {/* Clear button */}
        {currentMilestone && !disabled && !setMilestoneMutation.isPending && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleSelect(null)
            }}
            className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
            title="Remove from milestone"
          >
            <XCircleIcon />
          </button>
        )}

        <ChevronDownIcon className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <LoadingSpinner />
            </div>
          ) : milestones && milestones.length > 0 ? (
            <>
              {/* None option */}
              <button
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
                  !currentMilestoneId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {!currentMilestoneId && <CheckIcon className="text-blue-500" />}
                </div>
                <span className="text-gray-500 italic">No milestone</span>
              </button>

              {/* Milestones */}
              {milestones.map((milestone) => (
                <button
                  key={milestone.id}
                  onClick={() => handleSelect(milestone.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
                    milestone.id === currentMilestoneId ? 'bg-blue-50' : ''
                  } ${getDueStatusIndicator(milestone.dueStatus)}`}
                >
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {milestone.id === currentMilestoneId && <CheckIcon className="text-blue-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 truncate">{milestone.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Mini progress bar */}
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(milestone.progress)}`}
                          style={{ width: `${milestone.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {milestone.completedTasks}/{milestone.totalTasks} tasks
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <FlagIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No milestones in this project</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MilestoneSelector
