/*
 * MCP Services Page
 * Version: 1.0.0
 *
 * Admin page for managing OAuth 2.0/2.1 clients for external AI integrations.
 * Supports Claude.ai (public client with PKCE) and ChatGPT (confidential client).
 *
 * Phase: 19.8 - OAuth Client Admin UI
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-19
 * =============================================================================
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/admin';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type AuthMethod = 'none' | 'client_secret_basic' | 'client_secret_post';

interface ClientFormData {
  clientName: string;
  redirectUris: string[];
  grantTypes: ('authorization_code' | 'refresh_token')[];
  tokenEndpointAuthMethod: AuthMethod;
  scope: string;
  clientUri?: string;
  logoUri?: string;
  contacts: string[];
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

// =============================================================================
// Auth Method Config
// =============================================================================

const AUTH_METHOD_CONFIG: Record<
  AuthMethod,
  {
    label: string;
    description: string;
    color: string;
    example: string;
  }
> = {
  none: {
    label: 'Public Client (PKCE)',
    description: 'For browser-based clients like Claude.ai',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    example: 'Claude.ai',
  },
  client_secret_basic: {
    label: 'Confidential (Basic)',
    description: 'Client secret via HTTP Basic Auth',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    example: 'ChatGPT',
  },
  client_secret_post: {
    label: 'Confidential (POST)',
    description: 'Client secret in request body',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    example: 'Custom integrations',
  },
};

// =============================================================================
// Presets for common integrations
// =============================================================================

const CLIENT_PRESETS = {
  claudeai: {
    name: 'Claude.ai',
    clientName: 'Claude.ai MCP Integration',
    redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    tokenEndpointAuthMethod: 'none' as AuthMethod,
    grantTypes: ['authorization_code', 'refresh_token'] as (
      | 'authorization_code'
      | 'refresh_token'
    )[],
    scope: 'read write',
    clientUri: 'https://claude.ai',
  },
  chatgpt: {
    name: 'ChatGPT',
    clientName: 'ChatGPT MCP Integration',
    redirectUris: ['https://chat.openai.com/aip/plugin-callback'],
    tokenEndpointAuthMethod: 'client_secret_basic' as AuthMethod,
    grantTypes: ['authorization_code', 'refresh_token'] as (
      | 'authorization_code'
      | 'refresh_token'
    )[],
    scope: 'read write',
    clientUri: 'https://chat.openai.com',
  },
};

// =============================================================================
// Component
// =============================================================================

export function McpServicesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [newSecret, setNewSecret] = useState<{ clientId: string; secret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data, isLoading, error } = trpc.oauthClient.list.useQuery({
    includeInactive: showInactive,
    limit: 50,
    offset: 0,
  });

  // Mutations
  const createMutation = trpc.oauthClient.create.useMutation({
    onSuccess: (result) => {
      utils.oauthClient.list.invalidate();
      setShowCreateModal(false);
      // Show the new secret if confidential client
      if (result.clientSecret) {
        setNewSecret({ clientId: result.clientId, secret: result.clientSecret });
      }
    },
  });

  const updateMutation = trpc.oauthClient.update.useMutation({
    onSuccess: () => {
      utils.oauthClient.list.invalidate();
      setEditingClient(null);
    },
  });

  const deactivateMutation = trpc.oauthClient.deactivate.useMutation({
    onSuccess: () => {
      utils.oauthClient.list.invalidate();
    },
  });

  const reactivateMutation = trpc.oauthClient.reactivate.useMutation({
    onSuccess: () => {
      utils.oauthClient.list.invalidate();
    },
  });

  const regenerateSecretMutation = trpc.oauthClient.regenerateSecret.useMutation({
    onSuccess: (result) => {
      utils.oauthClient.list.invalidate();
      setNewSecret({ clientId: result.clientId, secret: result.clientSecret });
    },
  });

  const revokeAllTokensMutation = trpc.oauthClient.revokeAllTokens.useMutation({
    onSuccess: () => {
      utils.oauthClient.list.invalidate();
    },
  });

  const deleteMutation = trpc.oauthClient.delete.useMutation({
    onSuccess: () => {
      utils.oauthClient.list.invalidate();
    },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDeactivate = (clientId: number, name: string) => {
    if (confirm(`Deactivate "${name}"? This will revoke all active tokens.`)) {
      deactivateMutation.mutate({ id: clientId });
    }
  };

  const handleReactivate = (clientId: number) => {
    reactivateMutation.mutate({ id: clientId });
  };

  const handleRegenerateSecret = (clientId: number, name: string) => {
    if (confirm(`Regenerate secret for "${name}"? The old secret will stop working immediately.`)) {
      regenerateSecretMutation.mutate({ id: clientId });
    }
  };

  const handleRevokeAllTokens = (clientId: number, name: string, tokenCount: number) => {
    if (confirm(`Revoke all ${tokenCount} active tokens for "${name}"?`)) {
      revokeAllTokensMutation.mutate({ id: clientId });
    }
  };

  const handleDelete = (clientId: number, name: string) => {
    if (confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id: clientId });
    }
  };

  return (
    <AdminLayout
      title="MCP Services"
      description="Manage OAuth clients for Claude.ai, ChatGPT, and other MCP integrations"
    >
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {data?.total || 0} client{data?.total !== 1 ? 's' : ''} registered
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-muted-foreground">Show inactive</span>
          </label>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          Failed to load clients: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Loading OAuth clients...</div>
      )}

      {/* Clients list */}
      {data && (
        <div className="space-y-4">
          {data.clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={() => setEditingClient(client.id)}
              onDeactivate={() => handleDeactivate(client.id, client.clientName)}
              onReactivate={() => handleReactivate(client.id)}
              onRegenerateSecret={() => handleRegenerateSecret(client.id, client.clientName)}
              onRevokeAllTokens={() =>
                handleRevokeAllTokens(client.id, client.clientName, client.activeTokenCount)
              }
              onDelete={() => handleDelete(client.id, client.clientName)}
              onCopy={handleCopy}
              copiedField={copiedField}
            />
          ))}

          {/* Empty state */}
          {data.clients.length === 0 && (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground mb-4">No OAuth clients registered yet.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Register your first client
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingClient && (
        <EditClientModal
          clientId={editingClient}
          onClose={() => setEditingClient(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingClient, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* New Secret Modal */}
      {newSecret && (
        <SecretModal
          clientId={newSecret.clientId}
          clientSecret={newSecret.secret}
          onClose={() => setNewSecret(null)}
          onCopy={handleCopy}
          copiedField={copiedField}
        />
      )}
    </AdminLayout>
  );
}

// =============================================================================
// Client Card Component
// =============================================================================

interface ClientCardProps {
  client: {
    id: number;
    clientId: string;
    clientName: string;
    clientUri: string | null;
    logoUri: string | null;
    redirectUris: string[];
    grantTypes: string[];
    tokenEndpointAuthMethod: string;
    scope: string | null;
    isActive: boolean;
    activeTokenCount: number;
    hasSecret: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onRegenerateSecret: () => void;
  onRevokeAllTokens: () => void;
  onDelete: () => void;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

function ClientCard({
  client,
  onEdit,
  onDeactivate,
  onReactivate,
  onRegenerateSecret,
  onRevokeAllTokens,
  onDelete,
  onCopy,
  copiedField,
}: ClientCardProps) {
  const authConfig = AUTH_METHOD_CONFIG[client.tokenEndpointAuthMethod as AuthMethod];

  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-4',
        !client.isActive && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h4 className="font-semibold text-foreground">{client.clientName}</h4>
            <span className={cn('px-2 py-0.5 text-xs font-medium rounded', authConfig.color)}>
              {authConfig.label}
            </span>
            {!client.isActive && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-surface-2 text-muted-foreground">
                Inactive
              </span>
            )}
            {client.activeTokenCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {client.activeTokenCount} active token{client.activeTokenCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Client ID with copy */}
          <div className="flex items-center gap-2 mb-2">
            <code className="text-xs bg-surface-1 px-2 py-1 rounded font-mono text-muted-foreground truncate max-w-xs">
              {client.clientId}
            </code>
            <button
              onClick={() => onCopy(client.clientId, `clientId-${client.id}`)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy Client ID"
            >
              {copiedField === `clientId-${client.id}` ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Redirect URIs */}
          <div className="text-sm text-muted-foreground mb-2">
            <span className="font-medium">Redirect URIs:</span>{' '}
            {client.redirectUris.map((uri, i) => (
              <span key={i}>
                {i > 0 && ', '}
                <code className="text-xs">{uri}</code>
              </span>
            ))}
          </div>

          {/* Scope */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(client.scope || '')
              .split(' ')
              .filter(Boolean)
              .map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-0.5 text-xs bg-surface-1 text-muted-foreground rounded"
                >
                  {scope}
                </span>
              ))}
          </div>

          {/* Client URI */}
          {client.clientUri && (
            <p className="text-xs text-muted-foreground">
              <a
                href={client.clientUri}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {client.clientUri}
              </a>
            </p>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {client.hasSecret && (
            <button
              onClick={onRegenerateSecret}
              className="p-2 text-muted-foreground hover:bg-surface-1 rounded transition-colors"
              title="Regenerate Secret"
            >
              <RefreshIcon className="h-4 w-4" />
            </button>
          )}
          {client.activeTokenCount > 0 && (
            <button
              onClick={onRevokeAllTokens}
              className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
              title="Revoke All Tokens"
            >
              <KeyIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={client.isActive ? onDeactivate : onReactivate}
            className="p-2 text-muted-foreground hover:bg-surface-1 rounded transition-colors"
            title={client.isActive ? 'Deactivate' : 'Activate'}
          >
            {client.isActive ? (
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            ) : (
              <XCircleIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-muted-foreground hover:bg-surface-1 rounded transition-colors"
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
  );
}

// =============================================================================
// Create Client Modal
// =============================================================================

interface CreateClientModalProps {
  onClose: () => void;
  onSubmit: (data: ClientFormData) => void;
  isLoading: boolean;
}

function CreateClientModal({ onClose, onSubmit, isLoading }: CreateClientModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof CLIENT_PRESETS | 'custom'>(
    'custom'
  );
  const [formData, setFormData] = useState<ClientFormData>({
    clientName: '',
    redirectUris: [''],
    grantTypes: ['authorization_code', 'refresh_token'],
    tokenEndpointAuthMethod: 'client_secret_basic',
    scope: 'read write',
    clientUri: '',
    logoUri: '',
    contacts: [],
  });

  const handlePresetChange = (preset: keyof typeof CLIENT_PRESETS | 'custom') => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const presetData = CLIENT_PRESETS[preset];
      setFormData((prev) => ({
        ...prev,
        clientName: presetData.clientName,
        redirectUris: presetData.redirectUris,
        tokenEndpointAuthMethod: presetData.tokenEndpointAuthMethod,
        grantTypes: presetData.grantTypes,
        scope: presetData.scope,
        clientUri: presetData.clientUri || '',
      }));
    }
  };

  const handleRedirectUriChange = (index: number, value: string) => {
    const newUris = [...formData.redirectUris];
    newUris[index] = value;
    setFormData((prev) => ({ ...prev, redirectUris: newUris }));
  };

  const addRedirectUri = () => {
    setFormData((prev) => ({ ...prev, redirectUris: [...prev.redirectUris, ''] }));
  };

  const removeRedirectUri = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      redirectUris: prev.redirectUris.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty redirect URIs
    const cleanData = {
      ...formData,
      redirectUris: formData.redirectUris.filter((uri) => uri.trim() !== ''),
      clientUri: formData.clientUri || undefined,
      logoUri: formData.logoUri || undefined,
      contacts: formData.contacts.filter((c) => c.trim() !== ''),
    };
    onSubmit(cleanData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Register OAuth Client</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Quick Setup</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePresetChange('claudeai')}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border transition-colors',
                  selectedPreset === 'claudeai'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-border hover:border-blue-300'
                )}
              >
                Claude.ai
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('chatgpt')}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border transition-colors',
                  selectedPreset === 'chatgpt'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                    : 'border-border hover:border-purple-300'
                )}
              >
                ChatGPT
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange('custom')}
                className={cn(
                  'px-3 py-2 text-sm rounded-lg border transition-colors',
                  selectedPreset === 'custom'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-border hover:border-green-300'
                )}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Client Name</label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
              placeholder="My Integration"
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Auth Method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Authentication Method
            </label>
            <div className="grid gap-2">
              {(Object.keys(AUTH_METHOD_CONFIG) as AuthMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, tokenEndpointAuthMethod: method }))
                  }
                  className={cn(
                    'p-3 text-left rounded-lg border transition-colors',
                    formData.tokenEndpointAuthMethod === method
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-blue-300'
                  )}
                >
                  <div className="font-medium text-foreground">
                    {AUTH_METHOD_CONFIG[method].label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {AUTH_METHOD_CONFIG[method].description} (e.g.,{' '}
                    {AUTH_METHOD_CONFIG[method].example})
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Redirect URIs */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Redirect URIs</label>
            <div className="space-y-2">
              {formData.redirectUris.map((uri, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={uri}
                    onChange={(e) => handleRedirectUriChange(index, e.target.value)}
                    placeholder="https://example.com/callback"
                    required={index === 0}
                    className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.redirectUris.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRedirectUri(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRedirectUri}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              + Add another redirect URI
            </button>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Scope</label>
            <input
              type="text"
              value={formData.scope}
              onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value }))}
              placeholder="read write"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Space-separated list of scopes (e.g., "read write")
            </p>
          </div>

          {/* Client URI (optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Client URI (optional)
            </label>
            <input
              type="url"
              value={formData.clientUri}
              onChange={(e) => setFormData((prev) => ({ ...prev, clientUri: e.target.value }))}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-foreground hover:bg-surface-1 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit as () => void}
            disabled={
              isLoading ||
              !formData.clientName ||
              formData.redirectUris.filter((u) => u).length === 0
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Edit Client Modal
// =============================================================================

interface EditClientModalProps {
  clientId: number;
  onClose: () => void;
  onSubmit: (data: Partial<ClientFormData> & { isActive?: boolean }) => void;
  isLoading: boolean;
}

function EditClientModal({ clientId, onClose, onSubmit, isLoading }: EditClientModalProps) {
  const { data: client, isLoading: loadingClient } = trpc.oauthClient.get.useQuery({
    id: clientId,
  });

  const [formData, setFormData] = useState<Partial<ClientFormData> & { isActive?: boolean }>({});

  if (loadingClient || !client) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-card rounded-lg shadow-xl p-6">Loading...</div>
      </div>
    );
  }

  const handleRedirectUriChange = (index: number, value: string) => {
    const currentUris = formData.redirectUris || client.redirectUris;
    const newUris = [...currentUris];
    newUris[index] = value;
    setFormData((prev) => ({ ...prev, redirectUris: newUris }));
  };

  const addRedirectUri = () => {
    const currentUris = formData.redirectUris || client.redirectUris;
    setFormData((prev) => ({ ...prev, redirectUris: [...currentUris, ''] }));
  };

  const removeRedirectUri = (index: number) => {
    const currentUris = formData.redirectUris || client.redirectUris;
    setFormData((prev) => ({
      ...prev,
      redirectUris: currentUris.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changes: Partial<ClientFormData> & { isActive?: boolean } = {};
    if (formData.clientName && formData.clientName !== client.clientName) {
      changes.clientName = formData.clientName;
    }
    if (formData.redirectUris) {
      changes.redirectUris = formData.redirectUris.filter((uri) => uri.trim() !== '');
    }
    if (formData.scope && formData.scope !== client.scope) {
      changes.scope = formData.scope;
    }
    if (formData.clientUri !== undefined && formData.clientUri !== client.clientUri) {
      changes.clientUri = formData.clientUri;
    }
    if (formData.isActive !== undefined && formData.isActive !== client.isActive) {
      changes.isActive = formData.isActive;
    }
    onSubmit(changes);
  };

  const currentUris = formData.redirectUris || client.redirectUris;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Edit OAuth Client</h2>
            <code className="text-xs text-muted-foreground">{client.clientId}</code>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Client Name</label>
            <input
              type="text"
              value={formData.clientName ?? client.clientName}
              onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Auth Method (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Authentication Method
            </label>
            <div className="px-3 py-2 bg-surface-1 rounded-lg text-muted-foreground">
              {AUTH_METHOD_CONFIG[client.tokenEndpointAuthMethod as AuthMethod]?.label ||
                client.tokenEndpointAuthMethod}
              <p className="text-xs mt-1">Cannot be changed after creation</p>
            </div>
          </div>

          {/* Redirect URIs */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Redirect URIs</label>
            <div className="space-y-2">
              {currentUris.map((uri, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={uri}
                    onChange={(e) => handleRedirectUriChange(index, e.target.value)}
                    placeholder="https://example.com/callback"
                    required={index === 0}
                    className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {currentUris.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRedirectUri(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRedirectUri}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              + Add another redirect URI
            </button>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Scope</label>
            <input
              type="text"
              value={formData.scope ?? client.scope ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, scope: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Client URI */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Client URI (optional)
            </label>
            <input
              type="url"
              value={formData.clientUri ?? client.clientUri ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, clientUri: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive ?? client.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-2 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-foreground">Active</span>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-foreground hover:bg-surface-1 rounded-lg transition-colors"
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
  );
}

// =============================================================================
// Secret Modal (shown after creation or regeneration)
// =============================================================================

interface SecretModalProps {
  clientId: string;
  clientSecret: string;
  onClose: () => void;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}

function SecretModal({ clientId, clientSecret, onClose, onCopy, copiedField }: SecretModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Client Credentials</h2>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Save these credentials now. The secret will not be shown again!
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Client ID */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Client ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-surface-1 rounded-lg font-mono text-sm break-all">
                {clientId}
              </code>
              <button
                onClick={() => onCopy(clientId, 'modal-clientId')}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedField === 'modal-clientId' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <CopyIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Client Secret */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Client Secret</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg font-mono text-sm break-all text-amber-800 dark:text-amber-200">
                {clientSecret}
              </code>
              <button
                onClick={() => onCopy(clientSecret, 'modal-clientSecret')}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedField === 'modal-clientSecret' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <CopyIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            I have saved the credentials
          </button>
        </div>
      </div>
    </div>
  );
}

export default McpServicesPage;
