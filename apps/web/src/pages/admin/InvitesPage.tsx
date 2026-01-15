/*
 * InvitesPage Component
 * Version: 1.0.0
 *
 * Admin page for managing user invites.
 * Features sending, resending, and cancelling invites.
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
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

type InviteStatus = 'pending' | 'accepted' | 'expired' | 'all'

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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function InvitesPage() {
  const [statusFilter, setStatusFilter] = useState<InviteStatus>('all')
  const [page, setPage] = useState(0)
  const [showSendModal, setShowSendModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MANAGER' | 'USER'>('USER')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const limit = 25

  const utils = trpc.useUtils()

  const { data, isLoading, error } = trpc.admin.listInvites.useQuery({
    status: statusFilter,
    limit,
    offset: page * limit,
  })

  const sendInviteMutation = trpc.admin.sendInvite.useMutation({
    onSuccess: () => {
      utils.admin.listInvites.invalidate()
      setShowSendModal(false)
      setEmailInput('')
    },
  })

  const cancelInviteMutation = trpc.admin.cancelInvite.useMutation({
    onSuccess: () => {
      utils.admin.listInvites.invalidate()
    },
  })

  const resendInviteMutation = trpc.admin.resendInvite.useMutation({
    onSuccess: () => {
      utils.admin.listInvites.invalidate()
    },
  })

  const handleSendInvites = () => {
    const emails = emailInput
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (emails.length === 0) return

    sendInviteMutation.mutate({
      emails,
      role: selectedRole,
      expiresInDays,
    })
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
            <ClockIcon className="h-3 w-3" />
            Pending
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            <CheckIcon className="h-3 w-3" />
            Accepted
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            <XIcon className="h-3 w-3" />
            Expired
          </span>
        )
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            Admin
          </span>
        )
      case 'MANAGER':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            Manager
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            User
          </span>
        )
    }
  }

  return (
    <AdminLayout
      title="Invites"
      description="Send and manage user invitations"
    >
      {/* Filters & Actions */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as InviteStatus)
              setPage(0)
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All invites</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Send invite button */}
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Send Invites
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          Failed to load invites: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          Loading invites...
        </div>
      )}

      {/* Invites table */}
      {data && (
        <>
          <div className="overflow-x-auto bg-card rounded-card border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Invited By
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sent
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.invites.map((invite) => (
                  <tr
                    key={invite.id}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MailIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {invite.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getRoleBadge(invite.role)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(invite.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {invite.invitedBy.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(invite.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(invite.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {invite.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resendInviteMutation.mutate({ inviteId: invite.id })}
                            disabled={resendInviteMutation.isPending}
                            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                            title="Resend invite"
                          >
                            <RefreshIcon className="h-4 w-4" />
                            Resend
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to cancel this invite?')) {
                                cancelInviteMutation.mutate({ inviteId: invite.id })
                              }
                            }}
                            disabled={cancelInviteMutation.isPending}
                            className="inline-flex items-center gap-1 px-2 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                            title="Cancel invite"
                          >
                            <XIcon className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      )}
                      {invite.status === 'expired' && (
                        <button
                          onClick={() => resendInviteMutation.mutate({ inviteId: invite.id })}
                          disabled={resendInviteMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                          title="Resend invite"
                        >
                          <RefreshIcon className="h-4 w-4" />
                          Resend
                        </button>
                      )}
                      {invite.status === 'accepted' && invite.acceptedAt && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(invite.acceptedAt)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} invites
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!data.hasMore}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {data && data.invites.length === 0 && (
        <div className="text-center py-12">
          <MailIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No invites found</p>
          <button
            onClick={() => setShowSendModal(true)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Send your first invite
          </button>
        </div>
      )}

      {/* Send Invite Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send Invites
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Email input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email addresses
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email addresses (one per line or comma-separated)"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Up to 20 emails at once
                </p>
              </div>

              {/* Role select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'ADMIN' | 'MANAGER' | 'USER')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires in
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              {/* Error message */}
              {sendInviteMutation.error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {sendInviteMutation.error.message}
                </div>
              )}

              {/* Success message */}
              {sendInviteMutation.data && (
                <div className="text-sm">
                  <p className="text-green-600 dark:text-green-400">
                    {sendInviteMutation.data.successCount} invite(s) sent successfully
                  </p>
                  {sendInviteMutation.data.failureCount > 0 && (
                    <p className="text-yellow-600 dark:text-yellow-400">
                      {sendInviteMutation.data.failureCount} invite(s) failed
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSendModal(false)
                  setEmailInput('')
                  sendInviteMutation.reset()
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvites}
                disabled={sendInviteMutation.isPending || emailInput.trim().length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendInviteMutation.isPending ? 'Sending...' : 'Send Invites'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default InvitesPage
