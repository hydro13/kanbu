/*
 * Board Slice
 * Version: 1.0.0
 *
 * Redux state management for board UI state.
 * Handles collapsed columns, filters, sort order, and view preferences.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:40 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// =============================================================================
// Types
// =============================================================================

export type SortField = 'position' | 'priority' | 'dueDate' | 'createdAt' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface BoardFilters {
  search: string;
  priority: number | null;
  assigneeId: number | null;
  tagIds: number[];
  showClosed: boolean;
}

export interface BoardState {
  // Column UI state
  collapsedColumns: number[];

  // Swimlane UI state
  collapsedSwimlanes: number[];

  // Filter state
  filters: BoardFilters;

  // Sort state
  sortField: SortField;
  sortOrder: SortOrder;

  // View preferences
  compactView: boolean;
  showEmptySwimlanes: boolean;

  // Selection state (for multi-select operations)
  selectedTaskIds: number[];

  // Drag state (for visual feedback)
  draggingTaskId: number | null;
  dropTargetColumnId: number | null;
  dropTargetSwimlaneId: number | null;
}

// =============================================================================
// Local Storage Keys
// =============================================================================

const COLLAPSED_COLUMNS_KEY = 'kanbu_collapsed_columns';
const COLLAPSED_SWIMLANES_KEY = 'kanbu_collapsed_swimlanes';
const COMPACT_VIEW_KEY = 'kanbu_compact_view';

// =============================================================================
// Local Storage Helpers
// =============================================================================

function loadCollapsedColumns(): number[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(COLLAPSED_COLUMNS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

function loadCollapsedSwimlanes(): number[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(COLLAPSED_SWIMLANES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

function loadCompactView(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COMPACT_VIEW_KEY) === 'true';
}

// =============================================================================
// Initial State
// =============================================================================

const initialState: BoardState = {
  collapsedColumns: loadCollapsedColumns(),
  collapsedSwimlanes: loadCollapsedSwimlanes(),
  filters: {
    search: '',
    priority: null,
    assigneeId: null,
    tagIds: [],
    showClosed: false,
  },
  sortField: 'position',
  sortOrder: 'asc',
  compactView: loadCompactView(),
  showEmptySwimlanes: true,
  selectedTaskIds: [],
  draggingTaskId: null,
  dropTargetColumnId: null,
  dropTargetSwimlaneId: null,
};

// =============================================================================
// Slice
// =============================================================================

export const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    // -------------------------------------------------------------------------
    // Column Collapse
    // -------------------------------------------------------------------------

    toggleColumnCollapse: (state, action: PayloadAction<number>) => {
      const columnId = action.payload;
      const index = state.collapsedColumns.indexOf(columnId);
      if (index === -1) {
        state.collapsedColumns.push(columnId);
      } else {
        state.collapsedColumns.splice(index, 1);
      }
      localStorage.setItem(COLLAPSED_COLUMNS_KEY, JSON.stringify(state.collapsedColumns));
    },

    setColumnCollapsed: (
      state,
      action: PayloadAction<{ columnId: number; collapsed: boolean }>
    ) => {
      const { columnId, collapsed } = action.payload;
      const index = state.collapsedColumns.indexOf(columnId);
      if (collapsed && index === -1) {
        state.collapsedColumns.push(columnId);
      } else if (!collapsed && index !== -1) {
        state.collapsedColumns.splice(index, 1);
      }
      localStorage.setItem(COLLAPSED_COLUMNS_KEY, JSON.stringify(state.collapsedColumns));
    },

    // -------------------------------------------------------------------------
    // Swimlane Collapse
    // -------------------------------------------------------------------------

    toggleSwimlaneCollapse: (state, action: PayloadAction<number>) => {
      const swimlaneId = action.payload;
      const index = state.collapsedSwimlanes.indexOf(swimlaneId);
      if (index === -1) {
        state.collapsedSwimlanes.push(swimlaneId);
      } else {
        state.collapsedSwimlanes.splice(index, 1);
      }
      localStorage.setItem(COLLAPSED_SWIMLANES_KEY, JSON.stringify(state.collapsedSwimlanes));
    },

    // -------------------------------------------------------------------------
    // Filters
    // -------------------------------------------------------------------------

    setSearchFilter: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
    },

    setPriorityFilter: (state, action: PayloadAction<number | null>) => {
      state.filters.priority = action.payload;
    },

    setAssigneeFilter: (state, action: PayloadAction<number | null>) => {
      state.filters.assigneeId = action.payload;
    },

    setTagFilter: (state, action: PayloadAction<number[]>) => {
      state.filters.tagIds = action.payload;
    },

    toggleShowClosed: (state) => {
      state.filters.showClosed = !state.filters.showClosed;
    },

    clearFilters: (state) => {
      state.filters = {
        search: '',
        priority: null,
        assigneeId: null,
        tagIds: [],
        showClosed: false,
      };
    },

    // -------------------------------------------------------------------------
    // Sorting
    // -------------------------------------------------------------------------

    setSortField: (state, action: PayloadAction<SortField>) => {
      state.sortField = action.payload;
    },

    setSortOrder: (state, action: PayloadAction<SortOrder>) => {
      state.sortOrder = action.payload;
    },

    toggleSortOrder: (state) => {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    },

    // -------------------------------------------------------------------------
    // View Preferences
    // -------------------------------------------------------------------------

    toggleCompactView: (state) => {
      state.compactView = !state.compactView;
      localStorage.setItem(COMPACT_VIEW_KEY, state.compactView.toString());
    },

    setShowEmptySwimlanes: (state, action: PayloadAction<boolean>) => {
      state.showEmptySwimlanes = action.payload;
    },

    // -------------------------------------------------------------------------
    // Selection
    // -------------------------------------------------------------------------

    selectTask: (state, action: PayloadAction<number>) => {
      if (!state.selectedTaskIds.includes(action.payload)) {
        state.selectedTaskIds.push(action.payload);
      }
    },

    deselectTask: (state, action: PayloadAction<number>) => {
      state.selectedTaskIds = state.selectedTaskIds.filter((id) => id !== action.payload);
    },

    toggleTaskSelection: (state, action: PayloadAction<number>) => {
      const index = state.selectedTaskIds.indexOf(action.payload);
      if (index === -1) {
        state.selectedTaskIds.push(action.payload);
      } else {
        state.selectedTaskIds.splice(index, 1);
      }
    },

    clearSelection: (state) => {
      state.selectedTaskIds = [];
    },

    // -------------------------------------------------------------------------
    // Drag State
    // -------------------------------------------------------------------------

    setDraggingTask: (state, action: PayloadAction<number | null>) => {
      state.draggingTaskId = action.payload;
    },

    setDropTarget: (
      state,
      action: PayloadAction<{ columnId: number | null; swimlaneId: number | null }>
    ) => {
      state.dropTargetColumnId = action.payload.columnId;
      state.dropTargetSwimlaneId = action.payload.swimlaneId;
    },

    clearDragState: (state) => {
      state.draggingTaskId = null;
      state.dropTargetColumnId = null;
      state.dropTargetSwimlaneId = null;
    },

    // -------------------------------------------------------------------------
    // Reset
    // -------------------------------------------------------------------------

    resetBoardState: () => initialState,
  },
});

// =============================================================================
// Actions & Selectors
// =============================================================================

export const {
  toggleColumnCollapse,
  setColumnCollapsed,
  toggleSwimlaneCollapse,
  setSearchFilter,
  setPriorityFilter,
  setAssigneeFilter,
  setTagFilter,
  toggleShowClosed,
  clearFilters,
  setSortField,
  setSortOrder,
  toggleSortOrder,
  toggleCompactView,
  setShowEmptySwimlanes,
  selectTask,
  deselectTask,
  toggleTaskSelection,
  clearSelection,
  setDraggingTask,
  setDropTarget,
  clearDragState,
  resetBoardState,
} = boardSlice.actions;

// Selectors
export const selectBoardState = (state: { board: BoardState }) => state.board;
export const selectCollapsedColumns = (state: { board: BoardState }) =>
  state.board.collapsedColumns;
export const selectCollapsedSwimlanes = (state: { board: BoardState }) =>
  state.board.collapsedSwimlanes;
export const selectFilters = (state: { board: BoardState }) => state.board.filters;
export const selectSortField = (state: { board: BoardState }) => state.board.sortField;
export const selectSortOrder = (state: { board: BoardState }) => state.board.sortOrder;
export const selectCompactView = (state: { board: BoardState }) => state.board.compactView;
export const selectSelectedTaskIds = (state: { board: BoardState }) => state.board.selectedTaskIds;
export const selectDraggingTaskId = (state: { board: BoardState }) => state.board.draggingTaskId;

export default boardSlice.reducer;
