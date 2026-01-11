/*
 * Multi-Repo Service
 * Version: 1.0.0
 *
 * Service for managing multiple repositories per project.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 15 - Multi-Repo Support
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'

// =============================================================================
// Types
// =============================================================================

export interface RepositoryInfo {
  id: number
  projectId: number
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  isPrivate: boolean
  isPrimary: boolean
  syncEnabled: boolean
  lastSyncAt: Date | null
  createdAt: Date
}

export interface ProjectRepositories {
  projectId: number
  projectName: string
  primary: RepositoryInfo | null
  secondary: RepositoryInfo[]
  total: number
}

export interface CrossRepoStats {
  totalRepositories: number
  totalIssues: number
  totalPRs: number
  totalCommits: number
  byRepository: Array<{
    repository: RepositoryInfo
    issues: number
    prs: number
    commits: number
  }>
}

export interface CrossRepoSearchResult {
  type: 'issue' | 'pr' | 'commit'
  repository: RepositoryInfo
  id: number
  title?: string
  reference?: string
  url?: string
}

// =============================================================================
// Repository Management
// =============================================================================

/**
 * Get all repositories for a project
 */
export async function getProjectRepositories(
  projectId: number
): Promise<ProjectRepositories> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }

  const repositories = await prisma.gitHubRepository.findMany({
    where: { projectId },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  const repoInfos: RepositoryInfo[] = repositories.map(r => ({
    id: r.id,
    projectId: r.projectId,
    owner: r.owner,
    name: r.name,
    fullName: r.fullName,
    defaultBranch: r.defaultBranch,
    isPrivate: r.isPrivate,
    isPrimary: r.isPrimary,
    syncEnabled: r.syncEnabled,
    lastSyncAt: r.lastSyncAt,
    createdAt: r.createdAt,
  }))

  const primary = repoInfos.find(r => r.isPrimary) || null
  const secondary = repoInfos.filter(r => !r.isPrimary)

  return {
    projectId: project.id,
    projectName: project.name,
    primary,
    secondary,
    total: repoInfos.length,
  }
}

/**
 * Link a repository to a project
 */
export async function linkRepository(
  projectId: number,
  repositoryId: number,
  isPrimary = false
): Promise<RepositoryInfo> {
  // If setting as primary, unset any existing primary
  if (isPrimary) {
    await prisma.gitHubRepository.updateMany({
      where: { projectId, isPrimary: true },
      data: { isPrimary: false },
    })
  }

  // Check if this is the first repository (auto-set as primary)
  const existingCount = await prisma.gitHubRepository.count({
    where: { projectId },
  })

  const repo = await prisma.gitHubRepository.update({
    where: { id: repositoryId },
    data: {
      projectId,
      isPrimary: isPrimary || existingCount === 0,
    },
  })

  return {
    id: repo.id,
    projectId: repo.projectId,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    isPrimary: repo.isPrimary,
    syncEnabled: repo.syncEnabled,
    lastSyncAt: repo.lastSyncAt,
    createdAt: repo.createdAt,
  }
}

/**
 * Unlink a repository from a project
 */
export async function unlinkRepository(
  repositoryId: number
): Promise<void> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { projectId: true, isPrimary: true },
  })

  if (!repo) {
    throw new Error(`Repository ${repositoryId} not found`)
  }

  // Delete the repository link
  await prisma.gitHubRepository.delete({
    where: { id: repositoryId },
  })

  // If this was primary, promote another repository
  if (repo.isPrimary) {
    const nextRepo = await prisma.gitHubRepository.findFirst({
      where: { projectId: repo.projectId },
      orderBy: { createdAt: 'asc' },
    })

    if (nextRepo) {
      await prisma.gitHubRepository.update({
        where: { id: nextRepo.id },
        data: { isPrimary: true },
      })
    }
  }
}

/**
 * Set a repository as primary
 */
export async function setPrimaryRepository(
  projectId: number,
  repositoryId: number
): Promise<void> {
  // Verify repository belongs to project
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { projectId: true },
  })

  if (!repo || repo.projectId !== projectId) {
    throw new Error(`Repository ${repositoryId} does not belong to project ${projectId}`)
  }

  // Unset current primary
  await prisma.gitHubRepository.updateMany({
    where: { projectId, isPrimary: true },
    data: { isPrimary: false },
  })

  // Set new primary
  await prisma.gitHubRepository.update({
    where: { id: repositoryId },
    data: { isPrimary: true },
  })
}

/**
 * Get primary repository for a project
 */
