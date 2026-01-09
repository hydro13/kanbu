/*
 * GitHub Webhook Handler
 * Version: 4.0.0
 *
 * Receives and processes GitHub webhook events.
 * Handles signature verification, event routing, and sync operations.
 * Includes auto-linking of PRs/commits, task status automation, and workflow tracking.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10 - CI/CD Integratie
 * =============================================================================
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import {
  createTaskFromGitHubIssue,
  updateTaskFromGitHubIssue,
} from '../../services/github/issueSyncService'
import {
  processNewPR,
  processNewCommits,
} from '../../services/github/prCommitLinkService'
import {
  onPROpened,
  onPRReadyForReview,
  onPRMerged,
  onIssueClosed,
} from '../../services/github/automationService'
import {
  processWorkflowRunEvent,
} from '../../services/github/workflowService'
import {
  upsertReview,
  type ReviewData,
} from '../../services/github/reviewService'
import type { GitHubSyncSettings } from '@kanbu/shared'

// =============================================================================
// Types
// =============================================================================

interface WebhookPayload {
  action?: string
  installation?: {
    id: number
    account: {
      login: string
      id: number
      type: string
    }
  }
  repository?: {
    id: number
    name: string
    full_name: string
    owner: {
      login: string
    }
  }
  issue?: {
    id: number
    number: number
    title: string
    body: string | null
    state: 'open' | 'closed'
    labels: Array<{ name: string; color?: string }>
    assignees: Array<{ login: string; id: number }>
    milestone?: { id: number; number: number; title: string } | null
    user: { login: string; id: number }
    created_at: string
    updated_at: string
    closed_at?: string | null
  }
  pull_request?: {
    id: number
    number: number
    title: string
    body: string | null
    state: 'open' | 'closed'
    merged: boolean
    head: { ref: string; sha: string }
    base: { ref: string }
    user: { login: string; id: number }
    merged_at: string | null
    closed_at: string | null
  }
  commits?: Array<{
    id: string
    message: string
    author: {
      name: string
      email: string
      username?: string
    }
    timestamp: string
  }>
  ref?: string
  sender?: {
    login: string
    id: number
  }
  workflow_run?: {
    id: number
    workflow_id: number
    name: string
    event: string
    status: string
    conclusion: string | null
    head_sha: string
    head_branch: string
    html_url: string
    run_number: number
    run_attempt: number
    actor: { login: string } | null
    run_started_at: string | null
    updated_at: string | null
  }
}

type GitHubEventType =
  | 'issues'
  | 'pull_request'
  | 'push'
  | 'workflow_run'
  | 'installation'
  | 'installation_repositories'
  | 'ping'

interface WebhookContext {
  event: GitHubEventType
  action: string | undefined
  deliveryId: string
  installationId: number | null
  payload: WebhookPayload
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify GitHub webhook signature using HMAC SHA-256
 */
function verifySignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) {
    return false
  }

  // GitHub sends signature as "sha256=<hash>"
  const parts = signature.split('=')
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false
  }

  const expectedSignature = parts[1]
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload, 'utf8')
  const calculatedSignature = hmac.digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    )
  } catch {
    return false
  }
}

// =============================================================================
// Idempotency Tracking
// =============================================================================

// In-memory cache for processed webhook deliveries (prevents duplicate processing)
// In production, this should be Redis-based
const processedDeliveries = new Map<string, number>()
const DELIVERY_TTL = 60 * 60 * 1000 // 1 hour

function isDeliveryProcessed(deliveryId: string): boolean {
  const timestamp = processedDeliveries.get(deliveryId)
  if (!timestamp) return false

  // Check if still within TTL
  if (Date.now() - timestamp > DELIVERY_TTL) {
    processedDeliveries.delete(deliveryId)
    return false
  }

  return true
}

