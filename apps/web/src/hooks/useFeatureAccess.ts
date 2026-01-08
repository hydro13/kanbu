/*
 * useFeatureAccess Hook
 * Version: 1.0.0
 *
 * Generic hook for checking feature access across all scopes.
 * Maps ACL permissions to feature visibility for dashboard, profile, and admin features.
 *
 * Usage:
 * ```tsx
 * // For dashboard features
 * const { canSeeFeature, isLoading } = useFeatureAccess('dashboard')
 * if (canSeeFeature('overview')) { ... }
 *
 * // For admin features
 * const { canSeeFeature } = useFeatureAccess('admin')
 * if (canSeeFeature('users')) { ... }
 *
 * // For profile features
 * const { canSeeFeature } = useFeatureAccess('profile')
 * if (canSeeFeature('settings')) { ... }
 * ```
 *
 * Permission mapping:
 * - READ: Basic/view features
 * - EXECUTE: Advanced features
 * - PERMISSIONS: Management features
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 8C - System-wide Feature ACL
 * =============================================================================
 */

import { useMemo } from 'react'
import { useAclPermission, type AclResourceType } from './useAclPermission'

// =============================================================================
// Types
// =============================================================================

export type FeatureScope = 'dashboard' | 'profile' | 'admin'

// Dashboard feature slugs
export type DashboardFeatureSlug = 'overview' | 'widgets' | 'shortcuts' | 'recent-projects'

// Profile feature slugs
export type ProfileFeatureSlug = 'settings' | 'notifications' | 'api-keys' | 'sessions'

// Admin feature slugs
export type AdminFeatureSlug = 'users' | 'groups' | 'acl' | 'invites' | 'system-settings'

// Union of all feature slugs
export type SystemFeatureSlug = DashboardFeatureSlug | ProfileFeatureSlug | AdminFeatureSlug

// =============================================================================
// Feature Categories by Scope
// =============================================================================

// Dashboard features: all require at least READ on dashboard
const DASHBOARD_READ_FEATURES: DashboardFeatureSlug[] = ['overview', 'recent-projects']
const DASHBOARD_EXECUTE_FEATURES: DashboardFeatureSlug[] = ['widgets', 'shortcuts']

// Profile features: all require at least READ on profile
const PROFILE_READ_FEATURES: ProfileFeatureSlug[] = ['settings', 'notifications']
const PROFILE_EXECUTE_FEATURES: ProfileFeatureSlug[] = ['api-keys', 'sessions']

// Admin features: different permission levels
const ADMIN_READ_FEATURES: AdminFeatureSlug[] = ['users', 'groups']
const ADMIN_EXECUTE_FEATURES: AdminFeatureSlug[] = ['invites']
const ADMIN_PERMISSIONS_FEATURES: AdminFeatureSlug[] = ['acl', 'system-settings']

// =============================================================================
// Hook Result Interface
// =============================================================================

export interface UseFeatureAccessResult<T extends string> {
  /** Whether any features are accessible */
  hasAccess: boolean

  /** Check if a specific feature is visible */
  canSeeFeature: (slug: T) => boolean

  /** List of all visible feature slugs */
  visibleFeatures: T[]

  /** Whether permission data is still loading */
  isLoading: boolean
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Map scope to ACL resource type
 */
function scopeToResourceType(scope: FeatureScope): AclResourceType {
  switch (scope) {
    case 'dashboard':
      return 'dashboard'
    case 'profile':
      return 'profile'
    case 'admin':
      return 'admin'
  }
}

/**
 * Generic hook for checking feature access by scope.
 * Works for dashboard, profile, and admin features.
 *
 * Note: For project features, use useProjectFeatureAccess instead.
 */
export function useFeatureAccess<T extends SystemFeatureSlug>(
  scope: FeatureScope
): UseFeatureAccessResult<T> {
  const resourceType = scopeToResourceType(scope)
  const aclResult = useAclPermission({ resourceType, resourceId: null })

  const result = useMemo((): UseFeatureAccessResult<T> => {
    // While loading, show nothing
    if (aclResult.isLoading) {
      return {
        hasAccess: false,
        canSeeFeature: () => false,
        visibleFeatures: [],
        isLoading: true,
      }
    }

    const visibleFeatures: string[] = []

    // Build visible features based on scope and permissions
    switch (scope) {
      case 'dashboard':
        if (aclResult.canRead) {
          visibleFeatures.push(...DASHBOARD_READ_FEATURES)
        }
        if (aclResult.canExecute) {
          visibleFeatures.push(...DASHBOARD_EXECUTE_FEATURES)
        }
        break

      case 'profile':
        if (aclResult.canRead) {
          visibleFeatures.push(...PROFILE_READ_FEATURES)
        }
        if (aclResult.canExecute) {
          visibleFeatures.push(...PROFILE_EXECUTE_FEATURES)
        }
        break

      case 'admin':
        if (aclResult.canRead) {
          visibleFeatures.push(...ADMIN_READ_FEATURES)
        }
        if (aclResult.canExecute) {
          visibleFeatures.push(...ADMIN_EXECUTE_FEATURES)
        }
        if (aclResult.canManagePermissions) {
          visibleFeatures.push(...ADMIN_PERMISSIONS_FEATURES)
        }
        break
    }

    // Create a Set for fast lookups
    const visibleSet = new Set(visibleFeatures)

    return {
      hasAccess: visibleFeatures.length > 0,
      canSeeFeature: (slug: T) => visibleSet.has(slug),
      visibleFeatures: visibleFeatures as T[],
      isLoading: false,
    }
  }, [scope, aclResult.isLoading, aclResult.canRead, aclResult.canExecute, aclResult.canManagePermissions])

  return result
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook for dashboard feature access.
 */
export function useDashboardFeatureAccess(): UseFeatureAccessResult<DashboardFeatureSlug> {
  return useFeatureAccess<DashboardFeatureSlug>('dashboard')
}

/**
 * Hook for profile feature access.
 */
export function useProfileFeatureAccess(): UseFeatureAccessResult<ProfileFeatureSlug> {
  return useFeatureAccess<ProfileFeatureSlug>('profile')
}

/**
 * Hook for admin feature access.
 */
export function useAdminFeatureAccess(): UseFeatureAccessResult<AdminFeatureSlug> {
  return useFeatureAccess<AdminFeatureSlug>('admin')
}

export default useFeatureAccess
