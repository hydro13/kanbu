/*
 * GitHub Project Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for GitHub repository management at project level.
 * Handles repository linking, sync settings, and sync operations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 3 - Repository Linking
 * =============================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../router'
import { aclService, ACL_PERMISSIONS, auditService, AUDIT_ACTIONS } from '../../services/index.js'
import {
  importIssuesFromGitHub,
  getImportProgress,
  clearImportProgress,
} from '../../services/github/issueSyncService'
import type { GitHubSyncSettings } from '@kanbu/shared'

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
})

const syncSettingsSchema = z.object({
  issues: z.object({
    enabled: z.boolean(),
    direction: z.enum(['kanbu_to_github', 'github_to_kanbu', 'bidirectional']),
    labelMapping: z.record(z.string(), z.string()).optional(),
    stateMapping: z.record(z.string(), z.string()).optional(),
  }).optional(),
  pullRequests: z.object({
    enabled: z.boolean(),
    autoLink: z.boolean(),
  }).optional(),
  commits: z.object({
    enabled: z.boolean(),
    autoLink: z.boolean(),
    pattern: z.string().optional(),
  }).optional(),
  branches: z.object({
    enabled: z.boolean(),
    pattern: z.string(),
  }).optional(),
}).optional()

const linkRepositorySchema = z.object({
  projectId: z.number(),
  installationId: z.number(),
  repoId: z.number(),
  owner: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  fullName: z.string().min(1).max(512),
  defaultBranch: z.string().max(255).optional().default('main'),
  isPrivate: z.boolean().optional().default(false),
  syncSettings: syncSettingsSchema,
})

const updateSyncSettingsSchema = z.object({
  projectId: z.number(),
  syncEnabled: z.boolean().optional(),
  syncSettings: syncSettingsSchema,
})

const syncLogsSchema = z.object({
  projectId: z.number(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
})

const importIssuesSchema = z.object({
  projectId: z.number(),
  state: z.enum(['open', 'closed', 'all']).optional().default('all'),
  since: z.string().optional(), // ISO date string
  limit: z.number().min(1).max(1000).optional().default(100),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user has project write access
 */
async function checkProjectWriteAccess(
  userId: number,
  projectId: number
): Promise<void> {
  const hasPermission = await aclService.hasPermission(
    userId,
    'project',
    projectId,
    ACL_PERMISSIONS.WRITE
  )

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You need project write permission to manage GitHub settings',
    })
  }
}

/**
 * Check if user has project read access
 */
async function checkProjectReadAccess(
  userId: number,
  projectId: number
): Promise<void> {
  const hasPermission = await aclService.hasPermission(
    userId,
    'project',
    projectId,
    ACL_PERMISSIONS.READ
  )

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You need project read permission to view GitHub settings',
    })
  }
}

/**
 * Get workspace ID for a project
 */
async function getProjectWorkspaceId(
  prisma: typeof import('../../lib/prisma').prisma,
  projectId: number
): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })

  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    })
  }

  return project.workspaceId
}

// =============================================================================
// GitHub Project Router
// =============================================================================

