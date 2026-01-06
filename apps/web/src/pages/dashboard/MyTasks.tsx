/*
 * My Tasks Page
 * Version: 1.0.0
 *
 * Cross-project view of all tasks assigned to the current user.
 * Displays tasks from all projects with sorting and filtering.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T00:15 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { trpc } from '@/lib/trpc'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { DueDateBadge } from '@/components/task/DueDateBadge'

// =============================================================================
// Types
// =============================================================================

type SortField = 'title' | 'priority' | 'dateDue' | 'project' | 'column' | 'createdAt'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
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
  )
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (!direction) {
    return (
      <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={direction === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
  )
}

// =============================================================================
// Loading / Error / Empty States
// =============================================================================

function TasksLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your tasks...</p>
      </div>
    </div>
  )
}

function TasksError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Failed to load tasks</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

function TasksEmpty() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tasks assigned</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">You don't have any tasks assigned to you yet.</p>
      </div>
    </div>
  )
}

// =============================================================================
// Header Component
// =============================================================================

interface PageHeaderProps {
  totalTasks: number
  includeCompleted: boolean
  onToggleCompleted: () => void
}

function PageHeader({ totalTasks, includeCompleted, onToggleCompleted }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Tasks</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalTasks} task{totalTasks !== 1 ? 's' : ''} across all projects
        </span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={includeCompleted}
            onChange={onToggleCompleted}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show completed
        </label>
      </div>
    </div>
  )
}

// =============================================================================
// Table Header
// =============================================================================

interface TableHeaderProps {
  sortConfig: SortConfig
  onSort: (field: SortField) => void
}

function TableHeader({ sortConfig, onSort }: TableHeaderProps) {
  const columns: { field: SortField; label: string; width: string }[] = [
    { field: 'title', label: 'Title', width: 'w-1/3' },
    { field: 'project', label: 'Project', width: 'w-32' },
    { field: 'column', label: 'Status', width: 'w-24' },
    { field: 'priority', label: 'Priority', width: 'w-24' },
    { field: 'dateDue', label: 'Due Date', width: 'w-32' },
    { field: 'createdAt', label: 'Created', width: 'w-28' },
  ]

  return (
    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
      <tr>
        {columns.map((col) => (
          <th
            key={col.field}
            className={`${col.width} px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
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
  )
}

// =============================================================================
// Task Row
// =============================================================================

interface TaskRowProps {
  task: {
    id: number
    title: string
    priority: number
    dateDue: string | null
    isActive: boolean
    createdAt: string
    project: { id: number; name: string; identifier: string | null }
    column: { id: number; title: string }
  }
  onTaskClick: (projectId: number, taskId: number) => void
}

function TaskRow({ task, onTaskClick }: TaskRowProps) {
  return (
    <tr
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
        !task.isActive ? 'opacity-50' : ''
      }`}
      onClick={() => onTaskClick(task.project.id, task.id)}
    >
      <td className="px-4 py-3">
        <span className={`text-sm font-medium ${task.isActive ? 'text-gray-900 dark:text-white' : 'line-through text-gray-500'}`}>
          {task.title}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
          {task.project.identifier ?? task.project.name}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          {task.column.title}
        </span>
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={task.priority} showLow size="sm" />
      </td>
      <td className="px-4 py-3">
        {task.dateDue ? <DueDateBadge dueDate={task.dateDue} size="sm" /> : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
        {new Date(task.createdAt).toLocaleDateString()}
      </td>
    </tr>
  )
}

// =============================================================================
// Main My Tasks Page
// =============================================================================

export function MyTasks() {
  const navigate = useNavigate()

  // State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'dateDue', direction: 'asc' })
  const [includeCompleted, setIncludeCompleted] = useState(false)

  // Query
  const tasksQuery = trpc.user.getMyTasks.useQuery()

  // Filter and sort tasks
  const sortedTasks = useMemo(() => {
    let tasks = tasksQuery.data ?? []

    // Filter completed if needed
    if (!includeCompleted) {
      tasks = tasks.filter((t) => t.isActive)
    }

    // Sort
    return [...tasks].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1
      switch (sortConfig.field) {
        case 'title':
          return dir * a.title.localeCompare(b.title)
        case 'priority':
          return dir * (a.priority - b.priority)
        case 'dateDue':
          if (!a.dateDue && !b.dateDue) return 0
          if (!a.dateDue) return 1
          if (!b.dateDue) return -1
          return dir * (new Date(a.dateDue).getTime() - new Date(b.dateDue).getTime())
        case 'project':
          return dir * a.project.name.localeCompare(b.project.name)
        case 'column':
          return dir * a.column.title.localeCompare(b.column.title)
        case 'createdAt':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        default:
          return 0
      }
    })
  }, [tasksQuery.data, sortConfig, includeCompleted])

  // Sorting handler
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Task click handler
  const handleTaskClick = (projectId: number, taskId: number) => {
    navigate(`/project/${projectId}/board?task=${taskId}`)
  }

  // Loading state
  if (tasksQuery.isLoading) {
    return (
      <DashboardLayout>
        <TasksLoading />
      </DashboardLayout>
    )
  }

  // Error state
  if (tasksQuery.error) {
    return (
      <DashboardLayout>
        <TasksError message={tasksQuery.error.message} onRetry={() => tasksQuery.refetch()} />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow">
        <PageHeader
          totalTasks={sortedTasks.length}
          includeCompleted={includeCompleted}
          onToggleCompleted={() => setIncludeCompleted(!includeCompleted)}
        />
        <div className="flex-1 overflow-auto">
          {sortedTasks.length === 0 ? (
            <TasksEmpty />
          ) : (
            <table className="min-w-full">
              <TableHeader sortConfig={sortConfig} onSort={handleSort} />
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onTaskClick={handleTaskClick} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default MyTasks
