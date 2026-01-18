/*
 * Redux Store Configuration
 * Version: 1.3.0
 *
 * Central Redux store with auth, workspace, project, and board slices.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:01 CET
 * Change: Added workspaceReducer
 *
 * Modified by:
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Signed: 2025-12-28T12:27 CET
 * Change: Added projectReducer
 *
 * Modified by:
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Signed: 2025-12-28T13:40 CET
 * Change: Added boardReducer
 * ═══════════════════════════════════════════════════════════════════
 */

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import authReducer from './authSlice';
import workspaceReducer from './workspaceSlice';
import projectReducer from './projectSlice';
import boardReducer from './boardSlice';
import undoReducer from './undoSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    project: projectReducer,
    board: boardReducer,
    undo: undoReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // tRPC queries kunnen non-serializable data bevatten
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
