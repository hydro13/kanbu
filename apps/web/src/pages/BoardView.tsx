/*
 * Board View Page
 * Version: 1.1.0
 *
 * Main Kanban board view - the heart of the application.
 * Displays columns, swimlanes, and tasks in a drag-friendly layout.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: f0fca18a-4a84-4bf2-83c3-4211c8a9479d
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:40 CET
 *
 * Modified by:
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Signed: 2025-12-28T18:55 CET
 * Change: Added tag filter functionality with multi-select dropdown
 *
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { ViewSwitcher } from '@/components/layout/ViewSwitcher';
import { Board } from '@/components/board/Board';
import { LiveCursors } from '@/components/board/LiveCursors';
import { trpc } from '@/lib/trpc';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/authSlice';

// =============================================================================
// Icons (inline SVG)
// =============================================================================

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      className="h-6 w-6 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function SettingsIcon() {
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

function FilterIcon() {
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
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// Loading State Component
// =============================================================================

function BoardLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading board...</p>
      </div>
    </div>
  );
}

// =============================================================================
// Error State Component
// =============================================================================

function BoardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertIcon />
        <h3 className="mt-4 text-lg font-medium text-foreground">Failed to load board</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

function BoardEmpty({ projectName }: { projectName: string }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center max-w-md">
        <div className="mx-auto h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-gray-400"
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
        </div>
        <h3 className="text-lg font-medium text-foreground">No columns yet</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Get started by adding columns to your board in "{projectName}".
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Board Toolbar (Filter + Settings)
// =============================================================================

interface TagItem {
  id: number;
  name: string;
  color: string | null;
}

interface BoardToolbarProps {
  projectIdentifier: string;
  tags?: TagItem[];
  selectedTagIds: number[];
  onTagToggle: (tagId: number) => void;
  onClearFilters: () => void;
}

function BoardToolbar({
  projectIdentifier,
  tags = [],
  selectedTagIds,
  onTagToggle,
  onClearFilters,
}: BoardToolbarProps) {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const hasActiveFilters = selectedTagIds.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Tag Filter */}
      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`p-2 rounded-md transition-colors flex items-center gap-1 ${
            hasActiveFilters
              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-accent'
          }`}
          title="Filter by tags"
        >
          <FilterIcon />
          {hasActiveFilters && <span className="text-xs font-medium">{selectedTagIds.length}</span>}
        </button>

        {/* Filter Dropdown */}
        {isFilterOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-64 bg-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Tag
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      onClearFilters();
                      setIsFilterOpen(false);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {tags.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No tags in this project
                  </div>
                ) : (
                  tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => onTagToggle(tag.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent"
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color ?? '#6B7280' }}
                        />
                        <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                          {tag.name}
                        </span>
                        {isSelected && (
                          <span className="text-blue-600 dark:text-blue-400">
                            <CheckIcon />
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1">
          {selectedTagIds.slice(0, 2).map((tagId) => {
            const tag = tags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: tag.color ?? '#6B7280',
                  color: '#fff',
                }}
              >
                {tag.name}
                <button
                  onClick={() => onTagToggle(tag.id)}
                  className="opacity-70 hover:opacity-100"
                >
                  <CloseIcon />
                </button>
              </span>
            );
          })}
          {selectedTagIds.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{selectedTagIds.length - 2}
            </span>
          )}
        </div>
      )}

      <button
        onClick={() => navigate(`/project/${projectIdentifier}/settings`)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-accent transition-colors"
        title="Board settings"
      >
        <SettingsIcon />
      </button>
    </div>
  );
}

// =============================================================================
// Main Board View Page
// =============================================================================

