/*
 * Undo Slice
 * Version: 1.0.0
 *
 * Redux state management for undo/redo functionality.
 * Tracks task date changes with multi-user concurrency support.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

// =============================================================================
// Types
// =============================================================================

export interface UndoAction {
  id: string;
  type: 'task.dateChange';
  taskId: number;
  projectId: number;
  previousState: {
    dateStarted: string | null;
    dateDue: string | null;
  };
  newState: {
    dateStarted: string | null;
    dateDue: string | null;
  };
  snapshotUpdatedAt: string; // For concurrency check
  timestamp: number;
  description: string;
}

export interface UndoState {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
}

// =============================================================================
// Constants
// =============================================================================

const MAX_STACK_SIZE = 50;
const UNDO_STORAGE_KEY = 'kanbu_undo_stack';
const REDO_STORAGE_KEY = 'kanbu_redo_stack';

// =============================================================================
// Local Storage Helpers
// =============================================================================

function loadUndoStack(): UndoAction[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(UNDO_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Filter out old entries (older than 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return parsed.filter((action: UndoAction) => action.timestamp > oneDayAgo);
    } catch {
      return [];
    }
  }
  return [];
}

function loadRedoStack(): UndoAction[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(REDO_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return parsed.filter((action: UndoAction) => action.timestamp > oneDayAgo);
    } catch {
      return [];
    }
  }
  return [];
}

function saveUndoStack(stack: UndoAction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(UNDO_STORAGE_KEY, JSON.stringify(stack));
}

function saveRedoStack(stack: UndoAction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REDO_STORAGE_KEY, JSON.stringify(stack));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: UndoState = {
  undoStack: loadUndoStack(),
  redoStack: loadRedoStack(),
};

// =============================================================================
// Slice
// =============================================================================

const undoSlice = createSlice({
  name: 'undo',
  initialState,
  reducers: {
    // Push a new action to the undo stack
    pushUndoAction: (state, action: PayloadAction<Omit<UndoAction, 'id' | 'timestamp'>>) => {
      const newAction: UndoAction = {
        ...action.payload,
        id: generateId(),
        timestamp: Date.now(),
      };

      console.log('[SLICE] pushUndoAction:', {
        taskId: newAction.taskId,
        snapshotUpdatedAt: newAction.snapshotUpdatedAt,
        description: newAction.description,
      });

      // Add to undo stack
      state.undoStack.push(newAction);

      // Enforce max stack size
      if (state.undoStack.length > MAX_STACK_SIZE) {
        state.undoStack = state.undoStack.slice(-MAX_STACK_SIZE);
      }

      // Clear redo stack when new action is pushed
      state.redoStack = [];

      // Persist
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },

    // Pop from undo stack and move to redo
    popUndo: (state) => {
      const action = state.undoStack.pop();
      if (action) {
        console.log('[SLICE] popUndo: moving action to redo stack', {
          taskId: action.taskId,
          snapshotUpdatedAt: action.snapshotUpdatedAt,
          undoStackLength: state.undoStack.length,
          redoStackLength: state.redoStack.length + 1,
        });
        state.redoStack.push(action);
        saveUndoStack(state.undoStack);
        saveRedoStack(state.redoStack);
      }
    },

    // Pop from redo stack and move to undo
    popRedo: (state) => {
      const action = state.redoStack.pop();
      if (action) {
        console.log('[SLICE] popRedo: moving action to undo stack', {
          taskId: action.taskId,
          snapshotUpdatedAt: action.snapshotUpdatedAt,
          undoStackLength: state.undoStack.length + 1,
          redoStackLength: state.redoStack.length,
        });
        state.undoStack.push(action);
        saveUndoStack(state.undoStack);
        saveRedoStack(state.redoStack);
      }
    },

    // Clear all actions for a specific project
    clearProject: (state, action: PayloadAction<{ projectId: number }>) => {
      state.undoStack = state.undoStack.filter((a) => a.projectId !== action.payload.projectId);
      state.redoStack = state.redoStack.filter((a) => a.projectId !== action.payload.projectId);
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },

    // Remove stale actions for a task (when modified by another user)
    removeStaleActions: (state, action: PayloadAction<{ taskId: number }>) => {
      state.undoStack = state.undoStack.filter((a) => a.taskId !== action.payload.taskId);
      state.redoStack = state.redoStack.filter((a) => a.taskId !== action.payload.taskId);
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },

    // Update snapshotUpdatedAt for ALL actions of a task in BOTH stacks after mutation success
    // This is needed because any change to a task invalidates all undo/redo snapshots for that task
    updateTaskSnapshot: (
      state,
      action: PayloadAction<{ taskId: number; newUpdatedAt: string }>
    ) => {
      // Update ALL actions for this task in undo stack
      for (let i = 0; i < state.undoStack.length; i++) {
        const undoAction = state.undoStack[i];
        if (undoAction && undoAction.taskId === action.payload.taskId) {
          undoAction.snapshotUpdatedAt = action.payload.newUpdatedAt;
        }
      }
      // Update ALL actions for this task in redo stack
      for (let i = 0; i < state.redoStack.length; i++) {
        const redoAction = state.redoStack[i];
        if (redoAction && redoAction.taskId === action.payload.taskId) {
          redoAction.snapshotUpdatedAt = action.payload.newUpdatedAt;
        }
      }
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },

    // Aliases for backwards compatibility (both now update both stacks)
    updateLastActionSnapshot: (
      state,
      action: PayloadAction<{ taskId: number; newUpdatedAt: string }>
    ) => {
      let undoUpdated = 0;
      let redoUpdated = 0;
      // Update ALL actions for this task in BOTH stacks
      for (let i = 0; i < state.undoStack.length; i++) {
        const undoAction = state.undoStack[i];
        if (undoAction && undoAction.taskId === action.payload.taskId) {
          undoAction.snapshotUpdatedAt = action.payload.newUpdatedAt;
          undoUpdated++;
        }
      }
      for (let i = 0; i < state.redoStack.length; i++) {
        const redoAction = state.redoStack[i];
        if (redoAction && redoAction.taskId === action.payload.taskId) {
          redoAction.snapshotUpdatedAt = action.payload.newUpdatedAt;
          redoUpdated++;
        }
      }
      console.log('[SLICE] updateLastActionSnapshot:', {
        taskId: action.payload.taskId,
        newUpdatedAt: action.payload.newUpdatedAt,
        undoActionsUpdated: undoUpdated,
        redoActionsUpdated: redoUpdated,
      });
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },

    updateLastRedoActionSnapshot: (
      state,
      action: PayloadAction<{ taskId: number; newUpdatedAt: string }>
    ) => {
      let undoUpdated = 0;
      let redoUpdated = 0;
      // Update ALL actions for this task in BOTH stacks
      for (let i = 0; i < state.undoStack.length; i++) {
        const undoAction = state.undoStack[i];
        if (undoAction && undoAction.taskId === action.payload.taskId) {
          undoAction.snapshotUpdatedAt = action.payload.newUpdatedAt;
          undoUpdated++;
        }
      }
      for (let i = 0; i < state.redoStack.length; i++) {
        const redoAction = state.redoStack[i];
        if (redoAction && redoAction.taskId === action.payload.taskId) {
          redoAction.snapshotUpdatedAt = action.payload.newUpdatedAt;
          redoUpdated++;
        }
      }
      console.log('[SLICE] updateLastRedoActionSnapshot:', {
        taskId: action.payload.taskId,
        newUpdatedAt: action.payload.newUpdatedAt,
        undoActionsUpdated: undoUpdated,
        redoActionsUpdated: redoUpdated,
      });
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },

    // Clear all stacks
    clearAll: (state) => {
      state.undoStack = [];
      state.redoStack = [];
      saveUndoStack(state.undoStack);
      saveRedoStack(state.redoStack);
    },
  },
});

// =============================================================================
// Actions
// =============================================================================

export const {
  pushUndoAction,
  popUndo,
  popRedo,
  clearProject,
  removeStaleActions,
  updateTaskSnapshot,
  updateLastActionSnapshot,
  updateLastRedoActionSnapshot,
  clearAll,
} = undoSlice.actions;

// =============================================================================
// Selectors
// =============================================================================

export const selectUndoState = (state: RootState) => state.undo;
export const selectUndoStack = (state: RootState) => state.undo.undoStack;
export const selectRedoStack = (state: RootState) => state.undo.redoStack;

export const selectProjectUndoStack = (projectId: number) => (state: RootState) =>
  state.undo.undoStack.filter((a) => a.projectId === projectId);

export const selectProjectRedoStack = (projectId: number) => (state: RootState) =>
  state.undo.redoStack.filter((a) => a.projectId === projectId);

export const selectCanUndo = (projectId: number) => (state: RootState) =>
  state.undo.undoStack.some((a) => a.projectId === projectId);

export const selectCanRedo = (projectId: number) => (state: RootState) =>
  state.undo.redoStack.some((a) => a.projectId === projectId);

// =============================================================================
// Export
// =============================================================================

export default undoSlice.reducer;
