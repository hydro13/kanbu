#!/usr/bin/env npx tsx
/**
 * Migration Script: Add Bi-Temporal Fields to FalkorDB Edges
 *
 * Fase 16.1 - Schema Extension
 *
 * This script adds the following fields to all existing edges:
 * - created_at: Set to updatedAt value (first creation time estimate)
 * - valid_at: Set to updatedAt value (when fact became true)
 * - fact: Generated description based on edge type and connected nodes
 *
 * Fields NOT set (null by default):
 * - expired_at: Edge not expired
 * - invalid_at: Fact still valid
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/migrate-temporal-edges.ts
 *
 * Options:
 *   --dry-run  Show what would be done without making changes
 *   --verbose  Show detailed progress
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import Redis from 'ioredis'

const GRAPH_NAME = 'kanbu_wiki'
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost'
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')

interface EdgeInfo {
  sourceId: string
  sourceName: string
  sourceType: string
  targetId: string
  targetName: string
  targetType: string
  edgeType: string
  updatedAt: string | null
  hasTemporalFields: boolean
}

async function main() {
  console.log('='.repeat(60))
  console.log('Fase 16.1 - Bi-Temporal Edge Migration')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Graph: ${GRAPH_NAME}`)
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`)
  console.log('')

  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  })

  try {
    // Test connection
    await redis.ping()
    console.log('Connected to FalkorDB')
    console.log('')

    // Step 1: Count edges and check current state
    console.log('Step 1: Analyzing current edge state...')
    const countResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `MATCH ()-[e]->() RETURN count(e) AS total`
    ) as unknown[][]

    const totalEdges = parseCount(countResult)
    console.log(`  Total edges: ${totalEdges}`)

    // Check how many already have temporal fields
    const temporalCountResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `MATCH ()-[e]->() WHERE e.created_at IS NOT NULL RETURN count(e) AS total`
    ) as unknown[][]

    const alreadyMigrated = parseCount(temporalCountResult)
    console.log(`  Already migrated: ${alreadyMigrated}`)
    console.log(`  To migrate: ${totalEdges - alreadyMigrated}`)
    console.log('')

    if (totalEdges === alreadyMigrated) {
      console.log('All edges already have temporal fields. Nothing to do.')
      await redis.quit()
      return
    }

    // Step 2: Get all edges that need migration
    console.log('Step 2: Fetching edges to migrate...')
    const edgesResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `
        MATCH (source)-[e]->(target)
        WHERE e.created_at IS NULL
        RETURN
          id(source) AS sourceId,
          COALESCE(source.title, source.name, 'Unknown') AS sourceName,
          labels(source)[0] AS sourceType,
          id(target) AS targetId,
          COALESCE(target.title, target.name, 'Unknown') AS targetName,
          labels(target)[0] AS targetType,
          type(e) AS edgeType,
          e.updatedAt AS updatedAt
        LIMIT 1000
      `
    ) as unknown[][]

    const edges = parseEdges(edgesResult)
    console.log(`  Found ${edges.length} edges to migrate`)
    console.log('')

    if (edges.length === 0) {
      console.log('No edges need migration.')
      await redis.quit()
      return
    }

    // Step 3: Migrate edges
    console.log('Step 3: Migrating edges...')
    let migrated = 0
    let errors = 0

    for (const edge of edges) {
      const fact = generateFact(edge)
      const timestamp = edge.updatedAt || new Date().toISOString()

      if (VERBOSE) {
        console.log(`  Migrating: ${edge.edgeType} from ${edge.sourceName} to ${edge.targetName}`)
        console.log(`    Fact: ${fact}`)
        console.log(`    Timestamp: ${timestamp}`)
      }

      if (!DRY_RUN) {
        try {
          // FalkorDB doesn't support parameters in the same way, so we need to build the query
          const escapedFact = escapeString(fact)
          await redis.call(
            'GRAPH.QUERY',
            GRAPH_NAME,
            `
              MATCH (source)-[e:${edge.edgeType}]->(target)
              WHERE id(source) = ${edge.sourceId} AND id(target) = ${edge.targetId}
              SET e.created_at = '${timestamp}',
                  e.valid_at = '${timestamp}',
                  e.fact = '${escapedFact}'
            `
          )
          migrated++
        } catch (err) {
          errors++
          console.error(`  Error migrating edge: ${err}`)
        }
      } else {
        migrated++
      }

      // Progress indicator
      if (migrated % 100 === 0) {
        console.log(`  Progress: ${migrated}/${edges.length} edges`)
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('Migration Complete')
    console.log('='.repeat(60))
    console.log(`  Total edges:    ${totalEdges}`)
    console.log(`  Migrated:       ${migrated}`)
    console.log(`  Errors:         ${errors}`)
    console.log(`  Mode:           ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
    console.log('')

    // Step 4: Verify migration
    if (!DRY_RUN) {
      console.log('Step 4: Verifying migration...')
      const verifyResult = await redis.call(
        'GRAPH.QUERY',
        GRAPH_NAME,
        `MATCH ()-[e]->() WHERE e.created_at IS NOT NULL RETURN count(e) AS total`
      ) as unknown[][]

      const afterMigration = parseCount(verifyResult)
      console.log(`  Edges with temporal fields: ${afterMigration}`)

      // Sample edge to show new fields
      const sampleResult = await redis.call(
        'GRAPH.QUERY',
        GRAPH_NAME,
        `MATCH ()-[e]->() WHERE e.created_at IS NOT NULL RETURN keys(e) LIMIT 1`
      ) as unknown[][]

      console.log(`  Sample edge keys: ${JSON.stringify(parseKeys(sampleResult))}`)
    }

    await redis.quit()
    console.log('')
    console.log('Done!')

  } catch (err) {
    console.error('Migration failed:', err)
    await redis.quit()
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

function parseKeys(result: unknown[][]): string[] {
  if (!Array.isArray(result) || result.length < 2) return []
  const rows = result[1]
  if (!Array.isArray(rows) || rows.length === 0) return []
  const firstRow = rows[0]
  if (!Array.isArray(firstRow)) return []
  return firstRow[0] as string[] || []
}

function parseEdges(result: unknown[][]): EdgeInfo[] {
  if (!Array.isArray(result) || result.length < 2) return []
  const rows = result[1]
  if (!Array.isArray(rows)) return []

  return rows.map(row => {
    if (!Array.isArray(row)) return null
    return {
      sourceId: String(row[0]),
      sourceName: String(row[1]),
      sourceType: String(row[2]),
      targetId: String(row[3]),
      targetName: String(row[4]),
      targetType: String(row[5]),
      edgeType: String(row[6]),
      updatedAt: row[7] as string | null,
      hasTemporalFields: false,
    }
  }).filter((e): e is EdgeInfo => e !== null)
}

function generateFact(edge: EdgeInfo): string {
  if (edge.edgeType === 'MENTIONS') {
    return `"${edge.sourceName}" mentions ${edge.targetType.toLowerCase()} "${edge.targetName}"`
  }
  if (edge.edgeType === 'LINKS_TO') {
    return `"${edge.sourceName}" links to "${edge.targetName}"`
  }
  // Generic fallback
  return `"${edge.sourceName}" ${edge.edgeType.toLowerCase().replace('_', ' ')} "${edge.targetName}"`
}

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
}

main()
