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

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
});

const categoryIdSchema = z.object({
  categoryId: z.number(),
});

const createCategorySchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).default('blue'),
});

const updateCategorySchema = z.object({
  categoryId: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  color: z.string().max(20).optional(),
});

const setTaskCategorySchema = z.object({
  taskId: z.number(),
  categoryId: z.number().nullable(),
});

// =============================================================================
// Helpers
// =============================================================================

async function getCategoryProjectId(prisma: any, categoryId: number): Promise<number> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { projectId: true },
  });

  if (!category) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Category not found',
    });
  }

  return category.projectId;
}

async function getTaskProjectId(prisma: any, taskId: number): Promise<number> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found',
    });
  }

  return task.projectId;
}

// =============================================================================
// Category Router
// =============================================================================

export const categoryRouter = router({
  /**
   * List all categories for a project
   * Requires at least VIEWER access
   */
  list: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

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
  get: protectedProcedure.input(categoryIdSchema).query(async ({ ctx, input }) => {
    const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER');

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
      throw new TRPCError({
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
  create: protectedProcedure.input(createCategorySchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER');

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
      throw new TRPCError({
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
  update: protectedProcedure.input(updateCategorySchema).mutation(async ({ ctx, input }) => {
    const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

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
        throw new TRPCError({
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
  delete: protectedProcedure.input(categoryIdSchema).mutation(async ({ ctx, input }) => {
    const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MANAGER');

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
  setForTask: protectedProcedure.input(setTaskCategorySchema).mutation(async ({ ctx, input }) => {
    const taskProjectId = await getTaskProjectId(ctx.prisma, input.taskId);
    await permissionService.requireProjectAccess(ctx.user.id, taskProjectId, 'MEMBER');

    // If setting a category, verify it exists and belongs to same project
    if (input.categoryId !== null) {
      const categoryProjectId = await getCategoryProjectId(ctx.prisma, input.categoryId);

      if (taskProjectId !== categoryProjectId) {
        throw new TRPCError({
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
  getTasks: protectedProcedure.input(categoryIdSchema).query(async ({ ctx, input }) => {
    const projectId = await getCategoryProjectId(ctx.prisma, input.categoryId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER');

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
