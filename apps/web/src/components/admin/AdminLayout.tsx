/*
 * AdminLayout Component
 * Version: 1.0.0
 *
 * Layout wrapper for admin pages with sidebar navigation.
 * Follows same pattern as ProfileLayout.
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Layout } from '../layout/Layout'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <Layout>
      {/*
       * Height: 100vh - header (3.5rem/56px) = calc(100vh - 3.5rem)
       * -my-6 cancels Layout's py-6 padding to prevent double scrollbars
       * overflow-hidden ensures only inner content scrolls
       */}
      <div className="flex h-[calc(100vh-3.5rem)] -my-6 overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {children}
          </div>
        </main>
      </div>
    </Layout>
  )
}

export default AdminLayout
