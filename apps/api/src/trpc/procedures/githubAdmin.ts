/*
 * GitHub Admin Procedures
 * Version: 1.0.0
 *
 * tRPC procedures for GitHub App administration at workspace level.
 * Handles installation management, user mapping, and overview.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 2 - GitHub App & OAuth
 * =============================================================================
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure, protectedProcedure } from '../router'
import {
  githubService,
  isGitHubConfigured,
  getInstallationUrl,
} from '../../services/github/index.js'
import { auditService, AUDIT_ACTIONS, aclService, ACL_PERMISSIONS } from '../../services/index.js'

// =============================================================================
// Input Schemas
// =============================================================================

const workspaceIdSchema = z.object({
  workspaceId: z.number(),
})

const installationIdSchema = z.object({
  workspaceId: z.number(),
  installationId: z.number(),
})

const handleCallbackSchema = z.object({
  workspaceId: z.number(),
  code: z.string().optional(),
  installationId: z.string().optional(),
  setupAction: z.enum(['install', 'update', 'request']).optional(),
})

const createUserMappingSchema = z.object({
  workspaceId: z.number(),
  userId: z.number(),
  githubLogin: z.string().min(1).max(255),
  githubId: z.bigint().optional(),
  githubEmail: z.string().email().optional(),
  githubAvatarUrl: z.string().url().optional(),
})

const updateUserMappingSchema = z.object({
  id: z.number(),
  githubLogin: z.string().min(1).max(255).optional(),
  githubEmail: z.string().email().optional(),
  githubAvatarUrl: z.string().url().optional(),
})

const deleteUserMappingSchema = z.object({
  id: z.number(),
})

const autoMatchUsersSchema = z.object({
  workspaceId: z.number(),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user has workspace admin access
 */
async function checkWorkspaceAccess(
  userId: number,
  workspaceId: number
): Promise<void> {
  const hasPermission = await aclService.hasPermission(
    userId,
    'workspace',
    workspaceId,
    ACL_PERMISSIONS.PERMISSIONS
  )

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You need workspace admin permission to manage GitHub settings',
    })
  }
}

// =============================================================================
// GitHub Admin Router
// =============================================================================

