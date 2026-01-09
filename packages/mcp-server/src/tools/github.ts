/*
 * GitHub Tools
 * Version: 1.0.0
 *
 * MCP tools for GitHub integration with Kanbu.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: GitHub Connector Fase 9 - MCP Tools
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success, formatDate, truncate } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface GitHubRepository {
  id: number
  projectId: number
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  isPrivate: boolean
  syncEnabled: boolean
  lastSyncAt: string | null
  syncSettings: Record<string, unknown> | null
}

interface GitHubPR {
  id: number
  prNumber: number
  title: string
  state: string
  headBranch: string
  baseBranch: string
  authorLogin: string
  mergedAt: string | null
  closedAt: string | null
  createdAt: string
  task?: {
    id: number
    reference: string
    title: string
  } | null
  url: string
}

interface GitHubCommit {
  id: number
  sha: string
  message: string
  authorName: string
  authorEmail: string
  authorLogin: string | null
  committedAt: string
  createdAt: string
  task?: {
    id: number
    reference: string
    title: string
  } | null
  url: string
}

// =============================================================================
// Schemas
// =============================================================================

export const GetGitHubRepoSchema = z.object({
  projectId: z.number().describe('Project ID to get linked repository for'),
})

export const ListGitHubPRsSchema = z.object({
  projectId: z.number().describe('Project ID'),
  state: z
    .enum(['open', 'closed', 'merged', 'all'])
    .optional()
    .default('all')
    .describe('Filter by PR state'),
  limit: z.number().min(1).max(100).optional().default(20).describe('Maximum results'),
})

export const ListGitHubCommitsSchema = z.object({
  projectId: z.number().describe('Project ID'),
  limit: z.number().min(1).max(100).optional().default(20).describe('Maximum results'),
})

export const GetTaskPRsSchema = z.object({
  taskId: z.number().describe('Task ID to get linked PRs for'),
})

export const GetTaskCommitsSchema = z.object({
  taskId: z.number().describe('Task ID to get linked commits for'),
})

export const LinkGitHubRepoSchema = z.object({
  projectId: z.number().describe('Project ID to link repository to'),
  installationId: z.number().describe('GitHub App installation ID'),
  repoId: z.number().describe('GitHub repository ID'),
  owner: z.string().describe('Repository owner (username or org)'),
  name: z.string().describe('Repository name'),
  fullName: z.string().describe('Full repository name (owner/name)'),
  defaultBranch: z.string().optional().default('main').describe('Default branch name'),
  isPrivate: z.boolean().optional().default(false).describe('Whether the repo is private'),
})

export const UnlinkGitHubRepoSchema = z.object({
  projectId: z.number().describe('Project ID to unlink repository from'),
})

export const SyncGitHubIssuesSchema = z.object({
  projectId: z.number().describe('Project ID to sync issues for'),
  state: z
    .enum(['open', 'closed', 'all'])
    .optional()
    .default('open')
    .describe('Filter by issue state'),
  skipExisting: z.boolean().optional().default(true).describe('Skip already synced issues'),
})

export const CreateGitHubBranchSchema = z.object({
  taskId: z.number().describe('Task ID to create branch for'),
  customBranchName: z.string().optional().describe('Custom branch name (optional)'),
})

export const LinkPRToTaskSchema = z.object({
  prId: z.number().describe('Pull Request ID (Kanbu internal ID)'),
  taskId: z.number().describe('Task ID to link to'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const githubToolDefinitions = [
  // Query Tools
  {
    name: 'kanbu_get_github_repo',
    description:
      'Get the linked GitHub repository for a project. Shows repository details, sync status, and settings.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to get linked repository for',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_list_github_prs',
    description:
      'List pull requests for a project. Shows PR number, title, state, author, and linked task if any.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'merged', 'all'],
          description: 'Filter by PR state (default: all)',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 20, max: 100)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_list_github_commits',
    description:
      'List commits for a project. Shows SHA, message, author, and linked task if any.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 20, max: 100)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_get_task_prs',
    description: 'Get pull requests linked to a specific task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID to get linked PRs for',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_get_task_commits',
    description: 'Get commits linked to a specific task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID to get linked commits for',
        },
      },
      required: ['taskId'],
    },
  },
  // Management Tools
  {
    name: 'kanbu_link_github_repo',
    description:
      'Link a GitHub repository to a Kanbu project. Requires project Write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to link repository to',
        },
        installationId: {
          type: 'number',
          description: 'GitHub App installation ID',
        },
        repoId: {
          type: 'number',
          description: 'GitHub repository ID',
        },
        owner: {
          type: 'string',
          description: 'Repository owner (username or org)',
        },
        name: {
          type: 'string',
          description: 'Repository name',
        },
        fullName: {
          type: 'string',
          description: 'Full repository name (owner/name)',
        },
        defaultBranch: {
          type: 'string',
          description: 'Default branch name (default: main)',
        },
        isPrivate: {
          type: 'boolean',
          description: 'Whether the repo is private',
        },
      },
      required: ['projectId', 'installationId', 'repoId', 'owner', 'name', 'fullName'],
    },
  },
  {
    name: 'kanbu_unlink_github_repo',
    description:
      'Unlink a GitHub repository from a Kanbu project. Requires project Write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to unlink repository from',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_sync_github_issues',
    description:
      'Import/sync issues from GitHub to Kanbu. Creates tasks for GitHub issues.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID to sync issues for',
        },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Filter by issue state (default: open)',
        },
        skipExisting: {
          type: 'boolean',
          description: 'Skip already synced issues (default: true)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_create_github_branch',
    description:
      'Create a feature branch on GitHub for a task. Branch name is generated from task reference and title.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'number',
          description: 'Task ID to create branch for',
        },
        customBranchName: {
          type: 'string',
          description: 'Custom branch name (optional, otherwise auto-generated)',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'kanbu_link_pr_to_task',
    description: 'Manually link a pull request to a task. Requires project Write permission.',
    inputSchema: {
      type: 'object',
      properties: {
        prId: {
          type: 'number',
          description: 'Pull Request ID (Kanbu internal ID from kanbu_list_github_prs)',
        },
        taskId: {
          type: 'number',
          description: 'Task ID to link to',
        },
      },
      required: ['prId', 'taskId'],
    },
  },
]

// =============================================================================
// Tool Handlers - Query Tools
// =============================================================================

/**
 * Get linked GitHub repository for a project
 */
