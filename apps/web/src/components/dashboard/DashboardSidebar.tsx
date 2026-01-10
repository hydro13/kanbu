/*
 * DashboardSidebar Component
 * Version: 2.0.0
 *
 * Sidebar navigation for dashboard pages with collapsible workspace tree.
 * Shows Personal section and hierarchical Workspaces section.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:50 CET
 *
 * Modified: 2026-01-10
 * Change: Fase 2 - Integrated collapsible WorkspaceTree hierarchy
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link, useLocation } from 'react-router-dom'
import { Home, CheckSquare, ListChecks, Loader2, StickyNote } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { WorkspaceTree } from './WorkspaceTree'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

export interface DashboardSidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

// =============================================================================
// Navigation Config
// =============================================================================

const personalItems: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: Home, exact: true },
  { label: 'My Tasks', path: '/dashboard/tasks', icon: CheckSquare },
  { label: 'My Subtasks', path: '/dashboard/subtasks', icon: ListChecks },
]

// =============================================================================
// Component
// =============================================================================

export function DashboardSidebar({ collapsed = false }: DashboardSidebarProps) {
  const location = useLocation()

  // Fetch hierarchy data for tree
  const { data, isLoading, error } = trpc.dashboard.getHierarchy.useQuery()

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <aside className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-2">
        {/* PERSONAL Section */}
        <div className="mb-2">
          {!collapsed && (
            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Personal
            </div>
          )}
          <ul className="space-y-0.5 px-2">
            {personalItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item)

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-foreground/80 hover:bg-accent/50'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Divider */}
        <div className="my-2 mx-3 border-t border-border" />

        {/* WORKSPACES Section */}
        <div className="flex-1">
          {!collapsed && (
            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Workspaces
            </div>
          )}

          <div className="px-2">
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-3 py-2 text-sm text-destructive">
                Failed to load workspaces
              </div>
            )}

            {/* Workspace tree */}
            {data?.workspaces.map((workspace) => (
              <WorkspaceTree
                key={workspace.id}
                workspace={workspace}
                collapsed={collapsed}
              />
            ))}

            {/* Empty state */}
            {data?.workspaces.length === 0 && !isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground italic">
                No workspaces yet
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-2 mx-3 border-t border-border" />

        {/* Notes link */}
        <ul className="px-2">
          <li>
            <Link
              to="/dashboard/notes"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                location.pathname === '/dashboard/notes'
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-foreground/80 hover:bg-accent/50'
              )}
              title={collapsed ? 'Notes' : undefined}
            >
              <StickyNote className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Notes</span>}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default DashboardSidebar
