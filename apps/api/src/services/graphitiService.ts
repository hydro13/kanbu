/*
 * Graphiti Service
 * Version: 1.0.0
 *
 * Knowledge graph service for Wiki using FalkorDB.
 * Handles entity extraction, relationship storage, and graph queries.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation for Wiki Fase 2
 * ===================================================================
 */

import Redis from 'ioredis'

// =============================================================================
// Types
// =============================================================================

export interface GraphitiConfig {
  host: string
  port: number
  graphName: string
}

export interface WikiEpisode {
  pageId: number
  title: string
  content: string
  workspaceId?: number
  projectId?: number
  groupId: string // wiki-ws-{id} or wiki-proj-{id}
  userId: number
  timestamp: Date
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

export interface SearchResult {
  nodeId: string
  name: string
  type: string
  score: number
  pageId?: number
}

// =============================================================================
// GraphitiService Class
// =============================================================================

export class GraphitiService {
  private redis: Redis
  private graphName: string
  private initialized: boolean = false

  constructor(config?: Partial<GraphitiConfig>) {
    const host = config?.host ?? process.env.FALKORDB_HOST ?? 'localhost'
    const port = config?.port ?? parseInt(process.env.FALKORDB_PORT ?? '6379')
    this.graphName = config?.graphName ?? 'kanbu_wiki'

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
      await this.query(`CREATE INDEX IF NOT EXISTS FOR (n:WikiPage) ON (n.pageId)`)
      await this.query(`CREATE INDEX IF NOT EXISTS FOR (n:WikiPage) ON (n.groupId)`)
      await this.query(`CREATE INDEX IF NOT EXISTS FOR (n:Concept) ON (n.name)`)
      await this.query(`CREATE INDEX IF NOT EXISTS FOR (n:Person) ON (n.name)`)

      this.initialized = true
      console.log('[GraphitiService] Graph initialized')
    } catch (error) {
      console.error('[GraphitiService] Failed to initialize graph:', error)
      // Don't throw - allow service to work even if indexes fail
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
          const placeholder = `$${key}`
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
   */
  async syncWikiPage(episode: WikiEpisode): Promise<void> {
    await this.initialize()

    const { pageId, title, content, groupId, userId, timestamp } = episode

    // Create/update the WikiPage node
    await this.query(`
      MERGE (p:WikiPage {pageId: ${pageId}})
      SET p.title = '${this.escapeString(title)}',
          p.groupId = '${groupId}',
          p.updatedBy = ${userId},
          p.updatedAt = '${timestamp.toISOString()}',
          p.contentLength = ${content.length}
    `)

    // Extract and link entities from content
    const entities = this.extractEntities(content)

    for (const entity of entities) {
      // Create entity node if not exists
      await this.query(`
        MERGE (e:${entity.type} {name: '${this.escapeString(entity.name)}'})
        SET e.lastSeen = '${timestamp.toISOString()}'
      `)

      // Create relationship from page to entity
      await this.query(`
        MATCH (p:WikiPage {pageId: ${pageId}})
        MATCH (e:${entity.type} {name: '${this.escapeString(entity.name)}'})
        MERGE (p)-[r:MENTIONS]->(e)
        SET r.updatedAt = '${timestamp.toISOString()}'
      `)
    }

    // Extract and link wiki links
    const wikiLinks = this.extractWikiLinks(content)

    for (const link of wikiLinks) {
      // Create placeholder for linked page (will be resolved when that page is synced)
      await this.query(`
        MERGE (target:WikiPage {title: '${this.escapeString(link)}'})
      `)

      // Create LINKS_TO relationship
      await this.query(`
        MATCH (source:WikiPage {pageId: ${pageId}})
        MATCH (target:WikiPage {title: '${this.escapeString(link)}'})
        WHERE source <> target
        MERGE (source)-[r:LINKS_TO]->(target)
        SET r.updatedAt = '${timestamp.toISOString()}'
      `)
    }

    console.log(`[GraphitiService] Synced page ${pageId}: "${title}" with ${entities.length} entities, ${wikiLinks.length} links`)
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
   */
  async getBacklinks(pageId: number): Promise<{ pageId: number; title: string }[]> {
    await this.initialize()

    const result = await this.query(`
      MATCH (source:WikiPage)-[:LINKS_TO]->(target:WikiPage {pageId: ${pageId}})
      RETURN source.pageId AS pageId, source.title AS title
    `)

    return this.parseResults(result, ['pageId', 'title'])
  }

  /**
   * Get pages related through shared entities
   */
  async getRelatedPages(pageId: number, limit: number = 5): Promise<{ pageId: number; title: string; sharedCount: number }[]> {
    await this.initialize()

    const result = await this.query(`
      MATCH (p1:WikiPage {pageId: ${pageId}})-[:MENTIONS]->(e)<-[:MENTIONS]-(p2:WikiPage)
      WHERE p1 <> p2
      WITH p2, count(e) AS sharedCount
      RETURN p2.pageId AS pageId, p2.title AS title, sharedCount
      ORDER BY sharedCount DESC
      LIMIT ${limit}
    `)

    return this.parseResults(result, ['pageId', 'title', 'sharedCount'])
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

    const parsed = this.parseResults(result, ['name', 'type'])
    return parsed.map(row => ({
      id: `${row.type}-${row.name}`,
      name: row.name,
      type: row.type as GraphEntity['type'],
      properties: {},
    }))
  }

  /**
   * Search for pages by content/entities
   */
  async search(query: string, groupId?: string, limit: number = 10): Promise<SearchResult[]> {
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

    const parsed = this.parseResults(result, ['pageId', 'name', 'type', 'score'])

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
   * Get graph statistics
   */
  async getStats(groupId?: string): Promise<{ pages: number; entities: number; relationships: number }> {
    await this.initialize()

    const groupFilter = groupId ? `{groupId: '${groupId}'}` : ''

    const pagesResult = await this.query(`MATCH (p:WikiPage ${groupFilter}) RETURN count(p) AS count`)
    const entitiesResult = await this.query(`MATCH (e) WHERE NOT e:WikiPage RETURN count(e) AS count`)
    const relsResult = await this.query(`MATCH ()-[r]->() RETURN count(r) AS count`)

    const parseCount = (result: unknown[]): number => {
      const parsed = this.parseResults(result, ['count'])
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
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      const name = match[1]
      const key = `Person:${name}`
      if (!seen.has(key)) {
        entities.push({ name, type: 'Person' })
        seen.add(key)
      }
    }

    // Extract #task references (Task)
    const taskRegex = /#([A-Z]+-\d+)/g
    while ((match = taskRegex.exec(content)) !== null) {
      const name = match[1]
      const key = `Task:${name}`
      if (!seen.has(key)) {
        entities.push({ name, type: 'Task' })
        seen.add(key)
      }
    }

    // Extract capitalized terms as potential concepts (simplified)
    // This is a placeholder - should use LLM for better extraction
    const conceptRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
    const skipWords = new Set(['The', 'This', 'That', 'What', 'When', 'Where', 'How', 'Why', 'If', 'Then'])
    while ((match = conceptRegex.exec(content)) !== null) {
      const name = match[1]
      if (name.length > 2 && !skipWords.has(name)) {
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
    let match

    while ((match = linkRegex.exec(content)) !== null) {
      const link = match[1].split('|')[0].trim() // Handle [[Page|Display Text]] format
      if (link && !links.includes(link)) {
        links.push(link)
      }
    }

    return links
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
  }

  private parseResults(result: unknown[], columns: string[]): Record<string, unknown>[] {
    if (!Array.isArray(result) || result.length < 2) return []

    // FalkorDB result format: [headers, row1, row2, ..., metadata]
    const rows = result.slice(1, -1) // Skip headers and metadata

    return rows.map(row => {
      if (!Array.isArray(row)) return {}
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj
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

export function getGraphitiService(): GraphitiService {
  if (!graphitiInstance) {
    graphitiInstance = new GraphitiService()
  }
  return graphitiInstance
}

export default GraphitiService
