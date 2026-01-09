/*
 * GitHub Automation Service
 * Version: 1.0.0
 *
 * Handles automated actions based on GitHub events:
 * - Branch creation from tasks
 * - Task status automation (move columns on PR events)
 * - Task closure on issue closed
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 8 - Automation
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'
import { getInstallationOctokit } from './githubService'
import type { GitHubSyncSettings } from '@kanbu/shared'

// =============================================================================
// Types
// =============================================================================

export interface BranchCreationResult {
  success: boolean
  branchName: string
  branchUrl?: string
  error?: string
}

export interface TaskStatusAutomationResult {
  success: boolean
  taskId: number
  previousColumnId?: number
  newColumnId?: number
  action: 'moved' | 'closed' | 'no_change' | 'error'
  error?: string
}

export interface AutomationSettings {
  enabled: boolean
  moveToInProgressOnPROpen: boolean
  moveToReviewOnPRReady: boolean
  moveToDoneOnPRMerge: boolean
  closeTaskOnIssueClosed: boolean
  inProgressColumn: string
  reviewColumn: string
  doneColumn: string
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  enabled: true,
  moveToInProgressOnPROpen: true,
  moveToReviewOnPRReady: true,
  moveToDoneOnPRMerge: true,
  closeTaskOnIssueClosed: true,
  inProgressColumn: 'In Progress',
  reviewColumn: 'Review',
  doneColumn: 'Done',
}

const DEFAULT_BRANCH_PATTERN = 'feature/{reference}-{slug}'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get automation settings from sync settings with defaults
 */
export function getAutomationSettings(syncSettings: GitHubSyncSettings | null): AutomationSettings {
  if (!syncSettings?.automation?.enabled) {
    return { ...DEFAULT_AUTOMATION_SETTINGS, enabled: false }
  }

  const automation = syncSettings.automation
  return {
    enabled: true,
    moveToInProgressOnPROpen: automation.moveToInProgressOnPROpen ?? true,
    moveToReviewOnPRReady: automation.moveToReviewOnPRReady ?? true,
    moveToDoneOnPRMerge: automation.moveToDoneOnPRMerge ?? true,
    closeTaskOnIssueClosed: automation.closeTaskOnIssueClosed ?? true,
    inProgressColumn: automation.inProgressColumn || 'In Progress',
    reviewColumn: automation.reviewColumn || 'Review',
    doneColumn: automation.doneColumn || 'Done',
  }
}

/**
 * Find a column by name in a project (case-insensitive)
 */
export async function findColumnByName(
  projectId: number,
  columnName: string
): Promise<{ id: number; name: string } | null> {
  const columns = await prisma.column.findMany({
    where: { projectId },
    select: { id: true, title: true },
    orderBy: { position: 'asc' },
  })

  const lowerName = columnName.toLowerCase()
  const found = columns.find(c => c.title.toLowerCase() === lowerName)
  return found ? { id: found.id, name: found.title } : null
}

/**
 * Find a column by partial match or common aliases
 */
export async function findColumnByNameFuzzy(
  projectId: number,
  targetName: string
): Promise<{ id: number; name: string } | null> {
  // First try exact match
  const exactMatch = await findColumnByName(projectId, targetName)
  if (exactMatch) return exactMatch

  // Define common aliases
  const aliases: Record<string, string[]> = {
    'in progress': ['doing', 'working', 'active', 'in-progress', 'wip'],
    'review': ['code review', 'pr review', 'reviewing', 'to review'],
    'done': ['completed', 'finished', 'closed', 'complete'],
  }

  const columns = await prisma.column.findMany({
    where: { projectId },
    select: { id: true, title: true },
    orderBy: { position: 'asc' },
  })

  const lowerTarget = targetName.toLowerCase()
  const targetAliases = aliases[lowerTarget] || []

  // Try to find by alias
  for (const column of columns) {
    const columnLower = column.title.toLowerCase()
    if (targetAliases.includes(columnLower)) {
      return { id: column.id, name: column.title }
    }
    // Also check if target is an alias of the column name
    for (const [canonical, aliasList] of Object.entries(aliases)) {
      if (aliasList.includes(lowerTarget) && columnLower === canonical) {
        return { id: column.id, name: column.title }
      }
    }
  }

  // Try partial match
  for (const column of columns) {
    if (column.title.toLowerCase().includes(lowerTarget) ||
        lowerTarget.includes(column.title.toLowerCase())) {
      return { id: column.id, name: column.title }
    }
  }

  return null
}

