/**
 * LM Studio Provider Implementation
 *
 * Local provider using LM Studio server with OpenAI-compatible API.
 * Supports all three capabilities: Embedding, Reasoning, Vision.
 *
 * Default URL: http://localhost:1234/v1
 *
 * Default models (same as Ollama, uses GGUF format):
 * - Embedding: nomic-embed-text (768 dim)
 * - Reasoning: llama3.2:8b
 * - Vision: llava:7b
 *
 * LM Studio differences from Ollama:
 * - GUI-based application (no true headless mode)
 * - Better Vulkan support (integrated GPUs)
 * - MLX engine for Apple Silicon
 * - Model browser with 1000+ pre-configured models
 * - ~20% slower than Ollama on same hardware
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider'
import {
  type AiProviderType,
  type AiCapability,
  type ProviderConfig,
  DEFAULT_MODELS,
  DEFAULT_URLS,
} from './types'

export class LmStudioProvider extends OpenAiCompatibleProvider {
  readonly type: AiProviderType = 'LM_STUDIO'
  readonly capabilities: AiCapability[] = ['EMBEDDING', 'REASONING', 'VISION']

  constructor(config?: Partial<ProviderConfig>) {
    super({
      type: 'LM_STUDIO',
      baseUrl: config?.baseUrl || DEFAULT_URLS.LM_STUDIO,
      apiKey: null, // LM Studio doesn't require API key
      embeddingModel: config?.embeddingModel,
      reasoningModel: config?.reasoningModel,
      visionModel: config?.visionModel,
    })
  }

  protected getDefaultEmbeddingModel(): string {
    return DEFAULT_MODELS.LM_STUDIO.embedding
  }

  protected getDefaultReasoningModel(): string {
    return DEFAULT_MODELS.LM_STUDIO.reasoning
  }

  protected getDefaultVisionModel(): string {
    return DEFAULT_MODELS.LM_STUDIO.vision
  }

  /**
   * Get currently loaded model in LM Studio
   * LM Studio typically loads one model at a time
   */
  async getCurrentModel(): Promise<string | null> {
    try {
      const models = await this.listModels()
      // LM Studio returns the currently loaded model
      const firstModel = models[0]
      return firstModel ? firstModel.id : null
    } catch {
      return null
    }
  }

  /**
   * Check if LM Studio server is running
   * Unlike Ollama, LM Studio requires the GUI to be open
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const result = await this.testConnection()
      return result.success
    } catch {
      return false
    }
  }
}

/**
 * Create an LM Studio provider instance
 */
export function createLmStudioProvider(
  config?: Partial<ProviderConfig>
): LmStudioProvider {
  return new LmStudioProvider(config)
}
