/**
 * WikiDeduplicationService
 *
 * Fase 22: Entity Deduplication & Graph Cleanup
 *
 * Detects and resolves duplicate entities using multiple strategies:
 * 1. Exact match - Normalized string matching (O(1) via Map)
 * 2. Fuzzy match - MinHash/LSH with Jaccard similarity
 * 3. Embedding match - Vector similarity via Qdrant
 * 4. LLM match - AI-powered resolution for complex cases
 *
 * Based on Python Graphiti: dedup_helpers.py, dedupe_nodes.py
 */

import type { WikiContext } from './WikiAiService'
import type { WikiNodeEmbeddingService } from './WikiNodeEmbeddingService'
import type {
  EntityNodeInfo,
  DuplicateCandidate,
  DedupCandidateIndexes,
  DedupResolutionState,
  DeduplicationOptions,
  DeduplicationResult,
  DuplicateMatchType,
} from './types'
import { DEDUP_CONSTANTS } from './types'

// ===========================================================================
// Constants (from Python Graphiti)
// ===========================================================================

const {
  NAME_ENTROPY_THRESHOLD,
  MIN_NAME_LENGTH,
  MIN_TOKEN_COUNT,
  FUZZY_JACCARD_THRESHOLD,
  MINHASH_PERMUTATIONS,
  MINHASH_BAND_SIZE,
  EMBEDDING_THRESHOLD,
} = DEDUP_CONSTANTS

// ===========================================================================
// Service Class
// ===========================================================================

export class WikiDeduplicationService {
  private nodeEmbeddingService: WikiNodeEmbeddingService | null = null

  constructor(nodeEmbeddingService?: WikiNodeEmbeddingService) {
    if (nodeEmbeddingService) {
      this.nodeEmbeddingService = nodeEmbeddingService
    }
  }

  /**
   * Set the node embedding service (for lazy initialization)
   */
  setNodeEmbeddingService(service: WikiNodeEmbeddingService): void {
    this.nodeEmbeddingService = service
  }

  // ===========================================================================
  // STRING NORMALIZATION
  // ===========================================================================

  /**
   * Normalize string for exact matching
   * Lowercase and collapse whitespace
   */
  normalizeStringExact(name: string): string {
    return name.toLowerCase().replace(/\s+/g, ' ').trim()
  }

