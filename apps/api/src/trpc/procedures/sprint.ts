/*
 * Sprint Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for sprint management and burndown tracking.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'

// =============================================================================
// Input Schemas
// =============================================================================

const sprintIdSchema = z.object({
  sprintId: z.number(),
})

const listSprintsSchema = z.object({
  projectId: z.number(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED']).optional(),
})

const getSprintSchema = z.object({
  sprintId: z.number(),
  includeTasks: z.boolean().default(false),
})

const createSprintSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  dateStart: z.string(), // ISO date string
  dateEnd: z.string(), // ISO date string
})

const updateSprintSchema = z.object({
  sprintId: z.number(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
})

const sprintTaskSchema = z.object({
  sprintId: z.number(),
  taskId: z.number(),
})

const getBurndownSchema = z.object({
  sprintId: z.number(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate burndown data for a sprint
 * Returns daily data points with ideal and actual remaining work
 */
async function calculateBurndown(
  prisma: typeof import('@prisma/client').PrismaClient.prototype,
  sprintId: number
) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      tasks: {
        select: {
          id: true,
          isActive: true,
          dateCompleted: true,
          score: true,
          timeEstimated: true,
        },
      },
    },
  })

  if (!sprint) return null

  const startDate = new Date(sprint.dateStart)
  const endDate = new Date(sprint.dateEnd)
  const today = new Date()

  // Calculate total work (using score or timeEstimated as story points)
  const totalWork = sprint.tasks.reduce((sum, task) => {
    return sum + (task.score > 0 ? task.score : task.timeEstimated)
  }, 0)

  // Calculate sprint duration in days
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  // Daily ideal burndown rate
  const idealBurnRate = totalWork / (totalDays - 1)

  // Generate data points for each day
  const dataPoints: Array<{
    date: string
    ideal: number
    actual: number | null
    completed: number
  }> = []

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + day)
    const dateStr = currentDate.toISOString().split('T')[0]!

    // Ideal remaining work
    const idealRemaining = Math.max(0, totalWork - idealBurnRate * day)

    // For dates in the future, actual is null
    if (currentDate > today) {
      dataPoints.push({
        date: dateStr,
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: null,
        completed: 0,
      })
      continue
    }

    // Calculate actual remaining work (tasks not completed by this date)
    const completedByDate = sprint.tasks.filter((task) => {
      if (!task.dateCompleted) return false
      // dateCompleted is a DateTime (Date object)
      return task.dateCompleted <= currentDate
    })

    const completedWork = completedByDate.reduce((sum, task) => {
      return sum + (task.score > 0 ? task.score : task.timeEstimated)
    }, 0)

    const actualRemaining = totalWork - completedWork

    dataPoints.push({
      date: dateStr,
      ideal: Math.round(idealRemaining * 10) / 10,
      actual: Math.round(actualRemaining * 10) / 10,
      completed: completedByDate.length,
    })
  }

  return {
    sprintId,
    sprintName: sprint.name,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalWork: Math.round(totalWork * 10) / 10,
    totalTasks: sprint.tasks.length,
    completedTasks: sprint.tasks.filter((t) => !t.isActive).length,
    dataPoints,
  }
}

// =============================================================================
// Router
// =============================================================================

