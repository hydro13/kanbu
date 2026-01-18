/*
 * WorkspaceSidebar Component
 * Version: 1.0.0
 *
 * Sidebar navigation for workspace-level pages.
 * Shows workspace modules: Projects, Groups, Wiki, Members, Statistics, Settings.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation for container-aware navigation
 * ===================================================================
 */

import { Link, NavLink, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  FolderOpen,
  BookOpen,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  slug: string;
}

export interface WorkspaceSidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

// =============================================================================
// Navigation Config
// =============================================================================

const workspaceModules: NavItem[] = [
  { label: 'Projects', path: '', icon: FolderKanban, exact: true, slug: 'projects' },
  { label: 'Groups', path: '/groups', icon: FolderOpen, slug: 'groups' },
  { label: 'Wiki', path: '/wiki', icon: BookOpen, slug: 'wiki' },
  { label: 'Members', path: '/members', icon: Users, slug: 'members' },
  { label: 'Statistics', path: '/stats', icon: BarChart3, slug: 'statistics' },
  { label: 'Settings', path: '/settings', icon: Settings, slug: 'settings' },
];

// =============================================================================
// Component
// =============================================================================

export function WorkspaceSidebar({ collapsed = false }: WorkspaceSidebarProps) {
  const params = useParams<{ slug?: string; workspaceSlug?: string }>();
  const workspaceSlug = params.slug || params.workspaceSlug;

  // Fetch workspace data for name display
  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { slug: workspaceSlug! },
    { enabled: !!workspaceSlug }
  );

  const basePath = `/workspace/${workspaceSlug}`;

  return (
    <aside className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Back to Workspaces */}
        <div className="mb-2 px-2">
          <Link
            to="/workspaces"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            )}
            title={collapsed ? 'Back to Workspaces' : undefined}
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Back to Workspaces</span>}
          </Link>
        </div>

        {/* Divider */}
        <div className="my-2 mx-3 border-t border-border" />

        {/* Workspace Header */}
        {!collapsed && workspace && (
          <div className="px-4 py-2 mb-2">
            <h2 className="text-sm font-semibold text-foreground truncate">{workspace.name}</h2>
            {workspace.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {workspace.description}
              </p>
            )}
          </div>
        )}

        {/* Workspace Modules */}
        <div className="mb-2">
          {!collapsed && (
            <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modules
            </div>
          )}
          <ul className="space-y-0.5 px-2">
            {workspaceModules.map((item) => {
              const Icon = item.icon;
              const fullPath = `${basePath}${item.path}`;

              return (
                <li key={item.slug}>
                  <NavLink
                    to={fullPath}
                    end={item.exact}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-foreground/80 hover:bg-accent/50'
                      )
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

export default WorkspaceSidebar;
