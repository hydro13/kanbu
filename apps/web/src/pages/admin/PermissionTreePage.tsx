/*
 * PermissionTreePage Component
 * Version: 2.1.0
 *
 * Interactive admin page for managing the AD-style permission system.
 * Compact DevTools-style layout for high data density.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import {
  getSocket,
  joinAdminRoom,
  leaveAdminRoom,
  type GroupEventPayload,
  type GroupMemberEventPayload,
  type RoleAssignmentEventPayload,
} from '@/lib/socket'

// =============================================================================
// Types
// =============================================================================

type ExpandedState = {
  domain: boolean
  domainAdmins: boolean
  securityGroups: boolean
  workspaces: Record<number, boolean>
  projects: Record<number, boolean>
}

// =============================================================================
// Compact Icons (12x12)
// =============================================================================

function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg className={cn('w-3 h-3', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expanded ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
    </svg>
  )
}

function Icon({ type, className }: { type: 'building' | 'folder' | 'users' | 'user' | 'shield' | 'globe' | 'plus' | 'x' | 'cog'; className?: string }) {
  const paths: Record<string, string> = {
    building: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    folder: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
    users: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    globe: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    plus: "M12 4v16m8-8H4",
    x: "M6 18L18 6M6 6l12 12",
    cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  }
  return (
    <svg className={cn('w-3 h-3', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={paths[type]} />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function PermissionTreePage() {
  const [expanded, setExpanded] = useState<ExpandedState>({
    domain: true,
    domainAdmins: false,
    securityGroups: true,
    workspaces: {},
    projects: {},
  })

  // Dialogs
  const [showAddDomainAdminDialog, setShowAddDomainAdminDialog] = useState(false)
  const [showAssignGroupDialog, setShowAssignGroupDialog] = useState<{ workspaceId: number; workspaceName: string } | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<'VIEWER' | 'MEMBER' | 'MANAGER' | 'ADMIN'>('MEMBER')
  const [inheritToChildren, setInheritToChildren] = useState(true)

  const utils = trpc.useUtils()

  // =============================================================================
  // WebSocket Real-time Updates
  // =============================================================================

  const handleGroupEvent = useCallback((_payload: GroupEventPayload) => {
    // Refresh all group-related data
    utils.group.list.invalidate()
    utils.group.listMembers.invalidate()
  }, [utils])

  const handleGroupMemberEvent = useCallback((_payload: GroupMemberEventPayload) => {
    // Refresh member lists and group counts
    utils.group.list.invalidate()
    utils.group.listMembers.invalidate()
  }, [utils])

  const handleRoleAssignmentEvent = useCallback((_payload: RoleAssignmentEventPayload) => {
    // Refresh role assignments
    utils.roleAssignment.listForWorkspace.invalidate()
    utils.roleAssignment.listForProject.invalidate()
  }, [utils])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Join admin room to receive permission tree updates
    const setup = async () => {
      if (socket.connected) {
        await joinAdminRoom()
      } else {
        socket.once('connect', () => {
          joinAdminRoom()
        })
      }
    }

    setup()

    // Listen for group events
    socket.on('group:created', handleGroupEvent)
    socket.on('group:updated', handleGroupEvent)
    socket.on('group:deleted', handleGroupEvent)
    socket.on('group:member:added', handleGroupMemberEvent)
    socket.on('group:member:removed', handleGroupMemberEvent)
    socket.on('roleAssignment:created', handleRoleAssignmentEvent)
    socket.on('roleAssignment:removed', handleRoleAssignmentEvent)

    return () => {
      // Cleanup
      socket.off('group:created', handleGroupEvent)
      socket.off('group:updated', handleGroupEvent)
      socket.off('group:deleted', handleGroupEvent)
      socket.off('group:member:added', handleGroupMemberEvent)
      socket.off('group:member:removed', handleGroupMemberEvent)
      socket.off('roleAssignment:created', handleRoleAssignmentEvent)
      socket.off('roleAssignment:removed', handleRoleAssignmentEvent)
      leaveAdminRoom()
    }
  }, [handleGroupEvent, handleGroupMemberEvent, handleRoleAssignmentEvent])

  // =============================================================================
  // Fetch all data
  const { data: workspacesData, isLoading: isLoadingWorkspaces } = trpc.admin.listAllWorkspaces.useQuery({
    limit: 100,
    isActive: true,
  })

  const { data: groupsData, isLoading: isLoadingGroups } = trpc.group.list.useQuery({
    limit: 100,
  })

  const { data: usersData } = trpc.admin.listUsers.useQuery({
    limit: 100,
    isActive: true,
  })

  const domainAdminsGroup = groupsData?.groups.find(g => g.type === 'SYSTEM' && (g.name === 'domain-admins' || g.name === 'Domain Admins'))

  const { data: domainAdminMembers } = trpc.group.listMembers.useQuery(
    { groupId: domainAdminsGroup?.id ?? 0 },
    { enabled: !!domainAdminsGroup?.id }
  )

  const securityGroups = groupsData?.groups.filter(g => g.isSecurityGroup) ?? []
  const workspaceGroups = groupsData?.groups.filter(g =>
    g.workspaceId !== null && (g.type === 'WORKSPACE' || g.type === 'WORKSPACE_ADMIN')
  ) ?? []

  // Mutations
  const addDomainAdmin = trpc.group.addMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate()
      utils.group.list.invalidate()
      setShowAddDomainAdminDialog(false)
      setSelectedUserId(null)
    },
  })

  const removeDomainAdmin = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate()
      utils.group.list.invalidate()
    },
  })

  const assignToWorkspace = trpc.roleAssignment.assign.useMutation({
    onSuccess: () => {
      utils.roleAssignment.listForWorkspace.invalidate()
      setShowAssignGroupDialog(null)
      setSelectedGroupId(null)
      setSelectedRole('MEMBER')
      setInheritToChildren(true)
    },
  })

  const toggleExpand = (key: keyof Omit<ExpandedState, 'workspaces' | 'projects'>) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleWorkspace = (id: number) => {
    setExpanded(prev => ({
      ...prev,
      workspaces: { ...prev.workspaces, [id]: !prev.workspaces[id] },
    }))
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'ADMIN': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'MANAGER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'MEMBER': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'VIEWER': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const isLoading = isLoadingWorkspaces || isLoadingGroups
  const nonAdminUsers = usersData?.users.filter(
    u => !domainAdminMembers?.members.some((m: { user: { id: number } }) => m.user.id === u.id)
  ) ?? []

  return (
    <AdminLayout
      title="Permission Tree"
      description="Manage the AD-style permission structure - add domain admins, assign security groups to workspaces"
    >
      {isLoading ? (
        <div className="text-center py-8 text-gray-500 text-xs">Loading...</div>
      ) : (
        <div className="space-y-3">
          {/* Compact Legend */}
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 dark:text-gray-400 px-1">
            <span className="flex items-center gap-1"><Icon type="globe" className="text-purple-500" /> Domain</span>
            <span className="flex items-center gap-1"><Icon type="building" className="text-blue-500" /> Workspace</span>
            <span className="flex items-center gap-1"><Icon type="folder" className="text-green-500" /> Project</span>
            <span className="flex items-center gap-1"><Icon type="shield" className="text-indigo-500" /> Security Group</span>
            <span className="flex items-center gap-1"><Icon type="user" className="text-gray-500" /> User</span>
          </div>

          {/* Tree Container */}
          <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-[11px] leading-tight">
            <div className="p-2">
              {/* Domain Level */}
              <div>
                <Row
                  onClick={() => toggleExpand('domain')}
                  expanded={expanded.domain}
                  icon={<Icon type="globe" className="text-purple-500" />}
                  label={<span className="font-semibold text-gray-900 dark:text-white">Kanbu Domain</span>}
                  meta="root of all permissions"
                />

                {expanded.domain && (
                  <div className="ml-3 pl-2 border-l border-gray-200 dark:border-gray-700">
                    {/* Domain Admins */}
                    <div className="flex items-center justify-between">
                      <Row
                        onClick={() => toggleExpand('domainAdmins')}
                        expanded={expanded.domainAdmins}
                        icon={<Icon type="shield" className="text-purple-500" />}
                        label={<span className="text-purple-600 dark:text-purple-400">Domain Admins</span>}
                        meta={`${domainAdminsGroup?.memberCount ?? 0} members`}
                        className="flex-1"
                      />
                      <button
                        onClick={() => setShowAddDomainAdminDialog(true)}
                        className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded text-purple-600"
                        title="Add Domain Admin"
                      >
                        <Icon type="plus" />
                      </button>
                    </div>

                    {expanded.domainAdmins && domainAdminMembers?.members && (
                      <div className="ml-3 pl-2 border-l border-purple-200 dark:border-purple-800">
                        {domainAdminMembers.members.length === 0 ? (
                          <div className="text-gray-400 italic py-0.5 pl-4">No domain admins yet</div>
                        ) : (
                          domainAdminMembers.members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between py-0.5 group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                              <div className="flex items-center gap-1 pl-4">
                                <Icon type="user" className="text-purple-400" />
                                <Link to={`/admin/users/${member.user.id}`} className="text-purple-600 dark:text-purple-400 hover:underline">
                                  {member.user.name || member.user.email}
                                </Link>
                                <span className="text-gray-400">{member.user.email}</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${member.user.name || member.user.email} from Domain Admins?`)) {
                                    removeDomainAdmin.mutate({ groupId: domainAdminsGroup!.id, userId: member.user.id })
                                  }
                                }}
                                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                              >
                                <Icon type="x" className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Security Groups */}
                    <div className="flex items-center justify-between">
                      <Row
                        onClick={() => toggleExpand('securityGroups')}
                        expanded={expanded.securityGroups}
                        icon={<Icon type="shield" className="text-indigo-500" />}
                        label={<span className="text-indigo-600 dark:text-indigo-400">Security Groups</span>}
                        meta={`${securityGroups.length}`}
                        className="flex-1"
                      />
                      <Link to="/admin/groups" className="p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-indigo-600" title="Manage">
                        <Icon type="cog" />
                      </Link>
                    </div>

                    {expanded.securityGroups && (
                      <SecurityGroupsList securityGroups={securityGroups} />
                    )}

                    {/* Workspaces */}
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider py-1 mt-1">
                      Workspaces ({workspacesData?.total ?? 0})
                    </div>
                    {workspacesData?.workspaces.map(workspace => (
                      <WorkspaceNode
                        key={workspace.id}
                        workspace={workspace}
                        workspaceGroups={workspaceGroups}
                        isExpanded={expanded.workspaces[workspace.id] ?? false}
                        onToggle={() => toggleWorkspace(workspace.id)}
                        onAssignGroup={() => setShowAssignGroupDialog({ workspaceId: workspace.id, workspaceName: workspace.name })}
                        getRoleBadgeColor={getRoleBadgeColor}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            <Stat value={workspacesData?.total ?? 0} label="Workspaces" />
            <Stat value={groupsData?.total ?? 0} label="Total Groups" />
            <Stat value={securityGroups.length} label="Security Groups" color="indigo" />
            <Stat value={domainAdminsGroup?.memberCount ?? 0} label="Domain Admins" color="purple" />
          </div>
        </div>
      )}

      {/* Add Domain Admin Dialog */}
      {showAddDomainAdminDialog && (
        <Dialog title="Add Domain Admin" subtitle="Domain Admins have full access to everything in Kanbu.">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a user...</option>
                {nonAdminUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email} ({user.email})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter
            onCancel={() => { setShowAddDomainAdminDialog(false); setSelectedUserId(null) }}
            onConfirm={() => {
              if (selectedUserId && domainAdminsGroup) {
                addDomainAdmin.mutate({ groupId: domainAdminsGroup.id, userId: selectedUserId })
              }
            }}
            confirmLabel={addDomainAdmin.isPending ? 'Adding...' : 'Add Domain Admin'}
            confirmDisabled={!selectedUserId || addDomainAdmin.isPending}
            confirmColor="purple"
          />
        </Dialog>
      )}

      {/* Assign Group Dialog */}
      {showAssignGroupDialog && (
        <Dialog title="Assign Security Group" subtitle={`Assign to ${showAssignGroupDialog.workspaceName}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Security Group</label>
              <select
                value={selectedGroupId ?? ''}
                onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a group...</option>
                {securityGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.displayName} ({group.memberCount} members)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'VIEWER' | 'MEMBER' | 'MANAGER' | 'ADMIN')}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="VIEWER">Viewer</option>
                <option value="MEMBER">Member</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={inheritToChildren}
                onChange={(e) => setInheritToChildren(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600"
              />
              Inherit to all projects
            </label>
          </div>
          <DialogFooter
            onCancel={() => { setShowAssignGroupDialog(null); setSelectedGroupId(null); setSelectedRole('MEMBER'); setInheritToChildren(true) }}
            onConfirm={() => {
              if (selectedGroupId && showAssignGroupDialog) {
                assignToWorkspace.mutate({
                  groupId: selectedGroupId,
                  workspaceId: showAssignGroupDialog.workspaceId,
                  role: selectedRole,
                  inheritToChildren,
                })
              }
            }}
            confirmLabel={assignToWorkspace.isPending ? 'Assigning...' : 'Assign'}
            confirmDisabled={!selectedGroupId || assignToWorkspace.isPending}
            confirmColor="indigo"
          />
        </Dialog>
      )}
    </AdminLayout>
  )
}

// =============================================================================
// Compact Sub-components
// =============================================================================

function Row({
  onClick,
  expanded,
  icon,
  label,
  meta,
  className,
}: {
  onClick?: () => void
  expanded?: boolean
  icon: React.ReactNode
  label: React.ReactNode
  meta?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn('flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 py-0.5 rounded text-left', className)}
    >
      {expanded !== undefined && <ChevronIcon expanded={expanded} className="text-gray-400" />}
      {icon}
      {label}
      {meta && <span className="text-gray-400 ml-1">({meta})</span>}
    </button>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color?: 'indigo' | 'purple' }) {
  const valueColor = color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400'
    : color === 'purple' ? 'text-purple-600 dark:text-purple-400'
    : 'text-gray-900 dark:text-white'
  return (
    <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 py-2 px-3">
      <div className={cn('text-lg font-bold', valueColor)}>{value}</div>
      <div className="text-gray-500">{label}</div>
    </div>
  )
}

function Dialog({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  )
}

function DialogFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmDisabled,
  confirmColor = 'indigo',
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  confirmDisabled?: boolean
  confirmColor?: 'indigo' | 'purple'
}) {
  const colorClass = confirmColor === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 -mx-4 -mb-3 mt-3">
      <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={cn('px-3 py-1.5 text-xs text-white rounded disabled:opacity-50', colorClass)}
      >
        {confirmLabel}
      </button>
    </div>
  )
}

// Security Groups List with expandable groups
function SecurityGroupsList({ securityGroups }: { securityGroups: Array<{ id: number; displayName: string; memberCount: number; assignmentCount?: number }> }) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  if (securityGroups.length === 0) {
    return (
      <div className="ml-3 pl-2 border-l border-indigo-200 dark:border-indigo-800">
        <div className="text-gray-400 italic py-0.5 pl-4">
          No security groups yet. <Link to="/admin/groups" className="text-indigo-500 hover:underline">Create one</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="ml-3 pl-2 border-l border-indigo-200 dark:border-indigo-800">
      {securityGroups.map(group => (
        <ExpandableSecurityGroup
          key={group.id}
          group={group}
          isExpanded={expandedGroups[group.id] ?? false}
          onToggle={() => toggleGroup(group.id)}
        />
      ))}
    </div>
  )
}

// Expandable security group with members and add/remove functionality
function ExpandableSecurityGroup({
  group,
  isExpanded,
  onToggle,
}: {
  group: { id: number; displayName: string; memberCount: number; assignmentCount?: number }
  isExpanded: boolean
  onToggle: () => void
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const utils = trpc.useUtils()

  const { data: membersData } = trpc.group.listMembers.useQuery(
    { groupId: group.id },
    { enabled: isExpanded }
  )

  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { limit: 100, isActive: true },
    { enabled: showAddDialog }
  )

  const addMember = trpc.group.addMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId: group.id })
      utils.group.list.invalidate()
      setShowAddDialog(false)
      setSelectedUserId(null)
    },
  })

  const removeMember = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId: group.id })
      utils.group.list.invalidate()
    },
  })

  // Filter out users already in this group
  const availableUsers = usersData?.users.filter(
    u => !membersData?.members?.some(m => m.user.id === u.id)
  ) ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 py-0.5 pl-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded flex-1 text-left"
        >
          <ChevronIcon expanded={isExpanded} className="text-gray-400" />
          <Icon type="shield" className="text-indigo-400" />
          <Link
            to={`/admin/groups/${group.id}`}
            onClick={e => e.stopPropagation()}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {group.displayName}
          </Link>
          <span className="text-gray-400">({group.memberCount} members, {group.assignmentCount ?? 0} assignments)</span>
        </button>
        <button
          onClick={() => setShowAddDialog(true)}
          className="p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-indigo-600"
          title="Add member"
        >
          <Icon type="plus" />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-5 pl-2 border-l border-indigo-200 dark:border-indigo-800">
          {!membersData?.members?.length ? (
            <div className="text-gray-400 italic py-0.5 pl-2">No members yet</div>
          ) : (
            membersData.members.map(member => (
              <div key={member.id} className="flex items-center justify-between py-0.5 pl-2 group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                <div className="flex items-center gap-1">
                  <Icon type="user" className="text-indigo-400" />
                  <Link
                    to={`/admin/users/${member.user.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {member.user.name || member.user.email}
                  </Link>
                  <span className="text-gray-400">{member.user.email}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${member.user.name || member.user.email} from ${group.displayName}?`)) {
                      removeMember.mutate({ groupId: group.id, userId: member.user.id })
                    }
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                >
                  <Icon type="x" className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddDialog && (
        <Dialog title={`Add member to ${group.displayName}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email} ({user.email})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter
            onCancel={() => { setShowAddDialog(false); setSelectedUserId(null) }}
            onConfirm={() => {
              if (selectedUserId) {
                addMember.mutate({ groupId: group.id, userId: selectedUserId })
              }
            }}
            confirmLabel={addMember.isPending ? 'Adding...' : 'Add member'}
            confirmDisabled={!selectedUserId || addMember.isPending}
            confirmColor="indigo"
          />
        </Dialog>
      )}
    </div>
  )
}

interface WorkspaceNodeProps {
  workspace: { id: number; name: string; projectCount: number; memberCount: number }
  workspaceGroups: Array<{ id: number; workspaceId: number | null; type: string; displayName: string; memberCount: number }>
  isExpanded: boolean
  onToggle: () => void
  onAssignGroup: () => void
  getRoleBadgeColor: (role: string) => string
}

function WorkspaceNode({ workspace, workspaceGroups, isExpanded, onToggle, onAssignGroup, getRoleBadgeColor }: WorkspaceNodeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({})

  const wsGroups = workspaceGroups.filter(g => g.workspaceId === workspace.id)
  const adminGroup = wsGroups.find(g => g.type === 'WORKSPACE_ADMIN')
  const memberGroup = wsGroups.find(g => g.type === 'WORKSPACE')

  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: workspace.id },
    { enabled: isExpanded }
  )

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-1 py-0.5 rounded flex-1 text-left"
        >
          <ChevronIcon expanded={isExpanded} className="text-gray-400" />
          <Icon type="building" className="text-blue-500" />
          <Link
            to={`/admin/workspaces/${workspace.id}`}
            onClick={e => e.stopPropagation()}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {workspace.name}
          </Link>
          <span className="text-gray-400">({workspace.projectCount} projects, {workspace.memberCount} members)</span>
        </button>
        <button onClick={onAssignGroup} className="p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded text-indigo-600" title="Assign Group">
          <Icon type="plus" />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-3 pl-2 border-l border-blue-200 dark:border-blue-800">
          {/* Auto Groups */}
          <div className="text-[10px] text-gray-400 uppercase tracking-wider py-0.5">Auto Groups</div>
          {adminGroup && (
            <ExpandableGroup
              group={adminGroup}
              isExpanded={expandedGroups[adminGroup.id] ?? false}
              onToggle={() => toggleGroup(adminGroup.id)}
              color="orange"
              label="admins"
            />
          )}
          {memberGroup && (
            <ExpandableGroup
              group={memberGroup}
              isExpanded={expandedGroups[memberGroup.id] ?? false}
              onToggle={() => toggleGroup(memberGroup.id)}
              color="blue"
              label="members"
            />
          )}

          {/* Role Assignments */}
          <RoleAssignments workspaceId={workspace.id} getRoleBadgeColor={getRoleBadgeColor} />

          {/* Projects */}
          {projects && projects.length > 0 && (
            <>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider py-0.5 mt-1">Projects</div>
              {projects.map(project => (
                <ExpandableProject
                  key={project.id}
                  project={project}
                  isExpanded={expandedProjects[project.id] ?? false}
                  onToggle={() => toggleProject(project.id)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Expandable group with members and add functionality
function ExpandableGroup({
  group,
  isExpanded,
  onToggle,
  color,
  label,
}: {
  group: { id: number; displayName: string; memberCount: number }
  isExpanded: boolean
  onToggle: () => void
  color: 'orange' | 'blue'
  label: string
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const utils = trpc.useUtils()

  const { data: membersData } = trpc.group.listMembers.useQuery(
    { groupId: group.id },
    { enabled: isExpanded }
  )

  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { limit: 100, isActive: true },
    { enabled: showAddDialog }
  )

  const addMember = trpc.group.addMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId: group.id })
      utils.group.list.invalidate()
      setShowAddDialog(false)
      setSelectedUserId(null)
    },
  })

  const removeMember = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId: group.id })
      utils.group.list.invalidate()
    },
  })

  const colorClasses = color === 'orange'
    ? { icon: 'text-orange-400', text: 'text-orange-600 dark:text-orange-400', btn: 'hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600' }
    : { icon: 'text-blue-400', text: 'text-blue-600 dark:text-blue-400', btn: 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600' }

  // Filter out users already in this group
  const availableUsers = usersData?.users.filter(
    u => !membersData?.members?.some(m => m.user.id === u.id)
  ) ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 py-0.5 pl-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded flex-1 text-left"
        >
          <ChevronIcon expanded={isExpanded} className="text-gray-400" />
          <Icon type="users" className={colorClasses.icon} />
          <Link
            to={`/admin/groups/${group.id}`}
            onClick={e => e.stopPropagation()}
            className={cn(colorClasses.text, 'hover:underline')}
          >
            {group.displayName}
          </Link>
          <span className="text-gray-400">({group.memberCount} {label})</span>
        </button>
        <button
          onClick={() => setShowAddDialog(true)}
          className={cn('p-0.5 rounded', colorClasses.btn)}
          title={`Add ${label.slice(0, -1)}`}
        >
          <Icon type="plus" />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-5 pl-2 border-l border-gray-200 dark:border-gray-700">
          {!membersData?.members?.length ? (
            <div className="text-gray-400 italic py-0.5 pl-2">No {label} yet</div>
          ) : (
            membersData.members.map(member => (
              <div key={member.id} className="flex items-center justify-between py-0.5 pl-2 group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                <div className="flex items-center gap-1">
                  <Icon type="user" className={colorClasses.icon} />
                  <Link
                    to={`/admin/users/${member.user.id}`}
                    className={cn(colorClasses.text, 'hover:underline')}
                  >
                    {member.user.name || member.user.email}
                  </Link>
                  <span className="text-gray-400">{member.user.email}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${member.user.name || member.user.email} from ${group.displayName}?`)) {
                      removeMember.mutate({ groupId: group.id, userId: member.user.id })
                    }
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                >
                  <Icon type="x" className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddDialog && (
        <Dialog title={`Add ${label.slice(0, -1)} to ${group.displayName}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email} ({user.email})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter
            onCancel={() => { setShowAddDialog(false); setSelectedUserId(null) }}
            onConfirm={() => {
              if (selectedUserId) {
                addMember.mutate({ groupId: group.id, userId: selectedUserId })
              }
            }}
            confirmLabel={addMember.isPending ? 'Adding...' : `Add ${label.slice(0, -1)}`}
            confirmDisabled={!selectedUserId || addMember.isPending}
            confirmColor={color === 'orange' ? 'purple' : 'indigo'}
          />
        </Dialog>
      )}
    </div>
  )
}

// Expandable project with groups
function ExpandableProject({
  project,
  isExpanded,
  onToggle,
}: {
  project: { id: number; name: string }
  isExpanded: boolean
  onToggle: () => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})

  // Fetch project groups when expanded
  const { data: groupsData } = trpc.group.list.useQuery(
    { projectId: project.id, limit: 50 },
    { enabled: isExpanded }
  )

  const projectGroups = groupsData?.groups ?? []
  const adminGroup = projectGroups.find(g => g.type === 'PROJECT_ADMIN')
  const memberGroup = projectGroups.find(g => g.type === 'PROJECT')

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 py-0.5 pl-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded w-full text-left"
      >
        <ChevronIcon expanded={isExpanded} className="text-gray-400" />
        <Icon type="folder" className="text-green-400" />
        <Link
          to={`/project/${project.id}/board`}
          onClick={e => e.stopPropagation()}
          className="text-green-600 dark:text-green-400 hover:underline"
        >
          {project.name}
        </Link>
      </button>

      {isExpanded && (
        <div className="ml-5 pl-2 border-l border-green-200 dark:border-green-800">
          {!adminGroup && !memberGroup ? (
            <div className="text-gray-400 italic py-0.5 pl-2">No project groups</div>
          ) : (
            <>
              {adminGroup && (
                <ExpandableProjectGroup
                  group={adminGroup}
                  isExpanded={expandedGroups[adminGroup.id] ?? false}
                  onToggle={() => toggleGroup(adminGroup.id)}
                  color="orange"
                  label="admins"
                />
              )}
              {memberGroup && (
                <ExpandableProjectGroup
                  group={memberGroup}
                  isExpanded={expandedGroups[memberGroup.id] ?? false}
                  onToggle={() => toggleGroup(memberGroup.id)}
                  color="green"
                  label="members"
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Expandable project group with members and add/remove functionality
function ExpandableProjectGroup({
  group,
  isExpanded,
  onToggle,
  color,
  label,
}: {
  group: { id: number; displayName: string; memberCount: number }
  isExpanded: boolean
  onToggle: () => void
  color: 'orange' | 'green'
  label: string
}) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const utils = trpc.useUtils()

  const { data: membersData } = trpc.group.listMembers.useQuery(
    { groupId: group.id },
    { enabled: isExpanded }
  )

  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { limit: 100, isActive: true },
    { enabled: showAddDialog }
  )

  const addMember = trpc.group.addMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId: group.id })
      utils.group.list.invalidate()
      setShowAddDialog(false)
      setSelectedUserId(null)
    },
  })

  const removeMember = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId: group.id })
      utils.group.list.invalidate()
    },
  })

  const colorClasses = color === 'orange'
    ? { icon: 'text-orange-400', text: 'text-orange-600 dark:text-orange-400', btn: 'hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600' }
    : { icon: 'text-green-400', text: 'text-green-600 dark:text-green-400', btn: 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600' }

  // Filter out users already in this group
  const availableUsers = usersData?.users.filter(
    u => !membersData?.members?.some(m => m.user.id === u.id)
  ) ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded flex-1 text-left"
        >
          <ChevronIcon expanded={isExpanded} className="text-gray-400" />
          <Icon type="users" className={colorClasses.icon} />
          <Link
            to={`/admin/groups/${group.id}`}
            onClick={e => e.stopPropagation()}
            className={cn(colorClasses.text, 'hover:underline')}
          >
            {group.displayName}
          </Link>
          <span className="text-gray-400">({group.memberCount} {label})</span>
        </button>
        <button
          onClick={() => setShowAddDialog(true)}
          className={cn('p-0.5 rounded', colorClasses.btn)}
          title={`Add ${label.slice(0, -1)}`}
        >
          <Icon type="plus" />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-5 pl-2 border-l border-gray-200 dark:border-gray-700">
          {!membersData?.members?.length ? (
            <div className="text-gray-400 italic py-0.5 pl-2">No {label} yet</div>
          ) : (
            membersData.members.map(member => (
              <div key={member.id} className="flex items-center justify-between py-0.5 pl-2 group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                <div className="flex items-center gap-1">
                  <Icon type="user" className={colorClasses.icon} />
                  <Link
                    to={`/admin/users/${member.user.id}`}
                    className={cn(colorClasses.text, 'hover:underline')}
                  >
                    {member.user.name || member.user.email}
                  </Link>
                  <span className="text-gray-400">{member.user.email}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${member.user.name || member.user.email} from ${group.displayName}?`)) {
                      removeMember.mutate({ groupId: group.id, userId: member.user.id })
                    }
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                >
                  <Icon type="x" className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddDialog && (
        <Dialog title={`Add ${label.slice(0, -1)} to ${group.displayName}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email} ({user.email})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter
            onCancel={() => { setShowAddDialog(false); setSelectedUserId(null) }}
            onConfirm={() => {
              if (selectedUserId) {
                addMember.mutate({ groupId: group.id, userId: selectedUserId })
              }
            }}
            confirmLabel={addMember.isPending ? 'Adding...' : `Add ${label.slice(0, -1)}`}
            confirmDisabled={!selectedUserId || addMember.isPending}
            confirmColor={color === 'orange' ? 'purple' : 'indigo'}
          />
        </Dialog>
      )}
    </div>
  )
}

function RoleAssignments({ workspaceId, getRoleBadgeColor }: { workspaceId: number; getRoleBadgeColor: (role: string) => string }) {
  const utils = trpc.useUtils()
  const { data: assignmentsData } = trpc.roleAssignment.listForWorkspace.useQuery({ workspaceId })
  const removeAssignment = trpc.roleAssignment.remove.useMutation({
    onSuccess: () => utils.roleAssignment.listForWorkspace.invalidate({ workspaceId }),
  })

  if (!assignmentsData?.assignments?.length) return null

  return (
    <>
      <div className="text-[10px] text-gray-400 uppercase tracking-wider py-0.5 mt-1">Security Group Assignments</div>
      {assignmentsData.assignments.map(a => (
        <div key={a.id} className="flex items-center justify-between py-0.5 pl-4 group hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
          <div className="flex items-center gap-1">
            <Icon type="shield" className="text-indigo-400" />
            <Link to={`/admin/groups/${a.group.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              {a.group.displayName}
            </Link>
            <span className={cn('text-[10px] px-1 py-0.5 rounded', getRoleBadgeColor(a.role))}>{a.role}</span>
            {a.inheritToChildren && <span className="text-gray-400">→ inherits</span>}
          </div>
          <button
            onClick={() => {
              if (confirm(`Remove ${a.group.displayName}?`)) removeAssignment.mutate({ assignmentId: a.id })
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
          >
            <Icon type="x" className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </>
  )
}

export default PermissionTreePage
