/*
 * useTaskDetail Hook
 * Version: 1.0.0
 *
 * React hook for fetching and managing task details.
 * Provides task data, subtasks, comments with mutation hooks.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:20 CET
 *
 * Modified by:
 * Session: realtime-conflict-handling
 * Signed: 2026-01-04T00:00 CET
 * Change: Added optimistic locking with expectedUpdatedAt and conflict state management
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { TRPCClientError } from '@trpc/client';

// =============================================================================
// Types
// =============================================================================

export interface UseTaskDetailOptions {
  taskId: number;
  enabled?: boolean;
}

// =============================================================================
// Error Handling
// =============================================================================

interface ConflictErrorData {
  isConflict: boolean;
  message?: string;
}

function extractConflictError(error: unknown): ConflictErrorData {
  if (error instanceof TRPCClientError) {
    if (error.data?.code === 'CONFLICT') {
      return {
        isConflict: true,
        message: error.message,
      };
    }
  }
  return { isConflict: false };
}

// =============================================================================
// Hook
// =============================================================================

export function useTaskDetail({ taskId, enabled = true }: UseTaskDetailOptions) {
  const utils = trpc.useUtils();

  // Conflict state management
  const [hasConflict, setHasConflict] = useState(false);

  // Fetch task details
  const taskQuery = trpc.task.get.useQuery({ taskId }, { enabled: enabled && taskId > 0 });

  // Fetch subtasks
  const subtasksQuery = trpc.subtask.list.useQuery({ taskId }, { enabled: enabled && taskId > 0 });

  // Fetch comments
  const commentsQuery = trpc.comment.list.useQuery({ taskId }, { enabled: enabled && taskId > 0 });

  // ==========================================================================
  // Task Mutations
  // ==========================================================================

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      setHasConflict(false);
      utils.task.get.invalidate({ taskId });
      utils.task.list.invalidate();
    },
    onError: (error) => {
      const conflictData = extractConflictError(error);
      if (conflictData.isConflict) {
        // Conflict detected - task was modified by another user
        setHasConflict(true);
        // Refresh the task data to show the latest version
        utils.task.get.invalidate({ taskId });
        utils.task.list.invalidate();
      }
      // Errors are re-thrown to be handled by the caller
    },
  });

  // Update task with optimistic locking support
  const updateTaskWithLocking = useCallback(
    async (data: Parameters<typeof updateTaskMutation.mutateAsync>[0]) => {
      // Include expectedUpdatedAt from the current task data for optimistic locking
      const updatedAt = taskQuery.data?.updatedAt;
      let expectedUpdatedAt: string | undefined;
      if (updatedAt) {
        // Handle both Date objects and ISO strings
        expectedUpdatedAt =
          typeof updatedAt === 'object' && 'toISOString' in updatedAt
            ? (updatedAt as Date).toISOString()
            : String(updatedAt);
      }
      return updateTaskMutation.mutateAsync({
        ...data,
        expectedUpdatedAt,
      });
    },
    [updateTaskMutation, taskQuery.data?.updatedAt]
  );

  // Clear conflict state
  const clearConflict = useCallback(() => {
    setHasConflict(false);
  }, []);

  const closeTaskMutation = trpc.task.close.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId });
      utils.task.list.invalidate();
    },
  });

  const reopenTaskMutation = trpc.task.reopen.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId });
      utils.task.list.invalidate();
    },
  });

  // ==========================================================================
  // Subtask Mutations
  // ==========================================================================

  const createSubtaskMutation = trpc.subtask.create.useMutation({
    onSuccess: () => {
      utils.subtask.list.invalidate({ taskId });
      utils.task.get.invalidate({ taskId });
    },
  });

  const updateSubtaskMutation = trpc.subtask.update.useMutation({
    onSuccess: () => {
      utils.subtask.list.invalidate({ taskId });
      utils.task.get.invalidate({ taskId });
    },
  });

  const deleteSubtaskMutation = trpc.subtask.delete.useMutation({
    onSuccess: () => {
      utils.subtask.list.invalidate({ taskId });
      utils.task.get.invalidate({ taskId });
    },
  });

  // ==========================================================================
  // Comment Mutations
  // ==========================================================================

  const createCommentMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ taskId });
      utils.task.get.invalidate({ taskId });
    },
  });

  const updateCommentMutation = trpc.comment.update.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ taskId });
    },
  });

  const deleteCommentMutation = trpc.comment.delete.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ taskId });
      utils.task.get.invalidate({ taskId });
    },
  });

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // Queries
    task: taskQuery.data,
    isLoading: taskQuery.isLoading,
    isError: taskQuery.isError,
    error: taskQuery.error,

    subtasks: subtasksQuery.data ?? [],
    isLoadingSubtasks: subtasksQuery.isLoading,

    comments: commentsQuery.data?.comments ?? [],
    isLoadingComments: commentsQuery.isLoading,

    // Task mutations (with optimistic locking)
    updateTask: updateTaskWithLocking,
    isUpdating: updateTaskMutation.isPending,
    closeTask: closeTaskMutation.mutateAsync,
    reopenTask: reopenTaskMutation.mutateAsync,

    // Conflict handling
    hasConflict,
    clearConflict,

    // Subtask mutations
    createSubtask: createSubtaskMutation.mutateAsync,
    updateSubtask: updateSubtaskMutation.mutateAsync,
    deleteSubtask: deleteSubtaskMutation.mutateAsync,
    isCreatingSubtask: createSubtaskMutation.isPending,

    // Comment mutations
    createComment: createCommentMutation.mutateAsync,
    updateComment: updateCommentMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutateAsync,
    isCreatingComment: createCommentMutation.isPending,

    // Refetch
    refetch: () => {
      taskQuery.refetch();
      subtasksQuery.refetch();
      commentsQuery.refetch();
    },
  };
}

export default useTaskDetail;
