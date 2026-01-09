/*
 * Comment Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for task comment CRUD.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { permissionService } from '../../services'
import { auditService, AUDIT_ACTIONS } from '../../services/auditService'
import {
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
} from '../../socket'

// =============================================================================
// Input Schemas
// =============================================================================

const commentIdSchema = z.object({
  commentId: z.number(),
})

const createCommentSchema = z.object({
  taskId: z.number(),
  content: z.string().min(1).max(50000),
})

const updateCommentSchema = z.object({
  commentId: z.number(),
  content: z.string().min(1).max(50000),
})

const listCommentsSchema = z.object({
  taskId: z.number(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

// =============================================================================
// Helpers
// =============================================================================

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

async function getCommentInfo(
  prisma: any,
  commentId: number
): Promise<{ taskId: number; projectId: number; userId: number }> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      taskId: true,
      userId: true,
      task: {
        select: { projectId: true },
      },
    },
  })

  if (!comment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Comment not found',
    })
  }

  return {
    taskId: comment.taskId,
    projectId: comment.task.projectId,
    userId: comment.userId,
  }
}

// =============================================================================
// Comment Router
// =============================================================================

export const commentRouter = router({
  /**
   * List comments for a task
   * Requires at least VIEWER access
   */
  list: protectedProcedure
    .input(listCommentsSchema)
    .query(async ({ ctx, input }) => {
      const projectId = await getTaskProjectId(ctx.prisma, input.taskId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER')

      const comments = await ctx.prisma.comment.findMany({
        where: { taskId: input.taskId },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
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
      })

      // Get total count for pagination
      const total = await ctx.prisma.comment.count({
        where: { taskId: input.taskId },
      })

      return {
        comments,
        total,
        hasMore: input.offset + comments.length < total,
      }
    }),

  /**
   * Create a new comment
   * Requires at least MEMBER access
   */
  create: protectedProcedure
    .input(createCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const projectId = await getTaskProjectId(ctx.prisma, input.taskId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER')

      const comment = await ctx.prisma.comment.create({
        data: {
          taskId: input.taskId,
          userId: ctx.user.id,
          content: input.content,
        },
        select: {
          id: true,
          content: true,
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
      })

      // Update project last activity
      await ctx.prisma.project.update({
        where: { id: projectId },
        data: { lastActivityAt: new Date() },
      })

      // Emit WebSocket event for real-time sync
      emitCommentCreated({
        commentId: comment.id,
        taskId: input.taskId,
        projectId,
        data: {
          content: comment.content,
          user: comment.user,
        },
        triggeredBy: {
          id: ctx.user.id,
          username: ctx.user.username,
        },
        timestamp: new Date().toISOString(),
      })

      // Audit logging (Fase 15 - MCP Activity Logging)
      const project = await ctx.prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      })
      const taskInfo = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
        select: { reference: true, title: true },
      })
      await auditService.logCommentEvent({
        action: AUDIT_ACTIONS.COMMENT_CREATED,
        resourceType: 'comment',
        resourceId: comment.id,
        resourceName: `Comment on ${taskInfo?.reference ?? `Task #${input.taskId}`}`,
        targetType: 'task',
        targetId: input.taskId,
        targetName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${input.taskId}`,
        userId: ctx.user.id,
        workspaceId: project?.workspaceId,
        changes: {
          contentPreview: input.content.substring(0, 100),
        },
        metadata: ctx.assistantContext ? {
          via: 'assistant',
          machineId: ctx.assistantContext.machineId,
          machineName: ctx.assistantContext.machineName,
          bindingId: ctx.assistantContext.bindingId,
        } : undefined,
      })

      return comment
    }),

  /**
   * Get a single comment
   * Requires at least VIEWER access
   */
  get: protectedProcedure
    .input(commentIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = await getCommentInfo(ctx.prisma, input.commentId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER')

      const comment = await ctx.prisma.comment.findUnique({
        where: { id: input.commentId },
        select: {
          id: true,
          taskId: true,
          content: true,
          createdAt: true,
          updatedAt: true,
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

      return comment
    }),

  /**
   * Update a comment
   * Only the author can update their comment
   * Requires at least MEMBER access
   */
  update: protectedProcedure
    .input(updateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, userId } = await getCommentInfo(ctx.prisma, input.commentId)
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER')

      // Only author can edit their comment
      if (userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only edit your own comments',
        })
      }

      const commentInfo = await ctx.prisma.comment.findUnique({
        where: { id: input.commentId },
        select: { taskId: true },
      })

      const updated = await ctx.prisma.comment.update({
        where: { id: input.commentId },
        data: { content: input.content },
        select: {
          id: true,
          content: true,
          updatedAt: true,
        },
      })

      // Emit WebSocket event for real-time sync
      if (commentInfo) {
        emitCommentUpdated({
          commentId: updated.id,
          taskId: commentInfo.taskId,
          projectId,
          data: {
            content: updated.content,
          },
          triggeredBy: {
            id: ctx.user.id,
            username: ctx.user.username,
          },
          timestamp: new Date().toISOString(),
        })

        // Audit logging (Fase 15 - MCP Activity Logging)
        const project = await ctx.prisma.project.findUnique({
          where: { id: projectId },
          select: { workspaceId: true },
        })
        const taskInfo = await ctx.prisma.task.findUnique({
          where: { id: commentInfo.taskId },
          select: { reference: true, title: true },
        })
        await auditService.logCommentEvent({
          action: AUDIT_ACTIONS.COMMENT_UPDATED,
          resourceType: 'comment',
          resourceId: input.commentId,
          resourceName: `Comment on ${taskInfo?.reference ?? `Task #${commentInfo.taskId}`}`,
          targetType: 'task',
          targetId: commentInfo.taskId,
          targetName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${commentInfo.taskId}`,
          userId: ctx.user.id,
          workspaceId: project?.workspaceId,
          changes: {
            contentPreview: input.content.substring(0, 100),
          },
          metadata: ctx.assistantContext ? {
            via: 'assistant',
            machineId: ctx.assistantContext.machineId,
            machineName: ctx.assistantContext.machineName,
            bindingId: ctx.assistantContext.bindingId,
          } : undefined,
        })
      }

      return updated
    }),

  /**
   * Delete a comment
   * Author can delete their own comment
   * MANAGER+ can delete any comment
   */
  delete: protectedProcedure
    .input(commentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, userId } = await getCommentInfo(ctx.prisma, input.commentId)
      const access = await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER')

      // Author can always delete their own comment
      // MANAGER+ can delete any comment
      const isAuthor = userId === ctx.user.id
      const isManager = access.role === 'MANAGER' || access.role === 'OWNER'

      if (!isAuthor && !isManager) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own comments',
        })
      }

      // Get taskId before deleting
      const comment = await ctx.prisma.comment.findUnique({
        where: { id: input.commentId },
        select: { taskId: true },
      })

      await ctx.prisma.comment.delete({
        where: { id: input.commentId },
      })

      // Emit WebSocket event for real-time sync
      if (comment) {
        emitCommentDeleted({
          commentId: input.commentId,
          taskId: comment.taskId,
          projectId,
          triggeredBy: {
            id: ctx.user.id,
            username: ctx.user.username,
          },
          timestamp: new Date().toISOString(),
        })

        // Audit logging (Fase 15 - MCP Activity Logging)
        const project = await ctx.prisma.project.findUnique({
          where: { id: projectId },
          select: { workspaceId: true },
        })
        const taskInfo = await ctx.prisma.task.findUnique({
          where: { id: comment.taskId },
          select: { reference: true, title: true },
        })
        await auditService.logCommentEvent({
          action: AUDIT_ACTIONS.COMMENT_DELETED,
          resourceType: 'comment',
          resourceId: input.commentId,
          resourceName: `Comment on ${taskInfo?.reference ?? `Task #${comment.taskId}`}`,
          targetType: 'task',
          targetId: comment.taskId,
          targetName: taskInfo ? `${taskInfo.reference}: ${taskInfo.title}` : `Task #${comment.taskId}`,
          userId: ctx.user.id,
          workspaceId: project?.workspaceId,
          metadata: ctx.assistantContext ? {
            via: 'assistant',
            machineId: ctx.assistantContext.machineId,
            machineName: ctx.assistantContext.machineName,
            bindingId: ctx.assistantContext.bindingId,
          } : undefined,
        })
      }

      return { success: true }
    }),
})
