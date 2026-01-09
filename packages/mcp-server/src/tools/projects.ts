/*
 * Project Tools
 * Version: 1.0.0
 *
 * MCP tools for project management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 2 - Core Kanbu Tools
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, Project, Column } from '../tools.js'

// =============================================================================
// Schemas
// =============================================================================

export const ListProjectsSchema = z.object({
  workspaceId: z.number().describe('Workspace ID to list projects from'),
})

export const GetProjectSchema = z.object({
  id: z.number().describe('Project ID'),
})

export const CreateProjectSchema = z.object({
  workspaceId: z.number().describe('Workspace ID to create project in'),
  name: z.string().describe('Project name'),
  prefix: z.string().optional().describe('Task prefix (e.g., KANBU). Auto-generated if not provided.'),
  description: z.string().optional().describe('Project description'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const projectToolDefinitions = [
  {
    name: 'kanbu_list_projects',
    description:
      'List all projects in a workspace. Shows project name, prefix, task count, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'number',
          description: 'Workspace ID to list projects from',
        },
      },
      required: ['workspaceId'],
    },
  },
  {
    name: 'kanbu_get_project',
    description:
      'Get details of a specific project including columns and task counts per column.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_create_project',
    description:
      'Create a new project in a workspace. You need Write permission on the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        workspaceId: {
          type: 'number',
          description: 'Workspace ID to create project in',
        },
        name: {
          type: 'string',
          description: 'Project name',
        },
        prefix: {
          type: 'string',
          description: 'Task prefix (e.g., KANBU). Auto-generated if not provided.',
        },
        description: {
          type: 'string',
          description: 'Project description',
        },
      },
      required: ['workspaceId', 'name'],
    },
  },
]

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List all projects in a workspace
 */
export async function handleListProjects(args: unknown) {
  const { workspaceId } = ListProjectsSchema.parse(args)
  const config = requireAuth()

  const projects = await client.call<Project[]>(
    config.kanbuUrl,
    config.token,
    'project.list',
    { workspaceId }
  )

  if (projects.length === 0) {
    return success(`No projects found in workspace ${workspaceId}.`)
  }

  const lines: string[] = [`Projects (${projects.length}):`, '']

  projects.forEach((project, index) => {
    const archived = project.archivedAt ? ' [ARCHIVED]' : ''
    lines.push(`${index + 1}. ${project.name} (${project.prefix})${archived}`)
    lines.push(`   ID: ${project.id} | Slug: ${project.slug}`)
    if (project._count) {
      lines.push(`   Tasks: ${project._count.tasks}`)
    }
    if (project.description) {
      lines.push(`   ${project.description}`)
    }
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get project details with columns
 */
export async function handleGetProject(args: unknown) {
  const { id } = GetProjectSchema.parse(args)
  const config = requireAuth()

  interface ProjectWithDetails extends Project {
    columns: Array<Column & { _count?: { tasks: number } }>
    workspace: { id: number; name: string; slug: string }
  }

  const project = await client.call<ProjectWithDetails>(
    config.kanbuUrl,
    config.token,
    'project.get',
    { id }
  )

  const lines: string[] = [
    `Project: ${project.name}`,
    `ID: ${project.id} | Prefix: ${project.prefix}`,
    `Workspace: ${project.workspace.name}`,
    '',
  ]

  if (project.description) {
    lines.push(`Description: ${project.description}`)
    lines.push('')
  }

  if (project.archivedAt) {
    lines.push(`Status: ARCHIVED`)
    lines.push('')
  }

  if (project.columns && project.columns.length > 0) {
    lines.push('Columns:')
    project.columns
      .sort((a, b) => a.position - b.position)
      .forEach((column) => {
        const taskCount = column._count?.tasks ?? 0
        lines.push(`  ${column.position + 1}. ${column.name} - ${taskCount} tasks`)
      })
    lines.push('')
  }

  const totalTasks = project._count?.tasks ?? 0
  lines.push(`Total tasks: ${totalTasks}`)

  return success(lines.join('\n'))
}

/**
 * Create a new project
 */
export async function handleCreateProject(args: unknown) {
  const input = CreateProjectSchema.parse(args)
  const config = requireAuth()

  const project = await client.call<Project>(
    config.kanbuUrl,
    config.token,
    'project.create',
    input,
    'POST'
  )

  const lines: string[] = [
    'Project created:',
    '',
    `Name: ${project.name}`,
    `ID: ${project.id}`,
    `Prefix: ${project.prefix}`,
    `Slug: ${project.slug}`,
  ]

  if (project.description) {
    lines.push(`Description: ${project.description}`)
  }

  lines.push('')
  lines.push(`Use kanbu_list_tasks with projectId: ${project.id} to see tasks.`)

  return success(lines.join('\n'))
}
