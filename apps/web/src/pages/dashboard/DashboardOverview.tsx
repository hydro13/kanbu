/*
 * Dashboard Overview Page
 * Version: 1.0.0
 *
 * Main dashboard overview with quick stats, workspace info, and recent projects.
 * Uses DashboardLayout with sidebar navigation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T00:55 CET
 *
 * Modified by:
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T03:15 CET
 * Change: Added StickyNoteList integration (USER-03)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StickyNoteList } from '@/components/sticky'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Icons
// =============================================================================

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

function WorkspaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

export function DashboardOverview() {
  const user = useAppSelector(selectUser)

  // Fetch all workspaces the user has access to
  const workspacesQuery = trpc.workspace.list.useQuery()
  const workspaces = workspacesQuery.data ?? []

  // Fetch user's tasks and subtasks for quick stats
  const myTasksQuery = trpc.user.getMyTasks.useQuery()
  const mySubtasksQuery = trpc.user.getMySubtasks.useQuery()

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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.name || user?.username}!
          </h1>
          <p className="text-muted-foreground">
            Your personal dashboard
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

        {/* Your Workspaces */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <WorkspaceIcon className="h-5 w-5" />
              Your Workspaces
            </h2>
          </div>
          {workspacesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 w-1/2 bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-8 bg-muted rounded" />
                      <div className="h-8 bg-muted rounded" />
                      <div className="h-8 bg-muted rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <WorkspaceIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No workspaces yet</p>
                  <p className="text-sm mt-2">Contact an administrator to get access to a workspace</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <Link key={workspace.id} to={`/workspace/${workspace.slug}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {workspace.logoUrl ? (
                          <img
                            src={workspace.logoUrl}
                            alt={workspace.name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <WorkspaceIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        {workspace.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {workspace.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                          <p className="text-lg font-bold">{workspace.projectCount}</p>
                          <p className="text-xs text-muted-foreground">Projects</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold">{workspace.memberCount}</p>
                          <p className="text-xs text-muted-foreground">Members</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-bold capitalize">{workspace.role.toLowerCase()}</p>
                          <p className="text-xs text-muted-foreground">Your Role</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Notes */}
        <StickyNoteList />
      </div>
    </DashboardLayout>
  )
}

export default DashboardOverview
