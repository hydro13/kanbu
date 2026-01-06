/*
 * Sessions Page
 * Version: 1.1.0
 *
 * User profile page showing active sessions and remember tokens.
 * Compact layout with smaller list items and tighter spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState } from 'react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
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

function getTimeRemaining(expiresAt: Date | string): string {
  const expires = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const now = new Date()
  const diff = expires.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h remaining`
  return 'Less than 1h remaining'
}

function getBrowserName(userAgent: string | null): string {
  if (!userAgent) return 'Unknown Browser'
  const ua = userAgent.toLowerCase()
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('edg')) return 'Edge'
  if (ua.includes('chrome')) return 'Chrome'
  if (ua.includes('safari')) return 'Safari'
  if (ua.includes('opera')) return 'Opera'
  return 'Unknown Browser'
}

function getOSName(userAgent: string | null): string {
  if (!userAgent) return 'Unknown OS'
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return 'Unknown OS'
}

// =============================================================================
// Component
// =============================================================================

export function Sessions() {
  const [revoking, setRevoking] = useState<string | number | null>(null)

  const utils = trpc.useUtils()
  const { data: sessions, isLoading: loadingSessions } = trpc.user.getSessions.useQuery()
  const { data: tokens, isLoading: loadingTokens } = trpc.user.getRememberTokens.useQuery()

  const revokeSession = trpc.user.revokeSession.useMutation({
    onSuccess: () => {
      utils.user.getSessions.invalidate()
      setRevoking(null)
    },
  })

  const revokeToken = trpc.user.revokeRememberToken.useMutation({
    onSuccess: () => {
      utils.user.getRememberTokens.invalidate()
      setRevoking(null)
    },
  })

  const revokeAllSessions = trpc.user.revokeAllSessions.useMutation({
    onSuccess: () => {
      utils.user.getSessions.invalidate()
    },
  })

  const isLoading = loadingSessions || loadingTokens

  if (isLoading) {
    return (
      <ProfileLayout title="Persistent Connections" description="Manage your active sessions">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading sessions...</p>
        </div>
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout title="Persistent Connections" description="Manage your active sessions">
      <div className="grid grid-cols-2 gap-4">
        {/* Active Sessions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
              <p className="text-xs text-muted-foreground">Stay logged in across browser restarts</p>
            </div>
            {sessions && sessions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeAllSessions.mutate()}
                disabled={revokeAllSessions.isPending}
              >
                {revokeAllSessions.isPending ? 'Revoking...' : 'Revoke All'}
              </Button>
            )}
          </div>
          <div className="p-4">
            {!sessions || sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No active sessions</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-medium">{getBrowserName(session.userAgent)}</span>
                        <span className="text-xs text-muted-foreground">on</span>
                        <span>{getOSName(session.userAgent)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{session.ipAddress || 'Unknown IP'}</span>
                        <span className="text-green-600 dark:text-green-400">{getTimeRemaining(session.expiresAt)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRevoking(session.id)
                        revokeSession.mutate({ sessionId: session.id })
                      }}
                      disabled={revoking === session.id}
                      className="h-7 px-2 text-xs"
                    >
                      {revoking === session.id ? '...' : 'Revoke'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Remember Tokens */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Remember Me Tokens</h3>
            <p className="text-xs text-muted-foreground">Auto-login tokens</p>
          </div>
          <div className="p-4">
            {!tokens || tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No remember tokens</p>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm">{token.tokenPreview}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDateTime(token.createdAt)}</span>
                        <span className="text-green-600 dark:text-green-400">{getTimeRemaining(token.expiresAt)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRevoking(token.id)
                        revokeToken.mutate({ tokenId: token.id })
                      }}
                      disabled={revoking === token.id}
                      className="h-7 px-2 text-xs"
                    >
                      {revoking === token.id ? '...' : 'Revoke'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProfileLayout>
  )
}

export default Sessions
