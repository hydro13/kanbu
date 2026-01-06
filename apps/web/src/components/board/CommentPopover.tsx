/*
 * CommentPopover Component
 * Version: 1.0.0
 *
 * Interactive hover popover showing recent comments.
 * Comments are clickable to navigate to the comment in task detail.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { trpc } from '@/lib/trpc'
import { HoverPopover, PopoverHeader, PopoverContent } from '@/components/ui/HoverPopover'

// =============================================================================
// Types
// =============================================================================

interface CommentPopoverProps {
  taskId: number
  commentCount: number
  children: React.ReactNode
  /** Callback when comment is clicked (opens task modal with comment focus) */
  onCommentClick?: (taskId: number, commentId: number) => void
}

// =============================================================================
// Time Formatting
// =============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

// =============================================================================
// Comment Content Component
// =============================================================================

interface CommentContentProps {
  taskId: number
  commentCount: number
  onCommentClick?: (taskId: number, commentId: number) => void
}

function CommentContent({ taskId, commentCount, onCommentClick }: CommentContentProps) {
  // Lazy load comments (most recent 5)
  const commentsQuery = trpc.comment.list.useQuery({ taskId, limit: 5 })

  const handleCommentClick = (commentId: number) => {
    if (onCommentClick) {
      onCommentClick(taskId, commentId)
    }
  }

  return (
    <>
      <PopoverHeader
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        }
        title="Comments"
        subtitle={`${commentCount} total`}
      />

      <PopoverContent className="max-h-[320px]">
        {commentsQuery.isLoading ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : commentsQuery.error ? (
          <div className="px-3 py-4 text-center text-sm text-red-500">
            Failed to load comments
          </div>
        ) : commentsQuery.data?.comments && commentsQuery.data.comments.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {commentsQuery.data.comments.map((comment) => (
              <div
                key={comment.id}
                onClick={() => handleCommentClick(comment.id)}
                className="px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
              >
                {/* Comment header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {comment.user.avatarUrl ? (
                      <img
                        src={comment.user.avatarUrl}
                        alt={comment.user.name ?? comment.user.username}
                        className="h-5 w-5 rounded-full"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                        {(comment.user.name ?? comment.user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {comment.user.name ?? comment.user.username}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatTimeAgo(new Date(comment.createdAt))}
                  </span>
                </div>
                {/* Comment content preview */}
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No comments yet
          </div>
        )}
      </PopoverContent>

      {/* Footer hint */}
      {commentsQuery.data?.comments && commentsQuery.data.comments.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-lg">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Click comment to view in detail
          </span>
        </div>
      )}
    </>
  )
}

// =============================================================================
// CommentPopover Component
// =============================================================================

export function CommentPopover({ taskId, commentCount, children, onCommentClick }: CommentPopoverProps) {
  if (commentCount === 0) {
    return <>{children}</>
  }

  return (
    <HoverPopover
      content={
        <CommentContent
          taskId={taskId}
          commentCount={commentCount}
          onCommentClick={onCommentClick}
        />
      }
      width={340}
      maxHeight={400}
    >
      {children}
    </HoverPopover>
  )
}

export default CommentPopover
