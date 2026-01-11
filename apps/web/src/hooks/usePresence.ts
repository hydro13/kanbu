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
    if (!socket || !isConnected) {
      console.log('[Presence] refreshPresence skipped - not connected');
      return;
    }

    const roomName = `project:${projectId}`;
    console.log(`[Presence] Requesting presence for ${roomName}...`);
    socket.emit(
      'presence:request',
      roomName,
      (users: { id: number; username: string; name: string | null; avatarUrl: string | null }[]) => {
        console.log(`[Presence] Got ${users?.length ?? 0} users in ${roomName}:`, users);
        // Filter out current user
        const filtered = users?.filter((u) => u.id !== currentUserId) ?? [];
        console.log(`[Presence] After filtering self (id=${currentUserId}): ${filtered.length} other users`);
        setOnlineUsers(filtered);
      }
    );
  }, [socket, isConnected, projectId, currentUserId]);

  // Join room and set up listeners
  useEffect(() => {
    if (!socket || !isConnected || !projectId) return;

    // Join project room, then fetch initial presence
    // Must await join to ensure we're in the room before requesting presence
    const initPresence = async () => {
      const joined = await joinProjectRoom(projectId);
      if (joined) {
        console.log(`[Presence] Joined project:${projectId}, fetching presence...`);
        refreshPresence();
      } else {
        console.warn(`[Presence] Failed to join project:${projectId}`);
      }
    };
    void initPresence();

    // Handle user joined
    const handleJoined = (payload: {
      user: PresenceUser;
      roomName: string;
    }) => {
      console.log('[Presence] presence:joined event:', payload);
      if (payload.roomName !== `project:${projectId}`) {
        console.log(`[Presence] Ignoring join for different room: ${payload.roomName}`);
        return;
      }
      if (payload.user.id === currentUserId) {
        console.log('[Presence] Ignoring own join event');
        return;
      }

      setOnlineUsers((prev) => {
        // Avoid duplicates
        if (prev.some((u) => u.id === payload.user.id)) {
          console.log(`[Presence] User ${payload.user.username} already in list`);
          return prev;
        }
        console.log(`[Presence] Adding user ${payload.user.username} to online list`);
        return [...prev, payload.user];
      });
    };

    // Handle user left
    const handleLeft = (payload: {
      user: { id: number };
      roomName: string;
    }) => {
      console.log('[Presence] presence:left event:', payload);
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
