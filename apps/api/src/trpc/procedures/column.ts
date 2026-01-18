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

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';
import {
  validateColumnDelete,
  checkWIPLimit,
  calculateNewPositions,
  applyColumnPositions,
  getNextColumnPosition,
} from '../../lib/board';
import { emitColumnCreated, emitColumnUpdated, emitColumnDeleted } from '../../socket';

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
});

const columnIdSchema = z.object({
  columnId: z.number(),
});

const createColumnSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  taskLimit: z.number().min(0).default(0),
  position: z.number().optional(),
});

const updateColumnSchema = z.object({
  columnId: z.number(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  taskLimit: z.number().min(0).optional(),
  isCollapsed: z.boolean().optional(),
  showClosed: z.boolean().optional(),
});

const reorderColumnSchema = z.object({
  projectId: z.number(),
  columnId: z.number(),
  newPosition: z.number().min(1),
});

// =============================================================================
// Column Router
// =============================================================================

export const columnRouter = router({
  /**
   * List all columns for a project
   * Requires VIEWER access
   */
  list: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

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
        isArchive: true,
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
      isArchive: col.isArchive,
      createdAt: col.createdAt,
      taskCount: col._count.tasks,
      isOverLimit: col.taskLimit > 0 && col._count.tasks >= col.taskLimit,
    }));
  }),

  /**
   * Create a new column
   * Requires MANAGER or OWNER access
   */
  create: protectedProcedure.input(createColumnSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER');

    // Get position (use provided or next available)
    const position = input.position ?? (await getNextColumnPosition(input.projectId));

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

    // Emit WebSocket event for real-time sync
    emitColumnCreated({
      columnId: column.id,
      projectId: input.projectId,
      data: {
        title: column.title,
        position: column.position,
      },
      triggeredBy: {
        id: ctx.user.id,
        username: ctx.user.username,
      },
      timestamp: new Date().toISOString(),
    });

    return column;
  }),

  /**
   * Get column details with WIP info
   * Requires VIEWER access
   */
  get: protectedProcedure.input(columnIdSchema).query(async ({ ctx, input }) => {
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
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Column not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, column.projectId, 'VIEWER');

    const wipInfo = await checkWIPLimit(input.columnId);

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
  update: protectedProcedure.input(updateColumnSchema).mutation(async ({ ctx, input }) => {
    // First get the column to check project access
    const existingColumn = await ctx.prisma.column.findUnique({
      where: { id: input.columnId },
      select: { projectId: true },
    });

    if (!existingColumn) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Column not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, existingColumn.projectId, 'MANAGER');

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

    // Emit WebSocket event for real-time sync
    emitColumnUpdated({
      columnId: column.id,
      projectId: existingColumn.projectId,
      data: {
        title: column.title,
        taskLimit: column.taskLimit,
        isCollapsed: column.isCollapsed,
      },
      triggeredBy: {
        id: ctx.user.id,
        username: ctx.user.username,
      },
      timestamp: new Date().toISOString(),
    });

    return column;
  }),

  /**
   * Delete a column
   * Requires MANAGER or OWNER access
   * Column must be empty (no tasks)
   */
  delete: protectedProcedure.input(columnIdSchema).mutation(async ({ ctx, input }) => {
    // First get the column to check project access
    const existingColumn = await ctx.prisma.column.findUnique({
      where: { id: input.columnId },
      select: { projectId: true },
    });

    if (!existingColumn) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Column not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, existingColumn.projectId, 'MANAGER');

    // Validate that column can be deleted
    const validation = await validateColumnDelete(input.columnId);

    if (!validation.canDelete) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Cannot delete column "${validation.columnTitle}": it contains ${validation.taskCount} task(s). Move or delete tasks first.`,
      });
    }

    await ctx.prisma.column.delete({
      where: { id: input.columnId },
    });

    // Emit WebSocket event for real-time sync
    emitColumnDeleted({
      columnId: input.columnId,
      projectId: existingColumn.projectId,
      triggeredBy: {
        id: ctx.user.id,
        username: ctx.user.username,
      },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }),

  /**
   * Reorder columns (drag & drop)
   * Requires MANAGER or OWNER access
   */
  reorder: protectedProcedure.input(reorderColumnSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MANAGER');

    // Get all columns for this project
    const columns = await ctx.prisma.column.findMany({
      where: { projectId: input.projectId },
      select: { id: true, position: true },
      orderBy: { position: 'asc' },
    });

    // Calculate new positions
    const updates = calculateNewPositions(columns, input.columnId, input.newPosition);

    // Apply updates in transaction
    await applyColumnPositions(input.projectId, updates);

    return { success: true, newPositions: updates };
  }),

  /**
   * Check WIP limit status for a column
   * Requires VIEWER access
   */
  checkWIP: protectedProcedure.input(columnIdSchema).query(async ({ ctx, input }) => {
    const column = await ctx.prisma.column.findUnique({
      where: { id: input.columnId },
      select: { projectId: true },
    });

    if (!column) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Column not found',
      });
    }

    await permissionService.requireProjectAccess(ctx.user.id, column.projectId, 'VIEWER');

    return await checkWIPLimit(input.columnId);
  }),
});
