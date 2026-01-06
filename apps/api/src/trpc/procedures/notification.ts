/*
 * Notification Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for notification management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:05 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../router'
import {
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  generateNotificationLink,
  type NotificationData,
} from '../../lib/notificationService'

// =============================================================================
// Input Schemas
// =============================================================================

const listNotificationsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  unreadOnly: z.boolean().default(false),
})

const markReadSchema = z.object({
  notificationIds: z.array(z.number()).min(1).max(100),
})

const deleteNotificationSchema = z.object({
  notificationId: z.number(),
})

const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notificationFilter: z.number().min(1).max(4).optional(), // 1=all, 2=assigned, 3=created, 4=both
})

const updateTypeSettingSchema = z.object({
  notificationType: z.enum(['email', 'web', 'push']),
  isEnabled: z.boolean(),
})

// =============================================================================
// Notification Router
// =============================================================================

export const notificationRouter = router({
  /**
   * List notifications for the current user
   */
  list: protectedProcedure
    .input(listNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const notifications = await ctx.prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.unreadOnly && { isRead: false }),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      })

      // Add generated links to notifications
      return notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        data: n.data as NotificationData,
        isRead: n.isRead,
        createdAt: n.createdAt,
        link: generateNotificationLink(
          n.type as Parameters<typeof generateNotificationLink>[0],
          n.data as NotificationData
        ),
      }))
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await getUnreadCount(ctx.prisma, ctx.user.id)
    return { count }
  }),

  /**
   * Mark specific notifications as read
   */
  markRead: protectedProcedure
    .input(markReadSchema)
    .mutation(async ({ ctx, input }) => {
      const count = await markAsRead(
        ctx.prisma,
        ctx.user.id,
        input.notificationIds
      )
      return { success: true, count }
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await markAllAsRead(ctx.prisma, ctx.user.id)
    return { success: true, count }
  }),

  /**
   * Delete a notification
   */
  delete: protectedProcedure
    .input(deleteNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      // Ensure user owns this notification
      const notification = await ctx.prisma.notification.findFirst({
        where: {
          id: input.notificationId,
          userId: ctx.user.id,
        },
      })

      if (!notification) {
        return { success: false, message: 'Notification not found' }
      }

      await ctx.prisma.notification.delete({
        where: { id: input.notificationId },
      })

      return { success: true }
    }),

  /**
   * Delete all read notifications
   */
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.prisma.notification.deleteMany({
      where: {
        userId: ctx.user.id,
        isRead: true,
      },
    })

    return { success: true, count: result.count }
  }),

  // ===========================================================================
  // NOTIFICATION SETTINGS/PREFERENCES
  // ===========================================================================

  /**
   * Get notification settings for the current user
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    // Get main settings from User
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        notificationsEnabled: true,
        notificationFilter: true,
      },
    })

    // Get per-type settings
    const typeSettings = await ctx.prisma.userNotificationSetting.findMany({
      where: { userId: ctx.user.id },
    })

    // Default types if not set
    const defaultTypes = ['email', 'web', 'push']
    const typeMap = new Map(typeSettings.map((s) => [s.notificationType, s.isEnabled]))

    return {
      enabled: user?.notificationsEnabled ?? true,
      filter: user?.notificationFilter ?? 4, // 4 = both (assigned + created)
      filterLabel: getFilterLabel(user?.notificationFilter ?? 4),
      types: defaultTypes.map((type) => ({
        type,
        enabled: typeMap.get(type) ?? true, // default enabled
      })),
    }
  }),

  /**
   * Update main notification settings (enabled, filter)
   */
  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {}

      if (input.notificationsEnabled !== undefined) {
        data.notificationsEnabled = input.notificationsEnabled
      }
      if (input.notificationFilter !== undefined) {
        data.notificationFilter = input.notificationFilter
      }

      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data,
      })

      return { success: true }
    }),

  /**
   * Update per-type notification setting (email, web, push)
   */
  updateTypeSetting: protectedProcedure
    .input(updateTypeSettingSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userNotificationSetting.upsert({
        where: {
          userId_notificationType: {
            userId: ctx.user.id,
            notificationType: input.notificationType,
          },
        },
        update: { isEnabled: input.isEnabled },
        create: {
          userId: ctx.user.id,
          notificationType: input.notificationType,
          isEnabled: input.isEnabled,
        },
      })

      return { success: true }
    }),
})

// =============================================================================
// Helper Functions
// =============================================================================

function getFilterLabel(filter: number): string {
  switch (filter) {
    case 1: return 'All tasks'
    case 2: return 'Assigned to me'
    case 3: return 'Created by me'
    case 4: return 'Assigned or created by me'
    default: return 'Unknown'
  }
}
