/*
 * Column Component
 * Version: 1.1.0
 *
 * Board column container with header and task list.
 * Supports swimlane grouping, drag & drop, and quick add task.
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
 * Signed: 2025-12-28T16:45 CET
 * Change: Added taskLimit prop forwarding to TaskList components
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:10 CET
 * Change: Added onTaskClick prop forwarding to TaskList
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T20:05 CET
 * Change: Added QuickAddTask integration with ColumnHeader onAddTask
 * ═══════════════════════════════════════════════════════════════════
 */

import { ColumnHeader } from './ColumnHeader'
import { TaskList } from './TaskList'
import { cn } from '@/lib/utils'
import type { BoardColumn, BoardSwimlane, BoardTask } from './Board'

// =============================================================================
// Types
// =============================================================================

export interface ColumnProps {
  column: BoardColumn
  swimlanes: BoardSwimlane[]
  tasks: Record<string, BoardTask[]>
  projectId: number
  width: number
  /** Whether this column is in compact mode (narrow width for empty columns) */
  isCompact?: boolean
  isOverLimit: boolean
  taskCount: number
  onTaskClick?: (taskId: number) => void
  onTaskContextMenu?: (taskId: number, event: React.MouseEvent) => void
  /** Create a new task and immediately open the detail modal */
  onCreateAndEditTask?: (columnId: number, swimlaneId?: number | null) => void
}

// =============================================================================
// Column Component
// =============================================================================

export function Column({
  column,
  swimlanes,
  tasks,
  projectId,
  width,
  isCompact = false,
  isOverLimit,
  taskCount,
  onTaskClick,
  onTaskContextMenu,
  onCreateAndEditTask,
}: ColumnProps) {
  const hasMultipleSwimlanes = swimlanes.length > 1

  // Archive columns don't allow task creation
  const isArchive = column.isArchive ?? false

  // Default swimlane ID for task creation (first swimlane or null)
  const defaultSwimlaneId = hasMultipleSwimlanes ? swimlanes[0]?.id ?? null : null

  // Handler for add task button - creates task and opens modal
  const handleAddTask = () => {
    if (onCreateAndEditTask && !isArchive) {
      onCreateAndEditTask(column.id, defaultSwimlaneId)
    }
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden transition-[width] duration-300 ease-in-out"
      style={{ width }}
    >
      {/* Column Header */}
      <ColumnHeader
        column={column}
        taskCount={taskCount}
        isOverLimit={isOverLimit}
        projectId={projectId}
        isCompact={isCompact}
        onAddTask={isArchive ? undefined : handleAddTask}
      />

      {/* Column Content - always visible for drag-drop support */}
      <div className={cn(
        'flex-1 overflow-y-auto',
        isCompact && taskCount === 0 ? 'p-1 min-h-[120px]' : 'p-2 min-h-0'
      )}>
        {hasMultipleSwimlanes ? (
          // Render tasks grouped by swimlane
          <div className="space-y-4">
            {swimlanes.map((swimlane) => {
              const key = `${column.id}-${swimlane.id}`
              // Also include tasks with null swimlaneId in first swimlane
              const isFirstSwimlane = swimlane.id === swimlanes[0]?.id
              const swimlaneTasks = [
                ...(tasks[key] ?? []),
                ...(isFirstSwimlane ? (tasks[`${column.id}-default`] ?? []) : []),
              ]

              return (
                <div key={swimlane.id} className="space-y-2">
                  {/* Swimlane Header (mini) */}
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>{swimlane.name}</span>
                    <span className="text-gray-400 dark:text-gray-500">
                      ({swimlaneTasks.length})
                    </span>
                  </div>

                  {/* Task List for this swimlane */}
                  <TaskList
                    tasks={swimlaneTasks}
                    columnId={column.id}
                    swimlaneId={swimlane.id}
                    projectId={projectId}
                    taskLimit={column.taskLimit}
                    showEmpty={!(isCompact && taskCount === 0)}
                    onTaskClick={onTaskClick}
                    onTaskContextMenu={onTaskContextMenu}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          // No swimlanes - render all tasks flat
          <TaskList
            tasks={tasks[`${column.id}-default`] ?? []}
            columnId={column.id}
            swimlaneId={null}
            projectId={projectId}
            taskLimit={column.taskLimit}
            showEmpty={!(isCompact && taskCount === 0)}
            onTaskClick={onTaskClick}
            onTaskContextMenu={onTaskContextMenu}
          />
        )}
      </div>

      {/* Drop Zone Indicator (for drag & drop prep) */}
      <div
        className="h-2 transition-colors"
        data-column-id={column.id}
        data-drop-zone="true"
      />
    </div>
  )
}

export default Column
