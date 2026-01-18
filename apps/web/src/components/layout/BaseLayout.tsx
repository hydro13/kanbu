/*
 * BaseLayout Component
 * Version: 1.0.0
 *
 * Shared layout wrapper with common header, sidebar slot, and content area.
 * Used by DashboardLayout and ProjectLayout to eliminate code duplication.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import {
  type ReactNode,
  useState,
  useCallback,
  useRef,
  useEffect,
  cloneElement,
  isValidElement,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CommandPalette, useCommandPalette } from '@/components/command';
import { ShortcutsModal } from '@/components/common';
import { WidthToggle } from './WidthToggle';
import { ThemeToggle } from '@/components/theme';
import { usePageWidth } from '@/hooks/usePageWidth';
import { useResizable } from '@/hooks/useResizable';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useAppSelector, useAppDispatch } from '@/store';
import { selectUser, logout, updateUser } from '@/store/authSlice';
import { queryClient, trpc, getMediaUrl } from '@/lib/trpc';

// =============================================================================
// Icons
// =============================================================================

function MenuIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function QuestionMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SidebarCollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
      />
    </svg>
  );
}

function SidebarExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 5l7 7-7 7M5 5l7 7-7 7"
      />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
      />
    </svg>
  );
}

// =============================================================================
// Constants
// =============================================================================

const COLLAPSED_STORAGE_PREFIX = 'kanbu_sidebar_collapsed_';
const COLLAPSED_WIDTH = 56; // w-14 = 56px for icon-only mode

// =============================================================================
// Types
// =============================================================================

export interface BaseLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Sidebar component to render (will receive collapsed prop) */
  sidebar?: ReactNode;
  /** Extra items to show in header (between presence and help button) */
  headerExtras?: ReactNode;
  /** Whether main content should have padding (default: true) */
  contentPadding?: boolean;
  /** Unique key for sidebar width/collapsed persistence (default: 'default') */
  sidebarKey?: string;
}

// =============================================================================
// Component
// =============================================================================

