/**
 * Wiki AI Service
 *
 * Service for AI-powered Wiki features using Fase 14 providers.
 * Provides embeddings, entity extraction, and text operations for Wiki pages.
 *
 * Fase 15.1 - Provider Koppeling
 */

import type { PrismaClient } from '@prisma/client'
import { getProviderRegistry, type ProviderRegistry } from '../providers/registry'
import type {
  EmbeddingProvider,
  ReasoningProvider,
  ExtractedEntity,
} from '../providers/types'

// =============================================================================
// Types
// =============================================================================

export interface WikiContext {
  workspaceId: number
  projectId?: number
}

export interface EmbeddingResult {
  text: string
  embedding: number[]
  dimensions: number
  model: string
  provider: string
}

export interface EntityExtractionResult {
  entities: ExtractedEntity[]
  provider: string
  model: string
}

export interface SummarizeResult {
  summary: string
  originalLength: number
  summaryLength: number
  provider: string
}

export interface WikiAiCapabilities {
  embedding: boolean
  reasoning: boolean
  embeddingProvider?: string
  embeddingModel?: string
  reasoningProvider?: string
  reasoningModel?: string
}

// =============================================================================
// Wiki AI Service Class
// =============================================================================

export class WikiAiService {
  private registry: ProviderRegistry

  constructor(prisma: PrismaClient) {
    this.registry = getProviderRegistry(prisma)
  }

  // ===========================================================================
  // Capability Check
  // ===========================================================================

  /**
   * Check what AI capabilities are available for a wiki context
   */
  async getCapabilities(context: WikiContext): Promise<WikiAiCapabilities> {
    const [embeddingProvider, reasoningProvider] = await Promise.all([
      this.registry.getEmbeddingProvider({
        workspaceId: context.workspaceId,
        projectId: context.projectId,
      }),
      this.registry.getReasoningProvider({
        workspaceId: context.workspaceId,
        projectId: context.projectId,
      }),
    ])

    return {
      embedding: embeddingProvider !== null,
      reasoning: reasoningProvider !== null,
      embeddingProvider: embeddingProvider?.type,
      embeddingModel: embeddingProvider?.getModelName(),
      reasoningProvider: reasoningProvider?.type,
      reasoningModel: reasoningProvider?.getReasoningModel(),
    }
  }

  /**
   * Test if AI services are available and working for a context
   */
  async testConnection(context: WikiContext): Promise<{
    embedding: { available: boolean; latencyMs?: number; error?: string }
    reasoning: { available: boolean; latencyMs?: number; error?: string }
  }> {
    const [embeddingProvider, reasoningProvider] = await Promise.all([
      this.registry.getEmbeddingProvider({
        workspaceId: context.workspaceId,
        projectId: context.projectId,
      }),
      this.registry.getReasoningProvider({
        workspaceId: context.workspaceId,
        projectId: context.projectId,
      }),
    ])

    const results = {
      embedding: { available: false } as {
        available: boolean
        latencyMs?: number
        error?: string
      },
      reasoning: { available: false } as {
        available: boolean
        latencyMs?: number
        error?: string
      },
    }

    if (embeddingProvider) {
      const testResult = await embeddingProvider.testConnection()
      results.embedding = {
        available: testResult.success,
        latencyMs: testResult.latencyMs ?? undefined,
        error: testResult.error,
      }
    }

    if (reasoningProvider) {
      const testResult = await reasoningProvider.testConnection()
      results.reasoning = {
        available: testResult.success,
        latencyMs: testResult.latencyMs ?? undefined,
        error: testResult.error,
      }
    }

    return results
  }

  // ===========================================================================
  // Embedding Operations
  // ===========================================================================

  /**
   * Get embedding for a single text
   */
  async embed(context: WikiContext, text: string): Promise<EmbeddingResult> {
    const provider = await this.getEmbeddingProviderOrThrow(context)

    const embedding = await provider.embed(text)

    return {
      text,
      embedding,
      dimensions: provider.getDimensions(),
      model: provider.getModelName(),
      provider: provider.type,
    }
  }

