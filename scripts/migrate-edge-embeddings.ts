#!/usr/bin/env npx tsx
/**
 * Migration Script: Generate Edge Embeddings for Existing Edges
 *
 * Fase 19.5 - Testing & Migration
 *
 * This script generates vector embeddings for all existing edge facts
 * and stores them in Qdrant for semantic search.
 *
 * What it does:
 * 1. Reads all edges with fact field from FalkorDB
 * 2. Groups edges by page for proper context
 * 3. Generates embeddings via WikiEdgeEmbeddingService
 * 4. Stores embeddings in Qdrant collection 'kanbu_edge_embeddings'
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/migrate-edge-embeddings.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --verbose    Show detailed progress
 *   --workspace  Workspace ID to use (default: 1)
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { QdrantClient } from '@qdrant/js-client-rest'
import {
  WikiEdgeEmbeddingService,
  type EdgeForEmbedding,
  type WikiContext,
} from '../apps/api/src/lib/ai/wiki/WikiEdgeEmbeddingService'

const GRAPH_NAME = 'kanbu_wiki'
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost'
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379')
const QDRANT_HOST = process.env.QDRANT_HOST ?? 'localhost'
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT ?? '6333')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')

// Parse workspace ID from args
const workspaceArg = args.find(a => a.startsWith('--workspace='))
const WORKSPACE_ID = workspaceArg ? parseInt(workspaceArg.split('=')[1]) : 1

interface EdgeData {
  pageId: number
  pageTitle: string
  sourceId: string
  sourceName: string
  targetId: string
  targetName: string
  edgeType: string
  fact: string
  validAt: string | null
  invalidAt: string | null
  createdAt: string | null
}

async function main() {
  console.log('='.repeat(60))
  console.log('Fase 19.5 - Edge Embeddings Migration')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Workspace ID: ${WORKSPACE_ID}`)
  console.log(`Graph: ${GRAPH_NAME}`)
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`)
  console.log(`Qdrant: ${QDRANT_HOST}:${QDRANT_PORT}`)
  console.log('')

  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  })

  const prisma = new PrismaClient()
  const qdrant = new QdrantClient({ host: QDRANT_HOST, port: QDRANT_PORT })

  try {
    // Test connections
    await redis.ping()
    console.log('Connected to FalkorDB')

    await qdrant.getCollections()
    console.log('Connected to Qdrant')
    console.log('')

    // Step 1: Check current state
    console.log('Step 1: Analyzing current state...')

    // Count edges with fact
    const countResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `MATCH ()-[e]->() WHERE e.fact IS NOT NULL RETURN count(e) AS total`
    ) as unknown[][]
    const totalEdges = parseCount(countResult)
    console.log(`  Edges with fact field: ${totalEdges}`)

    // Check Qdrant collection
    const collections = await qdrant.getCollections()
    const collectionExists = collections.collections.some(
      c => c.name === 'kanbu_edge_embeddings'
    )
    console.log(`  Qdrant collection exists: ${collectionExists}`)

    let existingEmbeddings = 0
    if (collectionExists) {
      const info = await qdrant.getCollection('kanbu_edge_embeddings')
      existingEmbeddings = info.points_count ?? 0
      console.log(`  Existing embeddings: ${existingEmbeddings}`)
    }

    console.log(`  To migrate: ${totalEdges - existingEmbeddings}`)
    console.log('')

    if (totalEdges === 0) {
      console.log('No edges with fact field found. Nothing to do.')
      await cleanup(redis, prisma)
      return
    }

    // Step 2: Fetch all edges
    console.log('Step 2: Fetching edges from FalkorDB...')
    const edgesResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `
        MATCH (page:WikiPage)-[e]->(target)
        WHERE e.fact IS NOT NULL
        RETURN
          page.pageId AS pageId,
          COALESCE(page.title, 'Unknown') AS pageTitle,
          id(page) AS sourceId,
          COALESCE(page.title, page.name, 'Unknown') AS sourceName,
          id(target) AS targetId,
          COALESCE(target.title, target.name, 'Unknown') AS targetName,
          type(e) AS edgeType,
          e.fact AS fact,
          e.valid_at AS validAt,
          e.invalid_at AS invalidAt,
          e.created_at AS createdAt
        ORDER BY page.pageId
        LIMIT 1000
      `
    ) as unknown[][]

    const edges = parseEdges(edgesResult)
    console.log(`  Found ${edges.length} edges to process`)
    console.log('')

    if (edges.length === 0) {
      console.log('No edges to migrate.')
      await cleanup(redis, prisma)
      return
    }

    // Step 3: Group by page
    console.log('Step 3: Grouping edges by page...')
    const pageGroups = new Map<number, EdgeData[]>()
    for (const edge of edges) {
      if (!pageGroups.has(edge.pageId)) {
        pageGroups.set(edge.pageId, [])
      }
      pageGroups.get(edge.pageId)!.push(edge)
    }
    console.log(`  Found ${pageGroups.size} unique pages`)
    for (const [pageId, pageEdges] of pageGroups) {
      const pageTitle = pageEdges[0]?.pageTitle ?? 'Unknown'
      console.log(`    Page ${pageId} (${pageTitle}): ${pageEdges.length} edges`)
    }
    console.log('')

    // Step 4: Generate embeddings
    console.log('Step 4: Generating embeddings...')

    const context: WikiContext = {
      workspaceId: WORKSPACE_ID,
      projectId: undefined, // Workspace wiki
    }

    let totalStored = 0
    let totalSkipped = 0
    let totalErrors = 0

    if (!DRY_RUN) {
      const service = new WikiEdgeEmbeddingService(prisma)

      for (const [pageId, pageEdges] of pageGroups) {
        const pageTitle = pageEdges[0]?.pageTitle ?? 'Unknown'

        if (VERBOSE) {
          console.log(`  Processing page ${pageId} (${pageTitle})...`)
        }

        // Convert to EdgeForEmbedding format
        const edgesForEmbedding: EdgeForEmbedding[] = pageEdges.map(edge => ({
          id: `edge-${edge.pageId}-${edge.targetName.replace(/[^a-zA-Z0-9]/g, '-')}`,
          fact: edge.fact,
          edgeType: edge.edgeType,
          sourceNode: edge.sourceName,
          targetNode: edge.targetName,
          validAt: edge.validAt ?? undefined,
          invalidAt: edge.invalidAt ?? undefined,
          createdAt: edge.createdAt ?? undefined,
        }))

        try {
          const result = await service.generateAndStoreEdgeEmbeddings(
            context,
            pageId,
            edgesForEmbedding
          )

          totalStored += result.stored
          totalSkipped += result.skipped
          totalErrors += result.errors

          if (VERBOSE) {
            console.log(
              `    Result: ${result.stored} stored, ${result.skipped} skipped, ${result.errors} errors`
            )
          }
        } catch (err) {
          console.error(`    Error processing page ${pageId}: ${err}`)
          totalErrors += pageEdges.length
        }
      }
    } else {
      // Dry run - just count what would be done
      for (const [, pageEdges] of pageGroups) {
        for (const edge of pageEdges) {
          if (VERBOSE) {
            console.log(`  Would embed: "${edge.fact.substring(0, 60)}..."`)
          }
          totalStored++
        }
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Complete')
    console.log('='.repeat(60))
    console.log(`  Mode:           ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
    console.log(`  Total edges:    ${edges.length}`)
    console.log(`  Stored:         ${totalStored}`)
    console.log(`  Skipped:        ${totalSkipped}`)
    console.log(`  Errors:         ${totalErrors}`)
    console.log('')

    // Step 5: Verify
    if (!DRY_RUN) {
      console.log('Step 5: Verifying migration...')
      const info = await qdrant.getCollection('kanbu_edge_embeddings')
      console.log(`  Edge embeddings in Qdrant: ${info.points_count ?? 0}`)
    }

    await cleanup(redis, prisma)
    console.log('')
    console.log('Done!')

  } catch (err) {
    console.error('Migration failed:', err)
    await cleanup(redis, prisma)
    process.exit(1)
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

function parseEdges(result: unknown[][]): EdgeData[] {
  if (!Array.isArray(result) || result.length < 2) return []
  const rows = result[1]
  if (!Array.isArray(rows)) return []

  return rows.map(row => {
    if (!Array.isArray(row)) return null
    return {
      pageId: Number(row[0]),
      pageTitle: String(row[1]),
      sourceId: String(row[2]),
      sourceName: String(row[3]),
      targetId: String(row[4]),
      targetName: String(row[5]),
      edgeType: String(row[6]),
      fact: String(row[7]),
      validAt: row[8] as string | null,
      invalidAt: row[9] as string | null,
      createdAt: row[10] as string | null,
    }
  }).filter((e): e is EdgeData => e !== null && e.fact.length > 0)
}

async function cleanup(redis: Redis, prisma: PrismaClient) {
  await redis.quit()
  await prisma.$disconnect()
}

main()
