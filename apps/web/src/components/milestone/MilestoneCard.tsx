/*
 * Milestone Card Component
 * Version: 1.0.0
 *
 * Displays a single milestone with progress bar, task count, and due date.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 114f11bf-23b9-4a07-bc94-a4e80ec0c02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:10 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface MilestoneCardProps {
  milestone: {
    id: number
    name: string
    description: string | null
    dateDue: Date | string | null
    isCompleted: boolean
    totalTasks: number
    completedTasks: number
    openTasks: number
    progress: number
    dueStatus: 'overdue' | 'due_soon' | 'on_track' | 'no_date'
  }
  onEdit?: (milestoneId: number) => void
  onDelete?: (milestoneId: number) => void
  onClick?: (milestoneId: number) => void
}

// =============================================================================
// Icons
// =============================================================================

function FlagIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function CalendarIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function TaskIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function EditIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getDueStatusColor(status: MilestoneCardProps['milestone']['dueStatus']): string {
  switch (status) {
    case 'overdue':
      return 'text-red-600 bg-red-50'
    case 'due_soon':
      return 'text-orange-600 bg-orange-50'
    case 'on_track':
      return 'text-green-600 bg-green-50'
    default:
      return 'text-gray-500 bg-gray-50'
  }
}

function getDueStatusText(status: MilestoneCardProps['milestone']['dueStatus']): string {
  switch (status) {
    case 'overdue':
      return 'Overdue'
    case 'due_soon':
      return 'Due soon'
    case 'on_track':
      return 'On track'
    default:
      return ''
  }
}

function getProgressColor(progress: number): string {
  if (progress >= 100) return 'bg-green-500'
  if (progress >= 75) return 'bg-blue-500'
  if (progress >= 50) return 'bg-yellow-500'
  if (progress >= 25) return 'bg-orange-500'
  return 'bg-gray-400'
}

// =============================================================================
// Component
// =============================================================================

export function MilestoneCard({ milestone, onEdit, onDelete, onClick }: MilestoneCardProps) {
  const [showActions, setShowActions] = useState(false)
  const utils = trpc.useUtils()

  const toggleCompleteMutation = trpc.milestone.update.useMutation({
    onSuccess: () => {
      utils.milestone.list.invalidate()
    },
  })

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleCompleteMutation.mutate({
      milestoneId: milestone.id,
      isCompleted: !milestone.isCompleted,
    })
  }

  return (
    <div
      className={`bg-white rounded-lg border ${
        milestone.isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
      } p-4 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => onClick?.(milestone.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {milestone.isCompleted ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <FlagIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
          <h3 className={`font-medium ${milestone.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {milestone.name}
          </h3>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={handleToggleComplete}
            className={`p-1 rounded hover:bg-gray-100 ${
              milestone.isCompleted ? 'text-gray-400' : 'text-green-500'
            }`}
            title={milestone.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          >
            <CheckCircleIcon className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(milestone.id)
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Edit milestone"
            >
              <EditIcon />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(milestone.id)
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"
              title="Delete milestone"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {milestone.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{milestone.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{milestone.progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(milestone.progress)} transition-all duration-300`}
            style={{ width: `${milestone.progress}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm">
        {/* Task Count */}
        <div className="flex items-center gap-1 text-gray-600">
          <TaskIcon />
          <span>
            {milestone.completedTasks}/{milestone.totalTasks} tasks
          </span>
        </div>

        {/* Due Date */}
        {milestone.dateDue && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${getDueStatusColor(milestone.dueStatus)}`}>
            <CalendarIcon />
            <span>{formatDate(milestone.dateDue)}</span>
            {milestone.dueStatus !== 'no_date' && !milestone.isCompleted && (
              <span className="font-medium ml-1">({getDueStatusText(milestone.dueStatus)})</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MilestoneCard
