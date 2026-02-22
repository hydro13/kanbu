/*
 * Workspace Wiki Procedures
 * Version: 2.1.0
 *
 * tRPC procedures for workspace-level wiki pages CRUD with:
 * - Version control (20 versions per page)
 * - Lexical JSON content support
 * - Graphiti sync status tracking
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 *
 * Modified: 2026-01-12
 * Change: Added version control, Lexical JSON, Graphiti tracking
 *
 * Modified: 2026-01-12
 * Change: Added resyncGraph endpoint to fix wiki link extraction
 *         and re-sync all pages to knowledge graph
 * ===================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import type { PrismaClient, WikiPageStatus } from '@prisma/client';
import { router, protectedProcedure } from '../router';
import { getGraphitiService } from '../../services/graphitiService';
import type { ContradictionAuditEntry } from '../../lib/ai/wiki';

// Max versions to keep per page
const MAX_VERSIONS = 20;

// =============================================================================
// Input Schemas
// =============================================================================

const listPagesSchema = z.object({
  workspaceId: z.number(),
  parentId: z.number().nullable().optional(),
  includeUnpublished: z.boolean().default(false),
});

const getPageSchema = z.object({
  id: z.number(),
});

const getPageBySlugSchema = z.object({
  workspaceId: z.number(),
  slug: z.string(),
});

const createPageSchema = z.object({
  workspaceId: z.number(),
  parentId: z.number().nullable().optional(),
  title: z.string().min(1).max(255),
  content: z.string().default(''),
  contentJson: z.any().optional(), // Lexical editor state
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

const updatePageSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  contentJson: z.any().optional(), // Lexical editor state
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  parentId: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
  changeNote: z.string().max(500).optional(), // Note for version history
});

const deletePageSchema = z.object({
  id: z.number(),
});

const reorderPagesSchema = z.object({
  workspaceId: z.number(),
  pageOrders: z.array(
    z.object({
      id: z.number(),
      sortOrder: z.number(),
      parentId: z.number().nullable().optional(),
    })
  ),
});

const getVersionsSchema = z.object({
  pageId: z.number(),
  limit: z.number().min(1).max(50).default(20),
});

const getVersionSchema = z.object({
  pageId: z.number(),
  version: z.number(),
});

const restoreVersionSchema = z.object({
  pageId: z.number(),
  version: z.number(),
  changeNote: z.string().max(500).optional(),
});

// =============================================================================
// Helpers
// =============================================================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

async function ensureUniqueSlug(
  prisma: PrismaClient,
  workspaceId: number,
  baseSlug: string,
  excludeId?: number
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.workspaceWikiPage.findFirst({
      where: {
        workspaceId,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;

    if (counter > 100) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not generate unique slug',
      });
    }
  }
}

/**
 * Create a new version snapshot of a page
 */
