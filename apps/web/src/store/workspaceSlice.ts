/*
 * Workspace Slice
 * Version: 1.0.0
 *
 * Redux state management for workspace selection and caching.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T04:00 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// =============================================================================
// Types
// =============================================================================

export interface Workspace {
  id: number
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  memberCount: number
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  isLoading: boolean
  error: string | null
}

// =============================================================================
// Local Storage
// =============================================================================

const WORKSPACE_KEY = 'kanbu_current_workspace'

function loadCurrentWorkspaceId(): number | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = localStorage.getItem(WORKSPACE_KEY)
  if (stored) {
    const id = parseInt(stored, 10)
    return isNaN(id) ? null : id
  }
  return null
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: WorkspaceState = {
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,
}

// =============================================================================
// Slice
// =============================================================================

export const workspaceSlice = createSlice({
  name: 'workspace',
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
     * Set workspaces list
     */
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload
      state.isLoading = false
      state.error = null

      // If no current workspace, select first one (or last selected)
      if (!state.currentWorkspace && action.payload.length > 0) {
        const savedId = loadCurrentWorkspaceId()
        const saved = savedId
          ? action.payload.find((w) => w.id === savedId)
          : null
        state.currentWorkspace = saved || action.payload[0] || null

        if (state.currentWorkspace) {
          localStorage.setItem(
            WORKSPACE_KEY,
            state.currentWorkspace.id.toString()
          )
        }
      }
    },

    /**
     * Set current workspace
     */
    setCurrentWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.currentWorkspace = action.payload

      if (action.payload) {
        localStorage.setItem(WORKSPACE_KEY, action.payload.id.toString())
      } else {
        localStorage.removeItem(WORKSPACE_KEY)
      }
    },

    /**
     * Select workspace by ID
     */
    selectWorkspace: (state, action: PayloadAction<number>) => {
      const workspace = state.workspaces.find((w) => w.id === action.payload)
      if (workspace) {
        state.currentWorkspace = workspace
        localStorage.setItem(WORKSPACE_KEY, workspace.id.toString())
      }
    },

    /**
     * Add a new workspace to the list
     */
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.push(action.payload)
      // Auto-select if it's the only one
      if (state.workspaces.length === 1) {
        state.currentWorkspace = action.payload
        localStorage.setItem(WORKSPACE_KEY, action.payload.id.toString())
      }
    },

    /**
     * Update a workspace in the list
     */
    updateWorkspace: (state, action: PayloadAction<Partial<Workspace> & { id: number }>) => {
      const index = state.workspaces.findIndex((w) => w.id === action.payload.id)
      if (index !== -1) {
        state.workspaces[index] = {
          ...state.workspaces[index]!,
          ...action.payload,
        }
        // Update current if it's the same workspace
        if (state.currentWorkspace?.id === action.payload.id) {
          state.currentWorkspace = state.workspaces[index]!
        }
      }
    },

    /**
     * Remove a workspace from the list
     */
    removeWorkspace: (state, action: PayloadAction<number>) => {
      state.workspaces = state.workspaces.filter((w) => w.id !== action.payload)
      // If current workspace was removed, select first available
      if (state.currentWorkspace?.id === action.payload) {
        state.currentWorkspace = state.workspaces[0] || null
        if (state.currentWorkspace) {
          localStorage.setItem(WORKSPACE_KEY, state.currentWorkspace.id.toString())
        } else {
          localStorage.removeItem(WORKSPACE_KEY)
        }
      }
    },

    /**
     * Clear all workspace state (on logout)
     */
    clearWorkspaces: (state) => {
      state.currentWorkspace = null
      state.workspaces = []
      state.isLoading = false
      state.error = null
      localStorage.removeItem(WORKSPACE_KEY)
    },
  },
})

// =============================================================================
// Actions & Selectors
// =============================================================================

export const {
  setLoading,
  setError,
  setWorkspaces,
  setCurrentWorkspace,
  selectWorkspace,
  addWorkspace,
  updateWorkspace,
  removeWorkspace,
  clearWorkspaces,
} = workspaceSlice.actions

// Selectors
export const selectWorkspaceState = (state: { workspace: WorkspaceState }) =>
  state.workspace
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) =>
  state.workspace.currentWorkspace
export const selectWorkspaces = (state: { workspace: WorkspaceState }) =>
  state.workspace.workspaces
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) =>
  state.workspace.isLoading
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) =>
  state.workspace.error

export default workspaceSlice.reducer
