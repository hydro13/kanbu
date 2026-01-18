/*
 * GitHub Project Procedures
 * Version: 6.0.0
 *
 * tRPC procedures for GitHub repository management at project level.
 * Handles repository linking, sync settings, sync operations, PR/commit tracking,
 * automation, CI/CD, milestones, releases, and AI-powered features.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 16 - AI/Claude Integratie
 * =============================================================================
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../router';
import { aclService, ACL_PERMISSIONS, auditService, AUDIT_ACTIONS } from '../../services/index.js';
import {
  importIssuesFromGitHub,
  getImportProgress,
  clearImportProgress,
  createGitHubIssueFromTask,
  updateGitHubIssueFromTask,
  syncTaskToGitHub,
} from '../../services/github/issueSyncService';
import {
  getTaskPRs,
  getTaskCommits,
  linkPRToTask,
  unlinkPRFromTask,
  linkCommitToTask,
  unlinkCommitFromTask,
} from '../../services/github/prCommitLinkService';
import {
  createBranchForTask,
  generateBranchName,
  getAutomationSettings,
} from '../../services/github/automationService';
import {
  getWorkflowRuns,
  getWorkflowRunDetails,
  getTaskWorkflowRuns,
  getWorkflowJobs,
  getWorkflowStats,
  rerunWorkflow,
  rerunFailedJobs,
  cancelWorkflow,
} from '../../services/github/workflowService';
import {
  getReviewsForPR,
  getPRReviewSummary,
  getReviewsForTask,
  getTaskReviewSummary,
  requestReview,
  getSuggestedReviewers,
  getPendingReviewRequests,
  syncReviewsFromGitHub,
} from '../../services/github/reviewService';
import {
  getCycleTimeStats,
  getReviewTimeStats,
  getContributorStats,
  getThroughputStats,
  getProjectAnalytics,
} from '../../services/github/analyticsService';
import {
  getMilestoneByNumber,
  getProjectMilestones,
  getMilestoneStats,
  importMilestonesFromGitHub,
} from '../../services/github/milestoneService';
import {
  getReleaseByTag,
  getLatestRelease,
  getProjectReleases,
  getReleaseStats,
  generateReleaseNotes,
} from '../../services/github/releaseService';
import {
  isAIConfigured,
  getAIProvider,
  generatePRSummary,
  reviewCode,
  generateReleaseNotes as generateAIReleaseNotes,
  generateCommitMessage,
} from '../../services/github/aiService';
import type { GitHubSyncSettings } from '@kanbu/shared';

// =============================================================================
// Input Schemas
// =============================================================================

const projectIdSchema = z.object({
  projectId: z.number(),
});

const syncSettingsSchema = z
  .object({
    issues: z
      .object({
        enabled: z.boolean(),
        direction: z.enum(['kanbu_to_github', 'github_to_kanbu', 'bidirectional']),
        labelMapping: z.record(z.string(), z.string()).optional(),
        stateMapping: z.record(z.string(), z.string()).optional(),
      })
      .optional(),
    pullRequests: z
      .object({
        enabled: z.boolean(),
        autoLink: z.boolean(),
      })
      .optional(),
    commits: z
      .object({
        enabled: z.boolean(),
        autoLink: z.boolean(),
        pattern: z.string().optional(),
      })
      .optional(),
    branches: z
      .object({
        enabled: z.boolean(),
        pattern: z.string(),
      })
      .optional(),
  })
  .optional();

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
});

const updateSyncSettingsSchema = z.object({
  projectId: z.number(),
  syncEnabled: z.boolean().optional(),
  syncSettings: syncSettingsSchema,
});

const syncLogsSchema = z.object({
  projectId: z.number(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

const importIssuesSchema = z.object({
  projectId: z.number(),
  state: z.enum(['open', 'closed', 'all']).optional().default('all'),
  since: z.string().optional(), // ISO date string
  limit: z.number().min(1).max(1000).optional().default(100),
});

const taskIdSchema = z.object({
  taskId: z.number(),
});

const syncTaskSchema = z.object({
  taskId: z.number(),
  force: z.boolean().optional().default(false),
});

const prIdSchema = z.object({
  prId: z.number(),
});

const linkPRSchema = z.object({
  prId: z.number(),
  taskId: z.number(),
});

const commitIdSchema = z.object({
  commitId: z.number(),
});

const linkCommitSchema = z.object({
  commitId: z.number(),
  taskId: z.number(),
});

const projectPRsSchema = z.object({
  projectId: z.number(),
  state: z.enum(['open', 'closed', 'merged', 'all']).optional().default('all'),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

const projectCommitsSchema = z.object({
  projectId: z.number(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

const createBranchSchema = z.object({
  taskId: z.number(),
  customBranchName: z.string().optional(),
});

const previewBranchNameSchema = z.object({
  taskId: z.number(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user has project write access
 */
async function checkProjectWriteAccess(userId: number, projectId: number): Promise<void> {
  const hasPermission = await aclService.hasPermission(
    userId,
    'project',
    projectId,
    ACL_PERMISSIONS.WRITE
  );

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You need project write permission to manage GitHub settings',
    });
  }
}

/**
 * Check if user has project read access
 */
async function checkProjectReadAccess(userId: number, projectId: number): Promise<void> {
  const hasPermission = await aclService.hasPermission(
    userId,
    'project',
    projectId,
    ACL_PERMISSIONS.READ
  );

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You need project read permission to view GitHub settings',
    });
  }
}

/**
 * Get task with project info and check write access
 */
