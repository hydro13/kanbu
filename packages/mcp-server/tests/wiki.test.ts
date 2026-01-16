/*
 * Wiki MCP Tools Tests
 * Version: 1.0.0
 *
 * Tests for Wiki MCP tools:
 * - Input validation (Zod schemas)
 * - Tool definitions
 * - Handler functions
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-16
 * Fase: MCP Phase 17 - Wiki Pages Management
 * =============================================================================
 */

import { describe, it, expect } from 'vitest'
import {
  // Project Wiki Schemas
  ListProjectWikiPagesSchema,
  GetProjectWikiPageSchema,
  GetProjectWikiPageBySlugSchema,
  CreateProjectWikiPageSchema,
  UpdateProjectWikiPageSchema,
  DeleteProjectWikiPageSchema,
  GetProjectWikiVersionsSchema,
  GetProjectWikiVersionSchema,
  RestoreProjectWikiVersionSchema,
  // Workspace Wiki Schemas
  ListWorkspaceWikiPagesSchema,
  GetWorkspaceWikiPageSchema,
  GetWorkspaceWikiPageBySlugSchema,
  CreateWorkspaceWikiPageSchema,
  UpdateWorkspaceWikiPageSchema,
  DeleteWorkspaceWikiPageSchema,
  GetWorkspaceWikiVersionsSchema,
  GetWorkspaceWikiVersionSchema,
  RestoreWorkspaceWikiVersionSchema,
  // Tool definitions
  wikiToolDefinitions,
} from '../src/tools/wiki.js'

// =============================================================================
// Project Wiki Schema Validation Tests
// =============================================================================

