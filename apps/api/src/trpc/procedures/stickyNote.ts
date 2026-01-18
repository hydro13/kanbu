/*
 * Sticky Note Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for sticky notes CRUD and linking.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T01:10 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';

// =============================================================================
// Input Schemas
// =============================================================================

const stickyNoteIdSchema = z.object({
  id: z.number(),
});

const createStickyNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(10000),
  color: z.enum(['YELLOW', 'PINK', 'BLUE', 'GREEN', 'PURPLE', 'ORANGE']).default('YELLOW'),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
  isPinned: z.boolean().default(false),
});

const updateStickyNoteSchema = z.object({
  id: z.number(),
  title: z.string().max(255).optional().nullable(),
  content: z.string().min(1).max(10000).optional(),
  color: z.enum(['YELLOW', 'PINK', 'BLUE', 'GREEN', 'PURPLE', 'ORANGE']).optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional(),
  isPinned: z.boolean().optional(),
});

const listStickyNotesSchema = z.object({
  includePublic: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const linkStickyNoteSchema = z.object({
  stickyNoteId: z.number(),
  entityType: z.enum(['PROJECT', 'TASK', 'SPRINT', 'WIKI_PAGE', 'PROJECT_GROUP']),
  entityId: z.number(),
});

const unlinkStickyNoteSchema = z.object({
  stickyNoteId: z.number(),
  entityType: z.enum(['PROJECT', 'TASK', 'SPRINT', 'WIKI_PAGE', 'PROJECT_GROUP']).optional(),
  entityId: z.number().optional(),
});

const getEntityStickiesSchema = z.object({
  entityType: z.enum(['PROJECT', 'TASK', 'SPRINT', 'WIKI_PAGE', 'PROJECT_GROUP']),
  entityId: z.number(),
  includePrivate: z.boolean().default(false),
});

// =============================================================================
// Helpers
// =============================================================================

async function getStickyNoteOwner(prisma: any, stickyNoteId: number): Promise<number> {
  const note = await prisma.stickyNote.findUnique({
    where: { id: stickyNoteId },
    select: { userId: true },
  });

  if (!note) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Sticky note not found',
    });
  }

  return note.userId;
}

// =============================================================================
// Sticky Note Router
// =============================================================================

export const stickyNoteRouter = router({
  /**
   * List sticky notes for the current user
   * Optionally includes public notes from other users
   */
  list: protectedProcedure.input(listStickyNotesSchema).query(async ({ ctx, input }) => {
    const whereClause = input.includePublic
      ? {
          OR: [{ userId: ctx.user.id }, { visibility: 'PUBLIC' as const }],
        }
      : { userId: ctx.user.id };

    const notes = await ctx.prisma.stickyNote.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        color: true,
        isPinned: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        links: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take: input.limit,
      skip: input.offset,
    });

    const total = await ctx.prisma.stickyNote.count({
      where: whereClause,
    });

    return {
      notes,
      total,
      hasMore: input.offset + notes.length < total,
    };
  }),

  /**
   * Get a single sticky note
   * Must be owner or note must be public
   */
  get: protectedProcedure.input(stickyNoteIdSchema).query(async ({ ctx, input }) => {
    const note = await ctx.prisma.stickyNote.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        color: true,
        isPinned: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        links: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
          },
        },
      },
    });

    if (!note) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sticky note not found',
      });
    }

    // Check access
    if (note.userId !== ctx.user.id && note.visibility !== 'PUBLIC') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    return note;
  }),

  /**
   * Create a new sticky note
   */
  create: protectedProcedure.input(createStickyNoteSchema).mutation(async ({ ctx, input }) => {
    const note = await ctx.prisma.stickyNote.create({
      data: {
        userId: ctx.user.id,
        title: input.title,
        content: input.content,
        color: input.color,
        visibility: input.visibility,
        isPinned: input.isPinned,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        color: true,
        isPinned: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        links: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
          },
        },
      },
    });

    return note;
  }),

  /**
   * Update a sticky note
   * Only the owner can update
   */
  update: protectedProcedure.input(updateStickyNoteSchema).mutation(async ({ ctx, input }) => {
    const ownerId = await getStickyNoteOwner(ctx.prisma, input.id);

    if (ownerId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only edit your own sticky notes',
      });
    }

    const { id, ...updateData } = input;

    const updated = await ctx.prisma.stickyNote.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        color: true,
        isPinned: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        links: {
          select: {
            id: true,
            entityType: true,
            entityId: true,
          },
        },
      },
    });

    return updated;
  }),

  /**
   * Delete a sticky note
   * Only the owner can delete
   */
  delete: protectedProcedure.input(stickyNoteIdSchema).mutation(async ({ ctx, input }) => {
    const ownerId = await getStickyNoteOwner(ctx.prisma, input.id);

    if (ownerId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only delete your own sticky notes',
      });
    }

    await ctx.prisma.stickyNote.delete({
      where: { id: input.id },
    });

    return { success: true };
  }),

  /**
   * Toggle pin status
   */
  togglePin: protectedProcedure.input(stickyNoteIdSchema).mutation(async ({ ctx, input }) => {
    const note = await ctx.prisma.stickyNote.findUnique({
      where: { id: input.id },
      select: { userId: true, isPinned: true },
    });

    if (!note) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Sticky note not found',
      });
    }

    if (note.userId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only pin your own sticky notes',
      });
    }

    const updated = await ctx.prisma.stickyNote.update({
      where: { id: input.id },
      data: { isPinned: !note.isPinned },
      select: {
        id: true,
        isPinned: true,
      },
    });

    return updated;
  }),

  /**
   * Link a sticky note to an entity
   */
  link: protectedProcedure.input(linkStickyNoteSchema).mutation(async ({ ctx, input }) => {
    const ownerId = await getStickyNoteOwner(ctx.prisma, input.stickyNoteId);

    if (ownerId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only link your own sticky notes',
      });
    }

    // Check if link already exists
    const existing = await ctx.prisma.stickyNoteLink.findFirst({
      where: {
        stickyNoteId: input.stickyNoteId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });

    if (existing) {
      return existing;
    }

    const link = await ctx.prisma.stickyNoteLink.create({
      data: {
        stickyNoteId: input.stickyNoteId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
    });

    return link;
  }),

  /**
   * Unlink a sticky note from an entity
   */
  unlink: protectedProcedure.input(unlinkStickyNoteSchema).mutation(async ({ ctx, input }) => {
    const ownerId = await getStickyNoteOwner(ctx.prisma, input.stickyNoteId);

    if (ownerId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only unlink your own sticky notes',
      });
    }

    // Build where clause
    const whereClause: any = { stickyNoteId: input.stickyNoteId };
    if (input.entityType) {
      whereClause.entityType = input.entityType;
    }
    if (input.entityId) {
      whereClause.entityId = input.entityId;
    }

    await ctx.prisma.stickyNoteLink.deleteMany({
      where: whereClause,
    });

    return { success: true };
  }),

  /**
   * Get sticky notes linked to an entity
   */
  getByEntity: protectedProcedure.input(getEntityStickiesSchema).query(async ({ ctx, input }) => {
    const whereClause: any = {
      links: {
        some: {
          entityType: input.entityType,
          entityId: input.entityId,
        },
      },
    };

    // Filter by visibility unless includePrivate
    if (!input.includePrivate) {
      whereClause.OR = [{ userId: ctx.user.id }, { visibility: 'PUBLIC' }];
    }

    const notes = await ctx.prisma.stickyNote.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        color: true,
        isPinned: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    return notes;
  }),
});
