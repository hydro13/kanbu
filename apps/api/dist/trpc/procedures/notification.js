"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const zod_1 = require("zod");
const router_1 = require("../router");
const notificationService_1 = require("../../lib/notificationService");
// =============================================================================
// Input Schemas
// =============================================================================
const listNotificationsSchema = zod_1.z.object({
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
    unreadOnly: zod_1.z.boolean().default(false),
});
const markReadSchema = zod_1.z.object({
    notificationIds: zod_1.z.array(zod_1.z.number()).min(1).max(100),
});
const deleteNotificationSchema = zod_1.z.object({
    notificationId: zod_1.z.number(),
});
const updateSettingsSchema = zod_1.z.object({
    notificationsEnabled: zod_1.z.boolean().optional(),
    notificationFilter: zod_1.z.number().min(1).max(4).optional(), // 1=all, 2=assigned, 3=created, 4=both
});
const updateTypeSettingSchema = zod_1.z.object({
    notificationType: zod_1.z.enum(['email', 'web', 'push']),
    isEnabled: zod_1.z.boolean(),
});
// =============================================================================
// Notification Router
// =============================================================================
exports.notificationRouter = (0, router_1.router)({
    /**
     * List notifications for the current user
     */
    list: router_1.protectedProcedure
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
        });
        // Add generated links to notifications
        return notifications.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            content: n.content,
            data: n.data,
            isRead: n.isRead,
            createdAt: n.createdAt,
            link: (0, notificationService_1.generateNotificationLink)(n.type, n.data),
        }));
    }),
    /**
     * Get unread notification count
     */
    getUnreadCount: router_1.protectedProcedure.query(async ({ ctx }) => {
        const count = await (0, notificationService_1.getUnreadCount)(ctx.prisma, ctx.user.id);
        return { count };
    }),
    /**
     * Mark specific notifications as read
     */
    markRead: router_1.protectedProcedure
        .input(markReadSchema)
        .mutation(async ({ ctx, input }) => {
        const count = await (0, notificationService_1.markAsRead)(ctx.prisma, ctx.user.id, input.notificationIds);
        return { success: true, count };
    }),
    /**
     * Mark all notifications as read
     */
    markAllRead: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        const count = await (0, notificationService_1.markAllAsRead)(ctx.prisma, ctx.user.id);
        return { success: true, count };
    }),
    /**
     * Delete a notification
     */
    delete: router_1.protectedProcedure
        .input(deleteNotificationSchema)
        .mutation(async ({ ctx, input }) => {
        // Ensure user owns this notification
        const notification = await ctx.prisma.notification.findFirst({
            where: {
                id: input.notificationId,
                userId: ctx.user.id,
            },
        });
        if (!notification) {
            return { success: false, message: 'Notification not found' };
        }
        await ctx.prisma.notification.delete({
            where: { id: input.notificationId },
        });
        return { success: true };
    }),
    /**
     * Delete all read notifications
     */
    deleteAllRead: router_1.protectedProcedure.mutation(async ({ ctx }) => {
        const result = await ctx.prisma.notification.deleteMany({
            where: {
                userId: ctx.user.id,
                isRead: true,
            },
        });
        return { success: true, count: result.count };
    }),
    // ===========================================================================
    // NOTIFICATION SETTINGS/PREFERENCES
    // ===========================================================================
    /**
     * Get notification settings for the current user
     */
    getSettings: router_1.protectedProcedure.query(async ({ ctx }) => {
        // Get main settings from User
        const user = await ctx.prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: {
                notificationsEnabled: true,
                notificationFilter: true,
            },
        });
        // Get per-type settings
        const typeSettings = await ctx.prisma.userNotificationSetting.findMany({
            where: { userId: ctx.user.id },
        });
        // Default types if not set
        const defaultTypes = ['email', 'web', 'push'];
        const typeMap = new Map(typeSettings.map((s) => [s.notificationType, s.isEnabled]));
        return {
            enabled: user?.notificationsEnabled ?? true,
            filter: user?.notificationFilter ?? 4, // 4 = both (assigned + created)
            filterLabel: getFilterLabel(user?.notificationFilter ?? 4),
            types: defaultTypes.map((type) => ({
                type,
                enabled: typeMap.get(type) ?? true, // default enabled
            })),
        };
    }),
    /**
     * Update main notification settings (enabled, filter)
     */
    updateSettings: router_1.protectedProcedure
        .input(updateSettingsSchema)
        .mutation(async ({ ctx, input }) => {
        const data = {};
        if (input.notificationsEnabled !== undefined) {
            data.notificationsEnabled = input.notificationsEnabled;
        }
        if (input.notificationFilter !== undefined) {
            data.notificationFilter = input.notificationFilter;
        }
        await ctx.prisma.user.update({
            where: { id: ctx.user.id },
            data,
        });
        return { success: true };
    }),
    /**
     * Update per-type notification setting (email, web, push)
     */
    updateTypeSetting: router_1.protectedProcedure
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
        });
        return { success: true };
    }),
});
// =============================================================================
// Helper Functions
// =============================================================================
function getFilterLabel(filter) {
    switch (filter) {
        case 1: return 'All tasks';
        case 2: return 'Assigned to me';
        case 3: return 'Created by me';
        case 4: return 'Assigned or created by me';
        default: return 'Unknown';
    }
}
//# sourceMappingURL=notification.js.map