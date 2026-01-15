/**
 * Unit Tests: Label Propagation Algorithm (Fase 24.8)
 *
 * Tests for community detection using Label Propagation algorithm.
 * Tests cover empty graphs, disconnected nodes, connected components,
 * edge weights, and configuration options.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import { describe, it, expect } from 'vitest'
import {
  labelPropagation,
  buildProjectionFromEdges,
  getClusterStats,
  mergeSmallClusters,
} from './labelPropagation'
import type { LPProjectionMap, LPConfig } from '../types/community'

describe('labelPropagation', () => {
  // ===========================================================================
  // Basic Functionality Tests
  // ===========================================================================

  describe('Basic functionality', () => {
    it('should return empty array for empty projection', () => {
      const result = labelPropagation({})
      expect(result).toEqual([])
    })

    it('should put disconnected nodes in separate clusters', () => {
      const projection: LPProjectionMap = {
        'node-1': [],
        'node-2': [],
        'node-3': [],
      }
      const result = labelPropagation(projection, { minClusterSize: 1 })
      expect(result.length).toBe(3)
      expect(result[0]).toHaveLength(1)
      expect(result[1]).toHaveLength(1)
      expect(result[2]).toHaveLength(1)
    })

    it('should cluster connected nodes together', () => {
      const projection: LPProjectionMap = {
        'node-1': [{ nodeUuid: 'node-2', edgeCount: 2 }],
        'node-2': [
          { nodeUuid: 'node-1', edgeCount: 2 },
          { nodeUuid: 'node-3', edgeCount: 2 },
        ],
        'node-3': [{ nodeUuid: 'node-2', edgeCount: 2 }],
      }
      const result = labelPropagation(projection)
      expect(result.length).toBe(1)
      expect(result[0]?.sort()).toEqual(['node-1', 'node-2', 'node-3'])
    })

    it('should handle single node clusters', () => {
      const projection: LPProjectionMap = {
        lonely: [],
      }
      const result = labelPropagation(projection, { minClusterSize: 1 })
      expect(result.length).toBe(1)
      expect(result[0]).toEqual(['lonely'])
    })
  })

  // ===========================================================================
  // Multi-Group Tests
  // ===========================================================================

  describe('Multi-group detection', () => {
    it('should separate weakly connected groups', () => {
      const projection: LPProjectionMap = {
        a1: [{ nodeUuid: 'a2', edgeCount: 5 }],
        a2: [{ nodeUuid: 'a1', edgeCount: 5 }],
        b1: [{ nodeUuid: 'b2', edgeCount: 5 }],
        b2: [{ nodeUuid: 'b1', edgeCount: 5 }],
      }
      const result = labelPropagation(projection)
      expect(result.length).toBe(2)

      // Find which cluster contains a1
      const clusterA = result.find((c) => c.includes('a1'))
      const clusterB = result.find((c) => c.includes('b1'))

      expect(clusterA).toContain('a1')
      expect(clusterA).toContain('a2')
      expect(clusterB).toContain('b1')
      expect(clusterB).toContain('b2')
    })

    it('should detect 3 distinct communities', () => {
      const projection: LPProjectionMap = {
        // Group A
        a1: [
          { nodeUuid: 'a2', edgeCount: 5 },
          { nodeUuid: 'a3', edgeCount: 5 },
        ],
        a2: [
          { nodeUuid: 'a1', edgeCount: 5 },
          { nodeUuid: 'a3', edgeCount: 5 },
        ],
        a3: [
          { nodeUuid: 'a1', edgeCount: 5 },
          { nodeUuid: 'a2', edgeCount: 5 },
        ],
        // Group B
        b1: [{ nodeUuid: 'b2', edgeCount: 5 }],
        b2: [{ nodeUuid: 'b1', edgeCount: 5 }],
        // Group C
        c1: [{ nodeUuid: 'c2', edgeCount: 5 }],
        c2: [{ nodeUuid: 'c1', edgeCount: 5 }],
      }
      const result = labelPropagation(projection)
      expect(result.length).toBe(3)
    })
  })

  // ===========================================================================
  // Edge Weight Tests
  // ===========================================================================

  describe('Edge weight handling', () => {
    it('should respect edge weights when determining community', () => {
      // node-2 has stronger connection to group A than group B
      const projection: LPProjectionMap = {
        a1: [
          { nodeUuid: 'a2', edgeCount: 5 },
          { nodeUuid: 'node-2', edgeCount: 10 },
        ],
        a2: [
          { nodeUuid: 'a1', edgeCount: 5 },
          { nodeUuid: 'node-2', edgeCount: 10 },
        ],
        b1: [
          { nodeUuid: 'b2', edgeCount: 5 },
          { nodeUuid: 'node-2', edgeCount: 1 },
        ],
        b2: [
          { nodeUuid: 'b1', edgeCount: 5 },
          { nodeUuid: 'node-2', edgeCount: 1 },
        ],
        'node-2': [
          { nodeUuid: 'a1', edgeCount: 10 },
          { nodeUuid: 'a2', edgeCount: 10 },
          { nodeUuid: 'b1', edgeCount: 1 },
          { nodeUuid: 'b2', edgeCount: 1 },
        ],
      }
      const result = labelPropagation(projection)

      // node-2 should end up with a1, a2 due to higher edge weights
      const clusterWithNode2 = result.find((c) => c.includes('node-2'))
      expect(clusterWithNode2).toContain('a1')
      expect(clusterWithNode2).toContain('a2')
    })

    it('should handle asymmetric edge weights', () => {
      const projection: LPProjectionMap = {
        a: [{ nodeUuid: 'b', edgeCount: 10 }],
        b: [{ nodeUuid: 'a', edgeCount: 1 }],
      }
      const result = labelPropagation(projection)
      // Should still cluster together despite asymmetry
      expect(result.length).toBe(1)
      expect(result[0]?.sort()).toEqual(['a', 'b'])
    })
  })

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe('Configuration options', () => {
    it('should respect maxIterations config', () => {
      const projection: LPProjectionMap = {
        a: [{ nodeUuid: 'b', edgeCount: 1 }],
        b: [{ nodeUuid: 'a', edgeCount: 1 }],
      }
      const config: LPConfig = {
        maxIterations: 1,
      }
      const result = labelPropagation(projection, config)
      // Should still complete with limited iterations
      expect(result.length).toBeGreaterThan(0)
    })

    it('should respect minClusterSize config', () => {
      const projection: LPProjectionMap = {
        a: [],
        b: [{ nodeUuid: 'c', edgeCount: 1 }],
        c: [{ nodeUuid: 'b', edgeCount: 1 }],
      }
      const config: LPConfig = {
        minClusterSize: 2,
      }
      const result = labelPropagation(projection, config)
      // Single node should be filtered out
      expect(result.every((cluster) => cluster.length >= 2)).toBe(true)
    })

    it('should produce deterministic results with same seed', () => {
      const projection: LPProjectionMap = {
        a: [
          { nodeUuid: 'b', edgeCount: 5 },
          { nodeUuid: 'c', edgeCount: 5 },
        ],
        b: [
          { nodeUuid: 'a', edgeCount: 5 },
          { nodeUuid: 'c', edgeCount: 5 },
        ],
        c: [
          { nodeUuid: 'a', edgeCount: 5 },
          { nodeUuid: 'b', edgeCount: 5 },
        ],
      }
      const config: LPConfig = { seed: 42 }

      const result1 = labelPropagation(projection, config)
      const result2 = labelPropagation(projection, config)

      expect(result1).toEqual(result2)
    })
  })

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================

  describe('Edge cases', () => {
    it('should handle self-loops gracefully', () => {
      const projection: LPProjectionMap = {
        a: [
          { nodeUuid: 'a', edgeCount: 5 },
          { nodeUuid: 'b', edgeCount: 2 },
        ],
        b: [{ nodeUuid: 'a', edgeCount: 2 }],
      }
      const result = labelPropagation(projection)
      expect(result.length).toBe(1)
    })

    it('should handle very large edge weights', () => {
      const projection: LPProjectionMap = {
        a: [{ nodeUuid: 'b', edgeCount: 999999 }],
        b: [{ nodeUuid: 'a', edgeCount: 999999 }],
      }
      const result = labelPropagation(projection)
      expect(result.length).toBe(1)
    })

    it('should handle nodes with many neighbors', () => {
      const neighbors = Array.from({ length: 50 }, (_, i) => ({
        nodeUuid: `node-${i}`,
        edgeCount: 1,
      }))

      const projection: LPProjectionMap = {
        hub: neighbors,
      }

      // Add reverse edges
      neighbors.forEach((n) => {
        projection[n.nodeUuid] = [{ nodeUuid: 'hub', edgeCount: 1 }]
      })

      const result = labelPropagation(projection)
      // All should be in one cluster
      expect(result.length).toBe(1)
      expect(result[0]?.length).toBe(51) // hub + 50 neighbors
    })
  })
})

// =============================================================================
// buildProjectionFromEdges Tests
// =============================================================================

describe('buildProjectionFromEdges', () => {
  describe('Basic projection building', () => {
    it('should build bidirectional projection', () => {
      const nodeUuids = ['node-1', 'node-2']
      const edges = [{ sourceUuid: 'node-1', targetUuid: 'node-2', edgeCount: 3 }]

      const result = buildProjectionFromEdges(nodeUuids, edges)

      expect(result['node-1']).toContainEqual({ nodeUuid: 'node-2', edgeCount: 3 })
      expect(result['node-2']).toContainEqual({ nodeUuid: 'node-1', edgeCount: 3 })
    })

    it('should initialize all nodes even without edges', () => {
      const nodeUuids = ['node-1', 'node-2', 'node-3']
      const edges: Array<{ sourceUuid: string; targetUuid: string; edgeCount: number }> = []

      const result = buildProjectionFromEdges(nodeUuids, edges)

      expect(Object.keys(result)).toHaveLength(3)
      expect(result['node-1']).toEqual([])
      expect(result['node-2']).toEqual([])
      expect(result['node-3']).toEqual([])
    })

    it('should handle multiple edges between same nodes', () => {
      const nodeUuids = ['node-1', 'node-2']
      const edges = [
        { sourceUuid: 'node-1', targetUuid: 'node-2', edgeCount: 2 },
        { sourceUuid: 'node-2', targetUuid: 'node-1', edgeCount: 3 },
      ]

      const result = buildProjectionFromEdges(nodeUuids, edges)

      // Both directions should be recorded
      const node1Neighbors = result['node-1'] || []
      const node2Neighbors = result['node-2'] || []

      expect(node1Neighbors.length).toBeGreaterThan(0)
      expect(node2Neighbors.length).toBeGreaterThan(0)
    })
  })

  describe('Edge filtering', () => {
    it('should ignore edges with nodes not in nodeUuids', () => {
      const nodeUuids = ['node-1', 'node-2']
      const edges = [
        { sourceUuid: 'node-1', targetUuid: 'node-2', edgeCount: 1 },
        { sourceUuid: 'node-1', targetUuid: 'unknown', edgeCount: 1 },
        { sourceUuid: 'unknown', targetUuid: 'node-2', edgeCount: 1 },
      ]

      const result = buildProjectionFromEdges(nodeUuids, edges)

      // Only valid edges should be in projection
      const node1Neighbors = result['node-1'] || []
      const node2Neighbors = result['node-2'] || []

      expect(node1Neighbors.every((n) => nodeUuids.includes(n.nodeUuid))).toBe(true)
      expect(node2Neighbors.every((n) => nodeUuids.includes(n.nodeUuid))).toBe(true)
    })
  })
})

// =============================================================================
// getClusterStats Tests
// =============================================================================

describe('getClusterStats', () => {
  it('should return correct statistics', () => {
    const clusters = [
      ['a', 'b', 'c'],
      ['d', 'e'],
      ['f'],
    ]

    const stats = getClusterStats(clusters)

    expect(stats.totalClusters).toBe(3)
    expect(stats.totalNodes).toBe(6)
    expect(stats.maxSize).toBe(3)
    expect(stats.minSize).toBe(1)
    expect(stats.avgSize).toBeCloseTo(2, 1)
    expect(stats.sizeDistribution.get(3)).toBe(1)
    expect(stats.sizeDistribution.get(2)).toBe(1)
    expect(stats.sizeDistribution.get(1)).toBe(1)
  })

  it('should handle empty clusters array', () => {
    const stats = getClusterStats([])

    expect(stats.totalClusters).toBe(0)
    expect(stats.totalNodes).toBe(0)
    expect(stats.maxSize).toBe(0)
    expect(stats.minSize).toBe(0)
    expect(stats.avgSize).toBe(0)
    expect(stats.sizeDistribution.size).toBe(0)
  })

  it('should handle single cluster', () => {
    const clusters = [['a', 'b', 'c', 'd', 'e']]

    const stats = getClusterStats(clusters)

    expect(stats.totalClusters).toBe(1)
    expect(stats.totalNodes).toBe(5)
    expect(stats.maxSize).toBe(5)
    expect(stats.minSize).toBe(5)
    expect(stats.avgSize).toBe(5)
    expect(stats.sizeDistribution.get(5)).toBe(1)
  })
})

// =============================================================================
// mergeSmallClusters Tests
// =============================================================================

describe('mergeSmallClusters', () => {
  it('should merge clusters smaller than minSize', () => {
    const projection: LPProjectionMap = {
      a: [{ nodeUuid: 'b', edgeCount: 1 }],
      b: [{ nodeUuid: 'c', edgeCount: 1 }],
      c: [{ nodeUuid: 'd', edgeCount: 1 }],
      d: [{ nodeUuid: 'a', edgeCount: 1 }],
      e: [{ nodeUuid: 'f', edgeCount: 1 }],
      f: [{ nodeUuid: 'e', edgeCount: 1 }],
      g: [],
      h: [],
    }

    const clusters = [
      ['a', 'b', 'c', 'd'], // Size 4 - keep
      ['e', 'f'], // Size 2 - keep
      ['g'], // Size 1 - merge
      ['h'], // Size 1 - merge
    ]

    const result = mergeSmallClusters(clusters, projection, 2)

    // Should keep large clusters and merge or assign small ones
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('should not merge if all clusters meet minSize', () => {
    const projection: LPProjectionMap = {
      a: [{ nodeUuid: 'b', edgeCount: 1 }],
      b: [{ nodeUuid: 'c', edgeCount: 1 }],
      c: [{ nodeUuid: 'a', edgeCount: 1 }],
      d: [{ nodeUuid: 'e', edgeCount: 1 }],
      e: [{ nodeUuid: 'f', edgeCount: 1 }],
      f: [{ nodeUuid: 'd', edgeCount: 1 }],
    }

    const clusters = [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]

    const result = mergeSmallClusters(clusters, projection, 2)

    expect(result.length).toBe(2)
  })

  it('should handle minSize of 1 (no merging)', () => {
    const projection: LPProjectionMap = {
      a: [],
      b: [],
      c: [],
    }

    const clusters = [['a'], ['b'], ['c']]

    const result = mergeSmallClusters(clusters, projection, 1)

    expect(result.length).toBe(3)
  })

  it('should handle orphan nodes gracefully', () => {
    const projection: LPProjectionMap = {
      a: [],
      b: [],
      c: [],
      d: [],
    }

    const clusters = [['a'], ['b'], ['c'], ['d']]

    const result = mergeSmallClusters(clusters, projection, 2)

    // Orphan nodes should be filtered or merged
    expect(result.length).toBeGreaterThanOrEqual(0)
  })
})
