/*
 * PR & Commit Linking Service
 * Version: 1.0.0
 *
 * Handles linking of Pull Requests and Commits to Kanbu Tasks.
 * Supports auto-linking via branch patterns, PR title/body, and commit messages.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 7 - PR & Commit Tracking
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'
import type { GitHubSyncSettings } from '@kanbu/shared'

// =============================================================================
// Types
// =============================================================================

export interface TaskReference {
  prefix: string       // e.g., "PROJ" or ""
  number: number       // e.g., 123
  fullReference: string // e.g., "PROJ-123" or "#123"
}

export interface PRLinkResult {
  prId: number
  taskId: number | null
  linked: boolean
  method: 'branch' | 'title' | 'body' | 'manual' | 'none'
}

export interface CommitLinkResult {
  commitId: number
  taskId: number | null
  linked: boolean
  method: 'message' | 'manual' | 'none'
}

export interface LinkingOptions {
  repositoryId: number
  projectId: number
  taskReferencePattern?: string
  branchPattern?: string
}

// =============================================================================
// Task Reference Patterns
// =============================================================================

/**
 * Default patterns for task reference extraction:
 * - PREFIX-123: Standard project prefix format (e.g., PROJ-123, KANBU-456)
 * - #123: GitHub-style issue reference
 * - [PREFIX-123]: Bracketed format often used in commit messages
 */
const DEFAULT_TASK_PATTERN = /(?:\[)?([A-Z]{2,10})-(\d+)(?:\])?|#(\d+)/gi

/**
 * Default branch pattern for task extraction:
 * - feature/PREFIX-123-description
 * - fix/PREFIX-123-description
 * - bugfix/123-description
 * - PREFIX-123/description
 */
const DEFAULT_BRANCH_PATTERN = /(?:feature|fix|bugfix|hotfix|task)\/(?:([A-Z]{2,10})-)?(\d+)(?:-|\/|$)|^([A-Z]{2,10})-(\d+)(?:-|\/)/i

// =============================================================================
// Reference Extraction Functions
// =============================================================================

/**
 * Extract task references from text using a pattern
 */
export function extractTaskReferences(
  text: string,
  customPattern?: string
): TaskReference[] {
  const references: TaskReference[] = []
  const seenReferences = new Set<string>()

  // Use custom pattern if provided, otherwise use default
  const pattern = customPattern
    ? new RegExp(customPattern, 'gi')
    : DEFAULT_TASK_PATTERN

  let match
  while ((match = pattern.exec(text)) !== null) {
    let prefix = ''
    let number = 0

    if (customPattern) {
      // For custom patterns, assume first capture group is prefix, second is number
      // or just one group for number
      if (match[1] && match[2]) {
        prefix = match[1].toUpperCase()
        number = parseInt(match[2], 10)
      } else if (match[1]) {
        number = parseInt(match[1], 10)
      }
    } else {
      // Default pattern handling
      if (match[1] && match[2]) {
        // PREFIX-123 format
        prefix = match[1].toUpperCase()
        number = parseInt(match[2], 10)
      } else if (match[3]) {
        // #123 format
        number = parseInt(match[3], 10)
      }
    }

    if (number > 0) {
      const fullReference = prefix ? `${prefix}-${number}` : `#${number}`

      // Avoid duplicates
      if (!seenReferences.has(fullReference)) {
        seenReferences.add(fullReference)
        references.push({
          prefix,
          number,
          fullReference,
        })
      }
    }
  }

  return references
}

/**
 * Extract task reference from branch name
 */
