/*
 * Notes Page
 * Version: 1.0.0
 *
 * Full-page view for personal sticky notes.
 * Uses DashboardLayout with sidebar navigation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation - Notes page for /dashboard/notes route
 * ═══════════════════════════════════════════════════════════════════
 */

import { DashboardLayout } from '@/components/dashboard';
import { StickyNoteList } from '@/components/sticky';

// =============================================================================
// Component
// =============================================================================

export function NotesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-page-title-lg tracking-tight text-foreground">Notes</h1>
          <p className="text-muted-foreground">Your personal sticky notes</p>
        </div>

        {/* Notes List */}
        <StickyNoteList />
      </div>
    </DashboardLayout>
  );
}

export default NotesPage;
