/**
 * AI Provider Types & Interfaces
 *
 * Defines the abstraction layer for AI providers supporting:
 * - OpenAI (cloud)
 * - Ollama (local)
 * - LM Studio (local/desktop)
 *
 * All providers implement OpenAI-compatible API structure.
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

// =============================================================================
// Core Types
// =============================================================================

export type AiProviderType = 'OPENAI' | 'OLLAMA' | 'LM_STUDIO'
export type AiCapability = 'EMBEDDING' | 'REASONING' | 'VISION'

export interface ProviderConfig {
  type: AiProviderType
  baseUrl: string
  apiKey?: string | null
  organizationId?: string | null
  embeddingModel?: string | null
  reasoningModel?: string | null
  visionModel?: string | null
  maxRequestsPerMinute?: number | null
  maxTokensPerMinute?: number | null
}

export interface ConnectionTestResult {
  success: boolean
  latencyMs: number | null
  error?: string
  models?: string[]
}

export interface ModelInfo {
  id: string
  type: 'embedding' | 'reasoning' | 'vision' | 'unknown'
  ownedBy?: string
}

// =============================================================================
// Chat Types
// =============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatMessageContent[]
}

export interface ChatMessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'auto' | 'low' | 'high'
  }
}

export interface ReasoningOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stop?: string[]
}

// =============================================================================
// Entity Extraction Types
// =============================================================================

export interface ExtractedEntity {
  name: string
  type: string
  confidence: number
  startIndex?: number
  endIndex?: number
  metadata?: Record<string, unknown>
}

// =============================================================================
// Provider Interfaces
// =============================================================================

/**
 * Base interface for all AI providers
 */
export interface AiProvider {
  readonly type: AiProviderType
  readonly capabilities: AiCapability[]
  readonly baseUrl: string

  /**
   * Test connection to the provider
   */
  testConnection(): Promise<ConnectionTestResult>

  /**
   * List available models, optionally filtered by capability
   */
  listModels(capability?: AiCapability): Promise<ModelInfo[]>

  /**
   * Check if provider supports a specific capability
   */
  hasCapability(capability: AiCapability): boolean
}

/**
 * Provider that supports text embeddings
 */
export interface EmbeddingProvider extends AiProvider {
  /**
   * Generate embedding for a single text
   */
  embed(text: string): Promise<number[]>

  /**
   * Generate embeddings for multiple texts (batch)
   */
  embedBatch(texts: string[]): Promise<number[][]>

  /**
   * Get the dimension of the embedding vectors
   */
  getDimensions(): number

  /**
   * Get the model name used for embeddings
   */
  getModelName(): string
}

/**
 * Provider that supports reasoning/chat completions
 */
export interface ReasoningProvider extends AiProvider {
  /**
   * Extract entities from text using LLM
   */
  extractEntities(text: string, entityTypes: string[]): Promise<ExtractedEntity[]>

  /**
   * Summarize text
   */
  summarize(text: string, maxLength?: number): Promise<string>

  /**
   * Chat completion (non-streaming)
   */
  chat(messages: ChatMessage[], options?: ReasoningOptions): Promise<string>

  /**
   * Chat completion (streaming)
   */
  stream(messages: ChatMessage[], options?: ReasoningOptions): AsyncIterable<string>

  /**
   * Get the model name used for reasoning
   */
  getReasoningModel(): string
}

/**
 * Provider that supports vision/image understanding
 */
export interface VisionProvider extends AiProvider {
  /**
   * Describe an image
   * @param image - Base64 encoded image or URL
   * @param prompt - Optional prompt for description
   */
  describeImage(image: string, prompt?: string): Promise<string>

  /**
   * Extract text from an image (OCR)
   * @param image - Base64 encoded image or URL
   */
  extractTextFromImage(image: string): Promise<string>

  /**
   * Get the model name used for vision
   */
  getVisionModel(): string
}

// =============================================================================
// Combined Provider Interface
// =============================================================================

/**
 * A provider that implements all capabilities
 */
export interface FullProvider extends EmbeddingProvider, ReasoningProvider, VisionProvider {}

// =============================================================================
// Provider Error Types
// =============================================================================

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerType: AiProviderType,
    public readonly code: ProviderErrorCode,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export type ProviderErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'MODEL_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'TIMEOUT'
  | 'UNKNOWN'

// =============================================================================
// Default Model Constants
// =============================================================================

export const DEFAULT_MODELS = {
  OPENAI: {
    embedding: 'text-embedding-3-small',
    reasoning: 'gpt-4o-mini',
    vision: 'gpt-4o',
  },
  OLLAMA: {
    embedding: 'nomic-embed-text',
    reasoning: 'llama3.2:8b',
    vision: 'llava:7b',
  },
  LM_STUDIO: {
    embedding: 'nomic-embed-text',
    reasoning: 'llama3.2:8b',
    vision: 'llava:7b',
  },
} as const

export const DEFAULT_URLS = {
  OPENAI: 'https://api.openai.com/v1',
  OLLAMA: 'http://localhost:11434/v1',
  LM_STUDIO: 'http://localhost:1234/v1',
} as const

export const EMBEDDING_DIMENSIONS = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'nomic-embed-text': 768,
  'bge-small-en': 384,
  'bge-base-en': 768,
  'bge-large-en': 1024,
} as const
