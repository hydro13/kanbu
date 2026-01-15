/*
 * AcceptInvitePage Component
 * Version: 1.0.0
 *
 * Public page for accepting user invitations.
 * Validates invite token and allows user registration.
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

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { trpc, queryClient } from '@/lib/trpc'
import { useAppDispatch } from '@/store'
import { loginSuccess } from '@/store/authSlice'

// =============================================================================
// Icons
// =============================================================================

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}


function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  // Validate invite
  const { data: validation, isLoading: isValidating } = trpc.auth.validateInvite.useQuery(
    { token: token || '' },
    { enabled: !!token }
  )

  // Accept invite mutation
  const acceptMutation = trpc.auth.acceptInvite.useMutation({
    onSuccess: (data) => {
      // Clear React Query cache to start fresh
      queryClient.clear()
      // Login the user
      dispatch(loginSuccess({
        user: data.user,
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
      }))
      navigate('/')
    },
    onError: (error) => {
      setFormError(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setFormError('Passwords do not match')
      return
    }

    if (!token) {
      setFormError('Invalid invite token')
      return
    }

    acceptMutation.mutate({
      token,
      username,
      name,
      password,
    })
  }

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Validating invite...</div>
      </div>
    )
  }

  // Invalid invite
  if (!validation?.valid) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorMessage = (validation as any)?.error || 'This invite link is not valid.'
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <XCircleIcon className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-page-title text-foreground mb-2">
            Invalid Invite
          </h1>
          <p className="text-muted-foreground mb-6">
            {errorMessage}
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  // Extract invite data (we know valid=true, so invite exists)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invite = (validation as any).invite as {
    email: string
    role: string
    invitedBy: string
    expiresAt: string
  }

  // Valid invite - show registration form
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full mb-4">
            <MailIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-page-title text-foreground mb-2">
            You&apos;re Invited!
          </h1>
          <p className="text-muted-foreground">
            {invite.invitedBy} has invited you to join Kanbu.
          </p>
        </div>

        {/* Invite info */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {invite.email}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {invite.role}
            </span>
          </div>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              pattern="^[a-zA-Z0-9_-]+$"
              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Choose a username"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your full name"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Create a password"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm your password"
            />
          </div>

          {/* Error message */}
          {formError && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={acceptMutation.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {acceptMutation.isPending ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default AcceptInvitePage
