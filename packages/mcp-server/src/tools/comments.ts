/*
 * Comment Tools
 * Version: 1.0.0
 *
 * MCP tools for task comment management.
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
import { requireAuth, client, success, formatRelativeTime, truncate } from '../tools.js';

// =============================================================================
// Types
// =============================================================================

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    username: string;
    name: string;
  };
}

interface CommentListResponse {
  comments: Comment[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// Schemas
// =============================================================================

export const ListCommentsSchema = z.object({
  taskId: z.number().describe('Task ID to list comments for'),
  limit: z.number().optional().describe('Maximum number of comments (default: 20)'),
});

export const AddCommentSchema = z.object({
  taskId: z.number().describe('Task ID to add comment to'),
  content: z.string().describe('Comment text'),
});

export const UpdateCommentSchema = z.object({
  commentId: z.number().describe('Comment ID to update'),
  content: z.string().describe('New comment text'),
});

export const DeleteCommentSchema = z.object({
  commentId: z.number().describe('Comment ID to delete'),
});

// =============================================================================
// Tool Definitions
// =============================================================================

export const commentToolDefinitions = [
  {
    name: 'kanbu_list_comments',
    description: 'List comments on a task. Shows author, content, and timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID to list comments for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of comments (default: 20)',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_add_comment',
    description: 'Add a comment to a task. Requires Write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID to add comment to',
        },
        content: {
          type: 'string',
          description: 'Comment text',
        },
      },
      required: ['taskId', 'content'],
    },
  },
  {
    name: 'kanbu_update_comment',
    description: 'Update a comment. You can only edit your own comments.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'number',
          description: 'Comment ID to update',
        },
        content: {
          type: 'string',
          description: 'New comment text',
        },
      },
      required: ['commentId', 'content'],
    },
  },
  {
    name: 'kanbu_delete_comment',
    description:
      'Delete a comment. You can delete your own comments, or any comment if you are a project manager.',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'number',
          description: 'Comment ID to delete',
        },
      },
      required: ['commentId'],
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * List comments on a task
 */
export async function handleListComments(args: unknown) {
  const input = ListCommentsSchema.parse(args);
  const config = requireAuth();

  const result = await client.call<CommentListResponse>(
    config.kanbuUrl,
    config.token,
    'comment.list',
    {
      taskId: input.taskId,
      limit: input.limit || 20,
      offset: 0,
    }
  );

  if (result.comments.length === 0) {
    return success('No comments on this task.');
  }

  const lines: string[] = [`Comments (${result.total}):`, ''];

  result.comments.forEach((comment) => {
    const time = formatRelativeTime(comment.createdAt);
    const edited = comment.updatedAt !== comment.createdAt ? ' (edited)' : '';

    lines.push(`${comment.user.name} - ${time}${edited}`);
    lines.push(`  ${truncate(comment.content, 200)}`);
    lines.push(`  ID: ${comment.id}`);
    lines.push('');
  });

  if (result.hasMore) {
    lines.push(`... and ${result.total - result.comments.length} more comments`);
  }

  return success(lines.join('\n'));
}

/**
 * Add a comment to a task
 */
export async function handleAddComment(args: unknown) {
  const input = AddCommentSchema.parse(args);
  const config = requireAuth();

  const comment = await client.call<Comment>(
    config.kanbuUrl,
    config.token,
    'comment.create',
    input,
    'POST'
  );

  return success(
    `Comment added:

${comment.user.name}:
${truncate(comment.content, 200)}

ID: ${comment.id}`
  );
}

/**
 * Update a comment
 */
export async function handleUpdateComment(args: unknown) {
  const input = UpdateCommentSchema.parse(args);
  const config = requireAuth();

  const comment = await client.call<Comment>(
    config.kanbuUrl,
    config.token,
    'comment.update',
    input,
    'POST'
  );

  return success(
    `Comment updated:

${truncate(comment.content, 200)}

ID: ${comment.id}`
  );
}

/**
 * Delete a comment
 */
export async function handleDeleteComment(args: unknown) {
  const { commentId } = DeleteCommentSchema.parse(args);
  const config = requireAuth();

  // Get comment info before deleting
  const comment = await client.call<Comment>(config.kanbuUrl, config.token, 'comment.get', {
    commentId,
  });

  await client.call<{ success: boolean }>(
    config.kanbuUrl,
    config.token,
    'comment.delete',
    { commentId },
    'POST'
  );

  return success(
    `Comment deleted:

"${truncate(comment.content, 100)}"
by ${comment.user.name}`
  );
}