describe('Project Wiki MCP Tool Schemas', () => {
  describe('ListProjectWikiPagesSchema', () => {
    it('should accept valid projectId', () => {
      const result = ListProjectWikiPagesSchema.safeParse({ projectId: 123 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(123)
      }
    })

    it('should accept optional parentId (null for root)', () => {
      const result = ListProjectWikiPagesSchema.safeParse({ projectId: 1, parentId: null })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.parentId).toBe(null)
      }
    })

    it('should accept optional includeUnpublished', () => {
      const result = ListProjectWikiPagesSchema.safeParse({ projectId: 1, includeUnpublished: true })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.includeUnpublished).toBe(true)
      }
    })

    it('should reject missing projectId', () => {
      const result = ListProjectWikiPagesSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject non-number projectId', () => {
      const result = ListProjectWikiPagesSchema.safeParse({ projectId: 'abc' })
      expect(result.success).toBe(false)
    })
  })

  describe('GetProjectWikiPageSchema', () => {
    it('should accept valid id', () => {
      const result = GetProjectWikiPageSchema.safeParse({ id: 456 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(456)
      }
    })

    it('should reject missing id', () => {
      const result = GetProjectWikiPageSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetProjectWikiPageBySlugSchema', () => {
    it('should accept valid projectId and slug', () => {
      const result = GetProjectWikiPageBySlugSchema.safeParse({ projectId: 1, slug: 'my-page' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(1)
        expect(result.data.slug).toBe('my-page')
      }
    })

    it('should reject missing fields', () => {
      expect(GetProjectWikiPageBySlugSchema.safeParse({ projectId: 1 }).success).toBe(false)
      expect(GetProjectWikiPageBySlugSchema.safeParse({ slug: 'test' }).success).toBe(false)
    })
  })

  describe('CreateProjectWikiPageSchema', () => {
    it('should accept valid required fields', () => {
      const result = CreateProjectWikiPageSchema.safeParse({ projectId: 1, title: 'Test Page' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.projectId).toBe(1)
        expect(result.data.title).toBe('Test Page')
      }
    })

    it('should accept optional fields', () => {
      const result = CreateProjectWikiPageSchema.safeParse({
        projectId: 1,
        title: 'Test Page',
        content: 'Hello world',
        parentId: null,
        status: 'PUBLISHED',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('Hello world')
        expect(result.data.status).toBe('PUBLISHED')
      }
    })

    it('should accept all valid statuses', () => {
      const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
      for (const status of statuses) {
        const result = CreateProjectWikiPageSchema.safeParse({ projectId: 1, title: 'Test', status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid status', () => {
      const result = CreateProjectWikiPageSchema.safeParse({ projectId: 1, title: 'Test', status: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should reject missing required fields', () => {
      expect(CreateProjectWikiPageSchema.safeParse({ projectId: 1 }).success).toBe(false)
      expect(CreateProjectWikiPageSchema.safeParse({ title: 'Test' }).success).toBe(false)
    })
  })

  describe('UpdateProjectWikiPageSchema', () => {
    it('should accept id only', () => {
      const result = UpdateProjectWikiPageSchema.safeParse({ id: 1 })
      expect(result.success).toBe(true)
    })

    it('should accept all optional fields', () => {
      const result = UpdateProjectWikiPageSchema.safeParse({
        id: 1,
        title: 'New Title',
        content: 'New content',
        status: 'ARCHIVED',
        parentId: null,
        changeNote: 'Updated via API',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('New Title')
        expect(result.data.changeNote).toBe('Updated via API')
      }
    })

    it('should reject missing id', () => {
      const result = UpdateProjectWikiPageSchema.safeParse({ title: 'Test' })
      expect(result.success).toBe(false)
    })
  })

  describe('DeleteProjectWikiPageSchema', () => {
    it('should accept valid id', () => {
      const result = DeleteProjectWikiPageSchema.safeParse({ id: 123 })
      expect(result.success).toBe(true)
    })

    it('should reject missing id', () => {
      const result = DeleteProjectWikiPageSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetProjectWikiVersionsSchema', () => {
    it('should accept valid pageId', () => {
      const result = GetProjectWikiVersionsSchema.safeParse({ pageId: 1 })
      expect(result.success).toBe(true)
    })

    it('should accept optional limit', () => {
      const result = GetProjectWikiVersionsSchema.safeParse({ pageId: 1, limit: 10 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(10)
      }
    })

    it('should reject missing pageId', () => {
      const result = GetProjectWikiVersionsSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetProjectWikiVersionSchema', () => {
    it('should accept valid pageId and version', () => {
      const result = GetProjectWikiVersionSchema.safeParse({ pageId: 1, version: 5 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pageId).toBe(1)
        expect(result.data.version).toBe(5)
      }
    })

    it('should reject missing fields', () => {
      expect(GetProjectWikiVersionSchema.safeParse({ pageId: 1 }).success).toBe(false)
      expect(GetProjectWikiVersionSchema.safeParse({ version: 5 }).success).toBe(false)
    })
  })

  describe('RestoreProjectWikiVersionSchema', () => {
    it('should accept valid pageId and version', () => {
      const result = RestoreProjectWikiVersionSchema.safeParse({ pageId: 1, version: 3 })
      expect(result.success).toBe(true)
    })

    it('should accept optional changeNote', () => {
      const result = RestoreProjectWikiVersionSchema.safeParse({
        pageId: 1,
        version: 3,
        changeNote: 'Restored from version 3',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.changeNote).toBe('Restored from version 3')
      }
    })

    it('should reject missing required fields', () => {
      expect(RestoreProjectWikiVersionSchema.safeParse({ pageId: 1 }).success).toBe(false)
      expect(RestoreProjectWikiVersionSchema.safeParse({ version: 3 }).success).toBe(false)
    })
  })
})

// =============================================================================
// Workspace Wiki Schema Validation Tests
// =============================================================================

describe('Workspace Wiki MCP Tool Schemas', () => {
  describe('ListWorkspaceWikiPagesSchema', () => {
    it('should accept valid workspaceId', () => {
      const result = ListWorkspaceWikiPagesSchema.safeParse({ workspaceId: 123 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.workspaceId).toBe(123)
      }
    })

    it('should accept optional parentId and includeUnpublished', () => {
      const result = ListWorkspaceWikiPagesSchema.safeParse({
        workspaceId: 1,
        parentId: null,
        includeUnpublished: true,
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing workspaceId', () => {
      const result = ListWorkspaceWikiPagesSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetWorkspaceWikiPageSchema', () => {
    it('should accept valid id', () => {
      const result = GetWorkspaceWikiPageSchema.safeParse({ id: 456 })
      expect(result.success).toBe(true)
    })

    it('should reject missing id', () => {
      const result = GetWorkspaceWikiPageSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetWorkspaceWikiPageBySlugSchema', () => {
    it('should accept valid workspaceId and slug', () => {
      const result = GetWorkspaceWikiPageBySlugSchema.safeParse({ workspaceId: 1, slug: 'my-page' })
      expect(result.success).toBe(true)
    })

    it('should reject missing fields', () => {
      expect(GetWorkspaceWikiPageBySlugSchema.safeParse({ workspaceId: 1 }).success).toBe(false)
      expect(GetWorkspaceWikiPageBySlugSchema.safeParse({ slug: 'test' }).success).toBe(false)
    })
  })

  describe('CreateWorkspaceWikiPageSchema', () => {
    it('should accept valid required fields', () => {
      const result = CreateWorkspaceWikiPageSchema.safeParse({ workspaceId: 1, title: 'Test Page' })
      expect(result.success).toBe(true)
    })

    it('should accept all valid statuses', () => {
      const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
      for (const status of statuses) {
        const result = CreateWorkspaceWikiPageSchema.safeParse({ workspaceId: 1, title: 'Test', status })
        expect(result.success).toBe(true)
      }
    })

    it('should reject missing required fields', () => {
      expect(CreateWorkspaceWikiPageSchema.safeParse({ workspaceId: 1 }).success).toBe(false)
      expect(CreateWorkspaceWikiPageSchema.safeParse({ title: 'Test' }).success).toBe(false)
    })
  })

  describe('UpdateWorkspaceWikiPageSchema', () => {
    it('should accept id only', () => {
      const result = UpdateWorkspaceWikiPageSchema.safeParse({ id: 1 })
      expect(result.success).toBe(true)
    })

    it('should accept all optional fields', () => {
      const result = UpdateWorkspaceWikiPageSchema.safeParse({
        id: 1,
        title: 'New Title',
        content: 'New content',
        status: 'PUBLISHED',
        changeNote: 'Updated',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing id', () => {
      const result = UpdateWorkspaceWikiPageSchema.safeParse({ title: 'Test' })
      expect(result.success).toBe(false)
    })
  })

  describe('DeleteWorkspaceWikiPageSchema', () => {
    it('should accept valid id', () => {
      const result = DeleteWorkspaceWikiPageSchema.safeParse({ id: 123 })
      expect(result.success).toBe(true)
    })

    it('should reject missing id', () => {
      const result = DeleteWorkspaceWikiPageSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetWorkspaceWikiVersionsSchema', () => {
    it('should accept valid pageId', () => {
      const result = GetWorkspaceWikiVersionsSchema.safeParse({ pageId: 1 })
      expect(result.success).toBe(true)
    })

    it('should accept optional limit', () => {
      const result = GetWorkspaceWikiVersionsSchema.safeParse({ pageId: 1, limit: 15 })
      expect(result.success).toBe(true)
    })

    it('should reject missing pageId', () => {
      const result = GetWorkspaceWikiVersionsSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('GetWorkspaceWikiVersionSchema', () => {
    it('should accept valid pageId and version', () => {
      const result = GetWorkspaceWikiVersionSchema.safeParse({ pageId: 1, version: 5 })
      expect(result.success).toBe(true)
    })

    it('should reject missing fields', () => {
      expect(GetWorkspaceWikiVersionSchema.safeParse({ pageId: 1 }).success).toBe(false)
      expect(GetWorkspaceWikiVersionSchema.safeParse({ version: 5 }).success).toBe(false)
    })
  })

  describe('RestoreWorkspaceWikiVersionSchema', () => {
    it('should accept valid pageId and version', () => {
      const result = RestoreWorkspaceWikiVersionSchema.safeParse({ pageId: 1, version: 3 })
      expect(result.success).toBe(true)
    })

    it('should accept optional changeNote', () => {
      const result = RestoreWorkspaceWikiVersionSchema.safeParse({
        pageId: 1,
        version: 3,
        changeNote: 'Restored from backup',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      expect(RestoreWorkspaceWikiVersionSchema.safeParse({ pageId: 1 }).success).toBe(false)
      expect(RestoreWorkspaceWikiVersionSchema.safeParse({ version: 3 }).success).toBe(false)
    })
  })
})

// =============================================================================
// Tool Definitions Tests
// =============================================================================

describe('Wiki Tool Definitions', () => {
  it('should export 18 tool definitions (9 project + 9 workspace)', () => {
    expect(wikiToolDefinitions).toHaveLength(18)
  })

  it('should have unique tool names', () => {
    const names = wikiToolDefinitions.map(t => t.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  it('should have all required project wiki tool names', () => {
    const names = wikiToolDefinitions.map(t => t.name)

    expect(names).toContain('kanbu_list_project_wiki_pages')
    expect(names).toContain('kanbu_get_project_wiki_page')
    expect(names).toContain('kanbu_get_project_wiki_page_by_slug')
    expect(names).toContain('kanbu_create_project_wiki_page')
    expect(names).toContain('kanbu_update_project_wiki_page')
    expect(names).toContain('kanbu_delete_project_wiki_page')
    expect(names).toContain('kanbu_get_project_wiki_versions')
    expect(names).toContain('kanbu_get_project_wiki_version')
    expect(names).toContain('kanbu_restore_project_wiki_version')
  })

  it('should have all required workspace wiki tool names', () => {
    const names = wikiToolDefinitions.map(t => t.name)

    expect(names).toContain('kanbu_list_workspace_wiki_pages')
    expect(names).toContain('kanbu_get_workspace_wiki_page')
    expect(names).toContain('kanbu_get_workspace_wiki_page_by_slug')
    expect(names).toContain('kanbu_create_workspace_wiki_page')
    expect(names).toContain('kanbu_update_workspace_wiki_page')
    expect(names).toContain('kanbu_delete_workspace_wiki_page')
    expect(names).toContain('kanbu_get_workspace_wiki_versions')
    expect(names).toContain('kanbu_get_workspace_wiki_version')
    expect(names).toContain('kanbu_restore_workspace_wiki_version')
  })

  it('should have valid inputSchema for each tool', () => {
    for (const tool of wikiToolDefinitions) {
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    }
  })

  it('should have descriptions for all tools', () => {
    for (const tool of wikiToolDefinitions) {
      expect(tool.description).toBeDefined()
      expect(tool.description.length).toBeGreaterThan(10)
    }
  })

  describe('Project Wiki Tool input schemas should match Zod schemas', () => {
    it('kanbu_list_project_wiki_pages should require projectId', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_list_project_wiki_pages')
      expect(tool?.inputSchema.required).toContain('projectId')
    })

    it('kanbu_get_project_wiki_page should require id', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_get_project_wiki_page')
      expect(tool?.inputSchema.required).toContain('id')
    })

    it('kanbu_get_project_wiki_page_by_slug should require projectId and slug', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_get_project_wiki_page_by_slug')
      expect(tool?.inputSchema.required).toContain('projectId')
      expect(tool?.inputSchema.required).toContain('slug')
    })

    it('kanbu_create_project_wiki_page should require projectId and title', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_create_project_wiki_page')
      expect(tool?.inputSchema.required).toContain('projectId')
      expect(tool?.inputSchema.required).toContain('title')
    })

    it('kanbu_update_project_wiki_page should require id only', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_update_project_wiki_page')
      expect(tool?.inputSchema.required).toEqual(['id'])
    })

    it('kanbu_delete_project_wiki_page should require id', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_delete_project_wiki_page')
      expect(tool?.inputSchema.required).toContain('id')
    })

    it('kanbu_get_project_wiki_versions should require pageId', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_get_project_wiki_versions')
      expect(tool?.inputSchema.required).toContain('pageId')
    })

    it('kanbu_get_project_wiki_version should require pageId and version', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_get_project_wiki_version')
      expect(tool?.inputSchema.required).toContain('pageId')
      expect(tool?.inputSchema.required).toContain('version')
    })

    it('kanbu_restore_project_wiki_version should require pageId and version', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_restore_project_wiki_version')
      expect(tool?.inputSchema.required).toContain('pageId')
      expect(tool?.inputSchema.required).toContain('version')
    })
  })

  describe('Workspace Wiki Tool input schemas should match Zod schemas', () => {
    it('kanbu_list_workspace_wiki_pages should require workspaceId', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_list_workspace_wiki_pages')
      expect(tool?.inputSchema.required).toContain('workspaceId')
    })

    it('kanbu_create_workspace_wiki_page should require workspaceId and title', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_create_workspace_wiki_page')
      expect(tool?.inputSchema.required).toContain('workspaceId')
      expect(tool?.inputSchema.required).toContain('title')
    })

    it('kanbu_get_workspace_wiki_page_by_slug should require workspaceId and slug', () => {
      const tool = wikiToolDefinitions.find(t => t.name === 'kanbu_get_workspace_wiki_page_by_slug')
      expect(tool?.inputSchema.required).toContain('workspaceId')
      expect(tool?.inputSchema.required).toContain('slug')
    })
  })
})

// =============================================================================
// Handler Response Format Tests
// =============================================================================

describe('Wiki Handler Response Formats', () => {
  it('success helper should return correct format', async () => {
    const { success } = await import('../src/tools.js')

    const result = success('Test wiki message')
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Test wiki message' }],
    })
  })

  it('error helper should return correct format', async () => {
    const { error } = await import('../src/tools.js')

    const result = error('Wiki error message')
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: Wiki error message' }],
      isError: true,
    })
  })

  it('formatDate helper should format dates correctly', async () => {
    const { formatDate } = await import('../src/tools.js')

    // Test with a valid date
    const date = '2026-01-16T12:00:00Z'
    const result = formatDate(date)
    expect(result).toContain('2026')

    // Test with null
    expect(formatDate(null)).toBe('-')

    // Test with undefined
    expect(formatDate(undefined)).toBe('-')
  })
})
