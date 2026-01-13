/**
 * Wiki BM25 Search Service
 * Version: 1.0.0
 *
 * Full-text search for Wiki pages using PostgreSQL tsvector/tsquery.
 * Provides keyword-based search complementing semantic vector search.
 *
 * Features:
 * - Full-text search using PostgreSQL native FTS
 * - Weighted search (title > content > slug)
 * - Headline generation with highlights
 * - Prefix matching for autocomplete
 * - Multi-language support
 *
 * Fase 20.3 - BM25 Search Service Implementation
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Date: 2026-01-13
 * =============================================================================
 */

import type { PrismaClient } from '@prisma/client'

// =============================================================================
// Types
// =============================================================================

/**
 * Supported search languages for PostgreSQL FTS
 */
export type SearchLanguage = 'english' | 'dutch' | 'german' | 'simple'

/**
 * Options for BM25/FTS search
 */
export interface Bm25SearchOptions {
  /** Workspace ID (for workspace wiki search) */
  workspaceId?: number
  /** Project ID (for project wiki search) */
  projectId?: number
  /** Maximum results to return (default: 20) */
  limit?: number
  /** Minimum rank score 0-1 (default: 0.001) */
  minRank?: number
  /** Search language (default: 'english') */
  language?: SearchLanguage
  /** Include archived pages (default: false) */
  includeArchived?: boolean
}

/**
 * Result from BM25/FTS search
 */
export interface Bm25SearchResult {
  /** Page ID */
  pageId: number
  /** Page title */
  title: string
  /** Page slug */
  slug: string
  /** BM25/TF-IDF rank score (0-1 normalized) */
  rank: number
  /** Matched headline with <mark> highlights */
  headline?: string
  /** Source: 'workspace' or 'project' */
  source: 'workspace' | 'project'
}

/**
 * Raw result from PostgreSQL FTS query
 */
interface RawFtsResult {
  id: number
  title: string
  slug: string
  rank: number
  headline: string | null
}

// =============================================================================
// WikiBm25Service Class
// =============================================================================

export class WikiBm25Service {
  constructor(private prisma: PrismaClient) {}

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Full-text search using PostgreSQL tsquery
   *
   * Searches both workspace and project wiki pages based on provided options.
   * Results are ranked by ts_rank and include highlighted headlines.
   *
   * @example
   * const results = await bm25Service.search('kanban board', {
   *   workspaceId: 1,
   *   limit: 10
   * })
   *
   * @example
   * // Search with Dutch language
   * const results = await bm25Service.search('project beheer', {
   *   workspaceId: 1,
   *   language: 'dutch'
   * })
   */
  async search(query: string, options: Bm25SearchOptions): Promise<Bm25SearchResult[]> {
    const {
      workspaceId,
      projectId,
      limit = 20,
      minRank = 0.001,
      language = 'english',
      includeArchived = false,
    } = options

    // Validate input
    if (!query || query.trim().length === 0) {
      return []
    }

    if (!workspaceId && !projectId) {
      throw new Error('Either workspaceId or projectId must be provided')
    }

    // Convert query to tsquery format
    const tsquery = this.buildTsQuery(query)
    if (!tsquery) {
      return []
    }

    const results: Bm25SearchResult[] = []

    // Search workspace wiki pages
    if (workspaceId) {
      const workspaceResults = await this.searchWorkspaceWiki(
        workspaceId,
        tsquery,
        language,
        limit,
        minRank,
        includeArchived
      )
      results.push(...workspaceResults)
    }

    // Search project wiki pages
    if (projectId) {
      const projectResults = await this.searchProjectWiki(
        projectId,
        tsquery,
        language,
        limit,
        minRank,
        includeArchived
      )
      results.push(...projectResults)
    }

    // Sort by rank descending and limit total results
    return results.sort((a, b) => b.rank - a.rank).slice(0, limit)
  }

  /**
   * Get search suggestions (autocomplete) based on title words
   *
   * @example
   * const suggestions = await bm25Service.getSuggestions('kan', 1)
   * // Returns: ['kanban', 'kanbu']
   */
  async getSuggestions(
    prefix: string,
    workspaceId: number,
    limit: number = 5
  ): Promise<string[]> {
    if (!prefix || prefix.length < 2) {
      return []
    }

    const loweredPrefix = prefix.toLowerCase()

    try {
      const results = await this.prisma.$queryRaw<Array<{ word: string }>>`
        SELECT DISTINCT
          unnest(string_to_array(lower(title), ' ')) as word
        FROM workspace_wiki_pages
        WHERE workspace_id = ${workspaceId}
          AND status != 'ARCHIVED'
        HAVING unnest(string_to_array(lower(title), ' ')) LIKE ${loweredPrefix + '%'}
        LIMIT ${limit}
      `

      return results.map((r) => r.word).filter((w) => w.length > 1)
    } catch (error) {
      console.error('[WikiBm25Service] getSuggestions failed:', error)
      return []
    }
  }

