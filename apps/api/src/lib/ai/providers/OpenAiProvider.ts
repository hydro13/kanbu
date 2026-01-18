/**
 * OpenAI Provider Implementation
 *
 * Cloud-based provider using OpenAI API.
 * Supports all three capabilities: Embedding, Reasoning, Vision.
 *
 * Default models:
 * - Embedding: text-embedding-3-small (1536 dim)
 * - Reasoning: gpt-4o-mini
 * - Vision: gpt-4o
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider';
import {
  type AiProviderType,
  type AiCapability,
  type ProviderConfig,
  DEFAULT_MODELS,
  DEFAULT_URLS,
} from './types';

export class OpenAiProvider extends OpenAiCompatibleProvider {
  readonly type: AiProviderType = 'OPENAI';
  readonly capabilities: AiCapability[] = ['EMBEDDING', 'REASONING', 'VISION'];

  constructor(config: Partial<ProviderConfig> & { apiKey: string }) {
    super({
      type: 'OPENAI',
      baseUrl: config.baseUrl || DEFAULT_URLS.OPENAI,
      apiKey: config.apiKey,
      organizationId: config.organizationId,
      embeddingModel: config.embeddingModel,
      reasoningModel: config.reasoningModel,
      visionModel: config.visionModel,
      maxRequestsPerMinute: config.maxRequestsPerMinute,
      maxTokensPerMinute: config.maxTokensPerMinute,
    });
  }

  protected getDefaultEmbeddingModel(): string {
    return DEFAULT_MODELS.OPENAI.embedding;
  }

  protected getDefaultReasoningModel(): string {
    return DEFAULT_MODELS.OPENAI.reasoning;
  }

  protected getDefaultVisionModel(): string {
    return DEFAULT_MODELS.OPENAI.vision;
  }
}

/**
 * Create an OpenAI provider instance
 */
export function createOpenAiProvider(
  config: Partial<ProviderConfig> & { apiKey: string }
): OpenAiProvider {
  return new OpenAiProvider(config);
}
