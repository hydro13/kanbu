/*
 * ProfileLayout Component
 * Version: 1.0.0
 *
 * Layout wrapper for profile pages with sidebar navigation.
 *
 * Task: USER-01 (Task 247)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 9a49de0d-74ae-4a76-a6f6-53c7e3f2218b
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T18:05 CET
 * Change: Fixed double scrollbars with -my-6 overflow-hidden + height calc(100vh-3.5rem)
 * ═══════════════════════════════════════════════════════════════════
 */

import { Layout } from '../layout/Layout'
import { ProfileSidebar } from './ProfileSidebar'

interface ProfileLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export function ProfileLayout({ children, title, description }: ProfileLayoutProps) {
  return (
    <Layout>
      {/*
       * Height: 100vh - header (3.5rem/56px) = calc(100vh - 3.5rem)
       * -my-6 cancels Layout's py-6 padding to prevent double scrollbars
       * overflow-hidden ensures only inner content scrolls
       */}
      <div className="flex h-[calc(100vh-3.5rem)] -my-6 overflow-hidden">
        {/* Sidebar */}
        <ProfileSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
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

export default ProfileLayout
