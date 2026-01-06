/**
 * Socket.io Client Setup
 *
 * Configures Socket.io client for real-time collaboration.
 * Uses JWT token from localStorage for authentication.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: websocket-collaboration
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-01-03T00:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { io, type Socket } from 'socket.io-client';

// =============================================================================
// Configuration
// =============================================================================

const TOKEN_KEY = 'kanbu_token';

// Get socket URL - uses same hostname as frontend but on port 3001
function getSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Remove /trpc suffix if present and use the base URL
    return apiUrl.replace(/\/trpc$/, '');
  }
  // In development, use same hostname but port 3001
  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  }
  // Default: same origin (for production)
  return '';
}

// =============================================================================
// Socket Instance Management
// =============================================================================

let socketInstance: Socket | null = null;

/**
 * Get or create the Socket.io client instance
 * Singleton pattern - only one connection per client
 */
export function getSocket(): Socket | null {
  if (socketInstance) {
    return socketInstance;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    console.log('[Socket] No auth token, skipping connection');
    return null;
  }

  const socketUrl = getSocketUrl();

  socketInstance = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: false, // We'll connect manually when needed
  });

  // Connection event handlers
  socketInstance.on('connect', () => {
    console.log('[Socket] Connected:', socketInstance?.id);
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socketInstance.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);

    // If auth failed, clear the socket instance
    if (error.message.includes('Authentication')) {
      disconnectSocket();
    }
  });

  socketInstance.on('reconnect', (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
  });

  socketInstance.on('reconnect_error', (error) => {
    console.error('[Socket] Reconnection error:', error.message);
  });

  return socketInstance;
}

/**
 * Connect the socket (call after authentication)
 */
export function connectSocket(): Socket | null {
  const socket = getSocket();
  if (socket && !socket.connected) {
    socket.connect();
  }
  return socket;
}

/**
 * Disconnect and clean up socket instance
 * Call on logout or when auth token changes
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.removeAllListeners();
    socketInstance.disconnect();
    socketInstance = null;
    console.log('[Socket] Disconnected and cleaned up');
  }
}

/**
 * Reconnect with new token (after login)
 */
export function reconnectSocket(): Socket | null {
  disconnectSocket();
  return connectSocket();
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socketInstance?.connected ?? false;
}

// =============================================================================
// Room Management
// =============================================================================

/**
 * Join a project room to receive task updates
 */
export function joinProjectRoom(projectId: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket?.connected) {
      resolve(false);
      return;
    }

    const roomName = `project:${projectId}`;
    socket.emit('room:join', roomName, (result: { success: boolean }) => {
      resolve(result.success);
    });
  });
}

/**
 * Leave a project room
 */
export function leaveProjectRoom(projectId: number): void {
  const socket = getSocket();
  if (!socket?.connected) return;

  const roomName = `project:${projectId}`;
  socket.emit('room:leave', roomName);
}

/**
 * Join a task room for comment updates
 */
export function joinTaskRoom(taskId: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket?.connected) {
      resolve(false);
      return;
    }

    const roomName = `task:${taskId}`;
    socket.emit('room:join', roomName, (result: { success: boolean }) => {
      resolve(result.success);
    });
  });
}

/**
 * Leave a task room
 */
export function leaveTaskRoom(taskId: number): void {
  const socket = getSocket();
  if (!socket?.connected) return;

  const roomName = `task:${taskId}`;
  socket.emit('room:leave', roomName);
}

// =============================================================================
// Event Types (for type safety)
// =============================================================================

export interface TaskEventPayload {
  taskId: number;
  projectId: number;
  data?: Record<string, unknown>;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

export interface TaskMovePayload extends TaskEventPayload {
  fromColumnId: number;
  toColumnId: number;
  fromPosition: number;
  toPosition: number;
}

export interface PresenceUser {
  id: number;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface CursorPosition {
  // World coordinates - position within the scrollable board content
  // Like game world coordinates - independent of viewport/resolution
  worldX: number;
  worldY: number;
}

export interface CursorMovePayload {
  user: PresenceUser;
  position: CursorPosition;
  timestamp: string;
}

export interface TypingPayload {
  taskId: number;
  user: { id: number; username: string };
  timestamp: string;
}

export interface CommentEventPayload {
  commentId: number;
  taskId: number;
  projectId: number;
  data?: Record<string, unknown>;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

export interface SubtaskEventPayload {
  subtaskId: number;
  taskId: number;
  projectId: number;
  data?: Record<string, unknown>;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

export interface TagEventPayload {
  tagId: number;
  taskId: number;
  projectId: number;
  data?: Record<string, unknown>;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

export interface EditingPayload {
  taskId: number;
  field: string;
  user: {
    id: number;
    username: string;
    name: string | null;
  };
  timestamp: string;
}

// =============================================================================
// Group/Permission Event Types (for Permission Tree real-time updates)
// =============================================================================

export interface GroupEventPayload {
  groupId: number;
  groupName: string;
  data?: Record<string, unknown>;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

export interface GroupMemberEventPayload {
  groupId: number;
  groupName: string;
  userId: number;
  username: string;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

export interface RoleAssignmentEventPayload {
  groupId: number;
  groupName: string;
  workspaceId?: number;
  workspaceName?: string;
  projectId?: number;
  projectName?: string;
  role: string;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

// =============================================================================
// Admin Room Management (for Permission Tree)
// =============================================================================

/**
 * Join the admin room to receive permission tree updates
 * Only Domain Admins can join this room
 */
export function joinAdminRoom(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = getSocket();
    if (!socket?.connected) {
      resolve(false);
      return;
    }

    socket.emit('room:join', 'admin', (result: { success: boolean; error?: string }) => {
      if (result.success) {
        console.log('[Socket] Joined admin room for permission tree updates');
      } else {
        console.log('[Socket] Failed to join admin room:', result.error);
      }
      resolve(result.success);
    });
  });
}

/**
 * Leave the admin room
 */
export function leaveAdminRoom(): void {
  const socket = getSocket();
  if (!socket?.connected) return;

  socket.emit('room:leave', 'admin');
  console.log('[Socket] Left admin room');
}
