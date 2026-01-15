/*
 * SubtaskList Component
 * Version: 2.0.0
 *
 * List of subtasks with 3-state status toggle, inline add, context menu, and CRUD operations.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:35 CET
 *
 * Modified by:
 * Session: (current)
 * Signed: 2026-01-03
 * Change: Task 266 - Enhanced subtasks with description, assignee display, time info, context menu
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react'
import { Plus, Trash2, Clock, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getMediaUrl } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

type SubtaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

interface Assignee {
  id: number
  username: string
  name: string | null
  avatarUrl?: string | null
}

export interface Subtask {
  id: number
  title: string
  description?: string | null
  status: SubtaskStatus
  position: number
  timeEstimated: number
  timeSpent: number
  assignee?: Assignee | null
}

export interface SubtaskListProps {
  taskId: number
  subtasks: Subtask[]
  isLoading: boolean
  onCreate: (data: { taskId: number; title: string }) => Promise<unknown>
  onUpdate: (data: {
    subtaskId: number
    status?: SubtaskStatus
    title?: string
    description?: string | null
    assigneeId?: number | null
    timeEstimated?: number
    timeSpent?: number
  }) => Promise<unknown>
  onDelete: (data: { subtaskId: number }) => Promise<unknown>
  isCreating: boolean
  onEditSubtask?: (subtask: Subtask) => void
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_CYCLE: Record<SubtaskStatus, SubtaskStatus> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
}

const STATUS_COLORS: Record<SubtaskStatus, { bg: string; border: string; text: string }> = {
  TODO: {
    bg: '',
    border: 'border-input',
    text: 'text-gray-500',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  DONE: {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-green-600 dark:text-green-400',
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTime(hours: number): string {
  if (hours === 0) return ''
  if (hours < 1) {
    const mins = Math.round(hours * 60)
    return `${mins}m`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// =============================================================================
// SubtaskItem Component
// =============================================================================

function SubtaskItem({
  subtask,
  onUpdate,
  onDelete,
  onEdit,
}: {
  subtask: Subtask
  onUpdate: SubtaskListProps['onUpdate']
  onDelete: (data: { subtaskId: number }) => Promise<unknown>
  onEdit?: (subtask: Subtask) => void
}) {
  const handleStatusToggle = useCallback(async () => {
    const nextStatus = STATUS_CYCLE[subtask.status]
    await onUpdate({ subtaskId: subtask.id, status: nextStatus })
  }, [subtask.id, subtask.status, onUpdate])

  const handleDelete = useCallback(async () => {
    if (confirm('Delete this subtask?')) {
      await onDelete({ subtaskId: subtask.id })
    }
  }, [subtask.id, onDelete])

  const isDone = subtask.status === 'DONE'
  const isInProgress = subtask.status === 'IN_PROGRESS'
  const colors = STATUS_COLORS[subtask.status]
  const hasTime = subtask.timeEstimated > 0 || subtask.timeSpent > 0

  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
      {/* Status Toggle */}
      <button
        onClick={handleStatusToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${colors.border} ${colors.bg}`}
        title={`Status: ${subtask.status.replace('_', ' ')} (click to change)`}
      >
        {isDone && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {isInProgress && (
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        )}
      </button>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm ${
            isDone ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
          }`}
        >
          {subtask.title}
        </span>
        {subtask.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {subtask.description}
          </p>
        )}
      </div>

      {/* Status Badge (for IN_PROGRESS) */}
      {isInProgress && (
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
          In Progress
        </span>
      )}

      {/* Time Display */}
      {hasTime && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {subtask.timeSpent > 0 && (
            <span className={subtask.timeSpent > subtask.timeEstimated && subtask.timeEstimated > 0 ? 'text-red-500' : ''}>
              {formatTime(subtask.timeSpent)}
            </span>
          )}
          {subtask.timeSpent > 0 && subtask.timeEstimated > 0 && <span>/</span>}
          {subtask.timeEstimated > 0 && (
            <span className="text-gray-400">{formatTime(subtask.timeEstimated)}</span>
          )}
        </div>
      )}

      {/* Assignee Avatar */}
      {subtask.assignee && (
        <div
          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden"
          title={subtask.assignee.name ?? subtask.assignee.username}
        >
          {getMediaUrl(subtask.assignee.avatarUrl) ? (
            <img
              src={getMediaUrl(subtask.assignee.avatarUrl)}
              alt={subtask.assignee.name ?? subtask.assignee.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {getInitials(subtask.assignee.name ?? subtask.assignee.username)}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={() => onEdit(subtask)}
            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleDelete}
          className="p-1 text-gray-400 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// AddSubtaskForm Component
// =============================================================================

function AddSubtaskForm({
  taskId,
  onCreate,
  isCreating,
}: {
  taskId: number
  onCreate: (data: { taskId: number; title: string }) => Promise<unknown>
  isCreating: boolean
}) {
  const [title, setTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (title.trim()) {
      await onCreate({ taskId, title: title.trim() })
      setTitle('')
    }
  }, [taskId, title, onCreate])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      } else if (e.key === 'Escape') {
        setTitle('')
        setIsAdding(false)
      }
    },
    [handleSubmit]
  )

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-2 w-full p-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add subtask
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2">
      <div className="w-5 h-5 rounded border-2 border-input" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (!title.trim()) setIsAdding(false)
        }}
        onKeyDown={handleKeyDown}
        placeholder="Subtask title..."
        className="flex-1 bg-transparent border-b border-input focus:border-blue-500 focus:outline-none text-sm"
        autoFocus
        disabled={isCreating}
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={isCreating || !title.trim()}
      >
        Add
      </Button>
    </div>
  )
}

// =============================================================================
// SubtaskList Component
// =============================================================================

export function SubtaskList({
  taskId,
  subtasks,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
  onEditSubtask,
}: SubtaskListProps) {
  // Calculate progress
  const completedCount = subtasks.filter((s) => s.status === 'DONE').length
  const progressPercent = subtasks.length > 0
    ? Math.round((completedCount / subtasks.length) * 100)
    : 0

  // Calculate total time
  const totalEstimated = subtasks.reduce((sum, s) => sum + s.timeEstimated, 0)
  const totalSpent = subtasks.reduce((sum, s) => sum + s.timeSpent, 0)

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <div className="flex items-center gap-3">
              {(totalEstimated > 0 || totalSpent > 0) && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(totalSpent)}{totalEstimated > 0 && ` / ${formatTime(totalEstimated)}`}
                </span>
              )}
              <span className="font-medium">
                {completedCount}/{subtasks.length} ({progressPercent}%)
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtask List */}
      <div className="space-y-1">
        {subtasks
          .sort((a, b) => a.position - b.position)
          .map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onEdit={onEditSubtask}
            />
          ))}
      </div>

      {/* Add Form */}
      <AddSubtaskForm
        taskId={taskId}
        onCreate={onCreate}
        isCreating={isCreating}
      />
    </div>
  )
}

export default SubtaskList