export const sprintRouter = router({
  /**
   * List sprints for a project
   */
  list: protectedProcedure.input(listSprintsSchema).query(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

    const sprints = await ctx.prisma.sprint.findMany({
      where: {
        projectId: input.projectId,
        ...(input.status && { status: input.status }),
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // PLANNING first, then ACTIVE, then COMPLETED
        { dateStart: 'desc' },
      ],
    })

    // Add task stats for each sprint
    const sprintsWithStats = await Promise.all(
      sprints.map(async (sprint) => {
        const taskStats = await ctx.prisma.task.groupBy({
          by: ['isActive'],
          where: { sprintId: sprint.id },
          _count: true,
        })

        const totalTasks = sprint._count.tasks
        const completedTasks =
          taskStats.find((s) => !s.isActive)?._count ?? 0
        const openTasks = taskStats.find((s) => s.isActive)?._count ?? 0

        return {
          ...sprint,
          totalTasks,
          completedTasks,
          openTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        }
      })
    )

    return sprintsWithStats
  }),

  /**
   * Get a single sprint with optional tasks
   */
  get: protectedProcedure.input(getSprintSchema).query(async ({ ctx, input }) => {
    const sprint = await ctx.prisma.sprint.findUnique({
      where: { id: input.sprintId },
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
            orderBy: { position: 'asc' },
          },
        }),
        _count: {
          select: { tasks: true },
        },
      },
    })

    if (!sprint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sprint not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'VIEWER')

    // Calculate stats
    const taskStats = await ctx.prisma.task.groupBy({
      by: ['isActive'],
      where: { sprintId: sprint.id },
      _count: true,
    })

    const totalTasks = sprint._count.tasks
    const completedTasks = taskStats.find((s) => !s.isActive)?._count ?? 0
    const openTasks = taskStats.find((s) => s.isActive)?._count ?? 0

    return {
      ...sprint,
      totalTasks,
      completedTasks,
      openTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    }
  }),

  /**
   * Create a new sprint
   */
  create: protectedProcedure.input(createSprintSchema).mutation(async ({ ctx, input }) => {
    await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER')

    // Validate dates
    const startDate = new Date(input.dateStart)
    const endDate = new Date(input.dateEnd)

    if (endDate <= startDate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End date must be after start date',
      })
    }

    const sprint = await ctx.prisma.sprint.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description,
        dateStart: startDate,
        dateEnd: endDate,
        status: 'PLANNING',
      },
    })

    return sprint
  }),

  /**
   * Update a sprint
   */
  update: protectedProcedure.input(updateSprintSchema).mutation(async ({ ctx, input }) => {
    const { sprintId, ...updates } = input

    const sprint = await ctx.prisma.sprint.findUnique({
      where: { id: sprintId },
    })

    if (!sprint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sprint not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'MEMBER')

    // Validate dates if provided
    const dateStart = updates.dateStart ? new Date(updates.dateStart) : sprint.dateStart
    const dateEnd = updates.dateEnd ? new Date(updates.dateEnd) : sprint.dateEnd

    if (dateEnd <= dateStart) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End date must be after start date',
      })
    }

    const updated = await ctx.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.dateStart && { dateStart: new Date(updates.dateStart) }),
        ...(updates.dateEnd && { dateEnd: new Date(updates.dateEnd) }),
      },
    })

    return updated
  }),

  /**
   * Start a sprint (PLANNING -> ACTIVE)
   */
  start: protectedProcedure.input(sprintIdSchema).mutation(async ({ ctx, input }) => {
    const sprint = await ctx.prisma.sprint.findUnique({
      where: { id: input.sprintId },
    })

    if (!sprint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sprint not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'MEMBER')

    if (sprint.status !== 'PLANNING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot start sprint with status ${sprint.status}. Only PLANNING sprints can be started.`,
      })
    }

    // Check if there's already an active sprint in this project
    const activeSprint = await ctx.prisma.sprint.findFirst({
      where: {
        projectId: sprint.projectId,
        status: 'ACTIVE',
      },
    })

    if (activeSprint) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Project already has an active sprint: "${activeSprint.name}". Complete it first.`,
      })
    }

    const updated = await ctx.prisma.sprint.update({
      where: { id: input.sprintId },
      data: { status: 'ACTIVE' },
    })

    return updated
  }),

  /**
   * Complete a sprint (ACTIVE -> COMPLETED)
   * Optionally moves remaining tasks back to backlog (null sprintId)
   */
  complete: protectedProcedure
    .input(
      z.object({
        sprintId: z.number(),
        moveRemainingToBacklog: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.prisma.sprint.findUnique({
        where: { id: input.sprintId },
        include: {
          tasks: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      })

      if (!sprint) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sprint not found',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'MEMBER')

      if (sprint.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot complete sprint with status ${sprint.status}. Only ACTIVE sprints can be completed.`,
        })
      }

      // Move remaining tasks to backlog if requested
      if (input.moveRemainingToBacklog && sprint.tasks.length > 0) {
        await ctx.prisma.task.updateMany({
          where: {
            id: { in: sprint.tasks.map((t) => t.id) },
          },
          data: { sprintId: null },
        })
      }

      const updated = await ctx.prisma.sprint.update({
        where: { id: input.sprintId },
        data: { status: 'COMPLETED' },
      })

      return {
        ...updated,
        movedTasksCount: input.moveRemainingToBacklog ? sprint.tasks.length : 0,
      }
    }),

  /**
   * Delete a sprint
   */
  delete: protectedProcedure.input(sprintIdSchema).mutation(async ({ ctx, input }) => {
    const sprint = await ctx.prisma.sprint.findUnique({
      where: { id: input.sprintId },
    })

    if (!sprint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sprint not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'MEMBER')

    // Remove sprint assignment from all tasks first
    await ctx.prisma.task.updateMany({
      where: { sprintId: input.sprintId },
      data: { sprintId: null },
    })

    await ctx.prisma.sprint.delete({
      where: { id: input.sprintId },
    })

    return { success: true }
  }),

  /**
   * Add a task to a sprint
   */
  addTask: protectedProcedure.input(sprintTaskSchema).mutation(async ({ ctx, input }) => {
    const [sprint, task] = await Promise.all([
      ctx.prisma.sprint.findUnique({ where: { id: input.sprintId } }),
      ctx.prisma.task.findUnique({ where: { id: input.taskId } }),
    ])

    if (!sprint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sprint not found',
      })
    }

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      })
    }

    if (task.projectId !== sprint.projectId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Task and sprint must be in the same project',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'MEMBER')

    const updated = await ctx.prisma.task.update({
      where: { id: input.taskId },
      data: { sprintId: input.sprintId },
    })

    return updated
  }),

  /**
   * Remove a task from a sprint
   */
  removeTask: protectedProcedure.input(sprintTaskSchema).mutation(async ({ ctx, input }) => {
    const task = await ctx.prisma.task.findUnique({
      where: { id: input.taskId },
    })

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      })
    }

    if (task.sprintId !== input.sprintId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Task is not in this sprint',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, task.projectId, 'MEMBER')

    const updated = await ctx.prisma.task.update({
      where: { id: input.taskId },
      data: { sprintId: null },
    })

    return updated
  }),

  /**
   * Get burndown data for a sprint
   */
  getBurndown: protectedProcedure.input(getBurndownSchema).query(async ({ ctx, input }) => {
    const sprint = await ctx.prisma.sprint.findUnique({
      where: { id: input.sprintId },
    })

    if (!sprint) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sprint not found',
      })
    }

    await permissionService.requireProjectAccess(ctx.user.id, sprint.projectId, 'VIEWER')

    const burndown = await calculateBurndown(ctx.prisma, input.sprintId)

    if (!burndown) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to calculate burndown data',
      })
    }

    return burndown
  }),

  /**
   * Get the active sprint for a project
   */
  getActive: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const sprint = await ctx.prisma.sprint.findFirst({
        where: {
          projectId: input.projectId,
          status: 'ACTIVE',
        },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      })

      if (!sprint) {
        return null
      }

      // Calculate stats
      const taskStats = await ctx.prisma.task.groupBy({
        by: ['isActive'],
        where: { sprintId: sprint.id },
        _count: true,
      })

      const totalTasks = sprint._count.tasks
      const completedTasks = taskStats.find((s) => !s.isActive)?._count ?? 0

      return {
        ...sprint,
        totalTasks,
        completedTasks,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      }
    }),
})
