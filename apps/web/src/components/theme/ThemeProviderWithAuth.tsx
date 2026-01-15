/*
 * Theme Provider with Auth Integration
 * Version: 1.1.0
 *
 * Wrapper that connects ThemeProvider to Redux auth state and tRPC user profile.
 * This bridges the gap between the generic ThemeContext and Kanbu's auth system.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * Change: Initial implementation (Fase 3.1 - Theme Infrastructure)
 * Modified: Added accent color support (Fase 3.2)
 * ===================================================================
 */

import { useCallback, type ReactNode } from 'react'
import { ThemeProvider, type ThemeMode, type AccentName } from '@/contexts/ThemeContext'
// import { isValidAccent } from '@/lib/themes/accents' // TODO: Uncomment when backend supports accent
import { useAppSelector } from '@/store'
import { selectIsAuthenticated } from '@/store/authSlice'
import { trpc } from '@/lib/trpc'

interface ThemeProviderWithAuthProps {
  children: ReactNode
}

export function ThemeProviderWithAuth({ children }: ThemeProviderWithAuthProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  // Fetch user profile to get current theme and accent settings
  // Only fetch when authenticated
  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    // Don't refetch too often - theme changes are rare
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Mutation to update profile in backend
  const utils = trpc.useUtils()
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      // Invalidate profile cache so it refetches
      utils.user.getProfile.invalidate()
    },
  })

  // Callback when theme changes
  const handleThemeChange = useCallback(
    async (theme: ThemeMode) => {
      await updateProfile.mutateAsync({ theme })
    },
    [updateProfile]
  )

  // Callback when accent changes
  // NOTE: Backend doesn't support accent field yet - changes are persisted to localStorage only
  // When backend is updated, uncomment the mutateAsync call below
  const handleAccentChange = useCallback(
    async (_accent: AccentName) => {
      // TODO: Enable when backend supports accent field
      // await updateProfile.mutateAsync({ accent })
      // For now, accent is stored in localStorage via ThemeContext
    },
    []
  )

  // Extract theme from profile
  // NOTE: accent is not stored in backend yet, will use localStorage cache
  const userTheme = profile?.theme as ThemeMode | undefined
  const userAccent: AccentName | undefined = undefined // Backend doesn't have accent yet

  return (
    <ThemeProvider
      isAuthenticated={isAuthenticated}
      userTheme={userTheme}
      userAccent={userAccent}
      onThemeChange={handleThemeChange}
      onAccentChange={handleAccentChange}
    >
      {children}
    </ThemeProvider>
  )
}

export default ThemeProviderWithAuth
