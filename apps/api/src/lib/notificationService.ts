/*
 * Notification Service
 * Version: 1.0.0
 *
 * Service for creating and managing notifications.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:05 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import type { PrismaClient } from '@prisma/client'

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_due_soon'
  | 'task_overdue'
  | 'comment_added'
  | 'comment_mentioned'
  | 'subtask_assigned'
  | 'subtask_completed'
  | 'project_invited'
  | 'project_role_changed'

export interface NotificationData {
  taskId?: number
  taskTitle?: string
  taskReference?: string
  projectId?: number
  projectName?: string
  commentId?: number
  subtaskId?: number
  subtaskTitle?: string
  actorId?: number
  actorName?: string
  link?: string
  [key: string]: unknown
}

export interface CreateNotificationInput {
  userId: number
  type: NotificationType
  title: string
  content?: string
  data?: NotificationData
}

export interface NotificationWithMeta {
  id: number
  userId: number
  type: string
  title: string
  content: string | null
  data: NotificationData
  isRead: boolean
  createdAt: Date
}

// =============================================================================
// Notification Templates
// =============================================================================

const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: (data: NotificationData) => string; content?: (data: NotificationData) => string | undefined }> = {
  task_assigned: {
    title: (d) => `You were assigned to "${d.taskTitle || 'a task'}"`,
    content: (d) => d.actorName ? `${d.actorName} assigned you to this task` : undefined,
  },
  task_updated: {
    title: (d) => `Task "${d.taskTitle || 'unknown'}" was updated`,
  },
  task_completed: {
    title: (d) => `Task "${d.taskTitle || 'unknown'}" was completed`,
    content: (d) => d.actorName ? `Completed by ${d.actorName}` : undefined,
  },
  task_due_soon: {
    title: (d) => `Task "${d.taskTitle || 'unknown'}" is due soon`,
    content: () => 'This task is due within 24 hours',
  },
  task_overdue: {
    title: (d) => `Task "${d.taskTitle || 'unknown'}" is overdue`,
    content: () => 'This task has passed its due date',
  },
  comment_added: {
    title: (d) => `New comment on "${d.taskTitle || 'a task'}"`,
    content: (d) => d.actorName ? `${d.actorName} left a comment` : undefined,
  },
  comment_mentioned: {
    title: () => `You were mentioned in a comment`,
    content: (d) => d.taskTitle ? `On task "${d.taskTitle}"` : undefined,
  },
  subtask_assigned: {
    title: (d) => `You were assigned to subtask "${d.subtaskTitle || 'unknown'}"`,
    content: (d) => d.taskTitle ? `On task "${d.taskTitle}"` : undefined,
  },
  subtask_completed: {
    title: (d) => `Subtask "${d.subtaskTitle || 'unknown'}" was completed`,
    content: (d) => d.actorName ? `Completed by ${d.actorName}` : undefined,
  },
  project_invited: {
    title: (d) => `You were invited to project "${d.projectName || 'unknown'}"`,
    content: (d) => d.actorName ? `Invited by ${d.actorName}` : undefined,
  },
  project_role_changed: {
    title: (d) => `Your role changed in project "${d.projectName || 'unknown'}"`,
  },
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Create a notification for a user
 */
export async function createNotification(
  prisma: PrismaClient,
  input: CreateNotificationInput
): Promise<NotificationWithMeta> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      content: input.content || null,
      data: (input.data || {}) as object,
      isRead: false,
    },
  })

  return {
    ...notification,
    data: notification.data as NotificationData,
  }
}

/**
 * Create a notification using a template
 */
export async function createNotificationFromTemplate(
  prisma: PrismaClient,
  userId: number,
  type: NotificationType,
  data: NotificationData = {}
): Promise<NotificationWithMeta> {
  const template = NOTIFICATION_TEMPLATES[type]
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`)
  }

  const title = template.title(data)
  const content = template.content?.(data)

  return createNotification(prisma, {
    userId,
    type,
    title,
    content,
    data,
  })
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  prisma: PrismaClient,
  userIds: number[],
  type: NotificationType,
  data: NotificationData = {}
): Promise<number> {
  if (userIds.length === 0) return 0

  const template = NOTIFICATION_TEMPLATES[type]
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`)
  }

  const title = template.title(data)
  const content = template.content?.(data)

  const result = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      content: content || null,
      data: (data || {}) as object,
      isRead: false,
    })),
  })

  return result.count
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  prisma: PrismaClient,
  userId: number
): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

/**
 * Mark notifications as read
 */
export async function markAsRead(
  prisma: PrismaClient,
  userId: number,
  notificationIds: number[]
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId, // Ensure user owns these notifications
    },
    data: {
      isRead: true,
    },
  })

  return result.count
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  prisma: PrismaClient,
  userId: number
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return result.count
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(
  prisma: PrismaClient,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
  })

  return result.count
}

/**
 * Generate link for notification based on type and data
 */
export function generateNotificationLink(
  _type: NotificationType,
  data: NotificationData
): string | undefined {
  if (data.link) return data.link

  // Generate links based on notification type
  if (data.taskId && data.projectId) {
    return `/projects/${data.projectId}/board?task=${data.taskId}`
  }

  if (data.projectId) {
    return `/projects/${data.projectId}`
  }

  return undefined
}
