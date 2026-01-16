/**
 * Wiki AI Service
 *
 * Service for AI-powered Wiki features using Fase 14 providers.
 * Provides embeddings, entity extraction, and text operations for Wiki pages.
 *
 * Fase 15.1 - Provider Koppeling
 * Fase 16.2 - Bi-temporal date extraction
 * Fase 16.3 - Contradiction detection
 * Fase 22.4 - Entity Deduplication (LLM-based)
 */

import type { PrismaClient } from '@prisma/client'
import { getProviderRegistry, type ProviderRegistry } from '../providers/registry'
import type {
  EmbeddingProvider,
  ReasoningProvider,
  ExtractedEntity,
} from '../providers/types'
import {
  getExtractEdgeDatesSystemPrompt,
  getExtractEdgeDatesUserPrompt,
  parseExtractEdgeDatesResponse,
  getDetectContradictionsSystemPrompt,
  getDetectContradictionsUserPrompt,
  parseDetectContradictionsResponse,
  // Fase 17.2 - Enhanced Detection
  ContradictionCategory,
  getEnhancedDetectContradictionsSystemPrompt,
  getEnhancedDetectContradictionsUserPrompt,
  parseEnhancedDetectContradictionsResponse,
  // Fase 17.2 - Batch Detection
  MAX_BATCH_SIZE,
  getBatchDetectContradictionsSystemPrompt,
  getBatchDetectContradictionsUserPrompt,
  parseBatchDetectContradictionsResponse,
  // Fase 17.2 - Category Handling
  ResolutionAction,
  DEFAULT_CATEGORY_HANDLING,
  filterContradictionsByCategory,
  // Fase 22.4 - Entity Deduplication
  getDeduplicateNodesSystemPrompt,
  getDeduplicateNodesUserPrompt,
  parseDeduplicateNodesResponse,
  getDeduplicateEdgeSystemPrompt,
  getDeduplicateEdgeUserPrompt,
  parseDeduplicateEdgeResponse,
  // Fase 23.3 - Reflexion Extraction
  getReflexionNodesSystemPrompt,
  getReflexionNodesUserPrompt,
  parseReflexionNodesResponse,
  getReflexionEdgesSystemPrompt,
  getReflexionEdgesUserPrompt,
  parseReflexionEdgesResponse,
  type ExistingFact,
  type ContradictionDetail,
  type EnhancedContradictionResult,
  type BatchNewFact,
  type CategoryHandlingConfig,
  type ExtractedFact,
} from './prompts'
import type {
  NodeResolutionsResponse,
  EdgeDuplicateResponse,
  // Fase 23 - Reflexion Extraction
  NodeReflexionResult,
  EdgeReflexionResult,
  MissedEntity,
  MissedFact,
} from './types'
import {
  ChunkingService,
  type ChunkingConfig,
} from './ChunkingService'

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
  /** Number of chunks processed (Fase 25 - only set when chunking was used) */
  chunksProcessed?: number
}

/**
 * Options for chunked entity extraction (Fase 25)
 */