export function BoardViewPage() {
  const { projectIdentifier, workspaceSlug } = useParams<{
    projectIdentifier: string;
    workspaceSlug: string;
  }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectUser);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    {
      enabled: !!projectIdentifier,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get project ID from fetched data
  const projectIdNum = projectQuery.data?.id ?? null;

  // Real-time collaboration sync
  // isConnected can be used to show connection status indicator
  useRealtimeSync({
    projectId: projectIdNum ?? 0,
    currentUserId: currentUser?.id ?? 0,
  });

  // Tag filter state
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Fetch active tasks for the project
  const tasksQuery = trpc.task.list.useQuery(
    { projectId: projectIdNum!, isActive: true, limit: 500 },
    {
      enabled: !!projectIdNum,
      staleTime: 30 * 1000, // 30 seconds - tasks change more frequently
    }
  );

  // Also fetch closed/archived tasks (for the Archive column)
  const archivedTasksQuery = trpc.task.list.useQuery(
    { projectId: projectIdNum!, isActive: false, limit: 500 },
    {
      enabled: !!projectIdNum,
      staleTime: 30 * 1000,
    }
  );

  // Fetch tags for filter dropdown
  const tagsQuery = trpc.tag.list.useQuery(
    { projectId: projectIdNum! },
    {
      enabled: !!projectIdNum,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Toggle tag in filter
  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedTagIds([]);
  };

  // Combine active and archived tasks, then filter by selected tags
  const filteredTasks = useMemo(() => {
    const activeTasks = tasksQuery.data ?? [];
    const archivedTasks = archivedTasksQuery.data ?? [];
    const allTasks = [...activeTasks, ...archivedTasks];

    if (selectedTagIds.length === 0) return allTasks;

    return allTasks.filter((task) =>
      selectedTagIds.some((tagId) => task.tags?.some((t) => t.id === tagId))
    );
  }, [tasksQuery.data, archivedTasksQuery.data, selectedTagIds]);

  // Get showArchiveColumn setting from project settings (default: false)
  // Use useMemo with any cast to break type chain and avoid deep type instantiation with Prisma JsonValue
  // NOTE: Must be computed before early returns to maintain hook order
  const showArchiveColumn = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = projectQuery.data as any;
    return Boolean(data?.settings?.showArchiveColumn);
  }, [projectQuery.data]);

  // Filter columns - hide Archive column unless showArchiveColumn is enabled
  // NOTE: This useMemo MUST be before early returns to maintain consistent hook order
  const columns = useMemo(() => {
    const allColumns = projectQuery.data?.columns ?? [];
    if (showArchiveColumn) return allColumns;
    return allColumns.filter((col) => !col.isArchive);
  }, [projectQuery.data?.columns, showArchiveColumn]);

  // Handle invalid project identifier
  if (!projectIdentifier) {
    return (
      <ProjectLayout>
        <BoardError message="Invalid project identifier" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    );
  }

  // Loading state
  if (projectQuery.isLoading || tasksQuery.isLoading) {
    return (
      <ProjectLayout>
        <BoardLoading />
      </ProjectLayout>
    );
  }

  // Error state
  if (projectQuery.error) {
    return (
      <ProjectLayout>
        <BoardError message={projectQuery.error.message} onRetry={() => projectQuery.refetch()} />
      </ProjectLayout>
    );
  }

  if (tasksQuery.error) {
    return (
      <ProjectLayout>
        <BoardError message={tasksQuery.error.message} onRetry={() => tasksQuery.refetch()} />
      </ProjectLayout>
    );
  }

  // No project found
  if (!projectQuery.data) {
    return (
      <ProjectLayout>
        <BoardError message="Project not found" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    );
  }

  const project = projectQuery.data;
  const swimlanes = project.swimlanes ?? [];
  const tags = tagsQuery.data ?? [];

  // Empty state - no columns
  if (columns.length === 0) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-card">
          <ViewSwitcher
            projectIdentifier={project.identifier ?? ''}
            workspaceSlug={workspaceSlug || project.workspace?.slug || ''}
            className="border-b-0"
          />
          <div className="pr-4">
            <BoardToolbar
              projectIdentifier={project.identifier ?? ''}
              tags={tags}
              selectedTagIds={selectedTagIds}
              onTagToggle={handleTagToggle}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
        <BoardEmpty projectName={project.name} />
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout>
      <div className="flex flex-col h-full" ref={boardContainerRef}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-card">
          <ViewSwitcher
            projectIdentifier={project.identifier ?? ''}
            workspaceSlug={workspaceSlug || project.workspace?.slug || ''}
            className="border-b-0"
          />
          <div className="flex items-center gap-4 pr-4">
            <BoardToolbar
              projectIdentifier={project.identifier ?? ''}
              tags={tags}
              selectedTagIds={selectedTagIds}
              onTagToggle={handleTagToggle}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <Board
            columns={columns}
            swimlanes={swimlanes}
            tasks={filteredTasks}
            projectId={project.id}
          />
        </div>

        {/* Live cursors overlay */}
        {currentUser && (
          <LiveCursors
            projectId={project.id}
            currentUserId={currentUser.id}
            containerRef={boardContainerRef}
          />
        )}
      </div>
    </ProjectLayout>
  );
}

export default BoardViewPage;
