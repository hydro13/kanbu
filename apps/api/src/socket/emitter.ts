/**
 * Socket Event Emitter Bridge
 *
 * Provides a bridge between tRPC procedures and Socket.io broadcasts.
 * After a mutation succeeds, call these functions to notify connected clients.
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
import { RoomNames } from './rooms';

// =============================================================================
// Types
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

export interface ColumnEventPayload {
  columnId: number;
  projectId: number;
  data?: Record<string, unknown>;
  triggeredBy: {
    id: number;
    username: string;
  };
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
// Server Instance Reference
// =============================================================================

let ioInstance: Server | null = null;

/**
 * Set the Socket.io server instance
 * Called during server initialization
 */
export function setSocketServer(io: Server): void {
  ioInstance = io;
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): Server | null {
  return ioInstance;
}

// =============================================================================
// Task Events
// =============================================================================

/**
 * Emit task created event to project room
 */
export function emitTaskCreated(payload: TaskEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('task:created', payload);

  console.log(`[Socket] Emitted task:created to ${roomName}`);
}

/**
 * Emit task updated event to project room
 */
export function emitTaskUpdated(payload: TaskEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('task:updated', payload);

  console.log(`[Socket] Emitted task:updated to ${roomName}`);
}

/**
 * Emit task moved event to project room
 */
export function emitTaskMoved(payload: TaskMovePayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('task:moved', payload);

  console.log(`[Socket] Emitted task:moved to ${roomName}`);
}

/**
 * Emit task deleted event to project room
 */
export function emitTaskDeleted(payload: TaskEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('task:deleted', payload);

  console.log(`[Socket] Emitted task:deleted to ${roomName}`);
}

// =============================================================================
// Column Events
// =============================================================================

/**
 * Emit column created event to project room
 */
export function emitColumnCreated(payload: ColumnEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('column:created', payload);

  console.log(`[Socket] Emitted column:created to ${roomName}`);
}

/**
 * Emit column updated event to project room
 */
export function emitColumnUpdated(payload: ColumnEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('column:updated', payload);

  console.log(`[Socket] Emitted column:updated to ${roomName}`);
}

/**
 * Emit column deleted event to project room
 */
export function emitColumnDeleted(payload: ColumnEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.project(payload.projectId);
  ioInstance.to(roomName).emit('column:deleted', payload);

  console.log(`[Socket] Emitted column:deleted to ${roomName}`);
}

// =============================================================================
// Comment Events
// =============================================================================

/**
 * Emit comment created event to task room
 */
export function emitCommentCreated(payload: CommentEventPayload): void {
  if (!ioInstance) return;

  // Emit to both task room and project room
  const taskRoom = RoomNames.task(payload.taskId);
  const projectRoom = RoomNames.project(payload.projectId);

  ioInstance.to(taskRoom).emit('comment:created', payload);
  ioInstance.to(projectRoom).emit('comment:created', payload);

  console.log(`[Socket] Emitted comment:created to ${taskRoom} and ${projectRoom}`);
}

/**
 * Emit comment updated event to task room
 */
export function emitCommentUpdated(payload: CommentEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  ioInstance.to(taskRoom).emit('comment:updated', payload);

  console.log(`[Socket] Emitted comment:updated to ${taskRoom}`);
}

/**
 * Emit comment deleted event to task room
 */
export function emitCommentDeleted(payload: CommentEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  ioInstance.to(taskRoom).emit('comment:deleted', payload);

  console.log(`[Socket] Emitted comment:deleted to ${taskRoom}`);
}

// =============================================================================
// Presence Events
// =============================================================================

// =============================================================================
// Subtask Events
// =============================================================================

/**
 * Emit subtask created event to task room and project room
 */
export function emitSubtaskCreated(payload: SubtaskEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  const projectRoom = RoomNames.project(payload.projectId);

  ioInstance.to(taskRoom).emit('subtask:created', payload);
  ioInstance.to(projectRoom).emit('subtask:created', payload);

  console.log(`[Socket] Emitted subtask:created to ${taskRoom} and ${projectRoom}`);
}

/**
 * Emit subtask updated event to task room and project room
 */
export function emitSubtaskUpdated(payload: SubtaskEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  const projectRoom = RoomNames.project(payload.projectId);

  ioInstance.to(taskRoom).emit('subtask:updated', payload);
  ioInstance.to(projectRoom).emit('subtask:updated', payload);

  console.log(`[Socket] Emitted subtask:updated to ${taskRoom} and ${projectRoom}`);
}

/**
 * Emit subtask deleted event to task room and project room
 */
export function emitSubtaskDeleted(payload: SubtaskEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  const projectRoom = RoomNames.project(payload.projectId);

  ioInstance.to(taskRoom).emit('subtask:deleted', payload);
  ioInstance.to(projectRoom).emit('subtask:deleted', payload);

  console.log(`[Socket] Emitted subtask:deleted to ${taskRoom} and ${projectRoom}`);
}

// =============================================================================
// Presence Events
// =============================================================================

/**
 * Emit typing indicator to task room
 */
