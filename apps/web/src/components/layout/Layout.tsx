/*
 * Layout Component
 * Version: 1.4.0
 *
 * Main application layout with navigation header and workspace selector.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T18:25 CET
 * Change: Fixed navigation - changed <a> to <Link>, removed Boards link
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T19:15 CET
 * Change: Added WorkspaceSelector to header for global workspace loading
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T21:15 CET
 * Change: Added ShortcutsModal and global keyboard shortcuts (CORE-06)
 *
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T01:05 CET
 * Change: Added user menu dropdown (EXT-15)
 *
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Signed: 2025-12-29T20:34 CET
 * Change: Added Admin link in user menu for ADMIN role (ADMIN-01)
 *
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Signed: 2025-12-30T00:40 CET
 * Change: Added Dashboard link to main navigation (USER-02)
 * ═══════════════════════════════════════════════════════════════════
 */

import { type ReactNode, useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WorkspaceSelector } from '@/components/workspace'
import { CommandPalette, useCommandPalette } from '@/components/command'
import { ShortcutsModal } from '@/components/common'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAppSelector, useAppDispatch } from '@/store'
import { selectUser, logout } from '@/store/authSlice'
import { queryClient, trpc } from '@/lib/trpc'

// =============================================================================
// Icons
// =============================================================================

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

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { open: openCommandPalette } = useCommandPalette()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)

  // Use the new AD-style permission system to check admin access
  // This checks if user is a Domain Admin OR a Workspace Admin
  const { data: adminScope } = trpc.group.myAdminScope.useQuery(undefined, {
    // Only fetch when user is logged in
    enabled: !!user,
    // Cache for 5 minutes, don't refetch constantly
    staleTime: 5 * 60 * 1000,
  })
  const hasAdminAccess = adminScope?.hasAnyAdminAccess ?? false

  // Close shortcuts modal handler
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

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
    // Clear Redux auth state
    dispatch(logout())
    // Clear React Query cache to prevent stale data for new user
    queryClient.clear()
    navigate('/login')
  }, [dispatch, navigate])

  // Global keyboard shortcuts (including G+key navigation chords)
  useKeyboardShortcuts(
    {
      // Global
      onShowHelp: () => setShortcutsOpen(true),
      onCommandPalette: openCommandPalette,
      onCloseModal: closeShortcuts,
      // Navigation (G+key chord shortcuts)
      onGotoDashboard: () => navigate('/dashboard'),
      onGotoTasks: () => navigate('/dashboard/tasks'),
      onGotoInbox: () => navigate('/dashboard/inbox'),
      onGotoWorkspaces: () => navigate('/workspaces'),
      onGotoNotes: () => navigate('/dashboard/notes'),
    },
    {
      activeCategories: ['global', 'navigation'],
      enabled: true,
    }
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" to="/">
              <img src="/logo.png" alt="Kanbu" className="h-6 w-6" />
              <span className="font-bold text-lg">Kanbu</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                to="/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Dashboard
              </Link>
              <Link
                to="/workspaces"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Projects
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <WorkspaceSelector />
              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {user?.username ? (
                      <span className="text-sm font-medium text-primary">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <UserIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="hidden md:inline text-foreground/80">
                    {user?.username || 'User'}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-foreground/60" />
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

                      {/* Admin Link - for Domain Admins and Workspace Admins */}
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
        </div>
      </header>
      <main className="container py-6">{children}</main>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Keyboard Shortcuts Help (?) */}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={closeShortcuts} />
    </div>
  )
}
