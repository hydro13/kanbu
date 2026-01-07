/*
 * List View Page
 * Version: 1.0.0
 *
 * Table view of tasks with sortable columns and inline editing.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: de75c403-118c-4293-8d05-c2e3147fd7c8
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:15 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { ViewSwitcher } from '@/components/layout/ViewSwitcher'
import { LiveCursors } from '@/components/board/LiveCursors'
import { trpc } from '@/lib/trpc'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { PriorityBadge } from '@/components/task/PriorityBadge'
import { DueDateBadge } from '@/components/task/DueDateBadge'
import { TagBadge } from '@/components/task/TagBadge'
import { ProgressBar } from '@/components/task/ProgressBar'
import { TaskDetailModal } from '@/components/task/TaskDetailModal'

// =============================================================================
// Types
// =============================================================================

type SortField = 'title' | 'priority' | 'dateDue' | 'progress' | 'column' | 'createdAt'
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

function CheckIcon() {
  return (
    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

// =============================================================================
// Loading / Error / Empty States
// =============================================================================

function ListLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading tasks...</p>
      </div>
    </div>
  )
}

function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function ListEmpty() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tasks found</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Create your first task to get started.</p>
      </div>
    </div>
  )
}

// =============================================================================
// List Toolbar (Actions + Filters)
// =============================================================================

interface ListToolbarProps {
  selectedCount: number
  onBulkClose: () => void
  includeCompleted: boolean
  onToggleCompleted: () => void
}

function ListToolbar({
  selectedCount,
  onBulkClose,
  includeCompleted,
  onToggleCompleted,
}: ListToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">{selectedCount} selected</span>
          <button
            onClick={onBulkClose}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Close Tasks
          </button>
        </div>
      )}
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
  )
}

// =============================================================================
// Table Header
// =============================================================================

interface TableHeaderProps {
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  allSelected: boolean
  onSelectAll: () => void
}

function TableHeader({ sortConfig, onSort, allSelected, onSelectAll }: TableHeaderProps) {
  const columns: { field: SortField; label: string; width: string }[] = [
    { field: 'title', label: 'Title', width: 'w-1/3' },
    { field: 'column', label: 'Status', width: 'w-24' },
    { field: 'priority', label: 'Priority', width: 'w-24' },
    { field: 'dateDue', label: 'Due Date', width: 'w-32' },
    { field: 'progress', label: 'Progress', width: 'w-28' },
    { field: 'createdAt', label: 'Created', width: 'w-28' },
  ]

  return (
    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
      <tr>
        <th className="w-10 px-4 py-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </th>
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
        <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Tags
        </th>
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
    progress: number
    isActive: boolean
    createdAt: string
    column: { id: number; title: string } | null
    tags?: { id: number; name: string; color: string | null }[]
  }
  selected: boolean
  onSelect: (id: number) => void
  onTaskClick: (id: number) => void
}

function TaskRow({ task, selected, onSelect, onTaskClick }: TaskRowProps) {
  const columnTitle = task.column?.title ?? 'Unknown'

  return (
    <tr
      className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
        !task.isActive ? 'opacity-50' : ''
      } ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(task.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3" onClick={() => onTaskClick(task.id)}>
        <div className="flex items-center gap-2">
          {!task.isActive && (
            <span className="text-green-500">
              <CheckIcon />
            </span>
          )}
          <span className={`text-sm font-medium ${task.isActive ? 'text-gray-900 dark:text-white' : 'line-through text-gray-500'}`}>
            {task.title}
          </span>
        </div>
      </td>
      <td className="px-4 py-3" onClick={() => onTaskClick(task.id)}>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          {columnTitle}
        </span>
      </td>
      <td className="px-4 py-3" onClick={() => onTaskClick(task.id)}>
        <PriorityBadge priority={task.priority} showLow size="sm" />
      </td>
      <td className="px-4 py-3" onClick={() => onTaskClick(task.id)}>
        {task.dateDue ? <DueDateBadge dueDate={task.dateDue} size="sm" /> : <span className="text-gray-400">-</span>}
      </td>
      <td className="px-4 py-3" onClick={() => onTaskClick(task.id)}>
        <ProgressBar progress={task.progress} size="sm" showPercentage />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400" onClick={() => onTaskClick(task.id)}>
        {new Date(task.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3" onClick={() => onTaskClick(task.id)}>
        <div className="flex flex-wrap gap-1">
          {task.tags?.slice(0, 2).map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
          {(task.tags?.length ?? 0) > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{(task.tags?.length ?? 0) - 2}</span>
          )}
        </div>
      </td>
    </tr>
  )
}

// =============================================================================
// Main List View Page
// =============================================================================

export function ListViewPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const navigate = useNavigate()
  const currentUser = useAppSelector(selectUser)
  const listContainerRef = useRef<HTMLDivElement>(null)

  // State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createdAt', direction: 'desc' })
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [includeCompleted, setIncludeCompleted] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectIdNum = projectQuery.data?.id ?? null

  // Real-time collaboration sync
  useRealtimeSync({
    projectId: projectIdNum ?? 0,
    currentUserId: currentUser?.id ?? 0,
  })

  // Queries
  const tasksQuery = trpc.task.list.useQuery(
    { projectId: projectIdNum!, isActive: !includeCompleted ? true : undefined, limit: 500 },
    { enabled: !!projectIdNum }
  )

  // Mutations
  const utils = trpc.useUtils()
  const closeTaskMutation = trpc.task.close.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId: projectIdNum! })
      setSelectedIds(new Set())
    },
  })

  // Sorting
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Sorted and filtered tasks
  const sortedTasks = useMemo(() => {
    const tasks = tasksQuery.data ?? []
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
        case 'progress':
          return dir * (a.progress - b.progress)
        case 'column':
          return dir * ((a.column?.title ?? '').localeCompare(b.column?.title ?? ''))
        case 'createdAt':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        default:
          return 0
      }
    })
  }, [tasksQuery.data, sortConfig])

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === sortedTasks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedTasks.map((t) => t.id)))
    }
  }

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Bulk close
  const handleBulkClose = async () => {
    for (const taskId of selectedIds) {
      await closeTaskMutation.mutateAsync({ taskId })
    }
  }

  // Handle invalid project identifier
  if (!projectIdentifier) {
    return (
      <ProjectLayout>
        <ListError message="Invalid project identifier" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    )
  }

  // Loading state
  if (projectQuery.isLoading || tasksQuery.isLoading) {
    return (
      <ProjectLayout>
        <ListLoading />
      </ProjectLayout>
    )
  }

  // Error state
  if (projectQuery.error) {
    return (
      <ProjectLayout>
        <ListError message={projectQuery.error.message} onRetry={() => projectQuery.refetch()} />
      </ProjectLayout>
    )
  }

  if (!projectQuery.data) {
    return (
      <ProjectLayout>
        <ListError message="Project not found" onRetry={() => navigate('/workspaces')} />
      </ProjectLayout>
    )
  }

  const project = projectQuery.data

  return (
    <ProjectLayout>
      <div className="flex flex-col h-full" ref={listContainerRef}>
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <ViewSwitcher projectIdentifier={project.identifier ?? ''} className="border-b-0" />
          <div className="flex items-center gap-4 pr-4">
            <ListToolbar
              selectedCount={selectedIds.size}
              onBulkClose={handleBulkClose}
              includeCompleted={includeCompleted}
              onToggleCompleted={() => setIncludeCompleted(!includeCompleted)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {sortedTasks.length === 0 ? (
            <ListEmpty />
          ) : (
            <table className="min-w-full">
              <TableHeader
                sortConfig={sortConfig}
                onSort={handleSort}
                allSelected={selectedIds.size === sortedTasks.length && sortedTasks.length > 0}
                onSelectAll={handleSelectAll}
              />
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={selectedIds.has(task.id)}
                    onSelect={handleSelect}
                    onTaskClick={(id) => setSelectedTaskId(id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        projectId={project.id}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Live cursors overlay */}
      {currentUser && (
        <LiveCursors
          projectId={project.id}
          currentUserId={currentUser.id}
          containerRef={listContainerRef}
        />
      )}
    </ProjectLayout>
  )
}

export default ListViewPage
