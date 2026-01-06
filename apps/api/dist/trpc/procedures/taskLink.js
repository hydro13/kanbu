"use strict";
/*
 * Task Link Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for task links and dependencies.
 * Handles blocks, relates to, duplicates, and other link types.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 91ee674b-91f8-407e-950b-e02721eb0de6
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T18:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskLinkRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
const dependencies_1 = require("../../lib/dependencies");
// =============================================================================
// Constants
// =============================================================================
/**
 * Link types and their inverse relationships.
 * When A->B with type X, we can derive B->A with type Y.
 */
const INVERSE_LINK_TYPES = {
    BLOCKS: 'IS_BLOCKED_BY',
    IS_BLOCKED_BY: 'BLOCKS',
    DUPLICATES: 'IS_DUPLICATED_BY',
    IS_DUPLICATED_BY: 'DUPLICATES',
    IS_CHILD_OF: 'IS_PARENT_OF',
    IS_PARENT_OF: 'IS_CHILD_OF',
    FOLLOWS: 'IS_FOLLOWED_BY',
    IS_FOLLOWED_BY: 'FOLLOWS',
    FIXES: 'IS_FIXED_BY',
    IS_FIXED_BY: 'FIXES',
    RELATES_TO: 'RELATES_TO', // Symmetric
};
/**
 * Link types that require circular dependency checking.
 */
