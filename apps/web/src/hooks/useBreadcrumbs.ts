/*
 * useBreadcrumbs Hook
 * Version: 2.0.0
 *
 * Hook for generating hierarchical breadcrumb navigation.
 * Returns array of breadcrumb items with label and optional link.
 *
 * Structure: Kanbu > [Section] > [Container] > [Name] > [View]
 * Example: Kanbu > Workspace > Develop > Project > KANBU > Board
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 *
 * Modified: 2026-01-07
 * Change: Complete rewrite for hierarchical navigation structure
 *
 * Modified: 2026-01-10
 * Change: Added support for workspace query parameter (?workspace=123)
 *         to show proper breadcrumbs: Workspaces > GenX > Projects
 * ═══════════════════════════════════════════════════════════════════
 */

import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface BreadcrumbItem {
  label: string
  href?: string
}

// =============================================================================
// View Labels
// =============================================================================

const VIEW_LABELS: Record<string, string> = {
  board: 'Board',
  list: 'List',
  calendar: 'Calendar',
  timeline: 'Timeline',
  milestones: 'Milestones',
  analytics: 'Analytics',
  'import-export': 'Import/Export',
  webhooks: 'Webhooks',
  settings: 'Settings',
  members: 'Members',
  sprints: 'Sprints',
  burndown: 'Burndown',
}

const ADMIN_LABELS: Record<string, string> = {
  users: 'Users',
  groups: 'Groups',
  permissions: 'Permissions',
  invites: 'Invites',
  backup: 'Backup',
  create: 'Create',
  edit: 'Edit',
  new: 'New',
}

const PROFILE_LABELS: Record<string, string> = {
  profile: 'Profile',
  edit: 'Edit',
  avatar: 'Avatar',
  '2fa': 'Two-Factor Auth',
  password: 'Change Password',
  sessions: 'Sessions',
  logins: 'Last Logins',
  'password-history': 'Password History',
  notifications: 'Notifications',
  external: 'External Accounts',
  integrations: 'Integrations',
  api: 'API Tokens',
  'hourly-rate': 'Hourly Rate',
  timetracking: 'Time Tracking',
  metadata: 'Metadata',
}

