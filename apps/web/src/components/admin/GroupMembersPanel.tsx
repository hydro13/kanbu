/*
 * GroupMembersPanel Component
 * Version: 1.0.0
 *
 * AD-style group membership management panel.
 * Shows group info, members list, and add/remove functionality.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-08
 * =============================================================================
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface GroupMembersPanelProps {
  groupId: number
  groupName: string
  groupPath?: string
  onGroupDeleted?: () => void
}

// =============================================================================
// Icons
// =============================================================================

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

// =============================================================================
// Add Member Dialog
// =============================================================================

interface AddMemberDialogProps {
  groupId: number
  groupName: string
  onClose: () => void
  onSuccess: () => void
}

function AddMemberDialog({ groupId, groupName, onClose, onSuccess }: AddMemberDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const utils = trpc.useUtils()

  // Search for users using acl.getPrincipals
  const { data: principals, isLoading: searchLoading } = trpc.acl.getPrincipals.useQuery({
    search: search || undefined,
  })

  // Add member mutation
  const addMemberMutation = trpc.group.addMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId })
      utils.group.get.invalidate({ groupId })
      onSuccess()
      onClose()
    },
  })

  const handleAdd = () => {
    if (selectedUserId) {
      addMemberMutation.mutate({ groupId, userId: selectedUserId })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
          <h2 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400">
            Add Member to {groupName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search and select a user to add to this group
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* User list */}
          <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {searchLoading ? (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            ) : principals?.users && principals.users.length > 0 ? (
              principals.users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                    selectedUserId === user.id && 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-indigo-500'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {user.displayName}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {user.name} {user.email && `- ${user.email}`}
                    </div>
                  </div>
                  {selectedUserId === user.id && (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                {search ? 'No users found' : 'Type to search for users'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-accent rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedUserId || addMemberMutation.isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
          </button>
        </div>

        {/* Error message */}
        {addMemberMutation.isError && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {addMemberMutation.error?.message || 'Failed to add member'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function GroupMembersPanel({ groupId, groupName, groupPath, onGroupDeleted }: GroupMembersPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const utils = trpc.useUtils()

  // Get group details
  const { data: group, isLoading: groupLoading } = trpc.group.get.useQuery(
    { groupId },
    { retry: false }
  )

  // Get members
  const { data: membersData, isLoading: membersLoading } = trpc.group.listMembers.useQuery(
    { groupId, limit: 100 },
    { retry: false }
  )

  // Remove member mutation
  const removeMemberMutation = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      utils.group.listMembers.invalidate({ groupId })
      utils.group.get.invalidate({ groupId })
    },
  })

  // Delete group mutation
  const deleteGroupMutation = trpc.group.delete.useMutation({
    onSuccess: () => {
      utils.acl.getPrincipals.invalidate()
      utils.group.list.invalidate()
      setShowDeleteConfirm(false)
      onGroupDeleted?.()
    },
  })

  const handleRemoveMember = (userId: number, userName: string) => {
    if (confirm(`Remove "${userName}" from ${groupName}?`)) {
      removeMemberMutation.mutate({ groupId, userId })
    }
  }

  const isLoading = groupLoading || membersLoading
  const canManage = group?.canManage ?? false
  // Can delete if user can manage AND group is not a system group
  const canDelete = canManage && group && !group.isSystem

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-muted/50 flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">
            {groupPath ?? groupName}
          </h2>
          {group && (
            <p className="text-xs text-gray-500 mt-0.5">
              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              {group.isSystem && ' - System Group'}
              {group.isSecurityGroup && ' - Security Group'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              title="Delete this group"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : !group ? (
          <div className="text-center py-12 text-gray-500">
            Group not found or you don't have permission to view it
          </div>
        ) : (
          <>
            {/* Group Info Card */}
            <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {group.displayName}
                  </h3>
                  <p className="text-sm text-gray-500 font-mono">{group.name}</p>
                  {group.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {group.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {/* Single meaningful badge instead of redundant ones */}
                    {group.isSecurityGroup && group.isSystem ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        System Security Group
                      </span>
                    ) : group.isSecurityGroup ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        Security Group
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {group.type}
                      </span>
                    )}
                    {group.workspace && (
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {group.workspace.name}
                      </span>
                    )}
                    {/* Protected badge for domain-admins */}
                    {group.name === 'domain-admins' && (
                      <span className="px-2 py-0.5 text-xs rounded bg-amber-200 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L3 7V12C3 16.97 6.84 21.5 12 23C17.16 21.5 21 16.97 21 12V7L12 2Z" />
                        </svg>
                        Protected
                      </span>
                    )}
                    {/* Auto-membership badge for users group */}
                    {group.name === 'users' && (
                      <span className="px-2 py-0.5 text-xs rounded bg-green-200 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Auto-membership
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Special info boxes for system groups */}
            {group.name === 'users' && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <strong>Auto-membership:</strong> Alle nieuwe gebruikers worden automatisch toegevoegd aan deze group.
                    Dit is de standaard group voor basis-rechten in het systeem.
                  </div>
                </div>
              </div>
            )}

            {group.name === 'domain-admins' && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L3 7V12C3 16.97 6.84 21.5 12 23C17.16 21.5 21 16.97 21 12V7L12 2Z" />
                  </svg>
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Protected Group:</strong> Deze system group kan niet worden verwijderd.
                    Leden hebben volledige beheerdersrechten over het hele systeem.
                  </div>
                </div>
              </div>
            )}

            {/* Members List */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Members ({membersData?.total ?? 0})
              </h4>

              {membersData?.members && membersData.members.length > 0 ? (
                <div className="space-y-2">
                  {membersData.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-card rounded-card border border-border"
                    >
                      <Link
                        to={`/admin/users/${member.user.id}`}
                        className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-400 transition-all">
                          {member.user.avatarUrl ? (
                            <img
                              src={member.user.avatarUrl}
                              alt={member.user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {member.user.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {member.user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {member.user.username}
                            {member.user.email && ` - ${member.user.email}`}
                          </div>
                        </div>
                      </Link>

                      <div className="flex items-center gap-2">
                        {member.addedBy && (
                          <span className="text-xs text-gray-400" title={`Added by ${member.addedBy.name}`}>
                            Added by {member.addedBy.name}
                          </span>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleRemoveMember(member.user.id, member.user.name)}
                            disabled={removeMemberMutation.isPending}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Remove from group"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-input">
                  <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No members in this group</p>
                  {canManage && (
                    <button
                      onClick={() => setShowAddDialog(true)}
                      className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      Add the first member
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Member Dialog */}
      {showAddDialog && (
        <AddMemberDialog
          groupId={groupId}
          groupName={groupName}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            // Success handled by dialog
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && group && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                Delete Security Group
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <strong>{group.displayName}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will also remove all ACL entries associated with this group.
                This action cannot be undone.
              </p>

              {deleteGroupMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {deleteGroupMutation.error?.message || 'Failed to delete group'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-accent rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteGroupMutation.mutate({ groupId })}
                disabled={deleteGroupMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleteGroupMutation.isPending ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupMembersPanel
