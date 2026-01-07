/*
 * ProjectLayout Component
 * Version: 1.0.0
 *
 * Layout wrapper for project-specific pages.
 * Includes main Layout header + ProjectSidebar navigation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CommandPalette, useCommandPalette } from '@/components/command'
import { ShortcutsModal } from '@/components/common'
import { PresenceIndicator } from '@/components/board/PresenceIndicator'
import { ProjectSidebar } from './ProjectSidebar'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'
import { useAppSelector, useAppDispatch } from '@/store'
import { selectUser, logout, updateUser } from '@/store/authSlice'
import { queryClient, trpc } from '@/lib/trpc'

// =============================================================================
// Icons
// =============================================================================

function MenuIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

// =============================================================================
// Types
// =============================================================================

export interface ProjectLayoutProps {
  children: ReactNode
}

// =============================================================================
// Component
// =============================================================================

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { open: openCommandPalette } = useCommandPalette()
  const user = useAppSelector(selectUser)
  const breadcrumbs = useBreadcrumbs()

  // Check admin access
  const { data: adminScope } = trpc.group.myAdminScope.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
  const hasAdminAccess = adminScope?.hasAnyAdminAccess ?? false

  // Fetch user profile to sync avatar (in case it was updated after login)
  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  // Sync avatar from profile to Redux store if they differ
  useEffect(() => {
    if (profile && user && profile.avatarUrl !== user.avatarUrl) {
      dispatch(updateUser({ avatarUrl: profile.avatarUrl }))
    }
  }, [profile, user, dispatch])

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    {
      enabled: !!projectIdentifier,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Get project ID from the fetched project data
  const projectIdNum = projectQuery.data?.id ?? null

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle logout
  const handleLogout = useCallback(() => {
    dispatch(logout())
    queryClient.clear()
    navigate('/login')
  }, [dispatch, navigate])

  // Global keyboard shortcuts
  useKeyboardShortcuts(
    {
      onShowHelp: () => setShortcutsOpen(true),
      onCommandPalette: openCommandPalette,
      onCloseModal: () => setShortcutsOpen(false),
    },
    {
      activeCategories: ['global'],
      enabled: true,
    }
  )

  const projectName = projectQuery.data?.name

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-10 items-center px-4">
          {/* Left: Sidebar Toggle + Logo + Breadcrumbs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? <MenuIcon /> : <CloseIcon />}
            </button>
            <Link className="flex items-center space-x-2" to="/dashboard">
              <img src="/logo.png" alt="Kanbu" className="h-8 w-8" />
              <span className="font-semibold">Kanbu</span>
            </Link>
            {/* Breadcrumb Navigation - SEO optimized */}
            {breadcrumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="hidden md:flex items-center">
                <ol
                  className="flex items-center text-sm"
                  itemScope
                  itemType="https://schema.org/BreadcrumbList"
                >
                  {breadcrumbs.map((crumb, index) => (
                    <li
                      key={index}
                      className="flex items-center"
                      itemScope
                      itemProp="itemListElement"
                      itemType="https://schema.org/ListItem"
                    >
                      <ChevronRightIcon className="h-3.5 w-3.5 mx-1 text-muted-foreground/50" />
                      {crumb.href ? (
                        <Link
                          to={crumb.href}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          itemProp="item"
                        >
                          <span itemProp="name">{crumb.label}</span>
                        </Link>
                      ) : (
                        <span className="text-foreground font-medium" itemProp="name">
                          {crumb.label}
                        </span>
                      )}
                      <meta itemProp="position" content={String(index + 1)} />
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>

          {/* Right: Presence + User Menu */}
          <div className="flex flex-1 items-center justify-end gap-3">
            {/* Real-time presence indicator */}
            {projectIdNum && user && (
              <PresenceIndicator
                projectId={projectIdNum}
                currentUserId={user.id}
              />
            )}

            {/* User Menu Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-accent transition-colors"
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name ?? user.username ?? 'User'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {user?.username ? (
                      <span className="text-sm font-medium text-primary">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <UserIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}
                <span className="hidden md:inline text-foreground/80 text-sm">
                  {user?.username || 'User'}
                </span>
                <ChevronDownIcon className="h-3 w-3 text-foreground/60" />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-50">
                  <div className="py-1">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground">
                        {user?.username || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email || ''}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </Link>

                    {/* Admin Link */}
                    {hasAdminAccess && (
                      <Link
                        to="/admin/users"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <ShieldIcon className="h-4 w-4" />
                        Administration
                      </Link>
                    )}

                    {/* Logout */}
                    <div className="border-t border-border mt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                      >
                        <LogoutIcon className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on mobile when collapsed */}
        <div className={`hidden md:block ${sidebarCollapsed ? 'md:hidden' : ''}`}>
          {projectIdNum && projectIdentifier && (
            <ProjectSidebar
              projectIdentifier={projectIdentifier}
              projectId={projectIdNum}
              projectName={projectName}
              collapsed={false}
            />
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {!sidebarCollapsed && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarCollapsed(true)}>
            <div className="w-56 h-full" onClick={(e) => e.stopPropagation()}>
              {projectIdNum && projectIdentifier && (
                <ProjectSidebar
                  projectIdentifier={projectIdentifier}
                  projectId={projectIdNum}
                  projectName={projectName}
                  collapsed={false}
                />
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Keyboard Shortcuts Help (?) */}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

export default ProjectLayout
