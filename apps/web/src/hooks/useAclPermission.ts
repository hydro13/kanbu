/*
 * useAclPermission Hook
 * Version: 1.0.0
 *
 * Hook for checking ACL-based permissions on resources.
 * Uses the filesystem-style ACL system with RWXDP bitmask.
 *
 * Usage:
 * ```tsx
 * const { canRead, canWrite, canDelete, isLoading } = useAclPermission({
 *   resourceType: 'workspace',
 *   resourceId: 123
 * })
 *
 * if (canWrite) {
 *   // Show edit button
 * }
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

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/authSlice';

// =============================================================================
// Types
// =============================================================================

export type AclResourceType =
  | 'root'
  | 'system'
  | 'dashboard'
  | 'workspace'
  | 'project'
  | 'feature'
  | 'admin'
  | 'profile';

export interface AclPermissionContext {
  resourceType: AclResourceType;
  resourceId: number | null;
}

export interface UseAclPermissionResult {
  /** Whether user has any access to this resource */
  allowed: boolean;

  /** Raw effective permissions bitmask */
  effectivePermissions: number;

  /** Permission names as array */
  effectivePermissionNames: string[];

  /** Preset name (Read Only, Contributor, Editor, Full Control) */
  presetName: string | null;

  // Convenience flags
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;

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

export function useAclPermission(context: AclPermissionContext): UseAclPermissionResult {
  const user = useAppSelector(selectUser);

  // Fetch ACL permissions for this resource
  const permissionQuery = trpc.acl.myPermission.useQuery(
    {
      resourceType: context.resourceType,
      resourceId: context.resourceId,
    },
    {
      enabled: !!user,
      staleTime: 30 * 1000, // 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  // Memoize result
  const result = useMemo((): UseAclPermissionResult => {
    // Platform ADMIN has all permissions
    if (user?.role === 'ADMIN') {
      return {
        allowed: true,
        effectivePermissions: 31, // Full control
        effectivePermissionNames: ['READ', 'WRITE', 'EXECUTE', 'DELETE', 'PERMISSIONS'],
        presetName: 'Full Control',
        canRead: true,
        canWrite: true,
        canExecute: true,
        canDelete: true,
        canManagePermissions: true,
        isLoading: false,
        isError: false,
        refetch: permissionQuery.refetch,
      };
    }

    // Use query data
    const data = permissionQuery.data;
    return {
      allowed: data?.allowed ?? false,
      effectivePermissions: data?.effectivePermissions ?? 0,
      effectivePermissionNames: data?.effectivePermissionNames ?? [],
      presetName: data?.presetName ?? null,
      canRead: data?.canRead ?? false,
      canWrite: data?.canWrite ?? false,
      canExecute: data?.canExecute ?? false,
      canDelete: data?.canDelete ?? false,
      canManagePermissions: data?.canManagePermissions ?? false,
      isLoading: permissionQuery.isLoading,
      isError: permissionQuery.isError,
      refetch: permissionQuery.refetch,
    };
  }, [
    user?.role,
    permissionQuery.data,
    permissionQuery.isLoading,
    permissionQuery.isError,
    permissionQuery.refetch,
  ]);

  return result;
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook for checking workspace permissions.
 */
export function useWorkspaceAcl(workspaceId: number): UseAclPermissionResult {
  return useAclPermission({ resourceType: 'workspace', resourceId: workspaceId });
}

/**
 * Hook for checking project permissions.
 */
export function useProjectAcl(projectId: number): UseAclPermissionResult {
  return useAclPermission({ resourceType: 'project', resourceId: projectId });
}

/**
 * Hook for checking feature permissions (Fase 8B).
 * Use this to check if a user can see a specific menu item/feature.
 */
export function useFeatureAcl(featureId: number): UseAclPermissionResult {
  return useAclPermission({ resourceType: 'feature', resourceId: featureId });
}

/**
 * Hook for checking system-level permissions (admin access).
 */
export function useSystemAcl(): UseAclPermissionResult {
  return useAclPermission({ resourceType: 'system', resourceId: null });
}

/**
 * Hook for checking root-level permissions (domain admin).
 */
export function useRootAcl(): UseAclPermissionResult {
  return useAclPermission({ resourceType: 'root', resourceId: null });
}

export default useAclPermission;