function markDeliveryProcessed(deliveryId: string): void {
  processedDeliveries.set(deliveryId, Date.now())

  // Cleanup old entries periodically
  if (processedDeliveries.size > 10000) {
    const now = Date.now()
    for (const [id, timestamp] of processedDeliveries) {
      if (now - timestamp > DELIVERY_TTL) {
        processedDeliveries.delete(id)
      }
    }
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle ping event (sent when webhook is first configured)
 */
async function handlePing(ctx: WebhookContext): Promise<{ message: string }> {
  console.log(`[GitHub Webhook] Ping received from installation ${ctx.installationId}`)
  return { message: 'pong' }
}

/**
 * Handle installation events (app installed/uninstalled)
 */
async function handleInstallation(ctx: WebhookContext): Promise<{ processed: boolean; action: string }> {
  const { action, payload } = ctx
  const installation = payload.installation

  if (!installation) {
    return { processed: false, action: action || 'unknown' }
  }

  console.log(`[GitHub Webhook] Installation ${action}: ${installation.account.login} (${installation.id})`)

  switch (action) {
    case 'created':
      // Installation created - typically handled via OAuth callback
      // But we can log it here for awareness
      console.log(`[GitHub Webhook] New installation: ${installation.account.login}`)
      break

    case 'deleted':
      // Mark installation as suspended/removed
      await prisma.gitHubInstallation.updateMany({
        where: { installationId: BigInt(installation.id) },
        data: { suspendedAt: new Date() },
      })
      console.log(`[GitHub Webhook] Installation removed: ${installation.account.login}`)
      break

    case 'suspend':
      await prisma.gitHubInstallation.updateMany({
        where: { installationId: BigInt(installation.id) },
        data: { suspendedAt: new Date() },
      })
      break

    case 'unsuspend':
      await prisma.gitHubInstallation.updateMany({
        where: { installationId: BigInt(installation.id) },
        data: { suspendedAt: null },
      })
      break
  }

  return { processed: true, action: action || 'unknown' }
}

/**
 * Handle issue events
 */
async function handleIssues(ctx: WebhookContext): Promise<{ processed: boolean; action: string; issueNumber?: number }> {
  const { action, payload } = ctx
  const issue = payload.issue
  const repo = payload.repository

  if (!issue || !repo) {
    return { processed: false, action: action || 'unknown' }
  }

  console.log(`[GitHub Webhook] Issue ${action}: ${repo.full_name}#${issue.number} - ${issue.title}`)

  // Find the linked repository in Kanbu
  const linkedRepo = await prisma.gitHubRepository.findUnique({
    where: {
      owner_name: {
        owner: repo.owner.login,
        name: repo.name,
      },
    },
    include: {
      project: true,
    },
  })

  if (!linkedRepo) {
    console.log(`[GitHub Webhook] Repository ${repo.full_name} not linked to any project, skipping`)
    return { processed: false, action: action || 'unknown', issueNumber: issue.number }
  }

  if (!linkedRepo.syncEnabled) {
    console.log(`[GitHub Webhook] Sync disabled for ${repo.full_name}, skipping`)
    return { processed: false, action: action || 'unknown', issueNumber: issue.number }
  }

  // Check sync settings
  const syncSettings = linkedRepo.syncSettings as { issues?: { enabled: boolean; direction: string } } | null
  if (!syncSettings?.issues?.enabled) {
    console.log(`[GitHub Webhook] Issue sync disabled for ${repo.full_name}, skipping`)
    return { processed: false, action: action || 'unknown', issueNumber: issue.number }
  }

  const direction = syncSettings.issues.direction
  if (direction === 'kanbu_to_github') {
    console.log(`[GitHub Webhook] Issue sync is Kanbu→GitHub only, skipping inbound event`)
    return { processed: false, action: action || 'unknown', issueNumber: issue.number }
  }

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: linkedRepo.id,
      action: `issue_${action}`,
      direction: 'github_to_kanbu',
      entityType: 'issue',
      entityId: issue.number.toString(),
      details: {
        title: issue.title,
        state: issue.state,
        labels: issue.labels.map(l => l.name),
      },
      status: 'success',
    },
  })

  // Find or create GitHubIssue record
  const existingIssue = await prisma.gitHubIssue.findUnique({
    where: {
      repositoryId_issueNumber: {
        repositoryId: linkedRepo.id,
        issueNumber: issue.number,
      },
    },
  })

  // Prepare issue data for sync service
  const issueData = {
    number: issue.number,
    id: issue.id,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels,
    assignees: issue.assignees,
    milestone: issue.milestone ? {
      title: issue.milestone.title,
      number: issue.milestone.number,
    } : null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
  }

  switch (action) {
    case 'opened':
      if (!existingIssue) {
        // Create task AND GitHubIssue record via sync service
        const { taskId, created } = await createTaskFromGitHubIssue(
          linkedRepo.id,
          issueData,
          { syncDirection: direction as 'github_to_kanbu' | 'kanbu_to_github' | 'bidirectional', skipExisting: false }
        )
        if (created) {
          console.log(`[GitHub Webhook] Created task ${taskId} from issue #${issue.number}`)
        }
      }
      break

    case 'edited':
    case 'labeled':
    case 'unlabeled':
    case 'assigned':
    case 'unassigned':
      if (existingIssue) {
        // Update task via sync service
        const { updated, taskId } = await updateTaskFromGitHubIssue(issue.id, issueData)
        if (updated) {
          console.log(`[GitHub Webhook] Updated task ${taskId} from issue #${issue.number}`)
        }
      } else {
        // Issue not in our system yet, create it
        const { taskId, created } = await createTaskFromGitHubIssue(
          linkedRepo.id,
          issueData,
          { syncDirection: direction as 'github_to_kanbu' | 'kanbu_to_github' | 'bidirectional', skipExisting: false }
        )
        if (created) {
          console.log(`[GitHub Webhook] Created task ${taskId} from edited issue #${issue.number}`)
        }
      }
      break

    case 'closed':
      if (existingIssue) {
        // Update task state via sync service
        const { updated, taskId } = await updateTaskFromGitHubIssue(issue.id, issueData)
        if (updated) {
          console.log(`[GitHub Webhook] Updated task ${taskId} state to ${issue.state}`)
        }
        // Trigger automation to close task if enabled
        if (existingIssue.taskId) {
          try {
            const result = await onIssueClosed(linkedRepo.id, existingIssue.taskId)
            if (result.action === 'closed') {
              console.log(`[GitHub Webhook] Task ${existingIssue.taskId} closed via automation`)
            }
          } catch (error) {
            console.error(`[GitHub Webhook] Automation error closing task:`, error)
          }
        }
      }
      break

    case 'reopened':
      if (existingIssue) {
        // Update task state via sync service
        const { updated, taskId } = await updateTaskFromGitHubIssue(issue.id, issueData)
        if (updated) {
          console.log(`[GitHub Webhook] Updated task ${taskId} state to ${issue.state}`)
        }
      }
      break

    case 'deleted':
      if (existingIssue) {
        // For now, just delete the GitHubIssue record (keep the task)
        await prisma.gitHubIssue.delete({
          where: { id: existingIssue.id },
        })
        console.log(`[GitHub Webhook] Deleted GitHubIssue record for #${issue.number}`)
      }
      break
  }

  return { processed: true, action: action || 'unknown', issueNumber: issue.number }
}

