/*
 * GitHub Bot Service
 * Version: 1.0.0
 *
 * Handles GitHub bot functionality:
 * - Slash commands in issue/PR comments (/kanbu link, /kanbu status, etc.)
 * - Auto-commenting on PRs with task info and AI summaries
 * - Welcome messages for new contributors
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'
import { getInstallationOctokit } from './githubService'
import { linkPRToTask, extractTaskReferences, findTaskFromReferences } from './prCommitLinkService'
import { generatePRSummary, isAIConfigured, type PRSummaryInput } from './aiService'

// =============================================================================
// Types
// =============================================================================

export interface BotCommand {
  command: string
  args: string[]
  raw: string
}

export interface CommentContext {
  repositoryId: number
  owner: string
  repo: string
  issueNumber: number
  isPullRequest: boolean
  commentId: number
  commentBody: string
  commentAuthor: string
  installationId: number
}

export interface BotResponse {
  processed: boolean
  command?: string
  message?: string
  error?: string
}

// =============================================================================
// Command Parsing
// =============================================================================

const COMMAND_PREFIX = '/kanbu'

/**
 * Parse bot commands from comment body
 * Supports: /kanbu link PROJ-123, /kanbu status, /kanbu unlink, /kanbu summary
 */
export function parseCommands(body: string): BotCommand[] {
  const commands: BotCommand[] = []
  const lines = body.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith(COMMAND_PREFIX)) {
      const parts = trimmed.slice(COMMAND_PREFIX.length).trim().split(/\s+/)
      const command = parts[0]?.toLowerCase() || ''
      const args = parts.slice(1)

      if (command) {
        commands.push({
          command,
          args,
          raw: trimmed,
        })
      }
    }
  }

  return commands
}

// =============================================================================
// GitHub API Helpers
// =============================================================================

/**
 * Post a comment on an issue or PR
 */
async function postComment(
  installationId: number,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<number | null> {
  try {
    const octokit = await getInstallationOctokit(installationId)
    const response = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })
    return response.data.id
  } catch (error) {
    console.error('[GitHub Bot] Failed to post comment:', error)
    return null
  }
}

/**
 * Add a reaction to a comment
 */
async function addReaction(
  installationId: number,
  owner: string,
  repo: string,
  commentId: number,
  reaction: '+1' | '-1' | 'eyes' | 'rocket' | 'confused' | 'heart'
): Promise<boolean> {
  try {
    const octokit = await getInstallationOctokit(installationId)
    await octokit.reactions.createForIssueComment({
      owner,
      repo,
      comment_id: commentId,
      content: reaction,
    })
    return true
  } catch (error) {
    console.error('[GitHub Bot] Failed to add reaction:', error)
    return false
  }
}

/**
 * Get PR details including commits
 */
async function getPRDetails(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
) {
  try {
    const octokit = await getInstallationOctokit(installationId)

    const [prResponse, commitsResponse] = await Promise.all([
      octokit.pulls.get({ owner, repo, pull_number: prNumber }),
      octokit.pulls.listCommits({ owner, repo, pull_number: prNumber, per_page: 100 }),
    ])

    return {
      pr: prResponse.data,
      commits: commitsResponse.data,
    }
  } catch (error) {
    console.error('[GitHub Bot] Failed to get PR details:', error)
    return null
  }
}

// =============================================================================
// Command Handlers
// =============================================================================

/**
 * Handle /kanbu link PROJ-123
 */
