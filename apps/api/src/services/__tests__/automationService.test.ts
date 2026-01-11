/*
 * Automation Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub automation features:
 * - Branch name generation
 * - Task status automation
 * - Column matching
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 8 - Automation
 * =============================================================================
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import {
  slugify,
  generateBranchName,
  getAutomationSettings,
  findColumnByName,
  findColumnByNameFuzzy,
  moveTaskToColumn,
  closeTask,
} from '../github/automationService'
import type { GitHubSyncSettings } from '@kanbu/shared'

// =============================================================================
// Test Data
// =============================================================================

let testWorkspaceId: number
let testProjectId: number
let testUserId: number
let testColumnIds: { todo: number; inProgress: number; review: number; done: number }

// =============================================================================
// Setup & Teardown
// =============================================================================

beforeAll(async () => {
  // Create test workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Automation Test Workspace',
      slug: `automation-test-${Date.now()}`,
    },
  })
  testWorkspaceId = workspace.id

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: `automation-test-${Date.now()}@test.com`,
      username: `automationtest${Date.now()}`,
      name: 'Automation Test User',
      passwordHash: 'test',
    },
  })
  testUserId = user.id

  // Create test project with columns
  const project = await prisma.project.create({
    data: {
      workspaceId: testWorkspaceId,
      name: 'Automation Test Project',
      identifier: 'AUTO',
    },
  })
  testProjectId = project.id

  // Create standard columns
  const todoColumn = await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'To Do',
      position: 0,
    },
  })
  const inProgressColumn = await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'In Progress',
      position: 1,
    },
  })
  const reviewColumn = await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'Review',
      position: 2,
    },
  })
  const doneColumn = await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'Done',
      position: 3,
    },
  })

  testColumnIds = {
    todo: todoColumn.id,
    inProgress: inProgressColumn.id,
    review: reviewColumn.id,
    done: doneColumn.id,
  }
})

afterAll(async () => {
  // Clean up test data
  await prisma.task.deleteMany({ where: { projectId: testProjectId } })
  await prisma.column.deleteMany({ where: { projectId: testProjectId } })
  await prisma.project.deleteMany({ where: { id: testProjectId } })
  await prisma.user.deleteMany({ where: { id: testUserId } })
  await prisma.workspace.deleteMany({ where: { id: testWorkspaceId } })
})

// =============================================================================
// Slugify Tests
// =============================================================================

describe('slugify', () => {
  it('should convert text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should replace spaces with hyphens', () => {
    expect(slugify('my test title')).toBe('my-test-title')
  })

  it('should remove special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world')
  })

  it('should handle multiple spaces', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('should trim leading and trailing hyphens', () => {
    expect(slugify('  hello world  ')).toBe('hello-world')
  })

  it('should handle empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('should limit length to 50 characters', () => {
    const longTitle = 'a'.repeat(100)
    expect(slugify(longTitle).length).toBeLessThanOrEqual(50)
  })

  it('should handle special characters and accents', () => {
    expect(slugify('café résumé')).toBe('caf-rsum')
  })
})

// =============================================================================
// Branch Name Generation Tests
// =============================================================================

describe('generateBranchName', () => {
  it('should generate branch name with default pattern', () => {
    const result = generateBranchName('PROJ-123', 'Add login feature')
    expect(result).toBe('feature/proj-123-add-login-feature')
  })

  it('should support custom pattern with lowercase reference', () => {
    const result = generateBranchName('TEST-456', 'Fix bug', '{reference}/fix')
    expect(result).toBe('test-456/fix')
  })

  it('should support uppercase reference placeholder', () => {
    const result = generateBranchName('TEST-789', 'Test', '{REFERENCE}-test')
    expect(result).toBe('TEST-789-test')
  })

  it('should support {title} as alias for {slug}', () => {
    const result = generateBranchName('TASK-1', 'My Task', 'task/{title}')
    expect(result).toBe('task/my-task')
  })

  it('should handle feature branch pattern', () => {
    const result = generateBranchName('KANBU-42', 'Implement auth', 'feature/{reference}-{slug}')
    expect(result).toBe('feature/kanbu-42-implement-auth')
  })

  it('should handle bugfix pattern', () => {
    const result = generateBranchName('BUG-99', 'Fix crash', 'bugfix/{reference}')
    expect(result).toBe('bugfix/bug-99')
  })
})

// =============================================================================
// Automation Settings Tests
// =============================================================================

describe('getAutomationSettings', () => {
  it('should return disabled settings when automation is not configured', () => {
    const result = getAutomationSettings(null)
    expect(result.enabled).toBe(false)
  })

  it('should return disabled when automation.enabled is false', () => {
    const settings: GitHubSyncSettings = {
      automation: {
        enabled: false,
      },
    }
    const result = getAutomationSettings(settings)
    expect(result.enabled).toBe(false)
  })

  it('should return defaults when automation is enabled but no options set', () => {
    const settings: GitHubSyncSettings = {
      automation: {
        enabled: true,
      },
    }
    const result = getAutomationSettings(settings)
    expect(result.enabled).toBe(true)
    expect(result.moveToInProgressOnPROpen).toBe(true)
    expect(result.moveToReviewOnPRReady).toBe(true)
    expect(result.moveToDoneOnPRMerge).toBe(true)
    expect(result.closeTaskOnIssueClosed).toBe(true)
    expect(result.inProgressColumn).toBe('In Progress')
    expect(result.reviewColumn).toBe('Review')
    expect(result.doneColumn).toBe('Done')
  })

  it('should use custom column names when provided', () => {
    const settings: GitHubSyncSettings = {
      automation: {
        enabled: true,
        inProgressColumn: 'Working',
        reviewColumn: 'Code Review',
        doneColumn: 'Completed',
      },
    }
    const result = getAutomationSettings(settings)
    expect(result.inProgressColumn).toBe('Working')
    expect(result.reviewColumn).toBe('Code Review')
    expect(result.doneColumn).toBe('Completed')
  })

  it('should respect individual automation flags', () => {
    const settings: GitHubSyncSettings = {
      automation: {
        enabled: true,
        moveToInProgressOnPROpen: false,
        moveToReviewOnPRReady: true,
        moveToDoneOnPRMerge: false,
        closeTaskOnIssueClosed: false,
      },
    }
    const result = getAutomationSettings(settings)
    expect(result.moveToInProgressOnPROpen).toBe(false)
    expect(result.moveToReviewOnPRReady).toBe(true)
    expect(result.moveToDoneOnPRMerge).toBe(false)
    expect(result.closeTaskOnIssueClosed).toBe(false)
  })
})

// =============================================================================
// Column Finding Tests
// =============================================================================

describe('findColumnByName', () => {
  it('should find column by exact name (case-insensitive)', async () => {
    const result = await findColumnByName(testProjectId, 'In Progress')
    expect(result).not.toBeNull()
    expect(result?.id).toBe(testColumnIds.inProgress)
  })

  it('should find column by lowercase name', async () => {
    const result = await findColumnByName(testProjectId, 'in progress')
    expect(result).not.toBeNull()
    expect(result?.id).toBe(testColumnIds.inProgress)
  })

  it('should find column by uppercase name', async () => {
    const result = await findColumnByName(testProjectId, 'DONE')
    expect(result).not.toBeNull()
    expect(result?.id).toBe(testColumnIds.done)
  })

  it('should return null for non-existent column', async () => {
    const result = await findColumnByName(testProjectId, 'Non Existent')
    expect(result).toBeNull()
  })
})

describe('findColumnByNameFuzzy', () => {
  it('should find column by exact match first', async () => {
    const result = await findColumnByNameFuzzy(testProjectId, 'Done')
    expect(result).not.toBeNull()
    expect(result?.id).toBe(testColumnIds.done)
  })

  it('should find column by partial match', async () => {
    const result = await findColumnByNameFuzzy(testProjectId, 'progress')
    expect(result).not.toBeNull()
    expect(result?.id).toBe(testColumnIds.inProgress)
  })

  it('should return null for completely unmatched name', async () => {
    const result = await findColumnByNameFuzzy(testProjectId, 'xyz123')
    expect(result).toBeNull()
  })
})

// =============================================================================
// Task Movement Tests
// =============================================================================

describe('moveTaskToColumn', () => {
  let testTaskId: number

  beforeEach(async () => {
    // Create a fresh test task in To Do column
    const task = await prisma.task.create({
      data: {
        projectId: testProjectId,
        columnId: testColumnIds.todo,
        creatorId: testUserId,
        title: 'Test Task for Movement',
        reference: `AUTO-${Date.now()}`,
        position: 1,
        isActive: true,
      },
    })
    testTaskId = task.id
  })

  afterEach(async () => {
    // Clean up test task
    await prisma.task.deleteMany({
      where: { id: testTaskId },
    })
  })

  it('should move task to a different column', async () => {
    const result = await moveTaskToColumn(testTaskId, 'In Progress')
    expect(result.success).toBe(true)
    expect(result.action).toBe('moved')
    expect(result.previousColumnId).toBe(testColumnIds.todo)
    expect(result.newColumnId).toBe(testColumnIds.inProgress)

    // Verify in database
    const task = await prisma.task.findUnique({ where: { id: testTaskId } })
    expect(task?.columnId).toBe(testColumnIds.inProgress)
  })

  it('should return no_change when task is already in target column', async () => {
    const result = await moveTaskToColumn(testTaskId, 'To Do')
    expect(result.success).toBe(true)
    expect(result.action).toBe('no_change')
  })

  it('should return error for non-existent task', async () => {
    const result = await moveTaskToColumn(999999, 'Done')
    expect(result.success).toBe(false)
    expect(result.action).toBe('error')
    expect(result.error).toContain('not found')
  })

  it('should return error for non-existent column', async () => {
    const result = await moveTaskToColumn(testTaskId, 'Non Existent Column')
    expect(result.success).toBe(false)
    expect(result.action).toBe('error')
    expect(result.error).toContain('not found')
  })
})

// =============================================================================
// Task Closing Tests
// =============================================================================

describe('closeTask', () => {
  let testTaskId: number

  beforeEach(async () => {
    // Create a fresh active test task
    const task = await prisma.task.create({
      data: {
        projectId: testProjectId,
        columnId: testColumnIds.todo,
        creatorId: testUserId,
        title: 'Test Task for Closing',
        reference: `AUTO-CLOSE-${Date.now()}`,
        position: 1,
        isActive: true,
      },
    })
    testTaskId = task.id
  })

  afterEach(async () => {
    // Clean up test task
    await prisma.task.deleteMany({
      where: { id: testTaskId },
    })
  })

  it('should close an active task', async () => {
    const result = await closeTask(testTaskId)
    expect(result.success).toBe(true)
    expect(result.action).toBe('closed')

    // Verify in database
    const task = await prisma.task.findUnique({ where: { id: testTaskId } })
    expect(task?.isActive).toBe(false)
  })

  it('should return no_change for already closed task', async () => {
    // First close the task
    await prisma.task.update({
      where: { id: testTaskId },
      data: { isActive: false },
    })

    const result = await closeTask(testTaskId)
    expect(result.success).toBe(true)
    expect(result.action).toBe('no_change')
  })

  it('should return error for non-existent task', async () => {
    const result = await closeTask(999999)
    expect(result.success).toBe(false)
    expect(result.action).toBe('error')
    expect(result.error).toContain('not found')
  })
})