  /**
   * Get embeddings for multiple texts (batched)
   */
  async embedBatch(
    context: WikiContext,
    texts: string[]
  ): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return []

    const provider = await this.getEmbeddingProviderOrThrow(context)

    const embeddings = await provider.embedBatch(texts)

    return texts.map((text, i) => ({
      text,
      embedding: embeddings[i] ?? [],
      dimensions: provider.getDimensions(),
      model: provider.getModelName(),
      provider: provider.type,
    }))
  }

  /**
   * Get the embedding provider info for a context
   */
  async getEmbeddingInfo(context: WikiContext): Promise<{
    available: boolean
    provider?: string
    model?: string
    dimensions?: number
  }> {
    const provider = await this.registry.getEmbeddingProvider({
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    })

    if (!provider) {
      return { available: false }
    }

    return {
      available: true,
      provider: provider.type,
      model: provider.getModelName(),
      dimensions: provider.getDimensions(),
    }
  }

  // ===========================================================================
  // Entity Extraction
  // ===========================================================================

  /**
   * Extract entities from wiki page content
   * Uses the configured reasoning provider for LLM-based extraction
   */
  async extractEntities(
    context: WikiContext,
    text: string,
    entityTypes: string[] = ['WikiPage', 'Task', 'User', 'Project', 'Concept']
  ): Promise<EntityExtractionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const entities = await provider.extractEntities(text, entityTypes)

    return {
      entities,
      provider: provider.type,
      model: provider.getReasoningModel(),
    }
  }

  // ===========================================================================
  // Text Operations
  // ===========================================================================

  /**
   * Summarize wiki page content
   */
  async summarize(
    context: WikiContext,
    text: string,
    maxLength?: number
  ): Promise<SummarizeResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const summary = await provider.summarize(text, maxLength)

    return {
      summary,
      originalLength: text.length,
      summaryLength: summary.length,
      provider: provider.type,
    }
  }

  /**
   * Generate a response using the reasoning provider
   */
  async chat(
    context: WikiContext,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    const provider = await this.getReasoningProviderOrThrow(context)

    return provider.chat(messages, options)
  }

  /**
   * Stream a response using the reasoning provider
   */
  async *stream(
    context: WikiContext,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<string> {
    const provider = await this.getReasoningProviderOrThrow(context)

    yield* provider.stream(messages, options)
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async getEmbeddingProviderOrThrow(
    context: WikiContext
  ): Promise<EmbeddingProvider> {
    const provider = await this.registry.getEmbeddingProvider({
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    })

    if (!provider) {
      throw new WikiAiError(
        'No embedding provider configured for this context',
        'NO_EMBEDDING_PROVIDER'
      )
    }

    return provider
  }

  private async getReasoningProviderOrThrow(
    context: WikiContext
  ): Promise<ReasoningProvider> {
    const provider = await this.registry.getReasoningProvider({
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    })

    if (!provider) {
      throw new WikiAiError(
        'No reasoning provider configured for this context',
        'NO_REASONING_PROVIDER'
      )
    }

    return provider
  }
}

// =============================================================================
// Error Class
// =============================================================================

export class WikiAiError extends Error {
  constructor(
    message: string,
    public code:
      | 'NO_EMBEDDING_PROVIDER'
      | 'NO_REASONING_PROVIDER'
      | 'PROVIDER_ERROR'
      | 'INVALID_INPUT'
  ) {
    super(message)
    this.name = 'WikiAiError'
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let serviceInstance: WikiAiService | null = null

/**
 * Get or create the singleton WikiAiService
 */
export function getWikiAiService(prisma: PrismaClient): WikiAiService {
  if (!serviceInstance) {
    serviceInstance = new WikiAiService(prisma)
  }
  return serviceInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetWikiAiService(): void {
  serviceInstance = null
}
