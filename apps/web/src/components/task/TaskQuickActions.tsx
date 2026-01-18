/*
 * TaskQuickActions Component
 * Version: 1.0.0
 *
 * Hover action buttons that appear on task cards for quick operations.
 * Shows edit, priority, assign, and more options.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T20:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface TaskQuickActionsProps {
  taskId: number;
  projectId: number;
  currentPriority: number;
  isVisible: boolean;
  onOpenDetail?: () => void;
  onOpenContextMenu?: (event: React.MouseEvent) => void;
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function EditIcon() {
  return (
    <svg
      className="h-4 w-4"
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

function PriorityIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// =============================================================================
// Priority Dropdown
// =============================================================================

const PRIORITIES = [
  { value: 0, label: 'None', color: 'bg-gray-400' },
  { value: 1, label: 'Low', color: 'bg-blue-400' },
  { value: 2, label: 'Normal', color: 'bg-yellow-400' },
  { value: 3, label: 'High', color: 'bg-orange-400' },
  { value: 4, label: 'Urgent', color: 'bg-red-500' },
];

interface PriorityDropdownProps {
  taskId: number;
  projectId: number;
  currentPriority: number;
  isOpen: boolean;
  onClose: () => void;
}

function PriorityDropdown({
  taskId,
  projectId,
  currentPriority,
  isOpen,
  onClose,
}: PriorityDropdownProps) {
  const utils = trpc.useUtils();

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[120px]">
      {PRIORITIES.map((priority) => (
        <button
          key={priority.value}
          className={cn(
            'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-accent',
            currentPriority === priority.value && 'bg-gray-50 dark:bg-gray-700/50'
          )}
          onClick={() => {
            updateMutation.mutate({
              taskId,
              priority: priority.value,
            });
          }}
          disabled={updateMutation.isPending}
        >
          <span className={cn('w-2 h-2 rounded-full', priority.color)} />
          <span>{priority.label}</span>
          {currentPriority === priority.value && <CheckIcon />}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function TaskQuickActions({
  taskId,
  projectId,
  currentPriority,
  isVisible,
  onOpenDetail,
  onOpenContextMenu,
  className,
}: TaskQuickActionsProps) {
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenDetail?.();
    },
    [onOpenDetail]
  );

  const handlePriorityClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPriorityDropdown((prev) => !prev);
  }, []);

  const handleMoreClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpenContextMenu?.(e);
    },
    [onOpenContextMenu]
  );

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'absolute top-1 right-1 flex items-center gap-0.5 bg-background rounded shadow-sm border border-gray-200 dark:border-gray-600',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Edit Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-accent"
        onClick={handleEditClick}
        title="Open task details"
      >
        <EditIcon />
      </Button>

      {/* Priority Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-accent"
          onClick={handlePriorityClick}
          title="Change priority"
        >
          <PriorityIcon />
        </Button>
        <PriorityDropdown
          taskId={taskId}
          projectId={projectId}
          currentPriority={currentPriority}
          isOpen={showPriorityDropdown}
          onClose={() => setShowPriorityDropdown(false)}
        />
      </div>

      {/* More Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-accent"
        onClick={handleMoreClick}
        title="More actions"
      >
        <MoreIcon />
      </Button>
    </div>
  );
}

export default TaskQuickActions;
