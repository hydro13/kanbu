/*
 * useDragDrop Hook
 * Version: 1.0.0
 *
 * React hook for managing drag and drop state and API calls.
 * Implements optimistic updates with rollback on error.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T15:40 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useCallback, useState } from 'react'
import { trpc } from '@/lib/trpc'
import type { BoardTask } from '@/components/board/Board'

// =============================================================================
// Types
// =============================================================================

export interface UseDragDropOptions {
  projectId: number
  tasks: BoardTask[]
  onOptimisticUpdate?: (updatedTasks: BoardTask[]) => void
}

export interface UseDragDropResult {
  isMoving: boolean
  error: string | null
  moveTask: (
    taskId: number,
    targetColumnId: number,
    targetSwimlaneId: number | null,
    newPosition: number
  ) => Promise<void>
  clearError: () => void
}

// =============================================================================
// Hook
// =============================================================================

export function useDragDrop({
  projectId,
  tasks: _tasks, // Used for type inference, actual data from tRPC cache
  onOptimisticUpdate,
}: UseDragDropOptions): UseDragDropResult {
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Get the move mutation
  const moveMutation = trpc.task.move.useMutation({
    onMutate: async ({ taskId, columnId, swimlaneId, position }) => {
      // Cancel any outgoing refetches
      await utils.task.list.cancel({ projectId, isActive: true, limit: 500 })

      // Snapshot the previous tasks
      const previousTasks = utils.task.list.getData({
        projectId,
        isActive: true,
        limit: 500,
      })

      // Optimistically update the task
      if (previousTasks) {
        const updatedTasks = previousTasks.map((task) => {
          if (task.id === taskId) {
            return {
              ...task,
              columnId,
              swimlaneId: swimlaneId ?? null,
              position: position ?? task.position,
              column: { id: columnId, title: task.column.title },
              swimlane: swimlaneId
                ? { id: swimlaneId, name: task.swimlane?.name ?? 'Default' }
                : null,
            }
          }
          return task
        })

        // Update cache optimistically
        utils.task.list.setData(
          { projectId, isActive: true, limit: 500 },
          updatedTasks
        )

        // Notify parent of optimistic update
        if (onOptimisticUpdate) {
          onOptimisticUpdate(updatedTasks as BoardTask[])
        }
      }

      return { previousTasks }
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousTasks) {
        utils.task.list.setData(
          { projectId, isActive: true, limit: 500 },
          context.previousTasks
        )

        // Notify parent of rollback
        if (onOptimisticUpdate) {
          onOptimisticUpdate(context.previousTasks as BoardTask[])
        }
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      utils.task.list.invalidate({ projectId, isActive: true, limit: 500 })
    },
  })

  const moveTask = useCallback(
    async (
      taskId: number,
      targetColumnId: number,
      targetSwimlaneId: number | null,
      newPosition: number
    ) => {
      setIsMoving(true)
      setError(null)

      try {
        await moveMutation.mutateAsync({
          taskId,
          columnId: targetColumnId,
          swimlaneId: targetSwimlaneId ?? undefined,
          position: newPosition,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move task'
        setError(message)
        throw err
      } finally {
        setIsMoving(false)
      }
    },
    [moveMutation]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isMoving,
    error,
    moveTask,
    clearError,
  }
}

export default useDragDrop
