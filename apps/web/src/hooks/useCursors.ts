/**
 * useCursors Hook
 *
 * Tracks cursor positions of other users in a board view.
 * Throttles cursor updates to 30fps for performance.
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
import type { CursorMovePayload, PresenceUser } from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

export interface CursorData {
  user: PresenceUser;
  x: number;
  y: number;
  lastUpdate: number;
}

export interface UseCursorsOptions {
  projectId: number;
  currentUserId: number;
  enabled?: boolean;
  cursorTimeout?: number; // ms before cursor disappears
}

export interface UseCursorsReturn {
  cursors: Map<number, CursorData>;
  sendCursorPosition: (x: number, y: number) => void;
}

// =============================================================================
// Constants
// =============================================================================

const THROTTLE_MS = 33; // ~30fps
const DEFAULT_CURSOR_TIMEOUT = 5000; // 5 seconds

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for tracking and broadcasting cursor positions
 *
 * @example
 * const { cursors, sendCursorPosition } = useCursors({
 *   projectId: 123,
 *   currentUserId: user.id,
 * });
 *
 * // In mouse move handler:
 * sendCursorPosition(e.clientX, e.clientY);
 */
export function useCursors({
  projectId,
  currentUserId,
  enabled = true,
  cursorTimeout = DEFAULT_CURSOR_TIMEOUT,
}: UseCursorsOptions): UseCursorsReturn {
  const { socket, isConnected } = useSocketContext();
  const [cursors, setCursors] = useState<Map<number, CursorData>>(new Map());

  // Throttle tracking
  const lastSentRef = useRef<number>(0);

  // Room name
  const roomName = `project:${projectId}`;

  // Send cursor position (throttled)
  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (!socket || !isConnected || !enabled) return;

      const now = Date.now();
      if (now - lastSentRef.current < THROTTLE_MS) return;

      lastSentRef.current = now;

      socket.emit('cursor:move', {
        roomName,
        position: {
          x,
          y,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
      });
    },
    [socket, isConnected, enabled, roomName]
  );

  // Listen for cursor updates
  useEffect(() => {
    if (!socket || !isConnected || !enabled) return;

    const handleCursorMove = (payload: CursorMovePayload) => {
      // Ignore own cursor
      if (payload.user.id === currentUserId) return;

      setCursors((prev) => {
        const newCursors = new Map(prev);
        newCursors.set(payload.user.id, {
          user: payload.user,
          x: payload.position.x,
          y: payload.position.y,
          lastUpdate: Date.now(),
        });
        return newCursors;
      });
    };

    socket.on('cursor:move', handleCursorMove);

    return () => {
      socket.off('cursor:move', handleCursorMove);
    };
  }, [socket, isConnected, enabled, currentUserId]);

  // Clean up stale cursors
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const newCursors = new Map(prev);
        let hasChanges = false;

        for (const [userId, cursor] of newCursors) {
          if (now - cursor.lastUpdate > cursorTimeout) {
            newCursors.delete(userId);
            hasChanges = true;
          }
        }

        return hasChanges ? newCursors : prev;
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [enabled, cursorTimeout]);

  // Clear cursors when leaving page
  useEffect(() => {
    return () => {
      setCursors(new Map());
    };
  }, [projectId]);

  return {
    cursors,
    sendCursorPosition,
  };
}
