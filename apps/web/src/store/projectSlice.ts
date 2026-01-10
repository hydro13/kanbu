/*
 * Project Slice
 * Version: 1.0.0
 *
 * Redux state management for project selection and caching.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 *
 * Modified by:
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Signed: 2025-12-28T13:40 CET
 * Change: Fixed settings type to unknown for Prisma JsonValue compatibility
 * ═══════════════════════════════════════════════════════════════════
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// =============================================================================
// Types
// =============================================================================

export type ProjectRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER'

export interface ProjectGitHubInfo {
  repoCount: number
  primaryRepo: {
    fullName: string
    syncEnabled: boolean
    lastSyncAt: string | null
  } | null
}

export interface Project {
  id: number
  name: string
  identifier: string | null
  description: string | null
  isPublic: boolean
  isActive: boolean
  startDate: string | null
  endDate: string | null
  lastActivityAt: string | null
  createdAt: string
  taskCount: number
  memberCount: number
  userRole: ProjectRole | null
  // GitHub integration info
  hasGitHub?: boolean
  github?: ProjectGitHubInfo | null
}

export interface ProjectDetail extends Project {
  workspaceId: number
  settings: unknown
  updatedAt: string
  columns: Array<{
    id: number
    title: string
    description: string | null
    position: number
    taskLimit: number
    isCollapsed: boolean
    showClosed: boolean
  }>
  swimlanes: Array<{
    id: number
    name: string
    description: string | null
    position: number
  }>
}

export interface ProjectState {
  currentProject: ProjectDetail | null
  projects: Project[]
  isLoading: boolean
  error: string | null
}

// =============================================================================
// Local Storage
// =============================================================================

const PROJECT_KEY = 'kanbu_current_project'

function loadCurrentProjectId(): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(PROJECT_KEY)
  if (stored) {
    const id = parseInt(stored, 10)
    return isNaN(id) ? null : id
  }
  return null
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: ProjectState = {
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,
}

// =============================================================================
// Slice
// =============================================================================

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) {
        state.error = null
      }
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isLoading = false
    },

    /**
     * Set projects list
     */
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload
      state.isLoading = false
      state.error = null
    },

    /**
     * Set current project (with full details)
     */
    setCurrentProject: (state, action: PayloadAction<ProjectDetail | null>) => {
      state.currentProject = action.payload

      if (action.payload) {
        localStorage.setItem(PROJECT_KEY, action.payload.id.toString())
      } else {
        localStorage.removeItem(PROJECT_KEY)
      }
    },

    /**
     * Select project by ID (sets current project from list, but needs detail fetch)
     */
    selectProject: (_state, action: PayloadAction<number>) => {
      localStorage.setItem(PROJECT_KEY, action.payload.toString())
      // Note: The actual project detail should be fetched via tRPC
      // This just saves the selection for next load
    },

    /**
     * Add a new project to the list
     */
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.unshift(action.payload)
    },

    /**
     * Update a project in the list
     */
    updateProject: (state, action: PayloadAction<Partial<Project> & { id: number }>) => {
      const index = state.projects.findIndex((p) => p.id === action.payload.id)
      if (index !== -1) {
        state.projects[index] = {
          ...state.projects[index]!,
          ...action.payload,
        }
      }
      // Update current project if it's the same
      if (state.currentProject?.id === action.payload.id) {
        state.currentProject = {
          ...state.currentProject,
          ...action.payload,
        }
      }
    },

    /**
     * Remove a project from the list
     */
    removeProject: (state, action: PayloadAction<number>) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload)
      // Clear current if it was removed
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null
        localStorage.removeItem(PROJECT_KEY)
      }
    },

    /**
     * Clear all project state (when switching workspace or logout)
     */
    clearProjects: (state) => {
      state.currentProject = null
      state.projects = []
      state.isLoading = false
      state.error = null
      localStorage.removeItem(PROJECT_KEY)
    },

    /**
     * Update column in current project
     */
    updateColumn: (
      state,
      action: PayloadAction<{ columnId: number; updates: Partial<ProjectDetail['columns'][0]> }>
    ) => {
      if (state.currentProject) {
        const index = state.currentProject.columns.findIndex(
          (c) => c.id === action.payload.columnId
        )
        if (index !== -1) {
          state.currentProject.columns[index] = {
            ...state.currentProject.columns[index]!,
            ...action.payload.updates,
          }
        }
      }
    },
  },
})

// =============================================================================
// Actions & Selectors
// =============================================================================

export const {
  setLoading,
  setError,
  setProjects,
  setCurrentProject,
  selectProject,
  addProject,
  updateProject,
  removeProject,
  clearProjects,
  updateColumn,
} = projectSlice.actions

// Selectors
export const selectProjectState = (state: { project: ProjectState }) => state.project
export const selectCurrentProject = (state: { project: ProjectState }) =>
  state.project.currentProject
export const selectProjects = (state: { project: ProjectState }) => state.project.projects
export const selectProjectLoading = (state: { project: ProjectState }) => state.project.isLoading
export const selectProjectError = (state: { project: ProjectState }) => state.project.error

// Helper to get last selected project ID (for initial load)
export const getLastProjectId = loadCurrentProjectId

export default projectSlice.reducer