export async function handleGetGitHubRepo(args: unknown) {
  const { projectId } = GetGitHubRepoSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{ repository: GitHubRepository | null }>(
    config.kanbuUrl,
    config.token,
    'github.getLinkedRepository',
    { projectId }
  )

  if (!result.repository) {
    return success(`No GitHub repository linked to project ${projectId}.`)
  }

  const repo = result.repository
  const lines: string[] = [
    `GitHub Repository: ${repo.fullName}`,
    '',
    `ID: ${repo.id}`,
    `Owner: ${repo.owner}`,
    `Name: ${repo.name}`,
    `Default Branch: ${repo.defaultBranch}`,
    `Private: ${repo.isPrivate ? 'Yes' : 'No'}`,
    `Sync Enabled: ${repo.syncEnabled ? 'Yes' : 'No'}`,
    `Last Sync: ${repo.lastSyncAt ? formatDate(repo.lastSyncAt) : 'Never'}`,
    '',
    `URL: https://github.com/${repo.fullName}`,
  ]

  if (repo.syncSettings) {
    lines.push('')
    lines.push('Sync Settings:')
    if ((repo.syncSettings as Record<string, unknown>).issues) {
      lines.push('  Issues: Enabled')
    }
    if ((repo.syncSettings as Record<string, unknown>).pullRequests) {
      lines.push('  Pull Requests: Enabled')
    }
    if ((repo.syncSettings as Record<string, unknown>).commits) {
      lines.push('  Commits: Enabled')
    }
  }

  return success(lines.join('\n'))
}

/**
 * List pull requests for a project
 */
