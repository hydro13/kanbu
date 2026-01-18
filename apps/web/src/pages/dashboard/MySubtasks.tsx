/*
 * My Subtasks Page
 * Version: 1.0.0
 *
 * Cross-project view of all subtasks assigned to the current user.
 * Displays subtasks from all projects with sorting and status filtering.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T00:20 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

type SortField = 'title' | 'status' | 'task' | 'project' | 'timeEstimated' | 'timeSpent';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// =============================================================================
// Icons
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

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (!direction) {
    return (
      <svg
        className="h-4 w-4 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
  );
}

// =============================================================================
// Loading / Error / Empty States
// =============================================================================

function SubtasksLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your subtasks...</p>
      </div>
    </div>
  );
}

function SubtasksError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground">Failed to load subtasks</h3>
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

function SubtasksEmpty() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground">No subtasks assigned</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          You don't have any subtasks assigned to you yet.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const defaultConfig = {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-200',
    label: 'To Do',
  };
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    TODO: defaultConfig,
    IN_PROGRESS: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      label: 'In Progress',
    },
    DONE: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      label: 'Done',
    },
  };

  const config = statusConfig[status] ?? defaultConfig;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// Header Component
// =============================================================================

interface PageHeaderProps {
  totalSubtasks: number;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
}

function PageHeader({ totalSubtasks, statusFilter, onStatusFilterChange }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-card rounded-t-lg">
      <div>
        <h1 className="text-section-title text-foreground">My Subtasks</h1>
        <span className="text-sm text-muted-foreground">
          {totalSubtasks} subtask{totalSubtasks !== 1 ? 's' : ''} across all projects
        </span>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          className="text-sm border border-input rounded-md px-3 py-1.5 bg-background text-gray-700 dark:text-gray-300 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// Table Header
// =============================================================================

interface TableHeaderProps {
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
}

function TableHeader({ sortConfig, onSort }: TableHeaderProps) {
  const columns: { field: SortField; label: string; width: string }[] = [
    { field: 'title', label: 'Subtask', width: 'w-1/4' },
    { field: 'task', label: 'Parent Task', width: 'w-1/4' },
    { field: 'project', label: 'Project', width: 'w-32' },
    { field: 'status', label: 'Status', width: 'w-28' },
    { field: 'timeEstimated', label: 'Estimated', width: 'w-24' },
    { field: 'timeSpent', label: 'Spent', width: 'w-24' },
  ];

  return (
    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
      <tr>
        {columns.map((col) => (
          <th
            key={col.field}
            className={`${col.width} px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-accent`}
            onClick={() => onSort(col.field)}
          >
            <div className="flex items-center gap-1">
              {col.label}
              <SortIcon direction={sortConfig.field === col.field ? sortConfig.direction : null} />
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

// =============================================================================
// Subtask Row
// =============================================================================

interface SubtaskRowProps {
  subtask: {
    id: number;
    title: string;
    status: string;
    timeEstimated: number | null;
    timeSpent: number | null;
    task: {
      id: number;
      title: string;
      project: {
        id: number;
        name: string;
        identifier: string | null;
        workspace: { id: number; slug: string };
      };
    };
  };
  onTaskClick: (workspaceSlug: string, projectIdentifier: string, taskId: number) => void;
}

function formatHours(hours: number | null): string {
  if (hours === null || hours === 0) return '-';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function SubtaskRow({ subtask, onTaskClick }: SubtaskRowProps) {
  return (
    <tr
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
        subtask.status === 'DONE' ? 'opacity-50' : ''
      }`}
      onClick={() =>
        onTaskClick(
          subtask.task.project.workspace.slug,
          subtask.task.project.identifier ?? String(subtask.task.project.id),
          subtask.task.id
        )
      }
    >
      <td className="px-4 py-3">
        <span
          className={`text-sm font-medium ${subtask.status === 'DONE' ? 'line-through text-gray-500' : 'text-foreground'}`}
        >
          {subtask.title}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">{subtask.task.title}</span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {subtask.task.project.identifier ?? subtask.task.project.name}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={subtask.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {formatHours(subtask.timeEstimated)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {formatHours(subtask.timeSpent)}
      </td>
    </tr>
  );
}

// =============================================================================
// Main My Subtasks Page
// =============================================================================

export function MySubtasks() {
  const navigate = useNavigate();

  // State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'status', direction: 'asc' });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Query
  const subtasksQuery = trpc.user.getMySubtasks.useQuery();

  // Filter and sort subtasks
  const sortedSubtasks = useMemo(() => {
    let subtasks = subtasksQuery.data ?? [];

    // Filter by status
    if (statusFilter !== 'all') {
      const statusMap: Record<string, string> = {
        todo: 'TODO',
        in_progress: 'IN_PROGRESS',
        done: 'DONE',
      };
      subtasks = subtasks.filter((s) => s.status === statusMap[statusFilter]);
    }

    // Sort
    return [...subtasks].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.field) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'status': {
          const statusOrder = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
          return (
            dir *
            ((statusOrder[a.status as keyof typeof statusOrder] ?? 0) -
              (statusOrder[b.status as keyof typeof statusOrder] ?? 0))
          );
        }
        case 'task':
          return dir * a.task.title.localeCompare(b.task.title);
        case 'project':
          return dir * a.task.project.name.localeCompare(b.task.project.name);
        case 'timeEstimated':
          return dir * ((a.timeEstimated ?? 0) - (b.timeEstimated ?? 0));
        case 'timeSpent':
          return dir * ((a.timeSpent ?? 0) - (b.timeSpent ?? 0));
        default:
          return 0;
      }
    });
  }, [subtasksQuery.data, sortConfig, statusFilter]);

  // Sorting handler
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Task click handler
  const handleTaskClick = (workspaceSlug: string, projectIdentifier: string, taskId: number) => {
    navigate(`/workspace/${workspaceSlug}/project/${projectIdentifier}/board?task=${taskId}`);
  };

  // Loading state
  if (subtasksQuery.isLoading) {
    return (
      <DashboardLayout>
        <SubtasksLoading />
      </DashboardLayout>
    );
  }

  // Error state
  if (subtasksQuery.error) {
    return (
      <DashboardLayout>
        <SubtasksError
          message={subtasksQuery.error.message}
          onRetry={() => subtasksQuery.refetch()}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow">
        <PageHeader
          totalSubtasks={sortedSubtasks.length}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <div className="flex-1 overflow-auto">
          {sortedSubtasks.length === 0 ? (
            <SubtasksEmpty />
          ) : (
            <table className="min-w-full">
              <TableHeader sortConfig={sortConfig} onSort={handleSort} />
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedSubtasks.map((subtask) => (
                  <SubtaskRow key={subtask.id} subtask={subtask} onTaskClick={handleTaskClick} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MySubtasks;