async function createVersion(
  prisma: PrismaClient,
  pageId: number,
  title: string,
  content: string,
  contentJson: Prisma.JsonValue,
  createdById: number,
  changeNote?: string
): Promise<void> {
  // Get current max version
  const maxVersion = await prisma.workspaceWikiVersion.aggregate({
    where: { pageId },
    _max: { version: true },
  });

  const newVersion = (maxVersion._max.version ?? 0) + 1;

  // Create new version
  await prisma.workspaceWikiVersion.create({
    data: {
      pageId,
      version: newVersion,
      title,
      content,
      contentJson: contentJson ?? Prisma.JsonNull,
      createdById,
      changeNote,
    },
  });

  // Clean up old versions (keep only MAX_VERSIONS)
  const oldVersions = await prisma.workspaceWikiVersion.findMany({
    where: { pageId },
    orderBy: { version: 'desc' },
    skip: MAX_VERSIONS,
    select: { id: true },
  });

  if (oldVersions.length > 0) {
    await prisma.workspaceWikiVersion.deleteMany({
      where: {
        id: { in: oldVersions.map((v: { id: number }) => v.id) },
      },
    });
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
  list: protectedProcedure.input(listPagesSchema).query(async ({ ctx, input }) => {
    const pages = await ctx.prisma.workspaceWikiPage.findMany({
      where: {
        workspaceId: input.workspaceId,
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.includeUnpublished ? {} : { status: 'PUBLISHED' }),
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
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
    });

    return pages.map((page) => ({
      ...page,
      childCount: page._count.children,
      versionCount: page._count.versions,
    }));
  }),

  /**
   * Get full page tree for a workspace
   */
  getTree: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.workspaceWikiPage.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          sortOrder: true,
          parentId: true,
        },
      });

      return pages;
    }),

  /**
   * Get a single wiki page by ID
   */
  get: protectedProcedure.input(getPageSchema).query(async ({ ctx, input }) => {
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
        _count: {
          select: { versions: true },
        },
      },
    });

    if (!page) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Wiki page not found',
      });
    }

    return {
      ...page,
      versionCount: page._count.versions,
    };
  }),

  /**
   * Get a wiki page by slug
   */
  getBySlug: protectedProcedure.input(getPageBySlugSchema).query(async ({ ctx, input }) => {
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
        _count: {
          select: { versions: true },
        },
      },
    });

    if (!page) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Wiki page not found',
      });
    }

    return {
      ...page,
      versionCount: page._count.versions,
    };
  }),

  /**
   * Create a new wiki page
   */
  create: protectedProcedure.input(createPageSchema).mutation(async ({ ctx, input }) => {
    const baseSlug = generateSlug(input.title);
    const slug = await ensureUniqueSlug(ctx.prisma, input.workspaceId, baseSlug);

    // Get max sort order
    const maxOrder = await ctx.prisma.workspaceWikiPage.aggregate({
      where: {
        workspaceId: input.workspaceId,
        parentId: input.parentId ?? null,
      },
      _max: { sortOrder: true },
    });

    // Generate Graphiti group ID
    const graphitiGroupId = `wiki-ws-${input.workspaceId}`;

    const page = await ctx.prisma.workspaceWikiPage.create({
      data: {
        workspaceId: input.workspaceId,
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
    });

    // Create initial version
    await createVersion(
      ctx.prisma,
      page.id,
      page.title,
      page.content,
      page.contentJson,
      ctx.user.id,
      'Initial version'
    );

    // Sync to Graphiti knowledge graph (async - don't block the response)
    // Contradictions are logged to audit table and can be fetched separately
    getGraphitiService(ctx.prisma)
      .syncWikiPage({
        pageId: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        workspaceId: input.workspaceId,
        groupId: graphitiGroupId,
        userId: ctx.user.id,
        timestamp: new Date(),
      })
      .then(async () => {
        // Mark as synced
        await ctx.prisma.workspaceWikiPage.update({
          where: { id: page.id },
          data: { graphitiSynced: true, graphitiSyncedAt: new Date() },
        });
      })
      .catch((err) => {
        console.error(
          '[workspaceWiki.create] Graphiti sync failed:',
          err instanceof Error ? err.message : err
        );
      });

    // Return page immediately (contradictions are logged and can be fetched via contradictionAudit.getForPage)
    return {
      page,
      contradictions: [] as ContradictionAuditEntry[],
      contradictionsResolved: 0,
    };
  }),

  /**
   * Update a wiki page (with version tracking)
   */
  update: protectedProcedure.input(updatePageSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.workspaceWikiPage.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Wiki page not found',
      });
    }

    // Check if content changed (to decide whether to create version)
    const contentChanged =
      (input.content !== undefined && input.content !== existing.content) ||
      (input.contentJson !== undefined &&
        JSON.stringify(input.contentJson) !== JSON.stringify(existing.contentJson)) ||
      (input.title !== undefined && input.title !== existing.title);

    // Update slug if title changed
    let slug = existing.slug;
    if (input.title && input.title !== existing.title) {
      const baseSlug = generateSlug(input.title);
      slug = await ensureUniqueSlug(ctx.prisma, existing.workspaceId, baseSlug, input.id);
    }

    // Build update data - use direct field assignment
    const updateData: Record<string, unknown> = {
      modifierId: ctx.user.id,
      graphitiSynced: false, // Mark as needing sync
    };

    if (input.title) {
      updateData.title = input.title;
      updateData.slug = slug;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    if (input.contentJson !== undefined) {
      updateData.contentJson = input.contentJson;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'PUBLISHED' && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (input.parentId !== undefined) {
      updateData.parentId = input.parentId;
    }
    if (input.sortOrder !== undefined) {
      updateData.sortOrder = input.sortOrder;
    }

    const page = await ctx.prisma.workspaceWikiPage.update({
      where: { id: input.id },
      data: updateData,
    });

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
      );

      // Sync to Graphiti knowledge graph (async - don't block the response)
      // Contradictions are logged to audit table and can be fetched separately
      // Fase 17.3.1: Pass oldContent for diff-based extraction (reduces token usage 600K+ → ~10K)
      getGraphitiService(ctx.prisma)
        .syncWikiPage({
          pageId: page.id,
          title: page.title,
          slug: page.slug,
          content: page.content,
          oldContent: existing.content, // For diff-based extraction
          workspaceId: existing.workspaceId,
          groupId: existing.graphitiGroupId ?? `wiki-ws-${existing.workspaceId}`,
          userId: ctx.user.id,
          timestamp: new Date(),
        })
        .then(async () => {
          // Mark as synced
          await ctx.prisma.workspaceWikiPage.update({
            where: { id: page.id },
            data: { graphitiSynced: true, graphitiSyncedAt: new Date() },
          });
        })
        .catch((err) => {
          console.error(
            '[workspaceWiki.update] Graphiti sync failed:',
            err instanceof Error ? err.message : err
          );
        });
    }

    // Return page immediately (contradictions are logged and can be fetched via contradictionAudit.getForPage)
    return {
      page,
      contradictions: [] as ContradictionAuditEntry[],
      contradictionsResolved: 0,
    };
  }),

  /**
   * Delete a wiki page and its children
   */
  delete: protectedProcedure.input(deletePageSchema).mutation(async ({ ctx, input }) => {
    const page = await ctx.prisma.workspaceWikiPage.findUnique({
      where: { id: input.id },
      include: { _count: { select: { children: true } } },
    });

    if (!page) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Wiki page not found',
      });
    }

    // Delete recursively (children and versions will cascade)
    await ctx.prisma.workspaceWikiPage.delete({
      where: { id: input.id },
    });

    // Remove from Graphiti knowledge graph (async)
    getGraphitiService()
      .deleteWikiPage(input.id)
      .catch((err) => {
        console.error('[workspaceWiki.delete] Graphiti delete failed:', err.message);
      });

    return { success: true, deletedId: input.id };
  }),

  /**
   * Reorder pages (update sort order and parent)
   */
  reorder: protectedProcedure.input(reorderPagesSchema).mutation(async ({ ctx, input }) => {
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
    );

    return { success: true };
  }),

  // ===========================================================================
  // Version Control Endpoints
  // ===========================================================================

  /**
   * Get version history for a page
   */
  getVersions: protectedProcedure.input(getVersionsSchema).query(async ({ ctx, input }) => {
    const versions = await ctx.prisma.workspaceWikiVersion.findMany({
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
    });

    // Get user names for versions
    const userIds = [...new Set(versions.map((v) => v.createdById))];
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return versions.map((v) => ({
      ...v,
      createdBy: userMap.get(v.createdById) ?? { name: 'Unknown', username: 'unknown' },
    }));
  }),

  /**
   * Get a specific version of a page
   */
  getVersion: protectedProcedure.input(getVersionSchema).query(async ({ ctx, input }) => {
    const version = await ctx.prisma.workspaceWikiVersion.findUnique({
      where: {
        pageId_version: {
          pageId: input.pageId,
          version: input.version,
        },
      },
    });

    if (!version) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Version not found',
      });
    }

    // Get user info
    const user = await ctx.prisma.user.findUnique({
      where: { id: version.createdById },
      select: { id: true, name: true, username: true },
    });

    return {
      ...version,
      createdBy: user ?? { name: 'Unknown', username: 'unknown' },
    };
  }),

  /**
   * Restore a previous version of a page
   */
  restoreVersion: protectedProcedure
    .input(restoreVersionSchema)
    .mutation(async ({ ctx, input }) => {
      // Get the version to restore
      const version = await ctx.prisma.workspaceWikiVersion.findUnique({
        where: {
          pageId_version: {
            pageId: input.pageId,
            version: input.version,
          },
        },
      });

      if (!version) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Version not found',
        });
      }

      // Get current page
      const page = await ctx.prisma.workspaceWikiPage.findUnique({
        where: { id: input.pageId },
      });

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Wiki page not found',
        });
      }

      // Update slug if title changed
      let slug = page.slug;
      if (version.title !== page.title) {
        const baseSlug = generateSlug(version.title);
        slug = await ensureUniqueSlug(ctx.prisma, page.workspaceId, baseSlug, page.id);
      }

      // Update page with version content
      const updatedPage = await ctx.prisma.workspaceWikiPage.update({
        where: { id: input.pageId },
        data: {
          title: version.title,
          slug,
          content: version.content,
          contentJson: version.contentJson ?? undefined,
          modifierId: ctx.user.id,
          graphitiSynced: false,
        },
      });

      // Create new version for this restore action
      await createVersion(
        ctx.prisma,
        page.id,
        version.title,
        version.content,
        version.contentJson,
        ctx.user.id,
        input.changeNote ?? `Restored from version ${input.version}`
      );

      return updatedPage;
    }),

  // ===========================================================================
  // Graphiti Sync Status
  // ===========================================================================

  /**
   * Get pages that need Graphiti sync
   */
  getPendingSync: protectedProcedure
    .input(z.object({ workspaceId: z.number(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const pages = await ctx.prisma.workspaceWikiPage.findMany({
        where: {
          workspaceId: input.workspaceId,
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
      });

      return pages;
    }),

  /**
   * Mark page as synced to Graphiti
   */
  markSynced: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.workspaceWikiPage.update({
        where: { id: input.pageId },
        data: {
          graphitiSynced: true,
          graphitiSyncedAt: new Date(),
        },
      });

      return { success: true };
    }),

  /**
   * Re-sync all wiki pages to Graphiti knowledge graph
   * Extracts fresh plain text from contentJson and syncs to graph
   * Use this after fixing wiki link extraction issues
   */
  resyncGraph: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pages = await ctx.prisma.workspaceWikiPage.findMany({
        where: { workspaceId: input.workspaceId },
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          contentJson: true,
          graphitiGroupId: true,
          creatorId: true,
        },
      });

      const stats = { total: pages.length, synced: 0, errors: 0 };

      for (const page of pages) {
        try {
          // Re-extract plain text from Lexical JSON if available
          let plainText = page.content;
          if (page.contentJson) {
            // contentJson from Prisma is JsonValue, convert to string
            const jsonString =
              typeof page.contentJson === 'string'
                ? page.contentJson
                : JSON.stringify(page.contentJson);
            const extracted = extractPlainTextFromLexical(jsonString);
            if (extracted) {
              plainText = extracted;

              // Update the content field in database
              await ctx.prisma.workspaceWikiPage.update({
                where: { id: page.id },
                data: { content: plainText },
              });
            }
          }

          // Sync to Graphiti
          await getGraphitiService().syncWikiPage({
            pageId: page.id,
            title: page.title,
            slug: page.slug,
            content: plainText,
            workspaceId: input.workspaceId,
            groupId: page.graphitiGroupId ?? `wiki-ws-${input.workspaceId}`,
            userId: page.creatorId ?? ctx.user.id, // Fallback to current user if creator unknown
            timestamp: new Date(),
          });

          // Mark as synced
          await ctx.prisma.workspaceWikiPage.update({
            where: { id: page.id },
            data: { graphitiSynced: true, graphitiSyncedAt: new Date() },
          });

          stats.synced++;
        } catch (err) {
          console.error(`[workspaceWiki.resyncGraph] Failed to sync page ${page.id}:`, err);
          stats.errors++;
        }
      }

      console.log(
        `[workspaceWiki.resyncGraph] Completed: ${stats.synced}/${stats.total} synced, ${stats.errors} errors`
      );
      return stats;
    }),
});

