/*
 * MultiPrincipalSelector Component
 * Version: 1.0.0
 *
 * Component for selecting multiple users and/or groups for bulk ACL operations.
 * Supports search, tabs, checkboxes, and displays selected items as badges.
 *
 * Fase 9.4: Bulk Operations
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * =============================================================================
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface SelectedPrincipal {
  type: 'user' | 'group'
  id: number
  name: string
  displayName: string
}

export interface MultiPrincipalSelectorProps {
  selected: SelectedPrincipal[]
  onChange: (selected: SelectedPrincipal[]) => void
  excludeIds?: { users?: number[]; groups?: number[] }
  maxSelections?: number
  workspaceId?: number
}

// =============================================================================
// Component
// =============================================================================

export function MultiPrincipalSelector({
  selected,
  onChange,
  excludeIds,
  maxSelections = 100,
  workspaceId,
}: MultiPrincipalSelectorProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'group'>('user')
  const [search, setSearch] = useState('')

  // Fetch principals
  const { data: principals, isLoading } = trpc.acl.getPrincipals.useQuery({
    search: search || undefined,
    workspaceId,
  })

  // Filter out excluded IDs and already selected
  const filteredUsers = useMemo(() => {
    if (!principals?.users) return []
    const excludedUserIds = new Set([
      ...(excludeIds?.users ?? []),
      ...selected.filter(s => s.type === 'user').map(s => s.id),
    ])
    return principals.users.filter(u => !excludedUserIds.has(u.id))
  }, [principals?.users, excludeIds?.users, selected])

  const filteredGroups = useMemo(() => {
    if (!principals?.groups) return []
    const excludedGroupIds = new Set([
      ...(excludeIds?.groups ?? []),
      ...selected.filter(s => s.type === 'group').map(s => s.id),
    ])
    return principals.groups.filter(g => !excludedGroupIds.has(g.id))
  }, [principals?.groups, excludeIds?.groups, selected])

  // Selected counts by type
  const selectedUserCount = selected.filter(s => s.type === 'user').length
  const selectedGroupCount = selected.filter(s => s.type === 'group').length

  // Add principal
  const addPrincipal = (principal: SelectedPrincipal) => {
    if (selected.length >= maxSelections) return
    if (selected.some(s => s.type === principal.type && s.id === principal.id)) return
    onChange([...selected, principal])
  }

  // Remove principal
  const removePrincipal = (type: 'user' | 'group', id: number) => {
    onChange(selected.filter(s => !(s.type === type && s.id === id)))
  }

  // Select all visible
  const selectAllVisible = () => {
    const currentList = activeTab === 'user' ? filteredUsers : filteredGroups
    const remaining = maxSelections - selected.length
    const toAdd = currentList.slice(0, remaining).map(item => ({
      type: activeTab,
      id: item.id,
      name: item.name,
      displayName: item.displayName,
    }))
    onChange([...selected, ...toAdd])
  }

  // Clear all
  const clearAll = () => {
    onChange([])
  }

  // Clear by type
  const clearByType = (type: 'user' | 'group') => {
    onChange(selected.filter(s => s.type !== type))
  }

  return (
    <div className="space-y-3">
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected ({selected.length}/{maxSelections})
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.map(s => (
              <span
                key={`${s.type}-${s.id}`}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  s.type === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                )}
              >
                <span className="w-4 h-4 rounded-full bg-current opacity-20 flex items-center justify-center text-[10px]">
                  {s.type === 'user' ? 'U' : 'G'}
                </span>
                {s.displayName}
                <button
                  onClick={() => removePrincipal(s.type, s.id)}
                  className="ml-1 hover:text-red-600"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('user')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'user'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Users {selectedUserCount > 0 && `(${selectedUserCount})`}
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === 'group'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Groups {selectedGroupCount > 0 && `(${selectedGroupCount})`}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${activeTab === 'user' ? 'users' : 'groups'}...`}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={selectAllVisible}
          disabled={selected.length >= maxSelections}
          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          Select All Visible
        </button>
        {((activeTab === 'user' && selectedUserCount > 0) ||
          (activeTab === 'group' && selectedGroupCount > 0)) && (
          <button
            onClick={() => clearByType(activeTab)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Clear {activeTab === 'user' ? 'Users' : 'Groups'}
          </button>
        )}
      </div>

      {/* List */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
        ) : activeTab === 'user' ? (
          filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {search ? 'No users found' : 'All users already selected'}
            </div>
          ) : (
            filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => addPrincipal({
                  type: 'user',
                  id: user.id,
                  name: user.name,
                  displayName: user.displayName,
                })}
                disabled={selected.length >= maxSelections}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-medium">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {user.displayName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.name} {user.email && `• ${user.email}`}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ))
          )
        ) : (
          filteredGroups.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {search ? 'No groups found' : 'All groups already selected'}
            </div>
          ) : (
            filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => addPrincipal({
                  type: 'group',
                  id: group.id,
                  name: group.name,
                  displayName: group.displayName,
                })}
                disabled={selected.length >= maxSelections}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 text-xs font-medium">
                  G
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {group.displayName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {group.name} • {group.memberCount} members
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            ))
          )
        )}
      </div>
    </div>
  )
}

export default MultiPrincipalSelector
