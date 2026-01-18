/*
 * QuickAddTask Component
 * Version: 1.0.0
 *
 * Inline task creation component for quick adding tasks to a column.
 * Shows input field + Enter to create, Escape to cancel.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T20:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface QuickAddTaskProps {
  projectId: number;
  columnId: number;
  swimlaneId?: number | null;
  onCancel: () => void;
  onCreated?: (taskId: number) => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function QuickAddTask({
  projectId,
  columnId,
  swimlaneId = null,
  onCancel,
  onCreated,
  className,
}: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Create task mutation
  const createMutation = trpc.task.create.useMutation({
    onSuccess: (data) => {
      // Invalidate task list to refresh board
      utils.task.list.invalidate({ projectId });
      setTitle('');
      setIsSubmitting(false);
      onCreated?.(data.id);
      // Keep open for another quick add
      inputRef.current?.focus();
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isSubmitting) return;

    setIsSubmitting(true);
    createMutation.mutate({
      projectId,
      columnId,
      swimlaneId: swimlaneId ?? undefined,
      title: trimmedTitle,
    });
  }, [title, isSubmitting, projectId, columnId, swimlaneId, createMutation]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSubmit, onCancel]
  );

  // Handle click outside to cancel
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-quick-add]')) {
        // Only cancel if input is empty
        if (!title.trim()) {
          onCancel();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [title, onCancel]);

  return (
    <div
      data-quick-add
      className={cn('p-2 bg-card rounded-card border border-border shadow-sm', className)}
    >
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task title..."
        disabled={isSubmitting}
        className="mb-2"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Enter to add, Esc to cancel
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-7 px-2 text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="h-7 px-2 text-xs"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>
      {createMutation.error && (
        <p className="mt-2 text-xs text-red-500">{createMutation.error.message}</p>
      )}
    </div>
  );
}

export default QuickAddTask;