export async function getPrimaryRepository(
  projectId: number
): Promise<RepositoryInfo | null> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId, isPrimary: true },
  })

  if (!repo) {
    // Fall back to first repository
    const firstRepo = await prisma.gitHubRepository.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    })

    if (!firstRepo) return null

    return {
      id: firstRepo.id,
      projectId: firstRepo.projectId,
      owner: firstRepo.owner,
      name: firstRepo.name,
      fullName: firstRepo.fullName,
      defaultBranch: firstRepo.defaultBranch,
      isPrivate: firstRepo.isPrivate,
      isPrimary: firstRepo.isPrimary,
      syncEnabled: firstRepo.syncEnabled,
      lastSyncAt: firstRepo.lastSyncAt,
      createdAt: firstRepo.createdAt,
    }
  }

  return {
    id: repo.id,
    projectId: repo.projectId,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    isPrimary: repo.isPrimary,
    syncEnabled: repo.syncEnabled,
    lastSyncAt: repo.lastSyncAt,
    createdAt: repo.createdAt,
  }
}

// =============================================================================
// Cross-Repo Statistics
// =============================================================================

/**
 * Get aggregated stats across all repositories in a project
 */
export async function getCrossRepoStats(
  projectId: number
): Promise<CrossRepoStats> {
  const repositories = await prisma.gitHubRepository.findMany({
    where: { projectId },
    include: {
      _count: {
        select: {
          issues: true,
          pullRequests: true,
          commits: true,
        },
      },
    },
  })

  const byRepository = repositories.map(repo => ({
    repository: {
      id: repo.id,
      projectId: repo.projectId,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.isPrivate,
      isPrimary: repo.isPrimary,
      syncEnabled: repo.syncEnabled,
      lastSyncAt: repo.lastSyncAt,
      createdAt: repo.createdAt,
    },
    issues: repo._count.issues,
    prs: repo._count.pullRequests,
    commits: repo._count.commits,
  }))

  return {
    totalRepositories: repositories.length,
    totalIssues: byRepository.reduce((sum, r) => sum + r.issues, 0),
    totalPRs: byRepository.reduce((sum, r) => sum + r.prs, 0),
    totalCommits: byRepository.reduce((sum, r) => sum + r.commits, 0),
    byRepository,
  }
}

// =============================================================================
// Cross-Repo Search
// =============================================================================

/**
 * Search across all repositories in a project
 */
export async function searchAcrossRepositories(
  projectId: number,
  query: string,
  options?: {
    types?: ('issue' | 'pr' | 'commit')[]
    limit?: number
  }
): Promise<CrossRepoSearchResult[]> {
  const { types = ['issue', 'pr', 'commit'], limit = 20 } = options || {}
  const results: CrossRepoSearchResult[] = []

  // Get all repositories for the project
  const repositories = await prisma.gitHubRepository.findMany({
    where: { projectId },
  })

  const repoMap = new Map(repositories.map(r => [r.id, r]))
  const repoIds = repositories.map(r => r.id)

  // Search issues
  if (types.includes('issue')) {
    const issues = await prisma.gitHubIssue.findMany({
      where: {
        repositoryId: { in: repoIds },
        title: { contains: query, mode: 'insensitive' },
      },
      take: limit,
    })

    for (const issue of issues) {
      const repo = repoMap.get(issue.repositoryId)
      if (repo) {
        results.push({
          type: 'issue',
          repository: {
            id: repo.id,
            projectId: repo.projectId,
            owner: repo.owner,
            name: repo.name,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            isPrivate: repo.isPrivate,
            isPrimary: repo.isPrimary,
            syncEnabled: repo.syncEnabled,
            lastSyncAt: repo.lastSyncAt,
            createdAt: repo.createdAt,
          },
          id: issue.id,
          title: issue.title,
          reference: `${repo.fullName}#${issue.issueNumber}`,
          url: `https://github.com/${repo.fullName}/issues/${issue.issueNumber}`,
        })
      }
    }
  }

  // Search PRs
  if (types.includes('pr')) {
    const prs = await prisma.gitHubPullRequest.findMany({
      where: {
        repositoryId: { in: repoIds },
        title: { contains: query, mode: 'insensitive' },
      },
      take: limit,
    })

    for (const pr of prs) {
      const repo = repoMap.get(pr.repositoryId)
      if (repo) {
        results.push({
          type: 'pr',
          repository: {
            id: repo.id,
            projectId: repo.projectId,
            owner: repo.owner,
            name: repo.name,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            isPrivate: repo.isPrivate,
            isPrimary: repo.isPrimary,
            syncEnabled: repo.syncEnabled,
            lastSyncAt: repo.lastSyncAt,
            createdAt: repo.createdAt,
          },
          id: pr.id,
          title: pr.title,
          reference: `${repo.fullName}#${pr.prNumber}`,
          url: `https://github.com/${repo.fullName}/pull/${pr.prNumber}`,
        })
      }
    }
  }

  // Search commits
  if (types.includes('commit')) {
    const commits = await prisma.gitHubCommit.findMany({
      where: {
        repositoryId: { in: repoIds },
        message: { contains: query, mode: 'insensitive' },
      },
      take: limit,
    })

    for (const commit of commits) {
      const repo = repoMap.get(commit.repositoryId)
      if (repo) {
        results.push({
          type: 'commit',
          repository: {
            id: repo.id,
            projectId: repo.projectId,
            owner: repo.owner,
            name: repo.name,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            isPrivate: repo.isPrivate,
            isPrimary: repo.isPrimary,
            syncEnabled: repo.syncEnabled,
            lastSyncAt: repo.lastSyncAt,
            createdAt: repo.createdAt,
          },
          id: commit.id,
          title: commit.message.split('\n')[0],
          reference: `${repo.fullName}@${commit.sha.substring(0, 7)}`,
          url: `https://github.com/${repo.fullName}/commit/${commit.sha}`,
        })
      }
    }
  }

  return results.slice(0, limit)
}

