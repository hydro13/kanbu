/*
 * WorkspaceSelector Component
 * Version: 1.1.0
 *
 * Dropdown component for selecting and switching between workspaces.
 * Shows workspace logo and role badge.
 *
 * Task: 253 - Multi-Workspace / Organisatie Systeem
 */

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  setWorkspaces,
  selectWorkspace,
  setLoading,
  setError,
  selectCurrentWorkspace,
  selectWorkspaces,
  selectWorkspaceLoading,
} from '@/store/workspaceSlice'
import { trpc, getApiHost } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Icons
// =============================================================================

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

// =============================================================================
// Types
// =============================================================================

interface WorkspaceSelectorProps {
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceSelector({ className }: WorkspaceSelectorProps) {
  const dispatch = useAppDispatch()
  const currentWorkspace = useAppSelector(selectCurrentWorkspace)
  const workspaces = useAppSelector(selectWorkspaces)
  const isLoading = useAppSelector(selectWorkspaceLoading)

  // Fetch workspaces from API
  const { data, isLoading: isFetching, error } = trpc.workspace.list.useQuery()

  // Sync API data to Redux store
  useEffect(() => {
    if (isFetching) {
      dispatch(setLoading(true))
    } else if (error) {
      dispatch(setError(error.message))
    } else if (data) {
      dispatch(setWorkspaces(data))
    }
  }, [data, isFetching, error, dispatch])

  // Handle workspace selection
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const workspaceId = parseInt(e.target.value, 10)
    if (!isNaN(workspaceId)) {
      dispatch(selectWorkspace(workspaceId))
    }
  }

  // Loading state
  if (isLoading || isFetching) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  // No workspaces
  if (workspaces.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No workspaces
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Workspace Logo */}
      {currentWorkspace?.logoUrl ? (
        <img
          src={`${getApiHost()}${currentWorkspace.logoUrl}?t=${currentWorkspace.updatedAt ? new Date(currentWorkspace.updatedAt).getTime() : ''}`}
          alt=""
          className="h-8 w-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <BuildingIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Workspace Selector */}
      <div className="flex items-center gap-2">
        <select
          value={currentWorkspace?.id ?? ''}
          onChange={handleChange}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        {currentWorkspace && (
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            currentWorkspace.role === 'OWNER' && 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
            currentWorkspace.role === 'ADMIN' && 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
            currentWorkspace.role === 'MEMBER' && 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
            currentWorkspace.role === 'VIEWER' && 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          )}>
            {currentWorkspace.role.toLowerCase()}
          </span>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default WorkspaceSelector
