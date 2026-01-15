/*
 * LastLogins Page
 * Version: 1.1.0
 *
 * User profile page showing login history.
 * Compact layout with smaller list items and tighter spacing.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { ProfileLayout } from '../../components/profile/ProfileLayout'
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

function getDeviceIcon(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile'
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet'
  }
  return 'desktop'
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

function getOSName(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return 'Unknown OS'
}

function getAuthTypeLabel(authType: string): string {
  switch (authType) {
    case 'password':
      return 'Password'
    case 'remember_me':
      return 'Remember Me'
    case 'oauth':
      return 'OAuth'
    default:
      return authType
  }
}

// =============================================================================
// Icons
// =============================================================================

function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function MobileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

function TabletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function LastLogins() {
  const { data, isLoading } = trpc.user.getLastLogins.useQuery({})

  if (isLoading) {
    return (
      <ProfileLayout title="Last Logins" description="Your recent login history">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading login history...</p>
        </div>
      </ProfileLayout>
    )
  }

  if (!data) {
    return (
      <ProfileLayout title="Last Logins" description="Your recent login history">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Could not load login history</p>
        </div>
      </ProfileLayout>
    )
  }

  const DeviceIcons: Record<string, React.FC<{ className?: string }>> = {
    desktop: DesktopIcon,
    mobile: MobileIcon,
    tablet: TabletIcon,
  }

  return (
    <ProfileLayout title="Last Logins" description="Your recent login history">
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Login History</h3>
          <span className="text-xs text-muted-foreground">{data.total} total</span>
        </div>
        <div className="p-4">
          {data.logins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No login history</p>
          ) : (
            <div className="space-y-2">
              {data.logins.map((login) => {
                const deviceType = getDeviceIcon(login.userAgent)
                const DeviceIcon = DeviceIcons[deviceType] ?? DesktopIcon

                return (
                  <div
                    key={login.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                  >
                    {/* Device Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <DeviceIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>

                    {/* Login Details - single line */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getBrowserName(login.userAgent)}
                      </span>
                      <span className="text-xs text-muted-foreground">on</span>
                      <span className="text-sm">{getOSName(login.userAgent)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        login.authType === 'oauth'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : login.authType === 'remember_me'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {getAuthTypeLabel(login.authType)}
                      </span>
                    </div>

                    {/* Meta info - right aligned */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-xs text-muted-foreground">{formatDateTime(login.createdAt)}</span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">{login.ip}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {data.hasMore && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Showing {data.logins.length} of {data.total}
            </p>
          )}
        </div>
      </div>
    </ProfileLayout>
  )
}

export default LastLogins