// =============================================================================
// Helper: Extract plain text from Lexical JSON
// =============================================================================

/**
 * Extract plain text from Lexical JSON, preserving wiki link format
 */
function extractPlainTextFromLexical(contentJson: string | null): string | null {
  if (!contentJson) return null;

  try {
    const parsed = JSON.parse(contentJson);
    return extractTextFromNode(parsed.root);
  } catch {
    return null;
  }
}

/**
 * Recursively extract text from Lexical node
 * Preserves [[wiki-link]] format for graph extraction
 */
function extractTextFromNode(node: Record<string, unknown> | null): string {
  if (!node) return '';

  const parts: string[] = [];

  // Text node
  if (node.type === 'text' && typeof node.text === 'string') {
    parts.push(node.text);
  }

  // Wiki link node - preserve [[...]] format for backlinks extraction
  if (node.type === 'wiki-link') {
    const displayText = node.displayText as string;
    if (displayText) {
      parts.push(`[[${displayText}]]`);
      return parts.join('');
    }
    // Fallback to children if displayText not available
    if (Array.isArray(node.children)) {
      const childText = (node.children as Record<string, unknown>[])
        .map(extractTextFromNode)
        .join('');
      parts.push(`[[${childText}]]`);
      return parts.join('');
    }
  }

  // Mention node - preserve @format
  if (node.type === 'mention') {
    const mentionName = node.mentionName as string;
    if (mentionName) {
      parts.push(`@${mentionName}`);
      return parts.join('');
    }
  }

  // Task ref node - preserve #format
  if (node.type === 'task-ref') {
    const taskRef = node.taskRef as string;
    if (taskRef) {
      parts.push(`#${taskRef}`);
      return parts.join('');
    }
  }

  // Recursively handle children
  if (Array.isArray(node.children)) {
    const childTexts = (node.children as Record<string, unknown>[]).map(extractTextFromNode);
    // Add newline after block elements
    if (['paragraph', 'heading', 'quote', 'listitem'].includes(node.type as string)) {
      parts.push(childTexts.join('') + '\n');
    } else {
      parts.push(childTexts.join(''));
    }
  }

  return parts.join('');
}
