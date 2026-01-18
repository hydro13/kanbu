/*
 * Milestone Sync Service
 * Version: 1.0.0
 *
 * Handles bidirectional synchronization between GitHub milestones and Kanbu milestones.
 * For GitHub-linked projects, milestones are automatically synced in both directions.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-11
 * Fase: GitHub Milestone Bi-directional Sync
 * =============================================================================
 */

import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { getInstallationOctokit } from './githubService';

// =============================================================================
// Types
// =============================================================================

interface MilestoneSyncData {
  title: string;
  description: string | null;
  dueOn: Date | null;
  state: 'open' | 'closed';
}

interface SyncResult {
  milestoneId: number;
  created: boolean;
  updated: boolean;
  linked: boolean;
}

// =============================================================================
// Sync Hash Calculation
// =============================================================================

/**
 * Calculate sync hash for a milestone
 * Used for conflict detection in bi-directional sync
 */
export function calculateMilestoneSyncHash(data: MilestoneSyncData): string {
  const content = JSON.stringify({
    title: data.title.trim(),
    description: (data.description || '').trim(),
    dueOn: data.dueOn?.toISOString() ?? null,
    state: data.state,
  });
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 64);
}

/**
 * Check if a Kanbu milestone has changed since last sync
 */
export async function hasMilestoneChangedSinceSync(milestoneId: number): Promise<{
  changed: boolean;
  currentHash: string;
  lastHash: string | null;
}> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      githubMilestone: true,
    },
  });

  if (!milestone) {
    return { changed: true, currentHash: '', lastHash: null };
  }

  const currentHash = calculateMilestoneSyncHash({
    title: milestone.name,
    description: milestone.description,
    dueOn: milestone.dateDue,
    state: milestone.isCompleted ? 'closed' : 'open',
  });

  const lastHash = milestone.syncHash;

  return {
    changed: lastHash !== currentHash,
    currentHash,
    lastHash,
  };
}

// =============================================================================
// GitHub → Kanbu Sync
// =============================================================================

/**
 * Sync a GitHub milestone to a Kanbu milestone
 * Creates a new Kanbu milestone if not linked, or updates existing one
 */
export async function syncGitHubToKanbu(
  githubMilestoneId: number,
  projectId: number
): Promise<SyncResult> {
  // Get the GitHub milestone with its linked Kanbu milestone
  const githubMilestone = await prisma.gitHubMilestone.findUnique({
    where: { id: githubMilestoneId },
    include: {
      kanbuMilestone: true,
    },
  });

  if (!githubMilestone) {
    throw new Error(`GitHub milestone ${githubMilestoneId} not found`);
  }

  // Calculate sync hash from GitHub data
  const syncHash = calculateMilestoneSyncHash({
    title: githubMilestone.title,
    description: githubMilestone.description,
    dueOn: githubMilestone.dueOn,
    state: githubMilestone.state as 'open' | 'closed',
  });

  // If already linked, update the existing Kanbu milestone
  if (githubMilestone.kanbuMilestone) {
    const updated = await prisma.milestone.update({
      where: { id: githubMilestone.kanbuMilestone.id },
      data: {
        name: githubMilestone.title,
        description: githubMilestone.description,
        dateDue: githubMilestone.dueOn,
        isCompleted: githubMilestone.state === 'closed',
        syncHash,
      },
    });

    console.log(
      `[MilestoneSyncService] Updated Kanbu milestone ${updated.id} from GitHub milestone ${githubMilestone.milestoneNumber}`
    );

    return {
      milestoneId: updated.id,
      created: false,
      updated: true,
      linked: true,
    };
  }

  // Not linked - create a new Kanbu milestone
  const newMilestone = await prisma.milestone.create({
    data: {
      projectId,
      name: githubMilestone.title,
      description: githubMilestone.description,
      dateDue: githubMilestone.dueOn,
      isCompleted: githubMilestone.state === 'closed',
      githubMilestoneId: githubMilestone.id,
      syncHash,
    },
  });

  console.log(
    `[MilestoneSyncService] Created Kanbu milestone ${newMilestone.id} from GitHub milestone ${githubMilestone.milestoneNumber}`
  );

  return {
    milestoneId: newMilestone.id,
    created: true,
    updated: false,
    linked: true,
  };
}

/**
 * Sync all GitHub milestones to Kanbu for a project
 */