export function emitTypingStart(taskId: number, user: { id: number; username: string }): void {
  if (!ioInstance) return;

  const roomName = RoomNames.task(taskId);
  ioInstance.to(roomName).emit('typing:start', {
    taskId,
    user,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit typing stopped to task room
 */
export function emitTypingStop(taskId: number, user: { id: number; username: string }): void {
  if (!ioInstance) return;

  const roomName = RoomNames.task(taskId);
  ioInstance.to(roomName).emit('typing:stop', {
    taskId,
    user,
    timestamp: new Date().toISOString(),
  });
}

// =============================================================================
// Utility: Emit to Specific User
// =============================================================================

/**
 * Emit event to a specific user (by user ID)
 * Useful for notifications that should only go to one person
 */
export async function emitToUser(
  userId: number,
  event: string,
  payload: unknown
): Promise<boolean> {
  if (!ioInstance) return false;

  const sockets = await ioInstance.fetchSockets();
  let emitted = false;

  for (const socket of sockets) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socketUser = (socket as any).data?.user;
    if (socketUser?.id === userId) {
      socket.emit(event, payload);
      emitted = true;
    }
  }

  return emitted;
}

// =============================================================================
// Tag Events
// =============================================================================

/**
 * Emit tag added to task event
 */
export function emitTagAdded(payload: TagEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  const projectRoom = RoomNames.project(payload.projectId);

  ioInstance.to(taskRoom).emit('tag:added', payload);
  ioInstance.to(projectRoom).emit('tag:added', payload);

  console.log(`[Socket] Emitted tag:added to ${taskRoom} and ${projectRoom}`);
}

/**
 * Emit tag removed from task event
 */
export function emitTagRemoved(payload: TagEventPayload): void {
  if (!ioInstance) return;

  const taskRoom = RoomNames.task(payload.taskId);
  const projectRoom = RoomNames.project(payload.projectId);

  ioInstance.to(taskRoom).emit('tag:removed', payload);
  ioInstance.to(projectRoom).emit('tag:removed', payload);

  console.log(`[Socket] Emitted tag:removed to ${taskRoom} and ${projectRoom}`);
}

// =============================================================================
// Group & Permission Events (for Permission Tree real-time sync)
// =============================================================================

/**
 * Emit group created event to admin room
 */
export function emitGroupCreated(payload: GroupEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('group:created', payload);

  console.log(`[Socket] Emitted group:created to ${roomName}`);
}

/**
 * Emit group updated event to admin room
 */
export function emitGroupUpdated(payload: GroupEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('group:updated', payload);

  console.log(`[Socket] Emitted group:updated to ${roomName}`);
}

/**
 * Emit group deleted event to admin room
 */
export function emitGroupDeleted(payload: GroupEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('group:deleted', payload);

  console.log(`[Socket] Emitted group:deleted to ${roomName}`);
}

/**
 * Emit member added to group event to admin room
 */
export function emitGroupMemberAdded(payload: GroupMemberEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('group:member:added', payload);

  console.log(`[Socket] Emitted group:member:added to ${roomName}`);
}

/**
 * Emit member removed from group event to admin room
 */
export function emitGroupMemberRemoved(payload: GroupMemberEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('group:member:removed', payload);

  console.log(`[Socket] Emitted group:member:removed to ${roomName}`);
}

/**
 * Emit role assignment created event to admin room
 */
export function emitRoleAssignmentCreated(payload: RoleAssignmentEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('roleAssignment:created', payload);

  console.log(`[Socket] Emitted roleAssignment:created to ${roomName}`);
}

/**
 * Emit role assignment removed event to admin room
 */
export function emitRoleAssignmentRemoved(payload: RoleAssignmentEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('roleAssignment:removed', payload);

  console.log(`[Socket] Emitted roleAssignment:removed to ${roomName}`);
}

// =============================================================================
// ACL Events (for ACL Manager real-time sync)
// =============================================================================

export interface AclEventPayload {
  entryId: number;
  resourceType: string;
  resourceId: number | null;
  principalType: 'user' | 'group';
  principalId: number;
  permissions: number;
  deny: boolean;
  triggeredBy: {
    id: number;
    username: string;
  };
  timestamp: string;
}

/**
 * Emit ACL granted event to admin room
 */
export function emitAclGranted(payload: AclEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('acl:granted', payload);

  console.log(`[Socket] Emitted acl:granted to ${roomName}`);
}

/**
 * Emit ACL denied event to admin room
 */
export function emitAclDenied(payload: AclEventPayload): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('acl:denied', payload);

  console.log(`[Socket] Emitted acl:denied to ${roomName}`);
}

/**
 * Emit ACL deleted event to admin room
 */
export function emitAclDeleted(payload: Omit<AclEventPayload, 'permissions' | 'deny'>): void {
  if (!ioInstance) return;

  const roomName = RoomNames.admin();
  ioInstance.to(roomName).emit('acl:deleted', payload);

  console.log(`[Socket] Emitted acl:deleted to ${roomName}`);
}