const BLOCKING_LINK_TYPES = ['BLOCKS', 'IS_BLOCKED_BY'];
// =============================================================================
// Input Schemas
// =============================================================================
const taskIdSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
});
const linkTypeEnum = zod_1.z.enum([
    'RELATES_TO',
    'BLOCKS',
    'IS_BLOCKED_BY',
    'DUPLICATES',
    'IS_DUPLICATED_BY',
    'IS_CHILD_OF',
    'IS_PARENT_OF',
    'FOLLOWS',
    'IS_FOLLOWED_BY',
    'FIXES',
    'IS_FIXED_BY',
]);
const createLinkSchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    oppositeTaskId: zod_1.z.number(),
    linkType: linkTypeEnum,
});
const deleteLinkSchema = zod_1.z.object({
    linkId: zod_1.z.number(),
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
async function getLinkById(prisma, linkId) {
    const link = await prisma.taskLink.findUnique({
        where: { id: linkId },
        select: {
            taskId: true,
            task: {
                select: { projectId: true },
            },
        },
    });
    if (!link) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Link not found',
        });
    }
    return {
        taskId: link.taskId,
        projectId: link.task.projectId,
    };
}
// =============================================================================
// Task Link Router
// =============================================================================
exports.taskLinkRouter = (0, router_1.router)({
    /**
     * List all links for a task
     * Returns both outgoing and incoming links
     * Requires at least VIEWER access
     */
    list: router_1.protectedProcedure
        .input(taskIdSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        // Get links where this task is the source
        const outgoingLinks = await ctx.prisma.taskLink.findMany({
            where: { taskId: input.taskId },
            select: {
                id: true,
                linkType: true,
                createdAt: true,
                oppositeTask: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                        isActive: true,
                        column: {
                            select: { title: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Get links where this task is the target
        const incomingLinks = await ctx.prisma.taskLink.findMany({
            where: { oppositeTaskId: input.taskId },
            select: {
                id: true,
                linkType: true,
                createdAt: true,
                task: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                        isActive: true,
                        column: {
                            select: { title: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Format outgoing links
        const formattedOutgoing = outgoingLinks.map((link) => ({
            id: link.id,
            direction: 'outgoing',
            linkType: link.linkType,
            linkedTask: {
                id: link.oppositeTask.id,
                title: link.oppositeTask.title,
                reference: link.oppositeTask.reference,
                isActive: link.oppositeTask.isActive,
                columnTitle: link.oppositeTask.column.title,
            },
            createdAt: link.createdAt,
        }));
        // Format incoming links with inverse type
        const formattedIncoming = incomingLinks.map((link) => ({
            id: link.id,
            direction: 'incoming',
            linkType: INVERSE_LINK_TYPES[link.linkType] ?? link.linkType,
            originalLinkType: link.linkType,
            linkedTask: {
                id: link.task.id,
                title: link.task.title,
                reference: link.task.reference,
                isActive: link.task.isActive,
                columnTitle: link.task.column.title,
            },
            createdAt: link.createdAt,
        }));
        return {
            outgoing: formattedOutgoing,
            incoming: formattedIncoming,
            all: [...formattedOutgoing, ...formattedIncoming].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        };
    }),
    /**
     * Create a new link between two tasks
     * Requires at least MEMBER access
     * Prevents circular dependencies for blocking links
     */
    create: router_1.protectedProcedure
        .input(createLinkSchema)
        .mutation(async ({ ctx, input }) => {
        // Validate both tasks exist and user has access
        const sourceProjectId = await getTaskProjectId(ctx.prisma, input.taskId);
        const targetProjectId = await getTaskProjectId(ctx.prisma, input.oppositeTaskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, sourceProjectId, 'MEMBER');
        // For now, require both tasks to be in the same project
        if (sourceProjectId !== targetProjectId) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot link tasks from different projects',
            });
        }
        // Cannot link a task to itself
        if (input.taskId === input.oppositeTaskId) {
            throw new server_1.TRPCError({
                code: 'BAD_REQUEST',
                message: 'Cannot link a task to itself',
            });
        }
        // Check for circular dependencies for blocking links
        if (BLOCKING_LINK_TYPES.includes(input.linkType)) {
            const sourceId = input.linkType === 'BLOCKS' ? input.taskId : input.oppositeTaskId;
            const targetId = input.linkType === 'BLOCKS' ? input.oppositeTaskId : input.taskId;
            const wouldCreateCycle = await (0, dependencies_1.wouldCreateCircularDependency)(sourceId, targetId);
            if (wouldCreateCycle) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'This link would create a circular dependency',
                });
            }
        }
        // Check if link already exists
        const existingLink = await ctx.prisma.taskLink.findFirst({
            where: {
                taskId: input.taskId,
                oppositeTaskId: input.oppositeTaskId,
                linkType: input.linkType,
            },
        });
        if (existingLink) {
            throw new server_1.TRPCError({
                code: 'CONFLICT',
                message: 'This link already exists',
            });
        }
        // Create the link
        const link = await ctx.prisma.taskLink.create({
            data: {
                taskId: input.taskId,
                oppositeTaskId: input.oppositeTaskId,
                linkType: input.linkType,
            },
            select: {
                id: true,
                linkType: true,
                createdAt: true,
                oppositeTask: {
                    select: {
                        id: true,
                        title: true,
                        reference: true,
                    },
                },
            },
        });
        return link;
    }),
    /**
     * Delete a link
     * Requires at least MEMBER access
     */
    delete: router_1.protectedProcedure
        .input(deleteLinkSchema)
        .mutation(async ({ ctx, input }) => {
        const { projectId } = await getLinkById(ctx.prisma, input.linkId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        await ctx.prisma.taskLink.delete({
            where: { id: input.linkId },
        });
        return { success: true };
    }),
    /**
     * Get blocking information for a task
     * Returns tasks that block this task and tasks blocked by this task
     * Requires at least VIEWER access
     */
    getBlocking: router_1.protectedProcedure
        .input(taskIdSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        // Get direct blockers and blocked tasks
        const [blockingChain, blockedChain, blocked] = await Promise.all([
            (0, dependencies_1.getBlockingChain)(input.taskId),
            (0, dependencies_1.getBlockedChain)(input.taskId),
            (0, dependencies_1.isTaskBlocked)(input.taskId),
        ]);
        // Get task details for blocking chain
        const blockingTasks = blockingChain.length > 0
            ? await ctx.prisma.task.findMany({
                where: { id: { in: blockingChain } },
                select: {
                    id: true,
                    title: true,
                    reference: true,
                    isActive: true,
                    column: {
                        select: { title: true },
                    },
                },
            })
            : [];
        // Get task details for blocked chain
        const blockedTasks = blockedChain.length > 0
            ? await ctx.prisma.task.findMany({
                where: { id: { in: blockedChain } },
                select: {
                    id: true,
                    title: true,
                    reference: true,
                    isActive: true,
                    column: {
                        select: { title: true },
                    },
                },
            })
            : [];
        return {
            isBlocked: blocked,
            blockingTasks: blockingTasks.map((t) => ({
                id: t.id,
                title: t.title,
                reference: t.reference,
                isActive: t.isActive,
                columnTitle: t.column.title,
            })),
            blockedTasks: blockedTasks.map((t) => ({
                id: t.id,
                title: t.title,
                reference: t.reference,
                isActive: t.isActive,
                columnTitle: t.column.title,
            })),
            blockingCount: blockingTasks.length,
            blockedCount: blockedTasks.length,
        };
    }),
    /**
     * Get available link types
     * Returns all link types with their labels and descriptions
     */
    getLinkTypes: router_1.protectedProcedure.query(() => {
        return [
            { type: 'BLOCKS', label: 'Blocks', description: 'This task blocks another task' },
            { type: 'IS_BLOCKED_BY', label: 'Is blocked by', description: 'This task is blocked by another task' },
            { type: 'RELATES_TO', label: 'Relates to', description: 'This task is related to another task' },
            { type: 'DUPLICATES', label: 'Duplicates', description: 'This task duplicates another task' },
            { type: 'IS_DUPLICATED_BY', label: 'Is duplicated by', description: 'This task is duplicated by another task' },
            { type: 'IS_CHILD_OF', label: 'Is child of', description: 'This task is a child of another task' },
            { type: 'IS_PARENT_OF', label: 'Is parent of', description: 'This task is the parent of another task' },
            { type: 'FOLLOWS', label: 'Follows', description: 'This task follows another task' },
            { type: 'IS_FOLLOWED_BY', label: 'Is followed by', description: 'This task is followed by another task' },
            { type: 'FIXES', label: 'Fixes', description: 'This task fixes an issue in another task' },
            { type: 'IS_FIXED_BY', label: 'Is fixed by', description: 'This task is fixed by another task' },
        ];
    }),
    /**
     * Search tasks for linking
     * Returns tasks that can be linked to the given task
     * Requires at least VIEWER access
     */
    searchTasks: router_1.protectedProcedure
        .input(zod_1.z.object({
        taskId: zod_1.z.number(),
        query: zod_1.z.string().min(1).max(100),
        limit: zod_1.z.number().min(1).max(50).default(10),
    }))
        .query(async ({ ctx, input }) => {
        const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        // Search tasks in the same project, excluding the current task
        const tasks = await ctx.prisma.task.findMany({
            where: {
                projectId,
                id: { not: input.taskId },
                OR: [
                    { title: { contains: input.query, mode: 'insensitive' } },
                    { reference: { contains: input.query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                title: true,
                reference: true,
                isActive: true,
                column: {
                    select: { title: true },
                },
            },
            take: input.limit,
            orderBy: { updatedAt: 'desc' },
        });
        return tasks.map((t) => ({
            id: t.id,
            title: t.title,
            reference: t.reference,
            isActive: t.isActive,
            columnTitle: t.column.title,
        }));
    }),
});
//# sourceMappingURL=taskLink.js.map