async function handleLinkCommand(
  ctx: CommentContext,
  args: string[]
): Promise<BotResponse> {
  if (!ctx.isPullRequest) {
    return {
      processed: true,
      command: 'link',
      error: 'The link command can only be used on pull requests.',
    }
  }

  if (args.length === 0) {
    return {
      processed: true,
      command: 'link',
      error: 'Please specify a task reference. Usage: `/kanbu link PROJ-123`',
    }
  }

  const taskRef = args[0]!

  // Get the repository's project ID
  const repo = await prisma.gitHubRepository.findUnique({
    where: { id: ctx.repositoryId },
    select: { projectId: true },
  })

  if (!repo) {
    return {
      processed: true,
      command: 'link',
      error: 'Repository not found.',
    }
  }

  // Parse task reference and find the task
  const references = extractTaskReferences(taskRef)
  if (references.length === 0) {
    return {
      processed: true,
      command: 'link',
      error: `Invalid task reference: \`${taskRef}\`. Use format like PROJ-123 or #123.`,
    }
  }

  const task = await findTaskFromReferences(repo.projectId, references)
  if (!task) {
    return {
      processed: true,
      command: 'link',
      error: `Task \`${taskRef}\` not found. Make sure the task exists and belongs to this project.`,
    }
  }

  // Get task title for the response
  const taskDetails = await prisma.task.findUnique({
    where: { id: task.taskId },
    select: { title: true },
  })

  // Find the PR record
  const pr = await prisma.gitHubPullRequest.findUnique({
    where: {
      repositoryId_prNumber: {
        repositoryId: ctx.repositoryId,
        prNumber: ctx.issueNumber,
      },
    },
  })

  if (!pr) {
    return {
      processed: true,
      command: 'link',
      error: 'This pull request is not tracked. It may need to be synced first.',
    }
  }

  // Link the PR to the task
  const result = await linkPRToTask(pr.id, task.taskId)
  if (!result.linked) {
    return {
      processed: true,
      command: 'link',
      error: 'Failed to link PR to task.',
    }
  }

  return {
    processed: true,
    command: 'link',
    message: `✅ Linked this PR to task **${task.reference}**: ${taskDetails?.title ?? 'Unknown'}`,
  }
}

/**
 * Handle /kanbu unlink
 */
async function handleUnlinkCommand(
  ctx: CommentContext
): Promise<BotResponse> {
  if (!ctx.isPullRequest) {
    return {
      processed: true,
      command: 'unlink',
      error: 'The unlink command can only be used on pull requests.',
    }
  }

  // Find and update the PR record
  const pr = await prisma.gitHubPullRequest.findUnique({
    where: {
      repositoryId_prNumber: {
        repositoryId: ctx.repositoryId,
        prNumber: ctx.issueNumber,
      },
    },
  })

  if (!pr) {
    return {
      processed: true,
      command: 'unlink',
      error: 'This pull request is not tracked.',
    }
  }

  if (!pr.taskId) {
    return {
      processed: true,
      command: 'unlink',
      error: 'This PR is not linked to any task.',
    }
  }

  await prisma.gitHubPullRequest.update({
    where: { id: pr.id },
    data: { taskId: null },
  })

  return {
    processed: true,
    command: 'unlink',
    message: '✅ Unlinked this PR from its task.',
  }
}

/**
 * Handle /kanbu status
 */
async function handleStatusCommand(
  ctx: CommentContext
): Promise<BotResponse> {
  if (ctx.isPullRequest) {
    // Get PR status with linked task info
    const pr = await prisma.gitHubPullRequest.findUnique({
      where: {
        repositoryId_prNumber: {
          repositoryId: ctx.repositoryId,
          prNumber: ctx.issueNumber,
        },
      },
      include: {
        task: {
          include: {
            column: true,
          },
        },
      },
    })

    if (!pr) {
      return {
        processed: true,
        command: 'status',
        message: '📋 This PR is not tracked in Kanbu.',
      }
    }

    if (!pr.task) {
      return {
        processed: true,
        command: 'status',
        message: `📋 **PR Status**\n- State: \`${pr.state}\`\n- Not linked to any task`,
      }
    }

    const task = pr.task
    return {
      processed: true,
      command: 'status',
      message: `📋 **PR Status**

| Property | Value |
|----------|-------|
| PR State | \`${pr.state}\` |
| Linked Task | **${task.reference}** |
| Task Title | ${task.title} |
| Task Status | \`${task.column?.title || 'Unknown'}\` |
| Priority | \`${task.priority}\` |`,
    }
  } else {
    // Get issue status
    const issue = await prisma.gitHubIssue.findUnique({
      where: {
        repositoryId_issueNumber: {
          repositoryId: ctx.repositoryId,
          issueNumber: ctx.issueNumber,
        },
      },
      include: {
        task: {
          include: {
            column: true,
          },
        },
      },
    })

    if (!issue || !issue.task) {
      return {
        processed: true,
        command: 'status',
        message: '📋 This issue is not tracked in Kanbu.',
      }
    }

    const task = issue.task
    return {
      processed: true,
      command: 'status',
      message: `📋 **Task Status**

| Property | Value |
|----------|-------|
| Task | **${task.reference}** |
| Title | ${task.title} |
| Status | \`${task.column?.title || 'Unknown'}\` |
| Priority | \`${task.priority}\` |`,
    }
  }
}

