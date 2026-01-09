/*
 * WhatIfSimulator Component
 * Version: 1.0.0
 *
 * Preview what would happen if an ACL change is applied, BEFORE actually applying it.
 * Useful for understanding the impact of bulk operations.
 *
 * Features:
 * - Select action (grant, deny, revoke, template)
 * - Select resource and principals
 * - Shows preview of changes (before/after)
 * - Apply button to execute changes
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.5 - Advanced ACL UI
 * =============================================================================
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface WhatIfSimulatorProps {
  isOpen: boolean
  onClose: () => void
  /** Callback when changes are applied */
  onApplied?: () => void
}

type SimulationAction = 'grant' | 'deny' | 'revoke' | 'template'
type PermissionPreset = 'read_only' | 'contributor' | 'editor' | 'full_control'
type ResourceType = 'root' | 'system' | 'dashboard' | 'admin' | 'workspace' | 'project' | 'feature' | 'profile'

interface SelectedPrincipal {
  type: 'user' | 'group'
  id: number
  name: string
}

// =============================================================================
// Permission Helpers
// =============================================================================

const PERMISSION_PRESETS = {
  read_only: { value: 1, label: 'Read Only', bits: 'R----' },
  contributor: { value: 7, label: 'Contributor', bits: 'RWX--' },
  editor: { value: 15, label: 'Editor', bits: 'RWXD-' },
  full_control: { value: 31, label: 'Full Control', bits: 'RWXDP' },
} as const

function formatPermissionBits(permissions: number): string {
  const bits = []
  if (permissions & 1) bits.push('R')
  else bits.push('-')
  if (permissions & 2) bits.push('W')
  else bits.push('-')
  if (permissions & 4) bits.push('X')
  else bits.push('-')
  if (permissions & 8) bits.push('D')
  else bits.push('-')
  if (permissions & 16) bits.push('P')
  else bits.push('-')
  return bits.join('')
}

// Unused for now but kept for potential future use
// function getPresetName(permissions: number | null): string {
//   if (permissions === null) return 'None'
//   for (const [, preset] of Object.entries(PERMISSION_PRESETS)) {
//     if (preset.value === permissions) return preset.label
//   }
//   return `Custom (${permissions})`
// }