/**
 * Handle pull request events
 */
async function handlePullRequest(ctx: WebhookContext): Promise<{
  processed: boolean
  action: string
  prNumber?: number
  taskLinked?: boolean
  linkMethod?: string
  automationTriggered?: string
}> {
  const { action, payload } = ctx
  const pr = payload.pull_request
  const repo = payload.repository

  if (!pr || !repo) {
    return { processed: false, action: action || 'unknown' }
  }

  console.log(`[GitHub Webhook] PR ${action}: ${repo.full_name}#${pr.number} - ${pr.title}`)

  // Find the linked repository in Kanbu
  const linkedRepo = await prisma.gitHubRepository.findUnique({
    where: {
      owner_name: {
        owner: repo.owner.login,
        name: repo.name,
      },
    },
  })

  if (!linkedRepo || !linkedRepo.syncEnabled) {
    return { processed: false, action: action || 'unknown', prNumber: pr.number }
  }

  // Check sync settings
  const syncSettings = linkedRepo.syncSettings as GitHubSyncSettings | null
  if (!syncSettings?.pullRequests?.enabled) {
    return { processed: false, action: action || 'unknown', prNumber: pr.number }
  }

  // Determine PR state
  let prState: 'open' | 'closed' | 'merged' = pr.state
  if (pr.merged) {
    prState = 'merged'
  }

  // Process PR with auto-linking for opened/ready_for_review events
  let taskLinked = false
  let linkMethod = 'none'
  let linkedTaskId: number | null = null
  let automationTriggered: string | undefined

  if (action === 'opened' || action === 'ready_for_review') {
    try {
      const result = await processNewPR(linkedRepo.id, {
        prNumber: pr.number,
        prId: BigInt(pr.id),
        title: pr.title,
        body: pr.body,
        state: prState,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        authorLogin: pr.user.login,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      })

      taskLinked = result.linked
      linkMethod = result.method
      linkedTaskId = result.taskId || null

      if (result.linked) {
        console.log(`[GitHub Webhook] PR #${pr.number} auto-linked to task ${result.taskId} via ${result.method}`)
      }
    } catch (error) {
      console.error(`[GitHub Webhook] Error processing PR #${pr.number}:`, error)
    }
  } else {
    // For other actions, just update the existing record
    const existingPR = await prisma.gitHubPullRequest.findUnique({
      where: {
        repositoryId_prNumber: {
          repositoryId: linkedRepo.id,
          prNumber: pr.number,
        },
      },
    })

    if (existingPR?.taskId) {
      linkedTaskId = existingPR.taskId
    }

    switch (action) {
      case 'edited':
      case 'synchronize':
        if (existingPR) {
          await prisma.gitHubPullRequest.update({
            where: { id: existingPR.id },
            data: {
              title: pr.title,
              state: prState,
              headBranch: pr.head.ref,
            },
          })
        } else {
          // PR not tracked yet, create and auto-link
          const result = await processNewPR(linkedRepo.id, {
            prNumber: pr.number,
            prId: BigInt(pr.id),
            title: pr.title,
            body: pr.body,
            state: prState,
            headBranch: pr.head.ref,
            baseBranch: pr.base.ref,
            authorLogin: pr.user.login,
          })
          taskLinked = result.linked
          linkMethod = result.method
          linkedTaskId = result.taskId || null
        }
        break

      case 'closed':
        if (existingPR) {
          await prisma.gitHubPullRequest.update({
            where: { id: existingPR.id },
            data: {
              state: prState,
              mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
              closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
            },
          })
        }
        break

      case 'reopened':
        if (existingPR) {
          await prisma.gitHubPullRequest.update({
            where: { id: existingPR.id },
            data: {
              state: 'open',
              mergedAt: null,
              closedAt: null,
            },
          })
        }
        break
    }
  }

  // Trigger task status automation if PR is linked to a task
  if (linkedTaskId) {
    try {
      if (action === 'opened') {
        const result = await onPROpened(linkedRepo.id, linkedTaskId)
        if (result.action === 'moved') {
          automationTriggered = 'moved_to_in_progress'
          console.log(`[GitHub Webhook] Task ${linkedTaskId} moved to In Progress`)
        }
      } else if (action === 'ready_for_review') {
        const result = await onPRReadyForReview(linkedRepo.id, linkedTaskId)
        if (result.action === 'moved') {
          automationTriggered = 'moved_to_review'
          console.log(`[GitHub Webhook] Task ${linkedTaskId} moved to Review`)
        }
      } else if (action === 'closed' && pr.merged) {
        const result = await onPRMerged(linkedRepo.id, linkedTaskId)
        if (result.action === 'moved') {
          automationTriggered = 'moved_to_done'
          console.log(`[GitHub Webhook] Task ${linkedTaskId} moved to Done`)
        }
      }
    } catch (error) {
      console.error(`[GitHub Webhook] Automation error for task ${linkedTaskId}:`, error)
    }
  }

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: linkedRepo.id,
      action: `pr_${action}`,
      direction: 'github_to_kanbu',
      entityType: 'pr',
      entityId: pr.number.toString(),
      details: {
        title: pr.title,
        state: prState,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        taskLinked,
        linkMethod,
        automationTriggered,
      },
      status: 'success',
    },
  })

  return {
    processed: true,
    action: action || 'unknown',
    prNumber: pr.number,
    taskLinked,
    linkMethod,
    automationTriggered,
  }
}

/**
 * Handle push events (commits)
 */
async function handlePush(ctx: WebhookContext): Promise<{
  processed: boolean
  commitCount: number
  linkedCount: number
}> {
  const { payload } = ctx
  const commits = payload.commits || []
  const repo = payload.repository
  const ref = payload.ref

  if (!repo || commits.length === 0) {
    return { processed: false, commitCount: 0, linkedCount: 0 }
  }

  console.log(`[GitHub Webhook] Push to ${repo.full_name} (${ref}): ${commits.length} commits`)

  // Find the linked repository in Kanbu
  const linkedRepo = await prisma.gitHubRepository.findUnique({
    where: {
      owner_name: {
        owner: repo.owner.login,
        name: repo.name,
      },
    },
  })

  if (!linkedRepo || !linkedRepo.syncEnabled) {
    return { processed: false, commitCount: commits.length, linkedCount: 0 }
  }

  // Check sync settings
  const syncSettings = linkedRepo.syncSettings as GitHubSyncSettings | null
  if (!syncSettings?.commits?.enabled) {
    return { processed: false, commitCount: commits.length, linkedCount: 0 }
  }

  // Process commits with auto-linking
  const commitData = commits.map(commit => ({
    sha: commit.id,
    message: commit.message,
    authorName: commit.author.name,
    authorEmail: commit.author.email,
    authorLogin: commit.author.username || null,
    committedAt: new Date(commit.timestamp),
  }))

  const results = await processNewCommits(linkedRepo.id, commitData)

  const processedCount = results.length
  const linkedCount = results.filter(r => r.linked).length

  if (linkedCount > 0) {
    console.log(`[GitHub Webhook] ${linkedCount}/${processedCount} commits auto-linked to tasks`)
  }

  if (processedCount > 0 && commits[0]) {
    // Log sync operation
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: linkedRepo.id,
        action: 'commits_received',
        direction: 'github_to_kanbu',
        entityType: 'commit',
        entityId: commits[0].id,
        details: {
          branch: ref,
          count: processedCount,
          total: commits.length,
          linkedCount,
        },
        status: 'success',
      },
    })
  }

  console.log(`[GitHub Webhook] Processed ${processedCount}/${commits.length} commits (${linkedCount} linked)`)
  return { processed: true, commitCount: processedCount, linkedCount }
}

