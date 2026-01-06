/*
 * Tag Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for tag CRUD and task-tag management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import { emitTagAdded, emitTagRemoved } from '../../socket'

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
})

const tagIdSchema = z.object({
  tagId: z.number(),
})

const createTagSchema = z.object({
  projectId: z.number(),
  name: z.string().min(1).max(100),
  color: z.string().max(20).default('grey'),
})

const updateTagSchema = z.object({
  tagId: z.number(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
})

const addTagToTaskSchema = z.object({
  taskId: z.number(),
  tagId: z.number(),
})

const removeTagFromTaskSchema = z.object({
  taskId: z.number(),
  tagId: z.number(),
})

const getTaskTagsSchema = z.object({
  taskId: z.number(),
})

// =============================================================================
// Helpers
// =============================================================================

async function getTagProjectId(
  prisma: any,
  tagId: number
): Promise<number> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { projectId: true },
  })

  if (!tag) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Tag not found',
    })
  }

  return tag.projectId
}

async function getTaskProjectId(
  prisma: any,
  taskId: number
): Promise<number> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  })

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found',
    })
  }

  return task.projectId
}

// =============================================================================
// Tag Router
// =============================================================================

export const tagRouter = router({
  /**
   * List all tags for a project
   * Requires at least VIEWER access
   */
  list: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'VIEWER')

      const tags = await ctx.prisma.tag.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      return tags.map((tag) => ({
        ...tag,
        taskCount: tag._count.tasks,
      }))
    }),

  /**
   * Get a single tag by ID
   * Requires at least VIEWER access
   */
  get: protectedProcedure
    .input(tagIdSchema)
    .query(async ({ ctx, input }) => {
      const projectId = await getTagProjectId(ctx.prisma, input.tagId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER')

      const tag = await ctx.prisma.tag.findUnique({
        where: { id: input.tagId },
        select: {
          id: true,
          projectId: true,
          name: true,
          color: true,
          createdAt: true,
          _count: {
            select: { tasks: true },
          },
        },
      })

      if (!tag) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Tag not found',
        })
      }

      return {
        ...tag,
        taskCount: tag._count.tasks,
      }
    }),

  /**
   * Create a new tag
   * Requires at least MEMBER access
   */
  create: protectedProcedure
    .input(createTagSchema)
    .mutation(async ({ ctx, input }) => {
      await permissionService.requireProjectAccess(ctx.user.id, input.projectId, 'MEMBER')

      // Check for duplicate name
      const existing = await ctx.prisma.tag.findUnique({
        where: {
          projectId_name: {
            projectId: input.projectId,
            name: input.name,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A tag with this name already exists',
        })
      }

      const tag = await ctx.prisma.tag.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          color: input.color,
        },
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
        },
      })

      return tag
    }),

  /**
   * Update a tag
   * Requires at least MEMBER access
   */
  update: protectedProcedure
    .input(updateTagSchema)
    .mutation(async ({ ctx, input }) => {
      const projectId = await getTagProjectId(ctx.prisma, input.tagId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER')

      // Check for duplicate name if name is being changed
      if (input.name) {
        const existing = await ctx.prisma.tag.findFirst({
          where: {
            projectId,
            name: input.name,
            id: { not: input.tagId },
          },
        })

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A tag with this name already exists',
          })
        }
      }

      const { tagId, ...updateData } = input

      const tag = await ctx.prisma.tag.update({
        where: { id: tagId },
        data: updateData,
        select: {
          id: true,
          name: true,
          color: true,
        },
      })

      return tag
    }),

  /**
   * Delete a tag
   * Requires at least MANAGER access
   * Also removes all task-tag associations
   */
  delete: protectedProcedure
    .input(tagIdSchema)
    .mutation(async ({ ctx, input }) => {
      const projectId = await getTagProjectId(ctx.prisma, input.tagId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MANAGER')

      // Delete tag (cascade will remove TaskTag entries)
      await ctx.prisma.tag.delete({
        where: { id: input.tagId },
      })

      return { success: true }
    }),

  /**
   * Add a tag to a task
   * Requires at least MEMBER access
   */
  addToTask: protectedProcedure
    .input(addTagToTaskSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify both task and tag exist and are in the same project
      const taskProjectId = await getTaskProjectId(ctx.prisma, input.taskId)
      const tagProjectId = await getTagProjectId(ctx.prisma, input.tagId)

      if (taskProjectId !== tagProjectId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Task and tag must belong to the same project',
        })
      }

      await permissionService.requireProjectAccess(ctx.user.id, taskProjectId, 'MEMBER')

      // Check if already tagged
      const existing = await ctx.prisma.taskTag.findUnique({
        where: {
          taskId_tagId: {
            taskId: input.taskId,
            tagId: input.tagId,
          },
        },
      })

      if (existing) {
        // Already tagged, return success
        return { success: true, alreadyTagged: true }
      }

      await ctx.prisma.taskTag.create({
        data: {
          taskId: input.taskId,
          tagId: input.tagId,
        },
      })

      // Emit WebSocket event for real-time sync
      emitTagAdded({
        tagId: input.tagId,
        taskId: input.taskId,
        projectId: taskProjectId,
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      return { success: true, alreadyTagged: false }
    }),

  /**
   * Remove a tag from a task
   * Requires at least MEMBER access
   */
  removeFromTask: protectedProcedure
    .input(removeTagFromTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const taskProjectId = await getTaskProjectId(ctx.prisma, input.taskId)
      await permissionService.requireProjectAccess(ctx.user.id, taskProjectId, 'MEMBER')

      // Delete the task-tag association if it exists
      await ctx.prisma.taskTag.deleteMany({
        where: {
          taskId: input.taskId,
          tagId: input.tagId,
        },
      })

      // Emit WebSocket event for real-time sync
      emitTagRemoved({
        tagId: input.tagId,
        taskId: input.taskId,
        projectId: taskProjectId,
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      return { success: true }
    }),

  /**
   * Get all tags for a specific task
   * Requires at least VIEWER access
   */
  getTaskTags: protectedProcedure
    .input(getTaskTagsSchema)
    .query(async ({ ctx, input }) => {
      const projectId = await getTaskProjectId(ctx.prisma, input.taskId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER')

      const taskTags = await ctx.prisma.taskTag.findMany({
        where: { taskId: input.taskId },
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy: {
          tag: { name: 'asc' },
        },
      })

      return taskTags.map((tt) => tt.tag)
    }),
})
