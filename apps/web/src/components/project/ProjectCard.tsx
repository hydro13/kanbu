/*
 * ProjectCard Component
 * Version: 1.1.0
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
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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

// =============================================================================
// Component
// =============================================================================

export function ProjectCard({ project, workspaceSlug, className }: ProjectCardProps) {
  return (
    <Link to={`/workspace/${workspaceSlug}/project/${project.identifier}/board`}>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
          !project.isActive && 'opacity-60',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{project.name}</CardTitle>
              {project.identifier && (
                <span className="text-xs font-mono text-muted-foreground">
                  {project.identifier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {project.userRole && (
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-full capitalize',
                    getRoleBadgeColor(project.userRole)
                  )}
                >
                  {project.userRole.toLowerCase()}
                </span>
              )}
            </div>
          </div>
          {project.description && (
            <CardDescription className="line-clamp-2 mt-1">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <TaskIcon className="h-4 w-4" />
                {project.taskCount} tasks
              </span>
              <span className="flex items-center gap-1">
                <UsersIcon className="h-4 w-4" />
                {project.memberCount}
              </span>
            </div>
            {project.lastActivityAt && (
              <span className="text-xs">
                Updated {formatDate(project.lastActivityAt)}
              </span>
            )}
          </div>
          {(project.startDate || project.endDate) && (
            <div className="mt-2 text-xs text-muted-foreground">
              {project.startDate && <span>{formatDate(project.startDate)}</span>}
              {project.startDate && project.endDate && <span> - </span>}
              {project.endDate && <span>{formatDate(project.endDate)}</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
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