async function getTaskWithProjectAccess(
  prisma: typeof import('../../lib/prisma').prisma,
  userId: number,
  taskId: number
): Promise<{
  task: { id: number; projectId: number; title: string; reference: string | null };
  projectId: number;
}> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      title: true,
      reference: true,
    },
  });

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found',
    });
  }

  // Check project write permission
  await checkProjectWriteAccess(userId, task.projectId);

  return { task, projectId: task.projectId };
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
  });

  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    });
  }

  return project.workspaceId;
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
      const {
        projectId,
        installationId,
        repoId,
        owner,
        name,
        fullName,
        defaultBranch,
        isPrivate,
        syncSettings,
      } = input;

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId);

      // Get workspace ID
      const workspaceId = await getProjectWorkspaceId(ctx.prisma, projectId);

      // Verify installation belongs to workspace
      const installation = await ctx.prisma.gitHubInstallation.findFirst({
        where: {
          id: installationId,
          workspaceId,
        },
      });

      if (!installation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'GitHub installation not found in this workspace',
        });
      }

      // Check if project already has a linked repository
      const existingRepo = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId },
      });

      if (existingRepo) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Project already has a linked GitHub repository. Unlink it first.',
        });
      }

      // Check if repository is already linked to another project
      const repoLinkedElsewhere = await ctx.prisma.gitHubRepository.findFirst({
        where: {
          owner,
          name,
        },
      });

      if (repoLinkedElsewhere) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Repository ${fullName} is already linked to another project`,
        });
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
      });

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
      });

      // Initial sync: import milestones from GitHub
      try {
        await importMilestonesFromGitHub(repository.id, { state: 'all' });
        console.log(`[GitHub] Initial milestone sync completed for ${fullName}`);
      } catch (error) {
        // Don't fail the link operation if milestone sync fails
        console.error(`[GitHub] Initial milestone sync failed for ${fullName}:`, error);
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
      };
    }),

  /**
   * Unlink a GitHub repository from a project
   * Requires project WRITE permission
   */
  unlinkRepository: protectedProcedure.input(projectIdSchema).mutation(async ({ ctx, input }) => {
    const { projectId } = input;

    // Check project write permission
    await checkProjectWriteAccess(ctx.user.id, projectId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
    }

    // Delete the repository link (cascade will delete issues, PRs, commits, logs)
    await ctx.prisma.gitHubRepository.delete({
      where: { id: repository.id },
    });

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
    });

    return { success: true };
  }),

  /**
   * Get linked repository for a project
   * Requires project READ permission
   */
  getLinkedRepository: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    const { projectId } = input;

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, projectId);

    const repository = await ctx.prisma.gitHubRepository.findFirst({
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
    });

    if (!repository) {
      return null;
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
    };
  }),

  /**
   * Update sync settings for a linked repository
   * Requires project WRITE permission
   */
  updateSyncSettings: protectedProcedure
    .input(updateSyncSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, syncEnabled, syncSettings } = input;

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId);

      // Get the linked repository
      const repository = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId },
      });

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        });
      }

      // Build update data
      const updateData: { syncEnabled?: boolean; syncSettings?: object } = {};
      if (syncEnabled !== undefined) {
        updateData.syncEnabled = syncEnabled;
      }
      if (syncSettings !== undefined) {
        updateData.syncSettings = syncSettings as object;
      }

      // Update repository
      const updated = await ctx.prisma.gitHubRepository.update({
        where: { id: repository.id },
        data: updateData,
      });

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
      });

      return {
        id: updated.id,
        syncEnabled: updated.syncEnabled,
        syncSettings: updated.syncSettings as GitHubSyncSettings,
      };
    }),

  /**
   * Trigger a manual sync for a repository
   * Requires project WRITE permission
   */
  triggerSync: protectedProcedure.input(projectIdSchema).mutation(async ({ ctx, input }) => {
    const { projectId } = input;

    // Check project write permission
    await checkProjectWriteAccess(ctx.user.id, projectId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
    }

    if (!repository.syncEnabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sync is disabled for this repository',
      });
    }

    // Perform the actual issue sync from GitHub to Kanbu
    let syncResult;
    try {
      syncResult = await importIssuesFromGitHub(repository.id, {
        state: 'all', // Sync both open and closed issues
      });
    } catch (error) {
      // Log failed sync attempt
      await ctx.prisma.gitHubSyncLog.create({
        data: {
          repositoryId: repository.id,
          action: 'manual_sync_triggered',
          direction: 'github_to_kanbu',
          entityType: 'issue',
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          details: {
            triggeredBy: ctx.user.id,
          },
        },
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

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
        imported: syncResult.imported,
        skipped: syncResult.skipped,
        failed: syncResult.failed,
      },
    });

    return {
      success: true,
      message: `Sync completed: ${syncResult.imported} imported, ${syncResult.skipped} skipped, ${syncResult.failed} failed`,
      lastSyncAt: new Date(),
      result: syncResult,
    };
  }),

  /**
   * Get sync status for a repository
   * Requires project READ permission
   */
  getSyncStatus: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    const { projectId } = input;

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, projectId);

    const repository = await ctx.prisma.gitHubRepository.findFirst({
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
    });

    if (!repository) {
      return null;
    }

    // Get last sync log
    const lastLog = await ctx.prisma.gitHubSyncLog.findFirst({
      where: { repositoryId: repository.id },
      orderBy: { createdAt: 'desc' },
    });

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
    };
  }),

  /**
   * Get sync logs for a repository
   * Requires project READ permission
   */
  getSyncLogs: protectedProcedure.input(syncLogsSchema).query(async ({ ctx, input }) => {
    const { projectId, limit, offset } = input;

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, projectId);

    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { id: true },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
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
    ]);

    return {
      logs: logs.map((log) => ({
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
    };
  }),

  /**
   * List available repositories from workspace installations
   * (for repository selector in project settings)
   * Requires project WRITE permission
   */
  listAvailableRepositories: protectedProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const { projectId } = input;

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, projectId);

      // Get workspace ID
      const workspaceId = await getProjectWorkspaceId(ctx.prisma, projectId);

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
      });

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
      });

      // TODO: Fetch actual repositories from GitHub API for each installation
      // For now, return installation info only
      // Full implementation requires calling GitHub API

      return {
        installations: installations.map((inst) => ({
          id: inst.id,
          installationId: inst.installationId.toString(),
          accountLogin: inst.accountLogin,
          accountType: inst.accountType,
          // repositories: [] // TODO: Fetch from GitHub API
        })),
        linkedRepositories: linkedRepos.map((r) => ({
          fullName: `${r.owner}/${r.name}`,
          projectId: r.projectId,
        })),
        // Note: Actual repository list requires GitHub API call
        // This will be implemented when we need it
      };
    }),

  /**
   * Import issues from GitHub repository
   * Requires project WRITE permission
   */
  importIssues: protectedProcedure.input(importIssuesSchema).mutation(async ({ ctx, input }) => {
    const { projectId, state, since, limit } = input;

    // Check project write permission
    await checkProjectWriteAccess(ctx.user.id, projectId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
    }

    if (!repository.syncEnabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sync is disabled for this repository',
      });
    }

    // Check sync settings
    const syncSettings = repository.syncSettings as {
      issues?: { enabled: boolean; direction: string };
    } | null;
    if (!syncSettings?.issues?.enabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Issue sync is disabled for this repository',
      });
    }

    // Start import
    const result = await importIssuesFromGitHub(repository.id, {
      state,
      since: since ? new Date(since) : undefined,
      limit,
    });

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
    });

    return {
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors,
    };
  }),

  /**
   * Get import progress for a repository
   * Requires project READ permission
   */
  getImportProgress: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    const { projectId } = input;

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, projectId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { id: true },
    });

    if (!repository) {
      return null;
    }

    const progress = getImportProgress(repository.id);

    // Clean up completed progress after retrieval
    if (progress?.status === 'completed' || progress?.status === 'failed') {
      clearImportProgress(repository.id);
    }

    return progress;
  }),

  // ===========================================================================
  // Outbound Sync (Kanbu → GitHub) - Fase 6
  // ===========================================================================

  /**
   * Create a GitHub issue from a task
   * Requires project WRITE permission
   */
  createIssueFromTask: protectedProcedure.input(taskIdSchema).mutation(async ({ ctx, input }) => {
    const { taskId } = input;

    // Get task and check access
    const { task, projectId } = await getTaskWithProjectAccess(ctx.prisma, ctx.user.id, taskId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { id: true, fullName: true, syncEnabled: true, syncSettings: true },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
    }

    if (!repository.syncEnabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sync is disabled for this repository',
      });
    }

    // Check sync settings
    const syncSettings = repository.syncSettings as {
      issues?: { enabled: boolean; direction: string };
    } | null;
    if (!syncSettings?.issues?.enabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Issue sync is disabled for this repository',
      });
    }

    // Check direction allows outbound
    const direction = syncSettings.issues.direction;
    if (direction !== 'kanbu_to_github' && direction !== 'bidirectional') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Outbound sync is not enabled for this repository',
      });
    }

    // Create GitHub issue
    const result = await createGitHubIssueFromTask(taskId, {
      syncDirection: direction as 'kanbu_to_github' | 'bidirectional',
    });

    // Audit log
    await auditService.log({
      userId: ctx.user.id,
      action: 'GITHUB_ISSUE_CREATED' as keyof typeof AUDIT_ACTIONS,
      category: 'WORKSPACE',
      resourceType: 'task',
      resourceId: taskId,
      resourceName: task.reference ?? undefined,
      metadata: {
        repositoryId: repository.id,
        issueNumber: result.issueNumber,
        taskTitle: task.title,
      },
    });

    return {
      success: true,
      issueNumber: result.issueNumber,
      issueUrl: `https://github.com/${repository.fullName}/issues/${result.issueNumber}`,
    };
  }),

  /**
   * Update a GitHub issue from a task
   * Requires project WRITE permission
   */
  updateIssueFromTask: protectedProcedure.input(syncTaskSchema).mutation(async ({ ctx, input }) => {
    const { taskId, force } = input;

    // Get task and check access
    const { task, projectId } = await getTaskWithProjectAccess(ctx.prisma, ctx.user.id, taskId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { id: true, fullName: true, syncEnabled: true, syncSettings: true },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
    }

    if (!repository.syncEnabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sync is disabled for this repository',
      });
    }

    // Check if task has a linked issue
    const githubIssue = await ctx.prisma.gitHubIssue.findUnique({
      where: { taskId },
    });

    if (!githubIssue) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task has no linked GitHub issue',
      });
    }

    // Update GitHub issue
    const result = await updateGitHubIssueFromTask(taskId, { force });

    // Audit log
    if (result.updated) {
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_ISSUE_UPDATED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'task',
        resourceId: taskId,
        resourceName: task.reference ?? undefined,
        metadata: {
          repositoryId: repository.id,
          issueNumber: result.issueNumber,
          taskTitle: task.title,
        },
      });
    }

    return {
      success: true,
      updated: result.updated,
      issueNumber: result.issueNumber,
      issueUrl: `https://github.com/${repository.fullName}/issues/${result.issueNumber}`,
    };
  }),

  /**
   * Sync a task to GitHub (create or update)
   * Requires project WRITE permission
   */
  syncTaskToGitHub: protectedProcedure.input(syncTaskSchema).mutation(async ({ ctx, input }) => {
    const { taskId, force } = input;

    // Get task and check access
    const { task, projectId } = await getTaskWithProjectAccess(ctx.prisma, ctx.user.id, taskId);

    // Get the linked repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { id: true, fullName: true, syncEnabled: true, syncSettings: true },
    });

    if (!repository) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No GitHub repository linked to this project',
      });
    }

    if (!repository.syncEnabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Sync is disabled for this repository',
      });
    }

    // Check sync settings
    const syncSettings = repository.syncSettings as {
      issues?: { enabled: boolean; direction: string };
    } | null;
    if (!syncSettings?.issues?.enabled) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Issue sync is disabled for this repository',
      });
    }

    // Check direction allows outbound
    const direction = syncSettings.issues.direction;
    if (direction !== 'kanbu_to_github' && direction !== 'bidirectional') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Outbound sync is not enabled for this repository',
      });
    }

    // Sync task to GitHub
    const result = await syncTaskToGitHub(taskId, {
      syncDirection: direction as 'kanbu_to_github' | 'bidirectional',
      force,
    });

    // Audit log
    if (result.created || result.updated) {
      await auditService.log({
        userId: ctx.user.id,
        action: result.created
          ? ('GITHUB_ISSUE_CREATED' as keyof typeof AUDIT_ACTIONS)
          : ('GITHUB_ISSUE_UPDATED' as keyof typeof AUDIT_ACTIONS),
        category: 'WORKSPACE',
        resourceType: 'task',
        resourceId: taskId,
        resourceName: task.reference ?? undefined,
        metadata: {
          repositoryId: repository.id,
          issueNumber: result.issueNumber,
          taskTitle: task.title,
          created: result.created,
          updated: result.updated,
        },
      });
    }

    return {
      success: true,
      created: result.created,
      updated: result.updated,
      issueNumber: result.issueNumber,
      issueUrl: `https://github.com/${repository.fullName}/issues/${result.issueNumber}`,
    };
  }),

  // ===========================================================================
  // PR & Commit Tracking - Fase 7
  // ===========================================================================

  /**
   * Get PRs linked to a task
   * Requires project READ permission
   */
  getTaskPRs: protectedProcedure.input(taskIdSchema).query(async ({ ctx, input }) => {
    const { taskId } = input;

    // Get task
    const task = await ctx.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, task.projectId);

    // Get PRs
    const prs = await getTaskPRs(taskId);

    return {
      prs: prs.map((pr) => ({
        id: pr.id,
        prNumber: pr.prNumber,
        title: pr.title,
        state: pr.state,
        headBranch: pr.headBranch,
        baseBranch: pr.baseBranch,
        authorLogin: pr.authorLogin,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
        createdAt: pr.createdAt,
        repository: {
          owner: pr.repository.owner,
          name: pr.repository.name,
          fullName: pr.repository.fullName,
        },
        url: `https://github.com/${pr.repository.fullName}/pull/${pr.prNumber}`,
      })),
    };
  }),

  /**
   * Get commits linked to a task
   * Requires project READ permission
   */
  getTaskCommits: protectedProcedure.input(taskIdSchema).query(async ({ ctx, input }) => {
    const { taskId } = input;

    // Get task
    const task = await ctx.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, task.projectId);

    // Get commits
    const commits = await getTaskCommits(taskId);

    return {
      commits: commits.map((commit) => ({
        id: commit.id,
        sha: commit.sha,
        message: commit.message,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        authorLogin: commit.authorLogin,
        committedAt: commit.committedAt,
        createdAt: commit.createdAt,
        repository: {
          owner: commit.repository.owner,
          name: commit.repository.name,
          fullName: commit.repository.fullName,
        },
        url: `https://github.com/${commit.repository.fullName}/commit/${commit.sha}`,
      })),
    };
  }),

  /**
   * List all PRs in a project
   * Requires project READ permission
   */
  listProjectPRs: protectedProcedure.input(projectPRsSchema).query(async ({ ctx, input }) => {
    const { projectId, state, limit, offset } = input;

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, projectId);

    // Get repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { id: true, owner: true, name: true, fullName: true },
    });

    if (!repository) {
      return { prs: [], total: 0, hasMore: false };
    }

    // Build state filter
    const stateFilter = state === 'all' ? {} : { state };

    const [prs, total] = await Promise.all([
      ctx.prisma.gitHubPullRequest.findMany({
        where: {
          repositoryId: repository.id,
          ...stateFilter,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          task: {
            select: { id: true, reference: true, title: true },
          },
        },
      }),
      ctx.prisma.gitHubPullRequest.count({
        where: {
          repositoryId: repository.id,
          ...stateFilter,
        },
      }),
    ]);

    return {
      prs: prs.map((pr) => ({
        id: pr.id,
        prNumber: pr.prNumber,
        title: pr.title,
        state: pr.state,
        headBranch: pr.headBranch,
        baseBranch: pr.baseBranch,
        authorLogin: pr.authorLogin,
        mergedAt: pr.mergedAt,
        closedAt: pr.closedAt,
        createdAt: pr.createdAt,
        task: pr.task,
        url: `https://github.com/${repository.fullName}/pull/${pr.prNumber}`,
      })),
      total,
      hasMore: offset + prs.length < total,
    };
  }),

  /**
   * List all commits in a project
   * Requires project READ permission
   */
  listProjectCommits: protectedProcedure
    .input(projectCommitsSchema)
    .query(async ({ ctx, input }) => {
      const { projectId, limit, offset } = input;

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId);

      // Get repository
      const repository = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId },
        select: { id: true, owner: true, name: true, fullName: true },
      });

      if (!repository) {
        return { commits: [], total: 0, hasMore: false };
      }

      const [commits, total] = await Promise.all([
        ctx.prisma.gitHubCommit.findMany({
          where: { repositoryId: repository.id },
          orderBy: { committedAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            task: {
              select: { id: true, reference: true, title: true },
            },
          },
        }),
        ctx.prisma.gitHubCommit.count({
          where: { repositoryId: repository.id },
        }),
      ]);

      return {
        commits: commits.map((commit) => ({
          id: commit.id,
          sha: commit.sha,
          message: commit.message,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          authorLogin: commit.authorLogin,
          committedAt: commit.committedAt,
          createdAt: commit.createdAt,
          task: commit.task,
          url: `https://github.com/${repository.fullName}/commit/${commit.sha}`,
        })),
        total,
        hasMore: offset + commits.length < total,
      };
    }),

  /**
   * Manually link a PR to a task
   * Requires project WRITE permission
   */
  linkPRToTask: protectedProcedure.input(linkPRSchema).mutation(async ({ ctx, input }) => {
    const { prId, taskId } = input;

    // Get task and check access
    const { task, projectId } = await getTaskWithProjectAccess(ctx.prisma, ctx.user.id, taskId);

    // Get PR and verify it belongs to the same project
    const pr = await ctx.prisma.gitHubPullRequest.findUnique({
      where: { id: prId },
      include: {
        repository: {
          select: { projectId: true, fullName: true },
        },
      },
    });

    if (!pr) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Pull request not found',
      });
    }

    if (pr.repository.projectId !== projectId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Pull request belongs to a different project',
      });
    }

    // Link PR to task
    const result = await linkPRToTask(prId, taskId);

    // Audit log
    await auditService.log({
      userId: ctx.user.id,
      action: 'GITHUB_PR_LINKED' as keyof typeof AUDIT_ACTIONS,
      category: 'WORKSPACE',
      resourceType: 'task',
      resourceId: taskId,
      resourceName: task.reference ?? undefined,
      metadata: {
        prId,
        prNumber: pr.prNumber,
        prTitle: pr.title,
      },
    });

    return {
      success: true,
      linked: result.linked,
      prUrl: `https://github.com/${pr.repository.fullName}/pull/${pr.prNumber}`,
    };
  }),

  /**
   * Unlink a PR from a task
   * Requires project WRITE permission
   */
  unlinkPRFromTask: protectedProcedure.input(prIdSchema).mutation(async ({ ctx, input }) => {
    const { prId } = input;

    // Get PR with task info
    const pr = await ctx.prisma.gitHubPullRequest.findUnique({
      where: { id: prId },
      include: {
        repository: {
          select: { projectId: true, fullName: true },
        },
        task: {
          select: { id: true, reference: true },
        },
      },
    });

    if (!pr) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Pull request not found',
      });
    }

    if (!pr.task) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Pull request is not linked to any task',
      });
    }

    // Check project write permission
    await checkProjectWriteAccess(ctx.user.id, pr.repository.projectId);

    // Unlink PR
    const result = await unlinkPRFromTask(prId);

    // Audit log
    await auditService.log({
      userId: ctx.user.id,
      action: 'GITHUB_PR_UNLINKED' as keyof typeof AUDIT_ACTIONS,
      category: 'WORKSPACE',
      resourceType: 'task',
      resourceId: pr.task.id,
      resourceName: pr.task.reference ?? undefined,
      metadata: {
        prId,
        prNumber: pr.prNumber,
      },
    });

    return {
      success: result,
    };
  }),

  /**
   * Manually link a commit to a task
   * Requires project WRITE permission
   */
  linkCommitToTask: protectedProcedure.input(linkCommitSchema).mutation(async ({ ctx, input }) => {
    const { commitId, taskId } = input;

    // Get task and check access
    const { task, projectId } = await getTaskWithProjectAccess(ctx.prisma, ctx.user.id, taskId);

    // Get commit and verify it belongs to the same project
    const commit = await ctx.prisma.gitHubCommit.findUnique({
      where: { id: commitId },
      include: {
        repository: {
          select: { projectId: true, fullName: true },
        },
      },
    });

    if (!commit) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Commit not found',
      });
    }

    if (commit.repository.projectId !== projectId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Commit belongs to a different project',
      });
    }

    // Link commit to task
    const result = await linkCommitToTask(commitId, taskId);

    // Audit log
    await auditService.log({
      userId: ctx.user.id,
      action: 'GITHUB_COMMIT_LINKED' as keyof typeof AUDIT_ACTIONS,
      category: 'WORKSPACE',
      resourceType: 'task',
      resourceId: taskId,
      resourceName: task.reference ?? undefined,
      metadata: {
        commitId,
        sha: commit.sha,
        message: commit.message.substring(0, 100),
      },
    });

    return {
      success: true,
      linked: result.linked,
      commitUrl: `https://github.com/${commit.repository.fullName}/commit/${commit.sha}`,
    };
  }),

  /**
   * Unlink a commit from a task
   * Requires project WRITE permission
   */
  unlinkCommitFromTask: protectedProcedure
    .input(commitIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { commitId } = input;

      // Get commit with task info
      const commit = await ctx.prisma.gitHubCommit.findUnique({
        where: { id: commitId },
        include: {
          repository: {
            select: { projectId: true, fullName: true },
          },
          task: {
            select: { id: true, reference: true },
          },
        },
      });

      if (!commit) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Commit not found',
        });
      }

      if (!commit.task) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Commit is not linked to any task',
        });
      }

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, commit.repository.projectId);

      // Unlink commit
      const result = await unlinkCommitFromTask(commitId);

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_COMMIT_UNLINKED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'task',
        resourceId: commit.task.id,
        resourceName: commit.task.reference ?? undefined,
        metadata: {
          commitId,
          sha: commit.sha,
        },
      });

      return {
        success: result,
      };
    }),

  // ===========================================================================
  // Automation - Fase 8
  // ===========================================================================

  /**
   * Create a feature branch for a task on GitHub
   * Requires project WRITE permission
   */
  createBranch: protectedProcedure.input(createBranchSchema).mutation(async ({ ctx, input }) => {
    const { taskId, customBranchName } = input;

    // Get task and check access
    const task = await ctx.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            githubRepositories: {
              select: {
                id: true,
                fullName: true,
                syncSettings: true,
                isPrimary: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found',
      });
    }

    // Check project write permission
    await checkProjectWriteAccess(ctx.user.id, task.projectId);

    const repository =
      task.project.githubRepositories.find((r) => r.isPrimary) ||
      task.project.githubRepositories[0];
    if (!repository) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Project has no linked GitHub repository',
      });
    }

    // Check if task already has a branch
    if (task.githubBranch) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Task already has a branch: ${task.githubBranch}`,
      });
    }

    // Create the branch
    const result = await createBranchForTask(taskId, customBranchName);

    if (!result.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: result.error || 'Failed to create branch',
      });
    }

    // Audit log
    await auditService.log({
      userId: ctx.user.id,
      action: 'GITHUB_BRANCH_CREATED' as keyof typeof AUDIT_ACTIONS,
      category: 'WORKSPACE',
      resourceType: 'task',
      resourceId: taskId,
      resourceName: task.reference ?? undefined,
      metadata: {
        branchName: result.branchName,
        repositoryFullName: repository.fullName,
      },
    });

    return {
      success: true,
      branchName: result.branchName,
      branchUrl: result.branchUrl,
    };
  }),

  /**
   * Preview what branch name would be generated for a task
   * Requires project READ permission
   */
  previewBranchName: protectedProcedure
    .input(previewBranchNameSchema)
    .query(async ({ ctx, input }) => {
      const { taskId } = input;

      // Get task
      const task = await ctx.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: {
            include: {
              githubRepositories: {
                select: {
                  id: true,
                  fullName: true,
                  syncSettings: true,
                  isPrimary: true,
                },
              },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, task.projectId);

      const repository =
        task.project.githubRepositories.find((r) => r.isPrimary) ||
        task.project.githubRepositories[0];
      if (!repository) {
        return {
          available: false,
          reason: 'Project has no linked GitHub repository',
          branchName: null,
          existingBranch: task.githubBranch,
        };
      }

      // Check if task already has a branch
      if (task.githubBranch) {
        return {
          available: false,
          reason: 'Task already has a branch',
          branchName: task.githubBranch,
          existingBranch: task.githubBranch,
        };
      }

      // Generate preview branch name
      const syncSettings = repository.syncSettings as GitHubSyncSettings | null;
      const branchPattern = syncSettings?.branches?.pattern || 'feature/{reference}-{slug}';
      const taskRef = task.reference ?? `task-${taskId}`;
      const branchName = generateBranchName(taskRef, task.title, branchPattern);

      return {
        available: true,
        branchName,
        existingBranch: null,
      };
    }),

  /**
   * Get automation settings for a project
   * Requires project READ permission
   */
  getAutomationSettings: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    const { projectId } = input;

    // Check project read permission
    await checkProjectReadAccess(ctx.user.id, projectId);

    // Get repository
    const repository = await ctx.prisma.gitHubRepository.findFirst({
      where: { projectId },
      select: { syncSettings: true },
    });

    if (!repository) {
      return {
        hasRepository: false,
        settings: null,
      };
    }

    const settings = getAutomationSettings(repository.syncSettings as GitHubSyncSettings | null);

    return {
      hasRepository: true,
      settings,
    };
  }),

  // ==========================================================================
  // CI/CD Workflow Procedures (Fase 10)
  // ==========================================================================

  /**
   * Get workflow runs for a project/repository
   * Requires project READ permission
   */
  getWorkflowRuns: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        status: z.enum(['queued', 'in_progress', 'completed', 'waiting']).optional(),
        conclusion: z.enum(['success', 'failure', 'cancelled', 'skipped', 'timed_out']).optional(),
        branch: z.string().optional(),
        event: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId, status, conclusion, branch, event, limit, offset } = input;

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId);

      // Get repository
      const repository = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId },
        select: { id: true },
      });

      if (!repository) {
        return { runs: [], total: 0, hasMore: false };
      }

      const result = await getWorkflowRuns(
        repository.id,
        { status, conclusion, branch, event },
        limit,
        offset
      );

      return result;
    }),

  /**
   * Get workflow run details with jobs
   * Requires project READ permission
   */
  getWorkflowRunDetails: protectedProcedure
    .input(
      z.object({
        workflowRunId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workflowRunId } = input;

      // Get workflow run with repository
      const run = await getWorkflowRunDetails(workflowRunId);

      if (!run) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow run not found',
        });
      }

      // Get project ID from repository
      const repository = await ctx.prisma.gitHubRepository.findFirst({
        where: { id: run.repositoryId },
        select: { projectId: true },
      });

      if (!repository) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Repository not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, repository.projectId);

      return run;
    }),

  /**
   * Get workflow jobs for a run (fetched from GitHub API)
   * Requires project READ permission
   */
  getWorkflowJobs: protectedProcedure
    .input(
      z.object({
        workflowRunId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workflowRunId } = input;

      // Get workflow run to check permissions
      const run = await ctx.prisma.gitHubWorkflowRun.findUnique({
        where: { id: workflowRunId },
        include: {
          repository: {
            select: { projectId: true },
          },
        },
      });

      if (!run) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow run not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, run.repository.projectId);

      const result = await getWorkflowJobs(workflowRunId);

      return result;
    }),

  /**
   * Get workflow runs for a task
   * Requires project READ permission
   */
  getTaskWorkflowRuns: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        limit: z.number().min(1).max(50).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { taskId, limit } = input;

      // Get task to check permissions
      const task = await ctx.prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, task.projectId);

      const result = await getTaskWorkflowRuns(taskId, limit);

      return result;
    }),

  /**
   * Get workflow statistics for a project
   * Requires project READ permission
   */
  getWorkflowStats: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        days: z.number().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId, days } = input;

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, projectId);

      // Get repository
      const repository = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId },
        select: { id: true },
      });

      if (!repository) {
        return {
          total: 0,
          byConclusion: {},
          byWorkflow: {},
          successRate: 0,
          avgDurationMinutes: 0,
          period: { days, since: new Date() },
        };
      }

      const stats = await getWorkflowStats(repository.id, days);

      return stats;
    }),

  /**
   * Re-run a workflow
   * Requires project WRITE permission
   */
  rerunWorkflow: protectedProcedure
    .input(
      z.object({
        workflowRunId: z.number(),
        failedJobsOnly: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workflowRunId, failedJobsOnly } = input;

      // Get workflow run to check permissions
      const run = await ctx.prisma.gitHubWorkflowRun.findUnique({
        where: { id: workflowRunId },
        include: {
          repository: {
            select: { projectId: true, fullName: true },
          },
        },
      });

      if (!run) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow run not found',
        });
      }

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, run.repository.projectId);

      // Re-run workflow
      const result = failedJobsOnly
        ? await rerunFailedJobs(workflowRunId)
        : await rerunWorkflow(workflowRunId);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.message,
        });
      }

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_WORKFLOW_RERUN' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'workflow',
        resourceId: workflowRunId,
        resourceName: `${run.workflowName} #${run.runNumber}`,
        metadata: {
          repositoryFullName: run.repository.fullName,
          failedJobsOnly,
        },
      });

      return result;
    }),

  /**
   * Cancel a running workflow
   * Requires project WRITE permission
   */
  cancelWorkflow: protectedProcedure
    .input(
      z.object({
        workflowRunId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { workflowRunId } = input;

      // Get workflow run to check permissions
      const run = await ctx.prisma.gitHubWorkflowRun.findUnique({
        where: { id: workflowRunId },
        include: {
          repository: {
            select: { projectId: true, fullName: true },
          },
        },
      });

      if (!run) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workflow run not found',
        });
      }

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, run.repository.projectId);

      // Cancel workflow
      const result = await cancelWorkflow(workflowRunId);

      if (!result.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.message,
        });
      }

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_WORKFLOW_CANCELLED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'workflow',
        resourceId: workflowRunId,
        resourceName: `${run.workflowName} #${run.runNumber}`,
        metadata: {
          repositoryFullName: run.repository.fullName,
        },
      });

      return result;
    }),

  // ===========================================================================
  // Code Review Procedures (Fase 12)
  // ===========================================================================

  /**
   * Get reviews for a pull request
   * Requires project READ permission
   */
  getPRReviews: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prId } = input;

      // Get PR to check permissions
      const pr = await ctx.prisma.gitHubPullRequest.findUnique({
        where: { id: prId },
        include: {
          repository: {
            select: { projectId: true },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, pr.repository.projectId);

      return getReviewsForPR(prId);
    }),

  /**
   * Get review summary for a pull request (approved/changes_requested counts)
   * Requires project READ permission
   */
  getPRReviewSummary: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prId } = input;

      // Get PR to check permissions
      const pr = await ctx.prisma.gitHubPullRequest.findUnique({
        where: { id: prId },
        include: {
          repository: {
            select: { projectId: true },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, pr.repository.projectId);

      return getPRReviewSummary(prId);
    }),

  /**
   * Get reviews for a task (aggregated from all linked PRs)
   * Requires project READ permission
   */
  getTaskReviews: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { taskId } = input;

      // Get task to check permissions
      const task = await ctx.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          column: {
            include: {
              project: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, task.column.project.id);

      return getReviewsForTask(taskId);
    }),

  /**
   * Get review summary for a task (aggregated from all linked PRs)
   * Requires project READ permission
   */
  getTaskReviewSummary: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { taskId } = input;

      // Get task to check permissions
      const task = await ctx.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          column: {
            include: {
              project: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Task not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, task.column.project.id);

      return getTaskReviewSummary(taskId);
    }),

  /**
   * Request review from specific users on a PR
   * Requires project WRITE permission
   */
  requestReview: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
        reviewers: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prId, reviewers } = input;

      // Get PR with repository info
      const pr = await ctx.prisma.gitHubPullRequest.findUnique({
        where: { id: prId },
        include: {
          repository: {
            select: {
              id: true,
              projectId: true,
              owner: true,
              name: true,
              installation: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, pr.repository.projectId);

      // Request review via GitHub API
      const result = await requestReview(
        pr.repository.installation.id,
        pr.repository.owner,
        pr.repository.name,
        pr.prNumber,
        reviewers
      );

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_REVIEW_REQUESTED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'pr',
        resourceId: prId,
        resourceName: `PR #${pr.prNumber}`,
        metadata: {
          reviewers,
          requestedReviewers: result.requestedReviewers,
        },
      });

      return result;
    }),

  /**
   * Get suggested reviewers for a PR
   * Requires project READ permission
   */
  getSuggestedReviewers: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prId } = input;

      // Get PR with repository info
      const pr = await ctx.prisma.gitHubPullRequest.findUnique({
        where: { id: prId },
        include: {
          repository: {
            select: {
              id: true,
              projectId: true,
              owner: true,
              name: true,
              installation: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, pr.repository.projectId);

      return getSuggestedReviewers(
        pr.repository.installation.id,
        pr.repository.owner,
        pr.repository.name,
        pr.prNumber
      );
    }),

  /**
   * Get pending review requests for a PR
   * Requires project READ permission
   */
  getPendingReviewRequests: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prId } = input;

      // Get PR with repository info
      const pr = await ctx.prisma.gitHubPullRequest.findUnique({
        where: { id: prId },
        include: {
          repository: {
            select: {
              id: true,
              projectId: true,
              owner: true,
              name: true,
              installation: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Check project read permission
      await checkProjectReadAccess(ctx.user.id, pr.repository.projectId);

      return getPendingReviewRequests(
        pr.repository.installation.id,
        pr.repository.owner,
        pr.repository.name,
        pr.prNumber
      );
    }),

  /**
   * Sync reviews from GitHub for a PR (manual resync)
   * Requires project WRITE permission
   */
  syncPRReviews: protectedProcedure
    .input(
      z.object({
        prId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prId } = input;

      // Get PR with repository info
      const pr = await ctx.prisma.gitHubPullRequest.findUnique({
        where: { id: prId },
        include: {
          repository: {
            select: {
              id: true,
              projectId: true,
              owner: true,
              name: true,
              installation: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Check project write permission
      await checkProjectWriteAccess(ctx.user.id, pr.repository.projectId);

      // Sync reviews from GitHub
      const result = await syncReviewsFromGitHub(
        pr.repository.installation.id,
        pr.repository.owner,
        pr.repository.name,
        pr.prNumber,
        prId
      );

      // Audit log
      await auditService.log({
        userId: ctx.user.id,
        action: 'GITHUB_REVIEWS_SYNCED' as keyof typeof AUDIT_ACTIONS,
        category: 'WORKSPACE',
        resourceType: 'pr',
        resourceId: prId,
        resourceName: `PR #${pr.prNumber}`,
        metadata: {
          syncedReviews: result.synced,
        },
      });

      return result;
    }),

  // ===========================================================================
  // Analytics Procedures (Fase 13)
  // ===========================================================================

  /**
   * Get cycle time statistics for a project.
   * Shows how long it takes from task creation to PR merge.
   */
  getCycleTimeStats: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      const dateRange =
        input.dateFrom && input.dateTo
          ? { from: new Date(input.dateFrom), to: new Date(input.dateTo) }
          : undefined;

      return getCycleTimeStats(input.projectId, dateRange);
    }),

  /**
   * Get code review time statistics.
   * Shows average time to first review, time to approval, etc.
   */
  getReviewTimeStats: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      const dateRange =
        input.dateFrom && input.dateTo
          ? { from: new Date(input.dateFrom), to: new Date(input.dateTo) }
          : undefined;

      return getReviewTimeStats(input.projectId, dateRange);
    }),

  /**
   * Get contributor statistics.
   * Shows commits, PRs, reviews per contributor.
   */
  getContributorStats: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      const dateRange =
        input.dateFrom && input.dateTo
          ? { from: new Date(input.dateFrom), to: new Date(input.dateTo) }
          : undefined;

      return getContributorStats(input.projectId, dateRange);
    }),

  /**
   * Get throughput statistics.
   * Shows tasks/PRs completed per period.
   */
  getThroughputStats: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        periodType: z.enum(['week', 'month']).default('week'),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      const dateRange =
        input.dateFrom && input.dateTo
          ? { from: new Date(input.dateFrom), to: new Date(input.dateTo) }
          : undefined;

      return getThroughputStats(input.projectId, input.periodType, dateRange);
    }),

  /**
   * Get all analytics in one call.
   * Combines cycle time, review time, contributors, and throughput.
   */
  getProjectAnalytics: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      const dateRange =
        input.dateFrom && input.dateTo
          ? { from: new Date(input.dateFrom), to: new Date(input.dateTo) }
          : undefined;

      return getProjectAnalytics(input.projectId, dateRange);
    }),

  // ===========================================================================
  // Milestone Procedures (Fase 11)
  // ===========================================================================

  /**
   * Get milestones for a project.
   * Returns all milestones with progress information.
   */
  getProjectMilestones: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        state: z.enum(['open', 'closed', 'all']).default('all'),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      return getProjectMilestones(input.projectId, {
        state: input.state,
        limit: input.limit,
      });
    }),

  /**
   * Get milestone statistics for a project.
   * Shows counts for open, closed, overdue, and upcoming milestones.
   */
  getMilestoneStats: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    // Check project read permission
    const hasAccess = await aclService.hasProjectPermission(
      ctx.user.id,
      input.projectId,
      ACL_PERMISSIONS.READ
    );

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
      });
    }

    return getMilestoneStats(input.projectId);
  }),

  /**
   * Get a single milestone by number.
   */
  getMilestoneByNumber: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        milestoneNumber: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      // Get repository ID from project
      const repo = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId: input.projectId },
        select: { id: true },
      });

      if (!repo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        });
      }

      const milestone = await getMilestoneByNumber(repo.id, input.milestoneNumber);

      if (!milestone) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Milestone not found',
        });
      }

      return milestone;
    }),

  /**
   * Sync milestones from GitHub.
   * Fetches all milestones from the linked repository and imports them.
   */
  syncMilestones: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        state: z.enum(['open', 'closed', 'all']).default('all'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check project write permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.WRITE
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have write access to this project',
        });
      }

      // Get repository ID from project
      const repo = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId: input.projectId },
        select: { id: true },
      });

      if (!repo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        });
      }

      // Import milestones from GitHub
      const result = await importMilestonesFromGitHub(repo.id, {
        state: input.state,
      });

      // Log audit
      await auditService.log({
        userId: ctx.user.id,
        action: AUDIT_ACTIONS.GITHUB_MILESTONES_SYNCED,
        category: 'WORKSPACE',
        resourceType: 'project',
        resourceId: input.projectId,
        metadata: {
          imported: result.imported,
          updated: result.updated,
          failed: result.failed,
        },
      });

      return result;
    }),

  // ===========================================================================
  // Release Procedures (Fase 11)
  // ===========================================================================

  /**
   * Get releases for a project.
   * Returns all releases ordered by published date.
   */
  getProjectReleases: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        includeDrafts: z.boolean().default(false),
        includePrereleases: z.boolean().default(true),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      return getProjectReleases(input.projectId, {
        includeDrafts: input.includeDrafts,
        includePrereleases: input.includePrereleases,
        limit: input.limit,
      });
    }),

  /**
   * Get release statistics for a project.
   * Shows counts for published, drafts, prereleases, and latest release.
   */
  getReleaseStats: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => {
    // Check project read permission
    const hasAccess = await aclService.hasProjectPermission(
      ctx.user.id,
      input.projectId,
      ACL_PERMISSIONS.READ
    );

    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this project',
      });
    }

    return getReleaseStats(input.projectId);
  }),

  /**
   * Get the latest release for a project.
   */
  getLatestRelease: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        includeDrafts: z.boolean().default(false),
        includePrereleases: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      // Get repository ID from project
      const repo = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId: input.projectId },
        select: { id: true },
      });

      if (!repo) {
        return null;
      }

      return getLatestRelease(repo.id, {
        includeDrafts: input.includeDrafts,
        includePrereleases: input.includePrereleases,
      });
    }),

  /**
   * Get a release by tag name.
   */
  getReleaseByTag: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        tagName: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      // Get repository ID from project
      const repo = await ctx.prisma.gitHubRepository.findFirst({
        where: { projectId: input.projectId },
        select: { id: true },
      });

      if (!repo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        });
      }

      const release = await getReleaseByTag(repo.id, input.tagName);

      if (!release) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Release not found',
        });
      }

      return release;
    }),

  /**
   * Generate release notes from completed tasks.
   * Returns markdown-formatted release notes.
   */
  generateReleaseNotes: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
        includeTaskLinks: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      // Check project read permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      return generateReleaseNotes(input.projectId, {
        fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
        toDate: input.toDate ? new Date(input.toDate) : undefined,
        includeTaskLinks: input.includeTaskLinks,
      });
    }),

  // ===========================================================================
  // AI-Powered Features (Fase 16)
  // ===========================================================================

  /**
   * Check if AI service is configured
   */
  getAIStatus: protectedProcedure.query(async () => {
    return {
      configured: isAIConfigured(),
      provider: getAIProvider(),
    };
  }),

  /**
   * Generate PR summary using AI
   */
  generateAIPRSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        prNumber: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check project permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      if (!isAIConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI service is not configured',
        });
      }

      // Get PR data from database
      const pr = await ctx.prisma.gitHubPullRequest.findFirst({
        where: {
          prNumber: input.prNumber,
          repository: {
            projectId: input.projectId,
          },
        },
        include: {
          repository: true,
        },
      });

      if (!pr) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pull request not found',
        });
      }

      // Get commits for this PR
      const commits = await ctx.prisma.gitHubCommit.findMany({
        where: {
          repositoryId: pr.repositoryId,
          // Get recent commits (simplified - in production, you'd link commits to PRs)
        },
        orderBy: { committedAt: 'desc' },
        take: 20,
      });

      const summary = await generatePRSummary({
        title: pr.title,
        commits: commits.map((c) => ({
          sha: c.sha,
          message: c.message,
          author: c.authorLogin || c.authorName,
        })),
        baseBranch: pr.baseBranch,
        headBranch: pr.headBranch,
      });

      return summary;
    }),

  /**
   * Generate AI-powered code review suggestions
   */
  generateAICodeReview: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        diff: z.string().max(50000),
        language: z.string().optional(),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check project permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      if (!isAIConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI service is not configured',
        });
      }

      const result = await reviewCode({
        diff: input.diff,
        language: input.language,
        context: input.context,
      });

      return result;
    }),

  /**
   * Generate AI-powered release notes
   */
  generateAIReleaseNotes: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        version: z.string().optional(),
        previousVersion: z.string().optional(),
        fromDate: z.string().datetime().optional(),
        toDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check project permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.READ
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project',
        });
      }

      if (!isAIConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI service is not configured',
        });
      }

      // Get project info
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          githubRepositories: true,
        },
      });

      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const primaryRepo =
        project.githubRepositories.find((r) => r.isPrimary) || project.githubRepositories[0];
      if (!primaryRepo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No GitHub repository linked to this project',
        });
      }

      // Get merged PRs
      const prs = await ctx.prisma.gitHubPullRequest.findMany({
        where: {
          repositoryId: primaryRepo.id,
          mergedAt: {
            not: null,
            ...(input.fromDate && { gte: new Date(input.fromDate) }),
            ...(input.toDate && { lte: new Date(input.toDate) }),
          },
        },
        orderBy: { mergedAt: 'desc' },
        take: 100,
      });

      if (prs.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No merged PRs found in the specified date range',
        });
      }

      const releaseNotes = await generateAIReleaseNotes({
        projectName: project.name,
        version: input.version,
        previousVersion: input.previousVersion,
        prs: prs.map((pr) => ({
          number: pr.prNumber,
          title: pr.title,
          author: pr.authorLogin,
          mergedAt: pr.mergedAt!.toISOString(),
        })),
      });

      return releaseNotes;
    }),

  /**
   * Generate AI-powered commit message
   */
  generateAICommitMessage: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        files: z.array(
          z.object({
            path: z.string(),
            status: z.enum(['added', 'modified', 'deleted', 'renamed']),
            diff: z.string().optional(),
          })
        ),
        context: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check project permission
      const hasAccess = await aclService.hasProjectPermission(
        ctx.user.id,
        input.projectId,
        ACL_PERMISSIONS.WRITE
      );

      if (!hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have write access to this project',
        });
      }

      if (!isAIConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI service is not configured',
        });
      }

      const commitMessage = await generateCommitMessage({
        files: input.files,
        context: input.context,
      });

      return commitMessage;
    }),
});

export default githubRouter;
