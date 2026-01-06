/*
 * TaskLinkSection Component
 * Version: 1.0.0
 *
 * Displays and manages task links/dependencies.
 * Supports blocks, relates to, duplicates, and other link types.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 91ee674b-91f8-407e-950b-e02721eb0de6
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T18:40 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react'
import {
  Link2,
  Plus,
  Trash2,
  Search,
  Ban,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

type LinkType =
  | 'RELATES_TO'
  | 'BLOCKS'
  | 'IS_BLOCKED_BY'
  | 'DUPLICATES'
  | 'IS_DUPLICATED_BY'
  | 'IS_CHILD_OF'
  | 'IS_PARENT_OF'
  | 'FOLLOWS'
  | 'IS_FOLLOWED_BY'
  | 'FIXES'
  | 'IS_FIXED_BY'

interface LinkedTask {
  id: number
  title: string
  reference: string | null
  isActive: boolean
  columnTitle: string
}

interface TaskLink {
  id: number
  direction: 'outgoing' | 'incoming'
  linkType: LinkType | string
  originalLinkType?: string
  linkedTask: LinkedTask
  createdAt: string | Date
}

export interface TaskLinkSectionProps {
  taskId: number
  projectId: number
}

// =============================================================================
// Constants
// =============================================================================

const LINK_TYPE_LABELS: Record<string, string> = {
  BLOCKS: 'Blocks',
  IS_BLOCKED_BY: 'Is blocked by',
  RELATES_TO: 'Relates to',
  DUPLICATES: 'Duplicates',
  IS_DUPLICATED_BY: 'Is duplicated by',
  IS_CHILD_OF: 'Is child of',
  IS_PARENT_OF: 'Is parent of',
  FOLLOWS: 'Follows',
  IS_FOLLOWED_BY: 'Is followed by',
  FIXES: 'Fixes',
  IS_FIXED_BY: 'Is fixed by',
}

const LINK_TYPE_ICONS: Record<string, React.ReactNode> = {
  BLOCKS: <Ban className="h-3 w-3 text-red-500" />,
  IS_BLOCKED_BY: <Ban className="h-3 w-3 text-orange-500" />,
  RELATES_TO: <Link2 className="h-3 w-3 text-blue-500" />,
  DUPLICATES: <Link2 className="h-3 w-3 text-purple-500" />,
  IS_DUPLICATED_BY: <Link2 className="h-3 w-3 text-purple-400" />,
  IS_CHILD_OF: <ArrowRight className="h-3 w-3 text-green-500" />,
  IS_PARENT_OF: <ArrowLeft className="h-3 w-3 text-green-500" />,
  FOLLOWS: <ArrowRight className="h-3 w-3 text-cyan-500" />,
  IS_FOLLOWED_BY: <ArrowLeft className="h-3 w-3 text-cyan-500" />,
  FIXES: <Link2 className="h-3 w-3 text-emerald-500" />,
  IS_FIXED_BY: <Link2 className="h-3 w-3 text-emerald-400" />,
}

// =============================================================================
// LinkItem Component
// =============================================================================

function LinkItem({
  link,
  onNavigate,
  onDelete,
  isDeleting,
}: {
  link: TaskLink
  onNavigate: (taskId: number) => void
  onDelete: (linkId: number) => void
  isDeleting: boolean
}) {
  const label = LINK_TYPE_LABELS[link.linkType] ?? link.linkType
  const icon = LINK_TYPE_ICONS[link.linkType] ?? <Link2 className="h-3 w-3" />

  return (
    <div className="group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
      {icon}
      <span className="text-xs text-gray-500 min-w-[80px]">{label}</span>
      <button
        type="button"
        onClick={() => onNavigate(link.linkedTask.id)}
        className="flex-1 text-left text-sm truncate hover:text-blue-600 dark:hover:text-blue-400"
      >
        {link.linkedTask.reference && (
          <span className="text-gray-400 mr-1">#{link.linkedTask.reference}</span>
        )}
        <span className={link.linkedTask.isActive ? '' : 'line-through text-gray-400'}>
          {link.linkedTask.title}
        </span>
      </button>
      <span className="text-xs text-gray-400">{link.linkedTask.columnTitle}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
        onClick={() => onDelete(link.id)}
        disabled={isDeleting}
      >
        <Trash2 className="h-3 w-3 text-red-500" />
      </Button>
    </div>
  )
}

// =============================================================================
// AddLinkModal Component
// =============================================================================

function AddLinkModal({
  isOpen,
  onClose,
  taskId,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  taskId: number
  onSuccess: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<LinkType>('RELATES_TO')
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  const utils = trpc.useUtils()

  // Search for tasks
  const searchQuery$ = trpc.taskLink.searchTasks.useQuery(
    { taskId, query: searchQuery, limit: 10 },
    { enabled: searchQuery.length >= 1 }
  )

  // Get link types
  const linkTypes = trpc.taskLink.getLinkTypes.useQuery()

  // Create link mutation
  const createLink = trpc.taskLink.create.useMutation({
    onSuccess: () => {
      utils.taskLink.list.invalidate({ taskId })
      utils.taskLink.getBlocking.invalidate({ taskId })
      onSuccess()
      onClose()
      setSearchQuery('')
      setSelectedTaskId(null)
    },
  })

  const handleCreate = useCallback(() => {
    if (selectedTaskId === null) return
    createLink.mutate({
      taskId,
      oppositeTaskId: selectedTaskId,
      linkType: selectedType,
    })
  }, [taskId, selectedTaskId, selectedType, createLink])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link Type Selector */}
          <div>
            <label className="text-sm font-medium">Link Type</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as LinkType)}
            >
              {linkTypes.data?.map((lt) => (
                <option key={lt.type} value={lt.type}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Task Search */}
          <div>
            <label className="text-sm font-medium">Search Task</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title or reference..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.length >= 1 && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
              {searchQuery$.isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
              ) : searchQuery$.data?.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No tasks found</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {searchQuery$.data?.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedTaskId === task.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {task.reference && (
                          <span className="text-gray-400">#{task.reference}</span>
                        )}
                        <span className={task.isActive ? '' : 'line-through text-gray-400'}>
                          {task.title}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{task.columnTitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Task */}
          {selectedTaskId !== null && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <span className="text-sm flex-1">
                Selected: Task #{selectedTaskId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSelectedTaskId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedTaskId === null || createLink.isPending}
            >
              {createLink.isPending ? 'Creating...' : 'Create Link'}
            </Button>
          </div>

          {/* Error */}
          {createLink.isError && (
            <div className="text-sm text-red-500">
              {createLink.error.message}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// TaskLinkSection Component
// =============================================================================

export function TaskLinkSection({ taskId, projectId }: TaskLinkSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const utils = trpc.useUtils()

  // Fetch links
  const linksQuery = trpc.taskLink.list.useQuery({ taskId })

  // Delete link mutation
  const deleteLink = trpc.taskLink.delete.useMutation({
    onSuccess: () => {
      utils.taskLink.list.invalidate({ taskId })
      utils.taskLink.getBlocking.invalidate({ taskId })
    },
  })

  const handleNavigate = useCallback((taskId: number) => {
    // Navigate to task - could be updated to use router
    window.location.href = `/project/${projectId}/task/${taskId}`
  }, [projectId])

  const handleDelete = useCallback((linkId: number) => {
    deleteLink.mutate({ linkId })
  }, [deleteLink])

  const allLinks = linksQuery.data?.all ?? []

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Links
          {allLinks.length > 0 && (
            <span className="text-xs text-gray-400">({allLinks.length})</span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Link List */}
      {linksQuery.isLoading ? (
        <div className="text-sm text-gray-500 py-2">Loading links...</div>
      ) : allLinks.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">No links yet</div>
      ) : (
        <div className="space-y-0.5">
          {allLinks.map((link) => (
            <LinkItem
              key={`${link.id}-${link.direction}`}
              link={link as TaskLink}
              onNavigate={handleNavigate}
              onDelete={handleDelete}
              isDeleting={deleteLink.isPending}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <AddLinkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        taskId={taskId}
        onSuccess={() => {}}
      />
    </div>
  )
}

export default TaskLinkSection