// =============================================================================
// Icons
// =============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function WhatIfSimulator({
  isOpen,
  onClose,
  onApplied,
}: WhatIfSimulatorProps) {
  // Form state
  const [action, setAction] = useState<SimulationAction>('grant')
  const [selectedPreset, setSelectedPreset] = useState<PermissionPreset>('contributor')
  const [resourceType, setResourceType] = useState<ResourceType>('workspace')
  const [resourceId, setResourceId] = useState<number | null>(null)
  const [selectedPrincipals, setSelectedPrincipals] = useState<SelectedPrincipal[]>([])

  // UI state
  const [showPrincipalSelector, setShowPrincipalSelector] = useState(false)
  const [principalTypeToAdd, setPrincipalTypeToAdd] = useState<'user' | 'group'>('user')

  const utils = trpc.useUtils()

  // Fetch workspaces
  const { data: workspacesData } = trpc.admin.listAllWorkspaces.useQuery(
    { limit: 100, isActive: true },
    { enabled: isOpen }
  )

  // Fetch users
  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { limit: 100, isActive: true },
    { enabled: isOpen && showPrincipalSelector && principalTypeToAdd === 'user' }
  )

  // Fetch groups
  const { data: groupsData } = trpc.group.list.useQuery(
    { limit: 100 },
    { enabled: isOpen && showPrincipalSelector && principalTypeToAdd === 'group' }
  )

  // Simulate query
  const canSimulate = selectedPrincipals.length > 0 && (resourceType === 'admin' || resourceType === 'system' || resourceId !== null)

  const { data: simulationResult, isLoading: isSimulating, refetch: runSimulation } = trpc.acl.simulateChange.useQuery(
    {
      action,
      resourceType,
      resourceId,
      principals: selectedPrincipals.map(p => ({ type: p.type, id: p.id })),
      permissions: action === 'template' ? undefined : PERMISSION_PRESETS[selectedPreset].value,
      templateName: action === 'template' ? selectedPreset : undefined,
    },
    { enabled: false }
  )

  // Execute mutation (grant/deny/revoke)
  const grantMutation = trpc.acl.grant.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate()
      onApplied?.()
    },
  })

  const denyMutation = trpc.acl.deny.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate()
      onApplied?.()
    },
  })

  const revokeMutation = trpc.acl.revoke.useMutation({
    onSuccess: () => {
      utils.acl.list.invalidate()
      onApplied?.()
    },
  })

  // Add principal
  const addPrincipal = (type: 'user' | 'group', id: number, name: string) => {
    if (!selectedPrincipals.find(p => p.type === type && p.id === id)) {
      setSelectedPrincipals([...selectedPrincipals, { type, id, name }])
    }
    setShowPrincipalSelector(false)
  }

  // Remove principal
  const removePrincipal = (type: 'user' | 'group', id: number) => {
    setSelectedPrincipals(selectedPrincipals.filter(p => !(p.type === type && p.id === id)))
  }

  // Apply changes
  const applyChanges = async () => {
    if (!canSimulate || selectedPrincipals.length === 0) return

    const firstPrincipal = selectedPrincipals[0]
    if (!firstPrincipal) return

    const payload = {
      resourceType,
      resourceId,
      principalType: firstPrincipal.type as 'user' | 'group',
      principalId: firstPrincipal.id,
      permissions: PERMISSION_PRESETS[selectedPreset].value,
      inheritToChildren: true,
    }

    // For now, only support single principal
    // TODO: Support bulk operations
    try {
      if (action === 'grant' || action === 'template') {
        await grantMutation.mutateAsync(payload)
      } else if (action === 'deny') {
        await denyMutation.mutateAsync(payload)
      } else if (action === 'revoke') {
        await revokeMutation.mutateAsync({
          resourceType,
          resourceId,
          principalType: firstPrincipal.type as 'user' | 'group',
          principalId: firstPrincipal.id,
        })
      }
      onClose()
    } catch {
      // Error handled by mutation
    }
  }

  if (!isOpen) return null

  const isApplying = grantMutation.isPending || denyMutation.isPending || revokeMutation.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <PlayIcon className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">What-If Simulator</h3>
              <p className="text-xs text-gray-500">Preview ACL changes before applying</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as SimulationAction)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="grant">Grant</option>
                <option value="deny">Deny</option>
                <option value="revoke">Revoke</option>
                <option value="template">Apply Template</option>
              </select>
            </div>

            {/* Permission Level */}
            {action !== 'revoke' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Permission Level</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value as PermissionPreset)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>{preset.label} ({preset.bits})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Resource Selection */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resource Type</label>
              <select
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value as ResourceType)
                  setResourceId(null)
                }}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="workspace">Workspace</option>
                <option value="project">Project</option>
                <option value="admin">Admin</option>
                <option value="system">System</option>
              </select>
            </div>

            {(resourceType === 'workspace' || resourceType === 'project') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {resourceType === 'workspace' ? 'Workspace' : 'Project'}
                </label>
                <select
                  value={resourceId ?? ''}
                  onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select...</option>
                  {workspacesData?.workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Principals */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Principals</label>
              <button
                onClick={() => setShowPrincipalSelector(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[32px] p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
              {selectedPrincipals.length === 0 ? (
                <span className="text-xs text-gray-400">Click "Add" to select users or groups</span>
              ) : (
                selectedPrincipals.map(principal => (
                  <span
                    key={`${principal.type}-${principal.id}`}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs',
                      principal.type === 'user'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                    )}
                  >
                    {principal.type === 'user' ? (
                      <UserIcon className="w-3 h-3" />
                    ) : (
                      <UsersIcon className="w-3 h-3" />
                    )}
                    {principal.name}
                    <button
                      onClick={() => removePrincipal(principal.type, principal.id)}
                      className="ml-1 hover:text-red-500"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Simulate Button */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => runSimulation()}
              disabled={!canSimulate || isSimulating}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-4 h-4" />
              {isSimulating ? 'Simulating...' : 'Simulate'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!simulationResult ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Configure the action above and click "Simulate" to preview changes
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-5 gap-2 text-center">
                <SummaryCard value={simulationResult.summary.new} label="New" color="green" />
                <SummaryCard value={simulationResult.summary.upgraded} label="Upgraded" color="blue" />
                <SummaryCard value={simulationResult.summary.unchanged} label="Unchanged" color="gray" />
                <SummaryCard value={simulationResult.summary.downgraded} label="Downgraded" color="yellow" />
                <SummaryCard value={simulationResult.summary.removed} label="Removed" color="red" />
              </div>

              {/* Warnings */}
              {simulationResult.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Warnings</h4>
                  <ul className="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                    {simulationResult.warnings.map((warning, idx) => (
                      <li key={idx}>- {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Changes Detail */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Changes Preview</h4>
                </div>
                {simulationResult.changes.map((change, idx) => (
                  <div key={idx} className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {change.principal.type === 'user' ? (
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      ) : (
                        <UsersIcon className="w-4 h-4 text-indigo-400" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-white">{change.principal.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Before */}
                      <span className={cn(
                        'font-mono text-xs px-1.5 py-0.5 rounded',
                        change.before
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                      )}>
                        {change.before ? formatPermissionBits(change.before.permissions) : '-----'}
                      </span>
                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                      {/* After */}
                      <span className={cn(
                        'font-mono text-xs px-1.5 py-0.5 rounded',
                        change.impact === 'new' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                        change.impact === 'upgraded' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                        change.impact === 'unchanged' && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                        change.impact === 'downgraded' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                        change.impact === 'removed' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                      )}>
                        {change.after ? formatPermissionBits(change.after.permissions) : '-----'}
                      </span>
                      {/* Impact Badge */}
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded uppercase font-medium',
                        change.impact === 'new' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                        change.impact === 'upgraded' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                        change.impact === 'unchanged' && 'bg-gray-100 dark:bg-gray-700 text-gray-500',
                        change.impact === 'downgraded' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                        change.impact === 'removed' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                      )}>
                        {change.impact}
                      </span>
                    </div>
                  </div>
                ))}
                {simulationResult.changes.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    No changes would be made
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={applyChanges}
            disabled={!simulationResult || simulationResult.changes.length === 0 || isApplying}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded disabled:cursor-not-allowed"
          >
            {isApplying ? 'Applying...' : 'Apply Changes'}
          </button>
        </div>

        {/* Principal Selector Modal */}
        {showPrincipalSelector && (
          <PrincipalSelector
            type={principalTypeToAdd}
            onTypeChange={setPrincipalTypeToAdd}
            users={usersData?.users ?? []}
            groups={groupsData?.groups ?? []}
            onSelect={addPrincipal}
            onClose={() => setShowPrincipalSelector(false)}
          />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Summary Card
// =============================================================================

function SummaryCard({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: 'green' | 'blue' | 'gray' | 'yellow' | 'red'
}) {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-600 dark:text-gray-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
      <div className={cn('text-xl font-bold', colorClasses[color])}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

// =============================================================================
// Principal Selector
// =============================================================================

function PrincipalSelector({
  type,
  onTypeChange,
  users,
  groups,
  onSelect,
  onClose,
}: {
  type: 'user' | 'group'
  onTypeChange: (type: 'user' | 'group') => void
  users: Array<{ id: number; name: string | null; email: string }>
  groups: Array<{ id: number; displayName: string }>
  onSelect: (type: 'user' | 'group', id: number, name: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Add Principal</h4>
        </div>
        <div className="px-4 py-3">
          {/* Type Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onTypeChange('user')}
              className={cn(
                'flex-1 py-1.5 text-sm rounded',
                type === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              )}
            >
              Users
            </button>
            <button
              onClick={() => onTypeChange('group')}
              className={cn(
                'flex-1 py-1.5 text-sm rounded',
                type === 'group'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              )}
            >
              Groups
            </button>
          </div>

          {/* List */}
          <div className="max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
            {type === 'user' ? (
              users.map(user => (
                <button
                  key={user.id}
                  onClick={() => onSelect('user', user.id, user.name || user.email)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                >
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white">{user.name || user.email}</span>
                </button>
              ))
            ) : (
              groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => onSelect('group', group.id, group.displayName)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                >
                  <UsersIcon className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-gray-900 dark:text-white">{group.displayName}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default WhatIfSimulator
