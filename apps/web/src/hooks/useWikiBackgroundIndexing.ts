/**
 * Wiki Background Indexing Hook
 * Version: 1.0.0
 *
 * Triggers wiki embedding reindexing during idle time.
 * Uses requestIdleCallback and user activity detection to
 * avoid impacting UI performance.
 *
 * Fase 15.5 - Background Indexing
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * =============================================================================
 */

import { useEffect, useRef, useCallback } from 'react';
import { trpc } from '../lib/trpc';

// =============================================================================
// Configuration
// =============================================================================

const IDLE_THRESHOLD_MS = 30_000; // 30 seconds of inactivity
const REINDEX_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between reindex attempts
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

// =============================================================================
// Types
// =============================================================================

export interface UseWikiBackgroundIndexingOptions {
  workspaceId: number;
  projectId?: number;
  enabled?: boolean;
  idleThreshold?: number; // ms before considered idle
  cooldown?: number; // ms between reindex attempts
  onReindexStart?: () => void;
  onReindexComplete?: (stats: { stored: number; skipped: number; errors: number }) => void;
  onReindexError?: (error: Error) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useWikiBackgroundIndexing({
  workspaceId,
  projectId,
  enabled = true,
  idleThreshold = IDLE_THRESHOLD_MS,
  cooldown = REINDEX_COOLDOWN_MS,
  onReindexStart,
  onReindexComplete,
  onReindexError,
}: UseWikiBackgroundIndexingOptions) {
  const lastActivityRef = useRef<number>(Date.now());
  const lastReindexRef = useRef<number>(0);
  const isReindexingRef = useRef<boolean>(false);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tRPC mutation for reindexing
  const reindexMutation = trpc.wikiAi.reindexEmbeddings.useMutation({
    onSuccess: (data) => {
      isReindexingRef.current = false;
      lastReindexRef.current = Date.now();
      console.log('[WikiBackgroundIndexing] Reindex complete:', data.stats);
      onReindexComplete?.(data.stats);
    },
    onError: (error) => {
      isReindexingRef.current = false;
      console.error('[WikiBackgroundIndexing] Reindex failed:', error.message);
      onReindexError?.(new Error(error.message));
    },
  });

  // Handle activity detection
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear any pending idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    // Set new idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      checkAndTriggerReindex();
    }, idleThreshold);
  }, [idleThreshold]);

  // Check if we should trigger reindex
  const checkAndTriggerReindex = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeSinceLastReindex = now - lastReindexRef.current;

    // Check conditions
    if (!enabled) {
      return;
    }

    if (isReindexingRef.current) {
      console.log('[WikiBackgroundIndexing] Already reindexing, skipping');
      return;
    }

    if (timeSinceLastActivity < idleThreshold) {
      console.log('[WikiBackgroundIndexing] User not idle long enough');
      return;
    }

    if (timeSinceLastReindex < cooldown) {
      console.log('[WikiBackgroundIndexing] Cooldown not elapsed');
      return;
    }

    // Use requestIdleCallback if available for better performance
    const runReindex = () => {
      console.log('[WikiBackgroundIndexing] Starting background reindex...');
      isReindexingRef.current = true;
      onReindexStart?.();

      reindexMutation.mutate({
        workspaceId,
        projectId,
        forceReindex: false, // Only reindex changed pages
      });
    };

    if ('requestIdleCallback' in window) {
      (window as Window).requestIdleCallback(runReindex, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(runReindex, 100);
    }
  }, [enabled, idleThreshold, cooldown, workspaceId, projectId, reindexMutation, onReindexStart]);

  // Setup activity listeners
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Add activity listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial idle check after mount
    idleTimeoutRef.current = setTimeout(() => {
      checkAndTriggerReindex();
    }, idleThreshold);

    return () => {
      // Cleanup
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, [enabled, handleActivity, checkAndTriggerReindex, idleThreshold]);

  // Manual trigger function
  const triggerReindex = useCallback(
    (force = false) => {
      if (isReindexingRef.current) {
        console.log('[WikiBackgroundIndexing] Already reindexing');
        return;
      }

      console.log('[WikiBackgroundIndexing] Manual reindex triggered');
      isReindexingRef.current = true;
      onReindexStart?.();

      reindexMutation.mutate({
        workspaceId,
        projectId,
        forceReindex: force,
      });
    },
    [workspaceId, projectId, reindexMutation, onReindexStart]
  );

  return {
    isReindexing: reindexMutation.isPending,
    lastReindexTime: lastReindexRef.current,
    triggerReindex,
    stats: reindexMutation.data?.stats,
  };
}
