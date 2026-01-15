/*
 * Workspace Statistics Page
 * Version: 1.1.0
 *
 * Shows aggregated statistics across all projects in a workspace.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 *
 * Modified: 2026-01-11
 * Change: Fixed React hooks violation - moved useQuery to child component
 * ===================================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  FolderKanban,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ProjectInfo {
  id: number
  name: string
  identifier: string | null
}

interface ProjectStats {
  projectId: number
  projectName: string
  projectIdentifier: string
  totalTasks: number
  openTasks: number
  closedTasks: number
  completionRate: number
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceStatisticsPage() {
  const { slug } = useParams<{ slug: string }>()

  // State to collect stats from child components
  const [projectStatsMap, setProjectStatsMap] = useState<Map<number, ProjectStats>>(new Map())

  // Fetch workspace
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Fetch projects
  const projectsQuery = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? 0 },
    { enabled: !!workspace?.id }
  )
  const projects = projectsQuery.data ?? []

  // Callback for child components to report their stats
  // Wrapped in useCallback to prevent infinite re-render loops
  const handleStatsLoaded = useCallback((projectId: number, stats: ProjectStats) => {
    setProjectStatsMap((prev) => {
      const next = new Map(prev)
      next.set(projectId, stats)
      return next
    })
  }, [])

  // Get collected stats as array
  const projectStats = Array.from(projectStatsMap.values())

  // Calculate totals from collected stats
  const totals = projectStats.reduce(
    (acc, project) => ({
      totalTasks: acc.totalTasks + project.totalTasks,
      openTasks: acc.openTasks + project.openTasks,
      closedTasks: acc.closedTasks + project.closedTasks,
    }),
    { totalTasks: 0, openTasks: 0, closedTasks: 0 }
  )

  const overallCompletionRate =
    totals.totalTasks > 0
      ? Math.round((totals.closedTasks / totals.totalTasks) * 100)
      : 0

  const isLoading = workspaceQuery.isLoading || projectsQuery.isLoading

  // Loading state
  if (isLoading) {
    return (
      <WorkspaceLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-8 w-16 bg-muted rounded mb-2" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </WorkspaceLayout>
    )
  }

  // Workspace not found
  if (!workspace) {
    return (
      <WorkspaceLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Workspace not found</p>
          <Link to="/workspaces" className="text-primary hover:underline flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Link>
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-page-title-lg tracking-tight text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            Statistics
          </h1>
          <p className="text-muted-foreground">
            Overview of all projects in {workspace.name}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Circle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totals.totalTasks}</p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totals.openTasks}</p>
                  <p className="text-sm text-muted-foreground">Open Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totals.closedTasks}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500',
                      overallCompletionRate >= 75
                        ? 'bg-green-500'
                        : overallCompletionRate >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    )}
                    style={{ width: `${overallCompletionRate}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold">{overallCompletionRate}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {totals.closedTasks} of {totals.totalTasks} tasks completed across all projects
            </p>
          </CardContent>
        </Card>

        {/* Project Breakdown */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Per Project
          </h2>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No projects yet</p>
                  <p className="text-sm mt-2">Create a project to see statistics</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <ProjectStatCardWithFetch
                  key={project.id}
                  project={project}
                  workspaceSlug={slug!}
                  onStatsLoaded={handleStatsLoaded}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}

// =============================================================================
// Project Stat Card with Fetch (handles its own data fetching)
// =============================================================================

interface ProjectStatCardWithFetchProps {
  project: ProjectInfo
  workspaceSlug: string
  onStatsLoaded: (projectId: number, stats: ProjectStats) => void
}

function ProjectStatCardWithFetch({ project, workspaceSlug, onStatsLoaded }: ProjectStatCardWithFetchProps) {
  // Each card fetches its own stats - this is valid because each component
  // always calls the same hooks in the same order
  const statsQuery = trpc.analytics.getProjectStats.useQuery(
    { projectId: project.id },
    { enabled: !!project.id }
  )

  const stats = statsQuery.data

  // Report stats to parent when loaded
  useEffect(() => {
    if (stats) {
      onStatsLoaded(project.id, {
        projectId: project.id,
        projectName: project.name,
        projectIdentifier: project.identifier ?? '',
        totalTasks: stats.totalTasks ?? 0,
        openTasks: stats.openTasks ?? 0,
        closedTasks: stats.closedTasks ?? 0,
        completionRate: stats.completionRate ?? 0,
      })
    }
  }, [stats, project.id, project.name, project.identifier, onStatsLoaded])

  // Loading state for individual card
  if (statsQuery.isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-muted" />
              <div>
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-8 w-12 bg-muted rounded" />
              <div className="h-8 w-12 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const completionRate = stats?.completionRate ?? 0
  const completionColor =
    completionRate >= 75
      ? 'text-green-600 dark:text-green-400'
      : completionRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <Link
      to={`/workspace/${workspaceSlug}/project/${project.identifier}/analytics`}
      className="block"
    >
      <Card className="hover:bg-accent/30 transition-colors">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{project.name}</p>
                  <span className="text-xs text-muted-foreground">
                    ({project.identifier})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats?.totalTasks ?? 0} tasks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm font-medium text-amber-600">{stats?.openTasks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-green-600">{stats?.closedTasks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Done</p>
              </div>
              <div className="text-center min-w-[60px]">
                <p className={cn('text-lg font-bold', completionColor)}>
                  {completionRate}%
                </p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default WorkspaceStatisticsPage
