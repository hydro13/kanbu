/*
 * ProductivityWidget Component
 * Version: 1.0.0
 *
 * Shows personal productivity stats: velocity trend, tasks completed, top projects.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation for Fase 3.2 Advanced Statistics
 * ===================================================================
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { TrendingUp, TrendingDown, Minus, BarChart3, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface VelocityDataPoint {
  weekStart: string
  tasksCompleted: number
}

// =============================================================================
// Helpers
// =============================================================================

function formatWeekLabel(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TrendIndicator({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="inline-flex items-center text-green-600 dark:text-green-400">
        <TrendingUp className="h-4 w-4 mr-1" />
        +{trend}
      </span>
    )
  }
  if (trend < 0) {
    return (
      <span className="inline-flex items-center text-red-600 dark:text-red-400">
        <TrendingDown className="h-4 w-4 mr-1" />
        {trend}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-muted-foreground">
      <Minus className="h-4 w-4 mr-1" />
      0
    </span>
  )
}

// Simple bar chart using divs
function VelocityChart({ data }: { data: VelocityDataPoint[] }) {
  const maxValue = Math.max(...data.map((d) => d.tasksCompleted), 1)

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((point, index) => {
        const height = (point.tasksCompleted / maxValue) * 100
        const isCurrentWeek = index === data.length - 1

        return (
          <div
            key={point.weekStart}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div className="w-full flex flex-col items-center justify-end h-20">
              {point.tasksCompleted > 0 && (
                <span className="text-xs text-muted-foreground mb-1">
                  {point.tasksCompleted}
                </span>
              )}
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  isCurrentWeek
                    ? 'bg-primary'
                    : 'bg-primary/50'
                )}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {formatWeekLabel(point.weekStart)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function ProductivityWidget() {
  const productivityQuery = trpc.user.getMyProductivity.useQuery({ weeks: 4 })
  const data = productivityQuery.data

  if (productivityQuery.isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const hasActivity = data.totalCompleted > 0 || data.thisWeek > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          My Productivity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* This Week Summary */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{data.thisWeek}</p>
            <p className="text-sm text-muted-foreground">completed this week</p>
          </div>
          <div className="text-right">
            <TrendIndicator trend={data.trend} />
            <p className="text-xs text-muted-foreground">vs last week</p>
          </div>
        </div>

        {/* Velocity Chart */}
        {hasActivity && data.velocityData.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Weekly Velocity
              </span>
              <span className="text-xs text-muted-foreground">
                avg: {data.avgVelocity}/week
              </span>
            </div>
            <VelocityChart data={data.velocityData} />
          </div>
        )}

        {/* Top Projects */}
        {data.topProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Trophy className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Top Projects
              </span>
            </div>
            <div className="space-y-1">
              {data.topProjects.slice(0, 3).map((project, index) => (
                <div
                  key={project.projectId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate flex-1">
                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                    {project.name}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {project.count} tasks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasActivity && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No completed tasks yet</p>
            <p className="text-xs mt-1">Complete tasks to see your productivity stats</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProductivityWidget
