/*
 * Theme Context
 * Version: 3.0.0
 *
 * Provides theme management for a multi-user application.
 * Supports theme mode, accent colors, custom colors, density, and sidebar position.
 *
 * IMPORTANT: This is a multi-user app where each user has their own theme preference.
 * - Backend user profile = SOURCE OF TRUTH
 * - localStorage = ONLY for FOUC prevention (cached value of current user)
 * - On login: backend theme overwrites localStorage
 * - On logout: localStorage is cleared
 * - Not logged in: system preference is used
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * Change: Initial implementation (Fase 3.1 - Theme Infrastructure)
 * Modified: Added accent color support (Fase 3.2)
 * Modified: Added advanced theming - custom colors, density, sidebar position (Fase 8)
 * ===================================================================
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  type AccentName,
  type CustomAccentHSL,
  defaultAccent,
  isValidAccent,
  applyCustomAccent,
  clearCustomAccent,
} from '@/lib/themes/accents';

// =============================================================================
// Types
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type Density = 'compact' | 'normal' | 'spacious';
export type SidebarPosition = 'left' | 'right';

// Re-export AccentName and CustomAccentHSL for convenience
export type { AccentName, CustomAccentHSL };

export interface ThemeContextValue {
  /** The current theme setting (light, dark, or system) */
  theme: ThemeMode;
  /** The resolved theme that's actually being applied (light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Set the theme mode - this triggers backend sync */
  setTheme: (theme: ThemeMode) => void;
  /** Whether system prefers dark mode */
  systemPrefersDark: boolean;
  /** Current accent color */
  accent: AccentName;
  /** Set the accent color - this triggers backend sync */
  setAccent: (accent: AccentName) => void;
  /** Custom accent color (when accent === 'custom') */
  customAccent: CustomAccentHSL | null;
  /** Set custom accent color */
  setCustomAccent: (hsl: CustomAccentHSL) => void;
  /** Current UI density */
  density: Density;
  /** Set UI density */
  setDensity: (density: Density) => void;
  /** Current sidebar position */
  sidebarPosition: SidebarPosition;
  /** Set sidebar position */
  setSidebarPosition: (position: SidebarPosition) => void;
  /** Whether theme/accent is being synced to backend */
  isSyncing: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const THEME_STORAGE_KEY = 'kanbu-theme-cache';
const ACCENT_STORAGE_KEY = 'kanbu-accent-cache';
const CUSTOM_ACCENT_STORAGE_KEY = 'kanbu-custom-accent-cache';
const DENSITY_STORAGE_KEY = 'kanbu-density-cache';
const SIDEBAR_POSITION_STORAGE_KEY = 'kanbu-sidebar-position-cache';
const DEFAULT_THEME: ThemeMode = 'system';
const DEFAULT_DENSITY: Density = 'normal';
const DEFAULT_SIDEBAR_POSITION: SidebarPosition = 'left';

// =============================================================================
// Helpers
// =============================================================================

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getCachedTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

function setCachedTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function getCachedAccent(): AccentName | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  if (stored && isValidAccent(stored)) {
    return stored;
  }
  return null;
}

function setCachedAccent(accent: AccentName): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCENT_STORAGE_KEY, accent);
}

function getCachedCustomAccent(): CustomAccentHSL | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CUSTOM_ACCENT_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CustomAccentHSL;
      if (
        typeof parsed.h === 'number' &&
        typeof parsed.s === 'number' &&
        typeof parsed.l === 'number'
      ) {
        return parsed;
      }
    } catch {
      // Invalid JSON
    }
  }
  return null;
}

function setCachedCustomAccent(hsl: CustomAccentHSL | null): void {
  if (typeof window === 'undefined') return;
  if (hsl) {
    localStorage.setItem(CUSTOM_ACCENT_STORAGE_KEY, JSON.stringify(hsl));
  } else {
    localStorage.removeItem(CUSTOM_ACCENT_STORAGE_KEY);
  }
}

function getCachedDensity(): Density | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
  if (stored === 'compact' || stored === 'normal' || stored === 'spacious') {
    return stored;
  }
  return null;
}

function setCachedDensity(density: Density): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DENSITY_STORAGE_KEY, density);
}

