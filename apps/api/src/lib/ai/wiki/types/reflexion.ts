/**
 * Reflexion Extraction Types (Fase 23.2)
 *
 * Types for multi-pass entity extraction to detect missed entities.
 * Ported from Python Graphiti: extract_nodes.py, extract_edges.py
 *
 * Multi-tenant Considerations:
 * - All reflexion calls are scoped to WikiContext (workspaceId, projectId)
 * - No cross-workspace entity leakage
 * - Provider selection based on workspace/project configuration
 *
 * Decision Context (Session 2026-01-14):
 * - Max passes: 1 (single reflexion pass)
 * - Nodes: enabled by default
 * - Edges: implemented but disabled by default (like Python Graphiti)
 */

// ===========================================================================
// Missed Entity Types
// ===========================================================================

/**
 * Missed entity from reflexion pass
 * Represents an entity that wasn't extracted in the initial pass
 */
export interface MissedEntity {
  /** Name of the missed entity */
  name: string
  /** Why this entity was missed (optional explanation) */
  reason?: string
  /** Suggested entity type based on context */
  suggestedType?: string
}

/**
 * Result from reflexion extraction for nodes
 */
export interface NodeReflexionResult {
  /** List of missed entity names */
  missedEntities: MissedEntity[]
  /** Reasoning for the detection */
  reasoning: string
  /** Provider used */
  provider: string
  /** Model used */
  model: string
}

// ===========================================================================
// Missed Fact/Edge Types
// ===========================================================================

/**
 * Missed fact/edge from reflexion pass
 */
export interface MissedFact {
  /** Source entity name */
  sourceName: string
  /** Target entity name */
  targetName: string
  /** Relationship type */
  relationType: string
  /** Human-readable fact description */
  fact: string
  /** Why this fact was missed */
  reason?: string
}

/**
 * Result from reflexion extraction for edges
 */
export interface EdgeReflexionResult {
  /** List of missed facts */
  missedFacts: MissedFact[]
  /** Reasoning for the detection */
  reasoning: string
  /** Provider used */
  provider: string
  /** Model used */
  model: string
}

// ===========================================================================
// Configuration Types
// ===========================================================================

/**
 * Configuration for reflexion extraction
 *
 * Defaults match Python Graphiti behavior:
 * - Node reflexion: enabled
 * - Edge reflexion: disabled (prompt exists but not used in Python)
 * - Max passes: 1
 */
export interface ReflexionConfig {
  /** Enable reflexion for nodes (default: true) */
  enableNodeReflexion?: boolean
  /** Enable reflexion for edges (default: false - like Python Graphiti) */
  enableEdgeReflexion?: boolean
  /** Maximum number of reflexion passes (default: 1) */
  maxPasses?: number
  /** Minimum missed entities to trigger re-extraction (default: 1) */
  minMissedThreshold?: number
}

/**
 * Default reflexion configuration
 * Matches Python Graphiti behavior
 */
export const DEFAULT_REFLEXION_CONFIG: Required<ReflexionConfig> = {
  enableNodeReflexion: true,
  enableEdgeReflexion: false,
  maxPasses: 1,
  minMissedThreshold: 1,
} as const

// ===========================================================================
// Sync Result Types
// ===========================================================================

/**
 * Combined reflexion result for syncWikiPage
 */
export interface ReflexionSyncResult {
  /** Missed nodes detected and re-extracted */
  nodesRecovered: number
  /** Missed edges detected and re-extracted */
  edgesRecovered: number
  /** Total reflexion passes executed */
  passesExecuted: number
  /** Whether reflexion was skipped (e.g., no initial entities) */
  skipped: boolean
  /** Skip reason if applicable */
  skipReason?: string
}

// ===========================================================================
// Internal Types (for prompt parsing)
// ===========================================================================

/**
 * Raw parsed entity from LLM response
 * Used internally by parseReflexionNodesResponse
 */
export interface ParsedMissedEntity {
  name: string
  reason?: string
  suggestedType?: string
}

/**
 * Raw parsed fact from LLM response
 * Used internally by parseReflexionEdgesResponse
 */
export interface ParsedMissedFact {
  sourceName: string
  targetName: string
  relationType: string
  fact: string
  reason?: string
}
