/*
 * Workspace Wiki Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for workspace-level wiki pages CRUD.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 * ===================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'

// =============================================================================
// Input Schemas
// =============================================================================

const listPagesSchema = z.object({
  workspaceId: z.number(),
  parentId: z.number().nullable().optional(),
  includeUnpublished: z.boolean().default(false),
})

const getPageSchema = z.object({
  id: z.number(),
})

const getPageBySlugSchema = z.object({
  workspaceId: z.number(),
  slug: z.string(),
})

const createPageSchema = z.object({
  workspaceId: z.number(),
  parentId: z.number().nullable().optional(),
  title: z.string().min(1).max(255),
  content: z.string().default(''),
  isPublished: z.boolean().default(false),
})

const updatePageSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  isPublished: z.boolean().optional(),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
})

const deletePageSchema = z.object({
  id: z.number(),
})

const reorderPagesSchema = z.object({
  workspaceId: z.number(),
  pageOrders: z.array(z.object({
    id: z.number(),
    sortOrder: z.number(),
    parentId: z.number().nullable().optional(),
  })),
})

// =============================================================================
// Helpers
// =============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
}

async function ensureUniqueSlug(
  prisma: any,
  workspaceId: number,
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.workspaceWikiPage.findFirst({
      where: {
        workspaceId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++

    if (counter > 100) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not generate unique slug',
      })
    }
  }
}

// =============================================================================
// Workspace Wiki Router
// =============================================================================

export const workspaceWikiRouter = router({
  /**
   * List wiki pages in a workspace
   * Optionally filter by parent to get children only
   */
  list: protectedProcedure
    .input(listPagesSchema)
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.workspaceWikiPage.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
          ...(input.includeUnpublished ? {} : { isPublished: true }),
        },
        orderBy: [
          { sortOrder: 'asc' },
          { title: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          isPublished: true,
          sortOrder: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { children: true },
          },
        },
      })

      return pages.map((page) => ({
        ...page,
        childCount: page._count.children,
      }))
    }),

  /**
   * Get full page tree for a workspace
   */
  getTree: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.workspaceWikiPage.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: [
          { sortOrder: 'asc' },
          { title: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          isPublished: true,
          sortOrder: true,
          parentId: true,
        },
      })

      return pages
    }),

  /**
   * Get a single wiki page by ID
   */
  get: protectedProcedure
    .input(getPageSchema)
    .query(async ({ ctx, input }) => {
      const page = await ctx.prisma.workspaceWikiPage.findUnique({
        where: { id: input.id },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          parent: {
            select: { id: true, title: true, slug: true },
          },
          children: {
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: { id: true, title: true, slug: true },
          },
        },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      return page
    }),

  /**
   * Get a wiki page by slug
   */
  getBySlug: protectedProcedure
    .input(getPageBySlugSchema)
    .query(async ({ ctx, input }) => {
      const page = await ctx.prisma.workspaceWikiPage.findFirst({
        where: {
          workspaceId: input.workspaceId,
          slug: input.slug,
        },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          parent: {
            select: { id: true, title: true, slug: true },
          },
          children: {
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: { id: true, title: true, slug: true },
          },
        },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      return page
    }),

  /**
   * Create a new wiki page
   */
  create: protectedProcedure
    .input(createPageSchema)
    .mutation(async ({ ctx, input }) => {
      const baseSlug = generateSlug(input.title)
      const slug = await ensureUniqueSlug(ctx.prisma, input.workspaceId, baseSlug)

      // Get max sort order
      const maxOrder = await ctx.prisma.workspaceWikiPage.aggregate({
        where: {
          workspaceId: input.workspaceId,
          parentId: input.parentId ?? null,
        },
        _max: { sortOrder: true },
      })

      const page = await ctx.prisma.workspaceWikiPage.create({
        data: {
          workspaceId: input.workspaceId,
          parentId: input.parentId ?? null,
          title: input.title,
          slug,
          content: input.content,
          isPublished: input.isPublished,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          creatorId: ctx.userId,
        },
      })

      return page
    }),

  /**
   * Update a wiki page
   */
  update: protectedProcedure
    .input(updatePageSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.workspaceWikiPage.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      // Update slug if title changed
      let slug = existing.slug
      if (input.title && input.title !== existing.title) {
        const baseSlug = generateSlug(input.title)
        slug = await ensureUniqueSlug(ctx.prisma, existing.workspaceId, baseSlug, input.id)
      }

      const page = await ctx.prisma.workspaceWikiPage.update({
        where: { id: input.id },
        data: {
          ...(input.title ? { title: input.title, slug } : {}),
          ...(input.content !== undefined ? { content: input.content } : {}),
          ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          modifierId: ctx.userId,
        },
      })

      return page
    }),

  /**
   * Delete a wiki page and its children
   */
  delete: protectedProcedure
    .input(deletePageSchema)
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.prisma.workspaceWikiPage.findUnique({
        where: { id: input.id },
        include: { _count: { select: { children: true } } },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      // Delete recursively (children will cascade due to DB constraint)
      await ctx.prisma.workspaceWikiPage.delete({
        where: { id: input.id },
      })

      return { success: true, deletedId: input.id }
    }),

  /**
   * Reorder pages (update sort order and parent)
   */
  reorder: protectedProcedure
    .input(reorderPagesSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.pageOrders.map((order) =>
          ctx.prisma.workspaceWikiPage.update({
            where: { id: order.id },
            data: {
              sortOrder: order.sortOrder,
              ...(order.parentId !== undefined ? { parentId: order.parentId } : {}),
            },
          })
        )
      )

      return { success: true }
    }),
})
