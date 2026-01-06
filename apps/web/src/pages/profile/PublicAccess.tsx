/*
 * PublicAccess Page
 * Version: 1.1.0
 *
 * User profile page for managing public access tokens and feeds.
 * Compact layout with tighter spacing.
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

export function PublicAccess() {
  const [copied, setCopied] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: access, isLoading } = trpc.user.getPublicAccess.useQuery()

  const enableAccess = trpc.user.enablePublicAccess.useMutation({
    onSuccess: () => {
      utils.user.getPublicAccess.invalidate()
    },
  })

  const disableAccess = trpc.user.disablePublicAccess.useMutation({
    onSuccess: () => {
      utils.user.getPublicAccess.invalidate()
    },
  })

  const regenerateToken = trpc.user.regeneratePublicToken.useMutation({
    onSuccess: () => {
      utils.user.getPublicAccess.invalidate()
    },
  })

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (isLoading) {
    return (
      <ProfileLayout title="Public Access" description="Manage public RSS and iCal feeds">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    )
  }

  const baseUrl = window.location.origin

  return (
    <ProfileLayout title="Public Access" description="Manage public RSS and iCal feeds">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Public Access</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {access?.enabled ? 'Feeds are accessible via URLs below' : 'Get RSS and iCal feed URLs'}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            access?.enabled
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {access?.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div className="p-4">
          {!access?.enabled ? (
            <Button size="sm" onClick={() => enableAccess.mutate()} disabled={enableAccess.isPending}>
              {enableAccess.isPending ? 'Enabling...' : 'Enable Public Access'}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Feed URLs - compact inline rows */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">RSS:</span>
                  <code className="flex-1 px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded font-mono text-xs truncate">
                    {baseUrl}/api/feed/user/{access.token}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${baseUrl}/api/feed/user/${access.token}`, 'rss')} className="h-7 px-2 text-xs">
                    {copied === 'rss' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">iCal:</span>
                  <code className="flex-1 px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded font-mono text-xs truncate">
                    {baseUrl}/api/ical/user/{access.token}
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${baseUrl}/api/ical/user/${access.token}`, 'ical')} className="h-7 px-2 text-xs">
                    {copied === 'ical' ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button variant="outline" size="sm" onClick={() => regenerateToken.mutate()} disabled={regenerateToken.isPending}>
                  {regenerateToken.isPending ? '...' : 'Regenerate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disableAccess.mutate()}
                  disabled={disableAccess.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {disableAccess.isPending ? '...' : 'Disable'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProfileLayout>
  )
}

export default PublicAccess
