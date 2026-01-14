/*
 * Graphiti Service
 * Version: 3.7.0
 *
 * Knowledge graph service for Wiki using FalkorDB.
 * Integrates with Python Graphiti service for LLM-based entity extraction.
 * Falls back to WikiAiService (Fase 14 providers) when Python service unavailable.
 * Falls back to direct FalkorDB queries with rules-based extraction as last resort.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-13
 * Change: Fase 15.1 - WikiAiService integration for provider-based extraction
 * Change: Fase 15.2 - WikiEmbeddingService for semantic search via Qdrant
 * Change: Fase 16.1 - Bi-temporal edge fields (valid_at, invalid_at, created_at, expired_at, fact)
 * Change: Fase 16.2 - LLM-based date extraction (enabled by default, DISABLE_DATE_EXTRACTION env var to disable)
 * Change: Fase 16.3 - Contradiction detection and resolution (invalidates outdated facts)
 * Change: Fase 16.4 - Temporal queries with FalkorDB fallback (getFactsAsOf, temporalSearch)
 * Change: Fase 19.3 - Edge embedding generation (WikiEdgeEmbeddingService integration)
 * Change: Fase 21.4 - Node embedding generation (WikiNodeEmbeddingService integration for entity resolution)
 * ===================================================================
 */

import Redis from 'ioredis'
import type { PrismaClient } from '@prisma/client'

import {
  getGraphitiClient,
  GraphitiClient,
  GraphitiClientError,
} from '../lib/graphitiClient'
import {
  WikiAiService,
  getWikiAiService,
  WikiEmbeddingService,
  getWikiEmbeddingService,
  WikiEdgeEmbeddingService,
  getWikiEdgeEmbeddingService,
  WikiNodeEmbeddingService,
  getWikiNodeEmbeddingService,
  getContradictionAuditService,
  getWikiDeduplicationService,
  ContradictionCategory,
  type ContradictionAuditEntry,
  type WikiContext,
  type SemanticSearchResult,
  type ExistingFact,
  type EdgeForEmbedding,
  type NodeForEmbedding,
  type EmbeddableNodeType,
  type EntityNodeInfo,
  type DuplicateCandidate,
} from '../lib/ai/wiki'

// =============================================================================
// Types
// =============================================================================

export interface GraphitiConfig {
  host: string
  port: number
  graphName: string
  /**
   * Enable LLM-based date extraction for edges (Fase 16.2)
   * When enabled, extracts valid_at/invalid_at from wiki content using AI
   * Performance impact: adds 1 LLM call per entity mention
   * Can be disabled via DISABLE_DATE_EXTRACTION=true env var
   * @default true
   */
  enableDateExtraction?: boolean
  /**
   * Enable edge embedding generation (Fase 19.3)
   * When enabled, generates vector embeddings for edge facts during sync
   * Stored in Qdrant collection 'kanbu_edge_embeddings' for semantic search
   * Can be disabled via DISABLE_EDGE_EMBEDDINGS=true env var
   * @default true
   */
  enableEdgeEmbeddings?: boolean
  /**
   * Enable node embedding generation (Fase 21.4)
   * When enabled, generates vector embeddings for entity names during sync
   * Stored in Qdrant collection 'kanbu_node_embeddings' for entity resolution
   * Can be disabled via DISABLE_NODE_EMBEDDINGS=true env var
   * @default true
   */
  enableNodeEmbeddings?: boolean
}

export interface WikiEpisode {
  pageId: number
  title: string
  slug: string
  content: string
  /**
   * Old content for diff-based extraction (Fase 17.3.1)
   * When provided, only extracts entities from changed/new parts
   * This reduces token usage from 600K+ to ~10K per edit
   */
  oldContent?: string
  workspaceId?: number
  projectId?: number
  groupId: string // wiki-ws-{id} or wiki-proj-{id}
  userId: number
  timestamp: Date
}

/**
 * Fase 22.8.2: Options for wiki sync with deduplication
 * Backwards compatible - all fields are optional with sensible defaults
 */
export interface SyncWikiPageOptions {
  /**
   * Enable entity deduplication during sync (default: true)
   * When enabled, detects duplicates using exact/fuzzy/embedding/LLM matching
   */
  enableDedup?: boolean
  /**
   * Similarity threshold for fuzzy/embedding matching (default: 0.85)
   */
  dedupThreshold?: number
  /**
   * Use LLM for unresolved duplicates (default: true)
   * Set to false to save API costs - only uses deterministic matching
   */
  useLlm?: boolean
}

export interface GraphEntity {
  id: string
  name: string
  type: 'WikiPage' | 'Concept' | 'Person' | 'Task' | 'Project'
  properties: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  properties: Record<string, unknown>
}

/**
 * Bi-temporal edge properties (Fase 16.1, extended Fase 19.2)
 *
 * Transaction Time: When the edge was recorded in the system
 * - created_at: When the edge was first created
 * - expired_at: When the edge was superseded by a newer version (soft delete)
 *
 * Valid Time: When the fact was true in the real world
 * - valid_at: When the fact became true
 * - invalid_at: When the fact stopped being true
 *
 * Additional:
 * - fact: Human-readable description of the relationship
 * - updatedAt: Last modification time (kept for backwards compatibility)
 *
 * Fase 19.2 - Edge Embeddings:
 * - fact_embedding_id: Reference to Qdrant point ID for this edge's embedding
 * - fact_embedding_at: When the embedding was last generated (for cache invalidation)
 */
export interface TemporalEdgeProperties {
  // Transaction time
  created_at: string    // ISO timestamp - when edge was first created
  expired_at?: string   // ISO timestamp - when edge was replaced/deleted

  // Valid time
  valid_at?: string     // ISO timestamp - when fact became true in real world
  invalid_at?: string   // ISO timestamp - when fact stopped being true

  // Fact description
  fact?: string         // Human-readable description of the relationship

  // Fase 19.2 - Edge embeddings
  fact_embedding_id?: string   // Reference to Qdrant point ID
  fact_embedding_at?: string   // ISO timestamp - when embedding was generated

  // Legacy (kept for compatibility)
  updatedAt: string     // ISO timestamp - last update time
}

export interface SearchResult {
  nodeId: string
  name: string
  type: string
  score: number
  pageId?: number
}

/**
 * Temporal fact result from getFactsAsOf (Fase 16.4)
 */
export interface TemporalFact {
  sourceId: string
  sourceName: string
  sourceType: string
  targetId: string
  targetName: string
  targetType: string
  fact: string
  edgeType: string
  validAt: string | null
  invalidAt: string | null
  createdAt: string
  pageId?: number
}

/**
 * Result from syncWikiPage including contradiction data (Fase 17.4)
 */
export interface SyncWikiPageResult {
  /** Number of entities extracted */
  entitiesExtracted: number
  /** Number of contradictions detected and resolved */
  contradictionsResolved: number
  /** Audit entries for detected contradictions (for UI notification) */
  contradictions: ContradictionAuditEntry[]
  /** Fase 22.8.2: Number of duplicate entities found and marked */
  duplicatesFound?: number
}

// =============================================================================
// GraphitiService Class
// =============================================================================

export class GraphitiService {
  private redis: Redis
  private graphName: string
  private initialized: boolean = false
  private pythonClient: GraphitiClient
  private pythonServiceAvailable: boolean | null = null // null = unknown, check on first use
  private wikiAiService: WikiAiService | null = null
  private wikiEmbeddingService: WikiEmbeddingService | null = null
  private wikiEdgeEmbeddingService: WikiEdgeEmbeddingService | null = null // Fase 19.3
  private wikiNodeEmbeddingService: WikiNodeEmbeddingService | null = null // Fase 21.4
  private prisma: PrismaClient | null = null
  private enableDateExtraction: boolean = true // Fase 16.2
  private enableEdgeEmbeddings: boolean = true // Fase 19.3
  private enableNodeEmbeddings: boolean = true // Fase 21.4

  constructor(config?: Partial<GraphitiConfig>, prisma?: PrismaClient) {
    const host = config?.host ?? process.env.FALKORDB_HOST ?? 'localhost'
    const port = config?.port ?? parseInt(process.env.FALKORDB_PORT ?? '6379')
    this.graphName = config?.graphName ?? 'kanbu_wiki'
    this.enableDateExtraction = config?.enableDateExtraction ?? (process.env.DISABLE_DATE_EXTRACTION !== 'true')
    this.enableEdgeEmbeddings = config?.enableEdgeEmbeddings ?? (process.env.DISABLE_EDGE_EMBEDDINGS !== 'true')
    this.enableNodeEmbeddings = config?.enableNodeEmbeddings ?? (process.env.DISABLE_NODE_EMBEDDINGS !== 'true')

    // Initialize Python service client
    this.pythonClient = getGraphitiClient()

    // Initialize WikiAiService, WikiEmbeddingService, WikiEdgeEmbeddingService, and WikiNodeEmbeddingService if Prisma is provided
    if (prisma) {
      this.prisma = prisma
      this.wikiAiService = getWikiAiService(prisma)
      this.wikiEmbeddingService = getWikiEmbeddingService(prisma)
      this.wikiEdgeEmbeddingService = getWikiEdgeEmbeddingService(prisma) // Fase 19.3
      this.wikiNodeEmbeddingService = getWikiNodeEmbeddingService(prisma) // Fase 21.4
    }

    this.redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null
        return Math.min(times * 100, 3000)
      },
    })

    this.redis.on('error', (err) => {
      console.error('[GraphitiService] Redis connection error:', err.message)
    })

    this.redis.on('connect', () => {
      console.log('[GraphitiService] Connected to FalkorDB')
    })
  }

  /**
   * Set Prisma client and initialize AI services
   * Call this if Prisma wasn't passed to constructor
   */
  setPrisma(prisma: PrismaClient): void {
    this.prisma = prisma
    this.wikiAiService = getWikiAiService(prisma)
    this.wikiEmbeddingService = getWikiEmbeddingService(prisma)
    this.wikiEdgeEmbeddingService = getWikiEdgeEmbeddingService(prisma) // Fase 19.3
    this.wikiNodeEmbeddingService = getWikiNodeEmbeddingService(prisma) // Fase 21.4
  }

  // ===========================================================================
  // Python Service Integration
  // ===========================================================================

  /**
   * Check if the Python Graphiti service is available
   * Caches result for 60 seconds to avoid repeated health checks
   */
  private lastPythonCheck: number = 0
  private readonly PYTHON_CHECK_INTERVAL = 60000 // 60 seconds

  private async isPythonServiceAvailable(): Promise<boolean> {
    const now = Date.now()

    // Use cached result if recent
    if (this.pythonServiceAvailable !== null && now - this.lastPythonCheck < this.PYTHON_CHECK_INTERVAL) {
      return this.pythonServiceAvailable
    }

    try {
      this.pythonServiceAvailable = await this.pythonClient.isAvailable()
      this.lastPythonCheck = now

      if (this.pythonServiceAvailable) {
        console.log('[GraphitiService] Python service available - using LLM extraction')
      } else {
        console.log('[GraphitiService] Python service unavailable - using fallback')
      }

      return this.pythonServiceAvailable
    } catch {
      this.pythonServiceAvailable = false
      this.lastPythonCheck = now
      return false
    }
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the graph with required indexes and constraints
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Create indexes for faster lookups
      // FalkorDB syntax: CREATE INDEX ON :Label(property)
      // Note: FalkorDB doesn't support IF NOT EXISTS, so we catch errors for existing indexes
      await this.createIndexSafe('WikiPage', 'pageId')
      await this.createIndexSafe('WikiPage', 'groupId')
      await this.createIndexSafe('Concept', 'name')
      await this.createIndexSafe('Person', 'name')

      // Fase 22.8.3: Additional indexes for deduplication performance
      // UUID indexes for fast node lookups
      await this.createIndexSafe('Concept', 'uuid')
      await this.createIndexSafe('Person', 'uuid')
      await this.createIndexSafe('Task', 'uuid')
      await this.createIndexSafe('Project', 'uuid')
      // GroupId indexes for multi-tenant filtering
      await this.createIndexSafe('Concept', 'groupId')
      await this.createIndexSafe('Person', 'groupId')
      await this.createIndexSafe('Task', 'groupId')
      await this.createIndexSafe('Project', 'groupId')
      // Name indexes for entity lookups
      await this.createIndexSafe('Task', 'name')
      await this.createIndexSafe('Project', 'name')

      this.initialized = true
      console.log('[GraphitiService] Graph initialized with dedup indexes')
    } catch (error) {
      console.error('[GraphitiService] Failed to initialize graph:', error)
      // Don't throw - allow service to work even if indexes fail
    }
  }

  /**
   * Create an index safely, ignoring errors if index already exists
   * FalkorDB doesn't support IF NOT EXISTS for indexes
   */
  private async createIndexSafe(label: string, property: string): Promise<void> {
    try {
      await this.query(`CREATE INDEX ON :${label}(${property})`)
    } catch (error) {
      // Ignore "Index already exists" errors
      const errorStr = String(error)
      if (!errorStr.includes('already indexed') && !errorStr.includes('Index already exists')) {
        console.warn(`[GraphitiService] Index creation warning for ${label}.${property}:`, errorStr)
      }
    }
  }

  // ===========================================================================
  // Core Graph Operations
  // ===========================================================================

  /**
   * Execute a Cypher query on the graph
   */
  private async query(cypher: string, params?: Record<string, unknown>): Promise<unknown[]> {
    try {
      // FalkorDB uses GRAPH.QUERY command
      // Format: GRAPH.QUERY graphName "CYPHER query" [params]
      let queryString = cypher

      // Simple parameter substitution (FalkorDB style)
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          const replacement = typeof value === 'string'
            ? `'${value.replace(/'/g, "\\'")}'`
            : String(value)
          queryString = queryString.replace(new RegExp(`\\$${key}\\b`, 'g'), replacement)
        }
      }

      const result = await this.redis.call('GRAPH.QUERY', this.graphName, queryString) as unknown[][]

      // Parse FalkorDB result format
      if (Array.isArray(result) && result.length > 0) {
        // Result format: [headers, ...rows, metadata]
        return result
      }
      return []
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[GraphitiService] Query error:', errorMessage)
      throw error
    }
  }

  // ===========================================================================
  // Wiki Page Operations
  // ===========================================================================

  /**
   * Add or update a wiki page in the graph
   *
   * Fallback chain:
   * 1. Python Graphiti service (LLM-based extraction via graphiti_core)
   * 2. WikiAiService (Fase 14 providers - OpenAI/Ollama/LM Studio)
   * 3. Direct FalkorDB with rules-based extraction
   *
   * Uses Kanbu-specific entity types (Fase 10):
   * - WikiPage, Task, User, Project, Concept
   *
   * Returns contradiction data for UI notifications (Fase 17.4)
   *
   * Fase 22.8.2: Optional deduplication during sync
   * - enableDedup: true (default) - detect and mark duplicate entities
   * - dedupThreshold: 0.85 (default) - similarity threshold
   * - useLlm: true (default) - use LLM for complex cases
   */
  async syncWikiPage(
    episode: WikiEpisode,
    options?: SyncWikiPageOptions
  ): Promise<SyncWikiPageResult> {
    const { pageId, title, content, groupId, timestamp, workspaceId } = episode

    // Default result (no contradictions)
    const emptyResult: SyncWikiPageResult = {
      entitiesExtracted: 0,
      contradictionsResolved: 0,
      contradictions: [],
    }

    // Try Python service first (LLM-based entity extraction with Kanbu entity types)
    if (await this.isPythonServiceAvailable()) {
      try {
        const result = await this.pythonClient.addEpisode({
          name: title,
          episode_body: content,
          source: 'text',
          source_description: `Wiki page: ${title}`,
          group_id: groupId,
          reference_time: timestamp.toISOString(),
          use_kanbu_entities: true, // Fase 10: Use custom entity types
        })

        // Log detailed extraction results
        const entityTypes = result.entity_details?.map(e => e.entity_type).filter((v, i, a) => a.indexOf(v) === i).join(', ')
        console.log(
          `[GraphitiService] Synced page ${pageId}: "${title}" via Python service - ` +
          `${result.entities_extracted} entities (${entityTypes || 'none'}), ${result.relations_created} relations`
        )

        // Also sync basic page metadata to FalkorDB for backlinks/queries
        await this.syncPageMetadataFallback(episode)
        // Python service doesn't support contradiction detection yet
        return { ...emptyResult, entitiesExtracted: result.entities_extracted }
      } catch (error) {
        if (error instanceof GraphitiClientError) {
          console.warn(
            `[GraphitiService] Python service error for page ${pageId}: ${error.message}, trying WikiAiService`
          )
          // Mark service as unavailable to skip future checks temporarily
          if (error.isConnectionError() || error.isServerError()) {
            this.pythonServiceAvailable = false
          }
        } else {
          console.warn(`[GraphitiService] Unexpected error for page ${pageId}, trying WikiAiService:`, error)
        }
      }
    }

    // Try WikiAiService (Fase 15.1 - uses Fase 14 providers)
    if (this.wikiAiService && workspaceId) {
      try {
        const aiResult = await this.syncWikiPageWithAiService(episode, options)
        if (aiResult) {
          return aiResult // Successfully synced with WikiAiService, includes contradiction data
        }
      } catch (error) {
        console.warn(
          `[GraphitiService] WikiAiService error for page ${pageId}: ${error instanceof Error ? error.message : 'Unknown error'}, using rules-based fallback`
        )
      }
    }

    // Final fallback: Direct FalkorDB with rules-based extraction
    await this.syncWikiPageFallback(episode)
    return emptyResult
  }

  /**
   * Sync wiki page using WikiAiService (Fase 15.1)
   * Uses configured providers from Fase 14 for LLM-based entity extraction
   * Returns contradiction data for UI notifications (Fase 17.4)
   *
   * OPTIMIZED (Fase 17.3.1): When oldContent is provided, uses diff-based extraction
   * to only process new/changed content. This reduces token usage from 600K+ to ~10K per edit.
   *
   * Fase 22.8.2: Optional deduplication during sync
   */
  private async syncWikiPageWithAiService(
    episode: WikiEpisode,
    options?: SyncWikiPageOptions
  ): Promise<SyncWikiPageResult | null> {
    if (!this.wikiAiService || !episode.workspaceId || !this.prisma) {
      return null
    }

    const context: WikiContext = {
      workspaceId: episode.workspaceId,
      projectId: episode.projectId,
    }

    // Check if reasoning provider is available
    const capabilities = await this.wikiAiService.getCapabilities(context)
    if (!capabilities.reasoning) {
      console.log(`[GraphitiService] No reasoning provider configured for workspace ${episode.workspaceId}`)
      return null
    }

    await this.initialize()

    const { pageId, title, content, oldContent, timestamp, userId, workspaceId, projectId, groupId } = episode

    // Fase 17.3.1: Calculate diff for incremental extraction
    const isUpdate = !!oldContent
    const diffContent = this.calculateContentDiff(oldContent, content)

    // If nothing changed, skip expensive operations
    if (isUpdate && diffContent.length === 0) {
      console.log(`[GraphitiService] Page ${pageId}: No content changes detected, skipping entity extraction`)
      return {
        entitiesExtracted: 0,
        contradictionsResolved: 0,
        contradictions: [],
      }
    }

    // For updates: extract entities from diff only (new/changed content)
    // For creates: extract from full content
    const contentToExtract = isUpdate ? diffContent : content

    // Extract entities using WikiAiService (Fase 14 providers)
    const extractionResult = await this.wikiAiService.extractEntities(
      context,
      contentToExtract,
      ['WikiPage', 'Task', 'User', 'Project', 'Concept']
    )

    // Log diff-based optimization
    if (isUpdate) {
      console.log(
        `[GraphitiService] Page ${pageId}: Diff-based extraction - ` +
        `diff size: ${diffContent.length} chars (was ${content.length}), ` +
        `${extractionResult.entities.length} entities in diff`
      )
    }

    // Sync page metadata to FalkorDB
    await this.syncPageMetadataFallback(episode)

    // Create entity nodes and relationships
    // Fase 17.4: Collect contradiction audit entries for UI notification
    let datesExtracted = 0
    let contradictionsResolved = 0
    const contradictionAuditEntries: ContradictionAuditEntry[] = []
    const auditService = getContradictionAuditService(this.prisma)

    // Track new entities for logging
    let newEntityCount = 0
    let skippedEntityCount = 0

    // Fase 19.3: Collect edges for embedding generation
    const edgesForEmbedding: EdgeForEmbedding[] = []

    // Fase 21.4: Collect nodes for embedding generation (entity resolution)
    const nodesForEmbedding: NodeForEmbedding[] = []

    for (const entity of extractionResult.entities) {
      // Map entity type to graph label
      const graphType = this.mapEntityTypeToGraphLabel(entity.type)

      // Fase 17.3.1: Check if this entity is new (not in old content)
      // Only run expensive LLM operations for new entities
      const entityIsNew = this.isNewEntity(entity.name, oldContent)

      // Create/update entity node (always do this for lastSeen timestamp)
      // Fase 22: Include groupId for multi-tenancy and deduplication filtering
      await this.query(`
        MERGE (e:${graphType} {name: '${this.escapeString(entity.name)}'})
        SET e.lastSeen = '${timestamp.toISOString()}',
            e.confidence = ${entity.confidence},
            e.groupId = '${groupId}'
      `)

      // Fase 21.4: Collect node for embedding generation (skip WikiPage - they have page embeddings)
      if (this.enableNodeEmbeddings && graphType !== 'WikiPage') {
        // Generate a stable node ID based on groupId and name
        const nodeId = `node-${groupId}-${graphType}-${entity.name}`.replace(/[^a-zA-Z0-9-]/g, '_')
        nodesForEmbedding.push({
          id: nodeId,
          name: entity.name,
          type: graphType as EmbeddableNodeType,
          groupId,
        })
      }

      // Generate fact description
      // Fase 17.4: Use actual context from content for meaningful contradiction detection
      // Instead of generic "page mentions entity", extract the actual sentence about the entity
      const contextContent = isUpdate ? diffContent : content
      const entityContextFact = this.extractEntityContext(contextContent, entity.name, title, 2)

      // For edge storage and date extraction, use full content context
      // This ensures we capture the actual semantic meaning for contradiction comparison
      const mentionsFact = entityContextFact

      // Debug log: Show extracted fact for verification
      console.log(`[GraphitiService] Entity "${entity.name}" fact: "${mentionsFact.substring(0, 100)}${mentionsFact.length > 100 ? '...' : ''}"`)

      // Fase 16.2: Extract dates using LLM if enabled
      // OPTIMIZED: Only for NEW entities (Fase 17.3.1)
      let validAt: Date | undefined
      let invalidAt: Date | undefined

      if (this.enableDateExtraction && this.wikiAiService && entityIsNew) {
        newEntityCount++
        try {
          // contextContent already defined above for entity context extraction
          const dateResult = await this.wikiAiService.extractEdgeDates(
            context,
            mentionsFact,
            contextContent,
            timestamp
          )
          if (dateResult.validAt) {
            validAt = dateResult.validAt
          }
          if (dateResult.invalidAt) {
            invalidAt = dateResult.invalidAt
          }
          datesExtracted++

          if (dateResult.reasoning) {
            console.log(
              `[GraphitiService] Date extraction for "${entity.name}": ${dateResult.reasoning}`
            )
          }
        } catch (dateError) {
          console.warn(
            `[GraphitiService] Date extraction failed for "${entity.name}": ` +
            `${dateError instanceof Error ? dateError.message : 'Unknown error'}`
          )
        }
      }

      // Fase 16.3 & 17.4: Detect and resolve contradictions, log to audit trail
      // NOTE: Contradiction detection runs for ALL entities in the diff, not just new ones!
      // A change like "Robin has brown hair" -> "Robin has green hair" should be detected
      // even though "Robin" already existed in the old content.
      if (this.enableDateExtraction && this.wikiAiService) {
        try {
          // Get existing edges for this entity (excluding current page to avoid false positives)
          const existingFacts = await this.getExistingEdgesForEntity(entity.name, graphType, pageId)

          // Debug: Log existing facts found for contradiction comparison
          console.log(
            `[GraphitiService] Contradiction check for "${entity.name}": ` +
            `${existingFacts.length} existing facts found from other pages`
          )
          if (existingFacts.length > 0) {
            existingFacts.forEach((f, i) => {
              console.log(`  - Fact ${i + 1}: "${f.fact.substring(0, 80)}${f.fact.length > 80 ? '...' : ''}"`)
            })
          }

          if (existingFacts.length > 0) {
            // Detect contradictions
            const contradictionResult = await this.wikiAiService.detectContradictions(
              context,
              mentionsFact,
              existingFacts
            )

            if (contradictionResult.contradictedFactIds.length > 0) {
              console.log(
                `[GraphitiService] Contradictions detected for "${entity.name}": ` +
                `${contradictionResult.contradictedFactIds.length} facts (${contradictionResult.reasoning})`
              )

              // Resolve contradictions by invalidating old edges
              const resolved = await this.resolveContradictions(
                contradictionResult.contradictedFactIds,
                validAt ?? timestamp
              )
              contradictionsResolved += resolved

              // Fase 17.4: Log to audit trail for UI notification
              if (resolved > 0) {
                try {
                  // Build invalidated facts array for audit
                  const invalidatedFacts = contradictionResult.contradictedFactIds.map((id) => {
                    const existingFact = existingFacts.find((f) => f.id === id)
                    return {
                      id,
                      fact: existingFact?.fact ?? 'Unknown fact',
                    }
                  })

                  // Use defaults for category and confidence (basic detection doesn't provide these)
                  // Enhanced detection (Fase 17.2) would provide more detailed info
                  const category = ContradictionCategory.FACTUAL // Default category
                  const confidence = 0.85 // Default high confidence for auto-resolved contradictions
                  const strategy = 'INVALIDATE_OLD' as const // Default strategy for auto-resolution

                  // Log to audit service
                  const auditEntry = await auditService.logContradictionResolution({
                    workspaceId,
                    projectId: projectId ?? undefined,
                    wikiPageId: pageId,
                    userId,
                    newFactId: `entity-${entity.name}`,
                    newFact: mentionsFact,
                    invalidatedFacts,
                    strategy,
                    confidence,
                    category,
                    reasoning: contradictionResult.reasoning,
                  })

                  contradictionAuditEntries.push(auditEntry)

                  console.log(
                    `[GraphitiService] Logged contradiction audit entry ${auditEntry.id} for "${entity.name}"`
                  )
                } catch (auditError) {
                  console.warn(
                    `[GraphitiService] Failed to log contradiction audit for "${entity.name}": ` +
                    `${auditError instanceof Error ? auditError.message : 'Unknown error'}`
                  )
                }
              }
            }
          }
        } catch (contradictionError) {
          console.warn(
            `[GraphitiService] Contradiction detection failed for "${entity.name}": ` +
            `${contradictionError instanceof Error ? contradictionError.message : 'Unknown error'}`
          )
        }
      }

      // Fase 17.3.1: Track skipped entities for date extraction only
      // (contradiction detection now runs for all entities in diff)
      if (!entityIsNew && this.enableDateExtraction) {
        skippedEntityCount++
      }

      // Create relationship from page to entity with temporal properties (Fase 16.1/16.2)
      const temporalProps = this.generateTemporalEdgeProps(timestamp, {
        fact: mentionsFact,
        validAt,
        invalidAt,
      })
      await this.query(`
        MATCH (p:WikiPage {pageId: ${pageId}})
        MATCH (e:${graphType} {name: '${this.escapeString(entity.name)}'})
        MERGE (p)-[r:MENTIONS]->(e)
        SET ${temporalProps}
      `)

      // Fase 19.3: Collect edge for embedding generation
      if (this.enableEdgeEmbeddings && mentionsFact) {
        edgesForEmbedding.push({
          id: `edge-${pageId}-${entity.name}`,
          fact: mentionsFact,
          edgeType: 'MENTIONS',
          sourceNode: title,
          targetNode: entity.name,
          validAt: validAt?.toISOString(),
          invalidAt: invalidAt?.toISOString(),
          createdAt: timestamp.toISOString(),
        })
      }
    }

    // Fase 17.3.1: Enhanced logging with optimization stats
    const dateInfo = this.enableDateExtraction ? `, ${datesExtracted} dates extracted` : ''
    const contradictionInfo = contradictionsResolved > 0 ? `, ${contradictionsResolved} contradictions resolved` : ''
    // Note: skipped count is for date extraction only - contradiction detection runs for all entities
    const optimizationInfo = isUpdate && skippedEntityCount > 0
      ? ` (date extraction: ${newEntityCount} new, ${skippedEntityCount} existing)`
      : ''
    console.log(
      `[GraphitiService] Synced page ${pageId}: "${title}" via WikiAiService (${extractionResult.provider}) - ` +
      `${extractionResult.entities.length} entities extracted${dateInfo}${contradictionInfo}${optimizationInfo}`
    )

    // Store embedding for semantic search (Fase 15.2)
    if (this.wikiEmbeddingService && capabilities.embedding) {
      try {
        await this.wikiEmbeddingService.storePageEmbedding(
          context,
          pageId,
          title,
          content,
          episode.groupId
        )
      } catch (embeddingError) {
        // Don't fail the sync if embedding storage fails
        console.warn(
          `[GraphitiService] Failed to store embedding for page ${pageId}: ` +
          `${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`
        )
      }
    }

    // Fase 19.3: Generate edge embeddings for semantic search over relations
    if (this.enableEdgeEmbeddings && this.wikiEdgeEmbeddingService && capabilities.embedding && edgesForEmbedding.length > 0) {
      try {
        const edgeResult = await this.wikiEdgeEmbeddingService.generateAndStoreEdgeEmbeddings(
          context,
          pageId,
          edgesForEmbedding
        )
        if (edgeResult.stored > 0 || edgeResult.skipped > 0) {
          console.log(
            `[GraphitiService] Edge embeddings for page ${pageId}: ${edgeResult.stored} stored, ${edgeResult.skipped} skipped`
          )
        }
      } catch (edgeEmbeddingError) {
        // Don't fail the sync if edge embedding storage fails
        console.warn(
          `[GraphitiService] Failed to store edge embeddings for page ${pageId}: ` +
          `${edgeEmbeddingError instanceof Error ? edgeEmbeddingError.message : 'Unknown error'}`
        )
      }
    }

    // Fase 21.4: Generate node embeddings for entity resolution
    if (this.enableNodeEmbeddings && this.wikiNodeEmbeddingService && capabilities.embedding && nodesForEmbedding.length > 0) {
      try {
        const nodeResult = await this.wikiNodeEmbeddingService.generateAndStoreBatchNodeEmbeddings(
          context,
          nodesForEmbedding
        )
        if (nodeResult.stored > 0 || nodeResult.skipped > 0) {
          console.log(
            `[GraphitiService] Node embeddings for page ${pageId}: ${nodeResult.stored} stored, ${nodeResult.skipped} skipped`
          )
        }
      } catch (nodeEmbeddingError) {
        // Don't fail the sync if node embedding storage fails
        console.warn(
          `[GraphitiService] Failed to store node embeddings for page ${pageId}: ` +
          `${nodeEmbeddingError instanceof Error ? nodeEmbeddingError.message : 'Unknown error'}`
        )
      }
    }

    // Fase 22.8.2: Entity deduplication during sync
    const enableDedup = options?.enableDedup ?? true
    let duplicatesFound = 0

    if (enableDedup && extractionResult.entities.length > 0) {
      try {
        const dedupResult = await this.runEntityDeduplication(
          extractionResult.entities,
          context,
          groupId,
          {
            threshold: options?.dedupThreshold ?? 0.85,
            useLlm: options?.useLlm ?? true,
            episodeContent: content,
          }
        )
        duplicatesFound = dedupResult.duplicatesFound

        if (duplicatesFound > 0) {
          console.log(
            `[GraphitiService] Page ${pageId}: Found ${duplicatesFound} duplicate entities ` +
            `(${dedupResult.exactMatches} exact, ${dedupResult.fuzzyMatches} fuzzy, ` +
            `${dedupResult.embeddingMatches} embedding, ${dedupResult.llmMatches} LLM)`
          )
        }
      } catch (dedupError) {
        // Don't fail the sync if deduplication fails
        console.warn(
          `[GraphitiService] Deduplication failed for page ${pageId}: ` +
          `${dedupError instanceof Error ? dedupError.message : 'Unknown error'}`
        )
      }
    }

    // Fase 17.4: Return result with contradiction data for UI notification
    return {
      entitiesExtracted: extractionResult.entities.length,
      contradictionsResolved,
      contradictions: contradictionAuditEntries,
      duplicatesFound, // Fase 22.8.2
    }
  }

  /**
   * Map entity type from LLM extraction to graph label
   */
  private mapEntityTypeToGraphLabel(type: string): string {
    const typeMap: Record<string, string> = {
      'WikiPage': 'WikiPage',
      'Task': 'Task',
      'User': 'Person',
      'Person': 'Person',
      'Project': 'Project',
      'Concept': 'Concept',
    }
    return typeMap[type] || 'Concept'
  }

  /**
   * Fase 22.8.2: Run entity deduplication and create IS_DUPLICATE_OF edges
   *
   * @param extractedEntities - Entities extracted from the current page
   * @param context - Wiki context (workspace/project)
   * @param groupId - Group ID for scoping (wiki-ws-{id} or wiki-proj-{id})
   * @param options - Deduplication options
   * @returns Deduplication statistics
   */
  private async runEntityDeduplication(
    extractedEntities: Array<{ name: string; type: string; confidence?: number }>,
    context: WikiContext,
    groupId: string,
    options: {
      threshold: number
      useLlm: boolean
      episodeContent: string
    }
  ): Promise<{
    duplicatesFound: number
    exactMatches: number
    fuzzyMatches: number
    embeddingMatches: number
    llmMatches: number
  }> {
    const emptyResult = {
      duplicatesFound: 0,
      exactMatches: 0,
      fuzzyMatches: 0,
      embeddingMatches: 0,
      llmMatches: 0,
    }

    // Get deduplication service with required dependencies
    const dedupService = getWikiDeduplicationService(
      this.wikiNodeEmbeddingService ?? undefined,
      this.wikiAiService ?? undefined
    )

    // Convert extracted entities to EntityNodeInfo format
    const extractedNodes: EntityNodeInfo[] = extractedEntities.map((entity, idx) => ({
      uuid: `temp-${groupId}-${entity.type}-${entity.name}-${idx}`.replace(/[^a-zA-Z0-9-]/g, '_'),
      name: entity.name,
      type: this.mapEntityTypeToGraphLabel(entity.type),
      groupId,
    }))

    if (extractedNodes.length === 0) {
      return emptyResult
    }

    // Fetch existing entities from FalkorDB for this group
    const existingNodes = await this.getExistingEntitiesForDedup(groupId)

    if (existingNodes.length === 0) {
      // No existing entities to compare against
      return emptyResult
    }

    // Run deduplication
    const result = await dedupService.resolveExtractedNodes(
      extractedNodes,
      existingNodes,
      {
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        useEmbeddings: !!this.wikiNodeEmbeddingService,
        useLlm: options.useLlm,
        embeddingThreshold: options.threshold,
      },
      options.episodeContent
    )

    // Create IS_DUPLICATE_OF edges for found duplicates
    for (const pair of result.duplicatePairs) {
      // Get the internal ID from FalkorDB (temp UUIDs are for dedup only)
      const sourceId = await this.getNodeIdByName(pair.sourceNode.name, pair.sourceNode.type, groupId)
      if (!sourceId) continue

      // targetNode.uuid is already the internal ID from getWorkspaceNodes
      await this.createDuplicateOfEdge(
        sourceId,
        pair.targetNode.uuid,
        pair.confidence,
        pair.matchType as 'exact' | 'fuzzy' | 'llm' | 'embedding',
        null
      )
    }

    return {
      duplicatesFound: result.duplicatePairs.length,
      exactMatches: result.stats.exactMatches,
      fuzzyMatches: result.stats.fuzzyMatches,
      embeddingMatches: result.stats.embeddingMatches,
      llmMatches: result.stats.llmMatches,
    }
  }

  /**
   * Fase 22.8.2: Get existing entities from FalkorDB for deduplication
   */
  private async getExistingEntitiesForDedup(groupId: string): Promise<EntityNodeInfo[]> {
    await this.initialize()

    const nodeTypes = ['Concept', 'Person', 'Task', 'Project']
    const entities: EntityNodeInfo[] = []

    for (const nodeType of nodeTypes) {
      try {
        const result = await this.query(`
          MATCH (n:${nodeType})
          WHERE n.groupId = '${groupId}'
          RETURN n.uuid as uuid, n.name as name, '${nodeType}' as type, n.groupId as groupId
        `) as unknown[][]

        for (const row of result) {
          if (row && row.length >= 4) {
            const [uuid, name, type, grpId] = row as [string, string, string, string]
            if (uuid && name) {
              entities.push({ uuid, name, type, groupId: grpId || groupId })
            }
          }
        }
      } catch (error) {
        console.warn(`[GraphitiService] Failed to fetch ${nodeType} entities for dedup:`, error)
      }
    }

    return entities
  }

  /**
   * Fase 22.8.2: Get node internal ID by name and type
   * Returns FalkorDB internal ID as string (since entity nodes may not have uuid property)
   */
  private async getNodeIdByName(name: string, type: string, groupId: string): Promise<string | null> {
    await this.initialize()

    try {
      const result = await this.query(`
        MATCH (n:${type} {name: '${this.escapeString(name)}', groupId: '${groupId}'})
        RETURN toString(ID(n)) as nodeId
        LIMIT 1
      `) as unknown[][]

      if (result && result.length > 0 && result[0] && result[0][0]) {
        return result[0][0] as string
      }
    } catch (error) {
      console.warn(`[GraphitiService] Failed to get ID for ${type}:${name}:`, error)
    }

    return null
  }

  /**
   * Fallback: Sync wiki page directly to FalkorDB with rules-based extraction
   */
  private async syncWikiPageFallback(episode: WikiEpisode): Promise<void> {
    await this.initialize()

    const { pageId, title, slug, content, groupId, userId, timestamp } = episode
    const escapedTitle = this.escapeString(title)
    const escapedSlug = this.escapeString(slug)

    // First, try to find and update an existing node by title (from wiki link extraction)
    // Then fall back to creating/updating by pageId
    await this.query(`
      MERGE (p:WikiPage {pageId: ${pageId}})
      ON CREATE SET p.title = '${escapedTitle}'
      ON MATCH SET p.title = '${escapedTitle}'
      SET p.slug = '${escapedSlug}',
          p.groupId = '${groupId}',
          p.updatedBy = ${userId},
          p.updatedAt = '${timestamp.toISOString()}',
          p.contentLength = ${content.length}
    `)

    // Also update any title-only nodes to point to this pageId
    // This handles the case where [[Page Title]] was extracted before the page was synced
    await this.query(`
      MATCH (titleNode:WikiPage {title: '${escapedTitle}'})
      WHERE titleNode.pageId IS NULL
      SET titleNode.pageId = ${pageId},
          titleNode.slug = '${escapedSlug}',
          titleNode.groupId = '${groupId}',
          titleNode.updatedBy = ${userId},
          titleNode.updatedAt = '${timestamp.toISOString()}'
    `)

    // Extract and link entities from content
    const entities = this.extractEntities(content)

    for (const entity of entities) {
      // Create entity node if not exists
      await this.query(`
        MERGE (e:${entity.type} {name: '${this.escapeString(entity.name)}'})
        SET e.lastSeen = '${timestamp.toISOString()}'
      `)

      // Create relationship from page to entity with temporal properties (Fase 16.1)
      const mentionsFact = this.generateMentionsFact(title, entity.name, entity.type)
      const temporalProps = this.generateTemporalEdgeProps(timestamp, { fact: mentionsFact })
      await this.query(`
        MATCH (p:WikiPage {pageId: ${pageId}})
        MATCH (e:${entity.type} {name: '${this.escapeString(entity.name)}'})
        MERGE (p)-[r:MENTIONS]->(e)
        SET ${temporalProps}
      `)
    }

    // Extract and link wiki links
    const wikiLinks = this.extractWikiLinks(content)

    for (const link of wikiLinks) {
      // Create placeholder for linked page (will be resolved when that page is synced)
      await this.query(`
        MERGE (target:WikiPage {title: '${this.escapeString(link)}'})
      `)

      // Create LINKS_TO relationship with temporal properties (Fase 16.1)
      const linksToFact = this.generateLinksToFact(title, link)
      const temporalProps = this.generateTemporalEdgeProps(timestamp, { fact: linksToFact })
      await this.query(`
        MATCH (source:WikiPage {pageId: ${pageId}})
        MATCH (target:WikiPage {title: '${this.escapeString(link)}'})
        WHERE source <> target
        MERGE (source)-[r:LINKS_TO]->(target)
        SET ${temporalProps}
      `)
    }

    console.log(`[GraphitiService] Synced page ${pageId}: "${title}" via fallback - ${entities.length} entities, ${wikiLinks.length} links`)
  }

  /**
   * Sync only page metadata to FalkorDB (used alongside Python service)
   */
  private async syncPageMetadataFallback(episode: WikiEpisode): Promise<void> {
    await this.initialize()

    const { pageId, title, slug, content, groupId, userId, timestamp } = episode
    const escapedTitle = this.escapeString(title)
    const escapedSlug = this.escapeString(slug)

    // Sync basic page node for backlinks/queries
    await this.query(`
      MERGE (p:WikiPage {pageId: ${pageId}})
      ON CREATE SET p.title = '${escapedTitle}'
      ON MATCH SET p.title = '${escapedTitle}'
      SET p.slug = '${escapedSlug}',
          p.groupId = '${groupId}',
          p.updatedBy = ${userId},
          p.updatedAt = '${timestamp.toISOString()}',
          p.contentLength = ${content.length}
    `)

    // Extract and sync wiki links for backlinks functionality with temporal properties (Fase 16.1)
    const wikiLinks = this.extractWikiLinks(content)
    for (const link of wikiLinks) {
      await this.query(`MERGE (target:WikiPage {title: '${this.escapeString(link)}'})`)

      const linksToFact = this.generateLinksToFact(title, link)
      const temporalProps = this.generateTemporalEdgeProps(timestamp, { fact: linksToFact })
      await this.query(`
        MATCH (source:WikiPage {pageId: ${pageId}})
        MATCH (target:WikiPage {title: '${this.escapeString(link)}'})
        WHERE source <> target
        MERGE (source)-[r:LINKS_TO]->(target)
        SET ${temporalProps}
      `)
    }
  }

  /**
   * Delete a wiki page from the graph
   */
  async deleteWikiPage(pageId: number): Promise<void> {
    await this.initialize()

    // Delete the page node and all its relationships
    await this.query(`
      MATCH (p:WikiPage {pageId: ${pageId}})
      DETACH DELETE p
    `)

    console.log(`[GraphitiService] Deleted page ${pageId} from graph`)
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  /**
   * Get pages that link to a specific page (backlinks)
   * Matches by pageId OR by title (for wiki links that were created before the target page was synced)
   */
  async getBacklinks(pageId: number): Promise<{ pageId: number; title: string; slug: string }[]> {
    await this.initialize()

    // First get the title of the target page
    const targetResult = await this.query(`
      MATCH (p:WikiPage {pageId: ${pageId}})
      RETURN p.title AS title
    `)
    const targetParsed = this.parseResults<{ title: string }>(targetResult, ['title'])
    const targetTitle = targetParsed[0]?.title

    if (!targetTitle) {
      // Page not in graph yet, try matching by pageId only
      const result = await this.query(`
        MATCH (source:WikiPage)-[:LINKS_TO]->(target:WikiPage {pageId: ${pageId}})
        WHERE source.pageId IS NOT NULL
        RETURN source.pageId AS pageId, source.title AS title, source.slug AS slug
      `)
      return this.parseResults<{ pageId: number; title: string; slug: string }>(result, ['pageId', 'title', 'slug'])
    }

    // Find pages linking to this page by pageId OR by title
    const escapedTitle = this.escapeString(targetTitle)
    const result = await this.query(`
      MATCH (source:WikiPage)-[:LINKS_TO]->(target:WikiPage)
      WHERE (target.pageId = ${pageId} OR target.title = '${escapedTitle}')
        AND source.pageId IS NOT NULL
        AND source.pageId <> ${pageId}
      RETURN DISTINCT source.pageId AS pageId, source.title AS title, source.slug AS slug
    `)

    return this.parseResults<{ pageId: number; title: string; slug: string }>(result, ['pageId', 'title', 'slug'])
  }

  /**
   * Get pages related through shared entities
   */
  async getRelatedPages(pageId: number, limit: number = 5): Promise<{ pageId: number; title: string; slug: string; sharedCount: number }[]> {
    await this.initialize()

    const result = await this.query(`
      MATCH (p1:WikiPage {pageId: ${pageId}})-[:MENTIONS]->(e)<-[:MENTIONS]-(p2:WikiPage)
      WHERE p1 <> p2 AND p2.pageId IS NOT NULL
      WITH p2, count(e) AS sharedCount
      RETURN p2.pageId AS pageId, p2.title AS title, p2.slug AS slug, sharedCount
      ORDER BY sharedCount DESC
      LIMIT ${limit}
    `)

    return this.parseResults<{ pageId: number; title: string; slug: string; sharedCount: number }>(result, ['pageId', 'title', 'slug', 'sharedCount'])
  }

  /**
   * Get entities mentioned in a page
   */
  async getPageEntities(pageId: number): Promise<GraphEntity[]> {
    await this.initialize()

    const result = await this.query(`
      MATCH (p:WikiPage {pageId: ${pageId}})-[:MENTIONS]->(e)
      RETURN e.name AS name, labels(e)[0] AS type
    `)

    const parsed = this.parseResults<{ name: string; type: string }>(result, ['name', 'type'])
    return parsed.map(row => ({
      id: `${row.type}-${row.name}`,
      name: row.name,
      type: row.type as GraphEntity['type'],
      properties: {},
    }))
  }

  /**
   * Search for pages by content/entities
   * Uses Python service for semantic search when available, falls back to text search
   */
  async search(query: string, groupId?: string, limit: number = 10): Promise<SearchResult[]> {
    // Try Python service first (semantic search with embeddings)
    if (await this.isPythonServiceAvailable()) {
      try {
        const response = await this.pythonClient.search({
          query,
          group_id: groupId,
          limit,
        })

        // Map Python response to our SearchResult format
        return response.results.map(r => ({
          nodeId: r.uuid,
          name: r.name,
          type: r.result_type,
          score: r.score,
          pageId: r.metadata?.pageId as number | undefined,
        }))
      } catch (error) {
        if (error instanceof GraphitiClientError) {
          console.warn(`[GraphitiService] Python search error: ${error.message}, using fallback`)
        }
        // Fall through to fallback
      }
    }

    // Fallback: Direct FalkorDB text search
    return this.searchFallback(query, groupId, limit)
  }

  /**
   * Fallback: Direct FalkorDB text search
   */
  private async searchFallback(query: string, groupId?: string, limit: number = 10): Promise<SearchResult[]> {
    await this.initialize()

    // Search in page titles and entity names
    const searchTerm = this.escapeString(query.toLowerCase())

    const groupFilter = groupId ? `AND p.groupId = '${groupId}'` : ''

    const result = await this.query(`
      MATCH (p:WikiPage)
      WHERE toLower(p.title) CONTAINS '${searchTerm}' ${groupFilter}
      RETURN p.pageId AS pageId, p.title AS name, 'WikiPage' AS type, 1.0 AS score
      UNION
      MATCH (p:WikiPage)-[:MENTIONS]->(e)
      WHERE toLower(e.name) CONTAINS '${searchTerm}' ${groupFilter}
      RETURN p.pageId AS pageId, p.title AS name, 'WikiPage' AS type, 0.8 AS score
      LIMIT ${limit}
    `)

    const parsed = this.parseResults<{ pageId: number; name: string; type: string; score: number }>(result, ['pageId', 'name', 'type', 'score'])

    // Deduplicate by pageId
    const seen = new Set<number>()
    return parsed.filter(r => {
      if (seen.has(r.pageId)) return false
      seen.add(r.pageId)
      return true
    }).map(r => ({
      nodeId: `page-${r.pageId}`,
      name: r.name,
      type: r.type,
      score: r.score,
      pageId: r.pageId,
    }))
  }

  /**
   * Temporal search - "What did we know at time X?" (Fase 16.4 - Updated)
   *
   * Now with FalkorDB fallback using bi-temporal fields when Python service unavailable.
   * @see temporalSearchWithFallback for implementation details
   */
  async temporalSearch(query: string, groupId: string, asOf: Date, limit: number = 10): Promise<SearchResult[]> {
    // Delegate to the fallback-enabled method
    return this.temporalSearchWithFallback(query, groupId, asOf, limit)
  }

  // ===========================================================================
  // Semantic Search (Fase 15.2)
  // ===========================================================================

  /**
   * Semantic search using embeddings stored in Qdrant
   * Searches by meaning rather than keywords
   *
   * Fallback chain:
   * 1. Python Graphiti service (if available)
   * 2. WikiEmbeddingService + Qdrant vector search
   * 3. FalkorDB text search (basic keyword matching)
   */
  async semanticSearch(
    query: string,
    workspaceId: number,
    options?: {
      projectId?: number
      groupId?: string
      limit?: number
      scoreThreshold?: number
    }
  ): Promise<SemanticSearchResult[]> {
    const limit = options?.limit ?? 10
    const scoreThreshold = options?.scoreThreshold ?? 0.5

    // Try Python service first (has its own embedding pipeline)
    if (await this.isPythonServiceAvailable()) {
      try {
        const response = await this.pythonClient.search({
          query,
          group_id: options?.groupId,
          limit,
        })

        return response.results.map(r => ({
          pageId: r.metadata?.pageId as number,
          title: r.name,
          score: r.score,
          groupId: r.metadata?.groupId as string || '',
        }))
      } catch (error) {
        if (error instanceof GraphitiClientError) {
          console.warn(`[GraphitiService] Python semantic search error: ${error.message}, trying WikiEmbeddingService`)
        }
      }
    }

    // Try WikiEmbeddingService (Qdrant vector search)
    if (this.wikiEmbeddingService) {
      try {
        const context: WikiContext = {
          workspaceId,
          projectId: options?.projectId,
        }

        return await this.wikiEmbeddingService.semanticSearch(context, query, {
          workspaceId,
          projectId: options?.projectId,
          groupId: options?.groupId,
          limit,
          scoreThreshold,
        })
      } catch (error) {
        console.warn(
          `[GraphitiService] WikiEmbeddingService search error: ${error instanceof Error ? error.message : 'Unknown'}, using text fallback`
        )
      }
    }

    // Final fallback: text search in FalkorDB
    const textResults = await this.searchFallback(query, options?.groupId, limit)
    return textResults
      .filter(r => r.pageId !== undefined)
      .map(r => ({
        pageId: r.pageId!,
        title: r.name,
        score: r.score,
        groupId: '',
      }))
  }

  /**
   * Find wiki pages similar to a given page
   */
  async findSimilarPages(
    pageId: number,
    workspaceId: number,
    limit: number = 5
  ): Promise<SemanticSearchResult[]> {
    if (!this.wikiEmbeddingService) {
      console.warn('[GraphitiService] WikiEmbeddingService not available for similar pages search')
      return []
    }

    try {
      const context: WikiContext = { workspaceId }
      return await this.wikiEmbeddingService.findSimilarPages(context, pageId, limit)
    } catch (error) {
      console.error(
        `[GraphitiService] Find similar pages failed:`,
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Get embedding statistics for a workspace
   */
  async getEmbeddingStats(): Promise<{ totalPages: number; collectionExists: boolean }> {
    if (!this.wikiEmbeddingService) {
      return { totalPages: 0, collectionExists: false }
    }

    return this.wikiEmbeddingService.getStats()
  }

  /**
   * Get facts for an entity from the knowledge graph (Fase 17.5)
   *
   * Used by user-triggered fact check feature.
   * Returns all facts about an entity with source page information.
   *
   * @param entityName - Name of the entity to search for
   * @param entityType - Type/label (e.g., 'Person', 'Concept', 'Project')
   * @param excludePageId - Optional page ID to exclude from results
   */
  async getFactsForEntity(
    entityName: string,
    entityType: string,
    excludePageId?: number
  ): Promise<Array<{
    fact: string
    pageId: number
    pageTitle: string
    pageSlug?: string
    validAt: string | null
    invalidAt: string | null
  }>> {
    await this.initialize()

    const whereClause = excludePageId
      ? `WHERE e.expired_at IS NULL AND p.pageId <> ${excludePageId}`
      : `WHERE e.expired_at IS NULL`

    const result = await this.query(`
      MATCH (p:WikiPage)-[e:MENTIONS]->(target:${entityType} {name: '${this.escapeString(entityName)}'})
      ${whereClause}
      RETURN p.pageId AS pageId,
             p.title AS pageTitle,
             p.slug AS pageSlug,
             e.fact AS fact,
             e.valid_at AS validAt,
             e.invalid_at AS invalidAt
      ORDER BY e.created_at DESC
      LIMIT 20
    `)

    const parsed = this.parseResults<{
      pageId: number
      pageTitle: string
      pageSlug: string | null
      fact: string | null
      validAt: string | null
      invalidAt: string | null
    }>(result, ['pageId', 'pageTitle', 'pageSlug', 'fact', 'validAt', 'invalidAt'])

    return parsed
      .filter(row => row.fact !== null)
      .map(row => ({
        fact: row.fact!,
        pageId: row.pageId,
        pageTitle: row.pageTitle || 'Unknown',
        pageSlug: row.pageSlug ?? undefined,
        validAt: row.validAt,
        invalidAt: row.invalidAt,
      }))
  }

  /**
   * Get full graph data for visualization
   * Returns all nodes and edges for a workspace/project wiki
   * Enhanced for Fase 15.4: includes timestamps for time filtering
   */
  async getGraph(groupId: string): Promise<{
    nodes: Array<{
      id: string
      label: string
      type: 'WikiPage' | 'Concept' | 'Person' | 'Task'
      pageId?: number
      slug?: string
      updatedAt?: string
      /** FalkorDB internal ID for entity nodes (used for duplicate matching) */
      uuid?: string
    }>
    edges: Array<{
      source: string
      target: string
      type: 'LINKS_TO' | 'MENTIONS'
      updatedAt?: string
    }>
  }> {
    await this.initialize()

    // Get all WikiPage nodes with timestamps
    const pagesResult = await this.query(`
      MATCH (p:WikiPage {groupId: '${groupId}'})
      WHERE p.pageId IS NOT NULL
      RETURN p.pageId AS pageId, p.title AS title, p.slug AS slug, p.updatedAt AS updatedAt
    `)
    const pages = this.parseResults<{ pageId: number; title: string; slug: string; updatedAt?: string }>(pagesResult, ['pageId', 'title', 'slug', 'updatedAt'])

    // Get all entities connected to pages in this group
    // Fase 22.9: Include FalkorDB internal ID (uuid) for duplicate matching
    const entitiesResult = await this.query(`
      MATCH (p:WikiPage {groupId: '${groupId}'})-[:MENTIONS]->(e)
      WHERE p.pageId IS NOT NULL
      RETURN DISTINCT toString(ID(e)) AS uuid, e.name AS name, labels(e)[0] AS type
    `)
    const entities = this.parseResults<{ uuid: string; name: string; type: string }>(entitiesResult, ['uuid', 'name', 'type'])

    // Get LINKS_TO edges between pages (with timestamps)
    const linksResult = await this.query(`
      MATCH (source:WikiPage {groupId: '${groupId}'})-[r:LINKS_TO]->(target:WikiPage)
      WHERE source.pageId IS NOT NULL AND target.pageId IS NOT NULL
      RETURN source.pageId AS sourceId, target.pageId AS targetId, r.updatedAt AS updatedAt
    `)
    const links = this.parseResults<{ sourceId: number; targetId: number; updatedAt?: string }>(linksResult, ['sourceId', 'targetId', 'updatedAt'])

    // Get MENTIONS edges (with timestamps)
    const mentionsResult = await this.query(`
      MATCH (p:WikiPage {groupId: '${groupId}'})-[r:MENTIONS]->(e)
      WHERE p.pageId IS NOT NULL
      RETURN p.pageId AS pageId, e.name AS entityName, labels(e)[0] AS entityType, r.updatedAt AS updatedAt
    `)
    const mentions = this.parseResults<{ pageId: number; entityName: string; entityType: string; updatedAt?: string }>(mentionsResult, ['pageId', 'entityName', 'entityType', 'updatedAt'])

    // Build nodes array
    const nodes: Array<{
      id: string
      label: string
      type: 'WikiPage' | 'Concept' | 'Person' | 'Task'
      pageId?: number
      slug?: string
      updatedAt?: string
      uuid?: string
    }> = []

    // Add page nodes
    for (const page of pages) {
      nodes.push({
        id: `page-${page.pageId}`,
        label: page.title,
        type: 'WikiPage',
        pageId: page.pageId,
        slug: page.slug,
        updatedAt: page.updatedAt,
      })
    }

    // Add entity nodes
    // Fase 22.9: Include uuid for duplicate matching
    for (const entity of entities) {
      const nodeType = entity.type as 'Concept' | 'Person' | 'Task'
      nodes.push({
        id: `${entity.type.toLowerCase()}-${entity.name}`,
        label: entity.name,
        type: nodeType,
        uuid: entity.uuid, // FalkorDB internal ID for duplicate matching
      })
    }

    // Build edges array
    const edges: Array<{
      source: string
      target: string
      type: 'LINKS_TO' | 'MENTIONS'
      updatedAt?: string
    }> = []

    // Add LINKS_TO edges
    for (const link of links) {
      edges.push({
        source: `page-${link.sourceId}`,
        target: `page-${link.targetId}`,
        type: 'LINKS_TO',
        updatedAt: link.updatedAt,
      })
    }

    // Add MENTIONS edges
    for (const mention of mentions) {
      edges.push({
        source: `page-${mention.pageId}`,
        target: `${mention.entityType.toLowerCase()}-${mention.entityName}`,
        type: 'MENTIONS',
        updatedAt: mention.updatedAt,
      })
    }

    return { nodes, edges }
  }

  /**
   * Get graph statistics
   */
  async getStats(groupId?: string): Promise<{ pages: number; entities: number; relationships: number }> {
    await this.initialize()

    const groupFilter = groupId ? `{groupId: '${groupId}'}` : ''

    const pagesResult = await this.query(`MATCH (p:WikiPage ${groupFilter}) RETURN count(p) AS count`)
    const entitiesResult = await this.query(`MATCH (e) WHERE NOT e:WikiPage RETURN count(e) AS count`)
    const relsResult = await this.query(`MATCH ()-[r]->() RETURN count(r) AS count`)

    const parseCount = (result: unknown[]): number => {
      const parsed = this.parseResults<{ count: number }>(result, ['count'])
      return parsed[0]?.count ?? 0
    }

    return {
      pages: parseCount(pagesResult),
      entities: parseCount(entitiesResult),
      relationships: parseCount(relsResult),
    }
  }

  // ===========================================================================
  // Entity Extraction (Simple Rules-Based)
  // ===========================================================================

  /**
   * Extract entities from content using simple patterns
   * TODO: Replace with LLM-based extraction for better results
   */
  private extractEntities(content: string): { name: string; type: GraphEntity['type'] }[] {
    const entities: { name: string; type: GraphEntity['type'] }[] = []
    const seen = new Set<string>()

    // Extract @mentions (Person)
    const mentionRegex = /@(\w+)/g
    let match: RegExpExecArray | null
    while ((match = mentionRegex.exec(content)) !== null) {
      const name = match[1]
      if (name) {
        const key = `Person:${name}`
        if (!seen.has(key)) {
          entities.push({ name, type: 'Person' })
          seen.add(key)
        }
      }
    }

    // Extract #task references (Task)
    const taskRegex = /#([A-Z]+-\d+)/g
    while ((match = taskRegex.exec(content)) !== null) {
      const name = match[1]
      if (name) {
        const key = `Task:${name}`
        if (!seen.has(key)) {
          entities.push({ name, type: 'Task' })
          seen.add(key)
        }
      }
    }

    // Extract capitalized terms as potential concepts (simplified)
    // This is a placeholder - should use LLM for better extraction
    const conceptRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    const skipWords = new Set(['The', 'This', 'That', 'What', 'When', 'Where', 'How', 'Why', 'If', 'Then'])
    while ((match = conceptRegex.exec(content)) !== null) {
      const name = match[1]
      if (name && name.length > 2 && !skipWords.has(name)) {
        const key = `Concept:${name}`
        if (!seen.has(key)) {
          entities.push({ name, type: 'Concept' })
          seen.add(key)
        }
      }
    }

    return entities.slice(0, 20) // Limit to avoid noise
  }

  /**
   * Extract wiki links from content
   */
  private extractWikiLinks(content: string): string[] {
    const links: string[] = []
    const linkRegex = /\[\[([^\]]+)\]\]/g
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(content)) !== null) {
      const captured = match[1]
      if (captured) {
        const parts = captured.split('|')
        const link = (parts[0] ?? '').trim() // Handle [[Page|Display Text]] format
        if (link && !links.includes(link)) {
          links.push(link)
        }
      }
    }

    return links
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Calculate the diff between old and new content (Fase 17.3.1)
   *
   * Returns only the new/changed parts of the content.
   * Uses a simple line-based diff that works well for wiki content.
   *
   * @param oldContent - Previous version of the content
   * @param newContent - Current version of the content
   * @returns The new/changed parts concatenated, or full newContent if no oldContent
   */
  private calculateContentDiff(oldContent: string | undefined, newContent: string): string {
    if (!oldContent) {
      // No old content = everything is new (first save)
      return newContent
    }

    // Normalize whitespace for comparison
    const normalizeText = (text: string) => text.trim().toLowerCase()

    // Split into lines and create a set of old content lines
    const oldLines = new Set(
      oldContent.split('\n')
        .map(line => normalizeText(line))
        .filter(line => line.length > 0)
    )

    // Find lines that are new or changed
    const newLines = newContent.split('\n').filter(line => {
      const normalized = normalizeText(line)
      return normalized.length > 0 && !oldLines.has(normalized)
    })

    // If no new lines, return empty (nothing changed)
    if (newLines.length === 0) {
      return ''
    }

    // Return the new/changed content
    return newLines.join('\n')
  }

  /**
   * Check if an entity is new (not mentioned in old content) (Fase 17.3.1)
   *
   * @param entityName - Name of the entity to check
   * @param oldContent - Previous version of the content
   * @returns true if entity is new, false if it was already in old content
   */
  private isNewEntity(entityName: string, oldContent: string | undefined): boolean {
    if (!oldContent) {
      // No old content = all entities are new
      return true
    }

    // Case-insensitive search for entity name in old content
    const normalizedOld = oldContent.toLowerCase()
    const normalizedName = entityName.toLowerCase()

    return !normalizedOld.includes(normalizedName)
  }

  /**
   * Generate temporal edge properties for a new edge (Fase 16.1)
   *
   * @param timestamp - The reference timestamp for the edge
   * @param options - Optional overrides for temporal fields
   * @returns Cypher SET clause fragment for temporal properties
   */
  private generateTemporalEdgeProps(
    timestamp: Date,
    options?: {
      fact?: string
      validAt?: Date
      invalidAt?: Date
      isUpdate?: boolean  // If true, don't set created_at
    }
  ): string {
    const now = new Date()
    const isoTimestamp = timestamp.toISOString()
    const isoNow = now.toISOString()

    // Build properties array
    const props: string[] = [
      `r.updatedAt = '${isoTimestamp}'`,
    ]

    // Transaction time: created_at (only on create, not update)
    if (!options?.isUpdate) {
      props.push(`r.created_at = COALESCE(r.created_at, '${isoNow}')`)
    }

    // Valid time: valid_at defaults to timestamp if not specified
    const validAt = options?.validAt ?? timestamp
    props.push(`r.valid_at = COALESCE(r.valid_at, '${validAt.toISOString()}')`)

    // Valid time: invalid_at only if explicitly specified
    if (options?.invalidAt) {
      props.push(`r.invalid_at = '${options.invalidAt.toISOString()}'`)
    }

    // Fact description if provided
    if (options?.fact) {
      props.push(`r.fact = '${this.escapeString(options.fact)}'`)
    }

    return props.join(',\n            ')
  }

  /**
   * Generate a fact description for a MENTIONS edge
   */
  private generateMentionsFact(pageTitle: string, entityName: string, entityType: string): string {
    return `"${pageTitle}" mentions ${entityType.toLowerCase()} "${entityName}"`
  }

  /**
   * Generate a fact description for a LINKS_TO edge
   */
  private generateLinksToFact(sourceTitle: string, targetTitle: string): string {
    return `"${sourceTitle}" links to "${targetTitle}"`
  }

  /**
   * Extract the actual sentence/context where an entity is mentioned (Fase 17.4)
   *
   * This function finds the sentence(s) in the content that mention the entity,
   * providing meaningful context for contradiction detection.
   *
   * For example, if content contains "Robin has green hair. He works at Acme."
   * and entity is "Robin", this returns "Robin has green hair."
   *
   * @param content - The page content to search
   * @param entityName - The entity name to find
   * @param pageTitle - Page title for fallback
   * @param maxSentences - Maximum sentences to include (default: 2)
   * @returns The extracted context or a fallback mentions fact
   */
  private extractEntityContext(
    content: string,
    entityName: string,
    pageTitle: string,
    maxSentences: number = 2
  ): string {
    // Normalize for case-insensitive search
    const normalizedContent = content.toLowerCase()
    const normalizedEntity = entityName.toLowerCase()

    // Find position of entity mention
    const entityIndex = normalizedContent.indexOf(normalizedEntity)
    if (entityIndex === -1) {
      // Entity not found in content, use fallback
      return `"${pageTitle}" mentions "${entityName}"`
    }

    // Split content into sentences (simple approach)
    // Handle common sentence endings: . ! ? and newlines
    const sentences = content.split(/(?<=[.!?])\s+|\n+/).filter(s => s.trim().length > 0)

    // Find sentences that contain the entity (case-insensitive)
    const relevantSentences: string[] = []
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(normalizedEntity)) {
        relevantSentences.push(sentence.trim())
        if (relevantSentences.length >= maxSentences) break
      }
    }

    if (relevantSentences.length === 0) {
      // No sentence found, extract context around mention
      const start = Math.max(0, entityIndex - 50)
      const end = Math.min(content.length, entityIndex + entityName.length + 100)
      let context = content.substring(start, end).trim()

      // Clean up partial words at start/end
      if (start > 0) {
        const firstSpace = context.indexOf(' ')
        if (firstSpace > 0 && firstSpace < 20) {
          context = context.substring(firstSpace + 1)
        }
      }
      if (end < content.length) {
        const lastSpace = context.lastIndexOf(' ')
        if (lastSpace > context.length - 20) {
          context = context.substring(0, lastSpace)
        }
      }

      return context || `"${pageTitle}" mentions "${entityName}"`
    }

    // Join relevant sentences
    const contextFact = relevantSentences.join(' ')

    // Truncate if too long (max 500 chars for fact description)
    if (contextFact.length > 500) {
      return contextFact.substring(0, 497) + '...'
    }

    return contextFact
  }

  /**
   * Get existing edges (MENTIONS relationships) for an entity (Fase 16.3)
   *
   * Returns all edges that mention a specific entity, including their
   * fact descriptions and temporal properties.
   *
   * Fase 17.4: If stored facts are generic "mentions" format, fetches page content
   * from database and extracts actual context for meaningful contradiction comparison.
   *
   * @param entityName - The name of the entity to find edges for
   * @param entityType - The type/label of the entity (e.g., 'Concept', 'User')
   * @param excludePageId - Optional pageId to exclude (prevents false positives when re-saving same page)
   */
  private async getExistingEdgesForEntity(
    entityName: string,
    entityType: string,
    excludePageId?: number
  ): Promise<ExistingFact[]> {
    // Build WHERE clause - always exclude expired edges, optionally exclude current page
    const whereClause = excludePageId
      ? `WHERE e.expired_at IS NULL AND p.pageId <> ${excludePageId}`
      : `WHERE e.expired_at IS NULL`

    const result = await this.query(`
      MATCH (p:WikiPage)-[e:MENTIONS]->(target:${entityType} {name: '${this.escapeString(entityName)}'})
      ${whereClause}
      RETURN id(e) AS edgeId,
             e.fact AS fact,
             e.valid_at AS validAt,
             e.invalid_at AS invalidAt,
             p.pageId AS pageId,
             p.title AS pageTitle
    `)

    const parsed = this.parseResults<{
      edgeId: number | string
      fact: string | null
      validAt: string | null
      invalidAt: string | null
      pageId: number
      pageTitle: string
    }>(result, ['edgeId', 'fact', 'validAt', 'invalidAt', 'pageId', 'pageTitle'])

    // Fase 17.4: Check if facts are in old generic format and need context extraction
    const facts: ExistingFact[] = []
    for (const row of parsed) {
      if (!row.fact) continue

      let fact = row.fact

      // Detect old generic "mentions" format and extract actual context if needed
      const isGenericFormat = fact.includes('" mentions ') && fact.includes(' "')
      if (isGenericFormat && this.prisma) {
        try {
          // Fetch page content from database to extract actual context
          const page = await this.prisma.wikiPage.findUnique({
            where: { id: row.pageId },
            select: { content: true, title: true }
          })
          if (page?.content) {
            const extractedContext = this.extractEntityContext(
              page.content,
              entityName,
              page.title ?? row.pageTitle,
              2
            )
            // Only use extracted context if it's more meaningful than generic format
            if (!extractedContext.includes('" mentions "') && extractedContext.length > 10) {
              fact = extractedContext
              console.log(
                `[GraphitiService] Upgraded fact for "${entityName}" from page ${row.pageId}: "${fact.substring(0, 80)}..."`
              )
            }
          }
        } catch (err) {
          // Keep original fact on error
          console.warn(
            `[GraphitiService] Failed to extract context for "${entityName}" from page ${row.pageId}:`,
            err instanceof Error ? err.message : 'Unknown error'
          )
        }
      }

      facts.push({
        id: `edge-${row.edgeId}`,
        fact,
        validAt: row.validAt,
        invalidAt: row.invalidAt,
      })
    }

    return facts
  }

  /**
   * Resolve contradictions by invalidating old edges (Fase 16.3)
   *
   * When a new fact contradicts existing facts, this method:
   * 1. Sets invalid_at on the old edge to when the new fact became valid
   * 2. Sets expired_at on the old edge to mark it as superseded
   *
   * @param contradictedEdgeIds - IDs of edges to invalidate (format: "edge-{id}")
   * @param newFactValidAt - When the new (contradicting) fact became valid
   */
  private async resolveContradictions(
    contradictedEdgeIds: string[],
    newFactValidAt: Date
  ): Promise<number> {
    if (contradictedEdgeIds.length === 0) return 0

    const now = new Date()
    let invalidatedCount = 0

    for (const edgeId of contradictedEdgeIds) {
      // Extract numeric ID from "edge-{id}" format
      const numericId = edgeId.replace('edge-', '')

      try {
        // Update the edge to mark it as invalidated
        await this.query(`
          MATCH ()-[e]->()
          WHERE id(e) = ${numericId}
            AND e.expired_at IS NULL
          SET e.invalid_at = '${newFactValidAt.toISOString()}',
              e.expired_at = '${now.toISOString()}'
        `)
        invalidatedCount++
      } catch (error) {
        console.warn(
          `[GraphitiService] Failed to invalidate edge ${edgeId}: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return invalidatedCount
  }

  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
  }

  private parseResults<T extends Record<string, unknown>>(result: unknown[], columns: string[]): T[] {
    if (!Array.isArray(result) || result.length < 2) return []

    // FalkorDB result format: [headers, [row1, row2, ...], metadata]
    // The rows are nested in a single array at index 1
    const rowsContainer = result[1]
    if (!Array.isArray(rowsContainer)) return []

    return rowsContainer.map(row => {
      if (!Array.isArray(row)) return {} as T
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj as T
    })
  }

  // ===========================================================================
  // Temporal Queries (Fase 16.4)
  // ===========================================================================

  /**
   * Get all facts that were valid at a specific point in time (Fase 16.4)
   *
   * Uses bi-temporal fields to filter:
   * - Transaction time: edge must exist (expired_at is null)
   * - Valid time: fact must be valid (valid_at <= asOf AND (invalid_at is null OR invalid_at > asOf))
   *
   * @param groupId - Wiki group ID to scope the query
   * @param asOf - Point in time to query
   * @param limit - Maximum number of facts to return
   */
  async getFactsAsOf(groupId: string, asOf: Date, limit: number = 100): Promise<TemporalFact[]> {
    await this.initialize()

    const asOfIso = asOf.toISOString()

    // Query edges with bi-temporal filtering
    // - expired_at IS NULL: edge has not been replaced (transaction time)
    // - valid_at <= asOf: fact became valid before or at the query time
    // - invalid_at IS NULL OR invalid_at > asOf: fact is still valid at query time
    const result = await this.query(`
      MATCH (source:WikiPage {groupId: '${groupId}'})-[e:MENTIONS]->(target)
      WHERE source.pageId IS NOT NULL
        AND (e.expired_at IS NULL)
        AND (e.valid_at IS NULL OR e.valid_at <= '${asOfIso}')
        AND (e.invalid_at IS NULL OR e.invalid_at > '${asOfIso}')
      RETURN
        ID(source) AS sourceId,
        source.title AS sourceName,
        'WikiPage' AS sourceType,
        source.pageId AS pageId,
        ID(target) AS targetId,
        target.name AS targetName,
        labels(target)[0] AS targetType,
        e.fact AS fact,
        'MENTIONS' AS edgeType,
        e.valid_at AS validAt,
        e.invalid_at AS invalidAt,
        e.created_at AS createdAt
      ORDER BY e.valid_at DESC
      LIMIT ${limit}
    `)

    const parsed = this.parseResults<{
      sourceId: number
      sourceName: string
      sourceType: string
      pageId: number
      targetId: number
      targetName: string
      targetType: string
      fact: string | null
      edgeType: string
      validAt: string | null
      invalidAt: string | null
      createdAt: string | null
    }>(result, [
      'sourceId', 'sourceName', 'sourceType', 'pageId',
      'targetId', 'targetName', 'targetType',
      'fact', 'edgeType', 'validAt', 'invalidAt', 'createdAt'
    ])

    return parsed.map(r => ({
      sourceId: String(r.sourceId),
      sourceName: r.sourceName,
      sourceType: r.sourceType,
      targetId: String(r.targetId),
      targetName: r.targetName,
      targetType: r.targetType,
      fact: r.fact ?? `${r.sourceName} mentions ${r.targetName}`,
      edgeType: r.edgeType,
      validAt: r.validAt,
      invalidAt: r.invalidAt,
      createdAt: r.createdAt ?? new Date().toISOString(),
      pageId: r.pageId,
    }))
  }

  /**
   * Temporal search with FalkorDB fallback (Fase 16.4)
   *
   * Search for facts matching a query that were valid at a specific point in time.
   * Falls back to FalkorDB bi-temporal queries when Python service is unavailable.
   *
   * @param query - Search query (matched against entity names and facts)
   * @param groupId - Wiki group ID to scope the search
   * @param asOf - Point in time to query
   * @param limit - Maximum number of results
   */
  async temporalSearchWithFallback(
    query: string,
    groupId: string,
    asOf: Date,
    limit: number = 10
  ): Promise<SearchResult[]> {
    // Try Python service first (has full-text search capabilities)
    if (await this.isPythonServiceAvailable()) {
      try {
        const response = await this.pythonClient.temporalSearch({
          query,
          group_id: groupId,
          as_of: asOf.toISOString(),
          limit,
        })

        return response.results.map(r => ({
          nodeId: r.uuid,
          name: r.name,
          type: r.result_type,
          score: r.score,
          pageId: r.metadata?.pageId as number | undefined,
        }))
      } catch (error) {
        console.warn('[GraphitiService] Python temporal search failed, using FalkorDB fallback:', error)
      }
    }

    // FalkorDB fallback: search with bi-temporal filtering
    await this.initialize()

    const asOfIso = asOf.toISOString()
    const searchTerm = query.toLowerCase().replace(/'/g, "\\'")

    // Search for entities matching the query with temporal constraints
    const result = await this.query(`
      MATCH (p:WikiPage {groupId: '${groupId}'})-[e:MENTIONS]->(target)
      WHERE p.pageId IS NOT NULL
        AND (
          toLower(target.name) CONTAINS '${searchTerm}'
          OR (e.fact IS NOT NULL AND toLower(e.fact) CONTAINS '${searchTerm}')
        )
        AND (e.expired_at IS NULL)
        AND (e.valid_at IS NULL OR e.valid_at <= '${asOfIso}')
        AND (e.invalid_at IS NULL OR e.invalid_at > '${asOfIso}')
      RETURN DISTINCT
        ID(target) AS nodeId,
        target.name AS name,
        labels(target)[0] AS type,
        p.pageId AS pageId,
        0.8 AS score
      LIMIT ${limit}
    `)

    const parsed = this.parseResults<{
      nodeId: number
      name: string
      type: string
      pageId: number
      score: number
    }>(result, ['nodeId', 'name', 'type', 'pageId', 'score'])

    // Also search for pages matching the query
    const pagesResult = await this.query(`
      MATCH (p:WikiPage {groupId: '${groupId}'})
      WHERE p.pageId IS NOT NULL
        AND toLower(p.title) CONTAINS '${searchTerm}'
      RETURN
        p.pageId AS nodeId,
        p.title AS name,
        'WikiPage' AS type,
        p.pageId AS pageId,
        0.9 AS score
      LIMIT ${limit}
    `)

    const parsedPages = this.parseResults<{
      nodeId: number
      name: string
      type: string
      pageId: number
      score: number
    }>(pagesResult, ['nodeId', 'name', 'type', 'pageId', 'score'])

    // Combine and sort by score
    const combined = [
      ...parsedPages.map(r => ({
        nodeId: `page-${r.nodeId}`,
        name: r.name,
        type: r.type,
        score: r.score,
        pageId: r.pageId,
      })),
      ...parsed.map(r => ({
        nodeId: `${r.type.toLowerCase()}-${r.nodeId}`,
        name: r.name,
        type: r.type,
        score: r.score,
        pageId: r.pageId,
      })),
    ]

    // Sort by score descending and limit
    return combined
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // ===========================================================================
  // Entity Deduplication (Fase 22.5)
  // ===========================================================================

  /**
   * Create IS_DUPLICATE_OF edge between two nodes
   *
   * Direction: sourceNode -[:IS_DUPLICATE_OF]-> targetNode
   * The source is the duplicate, target is the canonical version.
   *
   * @param sourceId - Internal node ID (as string) of the duplicate node
   * @param targetId - Internal node ID (as string) of the canonical node
   * @param confidence - Match confidence (0.0 - 1.0)
   * @param matchType - How the match was determined
   * @param resolvedBy - User who resolved (null for auto)
   *
   * Fase 22: Uses FalkorDB internal ID since entity nodes don't have uuid property
   */
  async createDuplicateOfEdge(
    sourceId: string,
    targetId: string,
    confidence: number,
    matchType: 'exact' | 'fuzzy' | 'llm' | 'embedding',
    resolvedBy: string | null = null
  ): Promise<void> {
    // Fase 22: Match by internal node ID since nodes don't have uuid property
    const query = `
      MATCH (source), (target)
      WHERE ID(source) = toInteger($sourceId) AND ID(target) = toInteger($targetId)
      MERGE (source)-[r:IS_DUPLICATE_OF]->(target)
      SET r.confidence = $confidence,
          r.matchType = $matchType,
          r.detectedAt = $detectedAt,
          r.resolvedBy = $resolvedBy
    `

    await this.query(query, {
      sourceId,
      targetId,
      confidence,
      matchType,
      resolvedBy,
      detectedAt: new Date().toISOString(),
    })

    console.log(
      `[GraphitiService] Created IS_DUPLICATE_OF: ${sourceId} -> ${targetId} (${matchType}, conf=${confidence})`
    )
  }

  /**
   * Check if IS_DUPLICATE_OF edge already exists
   * Fase 22: Uses internal node IDs
   */
  async duplicateEdgeExists(sourceId: string, targetId: string): Promise<boolean> {
    // Check both directions - edge can be stored either way
    const query = `
      MATCH (a), (b)
      WHERE ID(a) = toInteger($sourceId) AND ID(b) = toInteger($targetId)
      OPTIONAL MATCH (a)-[r1:IS_DUPLICATE_OF]->(b)
      OPTIONAL MATCH (b)-[r2:IS_DUPLICATE_OF]->(a)
      RETURN count(r1) + count(r2) as count
    `

    const result = await this.query(query, { sourceId, targetId })
    const parsed = this.parseResults<{ count: number }>(result, ['count'])
    return (parsed[0]?.count || 0) > 0
  }

  /**
   * Remove IS_DUPLICATE_OF edge between two nodes
   * Fase 22: Uses internal node IDs
   */
  async removeDuplicateEdge(sourceId: string, targetId: string): Promise<void> {
    const query = `
      MATCH (source)-[r:IS_DUPLICATE_OF]->(target)
      WHERE ID(source) = toInteger($sourceId) AND ID(target) = toInteger($targetId)
      DELETE r
    `

    await this.query(query, { sourceId, targetId })
    console.log(`[GraphitiService] Removed IS_DUPLICATE_OF: ${sourceId} -> ${targetId}`)
  }

  /**
   * Get all existing IS_DUPLICATE_OF edges in a workspace
   * Returns all confirmed duplicate pairs with their metadata
   * Fase 22.8: For loading existing duplicates in WikiDuplicateManager
   */
  async getWorkspaceDuplicates(
    groupId: string,
    nodeTypes: string[] = ['Concept', 'Person', 'Task', 'Project']
  ): Promise<Array<{
    sourceUuid: string
    sourceName: string
    sourceType: string
    targetUuid: string
    targetName: string
    targetType: string
    confidence: number
    matchType: string
    detectedAt: string | null
    detectedBy: string | null
  }>> {
    await this.initialize()

    // Build type filter
    const typeConditions = nodeTypes.map((t) => `source:${t}`).join(' OR ')

    const query = `
      MATCH (source)-[r:IS_DUPLICATE_OF]->(target)
      WHERE source.groupId = $groupId
      AND (${typeConditions})
      RETURN
        toString(ID(source)) as sourceUuid,
        source.name as sourceName,
        labels(source)[0] as sourceType,
        toString(ID(target)) as targetUuid,
        target.name as targetName,
        labels(target)[0] as targetType,
        r.confidence as confidence,
        r.matchType as matchType,
        r.detectedAt as detectedAt,
        r.detectedBy as detectedBy
      ORDER BY source.name
    `

    const result = await this.query(query, { groupId })

    const parsed = this.parseResults<{
      sourceUuid: string
      sourceName: string
      sourceType: string
      targetUuid: string
      targetName: string
      targetType: string
      confidence: number
      matchType: string
      detectedAt: string | null
      detectedBy: string | null
    }>(result, [
      'sourceUuid', 'sourceName', 'sourceType',
      'targetUuid', 'targetName', 'targetType',
      'confidence', 'matchType', 'detectedAt', 'detectedBy'
    ])

    console.log(`[GraphitiService] getWorkspaceDuplicates: found ${parsed.length} pairs for groupId=${groupId}`)

    return parsed
  }

  /**
   * Get all nodes that are duplicates of given node
   * Returns both nodes that point TO this node and nodes this node points TO
   * Fase 22: Uses internal node IDs
   */
  async getDuplicatesOf(nodeId: string): Promise<Array<{ uuid: string; name: string; type: string; direction: 'incoming' | 'outgoing' }>> {
    const query = `
      MATCH (source)-[r:IS_DUPLICATE_OF]->(target)
      WHERE ID(target) = toInteger($nodeId)
      RETURN toString(ID(source)) as uuid, source.name as name, labels(source)[0] as type, 'incoming' as direction
      UNION
      MATCH (source)-[r:IS_DUPLICATE_OF]->(target)
      WHERE ID(source) = toInteger($nodeId)
      RETURN toString(ID(target)) as uuid, target.name as name, labels(target)[0] as type, 'outgoing' as direction
    `

    const result = await this.query(query, { nodeId }) as Array<{ uuid: string; name: string; type: string; direction: string }>
    return result.map((r) => ({
      uuid: r.uuid,
      name: r.name,
      type: r.type,
      direction: r.direction as 'incoming' | 'outgoing',
    }))
  }

  /**
   * Get canonical node (follow IS_DUPLICATE_OF chain to root)
   * Returns the node that has no outgoing IS_DUPLICATE_OF edge
   * Fase 22: Uses internal node IDs
   */
  async getCanonicalNode(nodeId: string): Promise<{ uuid: string; name: string; type: string } | null> {
    // Follow IS_DUPLICATE_OF edges until we find a node with no outgoing IS_DUPLICATE_OF
    const query = `
      MATCH (start)
      WHERE ID(start) = toInteger($nodeId)
      MATCH path = (start)-[:IS_DUPLICATE_OF*0..10]->(canonical)
      WHERE NOT (canonical)-[:IS_DUPLICATE_OF]->()
      RETURN toString(ID(canonical)) as uuid, canonical.name as name, labels(canonical)[0] as type
      ORDER BY length(path) DESC
      LIMIT 1
    `

    const result = await this.query(query, { nodeId }) as Array<{ uuid: string; name: string; type: string }>
    if (result.length === 0) return null

    const first = result[0]
    if (!first) return null

    return {
      uuid: first.uuid,
      name: first.name,
      type: first.type,
    }
  }

  /**
   * Get all entity nodes in a workspace/group
   * Used for batch deduplication scanning
   */
  async getWorkspaceNodes(
    groupId: string,
    nodeTypes: string[] = ['Concept', 'Person', 'Task', 'Project']
  ): Promise<Array<{ uuid: string; name: string; type: string; groupId: string; summary?: string }>> {
    await this.initialize()

    // Build type filter dynamically
    const typeConditions = nodeTypes.map((t) => `n:${t}`).join(' OR ')

    // Fase 22: Use FalkorDB internal ID as uuid since entity nodes don't have uuid property yet
    // The ID(n) function returns the internal graph database ID
    const query = `
      MATCH (n)
      WHERE n.groupId = $groupId
      AND (${typeConditions})
      RETURN toString(ID(n)) as uuid, n.name as name, labels(n)[0] as type, n.groupId as groupId, n.summary as summary
    `

    const result = await this.query(query, { groupId })

    // Parse FalkorDB result format using the helper
    const parsed = this.parseResults<{ uuid: string; name: string; type: string; groupId: string; summary?: string }>(
      result,
      ['uuid', 'name', 'type', 'groupId', 'summary']
    )

    console.log(`[GraphitiService] getWorkspaceNodes: found ${parsed.length} nodes for groupId=${groupId}`)

    return parsed
  }

  /**
   * Merge duplicate nodes: transfer all edges from duplicate to canonical
   * Then mark the duplicate with IS_DUPLICATE_OF edge
   * Fase 22: Uses internal node IDs
   */
  async mergeNodes(duplicateId: string, canonicalId: string): Promise<{ edgesTransferred: number }> {
    // Transfer all incoming edges from duplicate to canonical
    const transferIncoming = `
      MATCH (other)-[r]->(duplicate), (canonical)
      WHERE ID(duplicate) = toInteger($duplicateId) AND ID(canonical) = toInteger($canonicalId)
        AND type(r) <> 'IS_DUPLICATE_OF'
      MERGE (other)-[newR:RELATES_TO]->(canonical)
      SET newR = properties(r)
      DELETE r
      RETURN count(r) as count
    `

    // Transfer all outgoing edges from duplicate to canonical
    const transferOutgoing = `
      MATCH (duplicate)-[r]->(other), (canonical)
      WHERE ID(duplicate) = toInteger($duplicateId) AND ID(canonical) = toInteger($canonicalId)
        AND type(r) <> 'IS_DUPLICATE_OF'
      MERGE (canonical)-[newR:RELATES_TO]->(other)
      SET newR = properties(r)
      DELETE r
      RETURN count(r) as count
    `

    const [inResult, outResult] = await Promise.all([
      this.query(transferIncoming, { duplicateId, canonicalId }) as Promise<Array<{ count: number }>>,
      this.query(transferOutgoing, { duplicateId, canonicalId }) as Promise<Array<{ count: number }>>,
    ])

    const edgesTransferred = (inResult[0]?.count || 0) + (outResult[0]?.count || 0)

    // Create IS_DUPLICATE_OF edge
    await this.createDuplicateOfEdge(duplicateId, canonicalId, 1.0, 'exact', null)

    console.log(
      `[GraphitiService] Merged ${duplicateId} -> ${canonicalId}, transferred ${edgesTransferred} edges`
    )

    return { edgesTransferred }
  }

  /**
   * Find potential duplicates using FalkorDB full-text or property search
   * This is a lightweight alternative to vector search
   */
  async findPotentialDuplicatesByName(
    name: string,
    groupId: string,
    limit: number = 10
  ): Promise<Array<{ uuid: string; name: string; type: string; similarity: number }>> {
    await this.initialize()

    // Normalize name for comparison
    const normalizedName = name.toLowerCase().trim()

    // Use property matching with CONTAINS for fuzzy match
    // Fase 22: Use FalkorDB internal ID as uuid since entity nodes don't have uuid property yet
    const query = `
      MATCH (n)
      WHERE n.groupId = $groupId
      AND toLower(n.name) CONTAINS $normalizedName
      RETURN toString(ID(n)) as uuid, n.name as name, labels(n)[0] as type
      LIMIT $limit
    `

    const result = await this.query(query, { groupId, normalizedName, limit })

    // Parse FalkorDB result format using the helper
    const parsed = this.parseResults<{ uuid: string; name: string; type: string }>(
      result,
      ['uuid', 'name', 'type']
    )

    // Calculate simple similarity score based on string length ratio
    return parsed.map((r) => {
      const similarity = Math.min(normalizedName.length, r.name?.length || 0) / Math.max(normalizedName.length, r.name?.length || 1)
      return {
        uuid: r.uuid,
        name: r.name,
        type: r.type,
        similarity,
      }
    })
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Check if the service is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch {
      return false
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    await this.redis.quit()
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let graphitiInstance: GraphitiService | null = null

/**
 * Get the GraphitiService singleton
 * Pass Prisma client to enable WikiAiService (Fase 15.1)
 */
export function getGraphitiService(prisma?: PrismaClient): GraphitiService {
  if (!graphitiInstance) {
    graphitiInstance = new GraphitiService(undefined, prisma)
  } else if (prisma && !graphitiInstance['prisma']) {
    // Set Prisma if not already set
    graphitiInstance.setPrisma(prisma)
  }
  return graphitiInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetGraphitiService(): void {
  graphitiInstance = null
}

export default GraphitiService
