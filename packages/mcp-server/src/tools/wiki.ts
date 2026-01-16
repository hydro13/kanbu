/*
 * Wiki Pages Tools
 * Version: 1.0.0
 *
 * MCP tools for project and workspace wiki page management.
 * Provides full CRUD operations, version control, and hierarchical structure.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-16
 * Fase: MCP Phase 17 - Wiki Pages Management
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, formatDate, truncate } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface WikiPage {
  id: number
  title: string
  slug: string
  content?: string | null
  status: string
  parentId: number | null
  currentVersion?: number
  versionCount?: number
  childCount?: number
  sortOrder?: number
  createdAt: string
  updatedAt: string
  author?: {
    id: number
    name: string
    username: string
  } | null
  lastEditedBy?: {
    id: number
    name: string
    username: string
  } | null
  children?: WikiPage[]
}

interface WikiVersion {
  version: number
  title: string
  content: string | null
  changeNote: string | null
  createdAt: string
  author?: {
    id: number
    name: string
    username: string
  } | null
}

// Response wrapper for create/update operations (includes Graphiti contradictions)
interface WikiPageResponse {
  page: WikiPage
  contradictions: unknown[]
  contradictionsResolved: number
}

// =============================================================================
// Schemas - Project Wiki
// =============================================================================

export const ListProjectWikiPagesSchema = z.object({
  projectId: z.number().describe('Project ID'),
  parentId: z.number().nullable().optional().describe('Filter by parent page ID (null for root pages)'),
  includeUnpublished: z.boolean().optional().describe('Include draft and archived pages (default: false)'),
})

export const GetProjectWikiPageSchema = z.object({
  id: z.number().describe('Wiki page ID'),
})

export const GetProjectWikiPageBySlugSchema = z.object({
  projectId: z.number().describe('Project ID'),
  slug: z.string().describe('Page slug'),
})

export const CreateProjectWikiPageSchema = z.object({
  projectId: z.number().describe('Project ID'),
  parentId: z.number().nullable().optional().describe('Parent page ID (null for root page)'),
  title: z.string().describe('Page title'),
  content: z.string().optional().describe('Page content (plain text)'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().describe('Page status (default: DRAFT)'),
})

export const UpdateProjectWikiPageSchema = z.object({
  id: z.number().describe('Wiki page ID'),
  title: z.string().optional().describe('New title'),
  content: z.string().optional().describe('New content'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().describe('New status'),
  parentId: z.number().nullable().optional().describe('New parent page ID'),
  changeNote: z.string().optional().describe('Note for version history'),
})

export const DeleteProjectWikiPageSchema = z.object({
  id: z.number().describe('Wiki page ID to delete'),
})

export const GetProjectWikiVersionsSchema = z.object({
  pageId: z.number().describe('Wiki page ID'),
  limit: z.number().optional().describe('Maximum number of versions (default: 20)'),
})

export const GetProjectWikiVersionSchema = z.object({
  pageId: z.number().describe('Wiki page ID'),
  version: z.number().describe('Version number'),
})

export const RestoreProjectWikiVersionSchema = z.object({
  pageId: z.number().describe('Wiki page ID'),
  version: z.number().describe('Version number to restore'),
  changeNote: z.string().optional().describe('Note for version history'),
})

// =============================================================================
// Schemas - Workspace Wiki
// =============================================================================

export const ListWorkspaceWikiPagesSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
  parentId: z.number().nullable().optional().describe('Filter by parent page ID (null for root pages)'),
  includeUnpublished: z.boolean().optional().describe('Include draft and archived pages (default: false)'),
})

export const GetWorkspaceWikiPageSchema = z.object({
  id: z.number().describe('Wiki page ID'),
})

export const GetWorkspaceWikiPageBySlugSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
  slug: z.string().describe('Page slug'),
})

export const CreateWorkspaceWikiPageSchema = z.object({
  workspaceId: z.number().describe('Workspace ID'),
  parentId: z.number().nullable().optional().describe('Parent page ID (null for root page)'),
  title: z.string().describe('Page title'),
  content: z.string().optional().describe('Page content (plain text)'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().describe('Page status (default: DRAFT)'),
})

export const UpdateWorkspaceWikiPageSchema = z.object({
  id: z.number().describe('Wiki page ID'),
  title: z.string().optional().describe('New title'),
  content: z.string().optional().describe('New content'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().describe('New status'),
  parentId: z.number().nullable().optional().describe('New parent page ID'),
  changeNote: z.string().optional().describe('Note for version history'),
})

export const DeleteWorkspaceWikiPageSchema = z.object({
  id: z.number().describe('Wiki page ID to delete'),
})

export const GetWorkspaceWikiVersionsSchema = z.object({
  pageId: z.number().describe('Wiki page ID'),
  limit: z.number().optional().describe('Maximum number of versions (default: 20)'),
})

export const GetWorkspaceWikiVersionSchema = z.object({
  pageId: z.number().describe('Wiki page ID'),
  version: z.number().describe('Version number'),
})

export const RestoreWorkspaceWikiVersionSchema = z.object({
  pageId: z.number().describe('Wiki page ID'),
  version: z.number().describe('Version number to restore'),
  changeNote: z.string().optional().describe('Note for version history'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const wikiToolDefinitions = [
  // =========================================================================
  // PROJECT WIKI TOOLS
  // =========================================================================
  {
    name: 'kanbu_list_project_wiki_pages',
    description:
      'List wiki pages in a project. Returns hierarchical structure with parent/child relationships. Use parentId filter to get pages at specific level. Supports [[wiki links]], @mentions, #task-refs, and #tags.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'Filter by parent page ID (null for root pages, omit for all)',
        },
        includeUnpublished: {
          type: 'boolean',
          description: 'Include draft and archived pages (default: false)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_page',
    description:
      'Get detailed information about a specific project wiki page including content, metadata, and cross-references.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Wiki page ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_page_by_slug',
    description:
      'Get a project wiki page by its slug (permalink). Useful when you know the page title but not the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        slug: {
          type: 'string',
          description: 'Page slug (auto-generated from title)',
        },
      },
      required: ['projectId', 'slug'],
    },
  },
  {
    name: 'kanbu_create_project_wiki_page',
    description:
      'Create a new wiki page in a project. Supports [[wiki links]], @mentions, #task-refs, and #tags in content. You need Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'Parent page ID (null for root page)',
        },
        title: {
          type: 'string',
          description: 'Page title',
        },
        content: {
          type: 'string',
          description: 'Page content (plain text with cross-references)',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'Page status (default: DRAFT)',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'kanbu_update_project_wiki_page',
    description:
      'Update a project wiki page. Creates a new version automatically. Extracts cross-references from content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Wiki page ID',
        },
        title: {
          type: 'string',
          description: 'New title',
        },
        content: {
          type: 'string',
          description: 'New content',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'New status',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'New parent page ID',
        },
        changeNote: {
          type: 'string',
          description: 'Note for version history',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_delete_project_wiki_page',
    description:
      'Delete a project wiki page. You need Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Wiki page ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_versions',
    description:
      'Get version history for a project wiki page. Returns up to 20 most recent versions with change notes.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Wiki page ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of versions (default: 20)',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'kanbu_get_project_wiki_version',
    description:
      'Get a specific version of a project wiki page by version number.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Wiki page ID',
        },
        version: {
          type: 'number',
          description: 'Version number',
        },
      },
      required: ['pageId', 'version'],
    },
  },
  {
    name: 'kanbu_restore_project_wiki_version',
    description:
      'Restore an old version of a project wiki page. Creates a new version (does not rewrite history).',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Wiki page ID',
        },
        version: {
          type: 'number',
          description: 'Version number to restore',
        },
        changeNote: {
          type: 'string',
          description: 'Note for version history',
        },
      },
      required: ['pageId', 'version'],
    },
  },

  // =========================================================================
  // WORKSPACE WIKI TOOLS
  // =========================================================================
  {
    name: 'kanbu_list_workspace_wiki_pages',
    description:
      'List wiki pages in a workspace. Returns hierarchical structure with parent/child relationships. Use parentId filter to get pages at specific level. Supports [[wiki links]], @mentions, #task-refs, and #tags.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'number',
          description: 'Workspace ID',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'Filter by parent page ID (null for root pages, omit for all)',
        },
        includeUnpublished: {
          type: 'boolean',
          description: 'Include draft and archived pages (default: false)',
        },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_page',
    description:
      'Get detailed information about a specific workspace wiki page including content, metadata, and cross-references.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Wiki page ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_page_by_slug',
    description:
      'Get a workspace wiki page by its slug (permalink). Useful when you know the page title but not the ID.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'number',
          description: 'Workspace ID',
        },
        slug: {
          type: 'string',
          description: 'Page slug (auto-generated from title)',
        },
      },
      required: ['workspaceId', 'slug'],
    },
  },
  {
    name: 'kanbu_create_workspace_wiki_page',
    description:
      'Create a new wiki page in a workspace. Supports [[wiki links]], @mentions, #task-refs, and #tags in content. You need Write permission on the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'number',
          description: 'Workspace ID',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'Parent page ID (null for root page)',
        },
        title: {
          type: 'string',
          description: 'Page title',
        },
        content: {
          type: 'string',
          description: 'Page content (plain text with cross-references)',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'Page status (default: DRAFT)',
        },
      },
      required: ['workspaceId', 'title'],
    },
  },
  {
    name: 'kanbu_update_workspace_wiki_page',
    description:
      'Update a workspace wiki page. Creates a new version automatically. Extracts cross-references from content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Wiki page ID',
        },
        title: {
          type: 'string',
          description: 'New title',
        },
        content: {
          type: 'string',
          description: 'New content',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
          description: 'New status',
        },
        parentId: {
          type: ['number', 'null'],
          description: 'New parent page ID',
        },
        changeNote: {
          type: 'string',
          description: 'Note for version history',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_delete_workspace_wiki_page',
    description:
      'Delete a workspace wiki page. You need Write permission on the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Wiki page ID to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_versions',
    description:
      'Get version history for a workspace wiki page. Returns up to 20 most recent versions with change notes.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Wiki page ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of versions (default: 20)',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'kanbu_get_workspace_wiki_version',
    description:
      'Get a specific version of a workspace wiki page by version number.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Wiki page ID',
        },
        version: {
          type: 'number',
          description: 'Version number',
        },
      },
      required: ['pageId', 'version'],
    },
  },
  {
    name: 'kanbu_restore_workspace_wiki_version',
    description:
      'Restore an old version of a workspace wiki page. Creates a new version (does not rewrite history).',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Wiki page ID',
        },
        version: {
          type: 'number',
          description: 'Version number to restore',
        },
        changeNote: {
          type: 'string',
          description: 'Note for version history',
        },
      },
      required: ['pageId', 'version'],
    },
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

function formatAuthor(author: { name: string; username: string } | null | undefined): string {
  if (!author) return 'Unknown'
  return `${author.name} (@${author.username})`
}

function formatWikiPageSummary(page: WikiPage): string[] {
  const lines: string[] = []
  const statusIcon = page.status === 'PUBLISHED' ? '📄' : page.status === 'DRAFT' ? '📝' : '📦'
  const hasChildren = (page.childCount && page.childCount > 0) || (page.children && page.children.length > 0) ? ' 📁' : ''

  lines.push(`${statusIcon} ${page.title}${hasChildren}`)
  lines.push(`   ID: ${page.id} | Slug: ${page.slug}`)

  const version = page.currentVersion ?? page.versionCount ?? 1
  lines.push(`   Status: ${page.status} | Versions: ${version}`)

  if (page.author) {
    lines.push(`   Author: ${formatAuthor(page.author)} | Updated: ${formatDate(page.updatedAt)}`)
  } else {
    lines.push(`   Updated: ${formatDate(page.updatedAt)}`)
  }

  return lines
}

// =============================================================================
// Tool Handlers - Project Wiki
// =============================================================================

/**
 * List wiki pages in a project
 */
