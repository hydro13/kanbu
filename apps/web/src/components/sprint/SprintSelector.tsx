/*
 * SprintSelector Component
 * Version: 1.0.0
 *
 * Dropdown component for selecting and filtering by sprint.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:50 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Zap, Clock, CheckCircle, Archive, X } from 'lucide-react'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface SprintSelectorProps {
  projectId: number
  selectedSprintId: number | null
  onSprintChange: (sprintId: number | null) => void
  showAllOption?: boolean
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getStatusIcon(status: string) {
  switch (status) {
    case 'ACTIVE':
      return Zap
    case 'PLANNING':
      return Clock
    case 'COMPLETED':
      return CheckCircle
    default:
      return Archive
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-500'
    case 'PLANNING':
      return 'text-blue-500'
    case 'COMPLETED':
      return 'text-gray-400'
    default:
      return 'text-gray-500'
  }
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
}

// =============================================================================
// Component
// =============================================================================

export function SprintSelector({
  projectId,
  selectedSprintId,
  onSprintChange,
  showAllOption = true,
  className = '',
}: SprintSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Query sprints
  const { data: sprints, isLoading } = trpc.sprint.list.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  )

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

  // Find selected sprint
  const selectedSprint = sprints?.find((s) => s.id === selectedSprintId)

  // Render selected sprint display
  const renderSelectedDisplay = () => {
    if (!selectedSprint) {
      return (
        <span className="text-gray-500 dark:text-gray-400">
          {showAllOption ? 'All Sprints' : 'Select Sprint'}
        </span>
      )
    }

    const StatusIcon = getStatusIcon(selectedSprint.status)
    const statusColor = getStatusColor(selectedSprint.status)

    return (
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        <span className="truncate">{selectedSprint.name}</span>
        {selectedSprint.status === 'ACTIVE' && (
          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
            Active
          </span>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 w-full min-w-[200px] bg-card border border-input rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        {isLoading ? (
          <span className="text-gray-400">Loading...</span>
        ) : (
          renderSelectedDisplay()
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          {/* All sprints option */}
          {showAllOption && (
            <button
              onClick={() => {
                onSprintChange(null)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !selectedSprintId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <Archive className="w-4 h-4 text-gray-400" />
              <span>All Sprints</span>
              {selectedSprintId && (
                <X className="w-4 h-4 ml-auto text-gray-400" />
              )}
            </button>
          )}

          {/* Divider */}
          {showAllOption && sprints && sprints.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700" />
          )}

          {/* Sprint options */}
          <div className="max-h-64 overflow-y-auto">
            {sprints?.map((sprint) => {
              const StatusIcon = getStatusIcon(sprint.status)
              const statusColor = getStatusColor(sprint.status)
              const isSelected = sprint.id === selectedSprintId

              return (
                <button
                  key={sprint.id}
                  onClick={() => {
                    onSprintChange(sprint.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{sprint.name}</span>
                      {sprint.status === 'ACTIVE' && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDateRange(sprint.dateStart, sprint.dateEnd)}</span>
                      <span>•</span>
                      <span>{sprint.totalTasks} tasks</span>
                      {sprint.progress > 0 && (
                        <>
                          <span>•</span>
                          <span>{sprint.progress}% done</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Empty state */}
            {(!sprints || sprints.length === 0) && (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                No sprints found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintSelector
