/**
 * usePageWidth Hook
 *
 * Manages page width preferences per device.
 * Allows users to toggle between normal and full-width layouts,
 * and optionally pin their preference for specific pages.
 *
 * Uses localStorage + custom events to sync state across all hook instances.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Constants
// =============================================================================

const DEVICE_ID_KEY = 'kanbu_device_id';
const WIDTH_STATE_KEY = 'kanbu_page_width_state';
const WIDTH_CHANGE_EVENT = 'kanbu_page_width_change';

// Pages where pulse hint should show (suggests full width is beneficial)
const PULSE_HINT_PAGES = ['/board', '/calendar', '/timeline'];

// Minimum viewport width to suggest full-width mode
const MIN_WIDTH_FOR_HINT = 1400;

// =============================================================================
// Types
// =============================================================================

export interface UsePageWidthOptions {
  /** If false, disables all server queries (for unauthenticated users) */
  enabled?: boolean;
}

export interface UsePageWidthReturn {
  isFullWidth: boolean;
  isPinned: boolean;
  isLoading: boolean;
  showPulseHint: boolean;
  toggle: () => void;
  togglePin: () => void;
}

interface WidthState {
  [pagePath: string]: {
    isFullWidth: boolean;
    isPinned: boolean;
  };
}

// =============================================================================
// Device ID Management
// =============================================================================

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000000';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// =============================================================================
// Global State Management (localStorage + events)
// =============================================================================

function getWidthState(): WidthState {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(WIDTH_STATE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setWidthState(pagePath: string, isFullWidth: boolean, isPinned: boolean): void {
  if (typeof window === 'undefined') return;

  const state = getWidthState();
  state[pagePath] = { isFullWidth, isPinned };
  localStorage.setItem(WIDTH_STATE_KEY, JSON.stringify(state));

  // Dispatch custom event to notify all hook instances
  window.dispatchEvent(new CustomEvent(WIDTH_CHANGE_EVENT, {
    detail: { pagePath, isFullWidth, isPinned }
  }));
}

function getPageWidthState(pagePath: string): { isFullWidth: boolean; isPinned: boolean } {
  const state = getWidthState();
  return state[pagePath] || { isFullWidth: false, isPinned: false };
}

// =============================================================================
// Hook
// =============================================================================

export function usePageWidth(options: UsePageWidthOptions = {}): UsePageWidthReturn {
  const { enabled = true } = options;
  const location = useLocation();
  const pagePath = location.pathname;
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  // Get initial state from localStorage
  const initialState = useMemo(() => getPageWidthState(pagePath), [pagePath]);

  // Local state for immediate UI feedback
  const [localIsFullWidth, setLocalIsFullWidth] = useState(initialState.isFullWidth);
  const [localIsPinned, setLocalIsPinned] = useState(initialState.isPinned);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );

  // Query for saved preference (only when enabled/authenticated)
  const preferenceQuery = trpc.user.getPageWidthPreference.useQuery(
    { deviceId, pagePath },
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // Mutation to save preference
  const setPreferenceMutation = trpc.user.setPageWidthPreference.useMutation();
  const utils = trpc.useUtils();

  // Sync local state with server data (when loaded from server)
  useEffect(() => {
    if (preferenceQuery.data) {
      setLocalIsFullWidth(preferenceQuery.data.isFullWidth);
      setLocalIsPinned(preferenceQuery.data.isPinned);
      // Also update localStorage
      setWidthState(pagePath, preferenceQuery.data.isFullWidth, preferenceQuery.data.isPinned);
    }
  }, [preferenceQuery.data, pagePath]);

  // Listen for changes from other hook instances
  useEffect(() => {
    function handleWidthChange(event: CustomEvent<{ pagePath: string; isFullWidth: boolean; isPinned: boolean }>) {
      if (event.detail.pagePath === pagePath) {
        setLocalIsFullWidth(event.detail.isFullWidth);
        setLocalIsPinned(event.detail.isPinned);
      }
    }

    window.addEventListener(WIDTH_CHANGE_EVENT, handleWidthChange as EventListener);
    return () => window.removeEventListener(WIDTH_CHANGE_EVENT, handleWidthChange as EventListener);
  }, [pagePath]);

  // Update state when pagePath changes
  useEffect(() => {
    const state = getPageWidthState(pagePath);
    setLocalIsFullWidth(state.isFullWidth);
    setLocalIsPinned(state.isPinned);
  }, [pagePath]);

  // Track viewport width for pulse hint
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle full width (immediate UI update + sync across instances)
  const toggle = useCallback(() => {
    const newValue = !localIsFullWidth;

    // Update localStorage and notify all instances
    setWidthState(pagePath, newValue, localIsPinned);

    // If pinned, also save to server
    if (localIsPinned && enabled) {
      setPreferenceMutation.mutate(
        {
          deviceId,
          pagePath,
          isFullWidth: newValue,
          isPinned: true,
        },
        {
          onSuccess: () => {
            utils.user.getPageWidthPreference.invalidate({ deviceId, pagePath });
          },
        }
      );
    }
  }, [localIsFullWidth, localIsPinned, deviceId, pagePath, setPreferenceMutation, utils, enabled]);

  // Toggle pin state
  const togglePin = useCallback(() => {
    const newPinned = !localIsPinned;

    // Update localStorage and notify all instances
    setWidthState(pagePath, localIsFullWidth, newPinned);

    if (enabled) {
      setPreferenceMutation.mutate(
        {
          deviceId,
          pagePath,
          isFullWidth: localIsFullWidth,
          isPinned: newPinned,
        },
        {
          onSuccess: () => {
            utils.user.getPageWidthPreference.invalidate({ deviceId, pagePath });
          },
        }
      );
    }
  }, [localIsPinned, localIsFullWidth, deviceId, pagePath, setPreferenceMutation, utils, enabled]);

  // Determine if pulse hint should show
  const showPulseHint = useMemo(() => {
    const isHintPage = PULSE_HINT_PAGES.some((p) => pagePath.includes(p));
    if (!isHintPage) return false;
    if (localIsFullWidth) return false;
    if (viewportWidth < MIN_WIDTH_FOR_HINT) return false;
    return true;
  }, [pagePath, localIsFullWidth, viewportWidth]);

  return {
    isFullWidth: localIsFullWidth,
    isPinned: localIsPinned,
    isLoading: preferenceQuery.isLoading,
    showPulseHint,
    toggle,
    togglePin,
  };
}

export default usePageWidth;
