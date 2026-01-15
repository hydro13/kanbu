/*
 * Board Component
 * Version: 1.2.0
 *
 * Main board layout component with horizontal scroll for columns.
 * Handles swimlane grouping, drag & drop, and responsive design.
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
 * Signed: 2025-12-28T16:20 CET
 * Change: Added BoardDndContext wrapper for drag & drop
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:10 CET
 * Change: Added TaskDetailModal integration with onTaskClick flow
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T20:15 CET
 * Change: Added TaskContextMenu for right-click actions
 * ═══════════════════════════════════════════════════════════════════
 */

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { Column } from './Column'
import { BoardDndContext } from './DndContext'
import { useDragDrop } from '@/hooks/useDragDrop'
import { TaskDetailModal } from '@/components/task/TaskDetailModal'
import { TaskContextMenu } from '@/components/task/TaskContextMenu'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface BoardColumn {
  id: number
  title: string
  description: string | null
  position: number
  taskLimit: number
  isCollapsed: boolean
  showClosed: boolean
  isArchive: boolean
}

export interface BoardSwimlane {
  id: number
  name: string
  description: string | null
  position: number
}

export interface BoardTask {
  id: number
  title: string
  description: string | null
  reference: string | null
  priority: number
  score: number
  progress: number
  position: number
  color: string | null
  columnId: number
  swimlaneId: number | null
  dateDue: string | null
  dateStarted: string | null
  dateCompleted: string | null
  timeEstimated: number
  timeSpent: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  githubBranch: string | null
  column: { id: number; title: string }
  swimlane: { id: number; name: string } | null
  assignees: Array<{
    id: number
    username: string
    name: string | null
    email: string | null
    avatarUrl: string | null
  }>
  tags: Array<{
    id: number
    name: string
    color: string | null
  }>
  subtaskCount: number
  commentCount: number
}

