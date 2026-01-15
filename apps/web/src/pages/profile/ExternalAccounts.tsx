/*
 * ExternalAccounts Page
 * Version: 1.1.0
 *
 * User profile page for managing OAuth account connections.
 * Compact layout with items on single row.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState } from 'react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Types
// =============================================================================

type Provider = 'google' | 'github' | 'gitlab'

interface ProviderConfig {
  name: string
  icon: React.ReactNode
  color: string
  description: string
}

// =============================================================================
// Provider Configuration
// =============================================================================

const providers: Record<Provider, ProviderConfig> = {
  google: {
    name: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    color: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    description: 'Sign in with your Google account',
  },
  github: {
    name: 'GitHub',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    color: 'bg-gray-900 text-white hover:bg-gray-800',
    description: 'Sign in with your GitHub account',
  },
  gitlab: {
    name: 'GitLab',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" fill="#E24329"/>
      </svg>
    ),
    color: 'bg-orange-600 text-white hover:bg-orange-700',
    description: 'Sign in with your GitLab account',
  },
}

// =============================================================================
// Component
// =============================================================================

export function ExternalAccounts() {
  const [unlinkingProvider, setUnlinkingProvider] = useState<Provider | null>(null)
  const [confirmUnlink, setConfirmUnlink] = useState<Provider | null>(null)

  const utils = trpc.useUtils()
  const { data: accounts, isLoading } = trpc.user.getConnectedAccounts.useQuery()

  const unlinkAccount = trpc.user.unlinkAccount.useMutation({
    onSuccess: () => {
      utils.user.getConnectedAccounts.invalidate()
      setConfirmUnlink(null)
      setUnlinkingProvider(null)
    },
    onError: () => {
      setUnlinkingProvider(null)
    },
  })

  const handleUnlink = (provider: Provider) => {
    setUnlinkingProvider(provider)
    unlinkAccount.mutate({ provider })
  }

  const handleLinkClick = (provider: Provider) => {
    // OAuth flow would redirect to:
    // /api/auth/oauth/${provider}
    // For now, show a message since OAuth setup is out of scope
    alert(`OAuth linking for ${providers[provider].name} requires server-side OAuth configuration. This feature will be available once OAuth credentials are configured.`)
  }

  if (isLoading) {
    return (
      <ProfileLayout title="External Accounts" description="Manage connected OAuth accounts">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    )
  }

  const connectedCount = accounts
    ? [accounts.google.connected, accounts.github.connected, accounts.gitlab.connected].filter(Boolean).length
    : 0

  return (
    <ProfileLayout title="External Accounts" description="Manage connected OAuth accounts">
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Connected Accounts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {connectedCount === 0 ? 'Link an account for easier sign-in' : `${connectedCount} connected`}
            </p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {(Object.keys(providers) as Provider[]).map((provider) => {
            const config = providers[provider]
            const accountData = accounts?.[provider]
            const isConnected = accountData?.connected ?? false

            return (
              <div
                key={provider}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${isConnected ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    {config.icon}
                  </div>
                  <span className="text-sm font-medium">{config.name}</span>
                  {isConnected && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Connected
                    </span>
                  )}
                </div>

                <div>
                  {isConnected ? (
                    confirmUnlink === provider ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmUnlink(null)} className="h-7 px-2 text-xs">
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUnlink(provider)}
                          disabled={unlinkingProvider === provider}
                          className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          {unlinkingProvider === provider ? '...' : 'Confirm'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmUnlink(provider)}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Unlink
                      </Button>
                    )
                  ) : (
                    <Button size="sm" onClick={() => handleLinkClick(provider)} className={`h-7 px-2 text-xs ${config.color}`}>
                      Link
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ProfileLayout>
  )
}

export default ExternalAccounts
