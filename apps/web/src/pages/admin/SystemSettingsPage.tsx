/*
 * SystemSettingsPage Component
 * Version: 1.0.0
 *
 * Admin page for managing system settings.
 * Key-value store for application configuration.
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

import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Icons
// =============================================================================

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// =============================================================================
// Default Settings Structure
// =============================================================================

interface SettingDefinition {
  key: string
  label: string
  description: string
  type: 'text' | 'boolean' | 'number' | 'textarea'
  default: string
  category: 'general' | 'security' | 'email' | 'features'
}

const SETTING_DEFINITIONS: SettingDefinition[] = [
  // General
  {
    key: 'app.name',
    label: 'Application Name',
    description: 'The name of the application displayed in the UI',
    type: 'text',
    default: 'Kanbu',
    category: 'general',
  },
  {
    key: 'app.description',
    label: 'Application Description',
    description: 'A short description of the application',
    type: 'textarea',
    default: 'Project Management Platform',
    category: 'general',
  },
  {
    key: 'app.timezone',
    label: 'Default Timezone',
    description: 'Default timezone for new users',
    type: 'text',
    default: 'Europe/Amsterdam',
    category: 'general',
  },
  {
    key: 'app.language',
    label: 'Default Language',
    description: 'Default language for new users',
    type: 'text',
    default: 'en',
    category: 'general',
  },
  // Security
  {
    key: 'security.registration_enabled',
    label: 'Allow Registration',
    description: 'Allow new users to register without an invite',
    type: 'boolean',
    default: 'false',
    category: 'security',
  },
  {
    key: 'security.2fa_required',
    label: 'Require 2FA',
    description: 'Require two-factor authentication for all users',
    type: 'boolean',
    default: 'false',
    category: 'security',
  },
  {
    key: 'security.password_min_length',
    label: 'Minimum Password Length',
    description: 'Minimum required password length',
    type: 'number',
    default: '8',
    category: 'security',
  },
  {
    key: 'security.session_timeout',
    label: 'Session Timeout (hours)',
    description: 'How long before a session expires',
    type: 'number',
    default: '168',
    category: 'security',
  },
  {
    key: 'security.max_login_attempts',
    label: 'Max Login Attempts',
    description: 'Number of failed login attempts before lockout',
    type: 'number',
    default: '5',
    category: 'security',
  },
  {
    key: 'security.lockout_duration',
    label: 'Lockout Duration (minutes)',
    description: 'Base lockout duration (doubles with each subsequent lockout)',
    type: 'number',
    default: '15',
    category: 'security',
  },
  {
    key: 'security.max_lockouts',
    label: 'Max Lockouts Before Permanent',
    description: 'Number of lockouts before account is permanently locked (0 = disabled)',
    type: 'number',
    default: '5',
    category: 'security',
  },
  // Email
  {
    key: 'email.from_address',
    label: 'From Address',
    description: 'Email address used for sending notifications',
    type: 'text',
    default: 'noreply@kanbu.dev',
    category: 'email',
  },
  {
    key: 'email.from_name',
    label: 'From Name',
    description: 'Name displayed in email sender field',
    type: 'text',
    default: 'Kanbu',
    category: 'email',
  },
  // Features
  {
    key: 'features.api_enabled',
    label: 'Enable API Access',
    description: 'Allow users to create API keys',
    type: 'boolean',
    default: 'true',
    category: 'features',
  },
  {
    key: 'features.webhooks_enabled',
    label: 'Enable Webhooks',
    description: 'Allow projects to configure webhooks',
    type: 'boolean',
    default: 'true',
    category: 'features',
  },
  {
    key: 'features.public_projects',
    label: 'Allow Public Projects',
    description: 'Allow projects to be made publicly accessible',
    type: 'boolean',
    default: 'true',
    category: 'features',
  },
]

// =============================================================================
// Component
// =============================================================================

export function SystemSettingsPage() {
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'email' | 'features'>('general')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customKey, setCustomKey] = useState('')
  const [customValue, setCustomValue] = useState('')

  const utils = trpc.useUtils()

  const { data, isLoading, error } = trpc.admin.getSettings.useQuery()

  const setSettingsMutation = trpc.admin.setSettings.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate()
      setHasChanges(false)
    },
  })

  const deleteSettingMutation = trpc.admin.deleteSetting.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate()
    },
  })

  // Initialize local settings from server data
  useEffect(() => {
    if (data?.settings) {
      const initial: Record<string, string> = {}
      // Set defaults first
      for (const def of SETTING_DEFINITIONS) {
        initial[def.key] = def.default
      }
      // Override with server values
      for (const [key, value] of Object.entries(data.settings)) {
        if (value !== null) {
          initial[key] = value
        }
      }
      setLocalSettings(initial)
    }
  }, [data])

  const handleChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    setSettingsMutation.mutate({ settings: localSettings })
  }

  const handleAddCustom = () => {
    if (!customKey.trim()) return
    setLocalSettings(prev => ({ ...prev, [customKey]: customValue }))
    setHasChanges(true)
    setCustomKey('')
    setCustomValue('')
    setShowAddCustom(false)
  }

  const handleDeleteCustom = (key: string) => {
    if (confirm(`Delete setting "${key}"?`)) {
      deleteSettingMutation.mutate({ key })
    }
  }

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'security' as const, label: 'Security' },
    { id: 'email' as const, label: 'Email' },
    { id: 'features' as const, label: 'Features' },
  ]

  const filteredSettings = SETTING_DEFINITIONS.filter(s => s.category === activeTab)

  // Find custom settings (not in definitions)
  const customSettings = data?.raw.filter(
    s => !SETTING_DEFINITIONS.some(d => d.key === s.key)
  ) || []

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <AdminLayout
      title="System Settings"
      description="Configure application settings"
    >
      {/* Save bar */}
      {hasChanges && (
        <div className="mb-6 flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
          <span className="text-yellow-700 dark:text-yellow-300">
            You have unsaved changes
          </span>
          <button
            onClick={handleSave}
            disabled={setSettingsMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <SaveIcon className="h-4 w-4" />
            {setSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          Failed to load settings: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          Loading settings...
        </div>
      )}

      {/* Settings content */}
      {data && (
        <div className="bg-card rounded-card border border-border">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings list */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredSettings.map((setting) => (
              <div key={setting.key} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {setting.label}
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {setting.description}
                    </p>
                    <code className="text-xs text-gray-400 dark:text-gray-500">
                      {setting.key}
                    </code>
                  </div>
                  <div className="w-64">
                    {setting.type === 'boolean' ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings[setting.key] === 'true'}
                          onChange={(e) => handleChange(setting.key, e.target.checked ? 'true' : 'false')}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    ) : setting.type === 'textarea' ? (
                      <textarea
                        value={localSettings[setting.key] || ''}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <input
                        type={setting.type}
                        value={localSettings[setting.key] || ''}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Settings */}
      {data && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Custom Settings
            </h3>
            <button
              onClick={() => setShowAddCustom(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Custom
            </button>
          </div>

          {customSettings.length === 0 && !showAddCustom && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-card rounded-card border border-border">
              No custom settings defined
            </div>
          )}

          {(customSettings.length > 0 || showAddCustom) && (
            <div className="bg-card rounded-card border border-border divide-y divide-gray-100 dark:divide-gray-700">
              {/* Add new form */}
              {showAddCustom && (
                <div className="px-6 py-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder="Setting key"
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Value"
                        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleAddCustom}
                      disabled={!customKey.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddCustom(false)
                        setCustomKey('')
                        setCustomValue('')
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-accent rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing custom settings */}
              {customSettings.map((setting) => (
                <div key={setting.key} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <code className="text-sm font-medium text-foreground">
                        {setting.key}
                      </code>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last changed: {formatDate(setting.changedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        value={localSettings[setting.key] || setting.value || ''}
                        onChange={(e) => handleChange(setting.key, e.target.value)}
                        className="w-64 px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleDeleteCustom(setting.key)}
                        disabled={deleteSettingMutation.isPending}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        title="Delete setting"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}

export default SystemSettingsPage
