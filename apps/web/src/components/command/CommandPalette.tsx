/*
 * CommandPalette Component
 * Version: 2.0.0
 *
 * Cmd+K command palette for quick navigation and actions.
 * Context-aware with support for dashboard, workspace, and project navigation.
 * Includes global search across workspaces, projects, and tasks.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-11
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useCommandPalette } from './CommandPaletteContext';
import { useNavigationContext } from '@/hooks/useNavigationContext';

// Re-export useCommandPalette from context for backwards compatibility
export { useCommandPalette } from './CommandPaletteContext';

// =============================================================================
// Types
// =============================================================================

type CommandType = 'navigation' | 'action' | 'task' | 'project' | 'workspace';

interface CommandItem {
  id: string;
  type: CommandType;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  section?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  projectId?: number;
  onOpenTaskDetail?: (taskId: number) => void;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg
      className="h-4 w-4"
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

function ProjectIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-4 w-4"
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

function ChartIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-4 w-4"
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

function WikiIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  );
}

function getTypeIcon(type: CommandType, icon?: React.ReactNode) {
  if (icon) return icon;
  switch (type) {
    case 'task':
      return <TaskIcon />;
    case 'navigation':
      return <DashboardIcon />;
    case 'workspace':
      return <WorkspaceIcon />;
    case 'project':
      return <ProjectIcon />;
    case 'action':
      return <TaskIcon />;
    default:
      return null;
  }
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({
  projectId: propProjectId,
  onOpenTaskDetail,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isOpen, close } = useCommandPalette();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const navContext = useNavigationContext();

  // Use projectId from props or from navigation context
  const projectId =
    propProjectId ??
    (navContext.projectIdentifier ? parseInt(navContext.projectIdentifier, 10) : undefined);
  const workspaceSlug = navContext.workspaceSlug;

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  // Fetch workspaces for search
  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, {
    enabled: isOpen && query.length >= 2,
  });

  // Fetch my tasks for search
  const { data: myTasks } = trpc.user.getMyTasks.useQuery(undefined, {
    enabled: isOpen && query.length >= 2,
  });

  // Fetch project tasks if in project context
  const { data: projectTasks } = trpc.task.list.useQuery(
    { projectId: projectId! },
    { enabled: isOpen && !!projectId && query.length >= 2 }
  );

  // Fetch workspace by slug for wiki search
  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { slug: workspaceSlug! },
    { enabled: isOpen && !!workspaceSlug && query.length >= 2 }
  );

  // Fetch wiki pages for workspace
  const { data: wikiPages } = trpc.workspaceWiki.getTree.useQuery(
    { workspaceId: workspace?.id ?? 0 },
    { enabled: isOpen && !!workspace?.id && query.length >= 2 }
  );

  // ==========================================================================
  // Build Command Items
  // ==========================================================================

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    const lowerQuery = query.toLowerCase();

    // Helper to check if item matches query
    const matchesQuery = (label: string, description?: string, keywords?: string[]) => {
      if (query.length === 0) return true;
      const searchText = [label, description, ...(keywords || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchText.includes(lowerQuery);
    };

    // ========================================================================
    // Navigation Commands (Always Available)
    // ========================================================================

    const navCommands: Omit<CommandItem, 'onSelect'>[] = [
      {
        id: 'nav-dashboard',
        type: 'navigation',
        label: 'Go to Dashboard',
        description: 'Overview of your work',
        shortcut: 'G D',
        keywords: ['home', 'overview'],
        icon: <DashboardIcon />,
        section: 'Navigation',
      },
      {
        id: 'nav-tasks',
        type: 'navigation',
        label: 'Go to My Tasks',
        description: 'Tasks assigned to you',
        shortcut: 'G T',
        keywords: ['todo', 'assigned'],
        icon: <TaskIcon />,
        section: 'Navigation',
      },
      {
        id: 'nav-inbox',
        type: 'navigation',
        label: 'Go to Inbox',
        description: 'Notifications and updates',
        shortcut: 'G I',
        keywords: ['notifications', 'messages'],
        icon: <InboxIcon />,
        section: 'Navigation',
      },
      {
        id: 'nav-workspaces',
        type: 'navigation',
        label: 'Go to Workspaces',
        description: 'All your workspaces',
        shortcut: 'G W',
        keywords: ['teams', 'organizations'],
        icon: <WorkspaceIcon />,
        section: 'Navigation',
      },
      {
        id: 'nav-notes',
        type: 'navigation',
        label: 'Go to Notes',
        description: 'Personal notes and drafts',
        shortcut: 'G N',
        keywords: ['documents', 'scratch'],
        icon: <NotesIcon />,
        section: 'Navigation',
      },
    ];

    // Add navigation routes
    const navRoutes: Record<string, string> = {
      'nav-dashboard': '/dashboard',
      'nav-tasks': '/dashboard/tasks',
      'nav-inbox': '/dashboard/inbox',
      'nav-workspaces': '/workspaces',
      'nav-notes': '/dashboard/notes',
    };

    navCommands.forEach((cmd) => {
      if (matchesQuery(cmd.label, cmd.description, cmd.keywords)) {
        const route = navRoutes[cmd.id];
        if (route) {
          items.push({
            ...cmd,
            onSelect: () => {
              navigate(route);
              close();
            },
          });
        }
      }
    });

    // ========================================================================
    // Workspace Context Commands
    // ========================================================================

    if (workspaceSlug && (navContext.isWorkspace || navContext.isProject)) {
      const wsCommands: Omit<CommandItem, 'onSelect'>[] = [
        {
          id: 'ws-overview',
          type: 'navigation',
          label: 'Workspace Overview',
          description: 'Back to workspace home',
          icon: <WorkspaceIcon />,
          section: 'Workspace',
        },
        {
          id: 'ws-members',
          type: 'navigation',
          label: 'Members',
          description: 'View workspace members',
          icon: <UsersIcon />,
          section: 'Workspace',
        },
        {
          id: 'ws-stats',
          type: 'navigation',
          label: 'Statistics',
          description: 'Workspace analytics',
          icon: <ChartIcon />,
          section: 'Workspace',
        },
        {
          id: 'ws-wiki',
          type: 'navigation',
          label: 'Wiki',
          description: 'Workspace documentation',
          icon: <WikiIcon />,
          section: 'Workspace',
        },
        {
          id: 'ws-settings',
          type: 'navigation',
          label: 'Workspace Settings',
          description: 'Configure workspace',
          icon: <SettingsIcon />,
          section: 'Workspace',
        },
      ];

      const wsRoutes: Record<string, string> = {
        'ws-overview': `/workspace/${workspaceSlug}`,
        'ws-members': `/workspace/${workspaceSlug}/members`,
        'ws-stats': `/workspace/${workspaceSlug}/stats`,
        'ws-wiki': `/workspace/${workspaceSlug}/wiki`,
        'ws-settings': `/workspace/${workspaceSlug}/settings`,
      };

      wsCommands.forEach((cmd) => {
        if (matchesQuery(cmd.label, cmd.description)) {
          const route = wsRoutes[cmd.id];
          if (route) {
            items.push({
              ...cmd,
              onSelect: () => {
                navigate(route);
                close();
              },
            });
          }
        }
      });
    }

    // ========================================================================
    // Project Context Commands
    // ========================================================================

    if (navContext.isProject && workspaceSlug && projectId) {
      const projCommands: Omit<CommandItem, 'onSelect'>[] = [
        {
          id: 'proj-board',
          type: 'navigation',
          label: 'Board View',
          description: 'Kanban board',
          icon: <BoardIcon />,
          section: 'Project',
        },
        {
          id: 'proj-list',
          type: 'navigation',
          label: 'List View',
          description: 'Task list view',
          icon: <ListIcon />,
          section: 'Project',
        },
        {
          id: 'proj-calendar',
          type: 'navigation',
          label: 'Calendar',
          description: 'Due dates calendar',
          icon: <CalendarIcon />,
          section: 'Project',
        },
        {
          id: 'proj-analytics',
          type: 'navigation',
          label: 'Analytics',
          description: 'Project statistics',
          icon: <ChartIcon />,
          section: 'Project',
        },
      ];

      const projRoutes: Record<string, string> = {
        'proj-board': `/workspace/${workspaceSlug}/project/${projectId}/board`,
        'proj-list': `/workspace/${workspaceSlug}/project/${projectId}/list`,
        'proj-calendar': `/workspace/${workspaceSlug}/project/${projectId}/calendar`,
        'proj-analytics': `/workspace/${workspaceSlug}/project/${projectId}/analytics`,
      };

      projCommands.forEach((cmd) => {
        if (matchesQuery(cmd.label, cmd.description)) {
          const route = projRoutes[cmd.id];
          if (route) {
            items.push({
              ...cmd,
              onSelect: () => {
                navigate(route);
                close();
              },
            });
          }
        }
      });

      // Action: Create new task
      if (matchesQuery('Create New Task', 'Add task')) {
        items.push({
          id: 'action-new-task',
          type: 'action',
          label: 'Create New Task',
          description: 'Add a task to the board',
          shortcut: 'N',
          icon: <TaskIcon />,
          section: 'Actions',
          onSelect: () => {
            // TODO: Open create task modal
            close();
          },
        });
      }
    }

    // ========================================================================
    // Search Results (when query length >= 2)
    // ========================================================================

    if (query.length >= 2) {
      // Workspace search results
      if (workspaces) {
        const matchingWorkspaces = workspaces
          .filter((ws) => ws.name.toLowerCase().includes(lowerQuery))
          .slice(0, 5);

        matchingWorkspaces.forEach((ws) => {
          items.push({
            id: `workspace-${ws.id}`,
            type: 'workspace',
            label: ws.name,
            description: `Workspace • ${ws.projectCount || 0} projects`,
            icon: <WorkspaceIcon />,
            section: 'Workspaces',
            onSelect: () => {
              navigate(`/workspace/${ws.slug}`);
              close();
            },
          });
        });
      }

      // Task search results (from my tasks)
      if (myTasks) {
        const matchingTasks = myTasks
          .filter((task) => task.title.toLowerCase().includes(lowerQuery))
          .slice(0, 10);

        matchingTasks.forEach((task) => {
          items.push({
            id: `task-${task.id}`,
            type: 'task',
            label: task.title,
            description: task.project?.name || undefined,
            icon: <TaskIcon />,
            section: 'Tasks',
            onSelect: () => {
              if (onOpenTaskDetail) {
                onOpenTaskDetail(task.id);
              } else if (task.project?.workspace?.slug && task.project?.identifier) {
                navigate(
                  `/workspace/${task.project.workspace.slug}/project/${task.project.identifier}/board?task=${task.id}`
                );
              }
              close();
            },
          });
        });
      }

      // Project tasks (if in project context)
      if (projectTasks && projectId && workspaceSlug) {
        const matchingProjectTasks = projectTasks
          .filter(
            (task) =>
              task.title.toLowerCase().includes(lowerQuery) ||
              task.reference?.toLowerCase().includes(lowerQuery)
          )
          // Filter out tasks already shown from myTasks
          .filter((task) => !myTasks?.some((t) => t.id === task.id))
          .slice(0, 5);

        matchingProjectTasks.forEach((task) => {
          items.push({
            id: `project-task-${task.id}`,
            type: 'task',
            label: task.title,
            description: task.reference || 'Project task',
            icon: <TaskIcon />,
            section: 'Project Tasks',
            onSelect: () => {
              if (onOpenTaskDetail) {
                onOpenTaskDetail(task.id);
              } else {
                navigate(`/workspace/${workspaceSlug}/project/${projectId}/board?task=${task.id}`);
              }
              close();
            },
          });
        });
      }

      // Wiki page search results (when in workspace context)
      if (wikiPages && workspaceSlug) {
        const matchingWikiPages = wikiPages
          .filter(
            (page) =>
              page.title.toLowerCase().includes(lowerQuery) ||
              page.slug.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 5);

        matchingWikiPages.forEach((page) => {
          items.push({
            id: `wiki-${page.id}`,
            type: 'navigation',
            label: page.title,
            description: `Wiki • ${page.status === 'DRAFT' ? 'Draft' : 'Published'}`,
            icon: <WikiIcon />,
            section: 'Wiki Pages',
            onSelect: () => {
              navigate(`/workspace/${workspaceSlug}/wiki/${page.slug}`);
              close();
            },
          });
        });
      }
    }

    return items;
  }, [
    query,
    workspaces,
    myTasks,
    projectTasks,
    wikiPages,
    projectId,
    workspaceSlug,
    navContext,
    navigate,
    close,
    onOpenTaskDetail,
  ]);

  // ==========================================================================
  // Group items by section
  // ==========================================================================

  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    commandItems.forEach((item) => {
      const section = item.section || 'Other';
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push(item);
    });
    return groups;
  }, [commandItems]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => {
    return Object.values(groupedItems).flat();
  }, [groupedItems]);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatItems.length]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            flatItems[selectedIndex].onSelect();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [flatItems, selectedIndex, close]
  );

  if (!isOpen) return null;

  // Calculate the flat index for each item
  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-card rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, navigate, or run actions..."
            className="flex-1 bg-transparent text-foreground placeholder-gray-400 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {query.length > 0
                ? 'No results found'
                : 'Type to search tasks, workspaces, or projects'}
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedItems).map(([section, items]) => (
                <div key={section}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {section}
                  </div>
                  {items.map((item) => {
                    flatIndex++;
                    const itemIndex = flatIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={itemIndex}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                          selectedIndex === itemIndex
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-accent text-gray-700 dark:text-gray-300'
                        )}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                      >
                        <span
                          className={cn(
                            'flex-shrink-0',
                            selectedIndex === itemIndex
                              ? 'text-blue-500 dark:text-blue-400'
                              : 'text-gray-400 dark:text-gray-500'
                          )}
                        >
                          {getTypeIcon(item.type, item.icon)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        {item.shortcut && (
                          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