  /**
   * Normalize string for fuzzy matching
   * Keep alphanumerics and apostrophes only
   */
  normalizeNameForFuzzy(name: string): string {
    const exact = this.normalizeStringExact(name)
    return exact
      .replace(/[^a-z0-9' ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // ===========================================================================
  // ENTROPY CALCULATION
  // ===========================================================================

  /**
   * Calculate Shannon entropy of a string
   * Higher entropy = more "information" = more reliable for matching
   */
  calculateNameEntropy(normalizedName: string): number {
    if (!normalizedName) return 0

    const chars = normalizedName.replace(/\s/g, '')
    if (chars.length === 0) return 0

    const counts = new Map<string, number>()
    for (const char of chars) {
      counts.set(char, (counts.get(char) || 0) + 1)
    }

    const total = chars.length
    let entropy = 0

    const countValues = Array.from(counts.values())
    for (const count of countValues) {
      const probability = count / total
      entropy -= probability * Math.log2(probability)
    }

    return entropy
  }

  /**
   * Check if name has enough entropy for reliable fuzzy matching
   * Short or repetitive names are unreliable
   */
  hasHighEntropy(normalizedName: string): boolean {
    const tokenCount = normalizedName.split(' ').filter(t => t.length > 0).length
    if (normalizedName.length < MIN_NAME_LENGTH && tokenCount < MIN_TOKEN_COUNT) {
      return false
    }
    return this.calculateNameEntropy(normalizedName) >= NAME_ENTROPY_THRESHOLD
  }

  // ===========================================================================
  // SHINGLING & MINHASH
  // ===========================================================================

  /**
   * Create 3-gram shingles from normalized name
   */
  createShingles(normalizedName: string): Set<string> {
    const cleaned = normalizedName.replace(/\s/g, '')
    if (cleaned.length < 3) {
      return cleaned ? new Set([cleaned]) : new Set()
    }

    const shingles = new Set<string>()
    for (let i = 0; i <= cleaned.length - 3; i++) {
      shingles.add(cleaned.slice(i, i + 3))
    }
    return shingles
  }

  /**
   * Simple hash function for shingles (FNV-1a-like)
   */
  private hashShingle(shingle: string, seed: number): number {
    const str = `${seed}:${shingle}`
    let hash = 2166136261
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash = (hash * 16777619) >>> 0 // Keep as 32-bit unsigned
    }
    return hash
  }

  /**
   * Compute MinHash signature for shingle set
   */
  computeMinHashSignature(shingles: Set<string>): number[] {
    if (shingles.size === 0) return []

    const signature: number[] = []
    const shingleArray = Array.from(shingles)

    for (let seed = 0; seed < MINHASH_PERMUTATIONS; seed++) {
      let minHash = Infinity
      for (const shingle of shingleArray) {
        const hash = this.hashShingle(shingle, seed)
        if (hash < minHash) minHash = hash
      }
      signature.push(minHash)
    }

    return signature
  }

  /**
   * Split MinHash signature into LSH bands
   */
  getLshBands(signature: number[]): number[][] {
    const bands: number[][] = []
    for (let start = 0; start < signature.length; start += MINHASH_BAND_SIZE) {
      const band = signature.slice(start, start + MINHASH_BAND_SIZE)
      if (band.length === MINHASH_BAND_SIZE) {
        bands.push(band)
      }
    }
    return bands
  }

  /**
   * Calculate Jaccard similarity between two shingle sets
   */
  jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1
    if (a.size === 0 || b.size === 0) return 0

    let intersection = 0
    const aItems = Array.from(a)
    for (const item of aItems) {
      if (b.has(item)) intersection++
    }

    const union = a.size + b.size - intersection
    return union > 0 ? intersection / union : 0
  }

  // ===========================================================================
  // CANDIDATE INDEX BUILDING
  // ===========================================================================

  /**
   * Build precomputed lookup structures for deduplication
   * Equivalent to Python's _build_candidate_indexes()
   */
  buildCandidateIndexes(existingNodes: EntityNodeInfo[]): DedupCandidateIndexes {
    const normalizedExisting = new Map<string, EntityNodeInfo[]>()
    const nodesByUuid = new Map<string, EntityNodeInfo>()
    const shinglesByNode = new Map<string, Set<string>>()
    const lshBuckets = new Map<string, string[]>()

    for (const node of existingNodes) {
      // Exact match index
      const normalized = this.normalizeStringExact(node.name)
      const existing = normalizedExisting.get(normalized) || []
      existing.push(node)
      normalizedExisting.set(normalized, existing)

      // UUID lookup
      nodesByUuid.set(node.uuid, node)

      // Shingles for fuzzy matching
      const shingles = this.createShingles(this.normalizeNameForFuzzy(node.name))
      shinglesByNode.set(node.uuid, shingles)

      // LSH bands for fast candidate retrieval
      const signature = this.computeMinHashSignature(shingles)
      const bands = this.getLshBands(signature)
      for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
        const band = bands[bandIndex]
        if (!band) continue
        const bandKey = `${bandIndex}:${band.join(',')}`
        const bucket = lshBuckets.get(bandKey) || []
        bucket.push(node.uuid)
        lshBuckets.set(bandKey, bucket)
      }
    }

    return {
      existingNodes,
      nodesByUuid,
      normalizedExisting,
      shinglesByNode,
      lshBuckets,
    }
  }

  // ===========================================================================
  // DETERMINISTIC RESOLUTION
  // ===========================================================================

