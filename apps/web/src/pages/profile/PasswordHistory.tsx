/*
 * PasswordHistory Page
 * Version: 1.0.0
 *
 * User profile page showing password reset history.
 *
 * Task: USER-01 (Task 247)
 */

import { ProfileLayout } from '../../components/profile/ProfileLayout'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../../components/ui/card'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isExpired(expiresAt: Date | string): boolean {
  const expires = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expires.getTime() < Date.now()
}

function getBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('edg')) return 'Edge'
  if (ua.includes('chrome')) return 'Chrome'
  if (ua.includes('safari')) return 'Safari'
  if (ua.includes('opera')) return 'Opera'
  return 'Unknown Browser'
}

// =============================================================================
// Component
// =============================================================================

export function PasswordHistory() {
  const { data, isLoading } = trpc.user.getPasswordResets.useQuery({})

  if (isLoading) {
    return (
      <ProfileLayout title="Password Reset History" description="History of password reset requests">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading password history...</p>
        </div>
      </ProfileLayout>
    )
  }

  if (!data) {
    return (
      <ProfileLayout title="Password Reset History" description="History of password reset requests">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Could not load password history</p>
        </div>
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout title="Password Reset History" description="History of password reset requests">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Reset Requests</span>
            <span className="text-sm font-normal text-muted-foreground">
              {data.total} total requests
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.resets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No password reset requests found
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.resets.map((reset) => {
                const expired = isExpired(reset.expiresAt)
                const status = reset.isUsed
                  ? 'used'
                  : expired
                  ? 'expired'
                  : 'pending'

                return (
                  <div
                    key={reset.id}
                    className="py-4 flex items-start gap-4"
                  >
                    {/* Status Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      status === 'used'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : status === 'expired'
                        ? 'bg-gray-100 dark:bg-gray-800'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}>
                      {status === 'used' ? (
                        <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : status === 'expired' ? (
                        <svg className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {getBrowserName(reset.userAgent)}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          status === 'used'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : status === 'expired'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {status === 'used' ? 'Used' : status === 'expired' ? 'Expired' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Requested {formatDateTime(reset.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono text-xs">{reset.ip}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {reset.isUsed
                          ? 'Password was successfully changed'
                          : expired
                          ? `Expired on ${formatDateTime(reset.expiresAt)}`
                          : `Expires ${formatDateTime(reset.expiresAt)}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {data.hasMore && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Showing {data.resets.length} of {data.total} requests
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </ProfileLayout>
  )
}

export default PasswordHistory
