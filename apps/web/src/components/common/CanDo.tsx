/*
 * CanDo Component
 * Version: 1.0.0
 *
 * Conditional rendering component based on permissions.
 * Shows children only if user has the required permission.
 *
 * Usage:
 * ```tsx
 * <CanDo permission="task.create" projectId={123}>
 *   <Button>Create Task</Button>
 * </CanDo>
 *
 * <CanDo permission="task.delete" fallback={<span>No permission</span>}>
 *   <Button variant="destructive">Delete Task</Button>
 * </CanDo>
 * ```
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

// =============================================================================
// Types
// =============================================================================

export interface CanDoProps {
  /** Permission path to check, e.g., "task.create" */
  permission: string

  /** Optional workspace context */
  workspaceId?: number

  /** Optional project context */
  projectId?: number

  /** Content to render if permission is granted */
  children: ReactNode

  /** Optional content to render if permission is denied */
  fallback?: ReactNode

  /** If true, show children while loading (optimistic) */
  optimistic?: boolean
}

export interface CanDoAnyProps {
  /** Permission paths to check - shows if user has ANY of these */
  permissions: string[]

  /** Optional workspace context */
  workspaceId?: number

  /** Optional project context */
  projectId?: number

  /** Content to render if any permission is granted */
  children: ReactNode

  /** Optional content to render if all permissions are denied */
  fallback?: ReactNode

  /** If true, show children while loading (optimistic) */
  optimistic?: boolean
}

export interface CanDoAllProps {
  /** Permission paths to check - shows only if user has ALL of these */
  permissions: string[]

  /** Optional workspace context */
  workspaceId?: number

  /** Optional project context */
  projectId?: number

  /** Content to render if all permissions are granted */
  children: ReactNode

  /** Optional content to render if any permission is denied */
  fallback?: ReactNode

  /** If true, show children while loading (optimistic) */
  optimistic?: boolean
}

// =============================================================================
// Components
// =============================================================================

/**
 * Show children only if user has the specified permission.
 */
export function CanDo({
  permission,
  workspaceId,
  projectId,
  children,
  fallback = null,
  optimistic = false,
}: CanDoProps): ReactNode {
  const { canDo, isLoading } = usePermissions({ workspaceId, projectId })

  if (isLoading) {
    return optimistic ? children : null
  }

  return canDo(permission) ? children : fallback
}

/**
 * Show children if user has ANY of the specified permissions.
 */
export function CanDoAny({
  permissions,
  workspaceId,
  projectId,
  children,
  fallback = null,
  optimistic = false,
}: CanDoAnyProps): ReactNode {
  const { canDoAny, isLoading } = usePermissions({ workspaceId, projectId })

  if (isLoading) {
    return optimistic ? children : null
  }

  return canDoAny(permissions) ? children : fallback
}

/**
 * Show children only if user has ALL of the specified permissions.
 */
export function CanDoAll({
  permissions,
  workspaceId,
  projectId,
  children,
  fallback = null,
  optimistic = false,
}: CanDoAllProps): ReactNode {
  const { canDoAll, isLoading } = usePermissions({ workspaceId, projectId })

  if (isLoading) {
    return optimistic ? children : null
  }

  return canDoAll(permissions) ? children : fallback
}

// =============================================================================
// Default Export
// =============================================================================

export default CanDo
