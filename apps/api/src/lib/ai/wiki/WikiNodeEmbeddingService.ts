/**
 * Wiki Node Embedding Service
 * Version: 1.0.0
 *
 * Vector storage and semantic search for Wiki entity nodes using Qdrant.
 * Stores embeddings for entity nodes (Concept, Person, Task, Project).
 *
 * Features:
 * - Store/retrieve node name embeddings in Qdrant
 * - Semantic entity resolution (find similar entities)
 * - Fuzzy entity search
 * - Name hash-based caching (skip unchanged nodes)
 *
 * Fase 21.3 - WikiNodeEmbeddingService Implementation
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Date: 2026-01-13
 * =============================================================================
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import type { PrismaClient } from '@prisma/client'
import { getWikiAiService, type WikiAiService, type WikiContext } from './WikiAiService'

// =============================================================================
// Types
// =============================================================================

export interface WikiNodeEmbeddingConfig {
  qdrantHost: string
  qdrantPort: number
  collectionName: string
}

/**
 * Node types supported for embedding
 */
export type EmbeddableNodeType = 'Concept' | 'Person' | 'Task' | 'Project'

/**
 * Node data for embedding generation
 */
export interface NodeForEmbedding {
  /** Unique node identifier (UUID from FalkorDB) */
  id: string
  /** Node name to embed */
  name: string
  /** Node type */
  type: EmbeddableNodeType
  /** Wiki group ID */
  groupId: string
  /** Optional summary for context */
  summary?: string
}

/**
 * Payload stored with each node embedding in Qdrant
 */
export interface NodeEmbeddingPayload {
  /** Original node UUID */
  nodeId: string
  /** Workspace ID for multi-tenant filtering */
  workspaceId: number
  /** Project ID (optional) for project-scoped filtering */
  projectId: number | null
  /** Wiki group ID */
  groupId: string
  /** Node type (Concept, Person, Task, Project) */
  nodeType: EmbeddableNodeType
  /** Original node name */
  name: string
  /** Normalized name for exact matching */
  normalizedName: string
  /** Hash of the name for change detection */
  nameHash: string
  /** When the embedding was created (ISO timestamp) */
  createdAt: string
}

/**
 * Result from similar entity search
 */
export interface SimilarNodeResult {
  /** Node UUID */
  nodeId: string
  /** Node name */
  name: string
  /** Node type */
  nodeType: EmbeddableNodeType
  /** Similarity score (0-1) */
  score: number
  /** Wiki group ID */
  groupId: string
}

/**
 * Options for similar entity search
 */
export interface SimilarNodeSearchOptions {
  workspaceId: number
  projectId?: number
  groupId?: string
  nodeType?: EmbeddableNodeType
  /** Maximum results (default: 10) */
  limit?: number
  /** Minimum similarity threshold (default: 0.85) */
  threshold?: number
  /** Exclude this node ID from results */
  excludeNodeId?: string
}

/**
 * Result of batch node embedding generation
 */
export interface BatchNodeEmbeddingResult {
  /** Number of embeddings stored */
  stored: number
  /** Number of embeddings skipped (unchanged) */
  skipped: number
  /** Number of errors */
  errors: number
}

// =============================================================================
// Wiki Node Embedding Service Class
// =============================================================================

export class WikiNodeEmbeddingService {
  private client: QdrantClient
  private collectionName: string
  private wikiAiService: WikiAiService
  private initialized: boolean = false
  private embeddingDimensions: number | null = null

