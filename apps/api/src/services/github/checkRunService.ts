/*
 * Check Run Service
 * Version: 1.0.0
 *
 * Service for tracking GitHub check runs (CI/CD test results).
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10B - Extended CI/CD
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'

// =============================================================================
// Types
// =============================================================================

export type CheckRunStatus = 'queued' | 'in_progress' | 'completed'

export type CheckRunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'stale'

export interface CheckRunData {
  repositoryId: number
  pullRequestId?: number | null
  checkRunId: bigint
  name: string
  headSha: string
  status: CheckRunStatus
  conclusion?: CheckRunConclusion | null
  startedAt?: Date | null
  completedAt?: Date | null
  outputTitle?: string | null
  outputSummary?: string | null
}

export interface CheckRunInfo {
  id: number
  repositoryId: number
  pullRequestId: number | null
  checkRunId: bigint
  name: string
  headSha: string
  status: string
  conclusion: string | null
  startedAt: Date | null
  completedAt: Date | null
  outputTitle: string | null
  outputSummary: string | null
  createdAt: Date
}

export interface CheckRunStats {
  total: number
  byStatus: Record<string, number>
  byConclusion: Record<string, number>
  byName: Record<string, { total: number; passed: number; failed: number }>
  passRate: number
  avgDuration: number | null
}

export interface PRCheckSummary {
  pullRequestId: number
  total: number
  passed: number
  failed: number
  pending: number
  checkRuns: CheckRunInfo[]
}

// =============================================================================
// Check Run CRUD
// =============================================================================

/**
 * Create or update a check run
 */
export async function upsertCheckRun(data: CheckRunData): Promise<CheckRunInfo> {
  const checkRun = await prisma.gitHubCheckRun.upsert({
    where: {
      repositoryId_checkRunId: {
        repositoryId: data.repositoryId,
        checkRunId: data.checkRunId,
      },
    },
    create: {
      repositoryId: data.repositoryId,
      pullRequestId: data.pullRequestId,
      checkRunId: data.checkRunId,
      name: data.name,
      headSha: data.headSha,
      status: data.status,
      conclusion: data.conclusion,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      outputTitle: data.outputTitle,
      outputSummary: data.outputSummary,
    },
    update: {
      pullRequestId: data.pullRequestId,
      name: data.name,
      headSha: data.headSha,
      status: data.status,
      conclusion: data.conclusion,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      outputTitle: data.outputTitle,
      outputSummary: data.outputSummary,
    },
  })

  return checkRun
}

/**
 * Get check run by ID
 */
export async function getCheckRun(
  repositoryId: number,
  checkRunId: bigint
): Promise<CheckRunInfo | null> {
  return prisma.gitHubCheckRun.findUnique({
    where: {
      repositoryId_checkRunId: {
        repositoryId,
        checkRunId,
      },
    },
  })
}

/**
 * Get check runs for a commit SHA
 */
export async function getCheckRunsForCommit(
  repositoryId: number,
  headSha: string
): Promise<CheckRunInfo[]> {
  return prisma.gitHubCheckRun.findMany({
    where: { repositoryId, headSha },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get check runs for a pull request
 */
export async function getCheckRunsForPR(
  pullRequestId: number
): Promise<CheckRunInfo[]> {
  return prisma.gitHubCheckRun.findMany({
    where: { pullRequestId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get PR check summary
 */
export async function getPRCheckSummary(
  pullRequestId: number
): Promise<PRCheckSummary> {
  const checkRuns = await prisma.gitHubCheckRun.findMany({
    where: { pullRequestId },
    orderBy: { createdAt: 'desc' },
  })

  // Get latest check run per name
  const latestByName = new Map<string, CheckRunInfo>()
  for (const run of checkRuns) {
    if (!latestByName.has(run.name)) {
      latestByName.set(run.name, run)
    }
  }

  const latest = Array.from(latestByName.values())

  const passed = latest.filter((r) => r.conclusion === 'success').length
  const failed = latest.filter((r) =>
    ['failure', 'timed_out', 'cancelled'].includes(r.conclusion || '')
  ).length
  const pending = latest.filter(
    (r) => r.status !== 'completed' || r.conclusion === null
  ).length

  return {
    pullRequestId,
    total: latest.length,
    passed,
    failed,
    pending,
    checkRuns: latest,
  }
}

/**
 * Get check run statistics for a repository
 */
export async function getCheckRunStats(
  repositoryId: number,
  options?: { days?: number }
): Promise<CheckRunStats> {
  const { days = 30 } = options || {}

  const since = new Date()
  since.setDate(since.getDate() - days)

  const checkRuns = await prisma.gitHubCheckRun.findMany({
    where: {
      repositoryId,
      createdAt: { gte: since },
    },
  })

  const byStatus: Record<string, number> = {}
  const byConclusion: Record<string, number> = {}
  const byName: Record<string, { total: number; passed: number; failed: number }> = {}

  let totalDuration = 0
  let durationCount = 0

  for (const run of checkRuns) {
    byStatus[run.status] = (byStatus[run.status] || 0) + 1

    if (run.conclusion) {
      byConclusion[run.conclusion] = (byConclusion[run.conclusion] || 0) + 1
    }

    if (!byName[run.name]) {
      byName[run.name] = { total: 0, passed: 0, failed: 0 }
    }
    const nameStats = byName[run.name]!
    nameStats.total++
    if (run.conclusion === 'success') nameStats.passed++
    if (['failure', 'timed_out'].includes(run.conclusion || '')) {
      nameStats.failed++
    }

    if (run.startedAt && run.completedAt) {
      totalDuration += run.completedAt.getTime() - run.startedAt.getTime()
      durationCount++
    }
  }

  const completedRuns = checkRuns.filter((r) => r.status === 'completed')
  const passedRuns = completedRuns.filter((r) => r.conclusion === 'success')

  return {
    total: checkRuns.length,
    byStatus,
    byConclusion,
    byName,
    passRate:
      completedRuns.length > 0
        ? (passedRuns.length / completedRuns.length) * 100
        : 0,
    avgDuration: durationCount > 0 ? totalDuration / durationCount : null,
  }
}

/**
 * Get test trends over time
 */
export async function getTestTrends(
  repositoryId: number,
  options?: { weeks?: number }
): Promise<Array<{ week: string; total: number; passed: number; failed: number }>> {
  const { weeks = 8 } = options || {}

  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const checkRuns = await prisma.gitHubCheckRun.findMany({
    where: {
      repositoryId,
      createdAt: { gte: since },
      status: 'completed',
    },
    orderBy: { createdAt: 'asc' },
  })

  // Group by week
  const weekData = new Map<
    string,
    { total: number; passed: number; failed: number }
  >()

  for (const run of checkRuns) {
    const weekStart = getWeekStart(run.createdAt)
    const weekKey = weekStart.toISOString().slice(0, 10)

    if (!weekData.has(weekKey)) {
      weekData.set(weekKey, { total: 0, passed: 0, failed: 0 })
    }

    const data = weekData.get(weekKey)!
    data.total++
    if (run.conclusion === 'success') data.passed++
    if (['failure', 'timed_out'].includes(run.conclusion || '')) {
      data.failed++
    }
  }

  return Array.from(weekData.entries()).map(([week, data]) => ({
    week,
    ...data,
  }))
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// =============================================================================
// Webhook Processing
// =============================================================================

export interface CheckRunWebhookPayload {
  action: 'created' | 'completed' | 'rerequested' | 'requested_action'
  check_run: {
    id: number
    name: string
    head_sha: string
    status: CheckRunStatus
    conclusion: CheckRunConclusion | null
    started_at: string | null
    completed_at: string | null
    output: {
      title: string | null
      summary: string | null
    } | null
    pull_requests: Array<{ number: number }>
  }
  repository: {
    id: number
    full_name: string
  }
}

/**
 * Process check_run webhook event
 */
export async function processCheckRunWebhook(
  payload: CheckRunWebhookPayload
): Promise<CheckRunInfo | null> {
  // Find repository by GitHub repo ID
  const repo = await prisma.gitHubRepository.findFirst({
    where: { repoId: BigInt(payload.repository.id) },
  })

  if (!repo) {
    return null
  }

  // Find associated PR if any
  let pullRequestId: number | null = null
  const firstPR = payload.check_run.pull_requests[0]
  if (firstPR) {
    const prNumber = firstPR.number
    const pr = await prisma.gitHubPullRequest.findUnique({
      where: {
        repositoryId_prNumber: {
          repositoryId: repo.id,
          prNumber,
        },
      },
    })
    pullRequestId = pr?.id ?? null
  }

  return upsertCheckRun({
    repositoryId: repo.id,
    pullRequestId,
    checkRunId: BigInt(payload.check_run.id),
    name: payload.check_run.name,
    headSha: payload.check_run.head_sha,
    status: payload.check_run.status,
    conclusion: payload.check_run.conclusion,
    startedAt: payload.check_run.started_at
      ? new Date(payload.check_run.started_at)
      : null,
    completedAt: payload.check_run.completed_at
      ? new Date(payload.check_run.completed_at)
      : null,
    outputTitle: payload.check_run.output?.title,
    outputSummary: payload.check_run.output?.summary,
  })
}

// =============================================================================
// Service Export
// =============================================================================

export const checkRunService = {
  upsertCheckRun,
  getCheckRun,
  getCheckRunsForCommit,
  getCheckRunsForPR,
  getPRCheckSummary,
  getCheckRunStats,
  getTestTrends,
  processCheckRunWebhook,
}

export default checkRunService
