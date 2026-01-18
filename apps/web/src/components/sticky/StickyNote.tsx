/*
 * StickyNote Component
 * Version: 2.0.0
 *
 * Individual sticky note card with color, pin status, and actions.
 * Now supports rich text content via Lexical.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T01:15 CET
 *
 * Modified: 2026-01-07
 * Change: Added RichTextEditor read-only view for rich content display
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  RichTextEditor,
  getDisplayContent,
  isLexicalContent,
  lexicalToPlainText,
} from '@/components/editor';

// =============================================================================
// Types
// =============================================================================

export type StickyNoteColor = 'YELLOW' | 'PINK' | 'BLUE' | 'GREEN' | 'PURPLE' | 'ORANGE';
export type StickyVisibility = 'PRIVATE' | 'PUBLIC';

export interface StickyNoteData {
  id: number;
  userId: number;
  title: string | null;
  content: string;
  color: StickyNoteColor;
  isPinned: boolean;
  visibility: StickyVisibility;
  createdAt: string;
  updatedAt: string;
  links?: Array<{
    id: number;
    entityType: string;
    entityId: number;
  }>;
}

interface StickyNoteProps {
  note: StickyNoteData;
  currentUserId: number;
  onEdit?: (note: StickyNoteData) => void;
  onDelete?: (noteId: number) => void;
}

// =============================================================================
// Color Config
// =============================================================================

const colorConfig: Record<StickyNoteColor, { bg: string; border: string; text: string }> = {
  YELLOW: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-yellow-900 dark:text-yellow-100',
  },
  PINK: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-900 dark:text-pink-100',
  },
  BLUE: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-900 dark:text-blue-100',
  },
  GREEN: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-900 dark:text-green-100',
  },
  PURPLE: {
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-900 dark:text-purple-100',
  },
  ORANGE: {
    bg: 'bg-orange-100 dark:bg-orange-900/40',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-900 dark:text-orange-100',
  },
};

// =============================================================================
// Icons
// =============================================================================

function PinIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M16 4v8h2.09c1.13 0 1.77 1.33 1.06 2.21L12 22l-7.15-7.79c-.71-.88-.07-2.21 1.06-2.21H8V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function StickyNote({ note, currentUserId, onEdit, onDelete }: StickyNoteProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = trpc.useUtils();

  const togglePinMutation = trpc.stickyNote.togglePin.useMutation({
    onSuccess: () => {
      utils.stickyNote.list.invalidate();
    },
  });

  const deleteMutation = trpc.stickyNote.delete.useMutation({
    onSuccess: () => {
      utils.stickyNote.list.invalidate();
      onDelete?.(note.id);
    },
  });

  const isOwner = note.userId === currentUserId;
  const colors = colorConfig[note.color];
  const hasRichContent = isLexicalContent(note.content);

  const handleTogglePin = () => {
    togglePinMutation.mutate({ id: note.id });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate({ id: note.id });
    }
  };

  // For plain text preview (truncated)
  const plainTextPreview = lexicalToPlainText(note.content).slice(0, 300);
  const isLongContent = lexicalToPlainText(note.content).length > 300;

  return (
    <div
      className={`relative p-4 rounded-lg border-2 shadow-sm transition-all hover:shadow-md ${colors.bg} ${colors.border} ${colors.text}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {note.isPinned && <PinIcon className="h-4 w-4 opacity-70" filled />}
          {note.visibility === 'PRIVATE' ? (
            <LockIcon className="h-3 w-3 opacity-50" />
          ) : (
            <GlobeIcon className="h-3 w-3 opacity-50" />
          )}
        </div>

        {/* Actions - only show on hover and if owner */}
        {isOwner && isHovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleTogglePin}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title={note.isPinned ? 'Unpin' : 'Pin'}
            >
              <PinIcon className="h-4 w-4" filled={note.isPinned} />
            </button>
            <button
              onClick={() => onEdit?.(note)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              title="Edit"
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 transition-colors"
              title="Delete"
              disabled={deleteMutation.isPending}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      {note.title && <h4 className="font-semibold mb-2 line-clamp-1">{note.title}</h4>}

      {/* Content */}
      {isExpanded && hasRichContent ? (
        // Expanded rich content view
        <div className="sticky-note-content">
          <RichTextEditor
            key={`view-${note.id}`}
            initialContent={getDisplayContent(note.content)}
            readOnly
            showToolbar={false}
            minHeight="auto"
            maxHeight="none"
            namespace={`sticky-note-view-${note.id}`}
            className="sticky-note-editor-compact"
          />
        </div>
      ) : (
        // Collapsed plain text preview
        <div className="text-sm">
          <p className="whitespace-pre-wrap line-clamp-6">
            {plainTextPreview}
            {isLongContent && !isExpanded && '...'}
          </p>
        </div>
      )}

      {/* Expand/Collapse button for rich content */}
      {(hasRichContent || isLongContent) && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
        >
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-current/10 text-xs opacity-60">
        {new Date(note.updatedAt).toLocaleDateString('nl-NL', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

export default StickyNote;
