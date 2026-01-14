#!/usr/bin/env npx tsx
/**
 * CLI Tool: Detect Duplicate Entities in Knowledge Graph
 *
 * Fase 22.8.5 - Entity Deduplication CLI
 *
 * This script scans a workspace for potential duplicate entities and optionally
 * creates IS_DUPLICATE_OF edges to mark them.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/detect-duplicates.ts --workspace=1 --dry-run
 *   npx tsx ../../scripts/detect-duplicates.ts --workspace=1 --threshold=0.85 --apply
 *   npx tsx ../../scripts/detect-duplicates.ts --help
 *
 * Options:
 *   --workspace <id>     Workspace ID (required)
 *   --project <id>       Project ID (optional, limits scope)
 *   --threshold <0.0-1.0> Similarity threshold (default: 0.85)
 *   --dry-run            Only report, do not create edges (default)
 *   --apply              Create IS_DUPLICATE_OF edges
 *   --node-types <types> Comma-separated: Concept,Person,Task,Project (default: all)
 *   --limit <n>          Maximum duplicates to process (default: 100)
 *   --verbose            Show detailed output
 *   --help               Show this help
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { QdrantClient } from '@qdrant/js-client-rest'
import {
  WikiDeduplicationService,
  type DeduplicationOptions,
} from '../apps/api/src/lib/ai/wiki/WikiDeduplicationService'
import {
  WikiNodeEmbeddingService,
} from '../apps/api/src/lib/ai/wiki/WikiNodeEmbeddingService'

// =============================================================================
// Configuration
// =============================================================================

const GRAPH_NAME = process.env.FALKORDB_GRAPH_NAME ?? 'kanbu_wiki'
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost'
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379')
const QDRANT_HOST = process.env.QDRANT_HOST ?? 'localhost'
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT ?? '6333')

const DEFAULT_THRESHOLD = 0.85
const DEFAULT_LIMIT = 100
const DEFAULT_NODE_TYPES = ['Concept', 'Person', 'Task', 'Project']

// =============================================================================
// Argument Parsing
// =============================================================================

const args = process.argv.slice(2)

function getArg(name: string): string | undefined {
  const arg = args.find(a => a.startsWith(`--${name}=`))
  return arg ? arg.split('=')[1] : undefined
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`)
}

const SHOW_HELP = hasFlag('help') || hasFlag('h')
const DRY_RUN = !hasFlag('apply')
const VERBOSE = hasFlag('verbose')

const workspaceArg = getArg('workspace')
const projectArg = getArg('project')
const thresholdArg = getArg('threshold')
const nodeTypesArg = getArg('node-types')
const limitArg = getArg('limit')

const WORKSPACE_ID = workspaceArg ? parseInt(workspaceArg) : undefined
const PROJECT_ID = projectArg ? parseInt(projectArg) : undefined
const THRESHOLD = thresholdArg ? parseFloat(thresholdArg) : DEFAULT_THRESHOLD
const LIMIT = limitArg ? parseInt(limitArg) : DEFAULT_LIMIT
const NODE_TYPES = nodeTypesArg
  ? nodeTypesArg.split(',').map(t => t.trim())
  : DEFAULT_NODE_TYPES

// =============================================================================
// Help Text
// =============================================================================

const HELP_TEXT = `
Fase 22.8.5 - Detect Duplicate Entities CLI

USAGE:
  cd apps/api
  npx tsx ../../scripts/detect-duplicates.ts [OPTIONS]

OPTIONS:
  --workspace=<id>       Workspace ID (REQUIRED)
  --project=<id>         Project ID (optional, limits scope)
  --threshold=<0.0-1.0>  Similarity threshold (default: ${DEFAULT_THRESHOLD})
  --dry-run              Only report, do not create edges (default)
  --apply                Create IS_DUPLICATE_OF edges in graph
  --node-types=<types>   Comma-separated list (default: ${DEFAULT_NODE_TYPES.join(',')})
  --limit=<n>            Maximum duplicates to process (default: ${DEFAULT_LIMIT})
  --verbose              Show detailed output
  --help                 Show this help

EXAMPLES:
  # Dry run for workspace 1
  npx tsx ../../scripts/detect-duplicates.ts --workspace=1 --dry-run

  # Apply with custom threshold
  npx tsx ../../scripts/detect-duplicates.ts --workspace=1 --threshold=0.90 --apply

  # Scan only Concepts and Persons
  npx tsx ../../scripts/detect-duplicates.ts --workspace=1 --node-types=Concept,Person

  # Verbose output for debugging
  npx tsx ../../scripts/detect-duplicates.ts --workspace=1 --verbose --dry-run

ENVIRONMENT VARIABLES:
  FALKORDB_HOST          FalkorDB host (default: localhost)
  FALKORDB_PORT          FalkorDB port (default: 6379)
  FALKORDB_GRAPH_NAME    Graph name (default: kanbu_wiki)
  QDRANT_HOST            Qdrant host (default: localhost)
  QDRANT_PORT            Qdrant port (default: 6333)
`

// =============================================================================
// Types
// =============================================================================

interface EntityNode {
  uuid: string
  name: string
  type: string
  groupId?: string
}

interface DuplicateCandidate {
  sourceNode: EntityNode
  targetNode: EntityNode
  confidence: number
  matchType: string
}

// =============================================================================
// FalkorDB Functions
// =============================================================================

async function getWorkspaceNodes(
  redis: Redis,
  groupId: string,
  nodeTypes: string[]
): Promise<EntityNode[]> {
  const typeLabels = nodeTypes.join('|')
  const query = `
    MATCH (n)
    WHERE (${nodeTypes.map(t => `n:${t}`).join(' OR ')})
      AND n.groupId = $groupId
    RETURN n.uuid AS uuid, n.name AS name, labels(n)[0] AS type, n.groupId AS groupId
    LIMIT 5000
  `

  try {
    const result = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      query,
      '--compact',
      'PARAMS',
      JSON.stringify({ groupId })
    ) as unknown[][]

    if (!result || result.length < 2) {
      return []
    }

    const rows = result[1] as unknown[][]
    if (!Array.isArray(rows)) {
      return []
    }

    return rows.map(row => {
      const values = row as (string | null)[]
      return {
        uuid: values[0] || '',
        name: values[1] || '',
        type: values[2] || 'Unknown',
        groupId: values[3] || undefined,
      }
    }).filter(n => n.uuid && n.name)
  } catch (error) {
    console.error(`Error querying nodes: ${error}`)
    return []
  }
}

async function duplicateEdgeExists(
  redis: Redis,
  sourceId: string,
  targetId: string
): Promise<boolean> {
  const query = `
    MATCH (source)-[r:IS_DUPLICATE_OF]->(target)
    WHERE source.uuid = $sourceId AND target.uuid = $targetId
    RETURN count(r) > 0 AS exists
  `

  try {
    const result = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      query,
      '--compact',
      'PARAMS',
      JSON.stringify({ sourceId, targetId })
    ) as unknown[][]

    if (!result || result.length < 2) {
      return false
    }

    const rows = result[1] as unknown[][]
    if (!rows || rows.length === 0) {
      return false
    }

    // Check both directions
    const reverseQuery = `
      MATCH (source)-[r:IS_DUPLICATE_OF]->(target)
      WHERE source.uuid = $targetId AND target.uuid = $sourceId
      RETURN count(r) > 0 AS exists
    `

    const reverseResult = await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      reverseQuery,
      '--compact',
      'PARAMS',
      JSON.stringify({ sourceId, targetId })
    ) as unknown[][]

    return (rows[0] as boolean[])![0] === true ||
           (reverseResult[1] as boolean[][])?.[0]?.[0] === true
  } catch (error) {
    if (VERBOSE) {
      console.error(`Error checking edge existence: ${error}`)
    }
    return false
  }
}

async function createDuplicateEdge(
  redis: Redis,
  sourceId: string,
  targetId: string,
  confidence: number,
  matchType: string
): Promise<boolean> {
  const query = `
    MATCH (source), (target)
    WHERE source.uuid = $sourceId AND target.uuid = $targetId
    CREATE (source)-[r:IS_DUPLICATE_OF {
      confidence: $confidence,
      matchType: $matchType,
      detectedAt: datetime(),
      detectedBy: 'cli-script'
    }]->(target)
    RETURN r
  `

  try {
    await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      query,
      '--compact',
      'PARAMS',
      JSON.stringify({ sourceId, targetId, confidence, matchType })
    )
    return true
  } catch (error) {
    console.error(`  ❌ Failed to create edge: ${error}`)
    return false
  }
}

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatConfidence(conf: number): string {
  const pct = Math.round(conf * 100)
  if (pct >= 90) return `\x1b[32m${pct}%\x1b[0m` // Green
  if (pct >= 70) return `\x1b[34m${pct}%\x1b[0m` // Blue
  if (pct >= 50) return `\x1b[33m${pct}%\x1b[0m` // Yellow
  return `\x1b[31m${pct}%\x1b[0m` // Red
}

function formatMatchType(type: string): string {
  switch (type) {
    case 'exact':
      return `\x1b[32m${type}\x1b[0m`
    case 'fuzzy':
      return `\x1b[34m${type}\x1b[0m`
    case 'embedding':
      return `\x1b[35m${type}\x1b[0m`
    case 'llm':
      return `\x1b[33m${type}\x1b[0m`
    default:
      return type
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  // Show help
  if (SHOW_HELP) {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  // Validate workspace
  if (!WORKSPACE_ID) {
    console.error('\n❌ Error: --workspace is required\n')
    console.log('Run with --help for usage information')
    process.exit(1)
  }

  if (THRESHOLD < 0 || THRESHOLD > 1) {
    console.error('\n❌ Error: --threshold must be between 0.0 and 1.0\n')
    process.exit(1)
  }

  // Build groupId
  const groupId = PROJECT_ID
    ? `wiki-proj-${PROJECT_ID}`
    : `wiki-ws-${WORKSPACE_ID}`

  // Print header
  console.log('='.repeat(60))
  console.log('Fase 22.8.5 - Detect Duplicate Entities')
  console.log('='.repeat(60))
  console.log('')
  console.log(`Mode:        ${DRY_RUN ? '\x1b[33mDRY RUN\x1b[0m (no edges created)' : '\x1b[32mAPPLY\x1b[0m (edges will be created)'}`)
  console.log(`Workspace:   ${WORKSPACE_ID}`)
  if (PROJECT_ID) {
    console.log(`Project:     ${PROJECT_ID}`)
  }
  console.log(`GroupId:     ${groupId}`)
  console.log(`Threshold:   ${Math.round(THRESHOLD * 100)}%`)
  console.log(`Node Types:  ${NODE_TYPES.join(', ')}`)
  console.log(`Limit:       ${LIMIT}`)
  console.log(`Graph:       ${GRAPH_NAME}`)
  console.log(`FalkorDB:    ${FALKORDB_HOST}:${FALKORDB_PORT}`)
  console.log(`Qdrant:      ${QDRANT_HOST}:${QDRANT_PORT}`)
  console.log('')

  // Connect to services
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
    console.log('✅ Connected to FalkorDB')

    await qdrant.getCollections()
    console.log('✅ Connected to Qdrant')
    console.log('')

    // Initialize services
    const nodeEmbeddingService = new WikiNodeEmbeddingService(prisma)
    const deduplicationService = new WikiDeduplicationService(nodeEmbeddingService)

    // Step 1: Get all nodes
    console.log('Step 1: Fetching nodes from graph...')
    const nodes = await getWorkspaceNodes(redis, groupId, NODE_TYPES)

    if (nodes.length === 0) {
      console.log('')
      console.log('⚠️  No nodes found in workspace')
      console.log('   Make sure you have synced wiki pages to the knowledge graph.')
      process.exit(0)
    }

    // Filter out nodes without valid names
    const validNodes = nodes.filter(n =>
      n.name && typeof n.name === 'string' && n.name.trim() !== ''
    )

    console.log(`   Found ${nodes.length} nodes total`)
    console.log(`   ${validNodes.length} nodes with valid names`)

    if (VERBOSE) {
      const typeCounts: Record<string, number> = {}
      validNodes.forEach(n => {
        typeCounts[n.type] = (typeCounts[n.type] || 0) + 1
      })
      console.log('   By type:')
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`)
      })
    }
    console.log('')

    if (validNodes.length < 2) {
      console.log('⚠️  Need at least 2 nodes to find duplicates')
      process.exit(0)
    }

    // Step 2: Find duplicates
    console.log('Step 2: Scanning for duplicates...')

    const options: DeduplicationOptions = {
      threshold: THRESHOLD,
      limit: LIMIT,
      useFuzzy: true,
      useEmbeddings: true,
    }

    const duplicates = await deduplicationService.findDuplicatesInWorkspace(
      validNodes.map(n => ({
        uuid: n.uuid,
        name: n.name,
        type: n.type as 'Concept' | 'Person' | 'Task' | 'Project',
        groupId: n.groupId,
      })),
      options
    )

    console.log(`   Found ${duplicates.length} potential duplicate pairs`)
    console.log('')

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found at current threshold')
      console.log('')
      console.log('='.repeat(60))
      console.log('Summary')
      console.log('='.repeat(60))
      console.log(`  Nodes scanned:     ${validNodes.length}`)
      console.log(`  Duplicates found:  0`)
      console.log(`  Threshold:         ${Math.round(THRESHOLD * 100)}%`)
      process.exit(0)
    }

    // Step 3: Display results
    console.log('Step 3: Duplicate candidates')
    console.log('')

    // Group by match type
    const byMatchType: Record<string, typeof duplicates> = {}
    duplicates.forEach(d => {
      const type = d.matchType
      if (!byMatchType[type]) byMatchType[type] = []
      byMatchType[type].push(d)
    })

    // Display grouped
    for (const [matchType, dups] of Object.entries(byMatchType)) {
      console.log(`  ${formatMatchType(matchType)} matches (${dups.length}):`)
      console.log('')

      for (const dup of dups.slice(0, VERBOSE ? 50 : 10)) {
        const srcName = truncate(dup.sourceNode.name, 25)
        const tgtName = truncate(dup.targetNode.name, 25)
        console.log(`    ${srcName.padEnd(25)} ≈ ${tgtName.padEnd(25)} ${formatConfidence(dup.confidence)}`)
      }

      if (dups.length > (VERBOSE ? 50 : 10)) {
        console.log(`    ... and ${dups.length - (VERBOSE ? 50 : 10)} more`)
      }
      console.log('')
    }

    // Step 4: Create edges (if --apply)
    let edgesCreated = 0
    let edgesSkipped = 0
    let edgesFailed = 0

    if (!DRY_RUN) {
      console.log('Step 4: Creating IS_DUPLICATE_OF edges...')
      console.log('')

      for (const dup of duplicates) {
        const exists = await duplicateEdgeExists(
          redis,
          dup.sourceNode.uuid,
          dup.targetNode.uuid
        )

        if (exists) {
          edgesSkipped++
          if (VERBOSE) {
            console.log(`  ⏭️  Edge already exists: ${dup.sourceNode.name} → ${dup.targetNode.name}`)
          }
          continue
        }

        const success = await createDuplicateEdge(
          redis,
          dup.sourceNode.uuid,
          dup.targetNode.uuid,
          dup.confidence,
          dup.matchType
        )

        if (success) {
          edgesCreated++
          if (VERBOSE) {
            console.log(`  ✅ Created: ${dup.sourceNode.name} → ${dup.targetNode.name}`)
          }
        } else {
          edgesFailed++
        }
      }

      console.log('')
    }

    // Summary
    console.log('='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    console.log(`  Nodes scanned:       ${validNodes.length}`)
    console.log(`  Duplicates found:    ${duplicates.length}`)
    console.log(`  Threshold:           ${Math.round(THRESHOLD * 100)}%`)

    if (!DRY_RUN) {
      console.log('')
      console.log(`  Edges created:       ${edgesCreated}`)
      console.log(`  Edges skipped:       ${edgesSkipped} (already existed)`)
      if (edgesFailed > 0) {
        console.log(`  Edges failed:        ${edgesFailed}`)
      }
    } else {
      console.log('')
      console.log('  \x1b[33mThis was a dry run. Run with --apply to create edges.\x1b[0m')
    }

    // Match type breakdown
    console.log('')
    console.log('  By match type:')
    for (const [type, dups] of Object.entries(byMatchType)) {
      console.log(`    - ${type}: ${dups.length}`)
    }

    process.exit(edgesFailed > 0 ? 1 : 0)

  } catch (error) {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  } finally {
    await redis.quit()
    await prisma.$disconnect()
  }
}

main()
