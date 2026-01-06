/*
 * AdminLayout Component
 * Version: 2.0.0
 *
 * Layout wrapper for admin pages with sidebar navigation.
 * Now uses DashboardLayout for consistent top-bar navigation with breadcrumbs.
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
 * Session: MAX-2026-01-06
 * Change: Migrated to DashboardLayout for consistent navigation
 * ═══════════════════════════════════════════════════════════════════
 */

import { DashboardLayout } from '../dashboard/DashboardLayout'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <DashboardLayout sidebar={<AdminSidebar />}>
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {children}
      </div>
    </DashboardLayout>
  )
}

export default AdminLayout
