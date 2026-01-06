/*
 * TaskDetailModal Component
 * Version: 1.0.0
 *
 * Modal for viewing and editing task details.
 * Contains tabbed content for Details, Subtasks, Comments.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:25 CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:10 CET
 * Change: Removed unused DialogTitle import
 *
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:45 CET
 * Change: Removed URL navigation that caused redirect to non-existent route
 *
 * Session: realtime-conflict-handling
 * Signed: 2026-01-04T00:00 CET
 * Change: Added ConflictWarningModal for optimistic locking
 *
 * Session: realtime-editing-presence
 * Signed: 2026-01-04T00:00 CET
 * Change: Added live editing presence for description field
 * ═══════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTaskDetail } from '@/hooks/useTaskDetail'
import { trpc } from '@/lib/trpc'
import { TaskContextProvider } from '@/contexts/TaskContext'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDescription } from './TaskDescription'
import { SubtaskList, type Subtask } from './SubtaskList'
import { SubtaskEditModal } from './SubtaskEditModal'
import { CommentSection } from './CommentSection'
import { TaskSidebar } from './TaskSidebar'
import { ConflictWarningModal } from './ConflictWarningModal'
import { useEditingPresence } from '@/hooks/useEditingPresence'
import { useSocket } from '@/hooks/useSocket'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'

// =============================================================================
// Types
// =============================================================================

export interface TaskDetailModalProps {
  taskId: number | null
  projectId: number
  isOpen: boolean
  onClose: () => void
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  )
}

// =============================================================================
// Error State
// =============================================================================

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-red-500 dark:text-red-400 text-lg font-medium mb-2">
          Error loading task
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-sm">{message}</div>
      </div>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function TaskDetailModal({
  taskId,
  projectId,
  isOpen,
  onClose,
}: TaskDetailModalProps) {
  const currentUser = useAppSelector(selectUser)

  const {
    task,
    isLoading,
    isError,
    error,
    subtasks,
    isLoadingSubtasks,
    comments,
    isLoadingComments,
    updateTask,
    isUpdating,
    closeTask,
    reopenTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    isCreatingSubtask,
    createComment,
    updateComment,
    deleteComment,
    isCreatingComment,
    hasConflict,
    clearConflict,
    refetch,
  } = useTaskDetail({
    taskId: taskId ?? 0,
    enabled: isOpen && taskId !== null,
  })

  // Join task room for real-time events (editing presence, typing, etc.)
  // This ensures we receive editing:start/stop events from other users
  useSocket({
    taskId: isOpen && taskId ? taskId : undefined,
  })

  // Editing presence for live collaboration
  const {
    getFieldEditor,
    startEditing,
    stopEditing,
    stopAllEditing,
  } = useEditingPresence({
    taskId: taskId ?? 0,
    currentUserId: currentUser?.id ?? 0,
  })

  // Handle conflict reload
  const handleConflictReload = useCallback(() => {
    clearConflict()
    refetch()
  }, [clearConflict, refetch])

  // Cleanup editing state when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopAllEditing()
    }
  }, [isOpen, stopAllEditing])

  // Description editing handlers
  const handleDescriptionEditStart = useCallback(() => {
    startEditing('description')
  }, [startEditing])

  const handleDescriptionEditStop = useCallback(() => {
    stopEditing('description')
  }, [stopEditing])

  // Fetch project members for subtask assignee selection
  const projectMembersQuery = trpc.project.getMembers.useQuery(
    { projectId },
    { enabled: isOpen && projectId > 0 }
  )

  // Subtask edit modal state
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null)
  const [isSubtaskEditModalOpen, setIsSubtaskEditModalOpen] = useState(false)

  const handleEditSubtask = useCallback((subtask: Subtask) => {
    setEditingSubtask(subtask)
    setIsSubtaskEditModalOpen(true)
  }, [])

  const handleCloseSubtaskEditModal = useCallback(() => {
    setIsSubtaskEditModalOpen(false)
    setEditingSubtask(null)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Handle title update
  const handleTitleUpdate = useCallback(
    async (title: string) => {
      if (!taskId || !title.trim()) return
      await updateTask({ taskId, title: title.trim() })
    },
    [taskId, updateTask]
  )

  // Handle description update
  const handleDescriptionUpdate = useCallback(
    async (description: string) => {
      if (!taskId) return
      await updateTask({ taskId, description })
    },
    [taskId, updateTask]
  )

  // Handle priority update
  const handlePriorityUpdate = useCallback(
    async (priority: number) => {
      if (!taskId) return
      await updateTask({ taskId, priority })
    },
    [taskId, updateTask]
  )

  // Handle task close/reopen
  const handleCloseTask = useCallback(async () => {
    if (!taskId) return
    await closeTask({ taskId })
  }, [taskId, closeTask])

  const handleReopenTask = useCallback(async () => {
    if (!taskId) return
    await reopenTask({ taskId })
  }, [taskId, reopenTask])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState message={error?.message ?? 'Unknown error'} />
        ) : task ? (
          <TaskContextProvider
            taskId={task.id}
            taskTitle={task.title}
            taskReference={task.reference ?? undefined}
            projectId={projectId}
          >
            {/* Header */}
            <DialogHeader className="flex-shrink-0">
              <TaskDetailHeader
                task={task}
                onTitleUpdate={handleTitleUpdate}
                onPriorityUpdate={handlePriorityUpdate}
                onClose={handleCloseTask}
                onReopen={handleReopenTask}
                isUpdating={isUpdating}
              />
            </DialogHeader>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex gap-6">
              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="subtasks">
                      Subtasks ({subtasks.length})
                    </TabsTrigger>
                    <TabsTrigger value="comments">
                      Comments ({comments.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-0">
                    <TaskDescription
                      description={task.description ?? ''}
                      onUpdate={handleDescriptionUpdate}
                      isUpdating={isUpdating}
                      editingUser={getFieldEditor('description')}
                      onEditStart={handleDescriptionEditStart}
                      onEditStop={handleDescriptionEditStop}
                    />
                  </TabsContent>

                  <TabsContent value="subtasks" className="mt-0">
                    <SubtaskList
                      taskId={taskId!}
                      subtasks={subtasks}
                      isLoading={isLoadingSubtasks}
                      onCreate={createSubtask}
                      onUpdate={updateSubtask}
                      onDelete={deleteSubtask}
                      isCreating={isCreatingSubtask}
                      onEditSubtask={handleEditSubtask}
                    />
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0">
                    <CommentSection
                      taskId={taskId!}
                      comments={comments}
                      isLoading={isLoadingComments}
                      onCreate={createComment}
                      onUpdate={updateComment}
                      onDelete={deleteComment}
                      isCreating={isCreatingComment}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sidebar */}
              <div className="w-64 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 pl-6 overflow-y-auto">
                <TaskSidebar
                  task={task}
                  projectId={projectId}
                  onUpdate={updateTask}
                  isUpdating={isUpdating}
                />
              </div>
            </div>
          </TaskContextProvider>
        ) : null}
      </DialogContent>

      {/* Subtask Edit Modal */}
      <SubtaskEditModal
        subtask={editingSubtask}
        isOpen={isSubtaskEditModalOpen}
        onClose={handleCloseSubtaskEditModal}
        onSave={updateSubtask}
        projectMembers={projectMembersQuery.data?.map((m) => ({
          id: m.id,
          username: m.username,
          name: m.name,
          avatarUrl: m.avatarUrl,
        })) ?? []}
      />

      {/* Conflict Warning Modal */}
      <ConflictWarningModal
        isOpen={hasConflict}
        onClose={clearConflict}
        onReload={handleConflictReload}
      />
    </Dialog>
  )
}

export default TaskDetailModal
