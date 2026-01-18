/*
 * Subtask Tools
 * Version: 1.0.0
 *
 * MCP tools for subtask management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 3 - Subtasks & Comments
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';
import { requireAuth, client, success } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface Subtask {
  id: number;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  position: number;
  timeEstimated: number;
  timeSpent: number;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: number;
    username: string;
    name: string;
  } | null;
}

// =============================================================================
// Schemas
// =============================================================================

export const ListSubtasksSchema = z.object({
  taskId: z.number().describe('Task ID to list subtasks for'),
});

export const CreateSubtaskSchema = z.object({
  taskId: z.number().describe('Parent task ID'),
  title: z.string().describe('Subtask title'),
  description: z.string().optional().describe('Subtask description'),
  assigneeId: z.number().optional().describe('User ID to assign'),
  timeEstimated: z.number().optional().describe('Estimated time in hours'),
});

export const UpdateSubtaskSchema = z.object({
  subtaskId: z.number().describe('Subtask ID'),
  title: z.string().optional().describe('New title'),
  description: z.string().nullable().optional().describe('New description'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().describe('New status'),
  assigneeId: z.number().nullable().optional().describe('New assignee ID'),
  timeEstimated: z.number().optional().describe('Estimated time in hours'),
});

export const ToggleSubtaskSchema = z.object({
  subtaskId: z.number().describe('Subtask ID to toggle'),
});

export const DeleteSubtaskSchema = z.object({
  subtaskId: z.number().describe('Subtask ID to delete'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const subtaskToolDefinitions = [
  {
    name: 'kanbu_list_subtasks',
    description: 'List all subtasks for a task. Shows title, status, assignee, and time tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID to list subtasks for',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_create_subtask',
    description: 'Create a new subtask for a task. Requires Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Parent task ID',
        },
        title: {
          type: 'string',
          description: 'Subtask title',
        },
        description: {
          type: 'string',
          description: 'Subtask description',
        },
        assigneeId: {
          type: 'number',
          description: 'User ID to assign',
        },
        timeEstimated: {
          type: 'number',
          description: 'Estimated time in hours',
        },
      },
      required: ['taskId', 'title'],
    },
  },
  {
    name: 'kanbu_update_subtask',
    description: 'Update a subtask (title, description, status, assignee, time).',
    inputSchema: {
      type: 'object',
      properties: {
        subtaskId: {
          type: 'number',
          description: 'Subtask ID',
        },
        title: {
          type: 'string',
          description: 'New title',
        },
        description: {
          type: ['string', 'null'],
          description: 'New description (null to clear)',
        },
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'DONE'],
          description: 'New status',
        },
        assigneeId: {
          type: ['number', 'null'],
          description: 'New assignee ID (null to unassign)',
        },
        timeEstimated: {
          type: 'number',
          description: 'Estimated time in hours',
        },
      },
      required: ['subtaskId'],
    },
  },
  {
    name: 'kanbu_toggle_subtask',
    description: 'Toggle a subtask between TODO and DONE status.',
    inputSchema: {
      type: 'object',
      properties: {
        subtaskId: {
          type: 'number',
          description: 'Subtask ID to toggle',
        },
      },
      required: ['subtaskId'],
    },
  },
  {
    name: 'kanbu_delete_subtask',
    description: 'Delete a subtask. Requires Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        subtaskId: {
          type: 'number',
          description: 'Subtask ID to delete',
        },
      },
      required: ['subtaskId'],
    },
  },
];

// =============================================================================
// Helpers
// =============================================================================

function formatStatus(status: string): string {
  switch (status) {
    case 'TODO':
      return '[ ]';
    case 'IN_PROGRESS':
      return '[~]';
    case 'DONE':
      return '[x]';
    default:
      return '[ ]';
  }
}

function formatTime(hours: number): string {
  if (hours === 0) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours}h`;
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List subtasks for a task
 */
export async function handleListSubtasks(args: unknown) {
  const { taskId } = ListSubtasksSchema.parse(args);
  const config = requireAuth();

  const subtasks = await client.call<Subtask[]>(config.kanbuUrl, config.token, 'subtask.list', {
    taskId,
  });

  if (subtasks.length === 0) {
    return success('No subtasks found for this task.');
  }

  const done = subtasks.filter((s) => s.status === 'DONE').length;
  const lines: string[] = [`Subtasks (${done}/${subtasks.length} done):`, ''];

  subtasks.forEach((subtask) => {
    const check = formatStatus(subtask.status);
    const assignee = subtask.assignee ? ` @${subtask.assignee.name}` : '';
    const time =
      subtask.timeEstimated > 0 || subtask.timeSpent > 0
        ? ` [${formatTime(subtask.timeSpent)}/${formatTime(subtask.timeEstimated)}]`
        : '';

    lines.push(`${check} ${subtask.title}${assignee}${time}`);
    lines.push(`    ID: ${subtask.id}`);
  });

  return success(lines.join('\n'));
}

/**
 * Create a new subtask
 */
export async function handleCreateSubtask(args: unknown) {
  const input = CreateSubtaskSchema.parse(args);
  const config = requireAuth();

  const subtask = await client.call<Subtask>(
    config.kanbuUrl,
    config.token,
    'subtask.create',
    input,
    'POST'
  );

  const lines: string[] = [
    'Subtask created:',
    '',
    `${formatStatus(subtask.status)} ${subtask.title}`,
    `ID: ${subtask.id}`,
  ];

  if (subtask.timeEstimated > 0) {
    lines.push(`Estimated: ${formatTime(subtask.timeEstimated)}`);
  }

  return success(lines.join('\n'));
}

/**
 * Update a subtask
 */
export async function handleUpdateSubtask(args: unknown) {
  const input = UpdateSubtaskSchema.parse(args);
  const config = requireAuth();

  const subtask = await client.call<Subtask>(
    config.kanbuUrl,
    config.token,
    'subtask.update',
    input,
    'POST'
  );

  const lines: string[] = [
    'Subtask updated:',
    '',
    `${formatStatus(subtask.status)} ${subtask.title}`,
    `ID: ${subtask.id}`,
    `Status: ${subtask.status}`,
  ];

  return success(lines.join('\n'));
}

/**
 * Toggle subtask between TODO and DONE
 */
export async function handleToggleSubtask(args: unknown) {
  const { subtaskId } = ToggleSubtaskSchema.parse(args);
  const config = requireAuth();

  // First get current status
  const current = await client.call<Subtask>(config.kanbuUrl, config.token, 'subtask.get', {
    subtaskId,
  });

  // Toggle status
  const newStatus = current.status === 'DONE' ? 'TODO' : 'DONE';

  const subtask = await client.call<Subtask>(
    config.kanbuUrl,
    config.token,
    'subtask.update',
    { subtaskId, status: newStatus },
    'POST'
  );

  const action = newStatus === 'DONE' ? 'completed' : 'reopened';

  return success(
    `Subtask ${action}:

${formatStatus(subtask.status)} ${subtask.title}
ID: ${subtask.id}`
  );
}

/**
 * Delete a subtask
 */
export async function handleDeleteSubtask(args: unknown) {
  const { subtaskId } = DeleteSubtaskSchema.parse(args);
  const config = requireAuth();

  // Get subtask info before deleting
  const subtask = await client.call<Subtask>(config.kanbuUrl, config.token, 'subtask.get', {
    subtaskId,
  });

  await client.call<{ success: boolean }>(
    config.kanbuUrl,
    config.token,
    'subtask.delete',
    { subtaskId },
    'POST'
  );

  return success(`Subtask deleted: "${subtask.title}" (ID: ${subtaskId})`);
}