  /**
   * Attempt deterministic resolution using exact name hits and fuzzy matching
   * Equivalent to Python's _resolve_with_similarity()
   */
  resolveWithSimilarity(
    extractedNodes: EntityNodeInfo[],
    indexes: DedupCandidateIndexes,
    state: DedupResolutionState
  ): void {
    for (let idx = 0; idx < extractedNodes.length; idx++) {
      const node = extractedNodes[idx]
      if (!node) continue
      const normalizedExact = this.normalizeStringExact(node.name)
      const normalizedFuzzy = this.normalizeNameForFuzzy(node.name)

      // Skip low-entropy names - defer to LLM or embedding
      if (!this.hasHighEntropy(normalizedFuzzy)) {
        state.unresolvedIndices.push(idx)
        continue
      }

      // Try exact match first
      const exactMatches = indexes.normalizedExisting.get(normalizedExact) || []
      if (exactMatches.length === 1) {
        const match = exactMatches[0]
        if (match) {
          state.resolvedNodes[idx] = match
          state.uuidMap.set(node.uuid, match.uuid)
          if (match.uuid !== node.uuid) {
            state.duplicatePairs.push({
              sourceNode: {
                uuid: node.uuid,
                name: node.name,
                type: node.type,
                groupId: node.groupId,
              },
              targetNode: {
                uuid: match.uuid,
                name: match.name,
                type: match.type,
                groupId: match.groupId,
              },
              matchType: 'exact',
              confidence: 1.0,
              metrics: { normalizedEditDistance: 0 },
            })
          }
          continue
        }
      }

      // Multiple exact matches - defer to embedding/LLM
      if (exactMatches.length > 1) {
        state.unresolvedIndices.push(idx)
        continue
      }

      // Try fuzzy match via LSH
      const shingles = this.createShingles(normalizedFuzzy)
      const signature = this.computeMinHashSignature(shingles)
      const bands = this.getLshBands(signature)

      const candidateIds = new Set<string>()
      for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
        const band = bands[bandIndex]
        if (!band) continue
        const bandKey = `${bandIndex}:${band.join(',')}`
        const bucket = indexes.lshBuckets.get(bandKey) || []
        for (const uuid of bucket) {
          candidateIds.add(uuid)
        }
      }

      // Find best fuzzy match
      let bestCandidate: EntityNodeInfo | null = null
      let bestScore = 0

      const candidateIdArray = Array.from(candidateIds)
      for (const candidateId of candidateIdArray) {
        const candidateShingles = indexes.shinglesByNode.get(candidateId)
        if (!candidateShingles) continue

        const score = this.jaccardSimilarity(shingles, candidateShingles)
        if (score > bestScore) {
          bestScore = score
          bestCandidate = indexes.nodesByUuid.get(candidateId) || null
        }
      }

      if (bestCandidate && bestScore >= FUZZY_JACCARD_THRESHOLD) {
        state.resolvedNodes[idx] = bestCandidate
        state.uuidMap.set(node.uuid, bestCandidate.uuid)
        if (bestCandidate.uuid !== node.uuid) {
          state.duplicatePairs.push({
            sourceNode: {
              uuid: node.uuid,
              name: node.name,
              type: node.type,
              groupId: node.groupId,
            },
            targetNode: {
              uuid: bestCandidate.uuid,
              name: bestCandidate.name,
              type: bestCandidate.type,
              groupId: bestCandidate.groupId,
            },
            matchType: 'fuzzy',
            confidence: bestScore,
            metrics: { jaccardSimilarity: bestScore },
          })
        }
        continue
      }

      // No match found - defer to embedding/LLM
      state.unresolvedIndices.push(idx)
    }
  }

  // ===========================================================================
  // EMBEDDING-BASED RESOLUTION
  // ===========================================================================

  /**
   * Use node embeddings for additional similarity matching
   * Leverages WikiNodeEmbeddingService from Fase 21
   */
  async resolveWithEmbeddings(
    extractedNodes: EntityNodeInfo[],
    state: DedupResolutionState,
    context: WikiContext,
    threshold: number = EMBEDDING_THRESHOLD
  ): Promise<void> {
    if (!this.nodeEmbeddingService) {
      console.warn('[WikiDeduplicationService] No embedding service, skipping embedding resolution')
      return
    }

    // Process only unresolved nodes
    const stillUnresolved: number[] = []

    for (const idx of state.unresolvedIndices) {
      if (state.resolvedNodes[idx] !== null) continue

      const node = extractedNodes[idx]
      if (!node) {
        stillUnresolved.push(idx)
        continue
      }

      try {
        // Search for similar entities using embeddings
        const similar = await this.nodeEmbeddingService.findSimilarEntities(context, node.name, {
          nodeType: node.type as 'Concept' | 'Person' | 'Task' | 'Project',
          limit: 5,
          threshold,
        })

        const bestMatch = similar[0]
        if (bestMatch && bestMatch.score >= threshold) {
          const matchNode: EntityNodeInfo = {
            uuid: bestMatch.nodeId,
            name: bestMatch.name,
            type: bestMatch.nodeType,
            groupId: bestMatch.groupId,
          }

          state.resolvedNodes[idx] = matchNode
          state.uuidMap.set(node.uuid, bestMatch.nodeId)
          state.duplicatePairs.push({
            sourceNode: {
              uuid: node.uuid,
              name: node.name,
              type: node.type,
              groupId: node.groupId,
            },
            targetNode: {
              uuid: matchNode.uuid,
              name: matchNode.name,
              type: matchNode.type,
              groupId: matchNode.groupId,
            },
            matchType: 'embedding',
            confidence: bestMatch.score,
            metrics: { cosineSimilarity: bestMatch.score },
          })
        } else {
          stillUnresolved.push(idx)
        }
      } catch (error) {
        console.error(
          '[WikiDeduplicationService] Embedding search failed for node:',
          node.name,
          error
        )
        stillUnresolved.push(idx)
      }
    }

    // Update unresolved indices
    state.unresolvedIndices = stillUnresolved
  }

  // ===========================================================================
  // MAIN RESOLUTION FLOW
  // ===========================================================================

  /**
   * Main entry point for node deduplication
   * Combines exact, fuzzy, and embedding matching
   *
   * Note: LLM resolution is not included in this version to keep costs down.
   * Add LLM resolution in a future phase if needed.
   */
  async resolveExtractedNodes(
    extractedNodes: EntityNodeInfo[],
    existingNodes: EntityNodeInfo[],
    options: DeduplicationOptions
  ): Promise<DeduplicationResult> {
    const {
      workspaceId,
      projectId,
      useEmbeddings = true,
      embeddingThreshold = EMBEDDING_THRESHOLD,
    } = options

    // Build context for embedding service
    const context: WikiContext = {
      workspaceId,
      projectId,
    }

    // Build indexes
    const indexes = this.buildCandidateIndexes(existingNodes)

    // Initialize state
    const state: DedupResolutionState = {
      resolvedNodes: new Array(extractedNodes.length).fill(null),
      uuidMap: new Map(),
      unresolvedIndices: [],
      duplicatePairs: [],
    }

    // Track stats
    const stats = {
      totalExtracted: extractedNodes.length,
      exactMatches: 0,
      fuzzyMatches: 0,
      embeddingMatches: 0,
      llmMatches: 0,
      newNodes: 0,
    }

    // Step 1: Deterministic resolution (exact + fuzzy)
    console.log(
      `[WikiDeduplicationService] Starting dedup for ${extractedNodes.length} nodes against ${existingNodes.length} existing`
    )
    this.resolveWithSimilarity(extractedNodes, indexes, state)

    // Count exact and fuzzy matches
    for (const pair of state.duplicatePairs) {
      if (pair.matchType === 'exact') stats.exactMatches++
      if (pair.matchType === 'fuzzy') stats.fuzzyMatches++
    }

    console.log(
      `[WikiDeduplicationService] After deterministic: ${state.unresolvedIndices.length} unresolved`
    )

    // Step 2: Embedding-based resolution
    if (useEmbeddings && state.unresolvedIndices.length > 0 && this.nodeEmbeddingService) {
      const beforeEmbedding = state.duplicatePairs.length
      await this.resolveWithEmbeddings(extractedNodes, state, context, embeddingThreshold)
      stats.embeddingMatches = state.duplicatePairs.length - beforeEmbedding
      console.log(
        `[WikiDeduplicationService] After embeddings: ${state.unresolvedIndices.length} unresolved`
      )
    }

    // Step 3: Fill in any remaining unresolved nodes as "new"
    for (let idx = 0; idx < extractedNodes.length; idx++) {
      if (state.resolvedNodes[idx] === null) {
        const node = extractedNodes[idx]
        if (node) {
          state.resolvedNodes[idx] = node
          state.uuidMap.set(node.uuid, node.uuid)
          stats.newNodes++
        }
      }
    }

    return {
      resolvedNodes: state.resolvedNodes.filter((n): n is EntityNodeInfo => n !== null),
      uuidMap: state.uuidMap,
      duplicatePairs: state.duplicatePairs,
      stats,
    }
  }

  // ===========================================================================
  // BATCH SCANNING
  // ===========================================================================

  /**
   * Scan all nodes in a workspace for potential duplicates
   * Returns pairs without modifying the graph
   */
  async findDuplicatesInWorkspace(
    nodes: EntityNodeInfo[],
    options: {
      threshold?: number
      limit?: number
    } = {}
  ): Promise<DuplicateCandidate[]> {
    const { threshold = FUZZY_JACCARD_THRESHOLD, limit = 100 } = options
    const duplicates: DuplicateCandidate[] = []

    // Build indexes
    const indexes = this.buildCandidateIndexes(nodes)

    // Compare each node against all others
    for (let i = 0; i < nodes.length && duplicates.length < limit; i++) {
      const node = nodes[i]
      if (!node) continue

      const normalizedFuzzy = this.normalizeNameForFuzzy(node.name)

      // Skip low-entropy names
      if (!this.hasHighEntropy(normalizedFuzzy)) continue

      const shingles = this.createShingles(normalizedFuzzy)

      // Check against all subsequent nodes to avoid duplicates
      for (let j = i + 1; j < nodes.length && duplicates.length < limit; j++) {
        const other = nodes[j]
        if (!other) continue

        const otherShingles = indexes.shinglesByNode.get(other.uuid)
        if (!otherShingles) continue

        const score = this.jaccardSimilarity(shingles, otherShingles)
        if (score >= threshold) {
          duplicates.push({
            sourceNode: {
              uuid: node.uuid,
              name: node.name,
              type: node.type,
              groupId: node.groupId,
            },
            targetNode: {
              uuid: other.uuid,
              name: other.name,
              type: other.type,
              groupId: other.groupId,
            },
            matchType: 'fuzzy' as DuplicateMatchType,
            confidence: score,
            metrics: { jaccardSimilarity: score },
          })
        }
      }
    }

    return duplicates
  }
}

// ===========================================================================
// Singleton Instance
// ===========================================================================

let serviceInstance: WikiDeduplicationService | null = null

export function getWikiDeduplicationService(
  nodeEmbeddingService?: WikiNodeEmbeddingService
): WikiDeduplicationService {
  if (!serviceInstance) {
    serviceInstance = new WikiDeduplicationService(nodeEmbeddingService)
  } else if (nodeEmbeddingService && !serviceInstance['nodeEmbeddingService']) {
    serviceInstance.setNodeEmbeddingService(nodeEmbeddingService)
  }
  return serviceInstance
}

export function resetWikiDeduplicationService(): void {
  serviceInstance = null
}
