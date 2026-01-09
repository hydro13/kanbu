/*
 * Milestone Service
 * Version: 1.0.0
 *
 * Service for syncing and managing GitHub milestones.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 11 - Geavanceerde Sync
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'

// =============================================================================
// Types
// =============================================================================

export interface MilestoneData {
  repositoryId: number
  milestoneNumber: number
  milestoneId: bigint
  title: string
  description?: string | null
  state: 'open' | 'closed'
  dueOn?: Date | null
  closedAt?: Date | null
  openIssues?: number
  closedIssues?: number
  htmlUrl?: string | null
}

export interface MilestoneInfo {
  id: number
  repositoryId: number
  milestoneNumber: number
  milestoneId: bigint
  title: string
  description: string | null
  state: string
  dueOn: Date | null
  closedAt: Date | null
  openIssues: number
  closedIssues: number
  htmlUrl: string | null
  progress: number
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// Milestone CRUD Operations
// =============================================================================

/**
 * Upsert a milestone (create or update)
 */
export async function upsertMilestone(data: MilestoneData): Promise<{ id: number }> {
  return prisma.gitHubMilestone.upsert({
    where: {
      repositoryId_milestoneNumber: {
        repositoryId: data.repositoryId,
        milestoneNumber: data.milestoneNumber,
      },
    },
    create: {
      repositoryId: data.repositoryId,
      milestoneNumber: data.milestoneNumber,
      milestoneId: data.milestoneId,
      title: data.title,
      description: data.description,
      state: data.state,
      dueOn: data.dueOn,
      closedAt: data.closedAt,
      openIssues: data.openIssues ?? 0,
      closedIssues: data.closedIssues ?? 0,
      htmlUrl: data.htmlUrl,
    },
    update: {
      title: data.title,
      description: data.description,
      state: data.state,
      dueOn: data.dueOn,
      closedAt: data.closedAt,
      openIssues: data.openIssues ?? 0,
      closedIssues: data.closedIssues ?? 0,
      htmlUrl: data.htmlUrl,
    },
    select: { id: true },
  })
}

/**
 * Get all milestones for a repository
 */
export async function getMilestones(
  repositoryId: number,
  options?: {
    state?: 'open' | 'closed' | 'all'
    limit?: number
    offset?: number
  }
): Promise<MilestoneInfo[]> {
  const where: Record<string, unknown> = { repositoryId }

  if (options?.state && options.state !== 'all') {
    where.state = options.state
  }

  const milestones = await prisma.gitHubMilestone.findMany({
    where,
    orderBy: [{ state: 'asc' }, { dueOn: 'asc' }, { milestoneNumber: 'desc' }],
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  })

  return milestones.map((m) => ({
    ...m,
    progress: m.openIssues + m.closedIssues > 0
      ? Math.round((m.closedIssues / (m.openIssues + m.closedIssues)) * 100)
      : 0,
  }))
}

/**
 * Get a single milestone by number
 */
export async function getMilestoneByNumber(
  repositoryId: number,
  milestoneNumber: number
): Promise<MilestoneInfo | null> {
  const milestone = await prisma.gitHubMilestone.findUnique({
    where: {
      repositoryId_milestoneNumber: {
        repositoryId,
        milestoneNumber,
      },
    },
  })

  if (!milestone) return null

  return {
    ...milestone,
    progress: milestone.openIssues + milestone.closedIssues > 0
      ? Math.round((milestone.closedIssues / (milestone.openIssues + milestone.closedIssues)) * 100)
      : 0,
  }
}

/**
 * Get milestones for a project (via repository)
 */
export async function getProjectMilestones(
  projectId: number,
  options?: {
    state?: 'open' | 'closed' | 'all'
    limit?: number
  }
): Promise<MilestoneInfo[]> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
    select: { id: true },
  })

  if (!repo) return []

  return getMilestones(repo.id, options)
}

/**
 * Get milestone statistics for a project
 */
export async function getMilestoneStats(projectId: number): Promise<{
  total: number
  open: number
  closed: number
  overdue: number
  upcomingDue: number
}> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
    select: { id: true },
  })

  if (!repo) {
    return { total: 0, open: 0, closed: 0, overdue: 0, upcomingDue: 0 }
  }

  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [total, open, closed, overdue, upcomingDue] = await Promise.all([
    prisma.gitHubMilestone.count({ where: { repositoryId: repo.id } }),
    prisma.gitHubMilestone.count({ where: { repositoryId: repo.id, state: 'open' } }),
    prisma.gitHubMilestone.count({ where: { repositoryId: repo.id, state: 'closed' } }),
    prisma.gitHubMilestone.count({
      where: {
        repositoryId: repo.id,
        state: 'open',
        dueOn: { lt: now },
      },
    }),
    prisma.gitHubMilestone.count({
      where: {
        repositoryId: repo.id,
        state: 'open',
        dueOn: { gte: now, lte: nextWeek },
      },
    }),
  ])

  return { total, open, closed, overdue, upcomingDue }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(
  repositoryId: number,
  milestoneNumber: number
): Promise<void> {
  await prisma.gitHubMilestone.delete({
    where: {
      repositoryId_milestoneNumber: {
        repositoryId,
        milestoneNumber,
      },
    },
  })
}

/**
 * Sync milestones from GitHub webhook data
 */
export async function syncMilestoneFromWebhook(
  repositoryId: number,
  action: string,
  milestoneData: {
    number: number
    id: number
    title: string
    description?: string | null
    state: string
    due_on?: string | null
    closed_at?: string | null
    open_issues: number
    closed_issues: number
    html_url: string
  }
): Promise<{ id: number } | null> {
  if (action === 'deleted') {
    await deleteMilestone(repositoryId, milestoneData.number)
    return null
  }

  return upsertMilestone({
    repositoryId,
    milestoneNumber: milestoneData.number,
    milestoneId: BigInt(milestoneData.id),
    title: milestoneData.title,
    description: milestoneData.description,
    state: milestoneData.state as 'open' | 'closed',
    dueOn: milestoneData.due_on ? new Date(milestoneData.due_on) : null,
    closedAt: milestoneData.closed_at ? new Date(milestoneData.closed_at) : null,
    openIssues: milestoneData.open_issues,
    closedIssues: milestoneData.closed_issues,
    htmlUrl: milestoneData.html_url,
  })
}

// =============================================================================
// Export namespace for grouped imports
// =============================================================================

export const milestoneService = {
  upsertMilestone,
  getMilestones,
  getMilestoneByNumber,
  getProjectMilestones,
  getMilestoneStats,
  deleteMilestone,
  syncMilestoneFromWebhook,
}