/**
 * Handle /kanbu summary - Generate AI summary for PR
 */
async function handleSummaryCommand(
  ctx: CommentContext
): Promise<BotResponse> {
  if (!ctx.isPullRequest) {
    return {
      processed: true,
      command: 'summary',
      error: 'The summary command can only be used on pull requests.',
    }
  }

  if (!isAIConfigured()) {
    return {
      processed: true,
      command: 'summary',
      error: 'AI service is not configured. Please set up an AI provider.',
    }
  }

  // Get PR details from GitHub
  const details = await getPRDetails(
    ctx.installationId,
    ctx.owner,
    ctx.repo,
    ctx.issueNumber
  )

  if (!details) {
    return {
      processed: true,
      command: 'summary',
      error: 'Failed to fetch PR details from GitHub.',
    }
  }

  // Generate AI summary
  const input: PRSummaryInput = {
    title: details.pr.title,
    commits: details.commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || 'unknown',
    })),
    baseBranch: details.pr.base.ref,
    headBranch: details.pr.head.ref,
  }

  try {
    const summary = await generatePRSummary(input)

    const message = `## 🤖 AI-Generated Summary

${summary.summary}

### Key Changes
${summary.keyChanges.map(c => `- ${c}`).join('\n') || '_No key changes identified_'}

${summary.breakingChanges.length > 0 ? `### ⚠️ Breaking Changes\n${summary.breakingChanges.map(c => `- ${c}`).join('\n')}` : ''}

### Affected Areas
${summary.affectedAreas.map(a => `\`${a}\``).join(', ') || '_None identified_'}

---
<sub>Generated by Kanbu AI • [Learn more](https://kanbu.app)</sub>`

    return {
      processed: true,
      command: 'summary',
      message,
    }
  } catch (error) {
    console.error('[GitHub Bot] AI summary generation failed:', error)
    return {
      processed: true,
      command: 'summary',
      error: 'Failed to generate AI summary. Please try again later.',
    }
  }
}

/**
 * Handle /kanbu help
 */
function handleHelpCommand(): BotResponse {
  return {
    processed: true,
    command: 'help',
    message: `## 🤖 Kanbu Bot Commands

| Command | Description |
|---------|-------------|
| \`/kanbu link PROJ-123\` | Link this PR to a task |
| \`/kanbu unlink\` | Remove task link from this PR |
| \`/kanbu status\` | Show task/PR status |
| \`/kanbu summary\` | Generate AI summary for PR |
| \`/kanbu help\` | Show this help message |

---
<sub>Kanbu Bot • [Documentation](https://kanbu.app/docs/bot)</sub>`,
  }
}

// =============================================================================
// Main Bot Handler
// =============================================================================

/**
 * Process a comment and execute any bot commands
 */