// =============================================================================
// Hook
// =============================================================================

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const params = useParams<{
    projectId?: string
    projectIdentifier?: string
    sprintId?: string
    userId?: string
    id?: string
    groupId?: string
    slug?: string
    workspaceSlug?: string
  }>()

  // Get workspace slug from URL params
  const workspaceSlug = params.workspaceSlug || params.slug

  // Get workspace ID from query parameter (for /workspaces?workspace=123)
  const workspaceIdFromQuery = searchParams.get('workspace')

  // Fetch workspace by slug if we have one
  const workspaceBySlugQuery = trpc.workspace.getBySlug.useQuery(
    { slug: workspaceSlug! },
    { enabled: !!workspaceSlug }
  )

  // Fetch workspace by ID if we have a query parameter
  const workspaceByIdQuery = trpc.workspace.get.useQuery(
    { workspaceId: Number(workspaceIdFromQuery) },
    { enabled: !!workspaceIdFromQuery && !isNaN(Number(workspaceIdFromQuery)) }
  )

  // Fetch project by identifier if we have one
  const projectByIdentifierQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: params.projectIdentifier! },
    { enabled: !!params.projectIdentifier }
  )

  // Fetch sprint if we have a sprintId
  const sprintQuery = trpc.sprint.get.useQuery(
    { sprintId: Number(params.sprintId) },
    { enabled: !!params.sprintId && !isNaN(Number(params.sprintId)) }
  )

  // Extract data to avoid deep type inference issues
  const workspaceName = workspaceBySlugQuery.data?.name
  const projectName = projectByIdentifierQuery.data?.name
  const sprintName = sprintQuery.data?.name

  const pathSegments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // NOTE: We don't add "Kanbu" as first breadcrumb because
  // the logo + app name is already shown in the header

  // Detect route type and build appropriate hierarchy
  const firstSegment = pathSegments[0]

  // ==========================================================================
  // Dashboard routes
  // ==========================================================================
  if (firstSegment === 'dashboard') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: undefined, // Current page
    })
    return breadcrumbs
  }

  // ==========================================================================
  // Tasks routes: /tasks, /subtasks
  // ==========================================================================
  if (firstSegment === 'tasks') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    })
    breadcrumbs.push({
      label: 'My Tasks',
      href: undefined,
    })
    return breadcrumbs
  }

  if (firstSegment === 'subtasks') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    })
    breadcrumbs.push({
      label: 'My Subtasks',
      href: undefined,
    })
    return breadcrumbs
  }

  // ==========================================================================
  // Workspaces list: /workspaces or /workspaces?workspace=123
  // ==========================================================================
  if (firstSegment === 'workspaces') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    })

    // Check if we're viewing a specific workspace's projects
    if (workspaceIdFromQuery && workspaceByIdQuery.data) {
      // Viewing workspace projects: Dashboard > Workspaces > GenX > Projects
      breadcrumbs.push({
        label: 'Workspaces',
        href: '/workspaces',
      })
      breadcrumbs.push({
        label: workspaceByIdQuery.data.name,
        href: undefined, // Current page shows this workspace
      })
      breadcrumbs.push({
        label: 'Projects',
        href: undefined,
      })
    } else {
      // Just viewing workspaces list
      breadcrumbs.push({
        label: 'Workspaces',
        href: undefined,
      })
    }
    return breadcrumbs
  }

  // ==========================================================================
  // Workspace routes: /workspace/:slug/...
  // ==========================================================================
  if (firstSegment === 'workspace' && workspaceSlug) {
    const hasProject = pathSegments.includes('project')
    const projectIdentifier = params.projectIdentifier

    // Always start with Dashboard link
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    })

    // Add Workspaces link
    breadcrumbs.push({
      label: 'Workspaces',
      href: '/workspaces',
    })

    // Add workspace name (e.g., "Develop")
    breadcrumbs.push({
      label: workspaceName || workspaceSlug,
      href: `/workspace/${workspaceSlug}`,
    })

    // Add "Projects" - this is the workspace homepage showing projects list
    breadcrumbs.push({
      label: 'Projects',
      href: hasProject ? `/workspace/${workspaceSlug}` : undefined,
    })

    // If we have a project
    if (hasProject && projectIdentifier) {
      // Find what comes after the project identifier
      const projectIndex = pathSegments.indexOf('project')
      const viewSegment = pathSegments[projectIndex + 2] // Skip 'project' and identifier

      // Add project name (e.g., "KANBU" or "Genx-Vector-Index")
      breadcrumbs.push({
        label: projectName || projectIdentifier,
        href: viewSegment ? `/workspace/${workspaceSlug}/project/${projectIdentifier}/board` : undefined,
      })

      // Add view if present
      if (viewSegment) {
        // Check for sprint sub-routes: /sprints/:id/burndown
        if (viewSegment === 'sprints' && params.sprintId) {
          const burndownIndex = pathSegments.indexOf('burndown')
          const hasBurndown = burndownIndex > -1

          breadcrumbs.push({
            label: 'Sprints',
            href: hasBurndown ? `/workspace/${workspaceSlug}/project/${projectIdentifier}/sprints` : undefined,
          })

          breadcrumbs.push({
            label: sprintName || `Sprint ${params.sprintId}`,
            href: hasBurndown ? `/workspace/${workspaceSlug}/project/${projectIdentifier}/sprints/${params.sprintId}` : undefined,
          })

          if (hasBurndown) {
            breadcrumbs.push({
              label: 'Burndown',
              href: undefined,
            })
          }
        } else {
          // Regular view (board, list, calendar, etc.)
          const viewLabel = VIEW_LABELS[viewSegment] || (viewSegment.charAt(0).toUpperCase() + viewSegment.slice(1))
          breadcrumbs.push({
            label: viewLabel,
            href: undefined,
          })
        }
      }
    }

    return breadcrumbs
  }

  // ==========================================================================
  // Administration routes: /admin/...
  // ==========================================================================
  if (firstSegment === 'admin') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    })

    breadcrumbs.push({
      label: 'Administration',
      href: pathSegments.length > 1 ? '/admin' : undefined,
    })

    // Add admin sub-sections
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      if (!segment) continue

      // Skip numeric IDs
      if (/^\d+$/.test(segment)) continue

      const label = ADMIN_LABELS[segment] || (segment.charAt(0).toUpperCase() + segment.slice(1))
      const isLast = i === pathSegments.length - 1

      breadcrumbs.push({
        label,
        href: isLast ? undefined : `/admin/${pathSegments.slice(1, i + 1).join('/')}`,
      })
    }

    return breadcrumbs
  }

  // ==========================================================================
  // Profile routes: /profile/...
  // ==========================================================================
  if (firstSegment === 'profile') {
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    })

    breadcrumbs.push({
      label: 'Profile',
      href: pathSegments.length > 1 ? '/profile' : undefined,
    })

    // Add profile sub-sections
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      if (!segment) continue

      const label = PROFILE_LABELS[segment] || (segment.charAt(0).toUpperCase() + segment.slice(1))
      const isLast = i === pathSegments.length - 1

      breadcrumbs.push({
        label,
        href: isLast ? undefined : `/profile/${pathSegments.slice(1, i + 1).join('/')}`,
      })
    }

    return breadcrumbs
  }

  // ==========================================================================
  // Fallback for unknown routes
  // ==========================================================================
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    if (!segment || /^\d+$/.test(segment)) continue

    const label = segment.charAt(0).toUpperCase() + segment.slice(1)
    const isLast = i === pathSegments.length - 1

    breadcrumbs.push({
      label,
      href: isLast ? undefined : `/${pathSegments.slice(0, i + 1).join('/')}`,
    })
  }

  return breadcrumbs
}

export default useBreadcrumbs