/**
 * Generate a URL-safe slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Replace multiple hyphens
    .substring(0, 50)               // Limit length
    .replace(/^-|-$/g, '')          // Trim hyphens
}

/**
 * Generate branch name from task reference and title
 */
export function generateBranchName(
  reference: string,
  title: string,
  pattern: string = DEFAULT_BRANCH_PATTERN
): string {
  const slug = slugify(title)
  const refLower = reference.toLowerCase()

  return pattern
    .replace('{reference}', refLower)
    .replace('{REFERENCE}', reference)
    .replace('{slug}', slug)
    .replace('{title}', slug)
}

// =============================================================================
// Branch Creation
// =============================================================================

/**
 * Create a feature branch for a task on GitHub
 */
export async function createBranchForTask(
  taskId: number,
  customBranchName?: string
): Promise<BranchCreationResult> {
  // Get task with project and repository info
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          githubRepository: {
            include: {
              installation: true,
            },
          },
        },
      },
    },
  })

  if (!task) {
    return {
      success: false,
      branchName: '',
      error: `Task ${taskId} not found`,
    }
  }

  const repository = task.project.githubRepository
  if (!repository) {
    return {
      success: false,
      branchName: '',
      error: 'Project has no linked GitHub repository',
    }
  }

  if (!repository.syncEnabled) {
    return {
      success: false,
      branchName: '',
      error: 'GitHub sync is disabled for this repository',
    }
  }

  // Get branch name
  const syncSettings = repository.syncSettings as GitHubSyncSettings | null
  const branchPattern = syncSettings?.branches?.pattern || DEFAULT_BRANCH_PATTERN
  const branchName = customBranchName || generateBranchName(task.reference, task.title, branchPattern)

  try {
    // Get Octokit for the installation
    const octokit = await getInstallationOctokit(repository.installation.installationId)

    // Get the default branch SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner: repository.owner,
      repo: repository.name,
      ref: `heads/${repository.defaultBranch}`,
    })

    const baseSha = refData.object.sha

    // Create the new branch
    await octokit.rest.git.createRef({
      owner: repository.owner,
      repo: repository.name,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    })

    // Update task with branch name
    await prisma.task.update({
      where: { id: taskId },
      data: { githubBranch: branchName },
    })

    // Log the action
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: repository.id,
        action: 'branch_created',
        direction: 'kanbu_to_github',
        entityType: 'task',
        entityId: taskId.toString(),
        details: {
          taskReference: task.reference,
          branchName,
          baseBranch: repository.defaultBranch,
          baseSha,
        },
        status: 'success',
      },
    })

    const branchUrl = `https://github.com/${repository.fullName}/tree/${branchName}`

    return {
      success: true,
      branchName,
      branchUrl,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log the error
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: repository.id,
        action: 'branch_created',
        direction: 'kanbu_to_github',
        entityType: 'task',
        entityId: taskId.toString(),
        details: {
          taskReference: task.reference,
          branchName,
        },
        status: 'failed',
        errorMessage,
      },
    })

    return {
      success: false,
      branchName,
      error: errorMessage,
    }
  }
}

/**
 * Check if a branch exists on GitHub
 */
