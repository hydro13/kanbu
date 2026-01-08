/*
 * AclGate Component
 * Version: 1.0.0
 *
 * Conditional rendering component based on ACL permissions.
 * Shows children only if user has the required ACL permission on a resource.
 *
 * Uses the filesystem-style ACL system with RWXDP bitmask:
 *   R (Read)    = View resource
 *   W (Write)   = Edit resource
 *   X (Execute) = Perform actions (create tasks, etc.)
 *   D (Delete)  = Remove resource
 *   P (Perms)   = Manage permissions
 *
 * Usage:
 * ```tsx
 * // Show edit button only if user can write
 * <AclGate resourceType="workspace" resourceId={123} permission="write">
 *   <Button>Edit Workspace</Button>
 * </AclGate>
 *
 * // Show delete button with fallback
 * <AclGate
 *   resourceType="project"
 *   resourceId={456}
 *   permission="delete"
 *   fallback={<span className="text-muted">Cannot delete</span>}
 * >
 *   <Button variant="destructive">Delete Project</Button>
 * </AclGate>
 *
 * // Check multiple permissions (all required)
 * <AclGateAll
 *   resourceType="workspace"
 *   resourceId={123}
 *   permissions={['write', 'delete']}
 * >
 *   <Button>Edit & Delete</Button>
 * </AclGateAll>
 *
 * // Check multiple permissions (any one is enough)
 * <AclGateAny
 *   resourceType="project"
 *   resourceId={456}
 *   permissions={['write', 'permissions']}
 * >
 *   <Button>Settings</Button>
 * </AclGateAny>
 * ```
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 7 - Scoped UI Elements
 * =============================================================================
 */

import type { ReactNode } from 'react'
import { useAclPermission, type AclResourceType } from '@/hooks/useAclPermission'

// =============================================================================
// Types
// =============================================================================

export type AclPermissionType = 'read' | 'write' | 'execute' | 'delete' | 'permissions'

export interface AclGateProps {
  /** Resource type */
  resourceType: AclResourceType

  /** Resource ID (null for root-level resources like 'system') */
  resourceId: number | null

  /** Permission to check */
  permission: AclPermissionType

  /** Content to render if permission is granted */
  children: ReactNode

  /** Optional content to render if permission is denied */
  fallback?: ReactNode

  /** If true, show children while loading (optimistic) */
  optimistic?: boolean
}

export interface AclGateAllProps {
  /** Resource type */
  resourceType: AclResourceType

  /** Resource ID */
  resourceId: number | null

  /** All these permissions are required */
  permissions: AclPermissionType[]

  /** Content to render if all permissions are granted */
  children: ReactNode

  /** Optional content to render if any permission is denied */
  fallback?: ReactNode

  /** If true, show children while loading (optimistic) */
  optimistic?: boolean
}

export interface AclGateAnyProps {
  /** Resource type */
  resourceType: AclResourceType

  /** Resource ID */
  resourceId: number | null

  /** At least one of these permissions is required */
  permissions: AclPermissionType[]

  /** Content to render if any permission is granted */
  children: ReactNode

  /** Optional content to render if all permissions are denied */
  fallback?: ReactNode

  /** If true, show children while loading (optimistic) */
  optimistic?: boolean
}

// =============================================================================
// Helper
// =============================================================================

function hasPermission(
  permissionType: AclPermissionType,
  acl: { canRead: boolean; canWrite: boolean; canExecute: boolean; canDelete: boolean; canManagePermissions: boolean }
): boolean {
  switch (permissionType) {
    case 'read':
      return acl.canRead
    case 'write':
      return acl.canWrite
    case 'execute':
      return acl.canExecute
    case 'delete':
      return acl.canDelete
    case 'permissions':
      return acl.canManagePermissions
    default:
      return false
  }
}

// =============================================================================
// Components
// =============================================================================

/**
 * Show children only if user has the specified ACL permission on the resource.
 */
export function AclGate({
  resourceType,
  resourceId,
  permission,
  children,
  fallback = null,
  optimistic = false,
}: AclGateProps): ReactNode {
  const acl = useAclPermission({ resourceType, resourceId })

  if (acl.isLoading) {
    return optimistic ? children : null
  }

  return hasPermission(permission, acl) ? children : fallback
}

/**
 * Show children only if user has ALL of the specified ACL permissions.
 */
export function AclGateAll({
  resourceType,
  resourceId,
  permissions,
  children,
  fallback = null,
  optimistic = false,
}: AclGateAllProps): ReactNode {
  const acl = useAclPermission({ resourceType, resourceId })

  if (acl.isLoading) {
    return optimistic ? children : null
  }

  const hasAll = permissions.every((p) => hasPermission(p, acl))
  return hasAll ? children : fallback
}

/**
 * Show children if user has ANY of the specified ACL permissions.
 */
export function AclGateAny({
  resourceType,
  resourceId,
  permissions,
  children,
  fallback = null,
  optimistic = false,
}: AclGateAnyProps): ReactNode {
  const acl = useAclPermission({ resourceType, resourceId })

  if (acl.isLoading) {
    return optimistic ? children : null
  }

  const hasAny = permissions.some((p) => hasPermission(p, acl))
  return hasAny ? children : fallback
}

// =============================================================================
// Default Export
// =============================================================================

export default AclGate
