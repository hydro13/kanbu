/*
 * GitHubAdminPage
 * Version: 1.0.0
 *
 * Admin page for managing GitHub App installations and user mappings.
 * Domain Admins and Workspace Admins can manage GitHub integrations.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 2 - GitHub App & OAuth
 * =============================================================================
 */

import { useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Icons
// =============================================================================

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// =============================================================================
// Types
// =============================================================================

type TabId = 'installations' | 'mappings' | 'overview'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// =============================================================================
// Component
// =============================================================================

export function GitHubAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null)

  // Check if GitHub is configured
  const { data: configStatus, isLoading: configLoading } = trpc.githubAdmin.isConfigured.useQuery()

  // Get admin scope to determine available workspaces
  const { data: adminScope } = trpc.group.myAdminScope.useQuery()
  const isDomainAdmin = adminScope?.isDomainAdmin ?? false

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: GitHubIcon },
    { id: 'installations', label: 'Installations', icon: LinkIcon },
    { id: 'mappings', label: 'User Mappings', icon: UsersIcon },
  ]

  // Not configured state
  if (configLoading) {
    return (
      <AdminLayout title="GitHub Integration" description="Manage GitHub App installations">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    )
  }

  if (!configStatus?.configured) {
    return (
      <AdminLayout title="GitHub Integration" description="Manage GitHub App installations">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-6">
          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <GitHubIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">GitHub App Not Configured</h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                The GitHub App integration is not configured. Please set the following environment variables:
              </p>
              <ul className="mt-3 text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                <li><code className="bg-amber-200 dark:bg-amber-900 px-1 rounded">GITHUB_APP_ID</code></li>
                <li><code className="bg-amber-200 dark:bg-amber-900 px-1 rounded">GITHUB_CLIENT_ID</code></li>
                <li><code className="bg-amber-200 dark:bg-amber-900 px-1 rounded">GITHUB_CLIENT_SECRET</code></li>
                <li><code className="bg-amber-200 dark:bg-amber-900 px-1 rounded">GITHUB_PRIVATE_KEY</code></li>
              </ul>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="GitHub Integration" description="Manage GitHub App installations and user mappings">
      <div className="space-y-6">
        {/* Workspace Selector (for Domain Admins) */}
        {isDomainAdmin && (
          <WorkspaceSelector
            selectedId={selectedWorkspaceId}
            onSelect={setSelectedWorkspaceId}
          />
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-1 px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab workspaceId={selectedWorkspaceId} />
            )}
            {activeTab === 'installations' && (
              <InstallationsTab workspaceId={selectedWorkspaceId} />
            )}
            {activeTab === 'mappings' && (
              <UserMappingsTab workspaceId={selectedWorkspaceId} />
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

// =============================================================================
// Workspace Selector Component
// =============================================================================

interface WorkspaceSelectorProps {
  selectedId: number | null
  onSelect: (id: number | null) => void
}

function WorkspaceSelector({ selectedId, onSelect }: WorkspaceSelectorProps) {
  const { data: workspaces, isLoading, error } = trpc.admin.listAllWorkspaces.useQuery({})

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading workspaces...</div>
  }

  if (error) {
    return <div className="text-sm text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Workspace:
      </label>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select Workspace</option>
        {workspaces?.workspaces.map((ws: { id: number; name: string }) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// =============================================================================
// Overview Tab
// =============================================================================

interface TabProps {
  workspaceId: number | null
}

function OverviewTab({ workspaceId }: TabProps) {
  // We need a workspace selected for overview
  if (!workspaceId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <GitHubIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Select a workspace to view GitHub integration overview</p>
      </div>
    )
  }

  const { data, isLoading, error } = trpc.githubAdmin.getWorkspaceOverview.useQuery({
    workspaceId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Installations"
          value={data?.installations ?? 0}
          icon={LinkIcon}
          color="blue"
        />
        <StatCard
          title="User Mappings"
          value={data?.userMappings ?? 0}
          icon={UsersIcon}
          color="green"
        />
        <StatCard
          title="Linked Repositories"
          value={data?.linkedRepositories ?? 0}
          icon={GitHubIcon}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Recent Sync Activity
          </h3>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <ul className="space-y-2 text-sm">
              {data.recentActivity.map((activity, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">{activity.action}</span>
                  <span className="text-gray-400">({activity.direction})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'purple' | 'amber'
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Installations Tab
// =============================================================================

function InstallationsTab({ workspaceId }: TabProps) {
  const utils = trpc.useUtils()

  // Get installation URL - only when workspace is selected
  const { data: installUrl } = trpc.githubAdmin.getInstallationUrl.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  )

  // List installations - requires workspace
  const { data: installations, isLoading, error } = trpc.githubAdmin.listInstallations.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  )

  // Mutations
  const removeInstallation = trpc.githubAdmin.removeInstallation.useMutation({
    onSuccess: () => {
      utils.githubAdmin.listInstallations.invalidate()
      utils.githubAdmin.getWorkspaceOverview.invalidate()
    },
  })

  const refreshToken = trpc.githubAdmin.refreshToken.useMutation({
    onSuccess: () => {
      utils.githubAdmin.listInstallations.invalidate()
    },
  })

  const handleRemove = (id: number, accountLogin: string) => {
    if (!workspaceId) return
    if (confirm(`Remove GitHub installation for "${accountLogin}"? This will also remove all linked repositories.`)) {
      removeInstallation.mutate({ workspaceId, installationId: id })
    }
  }

  if (!workspaceId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Select a workspace to manage GitHub installations</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Installation Button */}
      {installUrl && (
        <div className="flex justify-end">
          <a
            href={installUrl.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            <GitHubIcon className="h-4 w-4" />
            Install GitHub App
          </a>
        </div>
      )}

      {/* Installations List */}
      {installations && installations.length > 0 ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {installations.map((installation) => (
            <div key={installation.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <GitHubIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {installation.accountLogin}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {installation.accountType === 'organization' ? 'Organization' : 'User'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status Badge */}
                  {installation.suspended ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                      <XIcon className="h-3 w-3" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                      <CheckIcon className="h-3 w-3" />
                      Active
                    </span>
                  )}

                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshToken.mutate({ workspaceId, installationId: installation.id })}
                    disabled={refreshToken.isPending}
                    title="Refresh token"
                  >
                    <RefreshIcon className={`h-4 w-4 ${refreshToken.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(installation.id, installation.accountLogin)}
                    disabled={removeInstallation.isPending}
                    title="Remove installation"
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No GitHub App installations yet</p>
          <p className="text-sm mt-1">Click "Install GitHub App" to connect a GitHub organization or user account.</p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// User Mappings Tab
// =============================================================================

function UserMappingsTab({ workspaceId }: TabProps) {
  const utils = trpc.useUtils()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGitHubLogin, setNewGitHubLogin] = useState('')
  const [newUserId, setNewUserId] = useState<number | null>(null)

  // List mappings - requires workspace
  const { data: mappings, isLoading, error } = trpc.githubAdmin.listUserMappings.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  )

  // Get suggestions for auto-matching
  const { data: suggestions } = trpc.githubAdmin.suggestMappings.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  )

  // Get workspace users for dropdown
  const { data: workspaceUsers } = trpc.admin.listUsers.useQuery(
    { limit: 100 },
    { enabled: showAddForm }
  )

  // Mutations
  const createMapping = trpc.githubAdmin.createUserMapping.useMutation({
    onSuccess: () => {
      utils.githubAdmin.listUserMappings.invalidate()
      utils.githubAdmin.getWorkspaceOverview.invalidate()
      setShowAddForm(false)
      setNewGitHubLogin('')
      setNewUserId(null)
    },
  })

  const deleteMapping = trpc.githubAdmin.deleteUserMapping.useMutation({
    onSuccess: () => {
      utils.githubAdmin.listUserMappings.invalidate()
      utils.githubAdmin.getWorkspaceOverview.invalidate()
    },
  })

  const autoMatch = trpc.githubAdmin.autoMatchUsers.useMutation({
    onSuccess: () => {
      utils.githubAdmin.listUserMappings.invalidate()
      utils.githubAdmin.suggestMappings.invalidate()
      utils.githubAdmin.getWorkspaceOverview.invalidate()
    },
  })

  const handleDelete = (id: number, githubLogin: string) => {
    if (confirm(`Remove mapping for "${githubLogin}"?`)) {
      deleteMapping.mutate({ id })
    }
  }

  const handleCreate = () => {
    if (!workspaceId || !newGitHubLogin || !newUserId) return
    createMapping.mutate({
      workspaceId,
      githubLogin: newGitHubLogin,
      userId: newUserId,
    })
  }

  if (!workspaceId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Select a workspace to manage user mappings</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
        {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {suggestions && suggestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoMatch.mutate({ workspaceId })}
              disabled={autoMatch.isPending}
            >
              {autoMatch.isPending ? (
                <>
                  <RefreshIcon className="h-4 w-4 mr-2 animate-spin" />
                  Auto-matching...
                </>
              ) : (
                <>
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Auto-match ({suggestions.length} suggestions)
                </>
              )}
            </Button>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Mapping
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">New User Mapping</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                GitHub Login
              </label>
              <input
                type="text"
                value={newGitHubLogin}
                onChange={(e) => setNewGitHubLogin(e.target.value)}
                placeholder="e.g. octocat"
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Kanbu User
              </label>
              <select
                value={newUserId ?? ''}
                onChange={(e) => setNewUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value="">Select user...</option>
                {workspaceUsers?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createMapping.isPending || !newGitHubLogin || !newUserId}
            >
              {createMapping.isPending ? 'Creating...' : 'Create Mapping'}
            </Button>
          </div>
        </div>
      )}

      {/* Mappings List */}
      {mappings && mappings.length > 0 ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {mappings.map((mapping) => (
            <div key={mapping.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* GitHub side */}
                  <div className="flex items-center gap-2">
                    <GitHubIcon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {mapping.githubLogin}
                    </span>
                  </div>
                  {/* Arrow */}
                  <span className="text-gray-400">→</span>
                  {/* Kanbu side */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400">
                      {mapping.userName?.charAt(0) ?? '?'}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">
                      {mapping.userName ?? 'Unknown User'}
                    </span>
                  </div>
                  {/* Auto-matched badge */}
                  {mapping.autoMatched && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">
                      Auto-matched
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(mapping.id, mapping.githubLogin)}
                  disabled={deleteMapping.isPending}
                >
                  <TrashIcon className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No user mappings yet</p>
          <p className="text-sm mt-1">
            Map GitHub users to Kanbu users to track contributions.
          </p>
        </div>
      )}
    </div>
  )
}

export default GitHubAdminPage
