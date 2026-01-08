/*
 * AclPage Component
 * Version: 1.0.0
 *
 * Admin page for managing filesystem-style ACL permissions.
 * Allows viewing, creating, and modifying ACL entries.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { useState } from 'react'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

type ResourceType = 'workspace' | 'project' | 'admin' | 'profile'
type PrincipalType = 'user' | 'group'

interface AclFormData {
  resourceType: ResourceType
  resourceId: number | null
  principalType: PrincipalType
  principalId: number
  permissions: number
  inheritToChildren: boolean
}

// =============================================================================
// Permission Helpers
// =============================================================================

const PERMISSION_BITS = {
  READ: 1,
  WRITE: 2,
  EXECUTE: 4,
  DELETE: 8,
  PERMISSIONS: 16,
} as const

const PRESETS = {
  NONE: { value: 0, label: 'None', description: 'Geen rechten' },
  READ_ONLY: { value: 1, label: 'Read Only', description: 'Alleen lezen (R)' },
  CONTRIBUTOR: { value: 7, label: 'Contributor', description: 'Lezen, schrijven, uitvoeren (R+W+X)' },
  EDITOR: { value: 15, label: 'Editor', description: 'Alles behalve rechten beheren (R+W+X+D)' },
  FULL_CONTROL: { value: 31, label: 'Full Control', description: 'Volledige controle (R+W+X+D+P)' },
} as const

function permissionToArray(permissions: number): string[] {
  const result: string[] = []
  if (permissions & PERMISSION_BITS.READ) result.push('R')
  if (permissions & PERMISSION_BITS.WRITE) result.push('W')
  if (permissions & PERMISSION_BITS.EXECUTE) result.push('X')
  if (permissions & PERMISSION_BITS.DELETE) result.push('D')
  if (permissions & PERMISSION_BITS.PERMISSIONS) result.push('P')
  return result
}

// =============================================================================
// Component
// =============================================================================

export function AclPage() {
  const [selectedResource, setSelectedResource] = useState<{
    type: ResourceType
    id: number | null
    name: string
  } | null>(null)
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [showDenyDialog, setShowDenyDialog] = useState(false)
  const [formData, setFormData] = useState<AclFormData>({
    resourceType: 'workspace',
    resourceId: null,
    principalType: 'user',
    principalId: 0,
    permissions: 1,
    inheritToChildren: true,
  })
  const [searchPrincipal, setSearchPrincipal] = useState('')

  const utils = trpc.useUtils()

  // Queries
  const { data: resources } = trpc.acl.getResources.useQuery()
  const { data: stats } = trpc.acl.getStats.useQuery(undefined, {
    retry: false,
  })
  const { data: principals } = trpc.acl.getPrincipals.useQuery({
    search: searchPrincipal || undefined,
  })
  const { data: aclEntries, isLoading: entriesLoading } = trpc.acl.list.useQuery(
    {
      resourceType: selectedResource?.type ?? 'workspace',
      resourceId: selectedResource?.id ?? null,
    },
    { enabled: !!selectedResource }
  )

  // Mutations
  const grantMutation = trpc.acl.grant.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
      setShowGrantDialog(false)
      resetForm()
    },
  })

  const denyMutation = trpc.acl.deny.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
      setShowDenyDialog(false)
      resetForm()
    },
  })

  const deleteMutation = trpc.acl.delete.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
    },
  })

  const resetForm = () => {
    setFormData({
      resourceType: selectedResource?.type ?? 'workspace',
      resourceId: selectedResource?.id ?? null,
      principalType: 'user',
      principalId: 0,
      permissions: 1,
      inheritToChildren: true,
    })
    setSearchPrincipal('')
  }

  const handleGrant = () => {
    if (!formData.principalId) return
    grantMutation.mutate({
      resourceType: formData.resourceType,
      resourceId: formData.resourceId,
      principalType: formData.principalType,
      principalId: formData.principalId,
      permissions: formData.permissions,
      inheritToChildren: formData.inheritToChildren,
    })
  }

  const handleDeny = () => {
    if (!formData.principalId) return
    denyMutation.mutate({
      resourceType: formData.resourceType,
      resourceId: formData.resourceId,
      principalType: formData.principalType,
      principalId: formData.principalId,
      permissions: formData.permissions,
      inheritToChildren: formData.inheritToChildren,
    })
  }

  const openGrantDialog = () => {
    if (!selectedResource) return
    setFormData({
      ...formData,
      resourceType: selectedResource.type,
      resourceId: selectedResource.id,
    })
    setShowGrantDialog(true)
  }

  const openDenyDialog = () => {
    if (!selectedResource) return
    setFormData({
      ...formData,
      resourceType: selectedResource.type,
      resourceId: selectedResource.id,
    })
    setShowDenyDialog(true)
  }

  return (
    <AdminLayout
      title="Access Control Lists"
      description="Manage filesystem-style ACL permissions (RWXDP)"
    >
      {/* Stats Overview */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-sm text-gray-500">Total ACL Entries</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">{stats.allowCount}</div>
            <div className="text-sm text-gray-500">Allow Entries</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-red-600">{stats.denyCount}</div>
            <div className="text-sm text-gray-500">Deny Entries</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600">{stats.byType.workspace ?? 0}</div>
            <div className="text-sm text-gray-500">Workspace ACLs</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="font-medium text-gray-900 dark:text-white">Select Resource</h2>
          </div>
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {/* Workspaces */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Workspaces
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedResource({ type: 'workspace', id: null, name: 'All Workspaces (Root)' })}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedResource?.type === 'workspace' && selectedResource?.id === null
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                >
                  All Workspaces (Root)
                </button>
                {resources?.workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedResource({ type: 'workspace', id: ws.id, name: ws.name })}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors pl-6',
                      selectedResource?.type === 'workspace' && selectedResource?.id === ws.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Projects
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedResource({ type: 'project', id: null, name: 'All Projects (Root)' })}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedResource?.type === 'project' && selectedResource?.id === null
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                >
                  All Projects (Root)
                </button>
                {resources?.projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedResource({ type: 'project', id: proj.id, name: proj.name })}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors pl-6',
                      selectedResource?.type === 'project' && selectedResource?.id === proj.id
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span className="font-mono text-xs text-gray-400 mr-2">{proj.identifier}</span>
                    {proj.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Resources */}
            {resources?.resourceTypes.some(r => r.type === 'admin') && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Administration
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedResource({ type: 'admin', id: null, name: 'Administration' })}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      selectedResource?.type === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    Administration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACL Entries */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h2 className="font-medium text-gray-900 dark:text-white">
              {selectedResource ? `ACL for: ${selectedResource.name}` : 'Select a resource'}
            </h2>
            {selectedResource && (
              <div className="flex gap-2">
                <button
                  onClick={openGrantDialog}
                  className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  + Grant
                </button>
                <button
                  onClick={openDenyDialog}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  + Deny
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {!selectedResource ? (
              <div className="text-center py-12 text-gray-500">
                Select a resource to view its ACL entries
              </div>
            ) : entriesLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : aclEntries && aclEntries.length > 0 ? (
              <div className="space-y-2">
                {aclEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      entry.deny
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                        : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Principal icon */}
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        entry.principalType === 'user'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600'
                          : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600'
                      )}>
                        {entry.principalType === 'user' ? 'U' : 'G'}
                      </div>

                      {/* Principal info */}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {entry.principalDisplayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.principalType} • {entry.principalName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Permission badges */}
                      <div className="flex gap-1">
                        {permissionToArray(entry.permissions).map((perm) => (
                          <span
                            key={perm}
                            className={cn(
                              'px-1.5 py-0.5 text-xs font-mono rounded',
                              entry.deny
                                ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300'
                                : 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300'
                            )}
                          >
                            {perm}
                          </span>
                        ))}
                      </div>

                      {/* Preset name */}
                      {entry.presetName && (
                        <span className="text-xs text-gray-500">{entry.presetName}</span>
                      )}

                      {/* Inheritance indicator */}
                      {entry.inheritToChildren && (
                        <span className="text-xs text-blue-500" title="Inherits to children">
                          ↓
                        </span>
                      )}

                      {/* Deny/Allow badge */}
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded',
                        entry.deny
                          ? 'bg-red-600 text-white'
                          : 'bg-green-600 text-white'
                      )}>
                        {entry.deny ? 'DENY' : 'ALLOW'}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => deleteMutation.mutate({ id: entry.id })}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete ACL entry"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No ACL entries for this resource
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permission Legend */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Permission Legend (RWXDP)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 font-mono">R</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Read - View content</p>
          </div>
          <div>
            <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 font-mono">W</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Write - Modify content</p>
          </div>
          <div>
            <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 font-mono">X</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Execute - Create new items</p>
          </div>
          <div>
            <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 font-mono">D</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Delete - Remove items</p>
          </div>
          <div>
            <span className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 font-mono">P</span>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Permissions - Manage ACLs</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Presets</h4>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <span key={key}>
                <strong>{preset.label}</strong> = {preset.value} ({preset.description})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Grant Dialog */}
      {showGrantDialog && (
        <AclDialog
          title="Grant Permissions"
          type="grant"
          formData={formData}
          setFormData={setFormData}
          searchPrincipal={searchPrincipal}
          setSearchPrincipal={setSearchPrincipal}
          principals={principals}
          onClose={() => { setShowGrantDialog(false); resetForm() }}
          onSubmit={handleGrant}
          isLoading={grantMutation.isPending}
        />
      )}

      {/* Deny Dialog */}
      {showDenyDialog && (
        <AclDialog
          title="Deny Permissions"
          type="deny"
          formData={formData}
          setFormData={setFormData}
          searchPrincipal={searchPrincipal}
          setSearchPrincipal={setSearchPrincipal}
          principals={principals}
          onClose={() => { setShowDenyDialog(false); resetForm() }}
          onSubmit={handleDeny}
          isLoading={denyMutation.isPending}
        />
      )}
    </AdminLayout>
  )
}

