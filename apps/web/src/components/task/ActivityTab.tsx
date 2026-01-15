/*
 * ActivityTab Component
 * Version: 1.0.0
 *
 * Activity timeline for task detail modal.
 * Shows task changes, subtask completions, and comments.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: abe602e0-56a9-4461-9c9f-84bdc854d640
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import {
  ArrowRight,
  CheckSquare,
  MessageSquare,
  Edit,
  Plus,
  RotateCcw,
  XCircle,
  Filter,
} from 'lucide-react'
import { getMediaUrl } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

interface ActivityUser {
  id: number
  username: string
  name: string | null
  avatarUrl: string | null
}

interface ActivityChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

interface ActivityData {
  changes?: ActivityChange[]
  metadata?: {
    taskTitle?: string
    taskId?: number
    subtaskTitle?: string
  }
}

export interface Activity {
  id: number
  eventType: string
  entityType: string
  entityId: number
  changes: ActivityData
  createdAt: string
  user: ActivityUser | null
}

export interface ActivityTabProps {
  taskId: number
  activities: Activity[]
  isLoading: boolean
}

// =============================================================================
// Constants
// =============================================================================

const EVENT_TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'task', label: 'Task' },
  { value: 'subtask', label: 'Subtasks' },
  { value: 'comment', label: 'Comments' },
]

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getEventIcon(eventType: string) {
  if (eventType.startsWith('task.moved')) return <ArrowRight className="w-4 h-4 text-blue-500" />
  if (eventType.startsWith('task.updated')) return <Edit className="w-4 h-4 text-yellow-500" />
  if (eventType.startsWith('task.created')) return <Plus className="w-4 h-4 text-green-500" />
  if (eventType.startsWith('task.closed')) return <XCircle className="w-4 h-4 text-gray-500" />
  if (eventType.startsWith('task.reopened')) return <RotateCcw className="w-4 h-4 text-purple-500" />
  if (eventType.startsWith('subtask')) return <CheckSquare className="w-4 h-4 text-teal-500" />
  if (eventType.startsWith('comment')) return <MessageSquare className="w-4 h-4 text-blue-400" />
  return <Edit className="w-4 h-4 text-gray-400" />
}

function getEventDescription(activity: Activity): string {
  const { eventType, changes } = activity
  const metadata = changes?.metadata

  switch (eventType) {
    case 'task.created':
      return 'created this task'
    case 'task.updated': {
      const changeList = changes?.changes ?? []
      if (changeList.length === 0) return 'updated this task'
      const fields = changeList.map((c) => c.field).join(', ')
      return `updated ${fields}`
    }
    case 'task.moved': {
      const changeList = changes?.changes ?? []
      const columnChange = changeList.find((c) => c.field === 'column')
      if (columnChange) {
        return `moved from ${columnChange.oldValue} to ${columnChange.newValue}`
      }
      return 'moved this task'
    }
    case 'task.closed':
      return 'closed this task'
    case 'task.reopened':
      return 'reopened this task'
    case 'task.assigned':
      return 'assigned someone to this task'
    case 'task.unassigned':
      return 'unassigned someone from this task'
    case 'subtask.created':
      return `added subtask "${metadata?.subtaskTitle ?? 'untitled'}"`
    case 'subtask.completed':
      return 'completed a subtask'
    case 'subtask.updated':
      return 'updated a subtask'
    case 'subtask.deleted':
      return 'deleted a subtask'
    case 'comment.created':
      return 'added a comment'
    case 'comment.updated':
      return 'edited a comment'
    case 'comment.deleted':
      return 'deleted a comment'
    default:
      return eventType.replace('.', ' ')
  }
}

// =============================================================================
// ActivityItem Component
// =============================================================================

function ActivityItem({ activity }: { activity: Activity }) {
  const user = activity.user
  const initials = user
    ? (user.name ?? user.username)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  return (
    <div className="flex gap-3 py-3">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {getEventIcon(activity.eventType)}
        </div>
        <div className="flex-1 w-px bg-gray-200 dark:bg-gray-700 mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* User avatar */}
          {getMediaUrl(user?.avatarUrl) ? (
            <img
              src={getMediaUrl(user?.avatarUrl)}
              alt={user?.name ?? user?.username ?? 'User'}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {initials}
            </div>
          )}

          {/* User name */}
          <span className="text-sm font-medium text-foreground">
            {user?.name ?? user?.username ?? 'System'}
          </span>

          {/* Event description */}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getEventDescription(activity)}
          </span>

          {/* Timestamp */}
          <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
            {formatTimestamp(activity.createdAt)}
          </span>
        </div>

        {/* Changes details */}
        {activity.changes?.changes && activity.changes.changes.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {activity.changes.changes.map((change, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="font-medium capitalize">{change.field}:</span>
                <span className="text-red-500 line-through">{String(change.oldValue ?? '-')}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="text-green-500">{String(change.newValue ?? '-')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// ActivityTab Component
// =============================================================================

export function ActivityTab({ taskId: _taskId, activities, isLoading }: ActivityTabProps) {
  const [filter, setFilter] = useState('')

  const filteredActivities = filter
    ? activities.filter((a) => a.entityType === filter)
    : activities

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <div className="flex gap-1">
          {EVENT_TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === f.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      {filteredActivities.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No activity recorded yet.
        </div>
      )}
    </div>
  )
}

export default ActivityTab
