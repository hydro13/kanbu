/*
 * BulkAclDialog Component
 * Version: 1.0.0
 *
 * Dialog component for bulk ACL operations:
 * - Grant: Bulk grant permissions to multiple principals
 * - Revoke: Bulk revoke permissions from multiple principals
 * - Copy: Copy ACL entries from source to target resources
 * - Template: Apply permission template to multiple principals
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

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { MultiPrincipalSelector, type SelectedPrincipal } from './MultiPrincipalSelector'

// =============================================================================
// Types
// =============================================================================

export type BulkAclMode = 'grant' | 'revoke' | 'copy' | 'template'

export type AclResourceType = 'root' | 'system' | 'dashboard' | 'workspace' | 'project' | 'feature' | 'admin' | 'profile'

export interface BulkAclDialogProps {
  open: boolean
  onClose: () => void
  mode: BulkAclMode
  resourceType: AclResourceType
  resourceId: number | null
  resourceName: string
}

// =============================================================================
// Constants
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

const TEMPLATES = {
  read_only: { label: 'Read Only', permissions: 1 },
  contributor: { label: 'Contributor', permissions: 7 },
  editor: { label: 'Editor', permissions: 15 },
  full_control: { label: 'Full Control', permissions: 31 },
} as const

// =============================================================================
// Component
// =============================================================================

export function BulkAclDialog({
  open,
  onClose,
  mode,
  resourceType,
  resourceId,
  resourceName,
}: BulkAclDialogProps) {
  // State for all modes
  const [selectedPrincipals, setSelectedPrincipals] = useState<SelectedPrincipal[]>([])
  const [permissions, setPermissions] = useState(1)
  const [inheritToChildren, setInheritToChildren] = useState(true)
  const [templateName, setTemplateName] = useState<'read_only' | 'contributor' | 'editor' | 'full_control'>('contributor')
  const [overwrite, setOverwrite] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState<Array<{ type: AclResourceType; id: number | null; name: string }>>([])
  const [result, setResult] = useState<{ success?: number; failed?: number; copiedCount?: number; skippedCount?: number } | null>(null)

  const utils = trpc.useUtils()

  // Fetch resources for copy mode
  const { data: resources } = trpc.acl.getResources.useQuery(undefined, {
    enabled: mode === 'copy',
  })

  // Fetch current ACL entries for revoke mode
  const { data: currentEntries } = trpc.acl.list.useQuery(
    { resourceType, resourceId },
    { enabled: mode === 'revoke' && open }
  )

  // Mutations
  const bulkGrantMutation = trpc.acl.bulkGrant.useMutation({
    onSuccess: (data) => {
      setResult(data)
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
    },
  })

  const bulkRevokeMutation = trpc.acl.bulkRevoke.useMutation({
    onSuccess: (data) => {
      setResult(data)
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
    },
  })

  const copyPermissionsMutation = trpc.acl.copyPermissions.useMutation({
    onSuccess: (data) => {
      setResult(data)
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
    },
  })

  const applyTemplateMutation = trpc.acl.applyTemplate.useMutation({
    onSuccess: (data) => {
      setResult(data)
      utils.acl.list.invalidate()
      utils.acl.getStats.invalidate()
    },
  })

  const isLoading =
    bulkGrantMutation.isPending ||
    bulkRevokeMutation.isPending ||
    copyPermissionsMutation.isPending ||
    applyTemplateMutation.isPending

  const handleSubmit = () => {
    switch (mode) {
      case 'grant':
        if (selectedPrincipals.length === 0) return
        bulkGrantMutation.mutate({
          resourceType,
          resourceId,
          principals: selectedPrincipals.map(p => ({ type: p.type, id: p.id })),
          permissions,
          inheritToChildren,
        })
        break

      case 'revoke':
        if (selectedPrincipals.length === 0) return
        bulkRevokeMutation.mutate({
          resourceType,
          resourceId,
          principals: selectedPrincipals.map(p => ({ type: p.type, id: p.id })),
        })
        break

      case 'copy':
        if (selectedTargets.length === 0) return
        copyPermissionsMutation.mutate({
          sourceResourceType: resourceType,
          sourceResourceId: resourceId,
          targetResources: selectedTargets.map(t => ({ type: t.type, id: t.id })),
          overwrite,
        })
        break

      case 'template':
        if (selectedPrincipals.length === 0) return
        applyTemplateMutation.mutate({
          templateName,
          resourceType,
          resourceId,
          principals: selectedPrincipals.map(p => ({ type: p.type, id: p.id })),
          inheritToChildren,
        })
        break
    }
  }

  const handleClose = () => {
    setSelectedPrincipals([])
    setPermissions(1)
    setInheritToChildren(true)
    setTemplateName('contributor')
    setOverwrite(false)
    setSelectedTargets([])
    setResult(null)
    onClose()
  }

  // Pre-fill principals from current entries for revoke mode
  const handlePreFillRevoke = () => {
    if (!currentEntries) return
    const principals: SelectedPrincipal[] = currentEntries.map(entry => ({
      type: entry.principalType as 'user' | 'group',
      id: entry.principalId,
      name: entry.principalName,
      displayName: entry.principalDisplayName,
    }))
    // Remove duplicates
    const unique = principals.filter((p, i, arr) =>
      arr.findIndex(x => x.type === p.type && x.id === p.id) === i
    )
    setSelectedPrincipals(unique)
  }

  // Toggle target selection
  const toggleTarget = (type: AclResourceType, id: number | null, name: string) => {
    const exists = selectedTargets.some(t => t.type === type && t.id === id)
    if (exists) {
      setSelectedTargets(selectedTargets.filter(t => !(t.type === type && t.id === id)))
    } else {
      setSelectedTargets([...selectedTargets, { type, id, name }])
    }
  }

  if (!open) return null

  // Mode-specific config
  const modeConfig = {
    grant: {
      title: 'Bulk Grant Permissions',
      description: `Grant permissions to multiple users/groups on ${resourceName}`,
      color: 'green',
      submitLabel: 'Grant Permissions',
    },
    revoke: {
      title: 'Bulk Revoke Permissions',
      description: `Revoke all permissions from selected users/groups on ${resourceName}`,
      color: 'red',
      submitLabel: 'Revoke Permissions',
    },
    copy: {
      title: 'Copy Permissions',
      description: `Copy ACL entries from ${resourceName} to other resources`,
      color: 'blue',
      submitLabel: 'Copy Permissions',
    },
    template: {
      title: 'Apply Permission Template',
      description: `Apply a preset permission level to multiple users/groups on ${resourceName}`,
      color: 'purple',
      submitLabel: 'Apply Template',
    },
  }

  const config = modeConfig[mode]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={cn(
          'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
          config.color === 'green' && 'bg-green-50 dark:bg-green-900/20',
          config.color === 'red' && 'bg-red-50 dark:bg-red-900/20',
          config.color === 'blue' && 'bg-blue-50 dark:bg-blue-900/20',
          config.color === 'purple' && 'bg-purple-50 dark:bg-purple-900/20'
        )}>
          <h2 className={cn(
            'text-lg font-semibold',
            config.color === 'green' && 'text-green-700 dark:text-green-400',
            config.color === 'red' && 'text-red-700 dark:text-red-400',
            config.color === 'blue' && 'text-blue-700 dark:text-blue-400',
            config.color === 'purple' && 'text-purple-700 dark:text-purple-400'
          )}>
            {config.title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{config.description}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Result message */}
          {result && (
            <div className={cn(
              'p-4 rounded-lg',
              (result.success ?? 0) > 0 || (result.copiedCount ?? 0) > 0
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            )}>
              <div className="font-medium text-gray-900 dark:text-white">Operation completed</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {result.success !== undefined && <span>Success: {result.success}</span>}
                {result.failed !== undefined && result.failed > 0 && <span className="ml-3 text-red-600">Failed: {result.failed}</span>}
                {result.copiedCount !== undefined && <span>Copied: {result.copiedCount}</span>}
                {result.skippedCount !== undefined && result.skippedCount > 0 && <span className="ml-3">Skipped: {result.skippedCount}</span>}
              </div>
            </div>
          )}

          {/* Grant mode */}
          {mode === 'grant' && (
            <>
              <MultiPrincipalSelector
                selected={selectedPrincipals}
                onChange={setSelectedPrincipals}
              />

              {/* Permission selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Permissions
                </label>
                <select
                  value={permissions}
                  onChange={e => setPermissions(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                >
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <option key={key} value={preset.value}>
                      {preset.label} ({preset.value}) - {preset.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom toggles */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(PERMISSION_BITS).map(([name, bit]) => (
                  <label key={name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(permissions & bit) !== 0}
                      onChange={e => {
                        if (e.target.checked) {
                          setPermissions(permissions | bit)
                        } else {
                          setPermissions(permissions & ~bit)
                        }
                      }}
                      className="rounded text-green-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{name}</span>
                  </label>
                ))}
              </div>

              {/* Inheritance */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inheritToChildren}
                  onChange={e => setInheritToChildren(e.target.checked)}
                  className="rounded text-green-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Inherit to child resources</span>
              </label>
            </>
          )}

          {/* Revoke mode */}
          {mode === 'revoke' && (
            <>
              {currentEntries && currentEntries.length > 0 && (
                <button
                  onClick={handlePreFillRevoke}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Select all current principals ({currentEntries.length} entries)
                </button>
              )}

              <MultiPrincipalSelector
                selected={selectedPrincipals}
                onChange={setSelectedPrincipals}
              />

              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> This will remove ALL ACL entries (both allow and deny) for the selected principals on this resource.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Copy mode */}
          {mode === 'copy' && (
            <>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Source:</strong> {resourceName}
                </div>
              </div>

              {/* Target selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select target resources
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                  {/* Workspaces */}
                  {resources?.workspaces.map(ws => (
                    <label
                      key={`ws-${ws.id}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800',
                        selectedTargets.some(t => t.type === 'workspace' && t.id === ws.id) && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTargets.some(t => t.type === 'workspace' && t.id === ws.id)}
                        onChange={() => toggleTarget('workspace', ws.id, ws.name)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{ws.name}</span>
                      <span className="text-xs text-gray-500">workspace</span>
                    </label>
                  ))}
                  {/* Projects */}
                  {resources?.projects.map(proj => (
                    <label
                      key={`proj-${proj.id}`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800',
                        selectedTargets.some(t => t.type === 'project' && t.id === proj.id) && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTargets.some(t => t.type === 'project' && t.id === proj.id)}
                        onChange={() => toggleTarget('project', proj.id, proj.name)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{proj.name}</span>
                      <span className="text-xs text-gray-500">project in {proj.workspaceName}</span>
                    </label>
                  ))}
                </div>
                {selectedTargets.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedTargets.length} target(s) selected
                  </div>
                )}
              </div>

              {/* Overwrite option */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={e => setOverwrite(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Overwrite existing entries on targets</span>
              </label>
              <p className="text-xs text-gray-500 ml-6">
                If checked, existing ACL entries on targets will be replaced. Otherwise, only new entries are added.
              </p>
            </>
          )}

          {/* Template mode */}
          {mode === 'template' && (
            <>
              {/* Template selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permission Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                    <button
                      key={key}
                      onClick={() => setTemplateName(key as typeof templateName)}
                      className={cn(
                        'px-4 py-3 rounded-lg border-2 text-left transition-colors',
                        templateName === key
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      )}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{tmpl.label}</div>
                      <div className="text-xs text-gray-500 mt-1">Permissions: {tmpl.permissions}</div>
                    </button>
                  ))}
                </div>
              </div>

              <MultiPrincipalSelector
                selected={selectedPrincipals}
                onChange={setSelectedPrincipals}
              />

              {/* Inheritance */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inheritToChildren}
                  onChange={e => setInheritToChildren(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Inherit to child resources</span>
              </label>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {(mode === 'grant' || mode === 'revoke' || mode === 'template') && selectedPrincipals.length > 0 && (
              <span>{selectedPrincipals.length} principal(s) selected</span>
            )}
            {mode === 'copy' && selectedTargets.length > 0 && (
              <span>{selectedTargets.length} target(s) selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-accent rounded-lg transition-colors"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            {!result && (
              <button
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  ((mode === 'grant' || mode === 'revoke' || mode === 'template') && selectedPrincipals.length === 0) ||
                  (mode === 'copy' && selectedTargets.length === 0)
                }
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50',
                  config.color === 'green' && 'bg-green-600 hover:bg-green-700 text-white',
                  config.color === 'red' && 'bg-red-600 hover:bg-red-700 text-white',
                  config.color === 'blue' && 'bg-blue-600 hover:bg-blue-700 text-white',
                  config.color === 'purple' && 'bg-purple-600 hover:bg-purple-700 text-white'
                )}
              >
                {isLoading ? 'Processing...' : config.submitLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulkAclDialog
