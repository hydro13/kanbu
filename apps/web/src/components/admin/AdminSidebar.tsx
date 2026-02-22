/*
 * AdminSidebar Component
 * Version: 1.0.0
 *
 * Sidebar navigation for admin pages.
 * Shows links to user management, invites, and settings.
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { useAdminFeatureAccess, type AdminFeatureSlug } from '@/hooks/useFeatureAccess';

// =============================================================================
// Icons
// =============================================================================

function UsersIcon({ className }: { className?: string }) {
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
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
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
        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
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
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function CogIcon({ className }: { className?: string }) {
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
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
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

function BuildingIcon({ className }: { className?: string }) {
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
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
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
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
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
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  );
}

function TreeIcon({ className }: { className?: string }) {
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
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
      />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
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
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
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
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
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
        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function CpuChipIcon({ className }: { className?: string }) {
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
        d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
      />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

// =============================================================================
// Types
// =============================================================================

type RequiredScope = 'domainAdmin' | 'workspaceAdmin' | 'any';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Which scope level is required to see this item */
  requiredScope?: RequiredScope;
  /** ACL feature slug for permission check */
  slug?: AdminFeatureSlug;
}

interface NavSection {
  title: string;
  items: NavItem[];
  /** Which scope level is required to see this section */
  requiredScope?: RequiredScope;
}

export interface AdminSidebarProps {
  collapsed?: boolean;
}

// =============================================================================
// Navigation Config
// =============================================================================

/**
 * Navigation sections for admin sidebar.
 * Items are filtered based on user's scope level:
 * - 'domainAdmin': Only visible to Domain Admins (full system access)
 * - 'workspaceAdmin': Visible to Workspace Admins and Domain Admins
 * - 'any' or undefined: Visible to anyone with admin access
 */
const navSections: NavSection[] = [
  {
    title: 'User Management',
    requiredScope: 'workspaceAdmin', // Visible to workspace admins (they see filtered view)
    items: [
      {
        label: 'All Users',
        path: '/admin/users',
        icon: UsersIcon,
        requiredScope: 'workspaceAdmin',
      },
      {
        label: 'Create User',
        path: '/admin/users/create',
        icon: UserPlusIcon,
        requiredScope: 'domainAdmin',
      },
      { label: 'ACL Manager', path: '/admin/acl', icon: KeyIcon, requiredScope: 'workspaceAdmin' },
      {
        label: 'Permission Matrix',
        path: '/admin/permission-matrix',
        icon: TableIcon,
        requiredScope: 'domainAdmin',
      },
      {
        label: 'Permission Tree',
        path: '/admin/permissions',
        icon: TreeIcon,
        requiredScope: 'domainAdmin',
      },
      { label: 'Invites', path: '/admin/invites', icon: MailIcon, requiredScope: 'domainAdmin' },
    ],
  },
  {
    title: 'Workspaces',
    items: [{ label: 'My Workspaces', path: '/admin/workspaces', icon: BuildingIcon }],
  },
  {
    title: 'Security',
    requiredScope: 'workspaceAdmin', // Workspace admins can see their scoped audit logs
    items: [
      {
        label: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: ClipboardListIcon,
        requiredScope: 'workspaceAdmin',
      },
    ],
  },
  {
    title: 'System Settings',
    requiredScope: 'domainAdmin',
    items: [
      { label: 'General', path: '/admin/settings', icon: CogIcon, requiredScope: 'domainAdmin' },
      {
        label: 'Security',
        path: '/admin/settings/security',
        icon: ShieldIcon,
        requiredScope: 'domainAdmin',
      },
      {
        label: 'AI Systems',
        path: '/admin/settings/ai',
        icon: CpuChipIcon,
        requiredScope: 'domainAdmin',
      },
      {
        label: 'MCP Services',
        path: '/admin/settings/mcp-services',
        icon: PlugIcon,
        requiredScope: 'domainAdmin',
        slug: 'mcp-services',
      },
      { label: 'Backup', path: '/admin/backup', icon: DatabaseIcon, requiredScope: 'domainAdmin' },
    ],
  },
  {
    title: 'Integrations',
    requiredScope: 'workspaceAdmin',
    items: [
      {
        label: 'GitHub',
        path: '/admin/github',
        icon: GitHubIcon,
        requiredScope: 'workspaceAdmin',
        slug: 'github',
      },
    ],
  },
];

// =============================================================================
// Component
// =============================================================================

export function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const location = useLocation();

  // Get user's admin scope
  const { data: adminScope, isLoading: scopeLoading } = trpc.group.myAdminScope.useQuery();
  const isDomainAdmin = adminScope?.isDomainAdmin ?? false;
  const isWorkspaceAdmin = (adminScope?.workspaceIds?.length ?? 0) > 0;

  // Get ACL feature access
  const { canSeeFeature, isLoading: aclLoading } = useAdminFeatureAccess();
  const isLoading = scopeLoading || aclLoading;

  /**
   * Check if user has required scope for an item/section.
   * - 'domainAdmin': Only Domain Admins
   * - 'workspaceAdmin': Domain Admins OR users with workspace access
   * - 'any' / undefined: Anyone with admin panel access
   */
  const hasRequiredScope = (required?: RequiredScope): boolean => {
    if (!required || required === 'any') return true;
    if (required === 'domainAdmin') return isDomainAdmin;
    if (required === 'workspaceAdmin') return isDomainAdmin || isWorkspaceAdmin;
    return false;
  };

  /**
   * Check if user can see an item (both scope AND ACL feature check)
   */
  const canSeeItem = (item: NavItem): boolean => {
    // First check scope
    if (!hasRequiredScope(item.requiredScope)) return false;
    // Then check ACL feature if slug is specified
    if (item.slug && !canSeeFeature(item.slug)) return false;
    return true;
  };

  const isActive = (path: string) => {
    // Exact match for main pages, prefix match for sub-pages
    if (path === '/admin/users') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Filter sections and items based on user's scope AND ACL features
  const filteredSections = navSections
    .filter((section) => hasRequiredScope(section.requiredScope))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSeeItem(item)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-gray-200 dark:border-gray-700 bg-muted transition-all',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      {/* Header */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-foreground">
            {isDomainAdmin ? 'Domain Admin' : isWorkspaceAdmin ? 'Workspace Admin' : 'Admin'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isDomainAdmin
              ? 'Full system access'
              : isWorkspaceAdmin
                ? `${adminScope?.workspaceIds?.length ?? 0} workspace(s)`
                : 'Limited access'}
          </p>
        </div>
      )}

      {/* Back to Dashboard */}
      <div className="px-2 pt-2">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            'text-gray-600 dark:text-gray-400 hover:bg-accent'
          )}
        >
          <HomeIcon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Back to Dashboard</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
        ) : (
          filteredSections.map((section, idx) => (
            <div key={idx} className="mb-2">
              {/* Section Title */}
              {!collapsed && (
                <div className="px-4 py-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </span>
                </div>
              )}

              {/* Section Items */}
              <ul className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                          active
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-accent'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
