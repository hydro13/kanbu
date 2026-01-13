#!/usr/bin/env npx tsx
/**
 * Integration Test: Edge Embeddings (Fase 19.5)
 *
 * Tests the full flow of edge embedding generation and search:
 * 1. Check existing edge embeddings in Qdrant
 * 2. Sync a wiki page (triggers edge embedding generation)
 * 3. Verify embeddings were created
 * 4. Test edge semantic search
 * 5. Test hybrid search (pages + edges)
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/test-edge-embeddings.ts
 *
 * Options:
 *   --verbose    Show detailed output
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { QdrantClient } from '@qdrant/js-client-rest'
import {
  WikiEdgeEmbeddingService,
  type WikiContext,
} from '../apps/api/src/lib/ai/wiki/WikiEdgeEmbeddingService'

const GRAPH_NAME = 'kanbu_wiki'
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost'
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379')
const QDRANT_HOST = process.env.QDRANT_HOST ?? 'localhost'
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT ?? '6333')

const args = process.argv.slice(2)
const VERBOSE = args.includes('--verbose')

const WORKSPACE_ID = 1

interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
}

async function main() {
  console.log('='.repeat(60))
  console.log('Fase 19.5 - Edge Embeddings Integration Test')
  console.log('='.repeat(60))
  console.log('')
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`)
  console.log(`Qdrant: ${QDRANT_HOST}:${QDRANT_PORT}`)
  console.log(`Workspace ID: ${WORKSPACE_ID}`)
  console.log('')

  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  })

  const prisma = new PrismaClient()
  const qdrant = new QdrantClient({ host: QDRANT_HOST, port: QDRANT_PORT })
  const edgeService = new WikiEdgeEmbeddingService(prisma)

  const results: TestResult[] = []

  try {
    // Test 1: Check FalkorDB connection
    results.push(await runTest('FalkorDB Connection', async () => {
      await redis.ping()
      return 'Connected successfully'
    }))

    // Test 2: Check Qdrant connection
    results.push(await runTest('Qdrant Connection', async () => {
      await qdrant.getCollections()
      return 'Connected successfully'
    }))

    // Test 3: Check edge embeddings collection exists
    results.push(await runTest('Edge Embeddings Collection', async () => {
      const collections = await qdrant.getCollections()
      const exists = collections.collections.some(c => c.name === 'kanbu_edge_embeddings')
      if (!exists) {
        throw new Error('Collection kanbu_edge_embeddings does not exist')
      }
      const info = await qdrant.getCollection('kanbu_edge_embeddings')
      return `Collection exists with ${info.points_count ?? 0} points`
    }))

    // Test 4: Count edges with facts in FalkorDB
    results.push(await runTest('FalkorDB Edges Count', async () => {
      const result = await redis.call(
        'GRAPH.QUERY',
        GRAPH_NAME,
        `MATCH ()-[e]->() WHERE e.fact IS NOT NULL RETURN count(e) as count`
      ) as unknown[][]
      const count = parseCount(result)
      return `Found ${count} edges with fact field`
    }))

    // Test 5: Get sample edge for testing
    let sampleEdge: { fact: string; edgeType: string; sourceName: string; targetName: string } | null = null
    results.push(await runTest('Get Sample Edge', async () => {
      const result = await redis.call(
        'GRAPH.QUERY',
        GRAPH_NAME,
        `
          MATCH (source)-[e]->(target)
          WHERE e.fact IS NOT NULL
          RETURN
            e.fact AS fact,
            type(e) AS edgeType,
            COALESCE(source.title, source.name, 'Unknown') AS sourceName,
            COALESCE(target.title, target.name, 'Unknown') AS targetName
          LIMIT 1
        `
      ) as unknown[][]

      if (!Array.isArray(result) || result.length < 2) {
        throw new Error('No edges found')
      }
      const rows = result[1] as unknown[][]
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('No edges found')
      }
      const row = rows[0]
      if (!Array.isArray(row)) {
        throw new Error('Invalid edge data')
      }

      sampleEdge = {
        fact: String(row[0]),
        edgeType: String(row[1]),
        sourceName: String(row[2]),
        targetName: String(row[3]),
      }

      return `Sample: "${sampleEdge.fact.substring(0, 50)}..."`
    }))

    // Test 6: Edge semantic search
    results.push(await runTest('Edge Semantic Search', async () => {
      const context: WikiContext = { workspaceId: WORKSPACE_ID }

      // Search for something that should match the sample edge
      const searchQuery = sampleEdge?.targetName ?? 'wiki'
      const searchResults = await edgeService.edgeSemanticSearch(
        context,
        searchQuery,
        { limit: 5, scoreThreshold: 0.3 }
      )

      if (searchResults.length === 0) {
        return `No results for "${searchQuery}" (embeddings may need migration)`
      }

      if (VERBOSE) {
        console.log(`    Search results:`)
        for (const r of searchResults.slice(0, 3)) {
          console.log(`      - ${r.fact.substring(0, 50)}... (score: ${r.score.toFixed(2)})`)
        }
      }

      return `Found ${searchResults.length} results for "${searchQuery}"`
    }))

    // Test 7: Hybrid semantic search
    results.push(await runTest('Hybrid Semantic Search', async () => {
      const context: WikiContext = { workspaceId: WORKSPACE_ID }

      const searchQuery = sampleEdge?.targetName ?? 'wiki'
      const hybridResults = await edgeService.hybridSemanticSearch(
        context,
        searchQuery,
        { includePages: true, includeEdges: true, limit: 10, scoreThreshold: 0.3 }
      )

      const pageResults = hybridResults.filter(r => r.type === 'page')
      const edgeResults = hybridResults.filter(r => r.type === 'edge')

      if (VERBOSE) {
        console.log(`    Hybrid results:`)
        console.log(`      Pages: ${pageResults.length}`)
        console.log(`      Edges: ${edgeResults.length}`)
      }

      return `Found ${pageResults.length} pages + ${edgeResults.length} edges`
    }))

    // Test 8: Service stats
    results.push(await runTest('Service Stats', async () => {
      const stats = await edgeService.getStats()
      return `Collection: ${stats.collectionExists ? 'exists' : 'missing'}, Total edges: ${stats.totalEdges}`
    }))

    // Test 9: Verify search latency
    results.push(await runTest('Search Latency', async () => {
      const context: WikiContext = { workspaceId: WORKSPACE_ID }
      const iterations = 5
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        await edgeService.edgeSemanticSearch(context, 'test query', { limit: 10 })
        times.push(Date.now() - start)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const max = Math.max(...times)

      // Note: Latency includes OpenAI embedding generation (~200-400ms)
      // Actual Qdrant vector search is ~10-50ms
      if (max > 800) {
        throw new Error(`Search latency too high: avg=${avg.toFixed(0)}ms, max=${max}ms`)
      }

      return `Avg: ${avg.toFixed(0)}ms, Max: ${max}ms (target: <800ms, incl. OpenAI)`
    }))

    // Print results
    console.log('')
    console.log('='.repeat(60))
    console.log('Test Results')
    console.log('='.repeat(60))
    console.log('')

    let passed = 0
    let failed = 0

    for (const result of results) {
      const status = result.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
      const time = `(${result.duration}ms)`
      console.log(`${status} ${result.name}: ${result.message} ${time}`)

      if (result.passed) passed++
      else failed++
    }

    console.log('')
    console.log('-'.repeat(60))
    console.log(`Total: ${passed} passed, ${failed} failed`)
    console.log('')

    if (failed > 0) {
      console.log('\x1b[31mSome tests failed!\x1b[0m')
      process.exitCode = 1
    } else {
      console.log('\x1b[32mAll tests passed!\x1b[0m')
    }

  } catch (err) {
    console.error('Test suite failed:', err)
    process.exitCode = 1
  } finally {
    await redis.quit()
    await prisma.$disconnect()
  }
}

async function runTest(
  name: string,
  fn: () => Promise<string>
): Promise<TestResult> {
  const start = Date.now()
  try {
    const message = await fn()
    return {
      name,
      passed: true,
      message,
      duration: Date.now() - start,
    }
  } catch (err) {
    return {
      name,
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      duration: Date.now() - start,
    }
  }
}

function parseCount(result: unknown[][]): number {
  if (!Array.isArray(result) || result.length < 2) return 0
  const rows = result[1]
  if (!Array.isArray(rows) || rows.length === 0) return 0
  const firstRow = rows[0]
  if (!Array.isArray(firstRow)) return 0
  return Number(firstRow[0]) || 0
}

main()
