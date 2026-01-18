/**
 * Deduplication Types for Wiki Entity Resolution
 *
 * Fase 22: Entity Deduplication & Graph Cleanup
 *
 * These types support:
 * - Node deduplication (exact, fuzzy, embedding, LLM)
 * - Edge deduplication
 * - IS_DUPLICATE_OF edge management
 *
 * Based on Python Graphiti: dedup_helpers.py, dedupe_nodes.py, dedupe_edges.py
 */

// ===========================================================================
// Core Entity Types
// ===========================================================================

/**
 * Minimal entity node information used in deduplication
 */
export interface EntityNodeInfo {
  /** Unique identifier (FalkorDB UUID) */
  uuid: string;
  /** Display name of the entity */
  name: string;
  /** Node type (Person, Concept, Task, Project, etc.) */
  type: string;
  /** Workspace/project grouping ID */
  groupId: string;
  /** Optional summary/description */
  summary?: string;
  /** Optional additional attributes */
  attributes?: Record<string, unknown>;
}

// ===========================================================================
// Duplicate Detection
// ===========================================================================

/**
 * How the duplicate match was determined
 */
export type DuplicateMatchType = 'exact' | 'fuzzy' | 'llm' | 'embedding';

/**
 * Represents a potential duplicate node pair
 */
export interface DuplicateCandidate {
  /** The new/extracted node that might be a duplicate */
  sourceNode: {
    uuid: string;
    name: string;
    type: string;
    groupId: string;
  };
  /** The existing node that might be the canonical version */
  targetNode: {
    uuid: string;
    name: string;
    type: string;
    groupId: string;
  };
  /** How the match was determined */
  matchType: DuplicateMatchType;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
  /** Similarity metrics */
  metrics: {
    jaccardSimilarity?: number;
    cosineSimilarity?: number;
    normalizedEditDistance?: number;
  };
}

/**
 * Resolution decision for a duplicate pair
 */
export interface DuplicateResolution {
  sourceUuid: string;
  targetUuid: string;
  action: 'merge' | 'keep_both' | 'defer';
  /** UUID of the canonical node (winner) */
  canonicalUuid: string;
  /** Reason for the decision */
  reason: string;
  /** User who made the decision (null for auto) */
  resolvedBy: string | null;
  resolvedAt: Date;
}

// ===========================================================================
// Deduplication Indexes (Precomputed Lookups)
// ===========================================================================

/**
 * Precomputed lookup structures for deduplication
 * Equivalent to Python's DedupCandidateIndexes
 *
 * These indexes are built once and reused for efficient duplicate detection
 */
export interface DedupCandidateIndexes {
  /** All existing nodes in the workspace */
  existingNodes: EntityNodeInfo[];
  /** UUID -> Node lookup */
  nodesByUuid: Map<string, EntityNodeInfo>;
  /** Normalized name -> Nodes with that name */
  normalizedExisting: Map<string, EntityNodeInfo[]>;
  /** UUID -> Shingles for fuzzy matching */
  shinglesByNode: Map<string, Set<string>>;
  /** LSH band key -> UUIDs that hash to that band */
  lshBuckets: Map<string, string[]>;
}

/**
 * Mutable state during deduplication resolution
 * Equivalent to Python's DedupResolutionState
 */
export interface DedupResolutionState {
  /** Resolved nodes (null if not yet resolved) */
  resolvedNodes: (EntityNodeInfo | null)[];
  /** Extracted UUID -> Resolved UUID mapping */
  uuidMap: Map<string, string>;
  /** Indices of nodes that need LLM resolution */
  unresolvedIndices: number[];
  /** Detected duplicate pairs */
  duplicatePairs: DuplicateCandidate[];
}

// ===========================================================================
// LLM Response Types
// ===========================================================================

/**
 * LLM response for single node deduplication
 */
export interface NodeDuplicateResponse {
  /** ID from the input (0-indexed) */
  id: number;
  /** Index of duplicate in existing nodes (-1 if no duplicate) */
  duplicateIdx: number;
  /** Best name for the entity */
  name: string;
  /** All duplicate indices (sorted) */
  duplicates: number[];
}

/**
 * LLM response for batch node deduplication
 */
export interface NodeResolutionsResponse {
  entityResolutions: NodeDuplicateResponse[];
}