/**
 * Handle workflow_run events (GitHub Actions CI/CD)
 */
async function handleWorkflowRun(ctx: WebhookContext): Promise<{
  processed: boolean
  action: string | undefined
  workflowName: string | null
}> {
  const { action, payload } = ctx
  const repo = payload.repository
  const workflowRun = payload.workflow_run

  if (!repo || !workflowRun) {
    return { processed: false, action, workflowName: null }
  }

  console.log(`[GitHub Webhook] Workflow run ${action}: ${workflowRun.name} #${workflowRun.run_number}`)

  // Find the linked repository in Kanbu
  const linkedRepo = await prisma.gitHubRepository.findUnique({
    where: {
      owner_name: {
        owner: repo.owner.login,
        name: repo.name,
      },
    },
  })

  if (!linkedRepo || !linkedRepo.syncEnabled) {
    return { processed: false, action, workflowName: workflowRun.name }
  }

  // Process the workflow run event
  await processWorkflowRunEvent(linkedRepo.id, action || 'unknown', workflowRun)

  // Log sync operation for completed workflows
  if (action === 'completed') {
    await prisma.gitHubSyncLog.create({
      data: {
        repositoryId: linkedRepo.id,
        action: 'workflow_completed',
        direction: 'github_to_kanbu',
        entityType: 'workflow',
        entityId: String(workflowRun.id),
        details: {
          workflowName: workflowRun.name,
          runNumber: workflowRun.run_number,
          conclusion: workflowRun.conclusion,
          event: workflowRun.event,
          headBranch: workflowRun.head_branch,
        },
        status: 'success',
      },
    })
  }

  return { processed: true, action, workflowName: workflowRun.name }
}

// =============================================================================
// Pull Request Review Handler
// =============================================================================

async function handlePullRequestReview(ctx: WebhookContext): Promise<{
  processed: boolean
  action: string | undefined
  prNumber: number | null
  reviewState: string | null
}> {
  const { action, payload } = ctx
  const repo = payload.repository
  const pr = payload.pull_request
  const review = payload.review

  if (!repo || !pr || !review) {
    return { processed: false, action, prNumber: null, reviewState: null }
  }

  console.log(`[GitHub Webhook] PR review ${action}: ${repo.full_name}#${pr.number} by ${review.user?.login}`)

  // Find the linked repository in Kanbu
  const linkedRepo = await prisma.gitHubRepository.findUnique({
    where: {
      owner_name: {
        owner: repo.owner.login,
        name: repo.name,
      },
    },
  })

  if (!linkedRepo || !linkedRepo.syncEnabled) {
    return { processed: false, action, prNumber: pr.number, reviewState: review.state }
  }

  // Check if PR tracking is enabled
  const syncSettings = linkedRepo.syncSettings as GitHubSyncSettings | null
  if (!syncSettings?.pullRequests?.enabled) {
    return { processed: false, action, prNumber: pr.number, reviewState: review.state }
  }

  // Find the PR in our database
  const dbPR = await prisma.gitHubPullRequest.findUnique({
    where: {
      repositoryId_prNumber: {
        repositoryId: linkedRepo.id,
        prNumber: pr.number,
      },
    },
  })

  if (!dbPR) {
    // PR not tracked yet, skip
    return { processed: false, action, prNumber: pr.number, reviewState: review.state }
  }

  // Upsert the review
  const reviewData: ReviewData = {
    pullRequestId: dbPR.id,
    reviewId: BigInt(review.id),
    authorLogin: review.user?.login ?? 'unknown',
    state: (review.state?.toUpperCase() ?? 'COMMENTED') as ReviewData['state'],
    body: review.body ?? null,
    htmlUrl: review.html_url ?? null,
    submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
  }

  await upsertReview(reviewData)

  // Log sync operation
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: linkedRepo.id,
      action: `review_${action}`,
      direction: 'github_to_kanbu',
      entityType: 'pr',
      entityId: String(pr.number),
      details: {
        reviewId: review.id,
        reviewState: review.state,
        reviewer: review.user?.login,
        prNumber: pr.number,
        prTitle: pr.title,
      },
      status: 'success',
    },
  })

  return {
    processed: true,
    action,
    prNumber: pr.number,
    reviewState: review.state,
  }
}

