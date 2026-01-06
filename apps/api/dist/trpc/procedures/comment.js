"use strict";
/*
 * Comment Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for task comment CRUD.
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
exports.commentRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
// =============================================================================
// Input Schemas
// =============================================================================
const commentIdSchema = zod_1.z.object({
    commentId: zod_1.z.number(),
});
const createCommentSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    content: zod_1.z.string().min(1).max(50000),
});
const updateCommentSchema = zod_1.z.object({
    commentId: zod_1.z.number(),
    content: zod_1.z.string().min(1).max(50000),
});
const listCommentsSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
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
async function getCommentInfo(prisma, commentId) {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: {
            taskId: true,
            userId: true,
            task: {
                select: { projectId: true },
            },
        },
    });
    if (!comment) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Comment not found',
        });
    }
    return {
        taskId: comment.taskId,
        projectId: comment.task.projectId,
        userId: comment.userId,
    };
}
// =============================================================================
// Comment Router
// =============================================================================
exports.commentRouter = (0, router_1.router)({
    /**
     * List comments for a task
     * Requires at least VIEWER access
     */
    list: router_1.protectedProcedure
        .input(listCommentsSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const comments = await ctx.prisma.comment.findMany({
            where: { taskId: input.taskId },
            select: {
                id: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
        });
        // Get total count for pagination
        const total = await ctx.prisma.comment.count({
            where: { taskId: input.taskId },
        });
        return {
            comments,
            total,
            hasMore: input.offset + comments.length < total,
        };
    }),
    /**
     * Create a new comment
     * Requires at least MEMBER access
     */
    create: router_1.protectedProcedure
        .input(createCommentSchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        const comment = await ctx.prisma.comment.create({
            data: {
                taskId: input.taskId,
                userId: ctx.user.id,
                content: input.content,
            },
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
        });
        // Update project last activity
        await ctx.prisma.project.update({
            where: { id: projectId },
            data: { lastActivityAt: new Date() },
        });
        return comment;
    }),
    /**
     * Get a single comment
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(commentIdSchema)
        .query(async ({ ctx, input }) => {
        const { projectId } = await getCommentInfo(ctx.prisma, input.commentId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const comment = await ctx.prisma.comment.findUnique({
            where: { id: input.commentId },
            select: {
                id: true,
                taskId: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });
        return comment;
    }),
    /**
     * Update a comment
     * Only the author can update their comment
     * Requires at least MEMBER access
     */
    update: router_1.protectedProcedure
        .input(updateCommentSchema)
        .mutation(async ({ ctx, input }) => {
        const { projectId, userId } = await getCommentInfo(ctx.prisma, input.commentId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Only author can edit their comment
        if (userId !== ctx.user.id) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'You can only edit your own comments',
            });
        }
        const updated = await ctx.prisma.comment.update({
            where: { id: input.commentId },
            data: { content: input.content },
            select: {
                id: true,
                content: true,
                updatedAt: true,
            },
        });
        return updated;
    }),
    /**
     * Delete a comment
     * Author can delete their own comment
     * MANAGER+ can delete any comment
     */
    delete: router_1.protectedProcedure
        .input(commentIdSchema)
        .mutation(async ({ ctx, input }) => {
        const { projectId, userId } = await getCommentInfo(ctx.prisma, input.commentId);
        const access = await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Author can always delete their own comment
        // MANAGER+ can delete any comment
        const isAuthor = userId === ctx.user.id;
        const isManager = access.role === 'MANAGER' || access.role === 'OWNER';
        if (!isAuthor && !isManager) {
            throw new server_1.TRPCError({
                code: 'FORBIDDEN',
                message: 'You can only delete your own comments',
            });
        }
        await ctx.prisma.comment.delete({
            where: { id: input.commentId },
        });
        return { success: true };
    }),
});
//# sourceMappingURL=comment.js.map