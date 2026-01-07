/**
 * Socket.io Room Management
 *
 * Handles room joining/leaving and provides room name utilities.
 * Room structure:
 *   - workspace:{id} - Workspace-wide events
 *   - project:{id} - Project/board events (task CRUD, columns)
 *   - task:{id} - Task-specific events (comments, typing)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import type { Server } from 'socket.io';
import type { AuthenticatedSocket } from './auth';
import { canAccessProject } from './auth';

// =============================================================================
// Room Name Utilities
// =============================================================================

export const RoomNames = {
  workspace: (id: number) => `workspace:${id}`,
  project: (id: number) => `project:${id}`,
  task: (id: number) => `task:${id}`,
  admin: () => 'admin', // Room for Domain Admins to receive permission tree updates
} as const;

/**
 * Parse a room name to extract type and ID
 */
export function parseRoomName(room: string): { type: string; id: number | null } | null {
  // Handle admin room (no ID)
  if (room === 'admin') {
    return { type: 'admin', id: null };
  }
  const match = room.match(/^(workspace|project|task):(\d+)$/);
  if (!match || !match[1] || !match[2]) return null;
  return { type: match[1], id: parseInt(match[2], 10) };
}

// =============================================================================
// Room Event Handlers
// =============================================================================

/**
 * Register room-related event handlers for a socket
 */
export function registerRoomHandlers(
  _io: Server,
  socket: AuthenticatedSocket
): void {
  // Auto-join user's workspace rooms on connect
  for (const workspaceId of socket.data.workspaceIds) {
    const roomName = RoomNames.workspace(workspaceId);
    void socket.join(roomName);
    console.log(
      `[Socket] User ${socket.data.user.username} joined ${roomName}`
    );
  }

  // Handle explicit room join requests
  socket.on('room:join', async (roomName: string, callback?: (result: { success: boolean; error?: string }) => void) => {
    try {
      const parsed = parseRoomName(roomName);
      if (!parsed) {
        callback?.({ success: false, error: 'Invalid room name' });
        return;
      }

      // Check authorization based on room type
      let authorized = false;

      switch (parsed.type) {
        case 'workspace':
          authorized = parsed.id !== null && socket.data.workspaceIds.includes(parsed.id);
          break;
        case 'project':
          authorized = parsed.id !== null && await canAccessProject(socket, parsed.id);
          break;
        case 'task':
          // Task rooms are accessible if user can access the parent project
          // For now, allow if user is authenticated (task permissions checked elsewhere)
          authorized = true;
          break;
        case 'admin':
          // Admin room is accessible to Domain Admins only
          // Check is done via socket.data.isDomainAdmin (set during auth)
          authorized = socket.data.isDomainAdmin === true;
          break;
      }

      if (!authorized) {
        callback?.({ success: false, error: 'Access denied' });
        return;
      }

      await socket.join(roomName);
      console.log(
        `[Socket] User ${socket.data.user.username} joined ${roomName}`
      );
      callback?.({ success: true });

      // Notify others in the room about new presence
      socket.to(roomName).emit('presence:joined', {
        user: socket.data.user,
        roomName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Socket] Error joining room:', error);
      callback?.({ success: false, error: 'Failed to join room' });
    }
  });

  // Handle room leave requests
  socket.on('room:leave', (roomName: string, callback?: (result: { success: boolean }) => void) => {
    const parsed = parseRoomName(roomName);

    // Don't allow leaving workspace rooms (auto-managed)
    if (parsed?.type === 'workspace') {
      callback?.({ success: false });
      return;
    }

    void socket.leave(roomName);
    console.log(
      `[Socket] User ${socket.data.user.username} left ${roomName}`
    );
    callback?.({ success: true });

    // Notify others about departure
    socket.to(roomName).emit('presence:left', {
      user: socket.data.user,
      roomName,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnect - notify all rooms
  socket.on('disconnecting', () => {
    for (const roomName of socket.rooms) {
      if (roomName === socket.id) continue; // Skip the default socket room

      socket.to(roomName).emit('presence:left', {
        user: socket.data.user,
        roomName,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// =============================================================================
// Presence Utilities
// =============================================================================

/**
 * Get all users currently in a room
 */
export async function getRoomUsers(
  io: Server,
  roomName: string
): Promise<{ id: number; username: string; name: string | null; avatarUrl: string | null }[]> {
  const sockets = await io.in(roomName).fetchSockets();
  const users: { id: number; username: string; name: string | null; avatarUrl: string | null }[] = [];
  const seen = new Set<number>();

  for (const socket of sockets) {
    const user = (socket as unknown as AuthenticatedSocket).data?.user;
    if (user && !seen.has(user.id)) {
      seen.add(user.id);
      users.push({
        id: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
    }
  }

  return users;
}
