/**
 * useSocket Hook
 *
 * Provides convenient access to Socket.io functionality with room management.
 * Handles joining/leaving rooms automatically based on component lifecycle.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import {
  joinProjectRoom,
  leaveProjectRoom,
  joinTaskRoom,
  leaveTaskRoom,
  type TaskEventPayload,
  type TaskMovePayload,
  type CursorMovePayload,
  type TypingPayload,
  type CommentEventPayload,
  type SubtaskEventPayload,
  type TagEventPayload,
} from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

export interface UseSocketOptions {
  projectId?: number;
  taskId?: number;
  onTaskCreated?: (payload: TaskEventPayload) => void;
  onTaskUpdated?: (payload: TaskEventPayload) => void;
  onTaskMoved?: (payload: TaskMovePayload) => void;
  onTaskDeleted?: (payload: TaskEventPayload) => void;
  onCommentCreated?: (payload: CommentEventPayload) => void;
  onCommentUpdated?: (payload: CommentEventPayload) => void;
  onCommentDeleted?: (payload: CommentEventPayload) => void;
  onSubtaskCreated?: (payload: SubtaskEventPayload) => void;
  onSubtaskUpdated?: (payload: SubtaskEventPayload) => void;
  onSubtaskDeleted?: (payload: SubtaskEventPayload) => void;
  onTagAdded?: (payload: TagEventPayload) => void;
  onTagRemoved?: (payload: TagEventPayload) => void;
  onCursorMove?: (payload: CursorMovePayload) => void;
  onTypingStart?: (payload: TypingPayload) => void;
  onTypingStop?: (payload: TypingPayload) => void;
  onPresenceJoined?: (payload: { user: { id: number; username: string }; roomName: string }) => void;
  onPresenceLeft?: (payload: { user: { id: number; username: string }; roomName: string }) => void;
}

// =============================================================================
// Hook
// =============================================================================

// Return type for useSocket hook
export interface UseSocketReturn {
  socket: ReturnType<typeof useSocketContext>['socket'];
  isConnected: boolean;
  sendCursorMove: (roomName: string, position: { x: number; y: number; viewportWidth: number; viewportHeight: number }) => void;
  sendTypingStart: (taskId: number) => void;
  sendTypingStop: (taskId: number) => void;
  getPresence: (roomName: string) => Promise<{ id: number; username: string; name: string | null }[]>;
}

/**
 * Hook for Socket.io with automatic room management
 *
 * @example
 * // In BoardView component
 * useSocket({
 *   projectId: 123,
 *   onTaskMoved: (payload) => {
 *     // Update local state or invalidate query
 *   },
 * });
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { socket, isConnected } = useSocketContext();
  const {
    projectId,
    taskId,
    onTaskCreated,
    onTaskUpdated,
    onTaskMoved,
    onTaskDeleted,
    onCommentCreated,
    onCommentUpdated,
    onCommentDeleted,
    onSubtaskCreated,
    onSubtaskUpdated,
    onSubtaskDeleted,
    onTagAdded,
    onTagRemoved,
    onCursorMove,
    onTypingStart,
    onTypingStop,
    onPresenceJoined,
    onPresenceLeft,
  } = options;

  // Track joined rooms to clean up on unmount
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  // Join project room when projectId changes
  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    const roomName = `project:${projectId}`;

    void joinProjectRoom(projectId).then((success) => {
      if (success) {
        joinedRoomsRef.current.add(roomName);
      }
    });

    return () => {
      leaveProjectRoom(projectId);
      joinedRoomsRef.current.delete(roomName);
    };
  }, [socket, isConnected, projectId]);

  // Join task room when taskId changes
  useEffect(() => {
    if (!socket || !isConnected || !taskId) return;

    const roomName = `task:${taskId}`;

    void joinTaskRoom(taskId).then((success) => {
      if (success) {
        joinedRoomsRef.current.add(roomName);
      }
    });

    return () => {
      leaveTaskRoom(taskId);
      joinedRoomsRef.current.delete(roomName);
    };
  }, [socket, isConnected, taskId]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Task events
    if (onTaskCreated) {
      socket.on('task:created', onTaskCreated);
    }
    if (onTaskUpdated) {
      socket.on('task:updated', onTaskUpdated);
    }
    if (onTaskMoved) {
      socket.on('task:moved', onTaskMoved);
    }
    if (onTaskDeleted) {
      socket.on('task:deleted', onTaskDeleted);
    }

    // Comment events
    if (onCommentCreated) {
      socket.on('comment:created', onCommentCreated);
    }
    if (onCommentUpdated) {
      socket.on('comment:updated', onCommentUpdated);
    }
    if (onCommentDeleted) {
      socket.on('comment:deleted', onCommentDeleted);
    }

    // Subtask events
    if (onSubtaskCreated) {
      socket.on('subtask:created', onSubtaskCreated);
    }
    if (onSubtaskUpdated) {
      socket.on('subtask:updated', onSubtaskUpdated);
    }
    if (onSubtaskDeleted) {
      socket.on('subtask:deleted', onSubtaskDeleted);
    }

    // Tag events
    if (onTagAdded) {
      socket.on('tag:added', onTagAdded);
    }
    if (onTagRemoved) {
      socket.on('tag:removed', onTagRemoved);
    }

    // Cursor events
    if (onCursorMove) {
      socket.on('cursor:move', onCursorMove);
    }

    // Typing events
    if (onTypingStart) {
      socket.on('typing:start', onTypingStart);
    }
    if (onTypingStop) {
      socket.on('typing:stop', onTypingStop);
    }

    // Presence events
    if (onPresenceJoined) {
      socket.on('presence:joined', onPresenceJoined);
    }
    if (onPresenceLeft) {
      socket.on('presence:left', onPresenceLeft);
    }

    return () => {
      if (onTaskCreated) socket.off('task:created', onTaskCreated);
      if (onTaskUpdated) socket.off('task:updated', onTaskUpdated);
      if (onTaskMoved) socket.off('task:moved', onTaskMoved);
      if (onTaskDeleted) socket.off('task:deleted', onTaskDeleted);
      if (onCommentCreated) socket.off('comment:created', onCommentCreated);
      if (onCommentUpdated) socket.off('comment:updated', onCommentUpdated);
      if (onCommentDeleted) socket.off('comment:deleted', onCommentDeleted);
      if (onSubtaskCreated) socket.off('subtask:created', onSubtaskCreated);
      if (onSubtaskUpdated) socket.off('subtask:updated', onSubtaskUpdated);
      if (onSubtaskDeleted) socket.off('subtask:deleted', onSubtaskDeleted);
      if (onTagAdded) socket.off('tag:added', onTagAdded);
      if (onTagRemoved) socket.off('tag:removed', onTagRemoved);
      if (onCursorMove) socket.off('cursor:move', onCursorMove);
      if (onTypingStart) socket.off('typing:start', onTypingStart);
      if (onTypingStop) socket.off('typing:stop', onTypingStop);
      if (onPresenceJoined) socket.off('presence:joined', onPresenceJoined);
      if (onPresenceLeft) socket.off('presence:left', onPresenceLeft);
    };
  }, [
    socket,
    isConnected,
    onTaskCreated,
    onTaskUpdated,
    onTaskMoved,
    onTaskDeleted,
    onCommentCreated,
    onCommentUpdated,
    onCommentDeleted,
    onSubtaskCreated,
    onSubtaskUpdated,
    onSubtaskDeleted,
    onTagAdded,
    onTagRemoved,
    onCursorMove,
    onTypingStart,
    onTypingStop,
    onPresenceJoined,
    onPresenceLeft,
  ]);

  // Send cursor position (throttled by caller)
  const sendCursorMove = useCallback(
    (roomName: string, position: { x: number; y: number; viewportWidth: number; viewportHeight: number }) => {
      if (!socket || !isConnected) return;
      socket.emit('cursor:move', { roomName, position });
    },
    [socket, isConnected]
  );

  // Send typing start
  const sendTypingStart = useCallback(
    (taskId: number) => {
      if (!socket || !isConnected) return;
      socket.emit('typing:start', taskId);
    },
    [socket, isConnected]
  );

  // Send typing stop
  const sendTypingStop = useCallback(
    (taskId: number) => {
      if (!socket || !isConnected) return;
      socket.emit('typing:stop', taskId);
    },
    [socket, isConnected]
  );

  // Get users in a room
  const getPresence = useCallback(
    (roomName: string): Promise<{ id: number; username: string; name: string | null }[]> => {
      return new Promise((resolve) => {
        if (!socket || !isConnected) {
          resolve([]);
          return;
        }
        socket.emit('presence:request', roomName, (users: { id: number; username: string; name: string | null }[]) => {
          resolve(users);
        });
      });
    },
    [socket, isConnected]
  );

  return {
    socket,
    isConnected,
    sendCursorMove,
    sendTypingStart,
    sendTypingStop,
    getPresence,
  };
}
