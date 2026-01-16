/*
 * Task Tools
 * Version: 1.1.0
 *
 * MCP tools for task management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 2 - Core Kanbu Tools
 *
 * Modified: 2026-01-11
 * Change: Added column IDs to task output (get, move) for easier
 *         task manipulation without needing to look up IDs separately
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, formatDate, truncate, Task } from '../tools.js'

// =============================================================================
// Priority Mapping (MCP uses strings, API uses numbers)
// =============================================================================

const PRIORITY_MAP: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
}

const PRIORITY_NAMES: Record<number, string> = {
  0: 'LOW',
  1: 'MEDIUM',
  2: 'HIGH',
  3: 'URGENT',
}

function mapPriorityToNumber(priority: string | undefined): number | undefined {
  if (!priority) return undefined
  return PRIORITY_MAP[priority]
}

function mapPriorityToString(priority: number | undefined): string {
  if (priority === undefined) return 'MEDIUM'
  return PRIORITY_NAMES[priority] || 'MEDIUM'
}

// =============================================================================
// Schemas
// =============================================================================

export const ListTasksSchema = z.object({
  projectId: z.number().describe('Project ID'),
  status: z.enum(['open', 'closed', 'all']).optional().describe('Filter by status'),
  columnId: z.number().optional().describe('Filter by column ID'),
  limit: z.number().optional().describe('Maximum number of tasks to return'),
})

export const GetTaskSchema = z.object({
  id: z.number().describe('Task ID'),
})

export const CreateTaskSchema = z.object({
  projectId: z.number().describe('Project ID'),
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  columnId: z.number().optional().describe('Column ID (defaults to first column)'),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .optional()
    .describe('Task priority'),
  dueDate: z.string().optional().describe('Due date (ISO format: YYYY-MM-DD)'),
  assigneeIds: z
    .array(z.number())
    .optional()
    .describe('Array of user IDs to assign'),
})

export const UpdateTaskSchema = z.object({
  id: z.number().describe('Task ID'),
  title: z.string().optional().describe('New title'),
  description: z.string().optional().describe('New description'),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .optional()
    .describe('New priority'),
  dueDate: z.string().nullable().optional().describe('New due date (null to clear)'),
})

export const MoveTaskSchema = z.object({
  id: z.number().describe('Task ID'),
  columnId: z.number().describe('Target column ID'),
  position: z.number().optional().describe('Position in column (0-indexed)'),
})

export const MyTasksSchema = z.object({
  status: z.enum(['open', 'closed', 'all']).optional().describe('Filter by status'),
  limit: z.number().optional().describe('Maximum number of tasks'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const taskToolDefinitions = [
  {
    name: 'kanbu_list_tasks',
    description:
      'List tasks in a project. Best for exploring the current state of a project, finding tasks in a specific column (e.g., "To Do"), or filtering by status. Use this to get an overview before acting.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        status: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by status (default: open)',
        },
        columnId: {
          type: 'number',
          description: 'Filter by column ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default: 50)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_get_task',
    description:
      'Get detailed information about a specific task including subtasks and comments.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Task ID',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_create_task',
    description:
      'Create a new task in a project. You need Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        columnId: {
          type: 'number',
          description: 'Column ID (defaults to first column)',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'Task priority (default: MEDIUM)',
        },
        dueDate: {
          type: 'string',
          description: 'Due date in ISO format (YYYY-MM-DD)',
        },
        assigneeIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of user IDs to assign',
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'kanbu_update_task',
    description: 'Update task properties like title, description, priority, or due date.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Task ID',
        },
        title: {
          type: 'string',
          description: 'New title',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          description: 'New priority',
        },
        dueDate: {
          type: ['string', 'null'],
          description: 'New due date (null to clear)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'kanbu_move_task',
    description:
      'Move a task to a different column (e.g., from "To Do" to "Done").',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'Task ID',
        },
        columnId: {
          type: 'number',
          description: 'Target column ID',
        },
        position: {
          type: 'number',
          description: 'Position in column (0 = top)',
        },
      },
      required: ['id', 'columnId'],
    },
  },
  {
    name: 'kanbu_my_tasks',
    description:
      'List tasks assigned to you across all projects. Useful for seeing your workload.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by status (default: open)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks (default: 20)',
        },
      },
    },
  },
]

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List tasks in a project
 */