export function extractTaskFromBranch(
  branchName: string,
  customPattern?: string
): TaskReference | null {
  const pattern = customPattern
    ? new RegExp(customPattern, 'i')
    : DEFAULT_BRANCH_PATTERN

  const match = pattern.exec(branchName)
  if (!match) {
    return null
  }

  let prefix = ''
  let number = 0

  // Handle different match group positions based on pattern
  if (customPattern) {
    if (match[1] && match[2]) {
      prefix = match[1].toUpperCase()
      number = parseInt(match[2], 10)
    } else if (match[1]) {
      number = parseInt(match[1], 10)
    }
  } else {
    // Default pattern has multiple possible positions
    if (match[1] && match[2]) {
      // feature/PREFIX-123 format
      prefix = match[1].toUpperCase()
      number = parseInt(match[2], 10)
    } else if (match[2]) {
      // feature/123 format (no prefix)
      number = parseInt(match[2], 10)
    } else if (match[3] && match[4]) {
      // PREFIX-123/ format
      prefix = match[3].toUpperCase()
      number = parseInt(match[4], 10)
    }
  }

  if (number <= 0) {
    return null
  }

  return {
    prefix,
    number,
    fullReference: prefix ? `${prefix}-${number}` : `#${number}`,
  }
}

// =============================================================================
// Task Resolution Functions
// =============================================================================

/**
 * Find task by reference number within a project
 * First tries to match by task reference (prefix + number),
 * then falls back to task ID if no prefix match
 */
export async function findTaskByReference(
  projectId: number,
  reference: TaskReference
): Promise<{ taskId: number; reference: string } | null> {
  // Get project to check identifier (prefix)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, identifier: true },
  })

  if (!project) {
    return null
  }

  // If reference has a prefix, it should match the project identifier
  if (reference.prefix) {
    if (project.identifier?.toUpperCase() !== reference.prefix) {
      // Prefix doesn't match this project
      return null
    }

    // Find task by reference number within project
    const task = await prisma.task.findFirst({
      where: {
        projectId,
        reference: `${reference.prefix}-${reference.number}`,
      },
      select: { id: true, reference: true },
    })

    if (task?.reference) {
      return { taskId: task.id, reference: task.reference }
    }
  } else {
    // No prefix - try to find by number (less reliable)
    // First, try to find a task with reference matching project identifier + number
    if (project.identifier) {
      const task = await prisma.task.findFirst({
        where: {
          projectId,
          reference: `${project.identifier}-${reference.number}`,
        },
        select: { id: true, reference: true },
      })

      if (task?.reference) {
        return { taskId: task.id, reference: task.reference }
      }
    }

    // As a last resort, search for any task ending with the number
    // This is less precise but can catch #123 style references
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        reference: {
          endsWith: `-${reference.number}`,
        },
      },
      select: { id: true, reference: true },
      take: 1,
    })

    const firstTask = tasks[0]
    if (firstTask?.reference) {
      return { taskId: firstTask.id, reference: firstTask.reference }
    }
  }

  return null
}

/**
 * Find task from multiple references (returns first match)
 */
export async function findTaskFromReferences(
  projectId: number,
  references: TaskReference[]
): Promise<{ taskId: number; reference: string; matchedRef: TaskReference } | null> {
  for (const ref of references) {
    const result = await findTaskByReference(projectId, ref)
    if (result) {
      return { ...result, matchedRef: ref }
    }
  }
  return null
}

// =============================================================================
// PR Linking Functions
// =============================================================================

/**
 * Auto-link a PR to a task based on branch name, title, and body
 */
export async function autoLinkPRToTask(
  prId: number,
  options: LinkingOptions
): Promise<PRLinkResult> {
  const pr = await prisma.gitHubPullRequest.findUnique({
    where: { id: prId },
    select: {
      id: true,
      title: true,
      headBranch: true,
      taskId: true,
    },
  })

  if (!pr) {
    return { prId, taskId: null, linked: false, method: 'none' }
  }

  // Already linked
  if (pr.taskId) {
    return { prId, taskId: pr.taskId, linked: true, method: 'manual' }
  }

  const { projectId, taskReferencePattern, branchPattern } = options

  // Try linking by branch name first
  const branchRef = extractTaskFromBranch(pr.headBranch, branchPattern)
  if (branchRef) {
    const task = await findTaskByReference(projectId, branchRef)
    if (task) {
      await prisma.gitHubPullRequest.update({
        where: { id: prId },
        data: { taskId: task.taskId },
      })
      return { prId, taskId: task.taskId, linked: true, method: 'branch' }
    }
  }

  // Try linking by title
  const titleRefs = extractTaskReferences(pr.title, taskReferencePattern)
  if (titleRefs.length > 0) {
    const task = await findTaskFromReferences(projectId, titleRefs)
    if (task) {
      await prisma.gitHubPullRequest.update({
        where: { id: prId },
        data: { taskId: task.taskId },
      })
      return { prId, taskId: task.taskId, linked: true, method: 'title' }
    }
  }

  return { prId, taskId: null, linked: false, method: 'none' }
}

