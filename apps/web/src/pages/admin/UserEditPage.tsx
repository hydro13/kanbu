/*
 * UserEditPage Component
 * Version: 1.0.0
 *
 * Admin page for editing user details and managing account.
 * Includes tabs for profile, security, and sessions.
 *
 * Task: ADMIN-01 (Task 249)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: a99141c4-b96b-462e-9b59-2523b3ef47ce
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T20:34 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

type Tab = 'profile' | 'groups' | 'security' | 'sessions'

interface ProfileFormData {
  email: string
  username: string
  name: string
  isActive: boolean
  timezone: string
  language: string
}

interface PasswordFormData {
  newPassword: string
  confirmPassword: string
}

// =============================================================================
// Component
// =============================================================================

export function UserEditPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [profileData, setProfileData] = useState<ProfileFormData | null>(null)
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Fetch user data
  const { data: user, isLoading, error } = trpc.admin.getUser.useQuery(
    { userId: parseInt(userId || '0', 10) },
    { enabled: !!userId }
  )

  // Initialize profile form when user data is loaded
  useEffect(() => {
    if (user && !profileData) {
      setProfileData({
        email: user.email,
        username: user.username,
        name: user.name,
        isActive: user.isActive,
        timezone: user.timezone,
        language: user.language,
      })
    }
  }, [user, profileData])

  // Fetch user logins
  const { data: loginsData } = trpc.admin.getUserLogins.useQuery(
    { userId: parseInt(userId || '0', 10), limit: 10 },
    { enabled: !!userId && activeTab === 'sessions' }
  )

  // Fetch user groups
  const { data: userGroups, isLoading: isGroupsLoading } = trpc.group.myGroups.useQuery(
    { userId: parseInt(userId || '0', 10) },
    { enabled: !!userId && activeTab === 'groups' }
  )

  // Fetch all groups for adding user to groups
  const { data: allGroupsData } = trpc.group.list.useQuery(
    { limit: 100 },
    { enabled: !!userId && activeTab === 'groups' }
  )

  // Mutations
  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      setSuccessMessage('User updated successfully')
      utils.admin.getUser.invalidate({ userId: parseInt(userId || '0', 10) })
      utils.admin.listUsers.invalidate()
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setProfileError(error.message)
    },
  })

  const resetPassword = trpc.admin.resetPassword.useMutation({
    onSuccess: () => {
      setSuccessMessage('Password reset successfully')
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setPasswordError(error.message)
    },
  })

  const unlockUser = trpc.admin.unlockUser.useMutation({
    onSuccess: () => {
      setSuccessMessage('User unlocked successfully')
      utils.admin.getUser.invalidate({ userId: parseInt(userId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
  })

  const disable2FA = trpc.admin.disable2FA.useMutation({
    onSuccess: () => {
      setSuccessMessage('2FA disabled successfully')
      utils.admin.getUser.invalidate({ userId: parseInt(userId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
  })

  const revokeSessions = trpc.admin.revokeSessions.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(`Revoked ${data.count} session(s)`)
      utils.admin.getUser.invalidate({ userId: parseInt(userId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
  })

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      navigate('/admin/users')
    },
  })

  const reactivateUser = trpc.admin.reactivateUser.useMutation({
    onSuccess: () => {
      setSuccessMessage('User reactivated successfully')
      utils.admin.getUser.invalidate({ userId: parseInt(userId || '0', 10) })
      utils.admin.listUsers.invalidate()
      setTimeout(() => setSuccessMessage(null), 3000)
    },
  })

  // Group mutations
  const addToGroup = trpc.group.addMember.useMutation({
    onSuccess: () => {
      setSuccessMessage('User added to group')
      utils.group.myGroups.invalidate({ userId: parseInt(userId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setProfileError(error.message)
    },
  })

  const removeFromGroup = trpc.group.removeMember.useMutation({
    onSuccess: () => {
      setSuccessMessage('User removed from group')
      utils.group.myGroups.invalidate({ userId: parseInt(userId || '0', 10) })
      setTimeout(() => setSuccessMessage(null), 3000)
    },
    onError: (error) => {
      setProfileError(error.message)
    },
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)

    if (!profileData) return

    updateUser.mutate({
      userId: parseInt(userId || '0', 10),
      email: profileData.email,
      username: profileData.username,
      name: profileData.name,
      isActive: profileData.isActive,
      timezone: profileData.timezone,
      language: profileData.language,
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    resetPassword.mutate({
      userId: parseInt(userId || '0', 10),
      newPassword: passwordData.newPassword,
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to deactivate this user? They will no longer be able to log in.')) {
      deleteUser.mutate({ userId: parseInt(userId || '0', 10) })
    }
  }

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <AdminLayout title="Loading..." description="Please wait">
        <div className="text-center py-12 text-gray-500">Loading user...</div>
      </AdminLayout>
    )
  }

  if (error || !user) {
    return (
      <AdminLayout title="Error" description="Failed to load user">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error?.message || 'User not found'}
        </div>
        <Link to="/admin/users" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to users
        </Link>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={`Edit: ${user.name}`}
      description={`@${user.username} - ${user.email}`}
    >
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-4">
          {(['profile', 'groups', 'security', 'sessions'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && profileData && (
        <div className="max-w-2xl">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {profileError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                {profileError}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full name
              </label>
              <input
                type="text"
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timezone
              </label>
              <input
                type="text"
                id="timezone"
                value={profileData.timezone}
                onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Europe/Amsterdam"
              />
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <input
                type="text"
                id="language"
                value={profileData.language}
                onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="en"
              />
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={profileData.isActive}
                  onChange={(e) => setProfileData({ ...profileData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account is active
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={updateUser.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/users')}
                className="px-6 py-2 border border-input text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Danger zone */}
          <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
            <div className="flex gap-4">
              {user.isActive ? (
                <button
                  onClick={handleDelete}
                  disabled={deleteUser.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Deactivate User
                </button>
              ) : (
                <button
                  onClick={() => reactivateUser.mutate({ userId: parseInt(userId || '0', 10) })}
                  disabled={reactivateUser.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Reactivate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="max-w-3xl space-y-6">
          {/* Current Groups */}
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-foreground">Group Memberships</h3>
              <p className="text-sm text-gray-500 mt-1">Groups this user belongs to</p>
            </div>
            {isGroupsLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">Loading groups...</div>
            ) : userGroups && userGroups.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {userGroups.map((group) => (
                  <div key={group.groupId} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {group.displayName}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          group.groupType === 'SYSTEM' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                          group.groupType === 'WORKSPACE' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                          group.groupType === 'WORKSPACE_ADMIN' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                          group.groupType === 'PROJECT' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          group.groupType === 'CUSTOM' && 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                        )}>
                          {group.groupType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 font-mono">{group.groupName}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${user.name} from ${group.displayName}?`)) {
                          removeFromGroup.mutate({
                            groupId: group.groupId,
                            userId: parseInt(userId || '0', 10),
                          })
                        }
                      }}
                      disabled={removeFromGroup.isPending}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                User is not a member of any groups
              </div>
            )}
          </div>

          {/* Add to Group */}
          <div className="bg-card rounded-card border border-border p-6">
            <h3 className="font-medium text-foreground mb-4">Add to Group</h3>
            {allGroupsData?.groups && allGroupsData.groups.length > 0 ? (
              <div className="space-y-4">
                <select
                  id="addGroupSelect"
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue=""
                  onChange={(e) => {
                    const groupId = parseInt(e.target.value, 10)
                    if (groupId && confirm('Add user to this group?')) {
                      addToGroup.mutate({
                        groupId,
                        userId: parseInt(userId || '0', 10),
                      })
                      e.target.value = ''
                    }
                  }}
                >
                  <option value="" disabled>Select a group to add...</option>
                  {allGroupsData.groups
                    .filter(g => !userGroups?.some(ug => ug.groupId === g.id))
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.displayName} ({group.type.replace('_', ' ')})
                      </option>
                    ))}
                </select>
                <p className="text-sm text-gray-500">
                  Select a group from the dropdown to add the user immediately.
                </p>
              </div>
            ) : (
              <div className="text-gray-500">No groups available</div>
            )}
          </div>

          {/* Group Legend */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Group Types</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">SYSTEM</span>
                <span className="text-gray-600 dark:text-gray-400">Domain Admins - Full access</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">WORKSPACE ADMIN</span>
                <span className="text-gray-600 dark:text-gray-400">Workspace administrator</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">WORKSPACE</span>
                <span className="text-gray-600 dark:text-gray-400">Workspace member</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">PROJECT</span>
                <span className="text-gray-600 dark:text-gray-400">Project member</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="max-w-2xl space-y-8">
          {/* Account Status */}
          <div className="bg-card rounded-card border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Account Status</h3>
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Email verified</span>
                <span className={user.emailVerified ? 'text-green-600' : 'text-yellow-600'}>
                  {user.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">2FA enabled</span>
                <span className={user.twofactorActivated ? 'text-green-600' : 'text-gray-600'}>
                  {user.twofactorActivated ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Account locked</span>
                <span className={user.isLocked ? 'text-red-600' : 'text-green-600'}>
                  {user.isLocked ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Failed login attempts</span>
                <span>{user.failedLoginCount}</span>
              </div>
            </div>

            {/* Security actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              {user.isLocked && (
                <button
                  onClick={() => unlockUser.mutate({ userId: parseInt(userId || '0', 10) })}
                  disabled={unlockUser.isPending}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  Unlock Account
                </button>
              )}
              {user.twofactorActivated && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to disable 2FA for this user?')) {
                      disable2FA.mutate({ userId: parseInt(userId || '0', 10) })
                    }
                  }}
                  disabled={disable2FA.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  Disable 2FA
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to revoke all sessions for this user?')) {
                    revokeSessions.mutate({ userId: parseInt(userId || '0', 10) })
                  }
                }}
                disabled={revokeSessions.isPending}
                className="px-4 py-2 border border-input text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Revoke All Sessions
              </button>
            </div>
          </div>

          {/* Reset Password */}
          <div className="bg-card rounded-card border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Reset Password</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Repeat password"
                />
              </div>
              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>

          {/* OAuth Connections */}
          <div className="bg-card rounded-card border border-border p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">OAuth Connections</h3>
            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Google</span>
                <span className={user.hasGoogle ? 'text-green-600' : 'text-gray-400'}>
                  {user.hasGoogle ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">GitHub</span>
                <span className={user.hasGithub ? 'text-green-600' : 'text-gray-400'}>
                  {user.hasGithub ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">GitLab</span>
                <span className={user.hasGitlab ? 'text-green-600' : 'text-gray-400'}>
                  {user.hasGitlab ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Session stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card rounded-card border border-border p-4">
              <div className="text-2xl font-bold text-foreground">{user.sessionCount}</div>
              <div className="text-sm text-gray-500">Active sessions</div>
            </div>
            <div className="bg-card rounded-card border border-border p-4">
              <div className="text-2xl font-bold text-foreground">{user.loginCount}</div>
              <div className="text-sm text-gray-500">Total logins</div>
            </div>
            <div className="bg-card rounded-card border border-border p-4">
              <div className="text-2xl font-bold text-foreground">{user.workspaceCount}</div>
              <div className="text-sm text-gray-500">Workspaces</div>
            </div>
          </div>

          {/* Recent logins */}
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-foreground">Recent Logins</h3>
            </div>
            {loginsData?.logins && loginsData.logins.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">IP Address</th>
                    <th className="px-4 py-2">Auth Type</th>
                    <th className="px-4 py-2">User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {loginsData.logins.map((login) => (
                    <tr key={login.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="px-4 py-2 text-sm">{formatDateTime(login.createdAt)}</td>
                      <td className="px-4 py-2 text-sm font-mono">{login.ip}</td>
                      <td className="px-4 py-2 text-sm">{login.authType}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 truncate max-w-xs" title={login.userAgent}>
                        {login.userAgent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">No login history</div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default UserEditPage
