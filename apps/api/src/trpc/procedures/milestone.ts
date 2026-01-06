/*
 * Milestone Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for milestone management and progress tracking.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 114f11bf-23b9-4a07-bc94-a4e80ec0c02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const milestoneIdSchema = z.object({
  milestoneId: z.number(),
})

const listMilestonesSchema = z.object({
  projectId: z.number(),
  includeCompleted: z.boolean().default(false),
})

const getMilestoneSchema = z.object({
  milestoneId: z.number(),
  includeTasks: z.boolean().default(false),
})

const createMilestoneSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  dateDue: z.string().optional(), // ISO date string
})

const updateMilestoneSchema = z.object({
  milestoneId: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  dateDue: z.string().nullable().optional(),
  isCompleted: z.boolean().optional(),
})

const setMilestoneForTaskSchema = z.object({
  taskId: z.number(),
  milestoneId: z.number().nullable(), // null to remove
})

// =============================================================================
// Router
// =============================================================================

export const milestoneRouter = router({
  /**
   * List milestones for a project with progress stats
   */
  list: protectedProcedure.input(listMilestonesSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

    const milestones = await ctx.prisma.milestone.findMany({
      where: {
        projectId: input.projectId,
        ...(input.includeCompleted ? {} : { isCompleted: false }),
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: [
        { isCompleted: 'asc' }, // Active first
        { dateDue: 'asc' }, // Earliest due date first
        { createdAt: 'desc' },
      ],
    })

    // Add progress stats for each milestone
    const milestonesWithStats = await Promise.all(
      milestones.map(async (milestone) => {
        const taskStats = await ctx.prisma.task.groupBy({
          by: ['isActive'],
          where: { milestoneId: milestone.id },
          _count: true,
        })

        const totalTasks = milestone._count.tasks
        const completedTasks = taskStats.find((s) => !s.isActive)?._count ?? 0
        const openTasks = taskStats.find((s) => s.isActive)?._count ?? 0

        // Calculate due date status
        let dueStatus: 'overdue' | 'due_soon' | 'on_track' | 'no_date' = 'no_date'
        if (milestone.dateDue && !milestone.isCompleted) {
          const now = new Date()
          const dueDate = new Date(milestone.dateDue)
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          if (daysUntilDue < 0) {
            dueStatus = 'overdue'
          } else if (daysUntilDue <= 7) {
            dueStatus = 'due_soon'
          } else {
            dueStatus = 'on_track'
          }
        }

        return {
          ...milestone,
          totalTasks,
          completedTasks,
          openTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          dueStatus,
        }
      })
    )

    return milestonesWithStats
  }),

  /**
   * Get a single milestone with optional tasks
   */
  get: protectedProcedure.input(getMilestoneSchema).query(async ({ ctx, input }) => {
    const milestone = await ctx.prisma.milestone.findUnique({
      where: { id: input.milestoneId },
      include: {
        project: {
          select: { id: true, name: true },
        },
        ...(input.includeTasks && {
          tasks: {
            include: {
              column: { select: { id: true, title: true } },
              assignees: {
                include: {
                  user: { select: { id: true, username: true, name: true, email: true } },
                },
              },
            },
            orderBy: [
              { isActive: 'desc' }, // Open tasks first
              { priority: 'desc' },
              { position: 'asc' },
            ],
          },
        }),
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!milestone) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Milestone not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, milestone.projectId, 'VIEWER')

    // Calculate stats
    const taskStats = await ctx.prisma.task.groupBy({
      by: ['isActive'],
      where: { milestoneId: milestone.id },
      _count: true,
    })

    const totalTasks = milestone._count.tasks
    const completedTasks = taskStats.find((s) => !s.isActive)?._count ?? 0
    const openTasks = taskStats.find((s) => s.isActive)?._count ?? 0

    // Calculate due date status
    let dueStatus: 'overdue' | 'due_soon' | 'on_track' | 'no_date' = 'no_date'
    if (milestone.dateDue && !milestone.isCompleted) {
      const now = new Date()
      const dueDate = new Date(milestone.dateDue)
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDue < 0) {
        dueStatus = 'overdue'
      } else if (daysUntilDue <= 7) {
        dueStatus = 'due_soon'
      } else {
        dueStatus = 'on_track'
      }
    }

    return {
      ...milestone,
      totalTasks,
      completedTasks,
      openTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      dueStatus,
    }
  }),

  /**
   * Create a new milestone
   */
  create: protectedProcedure.input(createMilestoneSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER')

    const milestone = await ctx.prisma.milestone.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        dateDue: input.dateDue ? new Date(input.dateDue) : null,
      },
    })

    return milestone
  }),

  /**
   * Update a milestone
   */
  update: protectedProcedure.input(updateMilestoneSchema).mutation(async ({ ctx, input }) => {
    const { milestoneId, ...updates } = input

    const milestone = await ctx.prisma.milestone.findUnique({
      where: { id: milestoneId },
    })

    if (!milestone) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Milestone not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, milestone.projectId, 'MEMBER')

    const updated = await ctx.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.dateDue !== undefined && {
          dateDue: updates.dateDue ? new Date(updates.dateDue) : null,
        }),
        ...(updates.isCompleted !== undefined && { isCompleted: updates.isCompleted }),
      },
    })

    return updated
  }),

  /**
   * Delete a milestone
   */
  delete: protectedProcedure.input(milestoneIdSchema).mutation(async ({ ctx, input }) => {
    const milestone = await ctx.prisma.milestone.findUnique({
      where: { id: input.milestoneId },
    })

    if (!milestone) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Milestone not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, milestone.projectId, 'MEMBER')

    // Remove milestone assignment from all tasks first
    await ctx.prisma.task.updateMany({
      where: { milestoneId: input.milestoneId },
      data: { milestoneId: null },
    })

    await ctx.prisma.milestone.delete({
      where: { id: input.milestoneId },
    })

    return { success: true }
  }),

  /**
   * Set milestone for a task (or remove by setting null)
   */
  setForTask: protectedProcedure.input(setMilestoneForTaskSchema).mutation(async ({ ctx, input }) => {
    const task = await ctx.prisma.task.findUnique({
      where: { id: input.taskId },
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

    // If setting a milestone, verify it exists and is in the same project
    if (input.milestoneId !== null) {
      const milestone = await ctx.prisma.milestone.findUnique({
        where: { id: input.milestoneId },
      })

      if (!milestone) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found',
        })
      }

      if (milestone.projectId !== task.projectId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Task and milestone must be in the same project',
        })
      }
    }

    const updated = await ctx.prisma.task.update({
      where: { id: input.taskId },
      data: { milestoneId: input.milestoneId },
    })

    return updated
  }),

  /**
   * Get progress stats for a milestone
   */
  getProgress: protectedProcedure.input(milestoneIdSchema).query(async ({ ctx, input }) => {
    const milestone = await ctx.prisma.milestone.findUnique({
      where: { id: input.milestoneId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            isActive: true,
            priority: true,
            progress: true,
          },
        },
      },
    })

    if (!milestone) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Milestone not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, milestone.projectId, 'VIEWER')

    const totalTasks = milestone.tasks.length
    const completedTasks = milestone.tasks.filter((t) => !t.isActive).length
    const openTasks = milestone.tasks.filter((t) => t.isActive).length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Calculate average task progress for open tasks
    const openTasksWithProgress = milestone.tasks.filter((t) => t.isActive && t.progress > 0)
    const avgTaskProgress = openTasksWithProgress.length > 0
      ? Math.round(openTasksWithProgress.reduce((sum, t) => sum + t.progress, 0) / openTasksWithProgress.length)
      : 0

    // Calculate due date status
    let dueStatus: 'overdue' | 'due_soon' | 'on_track' | 'no_date' = 'no_date'
    let daysUntilDue: number | null = null
    if (milestone.dateDue) {
      const now = new Date()
      const dueDate = new Date(milestone.dateDue)
      daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (!milestone.isCompleted) {
        if (daysUntilDue < 0) {
          dueStatus = 'overdue'
        } else if (daysUntilDue <= 7) {
          dueStatus = 'due_soon'
        } else {
          dueStatus = 'on_track'
        }
      }
    }

    // Group tasks by priority
    const byPriority = {
      urgent: milestone.tasks.filter((t) => t.priority === 3).length,
      high: milestone.tasks.filter((t) => t.priority === 2).length,
      medium: milestone.tasks.filter((t) => t.priority === 1).length,
      low: milestone.tasks.filter((t) => t.priority === 0).length,
    }

    return {
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      isCompleted: milestone.isCompleted,
      dateDue: milestone.dateDue?.toISOString() ?? null,
      daysUntilDue,
      dueStatus,
      totalTasks,
      completedTasks,
      openTasks,
      progress,
      avgTaskProgress,
      byPriority,
      tasks: milestone.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        isActive: t.isActive,
        priority: t.priority,
        progress: t.progress,
      })),
    }
  }),
})
