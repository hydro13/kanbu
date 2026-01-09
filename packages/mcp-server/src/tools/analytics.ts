/*
 * Analytics Tools
 * Version: 1.0.0
 *
 * MCP tools for project analytics and insights.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: MCP Fase 5 - Analytics & Insights
 * ═══════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { requireAuth, client, success } from '../tools.js'

// =============================================================================
// Types
// =============================================================================

interface ProjectStatsResponse {
  totalTasks: number
  openTasks: number
  closedTasks: number
  completionRate: number
  trend: number
  recentCompletions: number
  tasksByPriority: Array<{ priority: string; count: number }>
  tasksByColumn: Array<{ columnId: number; columnName: string; count: number }>
  timeEstimated: number
  timeSpent: number
}

interface VelocityDataPoint {
  weekStart: string
  tasksCompleted: number
  pointsCompleted: number
}

interface VelocityResponse {
  dataPoints: VelocityDataPoint[]
  avgVelocity: number
  totalCompleted: number
}

interface CycleTimeColumn {
  columnId: number
  columnName: string
  position: number
  avgHours: number
  avgDays: number
  taskCount: number
}

interface CycleTimeResponse {
  cycleTimeByColumn: CycleTimeColumn[]
  bottleneck: CycleTimeColumn | null
  avgTotalCycleHours: number
  avgTotalCycleDays: number
  completedTasksAnalyzed: number
}

interface TeamMemberWorkload {
  userId: number
  username: string
  name: string
  totalTasks: number
  overdueCount: number
  byPriority: Array<{ priority: string; count: number }>
  timeEstimated: number
  timeSpent: number
}

interface TeamWorkloadResponse {
  teamMembers: TeamMemberWorkload[]
  unassignedTasks: number
  avgTasksPerPerson: number
  totalTeamMembers: number
}

// =============================================================================
// Schemas
// =============================================================================

export const ProjectStatsSchema = z.object({
  projectId: z.number().describe('Project ID'),
  dateFrom: z.string().optional().describe('Start date (ISO format, optional)'),
  dateTo: z.string().optional().describe('End date (ISO format, optional)'),
})

export const VelocitySchema = z.object({
  projectId: z.number().describe('Project ID'),
  weeks: z.number().optional().describe('Number of weeks to analyze (default: 8, max: 52)'),
})

export const CycleTimeSchema = z.object({
  projectId: z.number().describe('Project ID'),
})

export const TeamWorkloadSchema = z.object({
  projectId: z.number().describe('Project ID'),
})

// =============================================================================
// Tool Definitions
// =============================================================================

export const analyticsToolDefinitions = [
  {
    name: 'kanbu_project_stats',
    description:
      'Get project statistics: task counts, completion rate, trends, time tracking, and distribution by priority/column.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        dateFrom: {
          type: 'string',
          description: 'Start date (ISO format, optional)',
        },
        dateTo: {
          type: 'string',
          description: 'End date (ISO format, optional)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_velocity',
    description:
      'Get team velocity: tasks completed per week over time, with rolling average.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
        weeks: {
          type: 'number',
          description: 'Number of weeks to analyze (default: 8)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_cycle_time',
    description:
      'Get cycle time analysis: average time tasks spend in each column, bottleneck identification.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'kanbu_team_workload',
    description:
      'Get team workload distribution: tasks per team member, overdue counts, unassigned tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'Project ID',
        },
      },
      required: ['projectId'],
    },
  },
]

// =============================================================================
// Helpers
// =============================================================================

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`
  const days = Math.round((hours / 24) * 10) / 10
  return `${days}d`
}

function formatTrend(trend: number): string {
  if (trend > 0) return `+${trend} (improving)`
  if (trend < 0) return `${trend} (declining)`
  return '0 (stable)'
}

function priorityEmoji(priority: string): string {
  switch (priority) {
    case 'URGENT':
      return '!!'
    case 'HIGH':
      return '!'
    case 'MEDIUM':
      return '-'
    case 'LOW':
      return '.'
    default:
      return '-'
  }
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * Get project statistics
 */
export async function handleProjectStats(args: unknown) {
  const input = ProjectStatsSchema.parse(args)
  const config = requireAuth()

  const stats = await client.call<ProjectStatsResponse>(
    config.kanbuUrl,
    config.token,
    'analytics.getProjectStats',
    {
      projectId: input.projectId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    }
  )

  const lines: string[] = ['Project Statistics', '']

  // Overview
  lines.push('== Overview ==')
  lines.push(`Total Tasks: ${stats.totalTasks}`)
  lines.push(`  Open: ${stats.openTasks}`)
  lines.push(`  Closed: ${stats.closedTasks}`)
  lines.push(`Completion Rate: ${stats.completionRate}%`)
  lines.push(`Recent Trend: ${formatTrend(stats.trend)}`)
  lines.push(`Completions (7 days): ${stats.recentCompletions}`)
  lines.push('')

  // Time tracking
  if (stats.timeEstimated > 0 || stats.timeSpent > 0) {
    lines.push('== Time Tracking ==')
    lines.push(`Estimated: ${formatHours(stats.timeEstimated)}`)
    lines.push(`Spent: ${formatHours(stats.timeSpent)}`)
    if (stats.timeEstimated > 0) {
      const efficiency = Math.round((stats.timeSpent / stats.timeEstimated) * 100)
      lines.push(`Efficiency: ${efficiency}%`)
    }
    lines.push('')
  }

  // By priority
  if (stats.tasksByPriority.length > 0) {
    lines.push('== By Priority ==')
    stats.tasksByPriority.forEach((p) => {
      lines.push(`  ${priorityEmoji(p.priority)} ${p.priority}: ${p.count}`)
    })
    lines.push('')
  }

  // By column
  if (stats.tasksByColumn.length > 0) {
    lines.push('== By Column (Active Tasks) ==')
    stats.tasksByColumn.forEach((c) => {
      lines.push(`  ${c.columnName}: ${c.count}`)
    })
  }

  return success(lines.join('\n'))
}

