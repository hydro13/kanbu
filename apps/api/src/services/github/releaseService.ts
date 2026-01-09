/*
 * Release Service
 * Version: 1.0.0
 *
 * Service for syncing and managing GitHub releases.
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

export interface ReleaseData {
  repositoryId: number
  releaseId: bigint
  tagName: string
  name?: string | null
  body?: string | null
  draft?: boolean
  prerelease?: boolean
  authorLogin?: string | null
  htmlUrl?: string | null
  tarballUrl?: string | null
  zipballUrl?: string | null
  publishedAt?: Date | null
}

export interface ReleaseInfo {
  id: number
  repositoryId: number
  releaseId: bigint
  tagName: string
  name: string | null
  body: string | null
  draft: boolean
  prerelease: boolean
  authorLogin: string | null
  htmlUrl: string | null
  tarballUrl: string | null
  zipballUrl: string | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ReleaseStats {
  total: number
  published: number
  drafts: number
  prereleases: number
  latestRelease: ReleaseInfo | null
}

// =============================================================================
// Release CRUD Operations
// =============================================================================

/**
 * Upsert a release (create or update)
 */
export async function upsertRelease(data: ReleaseData): Promise<{ id: number }> {
  return prisma.gitHubRelease.upsert({
    where: {
      repositoryId_releaseId: {
        repositoryId: data.repositoryId,
        releaseId: data.releaseId,
      },
    },
    create: {
      repositoryId: data.repositoryId,
      releaseId: data.releaseId,
      tagName: data.tagName,
      name: data.name,
      body: data.body,
      draft: data.draft ?? false,
      prerelease: data.prerelease ?? false,
      authorLogin: data.authorLogin,
      htmlUrl: data.htmlUrl,
      tarballUrl: data.tarballUrl,
      zipballUrl: data.zipballUrl,
      publishedAt: data.publishedAt,
    },
    update: {
      tagName: data.tagName,
      name: data.name,
      body: data.body,
      draft: data.draft ?? false,
      prerelease: data.prerelease ?? false,
      authorLogin: data.authorLogin,
      htmlUrl: data.htmlUrl,
      tarballUrl: data.tarballUrl,
      zipballUrl: data.zipballUrl,
      publishedAt: data.publishedAt,
    },
    select: { id: true },
  })
}

/**
 * Get all releases for a repository
 */
export async function getReleases(
  repositoryId: number,
  options?: {
    includeDrafts?: boolean
    includePrereleases?: boolean
    limit?: number
    offset?: number
  }
): Promise<ReleaseInfo[]> {
  const where: Record<string, unknown> = { repositoryId }

  if (!options?.includeDrafts) {
    where.draft = false
  }

  if (!options?.includePrereleases) {
    where.prerelease = false
  }

  return prisma.gitHubRelease.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: options?.limit ?? 20,
    skip: options?.offset ?? 0,
  })
}

/**
 * Get a single release by tag name
 */
export async function getReleaseByTag(
  repositoryId: number,
  tagName: string
): Promise<ReleaseInfo | null> {
  return prisma.gitHubRelease.findFirst({
    where: {
      repositoryId,
      tagName,
    },
  })
}

/**
 * Get the latest release for a repository
 */
export async function getLatestRelease(
  repositoryId: number,
  options?: {
    includeDrafts?: boolean
    includePrereleases?: boolean
  }
): Promise<ReleaseInfo | null> {
  const where: Record<string, unknown> = { repositoryId }

  if (!options?.includeDrafts) {
    where.draft = false
  }

  if (!options?.includePrereleases) {
    where.prerelease = false
  }

  return prisma.gitHubRelease.findFirst({
    where,
    orderBy: { publishedAt: 'desc' },
  })
}

/**
 * Get releases for a project (via repository)
 */
export async function getProjectReleases(
  projectId: number,
  options?: {
    includeDrafts?: boolean
    includePrereleases?: boolean
    limit?: number
  }
): Promise<ReleaseInfo[]> {
  const repo = await prisma.gitHubRepository.findUnique({
    where: { projectId },
    select: { id: true },
  })

  if (!repo) return []

  return getReleases(repo.id, options)
}

/**
 * Get release statistics for a project
 */