function getCachedSidebarPosition(): SidebarPosition | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY);
  if (stored === 'left' || stored === 'right') {
    return stored;
  }
  return null;
}

function setCachedSidebarPosition(position: SidebarPosition): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIDEBAR_POSITION_STORAGE_KEY, position);
}

function clearCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(THEME_STORAGE_KEY);
  localStorage.removeItem(ACCENT_STORAGE_KEY);
  localStorage.removeItem(CUSTOM_ACCENT_STORAGE_KEY);
  localStorage.removeItem(DENSITY_STORAGE_KEY);
  localStorage.removeItem(SIDEBAR_POSITION_STORAGE_KEY);
}

function resolveTheme(theme: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return theme;
}

function applyThemeToDOM(resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function applyAccentToDOM(accent: AccentName): void {
  const root = document.documentElement;
  root.setAttribute('data-accent', accent);
}

function applyDensityToDOM(density: Density): void {
  const root = document.documentElement;
  root.setAttribute('data-density', density);
}

function applySidebarPositionToDOM(position: SidebarPosition): void {
  const root = document.documentElement;
  root.setAttribute('data-sidebar', position);
}

// =============================================================================
// Context
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Theme from authenticated user's profile (backend source of truth).
   * Pass null/undefined when user is not authenticated.
   */
  userTheme?: ThemeMode | null;
  /**
   * Accent from authenticated user's profile (backend source of truth).
   * Pass null/undefined when user is not authenticated.
   */
  userAccent?: AccentName | null;
  /**
   * Custom accent color (HSL) from user profile.
   */
  userCustomAccent?: CustomAccentHSL | null;
  /**
   * UI density from user profile.
   */
  userDensity?: Density | null;
  /**
   * Sidebar position from user profile.
   */
  userSidebarPosition?: SidebarPosition | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /**
   * Callback when user changes theme.
   * Parent component should call the backend mutation here.
   */
  onThemeChange?: (theme: ThemeMode) => Promise<void> | void;
  /**
   * Callback when user changes accent.
   * Parent component should call the backend mutation here.
   */
  onAccentChange?: (accent: AccentName) => Promise<void> | void;
  /**
   * Callback when user changes custom accent color.
   */
  onCustomAccentChange?: (hsl: CustomAccentHSL) => Promise<void> | void;
  /**
   * Callback when user changes density.
   */
  onDensityChange?: (density: Density) => Promise<void> | void;
  /**
   * Callback when user changes sidebar position.
   */
  onSidebarPositionChange?: (position: SidebarPosition) => Promise<void> | void;
}

export function ThemeProvider({
  children,
  userTheme,
  userAccent,
  userCustomAccent,
  userDensity,
  userSidebarPosition,
  isAuthenticated,
  onThemeChange,
  onAccentChange,
  onCustomAccentChange,
  onDensityChange,
  onSidebarPositionChange,
}: ThemeProviderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPreference);
  const previousAuth = useRef<boolean | undefined>(undefined);

  // Local state for accent (needed because backend doesn't support accent yet)
  // This tracks user changes immediately while localStorage provides persistence
  const [localAccent, setLocalAccent] = useState<AccentName>(() => {
    if (isAuthenticated) {
      if (userAccent && isValidAccent(userAccent)) return userAccent;
      return getCachedAccent() ?? defaultAccent;
    }
    return defaultAccent;
  });

  // Local state for custom accent color
  const [localCustomAccent, setLocalCustomAccent] = useState<CustomAccentHSL | null>(() => {
    if (isAuthenticated && userCustomAccent) return userCustomAccent;
    return getCachedCustomAccent();
  });

  // Local state for density
  const [localDensity, setLocalDensity] = useState<Density>(() => {
    if (isAuthenticated && userDensity) return userDensity;
    return getCachedDensity() ?? DEFAULT_DENSITY;
  });

  // Local state for sidebar position
  const [localSidebarPosition, setLocalSidebarPosition] = useState<SidebarPosition>(() => {
    if (isAuthenticated && userSidebarPosition) return userSidebarPosition;
    return getCachedSidebarPosition() ?? DEFAULT_SIDEBAR_POSITION;
  });

  // Determine the effective theme
  const theme = useMemo<ThemeMode>(() => {
    if (isAuthenticated) {
      if (userTheme) return userTheme;
      return getCachedTheme() ?? DEFAULT_THEME;
    }
    return 'system';
  }, [isAuthenticated, userTheme]);

  // Determine the effective accent - use local state for immediate updates
  const accent = useMemo<AccentName>(() => {
    if (isAuthenticated) {
      // Backend accent takes priority if available
      if (userAccent && isValidAccent(userAccent)) return userAccent;
      // Otherwise use local state (which is synced with localStorage)
      return localAccent;
    }
    return defaultAccent;
  }, [isAuthenticated, userAccent, localAccent]);

  // Determine the effective custom accent
  const customAccent = useMemo<CustomAccentHSL | null>(() => {
    if (isAuthenticated && userCustomAccent) return userCustomAccent;
    return localCustomAccent;
  }, [isAuthenticated, userCustomAccent, localCustomAccent]);

  // Determine the effective density
  const density = useMemo<Density>(() => {
    if (isAuthenticated && userDensity) return userDensity;
    return localDensity;
  }, [isAuthenticated, userDensity, localDensity]);

  // Determine the effective sidebar position
  const sidebarPosition = useMemo<SidebarPosition>(() => {
    if (isAuthenticated && userSidebarPosition) return userSidebarPosition;
    return localSidebarPosition;
  }, [isAuthenticated, userSidebarPosition, localSidebarPosition]);

  // Calculate resolved theme
  const resolvedTheme = useMemo(
    () => resolveTheme(theme, systemPrefersDark),
    [theme, systemPrefersDark]
  );

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Apply accent to DOM
  useEffect(() => {
    applyAccentToDOM(accent);
    // If accent is 'custom' and we have a custom color, apply it
    if (accent === 'custom' && customAccent) {
      applyCustomAccent(customAccent);
    } else {
      clearCustomAccent();
    }
  }, [accent, customAccent]);

  // Apply density to DOM
  useEffect(() => {
    applyDensityToDOM(density);
  }, [density]);

  // Apply sidebar position to DOM
  useEffect(() => {
    applySidebarPositionToDOM(sidebarPosition);
  }, [sidebarPosition]);

  // Update cache when user preferences change
  useEffect(() => {
    if (isAuthenticated) {
      if (userTheme) setCachedTheme(userTheme);
      if (userAccent && isValidAccent(userAccent)) setCachedAccent(userAccent);
      if (userCustomAccent) setCachedCustomAccent(userCustomAccent);
      if (userDensity) setCachedDensity(userDensity);
      if (userSidebarPosition) setCachedSidebarPosition(userSidebarPosition);
    }
  }, [isAuthenticated, userTheme, userAccent, userCustomAccent, userDensity, userSidebarPosition]);

  // Clear cache on logout
  useEffect(() => {
    if (previousAuth.current === true && !isAuthenticated) {
      clearCache();
    }
    previousAuth.current = isAuthenticated;
  }, [isAuthenticated]);

  // Set theme handler
  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      if (!isAuthenticated) {
        console.warn('Cannot set theme when not authenticated');
        return;
      }
      if (!onThemeChange) {
        console.warn('onThemeChange callback not provided');
        return;
      }

      // Optimistic update
      setCachedTheme(newTheme);
      applyThemeToDOM(resolveTheme(newTheme, systemPrefersDark));

      setIsSyncing(true);
      try {
        await onThemeChange(newTheme);
      } catch (error) {
        // Revert on error
        if (userTheme) {
          setCachedTheme(userTheme);
          applyThemeToDOM(resolveTheme(userTheme, systemPrefersDark));
        }
        console.error('Failed to sync theme:', error);
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated, onThemeChange, userTheme, systemPrefersDark]
  );

  // Sync local accent state when userAccent changes from backend
  useEffect(() => {
    if (userAccent && isValidAccent(userAccent)) {
      setLocalAccent(userAccent);
      applyAccentToDOM(userAccent);
    }
  }, [userAccent]);

  // Load accent from localStorage when user authenticates (and no backend accent)
  useEffect(() => {
    if (isAuthenticated && !userAccent) {
      const cached = getCachedAccent();
      if (cached) {
        setLocalAccent(cached);
        applyAccentToDOM(cached);
      }
    }
  }, [isAuthenticated, userAccent]);

  // Reset local accent on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setLocalAccent(defaultAccent);
      applyAccentToDOM(defaultAccent);
    }
  }, [isAuthenticated]);

  // Set accent handler
  const setAccent = useCallback(
    (newAccent: AccentName) => {
      // ALWAYS update DOM and state immediately for instant visual feedback
      // This must happen before any async operations or checks
      setLocalAccent(newAccent);
      setCachedAccent(newAccent);
      applyAccentToDOM(newAccent);

      // Clear custom accent when switching away from custom
      if (newAccent !== 'custom') {
        clearCustomAccent();
      }

      // Backend sync (if available)
      if (!isAuthenticated || !onAccentChange) {
        return;
      }

      // Fire and forget - don't wait for backend
      // Accent is already persisted in localStorage
      Promise.resolve(onAccentChange(newAccent)).catch((error: unknown) => {
        console.error('Failed to sync accent to backend:', error);
      });
    },
    [isAuthenticated, onAccentChange]
  );

  // Set custom accent handler
  const setCustomAccent = useCallback(
    (hsl: CustomAccentHSL) => {
      // Update local state and cache immediately
      setLocalCustomAccent(hsl);
      setCachedCustomAccent(hsl);

      // Also set accent to 'custom' if not already
      if (localAccent !== 'custom') {
        setLocalAccent('custom');
        setCachedAccent('custom');
        applyAccentToDOM('custom');
      }

      // Apply custom color to DOM
      applyCustomAccent(hsl);

      // Backend sync (if available)
      if (!isAuthenticated || !onCustomAccentChange) {
        return;
      }

      // Fire and forget
      Promise.resolve(onCustomAccentChange(hsl)).catch((error: unknown) => {
        console.error('Failed to sync custom accent to backend:', error);
      });
    },
    [isAuthenticated, onCustomAccentChange, localAccent]
  );

  // Set density handler
  const setDensity = useCallback(
    (newDensity: Density) => {
      // Update local state and cache immediately
      setLocalDensity(newDensity);
      setCachedDensity(newDensity);
      applyDensityToDOM(newDensity);

      // Backend sync (if available)
      if (!isAuthenticated || !onDensityChange) {
        return;
      }

      // Fire and forget
      Promise.resolve(onDensityChange(newDensity)).catch((error: unknown) => {
        console.error('Failed to sync density to backend:', error);
      });
    },
    [isAuthenticated, onDensityChange]
  );

  // Set sidebar position handler
  const setSidebarPosition = useCallback(
    (newPosition: SidebarPosition) => {
      // Update local state and cache immediately
      setLocalSidebarPosition(newPosition);
      setCachedSidebarPosition(newPosition);
      applySidebarPositionToDOM(newPosition);

      // Backend sync (if available)
      if (!isAuthenticated || !onSidebarPositionChange) {
        return;
      }

      // Fire and forget
      Promise.resolve(onSidebarPositionChange(newPosition)).catch((error: unknown) => {
        console.error('Failed to sync sidebar position to backend:', error);
      });
    },
    [isAuthenticated, onSidebarPositionChange]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      systemPrefersDark,
      accent,
      setAccent,
      customAccent,
      setCustomAccent,
      density,
      setDensity,
      sidebarPosition,
      setSidebarPosition,
      isSyncing,
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
      systemPrefersDark,
      accent,
      setAccent,
      customAccent,
      setCustomAccent,
      density,
      setDensity,
      sidebarPosition,
      setSidebarPosition,
      isSyncing,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Use theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// =============================================================================
// FOUC Prevention Script
// =============================================================================

/**
 * Inline script for index.html <head> to prevent flash of unstyled content.
 * Applies theme (dark class), accent, density, and sidebar position.
 */
export const themeInitScript = `(function(){
  var t=localStorage.getItem('kanbu-theme-cache');
  var a=localStorage.getItem('kanbu-accent-cache');
  var den=localStorage.getItem('kanbu-density-cache');
  var sb=localStorage.getItem('kanbu-sidebar-position-cache');
  var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root=document.documentElement;
  if(d)root.classList.add('dark');
  if(a)root.setAttribute('data-accent',a);
  if(den)root.setAttribute('data-density',den);else root.setAttribute('data-density','normal');
  if(sb)root.setAttribute('data-sidebar',sb);else root.setAttribute('data-sidebar','left');
})();`;