export async function syncAllGitHubToKanbu(projectId: number): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  // Get the repository for this project
  const repository = await prisma.gitHubRepository.findFirst({
    where: { projectId },
    include: {
      milestones: true,
    },
  });

  if (!repository) {
    return { created: 0, updated: 0, total: 0 };
  }

  let created = 0;
  let updated = 0;

  for (const ghMilestone of repository.milestones) {
    const result = await syncGitHubToKanbu(ghMilestone.id, projectId);
    if (result.created) created++;
    if (result.updated) updated++;
  }

  return {
    created,
    updated,
    total: repository.milestones.length,
  };
}

// =============================================================================
// Kanbu → GitHub Sync
// =============================================================================

/**
 * Sync a Kanbu milestone to GitHub
 * Creates a new GitHub milestone if not linked, or updates existing one
 */
export async function syncKanbuToGitHub(
  milestoneId: number,
  options: { force?: boolean } = {}
): Promise<SyncResult | null> {
  // Get the Kanbu milestone with project and linked GitHub info
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      githubMilestone: true,
    },
  });

  if (!milestone) {
    throw new Error(`Milestone ${milestoneId} not found`);
  }

  // Get the project with its GitHub repositories
  const project = await prisma.project.findUnique({
    where: { id: milestone.projectId },
    include: {
      githubRepositories: {
        include: {
          installation: true,
        },
      },
    },
  });

  // Check if project has a GitHub repository linked (use first one)
  const repository = project?.githubRepositories[0];
  if (!repository || !repository.installation) {
    // No GitHub repo linked - nothing to sync
    return null;
  }

  // Check sync settings - is milestone sync enabled?
  // For now, we assume milestone sync is always on for GitHub-linked projects

  // Calculate current sync hash
  const syncHash = calculateMilestoneSyncHash({
    title: milestone.name,
    description: milestone.description,
    dueOn: milestone.dateDue,
    state: milestone.isCompleted ? 'closed' : 'open',
  });

  // Skip if unchanged (unless force)
  if (!options.force && milestone.syncHash === syncHash && milestone.githubMilestone) {
    return {
      milestoneId: milestone.id,
      created: false,
      updated: false,
      linked: true,
    };
  }

  // Get Octokit client
  const octokit = await getInstallationOctokit(repository.installation.installationId);

  const state = milestone.isCompleted ? 'closed' : 'open';

  // If already linked, update the GitHub milestone
  if (milestone.githubMilestone) {
    await octokit.rest.issues.updateMilestone({
      owner: repository.owner,
      repo: repository.name,
      milestone_number: milestone.githubMilestone.milestoneNumber,
      title: milestone.name,
      description: milestone.description ?? undefined,
      due_on: milestone.dateDue?.toISOString() ?? undefined,
      state,
    });

    // Update the GitHubMilestone record
    await prisma.gitHubMilestone.update({
      where: { id: milestone.githubMilestone.id },
      data: {
        title: milestone.name,
        description: milestone.description,
        dueOn: milestone.dateDue,
        state,
        closedAt: milestone.isCompleted ? new Date() : null,
      },
    });

    // Update sync hash on Kanbu milestone
    await prisma.milestone.update({
      where: { id: milestone.id },
      data: { syncHash },
    });

    console.log(
      `[MilestoneSyncService] Updated GitHub milestone ${milestone.githubMilestone.milestoneNumber} from Kanbu milestone ${milestone.id}`
    );

    // Log sync operation
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: repository.id,
        action: 'milestone_update',
        direction: 'kanbu_to_github',
        entityType: 'milestone',
        entityId: String(milestone.id),
        status: 'success',
        details: {
          milestoneId: milestone.id,
          githubMilestoneNumber: milestone.githubMilestone.milestoneNumber,
        },
      },
    });

    return {
      milestoneId: milestone.id,
      created: false,
      updated: true,
      linked: true,
    };
  }

  // Not linked - create a new GitHub milestone
  const { data: ghMilestone } = await octokit.rest.issues.createMilestone({
    owner: repository.owner,
    repo: repository.name,
    title: milestone.name,
    description: milestone.description ?? undefined,
    due_on: milestone.dateDue?.toISOString() ?? undefined,
    state,
  });

  // Create GitHubMilestone record and link to Kanbu milestone
  const newGhMilestone = await prisma.gitHubMilestone.create({
    data: {
      repositoryId: repository.id,
      milestoneNumber: ghMilestone.number,
      milestoneId: BigInt(ghMilestone.id),
      title: ghMilestone.title,
      description: ghMilestone.description,
      state: ghMilestone.state as 'open' | 'closed',
      dueOn: ghMilestone.due_on ? new Date(ghMilestone.due_on) : null,
      openIssues: ghMilestone.open_issues,
      closedIssues: ghMilestone.closed_issues,
      htmlUrl: ghMilestone.html_url,
    },
  });

  // Link Kanbu milestone to GitHub milestone
  await prisma.milestone.update({
    where: { id: milestone.id },
    data: {
      githubMilestoneId: newGhMilestone.id,
      syncHash,
    },
  });

  console.log(
    `[MilestoneSyncService] Created GitHub milestone ${ghMilestone.number} from Kanbu milestone ${milestone.id}`
  );

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: repository.id,
      action: 'milestone_create',
      direction: 'kanbu_to_github',
      entityType: 'milestone',
      entityId: String(milestone.id),
      status: 'success',
      details: {
        milestoneId: milestone.id,
        githubMilestoneNumber: ghMilestone.number,
        githubMilestoneId: ghMilestone.id,
      },
    },
  });

  return {
    milestoneId: milestone.id,
    created: true,
    updated: false,
    linked: true,
  };
}

