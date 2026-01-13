#!/usr/bin/env npx tsx
/**
 * Rollback Script: Remove Bi-Temporal Fields from FalkorDB Edges
 *
 * Fase 16.1 - Schema Extension Rollback
 *
 * This script removes the following fields from all edges:
 * - created_at
 * - expired_at
 * - valid_at
 * - invalid_at
 * - fact
 *
 * The original 'updatedAt' field is preserved.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/rollback-temporal-edges.ts
 *
 * Options:
 *   --dry-run  Show what would be done without making changes
 *   --confirm  Skip confirmation prompt (for automation)
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import Redis from 'ioredis'
import * as readline from 'readline'

const GRAPH_NAME = 'kanbu_wiki'
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost'
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379')

const TEMPORAL_FIELDS = ['created_at', 'expired_at', 'valid_at', 'invalid_at', 'fact']

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const SKIP_CONFIRM = args.includes('--confirm')

async function confirm(message: string): Promise<boolean> {
  if (SKIP_CONFIRM) return true

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

async function main() {
  console.log('='.repeat(60))
  console.log('Fase 16.1 - Bi-Temporal Edge Rollback')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`)
  console.log(`Graph: ${GRAPH_NAME}`)
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`)
  console.log('')
  console.log('This will REMOVE the following fields from ALL edges:')
  TEMPORAL_FIELDS.forEach(f => console.log(`  - ${f}`))
  console.log('')

  if (!DRY_RUN && !await confirm('Are you sure you want to proceed?')) {
    console.log('Rollback cancelled.')
    return
  }

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

    // Step 1: Count edges with temporal fields
    console.log('Step 1: Analyzing current edge state...')

    const countResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `MATCH ()-[e]->() RETURN count(e) AS total`
    ) as unknown[][]

    const totalEdges = parseCount(countResult)
    console.log(`  Total edges: ${totalEdges}`)

    const temporalCountResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `MATCH ()-[e]->() WHERE e.created_at IS NOT NULL RETURN count(e) AS total`
    ) as unknown[][]

    const withTemporalFields = parseCount(temporalCountResult)
    console.log(`  With temporal fields: ${withTemporalFields}`)
    console.log('')

    if (withTemporalFields === 0) {
      console.log('No edges have temporal fields. Nothing to rollback.')
      await redis.quit()
      return
    }

    // Step 2: Show sample of current edge keys
    console.log('Step 2: Current edge structure...')
    const sampleResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `MATCH ()-[e]->() WHERE e.created_at IS NOT NULL RETURN keys(e) LIMIT 1`
    ) as unknown[][]

    const currentKeys = parseKeys(sampleResult)
    console.log(`  Current keys: ${JSON.stringify(currentKeys)}`)
    console.log('')

    // Step 3: Remove temporal fields
    console.log('Step 3: Removing temporal fields...')

    if (!DRY_RUN) {
      // FalkorDB doesn't have REMOVE property, so we need to set them to NULL
      // Actually, we can use REMOVE in FalkorDB with the right syntax
      for (const field of TEMPORAL_FIELDS) {
        console.log(`  Removing field: ${field}`)
        try {
          // Use REMOVE to delete the property
          await redis.call(
            'GRAPH.QUERY',
            GRAPH_NAME,
            `
              MATCH ()-[e]->()
              WHERE e.${field} IS NOT NULL
              SET e.${field} = NULL
            `
          )
        } catch (err) {
          console.error(`  Error removing ${field}: ${err}`)
        }
      }
    } else {
      console.log('  (DRY RUN - no changes made)')
      TEMPORAL_FIELDS.forEach(f => console.log(`    Would remove: ${f}`))
    }

    console.log('')
    console.log('='.repeat(60))
    console.log('Rollback Complete')
    console.log('='.repeat(60))
    console.log('')

    // Step 4: Verify rollback
    if (!DRY_RUN) {
      console.log('Step 4: Verifying rollback...')
      const verifyResult = await redis.call(
        'GRAPH.QUERY',
        GRAPH_NAME,
        `MATCH ()-[e]->() WHERE e.created_at IS NOT NULL RETURN count(e) AS total`
      ) as unknown[][]

      const remaining = parseCount(verifyResult)
      console.log(`  Edges with temporal fields remaining: ${remaining}`)

      const verifySampleResult = await redis.call(
        'GRAPH.QUERY',
        GRAPH_NAME,
        `MATCH ()-[e]->() RETURN keys(e) LIMIT 1`
      ) as unknown[][]

      const afterKeys = parseKeys(verifySampleResult)
      console.log(`  Edge keys after rollback: ${JSON.stringify(afterKeys)}`)
    }

    await redis.quit()
    console.log('')
    console.log('Done!')

  } catch (err) {
    console.error('Rollback failed:', err)
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

main()
