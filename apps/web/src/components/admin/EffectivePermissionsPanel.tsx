/*
 * EffectivePermissionsPanel Component
 * Version: 1.0.0
 *
 * Debug tool that explains WHY a user has specific permissions on a resource.
 * Shows detailed breakdown of direct entries, group memberships, and inheritance.
 *
 * Features:
 * - Select user and resource
 * - Shows effective permissions with breakdown
 * - Direct entries, group entries, inherited entries
 * - Calculation formula: allow & ~deny = effective
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.5 - Advanced ACL UI
 * =============================================================================
 */

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface EffectivePermissionsPanelProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-selected user ID */
  initialUserId?: number
  /** Pre-selected resource */
  initialResource?: {
    type: string
    id: number | null
  }
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

const PRESETS: Record<number, string> = {
  0: 'None',
  1: 'Read Only',
  7: 'Contributor',
  15: 'Editor',
  31: 'Full Control',
}

function getPresetName(permissions: number): string {
  return PRESETS[permissions] || `Custom (${permissions})`
}

function formatPermissionBits(permissions: number): string {
  const bits = []
  if (permissions & PERMISSION_BITS.READ) bits.push('R')
  if (permissions & PERMISSION_BITS.WRITE) bits.push('W')
  if (permissions & PERMISSION_BITS.EXECUTE) bits.push('X')
  if (permissions & PERMISSION_BITS.DELETE) bits.push('D')
  if (permissions & PERMISSION_BITS.PERMISSIONS) bits.push('P')
  return bits.length > 0 ? bits.join('') : '-----'
}

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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function BanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  )
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  )
}

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

// =============================================================================
// Types
// =============================================================================

type ResourceType = 'root' | 'system' | 'dashboard' | 'admin' | 'workspace' | 'project' | 'feature' | 'profile'

// =============================================================================
// Component
// =============================================================================

