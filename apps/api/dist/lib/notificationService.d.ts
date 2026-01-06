import type { PrismaClient } from '@prisma/client';
export type NotificationType = 'task_assigned' | 'task_updated' | 'task_completed' | 'task_due_soon' | 'task_overdue' | 'comment_added' | 'comment_mentioned' | 'subtask_assigned' | 'subtask_completed' | 'project_invited' | 'project_role_changed';
export interface NotificationData {
    taskId?: number;
    taskTitle?: string;
    taskReference?: string;
    projectId?: number;
    projectName?: string;
    commentId?: number;
    subtaskId?: number;
    subtaskTitle?: string;
    actorId?: number;
    actorName?: string;
    link?: string;
    [key: string]: unknown;
}
export interface CreateNotificationInput {
    userId: number;
    type: NotificationType;
    title: string;
    content?: string;
    data?: NotificationData;
}
export interface NotificationWithMeta {
    id: number;
    userId: number;
    type: string;
    title: string;
    content: string | null;
    data: NotificationData;
    isRead: boolean;
    createdAt: Date;
}
/**
 * Create a notification for a user
 */
export declare function createNotification(prisma: PrismaClient, input: CreateNotificationInput): Promise<NotificationWithMeta>;
/**
 * Create a notification using a template
 */
export declare function createNotificationFromTemplate(prisma: PrismaClient, userId: number, type: NotificationType, data?: NotificationData): Promise<NotificationWithMeta>;
/**
 * Create notifications for multiple users
 */
export declare function createNotificationsForUsers(prisma: PrismaClient, userIds: number[], type: NotificationType, data?: NotificationData): Promise<number>;
/**
 * Get unread notification count for a user
 */
export declare function getUnreadCount(prisma: PrismaClient, userId: number): Promise<number>;
/**
 * Mark notifications as read
 */
export declare function markAsRead(prisma: PrismaClient, userId: number, notificationIds: number[]): Promise<number>;
/**
 * Mark all notifications as read for a user
 */
export declare function markAllAsRead(prisma: PrismaClient, userId: number): Promise<number>;
/**
 * Delete old notifications (cleanup job)
 */
export declare function deleteOldNotifications(prisma: PrismaClient, olderThanDays?: number): Promise<number>;
/**
 * Generate link for notification based on type and data
 */
export declare function generateNotificationLink(_type: NotificationType, data: NotificationData): string | undefined;
//# sourceMappingURL=notificationService.d.ts.map