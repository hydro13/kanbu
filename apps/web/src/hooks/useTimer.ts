/*
 * useTimer Hook
 * Version: 1.0.0
 *
 * Client-side timer state management with live updates.
 * - Tracks elapsed time from a start timestamp
 * - Updates every second when running
 * - Persists timer state across page refreshes via localStorage
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 404dd64e-7f41-4608-bb62-2cc5ead5fd6a
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:50 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface UseTimerOptions {
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** When the timer was started */
  startedAt: Date | null;
  /** Storage key for persistence (optional) */
  storageKey?: string;
}

export interface UseTimerResult {
  /** Elapsed time in hours */
  elapsedHours: number;
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Formatted elapsed time (HH:MM:SS) */
  formattedElapsed: string;
  /** Formatted elapsed time short (1h 30m) */
  formattedElapsedShort: string;
}

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_PREFIX = 'kanbu_timer_';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate elapsed seconds between two dates
 */
function calculateElapsedSeconds(startedAt: Date, now: Date = new Date()): number {
  const elapsed = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor(elapsed / 1000));
}

/**
 * Format seconds as HH:MM:SS
 */
function formatHHMMSS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (h > 0) parts.push(h.toString().padStart(2, '0'));
  parts.push(m.toString().padStart(2, '0'));
  parts.push(s.toString().padStart(2, '0'));

  return parts.join(':');
}

/**
 * Format seconds as short string (1h 30m)
 */
function formatShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h === 0 && m === 0) return `${seconds}s`;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// =============================================================================
// useTimer Hook
// =============================================================================

export function useTimer({ isRunning, startedAt, storageKey }: UseTimerOptions): UseTimerResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from storage on mount
  useEffect(() => {
    if (storageKey && isRunning && !startedAt) {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.startedAt) {
            // We have a stored start time, calculate elapsed
            const storedStart = new Date(parsed.startedAt);
            setElapsedSeconds(calculateElapsedSeconds(storedStart));
          }
        } catch {
          // Invalid storage, ignore
        }
      }
    }
  }, [storageKey, isRunning, startedAt]);

  // Save to storage when running
  useEffect(() => {
    if (storageKey && isRunning && startedAt) {
      localStorage.setItem(
        `${STORAGE_PREFIX}${storageKey}`,
        JSON.stringify({ startedAt: startedAt.toISOString() })
      );
    } else if (storageKey && !isRunning) {
      localStorage.removeItem(`${STORAGE_PREFIX}${storageKey}`);
    }
  }, [storageKey, isRunning, startedAt]);

  // Update elapsed time every second when running
  useEffect(() => {
    if (isRunning && startedAt) {
      // Initial calculation
      setElapsedSeconds(calculateElapsedSeconds(startedAt));

      // Update every second
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(calculateElapsedSeconds(startedAt));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Not running, clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setElapsedSeconds(0);
    }
  }, [isRunning, startedAt]);

  const elapsedHours = elapsedSeconds / 3600;
  const formattedElapsed = formatHHMMSS(elapsedSeconds);
  const formattedElapsedShort = formatShort(elapsedSeconds);

  return {
    elapsedHours,
    elapsedSeconds,
    formattedElapsed,
    formattedElapsedShort,
  };
}

// =============================================================================
// useTimerPersist Hook (for persisting active timers)
// =============================================================================

export interface ActiveTimer {
  subtaskId: number;
  startedAt: string;
}

const ACTIVE_TIMERS_KEY = 'kanbu_active_timers';

/**
 * Hook to persist active timers across page refreshes
 */
export function useTimerPersist() {
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);

  // Load from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_TIMERS_KEY);
    if (stored) {
      try {
        setActiveTimers(JSON.parse(stored));
      } catch {
        // Invalid storage, reset
        setActiveTimers([]);
      }
    }
  }, []);

  // Save to storage when timers change
  useEffect(() => {
    localStorage.setItem(ACTIVE_TIMERS_KEY, JSON.stringify(activeTimers));
  }, [activeTimers]);

  const startTimer = useCallback((subtaskId: number) => {
    setActiveTimers((prev) => {
      // Remove existing timer for this subtask
      const filtered = prev.filter((t) => t.subtaskId !== subtaskId);
      return [...filtered, { subtaskId, startedAt: new Date().toISOString() }];
    });
  }, []);

  const stopTimer = useCallback((subtaskId: number) => {
    setActiveTimers((prev) => prev.filter((t) => t.subtaskId !== subtaskId));
  }, []);

  const getTimer = useCallback(
    (subtaskId: number): ActiveTimer | undefined => {
      return activeTimers.find((t) => t.subtaskId === subtaskId);
    },
    [activeTimers]
  );

  return {
    activeTimers,
    startTimer,
    stopTimer,
    getTimer,
  };
}

export default useTimer;