/**
 * Auto-link PR using full PR data (including body from webhook)
 */
export async function autoLinkPRToTaskWithBody(
  prId: number,
  prBody: string | null,
  options: LinkingOptions
): Promise<PRLinkResult> {
  // First try without body
  const result = await autoLinkPRToTask(prId, options)
  if (result.linked) {
    return result
  }

  // Try body if available
  if (prBody) {
    const { projectId, taskReferencePattern } = options
    const bodyRefs = extractTaskReferences(prBody, taskReferencePattern)
    if (bodyRefs.length > 0) {
      const task = await findTaskFromReferences(projectId, bodyRefs)
      if (task) {
        await prisma.gitHubPullRequest.update({
          where: { id: prId },
          data: { taskId: task.taskId },
        })
        return { prId, taskId: task.taskId, linked: true, method: 'body' }
      }
    }
  }

  return { prId, taskId: null, linked: false, method: 'none' }
}

/**
 * Manually link a PR to a task
 */
export async function linkPRToTask(
  prId: number,
  taskId: number
): Promise<PRLinkResult> {
  const pr = await prisma.gitHubPullRequest.findUnique({
    where: { id: prId },
  })

  if (!pr) {
    return { prId, taskId: null, linked: false, method: 'none' }
  }

  await prisma.gitHubPullRequest.update({
    where: { id: prId },
    data: { taskId },
  })

  return { prId, taskId, linked: true, method: 'manual' }
}

/**
 * Unlink a PR from a task
 */
export async function unlinkPRFromTask(prId: number): Promise<boolean> {
  const pr = await prisma.gitHubPullRequest.findUnique({
    where: { id: prId },
  })

  if (!pr || !pr.taskId) {
    return false
  }

  await prisma.gitHubPullRequest.update({
    where: { id: prId },
    data: { taskId: null },
  })

  return true
}

// =============================================================================
// Commit Linking Functions
// =============================================================================

/**
 * Auto-link a commit to a task based on commit message
 */
export async function autoLinkCommitToTask(
  commitId: number,
  options: LinkingOptions
): Promise<CommitLinkResult> {
  const commit = await prisma.gitHubCommit.findUnique({
    where: { id: commitId },
    select: {
      id: true,
      message: true,
      taskId: true,
    },
  })

  if (!commit) {
    return { commitId, taskId: null, linked: false, method: 'none' }
  }

  // Already linked
  if (commit.taskId) {
    return { commitId, taskId: commit.taskId, linked: true, method: 'manual' }
  }

  const { projectId, taskReferencePattern } = options

  // Extract references from commit message
  const messageRefs = extractTaskReferences(commit.message, taskReferencePattern)
  if (messageRefs.length > 0) {
    const task = await findTaskFromReferences(projectId, messageRefs)
    if (task) {
      await prisma.gitHubCommit.update({
        where: { id: commitId },
        data: { taskId: task.taskId },
      })
      return { commitId, taskId: task.taskId, linked: true, method: 'message' }
    }
  }

  return { commitId, taskId: null, linked: false, method: 'none' }
}

/**
 * Manually link a commit to a task
 */
