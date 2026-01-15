/*
 * AiSystemsPage Component
 * Version: 1.0.0
 *
 * Admin page for managing AI provider configurations.
 * Supports OpenAI, Ollama, and LM Studio providers.
 *
 * Fase: 14.2 - AI Provider Admin UI
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * =============================================================================
 */

import { useState } from 'react'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

type ProviderType = 'OPENAI' | 'OLLAMA' | 'LM_STUDIO'
type Capability = 'EMBEDDING' | 'REASONING' | 'VISION'

interface ProviderFormData {
  isGlobal: boolean
  workspaceId?: number
  projectId?: number
  providerType: ProviderType
  name: string
  isActive: boolean
  priority: number
  capabilities: Capability[]
  baseUrl: string
  apiKey: string
  organizationId: string
  embeddingModel: string
  reasoningModel: string
  visionModel: string
  maxRequestsPerMinute?: number
  maxTokensPerMinute?: number
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// =============================================================================
// Provider Type Config
// =============================================================================

const PROVIDER_CONFIG: Record<ProviderType, {
  label: string
  description: string
  defaultUrl: string
  requiresApiKey: boolean
  color: string
}> = {
  OPENAI: {
    label: 'OpenAI',
    description: 'Cloud AI provider with GPT models',
    defaultUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  OLLAMA: {
    label: 'Ollama',
    description: 'Local AI with Llama and other models',
    defaultUrl: 'http://localhost:11434/v1',
    requiresApiKey: false,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  LM_STUDIO: {
    label: 'LM Studio',
    description: 'Local desktop AI application',
    defaultUrl: 'http://localhost:1234/v1',
    requiresApiKey: false,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
}

const CAPABILITY_LABELS: Record<Capability, { label: string; description: string }> = {
  EMBEDDING: { label: 'Embedding', description: 'Vector embeddings for search' },
  REASONING: { label: 'Reasoning', description: 'Text generation and analysis' },
  VISION: { label: 'Vision', description: 'Image understanding' },
}

// =============================================================================
// Component
// =============================================================================

export function AiSystemsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProvider, setEditingProvider] = useState<number | null>(null)
  const [testingProvider, setTestingProvider] = useState<number | null>(null)
  const [testResult, setTestResult] = useState<{
    success: boolean
    latencyMs: number | null
    error?: string
    models?: string[] | null
  } | null>(null)

  const utils = trpc.useUtils()

  // Queries
  const { data, isLoading, error } = trpc.aiProvider.list.useQuery({ scope: 'all' })

  // Mutations
  const createMutation = trpc.aiProvider.create.useMutation({
    onSuccess: () => {
      utils.aiProvider.list.invalidate()
      setShowCreateModal(false)
    },
  })

  const updateMutation = trpc.aiProvider.update.useMutation({
    onSuccess: () => {
      utils.aiProvider.list.invalidate()
      setEditingProvider(null)
    },
  })

  const deleteMutation = trpc.aiProvider.delete.useMutation({
    onSuccess: () => {
      utils.aiProvider.list.invalidate()
    },
  })

  const testMutation = trpc.aiProvider.testConnection.useMutation({
    onSuccess: (result) => {
      setTestResult(result)
    },
    onError: (error) => {
      setTestResult({ success: false, latencyMs: null, error: error.message })
    },
  })

  const handleTestConnection = (providerId: number) => {
    setTestingProvider(providerId)
    setTestResult(null)
    testMutation.mutate({ id: providerId })
  }

  const handleDelete = (providerId: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate({ id: providerId })
    }
  }

  const handleToggleActive = (providerId: number, currentActive: boolean) => {
    updateMutation.mutate({ id: providerId, isActive: !currentActive })
  }

  // Group providers by scope
  const globalProviders = data?.providers.filter(p => p.isGlobal) || []
  const workspaceProviders = data?.providers.filter(p => p.workspaceId && !p.projectId) || []
  const projectProviders = data?.providers.filter(p => p.projectId) || []

  return (
    <AdminLayout
      title="AI Systems"
      description="Configure AI providers for Wiki and Graphiti functionality"
    >
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {data?.total || 0} provider{data?.total !== 1 ? 's' : ''} configured
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Provider
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          Failed to load providers: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          Loading AI providers...
        </div>
      )}

