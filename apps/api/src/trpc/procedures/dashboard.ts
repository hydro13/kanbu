/*
 * Dashboard Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for the dashboard sidebar tree hierarchy.
 * Provides efficient data fetching for the collapsible workspace tree.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-10
 * Change: Initial implementation - Fase 1.1 of Dashboard Roadmap
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../router';
import { permissionService } from '../../services';

// =============================================================================
// Output Schemas
// =============================================================================

const kanbuProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  identifier: z.string(),
  taskCount: z.number(),
  hasGitHub: z.boolean(),
});

const githubRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
  syncStatus: z.enum(['synced', 'pending', 'error', 'never']),
  lastSyncAt: z.string().nullable(),
  projectId: z.number().nullable(),
  projectIdentifier: z.string().nullable(),
});

const projectGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  projectCount: z.number(),
});

const workspaceNodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  kanbuProjects: z.array(kanbuProjectSchema),
  githubRepos: z.array(githubRepoSchema),
  projectGroups: z.array(projectGroupSchema),
});

const hierarchyOutputSchema = z.object({
  workspaces: z.array(workspaceNodeSchema),
});

// =============================================================================
// Dashboard Router
// =============================================================================

export const dashboardRouter = router({
  /**
   * Get the complete hierarchy for the sidebar tree
   *
   * Returns all workspaces the user has access to, with their:
   * - Kanbu projects (native projects)
   * - GitHub repositories (linked repos)
   * - Project groups
   *
   * ACL: Returns only resources the user has READ permission on.
   * Optimized for single-call loading of sidebar tree data.
   */
  getHierarchy: protectedProcedure.output(hierarchyOutputSchema).query(async ({ ctx }) => {
    // Get all workspaces user has access to via ACL
    const userWorkspaces = await permissionService.getUserWorkspaces(ctx.user.id);

    if (userWorkspaces.length === 0) {
      return { workspaces: [] };
    }

    const workspaceIds = userWorkspaces.map((w) => w.id);

    // Fetch all workspace data in a single query with includes
    const workspaces = await ctx.prisma.workspace.findMany({
      where: {
        id: { in: workspaceIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        // Kanbu projects
        projects: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            identifier: true,
            _count: {
              select: { tasks: true },
            },
            // Check if project has GitHub repo linked
            githubRepositories: {
              select: { id: true },
              take: 1,
            },
          },
          orderBy: { name: 'asc' },
        },
        // GitHub installations with their repositories
        githubInstallations: {
          select: {
            repositories: {
              select: {
                id: true,
                name: true,
                fullName: true,
                owner: true,
                lastSyncAt: true,
                projectId: true,
                syncEnabled: true,
                // Include linked project's identifier for navigation
                project: {
                  select: {
                    identifier: true,
                    name: true,
                  },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
        },
        // Project groups
        projectGroups: {
          where: {
            status: { not: 'CLOSED' },
          },
          select: {
            id: true,
            name: true,
            color: true,
            _count: {
              select: { projects: true },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform to output format
    return {
      workspaces: workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        logoUrl: ws.logoUrl,

        // Kanbu projects: only projects WITHOUT a primary GitHub link
        // Projects with GitHub are shown in the GitHub section
        kanbuProjects: ws.projects
          .filter((p) => p.githubRepositories.length === 0)
          .map((p) => ({
            id: p.id,
            name: p.name,
            identifier: p.identifier ?? p.name.substring(0, 10).toUpperCase(),
            taskCount: p._count.tasks,
            hasGitHub: false,
          })),

        // GitHub repos: flatten from all installations
        githubRepos: ws.githubInstallations.flatMap((inst) =>
          inst.repositories.map((repo) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            owner: repo.owner,
            syncStatus: determineSyncStatus(repo.lastSyncAt, repo.syncEnabled),
            lastSyncAt: repo.lastSyncAt?.toISOString() ?? null,
            projectId: repo.projectId,
            projectIdentifier: repo.project?.identifier ?? null,
          }))
        ),

        // Project groups
        projectGroups: ws.projectGroups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
          projectCount: g._count.projects,
        })),
      })),
    };
  }),
});

/**
 * Determine sync status based on last sync time and enabled state
 */
function determineSyncStatus(
  lastSyncAt: Date | null,
  syncEnabled: boolean
): 'synced' | 'pending' | 'error' | 'never' {
  if (!syncEnabled) {
    return 'never';
  }

  if (!lastSyncAt) {
    return 'pending';
  }

  // Consider synced if last sync was within 24 hours
  const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceSync < 24) {
    return 'synced';
  }

  // If sync is enabled but hasn't synced in 24+ hours, show pending
  return 'pending';
}
