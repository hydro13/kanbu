"use strict";
/*
 * Tag Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for tag CRUD and task-tag management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
// =============================================================================
// Input Schemas
// =============================================================================
const projectIdSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
});
const tagIdSchema = zod_1.z.object({
    tagId: zod_1.z.number(),
});
const createTagSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(100),
    color: zod_1.z.string().max(20).default('grey'),
});
const updateTagSchema = zod_1.z.object({
    tagId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(100).optional(),
    color: zod_1.z.string().max(20).optional(),
});
const addTagToTaskSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    tagId: zod_1.z.number(),
});
const removeTagFromTaskSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    tagId: zod_1.z.number(),
});
const getTaskTagsSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
});
// =============================================================================
// Helpers
// =============================================================================
async function getTagProjectId(prisma, tagId) {
    const tag = await prisma.tag.findUnique({
        where: { id: tagId },
        select: { projectId: true },
    });
    if (!tag) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Tag not found',
        });
    }
    return tag.projectId;
}
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
// =============================================================================
// Tag Router
// =============================================================================
exports.tagRouter = (0, router_1.router)({
    /**
     * List all tags for a project
     * Requires at least VIEWER access
     */
    list: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const tags = await ctx.prisma.tag.findMany({
            where: { projectId: input.projectId },
            select: {
                id: true,
                name: true,
                color: true,
                createdAt: true,
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        return tags.map((tag) => ({
            ...tag,
            taskCount: tag._count.tasks,
        }));
    }),
    /**
     * Get a single tag by ID
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(tagIdSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getTagProjectId(ctx.prisma, input.tagId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const tag = await ctx.prisma.tag.findUnique({
            where: { id: input.tagId },
            select: {
                id: true,
                projectId: true,
                name: true,
                color: true,
                createdAt: true,
                _count: {
                    select: { tasks: true },
                },
            },
        });
        if (!tag) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Tag not found',
            });
        }
        return {
            ...tag,
            taskCount: tag._count.tasks,
        };
    }),
    /**
     * Create a new tag
     * Requires at least MEMBER access
     */
    create: router_1.protectedProcedure
        .input(createTagSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MEMBER');
        // Check for duplicate name
        const existing = await ctx.prisma.tag.findUnique({
            where: {
                projectId_name: {
                    projectId: input.projectId,
                    name: input.name,
                },
            },
        });
        if (existing) {
            throw new server_1.TRPCError({
                code: 'CONFLICT',
                message: 'A tag with this name already exists',
            });
        }
        const tag = await ctx.prisma.tag.create({
            data: {
                projectId: input.projectId,
                name: input.name,
                color: input.color,
            },
            select: {
                id: true,
                name: true,
                color: true,
                createdAt: true,
            },
        });
        return tag;
    }),
    /**
     * Update a tag
     * Requires at least MEMBER access
     */
    update: router_1.protectedProcedure
        .input(updateTagSchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getTagProjectId(ctx.prisma, input.tagId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Check for duplicate name if name is being changed
        if (input.name) {
            const existing = await ctx.prisma.tag.findFirst({
                where: {
                    projectId,
                    name: input.name,
                    id: { not: input.tagId },
                },
            });
            if (existing) {
                throw new server_1.TRPCError({
                    code: 'CONFLICT',
                    message: 'A tag with this name already exists',
                });
            }
        }
        const { tagId, ...updateData } = input;
        const tag = await ctx.prisma.tag.update({
            where: { id: tagId },
            data: updateData,
            select: {
                id: true,
                name: true,
                color: true,
            },
        });
        return tag;
    }),
    /**
     * Delete a tag
     * Requires at least MANAGER access
     * Also removes all task-tag associations
     */
    delete: router_1.protectedProcedure
        .input(tagIdSchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getTagProjectId(ctx.prisma, input.tagId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MANAGER');
        // Delete tag (cascade will remove TaskTag entries)
        await ctx.prisma.tag.delete({
            where: { id: input.tagId },
        });
        return { success: true };
    }),
    /**
     * Add a tag to a task
     * Requires at least MEMBER access
     */
    addToTask: router_1.protectedProcedure
        .input(addTagToTaskSchema)
        .mutation(async ({ ctx, input }) => {
        // Verify both task and tag exist and are in the same project
        const taskProjectId = await getTaskProjectId(ctx.prisma, input.taskId);
        const tagProjectId = await getTagProjectId(ctx.prisma, input.tagId);
        if (taskProjectId !== tagProjectId) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Task and tag must belong to the same project',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, taskProjectId, 'MEMBER');
        // Check if already tagged
        const existing = await ctx.prisma.taskTag.findUnique({
            where: {
                taskId_tagId: {
                    taskId: input.taskId,
                    tagId: input.tagId,
                },
            },
        });
        if (existing) {
            // Already tagged, return success
            return { success: true, alreadyTagged: true };
        }
        await ctx.prisma.taskTag.create({
            data: {
                taskId: input.taskId,
                tagId: input.tagId,
            },
        });
        return { success: true, alreadyTagged: false };
    }),
    /**
     * Remove a tag from a task
     * Requires at least MEMBER access
     */
    removeFromTask: router_1.protectedProcedure
        .input(removeTagFromTaskSchema)
        .mutation(async ({ ctx, input }) => {
        const taskProjectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, taskProjectId, 'MEMBER');
        // Delete the task-tag association if it exists
        await ctx.prisma.taskTag.deleteMany({
            where: {
                taskId: input.taskId,
                tagId: input.tagId,
            },
        });
        return { success: true };
    }),
    /**
     * Get all tags for a specific task
     * Requires at least VIEWER access
     */
    getTaskTags: router_1.protectedProcedure
        .input(getTaskTagsSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const taskTags = await ctx.prisma.taskTag.findMany({
            where: { taskId: input.taskId },
            select: {
                tag: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: {
                tag: { name: 'asc' },
            },
        });
        return taskTags.map((tt) => tt.tag);
    }),
});
//# sourceMappingURL=tag.js.map