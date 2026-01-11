/*
 * GitHub Issue Sync Service
 * Version: 2.0.0
 *
 * Handles bidirectional synchronization between GitHub issues and Kanbu tasks.
 * - Fase 5: Issue Sync (GitHub → Kanbu) - Inbound
 * - Fase 6: Issue Sync (Kanbu → GitHub) - Outbound
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 5+6 - Issue Sync Bidirectional
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'
import { getInstallationOctokit } from './githubService'
import { generateTaskReference } from '../../lib/project'
import { getNextTaskPosition } from '../../lib/task'
import { processGitHubImages } from './githubImageService'
import type { SyncDirection } from '@kanbu/shared'

// =============================================================================
// Types
// =============================================================================

interface GitHubIssueData {
  number: number
  id: number
  title: string
  body: string | null
  body_html?: string | null // HTML rendered body with JWT-embedded image URLs
  state: 'open' | 'closed'
  labels: Array<{ name: string; color?: string }>
  assignees: Array<{ login: string; id: number }>
  milestone?: { title: string; number: number } | null
  created_at: string
  updated_at: string
  closed_at?: string | null
}

export interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: Array<{ issueNumber: number; error: string }>
}

export interface ImportProgress {
  total: number
  processed: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: ImportResult
  error?: string
}

interface OutboundSyncResult {
  issueNumber: number
  issueId: bigint
  created: boolean
  updated: boolean
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

/**
 * Look up GitHub login from Kanbu user ID (reverse mapping for outbound sync)
 */
export async function mapKanbuUserToGitHub(
  userId: number,
  workspaceId: number
): Promise<string | null> {
  const mapping = await prisma.gitHubUserMapping.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { githubLogin: true },
  })

  return mapping?.githubLogin ?? null
}

/**
 * Map Kanbu assignee user IDs to GitHub logins (for outbound sync)
 */
export async function mapKanbuAssigneesToGitHub(
  userIds: number[],
  workspaceId: number
): Promise<{ mapped: string[]; unmapped: number[] }> {
  const mapped: string[] = []
  const unmapped: number[] = []

  for (const userId of userIds) {
    const githubLogin = await mapKanbuUserToGitHub(userId, workspaceId)
    if (githubLogin) {
      mapped.push(githubLogin)
    } else {
      unmapped.push(userId)
    }
  }

  return { mapped, unmapped }
}

// =============================================================================
// Sync Hash (Conflict Detection)
// =============================================================================

/**
 * Calculate a sync hash for conflict detection
 * Hash is based on title, description, and state
 */
export function calculateSyncHash(
  title: string,
  description: string | null,
  state: 'open' | 'closed'
): string {
  const crypto = require('crypto')
  const content = JSON.stringify({
    title: title.trim(),
    description: (description || '').trim(),
    state,
  })
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 64)
}

/**
 * Check if a task has changed since last sync (for conflict detection)
 */
export async function hasTaskChangedSinceSync(
  taskId: number
): Promise<{ changed: boolean; currentHash: string; lastHash: string | null }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      description: true,
      isActive: true,
      githubIssue: {
        select: { syncHash: true },
      },
    },
  })

  if (!task) {
    throw new Error(`Task ${taskId} not found`)
  }

  const currentHash = calculateSyncHash(
    task.title,
    task.description,
    task.isActive ? 'open' : 'closed'
  )

  const lastHash = task.githubIssue?.syncHash ?? null

  return {
    changed: lastHash !== currentHash,
    currentHash,
    lastHash,
  }
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

/**
 * Convert Kanbu tags to GitHub label names (for outbound sync)
 * Returns array of label names
 */
