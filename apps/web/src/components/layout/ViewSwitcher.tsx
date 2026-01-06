/*
 * ViewSwitcher Component
 * Version: 1.0.0
 *
 * Horizontal tab bar for switching between project views.
 * Used in all view pages (Board, List, Calendar, Timeline).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

// =============================================================================
// Icons
// =============================================================================

function BoardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

// =============================================================================
// Types
// =============================================================================

type ViewType = 'board' | 'list' | 'calendar' | 'timeline'

interface ViewConfig {
  id: ViewType
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

export interface ViewSwitcherProps {
  projectId: number
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function ViewSwitcher({ projectId, className }: ViewSwitcherProps) {
  const location = useLocation()

  const views: ViewConfig[] = [
    { id: 'board', label: 'Board', path: `/project/${projectId}/board`, icon: BoardIcon },
    { id: 'list', label: 'List', path: `/project/${projectId}/list`, icon: ListIcon },
    { id: 'calendar', label: 'Calendar', path: `/project/${projectId}/calendar`, icon: CalendarIcon },
    { id: 'timeline', label: 'Timeline', path: `/project/${projectId}/timeline`, icon: TimelineIcon },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className={cn('flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800', className)}>
      {views.map((view) => {
        const Icon = view.icon
        return (
          <Link
            key={view.id}
            to={view.path}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              isActive(view.path)
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Icon className="h-4 w-4" />
            {view.label}
          </Link>
        )
      })}
    </div>
  )
}

export default ViewSwitcher
