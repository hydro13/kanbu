/*
 * GitHub Analytics Service
 * Version: 1.0.0
 *
 * Provides analytics and insights from GitHub data.
 * Calculates cycle time, review metrics, and contributor statistics.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 13 - Analytics & Insights
 * =============================================================================
 */

import { prisma } from '../../lib/prisma'

// =============================================================================
// Types
// =============================================================================

export interface DateRange {
  from: Date
  to: Date
}

export interface CycleTimeStats {
  averageDays: number
  medianDays: number
  minDays: number
  maxDays: number
  totalCompleted: number
  byWeek: Array<{
    weekStart: Date
    averageDays: number
    count: number
  }>
}

export interface LeadTimeByColumn {
  columnName: string
  averageHours: number
  medianHours: number
  taskCount: number
}

export interface ReviewTimeStats {
  averageHoursToFirstReview: number
  averageHoursToApproval: number
  averageReviewsPerPR: number
  averageCommentsPerReview: number
  totalPRsReviewed: number
}

export interface ContributorStats {
  login: string
  commits: number
  prsOpened: number
  prsMerged: number
  reviewsGiven: number
  commentsGiven: number
  issuesLinked: number
}

export interface ThroughputStats {
  period: string
  periodStart: Date
  tasksCompleted: number
  prsMerged: number
  issuesClosed: number
}

export interface ProjectAnalytics {
  cycleTime: CycleTimeStats
  reviewTime: ReviewTimeStats
  contributors: ContributorStats[]
  throughput: ThroughputStats[]
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
}

function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// =============================================================================
// Cycle Time Analytics
// =============================================================================

/**
 * Get cycle time statistics for a project.
 * Cycle time = time from task creation to PR merge (or task completion)
 */
export async function getCycleTimeStats(
  projectId: number,
  dateRange?: DateRange
): Promise<CycleTimeStats> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
  })

  if (!repo) {
    return {
      averageDays: 0,
      medianDays: 0,
      minDays: 0,
      maxDays: 0,
      totalCompleted: 0,
      byWeek: [],
    }
  }

  // Get all merged PRs with linked tasks
  const mergedPRs = await prisma.gitHubPullRequest.findMany({
    where: {
      repositoryId: repo.id,
      state: 'merged',
      mergedAt: dateRange
        ? { gte: dateRange.from, lte: dateRange.to }
        : undefined,
      taskId: { not: null },
    },
    include: {
      task: {
        select: {
          createdAt: true,
        },
      },
    },
  })

  if (mergedPRs.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      minDays: 0,
      maxDays: 0,
      totalCompleted: 0,
      byWeek: [],
    }
  }

  // Calculate cycle times
  const cycleTimes: Array<{ days: number; mergedAt: Date }> = []

  for (const pr of mergedPRs) {
    if (pr.task && pr.mergedAt) {
      const days = daysBetween(pr.task.createdAt, pr.mergedAt)
      if (days >= 0) {
        cycleTimes.push({ days, mergedAt: pr.mergedAt })
      }
    }
  }

  if (cycleTimes.length === 0) {
    return {
      averageDays: 0,
      medianDays: 0,
      minDays: 0,
      maxDays: 0,
      totalCompleted: 0,
      byWeek: [],
    }
  }

  const dayValues = cycleTimes.map((ct) => ct.days)
  const averageDays = dayValues.reduce((a, b) => a + b, 0) / dayValues.length
  const medianDays = calculateMedian(dayValues)
  const minDays = Math.min(...dayValues)
  const maxDays = Math.max(...dayValues)

  // Group by week
  const byWeekMap = new Map<string, { total: number; count: number }>()
  for (const ct of cycleTimes) {
    const weekStart = getWeekStart(ct.mergedAt)
    const key = weekStart.toISOString()
    const existing = byWeekMap.get(key) ?? { total: 0, count: 0 }
    existing.total += ct.days
    existing.count += 1
    byWeekMap.set(key, existing)
  }

  const byWeek = Array.from(byWeekMap.entries())
    .map(([key, value]) => ({
      weekStart: new Date(key),
      averageDays: value.total / value.count,
      count: value.count,
    }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())

  return {
    averageDays: Math.round(averageDays * 10) / 10,
    medianDays: Math.round(medianDays * 10) / 10,
    minDays: Math.round(minDays * 10) / 10,
    maxDays: Math.round(maxDays * 10) / 10,
    totalCompleted: cycleTimes.length,
    byWeek,
  }
}

// =============================================================================
// Review Time Analytics
// =============================================================================

/**
 * Get code review time statistics for a project.
 */
export async function getReviewTimeStats(
  projectId: number,
  dateRange?: DateRange
): Promise<ReviewTimeStats> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
  })

  if (!repo) {
    return {
      averageHoursToFirstReview: 0,
      averageHoursToApproval: 0,
      averageReviewsPerPR: 0,
      averageCommentsPerReview: 0,
      totalPRsReviewed: 0,
    }
  }

  // Get PRs with reviews
  const prsWithReviews = await prisma.gitHubPullRequest.findMany({
    where: {
      repositoryId: repo.id,
      createdAt: dateRange
        ? { gte: dateRange.from, lte: dateRange.to }
        : undefined,
    },
    include: {
      reviews: {
        orderBy: { submittedAt: 'asc' },
        include: {
          comments: true,
        },
      },
    },
  })

  if (prsWithReviews.length === 0) {
    return {
      averageHoursToFirstReview: 0,
      averageHoursToApproval: 0,
      averageReviewsPerPR: 0,
      averageCommentsPerReview: 0,
      totalPRsReviewed: 0,
    }
  }

  const hoursToFirstReview: number[] = []
  const hoursToApproval: number[] = []
  let totalReviews = 0
  let totalComments = 0
  let prsWithReviewCount = 0

  for (const pr of prsWithReviews) {
    if (pr.reviews.length === 0) continue

    prsWithReviewCount++
    totalReviews += pr.reviews.length

    // Time to first review
    const firstReview = pr.reviews[0]
    if (firstReview?.submittedAt) {
      const hours = hoursBetween(pr.createdAt, firstReview.submittedAt)
      if (hours >= 0) {
        hoursToFirstReview.push(hours)
      }
    }

    // Time to approval
    const approvalReview = pr.reviews.find((r) => r.state === 'APPROVED')
    if (approvalReview?.submittedAt) {
      const hours = hoursBetween(pr.createdAt, approvalReview.submittedAt)
      if (hours >= 0) {
        hoursToApproval.push(hours)
      }
    }

    // Count comments
    for (const review of pr.reviews) {
      totalComments += review.comments.length
    }
  }

  return {
    averageHoursToFirstReview:
      hoursToFirstReview.length > 0
        ? Math.round(
            (hoursToFirstReview.reduce((a, b) => a + b, 0) /
              hoursToFirstReview.length) *
              10
          ) / 10
        : 0,
    averageHoursToApproval:
      hoursToApproval.length > 0
        ? Math.round(
            (hoursToApproval.reduce((a, b) => a + b, 0) /
              hoursToApproval.length) *
              10
          ) / 10
        : 0,
    averageReviewsPerPR:
      prsWithReviewCount > 0
        ? Math.round((totalReviews / prsWithReviewCount) * 10) / 10
        : 0,
    averageCommentsPerReview:
      totalReviews > 0
        ? Math.round((totalComments / totalReviews) * 10) / 10
        : 0,
    totalPRsReviewed: prsWithReviewCount,
  }
}

// =============================================================================
// Contributor Statistics
// =============================================================================

/**
 * Get contributor statistics for a project.
 */
export async function getContributorStats(
  projectId: number,
  dateRange?: DateRange
): Promise<ContributorStats[]> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
  })

  if (!repo) {
    return []
  }

  const dateFilter = dateRange
    ? { gte: dateRange.from, lte: dateRange.to }
    : undefined

  // Get commits by author
  const commits = await prisma.gitHubCommit.groupBy({
    by: ['authorLogin'],
    where: {
      repositoryId: repo.id,
      committedAt: dateFilter,
      authorLogin: { not: null },
    },
    _count: { id: true },
  })

  // Get PRs opened by author
  const prsOpened = await prisma.gitHubPullRequest.groupBy({
    by: ['authorLogin'],
    where: {
      repositoryId: repo.id,
      createdAt: dateFilter,
    },
    _count: { id: true },
  })

  // Get PRs merged by author
  const prsMerged = await prisma.gitHubPullRequest.groupBy({
    by: ['authorLogin'],
    where: {
      repositoryId: repo.id,
      state: 'merged',
      mergedAt: dateFilter,
    },
    _count: { id: true },
  })

  // Get reviews by author
  const reviews = await prisma.gitHubReview.groupBy({
    by: ['authorLogin'],
    where: {
      pullRequest: {
        repositoryId: repo.id,
      },
      submittedAt: dateFilter,
    },
    _count: { id: true },
  })

  // Get review comments by author
  const comments = await prisma.gitHubReviewComment.groupBy({
    by: ['authorLogin'],
    where: {
      review: {
        pullRequest: {
          repositoryId: repo.id,
        },
      },
      createdAt: dateFilter,
    },
    _count: { id: true },
  })

  // Combine all stats
  const statsMap = new Map<string, ContributorStats>()

  const getOrCreate = (login: string): ContributorStats => {
    let stats = statsMap.get(login)
    if (!stats) {
      stats = {
        login,
        commits: 0,
        prsOpened: 0,
        prsMerged: 0,
        reviewsGiven: 0,
        commentsGiven: 0,
        issuesLinked: 0,
      }
      statsMap.set(login, stats)
    }
    return stats
  }

  for (const c of commits) {
    if (c.authorLogin) {
      getOrCreate(c.authorLogin).commits = c._count.id
    }
  }

  for (const p of prsOpened) {
    getOrCreate(p.authorLogin).prsOpened = p._count.id
  }

  for (const p of prsMerged) {
    getOrCreate(p.authorLogin).prsMerged = p._count.id
  }

  for (const r of reviews) {
    getOrCreate(r.authorLogin).reviewsGiven = r._count.id
  }

  for (const c of comments) {
    getOrCreate(c.authorLogin).commentsGiven = c._count.id
  }

  // Sort by total activity
  return Array.from(statsMap.values()).sort((a, b) => {
    const aTotal =
      a.commits + a.prsOpened + a.prsMerged + a.reviewsGiven + a.commentsGiven
    const bTotal =
      b.commits + b.prsOpened + b.prsMerged + b.reviewsGiven + b.commentsGiven
    return bTotal - aTotal
  })
}

// =============================================================================
// Throughput Statistics
// =============================================================================

/**
 * Get throughput statistics (tasks/PRs completed per period).
 */
export async function getThroughputStats(
  projectId: number,
  periodType: 'week' | 'month' = 'week',
  dateRange?: DateRange
): Promise<ThroughputStats[]> {
  const repo = await prisma.gitHubRepository.findFirst({
    where: { projectId },
  })

  if (!repo) {
    return []
  }

  // Default to last 12 weeks/months if no range specified
  const now = new Date()
  const defaultFrom = new Date(now)
  if (periodType === 'week') {
    defaultFrom.setDate(defaultFrom.getDate() - 84) // 12 weeks
  } else {
    defaultFrom.setMonth(defaultFrom.getMonth() - 12)
  }

  const from = dateRange?.from ?? defaultFrom
  const to = dateRange?.to ?? now

  // Get merged PRs
  const mergedPRs = await prisma.gitHubPullRequest.findMany({
    where: {
      repositoryId: repo.id,
      state: 'merged',
      mergedAt: { gte: from, lte: to },
    },
    select: {
      mergedAt: true,
      taskId: true,
    },
  })

  // Get closed issues
  const closedIssues = await prisma.gitHubIssue.findMany({
    where: {
      repositoryId: repo.id,
      state: 'closed',
      updatedAt: { gte: from, lte: to },
    },
    select: {
      updatedAt: true,
    },
  })

  // Group by period
  const getPeriodKey = (date: Date): string => {
    if (periodType === 'week') {
      const weekStart = getWeekStart(date)
      return weekStart.toISOString().split('T')[0]!
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    }
  }

  const statsMap = new Map<
    string,
    { tasksCompleted: number; prsMerged: number; issuesClosed: number }
  >()

  for (const pr of mergedPRs) {
    if (pr.mergedAt) {
      const key = getPeriodKey(pr.mergedAt)
      const existing = statsMap.get(key) ?? {
        tasksCompleted: 0,
        prsMerged: 0,
        issuesClosed: 0,
      }
      existing.prsMerged++
      if (pr.taskId) {
        existing.tasksCompleted++
      }
      statsMap.set(key, existing)
    }
  }

  for (const issue of closedIssues) {
    const key = getPeriodKey(issue.updatedAt)
    const existing = statsMap.get(key) ?? {
      tasksCompleted: 0,
      prsMerged: 0,
      issuesClosed: 0,
    }
    existing.issuesClosed++
    statsMap.set(key, existing)
  }

  return Array.from(statsMap.entries())
    .map(([key, value]) => ({
      period: periodType,
      periodStart: new Date(key),
      ...value,
    }))
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime())
}

// =============================================================================
// Combined Project Analytics
// =============================================================================

/**
 * Get all analytics for a project in one call.
 */
export async function getProjectAnalytics(
  projectId: number,
  dateRange?: DateRange
): Promise<ProjectAnalytics> {
  const [cycleTime, reviewTime, contributors, throughput] = await Promise.all([
    getCycleTimeStats(projectId, dateRange),
    getReviewTimeStats(projectId, dateRange),
    getContributorStats(projectId, dateRange),
    getThroughputStats(projectId, 'week', dateRange),
  ])

  return {
    cycleTime,
    reviewTime,
    contributors,
    throughput,
  }
}

// =============================================================================
// Export service object
// =============================================================================

export const analyticsService = {
  getCycleTimeStats,
  getReviewTimeStats,
  getContributorStats,
  getThroughputStats,
  getProjectAnalytics,
}