export async function handleListGitHubPRs(args: unknown) {
  const { projectId, state, limit } = ListGitHubPRsSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{ prs: GitHubPR[]; total: number; hasMore: boolean }>(
    config.kanbuUrl,
    config.token,
    'github.listProjectPRs',
    { projectId, state, limit, offset: 0 }
  )

  if (result.prs.length === 0) {
    return success(`No pull requests found for project ${projectId}.`)
  }

  const lines: string[] = [`Pull Requests (${result.prs.length}/${result.total}):`, '']

  result.prs.forEach((pr, index) => {
    const stateIcon = pr.state === 'merged' ? '🟣' : pr.state === 'closed' ? '🔴' : '🟢'
    const linkedTask = pr.task ? ` → ${pr.task.reference}` : ''
    lines.push(`${index + 1}. ${stateIcon} #${pr.prNumber}: ${truncate(pr.title, 60)}${linkedTask}`)
    lines.push(`   Branch: ${pr.headBranch} → ${pr.baseBranch}`)
    lines.push(`   Author: ${pr.authorLogin} | Created: ${formatDate(pr.createdAt)}`)
    if (pr.mergedAt) {
      lines.push(`   Merged: ${formatDate(pr.mergedAt)}`)
    }
    lines.push(`   ID: ${pr.id} | ${pr.url}`)
    lines.push('')
  })

  if (result.hasMore) {
    lines.push(`(${result.total - result.prs.length} more PRs available)`)
  }

  return success(lines.join('\n'))
}

/**
 * List commits for a project
 */
export async function handleListGitHubCommits(args: unknown) {
  const { projectId, limit } = ListGitHubCommitsSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{
    commits: GitHubCommit[]
    total: number
    hasMore: boolean
  }>(config.kanbuUrl, config.token, 'github.listProjectCommits', {
    projectId,
    limit,
    offset: 0,
  })

  if (result.commits.length === 0) {
    return success(`No commits found for project ${projectId}.`)
  }

  const lines: string[] = [`Commits (${result.commits.length}/${result.total}):`, '']

  result.commits.forEach((commit, index) => {
    const shortSha = commit.sha.substring(0, 7)
    const linkedTask = commit.task ? ` → ${commit.task.reference}` : ''
    const firstLine = commit.message.split('\n')[0]
    lines.push(`${index + 1}. [${shortSha}] ${truncate(firstLine, 60)}${linkedTask}`)
    lines.push(`   Author: ${commit.authorName} <${commit.authorEmail}>`)
    lines.push(`   Date: ${formatDate(commit.committedAt)}`)
    lines.push(`   ID: ${commit.id} | ${commit.url}`)
    lines.push('')
  })

  if (result.hasMore) {
    lines.push(`(${result.total - result.commits.length} more commits available)`)
  }

  return success(lines.join('\n'))
}

/**
 * Get PRs linked to a task
 */
export async function handleGetTaskPRs(args: unknown) {
  const { taskId } = GetTaskPRsSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{ prs: GitHubPR[] }>(
    config.kanbuUrl,
    config.token,
    'github.getTaskPRs',
    { taskId }
  )

  if (result.prs.length === 0) {
    return success(`No pull requests linked to task ${taskId}.`)
  }

  const lines: string[] = [`Pull Requests linked to task ${taskId}:`, '']

  result.prs.forEach((pr, index) => {
    const stateIcon = pr.state === 'merged' ? '🟣' : pr.state === 'closed' ? '🔴' : '🟢'
    lines.push(`${index + 1}. ${stateIcon} #${pr.prNumber}: ${pr.title}`)
    lines.push(`   State: ${pr.state} | Author: ${pr.authorLogin}`)
    lines.push(`   Branch: ${pr.headBranch} → ${pr.baseBranch}`)
    lines.push(`   ${pr.url}`)
    lines.push('')
  })

  return success(lines.join('\n'))
}

/**
 * Get commits linked to a task
 */
export async function handleGetTaskCommits(args: unknown) {
  const { taskId } = GetTaskCommitsSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{ commits: GitHubCommit[] }>(
    config.kanbuUrl,
    config.token,
    'github.getTaskCommits',
    { taskId }
  )

  if (result.commits.length === 0) {
    return success(`No commits linked to task ${taskId}.`)
  }

  const lines: string[] = [`Commits linked to task ${taskId}:`, '']

  result.commits.forEach((commit, index) => {
    const shortSha = commit.sha.substring(0, 7)
    const firstLine = commit.message.split('\n')[0]
    lines.push(`${index + 1}. [${shortSha}] ${firstLine}`)
    lines.push(`   Author: ${commit.authorName}`)
    lines.push(`   Date: ${formatDate(commit.committedAt)}`)
    lines.push(`   ${commit.url}`)
    lines.push('')
  })

  return success(lines.join('\n'))
}

// =============================================================================
// Tool Handlers - Management Tools
// =============================================================================

/**
 * Link a GitHub repository to a project
 */
export async function handleLinkGitHubRepo(args: unknown) {
  const input = LinkGitHubRepoSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{ repository: GitHubRepository }>(
    config.kanbuUrl,
    config.token,
    'github.linkRepository',
    input,
    'POST'
  )

  const repo = result.repository
  const lines: string[] = [
    'GitHub repository linked!',
    '',
    `Repository: ${repo.fullName}`,
    `Project ID: ${repo.projectId}`,
    `Default Branch: ${repo.defaultBranch}`,
    `Sync Enabled: ${repo.syncEnabled ? 'Yes' : 'No'}`,
    '',
    'Next steps:',
    '- Use kanbu_sync_github_issues to import issues',
    '- PRs and commits will be auto-linked via webhooks',
  ]

  return success(lines.join('\n'))
}

/**
 * Unlink a GitHub repository from a project
 */
export async function handleUnlinkGitHubRepo(args: unknown) {
  const { projectId } = UnlinkGitHubRepoSchema.parse(args)
  const config = requireAuth()

  await client.call<{ success: boolean }>(
    config.kanbuUrl,
    config.token,
    'github.unlinkRepository',
    { projectId },
    'POST'
  )

  return success(
    `GitHub repository unlinked from project ${projectId}.\n\nNote: Existing issues, PRs, and commits remain but are no longer synced.`
  )
}

/**
 * Sync/import issues from GitHub
 */
export async function handleSyncGitHubIssues(args: unknown) {
  const { projectId, state, skipExisting } = SyncGitHubIssuesSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{
    started: boolean
    message: string
    issueCount?: number
  }>(
    config.kanbuUrl,
    config.token,
    'github.importIssues',
    { projectId, state, skipExisting },
    'POST'
  )

  if (!result.started) {
    return success(`Issue sync not started: ${result.message}`)
  }

  const lines: string[] = [
    'Issue sync started!',
    '',
    result.message,
  ]

  if (result.issueCount !== undefined) {
    lines.push(`Issues to process: ${result.issueCount}`)
  }

  lines.push('')
  lines.push('Note: Large imports may take a few moments. Check the sync log for details.')

  return success(lines.join('\n'))
}

/**
 * Create a feature branch for a task
 */
export async function handleCreateGitHubBranch(args: unknown) {
  const { taskId, customBranchName } = CreateGitHubBranchSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{
    success: boolean
    branchName: string
    branchUrl?: string
  }>(
    config.kanbuUrl,
    config.token,
    'github.createBranch',
    { taskId, customBranchName },
    'POST'
  )

  if (!result.success) {
    return success(`Failed to create branch for task ${taskId}.`)
  }

  const lines: string[] = [
    'Branch created!',
    '',
    `Branch: ${result.branchName}`,
    `Task ID: ${taskId}`,
  ]

  if (result.branchUrl) {
    lines.push('')
    lines.push(`URL: ${result.branchUrl}`)
  }

  lines.push('')
  lines.push('You can now push commits to this branch. They will be auto-linked to the task.')

  return success(lines.join('\n'))
}

/**
 * Link a PR to a task
 */
export async function handleLinkPRToTask(args: unknown) {
  const { prId, taskId } = LinkPRToTaskSchema.parse(args)
  const config = requireAuth()

  const result = await client.call<{
    success: boolean
    linked: boolean
    prUrl: string
  }>(
    config.kanbuUrl,
    config.token,
    'github.linkPRToTask',
    { prId, taskId },
    'POST'
  )

  if (!result.success || !result.linked) {
    return success(`Failed to link PR ${prId} to task ${taskId}.`)
  }

  const lines: string[] = [
    'PR linked to task!',
    '',
    `PR ID: ${prId}`,
    `Task ID: ${taskId}`,
    `PR URL: ${result.prUrl}`,
    '',
    'The task will now show this PR in its GitHub section.',
  ]

  return success(lines.join('\n'))
}
