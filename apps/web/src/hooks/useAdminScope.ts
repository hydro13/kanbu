/*
 * useAdminScope Hook
 * Version: 1.0.0
 *
 * Hook for determining the current user's admin scope.
 * Used to filter admin panel views based on user's ACL permissions.
 *
 * Usage:
 * ```tsx
 * const { scope, isLoading, isDomainAdmin, canSeeSystemSettings } = useAdminScope()
 *
 * if (isDomainAdmin) {
 *   // Show all admin features
 * } else if (scope?.hasAnyAdminAccess) {
 *   // Show workspace-scoped admin features
 * }
 * ```
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 6 - Scoped Admin Panel
 * =============================================================================
 */

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/authSlice';

// =============================================================================
// Types
// =============================================================================

export type ScopeLevel = 'system' | 'workspace' | 'project' | 'none';

export interface AdminScope {
  /** The highest scope level this user has */
  level: ScopeLevel;

  /** Is this user a Domain Admin (full system access) */
  isDomainAdmin: boolean;

  /** Workspace IDs the user has access to */
  workspaceIds: number[];

  /** Project IDs the user has access to */
  projectIds: number[];

  /** Permission flags for common operations */
  permissions: {
    canManageUsers: boolean;
    canManageGroups: boolean;
    canManageWorkspaces: boolean;
    canAccessAdminPanel: boolean;
    canManageAcl: boolean;
  };

  /** Convenience flags for UI */
  hasAnyAdminAccess: boolean;
  canSeeAllUsers: boolean;
  canSeeAllGroups: boolean;
  canSeeSystemSettings: boolean;
}

export interface UseAdminScopeResult {
  /** The user's admin scope (null if loading or not logged in) */
  scope: AdminScope | null;

  /** Is the scope data loading? */
  isLoading: boolean;

  /** Is this user a Domain Admin? */
  isDomainAdmin: boolean;

  /** Does user have any admin access? */
  hasAnyAdminAccess: boolean;

  /** Can user see system-wide settings? */
  canSeeSystemSettings: boolean;

  /** Can user manage users? */
  canManageUsers: boolean;

  /** Can user manage groups? */
  canManageGroups: boolean;

  /** Can user manage ACL entries? */
  canManageAcl: boolean;

  /** Check if a workspace is in scope */
  isWorkspaceInScope: (workspaceId: number) => boolean;

  /** Check if a project is in scope */
  isProjectInScope: (projectId: number) => boolean;

  /** Refetch scope data */
  refetch: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAdminScope(): UseAdminScopeResult {
  const user = useAppSelector(selectUser);

  // Fetch admin scope from backend
  const { data, isLoading, refetch } = trpc.group.myAdminScope.useQuery(undefined, {
    enabled: !!user, // Only fetch when logged in
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  // Build the scope object
  const scope: AdminScope | null = useMemo(() => {
    if (!data) return null;

    return {
      level: data.level as ScopeLevel,
      isDomainAdmin: data.isDomainAdmin,
      workspaceIds: data.workspaceIds,
      projectIds: data.projectIds,
      permissions: data.permissions,
      hasAnyAdminAccess: data.hasAnyAdminAccess,
      canSeeAllUsers: data.canSeeAllUsers,
      canSeeAllGroups: data.canSeeAllGroups,
      canSeeSystemSettings: data.canSeeSystemSettings,
    };
  }, [data]);

  // Helper to check if workspace is in scope
  const isWorkspaceInScope = useMemo(() => {
    return (workspaceId: number): boolean => {
      if (!scope) return false;
      if (scope.isDomainAdmin) return true;
      return scope.workspaceIds.includes(workspaceId);
    };
  }, [scope]);

  // Helper to check if project is in scope
  const isProjectInScope = useMemo(() => {
    return (projectId: number): boolean => {
      if (!scope) return false;
      if (scope.isDomainAdmin) return true;
      return scope.projectIds.includes(projectId);
    };
  }, [scope]);

  return {
    scope,
    isLoading,
    isDomainAdmin: scope?.isDomainAdmin ?? false,
    hasAnyAdminAccess: scope?.hasAnyAdminAccess ?? false,
    canSeeSystemSettings: scope?.canSeeSystemSettings ?? false,
    canManageUsers: scope?.permissions.canManageUsers ?? false,
    canManageGroups: scope?.permissions.canManageGroups ?? false,
    canManageAcl: scope?.permissions.canManageAcl ?? false,
    isWorkspaceInScope,
    isProjectInScope,
    refetch: () => refetch(),
  };
}

export default useAdminScope;
