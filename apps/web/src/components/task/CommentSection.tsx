/*
 * CommentSection Component
 * Version: 2.0.0
 *
 * Comment list with add, edit, and delete functionality.
 * Now uses RichTextEditor for rich content support.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:40 CET
 *
 * Modified by:
 * Session: MAX-2026-01-09
 * Change: Upgraded to RichTextEditor (Lexical) for rich text support
 * ===================================================================
 */

import { useState, useCallback } from 'react';
import { Send, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMediaUrl } from '@/lib/trpc';
import {
  RichTextEditor,
  getDisplayContent,
  isLexicalContent,
  lexicalToPlainText,
} from '@/components/editor';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/authSlice';
import type { EditorState, LexicalEditor } from 'lexical';

// =============================================================================
// Types
// =============================================================================

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface CommentSectionProps {
  taskId: number;
  comments: Comment[];
  isLoading: boolean;
  onCreate: (data: { taskId: number; content: string }) => Promise<unknown>;
  onUpdate: (data: { commentId: number; content: string }) => Promise<unknown>;
  onDelete: (data: { commentId: number }) => Promise<unknown>;
  isCreating: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/** Check if content is empty (works for both plain text and Lexical JSON) */
function isContentEmpty(content: string): boolean {
  if (!content) return true;
  if (!isLexicalContent(content)) return !content.trim();
  const plainText = lexicalToPlainText(content);
  return !plainText.trim();
}

// =============================================================================
// CommentItem Component
// =============================================================================

function CommentItem({
  comment,
  onUpdate,
  onDelete,
}: {
  comment: Comment;
  onUpdate: (data: { commentId: number; content: string }) => Promise<unknown>;
  onDelete: (data: { commentId: number }) => Promise<unknown>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const handleStartEdit = useCallback(() => {
    setEditedContent(getDisplayContent(comment.content));
    setEditorKey((k) => k + 1);
    setIsEditing(true);
    setShowMenu(false);
  }, [comment.content]);

  const handleEditorChange = useCallback(
    (_editorState: EditorState, _editor: LexicalEditor, jsonString: string) => {
      setEditedContent(jsonString);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!isContentEmpty(editedContent) && editedContent !== comment.content) {
      await onUpdate({ commentId: comment.id, content: editedContent });
    }
    setIsEditing(false);
  }, [comment.id, comment.content, editedContent, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditedContent(getDisplayContent(comment.content));
    setIsEditing(false);
  }, [comment.content]);

  const handleDelete = useCallback(async () => {
    if (confirm('Delete this comment?')) {
      await onDelete({ commentId: comment.id });
    }
    setShowMenu(false);
  }, [comment.id, onDelete]);

  const initials = (comment.user.name ?? comment.user.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isEdited = comment.createdAt !== comment.updatedAt;

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      {getMediaUrl(comment.user.avatarUrl) ? (
        <img
          src={getMediaUrl(comment.user.avatarUrl)}
          alt={comment.user.name ?? comment.user.username}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {comment.user.name ?? comment.user.username}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(comment.createdAt)}
          </span>
          {isEdited && <span className="text-xs text-gray-400 dark:text-gray-500">(edited)</span>}

          {/* Menu */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 z-10 mt-1 w-32 bg-card rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleStartEdit}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-accent flex items-center gap-2"
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
            <RichTextEditor
              key={editorKey}
              initialContent={editedContent || undefined}
              onChange={handleEditorChange}
              placeholder="Edit your comment..."
              minHeight="80px"
              maxHeight="300px"
              namespace={`comment-edit-${comment.id}-${editorKey}`}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} disabled={isContentEmpty(editedContent)}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-1">
            <RichTextEditor
              initialContent={getDisplayContent(comment.content)}
              readOnly={true}
              showToolbar={false}
              minHeight="auto"
              maxHeight="none"
              namespace={`comment-view-${comment.id}`}
            />
          </div>
        )}
      </div>
    </div>
  );
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
  taskId: number;
  onCreate: (data: { taskId: number; content: string }) => Promise<unknown>;
  isCreating: boolean;
  onTyping: () => void;
  onStopTyping: () => void;
}) {
  const [content, setContent] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [hasContent, setHasContent] = useState(false);

  const handleEditorChange = useCallback(
    (_editorState: EditorState, _editor: LexicalEditor, jsonString: string) => {
      setContent(jsonString);
      const isEmpty = isContentEmpty(jsonString);
      setHasContent(!isEmpty);

      if (!isEmpty) {
        onTyping();
      } else {
        onStopTyping();
      }
    },
    [onTyping, onStopTyping]
  );

  const handleSubmit = useCallback(async () => {
    if (!isContentEmpty(content)) {
      onStopTyping();
      await onCreate({ taskId, content });
      setContent('');
      setHasContent(false);
      setEditorKey((k) => k + 1); // Reset editor
    }
  }, [taskId, content, onCreate, onStopTyping]);

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
        You
      </div>
      <div className="flex-1 space-y-2">
        <RichTextEditor
          key={editorKey}
          initialContent={undefined}
          onChange={handleEditorChange}
          placeholder="Add a comment... Use **bold**, *italic*, and more!"
          minHeight="80px"
          maxHeight="300px"
          namespace={`comment-add-${taskId}-${editorKey}`}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Rich text formatting supported
          </span>
          <Button size="sm" onClick={handleSubmit} disabled={isCreating || !hasContent}>
            <Send className="w-4 h-4 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Typing Indicator Component
// =============================================================================

function TypingIndicatorDisplay({ usernames }: { usernames: string[] }) {
  if (usernames.length === 0) return null;

  const text =
    usernames.length === 1
      ? `${usernames[0]} is typing...`
      : usernames.length === 2
        ? `${usernames[0]} and ${usernames[1]} are typing...`
        : `${usernames[0]} and ${usernames.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span>{text}</span>
    </div>
  );
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
  const currentUser = useAppSelector(selectUser);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator({
    taskId,
    currentUserId: currentUser?.id ?? 0,
    enabled: Boolean(currentUser),
  });

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
    );
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
  );
}

export default CommentSection;
