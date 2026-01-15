/**
 * Community Detection Types (Fase 24.2)
 *
 * Types for automatic cluster detection in the knowledge graph.
 * Communities are groups of related entities detected via Label Propagation.
 *
 * MULTI-TENANT SCOPING:
 * - groupId: 'wiki-ws-{workspaceId}' voor workspace wiki
 * - groupId: 'wiki-proj-{projectId}' voor project wiki (toekomstig)
 *
 * BELANGRIJK: Communities mogen NOOIT cross-tenant zijn!
 * Een community bevat alleen nodes uit dezelfde workspace/project.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import type { WikiContext } from '../WikiAiService'

// ============================================================================
// Core Node & Edge Types
// ============================================================================

/**
 * Community node in the knowledge graph
 * Represents a cluster of related entities
 */
export interface CommunityNode {
  /** Unique identifier (UUID v4) */
  uuid: string
  /** LLM-generated short name for the community (max 100 chars) */
  name: string
  /** LLM-generated summary of what this community represents */
  summary: string
  /** Multi-tenant scoping: wiki-ws-{id} or wiki-proj-{id} */
  groupId: string
  /** Cached count of members for quick access */
  memberCount: number
  /** Optional: embedding vector for semantic search */
  nameEmbedding?: number[]
  /** Creation timestamp */
  createdAt: Date
  /** Last update timestamp */
  updatedAt: Date
}

/**
 * Membership edge connecting Community to Entity
 * Stored as HAS_MEMBER relationship in FalkorDB
 */
export interface CommunityMembership {
  /** Unique identifier for the edge */
  uuid: string
  /** Community UUID (source) */
  communityUuid: string
  /** Entity UUID (target - can be Person, Concept, WikiPage, etc.) */
  entityUuid: string
  /** Entity type for quick filtering */
  entityType: string
  /** Entity name for display */
  entityName: string
  /** Multi-tenant scoping */
  groupId: string
  /** When this membership was created */
  createdAt: Date
}

// ============================================================================
// Algorithm Types (Label Propagation)
// ============================================================================

/**
 * Neighbor information for Label Propagation
 */
export interface LPNeighbor {
  /** UUID of the neighboring node */
  nodeUuid: string
  /** Number of edges connecting to this neighbor */
  edgeCount: number
}

/**
 * Graph projection map for Label Propagation
 * Maps node UUIDs to their neighbors with edge counts
 */
export interface LPProjectionMap {
  [nodeUuid: string]: LPNeighbor[]
}

/**
 * Result of Label Propagation algorithm
 */
export interface LPClusterResult {
  /** Community identifier (will become UUID) */
  communityId: number
  /** UUIDs of nodes belonging to this cluster */
  memberUuids: string[]
}

/**
 * Configuration for Label Propagation
 */
export interface LPConfig {
  /** Maximum iterations to prevent infinite loops (default: 100) */
  maxIterations?: number
  /** Minimum cluster size to keep (default: 2) */
  minClusterSize?: number
  /** Random seed for tie-breaking (optional, for reproducibility) */
  seed?: number
}

/**
 * Default Label Propagation configuration
 */
export const DEFAULT_LP_CONFIG: Required<LPConfig> = {
  maxIterations: 100,
  minClusterSize: 2,
  seed: 42,
} as const

// ============================================================================
// Service Input/Output Types
// ============================================================================

/**
 * Input for detecting communities
 */
export interface DetectCommunitiesInput {
  /** Wiki context for multi-tenant scoping */
  context: WikiContext
  /** Force rebuild: delete existing communities first (default: false) */
  forceRebuild?: boolean
  /** Label Propagation configuration */
  lpConfig?: LPConfig
  /** Generate AI summaries for communities (default: true) */
  generateSummaries?: boolean
}

/**
 * Output from community detection
 */
export interface DetectCommunitiesOutput {
  /** Detected communities */
  communities: CommunityNode[]
  /** Total membership edges created */
  membershipCount: number
  /** Processing statistics */
  stats: {
    /** Total nodes analyzed */
    totalNodes: number
    /** Total edges analyzed */
    totalEdges: number
    /** Number of communities detected */
    totalCommunities: number
    /** Average community size */
    avgCommunitySize: number
    /** Largest community size */
    maxCommunitySize: number
    /** Label Propagation iterations */
    lpIterations: number
    /** Total processing time in milliseconds */
    processingTimeMs: number
  }
}

/**
 * Input for updating communities after graph change
 */