export interface ChunkedExtractionOptions {
  /** Enable chunking for large content (default: true, respects DISABLE_TEXT_CHUNKING env) */
  enableChunking?: boolean
  /** Custom chunking configuration */
  chunkingConfig?: ChunkingConfig
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

/**
 * Result of edge date extraction (Fase 16.2)
 */
export interface EdgeDateExtractionResult {
  /** When the fact became true in the real world */
  validAt: Date | null
  /** When the fact stopped being true */
  invalidAt: Date | null
  /** Explanation of how dates were determined */
  reasoning: string
  /** Provider used for extraction */
  provider: string
  /** Model used for extraction */
  model: string
}

/**
 * Result of contradiction detection (Fase 16.3)
 */
export interface ContradictionDetectionResult {
  /** IDs of existing facts that are contradicted by the new fact */
  contradictedFactIds: string[]
  /** Explanation of why these facts contradict */
  reasoning: string
  /** Provider used for detection */
  provider: string
  /** Model used for detection */
  model: string
}

/**
 * Enhanced result of contradiction detection (Fase 17.2)
 * Includes confidence scores and categories
 */
export interface EnhancedContradictionDetectionResult {
  /** Detailed list of contradictions found */
  contradictions: ContradictionDetail[]
  /** Overall reasoning for the analysis */
  reasoning: string
  /** Suggested resolution strategy */
  suggestedResolution?: 'INVALIDATE_OLD' | 'INVALIDATE_NEW' | 'MERGE' | 'ASK_USER'
  /** Provider used for detection */
  provider: string
  /** Model used for detection */
  model: string
}

/**
 * Result of batch contradiction detection (Fase 17.2)
 */
export interface BatchContradictionDetectionResult {
  /** Results per new fact */
  results: Array<{
    /** ID of the new fact */
    newFactId: string
    /** Contradictions found */
    contradictions: ContradictionDetail[]
    /** Reasoning for this fact */
    reasoning: string
    /** Suggested resolution */
    suggestedResolution?: 'INVALIDATE_OLD' | 'INVALIDATE_NEW' | 'MERGE' | 'ASK_USER'
    /** Error if processing failed */
    error?: string
  }>
  /** Overall summary */
  summary: string
  /** Number of facts that had errors */
  errorCount: number
  /** Provider used */
  provider: string
  /** Model used */
  model: string
}

/**
 * Result of category-filtered contradictions (Fase 17.2)
 */
export interface FilteredContradictions {
  /** Contradictions to auto-invalidate */
  toAutoInvalidate: ContradictionDetail[]
  /** Contradictions requiring user confirmation */
  toConfirm: ContradictionDetail[]
  /** Contradictions to warn about only */
  toWarn: ContradictionDetail[]
  /** Contradictions to skip */
  toSkip: ContradictionDetail[]
}

// Re-export types for consumers
export {
  ContradictionCategory,
  ResolutionAction,
  type ContradictionDetail,
  type EnhancedContradictionResult,
  type BatchNewFact,
  type CategoryHandlingConfig,
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
  // Entity Extraction (Fase 25 - Chunking Support)
  // ===========================================================================

  /**
   * Extract entities from wiki page content
   * Uses the configured reasoning provider for LLM-based extraction
   *
   * Fase 25: Supports chunking for large content (>1000 tokens)
   * - Splits content into chunks with overlap
   * - Extracts entities from each chunk in parallel
   * - Deduplicates entities across chunks
   *
   * @param context - Wiki context (workspace/project)
   * @param text - Text content to extract entities from
   * @param entityTypes - Types of entities to extract
   * @param options - Chunking options (Fase 25)
   */
  async extractEntities(
    context: WikiContext,
    text: string,
    entityTypes: string[] = ['WikiPage', 'Task', 'User', 'Project', 'Concept'],
    options?: ChunkedExtractionOptions
  ): Promise<EntityExtractionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    // Check if chunking is enabled (default: true, unless DISABLE_TEXT_CHUNKING=true)
    const enableChunking = options?.enableChunking ??
      (process.env.DISABLE_TEXT_CHUNKING !== 'true')

    // Create chunking service with optional custom config
    const chunkingService = new ChunkingService(options?.chunkingConfig)

    // If chunking disabled or content is small, use original behavior
    if (!enableChunking || !chunkingService.needsChunking(text)) {
      const entities = await provider.extractEntities(text, entityTypes)
      return {
        entities,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }

    // Chunk the content using Markdown-aware splitting
    const chunkResult = chunkingService.chunkMarkdown(text)

    console.log(
      `[WikiAiService] Chunking large content: ${chunkResult.totalTokens} tokens → ${chunkResult.chunks.length} chunks`
    )

    // Extract entities from each chunk in parallel
    const chunkEntities = await Promise.all(
      chunkResult.chunks.map(async (chunk) => {
        try {
          return await provider.extractEntities(chunk.text, entityTypes)
        } catch (error) {
          console.warn(
            `[WikiAiService] Entity extraction failed for chunk ${chunk.index}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
          return []
        }
      })
    )

    // Merge and deduplicate entities across all chunks
    const mergedEntities = this.deduplicateEntities(chunkEntities.flat())

    console.log(
      `[WikiAiService] Extracted ${chunkEntities.flat().length} entities, ` +
      `${mergedEntities.length} after deduplication`
    )

    return {
      entities: mergedEntities,
      provider: provider.type,
      model: provider.getReasoningModel(),
      chunksProcessed: chunkResult.chunks.length,
    }
  }

  /**
   * Deduplicate entities by normalized name and type (Fase 25)
   *
   * When duplicates are found, keeps the one with highest confidence.
   * Normalization: lowercase, trimmed, keyed by "type:name"
   */
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const entityMap = new Map<string, ExtractedEntity>()

    for (const entity of entities) {
      // Create normalized key: "Type:normalized_name"
      const key = `${entity.type}:${entity.name.toLowerCase().trim()}`

      const existing = entityMap.get(key)
      if (!existing || entity.confidence > existing.confidence) {
        // Keep entity with highest confidence
        entityMap.set(key, entity)
      }
    }

    return Array.from(entityMap.values())
  }

  // ===========================================================================
  // Temporal Date Extraction (Fase 16.2)
  // ===========================================================================

  /**
   * Extract valid_at and invalid_at dates for a fact/relationship
   *
   * Uses LLM to determine when a fact became true and when it stopped being true
   * based on the wiki content and reference timestamp.
   *
   * @param context - Wiki context (workspace/project)
   * @param fact - The fact/relationship to extract dates for
   * @param episodeContent - The full wiki page content
   * @param referenceTimestamp - Reference timestamp (usually page update time)
   */
  async extractEdgeDates(
    context: WikiContext,
    fact: string,
    episodeContent: string,
    referenceTimestamp: Date
  ): Promise<EdgeDateExtractionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const systemPrompt = getExtractEdgeDatesSystemPrompt()
    const userPrompt = getExtractEdgeDatesUserPrompt({
      fact,
      episodeContent,
      referenceTimestamp: referenceTimestamp.toISOString(),
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1, // Low temperature for consistent date extraction
          maxTokens: 500,   // Dates don't need many tokens
        }
      )

      const parsed = parseExtractEdgeDatesResponse(response)

      return {
        validAt: parsed.valid_at ? new Date(parsed.valid_at) : null,
        invalidAt: parsed.invalid_at ? new Date(parsed.invalid_at) : null,
        reasoning: parsed.reasoning,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    } catch (error) {
      // If LLM call fails, return default dates
      console.warn(
        `[WikiAiService] extractEdgeDates failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        validAt: referenceTimestamp,
        invalidAt: null,
        reasoning: 'Fallback: LLM extraction failed, using reference timestamp',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }
  }

  /**
   * Extract dates for multiple facts in batch
   * More efficient than calling extractEdgeDates for each fact
   */
  async extractEdgeDatesBatch(
    context: WikiContext,
    facts: string[],
    episodeContent: string,
    referenceTimestamp: Date
  ): Promise<EdgeDateExtractionResult[]> {
    // For now, process sequentially
    // TODO: Optimize with parallel calls or batch LLM request
    const results: EdgeDateExtractionResult[] = []

    for (const fact of facts) {
      const result = await this.extractEdgeDates(
        context,
        fact,
        episodeContent,
        referenceTimestamp
      )
      results.push(result)
    }

    return results
  }

  // ===========================================================================
  // Contradiction Detection (Fase 16.3)
  // ===========================================================================

  /**
   * Detect which existing facts are contradicted by a new fact
   *
   * Uses LLM to compare the new fact against existing facts and determine
   * which ones are mutually exclusive (cannot both be true at the same time).
   *
   * @param context - Wiki context (workspace/project)
   * @param newFact - The new fact being added
   * @param existingFacts - List of existing facts to compare against
   */
  async detectContradictions(
    context: WikiContext,
    newFact: string,
    existingFacts: ExistingFact[]
  ): Promise<ContradictionDetectionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    // If no existing facts, nothing to contradict
    if (existingFacts.length === 0) {
      return {
        contradictedFactIds: [],
        reasoning: 'No existing facts to compare against',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }

    const systemPrompt = getDetectContradictionsSystemPrompt()
    const userPrompt = getDetectContradictionsUserPrompt({
      newFact,
      existingFacts,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1, // Low temperature for consistent detection
          maxTokens: 500,   // Contradictions don't need many tokens
        }
      )

      const parsed = parseDetectContradictionsResponse(response)

      return {
        contradictedFactIds: parsed.contradictedFactIds,
        reasoning: parsed.reasoning,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    } catch (error) {
      // If LLM call fails, be conservative and return no contradictions
      console.warn(
        `[WikiAiService] detectContradictions failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        contradictedFactIds: [],
        reasoning: 'Fallback: LLM detection failed, assuming no contradictions',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }
  }

  // ===========================================================================
  // Enhanced Contradiction Detection (Fase 17.2)
  // ===========================================================================

  /**
   * Enhanced contradiction detection with confidence scores and categories
   *
   * Uses LLM to compare the new fact against existing facts with detailed
   * analysis including confidence scores and contradiction categories.
   *
   * @param context - Wiki context (workspace/project)
   * @param newFact - The new fact being added
   * @param existingFacts - List of existing facts to compare against
   * @param options - Optional configuration
   */
  async detectContradictionsEnhanced(
    context: WikiContext,
    newFact: string,
    existingFacts: ExistingFact[],
    options?: {
      /** Minimum confidence threshold (default: 0.7) */
      confidenceThreshold?: number
    }
  ): Promise<EnhancedContradictionDetectionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)
    const confidenceThreshold = options?.confidenceThreshold ?? 0.7

    // If no existing facts, nothing to contradict
    if (existingFacts.length === 0) {
      return {
        contradictions: [],
        reasoning: 'No existing facts to compare against',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }

    const systemPrompt = getEnhancedDetectContradictionsSystemPrompt()
    const userPrompt = getEnhancedDetectContradictionsUserPrompt({
      newFact,
      existingFacts,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1, // Low temperature for consistent detection
          maxTokens: 800,   // More tokens for detailed response
        }
      )

      const parsed = parseEnhancedDetectContradictionsResponse(response)

      // Filter by confidence threshold
      const filteredContradictions = parsed.contradictions.filter(
        c => c.confidence >= confidenceThreshold
      )

      return {
        contradictions: filteredContradictions,
        reasoning: parsed.reasoning,
        suggestedResolution: parsed.suggestedResolution,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    } catch (error) {
      // If LLM call fails, be conservative and return no contradictions
      console.warn(
        `[WikiAiService] detectContradictionsEnhanced failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        contradictions: [],
        reasoning: 'Fallback: LLM detection failed, assuming no contradictions',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }
  }

  /**
   * Convert enhanced result to basic result for backwards compatibility
   */
  enhancedToBasicResult(
    enhanced: EnhancedContradictionDetectionResult
  ): ContradictionDetectionResult {
    return {
      contradictedFactIds: enhanced.contradictions.map(c => c.factId),
      reasoning: enhanced.reasoning,
      provider: enhanced.provider,
      model: enhanced.model,
    }
  }

  // ===========================================================================
  // Batch Contradiction Detection (Fase 17.2)
  // ===========================================================================

  /**
   * Detect contradictions for multiple new facts in a single LLM call
   *
   * More efficient than calling detectContradictionsEnhanced for each fact.
   * Automatically splits into batches of MAX_BATCH_SIZE (10) facts.
   *
   * @param context - Wiki context (workspace/project)
   * @param newFacts - List of new facts to check (with IDs for result mapping)
   * @param existingFacts - List of existing facts to compare against
   * @param options - Optional configuration
   */
  async detectContradictionsBatch(
    context: WikiContext,
    newFacts: BatchNewFact[],
    existingFacts: ExistingFact[],
    options?: {
      /** Minimum confidence threshold (default: 0.7) */
      confidenceThreshold?: number
    }
  ): Promise<BatchContradictionDetectionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)
    const confidenceThreshold = options?.confidenceThreshold ?? 0.7

    // If no new facts or existing facts, return empty result
    if (newFacts.length === 0) {
      return {
        results: [],
        summary: 'No new facts to process',
        errorCount: 0,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }

    if (existingFacts.length === 0) {
      return {
        results: newFacts.map(f => ({
          newFactId: f.id,
          contradictions: [],
          reasoning: 'No existing facts to compare against',
        })),
        summary: 'No existing facts to compare against',
        errorCount: 0,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }

    // Split into batches of MAX_BATCH_SIZE
    const batches: BatchNewFact[][] = []
    for (let i = 0; i < newFacts.length; i += MAX_BATCH_SIZE) {
      batches.push(newFacts.slice(i, i + MAX_BATCH_SIZE))
    }

    // Process each batch
    const allResults: BatchContradictionDetectionResult['results'] = []
    let totalErrorCount = 0

    for (const batch of batches) {
      const batchResult = await this.processSingleBatch(
        provider,
        batch,
        existingFacts,
        confidenceThreshold
      )
      allResults.push(...batchResult.results)
      totalErrorCount += batchResult.errorCount
    }

    return {
      results: allResults,
      summary: `Processed ${newFacts.length} facts in ${batches.length} batch(es)`,
      errorCount: totalErrorCount,
      provider: provider.type,
      model: provider.getReasoningModel(),
    }
  }

  /**
   * Process a single batch of facts (internal helper)
   */
  private async processSingleBatch(
    provider: ReasoningProvider,
    batch: BatchNewFact[],
    existingFacts: ExistingFact[],
    confidenceThreshold: number
  ): Promise<{ results: BatchContradictionDetectionResult['results']; errorCount: number }> {
    const systemPrompt = getBatchDetectContradictionsSystemPrompt()
    const userPrompt = getBatchDetectContradictionsUserPrompt({
      newFacts: batch,
      existingFacts,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 1500, // More tokens for batch response
        }
      )

      const parsed = parseBatchDetectContradictionsResponse(
        response,
        batch.map(f => f.id)
      )

      // Apply confidence threshold to each result
      const results = parsed.results.map(r => ({
        ...r,
        contradictions: r.contradictions.filter(c => c.confidence >= confidenceThreshold),
      }))

      return { results, errorCount: parsed.errorCount }
    } catch (error) {
      // If batch fails, mark all facts as errored
      console.warn(
        `[WikiAiService] detectContradictionsBatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        results: batch.map(f => ({
          newFactId: f.id,
          contradictions: [],
          reasoning: 'Batch processing failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
        errorCount: batch.length,
      }
    }
  }

  // ===========================================================================
  // Category-Specific Handling (Fase 17.2)
  // ===========================================================================

  /**
   * Filter contradictions based on their category and confidence
   *
   * Separates contradictions into different action groups:
   * - toAutoInvalidate: High confidence factual/attribute contradictions
   * - toConfirm: Temporal/semantic contradictions requiring user input
   * - toWarn: Lower confidence contradictions (log only)
   * - toSkip: Contradictions below threshold
   *
   * @param contradictions - List of contradictions to filter
   * @param config - Optional category handling configuration
   */
  filterContradictionsByCategory(
    contradictions: ContradictionDetail[],
    config?: Record<ContradictionCategory, CategoryHandlingConfig>
  ): FilteredContradictions {
    return filterContradictionsByCategory(contradictions, config ?? DEFAULT_CATEGORY_HANDLING)
  }

  /**
   * Get the default category handling configuration
   */
  getDefaultCategoryConfig(): Record<ContradictionCategory, CategoryHandlingConfig> {
    return { ...DEFAULT_CATEGORY_HANDLING }
  }

  // ===========================================================================
  // Entity Deduplication (Fase 22.4)
  // ===========================================================================

  /**
   * Detect duplicate nodes using LLM
   *
   * Compares extracted entities against existing entities and determines
   * which ones refer to the same real-world object or concept.
   *
   * @param context - Wiki context (workspace/project)
   * @param extractedNodes - New entities to check
   * @param existingNodes - Existing entities to compare against
   * @param episodeContent - Current content for context
   * @param previousEpisodes - Previous content for additional context
   */
  async detectNodeDuplicates(
    context: WikiContext,
    extractedNodes: Array<{ id: number; name: string; entity_type: string[] }>,
    existingNodes: Array<{ idx: number; name: string; entity_types: string[]; summary?: string }>,
    episodeContent: string,
    previousEpisodes?: string[]
  ): Promise<NodeResolutionsResponse> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const systemPrompt = getDeduplicateNodesSystemPrompt()
    const userPrompt = getDeduplicateNodesUserPrompt({
      extractedNodes: extractedNodes.map((n) => ({
        id: n.id,
        name: n.name,
        entity_type: n.entity_type,
      })),
      existingNodes: existingNodes.map((n) => ({
        idx: n.idx,
        name: n.name,
        entity_types: n.entity_types,
        summary: n.summary,
      })),
      episodeContent,
      previousEpisodes,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1, // Low temperature for deterministic results
          maxTokens: 2000,
        }
      )

      return parseDeduplicateNodesResponse(response, extractedNodes.length)
    } catch (error) {
      console.error(
        '[WikiAiService] detectNodeDuplicates failed:',
        error instanceof Error ? error.message : error
      )
      return { entityResolutions: [] }
    }
  }

  /**
   * Detect duplicate edges using LLM
   *
   * Compares a new edge/fact against existing edges and determines
   * if it's a duplicate or contradicts existing facts.
   *
   * @param context - Wiki context (workspace/project)
   * @param existingEdges - Existing edges to compare against
   * @param newEdge - New edge to check
   */
  async detectEdgeDuplicates(
    context: WikiContext,
    existingEdges: Array<{ idx: number; fact: string; sourceUuid: string; targetUuid: string }>,
    newEdge: { fact: string; sourceUuid: string; targetUuid: string }
  ): Promise<EdgeDuplicateResponse> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const systemPrompt = getDeduplicateEdgeSystemPrompt()
    const userPrompt = getDeduplicateEdgeUserPrompt({
      existingEdges,
      newEdge,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 500,
        }
      )

      return parseDeduplicateEdgeResponse(response, existingEdges.length)
    } catch (error) {
      console.error(
        '[WikiAiService] detectEdgeDuplicates failed:',
        error instanceof Error ? error.message : error
      )
      return { duplicateFacts: [], contradictedFacts: [], factType: 'DEFAULT' }
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
  // Reflexion Extraction (Fase 23.4)
  // ===========================================================================

  /**
   * Detect missed entities using reflexion (Fase 23.4)
   *
   * Performs a second-pass LLM call to identify entities that were
   * missed during initial extraction. Uses WikiContext for scoping.
   *
   * @param context - Wiki context (workspace/project) for provider selection
   * @param episodeContent - Current wiki page content
   * @param extractedEntities - Entity names extracted in first pass
   * @param previousEpisodes - Optional previous content for context
   */
  async extractNodesReflexion(
    context: WikiContext,
    episodeContent: string,
    extractedEntities: string[],
    previousEpisodes?: string[]
  ): Promise<NodeReflexionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const systemPrompt = getReflexionNodesSystemPrompt()
    const userPrompt = getReflexionNodesUserPrompt({
      episodeContent,
      previousEpisodes,
      extractedEntities,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 1000,
        }
      )

      const parsed = parseReflexionNodesResponse(response)

      return {
        missedEntities: parsed.missedEntities.map(
          (e): MissedEntity => ({
            name: e.name,
            reason: e.reason,
            suggestedType: e.suggestedType,
          })
        ),
        reasoning: parsed.reasoning,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    } catch (error) {
      console.warn(
        `[WikiAiService] extractNodesReflexion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        missedEntities: [],
        reasoning: 'Reflexion failed - fallback to no missed entities',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }
  }

  /**
   * Detect missed facts/edges using reflexion (Fase 23.4)
   *
   * Performs a second-pass LLM call to identify relationships that were
   * missed during initial extraction.
   *
   * Note: This is disabled by default (enableEdgeReflexion: false) to match
   * Python Graphiti behavior. Enable via ReflexionConfig if needed.
   *
   * @param context - Wiki context (workspace/project) for provider selection
   * @param episodeContent - Current wiki page content
   * @param extractedNodes - Entity names extracted
   * @param extractedFacts - Facts extracted in first pass
   * @param previousEpisodes - Optional previous content for context
   */
  async extractEdgesReflexion(
    context: WikiContext,
    episodeContent: string,
    extractedNodes: string[],
    extractedFacts: ExtractedFact[],
    previousEpisodes?: string[]
  ): Promise<EdgeReflexionResult> {
    const provider = await this.getReasoningProviderOrThrow(context)

    const systemPrompt = getReflexionEdgesSystemPrompt()
    const userPrompt = getReflexionEdgesUserPrompt({
      episodeContent,
      previousEpisodes,
      extractedNodes,
      extractedFacts,
    })

    try {
      const response = await provider.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 1500,
        }
      )

      const parsed = parseReflexionEdgesResponse(response)

      return {
        missedFacts: parsed.missedFacts.map(
          (f): MissedFact => ({
            sourceName: f.sourceName,
            targetName: f.targetName,
            relationType: f.relationType,
            fact: f.fact,
            reason: f.reason,
          })
        ),
        reasoning: parsed.reasoning,
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    } catch (error) {
      console.warn(
        `[WikiAiService] extractEdgesReflexion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return {
        missedFacts: [],
        reasoning: 'Reflexion failed - fallback to no missed facts',
        provider: provider.type,
        model: provider.getReasoningModel(),
      }
    }
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
