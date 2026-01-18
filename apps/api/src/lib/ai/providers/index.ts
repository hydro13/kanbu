/**
 * AI Providers Module
 *
 * Unified interface for AI provider management.
 * Supports OpenAI, Ollama, and LM Studio with automatic fallback.
 *
 * Usage:
 * ```typescript
 * import { getProviderRegistry, createSimpleOpenAiProvider } from '@/lib/ai/providers'
 *
 * // Using registry (recommended for production)
 * const registry = getProviderRegistry(prisma)
 * const embeddingProvider = await registry.getEmbeddingProvider({ workspaceId: 1 })
 * const embedding = await embeddingProvider?.embed('Hello world')
 *
 * // Simple usage (for testing/scripts)
 * const openai = createSimpleOpenAiProvider('sk-...')
 * const embedding = await openai.embed('Hello world')
 * ```
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

// Types
export {
  type AiProviderType,
  type AiCapability,
  type ProviderConfig,
  type ConnectionTestResult,
  type ModelInfo,
  type ChatMessage,
  type ChatMessageContent,
  type ReasoningOptions,
  type ExtractedEntity,
  type AiProvider,
  type EmbeddingProvider,
  type ReasoningProvider,
  type VisionProvider,
  type FullProvider,
  ProviderError,
  type ProviderErrorCode,
  DEFAULT_MODELS,
  DEFAULT_URLS,
  EMBEDDING_DIMENSIONS,
} from './types';

// Base class (for extension)
export { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider';

// Provider implementations
export { OpenAiProvider, createOpenAiProvider } from './OpenAiProvider';
export { OllamaProvider, createOllamaProvider } from './OllamaProvider';
export { LmStudioProvider, createLmStudioProvider } from './LmStudioProvider';

// Factory functions
export {
  createProvider,
  createEmbeddingProvider,
  createReasoningProvider,
  createVisionProvider,
  createSimpleOpenAiProvider,
  createSimpleOllamaProvider,
  createSimpleLmStudioProvider,
  getDefaultUrl,
  requiresApiKey,
  getSupportedProviderTypes,
  getSupportedCapabilities,
  type AiProviderConfigRecord,
} from './factory';

// Registry (singleton)
export { ProviderRegistry, getProviderRegistry, resetProviderRegistry } from './registry';