export const githubRouter = router({
  /**
   * Link a GitHub repository to a project
   * Requires project WRITE permission
   */
  linkRepository: protectedProcedure
    .input(linkRepositorySchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, installationId, repoId, owner, name, fullName, defaultBranch, isPrivate, syncSettings } = input

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId)

      // Get workspace ID
      const workspaceId = await getProjectWorkspaceId(ctx.prisma, projectId)

      // Verify installation belongs to workspace
      const installation = await ctx.prisma.gitHubInstallation.findFirst({
        where: {
          id: installationId,
          workspaceId,
        },
      })

      if (!installation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'GitHub installation not found in this workspace',
        })
      }

      // Check if project already has a linked repository
      const existingRepo = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
      })

      if (existingRepo) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Project already has a linked GitHub repository. Unlink it first.',
        })
      }

      // Check if repository is already linked to another project
      const repoLinkedElsewhere = await ctx.prisma.gitHubRepository.findFirst({
        where: {
          owner,
          name,
        },
      })

      if (repoLinkedElsewhere) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Repository ${fullName} is already linked to another project`,
        })
      }

      // Create the repository link
      const repository = await ctx.prisma.gitHubRepository.create({
        data: {
          projectId,
          installationId,
          repoId: BigInt(repoId),
          owner,
          name,
          fullName,
          defaultBranch: defaultBranch || 'main',
          isPrivate: isPrivate || false,
          syncEnabled: true,
          syncSettings: (syncSettings || {}) as object,
        },
      })

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_REPO_LINKED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'project',
        resourceId: projectId,
        resourceName: fullName,
        metadata: {
          repositoryId: repository.id,
          owner,
          name,
          installationId,
        },
      })

      return {
        id: repository.id,
        projectId: repository.projectId,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        isPrivate: repository.isPrivate,
        syncEnabled: repository.syncEnabled,
        syncSettings: repository.syncSettings as GitHubSyncSettings,
      }
    }),

  /**
   * Unlink a GitHub repository from a project
   * Requires project WRITE permission
   */
  unlinkRepository: protectedProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId)

      // Get the linked repository
      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
      })

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        })
      }

      // Delete the repository link (cascade will delete issues, PRs, commits, logs)
      await ctx.prisma.gitHubRepository.delete({
        where: { id: repository.id },
      })

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_REPO_UNLINKED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'project',
        resourceId: projectId,
        resourceName: repository.fullName,
        metadata: {
          repositoryId: repository.id,
          owner: repository.owner,
          name: repository.name,
        },
      })

      return { success: true }
    }),

  /**
   * Get linked repository for a project
   * Requires project READ permission
   */
  getLinkedRepository: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = input

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId)

      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
        include: {
          installation: {
            select: {
              id: true,
              accountLogin: true,
              accountType: true,
            },
          },
          _count: {
            select: {
              issues: true,
              pullRequests: true,
              commits: true,
            },
          },
        },
      })

      if (!repository) {
        return null
      }

      return {
        id: repository.id,
        projectId: repository.projectId,
        owner: repository.owner,
        name: repository.name,
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
        isPrivate: repository.isPrivate,
        syncEnabled: repository.syncEnabled,
        syncSettings: repository.syncSettings as GitHubSyncSettings,
        lastSyncAt: repository.lastSyncAt,
        installation: repository.installation,
        counts: {
          issues: repository._count.issues,
          pullRequests: repository._count.pullRequests,
          commits: repository._count.commits,
        },
      }
    }),

  /**
   * Update sync settings for a linked repository
   * Requires project WRITE permission
   */
  updateSyncSettings: protectedProcedure
    .input(updateSyncSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, syncEnabled, syncSettings } = input

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId)

      // Get the linked repository
      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
      })

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        })
      }

      // Build update data
      const updateData: { syncEnabled?: boolean; syncSettings?: object } = {}
      if (syncEnabled !== undefined) {
        updateData.syncEnabled = syncEnabled
      }
      if (syncSettings !== undefined) {
        updateData.syncSettings = syncSettings as object
      }

      // Update repository
      const updated = await ctx.prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: updateData,
      })

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_SETTINGS_UPDATED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'project',
        resourceId: projectId,
        resourceName: repository.fullName,
        metadata: {
          repositoryId: repository.id,
          syncEnabled: updated.syncEnabled,
          syncSettings: updated.syncSettings,
        },
      })

      return {
        id: updated.id,
        syncEnabled: updated.syncEnabled,
        syncSettings: updated.syncSettings as GitHubSyncSettings,
      }
    }),

  /**
   * Trigger a manual sync for a repository
   * Requires project WRITE permission
   */
  triggerSync: protectedProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId)

      // Get the linked repository
      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
      })

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        })
      }

      if (!repository.syncEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Sync is disabled for this repository',
        })
      }

      // TODO: Fase 5-6 - Actually trigger sync process
      // For now, just log that sync was requested and update lastSyncAt

      await ctx.prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: { lastSyncAt: new Date() },
      })

      // Create sync log entry
      await ctx.prisma.gitHubSyncLog.create({
        data: {
          repositoryId: repository.id,
          action: 'manual_sync_triggered',
          direction: 'bidirectional',
          entityType: 'task',
          status: 'success',
          details: {
            triggeredBy: ctx.user.id,
            message: 'Manual sync triggered (sync implementation pending Fase 5-6)',
          },
        },
      })

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_SYNC_TRIGGERED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'project',
        resourceId: projectId,
        resourceName: repository.fullName,
        metadata: {
          repositoryId: repository.id,
        },
      })

      return {
        success: true,
        message: 'Sync triggered successfully (full sync implementation pending Fase 5-6)',
        lastSyncAt: new Date(),
      }
    }),

  /**
   * Get sync status for a repository
   * Requires project READ permission
   */
  getSyncStatus: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = input

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId)

      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
        select: {
          id: true,
          syncEnabled: true,
          lastSyncAt: true,
          _count: {
            select: {
              issues: true,
              pullRequests: true,
              commits: true,
              syncLogs: true,
            },
          },
        },
      })

      if (!repository) {
        return null
      }

      // Get last sync log
      const lastLog = await ctx.prisma.gitHubSyncLog.findFirst({
        where: { repositoryId: repository.id },
        orderBy: { createdAt: 'desc' },
      })

      return {
        syncEnabled: repository.syncEnabled,
        lastSyncAt: repository.lastSyncAt,
        lastSyncStatus: lastLog?.status || null,
        lastSyncAction: lastLog?.action || null,
        counts: {
          issues: repository._count.issues,
          pullRequests: repository._count.pullRequests,
          commits: repository._count.commits,
          syncLogs: repository._count.syncLogs,
        },
      }
    }),

  /**
   * Get sync logs for a repository
   * Requires project READ permission
   */
  getSyncLogs: protectedProcedure
    .input(syncLogsSchema)
    .query(async ({ ctx, input }) => {
      const { projectId, limit, offset } = input

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId)

      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
        select: { id: true },
      })

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        })
      }

      const [logs, total] = await Promise.all([
        ctx.prisma.gitHubSyncLog.findMany({
          where: { repositoryId: repository.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.gitHubSyncLog.count({
          where: { repositoryId: repository.id },
        }),
      ])

      return {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          direction: log.direction,
          entityType: log.entityType,
          entityId: log.entityId,
          status: log.status,
          errorMessage: log.errorMessage,
          details: log.details as Record<string, unknown>,
          createdAt: log.createdAt,
        })),
        total,
        hasMore: offset + logs.length < total,
      }
    }),

  /**
   * List available repositories from workspace installations
   * (for repository selector in project settings)
   * Requires project WRITE permission
   */
  listAvailableRepositories: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = input

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId)

      // Get workspace ID
      const workspaceId = await getProjectWorkspaceId(ctx.prisma, projectId)

      // Get all installations in workspace
      const installations = await ctx.prisma.gitHubInstallation.findMany({
        where: {
          workspaceId,
          suspendedAt: null,
        },
        select: {
          id: true,
          installationId: true,
          accountLogin: true,
          accountType: true,
        },
      })

      // Get already linked repositories
      const linkedRepos = await ctx.prisma.gitHubRepository.findMany({
        where: {
          installation: {
            workspaceId,
          },
        },
        select: {
          owner: true,
          name: true,
          projectId: true,
        },
      })

      // TODO: Fetch actual repositories from GitHub API for each installation
      // For now, return installation info only
      // Full implementation requires calling GitHub API

      return {
        installations: installations.map(inst => ({
          id: inst.id,
          installationId: inst.installationId.toString(),
          accountLogin: inst.accountLogin,
          accountType: inst.accountType,
          // repositories: [] // TODO: Fetch from GitHub API
        })),
        linkedRepositories: linkedRepos.map(r => ({
          fullName: `${r.owner}/${r.name}`,
          projectId: r.projectId,
        })),
        // Note: Actual repository list requires GitHub API call
        // This will be implemented when we need it
      }
    }),

  /**
   * Import issues from GitHub repository
   * Requires project WRITE permission
   */
  importIssues: protectedProcedure
    .input(importIssuesSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, state, since, limit } = input

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId)

      // Get the linked repository
      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
      })

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        })
      }

      if (!repository.syncEnabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Sync is disabled for this repository',
        })
      }

      // Check sync settings
      const syncSettings = repository.syncSettings as { issues?: { enabled: boolean; direction: string } } | null
      if (!syncSettings?.issues?.enabled) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Issue sync is disabled for this repository',
        })
      }

      // Start import
      const result = await importIssuesFromGitHub(repository.id, {
        state,
        since: since ? new Date(since) : undefined,
        limit,
      })

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_ISSUES_IMPORTED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'project',
        resourceId: projectId,
        resourceName: repository.fullName,
        metadata: {
          repositoryId: repository.id,
          imported: result.imported,
          skipped: result.skipped,
          failed: result.failed,
        },
      })

      return {
        success: true,
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
        errors: result.errors,
      }
    }),

  /**
   * Get import progress for a repository
   * Requires project READ permission
   */
  getImportProgress: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = input

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId)

      // Get the linked repository
      const repository = await ctx.prisma.gitHubRepository.findUnique({
        where: { projectId },
        select: { id: true },
      })

      if (!repository) {
        return null
      }

      const progress = getImportProgress(repository.id)

      // Clean up completed progress after retrieval
      if (progress?.status === 'completed' || progress?.status === 'failed') {
        clearImportProgress(repository.id)
      }

      return progress
    }),
})

export default githubRouter