  /**
   * Check if full-text search is available for a workspace
   * Verifies that search_vector column is populated
   */
  async isSearchAvailable(workspaceId: number): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM workspace_wiki_pages
        WHERE workspace_id = ${workspaceId}
          AND search_vector IS NOT NULL
      `
      return Number(result[0]?.count ?? 0) > 0
    } catch {
      return false
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Build PostgreSQL tsquery from user query string
   *
   * Handles:
   * - Simple words → word1:* & word2:* (prefix matching with AND)
   * - Escapes special characters
   * - Returns empty string for invalid queries
   */
  buildTsQuery(query: string): string {
    // Remove special PostgreSQL tsquery characters
    const escaped = query.replace(/[&|!():*<>']/g, ' ')

    // Split into words and filter empty
    const words = escaped
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)

    if (words.length === 0) {
      return ''
    }

    // Build query with prefix matching: word1:* & word2:*
    // This allows partial word matching
    return words.map((w) => `${w}:*`).join(' & ')
  }

  /**
   * Search workspace wiki pages using raw SQL for tsvector
   */
  private async searchWorkspaceWiki(
    workspaceId: number,
    tsquery: string,
    language: SearchLanguage,
    limit: number,
    minRank: number,
    includeArchived: boolean
  ): Promise<Bm25SearchResult[]> {
    try {
      // Build status filter
      const statusCondition = includeArchived ? '' : `AND status != 'ARCHIVED'`

      // Execute raw SQL query for full-text search
      // Note: Language must be cast to regconfig for PostgreSQL FTS functions
      const results = await this.prisma.$queryRawUnsafe<RawFtsResult[]>(
        `
        SELECT
          id,
          title,
          slug,
          ts_rank(search_vector, to_tsquery($1::regconfig, $2)) as rank,
          ts_headline($1::regconfig, content, to_tsquery($1::regconfig, $2),
            'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline
        FROM workspace_wiki_pages
        WHERE workspace_id = $3
          AND search_vector @@ to_tsquery($1::regconfig, $2)
          ${statusCondition}
        ORDER BY rank DESC
        LIMIT $4
        `,
        language,
        tsquery,
        workspaceId,
        limit
      )

      return results
        .filter((r) => r.rank >= minRank)
        .map((r) => ({
          pageId: r.id,
          title: r.title,
          slug: r.slug,
          rank: r.rank,
          headline: r.headline ?? undefined,
          source: 'workspace' as const,
        }))
    } catch (error) {
      console.error('[WikiBm25Service] searchWorkspaceWiki failed:', error)
      return []
    }
  }

  /**
   * Search project wiki pages using raw SQL for tsvector
   */
  private async searchProjectWiki(
    projectId: number,
    tsquery: string,
    language: SearchLanguage,
    limit: number,
    minRank: number,
    includeArchived: boolean
  ): Promise<Bm25SearchResult[]> {
    try {
      // Build status filter
      const statusCondition = includeArchived ? '' : `AND status != 'ARCHIVED'`

      // Execute raw SQL query for full-text search
      // Note: Language must be cast to regconfig for PostgreSQL FTS functions
      const results = await this.prisma.$queryRawUnsafe<RawFtsResult[]>(
        `
        SELECT
          id,
          title,
          slug,
          ts_rank(search_vector, to_tsquery($1::regconfig, $2)) as rank,
          ts_headline($1::regconfig, content, to_tsquery($1::regconfig, $2),
            'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline
        FROM wiki_pages
        WHERE project_id = $3
          AND search_vector @@ to_tsquery($1::regconfig, $2)
          ${statusCondition}
        ORDER BY rank DESC
        LIMIT $4
        `,
        language,
        tsquery,
        projectId,
        limit
      )

      return results
        .filter((r) => r.rank >= minRank)
        .map((r) => ({
          pageId: r.id,
          title: r.title,
          slug: r.slug,
          rank: r.rank,
          headline: r.headline ?? undefined,
          source: 'project' as const,
        }))
    } catch (error) {
      console.error('[WikiBm25Service] searchProjectWiki failed:', error)
      return []
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let bm25ServiceInstance: WikiBm25Service | null = null

/**
 * Get or create WikiBm25Service singleton instance
 */
export function getWikiBm25Service(prisma: PrismaClient): WikiBm25Service {
  if (!bm25ServiceInstance) {
    bm25ServiceInstance = new WikiBm25Service(prisma)
  }
  return bm25ServiceInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetWikiBm25Service(): void {
  bm25ServiceInstance = null
}
