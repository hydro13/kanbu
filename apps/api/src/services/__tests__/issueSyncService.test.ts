/*
 * Issue Sync Service Tests
 * Version: 2.0.0
 *
 * Tests for bidirectional GitHub issue ↔ Kanbu task synchronization.
 * - Fase 5: Inbound sync (GitHub → Kanbu)
 * - Fase 6: Outbound sync (Kanbu → GitHub)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 5+6 - Issue Sync Bidirectional
 * =============================================================================
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../../lib/prisma'
import {
  // Inbound (GitHub → Kanbu)
  mapGitHubUserToKanbu,
  mapGitHubAssignees,
  getOrCreateTagsFromLabels,
  getColumnForIssueState,
  createTaskFromGitHubIssue,
  updateTaskFromGitHubIssue,
  getImportProgress,
  clearImportProgress,
  // Outbound (Kanbu → GitHub)
  mapKanbuUserToGitHub,
  mapKanbuAssigneesToGitHub,
  getLabelsFromTags,
  calculateSyncHash,
  hasTaskChangedSinceSync,
} from '../github/issueSyncService'

// =============================================================================
// Test Data
// =============================================================================

let testWorkspaceId: number
let testProjectId: number
let testUserId: number
let testInstallationId: number
let testRepositoryId: number
let firstColumnId: number
let lastColumnId: number

// =============================================================================
// Setup & Teardown
// =============================================================================

beforeAll(async () => {
  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: `issue-sync-test-${Date.now()}@test.com`,
      username: `issuesynctest${Date.now()}`,
      name: 'Issue Sync Test User',
      passwordHash: 'not-a-real-hash',
      isActive: true,
      emailVerified: true,
    },
  })
  testUserId = testUser.id

  // Create test workspace
  const testWorkspace = await prisma.workspace.create({
    data: {
      name: 'Issue Sync Test Workspace',
      slug: `issue-sync-test-${Date.now()}`,
    },
  })
  testWorkspaceId = testWorkspace.id

  // Create test project with columns
  const testProject = await prisma.project.create({
    data: {
      name: 'Issue Sync Test Project',
      identifier: 'IST',
      workspaceId: testWorkspaceId,
    },
  })
  testProjectId = testProject.id

  // Create columns
  const column1 = await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'Backlog',
      position: 1,
    },
  })
  firstColumnId = column1.id

  await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'In Progress',
      position: 2,
    },
  })

  const column3 = await prisma.column.create({
    data: {
      projectId: testProjectId,
      title: 'Done',
      position: 3,
    },
  })
  lastColumnId = column3.id

  // Create test installation
  const testInstallation = await prisma.gitHubInstallation.create({
    data: {
      workspaceId: testWorkspaceId,
      installationId: BigInt(Date.now()),
      accountType: 'organization',
      accountId: BigInt(12345),
      accountLogin: 'test-org',
      permissions: {},
      events: ['issues', 'pull_request', 'push'],
    },
  })
  testInstallationId = testInstallation.id

  // Create test repository with unique owner/name
  const uniqueSuffix = Date.now()
  const testRepository = await prisma.gitHubRepository.create({
    data: {
      projectId: testProjectId,
      installationId: testInstallationId,
      repoId: BigInt(uniqueSuffix),
      owner: `test-org-${uniqueSuffix}`,
      name: `test-repo-${uniqueSuffix}`,
      fullName: `test-org-${uniqueSuffix}/test-repo-${uniqueSuffix}`,
      defaultBranch: 'main',
      isPrivate: false,
      syncEnabled: true,
      syncSettings: {
        issues: {
          enabled: true,
          direction: 'github_to_kanbu',
        },
      },
    },
  })
  testRepositoryId = testRepository.id
})

afterAll(async () => {
  // Clean up in reverse order of creation
  await prisma.gitHubSyncLog.deleteMany({
    where: { repositoryId: testRepositoryId },
  })
  await prisma.gitHubIssue.deleteMany({
    where: { repositoryId: testRepositoryId },
  })
  await prisma.task.deleteMany({
    where: { projectId: testProjectId },
  })
  await prisma.tag.deleteMany({
    where: { projectId: testProjectId },
  })
  await prisma.gitHubRepository.deleteMany({
    where: { projectId: testProjectId },
  })
  await prisma.gitHubUserMapping.deleteMany({
    where: { workspaceId: testWorkspaceId },
  })
  await prisma.gitHubInstallation.deleteMany({
    where: { workspaceId: testWorkspaceId },
  })
  await prisma.column.deleteMany({
    where: { projectId: testProjectId },
  })
  await prisma.project.deleteMany({
    where: { workspaceId: testWorkspaceId },
  })
  await prisma.workspace.deleteMany({
    where: { id: testWorkspaceId },
  })
  await prisma.user.deleteMany({
    where: { id: testUserId },
  })
})

// =============================================================================
// User Mapping Tests
// =============================================================================

describe('User Mapping', () => {
  beforeEach(async () => {
    // Clean up user mappings before each test
    await prisma.gitHubUserMapping.deleteMany({
      where: { workspaceId: testWorkspaceId },
    })
  })

  it('should return null for unmapped GitHub user', async () => {
    const result = await mapGitHubUserToKanbu('unknown-user', testWorkspaceId)
    expect(result).toBeNull()
  })

  it('should return Kanbu user ID for mapped GitHub user', async () => {
    // Create a mapping
    await prisma.gitHubUserMapping.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        githubLogin: 'mapped-user',
        githubId: BigInt(123456),
      },
    })

    const result = await mapGitHubUserToKanbu('mapped-user', testWorkspaceId)
    expect(result).toBe(testUserId)
  })

  it('should map multiple assignees and track unmapped', async () => {
    // Create a mapping for one user
    await prisma.gitHubUserMapping.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        githubLogin: 'known-user',
        githubId: BigInt(123456),
      },
    })

    const assignees = [
      { login: 'known-user' },
      { login: 'unknown-user-1' },
      { login: 'unknown-user-2' },
    ]

    const result = await mapGitHubAssignees(assignees, testWorkspaceId)

    expect(result.mapped).toHaveLength(1)
    expect(result.mapped[0]).toBe(testUserId)
    expect(result.unmapped).toHaveLength(2)
    expect(result.unmapped).toContain('unknown-user-1')
    expect(result.unmapped).toContain('unknown-user-2')
  })
})

// =============================================================================
// Tag/Label Mapping Tests
// =============================================================================

describe('Tag/Label Mapping', () => {
  beforeEach(async () => {
    // Clean up tags before each test
    await prisma.tag.deleteMany({
      where: { projectId: testProjectId },
    })
  })

  it('should create new tags from GitHub labels', async () => {
    const labels = [
      { name: 'bug', color: 'ff0000' },
      { name: 'enhancement', color: '00ff00' },
    ]

    const tagIds = await getOrCreateTagsFromLabels(testProjectId, labels)

    expect(tagIds).toHaveLength(2)

    // Verify tags were created
    const tags = await prisma.tag.findMany({
      where: { projectId: testProjectId },
    })
    expect(tags).toHaveLength(2)
    expect(tags.map(t => t.name)).toContain('bug')
    expect(tags.map(t => t.name)).toContain('enhancement')
  })

  it('should reuse existing tags', async () => {
    // Create existing tag
    await prisma.tag.create({
      data: {
        projectId: testProjectId,
        name: 'existing-tag',
        color: 'blue',
      },
    })

    const labels = [
      { name: 'existing-tag' },
      { name: 'new-tag' },
    ]

    const tagIds = await getOrCreateTagsFromLabels(testProjectId, labels)

    expect(tagIds).toHaveLength(2)

    // Verify only one new tag was created
    const tags = await prisma.tag.findMany({
      where: { projectId: testProjectId },
    })
    expect(tags).toHaveLength(2)
  })

  it('should handle labels without colors', async () => {
    const labels = [
      { name: 'no-color-label' },
    ]

    const tagIds = await getOrCreateTagsFromLabels(testProjectId, labels)

    expect(tagIds).toHaveLength(1)

    const tag = await prisma.tag.findFirst({
      where: { projectId: testProjectId, name: 'no-color-label' },
    })
    expect(tag?.color).toBe('grey')
  })
})

// =============================================================================
// Column Mapping Tests
// =============================================================================

describe('Column Mapping', () => {
  it('should return first column for open issues', async () => {
    const columnId = await getColumnForIssueState(testProjectId, 'open')
    expect(columnId).toBe(firstColumnId)
  })

  it('should return last column for closed issues', async () => {
    const columnId = await getColumnForIssueState(testProjectId, 'closed')
    expect(columnId).toBe(lastColumnId)
  })

  it('should throw error for project without columns', async () => {
    // Create project without columns
    const emptyProject = await prisma.project.create({
      data: {
        name: 'Empty Project',
        identifier: 'EMP',
        workspaceId: testWorkspaceId,
      },
    })

    await expect(getColumnForIssueState(emptyProject.id, 'open'))
      .rejects.toThrow(`Project ${emptyProject.id} has no columns`)

    // Cleanup
    await prisma.project.delete({ where: { id: emptyProject.id } })
  })
})

// =============================================================================
// Task Creation Tests
// =============================================================================

describe('Task Creation from GitHub Issue', () => {
  beforeEach(async () => {
    // Clean up tasks and GitHub issues before each test
    await prisma.gitHubIssue.deleteMany({
      where: { repositoryId: testRepositoryId },
    })
    await prisma.task.deleteMany({
      where: { projectId: testProjectId },
    })
    await prisma.tag.deleteMany({
      where: { projectId: testProjectId },
    })
    await prisma.gitHubSyncLog.deleteMany({
      where: { repositoryId: testRepositoryId },
    })
  })

  it('should create task from GitHub issue', async () => {
    const issueData = {
      number: 1,
      id: 123456,
      title: 'Test Issue',
      body: 'This is a test issue body',
      state: 'open' as const,
      labels: [{ name: 'bug', color: 'ff0000' }],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const result = await createTaskFromGitHubIssue(testRepositoryId, issueData)

    expect(result.created).toBe(true)
    expect(result.skipped).toBe(false)
    expect(result.taskId).toBeGreaterThan(0)

    // Verify task was created
    const task = await prisma.task.findUnique({
      where: { id: result.taskId },
      include: { tags: { include: { tag: true } } },
    })
    expect(task).not.toBeNull()
    expect(task?.title).toBe('Test Issue')
    expect(task?.description).toBe('This is a test issue body')
    expect(task?.columnId).toBe(firstColumnId)
    expect(task?.tags).toHaveLength(1)
    expect(task?.tags[0]!.tag.name).toBe('bug')

    // Verify GitHubIssue record was created
    const githubIssue = await prisma.gitHubIssue.findUnique({
      where: {
        repositoryId_issueNumber: {
          repositoryId: testRepositoryId,
          issueNumber: 1,
        },
      },
    })
    expect(githubIssue).not.toBeNull()
    expect(githubIssue?.taskId).toBe(result.taskId)
  })

  it('should skip existing issues when skipExisting is true', async () => {
    const issueData = {
      number: 2,
      id: 234567,
      title: 'Existing Issue',
      body: 'This issue already exists',
      state: 'open' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    // Create the issue first time
    const first = await createTaskFromGitHubIssue(testRepositoryId, issueData)
    expect(first.created).toBe(true)

    // Try to create again with skipExisting
    const second = await createTaskFromGitHubIssue(testRepositoryId, issueData, { skipExisting: true })
    expect(second.created).toBe(false)
    expect(second.skipped).toBe(true)
    expect(second.taskId).toBe(first.taskId)
  })

  it('should place closed issues in last column', async () => {
    const issueData = {
      number: 3,
      id: 345678,
      title: 'Closed Issue',
      body: 'This issue is closed',
      state: 'closed' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const result = await createTaskFromGitHubIssue(testRepositoryId, issueData)

    const task = await prisma.task.findUnique({
      where: { id: result.taskId },
    })
    expect(task?.columnId).toBe(lastColumnId)
    expect(task?.isActive).toBe(false)
  })

  it('should log sync operation', async () => {
    const issueData = {
      number: 4,
      id: 456789,
      title: 'Logged Issue',
      body: 'This should be logged',
      state: 'open' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    await createTaskFromGitHubIssue(testRepositoryId, issueData)

    // Check sync log
    const syncLog = await prisma.gitHubSyncLog.findFirst({
      where: {
        repositoryId: testRepositoryId,
        action: 'issue_imported',
      },
      orderBy: { createdAt: 'desc' },
    })
    expect(syncLog).not.toBeNull()
    expect(syncLog?.direction).toBe('github_to_kanbu')
    expect(syncLog?.entityType).toBe('issue')
    expect(syncLog?.status).toBe('success')
  })
})

// =============================================================================
// Task Update Tests
// =============================================================================

describe('Task Update from GitHub Issue', () => {
  let existingTaskId: number
  let existingIssueNumber: number

  beforeEach(async () => {
    // Clean up and create fresh task
    await prisma.gitHubIssue.deleteMany({
      where: { repositoryId: testRepositoryId },
    })
    await prisma.task.deleteMany({
      where: { projectId: testProjectId },
    })
    await prisma.gitHubSyncLog.deleteMany({
      where: { repositoryId: testRepositoryId },
    })

    const issueData = {
      number: 100,
      id: 100000,
      title: 'Original Title',
      body: 'Original body',
      state: 'open' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const result = await createTaskFromGitHubIssue(testRepositoryId, issueData)
    existingTaskId = result.taskId
    existingIssueNumber = issueData.number
  })

  it('should update task title and description', async () => {
    const updatedIssue = {
      number: existingIssueNumber,
      id: 100000,
      title: 'Updated Title',
      body: 'Updated body',
      state: 'open' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    }

    const result = await updateTaskFromGitHubIssue(100000, updatedIssue)

    expect(result.updated).toBe(true)
    expect(result.taskId).toBe(existingTaskId)

    const task = await prisma.task.findUnique({
      where: { id: existingTaskId },
    })
    expect(task?.title).toBe('Updated Title')
    expect(task?.description).toBe('Updated body')
  })

  it('should move task to last column when closed', async () => {
    const closedIssue = {
      number: existingIssueNumber,
      id: 100000,
      title: 'Original Title',
      body: 'Original body',
      state: 'closed' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-02T00:00:00Z',
    }

    await updateTaskFromGitHubIssue(100000, closedIssue)

    const task = await prisma.task.findUnique({
      where: { id: existingTaskId },
    })
    expect(task?.columnId).toBe(lastColumnId)
    expect(task?.isActive).toBe(false)
  })

  it('should return not updated for non-existent issue', async () => {
    const nonExistentIssue = {
      number: 999,
      id: 999999,
      title: 'Non-existent',
      body: '',
      state: 'open' as const,
      labels: [],
      assignees: [],
      milestone: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const result = await updateTaskFromGitHubIssue(999999, nonExistentIssue)

    expect(result.updated).toBe(false)
    expect(result.taskId).toBeNull()
  })
})

// =============================================================================
// Import Progress Tests
// =============================================================================

describe('Import Progress Tracking', () => {
  it('should return null for non-existent progress', () => {
    const progress = getImportProgress(99999)
    expect(progress).toBeNull()
  })

  it('should clear progress after retrieval', () => {
    // Note: This tests the clear function directly
    // The actual progress is set by importIssuesFromGitHub which requires GitHub API
    clearImportProgress(testRepositoryId)
    const progress = getImportProgress(testRepositoryId)
    expect(progress).toBeNull()
  })
})

// =============================================================================
// Outbound Sync Tests (Fase 6)
// =============================================================================

// =============================================================================
// Reverse User Mapping Tests
// =============================================================================

describe('Reverse User Mapping (Kanbu → GitHub)', () => {
  beforeEach(async () => {
    // Clean up user mappings before each test
    await prisma.gitHubUserMapping.deleteMany({
      where: { workspaceId: testWorkspaceId },
    })
  })

  it('should return null for unmapped Kanbu user', async () => {
    const result = await mapKanbuUserToGitHub(testUserId, testWorkspaceId)
    expect(result).toBeNull()
  })

  it('should return GitHub login for mapped Kanbu user', async () => {
    // Create a mapping
    await prisma.gitHubUserMapping.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        githubLogin: 'mapped-github-user',
        githubId: BigInt(789012),
      },
    })

    const result = await mapKanbuUserToGitHub(testUserId, testWorkspaceId)
    expect(result).toBe('mapped-github-user')
  })

  it('should map multiple Kanbu users to GitHub logins', async () => {
    // Create a mapping for the test user
    await prisma.gitHubUserMapping.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        githubLogin: 'test-github-user',
        githubId: BigInt(111111),
      },
    })

    const userIds = [testUserId, 99999, 88888]

    const result = await mapKanbuAssigneesToGitHub(userIds, testWorkspaceId)

    expect(result.mapped).toHaveLength(1)
    expect(result.mapped[0]).toBe('test-github-user')
    expect(result.unmapped).toHaveLength(2)
    expect(result.unmapped).toContain(99999)
    expect(result.unmapped).toContain(88888)
  })
})

// =============================================================================
// Reverse Label Mapping Tests
// =============================================================================

describe('Labels from Tags (Kanbu → GitHub)', () => {
  let testTaskId: number

  beforeEach(async () => {
    // Clean up
    await prisma.gitHubIssue.deleteMany({
      where: { repositoryId: testRepositoryId },
    })
    await prisma.task.deleteMany({
      where: { projectId: testProjectId },
    })
    await prisma.tag.deleteMany({
      where: { projectId: testProjectId },
    })

    // Create a test task
    const task = await prisma.task.create({
      data: {
        projectId: testProjectId,
        columnId: firstColumnId,
        creatorId: testUserId,
        title: 'Test Task for Labels',
        reference: 'IST-999',
        position: 1,
      },
    })
    testTaskId = task.id
  })

  it('should return empty array for task with no tags', async () => {
    const labels = await getLabelsFromTags(testTaskId)
    expect(labels).toHaveLength(0)
  })

  it('should return label names from task tags', async () => {
    // Create tags
    const tag1 = await prisma.tag.create({
      data: {
        projectId: testProjectId,
        name: 'feature',
        color: '#00ff00',
      },
    })
    const tag2 = await prisma.tag.create({
      data: {
        projectId: testProjectId,
        name: 'priority-high',
        color: '#ff0000',
      },
    })

    // Assign tags to task
    await prisma.taskTag.createMany({
      data: [
        { taskId: testTaskId, tagId: tag1.id },
        { taskId: testTaskId, tagId: tag2.id },
      ],
    })

    const labels = await getLabelsFromTags(testTaskId)

    expect(labels).toHaveLength(2)
    expect(labels).toContain('feature')
    expect(labels).toContain('priority-high')
  })
})

// =============================================================================
// Sync Hash Tests
// =============================================================================

describe('Sync Hash Calculation', () => {
  it('should generate consistent hash for same content', () => {
    const hash1 = calculateSyncHash('Test Title', 'Test Description', 'open')
    const hash2 = calculateSyncHash('Test Title', 'Test Description', 'open')
    expect(hash1).toBe(hash2)
  })

  it('should generate different hash for different title', () => {
    const hash1 = calculateSyncHash('Title A', 'Description', 'open')
    const hash2 = calculateSyncHash('Title B', 'Description', 'open')
    expect(hash1).not.toBe(hash2)
  })

  it('should generate different hash for different description', () => {
    const hash1 = calculateSyncHash('Title', 'Description A', 'open')
    const hash2 = calculateSyncHash('Title', 'Description B', 'open')
    expect(hash1).not.toBe(hash2)
  })

  it('should generate different hash for different state', () => {
    const hash1 = calculateSyncHash('Title', 'Description', 'open')
    const hash2 = calculateSyncHash('Title', 'Description', 'closed')
    expect(hash1).not.toBe(hash2)
  })

  it('should handle null description', () => {
    const hash1 = calculateSyncHash('Title', null, 'open')
    const hash2 = calculateSyncHash('Title', '', 'open')
    expect(hash1).toBe(hash2)
  })

  it('should trim whitespace in content', () => {
    const hash1 = calculateSyncHash('  Title  ', '  Description  ', 'open')
    const hash2 = calculateSyncHash('Title', 'Description', 'open')
    expect(hash1).toBe(hash2)
  })
})

// =============================================================================
// Task Change Detection Tests
// =============================================================================

describe('Task Change Detection', () => {
  let testTaskWithIssue: number

  beforeEach(async () => {
    // Clean up
    await prisma.gitHubIssue.deleteMany({
      where: { repositoryId: testRepositoryId },
    })
    await prisma.task.deleteMany({
      where: { projectId: testProjectId },
    })
    await prisma.gitHubSyncLog.deleteMany({
      where: { repositoryId: testRepositoryId },
    })

    // Create task with linked GitHub issue
    const task = await prisma.task.create({
      data: {
        projectId: testProjectId,
        columnId: firstColumnId,
        creatorId: testUserId,
        title: 'Synced Task',
        description: 'Original description',
        reference: 'IST-888',
        position: 1,
        isActive: true,
      },
    })
    testTaskWithIssue = task.id

    // Create linked GitHub issue with sync hash
    const syncHash = calculateSyncHash('Synced Task', 'Original description', 'open')
    await prisma.gitHubIssue.create({
      data: {
        repositoryId: testRepositoryId,
        taskId: task.id,
        issueNumber: 500,
        issueId: BigInt(500000),
        title: 'Synced Task',
        state: 'open',
        syncDirection: 'bidirectional',
        syncHash,
        lastSyncAt: new Date(),
      },
    })
  })

  it('should detect no change when content is same', async () => {
    const result = await hasTaskChangedSinceSync(testTaskWithIssue)
    expect(result.changed).toBe(false)
    expect(result.lastHash).toBe(result.currentHash)
  })

  it('should detect change when title is modified', async () => {
    // Update task title
    await prisma.task.update({
      where: { id: testTaskWithIssue },
      data: { title: 'Modified Title' },
    })

    const result = await hasTaskChangedSinceSync(testTaskWithIssue)
    expect(result.changed).toBe(true)
    expect(result.lastHash).not.toBe(result.currentHash)
  })

  it('should detect change when description is modified', async () => {
    // Update task description
    await prisma.task.update({
      where: { id: testTaskWithIssue },
      data: { description: 'Modified description' },
    })

    const result = await hasTaskChangedSinceSync(testTaskWithIssue)
    expect(result.changed).toBe(true)
  })

  it('should detect change when task is closed', async () => {
    // Close the task
    await prisma.task.update({
      where: { id: testTaskWithIssue },
      data: { isActive: false },
    })

    const result = await hasTaskChangedSinceSync(testTaskWithIssue)
    expect(result.changed).toBe(true)
  })

  it('should return null lastHash for task without GitHub issue', async () => {
    // Create task without linked issue
    const task = await prisma.task.create({
      data: {
        projectId: testProjectId,
        columnId: firstColumnId,
        creatorId: testUserId,
        title: 'Unlinked Task',
        reference: 'IST-777',
        position: 2,
        isActive: true,
      },
    })

    const result = await hasTaskChangedSinceSync(task.id)
    expect(result.lastHash).toBeNull()
    expect(result.changed).toBe(true)
  })

  it('should throw error for non-existent task', async () => {
    await expect(hasTaskChangedSinceSync(99999))
      .rejects.toThrow('Task 99999 not found')
  })
})
