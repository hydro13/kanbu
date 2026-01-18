/*
 * ProfileLayout Component
 * Version: 2.0.0
 *
 * Layout wrapper for profile pages with sidebar navigation.
 * Now uses DashboardLayout for consistent top-bar navigation with breadcrumbs.
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
 *
 * Modified by:
 * Session: MAX-2026-01-06
 * Change: Migrated to DashboardLayout for consistent navigation
 * ═══════════════════════════════════════════════════════════════════
 */

import { DashboardLayout } from '../dashboard/DashboardLayout';
import { ProfileSidebar } from './ProfileSidebar';

interface ProfileLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function ProfileLayout({ children, title, description }: ProfileLayoutProps) {
  return (
    <DashboardLayout sidebar={<ProfileSidebar />}>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground mt-1">{description}</p>}
        </div>
        {children}
      </div>
    </DashboardLayout>
  );
}

export default ProfileLayout;
