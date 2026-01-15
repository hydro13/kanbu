/*
 * DndContext Component
 * Version: 1.0.0
 *
 * Drag and drop context wrapper for the Kanban board.
 * Configures sensors for mouse, touch, and keyboard support.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T15:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { ReactNode, useCallback, useState } from 'react'
import {
  DndContext as DndKitContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { BoardTask } from './Board'
import { calculateNewPosition } from '@/lib/dnd-utils'

// =============================================================================
// Types
// =============================================================================

export interface DragState {
  activeTask: BoardTask | null
  overColumnId: number | null
  overSwimlaneId: number | null
}

export interface DndContextProps {
  children: ReactNode
  tasks: BoardTask[]
  onTaskMove: (
    taskId: number,
    targetColumnId: number,
    targetSwimlaneId: number | null,
    newPosition: number
  ) => Promise<void>
}

// =============================================================================
// Constants
// =============================================================================

const MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

// Custom collision detection that works for both:
// 1. Sorting tasks between each other (needs closestCorners)
// 2. Dropping on narrow empty columns (needs pointerWithin as fallback)
const customCollisionDetection: CollisionDetection = (args) => {
  // First try closestCorners - best for task sorting and positioning
  const closestCornersCollisions = closestCorners(args)

  // If we found task collisions, use those (for sorting between tasks)
  const taskCollisions = closestCornersCollisions.filter(
    (collision) => !String(collision.id).startsWith('column-')
  )
  if (taskCollisions.length > 0) {
    return closestCornersCollisions
  }

  // If closestCorners found column collisions, use those
  if (closestCornersCollisions.length > 0) {
    return closestCornersCollisions
  }

  // Fallback to pointerWithin for narrow/empty columns where closestCorners fails
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    return pointerCollisions
  }

  // Last resort: rectIntersection
  return rectIntersection(args)
}

// =============================================================================
// Component
// =============================================================================

export function BoardDndContext({ children, tasks, onTaskMove }: DndContextProps) {
  const [dragState, setDragState] = useState<DragState>({
    activeTask: null,
    overColumnId: null,
    overSwimlaneId: null,
  })

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px of movement before starting drag
        // This allows clicks to work without triggering drag
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // Require 250ms hold + 5px movement for touch
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      // Handle both number and string IDs
      const taskId = typeof active.id === 'number' ? active.id : parseInt(String(active.id), 10)
      const task = tasks.find((t) => t.id === taskId)

      if (task) {
        setDragState({
          activeTask: task,
          overColumnId: task.columnId,
          overSwimlaneId: task.swimlaneId,
        })
      }
    },
    [tasks]
  )

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event

    if (over) {
      // Convert ID to string for safe comparison
      const overId = String(over.id)

      // Check if over a column (format: "column-{columnId}" or "column-{columnId}-swimlane-{swimlaneId}")
      if (overId.startsWith('column-')) {
        const parts = overId.split('-')
        const columnId = parseInt(parts[1]!, 10)
        const swimlaneId = parts.length > 3 ? parseInt(parts[3]!, 10) : null

        setDragState((prev) => ({
          ...prev,
          overColumnId: columnId,
          overSwimlaneId: swimlaneId,
        }))
      } else {
        // Over a task - find which column/swimlane it belongs to
        const taskId = typeof over.id === 'number' ? over.id : parseInt(overId, 10)
        const targetTask = tasks.find((t) => t.id === taskId)
        if (targetTask) {
          setDragState((prev) => ({
            ...prev,
            overColumnId: targetTask.columnId,
            overSwimlaneId: targetTask.swimlaneId,
          }))
        }
      }
    }
  }, [tasks])

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (!over || !dragState.activeTask) {
        setDragState({
          activeTask: null,
          overColumnId: null,
          overSwimlaneId: null,
        })
        return
      }

      const taskId = typeof active.id === 'number' ? active.id : parseInt(String(active.id), 10)
      const overId = String(over.id)

      let targetColumnId: number
      let targetSwimlaneId: number | null
      let droppedOnTaskId: number | null = null

      // Parse target - could be a column or a task
      if (overId.startsWith('column-')) {
        const parts = overId.split('-')
        targetColumnId = parseInt(parts[1]!, 10)
        targetSwimlaneId = parts.length > 3 ? parseInt(parts[3]!, 10) : null
      } else {
        // Dropped on a task - find which column/swimlane it belongs to
        droppedOnTaskId = typeof over.id === 'number' ? over.id : parseInt(overId, 10)
        const targetTask = tasks.find((t) => t.id === droppedOnTaskId)
        if (!targetTask) {
          // Reset and bail if we can't find the target
          setDragState({
            activeTask: null,
            overColumnId: null,
            overSwimlaneId: null,
          })
          return
        }
        targetColumnId = targetTask.columnId
        targetSwimlaneId = targetTask.swimlaneId
      }

      const task = dragState.activeTask
      const isSameColumn = task.columnId === targetColumnId && task.swimlaneId === targetSwimlaneId

      // Get tasks in target column (excluding the dragged task)
      const tasksInTarget = tasks
        .filter(
          (t) =>
            t.columnId === targetColumnId &&
            t.swimlaneId === targetSwimlaneId &&
            t.id !== taskId
        )
        .sort((a, b) => a.position - b.position)

      // Calculate new position
      let newPosition: number
      let targetIndex: number | null = null

      if (droppedOnTaskId !== null) {
        // Dropped ON a specific task - get its index
        targetIndex = tasksInTarget.findIndex((t) => t.id === droppedOnTaskId)
      }

      // Use sortable index from over.data if available (more accurate)
      const sortableData = over.data.current?.sortable as { index?: number } | undefined
      if (sortableData?.index !== undefined) {
        targetIndex = sortableData.index
      }

      if (targetIndex !== null && targetIndex >= 0) {
        // Insert at specific position
        const positions = tasksInTarget.map((t) => t.position)
        if (positions.length === 0) {
          newPosition = 1
        } else {
          newPosition = calculateNewPosition(positions, targetIndex)
        }
      } else {
        // Dropped on empty column area - append to end
        if (tasksInTarget.length === 0) {
          newPosition = 1
        } else {
          const maxPosition = Math.max(...tasksInTarget.map((t) => t.position))
          newPosition = maxPosition + 1
        }
      }

      // Round to avoid floating point issues (API allows any positive number)
      newPosition = Math.max(0.001, Math.round(newPosition * 1000) / 1000)

      // Determine if we should call the API
      const shouldMove = !isSameColumn ||
        (droppedOnTaskId !== null && droppedOnTaskId !== taskId) ||
        (targetIndex !== null && targetIndex >= 0)

      if (shouldMove) {
        try {
          await onTaskMove(taskId, targetColumnId, targetSwimlaneId, newPosition)
        } catch (error) {
          console.error('Failed to move task:', error)
          // Error handling is done in the parent via onTaskMove
        }
      }

      // Reset drag state
      setDragState({
        activeTask: null,
        overColumnId: null,
        overSwimlaneId: null,
      })
    },
    [dragState.activeTask, tasks, onTaskMove]
  )

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setDragState({
      activeTask: null,
      overColumnId: null,
      overSwimlaneId: null,
    })
  }, [])

  return (
    <DndKitContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={MEASURING_CONFIG}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay dropAnimation={null}>
        {dragState.activeTask ? (
          <DragOverlayCard task={dragState.activeTask} />
        ) : null}
      </DragOverlay>
    </DndKitContext>
  )
}

// =============================================================================
// Drag Overlay Card (simplified task preview during drag)
// =============================================================================

function DragOverlayCard({ task }: { task: BoardTask }) {
  return (
    <div className="bg-background rounded-lg p-3 shadow-xl border-2 border-blue-400 dark:border-blue-500 opacity-90 w-64">
      <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
        {task.title}
      </div>
      {task.reference && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {task.reference}
        </div>
      )}
    </div>
  )
}

export default BoardDndContext
