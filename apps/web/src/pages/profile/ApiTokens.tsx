/*
 * ApiTokens Page
 * Version: 2.0.0
 *
 * User profile page for managing API tokens (personal access tokens).
 * Supports scoped access (USER, WORKSPACE, PROJECT) and service accounts.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 * Modified: 2026-01-09 - Fase 9.6: Added scope selector and service account support
 */

import { useState } from 'react'
import { ProfileLayout } from '../../components/profile/ProfileLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

type ApiKeyScope = 'USER' | 'WORKSPACE' | 'PROJECT'

// =============================================================================
// Helper Functions
// =============================================================================

function formatDateTime(date: Date | string | null): string {
  if (!date) return 'Never'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// =============================================================================
// Component
// =============================================================================

export function ApiTokens() {
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [expiresIn, setExpiresIn] = useState<string>('never')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  // Scope fields (Fase 9.6)
  const [scope, setScope] = useState<ApiKeyScope>('USER')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [isServiceAccount, setIsServiceAccount] = useState(false)
  const [serviceAccountName, setServiceAccountName] = useState('')

  const utils = trpc.useUtils()
  const { data: keys, isLoading } = trpc.apiKey.list.useQuery()
  const { data: permissions } = trpc.apiKey.getPermissions.useQuery()
  // Fetch workspaces and projects for scope selection
  const { data: workspaces } = trpc.workspace.list.useQuery()
  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: selectedWorkspaceId ?? 0 },
    { enabled: scope === 'PROJECT' && selectedWorkspaceId !== null }
  )

  const createKey = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key)
      setShowCreate(false)
      setNewKeyName('')
      setSelectedPermissions([])
      setExpiresIn('never')
      // Reset scope fields
      setScope('USER')
      setSelectedWorkspaceId(null)
      setSelectedProjectId(null)
      setIsServiceAccount(false)
      setServiceAccountName('')
      utils.apiKey.list.invalidate()
    },
  })

  const revokeKey = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      utils.apiKey.list.invalidate()
      setConfirmRevoke(null)
    },
  })

  const handleCreate = () => {
    let expiresAt: string | undefined
    if (expiresIn !== 'never') {
      const days = parseInt(expiresIn)
      const date = new Date()
      date.setDate(date.getDate() + days)
      expiresAt = date.toISOString()
    }

    createKey.mutate({
      name: newKeyName,
      permissions: selectedPermissions as Parameters<typeof createKey.mutate>[0]['permissions'],
      expiresAt,
      // Scope fields (Fase 9.6)
      scope,
      workspaceId: (scope === 'WORKSPACE' || scope === 'PROJECT') ? selectedWorkspaceId ?? undefined : undefined,
      projectId: scope === 'PROJECT' ? selectedProjectId ?? undefined : undefined,
      isServiceAccount,
      serviceAccountName: isServiceAccount ? serviceAccountName : undefined,
    })
  }

  const resetCreateForm = () => {
    setShowCreate(false)
    setNewKeyName('')
    setSelectedPermissions([])
    setExpiresIn('never')
    setScope('USER')
    setSelectedWorkspaceId(null)
    setSelectedProjectId(null)
    setIsServiceAccount(false)
    setServiceAccountName('')
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    )
  }

  if (isLoading) {
    return (
      <ProfileLayout title="API Tokens" description="Manage your personal access tokens">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    )
  }

  // Show newly created key (one-time display)
  if (newlyCreatedKey) {
    return (
      <ProfileLayout title="API Tokens" description="Manage your personal access tokens">
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-green-600 dark:text-green-400">Token Created!</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Copy now - won't be shown again</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <code className="flex-1 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded font-mono text-xs break-all border">
                {newlyCreatedKey}
              </code>
              <Button size="sm" onClick={() => copyToClipboard(newlyCreatedKey)} variant="outline">
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <Button size="sm" onClick={() => setNewlyCreatedKey(null)} className="w-full">Done</Button>
          </div>
        </div>
      </ProfileLayout>
    )
  }

  return (
    <ProfileLayout title="API Tokens" description="Manage your personal access tokens">
      <div className="bg-card rounded-card border border-border">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">API Tokens</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{keys?.length ?? 0} tokens</p>
          </div>
          {!showCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>Create</Button>
          )}
        </div>

        {showCreate && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 space-y-3">
            {/* Name and expiry */}
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Token name"
                className="flex-1 h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900"
              >
                <option value="never">No expiry</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </select>
            </div>

            {/* Scope selection (Fase 9.6) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Access Scope</label>
              <div className="flex gap-2">
                <select
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value as ApiKeyScope)
                    setSelectedWorkspaceId(null)
                    setSelectedProjectId(null)
                  }}
                  className="h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900"
                >
                  <option value="USER">Full User Access</option>
                  <option value="WORKSPACE">Workspace Only</option>
                  <option value="PROJECT">Project Only</option>
                </select>

                {/* Workspace selector */}
                {(scope === 'WORKSPACE' || scope === 'PROJECT') && (
                  <select
                    value={selectedWorkspaceId ?? ''}
                    onChange={(e) => {
                      setSelectedWorkspaceId(e.target.value ? Number(e.target.value) : null)
                      setSelectedProjectId(null)
                    }}
                    className="flex-1 h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900"
                  >
                    <option value="">Select workspace...</option>
                    {workspaces?.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                )}

                {/* Project selector */}
                {scope === 'PROJECT' && selectedWorkspaceId && (
                  <select
                    value={selectedProjectId ?? ''}
                    onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900"
                  >
                    <option value="">Select project...</option>
                    {projects?.map((proj) => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Service account option */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isServiceAccount}
                  onChange={(e) => setIsServiceAccount(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">Service Account (for integrations)</span>
              </label>
              {isServiceAccount && (
                <input
                  value={serviceAccountName}
                  onChange={(e) => setServiceAccountName(e.target.value)}
                  placeholder="Service account name (e.g., CI/CD Bot)"
                  className="w-full h-8 px-2 text-sm rounded border border-input bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Permissions */}
            <div className="flex flex-wrap gap-1">
              {permissions?.map((perm) => (
                <label
                  key={perm.value}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${
                    selectedPermissions.includes(perm.value)
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                    className="h-3 w-3"
                  />
                  {perm.label}
                </label>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={resetCreateForm}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={
                  !newKeyName.trim() ||
                  createKey.isPending ||
                  (scope === 'WORKSPACE' && !selectedWorkspaceId) ||
                  (scope === 'PROJECT' && (!selectedWorkspaceId || !selectedProjectId)) ||
                  (isServiceAccount && !serviceAccountName.trim())
                }
              >
                {createKey.isPending ? '...' : 'Create'}
              </Button>
            </div>
          </div>
        )}

        <div className="p-4">
          {!keys || keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tokens</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{key.name}</span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{key.keyPrefix}...</code>
                      {/* Scope badge */}
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        key.scope === 'USER'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          : key.scope === 'WORKSPACE'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {key.scope === 'USER' ? 'User' : key.scope === 'WORKSPACE' ? 'Workspace' : 'Project'}
                      </span>
                      {/* Service account indicator */}
                      {key.isServiceAccount && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          Service
                        </span>
                      )}
                      {key.isExpired && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Last: {formatDateTime(key.lastUsedAt)}
                      {key.scope === 'WORKSPACE' && key.workspace && ` • ${key.workspace.name}`}
                      {key.scope === 'PROJECT' && key.project && ` • ${key.project.name}`}
                      {key.isServiceAccount && key.serviceAccountName && ` • ${key.serviceAccountName}`}
                      {key.permissions.length > 0 && ` • ${key.permissions.join(', ')}`}
                    </div>
                  </div>
                  <div>
                    {confirmRevoke === key.id ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(null)} className="h-7 px-2 text-xs">Cancel</Button>
                        <Button size="sm" onClick={() => revokeKey.mutate({ keyId: key.id })} disabled={revokeKey.isPending} className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700 text-white">
                          {revokeKey.isPending ? '...' : 'Confirm'}
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(key.id)} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProfileLayout>
  )
}

export default ApiTokens
