/**
 * OpenAI-Compatible Provider Base Class
 *
 * Base implementation for all providers using the OpenAI-compatible API.
 * OpenAI, Ollama, and LM Studio all implement this same API structure.
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

import {
  type AiProvider,
  type AiProviderType,
  type AiCapability,
  type ConnectionTestResult,
  type ModelInfo,
  type ChatMessage,
  type ReasoningOptions,
  type ExtractedEntity,
  type ProviderConfig,
  type EmbeddingProvider,
  type ReasoningProvider,
  type VisionProvider,
  ProviderError,
  EMBEDDING_DIMENSIONS,
} from './types'

// =============================================================================
// Base Provider Class
// =============================================================================

export abstract class OpenAiCompatibleProvider
  implements AiProvider, EmbeddingProvider, ReasoningProvider, VisionProvider
{
  abstract readonly type: AiProviderType
  abstract readonly capabilities: AiCapability[]

  protected readonly config: ProviderConfig
  protected readonly headers: Record<string, string>

  constructor(config: ProviderConfig) {
    this.config = config
    this.headers = {
      'Content-Type': 'application/json',
    }

    if (config.apiKey) {
      this.headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    if (config.organizationId) {
      this.headers['OpenAI-Organization'] = config.organizationId
    }
  }

  get baseUrl(): string {
    return this.config.baseUrl.replace(/\/$/, '')
  }

  // ===========================================================================
  // AiProvider Interface
  // ===========================================================================

  hasCapability(capability: AiCapability): boolean {
    return this.capabilities.includes(capability)
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.headers,
        signal: AbortSignal.timeout(10000),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error')
        return {
          success: false,
          latencyMs,
          error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
        }
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> }
      const models = Array.isArray(data.data)
        ? data.data.map((m) => m.id).slice(0, 50)
        : []

      return {
        success: true,
        latencyMs,
        models,
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime
      return {
        success: false,
        latencyMs,
        error: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }

  async listModels(capability?: AiCapability): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.headers,
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        throw new ProviderError(
          `Failed to list models: HTTP ${response.status}`,
          this.type,
          'CONNECTION_FAILED'
        )
      }

      const data = (await response.json()) as {
        data?: Array<{ id: string; owned_by?: string }>
      }

      if (!Array.isArray(data.data)) {
        return []
      }

      const models: ModelInfo[] = data.data.map((model) => ({
        id: model.id,
        type: this.categorizeModel(model.id),
        ownedBy: model.owned_by,
      }))

      // Filter by capability if specified
      if (capability) {
        const typeMap: Record<AiCapability, ModelInfo['type']> = {
          EMBEDDING: 'embedding',
          REASONING: 'reasoning',
          VISION: 'vision',
        }
        return models.filter(
          (m) => m.type === typeMap[capability] || m.type === 'unknown'
        )
      }

      return models
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        'Failed to list models',
        this.type,
        'CONNECTION_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  // ===========================================================================
  // EmbeddingProvider Interface
  // ===========================================================================

  async embed(text: string): Promise<number[]> {
    const model = this.getModelName()

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          input: text,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ProviderError(
          `Embedding failed: HTTP ${response.status} - ${errorText}`,
          this.type,
          response.status === 401 ? 'AUTHENTICATION_FAILED' : 'INVALID_REQUEST'
        )
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>
      }

      if (!data.data?.[0]?.embedding) {
        throw new ProviderError(
          'Invalid embedding response format',
          this.type,
          'INVALID_REQUEST'
        )
      }

      return data.data[0].embedding
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        'Embedding request failed',
        this.type,
        'CONNECTION_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const model = this.getModelName()

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          input: texts,
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ProviderError(
          `Batch embedding failed: HTTP ${response.status} - ${errorText}`,
          this.type,
          response.status === 401 ? 'AUTHENTICATION_FAILED' : 'INVALID_REQUEST'
        )
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>
      }

      if (!Array.isArray(data.data)) {
        throw new ProviderError(
          'Invalid batch embedding response format',
          this.type,
          'INVALID_REQUEST'
        )
      }

      // Sort by index to ensure correct order
      return data.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        'Batch embedding request failed',
        this.type,
        'CONNECTION_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  getDimensions(): number {
    const model = this.getModelName()
    return (
      EMBEDDING_DIMENSIONS[model as keyof typeof EMBEDDING_DIMENSIONS] || 1536
    )
  }

  getModelName(): string {
    return this.config.embeddingModel || this.getDefaultEmbeddingModel()
  }

  protected abstract getDefaultEmbeddingModel(): string

  // ===========================================================================
  // ReasoningProvider Interface
  // ===========================================================================

  async extractEntities(
    text: string,
    entityTypes: string[]
  ): Promise<ExtractedEntity[]> {
    const systemPrompt = `You are an entity extraction assistant. Your task is to identify and extract named entities from text.

ENTITY TYPES TO EXTRACT:
${entityTypes.map(t => `- ${t}`).join('\n')}

RULES:
1. Extract ANY named entity that matches the types above, even from short text
2. Names of people (like "Robin", "John", "Maria") are "Person" entities
3. Project names, product names are "Project" entities
4. Abstract ideas or terms are "Concept" entities
5. If unsure about the type, use "Concept"
6. Always extract names, even if the sentence is very short

OUTPUT FORMAT:
Return ONLY a JSON array. Each object must have:
- "name": the entity name as found in text
- "type": one of the entity types listed above
- "confidence": number between 0 and 1

Example: For "Robin heeft blauw haar"
Output: [{"name": "Robin", "type": "Person", "confidence": 0.9}]

Example: For "Het Kanban project is gestart"
Output: [{"name": "Kanban", "type": "Project", "confidence": 0.85}]

If no entities found, return: []

IMPORTANT: Return ONLY the JSON array, no other text.`

    const response = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract entities from this text: "${text}"` },
      ],
      { temperature: 0.1, maxTokens: 2000 }
    )

    console.log(`[extractEntities] Input: "${text}"`)
    console.log(`[extractEntities] LLM response: ${response}`)

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\[[\s\S]*?\]/)
      if (!jsonMatch) {
        console.log('[extractEntities] No JSON array found in response')
        return []
      }

      const entities = JSON.parse(jsonMatch[0]) as Array<{
        name: string
        type: string
        confidence?: number
      }>

      console.log(`[extractEntities] Parsed ${entities.length} entities:`, entities)

      return entities.map((e) => ({
        name: e.name,
        type: e.type,
        confidence: e.confidence || 0.8,
      }))
    } catch (error) {
      console.error('[extractEntities] JSON parsing failed:', error)
      return []
    }
  }

  async summarize(text: string, maxLength?: number): Promise<string> {
    const systemPrompt = `You are a summarization assistant. Summarize the given text concisely.${
      maxLength ? ` Keep the summary under ${maxLength} characters.` : ''
    }`

    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      { temperature: 0.3, maxTokens: maxLength ? Math.ceil(maxLength / 4) : 500 }
    )
  }

  async chat(
    messages: ChatMessage[],
    options?: ReasoningOptions
  ): Promise<string> {
    const model = options?.model || this.getReasoningModel()

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          top_p: options?.topP,
          stop: options?.stop,
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ProviderError(
          `Chat completion failed: HTTP ${response.status} - ${errorText}`,
          this.type,
          response.status === 429 ? 'RATE_LIMITED' : 'INVALID_REQUEST'
        )
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }

      return data.choices?.[0]?.message?.content || ''
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        'Chat completion request failed',
        this.type,
        'CONNECTION_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  async *stream(
    messages: ChatMessage[],
    options?: ReasoningOptions
  ): AsyncIterable<string> {
    const model = options?.model || this.getReasoningModel()

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        top_p: options?.topP,
        stop: options?.stop,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new ProviderError(
        `Streaming chat failed: HTTP ${response.status} - ${errorText}`,
        this.type,
        response.status === 429 ? 'RATE_LIMITED' : 'INVALID_REQUEST'
      )
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ProviderError('No response body', this.type, 'INVALID_REQUEST')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === 'data: [DONE]') continue
          if (!trimmed.startsWith('data: ')) continue

          try {
            const json = JSON.parse(trimmed.slice(6)) as {
              choices: Array<{ delta: { content?: string } }>
            }
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  getReasoningModel(): string {
    return this.config.reasoningModel || this.getDefaultReasoningModel()
  }

  protected abstract getDefaultReasoningModel(): string

  // ===========================================================================
  // VisionProvider Interface
  // ===========================================================================

  async describeImage(image: string, prompt?: string): Promise<string> {
    const model = this.getVisionModel()
    const userPrompt = prompt || 'Describe this image in detail.'

    // Determine if image is URL or base64
    const imageContent = image.startsWith('http')
      ? { type: 'image_url' as const, image_url: { url: image } }
      : {
          type: 'image_url' as const,
          image_url: { url: `data:image/jpeg;base64,${image}` },
        }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: userPrompt }, imageContent],
            },
          ],
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ProviderError(
          `Vision request failed: HTTP ${response.status} - ${errorText}`,
          this.type,
          'INVALID_REQUEST'
        )
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>
      }

      return data.choices?.[0]?.message?.content || ''
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError(
        'Vision request failed',
        this.type,
        'CONNECTION_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  async extractTextFromImage(image: string): Promise<string> {
    return this.describeImage(
      image,
      'Extract and transcribe all text visible in this image. Return only the extracted text, nothing else.'
    )
  }

  getVisionModel(): string {
    return this.config.visionModel || this.getDefaultVisionModel()
  }

  protected abstract getDefaultVisionModel(): string

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  protected categorizeModel(modelId: string): ModelInfo['type'] {
    const id = modelId.toLowerCase()

    if (
      id.includes('embed') ||
      id.includes('nomic') ||
      id.includes('bge') ||
      id.includes('e5')
    ) {
      return 'embedding'
    }

    if (
      id.includes('vision') ||
      id.includes('llava') ||
      id.includes('bakllava') ||
      id.includes('moondream')
    ) {
      return 'vision'
    }

    if (
      id.includes('gpt') ||
      id.includes('llama') ||
      id.includes('mistral') ||
      id.includes('qwen') ||
      id.includes('phi') ||
      id.includes('gemma') ||
      id.includes('codellama')
    ) {
      return 'reasoning'
    }

    return 'unknown'
  }
}
