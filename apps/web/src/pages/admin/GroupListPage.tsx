/*
 * GroupListPage Component
 * Version: 1.1.0
 *
 * Admin page for managing AD-style groups.
 * Lists all groups with filtering and search.
 * Supports creating Security Groups for cross-workspace access.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-05
 * Modified: 2026-01-06 - Added Security Group creation
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { CanDoIfDomainAdmin } from '@/components/CanDo'

// =============================================================================
// Types
// =============================================================================

type GroupType = 'SYSTEM' | 'WORKSPACE' | 'WORKSPACE_ADMIN' | 'PROJECT' | 'PROJECT_ADMIN' | 'CUSTOM'

// =============================================================================
// Component
// =============================================================================

export function GroupListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<GroupType | ''>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDisplayName, setNewGroupDisplayName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [createError, setCreateError] = useState('')

  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.group.list.useQuery({
    search: search || undefined,
    type: typeFilter || undefined,
    limit: 100,
  })

  const createSecurityGroup = trpc.group.createSecurityGroup.useMutation({
    onSuccess: (group) => {
      utils.group.list.invalidate()
      setShowCreateDialog(false)
      setNewGroupName('')
      setNewGroupDisplayName('')
      setNewGroupDescription('')
      setCreateError('')
      navigate(`/admin/groups/${group.id}`)
    },
    onError: (error) => {
      setCreateError(error.message)
    },
  })

  const handleCreateSecurityGroup = () => {
    if (!newGroupName.trim() || !newGroupDisplayName.trim()) {
      setCreateError('Name and display name are required')
      return
    }
    createSecurityGroup.mutate({
      name: newGroupName.trim(),
      displayName: newGroupDisplayName.trim(),
      description: newGroupDescription.trim() || undefined,
    })
  }

  const getTypeColor = (type: GroupType) => {
    switch (type) {
      case 'SYSTEM':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'WORKSPACE':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'WORKSPACE_ADMIN':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'PROJECT':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'PROJECT_ADMIN':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
      case 'CUSTOM':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <AdminLayout
      title="Groups"
      description="Manage AD-style groups and permissions"
    >
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as GroupType | '')}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All types</option>
          <option value="SYSTEM">System</option>
          <option value="WORKSPACE">Workspace</option>
          <option value="WORKSPACE_ADMIN">Workspace Admin</option>
          <option value="PROJECT">Project</option>
          <option value="CUSTOM">Custom</option>
        </select>

        {/* Create Security Group button - only for Domain Admins */}
        <CanDoIfDomainAdmin>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Security Group
          </button>
        </CanDoIfDomainAdmin>
      </div>

      {/* Groups table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-gray-500">Loading groups...</div>
        ) : data?.groups && data.groups.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium">Members</th>
                <th className="px-4 py-3 font-medium">Assignments</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {group.displayName}
                        {group.isSecurityGroup && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                            SECURITY
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 font-mono">{group.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor(group.type as GroupType))}>
                      {group.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {group.isSecurityGroup ? (
                      <span className="text-indigo-500">Cross-Workspace</span>
                    ) : group.workspace ? (
                      <span>Workspace: {group.workspace.name}</span>
                    ) : group.project ? (
                      <span>Project: {group.project.name}</span>
                    ) : (
                      <span className="text-gray-400">Global</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900 dark:text-white font-medium">
                      {group.memberCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {group.isSecurityGroup ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        {group.assignmentCount ?? 0}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs',
                      group.source === 'LOCAL' && 'text-gray-500',
                      group.source === 'LDAP' && 'text-blue-500',
                    )}>
                      {group.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/groups/${group.id}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-12 text-center text-gray-500">
            {search || typeFilter ? 'No groups match your filters' : 'No groups found'}
          </div>
        )}
      </div>

      {/* Summary */}
      {data && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {data.groups.length} of {data.total} groups
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Group Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor('SYSTEM'))}>SYSTEM</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Domain Admins - Full platform access
            </p>
          </div>
          <div>
            <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor('WORKSPACE_ADMIN'))}>WORKSPACE ADMIN</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Can manage workspace settings and all projects
            </p>
          </div>
          <div>
            <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor('WORKSPACE'))}>WORKSPACE</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Member access to workspace
            </p>
          </div>
          <div>
            <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor('PROJECT'))}>PROJECT</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Member access to specific project
            </p>
          </div>
          <div>
            <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor('CUSTOM'))}>CUSTOM</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              User-defined groups
            </p>
          </div>
          <div>
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
              SECURITY
            </span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Cross-workspace groups with role assignments
            </p>
          </div>
        </div>
      </div>

      {/* Create Security Group Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Security Group
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Security Groups can be assigned to multiple workspaces and projects.
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Technical Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value.replace(/\s/g, '-').toLowerCase())}
                  placeholder="e.g., senior-developers"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier (no spaces)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newGroupDisplayName}
                  onChange={(e) => setNewGroupDisplayName(e.target.value)}
                  placeholder="e.g., Senior Developers"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What is this group for?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setNewGroupName('')
                  setNewGroupDisplayName('')
                  setNewGroupDescription('')
                  setCreateError('')
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSecurityGroup}
                disabled={createSecurityGroup.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {createSecurityGroup.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default GroupListPage
