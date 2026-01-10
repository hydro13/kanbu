/*
 * TreeSection Component
 * Version: 1.0.0
 *
 * Collapsible section header within a workspace tree node.
 * Used for KANBU, GITHUB, and GROUPS sections.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-10
 * Change: Initial implementation - Fase 1.3 of Dashboard Roadmap
 * ═══════════════════════════════════════════════════════════════════
 */

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useDashboardTreeStore } from '@/stores/dashboardTreeStore'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface TreeSectionProps {
  workspaceId: number
  section: 'kanbu' | 'github' | 'groups'
  label: string
  count: number
  children: React.ReactNode
}

// =============================================================================
// Component
// =============================================================================

export function TreeSection({
  workspaceId,
  section,
  label,
  count,
  children,
}: TreeSectionProps) {
  const { toggleSection, isSectionExpanded } = useDashboardTreeStore()
  const isExpanded = isSectionExpanded(workspaceId, section)

  // Don't render if no items
  if (count === 0) {
    return null
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => toggleSection(workspaceId, section)}
        className={cn(
          'flex w-full items-center gap-1 py-0.5',
          'text-xs font-medium text-muted-foreground uppercase tracking-wider',
          'hover:text-foreground transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm'
        )}
        aria-expanded={isExpanded}
        aria-label={`${label} section, ${count} items`}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span>{label}</span>
        <span className="ml-auto text-muted-foreground/70">({count})</span>
      </button>

      {isExpanded && <div className="mt-0.5">{children}</div>}
    </div>
  )
}

export default TreeSection
