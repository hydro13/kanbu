"use strict";
/*
 * Task Helper Functions
 * Version: 1.0.0
 *
 * Utilities for task operations: progress, validation, relations.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaskProgress = calculateTaskProgress;
exports.updateTaskProgress = updateTaskProgress;
exports.validateTaskMove = validateTaskMove;
exports.getTaskWithRelations = getTaskWithRelations;
exports.getNextTaskPosition = getNextTaskPosition;
exports.applyTaskPositions = applyTaskPositions;
exports.recalculateTaskTime = recalculateTaskTime;
const server_1 = require("@trpc/server");
const prisma_1 = require("./prisma");
const board_1 = require("./board");
// =============================================================================
// Progress Calculation
// =============================================================================
/**
 * Calculate task progress based on subtasks.
 * Returns 0% if no subtasks, otherwise % of completed subtasks.
 *
 * @param taskId - The task ID to calculate progress for
 * @returns TaskProgress with percentage and counts
 * @throws TRPCError NOT_FOUND if task doesn't exist
 */
async function calculateTaskProgress(taskId) {
    const task = await prisma_1.prisma.task.findUnique({
        where: { id: taskId },
        select: {
            id: true,
            subtasks: {
                select: {
                    status: true,
                },
            },
        },
    });
    if (!task) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
        });
    }
    const totalSubtasks = task.subtasks.length;
    const completedSubtasks = task.subtasks.filter((s) => s.status === 'DONE').length;
    const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    return {
        taskId,
        totalSubtasks,
        completedSubtasks,
        progressPercentage,
        hasSubtasks: totalSubtasks > 0,
    };
}
/**
 * Update task progress based on its subtasks.
 * Called after subtask status changes.
 *
 * @param taskId - The task ID to update
 * @returns Updated progress percentage
 */
async function updateTaskProgress(taskId) {
    const progress = await calculateTaskProgress(taskId);
    await prisma_1.prisma.task.update({
        where: { id: taskId },
        data: { progress: progress.progressPercentage },
    });
    return progress.progressPercentage;
}
// =============================================================================
// Move Validation
// =============================================================================
/**
 * Validate if a task can be moved to a column.
 * Checks WIP limits and column existence.
 *
 * @param taskId - The task ID to move
 * @param targetColumnId - The target column ID
 * @returns Validation result with reason if denied
 */
async function validateTaskMove(taskId, targetColumnId) {
    // Check if task exists
    const task = await prisma_1.prisma.task.findUnique({
        where: { id: taskId },
        select: {
            id: true,
            columnId: true,
            projectId: true,
            isActive: true,
        },
    });
    if (!task) {
        return {
            canMove: false,
            reason: 'Task not found',
        };
    }
    if (!task.isActive) {
        return {
            canMove: false,
            reason: 'Cannot move a closed task',
        };
    }
    // If moving to same column, always allowed
    if (task.columnId === targetColumnId) {
        return { canMove: true };
    }
    // Check target column exists and belongs to same project
    const targetColumn = await prisma_1.prisma.column.findUnique({
        where: { id: targetColumnId },
        select: {
            id: true,
            projectId: true,
        },
    });
    if (!targetColumn) {
        return {
            canMove: false,
            reason: 'Target column not found',
        };
    }
    if (targetColumn.projectId !== task.projectId) {
        return {
            canMove: false,
            reason: 'Cannot move task to a column in a different project',
        };
    }
    // Check WIP limit on target column
    const wipValidation = await (0, board_1.checkWIPLimit)(targetColumnId);
    if (!wipValidation.canAddTask) {
        return {
            canMove: false,
            reason: `Column WIP limit reached (${wipValidation.currentCount}/${wipValidation.taskLimit})`,
            wipValidation,
        };
    }
    return {
        canMove: true,
        wipValidation,
    };
}
// =============================================================================
// Task Relations
// =============================================================================
/**
 * Get task with all related entities loaded.
 * Used for task detail view.
 *
 * @param taskId - The task ID to load
 * @returns Task with all relations
 * @throws TRPCError NOT_FOUND if task doesn't exist
 */
async function getTaskWithRelations(taskId) {
    const task = await prisma_1.prisma.task.findUnique({
        where: { id: taskId },
        include: {
            column: {
                select: {
                    id: true,
                    title: true,
                    taskLimit: true,
                },
            },
            swimlane: {
                select: {
                    id: true,
                    name: true,
                },
            },
            creator: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    avatarUrl: true,
                },
            },
            assignees: {
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
            subtasks: {
                orderBy: { position: 'asc' },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    position: true,
                    timeEstimated: true,
                    timeSpent: true,
                    assignee: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                        },
                    },
                },
            },
            comments: {
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            avatarUrl: true,
                        },
                    },
                },
            },
            tags: {
                include: {
                    tag: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                        },
                    },
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                },
            },
            milestone: {
                select: {
                    id: true,
                    name: true,
                },
            },
            module: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                },
            },
            sprint: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                },
            },
        },
    });
    if (!task) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
        });
    }
    return task;
}
// =============================================================================
// Position Helpers
// =============================================================================
/**
 * Get the next available position for a task in a column.
 *
 * @param columnId - The column ID
 * @param swimlaneId - Optional swimlane ID for position within swimlane
 * @returns Next position number
 */
async function getNextTaskPosition(columnId, swimlaneId) {
    const maxTask = await prisma_1.prisma.task.findFirst({
        where: {
            columnId,
            swimlaneId: swimlaneId ?? undefined,
            isActive: true,
        },
        orderBy: { position: 'desc' },
        select: { position: true },
    });
    return (maxTask?.position ?? 0) + 1;
}
/**
 * Apply position updates to tasks in a transaction.
 *
 * @param updates - Array of {id, position} updates
 */
async function applyTaskPositions(updates) {
    await prisma_1.prisma.$transaction(updates.map((update) => prisma_1.prisma.task.update({
        where: { id: update.id },
        data: { position: update.position },
    })));
}
// =============================================================================
// Time Tracking
// =============================================================================
/**
 * Recalculate task time spent from subtasks.
 *
 * @param taskId - The task ID to update
 * @returns Total time spent in hours
 */
async function recalculateTaskTime(taskId) {
    const subtasks = await prisma_1.prisma.subtask.findMany({
        where: { taskId },
        select: { timeSpent: true },
    });
    const totalTimeSpent = subtasks.reduce((sum, s) => sum + s.timeSpent, 0);
    await prisma_1.prisma.task.update({
        where: { id: taskId },
        data: { timeSpent: totalTimeSpent },
    });
    return totalTimeSpent;
}
//# sourceMappingURL=task.js.map