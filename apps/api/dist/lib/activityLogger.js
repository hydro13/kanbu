"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
exports.logTaskCreated = logTaskCreated;
exports.logTaskUpdated = logTaskUpdated;
exports.logTaskMoved = logTaskMoved;
exports.logTaskClosed = logTaskClosed;
exports.logTaskReopened = logTaskReopened;
exports.logSubtaskCreated = logSubtaskCreated;
exports.logSubtaskCompleted = logSubtaskCompleted;
exports.logCommentCreated = logCommentCreated;
exports.detectChanges = detectChanges;
// =============================================================================
// Activity Logger
// =============================================================================
/**
 * Log an activity event
 */
async function logActivity(prisma, params) {
    const { projectId, userId, eventType, entityType, entityId, changes = [], metadata = {} } = params;
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
            },
        },
    });
    // Update project last activity timestamp
    await prisma.project.update({
        where: { id: projectId },
        data: { lastActivityAt: new Date() },
    });
}
/**
 * Log a task creation event
 */
async function logTaskCreated(prisma, projectId, userId, taskId, taskTitle) {
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'task.created',
        entityType: 'task',
        entityId: taskId,
        metadata: { taskTitle },
    });
}
/**
 * Log a task update event
 */
async function logTaskUpdated(prisma, projectId, userId, taskId, changes) {
    if (changes.length === 0)
        return;
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'task.updated',
        entityType: 'task',
        entityId: taskId,
        changes,
    });
}
/**
 * Log a task move event (column/swimlane change)
 */
async function logTaskMoved(prisma, projectId, userId, taskId, fromColumn, toColumn, fromSwimlane, toSwimlane) {
    const changes = [];
    if (fromColumn !== toColumn) {
        changes.push({
            field: 'column',
            oldValue: fromColumn,
            newValue: toColumn,
        });
    }
    if (fromSwimlane !== toSwimlane) {
        changes.push({
            field: 'swimlane',
            oldValue: fromSwimlane,
            newValue: toSwimlane,
        });
    }
    if (changes.length === 0)
        return;
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'task.moved',
        entityType: 'task',
        entityId: taskId,
        changes,
    });
}
/**
 * Log a task close event
 */
async function logTaskClosed(prisma, projectId, userId, taskId) {
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'task.closed',
        entityType: 'task',
        entityId: taskId,
    });
}
/**
 * Log a task reopen event
 */
async function logTaskReopened(prisma, projectId, userId, taskId) {
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'task.reopened',
        entityType: 'task',
        entityId: taskId,
    });
}
/**
 * Log a subtask creation event
 */
async function logSubtaskCreated(prisma, projectId, userId, subtaskId, taskId, subtaskTitle) {
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'subtask.created',
        entityType: 'subtask',
        entityId: subtaskId,
        metadata: { taskId, subtaskTitle },
    });
}
/**
 * Log a subtask completion event
 */
async function logSubtaskCompleted(prisma, projectId, userId, subtaskId, taskId) {
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'subtask.completed',
        entityType: 'subtask',
        entityId: subtaskId,
        metadata: { taskId },
    });
}
/**
 * Log a comment creation event
 */
async function logCommentCreated(prisma, projectId, userId, commentId, taskId) {
    await logActivity(prisma, {
        projectId,
        userId,
        eventType: 'comment.created',
        entityType: 'comment',
        entityId: commentId,
        metadata: { taskId },
    });
}
/**
 * Detect changes between old and new values
 */
function detectChanges(oldValues, newValues, fieldsToTrack) {
    const changes = [];
    for (const field of fieldsToTrack) {
        if (field in newValues && newValues[field] !== oldValues[field]) {
            changes.push({
                field: String(field),
                oldValue: oldValues[field],
                newValue: newValues[field],
            });
        }
    }
    return changes;
}
//# sourceMappingURL=activityLogger.js.map