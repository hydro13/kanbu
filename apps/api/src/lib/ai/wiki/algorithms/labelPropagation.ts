/**
 * Label Propagation Community Detection Algorithm (Fase 24.3)
 *
 * Port van Python Graphiti: graphiti_core/utils/maintenance/community_operations.py
 *
 * Algoritme:
 * 1. Start met elke node in eigen community (initialisatie)
 * 2. Elke iteratie: node neemt community van meerderheid neighbors over
 * 3. Ties worden gebroken door naar grootste community te gaan
 * 4. Herhaal tot convergentie (geen veranderingen) of max iteraties
 *
 * Complexiteit: O(iterations * nodes * avg_neighbors)
 * Typisch convergeert in 3-10 iteraties voor de meeste graphs.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import type { LPNeighbor, LPProjectionMap, LPConfig } from '../types/community'
import { DEFAULT_LP_CONFIG } from '../types/community'

// ============================================================================
// Main Algorithm
// ============================================================================

/**
 * Label Propagation Algorithm
 *
 * Detecteert communities in een graph door iteratief labels te propageren.
 * Nodes nemen het label over van de meerderheid van hun neighbors.
 *
 * @param projection - Map van node UUID naar lijst van neighbors met edge counts
 * @param config - Optionele configuratie (maxIterations, minClusterSize, seed)
 * @returns Array van clusters, elke cluster is array van node UUIDs
 *
 * @example
 * ```typescript
 * const projection = {
 *   'node-1': [{ nodeUuid: 'node-2', edgeCount: 2 }, { nodeUuid: 'node-3', edgeCount: 1 }],
 *   'node-2': [{ nodeUuid: 'node-1', edgeCount: 2 }],
 *   'node-3': [{ nodeUuid: 'node-1', edgeCount: 1 }],
 * }
 * const clusters = labelPropagation(projection)
 * // Returns: [['node-1', 'node-2', 'node-3']] - all in one community
 * ```
 */
