/**
 * AI Provider Unit Tests
 *
 * Tests for all AI providers: OpenAI, Ollama, LM Studio
 * Uses mocked fetch to avoid real API calls.
 *
 * Fase 14.5 - Testing & Validation
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OpenAiProvider } from '../OpenAiProvider'
import { OllamaProvider } from '../OllamaProvider'
import { LmStudioProvider } from '../LmStudioProvider'
import {
  createProvider,
  createEmbeddingProvider,
  createReasoningProvider,
  createSimpleOpenAiProvider,
  createSimpleOllamaProvider,
  createSimpleLmStudioProvider,
  getDefaultUrl,
  requiresApiKey,
} from '../factory'
import {
  ProviderError,
  DEFAULT_MODELS,
  DEFAULT_URLS,
  EMBEDDING_DIMENSIONS,
} from '../types'

// =============================================================================
// Mock Setup
// =============================================================================

const mockFetch = vi.fn()
global.fetch = mockFetch

function createMockResponse(data: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    body: null,
  }
}

function createMockModelsResponse(models: string[]) {
  return createMockResponse({
    data: models.map((id) => ({ id, owned_by: 'test' })),
  })
}

function createMockEmbeddingResponse(embedding: number[]) {
  return createMockResponse({
    data: [{ embedding, index: 0 }],
  })
}

function createMockChatResponse(content: string) {
  return createMockResponse({
    choices: [{ message: { content } }],
  })
}

// =============================================================================
// OpenAiProvider Tests
// =============================================================================

describe('OpenAiProvider', () => {
  let provider: OpenAiProvider

  beforeEach(() => {
    mockFetch.mockReset()
    provider = new OpenAiProvider({ apiKey: 'test-api-key' })
  })

  describe('constructor', () => {
    it('should use default URL when not provided', () => {
      expect(provider.baseUrl).toBe(DEFAULT_URLS.OPENAI)
    })

    it('should use custom URL when provided', () => {
      const customProvider = new OpenAiProvider({
        apiKey: 'test',
        baseUrl: 'https://custom.api.com/v1',
      })
      expect(customProvider.baseUrl).toBe('https://custom.api.com/v1')
    })

    it('should strip trailing slash from baseUrl', () => {
      const customProvider = new OpenAiProvider({
        apiKey: 'test',
        baseUrl: 'https://custom.api.com/v1/',
      })
      expect(customProvider.baseUrl).toBe('https://custom.api.com/v1')
    })

    it('should have correct type', () => {
      expect(provider.type).toBe('OPENAI')
    })

    it('should support all capabilities', () => {
      expect(provider.capabilities).toContain('EMBEDDING')
      expect(provider.capabilities).toContain('REASONING')
      expect(provider.capabilities).toContain('VISION')
    })
  })

  describe('hasCapability', () => {
    it('should return true for supported capabilities', () => {
      expect(provider.hasCapability('EMBEDDING')).toBe(true)
      expect(provider.hasCapability('REASONING')).toBe(true)
      expect(provider.hasCapability('VISION')).toBe(true)
    })
  })

  describe('testConnection', () => {
    it('should return success when API responds', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockModelsResponse(['gpt-4o-mini', 'text-embedding-3-small'])
      )

      const result = await provider.testConnection()

      expect(result.success).toBe(true)
      expect(result.models).toContain('gpt-4o-mini')
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should return failure when API returns error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Unauthorized' }, 401, false)
      )

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('401')
    })

    it('should return failure when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('listModels', () => {
    it('should return list of models', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockModelsResponse([
          'gpt-4o-mini',
          'text-embedding-3-small',
          'gpt-4o',
        ])
      )

      const models = await provider.listModels()

      expect(models.length).toBe(3)
      expect(models[0].id).toBe('gpt-4o-mini')
    })

    it('should filter models by capability', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockModelsResponse([
          'gpt-4o-mini',
          'text-embedding-3-small',
          'llava:7b',
        ])
      )

      const models = await provider.listModels('EMBEDDING')

      // Should include embedding models (text-embedding-3-small categorizes as 'embedding')
      const embeddingModels = models.filter((m) => m.type === 'embedding')
      expect(embeddingModels.length).toBeGreaterThan(0)
    })

    it('should throw ProviderError on failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Server error' }, 500, false)
      )

      await expect(provider.listModels()).rejects.toThrow(ProviderError)
    })
  })

  describe('embed', () => {
    it('should return embedding vector', async () => {
      const mockEmbedding = Array(1536).fill(0.1)
      mockFetch.mockResolvedValueOnce(createMockEmbeddingResponse(mockEmbedding))

      const embedding = await provider.embed('Test text')

      expect(embedding).toHaveLength(1536)
      expect(embedding[0]).toBe(0.1)
    })

    it('should use default embedding model', async () => {
      const mockEmbedding = Array(1536).fill(0.1)
      mockFetch.mockResolvedValueOnce(createMockEmbeddingResponse(mockEmbedding))

      await provider.embed('Test text')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/embeddings'),
        expect.objectContaining({
          body: expect.stringContaining(DEFAULT_MODELS.OPENAI.embedding),
        })
      )
    })

    it('should throw ProviderError on auth failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Unauthorized' }, 401, false)
      )

      await expect(provider.embed('Test')).rejects.toThrow(ProviderError)
    })
  })

  describe('embedBatch', () => {
    it('should return multiple embeddings', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { embedding: Array(1536).fill(0.1), index: 0 },
            { embedding: Array(1536).fill(0.2), index: 1 },
          ],
        })
      )

      const embeddings = await provider.embedBatch(['Text 1', 'Text 2'])

      expect(embeddings).toHaveLength(2)
      expect(embeddings[0][0]).toBe(0.1)
      expect(embeddings[1][0]).toBe(0.2)
    })

    it('should sort embeddings by index', async () => {
      // Simulate out-of-order response
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          data: [
            { embedding: Array(1536).fill(0.2), index: 1 },
            { embedding: Array(1536).fill(0.1), index: 0 },
          ],
        })
      )

      const embeddings = await provider.embedBatch(['Text 1', 'Text 2'])

      expect(embeddings[0][0]).toBe(0.1)
      expect(embeddings[1][0]).toBe(0.2)
    })
  })

  describe('getDimensions', () => {
    it('should return correct dimensions for default model', () => {
      expect(provider.getDimensions()).toBe(
        EMBEDDING_DIMENSIONS['text-embedding-3-small']
      )
    })

    it('should return correct dimensions for custom model', () => {
      const customProvider = new OpenAiProvider({
        apiKey: 'test',
        embeddingModel: 'text-embedding-3-large',
      })
      expect(customProvider.getDimensions()).toBe(
        EMBEDDING_DIMENSIONS['text-embedding-3-large']
      )
    })
  })

  describe('chat', () => {
    it('should return chat response', async () => {
      mockFetch.mockResolvedValueOnce(createMockChatResponse('Hello!'))

      const response = await provider.chat([
        { role: 'user', content: 'Hi' },
      ])

      expect(response).toBe('Hello!')
    })

    it('should use default reasoning model', async () => {
      mockFetch.mockResolvedValueOnce(createMockChatResponse('Response'))

      await provider.chat([{ role: 'user', content: 'Test' }])

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringContaining(DEFAULT_MODELS.OPENAI.reasoning),
        })
      )
    })

    it('should use custom model when provided in options', async () => {
      mockFetch.mockResolvedValueOnce(createMockChatResponse('Response'))

      await provider.chat([{ role: 'user', content: 'Test' }], {
        model: 'gpt-4o',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringContaining('gpt-4o'),
        })
      )
    })

    it('should throw ProviderError on rate limit', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Rate limited' }, 429, false)
      )

      try {
        await provider.chat([{ role: 'user', content: 'Test' }])
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError)
        expect((error as ProviderError).code).toBe('RATE_LIMITED')
      }
    })
  })

  describe('summarize', () => {
    it('should return summarized text', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockChatResponse('This is a summary.')
      )

      const summary = await provider.summarize('Long text here...')

      expect(summary).toBe('This is a summary.')
    })
  })

  describe('extractEntities', () => {
    it('should return extracted entities', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockChatResponse(
          '[{"name": "John", "type": "person", "confidence": 0.9}]'
        )
      )

      const entities = await provider.extractEntities(
        'John is a developer',
        ['person', 'organization']
      )

      expect(entities).toHaveLength(1)
      expect(entities[0].name).toBe('John')
      expect(entities[0].type).toBe('person')
    })

    it('should return empty array on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockChatResponse('No entities found.')
      )

      const entities = await provider.extractEntities('No entities', [
        'person',
      ])

      expect(entities).toHaveLength(0)
    })
  })

  describe('describeImage', () => {
    it('should return image description', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockChatResponse('A beautiful sunset over the ocean.')
      )

      const description = await provider.describeImage('https://example.com/image.jpg')

      expect(description).toBe('A beautiful sunset over the ocean.')
    })

    it('should use vision model', async () => {
      mockFetch.mockResolvedValueOnce(createMockChatResponse('Description'))

      await provider.describeImage('https://example.com/image.jpg')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          body: expect.stringContaining(DEFAULT_MODELS.OPENAI.vision),
        })
      )
    })
  })
})

// =============================================================================
// OllamaProvider Tests
// =============================================================================

describe('OllamaProvider', () => {
  let provider: OllamaProvider

  beforeEach(() => {
    mockFetch.mockReset()
    provider = new OllamaProvider({})
  })

  describe('constructor', () => {
    it('should use default URL when not provided', () => {
      expect(provider.baseUrl).toBe(DEFAULT_URLS.OLLAMA)
    })

    it('should have correct type', () => {
      expect(provider.type).toBe('OLLAMA')
    })

    it('should support all capabilities', () => {
      expect(provider.capabilities).toContain('EMBEDDING')
      expect(provider.capabilities).toContain('REASONING')
      expect(provider.capabilities).toContain('VISION')
    })
  })

  describe('testConnection', () => {
    it('should use native /api/tags as fallback', async () => {
      // First call to /v1/models fails
      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, 404, false)
      )
      // Fallback to native Ollama API
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          models: [
            { name: 'llama3.2:8b' },
            { name: 'nomic-embed-text' },
          ],
        })
      )

      const result = await provider.testConnection()

      expect(result.success).toBe(true)
      expect(result.models).toContain('llama3.2:8b')
    })

    it('should return failure when both endpoints fail', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, 404, false))
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
    })
  })

  describe('getModelName', () => {
    it('should return default Ollama embedding model', () => {
      expect(provider.getModelName()).toBe(DEFAULT_MODELS.OLLAMA.embedding)
    })
  })

  describe('getReasoningModel', () => {
    it('should return default Ollama reasoning model', () => {
      expect(provider.getReasoningModel()).toBe(DEFAULT_MODELS.OLLAMA.reasoning)
    })
  })
})

// =============================================================================
// LmStudioProvider Tests
// =============================================================================

describe('LmStudioProvider', () => {
  let provider: LmStudioProvider

  beforeEach(() => {
    mockFetch.mockReset()
    provider = new LmStudioProvider({})
  })

  describe('constructor', () => {
    it('should use default URL (port 1234)', () => {
      expect(provider.baseUrl).toBe(DEFAULT_URLS.LM_STUDIO)
      expect(provider.baseUrl).toContain(':1234')
    })

    it('should have correct type', () => {
      expect(provider.type).toBe('LM_STUDIO')
    })
  })

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockModelsResponse(['llama3.2:8b', 'nomic-embed-text'])
      )

      const result = await provider.testConnection()

      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// Factory Tests
// =============================================================================

// Helper to create a mock AiProviderConfigRecord
function createMockConfig(
  overrides: Partial<{
    id: number
    providerType: 'OPENAI' | 'OLLAMA' | 'LM_STUDIO'
    name: string
    isActive: boolean
    priority: number
    capabilities: ('EMBEDDING' | 'REASONING' | 'VISION')[]
    baseUrl: string | null
    apiKey: string | null
    organizationId: string | null
    embeddingModel: string | null
    reasoningModel: string | null
    visionModel: string | null
    maxRequestsPerMinute: number | null
    maxTokensPerMinute: number | null
  }> = {}
) {
  return {
    id: 1,
    providerType: 'OPENAI' as const,
    name: 'Test Provider',
    isActive: true,
    priority: 0,
    capabilities: ['EMBEDDING', 'REASONING', 'VISION'] as ('EMBEDDING' | 'REASONING' | 'VISION')[],
    baseUrl: null,
    apiKey: null,
    organizationId: null,
    embeddingModel: null,
    reasoningModel: null,
    visionModel: null,
    maxRequestsPerMinute: null,
    maxTokensPerMinute: null,
    ...overrides,
  }
}

describe('Factory Functions', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('createProvider', () => {
    it('should create OpenAI provider', () => {
      const provider = createProvider(
        createMockConfig({
          providerType: 'OPENAI',
          apiKey: 'test-key',
        })
      )

      expect(provider.type).toBe('OPENAI')
      expect(provider).toBeInstanceOf(OpenAiProvider)
    })

    it('should create Ollama provider', () => {
      const provider = createProvider(
        createMockConfig({
          providerType: 'OLLAMA',
        })
      )

      expect(provider.type).toBe('OLLAMA')
      expect(provider).toBeInstanceOf(OllamaProvider)
    })

    it('should create LM Studio provider', () => {
      const provider = createProvider(
        createMockConfig({
          providerType: 'LM_STUDIO',
        })
      )

      expect(provider.type).toBe('LM_STUDIO')
      expect(provider).toBeInstanceOf(LmStudioProvider)
    })

    it('should throw for missing OpenAI API key', () => {
      expect(() =>
        createProvider(
          createMockConfig({
            providerType: 'OPENAI',
            apiKey: null,
          })
        )
      ).toThrow('requires an API key')
    })
  })

  describe('createSimple* functions', () => {
    it('createSimpleOpenAiProvider should create provider with defaults', () => {
      const provider = createSimpleOpenAiProvider('test-key')
      expect(provider.type).toBe('OPENAI')
      expect(provider.baseUrl).toBe(DEFAULT_URLS.OPENAI)
    })

    it('createSimpleOllamaProvider should create provider with defaults', () => {
      const provider = createSimpleOllamaProvider()
      expect(provider.type).toBe('OLLAMA')
      expect(provider.baseUrl).toBe(DEFAULT_URLS.OLLAMA)
    })

    it('createSimpleLmStudioProvider should create provider with defaults', () => {
      const provider = createSimpleLmStudioProvider()
      expect(provider.type).toBe('LM_STUDIO')
      expect(provider.baseUrl).toBe(DEFAULT_URLS.LM_STUDIO)
    })

    it('createSimpleOllamaProvider should accept custom URL', () => {
      const provider = createSimpleOllamaProvider('http://custom:11434/v1')
      expect(provider.baseUrl).toBe('http://custom:11434/v1')
    })
  })

  describe('getDefaultUrl', () => {
    it('should return correct URLs for each provider type', () => {
      expect(getDefaultUrl('OPENAI')).toBe(DEFAULT_URLS.OPENAI)
      expect(getDefaultUrl('OLLAMA')).toBe(DEFAULT_URLS.OLLAMA)
      expect(getDefaultUrl('LM_STUDIO')).toBe(DEFAULT_URLS.LM_STUDIO)
    })
  })

  describe('requiresApiKey', () => {
    it('should return true for OpenAI', () => {
      expect(requiresApiKey('OPENAI')).toBe(true)
    })

    it('should return false for Ollama', () => {
      expect(requiresApiKey('OLLAMA')).toBe(false)
    })

    it('should return false for LM Studio', () => {
      expect(requiresApiKey('LM_STUDIO')).toBe(false)
    })
  })
})

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  let provider: OpenAiProvider

  beforeEach(() => {
    mockFetch.mockReset()
    provider = new OpenAiProvider({ apiKey: 'test' })
  })

  describe('ProviderError', () => {
    it('should include provider type in error', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Test error' }, 500, false)
      )

      try {
        await provider.embed('Test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError)
        expect((error as ProviderError).providerType).toBe('OPENAI')
      }
    })

    it('should include correct error code for auth failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Unauthorized' }, 401, false)
      )

      try {
        await provider.embed('Test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as ProviderError).code).toBe('AUTHENTICATION_FAILED')
      }
    })

    it('should include correct error code for rate limit', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Rate limited' }, 429, false)
      )

      try {
        await provider.chat([{ role: 'user', content: 'Test' }])
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as ProviderError).code).toBe('RATE_LIMITED')
      }
    })
  })

  describe('Network errors', () => {
    it('should handle fetch rejection gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await provider.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('Invalid response handling', () => {
    it('should handle invalid embedding response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: [] }) // Empty data
      )

      await expect(provider.embed('Test')).rejects.toThrow(ProviderError)
    })

    it('should handle missing models in response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({}) // No data field
      )

      const models = await provider.listModels()
      expect(models).toEqual([])
    })
  })
})

// =============================================================================
// Model Categorization Tests
// =============================================================================

describe('Model Categorization', () => {
  let provider: OpenAiProvider

  beforeEach(() => {
    mockFetch.mockReset()
    provider = new OpenAiProvider({ apiKey: 'test' })
  })

  it('should categorize embedding models correctly', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockModelsResponse([
        'text-embedding-3-small',
        'nomic-embed-text',
        'bge-large-en',
      ])
    )

    const models = await provider.listModels()
    expect(models.every((m) => m.type === 'embedding')).toBe(true)
  })

  it('should categorize reasoning models correctly', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockModelsResponse([
        'gpt-4o-mini',
        'llama3.2:8b',
        'mistral:7b',
        'qwen3:8b',
      ])
    )

    const models = await provider.listModels()
    expect(models.every((m) => m.type === 'reasoning')).toBe(true)
  })

  it('should categorize vision models correctly', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockModelsResponse(['llava:7b', 'moondream', 'bakllava'])
    )

    const models = await provider.listModels()
    expect(models.every((m) => m.type === 'vision')).toBe(true)
  })

  it('should mark unknown models as unknown', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockModelsResponse(['random-model-name'])
    )

    const models = await provider.listModels()
    expect(models[0].type).toBe('unknown')
  })
})
