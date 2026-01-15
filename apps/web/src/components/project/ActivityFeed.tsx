/*
 * ActivityFeed Component
 * Version: 1.0.0
 *
 * Project-wide activity feed.
 * Shows recent activities across all tasks in a project.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: abe602e0-56a9-4461-9c9f-84bdc854d640
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react'
import {
  ArrowRight,
  CheckSquare,
  MessageSquare,
  Edit,
  Plus,
  RotateCcw,
  XCircle,
  Activity as ActivityIcon,
  RefreshCw,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'

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

interface Activity {
  id: number
  eventType: string
  entityType: string
  entityId: number
  changes: ActivityData
  createdAt: string
  user: ActivityUser | null
}

export interface ActivityFeedProps {
  projectId: number
  limit?: number
  compact?: boolean
}

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

function getEventIcon(eventType: string, compact: boolean) {
  const size = compact ? 'w-3 h-3' : 'w-4 h-4'
  if (eventType.startsWith('task.moved')) return <ArrowRight className={`${size} text-blue-500`} />
  if (eventType.startsWith('task.updated')) return <Edit className={`${size} text-yellow-500`} />
  if (eventType.startsWith('task.created')) return <Plus className={`${size} text-green-500`} />
  if (eventType.startsWith('task.closed')) return <XCircle className={`${size} text-gray-500`} />
  if (eventType.startsWith('task.reopened')) return <RotateCcw className={`${size} text-purple-500`} />
  if (eventType.startsWith('subtask')) return <CheckSquare className={`${size} text-teal-500`} />
  if (eventType.startsWith('comment')) return <MessageSquare className={`${size} text-blue-400`} />
  return <Edit className={`${size} text-gray-400`} />
}

function getEventDescription(activity: Activity): string {
  const { eventType, changes } = activity
  const metadata = changes?.metadata

  switch (eventType) {
    case 'task.created':
      return metadata?.taskTitle ? `created "${metadata.taskTitle}"` : 'created a task'
    case 'task.updated': {
      const changeList = changes?.changes ?? []
      if (changeList.length === 0) return 'updated a task'
      const fields = changeList.map((c) => c.field).join(', ')
      return `updated ${fields}`
    }
    case 'task.moved': {
      const changeList = changes?.changes ?? []
      const columnChange = changeList.find((c) => c.field === 'column')
      if (columnChange) {
        return `moved to ${columnChange.newValue}`
      }
      return 'moved a task'
    }
    case 'task.closed':
      return 'closed a task'
    case 'task.reopened':
      return 'reopened a task'
    case 'subtask.created':
      return 'added a subtask'
    case 'subtask.completed':
      return 'completed a subtask'
    case 'comment.created':
      return 'added a comment'
    default:
      return eventType.replace('.', ' ')
  }
}

// =============================================================================
// ActivityFeedItem Component
// =============================================================================

function ActivityFeedItem({
  activity,
  compact,
}: {
  activity: Activity
  compact: boolean
}) {
  const user = activity.user
  const initials = user
    ? (user.name ?? user.username)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-sm">
        <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
          {getEventIcon(activity.eventType, true)}
        </div>
        <span className="font-medium text-foreground truncate">
          {user?.name ?? user?.username ?? 'System'}
        </span>
        <span className="text-gray-500 dark:text-gray-400 truncate flex-1">
          {getEventDescription(activity)}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {formatTimestamp(activity.createdAt)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex gap-3 py-3">
      {/* Avatar */}
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.name ?? user.username}
          className="w-8 h-8 rounded-full shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 shrink-0">
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">
            {user?.name ?? user?.username ?? 'System'}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {getEventDescription(activity)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            {getEventIcon(activity.eventType, true)}
            <span className="capitalize">{activity.entityType}</span>
          </div>
          <span>•</span>
          <span>{formatTimestamp(activity.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ActivityFeed Component
// =============================================================================

export function ActivityFeed({ projectId, limit = 20, compact = false }: ActivityFeedProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = trpc.activity.getRecent.useQuery(
    { projectId, limit },
    { staleTime: 30000 } // 30 second cache
  ) as any

  const data = query.data
  const isLoading = query.isLoading as boolean
  const refetch = query.refetch as () => void
  const isRefetching = query.isRefetching as boolean

  const activities = useMemo(() => (data?.activities ?? []) as Activity[], [data])

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: compact ? 5 : 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} rounded-full bg-gray-200 dark:bg-gray-700`} />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              {!compact && <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <ActivityIcon className="w-4 h-4" />
          <span>Recent Activity</span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activity List */}
      {activities.length > 0 ? (
        <div className={compact ? 'space-y-0.5' : 'divide-y divide-gray-200 dark:divide-gray-700'}>
          {activities.map((activity) => (
            <ActivityFeedItem
              key={activity.id}
              activity={activity}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
          No recent activity
        </div>
      )}
    </div>
  )
}

export default ActivityFeed