export interface UpdateCommunitiesInput {
  /** Wiki context for multi-tenant scoping */
  context: WikiContext
  /** UUID of newly added/modified entity (optional) */
  entityUuid?: string
  /** Force full recalculation (default: false, uses incremental) */
  forceRecalculate?: boolean
}

/**
 * Output from community update
 */
export interface UpdateCommunitiesOutput {
  /** Whether communities were modified */
  modified: boolean
  /** Number of communities affected */
  communitiesAffected: number
  /** New community if entity was placed in one */
  newCommunity?: CommunityNode
}

/**
 * Input for getting communities
 */
export interface GetCommunitiesInput {
  /** Wiki context for multi-tenant scoping */
  context: WikiContext
  /** Include member details (default: false, just counts) */
  includeMembers?: boolean
  /** Filter by minimum member count */
  minMembers?: number
  /** Maximum number of communities to return */
  limit?: number
}

/**
 * Community with optional member details
 */
export interface CommunityWithMembers extends CommunityNode {
  /** Member entities (only if includeMembers=true) */
  members?: Array<{
    uuid: string
    name: string
    type: string
  }>
}

/**
 * Output from getting communities
 */
export interface GetCommunitiesOutput {
  /** Communities (with or without members) */
  communities: CommunityWithMembers[]
  /** Total count (may be more than returned if limit applied) */
  totalCount: number
}

// ============================================================================
// LLM Summarization Types
// ============================================================================

/**
 * Input for summarizing a pair of summaries (hierarchical summarization)
 */
export interface SummarizePairInput {
  /** Two summaries to combine */
  summaries: [string, string]
}

/**
 * Output from pair summarization
 */
export interface SummarizePairOutput {
  /** Combined summary */
  summary: string
}

/**
 * Input for generating community name/description from summary
 */
export interface GenerateCommunityNameInput {
  /** Summary of all community members */
  summary: string
  /** Names of top entities in the community */
  topEntityNames: string[]
}

/**
 * Output from community name generation
 */
export interface GenerateCommunityNameOutput {
  /** Short descriptive name (max 100 chars) */
  name: string
  /** Longer description if needed */
  description?: string
}

/**
 * Entity summary for LLM input
 */
export interface EntitySummary {
  /** Entity UUID */
  uuid: string
  /** Entity name */
  name: string
  /** Entity type (Person, Concept, etc.) */
  type: string
  /** Summary or description of the entity */
  summary?: string
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cached community data
 */
export interface CommunityCacheEntry {
  /** Cached communities */
  communities: CommunityNode[]
  /** When this cache entry was computed */
  computedAt: Date
  /** Group ID for scoping */
  groupId: string
  /** Node count at time of computation (for invalidation) */
  nodeCount: number
  /** Edge count at time of computation (for invalidation) */
  edgeCount: number
}

/**
 * Cache configuration
 */
export interface CommunityCacheConfig {
  /** Cache TTL in milliseconds (default: 5 minutes) */
  ttlMs?: number
  /** Invalidate on any graph change (default: true) */
  invalidateOnChange?: boolean
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: Required<CommunityCacheConfig> = {
  ttlMs: 5 * 60 * 1000, // 5 minutes
  invalidateOnChange: true,
} as const

// ============================================================================
// FalkorDB Schema Types
// ============================================================================

/**
 * Community node as stored in FalkorDB
 */
export interface FalkorCommunityNode {
  uuid: string
  name: string
  summary: string
  group_id: string
  member_count: number
  created_at: string // ISO date string
  updated_at: string // ISO date string
}

/**
 * HAS_MEMBER relationship as stored in FalkorDB
 */
export interface FalkorHasMemberEdge {
  uuid: string
  group_id: string
  entity_type: string
  entity_name: string
  created_at: string // ISO date string
}

// ============================================================================
// UI/API Types
// ============================================================================

/**
 * Community data for frontend display
 */
export interface CommunityDisplayData {
  /** Community UUID */
  id: string
  /** Display name */
  name: string
  /** Summary text */
  summary: string
  /** Number of members */
  memberCount: number
  /** Color for visualization (assigned by frontend) */
  color?: string
  /** Whether this community is currently selected */
  isSelected?: boolean
}

/**
 * Community detection status
 */
export type CommunityDetectionStatus =
  | 'idle'
  | 'detecting'
  | 'summarizing'
  | 'complete'
  | 'error'

/**
 * Community detection progress
 */
export interface CommunityDetectionProgress {
  /** Current status */
  status: CommunityDetectionStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Current step description */
  currentStep: string
  /** Error message if status is 'error' */
  error?: string
}
