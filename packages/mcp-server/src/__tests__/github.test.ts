/*
 * GitHub MCP Tools Tests
 * Version: 1.0.0
 *
 * Tests for GitHub MCP tools:
 * - Input validation (Zod schemas)
 * - Tool definitions
 * - Handler functions
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: GitHub Connector Fase 9 - MCP Tools
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  // Schemas
  GetGitHubRepoSchema,
  ListGitHubPRsSchema,
  ListGitHubCommitsSchema,
  GetTaskPRsSchema,
  GetTaskCommitsSchema,
  LinkGitHubRepoSchema,
  UnlinkGitHubRepoSchema,
  SyncGitHubIssuesSchema,
  CreateGitHubBranchSchema,
  LinkPRToTaskSchema,
  // Tool definitions
  githubToolDefinitions,
} from '../tools/github.js'

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('GitHub MCP Tool Schemas', () => {
  describe('GetGitHubRepoSchema', () => {
    it('should accept valid projectId', () => {
      const result = GetGitHubRepoSchema.safeParse({ projectId: 123 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(123)
      }
    })

    it('should reject missing projectId', () => {
      const result = GetGitHubRepoSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject non-number projectId', () => {
      const result = GetGitHubRepoSchema.safeParse({ projectId: 'abc' })
      expect(result.success).toBe(false)
    })
  })

  describe('ListGitHubPRsSchema', () => {
    it('should accept valid input with defaults', () => {
      const result = ListGitHubPRsSchema.safeParse({ projectId: 1 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(1)
        expect(result.data.state).toBe('all')
        expect(result.data.limit).toBe(20)
      }
    })

    it('should accept all valid states', () => {
      const states = ['open', 'closed', 'merged', 'all'] as const
      for (const state of states) {
        const result = ListGitHubPRsSchema.safeParse({ projectId: 1, state })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid state', () => {
      const result = ListGitHubPRsSchema.safeParse({ projectId: 1, state: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should enforce limit boundaries', () => {
      // Valid limit
      expect(ListGitHubPRsSchema.safeParse({ projectId: 1, limit: 50 }).success).toBe(true)

      // Too low
      expect(ListGitHubPRsSchema.safeParse({ projectId: 1, limit: 0 }).success).toBe(false)

      // Too high
      expect(ListGitHubPRsSchema.safeParse({ projectId: 1, limit: 101 }).success).toBe(false)
    })
  })

  describe('ListGitHubCommitsSchema', () => {
    it('should accept valid input with defaults', () => {
      const result = ListGitHubCommitsSchema.safeParse({ projectId: 1 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
      }
    })

    it('should enforce limit boundaries', () => {
      expect(ListGitHubCommitsSchema.safeParse({ projectId: 1, limit: 100 }).success).toBe(true)
      expect(ListGitHubCommitsSchema.safeParse({ projectId: 1, limit: 101 }).success).toBe(false)
    })
  })

  describe('GetTaskPRsSchema', () => {
    it('should accept valid taskId', () => {
      const result = GetTaskPRsSchema.safeParse({ taskId: 456 })
      expect(result.success).toBe(true)
    })

    it('should reject missing taskId', () => {
      const result = GetTaskPRsSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetTaskCommitsSchema', () => {
    it('should accept valid taskId', () => {
      const result = GetTaskCommitsSchema.safeParse({ taskId: 789 })
      expect(result.success).toBe(true)
    })
  })

  describe('LinkGitHubRepoSchema', () => {
    const validInput = {
      projectId: 1,
      installationId: 12345,
      repoId: 67890,
      owner: 'testowner',
      name: 'testrepo',
      fullName: 'testowner/testrepo',
    }

    it('should accept valid input with defaults', () => {
      const result = LinkGitHubRepoSchema.safeParse(validInput)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.defaultBranch).toBe('main')
        expect(result.data.isPrivate).toBe(false)
      }
    })

    it('should accept custom branch and private flag', () => {
      const result = LinkGitHubRepoSchema.safeParse({
        ...validInput,
        defaultBranch: 'develop',
        isPrivate: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.defaultBranch).toBe('develop')
        expect(result.data.isPrivate).toBe(true)
      }
    })

    it('should reject missing required fields', () => {
      expect(LinkGitHubRepoSchema.safeParse({ projectId: 1 }).success).toBe(false)
      expect(LinkGitHubRepoSchema.safeParse({ ...validInput, owner: undefined }).success).toBe(false)
      expect(LinkGitHubRepoSchema.safeParse({ ...validInput, fullName: undefined }).success).toBe(false)
    })
  })

  describe('UnlinkGitHubRepoSchema', () => {
    it('should accept valid projectId', () => {
      const result = UnlinkGitHubRepoSchema.safeParse({ projectId: 1 })
      expect(result.success).toBe(true)
    })
  })

  describe('SyncGitHubIssuesSchema', () => {
    it('should accept valid input with defaults', () => {
      const result = SyncGitHubIssuesSchema.safeParse({ projectId: 1 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.state).toBe('open')
        expect(result.data.skipExisting).toBe(true)
      }
    })

    it('should accept all valid states', () => {
      const states = ['open', 'closed', 'all'] as const
      for (const state of states) {
        const result = SyncGitHubIssuesSchema.safeParse({ projectId: 1, state })
        expect(result.success).toBe(true)
      }
    })

    it('should accept skipExisting false', () => {
      const result = SyncGitHubIssuesSchema.safeParse({
        projectId: 1,
        skipExisting: false
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.skipExisting).toBe(false)
      }
    })
  })

  describe('CreateGitHubBranchSchema', () => {
    it('should accept taskId only', () => {
      const result = CreateGitHubBranchSchema.safeParse({ taskId: 123 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customBranchName).toBeUndefined()
      }
    })

    it('should accept custom branch name', () => {
      const result = CreateGitHubBranchSchema.safeParse({
        taskId: 123,
        customBranchName: 'feature/my-feature'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customBranchName).toBe('feature/my-feature')
      }
    })
  })

  describe('LinkPRToTaskSchema', () => {
    it('should accept valid prId and taskId', () => {
      const result = LinkPRToTaskSchema.safeParse({ prId: 1, taskId: 2 })
      expect(result.success).toBe(true)
    })

    it('should reject missing fields', () => {
      expect(LinkPRToTaskSchema.safeParse({ prId: 1 }).success).toBe(false)
      expect(LinkPRToTaskSchema.safeParse({ taskId: 2 }).success).toBe(false)
    })
  })
})

// =============================================================================
// Tool Definitions Tests
// =============================================================================

describe('GitHub Tool Definitions', () => {
  it('should export 10 tool definitions', () => {
    expect(githubToolDefinitions).toHaveLength(10)
  })

  it('should have unique tool names', () => {
    const names = githubToolDefinitions.map(t => t.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('should have all required tool names', () => {
    const names = githubToolDefinitions.map(t => t.name)

    // Query tools
    expect(names).toContain('kanbu_get_github_repo')
    expect(names).toContain('kanbu_list_github_prs')
    expect(names).toContain('kanbu_list_github_commits')
    expect(names).toContain('kanbu_get_task_prs')
    expect(names).toContain('kanbu_get_task_commits')

    // Management tools
    expect(names).toContain('kanbu_link_github_repo')
    expect(names).toContain('kanbu_unlink_github_repo')
    expect(names).toContain('kanbu_sync_github_issues')
    expect(names).toContain('kanbu_create_github_branch')
    expect(names).toContain('kanbu_link_pr_to_task')
  })

  it('should have valid inputSchema for each tool', () => {
    for (const tool of githubToolDefinitions) {
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    }
  })

  it('should have descriptions for all tools', () => {
    for (const tool of githubToolDefinitions) {
      expect(tool.description).toBeDefined()
      expect(tool.description.length).toBeGreaterThan(10)
    }
  })

  describe('Tool input schemas should match Zod schemas', () => {
    it('kanbu_get_github_repo should require projectId', () => {
      const tool = githubToolDefinitions.find(t => t.name === 'kanbu_get_github_repo')
      expect(tool?.inputSchema.required).toContain('projectId')
    })

    it('kanbu_list_github_prs should have optional state and limit', () => {
      const tool = githubToolDefinitions.find(t => t.name === 'kanbu_list_github_prs')
      expect(tool?.inputSchema.required).toEqual(['projectId'])
      expect(tool?.inputSchema.properties.state).toBeDefined()
      expect(tool?.inputSchema.properties.limit).toBeDefined()
    })

    it('kanbu_link_github_repo should require all mandatory fields', () => {
      const tool = githubToolDefinitions.find(t => t.name === 'kanbu_link_github_repo')
      expect(tool?.inputSchema.required).toContain('projectId')
      expect(tool?.inputSchema.required).toContain('installationId')
      expect(tool?.inputSchema.required).toContain('repoId')
      expect(tool?.inputSchema.required).toContain('owner')
      expect(tool?.inputSchema.required).toContain('name')
      expect(tool?.inputSchema.required).toContain('fullName')
    })

    it('kanbu_link_pr_to_task should require prId and taskId', () => {
      const tool = githubToolDefinitions.find(t => t.name === 'kanbu_link_pr_to_task')
      expect(tool?.inputSchema.required).toContain('prId')
      expect(tool?.inputSchema.required).toContain('taskId')
    })
  })
})

// =============================================================================
// Handler Response Format Tests
// =============================================================================

describe('Handler Response Formats', () => {
  // Note: Handler tests require mocking the client and storage
  // These are integration tests that verify the response structure

  it('success helper should return correct format', async () => {
    const { success } = await import('../tools.js')

    const result = success('Test message')
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Test message' }],
    })
  })

  it('error helper should return correct format', async () => {
    const { error } = await import('../tools.js')

    const result = error('Test error')
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: Test error' }],
      isError: true,
    })
  })
})