export async function processComment(ctx: CommentContext): Promise<BotResponse[]> {
  const commands = parseCommands(ctx.commentBody)

  if (commands.length === 0) {
    return []
  }

  console.log(`[GitHub Bot] Processing ${commands.length} command(s) from @${ctx.commentAuthor}`)

  const responses: BotResponse[] = []

  for (const cmd of commands) {
    let response: BotResponse

    switch (cmd.command) {
      case 'link':
        response = await handleLinkCommand(ctx, cmd.args)
        break
      case 'unlink':
        response = await handleUnlinkCommand(ctx)
        break
      case 'status':
        response = await handleStatusCommand(ctx)
        break
      case 'summary':
        response = await handleSummaryCommand(ctx)
        break
      case 'help':
        response = handleHelpCommand()
        break
      default:
        response = {
          processed: true,
          command: cmd.command,
          error: `Unknown command: \`${cmd.command}\`. Use \`/kanbu help\` for available commands.`,
        }
    }

    responses.push(response)

    // Post response as comment
    if (response.message || response.error) {
      const commentBody = response.error
        ? `❌ **Error:** ${response.error}`
        : response.message!

      await postComment(
        ctx.installationId,
        ctx.owner,
        ctx.repo,
        ctx.issueNumber,
        commentBody
      )
    }

    // Add reaction to the command comment
    await addReaction(
      ctx.installationId,
      ctx.owner,
      ctx.repo,
      ctx.commentId,
      response.error ? 'confused' : 'rocket'
    )
  }

  return responses
}

// =============================================================================
// Auto-Comment Features
// =============================================================================

/**
 * Post task info comment when PR is linked to a task
 */
export async function postTaskInfoComment(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number,
  taskId: number
): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: true,
      project: true,
      assignees: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!task) {
    return false
  }

  const assigneesList = task.assignees.length > 0
    ? task.assignees.map(a => a.user.name || a.user.username).join(', ')
    : '_Unassigned_'

  const message = `## 📋 Linked to Kanbu Task

| Property | Value |
|----------|-------|
| **Task** | **${task.reference}** |
| **Title** | ${task.title} |
| **Project** | ${task.project.name} |
| **Status** | \`${task.column?.title || 'Backlog'}\` |
| **Priority** | \`${task.priority}\` |
| **Assignees** | ${assigneesList} |

${task.description ? `### Description\n${task.description.slice(0, 500)}${task.description.length > 500 ? '...' : ''}` : ''}

---
<sub>Linked by Kanbu Bot • Task status will update automatically</sub>`

  const commentId = await postComment(installationId, owner, repo, prNumber, message)
  return commentId !== null
}

/**
 * Post AI summary when a PR is opened (if enabled in settings)
 */
export async function autoPostPRSummary(
  installationId: number,
  owner: string,
  repo: string,
  prNumber: number
): Promise<boolean> {
  if (!isAIConfigured()) {
    console.log('[GitHub Bot] AI not configured, skipping auto-summary')
    return false
  }

  // Get PR details
  const details = await getPRDetails(installationId, owner, repo, prNumber)
  if (!details) {
    return false
  }

  // Skip if no commits or very simple PR
  if (details.commits.length === 0) {
    return false
  }

  const input: PRSummaryInput = {
    title: details.pr.title,
    commits: details.commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || 'unknown',
    })),
    baseBranch: details.pr.base.ref,
    headBranch: details.pr.head.ref,
  }

  try {
    const summary = await generatePRSummary(input)

    const message = `## 🤖 AI-Generated Summary

${summary.summary}

### Key Changes
${summary.keyChanges.map(c => `- ${c}`).join('\n') || '_No key changes identified_'}

${summary.breakingChanges.length > 0 ? `### ⚠️ Breaking Changes\n${summary.breakingChanges.map(c => `- ${c}`).join('\n')}` : ''}

### Affected Areas
${summary.affectedAreas.map(a => `\`${a}\``).join(', ') || '_None identified_'}

---
<sub>Auto-generated by Kanbu AI • Use \`/kanbu summary\` to regenerate</sub>`

    const commentId = await postComment(installationId, owner, repo, prNumber, message)
    return commentId !== null
  } catch (error) {
    console.error('[GitHub Bot] Auto PR summary failed:', error)
    return false
  }
}

// =============================================================================
// Service Export
// =============================================================================

export const botService = {
  parseCommands,
  processComment,
  postTaskInfoComment,
  autoPostPRSummary,
}

export default botService