      {/* Providers list */}
      {data && (
        <div className="space-y-8">
          {/* Global Providers */}
          <ProviderSection
            title="Global Providers"
            description="Available system-wide for all workspaces and projects"
            icon={<GlobeIcon className="h-5 w-5" />}
            providers={globalProviders}
            testingProvider={testingProvider}
            testResult={testResult}
            onTest={handleTestConnection}
            onEdit={setEditingProvider}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />

          {/* Workspace Providers */}
          {workspaceProviders.length > 0 && (
            <ProviderSection
              title="Workspace Providers"
              description="Custom providers for specific workspaces"
              providers={workspaceProviders}
              testingProvider={testingProvider}
              testResult={testResult}
              onTest={handleTestConnection}
              onEdit={setEditingProvider}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          )}

          {/* Project Providers */}
          {projectProviders.length > 0 && (
            <ProviderSection
              title="Project Providers"
              description="Custom providers for specific projects"
              providers={projectProviders}
              testingProvider={testingProvider}
              testResult={testResult}
              onTest={handleTestConnection}
              onEdit={setEditingProvider}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          )}

          {/* Empty state */}
          {data.providers.length === 0 && (
            <div className="text-center py-12 bg-card rounded-card border border-border">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No AI providers configured yet.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add your first provider
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ProviderModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingProvider && (
        <EditProviderModal
          providerId={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingProvider, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </AdminLayout>
  )
}

// =============================================================================
// Provider Section Component
// =============================================================================

interface ProviderSectionProps {
  title: string
  description: string
  icon?: React.ReactNode
  providers: Array<{
    id: number
    name: string
    providerType: ProviderType
    isActive: boolean
    priority: number
    capabilities: Capability[]
    baseUrl: string | null
    apiKey: string | null
    workspace?: { id: number; name: string; slug: string } | null
    project?: { id: number; name: string; identifier: string | null } | null
  }>
  testingProvider: number | null
  testResult: { success: boolean; latencyMs: number | null; error?: string; models?: string[] | null } | null
  onTest: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number, name: string) => void
  onToggleActive: (id: number, currentActive: boolean) => void
}

function ProviderSection({
  title,
  description,
  icon,
  providers,
  testingProvider,
  testResult,
  onTest,
  onEdit,
  onDelete,
  onToggleActive,
}: ProviderSectionProps) {
  if (providers.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isTesting={testingProvider === provider.id}
            testResult={testingProvider === provider.id ? testResult : null}
            onTest={() => onTest(provider.id)}
            onEdit={() => onEdit(provider.id)}
            onDelete={() => onDelete(provider.id, provider.name)}
            onToggleActive={() => onToggleActive(provider.id, provider.isActive)}
          />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Provider Card Component
// =============================================================================

interface ProviderCardProps {
  provider: {
    id: number
    name: string
    providerType: ProviderType
    isActive: boolean
    priority: number
    capabilities: Capability[]
    baseUrl: string | null
    apiKey: string | null
    workspace?: { id: number; name: string; slug: string } | null
    project?: { id: number; name: string; identifier: string | null } | null
  }
  isTesting: boolean
  testResult: { success: boolean; latencyMs: number | null; error?: string; models?: string[] | null } | null
  onTest: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

function ProviderCard({
  provider,
  isTesting,
  testResult,
  onTest,
  onEdit,
  onDelete,
  onToggleActive,
}: ProviderCardProps) {
  const config = PROVIDER_CONFIG[provider.providerType]

  return (
    <div className={cn(
      'bg-card rounded-card border border-border p-4',
      !provider.isActive && 'opacity-60'
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{provider.name}</h4>
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded', config.color)}>
              {config.label}
            </span>
            {!provider.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                Inactive
              </span>
            )}
            {provider.apiKey && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                API Key Set
              </span>
            )}
          </div>

          {/* Base URL */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {provider.baseUrl || 'No URL configured'}
          </p>

          {/* Capabilities */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {provider.capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                {CAPABILITY_LABELS[cap].label}
              </span>
            ))}
          </div>

          {/* Scope info */}
          {provider.workspace && (
            <p className="text-xs text-gray-400">
              Workspace: {provider.workspace.name}
            </p>
          )}
          {provider.project && (
            <p className="text-xs text-gray-400">
              Project: {provider.project.name} ({provider.project.identifier})
            </p>
          )}

          {/* Test result */}
          {testResult && (
            <div className={cn(
              'mt-3 p-2 rounded text-sm',
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            )}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <XCircleIcon className="h-4 w-4" />
                )}
                <span>
                  {testResult.success
                    ? `Connected (${testResult.latencyMs}ms)`
                    : testResult.error || 'Connection failed'}
                </span>
              </div>
              {testResult.models && testResult.models.length > 0 && (
                <p className="mt-1 text-xs">
                  {testResult.models.length} model{testResult.models.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTest}
            disabled={isTesting}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Test connection"
          >
            <RefreshIcon className={cn('h-4 w-4', isTesting && 'animate-spin')} />
          </button>
          <button
            onClick={onToggleActive}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={provider.isActive ? 'Deactivate' : 'Activate'}
          >
            {provider.isActive ? (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            ) : (
              <XCircleIcon className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Provider Modal (Create)
// =============================================================================

interface ProviderModalProps {
  mode: 'create'
  onClose: () => void
  onSubmit: (data: ProviderFormData) => void
  isLoading: boolean
}

function ProviderModal({ onClose, onSubmit, isLoading }: ProviderModalProps) {
  const [formData, setFormData] = useState<ProviderFormData>({
    isGlobal: true,
    providerType: 'OPENAI',
    name: '',
    isActive: true,
    priority: 0,
    capabilities: ['EMBEDDING', 'REASONING'],
    baseUrl: PROVIDER_CONFIG.OPENAI.defaultUrl,
    apiKey: '',
    organizationId: '',
    embeddingModel: 'text-embedding-3-small',
    reasoningModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o',
  })

  const handleProviderTypeChange = (type: ProviderType) => {
    const config = PROVIDER_CONFIG[type]
    setFormData(prev => ({
      ...prev,
      providerType: type,
      baseUrl: config.defaultUrl,
      apiKey: config.requiresApiKey ? prev.apiKey : '',
      // Reset models based on provider type
      embeddingModel: type === 'OPENAI' ? 'text-embedding-3-small' : 'nomic-embed-text',
      reasoningModel: type === 'OPENAI' ? 'gpt-4o-mini' : 'llama3.2',
      visionModel: type === 'OPENAI' ? 'gpt-4o' : 'llava',
    }))
  }

  const handleCapabilityToggle = (cap: Capability) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const config = PROVIDER_CONFIG[formData.providerType]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add AI Provider
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Provider Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(PROVIDER_CONFIG) as ProviderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleProviderTypeChange(type)}
                  className={cn(
                    'p-3 text-left rounded-lg border-2 transition-colors',
                    formData.providerType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  )}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {PROVIDER_CONFIG[type].label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {PROVIDER_CONFIG[type].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`My ${config.label} Provider`}
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base URL
            </label>
            <input
              type="url"
              value={formData.baseUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder={config.defaultUrl}
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* API Key (only for providers that require it) */}
          {config.requiresApiKey && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Capabilities
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CAPABILITY_LABELS) as Capability[]).map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => handleCapabilityToggle(cap)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    formData.capabilities.includes(cap)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  {CAPABILITY_LABELS[cap].label}
                </button>
              ))}
            </div>
          </div>

          {/* Models */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Embedding Model
              </label>
              <input
                type="text"
                value={formData.embeddingModel}
                onChange={(e) => setFormData(prev => ({ ...prev, embeddingModel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reasoning Model
              </label>
              <input
                type="text"
                value={formData.reasoningModel}
                onChange={(e) => setFormData(prev => ({ ...prev, reasoningModel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vision Model
              </label>
              <input
                type="text"
                value={formData.visionModel}
                onChange={(e) => setFormData(prev => ({ ...prev, visionModel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority (higher = preferred)
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              min={0}
              max={1000}
              className="w-32 px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as () => void}
            disabled={isLoading || !formData.name || formData.capabilities.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Provider'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Edit Provider Modal
// =============================================================================

interface EditProviderModalProps {
  providerId: number
  onClose: () => void
  onSubmit: (data: Partial<ProviderFormData>) => void
  isLoading: boolean
}

function EditProviderModal({ providerId, onClose, onSubmit, isLoading }: EditProviderModalProps) {
  const { data: provider, isLoading: loadingProvider } = trpc.aiProvider.get.useQuery({ id: providerId })

  const [formData, setFormData] = useState<Partial<ProviderFormData>>({})

  // Initialize form with provider data
  useState(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        isActive: provider.isActive,
        priority: provider.priority,
        capabilities: provider.capabilities as Capability[],
        baseUrl: provider.baseUrl || '',
        apiKey: '', // Don't show existing key
        embeddingModel: provider.embeddingModel || '',
        reasoningModel: provider.reasoningModel || '',
        visionModel: provider.visionModel || '',
        maxRequestsPerMinute: provider.maxRequestsPerMinute ?? undefined,
        maxTokensPerMinute: provider.maxTokensPerMinute ?? undefined,
      })
    }
  })

  if (loadingProvider || !provider) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          Loading...
        </div>
      </div>
    )
  }

  const config = PROVIDER_CONFIG[provider.providerType as ProviderType]

  const handleCapabilityToggle = (cap: Capability) => {
    const current = formData.capabilities || provider.capabilities as Capability[]
    setFormData(prev => ({
      ...prev,
      capabilities: current.includes(cap)
        ? current.filter(c => c !== cap)
        : [...current, cap],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Only submit changed fields
    const changes: Partial<ProviderFormData> = {}
    if (formData.name && formData.name !== provider.name) changes.name = formData.name
    if (formData.isActive !== undefined && formData.isActive !== provider.isActive) changes.isActive = formData.isActive
    if (formData.priority !== undefined && formData.priority !== provider.priority) changes.priority = formData.priority
    if (formData.capabilities) changes.capabilities = formData.capabilities
    if (formData.baseUrl && formData.baseUrl !== provider.baseUrl) changes.baseUrl = formData.baseUrl
    if (formData.apiKey) changes.apiKey = formData.apiKey // Only update if provided
    if (formData.embeddingModel !== undefined) changes.embeddingModel = formData.embeddingModel
    if (formData.reasoningModel !== undefined) changes.reasoningModel = formData.reasoningModel
    if (formData.visionModel !== undefined) changes.visionModel = formData.visionModel

    onSubmit(changes)
  }

  const currentCapabilities = formData.capabilities || provider.capabilities as Capability[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Provider
            </h2>
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded mt-1 inline-block', config.color)}>
              {config.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name ?? provider.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base URL
            </label>
            <input
              type="url"
              value={formData.baseUrl ?? provider.baseUrl ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* API Key */}
          {config.requiresApiKey && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key {provider.apiKey && '(leave empty to keep current)'}
              </label>
              <input
                type="password"
                value={formData.apiKey ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={provider.apiKey ? '••••••••' : 'sk-...'}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Capabilities
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CAPABILITY_LABELS) as Capability[]).map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => handleCapabilityToggle(cap)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    currentCapabilities.includes(cap)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  {CAPABILITY_LABELS[cap].label}
                </button>
              ))}
            </div>
          </div>

          {/* Models */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Embedding Model
              </label>
              <input
                type="text"
                value={formData.embeddingModel ?? provider.embeddingModel ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, embeddingModel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reasoning Model
              </label>
              <input
                type="text"
                value={formData.reasoningModel ?? provider.reasoningModel ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reasoningModel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vision Model
              </label>
              <input
                type="text"
                value={formData.visionModel ?? provider.visionModel ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, visionModel: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority (higher = preferred)
            </label>
            <input
              type="number"
              value={formData.priority ?? provider.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              min={0}
              max={1000}
              className="w-32 px-3 py-2 border border-input rounded-lg bg-background text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive ?? provider.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as () => void}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AiSystemsPage
