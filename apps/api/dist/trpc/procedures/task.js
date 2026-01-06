"use strict";
/*
 * Task Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for task CRUD and management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T16:45 CET
 * Change: Position validation changed from .min(1) to .positive() for fractional positioning
 *
 * Modified by:
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Signed: 2025-12-28T21:40 CET
 * Change: Extended listTasksSchema with tagIds, date range filters (EXT-02)
 *
 * Modified by:
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Signed: 2025-12-28T21:55 CET
 * Change: Added setDueDate, setReminder, getPendingReminders procedures (EXT-04)
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
const project_2 = require("../../lib/project");
const task_1 = require("../../lib/task");
const board_1 = require("../../lib/board");
// =============================================================================
// Input Schemas
// =============================================================================
const taskIdSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
});
const listTasksSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    columnId: zod_1.z.number().optional(),
    swimlaneId: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean().default(true),
    search: zod_1.z.string().max(100).optional(),
    priority: zod_1.z.number().min(0).max(3).optional(),
    assigneeId: zod_1.z.number().optional(),
    categoryId: zod_1.z.number().optional(),
    sprintId: zod_1.z.number().optional(),
    milestoneId: zod_1.z.number().optional(),
    moduleId: zod_1.z.number().optional(),
    // Tag filtering (any of these tags)
    tagIds: zod_1.z.array(zod_1.z.number()).optional(),
    // Due date range filter
    dueDateFrom: zod_1.z.string().optional(), // ISO date string
    dueDateTo: zod_1.z.string().optional(), // ISO date string
    // Created date range filter
    createdFrom: zod_1.z.string().optional(), // ISO date string
    createdTo: zod_1.z.string().optional(), // ISO date string
    // Updated date range filter
    updatedFrom: zod_1.z.string().optional(), // ISO date string
    updatedTo: zod_1.z.string().optional(), // ISO date string
    limit: zod_1.z.number().min(1).max(500).default(100),
    offset: zod_1.z.number().min(0).default(0),
});
const createTaskSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    columnId: zod_1.z.number(),
    swimlaneId: zod_1.z.number().optional(),
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().max(50000).optional(),
    priority: zod_1.z.number().min(0).max(3).default(0),
    score: zod_1.z.number().min(0).default(0),
    color: zod_1.z.string().max(20).optional(),
    dateDue: zod_1.z.string().optional(), // ISO date string
    timeEstimated: zod_1.z.number().min(0).default(0),
    categoryId: zod_1.z.number().optional(),
    sprintId: zod_1.z.number().optional(),
    milestoneId: zod_1.z.number().optional(),
    moduleId: zod_1.z.number().optional(),
    assigneeIds: zod_1.z.array(zod_1.z.number()).optional(),
    tagIds: zod_1.z.array(zod_1.z.number()).optional(),
});
const updateTaskSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(50000).optional(),
    priority: zod_1.z.number().min(0).max(3).optional(),
    score: zod_1.z.number().min(0).optional(),
    color: zod_1.z.string().max(20).nullable().optional(),
    dateDue: zod_1.z.string().nullable().optional(),
    dateStarted: zod_1.z.string().nullable().optional(),
    reminderAt: zod_1.z.string().nullable().optional(),
    timeEstimated: zod_1.z.number().min(0).optional(),
    categoryId: zod_1.z.number().nullable().optional(),
    sprintId: zod_1.z.number().nullable().optional(),
    milestoneId: zod_1.z.number().nullable().optional(),
    moduleId: zod_1.z.number().nullable().optional(),
});
const moveTaskSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    columnId: zod_1.z.number(),
    swimlaneId: zod_1.z.number().nullable().optional(),
    position: zod_1.z.number().positive().optional(), // Allow fractional positions for ordering
});
const reorderTasksSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    columnId: zod_1.z.number(),
    swimlaneId: zod_1.z.number().optional(),
    taskId: zod_1.z.number(),
    newPosition: zod_1.z.number().positive(), // Allow fractional positions for ordering
});
const manageAssigneesSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    assigneeIds: zod_1.z.array(zod_1.z.number()),
});
const manageTagsSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    tagIds: zod_1.z.array(zod_1.z.number()),
});
const setDueDateSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    dateDue: zod_1.z.string().nullable(), // ISO date string or null to clear
    includeTime: zod_1.z.boolean().default(false), // Whether time is significant
});
const setReminderSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    reminderAt: zod_1.z.string().nullable(), // ISO date string or null to clear
    // Alternative: preset offsets from due date
    preset: zod_1.z.enum(['none', '15min', '1hour', '1day', '1week', 'custom']).optional(),
});
// =============================================================================
// Task Router
// =============================================================================
exports.taskRouter = (0, router_1.router)({
    /**
     * List tasks for a project with filters
     * Requires at least VIEWER access
     */
    list: router_1.protectedProcedure
        .input(listTasksSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const tasks = await ctx.prisma.task.findMany({
            where: {
                projectId: input.projectId,
                isActive: input.isActive,
                ...(input.columnId && { columnId: input.columnId }),
                ...(input.swimlaneId && { swimlaneId: input.swimlaneId }),
                ...(input.priority !== undefined && { priority: input.priority }),
                ...(input.categoryId && { categoryId: input.categoryId }),
                ...(input.sprintId && { sprintId: input.sprintId }),
                ...(input.milestoneId && { milestoneId: input.milestoneId }),
                ...(input.moduleId && { moduleId: input.moduleId }),
                ...(input.assigneeId && {
                    assignees: { some: { userId: input.assigneeId } },
                }),
                // Tag filter: tasks that have ANY of the specified tags
                ...(input.tagIds && input.tagIds.length > 0 && {
                    tags: { some: { tagId: { in: input.tagIds } } },
                }),
                // Due date range filter
                ...((input.dueDateFrom || input.dueDateTo) && {
                    dateDue: {
                        ...(input.dueDateFrom && { gte: new Date(input.dueDateFrom) }),
                        ...(input.dueDateTo && { lte: new Date(input.dueDateTo) }),
                    },
                }),
                // Created date range filter
                ...((input.createdFrom || input.createdTo) && {
                    createdAt: {
                        ...(input.createdFrom && { gte: new Date(input.createdFrom) }),
                        ...(input.createdTo && { lte: new Date(input.createdTo) }),
                    },
                }),
                // Updated date range filter
                ...((input.updatedFrom || input.updatedTo) && {
                    updatedAt: {
                        ...(input.updatedFrom && { gte: new Date(input.updatedFrom) }),
                        ...(input.updatedTo && { lte: new Date(input.updatedTo) }),
                    },
                }),
                ...(input.search && {
                    OR: [
                        { title: { contains: input.search, mode: 'insensitive' } },
                        { reference: { contains: input.search, mode: 'insensitive' } },
                        { description: { contains: input.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                title: true,
                reference: true,
                priority: true,
                score: true,
                progress: true,
                position: true,
                color: true,
                columnId: true,
                swimlaneId: true,
                dateDue: true,
                dateStarted: true,
                dateCompleted: true,
                timeEstimated: true,
                timeSpent: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                column: {
                    select: { id: true, title: true },
                },
                swimlane: {
                    select: { id: true, name: true },
                },
                assignees: {
                    select: {
                        user: {
                            select: { id: true, username: true, name: true, avatarUrl: true },
                        },
                    },
                },
                tags: {
                    select: {
                        tag: { select: { id: true, name: true, color: true } },
                    },
                },
                _count: {
                    select: {
                        subtasks: true,
                        comments: true,
                    },
                },
            },
            orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
            take: input.limit,
            skip: input.offset,
        });
        return tasks.map((t) => ({
            ...t,
            assignees: t.assignees.map((a) => a.user),
            tags: t.tags.map((tt) => tt.tag),
            subtaskCount: t._count.subtasks,
            commentCount: t._count.comments,
        }));
    }),
    /**
     * Get task details with all relations
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(taskIdSchema)
        .query(async ({ ctx, input }) => {
        // Get task first to check project access
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'VIEWER');
        return (0, task_1.getTaskWithRelations)(input.taskId);
    }),
    /**
     * Create a new task
     * Requires at least MEMBER access
     * Auto-generates reference (PLAN-123)
     */
    create: router_1.protectedProcedure
        .input(createTaskSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MEMBER');
        // Generate task reference
        const reference = await (0, project_2.generateTaskReference)(input.projectId);
        // Get next position in column
        const position = await (0, task_1.getNextTaskPosition)(input.columnId, input.swimlaneId);
        // Create the task
        const task = await ctx.prisma.task.create({
            data: {
                projectId: input.projectId,
                columnId: input.columnId,
                swimlaneId: input.swimlaneId,
                creatorId: ctx.user.id,
                title: input.title,
                description: input.description,
                reference,
                priority: input.priority,
                score: input.score,
                color: input.color,
                dateDue: input.dateDue ? new Date(input.dateDue) : undefined,
                timeEstimated: input.timeEstimated,
                position,
                categoryId: input.categoryId,
                sprintId: input.sprintId,
                milestoneId: input.milestoneId,
                moduleId: input.moduleId,
                ...(input.assigneeIds && input.assigneeIds.length > 0 && {
                    assignees: {
                        createMany: {
                            data: input.assigneeIds.map((userId) => ({ userId })),
                        },
                    },
                }),
                ...(input.tagIds && input.tagIds.length > 0 && {
                    tags: {
                        createMany: {
                            data: input.tagIds.map((tagId) => ({ tagId })),
                        },
                    },
                }),
            },
            select: {
                id: true,
                title: true,
                reference: true,
                columnId: true,
                swimlaneId: true,
                position: true,
                createdAt: true,
            },
        });
        // Update project last activity
        await ctx.prisma.project.update({
            where: { id: input.projectId },
            data: { lastActivityAt: new Date() },
        });
        return task;
    }),
    /**
     * Update task properties
     * Requires at least MEMBER access
     */
    update: router_1.protectedProcedure
        .input(updateTaskSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        const { taskId, dateDue, dateStarted, reminderAt, ...updateData } = input;
        const updated = await ctx.prisma.task.update({
            where: { id: taskId },
            data: {
                ...updateData,
                ...(dateDue !== undefined && {
                    dateDue: dateDue ? new Date(dateDue) : null,
                }),
                ...(dateStarted !== undefined && {
                    dateStarted: dateStarted ? new Date(dateStarted) : null,
                }),
                ...(reminderAt !== undefined && {
                    reminderAt: reminderAt ? new Date(reminderAt) : null,
                }),
            },
            select: {
                id: true,
                title: true,
                reference: true,
                priority: true,
                score: true,
                color: true,
                dateDue: true,
                dateStarted: true,
                reminderAt: true,
                timeEstimated: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Move task to different column/swimlane
     * Respects WIP limits
     * Requires at least MEMBER access
     */
    move: router_1.protectedProcedure
        .input(moveTaskSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true, columnId: true, swimlaneId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        // Validate move (WIP limits, etc.)
        const validation = await (0, task_1.validateTaskMove)(input.taskId, input.columnId);
        if (!validation.canMove) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: validation.reason || 'Cannot move task',
            });
        }
        // Determine new position
        const newPosition = input.position ?? (await (0, task_1.getNextTaskPosition)(input.columnId, input.swimlaneId ?? null));
        const updated = await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: {
                columnId: input.columnId,
                swimlaneId: input.swimlaneId ?? null,
                position: newPosition,
            },
            select: {
                id: true,
                columnId: true,
                swimlaneId: true,
                position: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Reorder tasks within a column
     * Requires at least MEMBER access
     */
    reorder: router_1.protectedProcedure
        .input(reorderTasksSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MEMBER');
        // Get all tasks in the column (optionally filtered by swimlane)
        const tasks = await ctx.prisma.task.findMany({
            where: {
                projectId: input.projectId,
                columnId: input.columnId,
                isActive: true,
                ...(input.swimlaneId && { swimlaneId: input.swimlaneId }),
            },
            select: { id: true, position: true },
            orderBy: { position: 'asc' },
        });
        // Calculate new positions
        const updates = (0, board_1.calculateNewPositions)(tasks, input.taskId, input.newPosition);
        // Apply updates
        await (0, task_1.applyTaskPositions)(updates);
        return { success: true };
    }),
    /**
     * Close a task
     * Requires at least MEMBER access
     */
    close: router_1.protectedProcedure
        .input(taskIdSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true, isActive: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        if (!task.isActive) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Task is already closed',
            });
        }
        const updated = await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: {
                isActive: false,
                dateCompleted: new Date(),
            },
            select: {
                id: true,
                isActive: true,
                dateCompleted: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Reopen a closed task
     * Requires at least MEMBER access
     */
    reopen: router_1.protectedProcedure
        .input(taskIdSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true, isActive: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        if (task.isActive) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Task is already open',
            });
        }
        const updated = await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: {
                isActive: true,
                dateCompleted: null,
            },
            select: {
                id: true,
                isActive: true,
                dateCompleted: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Soft delete a task
     * Requires at least MANAGER access
     */
    delete: router_1.protectedProcedure
        .input(taskIdSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MANAGER');
        // Soft delete by closing and marking with special flag
        // For hard delete, we would use prisma.task.delete()
        await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: {
                isActive: false,
                dateCompleted: new Date(),
                // Could add a deletedAt field for proper soft delete tracking
            },
        });
        return { success: true };
    }),
    /**
     * Set assignees for a task (replaces existing)
     * Requires at least MEMBER access
     */
    setAssignees: router_1.protectedProcedure
        .input(manageAssigneesSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        // Delete existing and create new
        await ctx.prisma.$transaction([
            ctx.prisma.taskAssignee.deleteMany({
                where: { taskId: input.taskId },
            }),
            ctx.prisma.taskAssignee.createMany({
                data: input.assigneeIds.map((userId) => ({
                    taskId: input.taskId,
                    userId,
                })),
            }),
        ]);
        return { success: true };
    }),
    /**
     * Set tags for a task (replaces existing)
     * Requires at least MEMBER access
     */
    setTags: router_1.protectedProcedure
        .input(manageTagsSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        // Delete existing and create new
        await ctx.prisma.$transaction([
            ctx.prisma.taskTag.deleteMany({
                where: { taskId: input.taskId },
            }),
            ctx.prisma.taskTag.createMany({
                data: input.tagIds.map((tagId) => ({
                    taskId: input.taskId,
                    tagId,
                })),
            }),
        ]);
        return { success: true };
    }),
    /**
     * Set due date for a task
     * Dedicated procedure for date picker UI
     * Requires at least MEMBER access
     */
    setDueDate: router_1.protectedProcedure
        .input(setDueDateSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        const updated = await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: {
                dateDue: input.dateDue ? new Date(input.dateDue) : null,
            },
            select: {
                id: true,
                dateDue: true,
                reminderAt: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Set reminder for a task
     * Can use preset offsets from due date or custom datetime
     * Requires at least MEMBER access
     */
    setReminder: router_1.protectedProcedure
        .input(setReminderSchema)
        .mutation(async ({ ctx, input }) => {
        const task = await ctx.prisma.task.findUnique({
            where: { id: input.taskId },
            select: { projectId: true, dateDue: true },
        });
        if (!task) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Task not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, task.projectId, 'MEMBER');
        let reminderAt = null;
        if (input.reminderAt) {
            // Custom datetime provided
            reminderAt = new Date(input.reminderAt);
        }
        else if (input.preset && input.preset !== 'none' && input.preset !== 'custom') {
            // Calculate from due date using preset
            if (!task.dateDue) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Cannot set preset reminder without due date',
                });
            }
            const dueDate = new Date(task.dateDue);
            switch (input.preset) {
                case '15min':
                    reminderAt = new Date(dueDate.getTime() - 15 * 60 * 1000);
                    break;
                case '1hour':
                    reminderAt = new Date(dueDate.getTime() - 60 * 60 * 1000);
                    break;
                case '1day':
                    reminderAt = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '1week':
                    reminderAt = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
            }
        }
        const updated = await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: { reminderAt },
            select: {
                id: true,
                dateDue: true,
                reminderAt: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Get tasks with pending reminders
     * For notification processing
     * Requires at least VIEWER access
     */
    getPendingReminders: router_1.protectedProcedure
        .input(zod_1.z.object({ projectId: zod_1.z.number() }))
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const now = new Date();
        const tasks = await ctx.prisma.task.findMany({
            where: {
                projectId: input.projectId,
                isActive: true,
                reminderAt: {
                    not: null,
                    lte: now,
                },
            },
            select: {
                id: true,
                title: true,
                reference: true,
                dateDue: true,
                reminderAt: true,
                assignees: {
                    select: {
                        user: {
                            select: { id: true, username: true, email: true },
                        },
                    },
                },
            },
            orderBy: { reminderAt: 'asc' },
        });
        return tasks.map((t) => ({
            ...t,
            assignees: t.assignees.map((a) => a.user),
        }));
    }),
});
//# sourceMappingURL=task.js.map