/*
 * AdminRoute Component
 * Version: 1.1.0
 *
 * Redirects to home if user is not an admin.
 * Must be used inside ProtectedRoute (requires authentication first).
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 *
 * Modified by:
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2026-01-06
 * Change: Use AD-style group.myAdminScope instead of role-based selectIsAdmin
 * ═══════════════════════════════════════════════════════════════════
 */

import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../../store'
import { selectIsAuthenticated } from '../../store/authSlice'
import { trpc } from '../../lib/trpc'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  // Use the new AD-style permission system to check admin access
  // This checks if user is a Domain Admin OR a Workspace Admin
  const { data: adminScope, isLoading } = trpc.group.myAdminScope.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
  const hasAdminAccess = adminScope?.hasAnyAdminAccess ?? false

  // Should be used with ProtectedRoute, but double-check auth
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Show loading state while checking admin access
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect non-admins to home
  if (!hasAdminAccess) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