/**
 * Get velocity data
 */
export async function handleVelocity(args: unknown) {
  const input = VelocitySchema.parse(args)
  const config = requireAuth()

  const velocity = await client.call<VelocityResponse>(
    config.kanbuUrl,
    config.token,
    'analytics.getVelocity',
    {
      projectId: input.projectId,
      weeks: input.weeks ?? 8,
    }
  )

  if (velocity.totalCompleted === 0) {
    return success('No completed tasks found in the analysis period.')
  }

  const lines: string[] = [
    `Velocity Report (${velocity.dataPoints.length} weeks)`,
    '',
    `Average Velocity: ${velocity.avgVelocity} tasks/week`,
    `Total Completed: ${velocity.totalCompleted} tasks`,
    '',
    '== Weekly Breakdown ==',
  ]

  // Show data points as a simple bar chart
  const maxTasks = Math.max(...velocity.dataPoints.map((d) => d.tasksCompleted), 1)

  velocity.dataPoints.forEach((point) => {
    const barLength = Math.round((point.tasksCompleted / maxTasks) * 20)
    const bar = '#'.repeat(barLength) + '.'.repeat(20 - barLength)
    lines.push(`${point.weekStart}: [${bar}] ${point.tasksCompleted} tasks`)
  })

  return success(lines.join('\n'))
}

/**
 * Get cycle time analysis
 */
export async function handleCycleTime(args: unknown) {
  const input = CycleTimeSchema.parse(args)
  const config = requireAuth()

  const cycleTime = await client.call<CycleTimeResponse>(
    config.kanbuUrl,
    config.token,
    'analytics.getCycleTime',
    { projectId: input.projectId }
  )

  const lines: string[] = ['Cycle Time Analysis', '']

  // Overview
  lines.push('== Overall ==')
  lines.push(`Average Total Cycle Time: ${formatHours(cycleTime.avgTotalCycleHours)}`)
  lines.push(`Tasks Analyzed: ${cycleTime.completedTasksAnalyzed}`)
  lines.push('')

  // Bottleneck
  if (cycleTime.bottleneck) {
    lines.push('== Bottleneck ==')
    lines.push(`Column: ${cycleTime.bottleneck.columnName}`)
    lines.push(`Average Time: ${formatHours(cycleTime.bottleneck.avgHours)}`)
    lines.push('')
  }

  // By column
  if (cycleTime.cycleTimeByColumn.length > 0) {
    lines.push('== Time per Column ==')
    cycleTime.cycleTimeByColumn.forEach((col) => {
      const isBottleneck = cycleTime.bottleneck?.columnId === col.columnId ? ' <-- BOTTLENECK' : ''
      lines.push(`  ${col.columnName}: ${formatHours(col.avgHours)} avg (${col.taskCount} tasks)${isBottleneck}`)
    })
  }

  return success(lines.join('\n'))
}

/**
 * Get team workload
 */
export async function handleTeamWorkload(args: unknown) {
  const input = TeamWorkloadSchema.parse(args)
  const config = requireAuth()

  const workload = await client.call<TeamWorkloadResponse>(
    config.kanbuUrl,
    config.token,
    'analytics.getTeamWorkload',
    { projectId: input.projectId }
  )

  const lines: string[] = ['Team Workload', '']

  // Overview
  lines.push('== Overview ==')
  lines.push(`Team Members: ${workload.totalTeamMembers}`)
  lines.push(`Avg Tasks/Person: ${workload.avgTasksPerPerson}`)
  lines.push(`Unassigned Tasks: ${workload.unassignedTasks}`)
  lines.push('')

  // Per member
  if (workload.teamMembers.length > 0) {
    lines.push('== Workload per Member ==')
    workload.teamMembers.forEach((member) => {
      const overdue = member.overdueCount > 0 ? ` (${member.overdueCount} overdue!)` : ''
      lines.push(`${member.name}: ${member.totalTasks} tasks${overdue}`)

      // Show priority breakdown if any tasks
      if (member.byPriority.length > 0) {
        const priorityStr = member.byPriority
          .map((p) => `${priorityEmoji(p.priority)}${p.count}`)
          .join(' ')
        lines.push(`  Priority: ${priorityStr}`)
      }

      // Show time tracking if any
      if (member.timeEstimated > 0 || member.timeSpent > 0) {
        lines.push(`  Time: ${formatHours(member.timeSpent)}/${formatHours(member.timeEstimated)}`)
      }
    })
  }

  return success(lines.join('\n'))
}
