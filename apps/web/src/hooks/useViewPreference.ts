/*
 * useViewPreference Hook
 * Version: 1.0.0
 *
 * Manages view preference state per project with localStorage persistence.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: de75c403-118c-4293-8d05-c2e3147fd7c8
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react'

// =============================================================================
// Types
// =============================================================================

export type ViewType = 'board' | 'list' | 'calendar' | 'timeline'

interface ViewPreferences {
  [projectId: number]: ViewType
}

const STORAGE_KEY = 'kanbu-view-preferences'
const DEFAULT_VIEW: ViewType = 'board'

// =============================================================================
// Helper Functions
// =============================================================================

function loadPreferences(): ViewPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load view preferences:', e)
  }
  return {}
}

function savePreferences(prefs: ViewPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    console.error('Failed to save view preferences:', e)
  }
}

// =============================================================================
// Hook
// =============================================================================

export interface UseViewPreferenceResult {
  /** Current view type for this project */
  view: ViewType
  /** Set the view type and persist it */
  setView: (view: ViewType) => void
  /** All available view types */
  viewTypes: readonly ViewType[]
  /** Check if a view is the current view */
  isCurrentView: (view: ViewType) => boolean
}

export function useViewPreference(projectId: number): UseViewPreferenceResult {
  const [preferences, setPreferences] = useState<ViewPreferences>(() => loadPreferences())

  // Get current view for this project
  const view = preferences[projectId] ?? DEFAULT_VIEW

  // Set view and persist
  const setView = useCallback(
    (newView: ViewType) => {
      setPreferences((prev) => {
        const next = { ...prev, [projectId]: newView }
        savePreferences(next)
        return next
      })
    },
    [projectId]
  )

  // Check if a view is current
  const isCurrentView = useCallback((v: ViewType) => v === view, [view])

  // Available view types
  const viewTypes = ['board', 'list', 'calendar', 'timeline'] as const

  return {
    view,
    setView,
    viewTypes,
    isCurrentView,
  }
}

// =============================================================================
// View Path Helpers
// =============================================================================

export function getViewPath(projectId: number, view: ViewType): string {
  switch (view) {
    case 'board':
      return `/project/${projectId}/board`
    case 'list':
      return `/project/${projectId}/list`
    case 'calendar':
      return `/project/${projectId}/calendar`
    case 'timeline':
      return `/project/${projectId}/timeline`
    default:
      return `/project/${projectId}/board`
  }
}

export function getViewFromPath(path: string): ViewType {
  if (path.includes('/list')) return 'list'
  if (path.includes('/calendar')) return 'calendar'
  if (path.includes('/timeline')) return 'timeline'
  return 'board'
}

export default useViewPreference
