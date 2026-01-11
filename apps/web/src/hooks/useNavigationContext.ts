/*
 * useNavigationContext Hook
 * Version: 1.0.0
 *
 * Provides context about the current navigation level and location.
 * Used by CommandPalette and other components for context-aware behavior.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-11
 * ═══════════════════════════════════════════════════════════════════
 */

import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'

// =============================================================================
// Types
// =============================================================================

export type NavigationLevel = 'dashboard' | 'workspace' | 'project' | 'other'

export type CurrentPage =
  // Dashboard pages
  | 'dashboard-overview'
  | 'dashboard-tasks'
  | 'dashboard-subtasks'
  | 'dashboard-inbox'
  | 'dashboard-notes'
  // Workspace pages
  | 'workspaces-list'
  | 'workspace-overview'
  | 'workspace-members'
  | 'workspace-stats'
  | 'workspace-wiki'
  | 'workspace-groups'
  | 'workspace-settings'
  // Project pages
  | 'project-board'
  | 'project-list'
  | 'project-calendar'
  | 'project-analytics'
  | 'project-settings'
  // Other
  | 'profile'
  | 'admin'
  | 'unknown'

export interface NavigationContext {
  /** Current navigation level */
  level: NavigationLevel
  /** Current page identifier */
  currentPage: CurrentPage
  /** Workspace slug (if in workspace or project context) */
  workspaceSlug: string | undefined
  /** Project identifier (if in project context) */
  projectIdentifier: string | undefined
  /** Whether we're at dashboard level */
  isDashboard: boolean
  /** Whether we're at workspace level */
  isWorkspace: boolean
  /** Whether we're at project level */
  isProject: boolean
  /** Full pathname */
  pathname: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract the current page from the pathname
 */
function extractCurrentPage(pathname: string): CurrentPage {
  // Dashboard routes
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return 'dashboard-overview'
  }
  if (pathname.startsWith('/dashboard/tasks')) {
    return 'dashboard-tasks'
  }
  if (pathname.startsWith('/dashboard/subtasks')) {
    return 'dashboard-subtasks'
  }
  if (pathname.startsWith('/dashboard/inbox')) {
    return 'dashboard-inbox'
  }
  if (pathname.startsWith('/dashboard/notes')) {
    return 'dashboard-notes'
  }

  // Workspaces routes
  if (pathname === '/workspaces' || pathname === '/workspaces/') {
    return 'workspaces-list'
  }

  // Workspace routes (pattern: /workspace/:slug/...)
  const workspaceMatch = pathname.match(/^\/workspace\/[^/]+/)
  if (workspaceMatch) {
    if (pathname.match(/^\/workspace\/[^/]+\/?$/)) {
      return 'workspace-overview'
    }
    if (pathname.includes('/members')) {
      return 'workspace-members'
    }
    if (pathname.includes('/stats')) {
      return 'workspace-stats'
    }
    if (pathname.includes('/wiki')) {
      return 'workspace-wiki'
    }
    if (pathname.includes('/groups')) {
      return 'workspace-groups'
    }
    if (pathname.includes('/settings')) {
      return 'workspace-settings'
    }

    // Project routes (pattern: /workspace/:slug/project/:id/...)
    if (pathname.includes('/project/')) {
      if (pathname.includes('/board')) {
        return 'project-board'
      }
      if (pathname.includes('/list')) {
        return 'project-list'
      }
      if (pathname.includes('/calendar')) {
        return 'project-calendar'
      }
      if (pathname.includes('/analytics')) {
        return 'project-analytics'
      }
      if (pathname.includes('/settings')) {
        return 'project-settings'
      }
      // Default to board if just /project/:id
      return 'project-board'
    }
  }

  // Profile routes
  if (pathname.startsWith('/profile')) {
    return 'profile'
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    return 'admin'
  }

  return 'unknown'
}

/**
 * Determine the navigation level from pathname
 */
function extractLevel(pathname: string): NavigationLevel {
  if (pathname.startsWith('/dashboard')) {
    return 'dashboard'
  }
  if (pathname.includes('/project/')) {
    return 'project'
  }
  if (pathname.startsWith('/workspace/') || pathname === '/workspaces') {
    return 'workspace'
  }
  return 'other'
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to get the current navigation context
 *
 * @example
 * const { level, currentPage, isProject, workspaceSlug } = useNavigationContext()
 *
 * if (isProject) {
 *   // Show project-specific commands
 * }
 */
export function useNavigationContext(): NavigationContext {
  const location = useLocation()
  const params = useParams<{
    slug?: string
    workspaceSlug?: string
    projectIdentifier?: string
    projectId?: string
  }>()

  return useMemo(() => {
    const pathname = location.pathname
    const level = extractLevel(pathname)
    const currentPage = extractCurrentPage(pathname)

    // Extract workspace slug from various param patterns
    const workspaceSlug = params.slug || params.workspaceSlug || undefined

    // Extract project identifier from various param patterns
    const projectIdentifier = params.projectIdentifier || params.projectId || undefined

    return {
      level,
      currentPage,
      workspaceSlug,
      projectIdentifier,
      isDashboard: level === 'dashboard',
      isWorkspace: level === 'workspace',
      isProject: level === 'project',
      pathname,
    }
  }, [location.pathname, params.slug, params.workspaceSlug, params.projectIdentifier, params.projectId])
}

export default useNavigationContext
