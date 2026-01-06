/*
 * Activity Logger
 * Version: 1.0.0
 *
 * Helper for logging task and project activities.
 * Creates structured activity records for audit trail.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: abe602e0-56a9-4461-9c9f-84bdc854d640
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import type { PrismaClient, Prisma } from '@prisma/client'

// =============================================================================
// Types
// =============================================================================

export type EntityType = 'task' | 'subtask' | 'comment' | 'column' | 'swimlane' | 'project'

export type EventType =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.closed'
  | 'task.reopened'
  | 'task.deleted'
  | 'task.assigned'
  | 'task.unassigned'
  | 'subtask.created'
  | 'subtask.updated'
  | 'subtask.completed'
  | 'subtask.deleted'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'column.created'
  | 'column.updated'
  | 'column.deleted'
  | 'swimlane.created'
  | 'swimlane.updated'
  | 'swimlane.deleted'
  | 'project.updated'

export interface ActivityChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface LogActivityParams {
  projectId: number
  userId: number | null
  eventType: EventType
  entityType: EntityType
  entityId: number
  changes?: ActivityChange[]
  metadata?: Record<string, unknown>
}

// =============================================================================
// Activity Logger
// =============================================================================

/**
 * Log an activity event
 */
export async function logActivity(
  prisma: PrismaClient,
  params: LogActivityParams
): Promise<void> {
  const { projectId, userId, eventType, entityType, entityId, changes = [], metadata = {} } = params

  await prisma.activity.create({
    data: {
      projectId,
      userId,
      eventType,
      entityType,
      entityId,
      changes: {
        changes: changes.map(c => ({
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
        metadata,
      } as Prisma.InputJsonValue,
    },
  })

  // Update project last activity timestamp
  await prisma.project.update({
    where: { id: projectId },
    data: { lastActivityAt: new Date() },
  })
}

/**
 * Log a task creation event
 */
export async function logTaskCreated(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  taskId: number,
  taskTitle: string
): Promise<void> {
  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'task.created',
    entityType: 'task',
    entityId: taskId,
    metadata: { taskTitle },
  })
}

/**
 * Log a task update event
 */
export async function logTaskUpdated(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  taskId: number,
  changes: ActivityChange[]
): Promise<void> {
  if (changes.length === 0) return

  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'task.updated',
    entityType: 'task',
    entityId: taskId,
    changes,
  })
}

/**
 * Log a task move event (column/swimlane change)
 */
export async function logTaskMoved(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  taskId: number,
  fromColumn: string,
  toColumn: string,
  fromSwimlane?: string | null,
  toSwimlane?: string | null
): Promise<void> {
  const changes: ActivityChange[] = []

  if (fromColumn !== toColumn) {
    changes.push({
      field: 'column',
      oldValue: fromColumn,
      newValue: toColumn,
    })
  }

  if (fromSwimlane !== toSwimlane) {
    changes.push({
      field: 'swimlane',
      oldValue: fromSwimlane,
      newValue: toSwimlane,
    })
  }

  if (changes.length === 0) return

  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'task.moved',
    entityType: 'task',
    entityId: taskId,
    changes,
  })
}

/**
 * Log a task close event
 */
export async function logTaskClosed(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  taskId: number
): Promise<void> {
  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'task.closed',
    entityType: 'task',
    entityId: taskId,
  })
}

/**
 * Log a task reopen event
 */
export async function logTaskReopened(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  taskId: number
): Promise<void> {
  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'task.reopened',
    entityType: 'task',
    entityId: taskId,
  })
}

/**
 * Log a subtask creation event
 */
export async function logSubtaskCreated(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  subtaskId: number,
  taskId: number,
  subtaskTitle: string
): Promise<void> {
  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'subtask.created',
    entityType: 'subtask',
    entityId: subtaskId,
    metadata: { taskId, subtaskTitle },
  })
}

/**
 * Log a subtask completion event
 */
export async function logSubtaskCompleted(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  subtaskId: number,
  taskId: number
): Promise<void> {
  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'subtask.completed',
    entityType: 'subtask',
    entityId: subtaskId,
    metadata: { taskId },
  })
}

/**
 * Log a comment creation event
 */
export async function logCommentCreated(
  prisma: PrismaClient,
  projectId: number,
  userId: number,
  commentId: number,
  taskId: number
): Promise<void> {
  await logActivity(prisma, {
    projectId,
    userId,
    eventType: 'comment.created',
    entityType: 'comment',
    entityId: commentId,
    metadata: { taskId },
  })
}

/**
 * Detect changes between old and new values
 */
export function detectChanges<T extends Record<string, unknown>>(
  oldValues: T,
  newValues: Partial<T>,
  fieldsToTrack: (keyof T)[]
): ActivityChange[] {
  const changes: ActivityChange[] = []

  for (const field of fieldsToTrack) {
    if (field in newValues && newValues[field] !== oldValues[field]) {
      changes.push({
        field: String(field),
        oldValue: oldValues[field],
        newValue: newValues[field],
      })
    }
  }

  return changes
}
