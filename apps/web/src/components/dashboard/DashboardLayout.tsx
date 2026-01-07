/*
 * DashboardLayout Component
 * Version: 2.0.0
 *
 * Layout wrapper for dashboard pages with sidebar navigation.
 * Uses BaseLayout for shared header functionality.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { BaseLayout } from '@/components/layout/BaseLayout'
import { DashboardSidebar } from './DashboardSidebar'

// =============================================================================
// Types
// =============================================================================

export interface DashboardLayoutProps {
  children?: ReactNode
  /** Custom sidebar component. Defaults to DashboardSidebar if not provided. */
  sidebar?: ReactNode
}

// =============================================================================
// Component
// =============================================================================

export function DashboardLayout({ children, sidebar }: DashboardLayoutProps) {
  return (
    <BaseLayout
      sidebar={sidebar ?? <DashboardSidebar collapsed={false} />}
      contentPadding={true}
    >
      {children ?? <Outlet />}
    </BaseLayout>
  )
}

export default DashboardLayout