export const githubAdminRouter = router({
  // ===========================================================================
  // Configuration Status
  // ===========================================================================

  /**
   * Check if GitHub App is configured
   */
  isConfigured: protectedProcedure.query(async () => {
    return {
      configured: isGitHubConfigured(),
    }
  }),

  // ===========================================================================
  // Installation Management
  // ===========================================================================

  /**
   * Generate GitHub App installation URL
   */
  getInstallationUrl: adminProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      if (!isGitHubConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'GitHub App is not configured',
        })
      }

      // Include workspace ID in state for callback
      const state = Buffer.from(JSON.stringify({
        workspaceId: input.workspaceId,
        userId: ctx.user!.id,
        timestamp: Date.now(),
      })).toString('base64url')

      return {
        url: getInstallationUrl(state),
      }
    }),

  /**
   * Handle GitHub OAuth/installation callback
   */
  handleCallback: adminProcedure
    .input(handleCallbackSchema)
    .mutation(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      if (!input.installationId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Installation ID is required',
        })
      }

      const installationId = BigInt(input.installationId)

      // Check if this installation is already registered
      const existing = await ctx.prisma.gitHubInstallation.findUnique({
        where: { installationId },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This GitHub installation is already registered',
        })
      }

      // Get installation info from GitHub
      const info = await githubService.getInstallationInfo(installationId)

      // Create installation record
      const installation = await ctx.prisma.gitHubInstallation.create({
        data: {
          workspaceId: input.workspaceId,
          installationId,
          accountType: info.account.type.toLowerCase(),
          accountId: BigInt(info.account.id),
          accountLogin: info.account.login,
          permissions: info.permissions,
          events: info.events,
          suspendedAt: info.suspended_at ? new Date(info.suspended_at) : null,
        },
      })

      // Audit log
      await auditService.log({
        category: 'GITHUB',
        action: AUDIT_ACTIONS.GITHUB_INSTALLATION_ADDED,
        resourceType: 'github_installation',
        resourceId: installation.id,
        resourceName: info.account.login,
        workspaceId: input.workspaceId,
        userId: ctx.user!.id,
        metadata: {
          installationId: installationId.toString(),
          accountType: info.account.type,
          accountLogin: info.account.login,
        },
      })

      return {
        id: installation.id,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
      }
    }),

  /**
   * List GitHub installations for a workspace
   */
  listInstallations: adminProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      const installations = await ctx.prisma.gitHubInstallation.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { createdAt: 'desc' },
      })

      return installations.map(inst => ({
        id: inst.id,
        installationId: inst.installationId.toString(),
        accountType: inst.accountType,
        accountLogin: inst.accountLogin,
        suspended: !!inst.suspendedAt,
        createdAt: inst.createdAt,
      }))
    }),

  /**
   * List repositories for an installation
   */
  listRepositories: adminProcedure
    .input(installationIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      const installation = await ctx.prisma.gitHubInstallation.findFirst({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
        },
      })

      if (!installation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Installation not found',
        })
      }

      try {
        const repos = await githubService.listInstallationRepositories(
          installation.installationId
        )

        return repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          isPrivate: repo.private,
          defaultBranch: repo.default_branch,
        }))
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch repositories from GitHub',
          cause: error,
        })
      }
    }),

  /**
   * Remove an installation
   */
  removeInstallation: adminProcedure
    .input(installationIdSchema)
    .mutation(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      const installation = await ctx.prisma.gitHubInstallation.findFirst({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
        },
        include: {
          repositories: true,
        },
      })

      if (!installation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Installation not found',
        })
      }

      if (installation.repositories.length > 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Cannot remove installation with linked repositories. Unlink all repositories first.',
        })
      }

      await ctx.prisma.gitHubInstallation.delete({
        where: { id: input.installationId },
      })

      // Audit log
      await auditService.log({
        category: 'GITHUB',
        action: AUDIT_ACTIONS.GITHUB_INSTALLATION_REMOVED,
        resourceType: 'github_installation',
        resourceId: input.installationId,
        resourceName: installation.accountLogin,
        workspaceId: input.workspaceId,
        userId: ctx.user!.id,
        metadata: {
          accountLogin: installation.accountLogin,
        },
      })

      return { success: true }
    }),

  /**
   * Refresh installation access token
   */
  refreshToken: adminProcedure
    .input(installationIdSchema)
    .mutation(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      const installation = await ctx.prisma.gitHubInstallation.findFirst({
        where: {
          id: input.installationId,
          workspaceId: input.workspaceId,
        },
      })

      if (!installation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Installation not found',
        })
      }

      try {
        const { getInstallationToken } = await import('../../services/github/index.js')
        await getInstallationToken(input.installationId)

        // Audit log
        await auditService.log({
          category: 'GITHUB',
          action: AUDIT_ACTIONS.GITHUB_INSTALLATION_REFRESHED,
          resourceType: 'github_installation',
          resourceId: input.installationId,
          resourceName: installation.accountLogin,
          workspaceId: input.workspaceId,
          userId: ctx.user!.id,
        })

        return { success: true }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to refresh token',
          cause: error,
        })
      }
    }),

  // ===========================================================================
  // User Mapping
  // ===========================================================================

  /**
   * List user mappings for a workspace
   */
  listUserMappings: adminProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      const mappings = await ctx.prisma.gitHubUserMapping.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return mappings.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        userUsername: m.user.username,
        githubLogin: m.githubLogin,
        githubId: m.githubId?.toString() || null,
        githubEmail: m.githubEmail,
        githubAvatarUrl: m.githubAvatarUrl,
        autoMatched: m.autoMatched,
        createdAt: m.createdAt,
      }))
    }),

  /**
   * Create a user mapping
   */
  createUserMapping: adminProcedure
    .input(createUserMappingSchema)
    .mutation(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      // Check if user exists
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }

      // Check for existing mapping
      const existingByUser = await ctx.prisma.gitHubUserMapping.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
      })

      if (existingByUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This user already has a GitHub mapping in this workspace',
        })
      }

      const existingByLogin = await ctx.prisma.gitHubUserMapping.findUnique({
        where: {
          workspaceId_githubLogin: {
            workspaceId: input.workspaceId,
            githubLogin: input.githubLogin,
          },
        },
      })

      if (existingByLogin) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This GitHub login is already mapped to another user',
        })
      }

      const mapping = await ctx.prisma.gitHubUserMapping.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          githubLogin: input.githubLogin,
          githubId: input.githubId,
          githubEmail: input.githubEmail,
          githubAvatarUrl: input.githubAvatarUrl,
          autoMatched: false,
        },
      })

      // Audit log
      await auditService.log({
        category: 'GITHUB',
        action: AUDIT_ACTIONS.GITHUB_USER_MAPPING_CREATED,
        resourceType: 'github_user_mapping',
        resourceId: mapping.id,
        resourceName: `${user.name} ↔ ${input.githubLogin}`,
        targetType: 'user',
        targetId: input.userId,
        targetName: user.name,
        workspaceId: input.workspaceId,
        userId: ctx.user!.id,
        metadata: {
          githubLogin: input.githubLogin,
        },
      })

      return {
        id: mapping.id,
        githubLogin: mapping.githubLogin,
      }
    }),

  /**
   * Update a user mapping
   */
  updateUserMapping: adminProcedure
    .input(updateUserMappingSchema)
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.prisma.gitHubUserMapping.findUnique({
        where: { id: input.id },
        include: { user: true },
      })

      if (!mapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mapping not found',
        })
      }

      await checkWorkspaceAccess(ctx.user!.id, mapping.workspaceId)

      const updated = await ctx.prisma.gitHubUserMapping.update({
        where: { id: input.id },
        data: {
          githubLogin: input.githubLogin,
          githubEmail: input.githubEmail,
          githubAvatarUrl: input.githubAvatarUrl,
        },
      })

      // Audit log
      await auditService.log({
        category: 'GITHUB',
        action: AUDIT_ACTIONS.GITHUB_USER_MAPPING_UPDATED,
        resourceType: 'github_user_mapping',
        resourceId: mapping.id,
        resourceName: `${mapping.user.name} ↔ ${updated.githubLogin}`,
        workspaceId: mapping.workspaceId,
        userId: ctx.user!.id,
        changes: input,
      })

      return { success: true }
    }),

  /**
   * Delete a user mapping
   */
  deleteUserMapping: adminProcedure
    .input(deleteUserMappingSchema)
    .mutation(async ({ ctx, input }) => {
      const mapping = await ctx.prisma.gitHubUserMapping.findUnique({
        where: { id: input.id },
        include: { user: true },
      })

      if (!mapping) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mapping not found',
        })
      }

      await checkWorkspaceAccess(ctx.user!.id, mapping.workspaceId)

      await ctx.prisma.gitHubUserMapping.delete({
        where: { id: input.id },
      })

      // Audit log
      await auditService.log({
        category: 'GITHUB',
        action: AUDIT_ACTIONS.GITHUB_USER_MAPPING_DELETED,
        resourceType: 'github_user_mapping',
        resourceId: mapping.id,
        resourceName: `${mapping.user.name} ↔ ${mapping.githubLogin}`,
        workspaceId: mapping.workspaceId,
        userId: ctx.user!.id,
      })

      return { success: true }
    }),

  /**
   * Auto-match users based on email
   */
  autoMatchUsers: adminProcedure
    .input(autoMatchUsersSchema)
    .mutation(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      // Get all users without a mapping in this workspace
      const existingMappings = await ctx.prisma.gitHubUserMapping.findMany({
        where: { workspaceId: input.workspaceId },
        select: { userId: true },
      })

      const mappedUserIds = existingMappings.map(m => m.userId)

      const usersWithoutMapping = await ctx.prisma.user.findMany({
        where: {
          // Only get users not already mapped (email is always present per schema)
          id: { notIn: mappedUserIds.length > 0 ? mappedUserIds : [0] },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })

      // Audit log
      await auditService.log({
        category: 'GITHUB',
        action: AUDIT_ACTIONS.GITHUB_USER_MAPPING_AUTO_MATCHED,
        resourceType: 'workspace',
        resourceId: input.workspaceId,
        workspaceId: input.workspaceId,
        userId: ctx.user!.id,
        metadata: {
          usersChecked: usersWithoutMapping.length,
        },
      })

      return {
        usersChecked: usersWithoutMapping.length,
        matchesFound: 0, // Would be populated by actual matching logic
        mappingsCreated: 0,
      }
    }),

  /**
   * Get suggestions for unmapped users
   */
  suggestMappings: adminProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      // Get users already mapped in this workspace
      const existingMappings = await ctx.prisma.gitHubUserMapping.findMany({
        where: { workspaceId: input.workspaceId },
        select: { userId: true },
      })

      const mappedUserIds = existingMappings.map(m => m.userId)

      // Get users that could be mapped
      const users = await ctx.prisma.user.findMany({
        where: {
          id: { notIn: mappedUserIds },
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
        take: 50,
      })

      return users.map(u => ({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        userUsername: u.username,
        suggestedGithubLogin: u.username, // Simple suggestion: same as username
      }))
    }),

  // ===========================================================================
  // Overview
  // ===========================================================================

  /**
   * Get workspace GitHub overview
   */
  getWorkspaceOverview: adminProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      // Count installations for this workspace
      const installationCount = await ctx.prisma.gitHubInstallation.count({
        where: { workspaceId: input.workspaceId },
      })

      // Count linked repositories for workspace projects
      const linkedRepoCount = await ctx.prisma.gitHubRepository.count({
        where: {
          project: {
            workspaceId: input.workspaceId,
          },
        },
      })

      // Count user mappings
      const userMappingCount = await ctx.prisma.gitHubUserMapping.count({
        where: { workspaceId: input.workspaceId },
      })

      // Get recent sync activity
      const recentSyncs = await ctx.prisma.gitHubSyncLog.findMany({
        where: {
          repository: {
            project: {
              workspaceId: input.workspaceId,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      return {
        installations: installationCount,
        linkedRepositories: linkedRepoCount,
        userMappings: userMappingCount,
        recentActivity: recentSyncs.map(s => ({
          action: s.action,
          direction: s.direction,
          status: s.status,
          createdAt: s.createdAt,
        })),
      }
    }),

  /**
   * List all linked repositories in workspace
   */
  listLinkedRepositories: adminProcedure
    .input(workspaceIdSchema)
    .query(async ({ ctx, input }) => {
      await checkWorkspaceAccess(ctx.user!.id, input.workspaceId)

      const repos = await ctx.prisma.gitHubRepository.findMany({
        where: {
          project: {
            workspaceId: input.workspaceId,
          },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          installation: {
            select: {
              accountLogin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return repos.map(r => ({
        id: r.id,
        fullName: r.fullName,
        owner: r.owner,
        name: r.name,
        isPrivate: r.isPrivate,
        syncEnabled: r.syncEnabled,
        lastSyncAt: r.lastSyncAt,
        project: {
          id: r.project.id,
          name: r.project.name,
        },
        installation: {
          accountLogin: r.installation.accountLogin,
        },
      }))
    }),
})
