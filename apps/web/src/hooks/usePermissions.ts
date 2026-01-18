/*
 * usePermissions Hook
 * Version: 1.0.0
 *
 * Hook for checking user permissions based on the AD-style permission registry.
 * Works with the permission paths defined in the API (e.g., "task.create", "wiki.edit").
 *
 * Usage:
 * ```tsx
 * const { canDo, isLoading } = usePermissions({ projectId: 123 })
 *
 * if (canDo('task.create')) {
 *   // Show create button
 * }
 * ```
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * =============================================================================
 */

import { useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/authSlice';

// =============================================================================
// Types
// =============================================================================

export interface PermissionContext {
  workspaceId?: number;
  projectId?: number;
}

export interface UsePermissionsResult {
  /** Check if user has a specific permission */
  canDo: (permission: string) => boolean;

  /** Check multiple permissions at once */
  canDoAny: (permissions: string[]) => boolean;

  /** Check if user has ALL of the given permissions */
  canDoAll: (permissions: string[]) => boolean;

  /** Get all granted permissions as a Set */
  grantedPermissions: Set<string>;

  /** Whether permission data is still loading */
  isLoading: boolean;

  /** Whether there was an error fetching permissions */
  isError: boolean;

  /** Refetch permissions */
  refetch: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function usePermissions(context: PermissionContext = {}): UsePermissionsResult {
  const user = useAppSelector(selectUser);

  // Fetch effective permissions for the user in this context
  const permissionsQuery = trpc.group.myPermissions.useQuery(
    {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    },
    {
      enabled: !!user,
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    }
  );

  // Build a Set of granted permissions for fast lookups
  const grantedPermissions = useMemo(() => {
    if (!permissionsQuery.data) return new Set<string>();

    // The API returns { allowed: string[], denied: string[], full: [...] }
    return new Set<string>(permissionsQuery.data.allowed);
  }, [permissionsQuery.data]);

  // Check single permission
  const canDo = useCallback(
    (permission: string): boolean => {
      // Platform admins have all permissions
      if (user?.role === 'ADMIN') return true;

      return grantedPermissions.has(permission);
    },
    [grantedPermissions, user?.role]
  );

  // Check if user has ANY of the given permissions
  const canDoAny = useCallback(
    (permissions: string[]): boolean => {
      if (user?.role === 'ADMIN') return true;

      return permissions.some((p) => grantedPermissions.has(p));
    },
    [grantedPermissions, user?.role]
  );

  // Check if user has ALL of the given permissions
  const canDoAll = useCallback(
    (permissions: string[]): boolean => {
      if (user?.role === 'ADMIN') return true;

      return permissions.every((p) => grantedPermissions.has(p));
    },
    [grantedPermissions, user?.role]
  );

  return {
    canDo,
    canDoAny,
    canDoAll,
    grantedPermissions,
    isLoading: permissionsQuery.isLoading,
    isError: permissionsQuery.isError,
    refetch: permissionsQuery.refetch,
  };
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook for checking a single permission.
 * Simpler API when you only need to check one permission.
 */
export function useCanDo(
  permission: string,
  context: PermissionContext = {}
): { allowed: boolean; isLoading: boolean } {
  const { canDo, isLoading } = usePermissions(context);

  return {
    allowed: canDo(permission),
    isLoading,
  };
}

/**
 * Hook for project-scoped permissions.
 */
export function useProjectPermission(
  permission: string,
  projectId: number
): { allowed: boolean; isLoading: boolean } {
  return useCanDo(permission, { projectId });
}

/**
 * Hook for workspace-scoped permissions.
 */
export function useWorkspacePermission(
  permission: string,
  workspaceId: number
): { allowed: boolean; isLoading: boolean } {
  return useCanDo(permission, { workspaceId });
}

export default usePermissions;
