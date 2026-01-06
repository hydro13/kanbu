/*
 * GroupEditPage Component
 * Version: 1.1.0
 *
 * Admin page for managing a single group's members and assignments.
 * Shows group details, member list, and role assignments (for security groups).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-05
 * Modified: 2026-01-06 - Added Assignments tab for Security Groups
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

type GroupType = 'SYSTEM' | 'WORKSPACE' | 'WORKSPACE_ADMIN' | 'PROJECT' | 'PROJECT_ADMIN' | 'CUSTOM'
type AccessType = 'ALLOW' | 'DENY'
type TabType = 'members' | 'permissions' | 'assignments'
type AssignmentRole = 'VIEWER' | 'MEMBER' | 'MANAGER' | 'ADMIN' | 'OWNER'

// =============================================================================
// Component
// =============================================================================

export function GroupEditPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const [userSearch, setUserSearch] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('members')

  // Assignment dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<AssignmentRole>('MEMBER')
  const [inheritToChildren, setInheritToChildren] = useState(true)

  const utils = trpc.useUtils()

  // Fetch group details
  const { data: group, isLoading, error } = trpc.group.get.useQuery(
    { groupId: parseInt(groupId || '0', 10) },
    { enabled: !!groupId }
  )

  // Fetch group members
  const { data: membersData, isLoading: isMembersLoading } = trpc.group.listMembers.useQuery(
    { groupId: parseInt(groupId || '0', 10), limit: 100 },
    { enabled: !!groupId }
  )

  // Fetch all users for adding to group
  const { data: usersData } = trpc.admin.listUsers.useQuery(
    { search: userSearch, isActive: true, limit: 20 },
    { enabled: userSearch.length >= 2 }
  )

  // Fetch all permissions
  const { data: permissionsData } = trpc.group.listPermissions.useQuery(
    {},
    { enabled: activeTab === 'permissions' }
  )

  // Fetch group permissions
  const { data: groupPermissionsData, isLoading: isPermissionsLoading } = trpc.group.getGroupPermissions.useQuery(
    { groupId: parseInt(groupId || '0', 10) },
    { enabled: activeTab === 'permissions' && !!groupId }
  )

  // Fetch group assignments (for security groups)
  const { data: assignmentsData, isLoading: isAssignmentsLoading } = trpc.roleAssignment.listForGroup.useQuery(
    { groupId: parseInt(groupId || '0', 10) },
    { enabled: activeTab === 'assignments' && !!groupId && !!group?.isSecurityGroup }
  )

  // Fetch all workspaces (for assignment dialog)
  const { data: workspacesData } = trpc.workspace.list.useQuery(
    undefined,
    { enabled: showAssignDialog }
  )

  // Mutations
  const addMember = trpc.group.addMember.useMutation({
    onSuccess: () => {
      setSuccessMessage('Member added successfully')
      setUserSearch('')
      utils.group.listMembers.invalidate({ groupId: parseInt(groupId || '0', 10) })
      utils.group.get.invalidate({ groupId: parseInt(groupId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  const removeMember = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      setSuccessMessage('Member removed')
      utils.group.listMembers.invalidate({ groupId: parseInt(groupId || '0', 10) })
      utils.group.get.invalidate({ groupId: parseInt(groupId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  const grantPermission = trpc.group.grantPermission.useMutation({
    onSuccess: () => {
      setSuccessMessage('Permission updated')
      utils.group.getGroupPermissions.invalidate({ groupId: parseInt(groupId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  const revokePermission = trpc.group.revokePermission.useMutation({
    onSuccess: () => {
      setSuccessMessage('Permission revoked')
      utils.group.getGroupPermissions.invalidate({ groupId: parseInt(groupId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  const assignToWorkspace = trpc.roleAssignment.assign.useMutation({
    onSuccess: () => {
      setSuccessMessage('Workspace assignment added')
      setShowAssignDialog(false)
      setSelectedWorkspaceId(null)
      setSelectedRole('MEMBER')
      setInheritToChildren(true)
      utils.roleAssignment.listForGroup.invalidate({ groupId: parseInt(groupId || '0', 10) })
      utils.group.get.invalidate({ groupId: parseInt(groupId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  const removeAssignment = trpc.roleAssignment.remove.useMutation({
    onSuccess: () => {
      setSuccessMessage('Assignment removed')
      utils.roleAssignment.listForGroup.invalidate({ groupId: parseInt(groupId || '0', 10) })
      utils.group.get.invalidate({ groupId: parseInt(groupId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  // Build permission map for quick lookup
  const permissionMap = useMemo(() => {
    const map = new Map<string, AccessType>()
    if (groupPermissionsData?.permissions) {
      for (const perm of groupPermissionsData.permissions) {
        map.set(perm.permission, perm.accessType as AccessType)
      }
    }
    return map
  }, [groupPermissionsData])

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
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleColor = (role: AssignmentRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'ADMIN':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'MEMBER':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'VIEWER':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="Loading..." description="Please wait">
        <div className="text-center py-12 text-gray-500">Loading group...</div>
      </AdminLayout>
    )
  }

  if (error || !group) {
    return (
      <AdminLayout title="Error" description="Failed to load group">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error?.message || 'Group not found'}
        </div>
        <Link to="/admin/groups" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to groups
        </Link>
      </AdminLayout>
    )
  }

  // Filter out users already in the group
  const availableUsers = usersData?.users.filter(
    (u) => !membersData?.members.some((m) => m.user.id === u.id)
  )

  return (
    <AdminLayout
      title={group.displayName}
      description={`Manage members of ${group.name}`}
    >
      {/* Messages */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* Group Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {group.displayName}
              </h2>
              <span className={cn('px-2 py-1 text-xs rounded-full', getTypeColor(group.type as GroupType))}>
                {group.type.replace('_', ' ')}
              </span>
              {group.isSecurityGroup && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                  SECURITY
                </span>
              )}
              {group.isSystem && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                  SYSTEM
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-mono mb-2">{group.name}</p>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-400">{group.description}</p>
            )}
          </div>
          <div className="text-right flex gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {group.memberCount}
              </div>
              <div className="text-sm text-gray-500">members</div>
            </div>
            {group.isSecurityGroup && (
              <div>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {group.assignmentCount ?? 0}
                </div>
                <div className="text-sm text-gray-500">assignments</div>
              </div>
            )}
          </div>
        </div>

        {/* Scope info */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Scope:</span>{' '}
              <span className="text-gray-900 dark:text-white">
                {group.isSecurityGroup ? (
                  <span className="text-indigo-600 dark:text-indigo-400">Cross-Workspace (via assignments)</span>
                ) : group.workspace ? `Workspace: ${group.workspace.name}` :
                 group.project ? `Project: ${group.project.name}` : 'Global'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Source:</span>{' '}
              <span className="text-gray-900 dark:text-white">{group.source}</span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>{' '}
              <span className="text-gray-900 dark:text-white">{formatDateTime(group.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            Members ({membersData?.total ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            Permissions
          </button>
          {group.isSecurityGroup && (
            <button
              onClick={() => setActiveTab('assignments')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'assignments'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              Assignments ({group.assignmentCount ?? 0})
            </button>
          )}
        </nav>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Add Member */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">Add Member</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {userSearch.length >= 2 && availableUsers && availableUsers.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        addMember.mutate({
                          groupId: parseInt(groupId || '0', 10),
                          userId: user.id,
                        })
                      }}
                      disabled={addMember.isPending}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          @{user.username}
                        </div>
                      </div>
                      <span className="text-blue-600 text-sm">Add</span>
                    </button>
                  ))}
                </div>
              )}

              {userSearch.length >= 2 && (!availableUsers || availableUsers.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No users found
                </div>
              )}

              {userSearch.length < 2 && userSearch.length > 0 && (
                <div className="text-sm text-gray-500">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Members ({membersData?.total ?? 0})
              </h3>
            </div>

            {isMembersLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">Loading members...</div>
            ) : membersData?.members && membersData.members.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {membersData.members.map((member) => (
                  <div key={member.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                        {member.user.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={member.user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          member.user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/users/${member.user.id}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600"
                          >
                            {member.user.name}
                          </Link>
                          {!member.user.isActive && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{member.user.username} · {member.user.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          Added {formatDateTime(member.addedAt)}
                          {member.addedBy && ` by ${member.addedBy.name}`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${member.user.name} from this group?`)) {
                          removeMember.mutate({
                            groupId: parseInt(groupId || '0', 10),
                            userId: member.user.id,
                          })
                        }
                      }}
                      disabled={removeMember.isPending}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center text-gray-500">
                No members in this group
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Permission Settings
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure Allow/Deny permissions for this group. Deny always overrides Allow.
            </p>
          </div>

          {isPermissionsLoading ? (
            <div className="px-4 py-12 text-center text-gray-500">Loading permissions...</div>
          ) : permissionsData?.categories ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(permissionsData.categories).map(([category, perms]) => (
                <div key={category} className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white capitalize mb-4">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {(perms as Array<{
                      id: number
                      name: string
                      displayName: string
                      description: string | null
                      parentId: number | null
                    }>).filter(p => p.parentId !== null).map((perm) => {
                      const currentAccess = permissionMap.get(perm.name)
                      const isAllowed = currentAccess === 'ALLOW'
                      const isDenied = currentAccess === 'DENY'

                      return (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-white">
                              {perm.displayName}
                            </div>
                            {perm.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {perm.description}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {/* Allow button */}
                            <button
                              onClick={() => {
                                if (isAllowed) {
                                  revokePermission.mutate({
                                    groupId: parseInt(groupId || '0', 10),
                                    permissionName: perm.name,
                                  })
                                } else {
                                  grantPermission.mutate({
                                    groupId: parseInt(groupId || '0', 10),
                                    permissionName: perm.name,
                                    accessType: 'ALLOW',
                                  })
                                }
                              }}
                              disabled={grantPermission.isPending || revokePermission.isPending}
                              className={cn(
                                'px-3 py-1 text-xs font-medium rounded transition-colors',
                                isAllowed
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-green-900/20'
                              )}
                            >
                              Allow
                            </button>
                            {/* Deny button */}
                            <button
                              onClick={() => {
                                if (isDenied) {
                                  revokePermission.mutate({
                                    groupId: parseInt(groupId || '0', 10),
                                    permissionName: perm.name,
                                  })
                                } else {
                                  grantPermission.mutate({
                                    groupId: parseInt(groupId || '0', 10),
                                    permissionName: perm.name,
                                    accessType: 'DENY',
                                  })
                                }
                              }}
                              disabled={grantPermission.isPending || revokePermission.isPending}
                              className={cn(
                                'px-3 py-1 text-xs font-medium rounded transition-colors',
                                isDenied
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-red-900/20'
                              )}
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-gray-500">
              No permissions available
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab (Security Groups only) */}
      {activeTab === 'assignments' && group.isSecurityGroup && (
        <div className="space-y-6">
          {/* Add Assignment Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAssignDialog(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Assign to Workspace
            </button>
          </div>

          {/* Assignments List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Role Assignments
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                This security group has access to these workspaces and projects with the specified roles.
              </p>
            </div>

            {isAssignmentsLoading ? (
              <div className="px-4 py-12 text-center text-gray-500">Loading assignments...</div>
            ) : assignmentsData?.assignments && assignmentsData.assignments.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {assignmentsData.assignments.map((assignment) => (
                  <div key={assignment.id} className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        {assignment.workspace ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {assignment.workspace ? (
                            <>
                              <span>{assignment.workspace.name}</span>
                              <span className="text-xs text-gray-400">Workspace</span>
                            </>
                          ) : assignment.project ? (
                            <>
                              <span>{assignment.project.name}</span>
                              <span className="text-xs text-gray-400">
                                Project in {assignment.project.workspace?.name}
                              </span>
                            </>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn('px-2 py-0.5 text-xs rounded-full', getRoleColor(assignment.role as AssignmentRole))}>
                            {assignment.role}
                          </span>
                          {assignment.inheritToChildren && assignment.workspace && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                              Inherits to projects
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Remove this assignment? Group members will lose access.')) {
                          removeAssignment.mutate({ assignmentId: assignment.id })
                        }
                      }}
                      disabled={removeAssignment.isPending}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center text-gray-500">
                <p className="mb-2">No assignments yet</p>
                <p className="text-sm">Assign this security group to workspaces to grant access to all members.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign to Workspace Dialog */}
      {showAssignDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Assign to Workspace
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Grant this security group access to a workspace with a specific role.
              </p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Workspace
                </label>
                <select
                  value={selectedWorkspaceId ?? ''}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a workspace...</option>
                  {workspacesData?.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AssignmentRole)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="VIEWER">Viewer - Can view only</option>
                  <option value="MEMBER">Member - Can view and edit</option>
                  <option value="MANAGER">Manager - Can manage team</option>
                  <option value="ADMIN">Admin - Full workspace access</option>
                  <option value="OWNER">Owner - Complete control</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inheritToChildren"
                  checked={inheritToChildren}
                  onChange={(e) => setInheritToChildren(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="inheritToChildren" className="text-sm text-gray-700 dark:text-gray-300">
                  Inherit role to all projects in this workspace
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignDialog(false)
                  setSelectedWorkspaceId(null)
                  setSelectedRole('MEMBER')
                  setInheritToChildren(true)
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedWorkspaceId) {
                    assignToWorkspace.mutate({
                      groupId: parseInt(groupId || '0', 10),
                      workspaceId: selectedWorkspaceId,
                      role: selectedRole,
                      inheritToChildren,
                    })
                  }
                }}
                disabled={!selectedWorkspaceId || assignToWorkspace.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {assignToWorkspace.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <Link
          to="/admin/groups"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
        >
          ← Back to Groups
        </Link>
      </div>
    </AdminLayout>
  )
}

export default GroupEditPage
