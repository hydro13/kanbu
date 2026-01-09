/*
 * GitHub Issue Sync Service
 * Version: 1.0.0
 *
 * Handles synchronization of GitHub issues to Kanbu tasks.
 * Part of Fase 5: Issue Sync (GitHub → Kanbu)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 5 - Issue Sync Inbound
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'
import { getInstallationOctokit } from './githubService'
import { generateTaskReference } from '../../lib/project'
import { getNextTaskPosition } from '../../lib/task'
import type { SyncDirection } from '@kanbu/shared'

// =============================================================================
// Types
// =============================================================================

interface GitHubIssueData {
  number: number
  id: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  labels: Array<{ name: string; color?: string }>
  assignees: Array<{ login: string; id: number }>
  milestone?: { title: string; number: number } | null
  created_at: string
  updated_at: string
  closed_at?: string | null
}

interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: Array<{ issueNumber: number; error: string }>
}

interface ImportProgress {
  total: number
  processed: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: ImportResult
  error?: string
}

// In-memory import progress tracking
const importProgress = new Map<number, ImportProgress>()

// =============================================================================
// User Mapping
// =============================================================================

/**
 * Look up Kanbu user ID from GitHub login via workspace user mapping
 */
export async function mapGitHubUserToKanbu(
  githubLogin: string,
  workspaceId: number
): Promise<number | null> {
  const mapping = await prisma.gitHubUserMapping.findUnique({
    where: {
      workspaceId_githubLogin: {
        workspaceId,
        githubLogin,
      },
    },
    select: { userId: true },
  })

  return mapping?.userId ?? null
}

/**
 * Map multiple GitHub assignees to Kanbu user IDs
 */
export async function mapGitHubAssignees(
  assignees: Array<{ login: string }>,
  workspaceId: number
): Promise<{ mapped: number[]; unmapped: string[] }> {
  const mapped: number[] = []
  const unmapped: string[] = []

  for (const assignee of assignees) {
    const userId = await mapGitHubUserToKanbu(assignee.login, workspaceId)
    if (userId) {
      mapped.push(userId)
    } else {
      unmapped.push(assignee.login)
    }
  }

  return { mapped, unmapped }
}

// =============================================================================
// Tag/Label Mapping
// =============================================================================

/**
 * Get or create tags for GitHub labels
 * Returns array of tag IDs
 */
export async function getOrCreateTagsFromLabels(
  projectId: number,
  labels: Array<{ name: string; color?: string }>
): Promise<number[]> {
  const tagIds: number[] = []

  for (const label of labels) {
    // Try to find existing tag
    let tag = await prisma.tag.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: label.name,
        },
      },
    })

    // Create if doesn't exist
    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          projectId,
          name: label.name,
          color: label.color ? `#${label.color}` : 'grey',
        },
      })
    }

    tagIds.push(tag.id)
  }

  return tagIds
}

// =============================================================================
// Column Mapping
// =============================================================================

/**
 * Get the appropriate column for a GitHub issue state
 * - open issues → first column (typically "Backlog" or "To Do")
 * - closed issues → last column (typically "Done")
 */
export async function getColumnForIssueState(
  projectId: number,
  state: 'open' | 'closed'
): Promise<number> {
  const columns = await prisma.column.findMany({
    where: { projectId },
    orderBy: { position: 'asc' },
    select: { id: true, position: true },
  })

  if (columns.length === 0) {
    throw new Error(`Project ${projectId} has no columns`)
  }

  // Open issues go to first column, closed to last
  const column = state === 'open' ? columns[0] : columns[columns.length - 1]
  return column.id
}

// =============================================================================
// Task Creation from GitHub Issue
// =============================================================================

/**
 * Create a Kanbu task from a GitHub issue
 * Also creates/updates the GitHubIssue record
 */
