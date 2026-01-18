/**
 * useTypingIndicator Hook
 *
 * Tracks typing indicators for real-time collaboration.
 * Shows "X is typing..." when other users are typing in a task.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { joinTaskRoom, leaveTaskRoom } from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

interface TypingUser {
  id: number;
  username: string;
}

export interface UseTypingIndicatorOptions {
  taskId: number;
  currentUserId: number;
  enabled?: boolean;
  debounceMs?: number;
}

export interface UseTypingIndicatorReturn {
  typingUsers: TypingUser[];
  startTyping: () => void;
  stopTyping: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DEBOUNCE_MS = 2000; // Stop typing after 2 seconds of inactivity
const TYPING_TIMEOUT_MS = 5000; // Remove stale typing indicators after 5 seconds

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for typing indicator functionality
 *
 * @example
 * const { typingUsers, startTyping, stopTyping } = useTypingIndicator({
 *   taskId: 123,
 *   currentUserId: user.id,
 * });
 *
 * // In textarea onChange:
 * startTyping();
 *
 * // In onBlur:
 * stopTyping();
 */
export function useTypingIndicator({
  taskId,
  currentUserId,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const { socket, isConnected } = useSocketContext();
  const [typingUsers, setTypingUsers] = useState<Map<number, TypingUser & { lastUpdate: number }>>(
    new Map()
  );

  // Track if we're currently marked as typing
  const isTypingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Join task room when enabled
  useEffect(() => {
    if (!enabled || !taskId) return;

    void joinTaskRoom(taskId);

    return () => {
      leaveTaskRoom(taskId);
    };
  }, [taskId, enabled]);

  // Listen for typing events
  useEffect(() => {
    if (!socket || !isConnected || !enabled) return;

    const handleTypingStart = (payload: {
      taskId: number;
      user: TypingUser;
      timestamp: string;
    }) => {
      if (payload.taskId !== taskId) return;
      if (payload.user.id === currentUserId) return;

      setTypingUsers((prev) => {
        const updated = new Map(prev);
        updated.set(payload.user.id, {
          ...payload.user,
          lastUpdate: Date.now(),
        });
        return updated;
      });
    };

    const handleTypingStop = (payload: { taskId: number; user: { id: number } }) => {
      if (payload.taskId !== taskId) return;

      setTypingUsers((prev) => {
        const updated = new Map(prev);
        updated.delete(payload.user.id);
        return updated;
      });
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, isConnected, enabled, taskId, currentUserId]);

  // Clean up stale typing indicators
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        let hasChanges = false;

        for (const [userId, user] of updated) {
          if (now - user.lastUpdate > TYPING_TIMEOUT_MS) {
            updated.delete(userId);
            hasChanges = true;
          }
        }

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Clear typing users when leaving task
  useEffect(() => {
    return () => {
      setTypingUsers(new Map());
    };
  }, [taskId]);

  // Send typing start
  const startTyping = useCallback(() => {
    if (!socket || !isConnected || !enabled) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only emit if we weren't already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing:start', taskId);
    }

    // Set debounce timer to stop typing
    debounceTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('typing:stop', taskId);
      }
    }, debounceMs);
  }, [socket, isConnected, enabled, taskId, debounceMs]);

  // Send typing stop
  const stopTyping = useCallback(() => {
    if (!socket || !isConnected || !enabled) return;

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Only emit if we were typing
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing:stop', taskId);
    }
  }, [socket, isConnected, enabled, taskId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Send stop typing if we were typing when unmounting
      if (isTypingRef.current && socket && isConnected) {
        socket.emit('typing:stop', taskId);
      }
    };
  }, [socket, isConnected, taskId]);

  return {
    typingUsers: Array.from(typingUsers.values()).map(({ id, username }) => ({ id, username })),
    startTyping,
    stopTyping,
  };
}
