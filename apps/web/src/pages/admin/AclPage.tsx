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

import { useState, useEffect, useCallback } from 'react'
import { AdminLayout, BulkAclDialog, type BulkAclMode, EffectivePermissionsPanel, WhatIfSimulator, AclExportDialog, AclImportDialog } from '@/components/admin'
import { ResourceTree, type SelectedResource, type ResourceType, type TreeState } from '@/components/admin/ResourceTree'
import { GroupMembersPanel } from '@/components/admin/GroupMembersPanel'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { useAclRealtimeSync } from '@/hooks/useAclRealtimeSync'

// =============================================================================
// Session Storage Keys
// =============================================================================

const STORAGE_KEY = 'kanbu:acl-page-state'

interface AclPageSessionState {
  selectedResource: SelectedResource | null
  treeState: {
    expandedSections: string[]
    expandedWorkspaces: number[]
    expandedWorkspaceProjects: number[]
    expandedProjectFeatures: number[] // Fase 8B
  }
}

function loadSessionState(): AclPageSessionState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function saveSessionState(state: AclPageSessionState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

// =============================================================================
// Types
// =============================================================================

type PrincipalType = 'user' | 'group'

// ACL API accepts these resource types (Fase 4C: added root, system, dashboard; Fase 8B: added feature)
// 'group' is NOT an ACL resource - it's a principal
type AclResourceType = 'root' | 'system' | 'dashboard' | 'workspace' | 'project' | 'feature' | 'admin' | 'profile'

function isAclResourceType(type: ResourceType): type is AclResourceType {
  return type === 'root' || type === 'system' || type === 'dashboard' ||
         type === 'workspace' || type === 'project' || type === 'feature' || type === 'admin' || type === 'profile'
}

interface AclFormData {
  resourceType: AclResourceType
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
  // Get current user for real-time sync
  const currentUser = useAppSelector(selectUser)

  // Real-time sync for ACL updates
  useAclRealtimeSync({
    currentUserId: currentUser?.id ?? 0,
  })

  // Load initial state from sessionStorage
  const [initialState] = useState(() => loadSessionState())

  const [selectedResource, setSelectedResource] = useState<SelectedResource | null>(
    initialState?.selectedResource ?? null
  )
  const [treeState, setTreeState] = useState<TreeState>(() => ({
    expandedSections: new Set(initialState?.treeState.expandedSections ?? ['root', 'workspaces']),
    expandedWorkspaces: new Set(initialState?.treeState.expandedWorkspaces ?? []),
    expandedWorkspaceProjects: new Set(initialState?.treeState.expandedWorkspaceProjects ?? []),
    expandedProjectFeatures: new Set(initialState?.treeState.expandedProjectFeatures ?? []),
  }))
  const [showGrantDialog, setShowGrantDialog] = useState(false)
  const [showDenyDialog, setShowDenyDialog] = useState(false)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)
  const [bulkDialogMode, setBulkDialogMode] = useState<BulkAclMode | null>(null)
  // Fase 9.5: Advanced ACL UI dialogs
  const [showEffectivePanel, setShowEffectivePanel] = useState(false)
  const [showWhatIfSimulator, setShowWhatIfSimulator] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDisplayName, setNewGroupDisplayName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [createGroupError, setCreateGroupError] = useState('')
  const [formData, setFormData] = useState<AclFormData>({
    resourceType: 'workspace',
    resourceId: null,
    principalType: 'user',
    principalId: 0,
    permissions: 1,
    inheritToChildren: true,
  })
  const [searchPrincipal, setSearchPrincipal] = useState('')

  // Save state to sessionStorage when it changes
  useEffect(() => {
    saveSessionState({
      selectedResource,
      treeState: {
        expandedSections: Array.from(treeState.expandedSections),
        expandedWorkspaces: Array.from(treeState.expandedWorkspaces),
        expandedWorkspaceProjects: Array.from(treeState.expandedWorkspaceProjects),
        expandedProjectFeatures: Array.from(treeState.expandedProjectFeatures),
      },
    })
  }, [selectedResource, treeState])

  // Callback for tree state changes
  const handleTreeStateChange = useCallback((newState: TreeState) => {
    setTreeState(newState)
  }, [])

  const utils = trpc.useUtils()

  // Queries
  const { data: resources } = trpc.acl.getResources.useQuery()
  const { data: stats } = trpc.acl.getStats.useQuery(undefined, {
    retry: false,
  })
  const { data: principals } = trpc.acl.getPrincipals.useQuery({
    search: searchPrincipal || undefined,
  })
  // Only query ACL entries for valid resource types (not groups)
  const isValidAclResource = selectedResource && isAclResourceType(selectedResource.type)
  const { data: aclEntries, isLoading: entriesLoading } = trpc.acl.list.useQuery(
    {
      resourceType: (isValidAclResource ? selectedResource.type : 'workspace') as AclResourceType,
      resourceId: isValidAclResource ? selectedResource.id : null,
    },
    { enabled: !!isValidAclResource }
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

  const createGroupMutation = trpc.group.createSecurityGroup.useMutation({
    onSuccess: (group) => {
      // Invalidate queries to refresh the groups list
      utils.acl.getPrincipals.invalidate()
      utils.acl.getResources.invalidate()
      // Reset form and close dialog
      setShowCreateGroupDialog(false)
      setNewGroupName('')
      setNewGroupDisplayName('')
      setNewGroupDescription('')
      setCreateGroupError('')
      // Select the newly created group
      setSelectedResource({
        type: 'group',
        id: group.id,
        name: group.displayName,
        path: `Kanbu > Security Groups > ${group.displayName}`,
      })
      // Expand groups section
      setTreeState(prev => ({
        ...prev,
        expandedSections: new Set([...prev.expandedSections, 'groups']),
      }))
    },
    onError: (error) => {
      setCreateGroupError(error.message)
    },
  })

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupDisplayName.trim()) {
      setCreateGroupError('Name and display name are required')
      return
    }
    createGroupMutation.mutate({
      name: newGroupName.trim(),
      displayName: newGroupDisplayName.trim(),
      description: newGroupDescription.trim() || undefined,
    })
  }

  const openCreateGroupDialog = () => {
    // Select the Security Groups folder and enable create mode
    setSelectedResource({
      type: 'group',
      id: null,
      name: 'Create Security Group',
      path: 'Kanbu > Security Groups > New',
    })
    setShowCreateGroupDialog(true)
    setNewGroupName('')
    setNewGroupDisplayName('')
    setNewGroupDescription('')
    setCreateGroupError('')
    // Expand groups section
    setTreeState(prev => ({
      ...prev,
      expandedSections: new Set([...prev.expandedSections, 'groups']),
    }))
  }

  const cancelCreateGroup = () => {
    setShowCreateGroupDialog(false)
    setNewGroupName('')
    setNewGroupDisplayName('')
    setNewGroupDescription('')
    setCreateGroupError('')
    // Go back to Security Groups overview
    setSelectedResource({
      type: 'group',
      id: null,
      name: 'Security Groups',
      path: 'Kanbu > Security Groups',
    })
  }

  const resetForm = () => {
    const resourceType = selectedResource && isAclResourceType(selectedResource.type)
      ? selectedResource.type
      : 'workspace'
    setFormData({
      resourceType,
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
    if (!selectedResource || !isAclResourceType(selectedResource.type)) return
    setFormData({
      ...formData,
      resourceType: selectedResource.type,
      resourceId: selectedResource.id,
    })
    setShowGrantDialog(true)
  }

  const openDenyDialog = () => {
    if (!selectedResource || !isAclResourceType(selectedResource.type)) return
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
        <div className="bg-card rounded-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="font-medium text-gray-900 dark:text-white">Select Resource</h2>
          </div>
          <div className="p-2 max-h-[500px] overflow-y-auto">
            <ResourceTree
              workspaces={resources?.workspaces ?? []}
              projects={resources?.projects ?? []}
              groups={principals?.groups ?? []}
              features={resources?.features ?? []}
              isAdmin={resources?.resourceTypes.some(r => r.type === 'root') ?? false}
              selectedResource={selectedResource}
              onSelectResource={setSelectedResource}
              treeState={treeState}
              onTreeStateChange={handleTreeStateChange}
              onCreateGroup={openCreateGroupDialog}
            />
          </div>
        </div>

        {/* ACL Entries */}
        <div className="lg:col-span-2 bg-card rounded-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <h2 className="font-medium text-gray-900 dark:text-white">
              {selectedResource
                ? selectedResource.type === 'group' && selectedResource.id
                  ? `Members: ${selectedResource.name}`
                  : selectedResource.type === 'group'
                    ? selectedResource.name
                    : `ACL for: ${selectedResource.path ?? selectedResource.name}`
                : 'Select a resource'}
            </h2>
            {selectedResource && isAclResourceType(selectedResource.type) && (
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
                {/* Bulk Actions Dropdown */}
                <div className="relative group">
                  <button
                    className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    Bulk
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => setBulkDialogMode('grant')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Bulk Grant
                    </button>
                    <button
                      onClick={() => setBulkDialogMode('revoke')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Bulk Revoke
                    </button>
                    <button
                      onClick={() => setBulkDialogMode('copy')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Copy Permissions
                    </button>
                    <button
                      onClick={() => setBulkDialogMode('template')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Apply Template
                    </button>
                  </div>
                </div>
                {/* Tools Dropdown (Fase 9.5) */}
                <div className="relative group">
                  <button
                    className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1"
                  >
                    Tools
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => setShowEffectivePanel(true)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Permission Calculator
                    </button>
                    <button
                      onClick={() => setShowWhatIfSimulator(true)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      What-If Simulator
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => setShowExportDialog(true)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export ACL
                    </button>
                    <button
                      onClick={() => setShowImportDialog(true)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import ACL
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            {!selectedResource ? (
              <div className="text-center py-12 text-gray-500">
                Select a resource to view its ACL entries
              </div>
            ) : selectedResource.type === 'group' && selectedResource.id ? (
              <GroupMembersPanel
                groupId={selectedResource.id}
                groupName={selectedResource.name}
                groupPath={selectedResource.path}
                onGroupDeleted={() => {
                  // Navigate back to Security Groups overview after deletion
                  setSelectedResource({
                    type: 'group',
                    id: null,
                    name: 'Security Groups',
                    path: 'Kanbu > Security Groups',
                  })
                }}
              />
            ) : selectedResource.type === 'group' && !selectedResource.id ? (
              // Security Groups folder selected - show create form or description
              showCreateGroupDialog ? (
                // Create Security Group form
                <div className="py-6">
                  <div className="max-w-xl mx-auto">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Create Security Group
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Security Groups can be assigned ACL permissions on any resource.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {createGroupError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                          {createGroupError}
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
                        <p className="text-xs text-gray-500 mt-1">Unique identifier (no spaces, lowercase)</p>
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

                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 text-sm">
                          Next Steps
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          After creating the group, you can add members and then assign ACL permissions on workspaces or projects.
                        </p>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={cancelCreateGroup}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateGroup}
                          disabled={createGroupMutation.isPending || !newGroupName.trim() || !newGroupDisplayName.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                        >
                          {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Security Groups description
                <div className="py-8">
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Security Groups
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                          Security Groups zijn <strong>principals</strong> - de entiteiten die rechten kunnen krijgen op resources.
                          Ze werken zoals in Active Directory: je voegt users toe aan groups, en verleent dan rechten aan die groups.
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                        Hoe werkt het?
                      </h4>
                      <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-2 list-decimal list-inside">
                        <li>Selecteer een Security Group in de tree om de leden te beheren</li>
                        <li>Voeg users toe aan de group via "Add Member"</li>
                        <li>Ga naar een Workspace of Project en verleen rechten aan de group</li>
                        <li>Alle leden van de group krijgen automatisch die rechten</li>
                      </ol>
                    </div>

                    <button
                      onClick={openCreateGroupDialog}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Create Security Group
                    </button>
                  </div>
                </div>
              )
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

      {/* Bulk ACL Dialog */}
      {bulkDialogMode && selectedResource && isAclResourceType(selectedResource.type) && (
        <BulkAclDialog
          open={!!bulkDialogMode}
          onClose={() => setBulkDialogMode(null)}
          mode={bulkDialogMode}
          resourceType={selectedResource.type}
          resourceId={selectedResource.id}
          resourceName={selectedResource.path ?? selectedResource.name}
        />
      )}

      {/* Fase 9.5: Advanced ACL UI Dialogs */}
      <EffectivePermissionsPanel
        isOpen={showEffectivePanel}
        onClose={() => setShowEffectivePanel(false)}
      />

      <WhatIfSimulator
        isOpen={showWhatIfSimulator}
        onClose={() => setShowWhatIfSimulator(false)}
        onApplied={() => {
          // Refresh ACL list
        }}
      />

      <AclExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      <AclImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImported={() => {
          // Refresh ACL list
        }}
      />

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
