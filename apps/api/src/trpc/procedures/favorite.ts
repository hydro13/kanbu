/*
 * Favorite Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for user favorites (cross-container project shortcuts).
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation for Fase 2.1
 * ===================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';

// =============================================================================
// Input Schemas
// =============================================================================

const addFavoriteSchema = z.object({
  projectId: z.number(),
});

const removeFavoriteSchema = z.object({
  projectId: z.number(),
});

const reorderFavoritesSchema = z.object({
  projectIds: z.array(z.number()),
});

// =============================================================================
// Favorite Router
// =============================================================================

export const favoriteRouter = router({
  /**
   * List all favorites for the current user
   * Returns projects with workspace info, ordered by sortOrder
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const favorites = await ctx.prisma.userFavorite.findMany({
      where: { userId: ctx.user.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            identifier: true,
            description: true,
            isActive: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Filter out inactive projects and map to clean structure
    return favorites
      .filter((f) => f.project.isActive)
      .map((f) => ({
        id: f.id,
        projectId: f.project.id,
        projectName: f.project.name,
        projectIdentifier: f.project.identifier,
        workspaceId: f.project.workspace.id,
        workspaceName: f.project.workspace.name,
        workspaceSlug: f.project.workspace.slug,
        sortOrder: f.sortOrder,
        createdAt: f.createdAt,
      }));
  }),

  /**
   * Check if a project is favorited by the current user
   */
  isFavorite: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const favorite = await ctx.prisma.userFavorite.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.user.id,
            projectId: input.projectId,
          },
        },
      });
      return !!favorite;
    }),

  /**
   * Add a project to favorites
   */
  add: protectedProcedure.input(addFavoriteSchema).mutation(async ({ ctx, input }) => {
    // Check if project exists and user has access
    const project = await ctx.prisma.project.findFirst({
      where: {
        id: input.projectId,
        isActive: true,
      },
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check if already favorited
    const existing = await ctx.prisma.userFavorite.findUnique({
      where: {
        userId_projectId: {
          userId: ctx.user.id,
          projectId: input.projectId,
        },
      },
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Project is already in favorites',
      });
    }

    // Get next sort order
    const maxSortOrder = await ctx.prisma.userFavorite.aggregate({
      where: { userId: ctx.user.id },
      _max: { sortOrder: true },
    });

    const favorite = await ctx.prisma.userFavorite.create({
      data: {
        userId: ctx.user.id,
        projectId: input.projectId,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            identifier: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return {
      id: favorite.id,
      projectId: favorite.project.id,
      projectName: favorite.project.name,
      projectIdentifier: favorite.project.identifier,
      workspaceId: favorite.project.workspace.id,
      workspaceName: favorite.project.workspace.name,
      workspaceSlug: favorite.project.workspace.slug,
      sortOrder: favorite.sortOrder,
      createdAt: favorite.createdAt,
    };
  }),

  /**
   * Remove a project from favorites
   */
  remove: protectedProcedure.input(removeFavoriteSchema).mutation(async ({ ctx, input }) => {
    const favorite = await ctx.prisma.userFavorite.findUnique({
      where: {
        userId_projectId: {
          userId: ctx.user.id,
          projectId: input.projectId,
        },
      },
    });

    if (!favorite) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Favorite not found',
      });
    }

    await ctx.prisma.userFavorite.delete({
      where: { id: favorite.id },
    });

    return { success: true };
  }),

  /**
   * Toggle favorite status for a project
   */
  toggle: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.userFavorite.findUnique({
        where: {
          userId_projectId: {
            userId: ctx.user.id,
            projectId: input.projectId,
          },
        },
      });

      if (existing) {
        // Remove favorite
        await ctx.prisma.userFavorite.delete({
          where: { id: existing.id },
        });
        return { isFavorite: false };
      } else {
        // Add favorite
        const project = await ctx.prisma.project.findFirst({
          where: {
            id: input.projectId,
            isActive: true,
          },
        });

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found',
          });
        }

        const maxSortOrder = await ctx.prisma.userFavorite.aggregate({
          where: { userId: ctx.user.id },
          _max: { sortOrder: true },
        });

        await ctx.prisma.userFavorite.create({
          data: {
            userId: ctx.user.id,
            projectId: input.projectId,
            sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
          },
        });

        return { isFavorite: true };
      }
    }),

  /**
   * Reorder favorites
   * Pass array of projectIds in desired order
   */
  reorder: protectedProcedure.input(reorderFavoritesSchema).mutation(async ({ ctx, input }) => {
    // Update sort order for each project
    await ctx.prisma.$transaction(
      input.projectIds.map((projectId, index) =>
        ctx.prisma.userFavorite.updateMany({
          where: {
            userId: ctx.user.id,
            projectId,
          },
          data: {
            sortOrder: index,
          },
        })
      )
    );

    return { success: true };
  }),
});