  constructor(prisma: PrismaClient, config?: Partial<WikiNodeEmbeddingConfig>) {
    const host = config?.qdrantHost ?? process.env.QDRANT_HOST ?? 'localhost'
    const port = config?.qdrantPort ?? parseInt(process.env.QDRANT_PORT ?? '6333')
    this.collectionName = config?.collectionName ?? 'kanbu_node_embeddings'

    this.client = new QdrantClient({ host, port })
    this.wikiAiService = getWikiAiService(prisma)
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Ensure the Qdrant collection exists and is initialized
   * Collection should already exist from 21.2, this just verifies
   */
  async ensureCollection(context: WikiContext): Promise<boolean> {
    if (this.initialized) return true

    try {
      // Get embedding dimensions from provider
      const embeddingInfo = await this.wikiAiService.getEmbeddingInfo(context)
      if (!embeddingInfo.available || !embeddingInfo.dimensions) {
        console.warn('[WikiNodeEmbeddingService] No embedding provider available, skipping initialization')
        return false
      }

      this.embeddingDimensions = embeddingInfo.dimensions

      // Check if collection exists
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(c => c.name === this.collectionName)

      if (!exists) {
        // Collection should be created in 21.2, but create if missing
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.embeddingDimensions,
            distance: 'Cosine',
          },
          optimizers_config: {
            indexing_threshold: 1000,
          },
        })

        // Create payload indexes
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'workspaceId',
          field_schema: 'integer',
        })
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'nodeType',
          field_schema: 'keyword',
        })
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'groupId',
          field_schema: 'keyword',
        })
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'normalizedName',
          field_schema: 'keyword',
        })

        console.log(
          `[WikiNodeEmbeddingService] Created collection "${this.collectionName}" with ${this.embeddingDimensions} dimensions`
        )
      } else {
        console.log(`[WikiNodeEmbeddingService] Collection "${this.collectionName}" verified`)
      }

      this.initialized = true
      return true
    } catch (error) {
      console.error(
        '[WikiNodeEmbeddingService] Failed to ensure collection:',
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  // ===========================================================================
  // Embedding Generation
  // ===========================================================================

  /**
   * Format node for embedding - includes type for context
   * Format: "[Type] Name"
   */
  formatNodeForEmbedding(node: NodeForEmbedding): string {
    return `[${node.type}] ${node.name}`
  }

  /**
   * Normalize name for exact matching
   * Lowercase, trim, collapse whitespace
   */
  normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
  }

  /**
   * Generate a stable numeric ID from node UUID
   * Qdrant requires either unsigned integers or UUIDs for point IDs
   */
  private generatePointId(nodeId: string): number {
    let hash = 0
    for (let i = 0; i < nodeId.length; i++) {
      const char = nodeId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash >>> 0 // Convert to unsigned 32-bit integer
    }
    // Ensure we have a positive non-zero number
    return hash || 1
  }

  /**
   * Create simple hash of name for change detection
   */
  private hashName(name: string): string {
    const normalized = this.normalizeName(name)
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  /**
   * Generate embedding for a node
   */
  async generateNodeEmbedding(
    context: WikiContext,
    node: NodeForEmbedding
  ): Promise<number[]> {
    const embeddingText = this.formatNodeForEmbedding(node)
    const result = await this.wikiAiService.embed(context, embeddingText)
    return result.embedding
  }

  // ===========================================================================
  // Storage Operations
  // ===========================================================================

  /**
   * Store embedding for a single node
   */
  async storeNodeEmbedding(
    context: WikiContext,
    node: NodeForEmbedding,
    embedding: number[]
  ): Promise<boolean> {
    try {
      const ready = await this.ensureCollection(context)
      if (!ready) {
        console.warn(`[WikiNodeEmbeddingService] Not initialized, skipping embedding for node ${node.id}`)
        return false
      }

      const pointId = this.generatePointId(node.id)

      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: pointId,
            vector: embedding,
            payload: {
              nodeId: node.id,
              workspaceId: context.workspaceId,
              projectId: context.projectId ?? null,
              groupId: node.groupId,
              nodeType: node.type,
              name: node.name,
              normalizedName: this.normalizeName(node.name),
              nameHash: this.hashName(node.name),
              createdAt: new Date().toISOString(),
            },
          },
        ],
      })

      console.log(
        `[WikiNodeEmbeddingService] Stored embedding for node ${node.id}: [${node.type}] ${node.name}`
      )
      return true
    } catch (error) {
      console.error(
        `[WikiNodeEmbeddingService] Failed to store embedding for node ${node.id}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Generate and store embedding for a single node
   */
  async generateAndStoreNodeEmbedding(
    context: WikiContext,
    node: NodeForEmbedding
  ): Promise<boolean> {
    try {
      // Check if embedding exists and is unchanged
      const status = await this.checkNodeEmbeddingStatus(node.id, node.name)
      if (status.exists && !status.needsUpdate) {
        console.log(`[WikiNodeEmbeddingService] Skipping unchanged node ${node.id}`)
        return true
      }

      // Generate embedding
      const embedding = await this.generateNodeEmbedding(context, node)

      // Store embedding
      return await this.storeNodeEmbedding(context, node, embedding)
    } catch (error) {
      console.error(
        `[WikiNodeEmbeddingService] Failed to generate and store embedding for node ${node.id}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Generate and store embeddings for multiple nodes (batch)
   * Skips nodes that haven't changed (based on name hash)
   */
  async generateAndStoreBatchNodeEmbeddings(
    context: WikiContext,
    nodes: NodeForEmbedding[]
  ): Promise<BatchNodeEmbeddingResult> {
    const result: BatchNodeEmbeddingResult = { stored: 0, skipped: 0, errors: 0 }

    try {
      const ready = await this.ensureCollection(context)
      if (!ready) {
        console.warn('[WikiNodeEmbeddingService] Not initialized, skipping batch embedding')
        return result
      }

      for (const node of nodes) {
        // Skip if name is empty
        if (!node.name || node.name.trim().length === 0) {
          result.skipped++
          continue
        }

        try {
          // Check if embedding already exists and is unchanged
          const status = await this.checkNodeEmbeddingStatus(node.id, node.name)
          if (status.exists && !status.needsUpdate) {
            result.skipped++
            continue
          }

          // Generate and store embedding
          const success = await this.generateAndStoreNodeEmbedding(context, node)
          if (success) {
            result.stored++
          } else {
            result.errors++
          }
        } catch (nodeError) {
          console.error(
            `[WikiNodeEmbeddingService] Error processing node ${node.id}:`,
            nodeError instanceof Error ? nodeError.message : nodeError
          )
          result.errors++
        }
      }

      console.log(
        `[WikiNodeEmbeddingService] Batch complete: ${result.stored} stored, ${result.skipped} skipped, ${result.errors} errors`
      )
      return result
    } catch (error) {
      console.error(
        '[WikiNodeEmbeddingService] Batch embedding failed:',
        error instanceof Error ? error.message : error
      )
      return result
    }
  }

  // ===========================================================================
  // Change Detection
  // ===========================================================================

  /**
   * Check if a node embedding exists and if it needs updating
   */
  async checkNodeEmbeddingStatus(
    nodeId: string,
    currentName: string
  ): Promise<{ exists: boolean; needsUpdate: boolean; currentHash?: string }> {
    try {
      const pointId = this.generatePointId(nodeId)
      const points = await this.client.retrieve(this.collectionName, {
        ids: [pointId],
        with_payload: true,
      })

      const point = points[0]
      if (!point) {
        return { exists: false, needsUpdate: true }
      }

      const storedHash = point.payload?.nameHash as string
      const currentHash = this.hashName(currentName)

      return {
        exists: true,
        needsUpdate: storedHash !== currentHash,
        currentHash: storedHash,
      }
    } catch {
      return { exists: false, needsUpdate: true }
    }
  }

  // ===========================================================================
  // Entity Resolution / Similar Search
  // ===========================================================================

  /**
   * Find similar entities using vector similarity search
   * Use for entity resolution: "Jan" might match "Jan Janssen"
   */
  async findSimilarEntities(
    context: WikiContext,
    name: string,
    options: Partial<SimilarNodeSearchOptions> = {}
  ): Promise<SimilarNodeResult[]> {
    const limit = options.limit ?? 10
    const threshold = options.threshold ?? 0.85

    try {
      const ready = await this.ensureCollection(context)
      if (!ready) {
        console.warn('[WikiNodeEmbeddingService] Not initialized, returning empty results')
        return []
      }

      // Generate embedding for the search name
      // Use a temporary node structure for embedding
      const searchNode: NodeForEmbedding = {
        id: 'search',
        name,
        type: options.nodeType ?? 'Concept',
        groupId: options.groupId ?? '',
      }
      const queryEmbedding = await this.generateNodeEmbedding(context, searchNode)

      // Build filter
      const filter = this.buildSearchFilter(context, options)

      // Search in Qdrant
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        filter,
        limit: limit + 1, // Get extra in case we need to exclude
        score_threshold: threshold,
        with_payload: true,
      })

      // Map results and filter out excluded node
      const results: SimilarNodeResult[] = []
      for (const result of searchResult) {
        const nodeId = result.payload?.nodeId as string
        if (options.excludeNodeId && nodeId === options.excludeNodeId) {
          continue
        }
        if (results.length >= limit) break

        results.push({
          nodeId,
          name: result.payload?.name as string,
          nodeType: result.payload?.nodeType as EmbeddableNodeType,
          score: result.score,
          groupId: result.payload?.groupId as string,
        })
      }

      return results
    } catch (error) {
      console.error(
        '[WikiNodeEmbeddingService] Find similar entities failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Find entities by normalized name (exact match)
   * Faster than vector search for known exact names
   */
  async findByNormalizedName(
    context: WikiContext,
    name: string,
    options: Partial<SimilarNodeSearchOptions> = {}
  ): Promise<SimilarNodeResult[]> {
    try {
      const ready = await this.ensureCollection(context)
      if (!ready) {
        return []
      }

      const normalizedName = this.normalizeName(name)
      const limit = options.limit ?? 10

      // Build filter with normalized name match
      const must: unknown[] = [
        { key: 'workspaceId', match: { value: context.workspaceId } },
        { key: 'normalizedName', match: { value: normalizedName } },
      ]

      if (context.projectId) {
        must.push({ key: 'projectId', match: { value: context.projectId } })
      }
      if (options.groupId) {
        must.push({ key: 'groupId', match: { value: options.groupId } })
      }
      if (options.nodeType) {
        must.push({ key: 'nodeType', match: { value: options.nodeType } })
      }

      const scrollResult = await this.client.scroll(this.collectionName, {
        filter: { must },
        limit,
        with_payload: true,
      })

      return scrollResult.points.map(point => ({
        nodeId: point.payload?.nodeId as string,
        name: point.payload?.name as string,
        nodeType: point.payload?.nodeType as EmbeddableNodeType,
        score: 1.0, // Exact match
        groupId: point.payload?.groupId as string,
      }))
    } catch (error) {
      console.error(
        '[WikiNodeEmbeddingService] Find by normalized name failed:',
        error instanceof Error ? error.message : error
      )
      return []
    }
  }

  /**
   * Build Qdrant filter for search
   */
  private buildSearchFilter(
    context: WikiContext,
    options: Partial<SimilarNodeSearchOptions>
  ): Record<string, unknown> {
    const must: unknown[] = [
      { key: 'workspaceId', match: { value: context.workspaceId } },
    ]

    if (context.projectId) {
      must.push({ key: 'projectId', match: { value: context.projectId } })
    }

    if (options.groupId) {
      must.push({ key: 'groupId', match: { value: options.groupId } })
    }

    if (options.nodeType) {
      must.push({ key: 'nodeType', match: { value: options.nodeType } })
    }

    return { must }
  }

  // ===========================================================================
  // Delete Operations
  // ===========================================================================

  /**
   * Delete embedding for a node
   */
  async deleteNodeEmbedding(nodeId: string): Promise<boolean> {
    try {
      const pointId = this.generatePointId(nodeId)
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [pointId],
      })

      console.log(`[WikiNodeEmbeddingService] Deleted embedding for node ${nodeId}`)
      return true
    } catch (error) {
      console.error(
        `[WikiNodeEmbeddingService] Failed to delete embedding for node ${nodeId}:`,
        error instanceof Error ? error.message : error
      )
      return false
    }
  }

  /**
   * Delete all embeddings for a workspace
   */
  async deleteWorkspaceEmbeddings(workspaceId: number): Promise<number> {
    try {
      const result = await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [{ key: 'workspaceId', match: { value: workspaceId } }],
        },
      })

      console.log(`[WikiNodeEmbeddingService] Deleted embeddings for workspace ${workspaceId}`)
      return typeof result === 'object' ? 1 : 0
    } catch (error) {
      console.error(
        `[WikiNodeEmbeddingService] Failed to delete embeddings for workspace ${workspaceId}:`,
        error instanceof Error ? error.message : error
      )
      return 0
    }
  }

  /**
   * Delete all embeddings for a group
   */
  async deleteGroupEmbeddings(groupId: string): Promise<number> {
    try {
      const result = await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [{ key: 'groupId', match: { value: groupId } }],
        },
      })

      console.log(`[WikiNodeEmbeddingService] Deleted embeddings for group ${groupId}`)
      return typeof result === 'object' ? 1 : 0
    } catch (error) {
      console.error(
        `[WikiNodeEmbeddingService] Failed to delete embeddings for group ${groupId}:`,
        error instanceof Error ? error.message : error
      )
      return 0
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Get statistics about stored node embeddings
   */
  async getStats(): Promise<{
    totalNodes: number
    collectionExists: boolean
  }> {
    try {
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(c => c.name === this.collectionName)

      if (!exists) {
        return { totalNodes: 0, collectionExists: false }
      }

      const info = await this.client.getCollection(this.collectionName)
      return {
        totalNodes: info.points_count ?? 0,
        collectionExists: true,
      }
    } catch {
      return { totalNodes: 0, collectionExists: false }
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let nodeEmbeddingServiceInstance: WikiNodeEmbeddingService | null = null

/**
 * Get or create the singleton WikiNodeEmbeddingService
 */
export function getWikiNodeEmbeddingService(prisma: PrismaClient): WikiNodeEmbeddingService {
  if (!nodeEmbeddingServiceInstance) {
    nodeEmbeddingServiceInstance = new WikiNodeEmbeddingService(prisma)
  }
  return nodeEmbeddingServiceInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetWikiNodeEmbeddingService(): void {
  nodeEmbeddingServiceInstance = null
}
