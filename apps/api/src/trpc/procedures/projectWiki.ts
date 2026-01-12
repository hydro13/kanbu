/*
 * Project Wiki Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for project-level wiki pages CRUD with:
 * - Version control (20 versions per page)
 * - Lexical JSON content support
 * - Graphiti sync status tracking
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation with version control
 * ===================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import type { WikiPageStatus } from '@prisma/client'

// Max versions to keep per page
const MAX_VERSIONS = 20

// =============================================================================
// Input Schemas
// =============================================================================

const listPagesSchema = z.object({
  projectId: z.number(),
  parentId: z.number().nullable().optional(),
  includeUnpublished: z.boolean().default(false),
})

const getPageSchema = z.object({
  id: z.number(),
})

const getPageBySlugSchema = z.object({
  projectId: z.number(),
  slug: z.string(),
})

const createPageSchema = z.object({
  projectId: z.number(),
  parentId: z.number().nullable().optional(),
  title: z.string().min(1).max(255),
  content: z.string().default(''),
  contentJson: z.any().optional(), // Lexical editor state
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
})

const updatePageSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  contentJson: z.any().optional(), // Lexical editor state
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  changeNote: z.string().max(500).optional(), // Note for version history
})

const deletePageSchema = z.object({
  id: z.number(),
})

const reorderPagesSchema = z.object({
  projectId: z.number(),
  pageOrders: z.array(z.object({
    id: z.number(),
    sortOrder: z.number(),
    parentId: z.number().nullable().optional(),
  })),
})

const getVersionsSchema = z.object({
  pageId: z.number(),
  limit: z.number().min(1).max(50).default(20),
})

const getVersionSchema = z.object({
  pageId: z.number(),
  version: z.number(),
})

const restoreVersionSchema = z.object({
  pageId: z.number(),
  version: z.number(),
  changeNote: z.string().max(500).optional(),
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
  projectId: number,
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.wikiPage.findFirst({
      where: {
        projectId,
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

/**
 * Create a new version snapshot of a page
 */
async function createVersion(
  prisma: any,
  pageId: number,
  title: string,
  content: string,
  contentJson: any,
  createdById: number,
  changeNote?: string
): Promise<void> {
  // Get current max version
  const maxVersion = await prisma.projectWikiVersion.aggregate({
    where: { pageId },
    _max: { version: true },
  })

  const newVersion = (maxVersion._max.version ?? 0) + 1

  // Create new version
  await prisma.projectWikiVersion.create({
    data: {
      pageId,
      version: newVersion,
      title,
      content,
      contentJson,
      createdById,
      changeNote,
    },
  })

  // Clean up old versions (keep only MAX_VERSIONS)
  const oldVersions = await prisma.projectWikiVersion.findMany({
    where: { pageId },
    orderBy: { version: 'desc' },
    skip: MAX_VERSIONS,
    select: { id: true },
  })

  if (oldVersions.length > 0) {
    await prisma.projectWikiVersion.deleteMany({
      where: {
        id: { in: oldVersions.map((v: { id: number }) => v.id) },
      },
    })
  }
}

// =============================================================================
// Project Wiki Router
// =============================================================================

export const projectWikiRouter = router({
  /**
   * List wiki pages in a project
   * Optionally filter by parent to get children only
   */
  list: protectedProcedure
    .input(listPagesSchema)
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.wikiPage.findMany({
        where: {
          projectId: input.projectId,
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
          ...(input.includeUnpublished ? {} : { status: 'PUBLISHED' }),
        },
        orderBy: [
          { sortOrder: 'asc' },
          { title: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          sortOrder: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          graphitiSynced: true,
          _count: {
            select: { children: true, versions: true },
          },
        },
      })

      return pages.map((page) => ({
        ...page,
        childCount: page._count.children,
        versionCount: page._count.versions,
      }))
    }),

  /**
   * Get full page tree for a project
   */
  getTree: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.wikiPage.findMany({
        where: { projectId: input.projectId },
        orderBy: [
          { sortOrder: 'asc' },
          { title: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
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
      const page = await ctx.prisma.wikiPage.findUnique({
        where: { id: input.id },
        include: {
          project: {
            select: { id: true, name: true, identifier: true },
          },
          parent: {
            select: { id: true, title: true, slug: true },
          },
          children: {
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: { id: true, title: true, slug: true },
          },
          _count: {
            select: { versions: true },
          },
        },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      return {
        ...page,
        versionCount: page._count.versions,
      }
    }),

  /**
   * Get a wiki page by slug
   */
  getBySlug: protectedProcedure
    .input(getPageBySlugSchema)
    .query(async ({ ctx, input }) => {
      const page = await ctx.prisma.wikiPage.findFirst({
        where: {
          projectId: input.projectId,
          slug: input.slug,
        },
        include: {
          project: {
            select: { id: true, name: true, identifier: true },
          },
          parent: {
            select: { id: true, title: true, slug: true },
          },
          children: {
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            select: { id: true, title: true, slug: true },
          },
          _count: {
            select: { versions: true },
          },
        },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      return {
        ...page,
        versionCount: page._count.versions,
      }
    }),

  /**
   * Create a new wiki page
   */
  create: protectedProcedure
    .input(createPageSchema)
    .mutation(async ({ ctx, input }) => {
      const baseSlug = generateSlug(input.title)
      const slug = await ensureUniqueSlug(ctx.prisma, input.projectId, baseSlug)

      // Get max sort order
      const maxOrder = await ctx.prisma.wikiPage.aggregate({
        where: {
          projectId: input.projectId,
          parentId: input.parentId ?? null,
        },
        _max: { sortOrder: true },
      })

      // Generate Graphiti group ID
      const graphitiGroupId = `wiki-proj-${input.projectId}`

      const page = await ctx.prisma.wikiPage.create({
        data: {
          projectId: input.projectId,
          parentId: input.parentId ?? null,
          title: input.title,
          slug,
          content: input.content,
          contentJson: input.contentJson ?? null,
          status: input.status as WikiPageStatus,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          creatorId: ctx.user.id,
          graphitiGroupId,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
        },
      })

      // Create initial version
      await createVersion(
        ctx.prisma,
        page.id,
        page.title,
        page.content,
        page.contentJson,
        ctx.user.id,
        'Initial version'
      )

      return page
    }),

  /**
   * Update a wiki page (with version tracking)
   */
  update: protectedProcedure
    .input(updatePageSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.wikiPage.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      // Check if content changed (to decide whether to create version)
      const contentChanged =
        (input.content !== undefined && input.content !== existing.content) ||
        (input.contentJson !== undefined && JSON.stringify(input.contentJson) !== JSON.stringify(existing.contentJson)) ||
        (input.title !== undefined && input.title !== existing.title)

      // Update slug if title changed
      let slug = existing.slug
      if (input.title && input.title !== existing.title) {
        const baseSlug = generateSlug(input.title)
        slug = await ensureUniqueSlug(ctx.prisma, existing.projectId, baseSlug, input.id)
      }

      // Build update data
      const updateData: any = {
        modifierId: ctx.user.id,
        graphitiSynced: false, // Mark as needing sync
      }

      if (input.title) {
        updateData.title = input.title
        updateData.slug = slug
      }
      if (input.content !== undefined) {
        updateData.content = input.content
      }
      if (input.contentJson !== undefined) {
        updateData.contentJson = input.contentJson
      }
      if (input.status !== undefined) {
        updateData.status = input.status
        if (input.status === 'PUBLISHED' && !existing.publishedAt) {
          updateData.publishedAt = new Date()
        }
      }
      if (input.parentId !== undefined) {
        updateData.parentId = input.parentId
      }
      if (input.sortOrder !== undefined) {
        updateData.sortOrder = input.sortOrder
      }

      const page = await ctx.prisma.wikiPage.update({
        where: { id: input.id },
        data: updateData,
      })

      // Create version if content changed
      if (contentChanged) {
        await createVersion(
          ctx.prisma,
          page.id,
          page.title,
          page.content,
          page.contentJson,
          ctx.user.id,
          input.changeNote
        )
      }

      return page
    }),

  /**
   * Delete a wiki page and its children
   */
  delete: protectedProcedure
    .input(deletePageSchema)
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.prisma.wikiPage.findUnique({
        where: { id: input.id },
        include: { _count: { select: { children: true } } },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      // Delete recursively (children and versions will cascade)
      await ctx.prisma.wikiPage.delete({
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
          ctx.prisma.wikiPage.update({
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

  // ===========================================================================
  // Version Control Endpoints
  // ===========================================================================

  /**
   * Get version history for a page
   */
  getVersions: protectedProcedure
    .input(getVersionsSchema)
    .query(async ({ ctx, input }) => {
      const versions = await ctx.prisma.projectWikiVersion.findMany({
        where: { pageId: input.pageId },
        orderBy: { version: 'desc' },
        take: input.limit,
        select: {
          id: true,
          version: true,
          title: true,
          changeNote: true,
          createdById: true,
          createdAt: true,
        },
      })

      // Get user names for versions
      const userIds = [...new Set(versions.map((v) => v.createdById))]
      const users = await ctx.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true },
      })
      const userMap = new Map(users.map((u) => [u.id, u]))

      return versions.map((v) => ({
        ...v,
        createdBy: userMap.get(v.createdById) ?? { name: 'Unknown', username: 'unknown' },
      }))
    }),

  /**
   * Get a specific version of a page
   */
  getVersion: protectedProcedure
    .input(getVersionSchema)
    .query(async ({ ctx, input }) => {
      const version = await ctx.prisma.projectWikiVersion.findUnique({
        where: {
          pageId_version: {
            pageId: input.pageId,
            version: input.version,
          },
        },
      })

      if (!version) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Version not found',
        })
      }

      // Get user info
      const user = await ctx.prisma.user.findUnique({
        where: { id: version.createdById },
        select: { id: true, name: true, username: true },
      })

      return {
        ...version,
        createdBy: user ?? { name: 'Unknown', username: 'unknown' },
      }
    }),

  /**
   * Restore a previous version of a page
   */
  restoreVersion: protectedProcedure
    .input(restoreVersionSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the version to restore
      const version = await ctx.prisma.projectWikiVersion.findUnique({
        where: {
          pageId_version: {
            pageId: input.pageId,
            version: input.version,
          },
        },
      })

      if (!version) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Version not found',
        })
      }

      // Get current page
      const page = await ctx.prisma.wikiPage.findUnique({
        where: { id: input.pageId },
      })

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        })
      }

      // Update slug if title changed
      let slug = page.slug
      if (version.title !== page.title) {
        const baseSlug = generateSlug(version.title)
        slug = await ensureUniqueSlug(ctx.prisma, page.projectId, baseSlug, page.id)
      }

      // Update page with version content
      const updatedPage = await ctx.prisma.wikiPage.update({
        where: { id: input.pageId },
        data: {
          title: version.title,
          slug,
          content: version.content,
          contentJson: version.contentJson ?? undefined,
          modifierId: ctx.user.id,
          graphitiSynced: false,
        },
      })

      // Create new version for this restore action
      await createVersion(
        ctx.prisma,
        page.id,
        version.title,
        version.content,
        version.contentJson,
        ctx.user.id,
        input.changeNote ?? `Restored from version ${input.version}`
      )

      return updatedPage
    }),

  // ===========================================================================
  // Graphiti Sync Status
  // ===========================================================================

  /**
   * Get pages that need Graphiti sync
   */
  getPendingSync: protectedProcedure
    .input(z.object({ projectId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.wikiPage.findMany({
        where: {
          projectId: input.projectId,
          graphitiSynced: false,
        },
        take: input.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          contentJson: true,
          graphitiGroupId: true,
          updatedAt: true,
        },
      })

      return pages
    }),

  /**
   * Mark page as synced to Graphiti
   */
  markSynced: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.wikiPage.update({
        where: { id: input.pageId },
        data: {
          graphitiSynced: true,
          graphitiSyncedAt: new Date(),
        },
      })

      return { success: true }
    }),
})