export function labelPropagation(
  projection: LPProjectionMap,
  config?: LPConfig
): string[][] {
  const cfg = { ...DEFAULT_LP_CONFIG, ...config }
  const nodeUuids = Object.keys(projection)

  // Edge case: empty graph
  if (nodeUuids.length === 0) {
    return []
  }

  // Edge case: single node
  if (nodeUuids.length === 1) {
    return cfg.minClusterSize <= 1 ? [[nodeUuids[0]!]] : []
  }

  // Step 1: Initialize - each node gets its own community (0, 1, 2, ...)
  const communityMap = new Map<string, number>()
  nodeUuids.forEach((uuid, index) => {
    communityMap.set(uuid, index)
  })

  // Create seeded random for reproducibility (simple LCG)
  const random = createSeededRandom(cfg.seed)

  // Step 2: Propagation loop
  let iterations = 0
  let hasChanges = true

  while (hasChanges && iterations < cfg.maxIterations) {
    hasChanges = false
    iterations++

    // Shuffle nodes for random processing order (helps convergence)
    const shuffledNodes = shuffleArray([...nodeUuids], random)

    for (const nodeUuid of shuffledNodes) {
      const neighbors = projection[nodeUuid] || []

      // Skip isolated nodes (no neighbors)
      if (neighbors.length === 0) {
        continue
      }

      const currentCommunity = communityMap.get(nodeUuid)!

      // Count weighted votes for each community from neighbors
      const communityVotes = new Map<number, number>()

      for (const neighbor of neighbors) {
        const neighborCommunity = communityMap.get(neighbor.nodeUuid)
        if (neighborCommunity !== undefined) {
          const currentVotes = communityVotes.get(neighborCommunity) || 0
          communityVotes.set(neighborCommunity, currentVotes + neighbor.edgeCount)
        }
      }

      // Find community with maximum votes
      const newCommunity = findBestCommunity(
        communityVotes,
        communityMap,
        currentCommunity,
        random
      )

      // Update if community changed
      if (newCommunity !== currentCommunity) {
        communityMap.set(nodeUuid, newCommunity)
        hasChanges = true
      }
    }
  }

  // Step 3: Collect clusters
  const clusters = collectClusters(communityMap, cfg.minClusterSize)

  // Log convergence info
  console.log(
    `[LabelPropagation] Converged in ${iterations} iterations, found ${clusters.length} clusters`
  )

  return clusters
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the best community based on votes
 * Implements tie-breaking by community size, then by lowest community ID
 */
function findBestCommunity(
  communityVotes: Map<number, number>,
  communityMap: Map<string, number>,
  currentCommunity: number,
  random: () => number
): number {
  if (communityVotes.size === 0) {
    return currentCommunity
  }

  // Find maximum vote count
  let maxVotes = 0
  for (const votes of communityVotes.values()) {
    if (votes > maxVotes) {
      maxVotes = votes
    }
  }

  // Get all communities with max votes (ties)
  const candidates: number[] = []
  for (const [community, votes] of communityVotes.entries()) {
    if (votes === maxVotes) {
      candidates.push(community)
    }
  }

  // No ties - return the winner
  if (candidates.length === 1) {
    return candidates[0]!
  }

  // Tie-breaking: prefer larger communities
  const communitySizes = new Map<number, number>()
  for (const community of communityMap.values()) {
    communitySizes.set(community, (communitySizes.get(community) || 0) + 1)
  }

  let maxSize = 0
  const sizeWinners: number[] = []

  for (const candidate of candidates) {
    const size = communitySizes.get(candidate) || 0
    if (size > maxSize) {
      maxSize = size
      sizeWinners.length = 0
      sizeWinners.push(candidate)
    } else if (size === maxSize) {
      sizeWinners.push(candidate)
    }
  }

  // Still tied - pick randomly (deterministic with seed)
  if (sizeWinners.length > 1) {
    const randomIndex = Math.floor(random() * sizeWinners.length)
    return sizeWinners[randomIndex]!
  }

  return sizeWinners[0]!
}

/**
 * Collect nodes into clusters based on community assignments
 */
function collectClusters(
  communityMap: Map<string, number>,
  minClusterSize: number
): string[][] {
  // Group nodes by community
  const clusterMap = new Map<number, string[]>()

  for (const [nodeUuid, community] of communityMap.entries()) {
    const cluster = clusterMap.get(community) || []
    cluster.push(nodeUuid)
    clusterMap.set(community, cluster)
  }

  // Filter by minimum size and convert to array
  const clusters: string[][] = []

  for (const cluster of clusterMap.values()) {
    if (cluster.length >= minClusterSize) {
      // Sort for deterministic output
      clusters.push(cluster.sort())
    }
  }

  // Sort clusters by size (descending) for consistent ordering
  clusters.sort((a, b) => b.length - a.length)

  return clusters
}

/**
 * Create a seeded random number generator (Linear Congruential Generator)
 * Returns numbers in [0, 1)
 */
function createSeededRandom(seed: number): () => number {
  let state = seed

  return () => {
    // LCG parameters from Numerical Recipes
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296 // Normalize to [0, 1)
  }
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[], random: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[array[i], array[j]] = [array[j]!, array[i]!]
  }
  return array
}

// ============================================================================
// Graph Projection Builder
// ============================================================================

/**
 * Build projection map from FalkorDB query results
 *
 * @param edges - Array of edges from FalkorDB query
 * @returns Projection map for Label Propagation
 *
 * @example
 * ```typescript
 * // FalkorDB query result format
 * const edges = [
 *   { source: 'uuid-1', target: 'uuid-2', count: 2 },
 *   { source: 'uuid-1', target: 'uuid-3', count: 1 },
 * ]
 * const projection = buildProjectionFromEdges(edges)
 * ```
 */
