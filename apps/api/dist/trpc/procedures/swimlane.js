"use strict";
/*
 * Swimlane Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for Kanban board swimlane management.
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
exports.swimlaneRouter = void 0;
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
const swimlaneIdSchema = zod_1.z.object({
    swimlaneId: zod_1.z.number(),
});
const createSwimlaneSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(1000).optional(),
    position: zod_1.z.number().optional(),
});
const updateSwimlaneSchema = zod_1.z.object({
    swimlaneId: zod_1.z.number(),
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(1000).optional(),
    isActive: zod_1.z.boolean().optional(),
});
const reorderSwimlaneSchema = zod_1.z.object({
    projectId: zod_1.z.number(),
    swimlaneId: zod_1.z.number(),
    newPosition: zod_1.z.number().min(1),
});
// =============================================================================
// Swimlane Router
// =============================================================================
exports.swimlaneRouter = (0, router_1.router)({
    /**
     * List all swimlanes for a project
     * Requires VIEWER access
     */
    list: router_1.protectedProcedure
        .input(projectIdSchema)
        .query(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'VIEWER');
        const swimlanes = await ctx.prisma.swimlane.findMany({
            where: { projectId: input.projectId },
            orderBy: { position: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                position: true,
                isActive: true,
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
        return swimlanes.map((sl) => ({
            id: sl.id,
            name: sl.name,
            description: sl.description,
            position: sl.position,
            isActive: sl.isActive,
            createdAt: sl.createdAt,
            taskCount: sl._count.tasks,
        }));
    }),
    /**
     * Create a new swimlane
     * Requires MANAGER or OWNER access
     */
    create: router_1.protectedProcedure
        .input(createSwimlaneSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get position (use provided or next available)
        const position = input.position ?? await (0, board_1.getNextSwimlanePosition)(input.projectId);
        const swimlane = await ctx.prisma.swimlane.create({
            data: {
                projectId: input.projectId,
                name: input.name,
                description: input.description,
                position,
            },
            select: {
                id: true,
                name: true,
                description: true,
                position: true,
                isActive: true,
                createdAt: true,
            },
        });
        return swimlane;
    }),
    /**
     * Get swimlane details
     * Requires VIEWER access
     */
    get: router_1.protectedProcedure
        .input(swimlaneIdSchema)
        .query(async ({ ctx, input }) => {
        const swimlane = await ctx.prisma.swimlane.findUnique({
            where: { id: input.swimlaneId },
            select: {
                id: true,
                projectId: true,
                name: true,
                description: true,
                position: true,
                isActive: true,
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
        if (!swimlane) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Swimlane not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, swimlane.projectId, 'VIEWER');
        return {
            ...swimlane,
            taskCount: swimlane._count.tasks,
        };
    }),
    /**
     * Update swimlane settings
     * Requires MANAGER or OWNER access
     */
    update: router_1.protectedProcedure
        .input(updateSwimlaneSchema)
        .mutation(async ({ ctx, input }) => {
        // First get the swimlane to check project access
        const existingSwimlane = await ctx.prisma.swimlane.findUnique({
            where: { id: input.swimlaneId },
            select: { projectId: true },
        });
        if (!existingSwimlane) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Swimlane not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, existingSwimlane.projectId, 'MANAGER');
        const { swimlaneId, ...updateData } = input;
        const swimlane = await ctx.prisma.swimlane.update({
            where: { id: swimlaneId },
            data: updateData,
            select: {
                id: true,
                name: true,
                description: true,
                position: true,
                isActive: true,
                updatedAt: true,
            },
        });
        return swimlane;
    }),
    /**
     * Delete a swimlane
     * Requires MANAGER or OWNER access
     * Swimlane must be empty (no tasks)
     */
    delete: router_1.protectedProcedure
        .input(swimlaneIdSchema)
        .mutation(async ({ ctx, input }) => {
        // First get the swimlane to check project access
        const existingSwimlane = await ctx.prisma.swimlane.findUnique({
            where: { id: input.swimlaneId },
            select: { projectId: true },
        });
        if (!existingSwimlane) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Swimlane not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, existingSwimlane.projectId, 'MANAGER');
        // Validate that swimlane can be deleted
        const validation = await (0, board_1.validateSwimlaneDelete)(input.swimlaneId);
        if (!validation.canDelete) {
            throw new server_1.TRPCError({
                code: 'PRECONDITION_FAILED',
                message: `Cannot delete swimlane "${validation.swimlaneName}": it contains ${validation.taskCount} task(s). Move or delete tasks first.`,
            });
        }
        await ctx.prisma.swimlane.delete({
            where: { id: input.swimlaneId },
        });
        return { success: true };
    }),
    /**
     * Reorder swimlanes (drag & drop)
     * Requires MANAGER or OWNER access
     */
    reorder: router_1.protectedProcedure
        .input(reorderSwimlaneSchema)
        .mutation(async ({ ctx, input }) => {
        await (0, project_1.requireProjectAccess)(ctx.user.id, input.projectId, 'MANAGER');
        // Get all swimlanes for this project
        const swimlanes = await ctx.prisma.swimlane.findMany({
            where: { projectId: input.projectId },
            select: { id: true, position: true },
            orderBy: { position: 'asc' },
        });
        // Calculate new positions
        const updates = (0, board_1.calculateNewPositions)(swimlanes, input.swimlaneId, input.newPosition);
        // Apply updates in transaction
        await (0, board_1.applySwimlanePositions)(input.projectId, updates);
        return { success: true, newPositions: updates };
    }),
    /**
     * Toggle swimlane active status
     * Soft delete alternative - hide swimlane without deleting
     * Requires MANAGER or OWNER access
     */
    toggleActive: router_1.protectedProcedure
        .input(swimlaneIdSchema)
        .mutation(async ({ ctx, input }) => {
        const existingSwimlane = await ctx.prisma.swimlane.findUnique({
            where: { id: input.swimlaneId },
            select: { projectId: true, isActive: true },
        });
        if (!existingSwimlane) {
            throw new server_1.TRPCError({
                code: 'NOT_FOUND',
                message: 'Swimlane not found',
            });
        }
        await (0, project_1.requireProjectAccess)(ctx.user.id, existingSwimlane.projectId, 'MANAGER');
        const swimlane = await ctx.prisma.swimlane.update({
            where: { id: input.swimlaneId },
            data: { isActive: !existingSwimlane.isActive },
            select: {
                id: true,
                name: true,
                isActive: true,
            },
        });
        return swimlane;
    }),
});
//# sourceMappingURL=swimlane.js.map