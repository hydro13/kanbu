/*
 * Subtask Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for subtask CRUD and time tracking.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 *
 * Modified by:
 * Session: 404dd64e-7f41-4608-bb62-2cc5ead5fd6a
 * Signed: 2025-12-28T19:55 CET
 * Change: Added logTime procedure, improved startTimer/stopTimer with timeTracking helpers
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';
import { auditService, AUDIT_ACTIONS } from '../../services/auditService';
import { updateTaskProgress, recalculateTaskTime } from '../../lib/task';
import { calculateNewPositions } from '../../lib/board';
import { addTime, formatTimeDisplay } from '../../lib/timeTracking';
import { emitSubtaskCreated, emitSubtaskUpdated, emitSubtaskDeleted } from '../../socket';

// =============================================================================
// Input Schemas
// =============================================================================

const taskIdSchema = z.object({
  taskId: z.number(),
});

const subtaskIdSchema = z.object({
  subtaskId: z.number(),
});

const createSubtaskSchema = z.object({
  taskId: z.number(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  assigneeId: z.number().optional(),
  timeEstimated: z.number().min(0).default(0),
});

const updateSubtaskSchema = z.object({
  subtaskId: z.number(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.number().nullable().optional(),
  timeEstimated: z.number().min(0).optional(),
  timeSpent: z.number().min(0).optional(),
});

const reorderSubtaskSchema = z.object({
  taskId: z.number(),
  subtaskId: z.number(),
  newPosition: z.number().min(1),
});

// =============================================================================
// Helpers
// =============================================================================

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

async function getSubtaskTaskId(
  prisma: any,
  subtaskId: number
): Promise<{ taskId: number; projectId: number }> {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    select: {
      taskId: true,
      task: {
        select: { projectId: true },
      },
    },
  });

  if (!subtask) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Subtask not found',
    });
  }

  return {
    taskId: subtask.taskId,
    projectId: subtask.task.projectId,
  };
}

// =============================================================================
// Subtask Router
// =============================================================================

export const subtaskRouter = router({
  /**
   * List subtasks for a task
   * Requires at least VIEWER access
   */
  list: protectedProcedure.input(taskIdSchema).query(async ({ ctx, input }) => {
    const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER');

    const subtasks = await ctx.prisma.subtask.findMany({
      where: { taskId: input.taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        position: true,
        timeEstimated: true,
        timeSpent: true,
        createdAt: true,
        updatedAt: true,
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    return subtasks;
  }),

  /**
   * Create a new subtask
   * Requires at least MEMBER access
   */
  create: protectedProcedure.input(createSubtaskSchema).mutation(async ({ ctx, input }) => {
    const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

    // Get next position
    const maxSubtask = await ctx.prisma.subtask.findFirst({
      where: { taskId: input.taskId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = (maxSubtask?.position ?? 0) + 1;

    const subtask = await ctx.prisma.subtask.create({
      data: {
        taskId: input.taskId,
        title: input.title,
        description: input.description,
        assigneeId: input.assigneeId,
        timeEstimated: input.timeEstimated,
        position,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        position: true,
        timeEstimated: true,
        createdAt: true,
      },
    });

    // Update task progress (now has a new TODO subtask)
    await updateTaskProgress(input.taskId);

    // Emit WebSocket event for real-time sync
    emitSubtaskCreated({
      subtaskId: subtask.id,
      taskId: input.taskId,
      projectId,
      data: { title: subtask.title },
      triggeredBy: {
        id: ctx.user.id,
        username: ctx.user.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging (Fase 15 - MCP Activity Logging)
    const project = await ctx.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    const taskInfo = await ctx.prisma.task.findUnique({
      where: { id: input.taskId },
      select: { reference: true, title: true },
    });
    await auditService.logSubtaskEvent({
      action: AUDIT_ACTIONS.SUBTASK_CREATED,
      resourceType: 'subtask',
      resourceId: subtask.id,
      resourceName: subtask.title,
      targetType: 'task',
      targetId: input.taskId,
      targetName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${input.taskId}`,
      userId: ctx.user.id,
      workspaceId: project?.workspaceId,
      changes: {
        title: subtask.title,
        assigneeId: input.assigneeId,
      },
      metadata: ctx.assistantContext
        ? {
            via: 'assistant',
            machineId: ctx.assistantContext.machineId,
            machineName: ctx.assistantContext.machineName,
            bindingId: ctx.assistantContext.bindingId,
          }
        : undefined,
    });

    return subtask;
  }),

  /**
   * Get subtask details
   * Requires at least VIEWER access
   */
  get: protectedProcedure.input(subtaskIdSchema).query(async ({ ctx, input }) => {
    const { projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER');

    const subtask = await ctx.prisma.subtask.findUnique({
      where: { id: input.subtaskId },
      select: {
        id: true,
        taskId: true,
        title: true,
        description: true,
        status: true,
        position: true,
        timeEstimated: true,
        timeSpent: true,
        createdAt: true,
        updatedAt: true,
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return subtask;
  }),

  /**
   * Update subtask (title, status, time, assignee)
   * Requires at least MEMBER access
   * Automatically updates parent task progress on status change
   */
  update: protectedProcedure.input(updateSubtaskSchema).mutation(async ({ ctx, input }) => {
    const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

    const { subtaskId, ...updateData } = input;

    const updated = await ctx.prisma.subtask.update({
      where: { id: subtaskId },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        timeEstimated: true,
        timeSpent: true,
        updatedAt: true,
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // If status changed, update task progress
    if (input.status !== undefined) {
      await updateTaskProgress(taskId);
    }

    // If timeSpent changed, recalculate task total
    if (input.timeSpent !== undefined) {
      await recalculateTaskTime(taskId);
    }

    // Emit WebSocket event for real-time sync
    emitSubtaskUpdated({
      subtaskId: input.subtaskId,
      taskId,
      projectId,
      data: { title: updated.title, status: updated.status },
      triggeredBy: {
        id: ctx.user.id,
        username: ctx.user.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging (Fase 15 - MCP Activity Logging)
    const project = await ctx.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    const taskInfo = await ctx.prisma.task.findUnique({
      where: { id: taskId },
      select: { reference: true, title: true },
    });
    await auditService.logSubtaskEvent({
      action: AUDIT_ACTIONS.SUBTASK_UPDATED,
      resourceType: 'subtask',
      resourceId: input.subtaskId,
      resourceName: updated.title,
      targetType: 'task',
      targetId: taskId,
      targetName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${taskId}`,
      userId: ctx.user.id,
      workspaceId: project?.workspaceId,
      changes: updateData,
      metadata: ctx.assistantContext
        ? {
            via: 'assistant',
            machineId: ctx.assistantContext.machineId,
            machineName: ctx.assistantContext.machineName,
            bindingId: ctx.assistantContext.bindingId,
          }
        : undefined,
    });

    return updated;
  }),

  /**
   * Delete a subtask
   * Requires at least MEMBER access
   */
  delete: protectedProcedure.input(subtaskIdSchema).mutation(async ({ ctx, input }) => {
    const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

    // Get subtask info before deleting for audit log
    const subtaskInfo = await ctx.prisma.subtask.findUnique({
      where: { id: input.subtaskId },
      select: { title: true },
    });

    await ctx.prisma.subtask.delete({
      where: { id: input.subtaskId },
    });

    // Update task progress
    await updateTaskProgress(taskId);

    // Emit WebSocket event for real-time sync
    emitSubtaskDeleted({
      subtaskId: input.subtaskId,
      taskId,
      projectId,
      triggeredBy: {
        id: ctx.user.id,
        username: ctx.user.username,
      },
      timestamp: new Date().toISOString(),
    });

    // Audit logging (Fase 15 - MCP Activity Logging)
    const project = await ctx.prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    const taskInfo = await ctx.prisma.task.findUnique({
      where: { id: taskId },
      select: { reference: true, title: true },
    });
    await auditService.logSubtaskEvent({
      action: AUDIT_ACTIONS.SUBTASK_DELETED,
      resourceType: 'subtask',
      resourceId: input.subtaskId,
      resourceName: subtaskInfo?.title ?? `Subtask #${input.subtaskId}`,
      targetType: 'task',
      targetId: taskId,
      targetName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${taskId}`,
      userId: ctx.user.id,
      workspaceId: project?.workspaceId,
      metadata: ctx.assistantContext
        ? {
            via: 'assistant',
            machineId: ctx.assistantContext.machineId,
            machineName: ctx.assistantContext.machineName,
            bindingId: ctx.assistantContext.bindingId,
          }
        : undefined,
    });

    return { success: true };
  }),

  /**
   * Reorder subtasks within a task
   * Requires at least MEMBER access
   */
  reorder: protectedProcedure.input(reorderSubtaskSchema).mutation(async ({ ctx, input }) => {
    const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

    // Get all subtasks for the task
    const subtasks = await ctx.prisma.subtask.findMany({
      where: { taskId: input.taskId },
      select: { id: true, position: true },
      orderBy: { position: 'asc' },
    });

    // Calculate new positions
    const updates = calculateNewPositions(subtasks, input.subtaskId, input.newPosition);

    // Apply updates
    await ctx.prisma.$transaction(
      updates.map((update) =>
        ctx.prisma.subtask.update({
          where: { id: update.id },
          data: { position: update.position },
        })
      )
    );

    return { success: true };
  }),

  /**
   * Start time tracking on a subtask
   * Sets status to IN_PROGRESS
   * Returns the timer start time (updatedAt) for client-side tracking
   * Requires at least MEMBER access
   */
  startTimer: protectedProcedure.input(subtaskIdSchema).mutation(async ({ ctx, input }) => {
    const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
    await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

    const updated = await ctx.prisma.subtask.update({
      where: { id: input.subtaskId },
      data: { status: 'IN_PROGRESS' },
      select: {
        id: true,
        title: true,
        status: true,
        timeSpent: true,
        timeEstimated: true,
        updatedAt: true,
      },
    });

    await updateTaskProgress(taskId);

    return {
      ...updated,
      timerStartedAt: updated.updatedAt,
      timeSpentDisplay: formatTimeDisplay(updated.timeSpent),
    };
  }),

  /**
   * Stop time tracking and mark as done
   * Sets status to DONE
   * Optionally adds elapsed time to timeSpent
   * Requires at least MEMBER access
   */
  stopTimer: protectedProcedure
    .input(
      z.object({
        subtaskId: z.number(),
        addTimeSpent: z.number().min(0).optional(), // Time to add (from client timer)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

      // Get current time spent
      const current = await ctx.prisma.subtask.findUnique({
        where: { id: input.subtaskId },
        select: { timeSpent: true },
      });

      const newTimeSpent = addTime(current?.timeSpent ?? 0, input.addTimeSpent ?? 0);

      const updated = await ctx.prisma.subtask.update({
        where: { id: input.subtaskId },
        data: {
          status: 'DONE',
          timeSpent: newTimeSpent,
        },
        select: {
          id: true,
          title: true,
          status: true,
          timeSpent: true,
          timeEstimated: true,
          updatedAt: true,
        },
      });

      await updateTaskProgress(taskId);

      // Recalculate task total timeSpent from subtasks
      await recalculateTaskTime(taskId);

      return {
        ...updated,
        timeSpentDisplay: formatTimeDisplay(updated.timeSpent),
      };
    }),

  /**
   * Log time manually on a subtask
   * Adds time to existing timeSpent (does not change status)
   * Requires at least MEMBER access
   */
  logTime: protectedProcedure
    .input(
      z.object({
        subtaskId: z.number(),
        hours: z.number().positive(), // Time to add in hours
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, projectId } = await getSubtaskTaskId(ctx.prisma, input.subtaskId);
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

      // Get current time spent
      const current = await ctx.prisma.subtask.findUnique({
        where: { id: input.subtaskId },
        select: { timeSpent: true },
      });

      const newTimeSpent = addTime(current?.timeSpent ?? 0, input.hours);

      const updated = await ctx.prisma.subtask.update({
        where: { id: input.subtaskId },
        data: { timeSpent: newTimeSpent },
        select: {
          id: true,
          timeSpent: true,
          updatedAt: true,
        },
      });

      // Recalculate task total timeSpent from subtasks
      await recalculateTaskTime(taskId);

      return {
        ...updated,
        timeSpentDisplay: formatTimeDisplay(updated.timeSpent),
      };
    }),
});
