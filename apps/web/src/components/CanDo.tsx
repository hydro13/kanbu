/*
 * CanDo Component
 * Version: 1.0.0
 *
 * Declarative permission-based rendering component.
 * Conditionally renders children based on user permissions.
 *
 * Usage:
 * ```tsx
 * <CanDo permission="task.create" projectId={123}>
 *   <button>Create Task</button>
 * </CanDo>
 *
 * <CanDo
 *   permissions={["task.edit", "task.delete"]}
 *   mode="any"
 *   fallback={<span>View only</span>}
 * >
 *   <TaskActions />
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

import { type ReactNode } from 'react';
import { usePermissions, type PermissionContext } from '@/hooks/usePermissions';

// =============================================================================
// Types
// =============================================================================

export interface CanDoProps extends PermissionContext {
  /** Single permission to check */
  permission?: string;

  /** Multiple permissions to check */
  permissions?: string[];

  /** How to combine multiple permissions: 'all' (AND) or 'any' (OR) */
  mode?: 'all' | 'any';

  /** Content to render when permission is granted */
  children: ReactNode;

  /** Content to render when permission is denied */
  fallback?: ReactNode;

  /** Content to render while loading permissions */
  loading?: ReactNode;

  /** If true, hide content while loading (default: show loading) */
  hideWhileLoading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CanDo({
  permission,
  permissions,
  mode = 'all',
  children,
  fallback = null,
  loading = null,
  hideWhileLoading = false,
  workspaceId,
  projectId,
}: CanDoProps) {
  const { canDo, canDoAll, canDoAny, isLoading } = usePermissions({
    workspaceId,
    projectId,
  });

  // Handle loading state
  if (isLoading) {
    if (hideWhileLoading) return null;
    return <>{loading}</>;
  }

  // Determine which permissions to check
  const permissionsToCheck = permissions ?? (permission ? [permission] : []);

  if (permissionsToCheck.length === 0) {
    // No permissions specified, always render children
    return <>{children}</>;
  }

  // Check permissions based on mode
  let hasPermission: boolean;
  if (permissionsToCheck.length === 1) {
    hasPermission = canDo(permissionsToCheck[0]!);
  } else if (mode === 'any') {
    hasPermission = canDoAny(permissionsToCheck);
  } else {
    hasPermission = canDoAll(permissionsToCheck);
  }

  // Render based on permission check result
  return <>{hasPermission ? children : fallback}</>;
}

// =============================================================================
// Convenience Components
// =============================================================================

/**
 * Show content only if user is a Domain Admin.
 */
export function CanDoIfDomainAdmin({
  children,
  fallback = null,
  loading = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}) {
  return (
    <CanDo permission="system.admin" fallback={fallback} loading={loading}>
      {children}
    </CanDo>
  );
}

/**
 * Show content only if user can manage the workspace.
 */
export function CanDoIfWorkspaceAdmin({
  workspaceId,
  children,
  fallback = null,
  loading = null,
}: {
  workspaceId: number;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}) {
  return (
    <CanDo
      permission="workspace.admin"
      workspaceId={workspaceId}
      fallback={fallback}
      loading={loading}
    >
      {children}
    </CanDo>
  );
}

/**
 * Show content only if user can manage the project.
 */
export function CanDoIfProjectAdmin({
  projectId,
  children,
  fallback = null,
  loading = null,
}: {
  projectId: number;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}) {
  return (
    <CanDo permission="project.admin" projectId={projectId} fallback={fallback} loading={loading}>
      {children}
    </CanDo>
  );
}

export default CanDo;
