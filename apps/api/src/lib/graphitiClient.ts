/*
 * Graphiti HTTP Client
 * Version: 1.0.0
 *
 * HTTP client for communicating with the Graphiti Python service.
 * Provides typed methods for all Graphiti API endpoints.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Fase 8 - API integration with Python service
 * ===================================================================
 */

// =============================================================================
// Types - Match Python API schemas
// =============================================================================

export interface AddEpisodeRequest {
  name: string
  episode_body: string
  source?: 'text' | 'json' | 'message'
  source_description?: string
  group_id: string
  reference_time?: string // ISO datetime
}

export interface AddEpisodeResponse {
  episode_uuid: string
  entities_extracted: number
  relations_created: number
}

export interface SearchRequest {
  query: string
  group_id?: string
  limit?: number
}

export interface SearchResult {
  uuid: string
  name: string
  content: string
  score: number
  result_type: string
  metadata: Record<string, unknown>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

export interface TemporalQueryRequest {
  query: string
  group_id: string
  as_of: string // ISO datetime
  limit?: number
}

export interface TemporalQueryResponse {
  results: SearchResult[]
  as_of: string
}

export interface GraphNode {
  id: string
  label: string
  type: string
  properties: Record<string, unknown>
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  fact?: string
  valid_at?: string
  invalid_at?: string
}

export interface GetGraphRequest {
  group_id: string
}

export interface GetGraphResponse {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface EpisodeInfo {
  uuid: string
  name: string
  content: string
  source: string
  source_description?: string
  created_at: string
  valid_at?: string
}

export interface GetEpisodesRequest {
  group_id: string
  limit?: number
}

export interface GetEpisodesResponse {
  episodes: EpisodeInfo[]
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  database_connected: boolean
  llm_configured: boolean
  embedder_configured: boolean
  version: string
}

export interface StatsResponse {
  total_nodes: number
  total_edges: number
  total_episodes: number
  nodes_by_type: Record<string, number>
  edges_by_type: Record<string, number>
}

// =============================================================================
// GraphitiClient Class
// =============================================================================

export class GraphitiClient {
  private baseUrl: string
  private timeout: number

  constructor(options?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = options?.baseUrl ?? process.env.GRAPHITI_SERVICE_URL ?? 'http://localhost:8000'
    this.timeout = options?.timeout ?? 30000 // 30 seconds default
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new GraphitiClientError(
          `Graphiti API error: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        )
      }

      return (await response.json()) as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof GraphitiClientError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new GraphitiClientError('Request timeout', 408)
        }
        // Connection refused, network error, etc.
        throw new GraphitiClientError(`Connection failed: ${error.message}`, 0)
      }

      throw new GraphitiClientError('Unknown error', 0)
    }
  }

  // ===========================================================================
  // Health & Stats
  // ===========================================================================

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/health')
  }

  async stats(groupId?: string): Promise<StatsResponse> {
    const query = groupId ? `?group_id=${encodeURIComponent(groupId)}` : ''
    return this.request<StatsResponse>('GET', `/stats${query}`)
  }

  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.health()
      return health.status === 'healthy'
    } catch {
      return false
    }
  }

  // ===========================================================================
  // Episode Operations
  // ===========================================================================

  async addEpisode(request: AddEpisodeRequest): Promise<AddEpisodeResponse> {
    return this.request<AddEpisodeResponse>('POST', '/episodes', request)
  }

  async getEpisodes(request: GetEpisodesRequest): Promise<GetEpisodesResponse> {
    return this.request<GetEpisodesResponse>('POST', '/episodes/list', request)
  }

  async deleteEpisode(episodeUuid: string): Promise<{ success: boolean; uuid: string }> {
    return this.request('DELETE', `/episodes/${encodeURIComponent(episodeUuid)}`)
  }

  // ===========================================================================
  // Search Operations
  // ===========================================================================

  async search(request: SearchRequest): Promise<SearchResponse> {
    return this.request<SearchResponse>('POST', '/search', request)
  }

  async temporalSearch(request: TemporalQueryRequest): Promise<TemporalQueryResponse> {
    return this.request<TemporalQueryResponse>('POST', '/search/temporal', request)
  }

  // ===========================================================================
  // Graph Operations
  // ===========================================================================

  async getGraph(request: GetGraphRequest): Promise<GetGraphResponse> {
    return this.request<GetGraphResponse>('POST', '/graph', request)
  }
}

// =============================================================================
// Error Class
// =============================================================================

export class GraphitiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message)
    this.name = 'GraphitiClientError'
  }

  isConnectionError(): boolean {
    return this.statusCode === 0
  }

  isTimeout(): boolean {
    return this.statusCode === 408
  }

  isServerError(): boolean {
    return this.statusCode >= 500
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let clientInstance: GraphitiClient | null = null

export function getGraphitiClient(): GraphitiClient {
  if (!clientInstance) {
    clientInstance = new GraphitiClient()
  }
  return clientInstance
}

export default GraphitiClient