export function EffectivePermissionsPanel({
  isOpen,
  onClose,
  initialUserId,
  initialResource,
}: EffectivePermissionsPanelProps) {
  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(initialUserId ?? null)
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType>((initialResource?.type ?? 'workspace') as ResourceType)
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(initialResource?.id ?? null)

  // Update state when initial props change
  useEffect(() => {
    if (initialUserId !== undefined) setSelectedUserId(initialUserId)
    if (initialResource) {
      setSelectedResourceType(initialResource.type as ResourceType)
      setSelectedResourceId(initialResource.id)
    }
  }, [initialUserId, initialResource])

  // Fetch users for dropdown
  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { limit: 100, isActive: true },
    { enabled: isOpen }
  )

  // Fetch workspaces for dropdown
  const { data: workspacesData } = trpc.admin.listAllWorkspaces.useQuery(
    { limit: 100, isActive: true },
    { enabled: isOpen && selectedResourceType === 'workspace' }
  )

  // Fetch projects for dropdown (when workspace selected)
  const { data: projectsData } = trpc.project.list.useQuery(
    { workspaceId: selectedResourceId ?? 0 },
    { enabled: isOpen && selectedResourceType === 'project' && selectedResourceId !== null }
  )

  // Calculate effective permissions
  const { data: effectiveData, isLoading, error } = trpc.acl.calculateEffective.useQuery(
    {
      userId: selectedUserId!,
      resourceType: selectedResourceType,
      resourceId: selectedResourceId,
    },
    { enabled: isOpen && selectedUserId !== null }
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Effective Permissions Calculator</h3>
              <p className="text-xs text-gray-500">Debug why a user has specific permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Selection Inputs */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            {/* User Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">User</label>
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white"
              >
                <option value="">Select a user...</option>
                {usersData?.users.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email}</option>
                ))}
              </select>
            </div>

            {/* Resource Type Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resource Type</label>
              <select
                value={selectedResourceType}
                onChange={(e) => {
                  setSelectedResourceType(e.target.value as ResourceType)
                  setSelectedResourceId(null)
                }}
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white"
              >
                <option value="root">Root</option>
                <option value="system">System</option>
                <option value="dashboard">Dashboard</option>
                <option value="admin">Admin</option>
                <option value="workspace">Workspace</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          {/* Resource ID Selection (for workspace/project) */}
          {(selectedResourceType === 'workspace' || selectedResourceType === 'project') && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {selectedResourceType === 'workspace' ? 'Workspace' : 'Project'}
              </label>
              <select
                value={selectedResourceId ?? ''}
                onChange={(e) => setSelectedResourceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white"
              >
                <option value="">Select {selectedResourceType}...</option>
                {selectedResourceType === 'workspace' && workspacesData?.workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
                {selectedResourceType === 'project' && projectsData?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!selectedUserId ? (
            <div className="text-center py-8 text-gray-500">
              Select a user to calculate effective permissions
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-gray-500">Calculating...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">Error: {error.message}</div>
          ) : effectiveData ? (
            <div className="space-y-4">
              {/* User & Resource Info */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">User:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">{effectiveData.user.name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Resource:</span>
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    {effectiveData.resource.type}: {effectiveData.resource.name}
                  </span>
                </div>
              </div>

              {/* Effective Permissions Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Effective Permissions</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {formatPermissionBits(effectiveData.effectivePermissions)}
                      </span>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        = {getPresetName(effectiveData.effectivePermissions)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {Object.entries(PERMISSION_BITS).map(([name, bit]) => {
                      const hasPermission = (effectiveData.effectivePermissions & bit) !== 0
                      return (
                        <div
                          key={name}
                          className={cn(
                            'text-center py-1 px-2 rounded text-xs font-medium',
                            hasPermission
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                          )}
                        >
                          {name.charAt(0)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Breakdown Sections */}
              <div className="space-y-3">
                {/* Direct Entries */}
                {effectiveData.directEntries.length > 0 && (
                  <BreakdownSection
                    title="Direct Entries"
                    icon={<UserIcon className="w-4 h-4 text-green-500" />}
                    entries={effectiveData.directEntries.map(entry => ({
                      label: `User ${effectiveData.user.name}`,
                      permissions: entry.permissions,
                      presetName: entry.presetName,
                      isDeny: entry.deny,
                    }))}
                  />
                )}

                {/* Group Entries */}
                {effectiveData.groupEntries.length > 0 && (
                  <BreakdownSection
                    title="Via Group Membership"
                    icon={<UsersIcon className="w-4 h-4 text-indigo-500" />}
                    entries={effectiveData.groupEntries.map(entry => ({
                      label: `Group "${entry.groupName}"`,
                      permissions: entry.permissions,
                      presetName: entry.presetName,
                      isDeny: entry.deny,
                    }))}
                  />
                )}

                {/* Inherited Entries */}
                {effectiveData.inheritedEntries.length > 0 && (
                  <BreakdownSection
                    title="Inherited from Parent"
                    icon={<ArrowDownIcon className="w-4 h-4 text-blue-500" />}
                    entries={effectiveData.inheritedEntries.map(entry => ({
                      label: entry.groupName
                        ? `${entry.fromResourceType} "${entry.fromResourceName}" via Group "${entry.groupName}"`
                        : `${entry.fromResourceType} "${entry.fromResourceName}"`,
                      permissions: entry.permissions,
                      presetName: entry.presetName,
                      isDeny: entry.deny,
                    }))}
                  />
                )}

                {/* No entries at all */}
                {effectiveData.directEntries.length === 0 &&
                 effectiveData.groupEntries.length === 0 &&
                 effectiveData.inheritedEntries.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No ACL entries found for this user on this resource.
                  </div>
                )}
              </div>

              {/* Calculation Formula */}
              {effectiveData.calculation && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mt-4">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Calculation</span>
                  <div className="font-mono text-sm text-gray-900 dark:text-white mt-1">
                    {effectiveData.calculation.formula}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Allow bits: {effectiveData.calculation.allowedBits} |
                    Deny bits: {effectiveData.calculation.deniedBits} |
                    Final: {effectiveData.calculation.finalBits}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Breakdown Section
// =============================================================================

function BreakdownSection({
  title,
  icon,
  entries,
}: {
  title: string
  icon: React.ReactNode
  entries: Array<{
    label: string
    permissions: number
    presetName: string | null
    isDeny: boolean
  }>
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        {icon}
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{title}</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {entries.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              {entry.isDeny ? (
                <BanIcon className="w-4 h-4 text-red-500" />
              ) : (
                <CheckIcon className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">{entry.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'font-mono text-xs px-1.5 py-0.5 rounded',
                entry.isDeny
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              )}>
                {entry.isDeny ? 'DENY ' : ''}{formatPermissionBits(entry.permissions)}
              </span>
              {entry.presetName && (
                <span className="text-xs text-gray-500">({entry.presetName})</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EffectivePermissionsPanel
