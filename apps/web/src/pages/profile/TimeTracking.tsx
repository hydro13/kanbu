/*
 * TimeTracking Page
 * Version: 1.1.0
 *
 * User profile page showing time tracking data across all projects.
 * Compact layout with smaller stat cards and tighter spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Helper Functions
// =============================================================================

function formatHours(hours: number): string {
  if (hours === 0) return '0h'
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}m`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// =============================================================================
// Component
// =============================================================================

export function TimeTracking() {
  const { data, isLoading } = trpc.user.getTimeTracking.useQuery({})

  if (isLoading) {
    return (
      <ProfileLayout title="Time Tracking" description="Overview of your logged hours">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    )
  }

  if (!data) {
    return (
      <ProfileLayout title="Time Tracking" description="Overview of your logged hours">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No time tracking data</p>
        </div>
      </ProfileLayout>
    )
  }

  const efficiency = data.totalEstimated > 0
    ? Math.round((data.totalSpent / data.totalEstimated) * 100)
    : 0

  return (
    <ProfileLayout title="Time Tracking" description="Overview of your logged hours">
      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-card rounded-card border border-border p-3 text-center">
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatHours(data.totalSpent)}</p>
          <p className="text-xs text-muted-foreground">Time Spent</p>
        </div>
        <div className="bg-card rounded-card border border-border p-3 text-center">
          <p className="text-xl font-bold text-gray-600 dark:text-gray-400">{formatHours(data.totalEstimated)}</p>
          <p className="text-xs text-muted-foreground">Estimated</p>
        </div>
        <div className="bg-card rounded-card border border-border p-3 text-center">
          <p className={`text-xl font-bold ${efficiency <= 100 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {efficiency}%
          </p>
          <p className="text-xs text-muted-foreground">Efficiency</p>
        </div>
      </div>

      {/* Two Column Layout: Projects + Recent Entries */}
      <div className="grid grid-cols-2 gap-4">
        {/* Time by Project */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Time by Project</h3>
          </div>
          <div className="p-4">
            {data.byProject.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No time logged</p>
            ) : (
              <div className="space-y-3">
                {data.byProject.slice(0, 5).map((project) => {
                  const percentage = data.totalSpent > 0
                    ? Math.round((project.timeSpent / data.totalSpent) * 100)
                    : 0
                  return (
                    <div key={project.projectId}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm truncate">{project.projectName}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatHours(project.timeSpent)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Entries */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Entries</h3>
          </div>
          <div className="p-4">
            {data.recentEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No entries</p>
            ) : (
              <div className="space-y-2">
                {data.recentEntries.slice(0, 6).map((entry) => (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.projectName} • {formatDate(entry.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        entry.isActive
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {entry.isActive ? 'Active' : 'Done'}
                      </span>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {formatHours(entry.timeSpent)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}

export default TimeTracking
