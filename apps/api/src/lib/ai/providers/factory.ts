/**
 * AI Provider Factory
 *
 * Factory functions for creating AI provider instances from configuration.
 * Handles provider instantiation based on AiProviderConfig from database.
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

import { OpenAiProvider } from './OpenAiProvider';
import { OllamaProvider } from './OllamaProvider';
import { LmStudioProvider } from './LmStudioProvider';
import {
  type AiProvider,
  type AiProviderType,
  type AiCapability,
  type EmbeddingProvider,
  type ReasoningProvider,
  type VisionProvider,
  type ProviderConfig,
  ProviderError,
  DEFAULT_URLS,
} from './types';

// =============================================================================
// Database Config Type (matches Prisma AiProviderConfig)
// =============================================================================

export interface AiProviderConfigRecord {
  id: number;
  providerType: AiProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  capabilities: AiCapability[];
  baseUrl: string | null;
  apiKey: string | null;
  organizationId?: string | null;
  embeddingModel: string | null;
  reasoningModel: string | null;
  visionModel: string | null;
  maxRequestsPerMinute: number | null;
  maxTokensPerMinute: number | null;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a provider instance from database config
 */
export function createProvider(config: AiProviderConfigRecord): AiProvider {
  const providerConfig: ProviderConfig = {
    type: config.providerType,
    baseUrl: config.baseUrl || DEFAULT_URLS[config.providerType],
    apiKey: config.apiKey,
    organizationId: config.organizationId,
    embeddingModel: config.embeddingModel,
    reasoningModel: config.reasoningModel,
    visionModel: config.visionModel,
    maxRequestsPerMinute: config.maxRequestsPerMinute,
    maxTokensPerMinute: config.maxTokensPerMinute,
  };

  switch (config.providerType) {
    case 'OPENAI':
      if (!config.apiKey) {
        throw new ProviderError(
          'OpenAI provider requires an API key',
          'OPENAI',
          'AUTHENTICATION_FAILED'
        );
      }
      return new OpenAiProvider({
        ...providerConfig,
        apiKey: config.apiKey,
      });

    case 'OLLAMA':
      return new OllamaProvider(providerConfig);

    case 'LM_STUDIO':
      return new LmStudioProvider(providerConfig);

    default:
      throw new ProviderError(
        `Unknown provider type: ${config.providerType}`,
        config.providerType,
        'INVALID_REQUEST'
      );
  }
}

/**
 * Create an embedding provider from database config
 * Throws if config doesn't support EMBEDDING capability
 */
export function createEmbeddingProvider(config: AiProviderConfigRecord): EmbeddingProvider {
  if (!config.capabilities.includes('EMBEDDING')) {
    throw new ProviderError(
      `Provider ${config.name} does not support EMBEDDING capability`,
      config.providerType,
      'INVALID_REQUEST'
    );
  }

  return createProvider(config) as EmbeddingProvider;
}

/**
 * Create a reasoning provider from database config
 * Throws if config doesn't support REASONING capability
 */
export function createReasoningProvider(config: AiProviderConfigRecord): ReasoningProvider {
  if (!config.capabilities.includes('REASONING')) {
    throw new ProviderError(
      `Provider ${config.name} does not support REASONING capability`,
      config.providerType,
      'INVALID_REQUEST'
    );
  }

  return createProvider(config) as ReasoningProvider;
}

/**
 * Create a vision provider from database config
 * Returns null if config doesn't support VISION capability
 */
export function createVisionProvider(config: AiProviderConfigRecord): VisionProvider | null {
  if (!config.capabilities.includes('VISION')) {
    return null;
  }

  return createProvider(config) as VisionProvider;
}

// =============================================================================
// Simple Provider Creation (without database config)
// =============================================================================

/**
 * Create a simple OpenAI provider with just an API key
 */
export function createSimpleOpenAiProvider(apiKey: string): OpenAiProvider {
  return new OpenAiProvider({ apiKey });
}

/**
 * Create a simple Ollama provider with default or custom URL
 */
export function createSimpleOllamaProvider(baseUrl?: string): OllamaProvider {
  return new OllamaProvider(baseUrl ? { baseUrl } : undefined);
}

/**
 * Create a simple LM Studio provider with default or custom URL
 */
export function createSimpleLmStudioProvider(baseUrl?: string): LmStudioProvider {
  return new LmStudioProvider(baseUrl ? { baseUrl } : undefined);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get default URL for a provider type
 */
export function getDefaultUrl(providerType: AiProviderType): string {
  return DEFAULT_URLS[providerType];
}

/**
 * Check if a provider type requires an API key
 */
export function requiresApiKey(providerType: AiProviderType): boolean {
  return providerType === 'OPENAI';
}

/**
 * Get all supported provider types
 */
export function getSupportedProviderTypes(): AiProviderType[] {
  return ['OPENAI', 'OLLAMA', 'LM_STUDIO'];
}

/**
 * Get all supported capabilities
 */
export function getSupportedCapabilities(): AiCapability[] {
  return ['EMBEDDING', 'REASONING', 'VISION'];
}
