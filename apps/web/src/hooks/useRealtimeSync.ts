/**
 * useRealtimeSync Hook
 *
 * Synchronizes React Query cache with Socket.io events.
 * When a task is created/updated/moved/deleted via WebSocket,
 * the local cache is updated immediately without refetching.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 *
 * Modified by:
 * Session: realtime-sync-fix
 * Signed: 2026-01-03T00:00 CET
 * Change: Added comment and subtask event handlers for full real-time sync
 * ═══════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import type {
  TaskEventPayload,
  TaskMovePayload,
  CommentEventPayload,
  SubtaskEventPayload,
  TagEventPayload,
} from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

interface Task {
  id: number;
  columnId: number;
  position: number;
  [key: string]: unknown;
}

interface Column {
  id: number;
  tasks: Task[];
  [key: string]: unknown;
}

interface BoardData {
  columns: Column[];
  [key: string]: unknown;
}

// Helper type for tRPC query keys
type TrpcQueryKey = [[string, string], { input?: Record<string, unknown>; type?: string }?];

// Helper function to safely check query keys
function matchesQueryKey(
  query: Query,
  procedure: string,
  method: string,
  inputMatcher?: (input: Record<string, unknown> | undefined) => boolean
): boolean {
  const key = query.queryKey as TrpcQueryKey;
  if (!Array.isArray(key) || !Array.isArray(key[0])) return false;
  if (key[0][0] !== procedure || key[0][1] !== method) return false;
  if (inputMatcher) {
    const queryInput = key[1]?.input;
    return inputMatcher(queryInput);
  }
  return true;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for real-time synchronization of board data
 *
 * @param projectId - The project ID to sync
 * @param currentUserId - Current user ID (to skip own events)
 *
 * @example
 * // In BoardView component
 * useRealtimeSync({ projectId: 123, currentUserId: user.id });
 */
export function useRealtimeSync({
  projectId,
  currentUserId,
}: {
  projectId: number;
  currentUserId: number;
}) {
  const queryClient = useQueryClient();

  // Skip events triggered by current user (they already have optimistic updates)
  const shouldProcess = useCallback(
    (triggeredBy: { id: number }) => {
      return triggeredBy.id !== currentUserId;
    },
    [currentUserId]
  );

  // Handle task created
  const handleTaskCreated = useCallback(
    (payload: TaskEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate the task list query to refetch
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });

      // Also invalidate board data
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'project', 'getBoardData'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle task updated
  const handleTaskUpdated = useCallback(
    (payload: TaskEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate specific task query
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });

      // Invalidate task list
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });

      // Invalidate board data for assignee/tag updates to show on cards
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'project', 'getBoardData'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle task moved - update cache optimistically
  const handleTaskMoved = useCallback(
    (payload: TaskMovePayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Update board data cache directly
      queryClient.setQueryData<BoardData>(
        [['project', 'getBoardData'], { input: { projectId }, type: 'query' }],
        (old) => {
          if (!old) return old;

          const newColumns = old.columns.map((column: Column) => {
            // Remove task from source column
            if (column.id === payload.fromColumnId) {
              return {
                ...column,
                tasks: column.tasks.filter((t: Task) => t.id !== payload.taskId),
              };
            }

            // Add task to destination column
            if (column.id === payload.toColumnId) {
              const task = old.columns
                .find((c: Column) => c.id === payload.fromColumnId)
                ?.tasks.find((t: Task) => t.id === payload.taskId);

              if (task) {
                const newTasks = [...column.tasks];
                const updatedTask = {
                  ...task,
                  columnId: payload.toColumnId,
                  position: payload.toPosition,
                };
                newTasks.splice(payload.toPosition, 0, updatedTask);
                return {
                  ...column,
                  tasks: newTasks,
                };
              }
            }

            return column;
          });

          return { ...old, columns: newColumns };
        }
      );

      // Also update the task list query
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, projectId, shouldProcess]
  );

  // Handle task deleted
  const handleTaskDeleted = useCallback(
    (payload: TaskEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Remove from board data cache
      queryClient.setQueryData<BoardData>(
        [['project', 'getBoardData'], { input: { projectId }, type: 'query' }],
        (old) => {
          if (!old) return old;

          const newColumns = old.columns.map((column: Column) => ({
            ...column,
            tasks: column.tasks.filter((t: Task) => t.id !== payload.taskId),
          }));

          return { ...old, columns: newColumns };
        }
      );

      // Remove from task list
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, projectId, shouldProcess]
  );

  // Handle comment created
  const handleCommentCreated = useCallback(
    (payload: CommentEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate comment list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'comment', 'list', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update comment count
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle comment updated
  const handleCommentUpdated = useCallback(
    (payload: CommentEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate comment list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'comment', 'list', (input) => input?.taskId === payload.taskId),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle comment deleted
  const handleCommentDeleted = useCallback(
    (payload: CommentEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate comment list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'comment', 'list', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update comment count
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle subtask created
  const handleSubtaskCreated = useCallback(
    (payload: SubtaskEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate subtask list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'subtask', 'list', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update subtask count and progress
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });

      // Invalidate task list for progress update
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle subtask updated
  const handleSubtaskUpdated = useCallback(
    (payload: SubtaskEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate subtask list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'subtask', 'list', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update progress
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });

      // Invalidate task list for progress update
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle subtask deleted
  const handleSubtaskDeleted = useCallback(
    (payload: SubtaskEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate subtask list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'subtask', 'list', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update subtask count and progress
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });

      // Invalidate task list for progress update
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle tag added to task
  const handleTagAdded = useCallback(
    (payload: TagEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate tag list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'tag', 'getTaskTags', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update tags display
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });

      // Invalidate task list for tags display
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Handle tag removed from task
  const handleTagRemoved = useCallback(
    (payload: TagEventPayload) => {
      if (!shouldProcess(payload.triggeredBy)) return;

      // Invalidate tag list for this task
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'tag', 'getTaskTags', (input) => input?.taskId === payload.taskId),
      });

      // Also invalidate task to update tags display
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'get', (input) => input?.taskId === payload.taskId),
      });

      // Invalidate task list for tags display
      void queryClient.invalidateQueries({
        predicate: (query) => matchesQueryKey(query, 'task', 'list'),
      });
    },
    [queryClient, shouldProcess]
  );

  // Set up socket with event handlers
  const { isConnected, getPresence } = useSocket({
    projectId,
    onTaskCreated: handleTaskCreated,
    onTaskUpdated: handleTaskUpdated,
    onTaskMoved: handleTaskMoved,
    onTaskDeleted: handleTaskDeleted,
    onCommentCreated: handleCommentCreated,
    onCommentUpdated: handleCommentUpdated,
    onCommentDeleted: handleCommentDeleted,
    onSubtaskCreated: handleSubtaskCreated,
    onSubtaskUpdated: handleSubtaskUpdated,
    onSubtaskDeleted: handleSubtaskDeleted,
    onTagAdded: handleTagAdded,
    onTagRemoved: handleTagRemoved,
  });

  return {
    isConnected,
    getPresence,
  };
}
