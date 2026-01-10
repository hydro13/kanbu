/*
 * GitHubRepoNode Component
 * Version: 1.0.0
 *
 * A single GitHub repository item in the dashboard tree.
 * Links to the linked project board if available.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-10
 * Change: Initial implementation - Fase 2 quick fix for navigation
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link, useLocation } from 'react-router-dom'
import { GitBranch, ExternalLink, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface GitHubRepoNodeProps {
  repo: {
    id: number
    name: string
    fullName: string
    owner: string
    syncStatus: 'synced' | 'pending' | 'error' | 'never'
    lastSyncAt: string | null
    projectId: number | null
    projectIdentifier: string | null
  }
  workspaceSlug: string
}

// =============================================================================
// Sync Status Icon
// =============================================================================

function SyncStatusIcon({ status }: { status: GitHubRepoNodeProps['repo']['syncStatus'] }) {
  switch (status) {
    case 'synced':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />
    case 'pending':
      return <Clock className="h-3 w-3 text-yellow-500" />
    case 'error':
      return <AlertCircle className="h-3 w-3 text-red-500" />
    case 'never':
    default:
      return null
  }
}

// =============================================================================
// Component
// =============================================================================

export function GitHubRepoNode({ repo, workspaceSlug }: GitHubRepoNodeProps) {
  const location = useLocation()

  // If linked to a project, navigate to that project's board
  if (repo.projectId && repo.projectIdentifier) {
    const path = `/workspace/${workspaceSlug}/project/${repo.projectIdentifier}/board`
    const isActive = location.pathname.startsWith(`/workspace/${workspaceSlug}/project/${repo.projectIdentifier}`)

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
        title={`${repo.fullName} → Project Board`}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0 text-orange-500" />
        <span className="truncate">{repo.name}</span>
        <SyncStatusIcon status={repo.syncStatus} />
      </Link>
    )
  }

  // If not linked to a project, show as external link to GitHub
  return (
    <a
      href={`https://github.com/${repo.fullName}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1',
        'text-sm transition-colors',
        'hover:bg-accent',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'
      )}
      title={`${repo.fullName} (GitHub)`}
    >
      <GitBranch className="h-3.5 w-3.5 shrink-0 text-gray-500" />
      <span className="truncate text-muted-foreground">{repo.name}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  )
}

export default GitHubRepoNode
