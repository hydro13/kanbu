/*
 * WorkloadChart Component
 * Version: 1.0.0
 *
 * Tasks per team member with capacity indicators.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 3d59206c-e50d-43c8-b768-d87acc7d559f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Loader2, Info, AlertCircle, User } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface TeamMember {
  userId: number
  username: string
  name: string
  avatarUrl: string | null
  totalTasks: number
  overdueCount: number
  byPriority: Array<{ priority: number; count: number }>
  timeEstimated: number
  timeSpent: number
}

interface WorkloadData {
  teamMembers: TeamMember[]
  unassignedTasks: number
  avgTasksPerPerson: number
  totalTeamMembers: number
}

export interface WorkloadChartProps {
  data: WorkloadData | undefined
  isLoading: boolean
}

// =============================================================================
// Helpers
// =============================================================================

const priorityColors: Record<number, string> = {
  0: 'bg-gray-400',
  1: 'bg-blue-500',
  2: 'bg-orange-500',
  3: 'bg-red-500',
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`
  return `${Math.round(hours / 24)}d`
}

// =============================================================================
// Component
// =============================================================================

export function WorkloadChart({ data, isLoading }: WorkloadChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!data || data.teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <Info className="w-5 h-5 mr-2" />
        No team members with assigned tasks
      </div>
    )
  }

  const maxTasks = Math.max(...data.teamMembers.map((m) => m.totalTasks), 1)

  return (
    <div>
      {/* Summary Stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Team Size:</span>
          <span className="ml-1.5 font-medium text-gray-900 dark:text-white">
            {data.totalTeamMembers} members
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Avg Tasks:</span>
          <span className="ml-1.5 font-medium text-gray-900 dark:text-white">
            {data.avgTasksPerPerson} per person
          </span>
        </div>
        {data.unassignedTasks > 0 && (
          <div className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs font-medium text-yellow-700 dark:text-yellow-400">
            {data.unassignedTasks} unassigned
          </div>
        )}
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.teamMembers.map((member) => {
          const workloadPercent = (member.totalTasks / maxTasks) * 100
          const isOverloaded = member.totalTasks > data.avgTasksPerPerson * 1.5
          const hasOverdue = member.overdueCount > 0

          return (
            <div
              key={member.userId}
              className={`p-4 rounded-lg border ${
                isOverloaded
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {/* Member Header */}
              <div className="flex items-center gap-3 mb-3">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{member.username}
                  </p>
                </div>
                {isOverloaded && (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>

              {/* Task Count */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {member.totalTasks}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">tasks</span>
              </div>

              {/* Workload Bar */}
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full ${
                    isOverloaded ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${workloadPercent}%` }}
                />
              </div>

              {/* Priority Breakdown */}
              <div className="flex items-center gap-1 mb-2">
                {[3, 2, 1, 0].map((priority) => {
                  const count = member.byPriority.find((p) => p.priority === priority)?.count ?? 0
                  if (count === 0) return null
                  return (
                    <div
                      key={priority}
                      className={`px-1.5 py-0.5 rounded text-xs text-white font-medium ${priorityColors[priority]}`}
                    >
                      {count}
                    </div>
                  )
                })}
              </div>

              {/* Footer Stats */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  Est: {formatHours(member.timeEstimated)}
                </span>
                <span>
                  Spent: {formatHours(member.timeSpent)}
                </span>
                {hasOverdue && (
                  <span className="text-red-500 font-medium">
                    {member.overdueCount} overdue
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Unassigned Card */}
        {data.unassignedTasks > 0 && (
          <div className="p-4 rounded-lg border border-dashed border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Unassigned
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No assignee
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {data.unassignedTasks}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">tasks</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkloadChart
