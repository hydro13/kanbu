/*
 * Theme Provider with Auth Integration
 * Version: 1.2.0
 *
 * Wrapper that connects ThemeProvider to Redux auth state and tRPC user profile.
 * This bridges the gap between the generic ThemeContext and Kanbu's auth system.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * Change: Initial implementation (Fase 3.1 - Theme Infrastructure)
 * Modified: Added accent color support (Fase 3.2)
 * Modified: Enabled backend accent persistence (Fase 4)
 * ===================================================================
 */

import { useCallback, type ReactNode } from 'react'
import { ThemeProvider, type ThemeMode, type AccentName } from '@/contexts/ThemeContext'
import { isValidAccent } from '@/lib/themes/accents'
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
  const handleAccentChange = useCallback(
    async (accent: AccentName) => {
      await updateProfile.mutateAsync({ accent })
    },
    [updateProfile]
  )

  // Extract theme and accent from profile
  const userTheme = profile?.theme as ThemeMode | undefined
  const userAccent =
    profile?.accent && isValidAccent(profile.accent) ? profile.accent : undefined

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