export async function getLabelsFromTags(
  taskId: number
): Promise<string[]> {
  const taskTags = await prisma.taskTag.findMany({
    where: { taskId },
    include: {
      tag: {
        select: { name: true },
      },
    },
  })

  return taskTags.map((tt) => tt.tag.name)
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
  // columns is guaranteed to have at least one element due to check above
  const column = state === 'open' ? columns[0]! : columns[columns.length - 1]!
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

  // Get repository with project info and installation (for image downloads)
  const repository = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    include: {
      project: {
        include: {
          workspace: true,
        },
      },
      installation: true,
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
  let creatorId: number | null = assigneeIds.length > 0 ? assigneeIds[0]! : null

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

  // Process GitHub images in the issue body - download and store locally
  // Uses body_html (if available) to get JWT-embedded URLs for user-attachments
  let processedDescription = issue.body || undefined
  if (issue.body && repository.installation) {
    try {
      const imageResult = await processGitHubImages(
        issue.body,
        repository.installation.installationId,
        issue.body_html // Contains JWT-embedded URLs for downloading
      )
      processedDescription = imageResult.content || undefined

      if (imageResult.imagesDownloaded > 0) {
        console.log(
          `[IssueSyncService] Downloaded ${imageResult.imagesDownloaded} images for issue #${issue.number}`
        )
      }
      if (imageResult.imagesFailed > 0) {
        console.warn(
          `[IssueSyncService] Failed to download ${imageResult.imagesFailed} images for issue #${issue.number}`
        )
      }
    } catch (error) {
      console.warn('[IssueSyncService] Failed to process images, using original body:', error)
      // Continue with original body if image processing fails
    }
  }

  // Create task
  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      columnId,
      creatorId,
      title: issue.title,
      description: processedDescription,
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
          installation: true,
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

  // Process GitHub images in the issue body - download and store locally
  // Uses body_html (if available) to get JWT-embedded URLs for user-attachments
  let processedDescription = issue.body || undefined
  if (issue.body && repository.installation) {
    try {
      const imageResult = await processGitHubImages(
        issue.body,
        repository.installation.installationId,
        issue.body_html // Contains JWT-embedded URLs for downloading
      )
      processedDescription = imageResult.content || undefined

      if (imageResult.imagesDownloaded > 0) {
        console.log(
          `[IssueSyncService] Downloaded ${imageResult.imagesDownloaded} images for issue update #${issue.number}`
        )
      }
    } catch (error) {
      console.warn('[IssueSyncService] Failed to process images on update, using original body:', error)
    }
  }

  // Update task
  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: issue.title,
      description: processedDescription,
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
  const repository = await prisma.gitHubRepository.findFirst({
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

    // Fetch issues from GitHub with full media type to get body_html
    // body_html contains JWT-embedded image URLs that allow downloading user-attachments
    const issues = await octokit.rest.issues.listForRepo({
      owner: repository.owner,
      repo: repository.name,
      state: state === 'all' ? 'all' : state,
      since: since?.toISOString(),
      per_page: Math.min(limit, 100),
      sort: 'created',
      direction: 'asc',
      mediaType: { format: 'full' },
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
          body: issue.body ?? null,
          body_html: (issue as { body_html?: string }).body_html ?? null,
          state: issue.state as 'open' | 'closed',
          labels: (issue.labels as Array<{ name?: string; color?: string } | string>)
            .filter((label): label is { name: string; color?: string } =>
              typeof label === 'object' && label !== null && 'name' in label && typeof label.name === 'string'
            )
            .map((label) => ({
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
// Outbound Sync: Task → GitHub Issue (Fase 6)
// =============================================================================

/**
 * Create a GitHub issue from a Kanbu task
 * Used when a task is created in Kanbu and needs to be synced to GitHub
 */
export async function createGitHubIssueFromTask(
  taskId: number,
  options: {
    syncDirection?: SyncDirection
  } = {}
): Promise<OutboundSyncResult> {
  const { syncDirection = 'kanbu_to_github' } = options

  // Get task with all related data
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          workspace: true,
          githubRepositories: {
            include: {
              installation: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      assignees: {
        include: {
          user: true,
        },
      },
      githubIssue: true,
    },
  })

  if (!task) {
    throw new Error(`Task ${taskId} not found`)
  }

  // Get primary repository or first available
  const repository = task.project.githubRepositories.find(r => r.isPrimary) || task.project.githubRepositories[0]
  if (!repository) {
    throw new Error(`Project ${task.project.id} has no linked GitHub repository`)
  }

  // Check if task already has a GitHub issue
  if (task.githubIssue) {
    throw new Error(`Task ${taskId} already has GitHub issue #${task.githubIssue.issueNumber}`)
  }

  const workspaceId = task.project.workspaceId

  // Get Octokit client
  const octokit = await getInstallationOctokit(repository.installation.installationId)

  // Map assignees to GitHub logins
  const assigneeUserIds = task.assignees.map((a) => a.user.id)
  const { mapped: assigneeLogins } = await mapKanbuAssigneesToGitHub(
    assigneeUserIds,
    workspaceId
  )

  // Get labels from tags
  const labels = await getLabelsFromTags(taskId)

  // Determine state based on isActive
  const state: 'open' | 'closed' = task.isActive ? 'open' : 'closed'

  // Create the GitHub issue
  const response = await octokit.rest.issues.create({
    owner: repository.owner,
    repo: repository.name,
    title: task.title,
    body: task.description || undefined,
    labels: labels.length > 0 ? labels : undefined,
    assignees: assigneeLogins.length > 0 ? assigneeLogins : undefined,
  })

  const issueNumber = response.data.number
  const issueId = BigInt(response.data.id)

  // If task is inactive (closed), close the issue
  if (!task.isActive) {
    await octokit.rest.issues.update({
      owner: repository.owner,
      repo: repository.name,
      issue_number: issueNumber,
      state: 'closed',
    })
  }

  // Calculate sync hash
  const syncHash = calculateSyncHash(task.title, task.description, state)

  // Create GitHubIssue record
  await prisma.gitHubIssue.create({
    data: {
      repositoryId: repository.id,
      taskId: task.id,
      issueNumber,
      issueId,
      title: task.title,
      state,
      syncDirection,
      syncHash,
      lastSyncAt: new Date(),
    },
  })

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: repository.id,
      action: 'issue_created',
      direction: 'kanbu_to_github',
      entityType: 'issue',
      entityId: String(issueNumber),
      status: 'success',
      details: {
        taskId: task.id,
        taskReference: task.reference,
        issueNumber,
        assigneesMapped: assigneeLogins.length,
        labelsAdded: labels.length,
      },
    },
  })

  return {
    issueNumber,
    issueId,
    created: true,
    updated: false,
  }
}

/**
 * Update a GitHub issue from a Kanbu task
 * Used when a task is edited in Kanbu and needs to be synced to GitHub
 */
export async function updateGitHubIssueFromTask(
  taskId: number,
  options: {
    force?: boolean // Skip conflict check
  } = {}
): Promise<OutboundSyncResult> {
  const { force = false } = options

  // Get task with all related data
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          workspace: true,
          githubRepositories: {
            include: {
              installation: true,
            },
          },
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      assignees: {
        include: {
          user: true,
        },
      },
      githubIssue: true,
    },
  })

  if (!task) {
    throw new Error(`Task ${taskId} not found`)
  }

  // Get primary repository or first available
  const repository = task.project.githubRepositories.find(r => r.isPrimary) || task.project.githubRepositories[0]
  if (!repository) {
    throw new Error(`Project ${task.project.id} has no linked GitHub repository`)
  }

  const githubIssue = task.githubIssue
  if (!githubIssue) {
    throw new Error(`Task ${taskId} has no linked GitHub issue`)
  }

  const workspaceId = task.project.workspaceId

  // Conflict detection (unless force is true)
  if (!force) {
    const state: 'open' | 'closed' = task.isActive ? 'open' : 'closed'
    const currentHash = calculateSyncHash(task.title, task.description, state)

    // If the hash hasn't changed, skip the update
    if (githubIssue.syncHash === currentHash) {
      return {
        issueNumber: githubIssue.issueNumber,
        issueId: githubIssue.issueId,
        created: false,
        updated: false,
      }
    }
  }

  // Get Octokit client
  const octokit = await getInstallationOctokit(repository.installation.installationId)

  // Map assignees to GitHub logins
  const assigneeUserIds = task.assignees.map((a) => a.user.id)
  const { mapped: assigneeLogins } = await mapKanbuAssigneesToGitHub(
    assigneeUserIds,
    workspaceId
  )

  // Get labels from tags
  const labels = await getLabelsFromTags(taskId)

  // Determine state
  const state: 'open' | 'closed' = task.isActive ? 'open' : 'closed'

  // Update the GitHub issue
  await octokit.rest.issues.update({
    owner: repository.owner,
    repo: repository.name,
    issue_number: githubIssue.issueNumber,
    title: task.title,
    body: task.description || '',
    labels,
    assignees: assigneeLogins,
    state,
  })

  // Calculate new sync hash
  const syncHash = calculateSyncHash(task.title, task.description, state)

  // Update GitHubIssue record
  await prisma.gitHubIssue.update({
    where: { id: githubIssue.id },
    data: {
      title: task.title,
      state,
      syncHash,
      lastSyncAt: new Date(),
    },
  })

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: repository.id,
      action: 'issue_updated',
      direction: 'kanbu_to_github',
      entityType: 'issue',
      entityId: String(githubIssue.issueNumber),
      status: 'success',
      details: {
        taskId: task.id,
        issueNumber: githubIssue.issueNumber,
        newState: state,
        assigneesMapped: assigneeLogins.length,
        labelsUpdated: labels.length,
      },
    },
  })

  return {
    issueNumber: githubIssue.issueNumber,
    issueId: githubIssue.issueId,
    created: false,
    updated: true,
  }
}