// =============================================================================
// ACL Dialog Component
// =============================================================================

interface AclDialogProps {
  title: string
  type: 'grant' | 'deny'
  formData: AclFormData
  setFormData: (data: AclFormData) => void
  searchPrincipal: string
  setSearchPrincipal: (search: string) => void
  principals: { users: { id: number; name: string; displayName: string; email: string | null }[]; groups: { id: number; name: string; displayName: string }[] } | undefined
  onClose: () => void
  onSubmit: () => void
  isLoading: boolean
}

function AclDialog({
  title,
  type,
  formData,
  setFormData,
  searchPrincipal,
  setSearchPrincipal,
  principals,
  onClose,
  onSubmit,
  isLoading,
}: AclDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className={cn(
          'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
          type === 'deny' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
        )}>
          <h2 className={cn(
            'text-lg font-semibold',
            type === 'deny' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'
          )}>
            {title}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Principal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Principal Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.principalType === 'user'}
                  onChange={() => setFormData({ ...formData, principalType: 'user', principalId: 0 })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">User</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.principalType === 'group'}
                  onChange={() => setFormData({ ...formData, principalType: 'group', principalId: 0 })}
                  className="text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Group</span>
              </label>
            </div>
          </div>

          {/* Principal Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {formData.principalType === 'user' ? 'Select User' : 'Select Group'}
            </label>
            <input
              type="text"
              value={searchPrincipal}
              onChange={(e) => setSearchPrincipal(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {formData.principalType === 'user' ? (
                principals?.users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setFormData({ ...formData, principalId: user.id })}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                      formData.principalId === user.id && 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                    <div className="text-xs text-gray-500">{user.name} • {user.email}</div>
                  </button>
                ))
              ) : (
                principals?.groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setFormData({ ...formData, principalId: group.id })}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                      formData.principalId === group.id && 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{group.displayName}</div>
                    <div className="text-xs text-gray-500">{group.name}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Permissions
            </label>
            <select
              value={formData.permissions}
              onChange={(e) => setFormData({ ...formData, permissions: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(PRESETS).map(([key, preset]) => (
                <option key={key} value={preset.value}>
                  {preset.label} ({preset.value}) - {preset.description}
                </option>
              ))}
            </select>
          </div>

          {/* Custom permission toggles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Or set individual permissions:
            </label>
            <div className="flex flex-wrap gap-3">
              {Object.entries(PERMISSION_BITS).map(([name, bit]) => (
                <label key={name} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.permissions & bit) !== 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, permissions: formData.permissions | bit })
                      } else {
                        setFormData({ ...formData, permissions: formData.permissions & ~bit })
                      }
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Inherit to children */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.inheritToChildren}
                onChange={(e) => setFormData({ ...formData, inheritToChildren: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span className="text-gray-700 dark:text-gray-300">Inherit to child resources</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Workspace permissions will apply to projects within that workspace
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading || !formData.principalId}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50',
              type === 'deny'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            )}
          >
            {isLoading ? 'Saving...' : type === 'deny' ? 'Add Deny Entry' : 'Add Grant Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AclPage
