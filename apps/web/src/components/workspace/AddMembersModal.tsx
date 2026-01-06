/*
 * Add Members Modal Component
 * Version: 1.0.0
 *
 * Modal dialog for bulk adding existing users to a workspace.
 * Features: User search, multi-select, role assignment, and batch addition.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 260 - WEB - Add Member Component
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Types
// =============================================================================

export type WorkspaceRole = 'ADMIN' | 'MEMBER' | 'VIEWER'

interface User {
  id: number
  email: string
  username: string | null
  name: string | null
  avatarUrl: string | null
}

interface SelectedUser extends User {
  role: WorkspaceRole
}

interface AddMembersModalProps {
  workspaceId: number
  isOpen: boolean
  onClose: () => void
  onMembersAdded?: () => void
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}

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
  )
}

// =============================================================================
// Component
// =============================================================================

export function AddMembersModal({
  workspaceId,
  isOpen,
  onClose,
  onMembersAdded,
}: AddMembersModalProps) {
  const [query, setQuery] = useState('')
  const [defaultRole, setDefaultRole] = useState<WorkspaceRole>('MEMBER')
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [addedCount, setAddedCount] = useState(0)
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  const utils = trpc.useUtils()

  // Search query
  const searchQuery = trpc.workspace.searchAvailableUsers.useQuery(
    { workspaceId, query, limit: 20 },
    {
      enabled: query.length >= 1 && isOpen,
      staleTime: 30000,
    }
  )

  // Add member mutation
  const addMemberMutation = trpc.workspace.addMember.useMutation()

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelectedUsers([])
      setIsAdding(false)
      setAddedCount(0)
      setErrorMessages([])
    }
  }, [isOpen])

  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id)

    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
    } else {
      setSelectedUsers([...selectedUsers, { ...user, role: defaultRole }])
    }
  }

  // Update role for selected user
  const updateUserRole = (userId: number, role: WorkspaceRole) => {
    setSelectedUsers(
      selectedUsers.map((u) => (u.id === userId ? { ...u, role } : u))
    )
  }

  // Remove user from selection
  const removeUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId))
  }

  // Add all selected members
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return

    setIsAdding(true)
    setAddedCount(0)
    setErrorMessages([])

    const errors: string[] = []
    let successCount = 0

    for (const user of selectedUsers) {
      try {
        await addMemberMutation.mutateAsync({
          workspaceId,
          userId: user.id,
          role: user.role,
        })
        successCount++
        setAddedCount(successCount)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${user.name || user.email}: ${errorMessage}`)
      }
    }

    setIsAdding(false)
    setErrorMessages(errors)

    if (successCount > 0) {
      utils.workspace.getMembers.invalidate({ workspaceId })
      utils.workspace.searchAvailableUsers.invalidate()
      onMembersAdded?.()
    }

    if (errors.length === 0) {
      // All successful - close modal after short delay
      setTimeout(() => {
        onClose()
      }, 1000)
    }
  }

  const users = searchQuery.data ?? []
  const isLoading = searchQuery.isLoading

  // Filter out already selected users from search results
  const availableUsers = users.filter(
    (user) => !selectedUsers.some((su) => su.id === user.id)
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Add Members to Workspace
          </DialogTitle>
          <DialogDescription>
            Search for existing users and add them to this workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Users</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="space-y-1">
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value as WorkspaceRole)}
                  className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  title="Default role for new selections"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {query.length >= 1 && (
            <div className="border rounded-md">
              <div className="px-3 py-2 border-b bg-muted/50">
                <span className="text-sm font-medium">Search Results</span>
              </div>
              <div className="max-h-40 overflow-auto">
                {isLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    {users.length > 0
                      ? 'All matching users are already selected'
                      : `No users found for "${query}"`}
                  </div>
                ) : (
                  <ul>
                    {availableUsers.map((user) => (
                      <li
                        key={user.id}
                        onClick={() => toggleUserSelection(user)}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer"
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.name || user.username || 'Unnamed User'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Click to add
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="border rounded-md">
              <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
                <span className="text-sm font-medium">
                  Selected Users ({selectedUsers.length})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                  className="h-7 text-xs"
                >
                  Clear all
                </Button>
              </div>
              <ul className="max-h-40 overflow-auto divide-y">
                {selectedUsers.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.username || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUserRole(user.id, e.target.value as WorkspaceRole)
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => removeUser(user.id)}
                      className="p-1 hover:bg-accent rounded"
                      title="Remove from selection"
                    >
                      <XIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progress/Status */}
          {isAdding && (
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span>
                Adding members... ({addedCount}/{selectedUsers.length})
              </span>
            </div>
          )}

          {/* Success Message */}
          {!isAdding && addedCount > 0 && errorMessages.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckIcon className="h-4 w-4" />
              Successfully added {addedCount} member{addedCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Error Messages */}
          {errorMessages.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Some members could not be added:
              </p>
              <ul className="text-sm text-destructive space-y-1">
                {errorMessages.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isAdding}
          >
            {isAdding
              ? 'Adding...'
              : `Add ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