export interface BoardProps {
  columns: BoardColumn[]
  swimlanes: BoardSwimlane[]
  tasks: BoardTask[]
  projectId: number
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Group tasks by column and swimlane
 */
function groupTasks(tasks: BoardTask[], _swimlanes: BoardSwimlane[]) {
  const grouped: Record<string, BoardTask[]> = {}

  // Initialize empty arrays for all column/swimlane combinations
  tasks.forEach((task) => {
    const key = `${task.columnId}-${task.swimlaneId ?? 'default'}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key]!.push(task)
  })

  // Sort tasks within each group by position
  Object.keys(grouped).forEach((key) => {
    grouped[key]!.sort((a, b) => a.position - b.position)
  })

  return grouped
}

// =============================================================================
// Board Component
// =============================================================================

// Context menu state type
interface ContextMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  taskId: number | null
  columnId: number
  priority: number
}

export function Board({ columns, swimlanes, tasks, projectId }: BoardProps) {
  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<BoardTask[]>(tasks)

  // Task detail modal state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    taskId: null,
    columnId: 0,
    priority: 0,
  })

  // Refs for drag-to-pan
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // Zoom state for column width scaling
  const [zoomScale, setZoomScale] = useState(1)
  const MIN_ZOOM = 0.6
  const MAX_ZOOM = 1.4

  // Handle mouse wheel for zoom (scroll = zoom, shift+scroll = horizontal pan)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Shift + scroll = horizontal scroll (let browser handle natively)
    if (e.shiftKey) return

    // Normal scroll = zoom
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setZoomScale((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)))
  }, [])

  // Drag-to-pan handlers
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    // Only left mouse button and not on interactive elements
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Don't start panning if clicking on task cards, buttons, or other interactive elements
    if (target.closest('[data-task-card]') || target.closest('button') || target.closest('a')) return

    isPanning.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing'
    }
    e.preventDefault()
  }, [])

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !containerRef.current) return

    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y

    containerRef.current.scrollLeft -= dx
    containerRef.current.scrollTop -= dy

    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePanEnd = useCallback(() => {
    isPanning.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }, [])

  // Handler for task click (opens modal)
  const handleTaskClick = useCallback((taskId: number) => {
    setSelectedTaskId(taskId)
  }, [])

  // Handler for modal close
  const handleModalClose = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils()

  // Create task mutation - creates task and immediately opens modal
  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: (data) => {
      // Invalidate task list to refresh board
      utils.task.list.invalidate({ projectId })
      // Immediately open the task detail modal
      setSelectedTaskId(data.id)
    },
  })

  // Handler for creating a new task and opening modal
  const handleCreateAndEditTask = useCallback(
    (columnId: number, swimlaneId?: number | null) => {
      createTaskMutation.mutate({
        projectId,
        columnId,
        swimlaneId: swimlaneId ?? undefined,
        title: 'New Task',
      })
    },
    [createTaskMutation, projectId]
  )

  // Handler for task context menu (right-click)
  const handleTaskContextMenu = useCallback(
    (taskId: number, event: React.MouseEvent) => {
      event.preventDefault()
      const task = localTasks.find((t) => t.id === taskId)
      if (!task) return

      setContextMenu({
        isOpen: true,
        position: { x: event.clientX, y: event.clientY },
        taskId,
        columnId: task.columnId,
        priority: task.priority,
      })
    },
    [localTasks]
  )

  // Handler for closing context menu
  const handleContextMenuClose = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  // Update local tasks when props change (not during drag)
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // Drag and drop hook
  const { moveTask, error, clearError } = useDragDrop({
    projectId,
    tasks: localTasks,
    onOptimisticUpdate: setLocalTasks,
  })

  // Handler for task moves
  const handleTaskMove = useCallback(
    async (
      taskId: number,
      targetColumnId: number,
      targetSwimlaneId: number | null,
      newPosition: number
    ) => {
      await moveTask(taskId, targetColumnId, targetSwimlaneId, newPosition)
    },
    [moveTask]
  )

  // Sort columns by position
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.position - b.position)
  }, [columns])

  // Sort swimlanes by position
  const sortedSwimlanes = useMemo(() => {
    return [...swimlanes].sort((a, b) => a.position - b.position)
  }, [swimlanes])

  // Group tasks by column/swimlane
  const groupedTasks = useMemo(() => {
    return groupTasks(localTasks, swimlanes)
  }, [localTasks, swimlanes])

  // Calculate column widths based on number of columns and zoom scale
  const columnWidth = useMemo(() => {
    // Base width: Min 280px, max 360px depending on number of columns
    const baseWidth = Math.max(280, Math.min(360, window.innerWidth / (columns.length + 1)))
    // Apply zoom scale
    return baseWidth * zoomScale
  }, [columns.length, zoomScale])

  // Empty column width is 30% of normal (70% smaller)
  const emptyColumnWidth = columnWidth * 0.3

  // Calculate task counts per column for width determination
  const columnTaskCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    sortedColumns.forEach((col) => {
      counts[col.id] = localTasks.filter((t) => t.columnId === col.id).length
    })
    return counts
  }, [sortedColumns, localTasks])

  // Check if we have swimlanes (more than just default)
  const hasMultipleSwimlanes = sortedSwimlanes.length > 1

  return (
    <BoardDndContext tasks={localTasks} onTaskMove={handleTaskMove}>
      {/* Error toast for failed moves */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>Failed to move task</span>
          <button
            onClick={clearError}
            className="text-white hover:text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full overflow-auto bg-gray-50 dark:bg-gray-900 select-none"
        style={{ cursor: 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <div
          className="flex h-full p-4 gap-4"
        >
          {sortedColumns.map((column) => {
            // Get task count for this column
            const taskCount = columnTaskCounts[column.id] ?? 0
            const isOverLimit = column.taskLimit > 0 && taskCount >= column.taskLimit
            // Empty columns are 70% smaller (30% of normal width)
            const isEmpty = taskCount === 0
            const effectiveWidth = isEmpty ? emptyColumnWidth : columnWidth

            return (
              <Column
                key={column.id}
                column={column}
                swimlanes={hasMultipleSwimlanes ? sortedSwimlanes : []}
                tasks={groupedTasks}
                projectId={projectId}
                width={effectiveWidth}
                isCompact={isEmpty}
                isOverLimit={isOverLimit}
                taskCount={taskCount}
                onTaskClick={handleTaskClick}
                onTaskContextMenu={handleTaskContextMenu}
                onCreateAndEditTask={handleCreateAndEditTask}
              />
            )
          })}

          {/* Add Column Button */}
          <div
            className="flex-shrink-0 flex items-start"
            style={{ width: columnWidth }}
          >
            <button
              className="w-full h-12 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              onClick={() => {
                // TODO: Open add column modal
                console.log('Add column clicked')
              }}
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="font-medium">Add Column</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        projectId={projectId}
        isOpen={selectedTaskId !== null}
        onClose={handleModalClose}
      />

      {/* Task Context Menu */}
      {contextMenu.taskId !== null && (
        <TaskContextMenu
          taskId={contextMenu.taskId}
          projectId={projectId}
          currentColumnId={contextMenu.columnId}
          currentPriority={contextMenu.priority}
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          columns={sortedColumns}
          onClose={handleContextMenuClose}
          onOpenDetail={() => {
            const taskId = contextMenu.taskId
            handleContextMenuClose()
            if (taskId !== null) {
              handleTaskClick(taskId)
            }
          }}
        />
      )}
    </BoardDndContext>
  )
}

export default Board
