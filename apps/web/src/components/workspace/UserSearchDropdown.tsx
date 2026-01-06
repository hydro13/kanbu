/*
 * User Search Dropdown Component
 * Version: 1.0.0
 *
 * Autocomplete search component for finding and adding users to a workspace.
 * Features: Real-time search, role selection, and direct member addition.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 260 - WEB - Add Member Component
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 * =============================================================================
 */

import { useState, useRef, useEffect } from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { trpc } from '../../lib/trpc'
import { cn } from '../../lib/utils'

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

interface UserSearchDropdownProps {
  workspaceId: number
  onMemberAdded?: () => void
  className?: string
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

function PlusIcon({ className }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
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

// =============================================================================
// Component
// =============================================================================

export function UserSearchDropdown({
  workspaceId,
  onMemberAdded,
  className,
}: UserSearchDropdownProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('MEMBER')
  const [addingUserId, setAddingUserId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()

  // Search query - only searches when query has at least 1 character
  const searchQuery = trpc.workspace.searchAvailableUsers.useQuery(
    { workspaceId, query, limit: 10 },
    {
      enabled: query.length >= 1,
      staleTime: 30000, // 30 seconds
    }
  )

  // Add member mutation
  const addMemberMutation = trpc.workspace.addMember.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(data.message)
      setQuery('')
      setAddingUserId(null)
      utils.workspace.getMembers.invalidate({ workspaceId })
      utils.workspace.searchAvailableUsers.invalidate()
      onMemberAdded?.()
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setAddingUserId(null)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle adding a user
  const handleAddUser = (user: User) => {
    setAddingUserId(user.id)
    setErrorMessage(null)
    addMemberMutation.mutate({
      workspaceId,
      userId: user.id,
      role: selectedRole,
    })
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setIsOpen(true)
    setErrorMessage(null)
  }

  // Handle focus
  const handleFocus = () => {
    if (query.length >= 1) {
      setIsOpen(true)
    }
  }

  const users = searchQuery.data ?? []
  const isLoading = searchQuery.isLoading
  const showDropdown = isOpen && query.length >= 1

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Search Input with Role Selector */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search users by name or email..."
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            className="pl-10"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as WorkspaceRole)}
          className="w-32 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="VIEWER">Viewer</option>
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckIcon className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2 text-sm text-destructive">{errorMessage}</div>
      )}

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              No users found for "{query}"
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                >
                  <div className="flex items-center gap-3">
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
                    <div>
                      <p className="text-sm font-medium">
                        {user.name || user.username || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddUser(user)}
                    disabled={addingUserId === user.id}
                  >
                    {addingUserId === user.id ? (
                      <span className="text-muted-foreground">Adding...</span>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
