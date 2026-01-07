/**
 * usePresence Hook
 *
 * Tracks which users are online in a project room.
 * Provides real-time presence updates and avatar stacks.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useCallback } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { joinProjectRoom, leaveProjectRoom } from '@/lib/socket';

// =============================================================================
// Types
// =============================================================================

export interface PresenceUser {
  id: number;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
}

export interface UsePresenceOptions {
  projectId: number;
  currentUserId: number;
}

export interface UsePresenceReturn {
  onlineUsers: PresenceUser[];
  isConnected: boolean;
  refreshPresence: () => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for tracking online users in a project
 *
 * @example
 * const { onlineUsers, isConnected } = usePresence({
 *   projectId: 123,
 *   currentUserId: user.id,
 * });
 */
export function usePresence({
  projectId,
  currentUserId,
}: UsePresenceOptions): UsePresenceReturn {
  const { socket, isConnected } = useSocketContext();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);

  // Fetch current presence
  const refreshPresence = useCallback(() => {
    if (!socket || !isConnected) return;

    const roomName = `project:${projectId}`;
    socket.emit(
      'presence:request',
      roomName,
      (users: { id: number; username: string; name: string | null; avatarUrl: string | null }[]) => {
        // Filter out current user
        setOnlineUsers(users.filter((u) => u.id !== currentUserId));
      }
    );
  }, [socket, isConnected, projectId, currentUserId]);

  // Join room and set up listeners
  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    // Join project room
    void joinProjectRoom(projectId);

    // Initial presence fetch
    refreshPresence();

    // Handle user joined
    const handleJoined = (payload: {
      user: PresenceUser;
      roomName: string;
    }) => {
      if (payload.roomName !== `project:${projectId}`) return;
      if (payload.user.id === currentUserId) return;

      setOnlineUsers((prev) => {
        // Avoid duplicates
        if (prev.some((u) => u.id === payload.user.id)) return prev;
        return [...prev, payload.user];
      });
    };

    // Handle user left
    const handleLeft = (payload: {
      user: { id: number };
      roomName: string;
    }) => {
      if (payload.roomName !== `project:${projectId}`) return;

      setOnlineUsers((prev) => prev.filter((u) => u.id !== payload.user.id));
    };

    socket.on('presence:joined', handleJoined);
    socket.on('presence:left', handleLeft);

    return () => {
      socket.off('presence:joined', handleJoined);
      socket.off('presence:left', handleLeft);
      leaveProjectRoom(projectId);
    };
  }, [socket, isConnected, projectId, currentUserId, refreshPresence]);

  return {
    onlineUsers,
    isConnected,
    refreshPresence,
  };
}