// =============================================================================
// Cross-Repo References
// =============================================================================

/**
 * Parse cross-repo reference (e.g., "owner/repo#123")
 */
export function parseCrossRepoReference(
  reference: string
): { owner: string; repo: string; number: number; type: 'issue' | 'pr' } | null {
  // Match owner/repo#123 format
  const match = reference.match(/^([^/]+)\/([^#]+)#(\d+)$/)
  if (!match?.[1] || !match[2] || !match[3]) return null

  return {
    owner: match[1],
    repo: match[2],
    number: parseInt(match[3], 10),
    type: 'issue', // Could be either, needs API call to determine
  }
}

/**
 * Find cross-repo references in text
 */
export function findCrossRepoReferences(
  text: string
): Array<{ owner: string; repo: string; number: number }> {
  const references: Array<{ owner: string; repo: string; number: number }> = []

  // Match owner/repo#123 format
  const regex = /([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)#(\d+)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const owner = match[1]
    const repo = match[2]
    const num = match[3]
    if (owner && repo && num) {
      references.push({
        owner,
        repo,
        number: parseInt(num, 10),
      })
    }
  }

  return references
}

/**
 * Resolve cross-repo references to actual issues/PRs
 */
export async function resolveCrossRepoReferences(
  projectId: number,
  references: Array<{ owner: string; repo: string; number: number }>
): Promise<CrossRepoSearchResult[]> {
  const results: CrossRepoSearchResult[] = []

  // Get all repositories for the project
  const repositories = await prisma.gitHubRepository.findMany({
    where: { projectId },
  })

  for (const ref of references) {
    const repo = repositories.find(r => r.owner === ref.owner && r.name === ref.repo)
    if (!repo) continue

    // Try to find as issue first
    const issue = await prisma.gitHubIssue.findUnique({
      where: {
        repositoryId_issueNumber: {
          repositoryId: repo.id,
          issueNumber: ref.number,
        },
      },
    })

    if (issue) {
      results.push({
        type: 'issue',
        repository: {
          id: repo.id,
          projectId: repo.projectId,
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          isPrivate: repo.isPrivate,
          isPrimary: repo.isPrimary,
          syncEnabled: repo.syncEnabled,
          lastSyncAt: repo.lastSyncAt,
          createdAt: repo.createdAt,
        },
        id: issue.id,
        title: issue.title,
        reference: `${repo.fullName}#${issue.issueNumber}`,
        url: `https://github.com/${repo.fullName}/issues/${issue.issueNumber}`,
      })
      continue
    }

    // Try as PR
    const pr = await prisma.gitHubPullRequest.findUnique({
      where: {
        repositoryId_prNumber: {
          repositoryId: repo.id,
          prNumber: ref.number,
        },
      },
    })

    if (pr) {
      results.push({
        type: 'pr',
        repository: {
          id: repo.id,
          projectId: repo.projectId,
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          isPrivate: repo.isPrivate,
          isPrimary: repo.isPrimary,
          syncEnabled: repo.syncEnabled,
          lastSyncAt: repo.lastSyncAt,
          createdAt: repo.createdAt,
        },
        id: pr.id,
        title: pr.title,
        reference: `${repo.fullName}#${pr.prNumber}`,
        url: `https://github.com/${repo.fullName}/pull/${pr.prNumber}`,
      })
    }
  }

  return results
}

// =============================================================================
// Service Export
// =============================================================================

export const multiRepoService = {
  // Repository management
  getProjectRepositories,
  linkRepository,
  unlinkRepository,
  setPrimaryRepository,
  getPrimaryRepository,
  // Statistics
  getCrossRepoStats,
  // Search
  searchAcrossRepositories,
  // References
  parseCrossRepoReference,
  findCrossRepoReferences,
  resolveCrossRepoReferences,
}

export default multiRepoService
