/*
 * Activity Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for activity log queries.
 * Provides audit trail for tasks and projects.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: abe602e0-56a9-4461-9c9f-84bdc854d640
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';

// =============================================================================
// Input Schemas
// =============================================================================

const listActivitiesSchema = z.object({
  projectId: z.number(),
  entityType: z.enum(['task', 'subtask', 'comment', 'column', 'swimlane', 'project']).optional(),
  entityId: z.number().optional(),
  eventType: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const taskActivitiesSchema = z.object({
  taskId: z.number(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const recentActivitiesSchema = z.object({
  projectId: z.number(),
  limit: z.number().min(1).max(50).default(20),
});

// =============================================================================
// Activity Router
// =============================================================================

export const activityRouter = router({
  /**
   * List activities for a project
   * Can filter by entity type, entity ID, or event type
   * Requires at least VIEWER access
   */
  list: protectedProcedure.input(listActivitiesSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    const where: Record<string, unknown> = {
      projectId: input.projectId,
    };

    if (input.entityType) {
      where.entityType = input.entityType;
    }

    if (input.entityId) {
      where.entityId = input.entityId;
    }

    if (input.eventType) {
      where.eventType = input.eventType;
    }

    const activities = await ctx.prisma.activity.findMany({
      where,
      select: {
        id: true,
        eventType: true,
        entityType: true,
        entityId: true,
        changes: true,
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
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      skip: input.offset,
    });

    const total = await ctx.prisma.activity.count({ where });

    return {
      activities,
      total,
      hasMore: input.offset + activities.length < total,
    };
  }),

  /**
   * Get activities for a specific task
   * Includes task-related activities and subtask/comment activities
   * Requires at least VIEWER access to the project
   */
  forTask: protectedProcedure.input(taskActivitiesSchema).query(async ({ ctx, input }) => {
    // Get task to check project access
    const task = await ctx.prisma.task.findUnique({
      where: { id: input.taskId },
      select: { projectId: true },
    });

    if (!task) {
      return { activities: [], total: 0, hasMore: false };
    }

    await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'VIEWER');

    // Get all activities related to this task
    // Including task activities and subtask/comment activities that reference this task
    const activities = await ctx.prisma.activity.findMany({
      where: {
        projectId: task.projectId,
        OR: [
          // Direct task activities
          { entityType: 'task', entityId: input.taskId },
          // Subtask activities (check metadata.taskId)
          {
            entityType: 'subtask',
            changes: {
              path: ['metadata', 'taskId'],
              equals: input.taskId,
            },
          },
          // Comment activities (check metadata.taskId)
          {
            entityType: 'comment',
            changes: {
              path: ['metadata', 'taskId'],
              equals: input.taskId,
            },
          },
        ],
      },
      select: {
        id: true,
        eventType: true,
        entityType: true,
        entityId: true,
        changes: true,
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
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      skip: input.offset,
    });

    const total = await ctx.prisma.activity.count({
      where: {
        projectId: task.projectId,
        OR: [
          { entityType: 'task', entityId: input.taskId },
          {
            entityType: 'subtask',
            changes: {
              path: ['metadata', 'taskId'],
              equals: input.taskId,
            },
          },
          {
            entityType: 'comment',
            changes: {
              path: ['metadata', 'taskId'],
              equals: input.taskId,
            },
          },
        ],
      },
    });

    return {
      activities,
      total,
      hasMore: input.offset + activities.length < total,
    };
  }),

  /**
   * Get recent project activity
   * Returns the most recent activities across the project
   * Requires at least VIEWER access
   */
  getRecent: protectedProcedure.input(recentActivitiesSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    const activities = await ctx.prisma.activity.findMany({
      where: { projectId: input.projectId },
      select: {
        id: true,
        eventType: true,
        entityType: true,
        entityId: true,
        changes: true,
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
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    });

    return { activities };
  }),

  /**
   * Get activity statistics for a project
   * Returns counts by event type for the last 30 days
   * Requires at least VIEWER access
   */
  getStats: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activities = await ctx.prisma.activity.groupBy({
        by: ['eventType'],
        where: {
          projectId: input.projectId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
      });

      const totalCount = await ctx.prisma.activity.count({
        where: {
          projectId: input.projectId,
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      return {
        byEventType: activities.map((a) => ({
          eventType: a.eventType,
          count: a._count.id,
        })),
        total: totalCount,
        periodDays: 30,
      };
    }),
});
