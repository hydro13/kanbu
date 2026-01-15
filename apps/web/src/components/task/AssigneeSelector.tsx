/*
 * AssigneeSelector Component
 * Version: 1.0.0
 *
 * Multi-select dropdown for assigning users to a task.
 * Fetches project members and allows adding/removing assignees.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T12:55 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { trpc, getMediaUrl } from '@/lib/trpc'
import { Check, X, Loader2, UserPlus } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface User {
  id: number
  username: string
  name: string | null
  avatarUrl: string | null
}

export interface AssigneeSelectorProps {
  projectId: number
  taskId: number
  assignees: User[]
  onAssigneesChange?: (assignees: User[]) => void
  disabled?: boolean
}

// =============================================================================
// UserAvatar Component
// =============================================================================

function UserAvatar({ user, size = 'sm' }: { user: User; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'

  const avatarSrc = getMediaUrl(user.avatarUrl)
  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={user.name ?? user.username}
        className={`${sizeClass} rounded-full`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-medium text-gray-700 dark:text-gray-300`}
    >
      {(user.name ?? user.username).charAt(0).toUpperCase()}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function AssigneeSelector({
  projectId,
  taskId,
  assignees,
  onAssigneesChange,
  disabled = false,
}: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const utils = trpc.useUtils()

  // Fetch project members
  const { data: members, isLoading: isLoadingMembers } = trpc.project.getMembers.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  )

  // Set assignees mutation
  const setAssigneesMutation = trpc.task.setAssignees.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId })
    },
  })

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const assigneeIds = new Set(assignees.map((a) => a.id))

  const handleToggleAssignee = (member: User) => {
    if (disabled) return

    let newAssigneeIds: number[]
    let newAssignees: User[]

    if (assigneeIds.has(member.id)) {
      // Remove
      newAssigneeIds = assignees.filter((a) => a.id !== member.id).map((a) => a.id)
      newAssignees = assignees.filter((a) => a.id !== member.id)
    } else {
      // Add
      newAssigneeIds = [...assignees.map((a) => a.id), member.id]
      newAssignees = [...assignees, member]
    }

    setAssigneesMutation.mutate(
      { taskId, assigneeIds: newAssigneeIds },
      {
        onSuccess: () => {
          onAssigneesChange?.(newAssignees)
        },
      }
    )
  }

  const handleRemoveAssignee = (userId: number) => {
    if (disabled) return

    const newAssigneeIds = assignees.filter((a) => a.id !== userId).map((a) => a.id)
    const newAssignees = assignees.filter((a) => a.id !== userId)

    setAssigneesMutation.mutate(
      { taskId, assigneeIds: newAssigneeIds },
      {
        onSuccess: () => {
          onAssigneesChange?.(newAssignees)
        },
      }
    )
  }

  const isMutating = setAssigneesMutation.isPending

  return (
    <div ref={containerRef} className="relative">
      {/* Current Assignees */}
      <div className="space-y-2">
        {assignees.length > 0 ? (
          assignees.map((user) => (
            <div key={user.id} className="flex items-center gap-2 group">
              <UserAvatar user={user} />
              <span className="text-sm text-gray-900 dark:text-white flex-1">
                {user.name ?? user.username}
              </span>
              {!disabled && (
                <button
                  onClick={() => handleRemoveAssignee(user.id)}
                  disabled={isMutating}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                  title="Remove assignee"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">No assignees</span>
        )}

        {/* Add Button */}
        {!disabled && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isMutating}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            {isMutating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            Add assignee
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="p-1">
              {members.map((member) => {
                const isAssigned = assigneeIds.has(member.id)
                return (
                  <button
                    key={member.id}
                    onClick={() =>
                      handleToggleAssignee({
                        id: member.id,
                        username: member.username,
                        name: member.name,
                        avatarUrl: member.avatarUrl,
                      })
                    }
                    disabled={isMutating}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                      isAssigned
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <UserAvatar
                      user={{
                        id: member.id,
                        username: member.username,
                        name: member.name,
                        avatarUrl: member.avatarUrl,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 dark:text-white truncate">
                        {member.name ?? member.username}
                      </div>
                      {member.name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{member.username}
                        </div>
                      )}
                    </div>
                    {isAssigned && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No project members found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AssigneeSelector
