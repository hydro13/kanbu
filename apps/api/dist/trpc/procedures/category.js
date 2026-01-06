"use strict";
/*
 * Category Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for category CRUD and task-category management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:36 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRouter = void 0;
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
const categoryIdSchema = zod_1.z.object({
    categoryId: zod_1.z.number(),
});
const createCategorySchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
    color: zod_1.z.string().max(20).default('blue'),
});
const updateCategorySchema = zod_1.z.object({
    categoryId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(1000).nullable().optional(),
    color: zod_1.z.string().max(20).optional(),
});
const setTaskCategorySchema = zod_1.z.object({
    taskId: zod_1.z.number(),
    categoryId: zod_1.z.number().nullable(),
});
// =============================================================================
// Helpers
// =============================================================================
async function getCategoryProjectId(prisma, categoryId) {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { projectId: true },
    });
    if (!category) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found',
        });
    }
    return category.projectId;
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
// Category Router
// =============================================================================
exports.categoryRouter = (0, router_1.router)({
    /**
     * List all categories for a project
     * Requires at least VIEWER access
     */
    list: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const categories = await ctx.prisma.category.findMany({
            where: { projectId: input.projectId },
            select: {
                id: true,
                name: true,
                description: true,
                color: true,
                createdAt: true,
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        return categories.map((category) => ({
            ...category,
            taskCount: category._count.tasks,
        }));
    }),
    /**
     * Get a single category by ID
     * Requires at least VIEWER access
     */
    get: router_1.protectedProcedure
        .input(categoryIdSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const category = await ctx.prisma.category.findUnique({
            where: { id: input.categoryId },
            select: {
                id: true,
                projectId: true,
                name: true,
                description: true,
                color: true,
                createdAt: true,
                _count: {
                    select: { tasks: true },
                },
            },
        });
        if (!category) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Category not found',
            });
        }
        return {
            ...category,
            taskCount: category._count.tasks,
        };
    }),
    /**
     * Create a new category
     * Requires at least MEMBER access
     */
    create: router_1.protectedProcedure
        .input(createCategorySchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MEMBER');
        // Check for duplicate name
        const existing = await ctx.prisma.category.findUnique({
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
                message: 'A category with this name already exists',
            });
        }
        const category = await ctx.prisma.category.create({
            data: {
                projectId: input.projectId,
                name: input.name,
                description: input.description,
                color: input.color,
            },
            select: {
                id: true,
                name: true,
                description: true,
                color: true,
                createdAt: true,
            },
        });
        return category;
    }),
    /**
     * Update a category
     * Requires at least MEMBER access
     */
    update: router_1.protectedProcedure
        .input(updateCategorySchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MEMBER');
        // Check for duplicate name if name is being changed
        if (input.name) {
            const existing = await ctx.prisma.category.findFirst({
                where: {
                    projectId,
                    name: input.name,
                    id: { not: input.categoryId },
                },
            });
            if (existing) {
                throw new server_1.TRPCError({
                    code: 'CONFLICT',
                    message: 'A category with this name already exists',
                });
            }
        }
        const { categoryId, ...updateData } = input;
        const category = await ctx.prisma.category.update({
            where: { id: categoryId },
            data: updateData,
            select: {
                id: true,
                name: true,
                description: true,
                color: true,
            },
        });
        return category;
    }),
    /**
     * Delete a category
     * Requires at least MANAGER access
     * Sets categoryId to null on all tasks using this category
     */
    delete: router_1.protectedProcedure
        .input(categoryIdSchema)
        .mutation(async ({ ctx, input }) => {
        const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'MANAGER');
        // First, unset categoryId on all tasks using this category
        await ctx.prisma.task.updateMany({
            where: { categoryId: input.categoryId },
            data: { categoryId: null },
        });
        // Then delete the category
        await ctx.prisma.category.delete({
            where: { id: input.categoryId },
        });
        return { success: true };
    }),
    /**
     * Set or remove a category on a task
     * Requires at least MEMBER access
     * Pass categoryId: null to remove the category from task
     */
    setForTask: router_1.protectedProcedure
        .input(setTaskCategorySchema)
        .mutation(async ({ ctx, input }) => {
        const taskProjectId = await getTaskProjectId(ctx.prisma, input.taskId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, taskProjectId, 'MEMBER');
        // If setting a category, verify it exists and belongs to same project
        if (input.categoryId !== null) {
            const categoryProjectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
            if (taskProjectId !== categoryProjectId) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Task and category must belong to the same project',
                });
            }
        }
        const task = await ctx.prisma.task.update({
            where: { id: input.taskId },
            data: { categoryId: input.categoryId },
            select: {
                id: true,
                categoryId: true,
                category: input.categoryId
                    ? {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                        },
                    }
                    : false,
            },
        });
        return task;
    }),
    /**
     * Get tasks by category
     * Requires at least VIEWER access
     */
    getTasks: router_1.protectedProcedure
        .input(categoryIdSchema)
        .query(async ({ ctx, input }) => {
        const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
        await (0, project_1.requireProjectAccess)(ctx.user.id, projectId, 'VIEWER');
        const tasks = await ctx.prisma.task.findMany({
            where: { categoryId: input.categoryId },
            select: {
                id: true,
                title: true,
                priority: true,
                isActive: true,
                column: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        return tasks;
    }),
});
//# sourceMappingURL=category.js.map