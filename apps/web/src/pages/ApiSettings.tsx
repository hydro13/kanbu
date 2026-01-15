/*
 * ApiSettings Page
 * Version: 1.0.0
 *
 * API key management for users.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react'
import { trpc } from '../lib/trpc'

// =============================================================================
// Types
// =============================================================================

interface NewKeyData {
  name: string
  permissions: string[]
  expiresIn: number | null
  rateLimit: number
}

// =============================================================================
// Constants
// =============================================================================

const EXPIRY_OPTIONS = [
  { value: null, label: 'Never expires' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
]

const PERMISSION_GROUPS = [
  {
    name: 'Tasks',
    permissions: [
      { id: 'tasks:read', label: 'Read tasks', description: 'View tasks and their details' },
      { id: 'tasks:write', label: 'Write tasks', description: 'Create, update, delete tasks' },
    ],
  },
  {
    name: 'Projects',
    permissions: [
      { id: 'projects:read', label: 'Read projects', description: 'View projects and settings' },
      { id: 'projects:write', label: 'Write projects', description: 'Update project settings' },
    ],
  },
  {
    name: 'Comments',
    permissions: [
      { id: 'comments:read', label: 'Read comments', description: 'View task comments' },
      { id: 'comments:write', label: 'Write comments', description: 'Create, update, delete comments' },
    ],
  },
  {
    name: 'Webhooks',
    permissions: [
      { id: 'webhooks:read', label: 'Read webhooks', description: 'View webhook configurations' },
      { id: 'webhooks:write', label: 'Write webhooks', description: 'Manage webhook settings' },
    ],
  },
]

// =============================================================================
// Component
// =============================================================================

export function ApiSettings() {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKey, setNewKey] = useState<NewKeyData>({
    name: '',
    permissions: ['tasks:read', 'projects:read'],
    expiresIn: null,
    rateLimit: 100,
  })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState<number | null>(null)

  // Queries
  const { data: keys, isLoading, refetch } = trpc.apiKey.list.useQuery()

  // Mutations
  const createMutation = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.key)
      refetch()
    },
  })

  const revokeMutation = trpc.apiKey.revoke.useMutation({
    onSuccess: () => refetch(),
  })

  const handleCreate = async () => {
    // Calculate expiry date from days if set
    let expiresAt: string | undefined
    if (newKey.expiresIn) {
      const date = new Date()
      date.setDate(date.getDate() + newKey.expiresIn)
      expiresAt = date.toISOString()
    }

    await createMutation.mutateAsync({
      name: newKey.name,
      permissions: newKey.permissions as (
        | 'tasks:read'
        | 'tasks:write'
        | 'projects:read'
        | 'projects:write'
        | 'comments:read'
        | 'comments:write'
        | 'webhooks:read'
        | 'webhooks:write'
      )[],
      expiresAt,
      rateLimit: newKey.rateLimit,
    })
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setCreatedKey(null)
    setNewKey({
      name: '',
      permissions: ['tasks:read', 'projects:read'],
      expiresIn: null,
      rateLimit: 100,
    })
  }

  const togglePermission = (permId: string) => {
    setNewKey((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }))
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-muted-foreground" />
                <h1 className="text-section-title text-foreground">
                  API Keys
                </h1>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create API Key
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                API Access
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                API keys allow external applications to access Kanbu on your behalf.
                Keep your keys secret and only grant necessary permissions.
              </p>
              <a
                href="https://docs.kanbu.be/api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2"
              >
                View API Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* API Keys List */}
        <div className="bg-card rounded-card border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your API Keys
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your personal API keys
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !keys || keys.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Key className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No API keys yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create an API key to start integrating with Kanbu
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create your first API key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {keys.map((key) => (
                <div key={key.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {key.name}
                        </h3>
                        {!key.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {key.keyPrefix}...
                        </span>
                        <span>Created {formatDate(key.createdAt)}</span>
                        <span>
                          Expires: {formatDate(key.expiresAt)}
                        </span>
                        {key.lastUsedAt && (
                          <span>Last used: {formatDate(key.lastUsedAt)}</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => setShowPermissions(showPermissions === key.id ? null : key.id)}
                          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          {showPermissions === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showPermissions === key.id ? 'Hide' : 'Show'} permissions ({(key.permissions as string[]).length})
                        </button>
                        {showPermissions === key.id && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(key.permissions as string[]).map((perm) => (
                              <span
                                key={perm}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {perm}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {key.isActive && (
                      <button
                        onClick={() => revokeMutation.mutate({ keyId: key.id })}
                        disabled={revokeMutation.isPending}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Revoke API key"
                      >
                        {revokeMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {createdKey ? 'API Key Created' : 'Create API Key'}
              </h2>
            </div>

            <div className="p-6">
              {createdKey ? (
                <div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        This is the only time you'll see this key. Copy it now and store it securely.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <code className="flex-1 text-sm font-mono break-all text-gray-900 dark:text-white">
                      {createdKey}
                    </code>
                    <button
                      onClick={() => handleCopy(createdKey, 'new')}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {copiedId === 'new' ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKey.name}
                      onChange={(e) => setNewKey((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., CI/CD Pipeline"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Permissions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Permissions
                    </label>
                    <div className="space-y-4">
                      {PERMISSION_GROUPS.map((group) => (
                        <div key={group.name}>
                          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                            {group.name}
                          </h4>
                          <div className="space-y-2">
                            {group.permissions.map((perm) => (
                              <label
                                key={perm.id}
                                className="flex items-start gap-3 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={newKey.permissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {perm.label}
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {perm.description}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expiration
                    </label>
                    <select
                      value={newKey.expiresIn ?? ''}
                      onChange={(e) =>
                        setNewKey((prev) => ({
                          ...prev,
                          expiresIn: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {EXPIRY_OPTIONS.map((opt) => (
                        <option key={opt.label} value={opt.value ?? ''}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rate Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rate Limit (requests/minute)
                    </label>
                    <input
                      type="number"
                      value={newKey.rateLimit}
                      onChange={(e) =>
                        setNewKey((prev) => ({ ...prev, rateLimit: Number(e.target.value) }))
                      }
                      min={1}
                      max={1000}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {createdKey ? 'Done' : 'Cancel'}
              </button>
              {!createdKey && (
                <button
                  onClick={handleCreate}
                  disabled={!newKey.name || newKey.permissions.length === 0 || createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiSettings
