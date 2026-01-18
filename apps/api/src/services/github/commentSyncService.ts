/*
 * Comment Sync Service
 * Version: 1.0.0
 *
 * Handles bidirectional synchronization between GitHub comments and Kanbu comments.
 * - GitHub → Kanbu: Handled in webhook handler (github.ts)
 * - Kanbu → GitHub: This service
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-11
 * Fase: GitHub Comment Bi-directional Sync
 * =============================================================================
 */

import { prisma } from '../../lib/prisma';
import { getInstallationOctokit } from './githubService';

// =============================================================================
// Types
// =============================================================================

interface SyncResult {
  commentId: number;
  githubCommentId: bigint | null;
  created: boolean;
  updated: boolean;
  deleted: boolean;
}

interface LexicalNode {
  type: string;
  text?: string;
  format?: number;
  children?: LexicalNode[];
  url?: string;
  listType?: string;
  tag?: string;
  value?: number;
}

interface LexicalRoot {
  root: {
    children: LexicalNode[];
  };
}

// =============================================================================
// Lexical JSON to Markdown Converter
// =============================================================================

/**
 * Convert Lexical JSON content to Markdown
 * Handles text formatting, paragraphs, headings, lists, links, and code blocks
 */
function lexicalToMarkdown(content: string): string {
  // If content is not JSON, return as-is (plain text)
  if (!content.startsWith('{')) {
    return content;
  }

  try {
    const parsed: LexicalRoot = JSON.parse(content);
    if (!parsed.root?.children) {
      return content;
    }

    return convertNodes(parsed.root.children).trim();
  } catch {
    // If JSON parsing fails, return as-is
    return content;
  }
}

/**
 * Convert an array of Lexical nodes to Markdown
 */
function convertNodes(nodes: LexicalNode[], listDepth = 0): string {
  return nodes.map((node) => convertNode(node, listDepth)).join('');
}

/**
 * Convert a single Lexical node to Markdown
 */
function convertNode(node: LexicalNode, listDepth = 0): string {
  switch (node.type) {
    case 'root':
      return convertNodes(node.children || [], listDepth);

    case 'paragraph': {
      const paragraphText = convertNodes(node.children || [], listDepth);
      return paragraphText + '\n\n';
    }

    case 'heading': {
      const level = parseInt(node.tag?.replace('h', '') || '1', 10);
      const headingText = convertNodes(node.children || [], listDepth);
      return '#'.repeat(level) + ' ' + headingText + '\n\n';
    }

    case 'text': {
      let text = node.text || '';
      const format = node.format || 0;

      // Apply formatting (Lexical format is a bitmask)
      // 1 = bold, 2 = italic, 4 = strikethrough, 8 = underline, 16 = code
      if (format & 16) {
        text = '`' + text + '`';
      }
      if (format & 4) {
        text = '~~' + text + '~~';
      }
      if (format & 2) {
        text = '_' + text + '_';
      }
      if (format & 1) {
        text = '**' + text + '**';
      }

      return text;
    }

    case 'link': {
      const linkText = convertNodes(node.children || [], listDepth);
      return `[${linkText}](${node.url || ''})`;
    }

    case 'list': {
      const items = (node.children || []).map((item) => convertNode(item, listDepth)).join('');
      return items + '\n';
    }

    case 'listitem': {
      const indent = '  '.repeat(listDepth);
      const bullet = node.value !== undefined ? `${node.value}. ` : '- ';
      const itemText = convertNodes(node.children || [], listDepth + 1).trim();
      return indent + bullet + itemText + '\n';
    }

    case 'quote': {
      const quoteText = convertNodes(node.children || [], listDepth);
      return (
        quoteText
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => '> ' + line)
          .join('\n') + '\n\n'
      );
    }

    case 'code': {
      const codeText = convertNodes(node.children || [], listDepth);
      return '```\n' + codeText.trim() + '\n```\n\n';
    }

    case 'linebreak':
      return '\n';

    default:
      // For unknown node types, try to extract text from children
      if (node.children) {
        return convertNodes(node.children, listDepth);
      }
      return node.text || '';
  }
}

// =============================================================================
// Kanbu → GitHub Sync
// =============================================================================

/**
 * Sync a Kanbu comment to GitHub
 * Creates a new GitHub comment if not linked, or updates existing one
 */
export async function syncCommentToGitHub(commentId: number): Promise<SyncResult | null> {
  // Get the comment with task and GitHub issue info
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        include: {
          githubIssue: true,
          project: {
            include: {
              githubRepositories: {
                include: {
                  installation: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error(`Comment ${commentId} not found`);
  }

  // Check if task is linked to a GitHub issue
  if (!comment.task.githubIssue) {
    // No GitHub issue linked - nothing to sync
    return null;
  }

  // Check if project has a GitHub repository linked
  const repository = comment.task.project.githubRepositories[0];
  if (!repository || !repository.installation) {
    return null;
  }

  // Get Octokit client
  const octokit = await getInstallationOctokit(repository.installation.installationId);

  // Format comment body with author attribution (since we're posting as the bot)
  // Convert Lexical JSON to Markdown for GitHub display
  const authorName = comment.user.name || comment.user.username;
  const markdownContent = lexicalToMarkdown(comment.content);
  const commentBody = `**${authorName}** commented in Kanbu:\n\n${markdownContent}`;

  // If already linked to a GitHub comment, update it
  if (comment.githubCommentId) {
    try {
      await octokit.rest.issues.updateComment({
        owner: repository.owner,
        repo: repository.name,
        comment_id: Number(comment.githubCommentId),
        body: commentBody,
      });

      console.log(
        `[CommentSyncService] Updated GitHub comment ${comment.githubCommentId} from Kanbu comment ${comment.id}`
      );

      // Log sync operation
      await prisma.gitHubSyncLog.create({
        data: {
          repositoryId: repository.id,
          action: 'comment_update',
          direction: 'kanbu_to_github',
          entityType: 'comment',
          entityId: String(comment.id),
          status: 'success',
          details: {
            commentId: comment.id,
            githubCommentId: Number(comment.githubCommentId),
            issueNumber: comment.task.githubIssue.issueNumber,
          },
        },
      });

      return {
        commentId: comment.id,
        githubCommentId: comment.githubCommentId,
        created: false,
        updated: true,
        deleted: false,
      };
    } catch (error) {
      console.error(`[CommentSyncService] Failed to update GitHub comment:`, error);
      throw error;
    }
  }

  // Not linked - create a new GitHub comment
  try {
    const { data: ghComment } = await octokit.rest.issues.createComment({
      owner: repository.owner,
      repo: repository.name,
      issue_number: comment.task.githubIssue.issueNumber,
      body: commentBody,
    });

    // Update the Kanbu comment with the GitHub comment ID
    await prisma.comment.update({
      where: { id: comment.id },
      data: {
        githubCommentId: BigInt(ghComment.id),
      },
    });

    console.log(
      `[CommentSyncService] Created GitHub comment ${ghComment.id} from Kanbu comment ${comment.id}`
    );

    // Log sync operation
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: repository.id,
        action: 'comment_create',
        direction: 'kanbu_to_github',
        entityType: 'comment',
        entityId: String(comment.id),
        status: 'success',
        details: {
          commentId: comment.id,
          githubCommentId: ghComment.id,
          issueNumber: comment.task.githubIssue.issueNumber,
        },
      },
    });

    return {
      commentId: comment.id,
      githubCommentId: BigInt(ghComment.id),
      created: true,
      updated: false,
      deleted: false,
    };
  } catch (error) {
    console.error(`[CommentSyncService] Failed to create GitHub comment:`, error);
    throw error;
  }
}

/**
 * Delete a GitHub comment when the linked Kanbu comment is deleted
 */
export async function deleteGitHubComment(
  commentId: number,
  githubCommentId: bigint,
  taskId: number
): Promise<boolean> {
  // Get the task with GitHub issue info
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      githubIssue: true,
      project: {
        include: {
          githubRepositories: {
            include: {
              installation: true,
            },
          },
        },
      },
    },
  });

  if (!task || !task.githubIssue) {
    return false;
  }

  const repository = task.project.githubRepositories[0];
  if (!repository || !repository.installation) {
    return false;
  }

  try {
    const octokit = await getInstallationOctokit(repository.installation.installationId);

    await octokit.rest.issues.deleteComment({
      owner: repository.owner,
      repo: repository.name,
      comment_id: Number(githubCommentId),
    });

    console.log(`[CommentSyncService] Deleted GitHub comment ${githubCommentId}`);

    // Log sync operation
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: repository.id,
        action: 'comment_delete',
        direction: 'kanbu_to_github',
        entityType: 'comment',
        entityId: String(commentId),
        status: 'success',
        details: {
          commentId,
          githubCommentId: Number(githubCommentId),
          issueNumber: task.githubIssue.issueNumber,
        },
      },
    });

    return true;
  } catch (error) {
    console.error(`[CommentSyncService] Failed to delete GitHub comment:`, error);
    return false;
  }
}

// =============================================================================
// Export namespace
// =============================================================================

export const commentSyncService = {
  syncCommentToGitHub,
  deleteGitHubComment,
};
