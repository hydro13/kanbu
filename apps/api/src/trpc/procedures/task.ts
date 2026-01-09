/*
 * Task Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for task CRUD and management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T16:45 CET
 * Change: Position validation changed from .min(1) to .positive() for fractional positioning
 *
 * Modified by:
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Signed: 2025-12-28T21:40 CET
 * Change: Extended listTasksSchema with tagIds, date range filters (EXT-02)
 *
 * Modified by:
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Signed: 2025-12-28T21:55 CET
 * Change: Added setDueDate, setReminder, getPendingReminders procedures (EXT-04)
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import { auditService, AUDIT_ACTIONS } from '../../services/auditService'
import { generateTaskReference } from '../../lib/project'
import {
  getTaskWithRelations,
  validateTaskMove,
  getNextTaskPosition,
  applyTaskPositions,
} from '../../lib/task'
import { calculateNewPositions } from '../../lib/board'
import {
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskMoved,
  emitTaskDeleted,
} from '../../socket'

// =============================================================================
// Input Schemas
// =============================================================================

const taskIdSchema = z.object({
  taskId: z.number(),
})

const listTasksSchema = z.object({
  projectId: z.number(),
  columnId: z.number().optional(),
  swimlaneId: z.number().optional(),
  isActive: z.boolean().optional(), // undefined = show all, true = active only, false = closed only
  search: z.string().max(100).optional(),
  priority: z.number().min(0).max(3).optional(),
  assigneeId: z.number().optional(),
  categoryId: z.number().optional(),
  sprintId: z.number().optional(),
  milestoneId: z.number().optional(),
  moduleId: z.number().optional(),
  // Tag filtering (any of these tags)
  tagIds: z.array(z.number()).optional(),
  // Due date range filter
  dueDateFrom: z.string().optional(), // ISO date string
  dueDateTo: z.string().optional(), // ISO date string
  // Created date range filter
  createdFrom: z.string().optional(), // ISO date string
  createdTo: z.string().optional(), // ISO date string
  // Updated date range filter
  updatedFrom: z.string().optional(), // ISO date string
  updatedTo: z.string().optional(), // ISO date string
  limit: z.number().min(1).max(500).default(100),
  offset: z.number().min(0).default(0),
})

const createTaskSchema = z.object({
  projectId: z.number(),
  columnId: z.number(),
  swimlaneId: z.number().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(50000).optional(),
  priority: z.number().min(0).max(3).default(0),
  score: z.number().min(0).default(0),
  color: z.string().max(20).optional(),
  dateDue: z.string().optional(), // ISO date string
  timeEstimated: z.number().min(0).default(0),
  categoryId: z.number().optional(),
  sprintId: z.number().optional(),
  milestoneId: z.number().optional(),
  moduleId: z.number().optional(),
  assigneeIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
})

const updateTaskSchema = z.object({
  taskId: z.number(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).optional(),
  priority: z.number().min(0).max(3).optional(),
  score: z.number().min(0).optional(),
  color: z.string().max(20).nullable().optional(),
  dateDue: z.string().nullable().optional(),
  dateStarted: z.string().nullable().optional(),
  reminderAt: z.string().nullable().optional(),
  timeEstimated: z.number().min(0).optional(),
  categoryId: z.number().nullable().optional(),
  sprintId: z.number().nullable().optional(),
  milestoneId: z.number().nullable().optional(),
  moduleId: z.number().nullable().optional(),
  // Optimistic concurrency control - if provided, check that task hasn't been modified
  expectedUpdatedAt: z.string().optional(), // ISO timestamp from when client fetched the task
})

const moveTaskSchema = z.object({
  taskId: z.number(),
  columnId: z.number(),
  swimlaneId: z.number().nullable().optional(),
  position: z.number().positive().optional(), // Allow fractional positions for ordering
})

const reorderTasksSchema = z.object({
  projectId: z.number(),
  columnId: z.number(),
  swimlaneId: z.number().optional(),
  taskId: z.number(),
  newPosition: z.number().positive(), // Allow fractional positions for ordering
})

const manageAssigneesSchema = z.object({
  taskId: z.number(),
  assigneeIds: z.array(z.number()),
})

const manageTagsSchema = z.object({
  taskId: z.number(),
  tagIds: z.array(z.number()),
})

const setDueDateSchema = z.object({
  taskId: z.number(),
  dateDue: z.string().nullable(), // ISO date string or null to clear
  includeTime: z.boolean().default(false), // Whether time is significant
})

const setReminderSchema = z.object({
  taskId: z.number(),
  reminderAt: z.string().nullable(), // ISO date string or null to clear
  // Alternative: preset offsets from due date
  preset: z.enum(['none', '15min', '1hour', '1day', '1week', 'custom']).optional(),
})

// =============================================================================
// Task Router
// =============================================================================

export const taskRouter = router({
  /**
   * List tasks for a project with filters
   * Requires at least VIEWER access
   */
  list: protectedProcedure
    .input(listTasksSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const tasks = await ctx.prisma.task.findMany({
        where: {
          projectId: input.projectId,
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.columnId && { columnId: input.columnId }),
          ...(input.swimlaneId && { swimlaneId: input.swimlaneId }),
          ...(input.priority !== undefined && { priority: input.priority }),
          ...(input.categoryId && { categoryId: input.categoryId }),
          ...(input.sprintId && { sprintId: input.sprintId }),
          ...(input.milestoneId && { milestoneId: input.milestoneId }),
          ...(input.moduleId && { moduleId: input.moduleId }),
          ...(input.assigneeId && {
            assignees: { some: { userId: input.assigneeId } },
          }),
          // Tag filter: tasks that have ANY of the specified tags
          ...(input.tagIds && input.tagIds.length > 0 && {
            tags: { some: { tagId: { in: input.tagIds } } },
          }),
          // Due date range filter
          ...((input.dueDateFrom || input.dueDateTo) && {
            dateDue: {
              ...(input.dueDateFrom && { gte: new Date(input.dueDateFrom) }),
              ...(input.dueDateTo && { lte: new Date(input.dueDateTo) }),
            },
          }),
          // Created date range filter
          ...((input.createdFrom || input.createdTo) && {
            createdAt: {
              ...(input.createdFrom && { gte: new Date(input.createdFrom) }),
              ...(input.createdTo && { lte: new Date(input.createdTo) }),
            },
          }),
          // Updated date range filter
          ...((input.updatedFrom || input.updatedTo) && {
            updatedAt: {
              ...(input.updatedFrom && { gte: new Date(input.updatedFrom) }),
              ...(input.updatedTo && { lte: new Date(input.updatedTo) }),
            },
          }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { reference: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          title: true,
          description: true,
          reference: true,
          priority: true,
          score: true,
          progress: true,
          position: true,
          color: true,
          columnId: true,
          swimlaneId: true,
          dateDue: true,
          dateStarted: true,
          dateCompleted: true,
          timeEstimated: true,
          timeSpent: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          column: {
            select: { id: true, title: true },
          },
          swimlane: {
            select: { id: true, name: true },
          },
          assignees: {
            select: {
              user: {
                select: { id: true, username: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          tags: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          _count: {
            select: {
              subtasks: true,
              comments: true,
            },
          },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: input.limit,
        skip: input.offset,
      })

      return tasks.map((t) => ({
        ...t,
        assignees: t.assignees.map((a) => a.user),
        tags: t.tags.map((tt) => tt.tag),
        subtaskCount: t._count.subtasks,
        commentCount: t._count.comments,
      }))
    }),

  /**
   * Get task details with all relations
   * Requires at least VIEWER access
   */
  get: protectedProcedure
    .input(taskIdSchema)
    .query(async ({ ctx, input }) => {
      // Get task first to check project access
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'VIEWER')

      return getTaskWithRelations(input.taskId)
    }),

  /**
   * Create a new task
   * Requires at least MEMBER access
   * Auto-generates reference (PLAN-123)
   */
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER')

      // Generate task reference
      const reference = await generateTaskReference(input.projectId)

      // Get next position in column
      const position = await getNextTaskPosition(input.columnId, input.swimlaneId)

      // Create the task
      const task = await ctx.prisma.task.create({
        data: {
          projectId: input.projectId,
          columnId: input.columnId,
          swimlaneId: input.swimlaneId,
          creatorId: ctx.user.id,
          title: input.title,
          description: input.description,
          reference,
          priority: input.priority,
          score: input.score,
          color: input.color,
          dateDue: input.dateDue ? new Date(input.dateDue) : undefined,
          timeEstimated: input.timeEstimated,
          position,
          categoryId: input.categoryId,
          sprintId: input.sprintId,
          milestoneId: input.milestoneId,
          moduleId: input.moduleId,
          ...(input.assigneeIds && input.assigneeIds.length > 0 && {
            assignees: {
              createMany: {
                data: input.assigneeIds.map((userId) => ({ userId })),
              },
            },
          }),
          ...(input.tagIds && input.tagIds.length > 0 && {
            tags: {
              createMany: {
                data: input.tagIds.map((tagId) => ({ tagId })),
              },
            },
          }),
        },
        select: {
          id: true,
          title: true,
          reference: true,
          columnId: true,
          swimlaneId: true,
          position: true,
          createdAt: true,
        },
      })

      // Update project last activity
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { lastActivityAt: new Date() },
      })

      // Emit WebSocket event for real-time sync
      emitTaskCreated({
        taskId: task.id,
        projectId: input.projectId,
        data: {
          title: task.title,
          reference: task.reference,
          columnId: task.columnId,
          position: task.position,
        },
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      // Audit logging (Fase 14 - MCP Activity Logging)
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { workspaceId: true },
      })
      await auditService.logTaskEvent({
        action: AUDIT_ACTIONS.TASK_CREATED,
        resourceType: 'task',
        resourceId: task.id,
        resourceName: `${task.reference}: ${task.title}`,
        userId: ctx.user.id,
        workspaceId: project?.workspaceId,
        changes: {
          title: task.title,
          columnId: task.columnId,
          assigneeIds: input.assigneeIds,
        },
        metadata: ctx.assistantContext ? {
          via: 'assistant',
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        } : undefined,
      })

      return task
    }),

  /**
   * Update task properties
   * Requires at least MEMBER access
   */
  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true, updatedAt: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      // Optimistic concurrency control: check if task was modified since client fetched it
      if (input.expectedUpdatedAt) {
        const expectedTime = new Date(input.expectedUpdatedAt).getTime()
        const actualTime = task.updatedAt.getTime()

        // Allow 1 second tolerance for timing differences
        if (Math.abs(actualTime - expectedTime) > 1000) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Task was modified by another user. Please refresh and try again.',
          })
        }
      }

      const { taskId, dateDue, dateStarted, reminderAt, expectedUpdatedAt: _ignored, ...updateData } = input

      const updated = await ctx.prisma.task.update({
        where: { id: taskId },
        data: {
          ...updateData,
          ...(dateDue !== undefined && {
            dateDue: dateDue ? new Date(dateDue) : null,
          }),
          ...(dateStarted !== undefined && {
            dateStarted: dateStarted ? new Date(dateStarted) : null,
          }),
          ...(reminderAt !== undefined && {
            reminderAt: reminderAt ? new Date(reminderAt) : null,
          }),
        },
        select: {
          id: true,
          title: true,
          reference: true,
          priority: true,
          score: true,
          color: true,
          dateDue: true,
          dateStarted: true,
          reminderAt: true,
          timeEstimated: true,
          updatedAt: true,
        },
      })

      // Emit WebSocket event for real-time sync
      emitTaskUpdated({
        taskId: input.taskId,
        projectId: task.projectId,
        data: {
          title: updated.title,
          priority: updated.priority,
          score: updated.score,
          color: updated.color,
          dateDue: updated.dateDue?.toISOString() ?? null,
        },
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      // Audit logging (Fase 14 - MCP Activity Logging)
      const project = await ctx.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { workspaceId: true },
      })
      await auditService.logTaskEvent({
        action: AUDIT_ACTIONS.TASK_UPDATED,
        resourceType: 'task',
        resourceId: input.taskId,
        resourceName: `${updated.reference}: ${updated.title}`,
        userId: ctx.user.id,
        workspaceId: project?.workspaceId,
        changes: updateData,
        metadata: ctx.assistantContext ? {
          via: 'assistant',
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        } : undefined,
      })

      return updated
    }),

  /**
   * Move task to different column/swimlane
   * Respects WIP limits
   * Requires at least MEMBER access
   */
  move: protectedProcedure
    .input(moveTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true, columnId: true, swimlaneId: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      // Validate move (WIP limits, etc.)
      const validation = await validateTaskMove(input.taskId, input.columnId)
      if (!validation.canMove) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.reason || 'Cannot move task',
        })
      }

      // Determine new position
      const newPosition =
        input.position ?? (await getNextTaskPosition(input.columnId, input.swimlaneId ?? null))

      const updated = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          columnId: input.columnId,
          swimlaneId: input.swimlaneId ?? null,
          position: newPosition,
        },
        select: {
          id: true,
          columnId: true,
          swimlaneId: true,
          position: true,
          updatedAt: true,
        },
      })

      // Emit WebSocket event for real-time sync
      emitTaskMoved({
        taskId: input.taskId,
        projectId: task.projectId,
        fromColumnId: task.columnId,
        toColumnId: input.columnId,
        fromPosition: 0, // Original position not tracked, using 0
        toPosition: newPosition,
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      // Audit logging (Fase 14 - MCP Activity Logging)
      const project = await ctx.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { workspaceId: true },
      })
      const taskInfo = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { reference: true, title: true },
      })
      await auditService.logTaskEvent({
        action: AUDIT_ACTIONS.TASK_MOVED,
        resourceType: 'task',
        resourceId: input.taskId,
        resourceName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${input.taskId}`,
        userId: ctx.user.id,
        workspaceId: project?.workspaceId,
        changes: {
          fromColumnId: task.columnId,
          toColumnId: input.columnId,
          fromSwimlaneId: task.swimlaneId,
          toSwimlaneId: input.swimlaneId ?? null,
        },
        metadata: ctx.assistantContext ? {
          via: 'assistant',
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        } : undefined,
      })

      return updated
    }),

  /**
   * Reorder tasks within a column
   * Requires at least MEMBER access
   */
  reorder: protectedProcedure
    .input(reorderTasksSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER')

      // Get all tasks in the column (optionally filtered by swimlane)
      const tasks = await ctx.prisma.task.findMany({
        where: {
          projectId: input.projectId,
          columnId: input.columnId,
          isActive: true,
          ...(input.swimlaneId && { swimlaneId: input.swimlaneId }),
        },
        select: { id: true, position: true },
        orderBy: { position: 'asc' },
      })

      // Calculate new positions
      const updates = calculateNewPositions(tasks, input.taskId, input.newPosition)

      // Apply updates
      await applyTaskPositions(updates)

      // Emit WebSocket event for real-time sync
      emitTaskMoved({
        taskId: input.taskId,
        projectId: input.projectId,
        fromColumnId: input.columnId,
        toColumnId: input.columnId, // Same column for reorder
        fromPosition: 0,
        toPosition: input.newPosition,
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      return { success: true }
    }),

  /**
   * Close a task
   * Requires at least MEMBER access
   */
  close: protectedProcedure
    .input(taskIdSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true, isActive: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      if (!task.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Task is already closed',
        })
      }

      const updated = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          isActive: false,
          dateCompleted: new Date(),
        },
        select: {
          id: true,
          isActive: true,
          dateCompleted: true,
          updatedAt: true,
        },
      })

      return updated
    }),

  /**
   * Reopen a closed task
   * Requires at least MEMBER access
   */
  reopen: protectedProcedure
    .input(taskIdSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true, isActive: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      if (task.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Task is already open',
        })
      }

      const updated = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          isActive: true,
          dateCompleted: null,
        },
        select: {
          id: true,
          isActive: true,
          dateCompleted: true,
          updatedAt: true,
        },
      })

      return updated
    }),

  /**
   * Soft delete a task
   * Requires at least MANAGER access
   */
  delete: protectedProcedure
    .input(taskIdSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MANAGER')

      // Soft delete by closing and marking with special flag
      // For hard delete, we would use prisma.task.delete()
      await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          isActive: false,
          dateCompleted: new Date(),
          // Could add a deletedAt field for proper soft delete tracking
        },
      })

      // Emit WebSocket event for real-time sync
      emitTaskDeleted({
        taskId: input.taskId,
        projectId: task.projectId,
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      // Audit logging (Fase 14 - MCP Activity Logging)
      const project = await ctx.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { workspaceId: true },
      })
      const taskInfo = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { reference: true, title: true },
      })
      await auditService.logTaskEvent({
        action: AUDIT_ACTIONS.TASK_DELETED,
        resourceType: 'task',
        resourceId: input.taskId,
        resourceName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${input.taskId}`,
        userId: ctx.user.id,
        workspaceId: project?.workspaceId,
        metadata: ctx.assistantContext ? {
          via: 'assistant',
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        } : undefined,
      })

      return { success: true }
    }),

  /**
   * Set assignees for a task (replaces existing)
   * Requires at least MEMBER access
   */
  setAssignees: protectedProcedure
    .input(manageAssigneesSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      // Delete existing and create new
      await ctx.prisma.$transaction([
        ctx.prisma.taskAssignee.deleteMany({
          where: { taskId: input.taskId },
        }),
        ctx.prisma.taskAssignee.createMany({
          data: input.assigneeIds.map((userId) => ({
            taskId: input.taskId,
            userId,
          })),
        }),
      ])

      // Fetch updated assignees for real-time sync
      const updatedAssignees = await ctx.prisma.taskAssignee.findMany({
        where: { taskId: input.taskId },
        select: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      })

      // Emit task updated event for real-time sync
      emitTaskUpdated({
        taskId: input.taskId,
        projectId: task.projectId,
        data: {
          assignees: updatedAssignees.map((a) => a.user),
        },
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      // Audit logging (Fase 14 - MCP Activity Logging)
      const project = await ctx.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { workspaceId: true },
      })
      const taskInfo = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { reference: true, title: true },
      })
      await auditService.logTaskEvent({
        action: AUDIT_ACTIONS.TASK_ASSIGNED,
        resourceType: 'task',
        resourceId: input.taskId,
        resourceName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${input.taskId}`,
        userId: ctx.user.id,
        workspaceId: project?.workspaceId,
        changes: {
          assigneeIds: input.assigneeIds,
        },
        metadata: ctx.assistantContext ? {
          via: 'assistant',
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        } : undefined,
      })

      return { success: true }
    }),

  /**
   * Set tags for a task (replaces existing)
   * Requires at least MEMBER access
   */
  setTags: protectedProcedure
    .input(manageTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      // Delete existing and create new
      await ctx.prisma.$transaction([
        ctx.prisma.taskTag.deleteMany({
          where: { taskId: input.taskId },
        }),
        ctx.prisma.taskTag.createMany({
          data: input.tagIds.map((tagId) => ({
            taskId: input.taskId,
            tagId,
          })),
        }),
      ])

      return { success: true }
    }),

  /**
   * Set due date for a task
   * Dedicated procedure for date picker UI
   * Requires at least MEMBER access
   */
  setDueDate: protectedProcedure
    .input(setDueDateSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      const updated = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: {
          dateDue: input.dateDue ? new Date(input.dateDue) : null,
        },
        select: {
          id: true,
          dateDue: true,
          reminderAt: true,
          updatedAt: true,
        },
      })

      return updated
    }),

  /**
   * Set reminder for a task
   * Can use preset offsets from due date or custom datetime
   * Requires at least MEMBER access
   */
  setReminder: protectedProcedure
    .input(setReminderSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { projectId: true, dateDue: true },
      })

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

      let reminderAt: Date | null = null

      if (input.reminderAt) {
        // Custom datetime provided
        reminderAt = new Date(input.reminderAt)
      } else if (input.preset && input.preset !== 'none' && input.preset !== 'custom') {
        // Calculate from due date using preset
        if (!task.dateDue) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot set preset reminder without due date',
          })
        }

        const dueDate = new Date(task.dateDue)
        switch (input.preset) {
          case '15min':
            reminderAt = new Date(dueDate.getTime() - 15 * 60 * 1000)
            break
          case '1hour':
            reminderAt = new Date(dueDate.getTime() - 60 * 60 * 1000)
            break
          case '1day':
            reminderAt = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)
            break
          case '1week':
            reminderAt = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
        }
      }

      const updated = await ctx.prisma.task.update({
        where: { id: input.taskId },
        data: { reminderAt },
        select: {
          id: true,
          dateDue: true,
          reminderAt: true,
          updatedAt: true,
        },
      })

      return updated
    }),

  /**
   * Get tasks with pending reminders
   * For notification processing
   * Requires at least VIEWER access
   */
  getPendingReminders: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const now = new Date()
      const tasks = await ctx.prisma.task.findMany({
        where: {
          projectId: input.projectId,
          isActive: true,
          reminderAt: {
            not: null,
            lte: now,
          },
        },
        select: {
          id: true,
          title: true,
          reference: true,
          dateDue: true,
          reminderAt: true,
          assignees: {
            select: {
              user: {
                select: { id: true, username: true, email: true },
              },
            },
          },
        },
        orderBy: { reminderAt: 'asc' },
      })

      return tasks.map((t) => ({
        ...t,
        assignees: t.assignees.map((a) => a.user),
      }))
    }),

  /**
   * Get tasks assigned to the current user
   * Returns tasks across all accessible projects
   */
  getAssignedToMe: protectedProcedure
    .input(
      z.object({
        status: z.enum(['open', 'closed', 'all']).optional().default('open'),
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build where clause based on status
      const statusFilter =
        input.status === 'open'
          ? { dateCompleted: null }
          : input.status === 'closed'
            ? { dateCompleted: { not: null } }
            : {}

      const tasks = await ctx.prisma.task.findMany({
        where: {
          isActive: true,
          assignees: {
            some: {
              userId: ctx.user.id,
            },
          },
          ...statusFilter,
        },
        include: {
          column: true,
          project: true,
          creator: true,
          assignees: {
            include: {
              user: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: [{ dateDue: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        take: input.limit,
      })

      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        ref: t.reference,
        description: t.description,
        priority: t.priority,
        dateStarted: t.dateStarted,
        dueDate: t.dateDue,
        dateCompleted: t.dateCompleted,
        progress: t.progress,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        column: t.column ? { id: t.column.id, name: t.column.title } : null,
        project: t.project ? { id: t.project.id, name: t.project.name, identifier: t.project.identifier } : null,
        creator: t.creator ? { id: t.creator.id, name: t.creator.name } : null,
        assignees: t.assignees.map((a) => ({ id: a.user.id, name: a.user.name, username: a.user.username })),
        tags: t.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name, color: tt.tag.color })),
      }))
    }),
})
