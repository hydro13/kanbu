/*
 * ProjectNode Component
 * Version: 1.0.0
 *
 * A single project item in the dashboard tree.
 * Links to the project board.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-10
 * Change: Initial implementation - Fase 1.3 of Dashboard Roadmap
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface ProjectNodeProps {
  project: {
    id: number
    name: string
    identifier: string
    taskCount: number
  }
  workspaceSlug: string
}

// =============================================================================
// Component
// =============================================================================

export function ProjectNode({ project, workspaceSlug }: ProjectNodeProps) {
  const location = useLocation()
  const path = `/workspace/${workspaceSlug}/project/${project.id}/board`
  const isActive = location.pathname.startsWith(`/workspace/${workspaceSlug}/project/${project.id}`)

  return (
    <Link
      to={path}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1',
        'text-sm transition-colors',
        'hover:bg-accent',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isActive && 'bg-accent font-medium text-accent-foreground'
      )}
      title={`${project.name} (${project.identifier})`}
    >
      <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-blue-500" />
      <span className="truncate">{project.name}</span>
      {project.taskCount > 0 && (
        <span className="ml-auto text-xs text-muted-foreground">
          {project.taskCount}
        </span>
      )}
    </Link>
  )
}

export default ProjectNode
