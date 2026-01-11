/*
 * DashboardSidebar Component
 * Version: 3.2.0
 *
 * Simple context-aware sidebar navigation.
 * Shows Personal section, Favorites, Workspaces link, and context-aware Projects link.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2025-12-30T00:50 CET
 *
 * Modified: 2026-01-10
 * Change: Simplified sidebar - removed tree, added context-aware navigation
 *
 * Modified: 2026-01-11
 * Change: Added Favorites section (Fase 2.1)
 *
 * Modified: 2026-01-11
 * Change: Added Inbox with unread count badge (Fase 3.1)
 * ===================================================================
 */

import { Link, useLocation, useParams } from 'react-router-dom'
import { Home, CheckSquare, ListChecks, StickyNote, Building2, LayoutGrid, Star, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'

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
  { label: 'Inbox', path: '/dashboard/inbox', icon: Inbox },
]

// =============================================================================
// Component
// =============================================================================

export function DashboardSidebar({ collapsed = false }: DashboardSidebarProps) {
  const location = useLocation()
  const params = useParams<{ workspaceSlug?: string; slug?: string }>()

  // Fetch favorites
  const favoritesQuery = trpc.favorite.list.useQuery()
  const favorites = favoritesQuery.data ?? []

  // Fetch unread notification count
  const unreadCountQuery = trpc.notification.getUnreadCount.useQuery()
  const unreadCount = unreadCountQuery.data?.count ?? 0

  // Determine active workspace from URL
  // Can be either /workspace/:workspaceSlug/project/... or /workspace/:slug
  const workspaceSlug = params.workspaceSlug || params.slug
  const isInWorkspace = !!workspaceSlug

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path
    }
    return location.pathname.startsWith(item.path)
  }

  const isWorkspacesActive = location.pathname === '/workspaces'
  const isProjectsActive = isInWorkspace && location.pathname.includes(`/workspace/${workspaceSlug}`)

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
              const isInbox = item.path === '/dashboard/inbox'
              const showBadge = isInbox && unreadCount > 0

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
                    {!collapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                    {showBadge && (
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium rounded-full',
                        'bg-primary text-primary-foreground'
                      )}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Divider */}
        <div className="my-2 mx-3 border-t border-border" />

        {/* FAVORITES Section */}
        {favorites.length > 0 && (
          <div className="mb-2">
            {!collapsed && (
              <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Favorites
              </div>
            )}
            <ul className="space-y-0.5 px-2">
              {favorites.map((fav) => {
                const projectPath = `/workspace/${fav.workspaceSlug}/project/${fav.projectIdentifier}`
                const isProjectActive = location.pathname.startsWith(projectPath)

                return (
                  <li key={fav.id}>
                    <Link
                      to={projectPath}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isProjectActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-foreground/80 hover:bg-accent/50'
                      )}
                      title={collapsed ? `${fav.projectName} (${fav.workspaceName})` : undefined}
                    >
                      <Star className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="truncate block">{fav.projectName}</span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {fav.workspaceName}
                          </span>
                        </div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Divider (only if favorites exist) */}
        {favorites.length > 0 && <div className="my-2 mx-3 border-t border-border" />}

        {/* NAVIGATION Section */}
        <div className="mb-2">
          {!collapsed && (
            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Navigation
            </div>
          )}
          <ul className="space-y-0.5 px-2">
            {/* Workspaces - always visible */}
            <li>
              <Link
                to="/workspaces"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isWorkspacesActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-foreground/80 hover:bg-accent/50'
                )}
                title={collapsed ? 'Workspaces' : undefined}
              >
                <Building2 className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>Workspaces</span>}
              </Link>
            </li>

            {/* Projects - only visible when in a workspace context */}
            {isInWorkspace && (
              <li>
                <Link
                  to={`/workspace/${workspaceSlug}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isProjectsActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-foreground/80 hover:bg-accent/50'
                  )}
                  title={collapsed ? 'Projects' : undefined}
                >
                  <LayoutGrid className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>Projects</span>}
                </Link>
              </li>
            )}
          </ul>
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
