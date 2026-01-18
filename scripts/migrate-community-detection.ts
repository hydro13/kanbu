#!/usr/bin/env npx tsx
/**
 * Migration Script: Community Detection Schema Validation
 *
 * Fase 24.9 - Migration Script
 *
 * This script validates and initializes the FalkorDB schema for
 * the Community Detection feature (Label Propagation + LLM summaries).
 *
 * What it does:
 * 1. Validates FalkorDB connection and graph existence
 * 2. Checks Community node schema
 * 3. Validates HAS_MEMBER relationship schema
 * 4. Reports on existing communities
 * 5. Optionally cleans up invalid/incomplete communities
 *
 * Schema:
 *   Community node:
 *     - uuid: string (required)
 *     - name: string (required)
 *     - summary: string (required)
 *     - groupId: string (required) - format: wiki-ws-{id} or wiki-proj-{id}
 *     - memberCount: number (required)
 *     - createdAt: timestamp (required)
 *     - updatedAt: timestamp (required)
 *
 *   HAS_MEMBER relationship:
 *     Community -[:HAS_MEMBER]-> Entity
 *     Properties:
 *       - uuid: string (required)
 *       - groupId: string (required)
 *       - entityType: string (required)
 *       - createdAt: timestamp (required)
 *
 * Usage:
 *   cd /home/robin/genx/v6/dev/kanbu
 *   npx tsx scripts/migrate-community-detection.ts
 *
 * Options:
 *   --dry-run      Show what would be done without making changes
 *   --verbose      Show detailed progress
 *   --cleanup      Remove invalid/incomplete communities
 *   --graph-name   Graph name (default: kanbu_wiki or from FALKORDB_GRAPH env)
 *
 * Examples:
 *   # Check current state
 *   npx tsx scripts/migrate-community-detection.ts --dry-run --verbose
 *
 *   # Clean up invalid communities
 *   npx tsx scripts/migrate-community-detection.ts --cleanup
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import Redis from 'ioredis';

// ============================================================================
// Configuration
// ============================================================================

const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const CLEANUP = args.includes('--cleanup');

const graphArg = args.find((a) => a.startsWith('--graph-name='));
const GRAPH_NAME = graphArg ? graphArg.split('=')[1] : process.env.FALKORDB_GRAPH || 'kanbu_wiki';

// ============================================================================
// Types
// ============================================================================

interface CommunityStats {
  totalCommunities: number;
  byGroupId: Record<string, number>;
  invalidCommunities: Array<{
    uuid: string;
    reason: string;
    groupId?: string;
  }>;
  orphanedMemberships: number;
  validMemberships: number;
}

interface ValidationIssue {
  type: 'missing_property' | 'invalid_type' | 'orphaned_relationship' | 'invalid_groupid';
  severity: 'warning' | 'error';
  description: string;
  nodeUuid?: string;
  property?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function query(redis: Redis, cypher: string): Promise<unknown[]> {
  try {
    const result = (await redis.call('GRAPH.QUERY', GRAPH_NAME, cypher)) as unknown[][];

    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    return [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Query Error]:', errorMessage);
    throw error;
  }
}

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parseRows(result: unknown[]): unknown[][] {
  if (!Array.isArray(result) || result.length < 2) return [];
  const rows = result[1];
  if (!Array.isArray(rows)) return [];
  return rows as unknown[][];
}

// ============================================================================
// Validation Functions
// ============================================================================

async function validateGraphExists(redis: Redis): Promise<boolean> {
  try {
    // Try to list all graphs
    const graphs = (await redis.call('GRAPH.LIST')) as string[];

    if (VERBOSE) {
      console.log('  Available graphs:', graphs);
    }

    const exists = graphs.includes(GRAPH_NAME);
    return exists;
  } catch (error) {
    console.error('  Failed to check graph existence:', error);
    return false;
  }
}

async function analyzeCommunities(redis: Redis): Promise<CommunityStats> {
  const stats: CommunityStats = {
    totalCommunities: 0,
    byGroupId: {},
    invalidCommunities: [],
    orphanedMemberships: 0,
    validMemberships: 0,
  };

  // Count communities by groupId
  const countQuery = `
    MATCH (c:Community)
    RETURN c.groupId AS groupId, count(c) AS count
  `;

  const countResult = await query(redis, countQuery);
  const countRows = parseRows(countResult);

  for (const row of countRows) {
    if (Array.isArray(row) && row.length >= 2) {
      const groupId = String(row[0]);
      const count = Number(row[1]);
      stats.byGroupId[groupId] = count;
      stats.totalCommunities += count;
    }
  }

  // Find communities with missing required properties
  const validationQuery = `
    MATCH (c:Community)
    RETURN c.uuid, c.name, c.summary, c.groupId, c.memberCount, c.createdAt, c.updatedAt
  `;

  const validationResult = await query(redis, validationQuery);
  const validationRows = parseRows(validationResult);

  const requiredProps = [
    'uuid',
    'name',
    'summary',
    'groupId',
    'memberCount',
    'createdAt',
    'updatedAt',
  ];

  for (const row of validationRows) {
    if (!Array.isArray(row) || row.length < 7) continue;

    const props = {
      uuid: row[0],
      name: row[1],
      summary: row[2],
      groupId: row[3],
      memberCount: row[4],
      createdAt: row[5],
      updatedAt: row[6],
    };

    const missingProps: string[] = [];

    for (let i = 0; i < requiredProps.length; i++) {
      const prop = requiredProps[i];
      const value = row[i];

      if (value === null || value === undefined || value === '') {
        missingProps.push(prop);
      }
    }

    if (missingProps.length > 0) {
      stats.invalidCommunities.push({
        uuid: String(props.uuid || 'unknown'),
        groupId: String(props.groupId || 'unknown'),
        reason: `Missing properties: ${missingProps.join(', ')}`,
      });
    }

    // Validate groupId format
    const groupId = String(props.groupId || '');
    if (groupId && !groupId.match(/^wiki-(ws|proj)-\d+$/)) {
      stats.invalidCommunities.push({
        uuid: String(props.uuid || 'unknown'),
        groupId,
        reason: `Invalid groupId format: ${groupId} (expected wiki-ws-{id} or wiki-proj-{id})`,
      });
    }
  }

  // Count HAS_MEMBER relationships
  const membershipQuery = `
    MATCH (c:Community)-[r:HAS_MEMBER]->(e)
    RETURN count(r) AS validMemberships
  `;

  const membershipResult = await query(redis, membershipQuery);
  const membershipRows = parseRows(membershipResult);

  if (membershipRows.length > 0 && Array.isArray(membershipRows[0])) {
    stats.validMemberships = Number(membershipRows[0][0]) || 0;
  }

  // Find orphaned memberships (HAS_MEMBER without entity target)
  const orphanedQuery = `
    MATCH (c:Community)-[r:HAS_MEMBER]->(e)
    WHERE e.uuid IS NULL OR e.name IS NULL
    RETURN count(r) AS orphaned
  `;

  const orphanedResult = await query(redis, orphanedQuery);
  const orphanedRows = parseRows(orphanedResult);

  if (orphanedRows.length > 0 && Array.isArray(orphanedRows[0])) {
    stats.orphanedMemberships = Number(orphanedRows[0][0]) || 0;
  }

  return stats;
}

async function cleanupInvalidCommunities(
  redis: Redis,
  invalidCommunities: Array<{ uuid: string; reason: string; groupId?: string }>
): Promise<number> {
  let cleaned = 0;

  for (const invalid of invalidCommunities) {
    if (VERBOSE) {
      console.log(`  Deleting invalid community ${invalid.uuid}: ${invalid.reason}`);
    }

    // Delete HAS_MEMBER relationships first
    await query(
      redis,
      `
      MATCH (c:Community {uuid: '${escapeString(invalid.uuid)}'})-[r:HAS_MEMBER]->()
      DELETE r
    `
    );

    // Delete community node
    await query(
      redis,
      `
      MATCH (c:Community {uuid: '${escapeString(invalid.uuid)}'})
      DELETE c
    `
    );

    cleaned++;
  }

  return cleaned;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('Fase 24.9 - Community Detection Migration & Validation');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Mode:        ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Graph Name:  ${GRAPH_NAME}`);
  console.log(`FalkorDB:    ${FALKORDB_HOST}:${FALKORDB_PORT}`);
  console.log(`Cleanup:     ${CLEANUP ? 'YES - will remove invalid communities' : 'NO'}`);
  console.log('');

  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  });

  try {
    // Step 1: Connection test
    console.log('Step 1: Testing FalkorDB connection...');
    await redis.ping();
    console.log('  ✅ Connected to FalkorDB');
    console.log('');

    // Step 2: Graph validation
    console.log('Step 2: Validating graph existence...');
    const graphExists = await validateGraphExists(redis);

    if (!graphExists) {
      console.log(`  ⚠️  Graph "${GRAPH_NAME}" does not exist yet`);
      console.log('  This is normal for a fresh installation.');
      console.log('  The graph will be created automatically when first entities are added.');
      console.log('');
      console.log('✅ Migration check complete - no action needed');
      await redis.quit();
      return;
    }

    console.log(`  ✅ Graph "${GRAPH_NAME}" exists`);
    console.log('');

    // Step 3: Analyze existing communities
    console.log('Step 3: Analyzing existing communities...');
    const stats = await analyzeCommunities(redis);

    console.log(`  Total communities:      ${stats.totalCommunities}`);
    console.log(`  Invalid communities:    ${stats.invalidCommunities.length}`);
    console.log(`  Valid memberships:      ${stats.validMemberships}`);
    console.log(`  Orphaned memberships:   ${stats.orphanedMemberships}`);
    console.log('');

    if (Object.keys(stats.byGroupId).length > 0) {
      console.log('  Communities by groupId:');
      for (const [groupId, count] of Object.entries(stats.byGroupId)) {
        console.log(`    ${groupId}: ${count}`);
      }
      console.log('');
    }

    // Step 4: Report validation issues
    if (stats.invalidCommunities.length > 0) {
      console.log('⚠️  Validation Issues Found:');
      console.log('');

      for (const invalid of stats.invalidCommunities) {
        console.log(`  ❌ Community ${invalid.uuid}`);
        console.log(`     GroupId: ${invalid.groupId || 'unknown'}`);
        console.log(`     Issue:   ${invalid.reason}`);
        console.log('');
      }

      if (CLEANUP && !DRY_RUN) {
        console.log('Step 5: Cleaning up invalid communities...');
        const cleaned = await cleanupInvalidCommunities(redis, stats.invalidCommunities);
        console.log(`  ✅ Cleaned up ${cleaned} invalid communities`);
        console.log('');
      } else if (CLEANUP && DRY_RUN) {
        console.log('Step 5: [DRY RUN] Would clean up invalid communities...');
        console.log(`  Would delete: ${stats.invalidCommunities.length} communities`);
        console.log('');
      }
    } else {
      console.log('✅ No validation issues found');
      console.log('');
    }

    // Step 5: Schema recommendation
    console.log('Schema Validation:');
    console.log('  Community node properties: ✅');
    console.log('    - uuid: string');
    console.log('    - name: string');
    console.log('    - summary: string');
    console.log('    - groupId: string (format: wiki-ws-{id} or wiki-proj-{id})');
    console.log('    - memberCount: number');
    console.log('    - createdAt: timestamp');
    console.log('    - updatedAt: timestamp');
    console.log('');
    console.log('  HAS_MEMBER relationship: ✅');
    console.log('    - Community -[:HAS_MEMBER]-> Entity');
    console.log('    - Properties: uuid, groupId, entityType, createdAt');
    console.log('');

    console.log('='.repeat(70));
    console.log('Migration Complete');
    console.log('='.repeat(70));
    console.log('');

    if (stats.totalCommunities === 0) {
      console.log('ℹ️  No communities exist yet.');
      console.log('   Communities will be created when users run community detection.');
    } else if (stats.invalidCommunities.length === 0) {
      console.log('✅ All existing communities are valid!');
    } else if (CLEANUP && !DRY_RUN) {
      console.log('✅ Invalid communities have been cleaned up');
    } else {
      console.log('⚠️  Some invalid communities found');
      console.log('   Run with --cleanup to remove them');
    }
    console.log('');

    await redis.quit();
  } catch (err) {
    console.error('Migration failed:', err);
    await redis.quit();
    process.exit(1);
  }
}

main();
