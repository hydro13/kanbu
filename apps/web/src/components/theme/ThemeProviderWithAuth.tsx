/*
 * Theme Provider with Auth Integration
 * Version: 2.0.0
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
 * Modified: Added advanced theming support (Fase 8)
 * ===================================================================
 */

import { useCallback, type ReactNode } from 'react'
import {
  ThemeProvider,
  type ThemeMode,
  type AccentName,
  type Density,
  type SidebarPosition,
  type CustomAccentHSL,
} from '@/contexts/ThemeContext'
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

  // Callback when custom accent changes
  const handleCustomAccentChange = useCallback(
    async (hsl: CustomAccentHSL) => {
      await updateProfile.mutateAsync({
        accent: 'custom',
        customAccentHue: hsl.h,
        customAccentSat: hsl.s,
        customAccentLight: hsl.l,
      })
    },
    [updateProfile]
  )

  // Callback when density changes
  const handleDensityChange = useCallback(
    async (density: Density) => {
      await updateProfile.mutateAsync({ density })
    },
    [updateProfile]
  )

  // Callback when sidebar position changes
  const handleSidebarPositionChange = useCallback(
    async (position: SidebarPosition) => {
      await updateProfile.mutateAsync({ sidebarPosition: position })
    },
    [updateProfile]
  )

  // Extract theme and accent from profile
  const userTheme = profile?.theme as ThemeMode | undefined
  const userAccent =
    profile?.accent && isValidAccent(profile.accent) ? profile.accent : undefined

  // Extract custom accent from profile
  const userCustomAccent: CustomAccentHSL | undefined =
    profile?.customAccentHue != null &&
    profile?.customAccentSat != null &&
    profile?.customAccentLight != null
      ? {
          h: profile.customAccentHue,
          s: profile.customAccentSat,
          l: profile.customAccentLight,
        }
      : undefined

  // Extract density and sidebar position
  const userDensity = profile?.density as Density | undefined
  const userSidebarPosition = profile?.sidebarPosition as SidebarPosition | undefined

  return (
    <ThemeProvider
      isAuthenticated={isAuthenticated}
      userTheme={userTheme}
      userAccent={userAccent}
      userCustomAccent={userCustomAccent}
      userDensity={userDensity}
      userSidebarPosition={userSidebarPosition}
      onThemeChange={handleThemeChange}
      onAccentChange={handleAccentChange}
      onCustomAccentChange={handleCustomAccentChange}
      onDensityChange={handleDensityChange}
      onSidebarPositionChange={handleSidebarPositionChange}
    >
      {children}
    </ThemeProvider>
  )
}

export default ThemeProviderWithAuth