export async function branchExists(
  repositoryId: number,
  branchName: string
): Promise<boolean> {
  const repository = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    include: { installation: true },
  })

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found`)
  }

  try {
    const octokit = await getInstallationOctokit(repository.installation.installationId)
    await octokit.rest.git.getRef({
      owner: repository.owner,
      repo: repository.name,
      ref: `heads/${branchName}`,
    })
    return true
  } catch (error) {
    // 404 means branch doesn't exist
    if ((error as { status?: number })?.status === 404) {
      return false
    }
    throw error
  }
}

// =============================================================================
// Task Status Automation
// =============================================================================

/**
 * Move task to a specific column by name
 */
export async function moveTaskToColumn(
  taskId: number,
  columnName: string
): Promise<TaskStatusAutomationResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, columnId: true },
  })

  if (!task) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Task ${taskId} not found`,
    }
  }

  // Find the target column
  const targetColumn = await findColumnByNameFuzzy(task.projectId, columnName)
  if (!targetColumn) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Column "${columnName}" not found in project`,
    }
  }

  // Check if already in target column
  if (task.columnId === targetColumn.id) {
    return {
      success: true,
      taskId,
      previousColumnId: task.columnId,
      newColumnId: targetColumn.id,
      action: 'no_change',
    }
  }

  // Get the highest position in the target column
  const maxPosition = await prisma.task.aggregate({
    where: { columnId: targetColumn.id },
    _max: { position: true },
  })
  const newPosition = (maxPosition._max.position ?? 0) + 1

  // Move the task
  await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: targetColumn.id,
      position: newPosition,
    },
  })

  return {
    success: true,
    taskId,
    previousColumnId: task.columnId,
    newColumnId: targetColumn.id,
    action: 'moved',
  }
}

/**
 * Close a task (set isActive to false)
 */
export async function closeTask(taskId: number): Promise<TaskStatusAutomationResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, isActive: true },
  })

  if (!task) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Task ${taskId} not found`,
    }
  }

  if (!task.isActive) {
    return {
      success: true,
      taskId,
      action: 'no_change',
    }
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { isActive: false },
  })

  return {
    success: true,
    taskId,
    action: 'closed',
  }
}

/**
 * Handle PR opened event - move task to In Progress
 */
export async function onPROpened(
  repositoryId: number,
  taskId: number
): Promise<TaskStatusAutomationResult> {
  const repository = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { syncSettings: true },
  })

  if (!repository) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Repository ${repositoryId} not found`,
    }
  }

  const settings = getAutomationSettings(repository.syncSettings as GitHubSyncSettings | null)
  if (!settings.enabled || !settings.moveToInProgressOnPROpen) {
    return {
      success: true,
      taskId,
      action: 'no_change',
    }
  }

  return moveTaskToColumn(taskId, settings.inProgressColumn)
}

/**
 * Handle PR ready for review event - move task to Review
 */
export async function onPRReadyForReview(
  repositoryId: number,
  taskId: number
): Promise<TaskStatusAutomationResult> {
  const repository = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { syncSettings: true },
  })

  if (!repository) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Repository ${repositoryId} not found`,
    }
  }

  const settings = getAutomationSettings(repository.syncSettings as GitHubSyncSettings | null)
  if (!settings.enabled || !settings.moveToReviewOnPRReady) {
    return {
      success: true,
      taskId,
      action: 'no_change',
    }
  }

  return moveTaskToColumn(taskId, settings.reviewColumn)
}

/**
 * Handle PR merged event - move task to Done
 */
export async function onPRMerged(
  repositoryId: number,
  taskId: number
): Promise<TaskStatusAutomationResult> {
  const repository = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { syncSettings: true },
  })

  if (!repository) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Repository ${repositoryId} not found`,
    }
  }

  const settings = getAutomationSettings(repository.syncSettings as GitHubSyncSettings | null)
  if (!settings.enabled || !settings.moveToDoneOnPRMerge) {
    return {
      success: true,
      taskId,
      action: 'no_change',
    }
  }

  return moveTaskToColumn(taskId, settings.doneColumn)
}

/**
 * Handle issue closed event - close the linked task
 */
export async function onIssueClosed(
  repositoryId: number,
  taskId: number
): Promise<TaskStatusAutomationResult> {
  const repository = await prisma.gitHubRepository.findFirst({
    where: { id: repositoryId },
    select: { syncSettings: true },
  })

  if (!repository) {
    return {
      success: false,
      taskId,
      action: 'error',
      error: `Repository ${repositoryId} not found`,
    }
  }

  const settings = getAutomationSettings(repository.syncSettings as GitHubSyncSettings | null)
  if (!settings.enabled || !settings.closeTaskOnIssueClosed) {
    return {
      success: true,
      taskId,
      action: 'no_change',
    }
  }

  return closeTask(taskId)
}

// =============================================================================
// Service Export
// =============================================================================

export const automationService = {
  // Settings
  getAutomationSettings,
  // Branch creation
  createBranchForTask,
  branchExists,
  generateBranchName,
  slugify,
  // Column helpers
  findColumnByName,
  findColumnByNameFuzzy,
  // Task automation
  moveTaskToColumn,
  closeTask,
  // Event handlers
  onPROpened,
  onPRReadyForReview,
  onPRMerged,
  onIssueClosed,
}