export async function handleListProjectWikiPages(args: unknown) {
  const input = ListProjectWikiPagesSchema.parse(args)
  const config = requireAuth()

  const pages = await client.call<WikiPage[]>(
    config.kanbuUrl,
    config.token,
    'projectWiki.list',
    input
  )

  if (!pages || pages.length === 0) {
    return success('No wiki pages found in this project.')
  }

  const lines: string[] = [`Wiki Pages (${pages.length}):`, '']

  pages.forEach((page) => {
    lines.push(...formatWikiPageSummary(page))
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get project wiki page details
 */
export async function handleGetProjectWikiPage(args: unknown) {
  const { id } = GetProjectWikiPageSchema.parse(args)
  const config = requireAuth()

  const page = await client.call<WikiPage>(
    config.kanbuUrl,
    config.token,
    'projectWiki.get',
    { id }
  )

  const lines: string[] = [
    `📄 ${page.title}`,
    '',
    `ID: ${page.id}`,
    `Slug: ${page.slug}`,
    `Status: ${page.status}`,
    `Version: ${page.currentVersion}`,
    `Parent ID: ${page.parentId ?? 'None (root page)'}`,
    '',
    `Author: ${formatAuthor(page.author)}`,
    `Last edited by: ${formatAuthor(page.lastEditedBy)}`,
    `Created: ${formatDate(page.createdAt)}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  if (page.content) {
    lines.push('')
    lines.push('Content:')
    lines.push('─'.repeat(40))
    lines.push(page.content)
  }

  return success(lines.join('\n'))
}

/**
 * Get project wiki page by slug
 */
export async function handleGetProjectWikiPageBySlug(args: unknown) {
  const input = GetProjectWikiPageBySlugSchema.parse(args)
  const config = requireAuth()

  const page = await client.call<WikiPage>(
    config.kanbuUrl,
    config.token,
    'projectWiki.getBySlug',
    input
  )

  const lines: string[] = [
    `📄 ${page.title}`,
    '',
    `ID: ${page.id}`,
    `Slug: ${page.slug}`,
    `Status: ${page.status}`,
    `Version: ${page.currentVersion}`,
    '',
    `Created: ${formatDate(page.createdAt)}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  if (page.content) {
    lines.push('')
    lines.push('Content:')
    lines.push('─'.repeat(40))
    lines.push(page.content)
  }

  return success(lines.join('\n'))
}

/**
 * Create a new project wiki page
 */
export async function handleCreateProjectWikiPage(args: unknown) {
  const input = CreateProjectWikiPageSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<WikiPageResponse>(
    config.kanbuUrl,
    config.token,
    'projectWiki.create',
    input,
    'POST'
  )

  const page = result.page

  const lines: string[] = [
    'Wiki page created:',
    '',
    `📄 ${page.title}`,
    `ID: ${page.id}`,
    `Slug: ${page.slug}`,
    `Status: ${page.status}`,
    '',
    `URL: /project/${input.projectId}/wiki/${page.slug}`,
  ]

  return success(lines.join('\n'))
}

/**
 * Update a project wiki page
 */
export async function handleUpdateProjectWikiPage(args: unknown) {
  const input = UpdateProjectWikiPageSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<WikiPageResponse>(
    config.kanbuUrl,
    config.token,
    'projectWiki.update',
    input,
    'POST'
  )

  const page = result.page

  const lines: string[] = [
    'Wiki page updated:',
    '',
    `📄 ${page.title}`,
    `ID: ${page.id}`,
    `Version: ${page.currentVersion}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  return success(lines.join('\n'))
}

/**
 * Delete a project wiki page
 */
export async function handleDeleteProjectWikiPage(args: unknown) {
  const { id } = DeleteProjectWikiPageSchema.parse(args)
  const config = requireAuth()

  await client.call<{ success: boolean }>(
    config.kanbuUrl,
    config.token,
    'projectWiki.delete',
    { id },
    'POST'
  )

  return success(`Wiki page #${id} deleted.`)
}

/**
 * Get version history for a project wiki page
 */
export async function handleGetProjectWikiVersions(args: unknown) {
  const input = GetProjectWikiVersionsSchema.parse(args)
  const config = requireAuth()

  const versions = await client.call<WikiVersion[]>(
    config.kanbuUrl,
    config.token,
    'projectWiki.getVersions',
    input
  )

  if (!versions || versions.length === 0) {
    return success('No versions found for this wiki page.')
  }

  const lines: string[] = [`Version History (${versions.length}):`, '']

  versions.forEach((v) => {
    lines.push(`v${v.version}: ${v.title}`)
    lines.push(`   Author: ${formatAuthor(v.author)} | Date: ${formatDate(v.createdAt)}`)
    if (v.changeNote) {
      lines.push(`   Note: ${v.changeNote}`)
    }
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get a specific version of a project wiki page
 */
export async function handleGetProjectWikiVersion(args: unknown) {
  const input = GetProjectWikiVersionSchema.parse(args)
  const config = requireAuth()

  const version = await client.call<WikiVersion>(
    config.kanbuUrl,
    config.token,
    'projectWiki.getVersion',
    input
  )

  const lines: string[] = [
    `📜 Version ${version.version}: ${version.title}`,
    '',
    `Author: ${formatAuthor(version.author)}`,
    `Date: ${formatDate(version.createdAt)}`,
  ]

  if (version.changeNote) {
    lines.push(`Change note: ${version.changeNote}`)
  }

  if (version.content) {
    lines.push('')
    lines.push('Content:')
    lines.push('─'.repeat(40))
    lines.push(version.content)
  }

  return success(lines.join('\n'))
}

/**
 * Restore an old version of a project wiki page
 */
export async function handleRestoreProjectWikiVersion(args: unknown) {
  const input = RestoreProjectWikiVersionSchema.parse(args)
  const config = requireAuth()

  const page = await client.call<WikiPage>(
    config.kanbuUrl,
    config.token,
    'projectWiki.restoreVersion',
    input,
    'POST'
  )

  const lines: string[] = [
    `Wiki page restored from version ${input.version}:`,
    '',
    `📄 ${page.title}`,
    `ID: ${page.id}`,
    `New version: ${page.currentVersion}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  return success(lines.join('\n'))
}

// =============================================================================
// Tool Handlers - Workspace Wiki
// =============================================================================

/**
 * List wiki pages in a workspace
 */
export async function handleListWorkspaceWikiPages(args: unknown) {
  const input = ListWorkspaceWikiPagesSchema.parse(args)
  const config = requireAuth()

  const pages = await client.call<WikiPage[]>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.list',
    input
  )

  if (!pages || pages.length === 0) {
    return success('No wiki pages found in this workspace.')
  }

  const lines: string[] = [`Wiki Pages (${pages.length}):`, '']

  pages.forEach((page) => {
    lines.push(...formatWikiPageSummary(page))
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get workspace wiki page details
 */
export async function handleGetWorkspaceWikiPage(args: unknown) {
  const { id } = GetWorkspaceWikiPageSchema.parse(args)
  const config = requireAuth()

  const page = await client.call<WikiPage>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.get',
    { id }
  )

  const lines: string[] = [
    `📄 ${page.title}`,
    '',
    `ID: ${page.id}`,
    `Slug: ${page.slug}`,
    `Status: ${page.status}`,
    `Version: ${page.currentVersion}`,
    `Parent ID: ${page.parentId ?? 'None (root page)'}`,
    '',
    `Author: ${formatAuthor(page.author)}`,
    `Last edited by: ${formatAuthor(page.lastEditedBy)}`,
    `Created: ${formatDate(page.createdAt)}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  if (page.content) {
    lines.push('')
    lines.push('Content:')
    lines.push('─'.repeat(40))
    lines.push(page.content)
  }

  return success(lines.join('\n'))
}

/**
 * Get workspace wiki page by slug
 */
export async function handleGetWorkspaceWikiPageBySlug(args: unknown) {
  const input = GetWorkspaceWikiPageBySlugSchema.parse(args)
  const config = requireAuth()

  const page = await client.call<WikiPage>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.getBySlug',
    input
  )

  const lines: string[] = [
    `📄 ${page.title}`,
    '',
    `ID: ${page.id}`,
    `Slug: ${page.slug}`,
    `Status: ${page.status}`,
    `Version: ${page.currentVersion}`,
    '',
    `Created: ${formatDate(page.createdAt)}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  if (page.content) {
    lines.push('')
    lines.push('Content:')
    lines.push('─'.repeat(40))
    lines.push(page.content)
  }

  return success(lines.join('\n'))
}

/**
 * Create a new workspace wiki page
 */
export async function handleCreateWorkspaceWikiPage(args: unknown) {
  const input = CreateWorkspaceWikiPageSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<WikiPageResponse>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.create',
    input,
    'POST'
  )

  const page = result.page

  const lines: string[] = [
    'Wiki page created:',
    '',
    `📄 ${page.title}`,
    `ID: ${page.id}`,
    `Slug: ${page.slug}`,
    `Status: ${page.status}`,
    '',
    `URL: /workspace/${input.workspaceId}/wiki/${page.slug}`,
  ]

  return success(lines.join('\n'))
}

/**
 * Update a workspace wiki page
 */
export async function handleUpdateWorkspaceWikiPage(args: unknown) {
  const input = UpdateWorkspaceWikiPageSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<WikiPageResponse>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.update',
    input,
    'POST'
  )

  const page = result.page

  const lines: string[] = [
    'Wiki page updated:',
    '',
    `📄 ${page.title}`,
    `ID: ${page.id}`,
    `Version: ${page.currentVersion}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  return success(lines.join('\n'))
}

/**
 * Delete a workspace wiki page
 */
export async function handleDeleteWorkspaceWikiPage(args: unknown) {
  const { id } = DeleteWorkspaceWikiPageSchema.parse(args)
  const config = requireAuth()

  await client.call<{ success: boolean }>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.delete',
    { id },
    'POST'
  )

  return success(`Wiki page #${id} deleted.`)
}

/**
 * Get version history for a workspace wiki page
 */
export async function handleGetWorkspaceWikiVersions(args: unknown) {
  const input = GetWorkspaceWikiVersionsSchema.parse(args)
  const config = requireAuth()

  const versions = await client.call<WikiVersion[]>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.getVersions',
    input
  )

  if (!versions || versions.length === 0) {
    return success('No versions found for this wiki page.')
  }

  const lines: string[] = [`Version History (${versions.length}):`, '']

  versions.forEach((v) => {
    lines.push(`v${v.version}: ${v.title}`)
    lines.push(`   Author: ${formatAuthor(v.author)} | Date: ${formatDate(v.createdAt)}`)
    if (v.changeNote) {
      lines.push(`   Note: ${v.changeNote}`)
    }
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get a specific version of a workspace wiki page
 */
export async function handleGetWorkspaceWikiVersion(args: unknown) {
  const input = GetWorkspaceWikiVersionSchema.parse(args)
  const config = requireAuth()

  const version = await client.call<WikiVersion>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.getVersion',
    input
  )

  const lines: string[] = [
    `📜 Version ${version.version}: ${version.title}`,
    '',
    `Author: ${formatAuthor(version.author)}`,
    `Date: ${formatDate(version.createdAt)}`,
  ]

  if (version.changeNote) {
    lines.push(`Change note: ${version.changeNote}`)
  }

  if (version.content) {
    lines.push('')
    lines.push('Content:')
    lines.push('─'.repeat(40))
    lines.push(version.content)
  }

  return success(lines.join('\n'))
}

/**
 * Restore an old version of a workspace wiki page
 */
export async function handleRestoreWorkspaceWikiVersion(args: unknown) {
  const input = RestoreWorkspaceWikiVersionSchema.parse(args)
  const config = requireAuth()

  const page = await client.call<WikiPage>(
    config.kanbuUrl,
    config.token,
    'workspaceWiki.restoreVersion',
    input,
    'POST'
  )

  const lines: string[] = [
    `Wiki page restored from version ${input.version}:`,
    '',
    `📄 ${page.title}`,
    `ID: ${page.id}`,
    `New version: ${page.currentVersion}`,
    `Updated: ${formatDate(page.updatedAt)}`,
  ]

  return success(lines.join('\n'))
}