export async function linkCommitToTask(
  commitId: number,
  taskId: number
): Promise<CommitLinkResult> {
  const commit = await prisma.gitHubCommit.findUnique({
    where: { id: commitId },
  })

  if (!commit) {
    return { commitId, taskId: null, linked: false, method: 'none' }
  }

  await prisma.gitHubCommit.update({
    where: { id: commitId },
    data: { taskId },
  })

  return { commitId, taskId, linked: true, method: 'manual' }
}

/**
 * Unlink a commit from a task
 */
export async function unlinkCommitFromTask(commitId: number): Promise<boolean> {
  const commit = await prisma.gitHubCommit.findUnique({
    where: { id: commitId },
  })

  if (!commit || !commit.taskId) {
    return false
  }

  await prisma.gitHubCommit.update({
    where: { id: commitId },
    data: { taskId: null },
  })

  return true
}

// =============================================================================
// Batch Linking Functions
// =============================================================================

/**
 * Get linking options from repository sync settings
 */
export function getLinkingOptionsFromSettings(
  repositoryId: number,
  projectId: number,
  syncSettings: GitHubSyncSettings | null
): LinkingOptions {
  const options: LinkingOptions = {
    repositoryId,
    projectId,
  }

  if (syncSettings?.pullRequests?.autoLink !== false) {
    // Auto-link is enabled by default
    if (syncSettings?.branches?.pattern) {
      options.branchPattern = syncSettings.branches.pattern
    }
  }

  if (syncSettings?.commits?.autoLink !== false) {
    if (syncSettings?.commits?.pattern) {
      options.taskReferencePattern = syncSettings.commits.pattern
    }
  }

  return options
}

/**
 * Process new PR: create record and auto-link to task
 */
export async function processNewPR(
  repositoryId: number,
  prData: {
    prNumber: number
    prId: bigint
    title: string
    body: string | null
    state: 'open' | 'closed' | 'merged'
    headBranch: string
    baseBranch: string
    authorLogin: string
    mergedAt?: Date | null
    closedAt?: Date | null
  }
): Promise<PRLinkResult & { prRecordId: number }> {
  // Get repository with project info
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: {
      id: true,
      projectId: true,
      syncSettings: true,
    },
  })

  if (!repo) {
    throw new Error(`Repository ${repositoryId} not found`)
  }

  // Create or update PR record
  const existingPR = await prisma.gitHubPullRequest.findUnique({
    where: {
      repositoryId_prNumber: {
        repositoryId,
        prNumber: prData.prNumber,
      },
    },
  })

  let prRecord
  if (existingPR) {
    prRecord = await prisma.gitHubPullRequest.update({
      where: { id: existingPR.id },
      data: {
        title: prData.title,
        state: prData.state,
        headBranch: prData.headBranch,
        baseBranch: prData.baseBranch,
        mergedAt: prData.mergedAt,
        closedAt: prData.closedAt,
      },
    })
  } else {
    prRecord = await prisma.gitHubPullRequest.create({
      data: {
        repositoryId,
        prNumber: prData.prNumber,
        prId: prData.prId,
        title: prData.title,
        state: prData.state,
        headBranch: prData.headBranch,
        baseBranch: prData.baseBranch,
        authorLogin: prData.authorLogin,
        mergedAt: prData.mergedAt,
        closedAt: prData.closedAt,
      },
    })
  }

  // Check if auto-linking is enabled
  const syncSettings = repo.syncSettings as GitHubSyncSettings | null
  if (syncSettings?.pullRequests?.autoLink === false) {
    return {
      prRecordId: prRecord.id,
      prId: prRecord.id,
      taskId: prRecord.taskId,
      linked: false,
      method: 'none',
    }
  }

  // Auto-link to task
  const options = getLinkingOptionsFromSettings(repositoryId, repo.projectId, syncSettings)
  const linkResult = await autoLinkPRToTaskWithBody(prRecord.id, prData.body, options)

  return {
    prRecordId: prRecord.id,
    ...linkResult,
  }
}