export async function handleListTasks(args: unknown) {
  const input = ListTasksSchema.parse(args)
  const config = requireAuth()

  // Map MCP status to API isActive filter
  // API uses: isActive=true (open), isActive=false (closed), undefined (all)
  const status = input.status || 'open'
  const isActive = status === 'open' ? true : status === 'closed' ? false : undefined

  const tasks = await client.call<Task[]>(
    config.kanbuUrl,
    config.token,
    'task.list',
    {
      projectId: input.projectId,
      isActive,
      columnId: input.columnId,
      limit: input.limit || 50,
    }
  )

  if (tasks.length === 0) {
    return success('No tasks found matching the criteria.')
  }

  const lines: string[] = [`Tasks (${tasks.length}):`, '']

  // Group by column for better readability
  const byColumn = new Map<string, Task[]>()
  tasks.forEach((task) => {
    const columnName = task.column?.title || 'Unknown'
    if (!byColumn.has(columnName)) {
      byColumn.set(columnName, [])
    }
    byColumn.get(columnName)!.push(task)
  })

  byColumn.forEach((columnTasks, columnName) => {
    lines.push(`== ${columnName} (${columnTasks.length}) ==`)
    columnTasks.forEach((task) => {
      const priority = task.priority !== 'MEDIUM' ? ` [${task.priority}]` : ''
      const due = task.dueDate ? ` | Due: ${formatDate(task.dueDate)}` : ''
      const assignees =
        task.assignees && task.assignees.length > 0
          ? ` | ${task.assignees.map((a) => a.name).join(', ')}`
          : ''

      lines.push(`  ${task.ref}: ${truncate(task.title, 50)}${priority}`)
      lines.push(`    ID: ${task.id}${due}${assignees}`)
    })
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get task details
 */
export async function handleGetTask(args: unknown) {
  const { id } = GetTaskSchema.parse(args)
  const config = requireAuth()

  interface TaskWithDetails extends Task {
    subtasks: Array<{
      id: number
      title: string
      completed: boolean
    }>
    comments: Array<{
      id: number
      content: string
      createdAt: string
      author: { id: number; name: string }
    }>
    creator: { id: number; name: string; email: string }
  }

  const task = await client.call<TaskWithDetails>(
    config.kanbuUrl,
    config.token,
    'task.get',
    { taskId: id }
  )

  const columnInfo = task.column
    ? `${task.column.title} (ID: ${task.column.id})`
    : 'Unknown'

  const lines: string[] = [
    `${task.ref}: ${task.title}`,
    `ID: ${task.id}`,
    '',
    `Project: ${task.project?.name || 'Unknown'} (ID: ${task.project?.id || 'Unknown'})`,
    `Column: ${columnInfo}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    '',
  ]

  if (task.description) {
    lines.push('Description:')
    lines.push(task.description)
    lines.push('')
  }

  if (task.assignees && task.assignees.length > 0) {
    lines.push(`Assignees: ${task.assignees.map((a) => a.name || 'Unknown').join(', ')}`)
  } else {
    lines.push('Assignees: (none)')
  }

  if (task.dueDate) {
    lines.push(`Due: ${formatDate(task.dueDate)}`)
  }

  if (task.tags && task.tags.length > 0) {
    lines.push(`Tags: ${task.tags.map((t) => t.name || 'Unnamed').join(', ')}`)
  }

  lines.push(`Created: ${formatDate(task.createdAt)} by ${task.creator?.name || 'Unknown'}`)
  lines.push(`Updated: ${formatDate(task.updatedAt)}`)

  if (task.closedAt) {
    lines.push(`Closed: ${formatDate(task.closedAt)}`)
  }

  lines.push('')

  // Subtasks
  if (task.subtasks && task.subtasks.length > 0) {
    const completed = task.subtasks.filter((s) => s.completed).length
    lines.push(`Subtasks (${completed}/${task.subtasks.length}):`)
    task.subtasks.forEach((subtask) => {
      const check = subtask.completed ? '[x]' : '[ ]'
      lines.push(`  ${check} ${subtask.title || 'Untitled'}`)
    })
    lines.push('')
  }

  // Recent comments
  if (task.comments && task.comments.length > 0) {
    lines.push(`Comments (${task.comments.length}):`)
    task.comments.slice(0, 3).forEach((comment) => {
      const authorName = comment.author?.name || 'Unknown'
      lines.push(`  ${authorName} (${formatDate(comment.createdAt)}):`)
      lines.push(`    ${truncate(comment.content || '', 100)}`)
    })
    if (task.comments.length > 3) {
      lines.push(`  ... and ${task.comments.length - 3} more`)
    }
  }

  return success(lines.join('\n'))
}

/**
 * Create a new task
 */
export async function handleCreateTask(args: unknown) {
  const input = CreateTaskSchema.parse(args)
  const config = requireAuth()

  // Convert priority string to number for API
  const { priority, ...rest } = input
  const apiInput: Record<string, unknown> = { ...rest }
  if (priority !== undefined) {
    apiInput.priority = mapPriorityToNumber(priority)
  }

  const task = await client.call<Task>(
    config.kanbuUrl,
    config.token,
    'task.create',
    apiInput,
    'POST'
  )

  const lines: string[] = [
    'Task created:',
    '',
    `${task.ref}: ${task.title}`,
    `ID: ${task.id}`,
    `Column: ${task.column?.title || 'Unknown'}`,
    `Priority: ${mapPriorityToString(task.priority as unknown as number)}`,
  ]

  if (task.dueDate) {
    lines.push(`Due: ${formatDate(task.dueDate)}`)
  }

  if (task.assignees && task.assignees.length > 0) {
    lines.push(`Assigned to: ${task.assignees.map((a) => a.name).join(', ')}`)
  }

  return success(lines.join('\n'))
}

/**
 * Update task properties
 */
export async function handleUpdateTask(args: unknown) {
  const input = UpdateTaskSchema.parse(args)
  const config = requireAuth()

  // Map 'id' to 'taskId' and convert priority string to number for API
  const { id, priority, ...rest } = input
  const apiInput: Record<string, unknown> = { taskId: id, ...rest }
  if (priority !== undefined) {
    apiInput.priority = mapPriorityToNumber(priority)
  }

  const task = await client.call<Task>(
    config.kanbuUrl,
    config.token,
    'task.update',
    apiInput,
    'POST'
  )

  const lines: string[] = [
    'Task updated:',
    '',
    `${task.ref}: ${task.title}`,
    `ID: ${task.id}`,
    `Priority: ${mapPriorityToString(task.priority as unknown as number)}`,
  ]

  if (task.dueDate) {
    lines.push(`Due: ${formatDate(task.dueDate)}`)
  }

  return success(lines.join('\n'))
}

/**
 * Move task to different column
 */
export async function handleMoveTask(args: unknown) {
  const input = MoveTaskSchema.parse(args)
  const config = requireAuth()

  // Get current task to show "from" column
  const beforeTask = await client.call<Task>(
    config.kanbuUrl,
    config.token,
    'task.get',
    { taskId: input.id }
  )

  const fromColumn = beforeTask.column
    ? `${beforeTask.column.title} (ID: ${beforeTask.column.id})`
    : 'Unknown'

  // Map 'id' to 'taskId' for API
  const { id, ...moveParams } = input
  await client.call<Task>(
    config.kanbuUrl,
    config.token,
    'task.move',
    { taskId: id, ...moveParams },
    'POST'
  )

  // Fetch task again to get complete column info
  const afterTask = await client.call<Task>(
    config.kanbuUrl,
    config.token,
    'task.get',
    { taskId: id }
  )

  const toColumn = afterTask.column
    ? `${afterTask.column.title} (ID: ${afterTask.column.id})`
    : 'Unknown'

  return success(
    `Task moved:

${afterTask.ref}: ${afterTask.title}
From: ${fromColumn} → ${toColumn}`
  )
}

/**
 * List tasks assigned to current user
 */
export async function handleMyTasks(args: unknown) {
  const input = MyTasksSchema.parse(args)
  const config = requireAuth()

  const tasks = await client.call<Task[]>(
    config.kanbuUrl,
    config.token,
    'task.getAssignedToMe',
    {
      status: input.status || 'open',
      limit: input.limit || 20,
    }
  )

  if (tasks.length === 0) {
    return success('No tasks assigned to you.')
  }

  const lines: string[] = [`Your tasks (${tasks.length}):`, '']

  // Group by project
  const byProject = new Map<string, Task[]>()
  tasks.forEach((task) => {
    const projectName = task.project?.name || 'Unknown'
    if (!byProject.has(projectName)) {
      byProject.set(projectName, [])
    }
    byProject.get(projectName)!.push(task)
  })

  byProject.forEach((projectTasks, projectName) => {
    lines.push(`== ${projectName} ==`)
    projectTasks.forEach((task) => {
      const column = task.column?.title || 'Unknown'
      const priority = task.priority !== 'MEDIUM' ? ` [${task.priority}]` : ''
      const due = task.dueDate ? ` | Due: ${formatDate(task.dueDate)}` : ''

      lines.push(`  ${task.ref}: ${truncate(task.title, 45)}${priority}`)
      lines.push(`    Column: ${column}${due}`)
    })
    lines.push('')
  })

  return success(lines.join('\n'))
}
