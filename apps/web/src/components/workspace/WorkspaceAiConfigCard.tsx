/*
 * WorkspaceAiConfigCard Component
 * Version: 1.0.0
 *
 * Displays effective AI provider configuration for a workspace.
 * Shows inheritance from global providers and allows overrides.
 *
 * Fase: 14.4 - Workspace & Project Overrides
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * =============================================================================
 */

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { trpc } from '../../lib/trpc';
import { cn } from '../../lib/utils';

// =============================================================================
// Types
// =============================================================================

type Capability = 'EMBEDDING' | 'REASONING' | 'VISION';
type ProviderType = 'OPENAI' | 'OLLAMA' | 'LM_STUDIO';

interface WorkspaceAiConfigCardProps {
  workspaceId: number;
  isAdmin: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function CpuIcon({ className }: { className?: string }) {
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
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
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

function ArrowPathIcon({ className }: { className?: string }) {
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
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function GlobeAltIcon({ className }: { className?: string }) {
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
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

function BuildingOfficeIcon({ className }: { className?: string }) {
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
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  );
}

// =============================================================================
// Config
// =============================================================================

const PROVIDER_CONFIG: Record<
  ProviderType,
  {
    label: string;
    color: string;
  }
> = {
  OPENAI: {
    label: 'OpenAI',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  OLLAMA: {
    label: 'Ollama',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  LM_STUDIO: {
    label: 'LM Studio',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

const CAPABILITY_CONFIG: Record<
  Capability,
  {
    label: string;
    description: string;
    icon: string;
  }
> = {
  EMBEDDING: {
    label: 'Embedding',
    description: 'Vector embeddings for search',
    icon: '🔍',
  },
  REASONING: {
    label: 'Reasoning',
    description: 'Text generation and analysis',
    icon: '🧠',
  },
  VISION: {
    label: 'Vision',
    description: 'Image understanding',
    icon: '👁️',
  },
};

// =============================================================================
// Component
// =============================================================================

export function WorkspaceAiConfigCard({ workspaceId, isAdmin }: WorkspaceAiConfigCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const utils = trpc.useUtils();

  // Query effective providers for all capabilities
  const { data, isLoading, error } = trpc.workspaceAiProvider.getEffectiveAll.useQuery(
    { workspaceId },
    { enabled: workspaceId > 0 }
  );

  // Query workspace providers list
  const providersQuery = trpc.workspaceAiProvider.list.useQuery(
    { workspaceId },
    { enabled: workspaceId > 0 && showDetails }
  );

  // Test connection mutation
  const testMutation = trpc.workspaceAiProvider.testConnection.useMutation();

  const handleTestConnection = (providerId: number) => {
    testMutation.mutate({ workspaceId, id: providerId });
  };

  // Check if any capability has a workspace override
  const hasAnyOverride = data && Object.values(data).some((v) => v.isOverride);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CpuIcon className="h-5 w-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CpuIcon className="h-5 w-5" />
            AI Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Failed to load AI configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CpuIcon className="h-5 w-5" />
            <div>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Providers for Wiki and Graphiti features</CardDescription>
            </div>
          </div>
          {hasAnyOverride && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
              <BuildingOfficeIcon className="h-3 w-3" />
              Custom
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capability summary */}
        <div className="grid gap-3">
          {(['EMBEDDING', 'REASONING', 'VISION'] as Capability[]).map((capability) => {
            const config = CAPABILITY_CONFIG[capability];
            const effective = data?.[capability];
            const provider = effective?.provider;
            const providerConfig = provider
              ? PROVIDER_CONFIG[provider.providerType as ProviderType]
              : null;

            return (
              <div
                key={capability}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{config.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider ? (
                    <>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded',
                          providerConfig?.color
                        )}
                      >
                        {providerConfig?.label}
                      </span>
                      {effective.isOverride ? (
                        <span title="Workspace override" className="text-amber-500">
                          <BuildingOfficeIcon className="h-4 w-4" />
                        </span>
                      ) : (
                        <span title="Using global provider" className="text-gray-400">
                          <GlobeAltIcon className="h-4 w-4" />
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not configured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expanded details */}
        {showDetails && providersQuery.data && (
          <div className="pt-4 border-t space-y-4">
            {/* Workspace Providers */}
            {providersQuery.data.workspaceProviders.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  Workspace Providers
                </h4>
                <div className="space-y-2">
                  {providersQuery.data.workspaceProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className={cn('p-3 rounded-lg border', !provider.isActive && 'opacity-50')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {provider.capabilities.join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {provider.isActive ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-gray-400" />
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestConnection(provider.id)}
                              disabled={testMutation.isPending}
                            >
                              <ArrowPathIcon
                                className={cn('h-4 w-4', testMutation.isPending && 'animate-spin')}
                              />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Global Providers (inherited) */}
            {providersQuery.data.globalProviders.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <GlobeAltIcon className="h-4 w-4" />
                  Global Providers (inherited)
                </h4>
                <div className="space-y-2">
                  {providersQuery.data.globalProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className={cn(
                        'p-3 rounded-lg border bg-muted/20',
                        !provider.isActive && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {provider.capabilities.join(', ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded',
                              PROVIDER_CONFIG[provider.providerType as ProviderType]?.color
                            )}
                          >
                            {PROVIDER_CONFIG[provider.providerType as ProviderType]?.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {providersQuery.data.workspaceProviders.length === 0 &&
              providersQuery.data.globalProviders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No AI providers configured. Contact your administrator.
                </p>
              )}
          </div>
        )}

        {/* Toggle details */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => utils.workspaceAiProvider.list.invalidate({ workspaceId })}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WorkspaceAiConfigCard;
