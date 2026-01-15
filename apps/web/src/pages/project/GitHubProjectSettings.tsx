/*
 * GitHubProjectSettings
 * Version: 1.2.0
 *
 * Project-level GitHub settings page.
 * Link repositories, configure sync settings, view sync status, and analytics.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 3 - Repository Linking, 11 - Milestones & Releases, 13 - Analytics
 * =============================================================================
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { ProjectAnalyticsPanel } from '@/components/github/ProjectAnalyticsPanel'
import { ProjectMilestonesPanel } from '@/components/github/ProjectMilestonesPanel'
import { ProjectReleasesPanel } from '@/components/github/ProjectReleasesPanel'
import type { GitHubSyncSettings } from '@kanbu/shared'

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

function UnlinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
      <circle cx="12" cy="12" r="6" strokeWidth={2} />
      <circle cx="12" cy="12" r="2" strokeWidth={2} />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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

type TabId = 'repository' | 'settings' | 'logs' | 'milestones' | 'releases' | 'analytics'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: Tab[] = [
  { id: 'repository', label: 'Repository', icon: GitHubIcon },
  { id: 'settings', label: 'Sync Settings', icon: SettingsIcon },
  { id: 'logs', label: 'Sync Logs', icon: ClockIcon },
  { id: 'milestones', label: 'Milestones', icon: TargetIcon },
  { id: 'releases', label: 'Releases', icon: TagIcon },
  { id: 'analytics', label: 'Analytics', icon: BarChartIcon },
]

// =============================================================================
// Component
// =============================================================================

export function GitHubProjectSettings() {
  const { workspaceSlug, projectIdentifier } = useParams<{ workspaceSlug: string; projectIdentifier: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('repository')

  // Get project by identifier
  const { data: project, isLoading: projectLoading } = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier || '' },
    { enabled: !!projectIdentifier }
  )

  // Get linked repository
  const { data: linkedRepo, isLoading: repoLoading, refetch: refetchRepo } = trpc.github.getLinkedRepository.useQuery(
    { projectId: project?.id || 0 },
    { enabled: !!project?.id }
  )

  // Get sync status
  const { data: syncStatus, refetch: refetchStatus } = trpc.github.getSyncStatus.useQuery(
    { projectId: project?.id || 0 },
    { enabled: !!project?.id && !!linkedRepo }
  )

  // Get sync logs
  const { data: syncLogs, refetch: refetchLogs } = trpc.github.getSyncLogs.useQuery(
    { projectId: project?.id || 0, limit: 20 },
    { enabled: !!project?.id && !!linkedRepo && activeTab === 'logs' }
  )

  // Mutations
  const unlinkMutation = trpc.github.unlinkRepository.useMutation({
    onSuccess: () => {
      refetchRepo()
      refetchStatus()
    },
  })

  const triggerSyncMutation = trpc.github.triggerSync.useMutation({
    onSuccess: () => {
      refetchStatus()
      refetchLogs()
    },
  })

  const updateSettingsMutation = trpc.github.updateSyncSettings.useMutation({
    onSuccess: () => {
      refetchRepo()
    },
  })

  const isLoading = projectLoading || repoLoading

  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ProjectLayout>
    )
  }

  if (!project) {
    return (
      <ProjectLayout>
        <div className="p-6">
          <div className="text-center text-gray-500">Project not found</div>
        </div>
      </ProjectLayout>
    )
  }

  return (
    <ProjectLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <GitHubIcon className="h-6 w-6" />
            <h1 className="text-section-title text-foreground">GitHub Integration</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Link a GitHub repository to sync issues, pull requests, and commits.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
          <nav className="flex gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const isDisabled = !linkedRepo && tab.id !== 'repository'

              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                    ${isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : isDisabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'repository' && (
          <RepositoryTab
            projectId={project.id}
            linkedRepo={linkedRepo}
            syncStatus={syncStatus}
            workspaceSlug={workspaceSlug || ''}
            onUnlink={() => unlinkMutation.mutate({ projectId: project.id })}
            onTriggerSync={() => triggerSyncMutation.mutate({ projectId: project.id })}
            isUnlinking={unlinkMutation.isPending}
            isSyncing={triggerSyncMutation.isPending}
          />
        )}

        {activeTab === 'settings' && linkedRepo && (
          <SettingsTab
            projectId={project.id}
            linkedRepo={linkedRepo}
            onSave={(settings) => updateSettingsMutation.mutate({
              projectId: project.id,
              syncSettings: settings,
            })}
            onToggleSync={(enabled) => updateSettingsMutation.mutate({
              projectId: project.id,
              syncEnabled: enabled,
            })}
            isSaving={updateSettingsMutation.isPending}
          />
        )}

        {activeTab === 'logs' && linkedRepo && (
          <LogsTab logs={syncLogs?.logs || []} total={syncLogs?.total || 0} />
        )}

        {activeTab === 'milestones' && linkedRepo && project && (
          <ProjectMilestonesPanel projectId={project.id} />
        )}

        {activeTab === 'releases' && linkedRepo && project && (
          <ProjectReleasesPanel projectId={project.id} />
        )}

        {activeTab === 'analytics' && linkedRepo && project && (
          <ProjectAnalyticsPanel projectId={project.id} />
        )}
      </div>
    </ProjectLayout>
  )
}

// =============================================================================
// Repository Tab
// =============================================================================

interface RepositoryTabProps {
  projectId: number
  linkedRepo: {
    id: number
    owner: string
    name: string
    fullName: string
    defaultBranch: string
    isPrivate: boolean
    syncEnabled: boolean
    lastSyncAt: string | null
    installation?: {
      id: number
      accountLogin: string
      accountType: string
    }
    counts?: {
      issues: number
      pullRequests: number
      commits: number
    }
  } | null | undefined
  syncStatus: {
    syncEnabled: boolean
    lastSyncAt: string | null
    lastSyncStatus: string | null
    lastSyncAction: string | null
    counts: {
      issues: number
      pullRequests: number
      commits: number
      syncLogs: number
    }
  } | null | undefined
  workspaceSlug: string
  onUnlink: () => void
  onTriggerSync: () => void
  isUnlinking: boolean
  isSyncing: boolean
}

function RepositoryTab({
  linkedRepo,
  syncStatus,
  workspaceSlug: _workspaceSlug,
  onUnlink,
  onTriggerSync,
  isUnlinking,
  isSyncing,
}: RepositoryTabProps) {
  if (!linkedRepo) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
        <GitHubIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Repository Linked
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Link a GitHub repository to enable issue sync, PR tracking, and more.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
          First, ensure you have a GitHub App installation configured in{' '}
          <Link
            to={`/admin/github`}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Admin → GitHub
          </Link>
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Repository linking UI coming in next update.
          For now, use the API or MCP tools.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Repository Info Card */}
      <div className="bg-card rounded-card border border-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <GitHubIcon className="h-8 w-8" />
            </div>
            <div>
              <a
                href={`https://github.com/${linkedRepo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
              >
                {linkedRepo.fullName}
              </a>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span>Branch: {linkedRepo.defaultBranch}</span>
                <span>•</span>
                <span>{linkedRepo.isPrivate ? 'Private' : 'Public'}</span>
                {linkedRepo.installation && (
                  <>
                    <span>•</span>
                    <span>via {linkedRepo.installation.accountLogin}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTriggerSync}
              disabled={isSyncing || !linkedRepo.syncEnabled}
            >
              <RefreshIcon className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onUnlink}
              disabled={isUnlinking}
            >
              <UnlinkIcon className="h-4 w-4 mr-2" />
              {isUnlinking ? 'Unlinking...' : 'Unlink'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className="bg-card rounded-card border border-border p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sync Status</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStatus.counts.issues}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Issues</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStatus.counts.pullRequests}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pull Requests</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStatus.counts.commits}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Commits</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStatus.counts.syncLogs}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Sync Events</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Sync:</span>
              {syncStatus.syncEnabled ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckIcon className="h-4 w-4" /> Enabled
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XIcon className="h-4 w-4" /> Disabled
                </span>
              )}
            </div>
            {syncStatus.lastSyncAt && (
              <div className="text-gray-600 dark:text-gray-400">
                Last sync: {new Date(syncStatus.lastSyncAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Settings Tab
// =============================================================================

interface SettingsTabProps {
  projectId: number
  linkedRepo: {
    syncEnabled: boolean
    syncSettings: GitHubSyncSettings
  }
  onSave: (settings: GitHubSyncSettings) => void
  onToggleSync: (enabled: boolean) => void
  isSaving: boolean
}

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function SettingsTab({ linkedRepo, onSave, onToggleSync, isSaving }: SettingsTabProps) {
  const settings: GitHubSyncSettings = linkedRepo.syncSettings || {}

  const updateIssueSettings = (key: keyof NonNullable<GitHubSyncSettings['issues']>, value: boolean | string) => {
    const newSettings: GitHubSyncSettings = {
      ...settings,
      issues: {
        enabled: settings.issues?.enabled ?? true,
        direction: settings.issues?.direction ?? 'bidirectional',
        ...settings.issues,
        [key]: value,
      },
    }
    onSave(newSettings)
  }

  const updatePRSettings = (key: keyof NonNullable<GitHubSyncSettings['pullRequests']>, value: boolean) => {
    const newSettings: GitHubSyncSettings = {
      ...settings,
      pullRequests: {
        enabled: settings.pullRequests?.enabled ?? true,
        autoLink: settings.pullRequests?.autoLink ?? true,
        ...settings.pullRequests,
        [key]: value,
      },
    }
    onSave(newSettings)
  }

  const updateCommitSettings = (key: keyof NonNullable<GitHubSyncSettings['commits']>, value: boolean) => {
    const newSettings: GitHubSyncSettings = {
      ...settings,
      commits: {
        enabled: settings.commits?.enabled ?? true,
        autoLink: settings.commits?.autoLink ?? true,
        ...settings.commits,
        [key]: value,
      },
    }
    onSave(newSettings)
  }

  const updateAutomationSettings = (key: keyof NonNullable<GitHubSyncSettings['automation']>, value: boolean) => {
    const newSettings: GitHubSyncSettings = {
      ...settings,
      automation: {
        enabled: settings.automation?.enabled ?? false,
        ...settings.automation,
        [key]: value,
      },
    }
    onSave(newSettings)
  }

  return (
    <div className="space-y-3">
      {/* Global Sync Toggle */}
      <div className="bg-card rounded-card border border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Sync Enabled</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Enable or disable all sync operations for this repository
            </p>
          </div>
          <Toggle
            enabled={linkedRepo.syncEnabled}
            onChange={onToggleSync}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Issue Sync Settings */}
      <div className="bg-card rounded-card border border-border px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Issue Sync</h3>
          <Toggle
            enabled={settings.issues?.enabled ?? true}
            onChange={(v) => updateIssueSettings('enabled', v)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
          <SettingRow
            label="Sync Direction"
            description="How issues are synced between GitHub and Kanbu"
          >
            <select
              value={settings.issues?.direction ?? 'bidirectional'}
              onChange={(e) => updateIssueSettings('direction', e.target.value as 'bidirectional' | 'github_to_kanbu' | 'kanbu_to_github')}
              disabled={isSaving || !(settings.issues?.enabled ?? true)}
              className="block w-40 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="bidirectional">Bidirectional</option>
              <option value="github_to_kanbu">GitHub → Kanbu</option>
              <option value="kanbu_to_github">Kanbu → GitHub</option>
            </select>
          </SettingRow>
        </div>
      </div>

      {/* PR Tracking Settings */}
      <div className="bg-card rounded-card border border-border px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Pull Request Tracking</h3>
          <Toggle
            enabled={settings.pullRequests?.enabled ?? true}
            onChange={(v) => updatePRSettings('enabled', v)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
          <SettingRow
            label="Auto-link PRs to Tasks"
            description="Automatically link PRs to tasks based on branch name or PR title"
          >
            <Toggle
              enabled={settings.pullRequests?.autoLink ?? true}
              onChange={(v) => updatePRSettings('autoLink', v)}
              disabled={isSaving || !(settings.pullRequests?.enabled ?? true)}
            />
          </SettingRow>
        </div>
      </div>

      {/* Commit Tracking Settings */}
      <div className="bg-card rounded-card border border-border px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Commit Tracking</h3>
          <Toggle
            enabled={settings.commits?.enabled ?? true}
            onChange={(v) => updateCommitSettings('enabled', v)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
          <SettingRow
            label="Auto-link Commits to Tasks"
            description="Automatically link commits to tasks based on commit message"
          >
            <Toggle
              enabled={settings.commits?.autoLink ?? true}
              onChange={(v) => updateCommitSettings('autoLink', v)}
              disabled={isSaving || !(settings.commits?.enabled ?? true)}
            />
          </SettingRow>
        </div>
      </div>

      {/* Automation Settings */}
      <div className="bg-card rounded-card border border-border px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Automation</h3>
          <Toggle
            enabled={settings.automation?.enabled ?? false}
            onChange={(v) => updateAutomationSettings('enabled', v)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-1 divide-y divide-gray-100 dark:divide-gray-700">
          <SettingRow
            label="Move to In Progress on PR Open"
            description="Move linked task to 'In Progress' when a PR is opened"
          >
            <Toggle
              enabled={settings.automation?.moveToInProgressOnPROpen ?? false}
              onChange={(v) => updateAutomationSettings('moveToInProgressOnPROpen', v)}
              disabled={isSaving || !(settings.automation?.enabled ?? false)}
            />
          </SettingRow>

          <SettingRow
            label="Move to Review on PR Ready"
            description="Move linked task to 'Review' when PR is ready for review"
          >
            <Toggle
              enabled={settings.automation?.moveToReviewOnPRReady ?? false}
              onChange={(v) => updateAutomationSettings('moveToReviewOnPRReady', v)}
              disabled={isSaving || !(settings.automation?.enabled ?? false)}
            />
          </SettingRow>

          <SettingRow
            label="Move to Done on PR Merge"
            description="Move linked task to 'Done' when PR is merged"
          >
            <Toggle
              enabled={settings.automation?.moveToDoneOnPRMerge ?? false}
              onChange={(v) => updateAutomationSettings('moveToDoneOnPRMerge', v)}
              disabled={isSaving || !(settings.automation?.enabled ?? false)}
            />
          </SettingRow>

          <SettingRow
            label="Close Task on Issue Closed"
            description="Close linked Kanbu task when GitHub issue is closed"
          >
            <Toggle
              enabled={settings.automation?.closeTaskOnIssueClosed ?? false}
              onChange={(v) => updateAutomationSettings('closeTaskOnIssueClosed', v)}
              disabled={isSaving || !(settings.automation?.enabled ?? false)}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Logs Tab
// =============================================================================

interface LogEntry {
  id: number
  action: string
  direction: string
  entityType: string
  entityId: string | null
  status: string
  errorMessage: string | null
  details: Record<string, unknown>
  createdAt: string
}

interface LogsTabProps {
  logs: LogEntry[]
  total: number
}

function LogsTab({ logs, total }: LogsTabProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
        <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Sync Logs Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Sync events will appear here once synchronization is triggered.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {logs.length} of {total} sync events
      </div>

      <div className="bg-card rounded-card border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Direction</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {log.action}
                  {log.entityId && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({log.entityType} #{log.entityId})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {log.direction === 'kanbu_to_github' ? '→ GitHub' :
                   log.direction === 'github_to_kanbu' ? '← GitHub' :
                   '↔ Bidirectional'}
                </td>
                <td className="px-4 py-3">
                  <span className={`
                    inline-flex items-center px-2 py-1 text-xs font-medium rounded-full
                    ${log.status === 'success'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : log.status === 'failed'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }
                  `}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default GitHubProjectSettings
