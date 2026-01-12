/**
 * Ollama Provider Implementation
 *
 * Local provider using Ollama server with OpenAI-compatible API.
 * Supports all three capabilities: Embedding, Reasoning, Vision.
 *
 * Default URL: http://localhost:11434/v1
 *
 * Default models:
 * - Embedding: nomic-embed-text (768 dim)
 * - Reasoning: llama3.2:8b
 * - Vision: llava:7b (requires 8GB+ VRAM)
 *
 * IMPORTANT: Ollama default num_ctx is 2048, which is too small!
 * For Kanbu/Graphiti, num_ctx should be 8192+.
 * Set via: OLLAMA_CONTEXT_LENGTH=8192 or per-model configuration.
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider'
import {
  type AiProviderType,
  type AiCapability,
  type ProviderConfig,
  type ConnectionTestResult,
  DEFAULT_MODELS,
  DEFAULT_URLS,
} from './types'

export class OllamaProvider extends OpenAiCompatibleProvider {
  readonly type: AiProviderType = 'OLLAMA'
  readonly capabilities: AiCapability[] = ['EMBEDDING', 'REASONING', 'VISION']

  constructor(config?: Partial<ProviderConfig>) {
    super({
      type: 'OLLAMA',
      baseUrl: config?.baseUrl || DEFAULT_URLS.OLLAMA,
      apiKey: null, // Ollama doesn't require API key
      embeddingModel: config?.embeddingModel,
      reasoningModel: config?.reasoningModel,
      visionModel: config?.visionModel,
    })
  }

  protected getDefaultEmbeddingModel(): string {
    return DEFAULT_MODELS.OLLAMA.embedding
  }

  protected getDefaultReasoningModel(): string {
    return DEFAULT_MODELS.OLLAMA.reasoning
  }

  protected getDefaultVisionModel(): string {
    return DEFAULT_MODELS.OLLAMA.vision
  }

  /**
   * Enhanced connection test that also checks Ollama-specific endpoint
   */
  async testConnection(): Promise<ConnectionTestResult> {
    // First try the standard OpenAI-compatible endpoint
    const result = await super.testConnection()

    // If that fails, try the native Ollama endpoint
    if (!result.success) {
      const ollamaUrl = this.baseUrl.replace('/v1', '')
      const startTime = Date.now()

      try {
        const response = await fetch(`${ollamaUrl}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
        })

        const latencyMs = Date.now() - startTime

        if (response.ok) {
          const data = (await response.json()) as {
            models?: Array<{ name: string }>
          }
          const models = data.models?.map((m) => m.name) || []

          return {
            success: true,
            latencyMs,
            models,
          }
        }
      } catch {
        // Fall through to return original error
      }
    }

    return result
  }

  /**
   * Check if a specific model is available locally
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    const ollamaUrl = this.baseUrl.replace('/v1', '')

    try {
      const response = await fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) return false

      const data = (await response.json()) as {
        models?: Array<{ name: string }>
      }

      return data.models?.some((m) => m.name === modelName || m.name.startsWith(modelName + ':')) || false
    } catch {
      return false
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    const ollamaUrl = this.baseUrl.replace('/v1', '')

    const response = await fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal: AbortSignal.timeout(600000), // 10 minutes for large models
    })

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to pull model ${modelName}: ${error}`)
    }

    // Stream the response to handle progress (but don't process it for now)
    const reader = response.body?.getReader()
    if (reader) {
      while (true) {
        const { done } = await reader.read()
        if (done) break
      }
      reader.releaseLock()
    }
  }

  /**
   * Get hardware info from Ollama
   */
  async getHardwareInfo(): Promise<{
    gpu?: string
    vram?: number
    cpuThreads?: number
  }> {
    const ollamaUrl = this.baseUrl.replace('/v1', '')

    try {
      const response = await fetch(`${ollamaUrl}/api/ps`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return {}

      // Parse response (data available for future use)
      const _data = (await response.json()) as {
        models?: Array<{
          name: string
          size?: number
          digest?: string
        }>
      }

      // Ollama doesn't directly expose hardware info via API
      // This is a placeholder for future implementation
      void _data // Suppress unused variable warning
      return {}
    } catch {
      return {}
    }
  }
}

/**
 * Create an Ollama provider instance
 */
export function createOllamaProvider(
  config?: Partial<ProviderConfig>
): OllamaProvider {
  return new OllamaProvider(config)
}