export async function getReleaseStats(projectId: number): Promise<ReleaseStats> {
  const repo = await prisma.gitHubRepository.findUnique({
    where: { projectId },
    select: { id: true },
  })

  if (!repo) {
    return {
      total: 0,
      published: 0,
      drafts: 0,
      prereleases: 0,
      latestRelease: null,
    }
  }

  const [total, drafts, prereleases, latestRelease] = await Promise.all([
    prisma.gitHubRelease.count({ where: { repositoryId: repo.id } }),
    prisma.gitHubRelease.count({ where: { repositoryId: repo.id, draft: true } }),
    prisma.gitHubRelease.count({ where: { repositoryId: repo.id, prerelease: true, draft: false } }),
    prisma.gitHubRelease.findFirst({
      where: { repositoryId: repo.id, draft: false },
      orderBy: { publishedAt: 'desc' },
    }),
  ])

  return {
    total,
    published: total - drafts,
    drafts,
    prereleases,
    latestRelease,
  }
}

/**
 * Delete a release
 */
export async function deleteRelease(
  repositoryId: number,
  releaseId: bigint
): Promise<void> {
  await prisma.gitHubRelease.delete({
    where: {
      repositoryId_releaseId: {
        repositoryId,
        releaseId,
      },
    },
  })
}

/**
 * Sync release from GitHub webhook data
 */
export async function syncReleaseFromWebhook(
  repositoryId: number,
  action: string,
  releaseData: {
    id: number
    tag_name: string
    name?: string | null
    body?: string | null
    draft: boolean
    prerelease: boolean
    author?: { login: string } | null
    html_url: string
    tarball_url?: string | null
    zipball_url?: string | null
    published_at?: string | null
  }
): Promise<{ id: number } | null> {
  if (action === 'deleted') {
    await deleteRelease(repositoryId, BigInt(releaseData.id))
    return null
  }

  return upsertRelease({
    repositoryId,
    releaseId: BigInt(releaseData.id),
    tagName: releaseData.tag_name,
    name: releaseData.name,
    body: releaseData.body,
    draft: releaseData.draft,
    prerelease: releaseData.prerelease,
    authorLogin: releaseData.author?.login,
    htmlUrl: releaseData.html_url,
    tarballUrl: releaseData.tarball_url,
    zipballUrl: releaseData.zipball_url,
    publishedAt: releaseData.published_at ? new Date(releaseData.published_at) : null,
  })
}

/**
 * Generate release notes from completed tasks
 * Returns markdown-formatted release notes
 */
export async function generateReleaseNotes(
  projectId: number,
  options?: {
    fromDate?: Date
    toDate?: Date
    includeTaskLinks?: boolean
  }
): Promise<string> {
  const repo = await prisma.gitHubRepository.findUnique({
    where: { projectId },
    select: { id: true, fullName: true },
  })

  if (!repo) {
    return '# Release Notes\n\nNo repository linked.'
  }

  const fromDate = options?.fromDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const toDate = options?.toDate ?? new Date()

  // Get merged PRs with linked tasks in the date range
  const prsWithTasks = await prisma.gitHubPullRequest.findMany({
    where: {
      repositoryId: repo.id,
      mergedAt: {
        gte: fromDate,
        lte: toDate,
      },
      taskId: { not: null },
    },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          reference: true,
        },
      },
    },
    orderBy: { mergedAt: 'desc' },
  })

  // Group by task type (based on PR title or task reference prefix)
  const features: string[] = []
  const fixes: string[] = []
  const others: string[] = []

  for (const pr of prsWithTasks) {
    const title = pr.task?.title ?? pr.title
    const taskRef = pr.task?.reference ?? `#${pr.prNumber}`
    const prLink = options?.includeTaskLinks ? ` ([${taskRef}](https://github.com/${repo.fullName}/pull/${pr.prNumber}))` : ''

    const titleLower = pr.title.toLowerCase()
    if (titleLower.startsWith('feat') || titleLower.includes('feature') || titleLower.includes('add')) {
      features.push(`- ${title}${prLink}`)
    } else if (titleLower.startsWith('fix') || titleLower.includes('bug') || titleLower.includes('hotfix')) {
      fixes.push(`- ${title}${prLink}`)
    } else {
      others.push(`- ${title}${prLink}`)
    }
  }

  // Build release notes
  const lines: string[] = ['# Release Notes', '']

  if (features.length > 0) {
    lines.push('## Features', '', ...features, '')
  }

  if (fixes.length > 0) {
    lines.push('## Bug Fixes', '', ...fixes, '')
  }

  if (others.length > 0) {
    lines.push('## Other Changes', '', ...others, '')
  }

  if (features.length === 0 && fixes.length === 0 && others.length === 0) {
    lines.push('No changes found in the specified date range.')
  }

  return lines.join('\n')
}

// =============================================================================
// Export namespace for grouped imports
// =============================================================================

export const releaseService = {
  upsertRelease,
  getReleases,
  getReleaseByTag,
  getLatestRelease,
  getProjectReleases,
  getReleaseStats,
  deleteRelease,
  syncReleaseFromWebhook,
  generateReleaseNotes,
}
