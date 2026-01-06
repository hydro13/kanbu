"use strict";
/*
 * Column Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for Kanban board column management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 1d704110-bdc1-417f-a584-942696f49132
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:46 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnRouter = void 0;
const zod_1 = require("zod");
const server_1 = require("@trpc/server");
const router_1 = require("../router");
const project_1 = require("../../lib/project");
const board_1 = require("../../lib/board");
// =============================================================================
// Input Schemas
// =============================================================================
const projectIdSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
});
const columnIdSchema = zod_1.z.object({
    columnId: zod_1.z.number(),
});
const createColumnSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    title: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
    taskLimit: zod_1.z.number().min(0).default(0),
    position: zod_1.z.number().optional(),
});
const updateColumnSchema = zod_1.z.object({
    columnId: zod_1.z.number(),
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
    taskLimit: zod_1.z.number().min(0).optional(),
    isCollapsed: zod_1.z.boolean().optional(),
    showClosed: zod_1.z.boolean().optional(),
});
const reorderColumnSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    columnId: zod_1.z.number(),
    newPosition: zod_1.z.number().min(1),
});
// =============================================================================
// Column Router
// =============================================================================
exports.columnRouter = (0, router_1.router)({
    /**
     * List all columns for a project
     * Requires VIEWER access
     */
    list: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const columns = await ctx.prisma.column.findMany({
            where: { projectId: input.projectId },
            orderBy: { position: 'asc' },
            select: {
                id: true,
                title: true,
                description: true,
                position: true,
                taskLimit: true,
                isCollapsed: true,
                showClosed: true,
                createdAt: true,
                _count: {
                    select: {
                        tasks: {
                            where: { isActive: true },
                        },
                    },
                },
            },
        });
        return columns.map((col) => ({
            id: col.id,
            title: col.title,
            description: col.description,
            position: col.position,
            taskLimit: col.taskLimit,
            isCollapsed: col.isCollapsed,
            showClosed: col.showClosed,
            createdAt: col.createdAt,
            taskCount: col._count.tasks,
            isOverLimit: col.taskLimit > 0 && col._count.tasks >= col.taskLimit,
        }));
    }),
    /**
     * Create a new column
     * Requires MANAGER or OWNER access
     */
    create: router_1.protectedProcedure
        .input(createColumnSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get position (use provided or next available)
        const position = input.position ?? await (0, board_1.getNextColumnPosition)(input.projectId);
        const column = await ctx.prisma.column.create({
            data: {
                projectId: input.projectId,
                title: input.title,
                description: input.description,
                taskLimit: input.taskLimit,
                position,
            },
            select: {
                id: true,
                title: true,
                description: true,
                position: true,
                taskLimit: true,
                isCollapsed: true,
                showClosed: true,
                createdAt: true,
            },
        });
        return column;
    }),
    /**
     * Get column details with WIP info
     * Requires VIEWER access
     */
    get: router_1.protectedProcedure
        .input(columnIdSchema)
        .query(async ({ ctx, input }) => {
        const column = await ctx.prisma.column.findUnique({
            where: { id: input.columnId },
            select: {
                id: true,
                projectId: true,
                title: true,
                description: true,
                position: true,
                taskLimit: true,
                isCollapsed: true,
                showClosed: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        tasks: {
                            where: { isActive: true },
                        },
                    },
                },
            },
        });
        if (!column) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Column not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, column.projectId, 'VIEWER');
        const wipInfo = await (0, board_1.checkWIPLimit)(input.columnId);
        return {
            ...column,
            taskCount: column._count.tasks,
            wipInfo,
        };
    }),
    /**
     * Update column settings
     * Requires MANAGER or OWNER access
     */
    update: router_1.protectedProcedure
        .input(updateColumnSchema)
        .mutation(async ({ ctx, input }) => {
        // First get the column to check project access
        const existingColumn = await ctx.prisma.column.findUnique({
            where: { id: input.columnId },
            select: { projectId: true },
        });
        if (!existingColumn) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Column not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, existingColumn.projectId, 'MANAGER');
        const { columnId, ...updateData } = input;
        const column = await ctx.prisma.column.update({
            where: { id: columnId },
            data: updateData,
            select: {
                id: true,
                title: true,
                description: true,
                position: true,
                taskLimit: true,
                isCollapsed: true,
                showClosed: true,
                updatedAt: true,
            },
        });
        return column;
    }),
    /**
     * Delete a column
     * Requires MANAGER or OWNER access
     * Column must be empty (no tasks)
     */
    delete: router_1.protectedProcedure
        .input(columnIdSchema)
        .mutation(async ({ ctx, input }) => {
        // First get the column to check project access
        const existingColumn = await ctx.prisma.column.findUnique({
            where: { id: input.columnId },
            select: { projectId: true },
        });
        if (!existingColumn) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Column not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, existingColumn.projectId, 'MANAGER');
        // Validate that column can be deleted
        const validation = await (0, board_1.validateColumnDelete)(input.columnId);
        if (!validation.canDelete) {
            throw new server_1.TRPCError({
                code: 'PRECONDITION_FAILED',
                message: `Cannot delete column "${validation.columnTitle}": it contains ${validation.taskCount} task(s). Move or delete tasks first.`,
            });
        }
        await ctx.prisma.column.delete({
            where: { id: input.columnId },
        });
        return { success: true };
    }),
    /**
     * Reorder columns (drag & drop)
     * Requires MANAGER or OWNER access
     */
    reorder: router_1.protectedProcedure
        .input(reorderColumnSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get all columns for this project
        const columns = await ctx.prisma.column.findMany({
            where: { projectId: input.projectId },
            select: { id: true, position: true },
            orderBy: { position: 'asc' },
        });
        // Calculate new positions
        const updates = (0, board_1.calculateNewPositions)(columns, input.columnId, input.newPosition);
        // Apply updates in transaction
        await (0, board_1.applyColumnPositions)(input.projectId, updates);
        return { success: true, newPositions: updates };
    }),
    /**
     * Check WIP limit status for a column
     * Requires VIEWER access
     */
    checkWIP: router_1.protectedProcedure
        .input(columnIdSchema)
        .query(async ({ ctx, input }) => {
        const column = await ctx.prisma.column.findUnique({
            where: { id: input.columnId },
            select: { projectId: true },
        });
        if (!column) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Column not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, column.projectId, 'VIEWER');
        return await (0, board_1.checkWIPLimit)(input.columnId);
    }),
});
//# sourceMappingURL=column.js.map