/**
 * Delete a GitHub milestone when the linked Kanbu milestone is deleted
 */
export async function deleteGitHubMilestone(milestoneId: number): Promise<boolean> {
  // Get the Kanbu milestone with its linked GitHub milestone
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      githubMilestone: true,
    },
  });

  if (!milestone || !milestone.githubMilestone) {
    return false;
  }

  // Get the project with its GitHub repositories
  const project = await prisma.project.findUnique({
    where: { id: milestone.projectId },
    include: {
      githubRepositories: {
        include: {
          installation: true,
        },
      },
    },
  });

  const repository = project?.githubRepositories[0];
  if (!repository || !repository.installation) {
    return false;
  }

  try {
    // Get Octokit client
    const octokit = await getInstallationOctokit(repository.installation.installationId);

    // Delete the GitHub milestone
    await octokit.rest.issues.deleteMilestone({
      owner: repository.owner,
      repo: repository.name,
      milestone_number: milestone.githubMilestone.milestoneNumber,
    });

    // Delete the GitHubMilestone record (will automatically unlink via cascade)
    await prisma.gitHubMilestone.delete({
      where: { id: milestone.githubMilestone.id },
    });

    console.log(
      `[MilestoneSyncService] Deleted GitHub milestone ${milestone.githubMilestone.milestoneNumber}`
    );

    // Log sync operation
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: repository.id,
        action: 'milestone_delete',
        direction: 'kanbu_to_github',
        entityType: 'milestone',
        entityId: String(milestone.id),
        status: 'success',
        details: {
          milestoneId: milestone.id,
          githubMilestoneNumber: milestone.githubMilestone.milestoneNumber,
        },
      },
    });

    return true;
  } catch (error) {
    console.error(`[MilestoneSyncService] Failed to delete GitHub milestone:`, error);
    return false;
  }
}

/**
 * Delete a Kanbu milestone when the linked GitHub milestone is deleted (via webhook)
 */
export async function deleteKanbuMilestoneFromGitHub(githubMilestoneId: number): Promise<boolean> {
  // Get the GitHub milestone with its linked Kanbu milestone
  const githubMilestone = await prisma.gitHubMilestone.findUnique({
    where: { id: githubMilestoneId },
    include: {
      kanbuMilestone: true,
    },
  });

  if (!githubMilestone || !githubMilestone.kanbuMilestone) {
    return false;
  }

  try {
    // Delete the Kanbu milestone (tasks will have milestoneId set to null via Prisma behavior)
    await prisma.milestone.delete({
      where: { id: githubMilestone.kanbuMilestone.id },
    });

    console.log(
      `[MilestoneSyncService] Deleted Kanbu milestone ${githubMilestone.kanbuMilestone.id} (GitHub milestone deleted)`
    );

    return true;
  } catch (error) {
    console.error(`[MilestoneSyncService] Failed to delete Kanbu milestone:`, error);
    return false;
  }
}

// =============================================================================
// Export namespace
// =============================================================================

export const milestoneSyncService = {
  calculateMilestoneSyncHash,
  hasMilestoneChangedSinceSync,
  syncGitHubToKanbu,
  syncAllGitHubToKanbu,
  syncKanbuToGitHub,
  deleteGitHubMilestone,
  deleteKanbuMilestoneFromGitHub,
};
