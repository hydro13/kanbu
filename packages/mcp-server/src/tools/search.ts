/*
 * Search Tools
 * Version: 1.0.0
 *
 * MCP tools for searching tasks, comments, and wiki pages.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 4 - Search & Smart Features
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, truncate } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface SearchTaskResult {
  id: number
  title: string
  reference: string
  priority: string
  isActive: boolean
  dateDue: string | null
  column: { id: number; title: string } | null
  assignees: Array<{ id: number; username: string; name: string }>
  tags: Array<{ id: number; name: string; color: string }>
}

interface GlobalSearchResult {
  type: 'task' | 'comment' | 'wiki'
  id: number
  title: string
  snippet: string
  taskId?: number
  taskTitle?: string
  updatedAt: string
}

// =============================================================================
// Schemas
// =============================================================================

export const SearchTasksSchema = z.object({
  projectId: z.number().describe('Project ID to search in'),
  query: z.string().describe('Search query (searches in title, reference, description)'),
  includeCompleted: z.boolean().optional().describe('Include completed tasks'),
  limit: z.number().optional().describe('Maximum results (default: 20)'),
})

export const SearchGlobalSchema = z.object({
  projectId: z.number().describe('Project ID to search in'),
  query: z.string().describe('Search query'),
  types: z
    .array(z.enum(['task', 'comment', 'wiki']))
    .optional()
    .describe('Entity types to search (default: all)'),
  limit: z.number().optional().describe('Maximum results (default: 20)'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const searchToolDefinitions = [
  {
    name: 'kanbu_search_tasks',
    description:
      'Search for tasks in a project. Searches in title, reference, and description.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to search in',
        },
        query: {
          type: 'string',
          description: 'Search query',
        },
        includeCompleted: {
          type: 'boolean',
          description: 'Include completed tasks (default: false)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 20)',
        },
      },
      required: ['projectId', 'query'],
    },
  },
  {
    name: 'kanbu_search_global',
    description:
      'Global logical search across the entire project (tasks, comments, wiki). Use this for broad queries like "what happened last week?" or "plan for release". It uses vector search to find conceptually relevant results, not just exact keyword matches.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to search in',
        },
        query: {
          type: 'string',
          description:
            'Natural language search query. Examples: "blockers for android", "decisions made about api", "deployment issues"',
        },
        types: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'comment', 'wiki'] },
          description: 'Entity types to search (default: all)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 20)',
        },
      },
      required: ['projectId', 'query'],
    },
  },
]

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Search tasks in a project
 */
export async function handleSearchTasks(args: unknown) {
  const input = SearchTasksSchema.parse(args)
  const config = requireAuth()

  const results = await client.call<SearchTaskResult[]>(
    config.kanbuUrl,
    config.token,
    'search.tasks',
    {
      projectId: input.projectId,
      query: input.query,
      includeCompleted: input.includeCompleted ?? false,
      limit: input.limit ?? 20,
    }
  )

  if (results.length === 0) {
    return success(`No tasks found matching "${input.query}"`)
  }

  const lines: string[] = [`Search results for "${input.query}" (${results.length}):`, '']

  results.forEach((task) => {
    const status = task.isActive ? '' : ' [CLOSED]'
    const priority = task.priority !== 'MEDIUM' ? ` [${task.priority}]` : ''
    const column = task.column?.title || 'Unknown'
    const assignees =
      task.assignees.length > 0
        ? ` - ${task.assignees.map((a) => a.name).join(', ')}`
        : ''

    lines.push(`${task.reference}: ${task.title}${status}${priority}`)
    lines.push(`  ID: ${task.id} | Column: ${column}${assignees}`)

    if (task.tags.length > 0) {
      lines.push(`  Tags: ${task.tags.map((t) => t.name).join(', ')}`)
    }
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Global search across tasks, comments, and wiki
 */
export async function handleSearchGlobal(args: unknown) {
  const input = SearchGlobalSchema.parse(args)
  const config = requireAuth()

  const results = await client.call<GlobalSearchResult[]>(
    config.kanbuUrl,
    config.token,
    'search.global',
    {
      projectId: input.projectId,
      query: input.query,
      entityTypes: input.types ?? ['task', 'comment', 'wiki'],
      limit: input.limit ?? 20,
    }
  )

  if (results.length === 0) {
    return success(`No results found for "${input.query}"`)
  }

  const lines: string[] = [`Search results for "${input.query}" (${results.length}):`, '']

  // Group by type
  const byType = {
    task: results.filter((r) => r.type === 'task'),
    comment: results.filter((r) => r.type === 'comment'),
    wiki: results.filter((r) => r.type === 'wiki'),
  }

  if (byType.task.length > 0) {
    lines.push(`== Tasks (${byType.task.length}) ==`)
    byType.task.forEach((result) => {
      lines.push(`  ${result.title}`)
      lines.push(`    ${truncate(result.snippet, 100)}`)
    })
    lines.push('')
  }

  if (byType.comment.length > 0) {
    lines.push(`== Comments (${byType.comment.length}) ==`)
    byType.comment.forEach((result) => {
      lines.push(`  ${result.title}`)
      lines.push(`    ${truncate(result.snippet, 100)}`)
    })
    lines.push('')
  }

  if (byType.wiki.length > 0) {
    lines.push(`== Wiki Pages (${byType.wiki.length}) ==`)
    byType.wiki.forEach((result) => {
      lines.push(`  ${result.title}`)
      lines.push(`    ${truncate(result.snippet, 100)}`)
    })
    lines.push('')
  }

  return success(lines.join('\n'))
}