/**
 * LLM response for edge deduplication
 */
export interface EdgeDuplicateResponse {
  /** Indices of duplicate facts in existing edges */
  duplicateFacts: number[];
  /** Indices of contradicted facts in existing edges */
  contradictedFacts: number[];
  /** Edge type classification */
  factType: string;
}

// ===========================================================================
// Edge Types for FalkorDB
// ===========================================================================

/**
 * IS_DUPLICATE_OF edge properties
 *
 * Direction: NewNode -[:IS_DUPLICATE_OF]-> CanonicalNode
 * The source node is the duplicate, target is the canonical version
 */
export interface DuplicateOfEdgeProps {
  /** Match confidence (0.0 - 1.0) */
  confidence: number;
  /** How the match was determined */
  matchType: DuplicateMatchType;
  /** When the duplicate was detected */
  detectedAt: Date;
  /** User who resolved (null = auto-detected) */
  resolvedBy: string | null;
}

// ===========================================================================
// Service Options
// ===========================================================================

/**
 * Options for deduplication resolution
 */
export interface DeduplicationOptions {
  /** Workspace ID for scoping */
  workspaceId: number;
  /** Optional project ID for scoping */
  projectId?: number;
  /** Episode/page content for LLM context */
  episodeContent?: string;
  /** Previous episodes for LLM context */
  previousEpisodes?: string[];
  /** Use LLM for unresolved nodes (default: true) */
  useLlm?: boolean;
  /** Use embedding similarity (default: true) */
  useEmbeddings?: boolean;
  /** Embedding similarity threshold (default: 0.85) */
  embeddingThreshold?: number;
  /** Fuzzy match Jaccard threshold (default: 0.9) */
  fuzzyThreshold?: number;
}

/**
 * Result of deduplication resolution
 */
export interface DeduplicationResult {
  /** Resolved nodes with canonical UUIDs */
  resolvedNodes: EntityNodeInfo[];
  /** Mapping: extracted UUID -> canonical UUID */
  uuidMap: Map<string, string>;
  /** Detected duplicate pairs */
  duplicatePairs: DuplicateCandidate[];
  /** Statistics */
  stats: {
    totalExtracted: number;
    exactMatches: number;
    fuzzyMatches: number;
    embeddingMatches: number;
    llmMatches: number;
    newNodes: number;
  };
}

/**
 * Options for batch deduplication scan
 */
export interface BatchDeduplicationOptions {
  /** Workspace ID */
  workspaceId: number;
  /** Similarity threshold (default: 0.85) */
  threshold?: number;
  /** Only report, don't create edges */
  dryRun?: boolean;
  /** Maximum pairs to return */
  limit?: number;
  /** Node types to include */
  nodeTypes?: string[];
}

/**
 * Result of batch deduplication scan
 */
export interface BatchDeduplicationResult {
  /** Detected duplicate pairs */
  duplicates: DuplicateCandidate[];
  /** Total nodes scanned */
  totalNodes: number;
  /** Number of duplicates found */
  duplicateCount: number;
  /** Number of IS_DUPLICATE_OF edges created (if not dry run) */
  edgesCreated: number;
  /** Execution mode */
  dryRun: boolean;
}

// ===========================================================================
// Constants
// ===========================================================================

/**
 * Default thresholds and constants for deduplication
 * Based on Python Graphiti defaults
 */
export const DEDUP_CONSTANTS = {
  /** Shannon entropy threshold for reliable fuzzy matching */
  NAME_ENTROPY_THRESHOLD: 1.5,
  /** Minimum name length for fuzzy matching */
  MIN_NAME_LENGTH: 6,
  /** Minimum token count for fuzzy matching */
  MIN_TOKEN_COUNT: 2,
  /** Jaccard similarity threshold for fuzzy match */
  FUZZY_JACCARD_THRESHOLD: 0.9,
  /** Number of MinHash permutations */
  MINHASH_PERMUTATIONS: 32,
  /** Size of each LSH band */
  MINHASH_BAND_SIZE: 4,
  /** Default embedding similarity threshold */
  EMBEDDING_THRESHOLD: 0.85,
  /** LLM confidence for dedup decisions */
  LLM_CONFIDENCE: 0.8,
} as const;
