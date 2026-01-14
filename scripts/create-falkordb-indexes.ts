#!/usr/bin/env npx tsx
/**
 * Migration Script: Create FalkorDB Indexes for Deduplication
 *
 * Fase 22.8.3 - FalkorDB Performance Indexes
 *
 * This script creates indexes required for efficient deduplication lookups.
 * Run this on existing installations to enable Fase 22 dedup features.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/create-falkordb-indexes.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --verbose    Show detailed progress
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import Redis from 'ioredis'

const GRAPH_NAME = process.env.FALKORDB_GRAPH_NAME ?? 'kanbu_wiki'
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost'
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')

/**
 * Index definitions for deduplication
 */
const INDEXES = [
  // UUID indexes for fast node lookups
  { label: 'Concept', property: 'uuid' },
  { label: 'Person', property: 'uuid' },
  { label: 'Task', property: 'uuid' },
  { label: 'Project', property: 'uuid' },
  { label: 'WikiPage', property: 'uuid' },

  // GroupId indexes for multi-tenant filtering
  { label: 'Concept', property: 'groupId' },
  { label: 'Person', property: 'groupId' },
  { label: 'Task', property: 'groupId' },
  { label: 'Project', property: 'groupId' },
  { label: 'WikiPage', property: 'groupId' },

  // Name indexes for entity lookups
  { label: 'Concept', property: 'name' },
  { label: 'Person', property: 'name' },
  { label: 'Task', property: 'name' },
  { label: 'Project', property: 'name' },
  { label: 'WikiPage', property: 'title' },

  // PageId index for WikiPage lookups
  { label: 'WikiPage', property: 'pageId' },
]

async function createIndex(redis: Redis, label: string, property: string): Promise<boolean> {
  const cypher = `CREATE INDEX ON :${label}(${property})`

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would create: :${label}(${property})`)
    return true
  }

  try {
    await redis.call('GRAPH.QUERY', GRAPH_NAME, cypher)
    console.log(`  ✅ Created index: :${label}(${property})`)
    return true
  } catch (error) {
    const errorStr = String(error)
    if (errorStr.includes('already indexed') || errorStr.includes('Index already exists')) {
      if (VERBOSE) {
        console.log(`  ⏭️  Index already exists: :${label}(${property})`)
      }
      return true
    }
    console.error(`  ❌ Failed to create index: :${label}(${property}) - ${errorStr}`)
    return false
  }
}

async function listExistingIndexes(redis: Redis): Promise<void> {
  try {
    // FalkorDB uses GRAPH.QUERY to list indexes via Cypher
    const result = await redis.call('GRAPH.QUERY', GRAPH_NAME, 'CALL db.indexes()') as unknown[][]

    console.log('\nExisting indexes:')
    if (result && result[1] && Array.isArray(result[1])) {
      for (const row of result[1]) {
        if (Array.isArray(row) && row.length >= 2) {
          console.log(`  - ${row[0]}: ${row[1]}`)
        }
      }
    } else {
      console.log('  (none found or unable to list)')
    }
  } catch (error) {
    console.log('  (unable to list indexes - this is normal for empty graphs)')
    if (VERBOSE) {
      console.log(`  Error: ${error}`)
    }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Fase 22.8.3 - Create FalkorDB Indexes for Deduplication')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Graph: ${GRAPH_NAME}`)
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`)
  console.log('')

  // Connect to FalkorDB
  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  })

  try {
    // Test connection
    await redis.ping()
    console.log('✅ Connected to FalkorDB\n')

    // Show existing indexes
    if (VERBOSE) {
      await listExistingIndexes(redis)
      console.log('')
    }

    // Create indexes
    console.log(`Creating ${INDEXES.length} indexes...`)
    console.log('')

    let created = 0
    let skipped = 0
    let failed = 0

    for (const { label, property } of INDEXES) {
      const success = await createIndex(redis, label, property)
      if (success) {
        created++
      } else {
        failed++
      }
    }

    // Summary
    console.log('')
    console.log('='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    console.log(`  Total indexes: ${INDEXES.length}`)
    console.log(`  Created/Verified: ${created}`)
    console.log(`  Failed: ${failed}`)

    if (DRY_RUN) {
      console.log('')
      console.log('This was a dry run. Run without --dry-run to apply changes.')
    }

    // Show final index list
    if (VERBOSE && !DRY_RUN) {
      await listExistingIndexes(redis)
    }

    process.exit(failed > 0 ? 1 : 0)

  } catch (error) {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  } finally {
    await redis.quit()
  }
}

main()
