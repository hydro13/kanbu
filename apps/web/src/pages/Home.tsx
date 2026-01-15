/*
 * Home Page (Dashboard)
 * Version: 1.4.0
 *
 * Protected dashboard with workspace overview, quick stats, and project progress.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T04:07 CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T19:15 CET
 * Change: Removed WorkspaceSelector (now in Layout)
 *
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T01:10 CET
 * Change: Added recent projects section, quick navigation (EXT-15)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:35 CET
 * Change: Added quick stats cards and project progress bars (USER-02)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { useAppSelector } from '../store'
import { selectUser } from '../store/authSlice'
import { selectCurrentWorkspace } from '../store/workspaceSlice'
import { trpc } from '../lib/trpc'

// =============================================================================
// Icons
// =============================================================================

function ProjectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function SubtaskIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4m-6-4h.01M9 14h.01" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function HomePage() {
  const user = useAppSelector(selectUser)
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)

  // Fetch recent projects
  const projectsQuery = trpc.project.list.useQuery(
    { workspaceId: currentWorkspace?.id ?? 0 },
    { enabled: !!currentWorkspace }
  )

  // Fetch user's tasks and subtasks for quick stats
  const myTasksQuery = trpc.user.getMyTasks.useQuery()
  const mySubtasksQuery = trpc.user.getMySubtasks.useQuery()

  // Get first 5 projects as recent
  const recentProjects = projectsQuery.data?.slice(0, 5) ?? []

  // Calculate quick stats
  const activeTasks = myTasksQuery.data?.filter((t) => t.isActive).length ?? 0
  const activeSubtasks = mySubtasksQuery.data?.filter((s) => s.status !== 'DONE').length ?? 0
  const completedSubtasks = mySubtasksQuery.data?.filter((s) => s.status === 'DONE').length ?? 0

  // Tasks due within 7 days
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const tasksDueSoon = myTasksQuery.data?.filter((t) => {
    if (!t.dateDue || !t.isActive) return false
    const dueDate = new Date(t.dateDue)
    return dueDate <= weekFromNow
  }).length ?? 0

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-page-title-lg tracking-tight text-foreground">
            Welcome, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Your dashboard for {currentWorkspace?.name || 'your workspace'}
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/dashboard/tasks" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <TaskIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeTasks}</p>
                    <p className="text-sm text-muted-foreground">Active Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard/subtasks" className="block">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <SubtaskIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeSubtasks}</p>
                    <p className="text-sm text-muted-foreground">Active Subtasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tasksDueSoon}</p>
                  <p className="text-sm text-muted-foreground">Due This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedSubtasks}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Overview */}
        {currentWorkspace && (
          <Card>
            <CardHeader>
              <CardTitle>{currentWorkspace.name}</CardTitle>
              <CardDescription>
                {currentWorkspace.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{currentWorkspace.projectCount}</p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{currentWorkspace.memberCount}</p>
                  <p className="text-sm text-muted-foreground">Members</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold capitalize">{currentWorkspace.role.toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground">Your Role</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Recent Projects
              </CardTitle>
              <CardDescription>
                Your most recently active projects
              </CardDescription>
            </div>
            <Link
              to="/workspaces"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {projectsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-md bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 bg-muted rounded" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ProjectIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No projects yet</p>
                <Link
                  to="/workspaces"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => {
                  const progress = project.taskCount > 0
                    ? Math.round((project.completedTaskCount / project.taskCount) * 100)
                    : 0
                  return (
                  <Link
                    key={project.id}
                    to={`/project/${project.id}/board`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <ProjectIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">{project.name}</p>
                        <span className="text-xs text-muted-foreground ml-2">{progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {project.completedTaskCount}/{project.taskCount} tasks · {project.memberCount} members
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {project.lastActivityAt
                        ? formatRelativeTime(project.lastActivityAt)
                        : 'No activity'}
                    </div>
                  </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
