/*
 * ColumnHeader Component
 * Version: 1.0.0
 *
 * Header component for Kanban board columns with title, WIP indicator, and actions.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 1d704110-bdc1-417f-a584-942696f49132
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:46 CET
 *
 * Modified by:
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Signed: 2025-12-28T13:40 CET
 * Change: Fixed props interface - taskCount and isOverLimit as separate props
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface Column {
  id: number;
  title: string;
  description?: string | null;
  position: number;
  taskLimit: number;
  isCollapsed: boolean;
  showClosed: boolean;
  isArchive?: boolean;
}

interface ColumnHeaderProps {
  column: Column;
  taskCount: number;
  isOverLimit: boolean;
  projectId: number;
  onTitleChange?: (columnId: number, newTitle: string) => void;
  onAddTask?: (columnId: number) => void;
  onEditColumn?: (columnId: number) => void;
  onDeleteColumn?: (columnId: number) => void;
  onToggleCollapse?: (columnId: number) => void;
  isEditable?: boolean;
  /** Compact mode for narrow/empty columns */
  isCompact?: boolean;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ColumnHeader({
  column,
  taskCount,
  isOverLimit,
  projectId: _projectId,
  onTitleChange,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onToggleCollapse,
  isEditable = true,
  isCompact = false,
  className,
}: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== column.title && onTitleChange) {
      onTitleChange(column.id, trimmedValue);
    } else {
      setEditValue(column.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(column.title);
      setIsEditing(false);
    }
  };

  // Compact mode for empty columns - vertical layout with title and add button
  if (isCompact && taskCount === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-2 bg-muted/50 rounded-t-lg border-b min-h-[60px]',
          column.isCollapsed && 'opacity-75',
          className
        )}
        title={column.title}
      >
        <span className="font-semibold text-xs text-center leading-tight text-muted-foreground line-clamp-2">
          {column.title}
        </span>
        {/* Add task button for compact empty columns */}
        {onAddTask && (
          <button
            onClick={() => onAddTask(column.id)}
            className="mt-1 p-1 rounded hover:bg-muted transition-colors text-muted-foreground/60 hover:text-muted-foreground"
            title="Add task"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 bg-muted/50 rounded-t-lg border-b',
        column.isCollapsed && 'opacity-75',
        className
      )}
    >
      {/* Left side: Title and WIP indicator */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Collapse toggle */}
        {onToggleCollapse && (
          <button
            onClick={() => onToggleCollapse(column.id)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={column.isCollapsed ? 'Expand column' : 'Collapse column'}
          >
            <ChevronIcon
              className={cn('h-4 w-4 transition-transform', column.isCollapsed && '-rotate-90')}
            />
          </button>
        )}

        {/* Title (editable or static) */}
        {isEditing && isEditable ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm font-semibold"
          />
        ) : (
          <h3
            className={cn(
              'font-semibold text-sm truncate',
              isEditable && 'cursor-pointer hover:text-primary'
            )}
            onClick={() => isEditable && setIsEditing(true)}
            title={column.title}
          >
            {column.title}
          </h3>
        )}

        {/* Task count / WIP limit indicator */}
        <WIPIndicator
          taskCount={taskCount}
          taskLimit={column.taskLimit}
          isOverLimit={isOverLimit}
        />
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Add task button */}
        {onAddTask && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onAddTask(column.id)}
            title="Add task"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Column menu */}
        {(onEditColumn || onDeleteColumn) && (
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowMenu(!showMenu)}
              title="Column options"
            >
              <MoreIcon className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-md shadow-lg z-10">
                {onEditColumn && (
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onEditColumn(column.id);
                    }}
                  >
                    <EditIcon className="h-4 w-4" />
                    Edit column
                  </button>
                )}
                {onDeleteColumn && (
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-destructive flex items-center gap-2"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteColumn(column.id);
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete column
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// WIP Indicator Sub-component
// =============================================================================

interface WIPIndicatorProps {
  taskCount: number;
  taskLimit: number;
  isOverLimit: boolean;
}

function WIPIndicator({ taskCount, taskLimit, isOverLimit }: WIPIndicatorProps) {
  const hasLimit = taskLimit > 0;

  return (
    <span
      className={cn(
        'px-2 py-0.5 text-xs rounded-full font-medium',
        !hasLimit && 'bg-muted text-muted-foreground',
        hasLimit &&
          !isOverLimit &&
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        hasLimit && isOverLimit && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      )}
      title={hasLimit ? `${taskCount} of ${taskLimit} (WIP limit)` : `${taskCount} tasks`}
    >
      {taskCount}
      {hasLimit && ` / ${taskLimit}`}
    </span>
  );
}

// =============================================================================
// Icons (inline SVG to avoid external dependencies)
// =============================================================================

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ColumnHeader;
