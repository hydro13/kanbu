/*
 * useProjectFeatureAccess Hook
 * Version: 1.0.0
 *
 * Hook for checking which features a user can see in a project.
 * Maps ACL permissions to feature visibility:
 * - READ: Basic views (board, list, calendar, timeline)
 * - EXECUTE: Planning features (sprints, milestones, analytics)
 * - PERMISSIONS: Management features (members, settings, import-export, webhooks)
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * Fase: 8B - Feature ACL Resources
 * =============================================================================
 */

import { useMemo } from 'react'
import { useProjectAcl } from './useAclPermission'

// =============================================================================
// Types
// =============================================================================

// Feature slugs from seed-features.ts
export type FeatureSlug =
  | 'board'
  | 'list'
  | 'calendar'
  | 'timeline'
  | 'sprints'
  | 'milestones'
  | 'analytics'
  | 'members'
  | 'settings'
  | 'import-export'
  | 'webhooks'

// Feature categories based on permission requirements
const BASIC_FEATURES: FeatureSlug[] = ['board', 'list', 'calendar', 'timeline']
const PLANNING_FEATURES: FeatureSlug[] = ['sprints', 'milestones', 'analytics']
const MANAGEMENT_FEATURES: FeatureSlug[] = ['members', 'settings', 'import-export', 'webhooks']

export interface UseProjectFeatureAccessResult {
  /** Whether any features are accessible */
  hasAccess: boolean

  /** Check if a specific feature is visible */
  canSeeFeature: (slug: FeatureSlug) => boolean

  /** List of all visible feature slugs */
  visibleFeatures: FeatureSlug[]

  /** Whether permission data is still loading */
  isLoading: boolean
}

// =============================================================================
// Hook
// =============================================================================

export function useProjectFeatureAccess(projectId: number): UseProjectFeatureAccessResult {
  const aclResult = useProjectAcl(projectId)

  const result = useMemo((): UseProjectFeatureAccessResult => {
    // While loading, show nothing
    if (aclResult.isLoading) {
      return {
        hasAccess: false,
        canSeeFeature: () => false,
        visibleFeatures: [],
        isLoading: true,
      }
    }

    // Build list of visible features based on permissions
    const visibleFeatures: FeatureSlug[] = []

    // READ permission grants access to basic features
    if (aclResult.canRead) {
      visibleFeatures.push(...BASIC_FEATURES)
    }

    // EXECUTE permission grants access to planning features
    if (aclResult.canExecute) {
      visibleFeatures.push(...PLANNING_FEATURES)
    }

    // PERMISSIONS permission grants access to management features
    if (aclResult.canManagePermissions) {
      visibleFeatures.push(...MANAGEMENT_FEATURES)
    }

    // Create a Set for fast lookups
    const visibleSet = new Set(visibleFeatures)

    return {
      hasAccess: visibleFeatures.length > 0,
      canSeeFeature: (slug: FeatureSlug) => visibleSet.has(slug),
      visibleFeatures,
      isLoading: false,
    }
  }, [aclResult.isLoading, aclResult.canRead, aclResult.canExecute, aclResult.canManagePermissions])

  return result
}

export default useProjectFeatureAccess
