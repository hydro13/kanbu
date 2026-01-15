/*
 * TaskCard Component
 * Version: 1.0.0
 *
 * Individual task card with priority, tags, assignees, and metadata.
 * Prepared for drag & drop functionality.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:40 CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:10 CET
 * Change: Added onTaskClick prop, removed useNavigate (modal handles navigation)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { TaskQuickActions } from '@/components/task/TaskQuickActions'
import { GitBranchIndicator } from './WorkflowStatusBadge'
import { SubtaskPopover } from './SubtaskPopover'
import { DescriptionPopover } from './DescriptionPopover'
import { CommentPopover } from './CommentPopover'
import { UserPopover } from './UserPopover'
import { TaskContextProvider } from '@/contexts/TaskContext'
import { getMediaUrl } from '@/lib/trpc'
import type { BoardTask } from './Board'

// =============================================================================
// Types
// =============================================================================

export interface TaskCardProps {
  task: BoardTask
  projectId: number
  onTaskClick?: (taskId: number) => void
  onContextMenu?: (taskId: number, event: React.MouseEvent) => void
}

// =============================================================================
// Priority Colors
// =============================================================================

const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  3: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Low',
  1: 'Normal',
  2: 'High',
  3: 'Urgent',
}

// =============================================================================
// Helper Components
// =============================================================================

function PriorityBadge({ priority }: { priority: number }) {
  if (priority === 0) return null // Don't show low priority

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[0]}`}
    >
      {PRIORITY_LABELS[priority] ?? 'Low'}
    </span>
  )
}

function TagBadge({ tag }: { tag: { id: number; name: string; color: string | null } }) {
  const bgColor = tag.color ?? '#6B7280'

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: bgColor }}
    >
      {tag.name}
    </span>
  )
}

function AssigneeAvatar({
  assignee,
}: {
  assignee: { id: number; username: string; name: string | null; email: string | null; avatarUrl: string | null }
}) {
  const initials = (assignee.name ?? assignee.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (assignee.avatarUrl) {
    return (
      <img
        src={getMediaUrl(assignee.avatarUrl)}
        alt={assignee.name ?? assignee.username}
        className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800"
      />
    )
  }

  return (
    <div
      className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800"
    >
      {initials}
    </div>
  )
}

// =============================================================================
// Icons
// =============================================================================

function SubtaskIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDueDate(dateString: string): { text: string; isOverdue: boolean; isDueSoon: boolean } {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const isOverdue = diffDays < 0
  const isDueSoon = diffDays >= 0 && diffDays <= 2

  // Format the date
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const text = date.toLocaleDateString(undefined, options)

  return { text, isOverdue, isDueSoon }
}

// =============================================================================
// TaskCard Component
// =============================================================================

export function TaskCard({ task, projectId, onTaskClick, onContextMenu }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    if (onTaskClick) {
      onTaskClick(task.id)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(task.id, e)
    }
  }

  const dueInfo = task.dateDue ? formatDueDate(task.dateDue) : null

  return (
    <div
      className="relative bg-background rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-300 dark:hover:border-blue-600"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-task-id={task.id}
      data-task-card
      data-draggable="true"
    >
      {/* Quick Actions (appear on hover) */}
      <TaskQuickActions
        taskId={task.id}
        projectId={projectId}
        currentPriority={task.priority}
        isVisible={isHovered}
        onOpenDetail={() => onTaskClick?.(task.id)}
        onOpenContextMenu={(e) => onContextMenu?.(task.id, e)}
      />
      {/* Header: Reference + Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {task.reference && (
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
            {task.reference}
          </span>
        )}
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Progress bar (if progress > 0) */}
      {task.progress > 0 && (
        <div className="mb-2">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Metadata + Assignees */}
      <div className="flex items-center justify-between mt-2">
        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          {task.subtaskCount > 0 && (
            <SubtaskPopover
              taskId={task.id}
              subtaskCount={task.subtaskCount}
              progress={task.progress}
              onSubtaskClick={(taskId) => onTaskClick?.(taskId)}
            >
              <span className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors">
                <SubtaskIcon />
                {task.subtaskCount}
              </span>
            </SubtaskPopover>
          )}
          {task.description && (
            <DescriptionPopover description={task.description}>
              <span className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors">
                <NoteIcon />
              </span>
            </DescriptionPopover>
          )}
          {task.commentCount > 0 && (
            <CommentPopover
              taskId={task.id}
              commentCount={task.commentCount}
              onCommentClick={(taskId) => onTaskClick?.(taskId)}
            >
              <span className="flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors">
                <CommentIcon />
                {task.commentCount}
              </span>
            </CommentPopover>
          )}
          {dueInfo && (
            <span
              className={`flex items-center gap-1 ${
                dueInfo.isOverdue
                  ? 'text-red-500 dark:text-red-400'
                  : dueInfo.isDueSoon
                    ? 'text-orange-500 dark:text-orange-400'
                    : ''
              }`}
            >
              <CalendarIcon />
              {dueInfo.text}
            </span>
          )}
          {task.githubBranch && (
            <GitBranchIndicator branchName={task.githubBranch} />
          )}
        </div>

        {/* Assignees */}
        {task.assignees.length > 0 && (
          <div className="flex -space-x-2">
            <TaskContextProvider
              taskId={task.id}
              taskTitle={task.title}
              taskReference={task.reference ?? undefined}
              projectId={projectId}
            >
              {task.assignees.slice(0, 3).map((assignee) => (
                <UserPopover key={assignee.id} user={assignee}>
                  <AssigneeAvatar assignee={assignee} />
                </UserPopover>
              ))}
            </TaskContextProvider>
            {task.assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 ring-2 ring-white dark:ring-gray-800">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskCard
