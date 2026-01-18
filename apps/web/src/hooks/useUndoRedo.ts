/*
 * useUndoRedo Hook
 * Version: 1.0.0
 *
 * Hook for undo/redo functionality with multi-user concurrency support.
 * Provides keyboard shortcuts and conflict detection.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectProjectUndoStack,
  selectProjectRedoStack,
  popUndo,
  popRedo,
  removeStaleActions,
  updateLastRedoActionSnapshot,
  updateLastActionSnapshot,
  type UndoAction,
} from '@/store/undoSlice';
import { useProjectPermissions } from './useProjectPermissions';

// =============================================================================
// Types
// =============================================================================

export interface UndoRedoState {
  /** Perform undo action */
  performUndo: () => Promise<void>;
  /** Perform redo action */
  performRedo: () => Promise<void>;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo actions available */
  undoCount: number;
  /** Number of redo actions available */
  redoCount: number;
  /** Whether an undo/redo operation is in progress */
  isProcessing: boolean;
  /** Current toast message (if any) */
  toast: ToastMessage | null;
  /** Dismiss the current toast */
  dismissToast: () => void;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useUndoRedo(projectId: number): UndoRedoState {
  const dispatch = useAppDispatch();
  const { canEdit } = useProjectPermissions(projectId);
  const projectUndoStack = useAppSelector(selectProjectUndoStack(projectId));
  const projectRedoStack = useAppSelector(selectProjectRedoStack(projectId));

  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const utils = trpc.useUtils();
  const updateMutation = trpc.task.update.useMutation();

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = useCallback((message: ToastMessage) => {
    setToast({ ...message, id: `${Date.now()}` });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Perform undo with concurrency check
  const performUndo = useCallback(async () => {
    console.log('[UNDO] performUndo called', {
      canEdit,
      stackLength: projectUndoStack.length,
      isProcessing,
    });

    if (!canEdit || projectUndoStack.length === 0 || isProcessing) return;

    const action = projectUndoStack[projectUndoStack.length - 1];
    if (!action) return;

    console.log('[UNDO] Action to undo:', {
      taskId: action.taskId,
      description: action.description,
      snapshotUpdatedAt: action.snapshotUpdatedAt,
      previousState: action.previousState,
      newState: action.newState,
    });

    setIsProcessing(true);

    try {
      // Invalidate cache first to ensure we get fresh data
      await utils.task.get.invalidate({ taskId: action.taskId });
      // Fetch current task to check for concurrent modifications
      const currentTask = await utils.task.get.fetch({ taskId: action.taskId });

      console.log('[UNDO] Concurrency check:', {
        currentTaskUpdatedAt: currentTask.updatedAt,
        actionSnapshotUpdatedAt: action.snapshotUpdatedAt,
        match: currentTask.updatedAt === action.snapshotUpdatedAt,
      });

      // Concurrency check - compare updatedAt timestamps
      if (currentTask.updatedAt !== action.snapshotUpdatedAt) {
        // Task was modified by another user
        console.log('[UNDO] CONFLICT DETECTED!');
        showToast({
          id: 'conflict',
          type: 'warning',
          message: 'This task was modified by another user. Undo cancelled.',
          action: {
            label: 'Force Undo',
            onClick: () => forceUndo(action),
          },
        });
        dispatch(removeStaleActions({ taskId: action.taskId }));
        return;
      }

      // Perform the undo
      console.log('[UNDO] Performing mutation...');
      const result = await updateMutation.mutateAsync({
        taskId: action.taskId,
        dateStarted: action.previousState.dateStarted,
        dateDue: action.previousState.dateDue,
      });

      console.log('[UNDO] Mutation result:', {
        resultUpdatedAt: result.updatedAt,
      });

      dispatch(popUndo());
      utils.task.list.invalidate();

      // Update the snapshot in redo stack with new updatedAt
      if (result.updatedAt) {
        console.log('[UNDO] Updating snapshots with new updatedAt:', result.updatedAt);
        dispatch(
          updateLastRedoActionSnapshot({
            taskId: action.taskId,
            newUpdatedAt: result.updatedAt,
          })
        );
      }

      showToast({
        id: 'undo',
        type: 'success',
        message: `Undo: ${action.description}`,
      });
    } catch {
      showToast({
        id: 'error',
        type: 'error',
        message: 'Failed to undo. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [canEdit, projectUndoStack, isProcessing, utils, updateMutation, dispatch, showToast]);

  // Force undo without concurrency check (user explicitly requested)
  const forceUndo = useCallback(
    async (action: UndoAction) => {
      setIsProcessing(true);
      dismissToast();

      try {
        const result = await updateMutation.mutateAsync({
          taskId: action.taskId,
          dateStarted: action.previousState.dateStarted,
          dateDue: action.previousState.dateDue,
        });

        dispatch(popUndo());
        utils.task.list.invalidate();

        // Update the snapshot in redo stack with new updatedAt
        if (result.updatedAt) {
          dispatch(
            updateLastRedoActionSnapshot({
              taskId: action.taskId,
              newUpdatedAt: result.updatedAt,
            })
          );
        }

        showToast({
          id: 'force-undo',
          type: 'success',
          message: `Force undo: ${action.description}`,
        });
      } catch {
        showToast({
          id: 'error',
          type: 'error',
          message: 'Failed to force undo. Please try again.',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [updateMutation, dispatch, utils, showToast, dismissToast]
  );

  // Perform redo with concurrency check
  const performRedo = useCallback(async () => {
    console.log('[REDO] performRedo called', {
      canEdit,
      stackLength: projectRedoStack.length,
      isProcessing,
    });

    if (!canEdit || projectRedoStack.length === 0 || isProcessing) return;

    const action = projectRedoStack[projectRedoStack.length - 1];
    if (!action) return;

    console.log('[REDO] Action to redo:', {
      taskId: action.taskId,
      description: action.description,
      snapshotUpdatedAt: action.snapshotUpdatedAt,
      previousState: action.previousState,
      newState: action.newState,
    });

    setIsProcessing(true);

    try {
      // Perform the redo
      console.log('[REDO] Performing mutation...');
      const result = await updateMutation.mutateAsync({
        taskId: action.taskId,
        dateStarted: action.newState.dateStarted,
        dateDue: action.newState.dateDue,
      });

      console.log('[REDO] Mutation result:', {
        resultUpdatedAt: result.updatedAt,
      });

      dispatch(popRedo());
      utils.task.list.invalidate();

      // Update the snapshot in undo stack with new updatedAt
      if (result.updatedAt) {
        console.log('[REDO] Updating snapshots with new updatedAt:', result.updatedAt);
        dispatch(
          updateLastActionSnapshot({
            taskId: action.taskId,
            newUpdatedAt: result.updatedAt,
          })
        );
      }

      showToast({
        id: 'redo',
        type: 'success',
        message: `Redo: ${action.description}`,
      });
    } catch {
      showToast({
        id: 'error',
        type: 'error',
        message: 'Failed to redo. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [canEdit, projectRedoStack, isProcessing, updateMutation, dispatch, utils, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if user can edit and no input is focused
      if (!canEdit) return;
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      // Ctrl+Z or Cmd+Z for undo
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          performRedo();
        } else {
          performUndo();
        }
      }

      // Also support Ctrl+Y for redo (Windows convention)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        performRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEdit, performUndo, performRedo]);

  return {
    performUndo,
    performRedo,
    canUndo: canEdit && projectUndoStack.length > 0 && !isProcessing,
    canRedo: canEdit && projectRedoStack.length > 0 && !isProcessing,
    undoCount: projectUndoStack.length,
    redoCount: projectRedoStack.length,
    isProcessing,
    toast,
    dismissToast,
  };
}

// =============================================================================
// Helper: Push undo action (re-exported for convenience)
// =============================================================================

export { pushUndoAction } from '@/store/undoSlice';

export default useUndoRedo;