// =============================================================================
// Main Webhook Handler
// =============================================================================

async function webhookHandler(
  request: FastifyRequest<{ Body: WebhookPayload }>,
  reply: FastifyReply
) {
  // Get headers
  const event = request.headers['x-github-event'] as GitHubEventType | undefined
  const signature = request.headers['x-hub-signature-256'] as string | undefined
  const deliveryId = request.headers['x-github-delivery'] as string | undefined

  // Validate required headers
  if (!event) {
    return reply.status(400).send({ error: 'Missing X-GitHub-Event header' })
  }

  if (!deliveryId) {
    return reply.status(400).send({ error: 'Missing X-GitHub-Delivery header' })
  }

  // Check for duplicate delivery (idempotency)
  if (isDeliveryProcessed(deliveryId)) {
    console.log(`[GitHub Webhook] Duplicate delivery ${deliveryId}, skipping`)
    return reply.status(200).send({ message: 'Already processed' })
  }

  // Get webhook secret from environment
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET

  // Verify signature if secret is configured
  if (webhookSecret) {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(request.body)

    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.error(`[GitHub Webhook] Invalid signature for delivery ${deliveryId}`)
      return reply.status(401).send({ error: 'Invalid signature' })
    }
  }

  const payload = request.body
  const action = payload.action
  const installationId = payload.installation?.id || null

  const ctx: WebhookContext = {
    event,
    action,
    deliveryId,
    installationId,
    payload,
  }

  console.log(`[GitHub Webhook] Received ${event}${action ? `.${action}` : ''} (delivery: ${deliveryId})`)

  try {
    let result: unknown

    // Route to appropriate handler
    switch (event) {
      case 'ping':
        result = await handlePing(ctx)
        break

      case 'installation':
      case 'installation_repositories':
        result = await handleInstallation(ctx)
        break

      case 'issues':
        result = await handleIssues(ctx)
        break

      case 'pull_request':
        result = await handlePullRequest(ctx)
        break

      case 'push':
        result = await handlePush(ctx)
        break

      case 'workflow_run':
        result = await handleWorkflowRun(ctx)
        break

      case 'pull_request_review':
        result = await handlePullRequestReview(ctx)
        break

      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${event}`)
        result = { message: 'Event type not handled', event }
    }

    // Mark delivery as processed
    markDeliveryProcessed(deliveryId)

    return reply.status(200).send({
      received: true,
      event,
      action,
      deliveryId,
      result,
    })
  } catch (error) {
    console.error(`[GitHub Webhook] Error processing ${event}:`, error)

    // Log error to sync log if we have repository context
    const repo = payload.repository
    if (repo) {
      const linkedRepo = await prisma.gitHubRepository.findUnique({
        where: {
          owner_name: {
            owner: repo.owner.login,
            name: repo.name,
          },
        },
      })

      if (linkedRepo) {
        await prisma.gitHubSyncLog.create({
          data: {
            repositoryId: linkedRepo.id,
            action: `webhook_${event}_error`,
            direction: 'github_to_kanbu',
            entityType: 'issue',
            details: { event, action },
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      }
    }

    return reply.status(500).send({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export async function registerGitHubWebhookRoutes(server: FastifyInstance): Promise<void> {
  // Main webhook endpoint
  server.post('/api/webhooks/github', {
    config: {
      // Disable body parsing to get raw body for signature verification
      // Actually, we need the parsed body, so we'll stringify it for verification
    },
  }, webhookHandler)

  console.log('[GitHub Webhook] Routes registered at POST /api/webhooks/github')
}
