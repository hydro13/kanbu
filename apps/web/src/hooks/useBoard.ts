/*
 * useBoard Hook
 * Version: 1.0.0
 *
 * React Query hook for board data with optimistic updates preparation.
 * Handles fetching, caching, and invalidation of board data.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:40 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useMemo, useCallback } from 'react'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface UseBoardOptions {
  projectId: number
  enabled?: boolean
}

// Column type from API
export interface BoardColumn {
  id: number
  title: string
  description: string | null
  position: number
  taskLimit: number
  isCollapsed: boolean
  showClosed: boolean
}

// Swimlane type from API
export interface BoardSwimlane {
  id: number
  name: string
  description: string | null
  position: number
}

export interface UseBoardReturn {
  // Data
  project: ReturnType<typeof trpc.project.get.useQuery>['data']
  tasks: ReturnType<typeof trpc.task.list.useQuery>['data']
  columns: BoardColumn[]
  swimlanes: BoardSwimlane[]

  // State
  isLoading: boolean
  isError: boolean
  error: unknown

  // Actions
  refetch: () => void
  invalidate: () => void
}

// =============================================================================
// Hook
// =============================================================================

export function useBoard({ projectId, enabled = true }: UseBoardOptions): UseBoardReturn {
  const utils = trpc.useUtils()

  // Fetch project details (includes columns and swimlanes)
  const projectQuery = trpc.project.get.useQuery(
    { projectId },
    {
      enabled: enabled && projectId > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Fetch tasks for the project
  const tasksQuery = trpc.task.list.useQuery(
    { projectId, isActive: true, limit: 500 },
    {
      enabled: enabled && projectId > 0,
      staleTime: 30 * 1000, // 30 seconds - tasks change more frequently
    }
  )

  // Combined loading state
  const isLoading = projectQuery.isLoading || tasksQuery.isLoading

  // Combined error state
  const isError = projectQuery.isError || tasksQuery.isError
  const error = projectQuery.error ?? tasksQuery.error ?? null

  // Extract columns and swimlanes
  const columns = useMemo(() => {
    return projectQuery.data?.columns ?? []
  }, [projectQuery.data])

  const swimlanes = useMemo(() => {
    return projectQuery.data?.swimlanes ?? []
  }, [projectQuery.data])

  // Refetch both queries
  const refetch = useCallback(() => {
    projectQuery.refetch()
    tasksQuery.refetch()
  }, [projectQuery, tasksQuery])

  // Invalidate cache (for after mutations)
  const invalidate = useCallback(() => {
    utils.project.get.invalidate({ projectId })
    utils.task.list.invalidate({ projectId })
  }, [utils, projectId])

  return {
    project: projectQuery.data,
    tasks: tasksQuery.data,
    columns,
    swimlanes,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  }
}

// =============================================================================
// Task Mutation Hooks
// =============================================================================

/**
 * Hook for moving a task between columns/swimlanes
 * Prepared for optimistic updates
 */
export function useMoveTask(projectId: number) {
  const utils = trpc.useUtils()

  const mutation = trpc.task.move.useMutation({
    onSuccess: () => {
      // Invalidate task list to refresh
      utils.task.list.invalidate({ projectId })
    },
    // TODO: Add optimistic updates
    // onMutate: async (newData) => {
    //   await utils.task.list.cancel({ projectId })
    //   const previousTasks = utils.task.list.getData({ projectId })
    //   // Update cache optimistically
    //   return { previousTasks }
    // },
    // onError: (err, newData, context) => {
    //   // Rollback on error
    //   utils.task.list.setData({ projectId }, context?.previousTasks)
    // },
  })

  return mutation
}

/**
 * Hook for creating a new task
 */
export function useCreateTask(projectId: number) {
  const utils = trpc.useUtils()

  const mutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
    },
  })

  return mutation
}

/**
 * Hook for updating a task
 */
export function useUpdateTask(projectId: number) {
  const utils = trpc.useUtils()

  const mutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
    },
  })

  return mutation
}

/**
 * Hook for closing a task
 */
export function useCloseTask(projectId: number) {
  const utils = trpc.useUtils()

  const mutation = trpc.task.close.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
    },
  })

  return mutation
}

/**
 * Hook for reopening a task
 */
export function useReopenTask(projectId: number) {
  const utils = trpc.useUtils()

  const mutation = trpc.task.reopen.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
    },
  })

  return mutation
}

export default useBoard