export async function createTaskFromGitHubIssue(
  repositoryId: number,
  issue: GitHubIssueData,
  options: {
    syncDirection?: SyncDirection
    skipExisting?: boolean
  } = {}
): Promise<{ taskId: number; created: boolean; skipped: boolean }> {
  const { syncDirection = 'github_to_kanbu', skipExisting = true } = options

  // Get repository with project info
  const repository = await prisma.gitHubRepository.findUnique({
    where: { id: repositoryId },
    include: {
      project: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`)
  }

  const { project } = repository
  const workspaceId = project.workspaceId

  // Check if issue already exists
  const existingIssue = await prisma.gitHubIssue.findUnique({
    where: {
      repositoryId_issueNumber: {
        repositoryId,
        issueNumber: issue.number,
      },
    },
    include: { task: true },
  })

  if (existingIssue?.task && skipExisting) {
    return { taskId: existingIssue.task.id, created: false, skipped: true }
  }

  // Get column based on issue state
  const columnId = await getColumnForIssueState(project.id, issue.state)

  // Map assignees
  const { mapped: assigneeIds, unmapped } = await mapGitHubAssignees(
    issue.assignees,
    workspaceId
  )

  // Create or get tags from labels
  const tagIds = await getOrCreateTagsFromLabels(project.id, issue.labels)

  // Get next position
  const position = await getNextTaskPosition(columnId)

  // Generate task reference
  const reference = await generateTaskReference(project.id)

  // Determine creator: use first assignee, workspace creator, or any active user
  let creatorId: number | null = assigneeIds.length > 0 ? assigneeIds[0] : null

  if (!creatorId && project.workspace.createdById) {
    creatorId = project.workspace.createdById
  }

  // Fallback: find any active user
  if (!creatorId) {
    const anyUser = await prisma.user.findFirst({
      where: { isActive: true },
      select: { id: true },
    })
    if (anyUser) {
      creatorId = anyUser.id
    }
  }

  if (!creatorId) {
    throw new Error('No user available to act as task creator')
  }

  // Create task
  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      columnId,
      creatorId,
      title: issue.title,
      description: issue.body || undefined,
      reference,
      position,
      isActive: issue.state === 'open',
      createdAt: new Date(issue.created_at),
      ...(assigneeIds.length > 0 && {
        assignees: {
          createMany: {
            data: assigneeIds.map((userId) => ({ userId })),
          },
        },
      }),
      ...(tagIds.length > 0 && {
        tags: {
          createMany: {
            data: tagIds.map((tagId) => ({ tagId })),
          },
        },
      }),
    },
  })

  // Create or update GitHubIssue record
  await prisma.gitHubIssue.upsert({
    where: {
      repositoryId_issueNumber: {
        repositoryId,
        issueNumber: issue.number,
      },
    },
    create: {
      repositoryId,
      taskId: task.id,
      issueNumber: issue.number,
      issueId: BigInt(issue.id),
      title: issue.title,
      state: issue.state,
      syncDirection,
      lastSyncAt: new Date(),
    },
    update: {
      taskId: task.id,
      title: issue.title,
      state: issue.state,
      lastSyncAt: new Date(),
    },
  })

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId,
      action: 'issue_imported',
      direction: 'github_to_kanbu',
      entityType: 'issue',
      entityId: String(issue.number),
      status: 'success',
      details: {
        issueNumber: issue.number,
        taskId: task.id,
        taskReference: reference,
        assigneesMapped: assigneeIds.length,
        assigneesUnmapped: unmapped,
        tagsCreated: tagIds.length,
      },
    },
  })

  return { taskId: task.id, created: true, skipped: false }
}

// =============================================================================
// Update Task from GitHub Issue
// =============================================================================

/**
 * Update an existing Kanbu task from a GitHub issue update
 */
export async function updateTaskFromGitHubIssue(
  _issueId: number,
  issue: GitHubIssueData
): Promise<{ updated: boolean; taskId: number | null }> {
  // Find the GitHubIssue record
  const githubIssue = await prisma.gitHubIssue.findFirst({
    where: { issueId: BigInt(issue.id) },
    include: {
      task: true,
      repository: {
        include: {
          project: true,
        },
      },
    },
  })

  if (!githubIssue || !githubIssue.task) {
    return { updated: false, taskId: null }
  }

  const { task, repository } = githubIssue
  const project = repository.project

  // Get column for current state (may have changed)
  const columnId = await getColumnForIssueState(project.id, issue.state)

  // Update task
  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: issue.title,
      description: issue.body || undefined,
      columnId,
      isActive: issue.state === 'open',
      updatedAt: new Date(),
    },
  })

  // Update GitHubIssue record
  await prisma.gitHubIssue.update({
    where: { id: githubIssue.id },
    data: {
      title: issue.title,
      state: issue.state,
      lastSyncAt: new Date(),
    },
  })

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: repository.id,
      action: 'issue_updated',
      direction: 'github_to_kanbu',
      entityType: 'issue',
      entityId: String(issue.number),
      status: 'success',
      details: {
        issueNumber: issue.number,
        taskId: task.id,
        newState: issue.state,
      },
    },
  })

  return { updated: true, taskId: task.id }
}

// =============================================================================
// Bulk Import
// =============================================================================

/**
 * Import all issues from a GitHub repository
 */
export async function importIssuesFromGitHub(
  repositoryId: number,
  options: {
    state?: 'open' | 'closed' | 'all'
    since?: Date
    limit?: number
  } = {}
): Promise<ImportResult> {
  const { state = 'all', since, limit = 1000 } = options

  // Get repository with installation info
  const repository = await prisma.gitHubRepository.findUnique({
    where: { id: repositoryId },
    include: {
      installation: true,
    },
  })

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`)
  }

  // Initialize progress tracking
  importProgress.set(repositoryId, {
    total: 0,
    processed: 0,
    status: 'running',
  })

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  try {
    // Get Octokit client for installation
    const octokit = await getInstallationOctokit(repository.installation.installationId)

    // Fetch issues from GitHub
    const issues = await octokit.rest.issues.listForRepo({
      owner: repository.owner,
      repo: repository.name,
      state: state === 'all' ? 'all' : state,
      since: since?.toISOString(),
      per_page: Math.min(limit, 100),
      sort: 'created',
      direction: 'asc',
    })

    // Filter out pull requests (GitHub API returns PRs in issues endpoint)
    type GitHubApiIssue = typeof issues.data[number]
    const actualIssues = issues.data.filter((issue: GitHubApiIssue) => !issue.pull_request)

    // Update progress
    const progress = importProgress.get(repositoryId)!
    progress.total = Math.min(actualIssues.length, limit)

    // Import each issue
    for (const issue of actualIssues.slice(0, limit)) {
      try {
        const issueData: GitHubIssueData = {
          number: issue.number,
          id: issue.id,
          title: issue.title,
          body: issue.body,
          state: issue.state as 'open' | 'closed',
          labels: issue.labels
            .filter((label: string | { name: string; color?: string }): label is { name: string; color?: string } =>
              typeof label === 'object' && label !== null && 'name' in label
            )
            .map((label: { name: string; color?: string }) => ({
              name: label.name,
              color: label.color,
            })),
          assignees: issue.assignees?.map((a: { login: string; id: number }) => ({
            login: a.login,
            id: a.id,
          })) || [],
          milestone: issue.milestone ? {
            title: issue.milestone.title,
            number: issue.milestone.number,
          } : null,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          closed_at: issue.closed_at,
        }

        const { created, skipped } = await createTaskFromGitHubIssue(
          repositoryId,
          issueData,
          { skipExisting: true }
        )

        if (created) {
          result.imported++
        } else if (skipped) {
          result.skipped++
        }
      } catch (error) {
        result.failed++
        result.errors.push({
          issueNumber: issue.number,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Update progress
      progress.processed++
    }

    // Mark as completed
    progress.status = 'completed'
    progress.result = result

    // Log bulk import
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId,
        action: 'bulk_import',
        direction: 'github_to_kanbu',
        entityType: 'issue',
        status: result.failed > 0 ? 'failed' : 'success',
        details: {
          imported: result.imported,
          skipped: result.skipped,
          failed: result.failed,
          totalIssues: actualIssues.length,
        },
      },
    })

    // Update last sync time
    await prisma.gitHubRepository.update({
      where: { id: repositoryId },
      data: { lastSyncAt: new Date() },
    })

    return result
  } catch (error) {
    // Mark as failed
    const progress = importProgress.get(repositoryId)!
    progress.status = 'failed'
    progress.error = error instanceof Error ? error.message : String(error)

    throw error
  }
}

/**
 * Get import progress for a repository
 */
export function getImportProgress(repositoryId: number): ImportProgress | null {
  return importProgress.get(repositoryId) || null
}

/**
 * Clear import progress (cleanup after retrieving results)
 */
export function clearImportProgress(repositoryId: number): void {
  importProgress.delete(repositoryId)
}

// =============================================================================
// Export
// =============================================================================

export const issueSyncService = {
  mapGitHubUserToKanbu,
  mapGitHubAssignees,
  getOrCreateTagsFromLabels,
  getColumnForIssueState,
  createTaskFromGitHubIssue,
  updateTaskFromGitHubIssue,
  importIssuesFromGitHub,
  getImportProgress,
  clearImportProgress,
}
