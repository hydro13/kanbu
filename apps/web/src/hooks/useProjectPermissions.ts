/*
 * useProjectPermissions Hook
 * Version: 1.1.0
 *
 * Hook for checking user permissions within a project.
 * Returns permission flags based on:
 * - Domain Admin status (full access everywhere)
 * - Workspace Admin status (full access in their workspaces)
 * - Project membership role
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * ═══════════════════════════════════════════════════════════════════
 */

import { trpc } from '@/lib/trpc'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'

// =============================================================================
// Types
// =============================================================================

export type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER'

export interface ProjectPermissions {
  /** User can create, edit, and delete tasks */
  canEdit: boolean
  /** User can manage project settings (columns, swimlanes, etc.) */
  canManage: boolean
  /** User has view-only access */
  isViewer: boolean
  /** User's role in the project */
  role: ProjectRole
  /** Whether permission data is still loading */
  isLoading: boolean
  /** User is a Domain Admin */
  isDomainAdmin: boolean
  /** User is a Workspace Admin for this project's workspace */
  isWorkspaceAdmin: boolean
}

// =============================================================================
// Hook
// =============================================================================

export function useProjectPermissions(projectId: number): ProjectPermissions {
  const user = useAppSelector(selectUser)

  // Get project members to find user's role
  const membersQuery = trpc.project.getMembers.useQuery(
    { projectId },
    {
      enabled: !!user && projectId > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Get user's admin scope (Domain Admin + Workspace Admin info)
  const adminScopeQuery = trpc.group.myAdminScope.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get project info to check workspace
  const projectQuery = trpc.project.get.useQuery(
    { projectId },
    {
      enabled: !!user && projectId > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Extract primitives to avoid complex type inference
  const membersLoading = membersQuery.isLoading
  const adminScopeLoading = adminScopeQuery.isLoading
  const projectLoading = projectQuery.isLoading

  const isDomainAdminFromQuery = adminScopeQuery.data?.isDomainAdmin ?? false
  const adminWorkspaceIds = adminScopeQuery.data?.adminWorkspaceIds ?? []
  const projectWorkspaceId = projectQuery.data?.workspaceId
  const members = membersQuery.data

  const isLoading = membersLoading || adminScopeLoading || projectLoading

  // Default to VIEWER if no user or still loading
  if (!user || isLoading) {
    return {
      canEdit: false,
      canManage: false,
      isViewer: true,
      role: 'VIEWER' as ProjectRole,
      isLoading,
      isDomainAdmin: false,
      isWorkspaceAdmin: false,
    }
  }

  // Check Domain Admin status
  const isDomainAdmin = isDomainAdminFromQuery

  // Check Workspace Admin status for this project's workspace
  const isWorkspaceAdmin = !isDomainAdmin &&
    projectWorkspaceId !== undefined &&
    adminWorkspaceIds.includes(projectWorkspaceId)

  // Find user's project membership role
  const currentMember = members?.find(m => m.id === user.id)
  const role: ProjectRole = (currentMember?.role as ProjectRole) ?? 'VIEWER'

  // Platform admins get full access (legacy check, kept for backwards compatibility)
  const isPlatformAdmin = user.role === 'ADMIN'

  // Determine if user has elevated access
  const hasElevatedAccess = isDomainAdmin || isWorkspaceAdmin || isPlatformAdmin

  return {
    canEdit: hasElevatedAccess || ['OWNER', 'MANAGER', 'MEMBER'].includes(role),
    canManage: hasElevatedAccess || ['OWNER', 'MANAGER'].includes(role),
    isViewer: !hasElevatedAccess && role === 'VIEWER',
    role: hasElevatedAccess ? 'OWNER' : role,
    isLoading: false,
    isDomainAdmin,
    isWorkspaceAdmin,
  }
}

export default useProjectPermissions
