/*
 * WebhookSettings Page
 * Version: 1.0.0
 *
 * Project webhook configuration and management.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 2fb1aa57-4c11-411a-bfda-c7de543d538f
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T00:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Eye,
  EyeOff,
  Clock,
  Activity,
} from 'lucide-react'
import { trpc } from '../lib/trpc'
import { ProjectLayout } from '@/components/layout/ProjectLayout'

// =============================================================================
// Types
// =============================================================================

interface WebhookFormData {
  name: string
  url: string
  events: string[]
  isActive: boolean
}

// =============================================================================
// Constants
// =============================================================================

const EVENT_GROUPS = [
  {
    name: 'Tasks',
    events: [
      { id: 'task.created', label: 'Task Created' },
      { id: 'task.updated', label: 'Task Updated' },
      { id: 'task.deleted', label: 'Task Deleted' },
      { id: 'task.moved', label: 'Task Moved' },
      { id: 'task.completed', label: 'Task Completed' },
      { id: 'task.reopened', label: 'Task Reopened' },
      { id: 'task.assigned', label: 'Task Assigned' },
    ],
  },
  {
    name: 'Comments',
    events: [
      { id: 'comment.created', label: 'Comment Created' },
      { id: 'comment.updated', label: 'Comment Updated' },
      { id: 'comment.deleted', label: 'Comment Deleted' },
    ],
  },
  {
    name: 'Subtasks',
    events: [
      { id: 'subtask.created', label: 'Subtask Created' },
      { id: 'subtask.completed', label: 'Subtask Completed' },
    ],
  },
  {
    name: 'Project',
    events: [
      { id: 'project.updated', label: 'Project Updated' },
      { id: 'column.created', label: 'Column Created' },
      { id: 'column.updated', label: 'Column Updated' },
    ],
  },
  {
    name: 'Sprints & Milestones',
    events: [
      { id: 'sprint.started', label: 'Sprint Started' },
      { id: 'sprint.completed', label: 'Sprint Completed' },
      { id: 'milestone.completed', label: 'Milestone Completed' },
    ],
  },
]

// =============================================================================
// Component
// =============================================================================

export function WebhookSettings() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<WebhookFormData>({
    name: '',
    url: '',
    events: [],
    isActive: true,
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<number | null>(null)
  const [showDeliveries, setShowDeliveries] = useState<number | null>(null)
  const [secrets, setSecrets] = useState<Record<number, string>>({})

  // Fetch project by identifier (SEO-friendly URL)
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectIdNum = projectQuery.data?.id ?? 0

  // Queries
  const { data: webhooks, isLoading, refetch } = trpc.webhook.list.useQuery(
    { projectId: projectIdNum },
    { enabled: projectIdNum > 0 }
  )

  // Mutations
  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      handleCloseModal()
      refetch()
    },
  })

  const updateMutation = trpc.webhook.update.useMutation({
    onSuccess: () => {
      handleCloseModal()
      refetch()
    },
  })

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => refetch(),
  })

  const regenerateSecretMutation = trpc.webhook.regenerateSecret.useMutation({
    onSuccess: (data, variables) => {
      if (data.secret) {
        setSecrets((prev) => ({ ...prev, [variables.webhookId]: data.secret }))
      }
      refetch()
    },
  })

  const testMutation = trpc.webhook.test.useMutation()

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData({
      name: '',
      url: '',
      events: [],
      isActive: true,
    })
    setShowModal(true)
  }

  const handleOpenEdit = (webhook: NonNullable<typeof webhooks>[0]) => {
    setEditingId(webhook.id)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events as string[],
      isActive: webhook.isActive,
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
    setFormData({
      name: '',
      url: '',
      events: [],
      isActive: true,
    })
  }

  const handleSave = async () => {
    if (editingId) {
      await updateMutation.mutateAsync({
        webhookId: editingId,
        ...formData,
      })
    } else {
      await createMutation.mutateAsync({
        projectId: projectIdNum,
        ...formData,
      })
    }
  }

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleEvent = (eventId: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }))
  }

  const selectAllEvents = () => {
    const allEvents = EVENT_GROUPS.flatMap((g) => g.events.map((e) => e.id))
    setFormData((prev) => ({ ...prev, events: allEvents }))
  }

  const selectNoneEvents = () => {
    setFormData((prev) => ({ ...prev, events: [] }))
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <ProjectLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Webhook className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Webhooks
            </h1>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Webhook
          </button>
        </div>

        {/* Content */}
        <div>
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <Activity className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Real-time Notifications
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Webhooks send HTTP POST requests to your endpoints when events occur.
                Each request includes an HMAC-SHA256 signature for verification.
              </p>
            </div>
          </div>
        </div>

        {/* Webhooks List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configured Webhooks
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage webhook endpoints for this project
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !webhooks || webhooks.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Webhook className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No webhooks configured
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Set up a webhook to receive real-time notifications
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add your first webhook
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {webhook.name}
                        </h3>
                        {webhook.isActive ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            Inactive
                          </span>
                        )}
                        {webhook.failureCount > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {webhook.failureCount} failures
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <p className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate max-w-md">
                          {webhook.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Last success: {formatDate(webhook.lastSuccess)}
                        </span>
                        <span>
                          Events: {(webhook.events as string[]).length}
                        </span>
                      </div>

                      {/* Secret Section */}
                      <div className="mt-3">
                        <button
                          onClick={() => setShowSecret(showSecret === webhook.id ? null : webhook.id)}
                          className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          {showSecret === webhook.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {showSecret === webhook.id ? 'Hide' : 'Manage'} secret
                        </button>
                        {showSecret === webhook.id && (
                          <div className="mt-2 flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2 max-w-md">
                            {secrets[webhook.id] ? (
                              <>
                                <code className="flex-1 text-xs font-mono break-all text-gray-900 dark:text-white">
                                  {secrets[webhook.id]}
                                </code>
                                <button
                                  onClick={() => handleCopy(secrets[webhook.id] ?? '', `secret-${webhook.id}`)}
                                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                  {copiedId === `secret-${webhook.id}` ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 italic">
                                Secret is hidden. Regenerate to view.
                              </span>
                            )}
                            <button
                              onClick={() => regenerateSecretMutation.mutate({ webhookId: webhook.id })}
                              disabled={regenerateSecretMutation.isPending}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                              title="Regenerate secret"
                            >
                              <RefreshCw className={`w-4 h-4 ${regenerateSecretMutation.isPending ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Events List */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(webhook.events as string[]).slice(0, 5).map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                          >
                            {event}
                          </span>
                        ))}
                        {(webhook.events as string[]).length > 5 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            +{(webhook.events as string[]).length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => testMutation.mutate({ webhookId: webhook.id })}
                        disabled={testMutation.isPending}
                        className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Send test webhook"
                      >
                        {testMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(webhook)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit webhook"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate({ webhookId: webhook.id })}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete webhook"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Recent Deliveries */}
                  <div className="mt-4">
                    <button
                      onClick={() => setShowDeliveries(showDeliveries === webhook.id ? null : webhook.id)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                    >
                      {showDeliveries === webhook.id ? 'Hide' : 'Show'} recent deliveries
                    </button>
                    {showDeliveries === webhook.id && (
                      <WebhookDeliveries webhookId={webhook.id} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingId ? 'Edit Webhook' : 'Add Webhook'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Slack Integration"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enable or disable webhook delivery
                  </p>
                </div>
                <button
                  onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Events */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Events
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllEvents}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Select all
                    </button>
                    <button
                      onClick={selectNoneEvents}
                      className="text-xs text-gray-500 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {EVENT_GROUPS.map((group) => (
                    <div key={group.name}>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        {group.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {group.events.map((event) => (
                          <label
                            key={event.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.events.includes(event.id)}
                              onChange={() => toggleEvent(event.id)}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {event.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.url || formData.events.length === 0 || createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {editingId ? 'Save Changes' : 'Add Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ProjectLayout>
  )
}

// =============================================================================
// Deliveries Sub-component
// =============================================================================

interface WebhookDeliveryItem {
  id: number
  event: string
  statusCode: number | null
  duration: number | null
  success: boolean
  deliveredAt: Date
}

function WebhookDeliveries({ webhookId }: { webhookId: number }) {
  const { data, isLoading } = trpc.webhook.getDeliveries.useQuery({
    webhookId,
    limit: 10,
  })

  // Cast to avoid excessive type instantiation
  const deliveries = data as WebhookDeliveryItem[] | undefined

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        No deliveries yet
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {deliveries.map((delivery) => (
        <div
          key={delivery.id}
          className="flex items-center gap-3 text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          {delivery.success ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="font-medium text-gray-900 dark:text-white">
            {delivery.event}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {delivery.statusCode || 'N/A'}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {delivery.duration ? `${delivery.duration}ms` : '-'}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-auto">
            {new Date(delivery.deliveredAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default WebhookSettings
