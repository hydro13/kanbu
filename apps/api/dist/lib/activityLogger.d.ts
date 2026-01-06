import type { PrismaClient } from '@prisma/client';
export type EntityType = 'task' | 'subtask' | 'comment' | 'column' | 'swimlane' | 'project';
export type EventType = 'task.created' | 'task.updated' | 'task.moved' | 'task.closed' | 'task.reopened' | 'task.deleted' | 'task.assigned' | 'task.unassigned' | 'subtask.created' | 'subtask.updated' | 'subtask.completed' | 'subtask.deleted' | 'comment.created' | 'comment.updated' | 'comment.deleted' | 'column.created' | 'column.updated' | 'column.deleted' | 'swimlane.created' | 'swimlane.updated' | 'swimlane.deleted' | 'project.updated';
export interface ActivityChange {
    field: string;
    oldValue: unknown;
    newValue: unknown;
}
export interface LogActivityParams {
    projectId: number;
    userId: number | null;
    eventType: EventType;
    entityType: EntityType;
    entityId: number;
    changes?: ActivityChange[];
    metadata?: Record<string, unknown>;
}
/**
 * Log an activity event
 */
export declare function logActivity(prisma: PrismaClient, params: LogActivityParams): Promise<void>;
/**
 * Log a task creation event
 */
export declare function logTaskCreated(prisma: PrismaClient, projectId: number, userId: number, taskId: number, taskTitle: string): Promise<void>;
/**
 * Log a task update event
 */
export declare function logTaskUpdated(prisma: PrismaClient, projectId: number, userId: number, taskId: number, changes: ActivityChange[]): Promise<void>;
/**
 * Log a task move event (column/swimlane change)
 */
export declare function logTaskMoved(prisma: PrismaClient, projectId: number, userId: number, taskId: number, fromColumn: string, toColumn: string, fromSwimlane?: string | null, toSwimlane?: string | null): Promise<void>;
/**
 * Log a task close event
 */
export declare function logTaskClosed(prisma: PrismaClient, projectId: number, userId: number, taskId: number): Promise<void>;
/**
 * Log a task reopen event
 */
export declare function logTaskReopened(prisma: PrismaClient, projectId: number, userId: number, taskId: number): Promise<void>;
/**
 * Log a subtask creation event
 */
export declare function logSubtaskCreated(prisma: PrismaClient, projectId: number, userId: number, subtaskId: number, taskId: number, subtaskTitle: string): Promise<void>;
/**
 * Log a subtask completion event
 */
export declare function logSubtaskCompleted(prisma: PrismaClient, projectId: number, userId: number, subtaskId: number, taskId: number): Promise<void>;
/**
 * Log a comment creation event
 */
export declare function logCommentCreated(prisma: PrismaClient, projectId: number, userId: number, commentId: number, taskId: number): Promise<void>;
/**
 * Detect changes between old and new values
 */
export declare function detectChanges<T extends Record<string, unknown>>(oldValues: T, newValues: Partial<T>, fieldsToTrack: (keyof T)[]): ActivityChange[];
//# sourceMappingURL=activityLogger.d.ts.map