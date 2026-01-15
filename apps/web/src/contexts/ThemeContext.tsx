/*
 * Theme Context
 * Version: 2.0.0
 *
 * Provides theme management for a multi-user application.
 * Supports both theme mode (light/dark/system) and accent colors.
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
} from 'react'
import { type AccentName, defaultAccent, isValidAccent } from '@/lib/themes/accents'

// =============================================================================
// Types
// =============================================================================

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Re-export AccentName for convenience
export type { AccentName }

export interface ThemeContextValue {
  /** The current theme setting (light, dark, or system) */
  theme: ThemeMode
  /** The resolved theme that's actually being applied (light or dark) */
  resolvedTheme: ResolvedTheme
  /** Set the theme mode - this triggers backend sync */
  setTheme: (theme: ThemeMode) => void
  /** Whether system prefers dark mode */
  systemPrefersDark: boolean
  /** Current accent color */
  accent: AccentName
  /** Set the accent color - this triggers backend sync */
  setAccent: (accent: AccentName) => void
  /** Whether theme/accent is being synced to backend */
  isSyncing: boolean
}

// =============================================================================
// Constants
// =============================================================================

const THEME_STORAGE_KEY = 'kanbu-theme-cache'
const ACCENT_STORAGE_KEY = 'kanbu-accent-cache'
const DEFAULT_THEME: ThemeMode = 'system'

// =============================================================================
// Helpers
// =============================================================================

function getSystemPreference(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getCachedTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return null
}

function setCachedTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

function getCachedAccent(): AccentName | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
  if (stored && isValidAccent(stored)) {
    return stored
  }
  return null
}

function setCachedAccent(accent: AccentName): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCENT_STORAGE_KEY, accent)
}

function clearCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(THEME_STORAGE_KEY)
  localStorage.removeItem(ACCENT_STORAGE_KEY)
}

function resolveTheme(theme: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }
  return theme
}

function applyThemeToDOM(resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement
  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function applyAccentToDOM(accent: AccentName): void {
  const root = document.documentElement
  root.setAttribute('data-accent', accent)
}

// =============================================================================
// Context
// =============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null)

// =============================================================================
// Provider
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode
  /**
   * Theme from authenticated user's profile (backend source of truth).
   * Pass null/undefined when user is not authenticated.
   */
  userTheme?: ThemeMode | null
  /**
   * Accent from authenticated user's profile (backend source of truth).
   * Pass null/undefined when user is not authenticated.
   */
  userAccent?: AccentName | null
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /**
   * Callback when user changes theme.
   * Parent component should call the backend mutation here.
   */
  onThemeChange?: (theme: ThemeMode) => Promise<void> | void
  /**
   * Callback when user changes accent.
   * Parent component should call the backend mutation here.
   */
  onAccentChange?: (accent: AccentName) => Promise<void> | void
}

