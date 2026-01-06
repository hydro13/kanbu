/**
 * Socket.io Server Setup
 *
 * Main entry point for WebSocket functionality.
 * Integrates Socket.io with Fastify and sets up Redis adapter.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Server as SocketServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import { createRedisClient } from '../lib/redis';
import { authenticateSocket, type AuthenticatedSocket } from './auth';
import { registerRoomHandlers, getRoomUsers, RoomNames } from './rooms';
import { setSocketServer } from './emitter';

// =============================================================================
// Types
// =============================================================================

export interface CursorPosition {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
}

// =============================================================================
// Socket.io Server Setup
// =============================================================================

/**
 * Initialize Socket.io server and attach to Fastify
 */
export async function initializeSocketServer(
  fastify: FastifyInstance
): Promise<SocketServer> {
  // Create Socket.io server
  const io = new SocketServer(fastify.server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN?.split(',') ?? (
        process.env.NODE_ENV === 'production'
          ? ['http://localhost:5173']
          : true // Allow all origins in development
      ),
      credentials: true,
    },
    // Connection settings
    pingTimeout: 30000,
    pingInterval: 25000,
    // Transport options
    transports: ['websocket', 'polling'],
    // Path for socket.io (default is /socket.io)
    path: '/socket.io',
  });

  // Setup Redis adapter for horizontal scaling (if REDIS_URL is configured)
  const pubClient = createRedisClient();
  const subClient = createRedisClient();

  if (pubClient && subClient) {
    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('[Socket.io] Redis adapter connected - multi-instance mode');
    } catch (error) {
      console.warn('[Socket.io] Redis adapter failed:', error);
      console.log('[Socket.io] Running in single-instance mode');
    }
  } else {
    console.log('[Socket.io] No REDIS_URL configured - running in single-instance mode');
  }

  // Store reference for emitter
  setSocketServer(io);

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    console.log(
      `[Socket.io] User connected: ${user.username} (${user.id}) - Socket: ${socket.id}`
    );

    // Register room handlers (join/leave)
    registerRoomHandlers(io, authSocket);

    // Handle cursor movement (for live cursors feature)
    socket.on('cursor:move', (data: { roomName: string; position: CursorPosition }) => {
      // Broadcast cursor position to others in the room
      socket.to(data.roomName).emit('cursor:move', {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        position: data.position,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle presence request (get users in room)
    socket.on('presence:request', async (roomName: string, callback: (users: unknown[]) => void) => {
      const users = await getRoomUsers(io, roomName);
      callback(users);
    });

    // Handle typing indicators
    socket.on('typing:start', (taskId: number) => {
      const taskRoom = RoomNames.task(taskId);
      socket.to(taskRoom).emit('typing:start', {
        taskId,
        user: { id: user.id, username: user.username },
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('typing:stop', (taskId: number) => {
      const taskRoom = RoomNames.task(taskId);
      socket.to(taskRoom).emit('typing:stop', {
        taskId,
        user: { id: user.id, username: user.username },
        timestamp: new Date().toISOString(),
      });
    });

    // Handle field editing indicators (e.g., description, title)
    // Tracks which user is editing which field to prevent concurrent edits
    socket.on('editing:start', (data: { taskId: number; field: string }) => {
      const taskRoom = RoomNames.task(data.taskId);

      // Store editing state on socket for cleanup on disconnect
      if (!socket.data.editingFields) {
        socket.data.editingFields = [];
      }
      socket.data.editingFields.push({ taskId: data.taskId, field: data.field });

      const payload = {
        taskId: data.taskId,
        field: data.field,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      };

      socket.to(taskRoom).emit('editing:start', payload);
      // Also emit to all project rooms the user is in
      socket.rooms.forEach((room) => {
        if (room.startsWith('project:')) {
          socket.to(room).emit('editing:start', payload);
        }
      });
    });

    socket.on('editing:stop', (data: { taskId: number; field: string }) => {
      const taskRoom = RoomNames.task(data.taskId);

      // Remove from tracked editing fields
      if (socket.data.editingFields) {
        socket.data.editingFields = socket.data.editingFields.filter(
          (e: { taskId: number; field: string }) =>
            !(e.taskId === data.taskId && e.field === data.field)
        );
      }

      const payload = {
        taskId: data.taskId,
        field: data.field,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      };

      socket.to(taskRoom).emit('editing:stop', payload);
      // Also emit to all project rooms the user is in
      socket.rooms.forEach((room) => {
        if (room.startsWith('project:')) {
          socket.to(room).emit('editing:stop', payload);
        }
      });
    });

    // Handle field editing heartbeat (keeps lock alive, prevents stale locks on crash)
    socket.on('editing:heartbeat', (data: { taskId: number; field: string }) => {
      const taskRoom = RoomNames.task(data.taskId);

      const payload = {
        taskId: data.taskId,
        field: data.field,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      };

      socket.to(taskRoom).emit('editing:heartbeat', payload);
      // Also emit to all project rooms the user is in
      socket.rooms.forEach((room) => {
        if (room.startsWith('project:')) {
          socket.to(room).emit('editing:heartbeat', payload);
        }
      });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(
        `[Socket.io] User disconnected: ${user.username} (${user.id}) - Reason: ${reason}`
      );

      // Clean up any editing states when user disconnects
      if (socket.data.editingFields && socket.data.editingFields.length > 0) {
        for (const edit of socket.data.editingFields) {
          const taskRoom = RoomNames.task(edit.taskId);
          const payload = {
            taskId: edit.taskId,
            field: edit.field,
            user: {
              id: user.id,
              username: user.username,
              name: user.name,
            },
            timestamp: new Date().toISOString(),
          };

          // Broadcast editing:stop to task room and project rooms
          io.to(taskRoom).emit('editing:stop', payload);
          socket.rooms.forEach((room) => {
            if (room.startsWith('project:')) {
              io.to(room).emit('editing:stop', payload);
            }
          });
        }
        console.log(
          `[Socket.io] Cleaned up ${socket.data.editingFields.length} editing states for ${user.username}`
        );
      }
    });
  });

  // Log server stats periodically
  setInterval(() => {
    io.fetchSockets().then((sockets) => {
      if (sockets.length > 0) {
        console.log(`[Socket.io] Active connections: ${sockets.length}`);
      }
    }).catch(() => {});
  }, 60000); // Every minute

  console.log('[Socket.io] Server initialized');
  return io;
}

// =============================================================================
// Exports
// =============================================================================

export { RoomNames, getRoomUsers } from './rooms';
export {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskMoved,
  emitTaskDeleted,
  emitColumnCreated,
  emitColumnUpdated,
  emitColumnDeleted,
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
  emitSubtaskCreated,
  emitSubtaskUpdated,
  emitSubtaskDeleted,
  emitTagAdded,
  emitTagRemoved,
  emitTypingStart,
  emitTypingStop,
  emitToUser,
  getSocketServer,
} from './emitter';
export type { AuthenticatedSocket, SocketUser } from './auth';
