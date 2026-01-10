/*
 * Dashboard Tree Store
 * Version: 1.0.0
 *
 * Zustand store for managing the dashboard sidebar tree UI state.
 * Handles workspace/section expand/collapse with localStorage persistence.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-10
 * Change: Initial implementation - Fase 1.2 of Dashboard Roadmap
 * ═══════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// =============================================================================
// Types
// =============================================================================

type SectionType = 'kanbu' | 'github' | 'groups'

interface SelectedItem {
  type: 'workspace' | 'project' | 'group' | 'repo'
  id: number
}

interface DashboardTreeState {
  // Which workspaces are expanded
  expandedWorkspaces: number[]

  // Which sections per workspace are expanded (key: workspaceId, value: array of sections)
  expandedSections: Record<number, SectionType[]>

  // Currently selected item for keyboard navigation
  selectedItem: SelectedItem | null

  // Actions
  toggleWorkspace: (workspaceId: number) => void
  toggleSection: (workspaceId: number, section: SectionType) => void
  setSelectedItem: (item: SelectedItem | null) => void
  expandAll: (workspaceIds: number[]) => void
  collapseAll: () => void
  isWorkspaceExpanded: (workspaceId: number) => boolean
  isSectionExpanded: (workspaceId: number, section: SectionType) => boolean
}

// =============================================================================
// Store
// =============================================================================

export const useDashboardTreeStore = create<DashboardTreeState>()(
  persist(
    (set, get) => ({
      expandedWorkspaces: [],
      expandedSections: {},
      selectedItem: null,

      toggleWorkspace: (workspaceId: number) => {
        set((state) => {
          const isExpanded = state.expandedWorkspaces.includes(workspaceId)
          return {
            expandedWorkspaces: isExpanded
              ? state.expandedWorkspaces.filter((id) => id !== workspaceId)
              : [...state.expandedWorkspaces, workspaceId],
          }
        })
      },

      toggleSection: (workspaceId: number, section: SectionType) => {
        set((state) => {
          const currentSections = state.expandedSections[workspaceId] ?? ['kanbu', 'github', 'groups']
          const isExpanded = currentSections.includes(section)

          return {
            expandedSections: {
              ...state.expandedSections,
              [workspaceId]: isExpanded
                ? currentSections.filter((s) => s !== section)
                : [...currentSections, section],
            },
          }
        })
      },

      setSelectedItem: (item: SelectedItem | null) => {
        set({ selectedItem: item })
      },

      expandAll: (workspaceIds: number[]) => {
        set({
          expandedWorkspaces: workspaceIds,
          // Don't touch expandedSections - they default to expanded
        })
      },

      collapseAll: () => {
        set({
          expandedWorkspaces: [],
          selectedItem: null,
        })
      },

      isWorkspaceExpanded: (workspaceId: number) => {
        return get().expandedWorkspaces.includes(workspaceId)
      },

      isSectionExpanded: (workspaceId: number, section: SectionType) => {
        const sections = get().expandedSections[workspaceId]
        // Default: sections are expanded if not explicitly set
        if (!sections) return true
        return sections.includes(section)
      },
    }),
    {
      name: 'kanbu-dashboard-tree',
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields
      partialize: (state) => ({
        expandedWorkspaces: state.expandedWorkspaces,
        expandedSections: state.expandedSections,
      }),
    }
  )
)

// =============================================================================
// Selector Hooks (for optimized re-renders)
// =============================================================================

/**
 * Select only the expanded workspaces
 */
export const useExpandedWorkspaces = () =>
  useDashboardTreeStore((state) => state.expandedWorkspaces)

/**
 * Select if a specific workspace is expanded
 */
export const useIsWorkspaceExpanded = (workspaceId: number) =>
  useDashboardTreeStore((state) => state.expandedWorkspaces.includes(workspaceId))

/**
 * Select if a specific section is expanded
 */
export const useIsSectionExpanded = (workspaceId: number, section: SectionType) =>
  useDashboardTreeStore((state) => {
    const sections = state.expandedSections[workspaceId]
    // Default: sections are expanded
    if (!sections) return true
    return sections.includes(section)
  })

/**
 * Select the currently selected item
 */
export const useSelectedItem = () =>
  useDashboardTreeStore((state) => state.selectedItem)