export function ThemeProvider({
  children,
  userTheme,
  userAccent,
  isAuthenticated,
  onThemeChange,
  onAccentChange,
}: ThemeProviderProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPreference)
  const previousAuth = useRef<boolean | undefined>(undefined)

  // Local state for accent (needed because backend doesn't support accent yet)
  // This tracks user changes immediately while localStorage provides persistence
  const [localAccent, setLocalAccent] = useState<AccentName>(() => {
    if (isAuthenticated) {
      if (userAccent && isValidAccent(userAccent)) return userAccent
      return getCachedAccent() ?? defaultAccent
    }
    return defaultAccent
  })

  // Determine the effective theme
  const theme = useMemo<ThemeMode>(() => {
    if (isAuthenticated) {
      if (userTheme) return userTheme
      return getCachedTheme() ?? DEFAULT_THEME
    }
    return 'system'
  }, [isAuthenticated, userTheme])

  // Determine the effective accent - use local state for immediate updates
  const accent = useMemo<AccentName>(() => {
    if (isAuthenticated) {
      // Backend accent takes priority if available
      if (userAccent && isValidAccent(userAccent)) return userAccent
      // Otherwise use local state (which is synced with localStorage)
      return localAccent
    }
    return defaultAccent
  }, [isAuthenticated, userAccent, localAccent])

  // Calculate resolved theme
  const resolvedTheme = useMemo(
    () => resolveTheme(theme, systemPrefersDark),
    [theme, systemPrefersDark]
  )

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply theme to DOM
  useEffect(() => {
    applyThemeToDOM(resolvedTheme)
  }, [resolvedTheme])

  // Apply accent to DOM
  useEffect(() => {
    applyAccentToDOM(accent)
  }, [accent])

  // Update cache when user preferences change
  useEffect(() => {
    if (isAuthenticated) {
      if (userTheme) setCachedTheme(userTheme)
      if (userAccent && isValidAccent(userAccent)) setCachedAccent(userAccent)
    }
  }, [isAuthenticated, userTheme, userAccent])

  // Clear cache on logout
  useEffect(() => {
    if (previousAuth.current === true && !isAuthenticated) {
      clearCache()
    }
    previousAuth.current = isAuthenticated
  }, [isAuthenticated])

  // Set theme handler
  const setTheme = useCallback(
    async (newTheme: ThemeMode) => {
      if (!isAuthenticated) {
        console.warn('Cannot set theme when not authenticated')
        return
      }
      if (!onThemeChange) {
        console.warn('onThemeChange callback not provided')
        return
      }

      // Optimistic update
      setCachedTheme(newTheme)
      applyThemeToDOM(resolveTheme(newTheme, systemPrefersDark))

      setIsSyncing(true)
      try {
        await onThemeChange(newTheme)
      } catch (error) {
        // Revert on error
        if (userTheme) {
          setCachedTheme(userTheme)
          applyThemeToDOM(resolveTheme(userTheme, systemPrefersDark))
        }
        console.error('Failed to sync theme:', error)
      } finally {
        setIsSyncing(false)
      }
    },
    [isAuthenticated, onThemeChange, userTheme, systemPrefersDark]
  )

  // Sync local accent state when userAccent changes from backend
  useEffect(() => {
    if (userAccent && isValidAccent(userAccent)) {
      setLocalAccent(userAccent)
      applyAccentToDOM(userAccent)
    }
  }, [userAccent])

  // Load accent from localStorage when user authenticates (and no backend accent)
  useEffect(() => {
    if (isAuthenticated && !userAccent) {
      const cached = getCachedAccent()
      if (cached) {
        setLocalAccent(cached)
        applyAccentToDOM(cached)
      }
    }
  }, [isAuthenticated, userAccent])

  // Reset local accent on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setLocalAccent(defaultAccent)
      applyAccentToDOM(defaultAccent)
    }
  }, [isAuthenticated])

  // Set accent handler
  const setAccent = useCallback(
    (newAccent: AccentName) => {
      // ALWAYS update DOM and state immediately for instant visual feedback
      // This must happen before any async operations or checks
      setLocalAccent(newAccent)
      setCachedAccent(newAccent)
      applyAccentToDOM(newAccent)

      // Backend sync (if available)
      if (!isAuthenticated || !onAccentChange) {
        return
      }

      // Fire and forget - don't wait for backend
      // Accent is already persisted in localStorage
      Promise.resolve(onAccentChange(newAccent)).catch((error: unknown) => {
        console.error('Failed to sync accent to backend:', error)
      })
    },
    [isAuthenticated, onAccentChange]
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      systemPrefersDark,
      accent,
      setAccent,
      isSyncing,
    }),
    [theme, resolvedTheme, setTheme, systemPrefersDark, accent, setAccent, isSyncing]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Use theme context
 * Must be used within ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// =============================================================================
// FOUC Prevention Script
// =============================================================================

/**
 * Inline script for index.html <head> to prevent flash of unstyled content.
 * Applies both theme (dark class) and accent (data-accent attribute).
 */
export const themeInitScript = `(function(){
  var t=localStorage.getItem('kanbu-theme-cache');
  var a=localStorage.getItem('kanbu-accent-cache');
  var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(d)document.documentElement.classList.add('dark');
  if(a)document.documentElement.setAttribute('data-accent',a);
})();`