/**
 * Sync a task to GitHub - creates issue if not exists, updates if exists
 */
export async function syncTaskToGitHub(
  taskId: number,
  options: {
    syncDirection?: SyncDirection
    force?: boolean
  } = {}
): Promise<OutboundSyncResult> {
  // Check if task already has a GitHub issue
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { githubIssue: true },
  })

  if (!task) {
    throw new Error(`Task ${taskId} not found`)
  }

  if (task.githubIssue) {
    // Update existing issue
    return updateGitHubIssueFromTask(taskId, { force: options.force })
  } else {
    // Create new issue
    return createGitHubIssueFromTask(taskId, { syncDirection: options.syncDirection })
  }
}

// =============================================================================
// Export
// =============================================================================

export const issueSyncService = {
  // Inbound (GitHub → Kanbu)
  mapGitHubUserToKanbu,
  mapGitHubAssignees,
  getOrCreateTagsFromLabels,
  getColumnForIssueState,
  createTaskFromGitHubIssue,
  updateTaskFromGitHubIssue,
  importIssuesFromGitHub,
  getImportProgress,
  clearImportProgress,
  // Outbound (Kanbu → GitHub)
  mapKanbuUserToGitHub,
  mapKanbuAssigneesToGitHub,
  getLabelsFromTags,
  calculateSyncHash,
  hasTaskChangedSinceSync,
  createGitHubIssueFromTask,
  updateGitHubIssueFromTask,
  syncTaskToGitHub,
}