/**
 * Process new commits: create records and auto-link to tasks
 */
export async function processNewCommits(
  repositoryId: number,
  commits: Array<{
    sha: string
    message: string
    authorName: string
    authorEmail: string
    authorLogin?: string | null
    committedAt: Date
  }>
): Promise<Array<CommitLinkResult & { commitRecordId: number }>> {
  // Get repository with project info
  const repo = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: {
      id: true,
      projectId: true,
      syncSettings: true,
    },
  })

  if (!repo) {
    throw new Error(`Repository ${repositoryId} not found`)
  }

  const syncSettings = repo.syncSettings as GitHubSyncSettings | null
  const autoLinkEnabled = syncSettings?.commits?.autoLink !== false
  const options = getLinkingOptionsFromSettings(repositoryId, repo.projectId, syncSettings)

  const results: Array<CommitLinkResult & { commitRecordId: number }> = []

  for (const commitData of commits) {
    // Check if commit already exists
    const existingCommit = await prisma.gitHubCommit.findUnique({
      where: {
        repositoryId_sha: {
          repositoryId,
          sha: commitData.sha,
        },
      },
    })

    let commitRecord
    if (existingCommit) {
      commitRecord = existingCommit
    } else {
      commitRecord = await prisma.gitHubCommit.create({
        data: {
          repositoryId,
          sha: commitData.sha,
          message: commitData.message,
          authorName: commitData.authorName,
          authorEmail: commitData.authorEmail,
          authorLogin: commitData.authorLogin || null,
          committedAt: commitData.committedAt,
        },
      })
    }

    // Auto-link if enabled and not already linked
    let linkResult: CommitLinkResult = {
      commitId: commitRecord.id,
      taskId: commitRecord.taskId,
      linked: commitRecord.taskId !== null,
      method: commitRecord.taskId ? 'manual' : 'none',
    }

    if (autoLinkEnabled && !commitRecord.taskId) {
      linkResult = await autoLinkCommitToTask(commitRecord.id, options)
    }

    results.push({
      commitRecordId: commitRecord.id,
      ...linkResult,
    })
  }

  return results
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Get all PRs linked to a task
 */
export async function getTaskPRs(taskId: number) {
  return prisma.gitHubPullRequest.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
          fullName: true,
        },
      },
    },
  })
}

/**
 * Get all commits linked to a task
 */
export async function getTaskCommits(taskId: number) {
  return prisma.gitHubCommit.findMany({
    where: { taskId },
    orderBy: { committedAt: 'desc' },
    include: {
      repository: {
        select: {
          owner: true,
          name: true,
          fullName: true,
        },
      },
    },
  })
}

/**
 * Get PR by repository and PR number
 */
export async function getPRByNumber(repositoryId: number, prNumber: number) {
  return prisma.gitHubPullRequest.findUnique({
    where: {
      repositoryId_prNumber: {
        repositoryId,
        prNumber,
      },
    },
  })
}

/**
 * Get commit by repository and SHA
 */
export async function getCommitBySha(repositoryId: number, sha: string) {
  return prisma.gitHubCommit.findUnique({
    where: {
      repositoryId_sha: {
        repositoryId,
        sha,
      },
    },
  })
}

// =============================================================================
// Service Export
// =============================================================================

export const prCommitLinkService = {
  // Reference extraction
  extractTaskReferences,
  extractTaskFromBranch,
  findTaskByReference,
  findTaskFromReferences,

  // PR linking
  autoLinkPRToTask,
  autoLinkPRToTaskWithBody,
  linkPRToTask,
  unlinkPRFromTask,

  // Commit linking
  autoLinkCommitToTask,
  linkCommitToTask,
  unlinkCommitFromTask,

  // Batch processing
  getLinkingOptionsFromSettings,
  processNewPR,
  processNewCommits,

  // Queries
  getTaskPRs,
  getTaskCommits,
  getPRByNumber,
  getCommitBySha,
}