export function BaseLayout({
  children,
  sidebar,
  headerExtras,
  contentPadding = true,
  sidebarKey = 'default',
}: BaseLayoutProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { open: openCommandPalette } = useCommandPalette();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const breadcrumbs = useBreadcrumbs();

  // Collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(COLLAPSED_STORAGE_PREFIX + sidebarKey);
    return stored === 'true';
  });

  // Toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_PREFIX + sidebarKey, String(newValue));
      return newValue;
    });
  }, [sidebarKey]);

  // Resizable sidebar (disabled when collapsed)
  const {
    width: expandedWidth,
    isDragging,
    handleProps,
    resetWidth: resetSidebarWidth,
  } = useResizable({
    storageKey: sidebarKey,
    defaultWidth: 224, // 14rem = 224px (w-56)
    minWidth: 160, // 10rem minimum
    maxWidth: 400, // 25rem maximum
    direction: 'right',
  });

  // Use collapsed width or expanded width
  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : expandedWidth;

  // Check admin access via AD-style permission system
  const { data: adminScope } = trpc.group.myAdminScope.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  const hasAdminAccess = adminScope?.hasAnyAdminAccess ?? false;

  // Fetch user profile to sync avatar (in case it was updated after login)
  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Sync avatar from profile to Redux store if they differ
  useEffect(() => {
    if (profile && user && profile.avatarUrl !== user.avatarUrl) {
      dispatch(updateUser({ avatarUrl: profile.avatarUrl }));
    }
  }, [profile, user, dispatch]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    dispatch(logout());
    queryClient.clear();
    navigate('/login');
  }, [dispatch, navigate]);

  // Global keyboard shortcuts (including G+key navigation chords)
  useKeyboardShortcuts(
    {
      // Global
      onShowHelp: () => setShortcutsOpen(true),
      onCommandPalette: openCommandPalette,
      onCloseModal: () => setShortcutsOpen(false),
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
  );

  // Page width preference (only query when user is authenticated)
  const { isFullWidth } = usePageWidth({ enabled: !!user });

  // Outer container class for full-width mode toggle
  const containerClass = isFullWidth
    ? ''
    : 'max-w-[1600px] mx-auto shadow-sm border-x border-border/30';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Centered app container (entire UI is constrained when not full-width) */}
      <div className={`min-h-screen bg-background flex flex-col ${containerClass}`}>
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-10 items-center px-4">
            {/* Left: Sidebar Toggle + Logo + Breadcrumbs */}
            <div className="flex items-center gap-2">
              {sidebar && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-accent transition-colors md:hidden"
                  title={mobileMenuOpen ? 'Hide sidebar' : 'Show sidebar'}
                >
                  {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
              )}
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

            {/* Right: Extras + Help + Width Toggle + User Menu */}
            <div className="flex flex-1 items-center justify-end gap-3">
              {/* Extra header items (e.g., presence indicator) */}
              {headerExtras}

              {/* Keyboard shortcuts help */}
              <button
                onClick={() => setShortcutsOpen(true)}
                className="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-accent transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <QuestionMarkIcon className="h-5 w-5" />
              </button>

              {/* Page width toggle */}
              <WidthToggle />

              {/* Theme toggle */}
              <ThemeToggle />

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={getMediaUrl(user.avatarUrl)}
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
                      <Link
                        to="/profile/edit"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <PaletteIcon className="h-4 w-4" />
                        Theme Settings
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
          {/* Sidebar - hidden on mobile */}
          {sidebar && (
            <div
              className="sidebar-container hidden md:flex flex-col flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-muted transition-all duration-200"
              style={{ width: sidebarWidth, order: 'var(--sidebar-order)' }}
            >
              {/* Sidebar header with collapse toggle */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                {!isCollapsed && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Menu
                  </span>
                )}
                <button
                  onClick={toggleCollapsed}
                  className={`p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
                  title={
                    isCollapsed ? 'Expand sidebar (show labels)' : 'Collapse sidebar (icons only)'
                  }
                >
                  {isCollapsed ? (
                    <SidebarExpandIcon className="h-4 w-4" />
                  ) : (
                    <SidebarCollapseIcon className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Sidebar content with collapsed prop injected */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {isValidElement(sidebar)
                  ? cloneElement(sidebar as React.ReactElement<{ collapsed?: boolean }>, {
                      collapsed: isCollapsed,
                    })
                  : sidebar}
              </div>
            </div>
          )}

          {/* Resize handle - only when sidebar is expanded */}
          {sidebar && !isCollapsed && (
            <div
              {...handleProps}
              onMouseEnter={() => setIsHoveringResize(true)}
              onMouseLeave={() => !isDragging && setIsHoveringResize(false)}
              onDoubleClick={resetSidebarWidth}
              className={`
                hidden md:block w-1 cursor-col-resize flex-shrink-0 relative
                ${isDragging ? 'bg-primary' : 'hover:bg-primary/50'}
                transition-colors
              `}
              style={{ order: 'var(--resize-order)' }}
              title="Drag to resize, double-click to reset"
            >
              {/* Visual indicator on hover/drag */}
              <div
                className={`
                  absolute inset-y-0 -left-1 -right-1
                  ${isHoveringResize || isDragging ? 'bg-primary/20' : ''}
                  transition-colors pointer-events-none
                `}
              />
            </div>
          )}

          {/* Mobile Sidebar Overlay */}
          {sidebar && mobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-56 h-full bg-muted" onClick={(e) => e.stopPropagation()}>
                {isValidElement(sidebar)
                  ? cloneElement(sidebar as React.ReactElement<{ collapsed?: boolean }>, {
                      collapsed: false,
                    })
                  : sidebar}
              </div>
            </div>
          )}

          {/* Page Content */}
          <main
            className={`flex-1 overflow-auto ${contentPadding ? 'p-6' : ''}`}
            style={{ order: 'var(--main-order)' }}
          >
            {children}
          </main>
        </div>

        {/* Global Command Palette (Cmd+K) */}
        <CommandPalette />

        {/* Keyboard Shortcuts Help (?) */}
        <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </div>
    </div>
  );
}

export default BaseLayout;