export function buildProjectionFromEdges(
  edges: Array<{ source: string; target: string; count?: number }>
): LPProjectionMap {
  const projection: LPProjectionMap = {}

  for (const edge of edges) {
    const { source, target, count = 1 } = edge

    // Add source -> target
    if (!projection[source]) {
      projection[source] = []
    }
    addOrUpdateNeighbor(projection[source], target, count)

    // Add target -> source (undirected graph)
    if (!projection[target]) {
      projection[target] = []
    }
    addOrUpdateNeighbor(projection[target], source, count)
  }

  return projection
}

/**
 * Add or update neighbor in neighbors list
 */
function addOrUpdateNeighbor(
  neighbors: LPNeighbor[],
  nodeUuid: string,
  edgeCount: number
): void {
  const existing = neighbors.find((n) => n.nodeUuid === nodeUuid)
  if (existing) {
    existing.edgeCount += edgeCount
  } else {
    neighbors.push({ nodeUuid, edgeCount })
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get statistics about clusters
 */
export function getClusterStats(clusters: string[][]): {
  totalClusters: number
  totalNodes: number
  avgSize: number
  maxSize: number
  minSize: number
  sizeDistribution: Map<number, number>
} {
  if (clusters.length === 0) {
    return {
      totalClusters: 0,
      totalNodes: 0,
      avgSize: 0,
      maxSize: 0,
      minSize: 0,
      sizeDistribution: new Map(),
    }
  }

  const sizes = clusters.map((c) => c.length)
  const totalNodes = sizes.reduce((sum, s) => sum + s, 0)

  const sizeDistribution = new Map<number, number>()
  for (const size of sizes) {
    sizeDistribution.set(size, (sizeDistribution.get(size) || 0) + 1)
  }

  return {
    totalClusters: clusters.length,
    totalNodes,
    avgSize: totalNodes / clusters.length,
    maxSize: Math.max(...sizes),
    minSize: Math.min(...sizes),
    sizeDistribution,
  }
}

/**
 * Merge small clusters into nearest larger cluster
 * Useful post-processing step to reduce noise
 */
export function mergeSmallClusters(
  clusters: string[][],
  projection: LPProjectionMap,
  minSize: number
): string[][] {
  const result: string[][] = []
  const smallClusters: string[][] = []

  // Separate large and small clusters
  for (const cluster of clusters) {
    if (cluster.length >= minSize) {
      result.push([...cluster])
    } else {
      smallClusters.push(cluster)
    }
  }

  // If no large clusters, return original
  if (result.length === 0) {
    return clusters
  }

  // Merge small clusters into nearest large cluster
  for (const smallCluster of smallClusters) {
    const nearestClusterIndex = findNearestCluster(smallCluster, result, projection)
    if (nearestClusterIndex >= 0) {
      result[nearestClusterIndex]!.push(...smallCluster)
    }
    // If no connection found, the small cluster is discarded
  }

  // Re-sort each cluster and all clusters
  for (const cluster of result) {
    cluster.sort()
  }
  result.sort((a, b) => b.length - a.length)

  return result
}

/**
 * Find index of nearest cluster based on edge connections
 */
function findNearestCluster(
  smallCluster: string[],
  largeClusters: string[][],
  projection: LPProjectionMap
): number {
  let maxConnections = 0
  let nearestIndex = -1

  for (let i = 0; i < largeClusters.length; i++) {
    const largeCluster = largeClusters[i]
    const largeClusterSet = new Set(largeCluster)

    let connections = 0
    for (const nodeUuid of smallCluster) {
      const neighbors = projection[nodeUuid] || []
      for (const neighbor of neighbors) {
        if (largeClusterSet.has(neighbor.nodeUuid)) {
          connections += neighbor.edgeCount
        }
      }
    }

    if (connections > maxConnections) {
      maxConnections = connections
      nearestIndex = i
    }
  }

  return nearestIndex
}
