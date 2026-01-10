/*
 * ProjectCard Component
 * Version: 1.2.0
 *
 * Card component for displaying project overview in grid/list view.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:25 CET
 * Change: Fixed link to navigate to /project/:id/board instead of /project/:id
 *
 * Modified by:
 * Host: MAX
 * Date: 2026-01-07
 * Change: Updated links to include workspace slug for SEO-friendly URLs
 *
 * Modified by:
 * Host: MAX
 * Date: 2026-01-10
 * Change: Added edit button and GitHub indicator with sync status,
 *         changed edit link to /details for project details page
 *
 * Modified by:
 * Host: MAX
 * Date: 2026-01-11
 * Change: Horizontal full-width layout for list view,
 *         name prominent with identifier badge, stats and badges on right
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link } from 'react-router-dom'
import { Github, Settings, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Project } from '@/store/projectSlice'

// =============================================================================
// Types
// =============================================================================

interface ProjectCardProps {
  project: Project
  workspaceSlug: string
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getRoleBadgeColor(role: Project['userRole']): string {
  switch (role) {
    case 'OWNER':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case 'MEMBER':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'VIEWER':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  }
}

type SyncStatus = 'synced' | 'stale' | 'disabled' | 'never'

function getGitHubSyncStatus(project: Project): SyncStatus {
  if (!project.hasGitHub || !project.github?.primaryRepo) return 'never'

  const { syncEnabled, lastSyncAt } = project.github.primaryRepo

  if (!syncEnabled) return 'disabled'
  if (!lastSyncAt) return 'never'

  // Consider sync stale if older than 24 hours
  const lastSync = new Date(lastSyncAt)
  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)

  return hoursSinceSync > 24 ? 'stale' : 'synced'
}

function formatSyncTime(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never synced'

  const lastSync = new Date(lastSyncAt)
  const now = new Date()
  const diffMs = now.getTime() - lastSync.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function getGitHubTooltip(project: Project, syncStatus: SyncStatus): string {
  if (!project.github?.primaryRepo) return 'GitHub linked'

  const repoName = project.github.primaryRepo.fullName
  let statusText = ''

  switch (syncStatus) {
    case 'synced':
      statusText = `Synced ${formatSyncTime(project.github.primaryRepo.lastSyncAt)}`
      break
    case 'stale':
      statusText = `Last sync: ${formatSyncTime(project.github.primaryRepo.lastSyncAt)}`
      break
    case 'disabled':
      statusText = 'Sync disabled'
      break
    case 'never':
      statusText = 'Never synced'
      break
  }

  const moreRepos = project.github.repoCount > 1
    ? ` (+${project.github.repoCount - 1} more)`
    : ''

  return `${repoName}${moreRepos}\n${statusText}`
}

// =============================================================================
// Component
// =============================================================================

export function ProjectCard({ project, workspaceSlug, className }: ProjectCardProps) {
  const syncStatus = getGitHubSyncStatus(project)
  const canEdit = project.userRole === 'OWNER' || project.userRole === 'MANAGER'

  // Get sync status icon and color
  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'stale':
        return <RefreshCw className="h-3 w-3 text-yellow-500" />
      case 'disabled':
        return <XCircle className="h-3 w-3 text-gray-400" />
      default:
        return null
    }
  }

  return (
    <div className="relative group">
      <Link to={`/workspace/${workspaceSlug}/project/${project.identifier}/board`}>
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
            !project.isActive && 'opacity-60',
            className
          )}
        >
          <div className="p-5">
            {/* Row 1: Header - Name, identifier, and role badge */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-semibold">
                  {project.name}
                </CardTitle>
                {project.identifier && (
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    {project.identifier}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* GitHub indicator */}
                {project.hasGitHub && project.github && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                    title={getGitHubTooltip(project, syncStatus)}
                  >
                    <Github className="h-4 w-4" />
                    {getSyncStatusIcon()}
                  </div>
                )}
                {/* Role badge */}
                {project.userRole && (
                  <span
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-full capitalize',
                      getRoleBadgeColor(project.userRole)
                    )}
                  >
                    {project.userRole.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Description */}
            {project.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {project.description}
              </p>
            )}

            {/* Row 3: Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-3 border-t">
              <span className="flex items-center gap-2">
                <TaskIcon className="h-4 w-4" />
                <span>{project.taskCount} tasks</span>
              </span>
              <span className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                <span>{project.memberCount} members</span>
              </span>
              {project.lastActivityAt && (
                <span className="ml-auto text-xs">
                  Last activity: {formatDate(project.lastActivityAt)}
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>

      {/* Edit button - positioned absolutely, visible on hover */}
      {canEdit && (
        <Link
          to={`/workspace/${workspaceSlug}/project/${project.identifier}/details`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 -translate-y-1/2 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Edit project</span>
          </Button>
        </Link>
      )}
    </div>
  )
}

// =============================================================================
// Icons (inline SVG to avoid external dependencies)
// =============================================================================

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ProjectCard
