/*
 * CommentSection Component
 * Version: 1.0.0
 *
 * Comment list with add, edit, and delete functionality.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:40 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react'
import { Send, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'

// =============================================================================
// Types
// =============================================================================

interface Comment {
  id: number
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: number
    username: string
    name: string | null
    avatarUrl: string | null
  }
}

export interface CommentSectionProps {
  taskId: number
  comments: Comment[]
  isLoading: boolean
  onCreate: (data: { taskId: number; content: string }) => Promise<unknown>
  onUpdate: (data: { commentId: number; content: string }) => Promise<unknown>
  onDelete: (data: { commentId: number }) => Promise<unknown>
  isCreating: boolean
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

// =============================================================================
// CommentItem Component
// =============================================================================

function CommentItem({
  comment,
  onUpdate,
  onDelete,
}: {
  comment: Comment
  onUpdate: (data: { commentId: number; content: string }) => Promise<unknown>
  onDelete: (data: { commentId: number }) => Promise<unknown>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content)
  const [showMenu, setShowMenu] = useState(false)

  const handleSave = useCallback(async () => {
    if (editedContent.trim() && editedContent !== comment.content) {
      await onUpdate({ commentId: comment.id, content: editedContent.trim() })
    }
    setIsEditing(false)
  }, [comment.id, comment.content, editedContent, onUpdate])

  const handleDelete = useCallback(async () => {
    if (confirm('Delete this comment?')) {
      await onDelete({ commentId: comment.id })
    }
    setShowMenu(false)
  }, [comment.id, onDelete])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditedContent(comment.content)
        setIsEditing(false)
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave()
      }
    },
    [comment.content, handleSave]
  )

  const initials = (comment.user.name ?? comment.user.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const isEdited = comment.createdAt !== comment.updatedAt

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      {comment.user.avatarUrl ? (
        <img
          src={comment.user.avatarUrl}
          alt={comment.user.name ?? comment.user.username}
          className="w-8 h-8 rounded-full"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {comment.user.name ?? comment.user.username}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(comment.createdAt)}
          </span>
          {isEdited && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>
          )}

          {/* Menu */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 z-10 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setIsEditing(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditedContent(comment.content)
                  setIsEditing(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.content}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// AddCommentForm Component
// =============================================================================

function AddCommentForm({
  taskId,
  onCreate,
  isCreating,
  onTyping,
  onStopTyping,
}: {
  taskId: number
  onCreate: (data: { taskId: number; content: string }) => Promise<unknown>
  isCreating: boolean
  onTyping: () => void
  onStopTyping: () => void
}) {
  const [content, setContent] = useState('')

  const handleSubmit = useCallback(async () => {
    if (content.trim()) {
      onStopTyping()
      await onCreate({ taskId, content: content.trim() })
      setContent('')
    }
  }, [taskId, content, onCreate, onStopTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
      if (e.target.value.trim()) {
        onTyping()
      } else {
        onStopTyping()
      }
    },
    [onTyping, onStopTyping]
  )

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium text-white">
        You
      </div>
      <div className="flex-1 space-y-2">
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onStopTyping}
          placeholder="Add a comment..."
          className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          disabled={isCreating}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Ctrl+Enter to submit
          </span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isCreating || !content.trim()}
          >
            <Send className="w-4 h-4 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Typing Indicator Component
// =============================================================================

function TypingIndicatorDisplay({ usernames }: { usernames: string[] }) {
  if (usernames.length === 0) return null

  const text =
    usernames.length === 1
      ? `${usernames[0]} is typing...`
      : usernames.length === 2
        ? `${usernames[0]} and ${usernames[1]} are typing...`
        : `${usernames[0]} and ${usernames.length - 1} others are typing...`

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  )
}

// =============================================================================
// CommentSection Component
// =============================================================================

export function CommentSection({
  taskId,
  comments,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  isCreating,
}: CommentSectionProps) {
  const currentUser = useAppSelector(selectUser)
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator({
    taskId,
    currentUserId: currentUser?.id ?? 0,
    enabled: Boolean(currentUser),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comment List */}
      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No comments yet. Be the first to comment!
        </div>
      )}

      {/* Typing Indicator */}
      <TypingIndicatorDisplay usernames={typingUsers.map((u) => u.username)} />

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Add Comment Form */}
      <AddCommentForm
        taskId={taskId}
        onCreate={onCreate}
        isCreating={isCreating}
        onTyping={startTyping}
        onStopTyping={stopTyping}
      />
    </div>
  )
}

export default CommentSection
