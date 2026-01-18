/*
 * TaskList Component
 * Version: 1.1.0
 *
 * Task list within a column, with empty state and loading skeleton.
 * Now with drag & drop support via dnd-kit.
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
 * Signed: 2025-12-28T16:15 CET
 * Change: Added DroppableColumn and DraggableTask for drag & drop
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:10 CET
 * Change: Added onTaskClick prop forwarding to DraggableTask
 * ═══════════════════════════════════════════════════════════════════
 */

import { DroppableColumn } from './DroppableColumn';
import { DraggableTask } from './DraggableTask';
import type { BoardTask } from './Board';

// =============================================================================
// Types
// =============================================================================

export interface TaskListProps {
  tasks: BoardTask[];
  columnId: number;
  swimlaneId: number | null;
  projectId: number;
  taskLimit?: number;
  showEmpty?: boolean;
  isLoading?: boolean;
  onTaskClick?: (taskId: number) => void;
  onTaskContextMenu?: (taskId: number, event: React.MouseEvent) => void;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function TaskSkeleton() {
  return (
    <div className="bg-background rounded-lg p-3 shadow-sm animate-pulse">
      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
      <span className="text-sm text-gray-400 dark:text-gray-500">No tasks</span>
    </div>
  );
}

// =============================================================================
// TaskList Component
// =============================================================================

export function TaskList({
  tasks,
  columnId,
  swimlaneId,
  projectId,
  taskLimit = 0,
  showEmpty = true,
  isLoading = false,
  onTaskClick,
  onTaskContextMenu,
}: TaskListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        <TaskSkeleton />
        <TaskSkeleton />
        <TaskSkeleton />
      </div>
    );
  }

  // Empty state - still wrapped in DroppableColumn for drop target
  if (tasks.length === 0) {
    return (
      <DroppableColumn
        columnId={columnId}
        swimlaneId={swimlaneId}
        tasks={tasks}
        taskLimit={taskLimit}
      >
        {showEmpty ? <EmptyState /> : null}
      </DroppableColumn>
    );
  }

  // Task list with drag & drop support
  return (
    <DroppableColumn
      columnId={columnId}
      swimlaneId={swimlaneId}
      tasks={tasks}
      taskLimit={taskLimit}
    >
      <div className="space-y-2">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            projectId={projectId}
            onTaskClick={onTaskClick}
            onTaskContextMenu={onTaskContextMenu}
          />
        ))}
      </div>
    </DroppableColumn>
  );
}

export default TaskList;
