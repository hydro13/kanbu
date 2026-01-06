"use strict";
/*
 * Subtask Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for subtask CRUD and time tracking.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 *
 * Modified by:
 * Session: 404dd64e-7f41-4608-bb62-2cc5ead5fd6a
 * Signed: 2025-12-28T19:55 CET
 * Change: Added logTime procedure, improved startTimer/stopTimer with timeTracking helpers
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subtaskRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
const task_1 = require("../../lib/task");
const board_1 = require("../../lib/board");
const timeTracking_1 = require("../../lib/timeTracking");
// =============================================================================
// Input Schemas
// =============================================================================
const taskIdSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
});
const subtaskIdSchema = zod_1.z.object({
    subtaskId: zod_1.z.number(),
});
const createSubtaskSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    title: zod_1.z.string().min(1).max(500),
    assigneeId: zod_1.z.number().optional(),
    timeEstimated: zod_1.z.number().min(0).default(0),
});
const updateSubtaskSchema = zod_1.z.object({
    subtaskId: zod_1.z.number(),
    title: zod_1.z.string().min(1).max(500).optional(),
    status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    assigneeId: zod_1.z.number().nullable().optional(),
    timeEstimated: zod_1.z.number().min(0).optional(),
    timeSpent: zod_1.z.number().min(0).optional(),
});
const reorderSubtaskSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    subtaskId: zod_1.z.number(),
    newPosition: zod_1.z.number().min(1),
});
// =============================================================================
// Helpers
// =============================================================================
async function getTaskProjectId(prisma, taskId) {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true },
    });
    if (!task) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Task not found',
        });
    }
    return task.projectId;
}
async function getSubtaskTaskId(prisma, subtaskId) {
    const subtask = await prisma.subtask.findUnique({
        where: { id: subtaskId },
        select: {
            taskId: true,
            task: {
                select: { projectId: true },
            },
        },
    });
    if (!subtask) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Subtask not found',
        });
    }
    return {
        taskId: subtask.taskId,
        projectId: subtask.task.projectId,
    };
}
// =============================================================================
// Subtask Router
// =============================================================================
exports.subtaskRouter = (0, router_1.router)({
    /**
     * List subtasks for a task
     * Requires at least VIEWER access
     */
    list: router_1.protectedProcedure
        .input(taskIdSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const subtasks = await ctx.prisma.subtask.findMany({
            where: { taskId: input.taskId },
            select: {
                id: true,
                title: true,
                status: true,
                position: true,
                timeEstimated: true,
                timeSpent: true,
                createdAt: true,
                updatedAt: true,
                assignee: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { position: 'asc' },
        });
        return subtasks;
    }),
    /**
     * Create a new subtask
     * Requires at least MEMBER access
     */
    create: router_1.protectedProcedure
        .input(createSubtaskSchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Get next position
        const maxSubtask = await ctx.prisma.subtask.findFirst({
            where: { taskId: input.taskId },
            orderBy: { position: 'desc' },
            select: { position: true },
        });
        const position = (maxSubtask?.position ?? 0) + 1;
        const subtask = await ctx.prisma.subtask.create({
            data: {
                taskId: input.taskId,
                title: input.title,
                assigneeId: input.assigneeId,
                timeEstimated: input.timeEstimated,
                position,
            },
            select: {
                id: true,
                title: true,
                status: true,
                position: true,
                timeEstimated: true,
                createdAt: true,
            },
        });
        // Update task progress (now has a new TODO subtask)
        await (0, task_1.updateTaskProgress)(input.taskId);
        return subtask;
    }),
    /**
     * Get subtask details
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(subtaskIdSchema)
        .query(async ({ ctx, input }) => {
        const { projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const subtask = await ctx.prisma.subtask.findUnique({
            where: { id: input.subtaskId },
            select: {
                id: true,
                taskId: true,
                title: true,
                status: true,
                position: true,
                timeEstimated: true,
                timeSpent: true,
                createdAt: true,
                updatedAt: true,
                assignee: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });
        return subtask;
    }),
    /**
     * Update subtask (title, status, time, assignee)
     * Requires at least MEMBER access
     * Automatically updates parent task progress on status change
     */
    update: router_1.protectedProcedure
        .input(updateSubtaskSchema)
        .mutation(async ({ ctx, input }) => {
        const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        const { subtaskId, ...updateData } = input;
        const updated = await ctx.prisma.subtask.update({
            where: { id: subtaskId },
            data: updateData,
            select: {
                id: true,
                title: true,
                status: true,
                timeEstimated: true,
                timeSpent: true,
                updatedAt: true,
            },
        });
        // If status changed, update task progress
        if (input.status !== undefined) {
            await (0, task_1.updateTaskProgress)(taskId);
        }
        return updated;
    }),
    /**
     * Delete a subtask
     * Requires at least MEMBER access
     */
    delete: router_1.protectedProcedure
        .input(subtaskIdSchema)
        .mutation(async ({ ctx, input }) => {
        const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        await ctx.prisma.subtask.delete({
            where: { id: input.subtaskId },
        });
        // Update task progress
        await (0, task_1.updateTaskProgress)(taskId);
        return { success: true };
    }),
    /**
     * Reorder subtasks within a task
     * Requires at least MEMBER access
     */
    reorder: router_1.protectedProcedure
        .input(reorderSubtaskSchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Get all subtasks for the task
        const subtasks = await ctx.prisma.subtask.findMany({
            where: { taskId: input.taskId },
            select: { id: true, position: true },
            orderBy: { position: 'asc' },
        });
        // Calculate new positions
        const updates = (0, board_1.calculateNewPositions)(subtasks, input.subtaskId, input.newPosition);
        // Apply updates
        await ctx.prisma.$transaction(updates.map((update) => ctx.prisma.subtask.update({
            where: { id: update.id },
            data: { position: update.position },
        })));
        return { success: true };
    }),
    /**
     * Start time tracking on a subtask
     * Sets status to IN_PROGRESS
     * Returns the timer start time (updatedAt) for client-side tracking
     * Requires at least MEMBER access
     */
    startTimer: router_1.protectedProcedure
        .input(subtaskIdSchema)
        .mutation(async ({ ctx, input }) => {
        const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        const updated = await ctx.prisma.subtask.update({
            where: { id: input.subtaskId },
            data: { status: 'IN_PROGRESS' },
            select: {
                id: true,
                title: true,
                status: true,
                timeSpent: true,
                timeEstimated: true,
                updatedAt: true,
            },
        });
        await (0, task_1.updateTaskProgress)(taskId);
        return {
            ...updated,
            timerStartedAt: updated.updatedAt,
            timeSpentDisplay: (0, timeTracking_1.formatTimeDisplay)(updated.timeSpent),
        };
    }),
    /**
     * Stop time tracking and mark as done
     * Sets status to DONE
     * Optionally adds elapsed time to timeSpent
     * Requires at least MEMBER access
     */
    stopTimer: router_1.protectedProcedure
        .input(zod_1.z.object({
        subtaskId: zod_1.z.number(),
        addTimeSpent: zod_1.z.number().min(0).optional(), // Time to add (from client timer)
    }))
        .mutation(async ({ ctx, input }) => {
        const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Get current time spent
        const current = await ctx.prisma.subtask.findUnique({
            where: { id: input.subtaskId },
            select: { timeSpent: true },
        });
        const newTimeSpent = (0, timeTracking_1.addTime)(current?.timeSpent ?? 0, input.addTimeSpent ?? 0);
        const updated = await ctx.prisma.subtask.update({
            where: { id: input.subtaskId },
            data: {
                status: 'DONE',
                timeSpent: newTimeSpent,
            },
            select: {
                id: true,
                title: true,
                status: true,
                timeSpent: true,
                timeEstimated: true,
                updatedAt: true,
            },
        });
        await (0, task_1.updateTaskProgress)(taskId);
        return {
            ...updated,
            timeSpentDisplay: (0, timeTracking_1.formatTimeDisplay)(updated.timeSpent),
        };
    }),
    /**
     * Log time manually on a subtask
     * Adds time to existing timeSpent (does not change status)
     * Requires at least MEMBER access
     */
    logTime: router_1.protectedProcedure
        .input(zod_1.z.object({
        subtaskId: zod_1.z.number(),
        hours: zod_1.z.number().positive(), // Time to add in hours
    }))
        .mutation(async ({ ctx, input }) => {
        const { projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Get current time spent
        const current = await ctx.prisma.subtask.findUnique({
            where: { id: input.subtaskId },
            select: { timeSpent: true },
        });
        const newTimeSpent = (0, timeTracking_1.addTime)(current?.timeSpent ?? 0, input.hours);
        const updated = await ctx.prisma.subtask.update({
            where: { id: input.subtaskId },
            data: { timeSpent: newTimeSpent },
            select: {
                id: true,
                timeSpent: true,
                updatedAt: true,
            },
        });
        return {
            ...updated,
            timeSpentDisplay: (0, timeTracking_1.formatTimeDisplay)(updated.timeSpent),
        };
    }),
});
//# sourceMappingURL=subtask.js.map