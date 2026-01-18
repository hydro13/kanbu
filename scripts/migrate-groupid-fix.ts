#!/usr/bin/env npx tsx
/**
 * Migration Script: Fix Missing groupId on Entity Nodes
 *
 * Fase 22 - Entity Deduplication Fix
 *
 * This script fixes the bug where entity nodes were created without groupId,
 * making them invisible to the deduplication scanner which filters by groupId.
 *
 * What it does:
 * 1. Finds all entity nodes without a groupId
 * 2. Determines the correct groupId by looking at connected WikiPage nodes
 * 3. Updates each node with the correct groupId
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/migrate-groupid-fix.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --verbose    Show detailed progress
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import Redis from 'ioredis';

const GRAPH_NAME = 'kanbu_wiki';
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

interface NodeWithoutGroupId {
  nodeId: number;
  name: string;
  type: string;
}

interface GroupIdMapping {
  nodeId: number;
  name: string;
  type: string;
  groupId: string;
}

async function query(redis: Redis, cypher: string): Promise<unknown[]> {
  const result = (await redis.call('GRAPH.QUERY', GRAPH_NAME, cypher)) as unknown[][];
  if (result && result[1] && Array.isArray(result[1])) {
    return result[1];
  }
  return [];
}

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 22 - GroupId Migration Fix');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Graph: ${GRAPH_NAME}`);
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`);
  console.log('');

  // Connect to FalkorDB
  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  });

  try {
    // Step 1: Find all nodes without groupId
    console.log('Step 1: Finding nodes without groupId...');

    const nodesWithoutGroupId = (await query(
      redis,
      `
      MATCH (n)
      WHERE n.groupId IS NULL AND n.name IS NOT NULL
      RETURN ID(n) as nodeId, n.name as name, labels(n)[0] as type
    `
    )) as [number, string, string][];

    console.log(`Found ${nodesWithoutGroupId.length} nodes without groupId`);
    console.log('');

    if (nodesWithoutGroupId.length === 0) {
      console.log('No nodes to migrate!');
      return;
    }

    // Group by type for statistics
    const byType = new Map<string, number>();
    for (const [, , type] of nodesWithoutGroupId) {
      byType.set(type, (byType.get(type) || 0) + 1);
    }

    console.log('Nodes by type:');
    for (const [type, count] of byType) {
      console.log(`  ${type}: ${count}`);
    }
    console.log('');

    // Step 2: Determine groupId for each node via connected WikiPage
    console.log('Step 2: Determining groupId via WikiPage connections...');

    const mappings: GroupIdMapping[] = [];
    let orphanCount = 0;
    let defaultGroupId = 'wiki-ws-534'; // Default fallback based on investigation

    for (const [nodeId, name, type] of nodesWithoutGroupId) {
      // Try to find groupId via connected WikiPage
      const pageConnection = (await query(
        redis,
        `
        MATCH (n)-[]-(wp:WikiPage)
        WHERE ID(n) = ${nodeId} AND wp.groupId IS NOT NULL
        RETURN wp.groupId as groupId
        LIMIT 1
      `
      )) as [string][];

      let groupId: string;

      if (pageConnection.length > 0 && pageConnection[0][0]) {
        groupId = pageConnection[0][0];
        if (VERBOSE) {
          console.log(`  ${type}:${name} -> ${groupId} (via WikiPage)`);
        }
      } else {
        // No connection found, use default
        groupId = defaultGroupId;
        orphanCount++;
        if (VERBOSE) {
          console.log(`  ${type}:${name} -> ${groupId} (default, no WikiPage connection)`);
        }
      }

      mappings.push({ nodeId, name, type, groupId });
    }

    console.log(``);
    console.log(`Determined groupIds: ${mappings.length} nodes`);
    console.log(`  - Via WikiPage connection: ${mappings.length - orphanCount}`);
    console.log(`  - Using default (orphans): ${orphanCount}`);
    console.log('');

    // Group by determined groupId
    const byGroupId = new Map<string, number>();
    for (const { groupId } of mappings) {
      byGroupId.set(groupId, (byGroupId.get(groupId) || 0) + 1);
    }

    console.log('Nodes by groupId:');
    for (const [gid, count] of byGroupId) {
      console.log(`  ${gid}: ${count}`);
    }
    console.log('');

    // Step 3: Apply the updates
    if (DRY_RUN) {
      console.log('DRY RUN - No changes will be made');
      console.log('');
      console.log('Would update the following nodes:');
      for (const { nodeId, name, type, groupId } of mappings.slice(0, 10)) {
        console.log(`  [${nodeId}] ${type}:${name} -> groupId='${groupId}'`);
      }
      if (mappings.length > 10) {
        console.log(`  ... and ${mappings.length - 10} more`);
      }
    } else {
      console.log('Step 3: Applying groupId updates...');
      console.log('');

      let updated = 0;
      let errors = 0;

      for (const { nodeId, name, type, groupId } of mappings) {
        try {
          await redis.call(
            'GRAPH.QUERY',
            GRAPH_NAME,
            `
            MATCH (n)
            WHERE ID(n) = ${nodeId}
            SET n.groupId = '${groupId}'
          `
          );
          updated++;

          if (VERBOSE || updated % 50 === 0) {
            console.log(`  Updated ${updated}/${mappings.length}: ${type}:${name}`);
          }
        } catch (err) {
          errors++;
          console.error(`  ERROR updating ${type}:${name}: ${err}`);
        }
      }

      console.log('');
      console.log('='.repeat(60));
      console.log('Migration Complete!');
      console.log('='.repeat(60));
      console.log(`  Total nodes processed: ${mappings.length}`);
      console.log(`  Successfully updated: ${updated}`);
      console.log(`  Errors: ${errors}`);
    }
  } finally {
    await redis.quit();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
