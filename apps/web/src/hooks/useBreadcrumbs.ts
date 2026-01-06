/*
 * useBreadcrumbs Hook
 * Version: 1.0.0
 *
 * Hook for generating breadcrumb navigation based on current route.
 * Returns array of breadcrumb items with label and optional link.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
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
// Route Configuration
// =============================================================================

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'My Tasks',
  subtasks: 'My Subtasks',
  workspace: 'Workspace',
  workspaces: 'My Workspaces',
  project: 'Project',
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
  sprint: 'Sprint',
  burndown: 'Burndown',
  profile: 'Profile',
  timetracking: 'Time Tracking',
  logins: 'Last Logins',
  sessions: 'Sessions',
  'password-history': 'Password History',
  metadata: 'Metadata',
  edit: 'Edit',
  avatar: 'Avatar',
  '2fa': 'Two-Factor Auth',
  public: 'Public Access',
  notifications: 'Notifications',
  external: 'External Accounts',
  integrations: 'Integrations',
  api: 'API Tokens',
  'hourly-rate': 'Hourly Rate',
  password: 'Change Password',
  admin: 'Administration',
  users: 'Users',
  create: 'Create',
  invites: 'Invites',
  new: 'New',
  backup: 'Backup',
  groups: 'Groups',
  permissions: 'Permissions',
}

// =============================================================================
// Hook
// =============================================================================

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation()
  const params = useParams<{ projectId?: string; sprintId?: string; userId?: string; id?: string; groupId?: string; slug?: string }>()
  const [searchParams] = useSearchParams()

  // Get workspace ID from query param (for /workspaces?workspace=3)
  const workspaceIdParam = searchParams.get('workspace')
  const workspaceId = workspaceIdParam ? parseInt(workspaceIdParam, 10) : null

  // Fetch workspace by slug if we have a slug param
  const workspaceBySlugQuery = trpc.workspace.getBySlug.useQuery(
    { slug: params.slug! },
    { enabled: !!params.slug }
  )

  // Fetch workspace by ID if we have a workspace query param
  const workspaceByIdQuery = trpc.workspace.get.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId && !isNaN(workspaceId) }
  )

  // Fetch project name if we have a projectId
  const projectQuery = trpc.project.get.useQuery(
    { projectId: Number(params.projectId) },
    { enabled: !!params.projectId && !isNaN(Number(params.projectId)) }
  )

  // Fetch sprint name if we have a sprintId
  const sprintQuery = trpc.sprint.get.useQuery(
    { sprintId: Number(params.sprintId) },
    { enabled: !!params.sprintId && !isNaN(Number(params.sprintId)) }
  )

  const pathSegments = location.pathname.split('/').filter((s): s is string => Boolean(s))
  const breadcrumbs: BreadcrumbItem[] = []

  let currentPath = ''

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    if (!segment) continue

    currentPath += `/${segment}`
    const prevSegment = i > 0 ? pathSegments[i - 1] : undefined
    const isLast = i === pathSegments.length - 1

    // Handle workspace slug (SEO-friendly URL: /workspace/:slug)
    // Add the workspace name as a separate breadcrumb after "Workspace"
    if (prevSegment === 'workspace' && segment === params.slug) {
      // Add the workspace name as a new breadcrumb item
      const workspaceName = workspaceBySlugQuery.data?.name ?? segment
      breadcrumbs.push({
        label: workspaceName,
        href: undefined, // Current page, no link needed
      })
      continue
    }

    // Handle /workspaces route with ?workspace= query param
    if (segment === 'workspaces') {
      breadcrumbs.push({
        label: 'My Workspaces',
        href: workspaceId ? '/workspaces' : undefined,
      })

      // If workspace is selected via query param, add workspace name breadcrumb
      if (workspaceId && workspaceByIdQuery.data) {
        breadcrumbs.push({
          label: workspaceByIdQuery.data.name,
          href: undefined, // Current page
        })
      }
      continue
    }

    // Skip numeric IDs in the path display, but use them to fetch names
    if (/^\d+$/.test(segment)) {
      // Check if previous segment was 'project' and we have project data
      if (prevSegment === 'project' && projectQuery.data) {
        // Replace the 'Project' breadcrumb with workspace context + project name
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1]
        if (lastCrumb && lastCrumb.label === 'Project') {
          // Insert workspace breadcrumbs before the project name
          if (projectQuery.data.workspace) {
            // Replace 'Project' with 'My Workspaces'
            breadcrumbs[breadcrumbs.length - 1] = {
              label: 'My Workspaces',
              href: '/workspaces',
            }
            // Add workspace name
            breadcrumbs.push({
              label: projectQuery.data.workspace.name,
              href: `/workspaces?workspace=${projectQuery.data.workspace.id}`,
            })
            // Add project name
            breadcrumbs.push({
              label: projectQuery.data.name,
              href: `/project/${segment}/board`,
            })
          } else {
            // Fallback if no workspace data
            breadcrumbs[breadcrumbs.length - 1] = {
              label: projectQuery.data.name,
              href: `/project/${segment}/board`,
            }
          }
        }
      }
      // Check if previous segment was 'sprint' and we have sprint data
      else if (prevSegment === 'sprint' && sprintQuery.data) {
        const lastCrumb = breadcrumbs[breadcrumbs.length - 1]
        if (lastCrumb && lastCrumb.label === 'Sprint') {
          breadcrumbs[breadcrumbs.length - 1] = {
            label: sprintQuery.data.name,
            href: currentPath,
          }
        }
      }
      // For user/workspace/group IDs in admin routes, just skip them
      continue
    }

    // Get label for this segment
    const label = ROUTE_LABELS[segment] ?? (segment.charAt(0).toUpperCase() + segment.slice(1))

    // Determine if this should be a link (not the last segment)
    const href = isLast ? undefined : currentPath

    breadcrumbs.push({ label, href })
  }

  return breadcrumbs
}

export default useBreadcrumbs
