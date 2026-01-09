/*
 * GitHub Webhook Handler
 * Version: 1.0.0
 *
 * Receives and processes GitHub webhook events.
 * Handles signature verification, event routing, and sync operations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 4 - Webhook Handler
 * =============================================================================
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { prisma } from '../../lib/prisma'

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
    labels: Array<{ name: string }>
    assignees: Array<{ login: string; id: number }>
    milestone?: { id: number; title: string } | null
    user: { login: string; id: number }
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
}

type GitHubEventType =
  | 'issues'
  | 'pull_request'
  | 'push'
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

  switch (action) {
    case 'opened':
      if (!existingIssue) {
        // Create GitHubIssue record (task creation will be in Fase 5)
        await prisma.gitHubIssue.create({
          data: {
            repositoryId: linkedRepo.id,
            issueNumber: issue.number,
            issueId: BigInt(issue.id),
            title: issue.title,
            state: issue.state,
            syncDirection: direction,
            lastSyncAt: new Date(),
          },
        })
        console.log(`[GitHub Webhook] Created GitHubIssue record for #${issue.number}`)
      }
      break

    case 'edited':
    case 'labeled':
    case 'unlabeled':
    case 'assigned':
    case 'unassigned':
      if (existingIssue) {
        await prisma.gitHubIssue.update({
          where: { id: existingIssue.id },
          data: {
            title: issue.title,
            state: issue.state,
            lastSyncAt: new Date(),
          },
        })
      }
      break

    case 'closed':
    case 'reopened':
      if (existingIssue) {
        await prisma.gitHubIssue.update({
          where: { id: existingIssue.id },
          data: {
            state: issue.state,
            lastSyncAt: new Date(),
          },
        })
      }
      break

    case 'deleted':
      if (existingIssue) {
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
async function handlePullRequest(ctx: WebhookContext): Promise<{ processed: boolean; action: string; prNumber?: number }> {
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
  const syncSettings = linkedRepo.syncSettings as { pullRequests?: { enabled: boolean } } | null
  if (!syncSettings?.pullRequests?.enabled) {
    return { processed: false, action: action || 'unknown', prNumber: pr.number }
  }

  // Determine PR state
  let prState: 'open' | 'closed' | 'merged' = pr.state
  if (pr.merged) {
    prState = 'merged'
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
      },
      status: 'success',
    },
  })

  // Find or create GitHubPullRequest record
  const existingPR = await prisma.gitHubPullRequest.findUnique({
    where: {
      repositoryId_prNumber: {
        repositoryId: linkedRepo.id,
        prNumber: pr.number,
      },
    },
  })

  switch (action) {
    case 'opened':
    case 'ready_for_review':
      if (!existingPR) {
        await prisma.gitHubPullRequest.create({
          data: {
            repositoryId: linkedRepo.id,
            prNumber: pr.number,
            prId: BigInt(pr.id),
            title: pr.title,
            state: prState,
            headBranch: pr.head.ref,
            baseBranch: pr.base.ref,
            authorLogin: pr.user.login,
          },
        })
        console.log(`[GitHub Webhook] Created GitHubPullRequest record for #${pr.number}`)
      }
      break

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

  return { processed: true, action: action || 'unknown', prNumber: pr.number }
}

/**
 * Handle push events (commits)
 */
async function handlePush(ctx: WebhookContext): Promise<{ processed: boolean; commitCount: number }> {
  const { payload } = ctx
  const commits = payload.commits || []
  const repo = payload.repository
  const ref = payload.ref

  if (!repo || commits.length === 0) {
    return { processed: false, commitCount: 0 }
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
    return { processed: false, commitCount: commits.length }
  }

  // Check sync settings
  const syncSettings = linkedRepo.syncSettings as { commits?: { enabled: boolean } } | null
  if (!syncSettings?.commits?.enabled) {
    return { processed: false, commitCount: commits.length }
  }

  // Process each commit
  let processedCount = 0
  for (const commit of commits) {
    // Check if commit already exists
    const existingCommit = await prisma.gitHubCommit.findUnique({
      where: {
        repositoryId_sha: {
          repositoryId: linkedRepo.id,
          sha: commit.id,
        },
      },
    })

    if (!existingCommit) {
      await prisma.gitHubCommit.create({
        data: {
          repositoryId: linkedRepo.id,
          sha: commit.id,
          message: commit.message,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          authorLogin: commit.author.username || null,
          committedAt: new Date(commit.timestamp),
        },
      })
      processedCount++
    }
  }

  if (processedCount > 0) {
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
        },
        status: 'success',
      },
    })
  }

  console.log(`[GitHub Webhook] Processed ${processedCount}/${commits.length} commits`)
  return { processed: true, commitCount: processedCount }
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
