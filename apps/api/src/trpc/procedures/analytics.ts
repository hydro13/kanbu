/*
 * Analytics Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for project analytics and reporting.
 * Provides stats, velocity, cycle time, and team workload data.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:20 CET
 *
 * Modified by:
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T09:50 CET
 * Change: Fix getTeamWorkload to show ALL project members, not just those with tasks
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
});

const dateRangeSchema = z.object({
  projectId: z.number(),
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
});

const velocitySchema = z.object({
  projectId: z.number(),
  days: z.number().min(1).max(365).optional(),
  weeks: z.number().min(1).max(52).optional(),
  granularity: z.enum(['day', 'week']).default('week'),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get start of week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of day for a given date
 */
function getDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format date as ISO string (date part only)
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

// =============================================================================
// Router
// =============================================================================

export const analyticsRouter = router({
  /**
   * Get project stats - task counts, completion rate, trends
   */
  getProjectStats: protectedProcedure.input(dateRangeSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    const dateFilter = {
      ...(input.dateFrom && { gte: new Date(input.dateFrom) }),
      ...(input.dateTo && { lte: new Date(input.dateTo) }),
    };
    const hasDateFilter = input.dateFrom || input.dateTo;

    // Get total task counts
    const [totalTasks, openTasks, closedTasks] = await Promise.all([
      ctx.prisma.task.count({
        where: {
          projectId: input.projectId,
          ...(hasDateFilter && { createdAt: dateFilter }),
        },
      }),
      ctx.prisma.task.count({
        where: {
          projectId: input.projectId,
          isActive: true,
          ...(hasDateFilter && { createdAt: dateFilter }),
        },
      }),
      ctx.prisma.task.count({
        where: {
          projectId: input.projectId,
          isActive: false,
          ...(hasDateFilter && { createdAt: dateFilter }),
        },
      }),
    ]);

    // Get tasks by priority
    const tasksByPriority = await ctx.prisma.task.groupBy({
      by: ['priority'],
      where: {
        projectId: input.projectId,
        ...(hasDateFilter && { createdAt: dateFilter }),
      },
      _count: true,
    });

    // Get tasks by column
    const tasksByColumn = await ctx.prisma.task.groupBy({
      by: ['columnId'],
      where: {
        projectId: input.projectId,
        isActive: true,
      },
      _count: true,
    });

    // Get column names
    const columns = await ctx.prisma.column.findMany({
      where: { projectId: input.projectId },
      select: { id: true, title: true, position: true },
      orderBy: { position: 'asc' },
    });

    const columnMap = new Map(columns.map((c) => [c.id, c.title]));

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? Math.round((closedTasks / totalTasks) * 100) : 0;

    // Get recent completions (last 7 days vs previous 7 days for trend)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentCompletions, previousCompletions] = await Promise.all([
      ctx.prisma.task.count({
        where: {
          projectId: input.projectId,
          isActive: false,
          dateCompleted: { gte: sevenDaysAgo },
        },
      }),
      ctx.prisma.task.count({
        where: {
          projectId: input.projectId,
          isActive: false,
          dateCompleted: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        },
      }),
    ]);

    // Trend: positive = improving, negative = declining
    const trend = recentCompletions - previousCompletions;

    // Get time tracking totals
    const timeStats = await ctx.prisma.task.aggregate({
      where: {
        projectId: input.projectId,
        ...(hasDateFilter && { createdAt: dateFilter }),
      },
      _sum: {
        timeEstimated: true,
        timeSpent: true,
      },
    });

    return {
      totalTasks,
      openTasks,
      closedTasks,
      completionRate,
      trend,
      recentCompletions,
      tasksByPriority: tasksByPriority.map((p) => ({
        priority: p.priority,
        count: p._count,
      })),
      tasksByColumn: tasksByColumn
        .map((c) => ({
          columnId: c.columnId,
          columnName: columnMap.get(c.columnId) ?? 'Unknown',
          count: c._count,
        }))
        .sort((a, b) => {
          const posA = columns.find((c) => c.id === a.columnId)?.position ?? 0;
          const posB = columns.find((c) => c.id === b.columnId)?.position ?? 0;
          return posA - posB;
        }),
      timeEstimated: timeStats._sum.timeEstimated ?? 0,
      timeSpent: timeStats._sum.timeSpent ?? 0,
    };
  }),

  /**
   * Get velocity - tasks completed per day or week
   * Supports both daily and weekly granularity via the `granularity` parameter
   */
  getVelocity: protectedProcedure.input(velocitySchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    const isDaily = input.granularity === 'day';
    const periods = isDaily ? (input.days ?? 7) : (input.weeks ?? 8);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (isDaily ? periods : periods * 7));

    // Get all completed tasks in the date range
    const completedTasks = await ctx.prisma.task.findMany({
      where: {
        projectId: input.projectId,
        isActive: false,
        dateCompleted: { gte: startDate },
      },
      select: {
        id: true,
        dateCompleted: true,
        score: true,
        timeEstimated: true,
      },
    });

    // Group by day or week
    const periodData = new Map<string, { count: number; points: number }>();

    // Initialize all periods
    for (let i = 0; i < periods; i++) {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - (isDaily ? i : i * 7));
      const periodKey = isDaily
        ? formatDateKey(getDayStart(periodStart))
        : formatDateKey(getWeekStart(periodStart));
      periodData.set(periodKey, { count: 0, points: 0 });
    }

    // Count tasks per period
    for (const task of completedTasks) {
      if (task.dateCompleted) {
        const periodKey = isDaily
          ? formatDateKey(getDayStart(task.dateCompleted))
          : formatDateKey(getWeekStart(task.dateCompleted));
        const current = periodData.get(periodKey) ?? { count: 0, points: 0 };
        const points = task.score > 0 ? task.score : task.timeEstimated;
        periodData.set(periodKey, {
          count: current.count + 1,
          points: current.points + points,
        });
      }
    }

    // Convert to array sorted by date (oldest first)
    const dataPoints = Array.from(periodData.entries())
      .map(([periodStart, data]) => ({
        periodStart,
        // Keep weekStart for backwards compatibility
        weekStart: periodStart,
        tasksCompleted: data.count,
        pointsCompleted: Math.round(data.points * 10) / 10,
      }))
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

    // Calculate rolling average (last 4 periods for weekly, last 7 for daily)
    const avgPeriods = isDaily ? 7 : 4;
    const recentPeriods = dataPoints.slice(-avgPeriods);
    const avgVelocity =
      recentPeriods.length > 0
        ? Math.round(
            (recentPeriods.reduce((sum, p) => sum + p.tasksCompleted, 0) / recentPeriods.length) *
              10
          ) / 10
        : 0;

    return {
      dataPoints,
      avgVelocity,
      totalCompleted: completedTasks.length,
      granularity: input.granularity,
    };
  }),

  /**
   * Get cycle time - average time tasks spend in each column
   * Excludes Archive columns from analysis
   */
  getCycleTime: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    // Get columns for the project (exclude Archive for cycle time analysis)
    const columns = await ctx.prisma.column.findMany({
      where: { projectId: input.projectId, isArchive: false },
      select: { id: true, title: true, position: true },
      orderBy: { position: 'asc' },
    });

    // Get activity logs for task movements
    const activities = await ctx.prisma.activity.findMany({
      where: {
        projectId: input.projectId,
        eventType: 'task.move_column',
      },
      select: {
        entityId: true,
        changes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate time spent in each column
    // This is an approximation based on move events
    const columnTimes = new Map<number, { totalHours: number; count: number }>();

    // Initialize all columns
    for (const column of columns) {
      columnTimes.set(column.id, { totalHours: 0, count: 0 });
    }

    // Group activities by task
    const taskActivities = new Map<number, Array<{ columnId: number; timestamp: Date }>>();

    for (const activity of activities) {
      const changes = activity.changes as { from_column_id?: number; column_id?: number };
      const toColumnId = changes.column_id;

      if (toColumnId) {
        const taskId = activity.entityId;
        const existing = taskActivities.get(taskId) ?? [];
        existing.push({ columnId: toColumnId, timestamp: activity.createdAt });
        taskActivities.set(taskId, existing);
      }
    }

    // Calculate time between moves
    for (const [, moves] of taskActivities) {
      for (let i = 0; i < moves.length - 1; i++) {
        const current = moves[i]!;
        const next = moves[i + 1]!;
        const hoursInColumn =
          (next.timestamp.getTime() - current.timestamp.getTime()) / (1000 * 60 * 60);

        if (hoursInColumn > 0 && hoursInColumn < 720) {
          // Cap at 30 days
          const existing = columnTimes.get(current.columnId) ?? { totalHours: 0, count: 0 };
          columnTimes.set(current.columnId, {
            totalHours: existing.totalHours + hoursInColumn,
            count: existing.count + 1,
          });
        }
      }
    }

    // Build result
    const cycleTimeByColumn = columns.map((column) => {
      const data = columnTimes.get(column.id) ?? { totalHours: 0, count: 0 };
      const avgHours = data.count > 0 ? data.totalHours / data.count : 0;

      return {
        columnId: column.id,
        columnName: column.title,
        position: column.position,
        avgHours: Math.round(avgHours * 10) / 10,
        avgDays: Math.round((avgHours / 24) * 10) / 10,
        taskCount: data.count,
      };
    });

    // Identify bottleneck (column with highest avg time)
    const bottleneck = cycleTimeByColumn.reduce(
      (max, col) => (col.avgHours > max.avgHours ? col : max),
      cycleTimeByColumn[0] ?? {
        columnId: 0,
        columnName: 'None',
        avgHours: 0,
        avgDays: 0,
        position: 0,
        taskCount: 0,
      }
    );

    // Calculate total cycle time (first to last column for completed tasks)
    const completedTasks = await ctx.prisma.task.findMany({
      where: {
        projectId: input.projectId,
        isActive: false,
        dateCompleted: { not: null },
      },
      select: {
        createdAt: true,
        dateCompleted: true,
      },
    });

    let totalCycleTime = 0;
    for (const task of completedTasks) {
      if (task.dateCompleted) {
        const hours = (task.dateCompleted.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
        totalCycleTime += hours;
      }
    }
    const avgTotalCycleTime =
      completedTasks.length > 0 ? totalCycleTime / completedTasks.length : 0;

    return {
      cycleTimeByColumn,
      bottleneck: bottleneck.avgHours > 0 ? bottleneck : null,
      avgTotalCycleHours: Math.round(avgTotalCycleTime * 10) / 10,
      avgTotalCycleDays: Math.round((avgTotalCycleTime / 24) * 10) / 10,
      completedTasksAnalyzed: completedTasks.length,
    };
  }),

  /**
   * Get team workload - tasks per assignee
   * Shows ALL project members, not just those with assigned tasks
   */
  getTeamWorkload: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER');

    // Get ALL project members from ACL entries
    const aclEntries = await ctx.prisma.aclEntry.findMany({
      where: {
        resourceType: 'project',
        resourceId: input.projectId,
        principalType: 'user',
        deny: false,
      },
      select: { principalId: true },
    });
    const memberUserIds = aclEntries.map((e) => e.principalId);

    // Get user details for all members
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: memberUserIds } },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });

    // Get task counts per user (only for users who have tasks)
    const assigneeData = await ctx.prisma.taskAssignee.groupBy({
      by: ['userId'],
      where: {
        task: {
          projectId: input.projectId,
          isActive: true,
        },
      },
      _count: true,
    });

    // Create a map of userId -> taskCount
    const taskCountMap = new Map(assigneeData.map((a) => [a.userId, a._count]));

    // Get detailed task info per PROJECT MEMBER (not just assignees)
    const workloadDetails = await Promise.all(
      users.map(async (user) => {
        const userId = user.id;
        const taskCount = taskCountMap.get(userId) ?? 0;

        // Get priority breakdown (if user has tasks)
        const byPriority =
          taskCount > 0
            ? await ctx.prisma.task.groupBy({
                by: ['priority'],
                where: {
                  projectId: input.projectId,
                  isActive: true,
                  assignees: { some: { userId } },
                },
                _count: true,
              })
            : [];

        // Get time tracking (if user has tasks)
        const timeData =
          taskCount > 0
            ? await ctx.prisma.task.aggregate({
                where: {
                  projectId: input.projectId,
                  isActive: true,
                  assignees: { some: { userId } },
                },
                _sum: {
                  timeEstimated: true,
                  timeSpent: true,
                },
              })
            : { _sum: { timeEstimated: null, timeSpent: null } };

        // Get overdue count (if user has tasks)
        const overdueCount =
          taskCount > 0
            ? await ctx.prisma.task.count({
                where: {
                  projectId: input.projectId,
                  isActive: true,
                  assignees: { some: { userId } },
                  dateDue: { lt: new Date() },
                },
              })
            : 0;

        return {
          userId,
          username: user.username ?? 'Unknown',
          name: user.name ?? 'Unknown',
          avatarUrl: user.avatarUrl ?? null,
          totalTasks: taskCount,
          overdueCount,
          byPriority: byPriority.map((p) => ({
            priority: p.priority,
            count: p._count,
          })),
          timeEstimated: timeData._sum.timeEstimated ?? 0,
          timeSpent: timeData._sum.timeSpent ?? 0,
        };
      })
    );

    // Sort by total tasks (highest first)
    workloadDetails.sort((a, b) => b.totalTasks - a.totalTasks);

    // Get unassigned tasks count
    const unassignedCount = await ctx.prisma.task.count({
      where: {
        projectId: input.projectId,
        isActive: true,
        assignees: { none: {} },
      },
    });

    // Calculate capacity indicators
    const avgTasksPerPerson =
      workloadDetails.length > 0
        ? Math.round(
            (workloadDetails.reduce((sum, w) => sum + w.totalTasks, 0) / workloadDetails.length) *
              10
          ) / 10
        : 0;

    return {
      teamMembers: workloadDetails,
      unassignedTasks: unassignedCount,
      avgTasksPerPerson,
      totalTeamMembers: workloadDetails.length,
    };
  }),
});
