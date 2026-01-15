/*
 * ChangePassword Page
 * Version: 1.1.0
 *
 * Password change page with current password verification.
 * Compact layout with smaller inputs and reduced spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState } from 'react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Component
// =============================================================================

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const changePassword = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    changePassword.mutate({
      currentPassword,
      newPassword,
    })
  }

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length > 0

  const handleClear = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
  }

  return (
    <ProfileLayout
      title="Change Password"
      description="Update your account password"
    >
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Password</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Enter current password and choose a new one</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          {/* Compact input fields */}
          <div className="space-y-3 mb-4">
            <div className="space-y-1">
              <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions row with messages */}
          <div className="flex items-center justify-between">
            <div>
              {error && (
                <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
              )}
              {changePassword.isSuccess && (
                <span className="text-xs text-green-600 dark:text-green-400">Password changed!</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                Clear
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isValid || changePassword.isPending}
              >
                {changePassword.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ProfileLayout>
  )
}

export default ChangePassword
