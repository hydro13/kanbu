/**
 * WikiClusterService (Fase 24.5)
 *
 * Community Detection service for the Wiki Knowledge Graph.
 * Uses Label Propagation algorithm to detect clusters of related entities.
 *
 * Based on Python Graphiti: graphiti_core/utils/maintenance/community_operations.py
 *
 * Features:
 * - Detect communities using Label Propagation
 * - Hierarchical summarization via LLM
 * - Generate community names via LLM
 * - Store communities in FalkorDB
 * - Cache support for performance
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import Redis from 'ioredis'
import crypto from 'crypto'
import type { PrismaClient } from '@prisma/client'
import type { WikiContext, WikiAiService } from './WikiAiService'
import { getWikiAiService } from './WikiAiService'
import type {
  CommunityNode,
  LPProjectionMap,
  LPConfig,
  DetectCommunitiesInput,
  DetectCommunitiesOutput,
  UpdateCommunitiesInput,
  UpdateCommunitiesOutput,
  GetCommunitiesInput,
  GetCommunitiesOutput,
  CommunityWithMembers,
  EntitySummary,
  CommunityCacheEntry,
  CommunityCacheConfig,
} from './types/community'
import { DEFAULT_LP_CONFIG, DEFAULT_CACHE_CONFIG } from './types/community'
import {
  labelPropagation,
  buildProjectionFromEdges,
  getClusterStats,
} from './algorithms'
import {
  getSummarizePairSystemPrompt,
  getSummarizePairUserPrompt,
  parseSummarizePairResponse,
  getGenerateCommunityNameSystemPrompt,
  getGenerateCommunityNameUserPrompt,
  parseGenerateCommunityNameResponse,
} from './prompts'

// ============================================================================
// Configuration
// ============================================================================

interface WikiClusterConfig {
  redisHost?: string
  redisPort?: number
  graphName?: string
  cacheConfig?: CommunityCacheConfig
}

const DEFAULT_CONFIG: Required<WikiClusterConfig> = {
  redisHost: process.env.FALKORDB_HOST || 'localhost',
  redisPort: parseInt(process.env.FALKORDB_PORT || '6379', 10),
  graphName: process.env.FALKORDB_GRAPH || 'wiki',
  cacheConfig: DEFAULT_CACHE_CONFIG,
}

// ============================================================================
// Service Class
// ============================================================================

export class WikiClusterService {
  private redis: Redis
  private graphName: string
  private wikiAiService: WikiAiService | null = null
  private cacheConfig: Required<CommunityCacheConfig>
  private cache: Map<string, CommunityCacheEntry> = new Map()

  constructor(prisma?: PrismaClient, config?: WikiClusterConfig) {
    const cfg = { ...DEFAULT_CONFIG, ...config }

    this.graphName = cfg.graphName
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...cfg.cacheConfig }

    // Initialize WikiAiService if prisma provided
    if (prisma) {
      this.wikiAiService = getWikiAiService(prisma)
    }

    // Connect to FalkorDB via Redis
    this.redis = new Redis({
      host: cfg.redisHost,
      port: cfg.redisPort,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null
        return Math.min(times * 100, 3000)
      },
    })

    this.redis.on('error', (err) => {
      console.error('[WikiClusterService] Redis connection error:', err.message)
    })

    this.redis.on('connect', () => {
      console.log('[WikiClusterService] Connected to FalkorDB')
    })
  }

  /**
   * Set WikiAiService for LLM operations (lazy initialization)
   */
  setWikiAiService(service: WikiAiService): void {
    this.wikiAiService = service
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit()
  }

  // ============================================================================
  // Main API Methods
  // ============================================================================

  /**
   * Detect communities in the knowledge graph
   *
   * Flow:
   * 1. Fetch graph projection from FalkorDB (nodes + edges)
   * 2. Run Label Propagation algorithm
   * 3. For each cluster: hierarchical summarization
   * 4. Generate community names via LLM
   * 5. Store communities + memberships in FalkorDB
   */
  async detectCommunities(input: DetectCommunitiesInput): Promise<DetectCommunitiesOutput> {
    const startTime = Date.now()
    const { context, forceRebuild = false, lpConfig, generateSummaries = true } = input
    const groupId = this.buildGroupId(context)

    console.log(`[WikiClusterService] Starting community detection for ${groupId}`)

    // Step 1: Delete existing communities if force rebuild
    if (forceRebuild) {
      await this.deleteCommunitiesForGroup(groupId)
    }

    // Step 2: Fetch graph projection
    const { projection, nodeCount, edgeCount } = await this.fetchGraphProjection(groupId)

    if (nodeCount === 0) {
      console.log('[WikiClusterService] No nodes found, returning empty result')
      return {
        communities: [],
        membershipCount: 0,
        stats: {
          totalNodes: 0,
          totalEdges: 0,
          totalCommunities: 0,
          avgCommunitySize: 0,
          maxCommunitySize: 0,
          lpIterations: 0,
          processingTimeMs: Date.now() - startTime,
        },
      }
    }

    // Step 3: Run Label Propagation
    const config: LPConfig = { ...DEFAULT_LP_CONFIG, ...lpConfig }
    const clusters = labelPropagation(projection, config)
    const clusterStats = getClusterStats(clusters)

    console.log(
      `[WikiClusterService] Found ${clusterStats.totalClusters} communities with ${clusterStats.totalNodes} members`
    )

    // Step 4: Create communities with summaries
    const communities: CommunityNode[] = []
    let membershipCount = 0

    for (let i = 0; i < clusters.length; i++) {
      const memberUuids = clusters[i]!
      const clusterIndex = i + 1

      console.log(
        `[WikiClusterService] Processing cluster ${clusterIndex}/${clusters.length} (${memberUuids.length} members)`
      )

      // Fetch entity info for members
      const members = await this.fetchEntityInfo(memberUuids, groupId)

      // Generate summary if enabled and AI service available
      let summary = ''
      let name = `Community ${clusterIndex}`

      if (generateSummaries && this.wikiAiService && members.length > 0) {
        try {
          summary = await this.hierarchicalSummarize(members, context)
          const topNames = members.slice(0, 5).map((m) => m.name)
          const nameResult = await this.generateCommunityName(summary, topNames, context)
          name = nameResult.name
        } catch (error) {
          console.error(
            `[WikiClusterService] Failed to generate summary for cluster ${clusterIndex}:`,
            error
          )
          // Fallback: use top entity names
          name = this.generateFallbackName(members)
          summary = `Cluster containing: ${members.map((m) => m.name).join(', ')}`
        }
      } else {
        // No AI service, use fallback
        name = this.generateFallbackName(members)
        summary = `Cluster containing: ${members.map((m) => m.name).join(', ')}`
      }

      // Create community node
      const community: CommunityNode = {
        uuid: crypto.randomUUID(),
        name,
        summary,
        groupId,
        memberCount: members.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Store in FalkorDB
      await this.storeCommunity(community)

      // Create membership edges
      for (const member of members) {
        await this.createMembership(community.uuid, member, groupId)
        membershipCount++
      }

      communities.push(community)
    }

    // Invalidate cache
    this.cache.delete(groupId)

    const processingTimeMs = Date.now() - startTime
    console.log(
      `[WikiClusterService] Completed in ${processingTimeMs}ms: ${communities.length} communities, ${membershipCount} memberships`
    )

    return {
      communities,
      membershipCount,
      stats: {
        totalNodes: nodeCount,
        totalEdges: edgeCount,
        totalCommunities: communities.length,
        avgCommunitySize: clusterStats.avgSize,
        maxCommunitySize: clusterStats.maxSize,
        lpIterations: config.maxIterations || DEFAULT_LP_CONFIG.maxIterations,
        processingTimeMs,
      },
    }
  }

  /**
   * Update communities after a graph change (incremental)
   * For now, this triggers a full rebuild. Future: incremental updates.
   */
  async updateCommunities(input: UpdateCommunitiesInput): Promise<UpdateCommunitiesOutput> {
    const { context, forceRecalculate = false } = input

    // For now, always do full recalculate
    // TODO: Implement incremental updates based on entityUuid
    if (forceRecalculate || true) {
      const result = await this.detectCommunities({
        context,
        forceRebuild: true,
        generateSummaries: true,
      })

      // Always return modified=true when detectCommunities ran
      // even if no communities were found (graph was analyzed)
      return {
        modified: true,
        communitiesAffected: result.communities.length,
        newCommunity: result.communities[0],
      }
    }

    return {
      modified: false,
      communitiesAffected: 0,
    }
  }

  /**
   * Get communities for a workspace/project
   */
  async getCommunities(input: GetCommunitiesInput): Promise<GetCommunitiesOutput> {
    const { context, includeMembers = false, minMembers = 2, limit = 100 } = input
    const groupId = this.buildGroupId(context)

    // Check cache
    const cached = this.cache.get(groupId)
    if (cached && this.isCacheValid(cached)) {
      const filtered = cached.communities
        .filter((c) => c.memberCount >= minMembers)
        .slice(0, limit)

      if (!includeMembers) {
        return {
          communities: filtered,
          totalCount: cached.communities.length,
        }
      }

      // includeMembers=true: fetch members for cached communities
      const communitiesWithMembers: CommunityWithMembers[] = []
      for (const community of filtered) {
        const members = await this.fetchCommunityMembers(community.uuid)
        communitiesWithMembers.push({
          ...community,
          members,
        })
      }

      return {
        communities: communitiesWithMembers,
        totalCount: cached.communities.length,
      }
    }

    // Fetch from FalkorDB
    const communities = await this.fetchCommunities(groupId, minMembers, limit)

    // Update cache with fetched communities
    this.cache.set(groupId, {
      communities,
      computedAt: new Date(),
      groupId,
      nodeCount: 0, // TODO: track actual node/edge count for invalidation
      edgeCount: 0,
    })

    if (includeMembers) {
      const communitiesWithMembers: CommunityWithMembers[] = []

      for (const community of communities) {
        const members = await this.fetchCommunityMembers(community.uuid)
        communitiesWithMembers.push({
          ...community,
          members,
        })
      }

      return {
        communities: communitiesWithMembers,
        totalCount: communities.length,
      }
    }

    return {
      communities,
      totalCount: communities.length,
    }
  }

  /**
   * Get a single community by UUID with members
   */
  async getCommunity(communityUuid: string): Promise<CommunityWithMembers | null> {
    // Fetch community from FalkorDB
    const query = `
      MATCH (c:Community {uuid: '${this.escapeString(communityUuid)}'})
      RETURN c.uuid, c.name, c.summary, c.groupId, c.memberCount, c.createdAt, c.updatedAt
      LIMIT 1
    `

    const result = await this.query(query)

    if (result.length < 2 || !Array.isArray(result[1])) {
      return null
    }

    const row = result[1] as unknown[]
    if (!Array.isArray(row) || row.length < 7) {
      return null
    }

    const community: CommunityNode = {
      uuid: String(row[0]),
      name: String(row[1]),
      summary: String(row[2]),
      groupId: String(row[3]),
      memberCount: Number(row[4]),
      createdAt: new Date(String(row[5])),
      updatedAt: new Date(String(row[6])),
    }

    // Fetch members
    const members = await this.fetchCommunityMembers(communityUuid)

    return {
      ...community,
      members,
    }
  }

  // ============================================================================
  // FalkorDB Operations
  // ============================================================================

  /**
   * Build groupId from WikiContext
   */
  private buildGroupId(context: WikiContext): string {
    if (context.projectId) {
      return `wiki-proj-${context.projectId}`
    }
    return `wiki-ws-${context.workspaceId}`
  }

  /**
   * Execute a Cypher query on FalkorDB
   */
  private async query(cypher: string): Promise<unknown[]> {
    try {
      const result = (await this.redis.call(
        'GRAPH.QUERY',
        this.graphName,
        cypher
      )) as unknown[][]

      if (Array.isArray(result) && result.length > 0) {
        return result
      }
      return []
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[WikiClusterService] Query error:', errorMessage)
      throw error
    }
  }

  /**
   * Escape string for Cypher query
   */
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  }

  /**
   * Fetch graph projection for Label Propagation
   * Returns all entity nodes and their MENTIONS/LINKS_TO edges
   */
  private async fetchGraphProjection(
    groupId: string
  ): Promise<{ projection: LPProjectionMap; nodeCount: number; edgeCount: number }> {
    // Query all entity edges (MENTIONS and LINKS_TO)
    const edgeQuery = `
      MATCH (a)-[r:MENTIONS|LINKS_TO]->(b)
      WHERE a.groupId = '${this.escapeString(groupId)}'
        AND b.groupId = '${this.escapeString(groupId)}'
      RETURN a.uuid AS source, b.uuid AS target, count(r) AS count
    `

    const result = await this.query(edgeQuery)

    // Parse result - FalkorDB returns [headers, ...rows, metadata]
    const edges: Array<{ source: string; target: string; count: number }> = []

    if (result.length >= 2 && Array.isArray(result[1])) {
      // Skip header (result[0]) and metadata (last element)
      for (let i = 1; i < result.length - 1; i++) {
        const row = result[i] as unknown[]
        if (Array.isArray(row) && row.length >= 3) {
          edges.push({
            source: String(row[0]),
            target: String(row[1]),
            count: Number(row[2]) || 1,
          })
        }
      }
    }

    // Build projection
    const projection = buildProjectionFromEdges(edges)
    const nodeCount = Object.keys(projection).length
    const edgeCount = edges.length

    return { projection, nodeCount, edgeCount }
  }

  /**
   * Fetch entity info for a list of UUIDs
   */
  private async fetchEntityInfo(uuids: string[], groupId: string): Promise<EntitySummary[]> {
    if (uuids.length === 0) return []

    // Query entity nodes by UUID
    const uuidList = uuids.map((u) => `'${this.escapeString(u)}'`).join(', ')
    const query = `
      MATCH (n)
      WHERE n.uuid IN [${uuidList}] AND n.groupId = '${this.escapeString(groupId)}'
      RETURN n.uuid AS uuid, n.name AS name, labels(n)[0] AS type, n.summary AS summary
    `

    const result = await this.query(query)
    const entities: EntitySummary[] = []

    if (result.length >= 2 && Array.isArray(result[1])) {
      for (let i = 1; i < result.length - 1; i++) {
        const row = result[i] as unknown[]
        if (Array.isArray(row) && row.length >= 3) {
          entities.push({
            uuid: String(row[0]),
            name: String(row[1]),
            type: String(row[2]),
            summary: row[3] ? String(row[3]) : undefined,
          })
        }
      }
    }

    return entities
  }

  /**
   * Store a community node in FalkorDB
   */
  private async storeCommunity(community: CommunityNode): Promise<void> {
    const query = `
      CREATE (c:Community {
        uuid: '${this.escapeString(community.uuid)}',
        name: '${this.escapeString(community.name)}',
        summary: '${this.escapeString(community.summary)}',
        groupId: '${this.escapeString(community.groupId)}',
        memberCount: ${community.memberCount},
        createdAt: '${community.createdAt.toISOString()}',
        updatedAt: '${community.updatedAt.toISOString()}'
      })
    `

    await this.query(query)
  }

  /**
   * Create membership edge between Community and Entity
   */
  private async createMembership(
    communityUuid: string,
    entity: EntitySummary,
    groupId: string
  ): Promise<void> {
    const membershipUuid = crypto.randomUUID()
    const query = `
      MATCH (c:Community {uuid: '${this.escapeString(communityUuid)}'})
      MATCH (e {uuid: '${this.escapeString(entity.uuid)}'})
      CREATE (c)-[r:HAS_MEMBER {
        uuid: '${membershipUuid}',
        groupId: '${this.escapeString(groupId)}',
        entityType: '${this.escapeString(entity.type)}',
        entityName: '${this.escapeString(entity.name)}',
        createdAt: '${new Date().toISOString()}'
      }]->(e)
    `

    await this.query(query)
  }

  /**
   * Delete all communities for a groupId
   */
  private async deleteCommunitiesForGroup(groupId: string): Promise<void> {
    // Delete membership edges first
    await this.query(`
      MATCH (c:Community {groupId: '${this.escapeString(groupId)}'})-[r:HAS_MEMBER]->()
      DELETE r
    `)

    // Delete community nodes
    await this.query(`
      MATCH (c:Community {groupId: '${this.escapeString(groupId)}'})
      DELETE c
    `)

    console.log(`[WikiClusterService] Deleted communities for ${groupId}`)
  }

  /**
   * Fetch communities from FalkorDB
   */
  private async fetchCommunities(
    groupId: string,
    minMembers: number,
    limit: number
  ): Promise<CommunityNode[]> {
    const query = `
      MATCH (c:Community {groupId: '${this.escapeString(groupId)}'})
      WHERE c.memberCount >= ${minMembers}
      RETURN c.uuid, c.name, c.summary, c.groupId, c.memberCount, c.createdAt, c.updatedAt
      ORDER BY c.memberCount DESC
      LIMIT ${limit}
    `

    const result = await this.query(query)
    const communities: CommunityNode[] = []

    if (result.length >= 2 && Array.isArray(result[1])) {
      for (let i = 1; i < result.length - 1; i++) {
        const row = result[i] as unknown[]
        if (Array.isArray(row) && row.length >= 7) {
          communities.push({
            uuid: String(row[0]),
            name: String(row[1]),
            summary: String(row[2]),
            groupId: String(row[3]),
            memberCount: Number(row[4]),
            createdAt: new Date(String(row[5])),
            updatedAt: new Date(String(row[6])),
          })
        }
      }
    }

    return communities
  }

  /**
   * Fetch members of a community
   */
  private async fetchCommunityMembers(
    communityUuid: string
  ): Promise<Array<{ uuid: string; name: string; type: string }>> {
    const query = `
      MATCH (c:Community {uuid: '${this.escapeString(communityUuid)}'})-[r:HAS_MEMBER]->(e)
      RETURN e.uuid, e.name, r.entityType
    `

    const result = await this.query(query)
    const members: Array<{ uuid: string; name: string; type: string }> = []

    if (result.length >= 2 && Array.isArray(result[1])) {
      for (let i = 1; i < result.length - 1; i++) {
        const row = result[i] as unknown[]
        if (Array.isArray(row) && row.length >= 3) {
          members.push({
            uuid: String(row[0]),
            name: String(row[1]),
            type: String(row[2]),
          })
        }
      }
    }

    return members
  }

  // ============================================================================
  // LLM Operations
  // ============================================================================

  /**
   * Hierarchical pair-wise summarization
   * Combines entity summaries tournament-style until one summary remains
   */
  private async hierarchicalSummarize(
    entities: EntitySummary[],
    context: WikiContext
  ): Promise<string> {
    if (!this.wikiAiService) {
      throw new Error('WikiAiService not available for summarization')
    }

    if (entities.length === 0) {
      return ''
    }

    // Generate base summaries for each entity
    let summaries = entities.map((e) => {
      if (e.summary) {
        return `${e.name} (${e.type}): ${e.summary}`
      }
      return `${e.name} (${e.type})`
    })

    // Tournament-style pair-wise summarization
    while (summaries.length > 1) {
      const newSummaries: string[] = []

      for (let i = 0; i < summaries.length; i += 2) {
        if (i + 1 < summaries.length) {
          // Combine pair
          const combined = await this.summarizePair(summaries[i]!, summaries[i + 1]!, context)
          newSummaries.push(combined)
        } else {
          // Odd one out, carry forward
          newSummaries.push(summaries[i]!)
        }
      }

      summaries = newSummaries
    }

    return summaries[0] || ''
  }

  /**
   * Summarize two summaries into one
   */
  private async summarizePair(
    summary1: string,
    summary2: string,
    context: WikiContext
  ): Promise<string> {
    if (!this.wikiAiService) {
      throw new Error('WikiAiService not available')
    }

    const systemPrompt = getSummarizePairSystemPrompt()
    const userPrompt = getSummarizePairUserPrompt({
      summaries: [summary1, summary2],
    })

    const response = await this.wikiAiService.chat(context, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    const result = parseSummarizePairResponse(response)

    return result.summary
  }

  /**
   * Generate community name from summary
   */
  private async generateCommunityName(
    summary: string,
    topEntityNames: string[],
    context: WikiContext
  ): Promise<{ name: string; description?: string }> {
    if (!this.wikiAiService) {
      throw new Error('WikiAiService not available')
    }

    const systemPrompt = getGenerateCommunityNameSystemPrompt()
    const userPrompt = getGenerateCommunityNameUserPrompt({
      summary,
      topEntityNames,
    })

    const response = await this.wikiAiService.chat(context, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
    return parseGenerateCommunityNameResponse(response)
  }

  /**
   * Generate fallback name when AI is not available
   */
  private generateFallbackName(entities: EntitySummary[]): string {
    if (entities.length === 0) {
      return 'Empty Community'
    }

    // Use top 3 entity names
    const topNames = entities.slice(0, 3).map((e) => e.name)

    if (topNames.length === 1) {
      return `${topNames[0]} & Related`
    }

    return topNames.join(', ') + (entities.length > 3 ? ' & more' : '')
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CommunityCacheEntry): boolean {
    const now = Date.now()
    const age = now - entry.computedAt.getTime()
    return age < this.cacheConfig.ttlMs
  }

  /**
   * Invalidate cache for a groupId
   */
  invalidateCache(groupId: string): void {
    this.cache.delete(groupId)
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: WikiClusterService | null = null

export function getWikiClusterService(prisma?: PrismaClient): WikiClusterService {
  if (!instance) {
    instance = new WikiClusterService(prisma)
  } else if (prisma && !instance['wikiAiService']) {
    instance.setWikiAiService(getWikiAiService(prisma))
  }
  return instance
}

export function resetWikiClusterService(): void {
  if (instance) {
    instance.close().catch(console.error)
    instance = null
  }
}
