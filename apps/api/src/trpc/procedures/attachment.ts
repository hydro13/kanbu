/*
 * Attachment Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for file attachment CRUD.
 * Handles file upload, download, and deletion.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:20 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';
import {
  validateFile,
  getStorageProvider,
  getFileSizeLimit,
  isImageMimeType,
  FILE_SIZE_LIMITS,
} from '../../lib/storage';

// =============================================================================
// Input Schemas
// =============================================================================

const attachmentIdSchema = z.object({
  attachmentId: z.number(),
});

const uploadAttachmentSchema = z.object({
  taskId: z.number(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  // Base64 encoded file data
  data: z.string(),
});

const listAttachmentsSchema = z.object({
  taskId: z.number(),
});

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
  });

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found',
    });
  }

  return task.projectId;
}

async function getAttachmentInfo(
  prisma: any,
  attachmentId: number
): Promise<{ taskId: number; projectId: number; userId: number; path: string }> {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      taskId: true,
      userId: true,
      path: true,
      task: {
        select: { projectId: true },
      },
    },
  });

  if (!attachment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Attachment not found',
    });
  }

  return {
    taskId: attachment.taskId,
    projectId: attachment.task.projectId,
    userId: attachment.userId,
    path: attachment.path,
  };
}

// =============================================================================
// Attachment Router
// =============================================================================

export const attachmentRouter = router({
  /**
   * List attachments for a task
   * Requires at least VIEWER access
   */
  list: protectedProcedure
    .input(listAttachmentsSchema)
    .query(async ({ ctx, input }) => {
      const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER');

      const attachments = await ctx.prisma.attachment.findMany({
        where: { taskId: input.taskId },
        select: {
          id: true,
          name: true,
          path: true,
          mimeType: true,
          size: true,
          isImage: true,
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
      });

      // Add download URLs
      const storage = getStorageProvider();
      return attachments.map((att) => ({
        ...att,
        url: storage.getUrl(att.path),
      }));
    }),

  /**
   * Get file size limits configuration
   * Useful for frontend validation
   */
  getLimits: protectedProcedure.query(() => {
    return {
      limits: FILE_SIZE_LIMITS,
      maxSizeMB: Math.round(Math.max(...Object.values(FILE_SIZE_LIMITS)) / (1024 * 1024)),
    };
  }),

  /**
   * Upload a new attachment
   * Requires at least MEMBER access
   */
  upload: protectedProcedure
    .input(uploadAttachmentSchema)
    .mutation(async ({ ctx, input }) => {
      const projectId = await getTaskProjectId(ctx.prisma, input.taskId);
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

      // Decode base64 data
      const buffer = Buffer.from(input.data, 'base64');
      const fileSize = buffer.length;

      // Validate file
      const validation = validateFile(input.filename, input.mimeType, fileSize);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: validation.error ?? 'Invalid file',
        });
      }

      // Save file to storage
      const storage = getStorageProvider();
      const storedFile = await storage.save(buffer, input.filename, input.mimeType);

      // Create database record
      const attachment = await ctx.prisma.attachment.create({
        data: {
          taskId: input.taskId,
          userId: ctx.user.id,
          name: input.filename,
          path: storedFile.path,
          mimeType: input.mimeType,
          size: fileSize,
          isImage: isImageMimeType(input.mimeType),
        },
        select: {
          id: true,
          name: true,
          path: true,
          mimeType: true,
          size: true,
          isImage: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      });

      // Update project last activity
      await ctx.prisma.project.update({
        where: { id: projectId },
        data: { lastActivityAt: new Date() },
      });

      return {
        ...attachment,
        url: storage.getUrl(storedFile.path),
      };
    }),

  /**
   * Get a single attachment
   * Requires at least VIEWER access
   */
  get: protectedProcedure
    .input(attachmentIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = await getAttachmentInfo(ctx.prisma, input.attachmentId);
      await permissionService.requireProjectAccess(ctx.user.id, projectId, 'VIEWER');

      const attachment = await ctx.prisma.attachment.findUnique({
        where: { id: input.attachmentId },
        select: {
          id: true,
          taskId: true,
          name: true,
          path: true,
          mimeType: true,
          size: true,
          isImage: true,
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
      });

      if (!attachment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Attachment not found',
        });
      }

      const storage = getStorageProvider();
      return {
        ...attachment,
        url: storage.getUrl(attachment.path),
      };
    }),

  /**
   * Delete an attachment
   * Author can delete their own attachment
   * MANAGER+ can delete any attachment
   */
  delete: protectedProcedure
    .input(attachmentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, userId, path } = await getAttachmentInfo(
        ctx.prisma,
        input.attachmentId
      );
      const access = await permissionService.requireProjectAccess(ctx.user.id, projectId, 'MEMBER');

      // Author can always delete their own attachment
      // MANAGER+ can delete any attachment
      const isAuthor = userId === ctx.user.id;
      const isManager = access.role === 'MANAGER' || access.role === 'OWNER';

      if (!isAuthor && !isManager) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own attachments',
        });
      }

      // Delete from storage
      const storage = getStorageProvider();
      await storage.delete(path);

      // Delete database record
      await ctx.prisma.attachment.delete({
        where: { id: input.attachmentId },
      });

      return { success: true };
    }),

  /**
   * Get file size limit for a specific MIME type
   * Useful for frontend preview of limits
   */
  getSizeLimit: protectedProcedure
    .input(z.object({ mimeType: z.string() }))
    .query(({ input }) => {
      const limit = getFileSizeLimit(input.mimeType);
      return {
        mimeType: input.mimeType,
        maxBytes: limit,
        maxMB: Math.round(limit / (1024 * 1024)),
      };
    }),
});
