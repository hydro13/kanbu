#!/usr/bin/env npx tsx
/**
 * Migration Script: Generate Node Embeddings for Existing Entity Nodes
 *
 * Fase 21.5 - Testing & Migration
 *
 * This script generates vector embeddings for all existing entity nodes
 * (Concept, Person, Task, Project) and stores them in Qdrant for semantic
 * entity resolution.
 *
 * What it does:
 * 1. Reads all entity nodes from FalkorDB (excluding WikiPage)
 * 2. Groups nodes by type for statistics
 * 3. Generates embeddings via WikiNodeEmbeddingService
 * 4. Stores embeddings in Qdrant collection 'kanbu_node_embeddings'
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/migrate-node-embeddings.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --verbose    Show detailed progress
 *   --workspace  Workspace ID to use (default: 1)
 *   --batch      Batch size for processing (default: 50)
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  WikiNodeEmbeddingService,
  type NodeForEmbedding,
  type EmbeddableNodeType,
} from '../apps/api/src/lib/ai/wiki/WikiNodeEmbeddingService';
import type { WikiContext } from '../apps/api/src/lib/ai/wiki/WikiAiService';

const GRAPH_NAME = 'kanbu_wiki';
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379');
const QDRANT_HOST = process.env.QDRANT_HOST ?? 'localhost';
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT ?? '6333');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

// Parse workspace ID from args
const workspaceArg = args.find((a) => a.startsWith('--workspace='));
const WORKSPACE_ID = workspaceArg ? parseInt(workspaceArg.split('=')[1]) : 1;

// Parse batch size from args
const batchArg = args.find((a) => a.startsWith('--batch='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1]) : 50;

const GROUP_ID = `wiki-ws-${WORKSPACE_ID}`;

interface EntityNode {
  nodeId: string;
  name: string;
  type: EmbeddableNodeType;
  summary?: string;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 21.5 - Node Embeddings Migration');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Workspace ID: ${WORKSPACE_ID}`);
  console.log(`Group ID: ${GROUP_ID}`);
  console.log(`Batch Size: ${BATCH_SIZE}`);
  console.log(`Graph: ${GRAPH_NAME}`);
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`);
  console.log(`Qdrant: ${QDRANT_HOST}:${QDRANT_PORT}`);
  console.log('');

  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  });

  const prisma = new PrismaClient();
  const qdrant = new QdrantClient({ host: QDRANT_HOST, port: QDRANT_PORT });

  try {
    // Test connections
    await redis.ping();
    console.log('Connected to FalkorDB');

    await qdrant.getCollections();
    console.log('Connected to Qdrant');
    console.log('');

    // Step 1: Check current state
    console.log('Step 1: Analyzing current state...');

    // Count entity nodes by type
    const countByTypeResult = (await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `
        MATCH (n)
        WHERE n.name IS NOT NULL AND NOT n:WikiPage
        RETURN
          CASE
            WHEN n:Person THEN 'Person'
            WHEN n:Concept THEN 'Concept'
            WHEN n:Task THEN 'Task'
            WHEN n:Project THEN 'Project'
            ELSE 'Other'
          END AS type,
          count(n) AS count
        ORDER BY type
      `
    )) as unknown[][];

    const typeCounts = parseTypeCounts(countByTypeResult);
    const totalNodes = Object.values(typeCounts).reduce((a, b) => a + b, 0);

    console.log('  Entity nodes by type:');
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`    ${type}: ${count}`);
    }
    console.log(`  Total: ${totalNodes}`);

    // Check Qdrant collection
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      (c) => c.name === 'kanbu_node_embeddings'
    );
    console.log(`  Qdrant collection exists: ${collectionExists}`);

    let existingEmbeddings = 0;
    if (collectionExists) {
      const info = await qdrant.getCollection('kanbu_node_embeddings');
      existingEmbeddings = info.points_count ?? 0;
      console.log(`  Existing embeddings: ${existingEmbeddings}`);
    }

    const toMigrate = totalNodes - existingEmbeddings;
    console.log(`  To migrate (approx): ${toMigrate > 0 ? toMigrate : 0}`);
    console.log('');

    if (totalNodes === 0) {
      console.log('No entity nodes found. Nothing to do.');
      await cleanup(redis, prisma);
      return;
    }

    // Step 2: Fetch all entity nodes
    console.log('Step 2: Fetching entity nodes from FalkorDB...');
    const nodesResult = (await redis.call(
      'GRAPH.QUERY',
      GRAPH_NAME,
      `
        MATCH (n)
        WHERE n.name IS NOT NULL
          AND NOT n:WikiPage
          AND (n:Concept OR n:Person OR n:Task OR n:Project)
        RETURN
          id(n) AS nodeId,
          n.name AS name,
          CASE
            WHEN n:Person THEN 'Person'
            WHEN n:Concept THEN 'Concept'
            WHEN n:Task THEN 'Task'
            WHEN n:Project THEN 'Project'
          END AS type,
          n.summary AS summary
        ORDER BY type, name
        LIMIT 1000
      `
    )) as unknown[][];

    const nodes = parseNodes(nodesResult);
    console.log(`  Found ${nodes.length} entity nodes to process`);

    if (VERBOSE) {
      // Show sample by type
      const typeGroups = new Map<string, EntityNode[]>();
      for (const node of nodes) {
        if (!typeGroups.has(node.type)) {
          typeGroups.set(node.type, []);
        }
        typeGroups.get(node.type)!.push(node);
      }
      for (const [type, typeNodes] of typeGroups) {
        console.log(`    ${type}: ${typeNodes.length} nodes`);
        for (const n of typeNodes.slice(0, 3)) {
          console.log(`      - ${n.name}`);
        }
        if (typeNodes.length > 3) {
          console.log(`      ... and ${typeNodes.length - 3} more`);
        }
      }
    }
    console.log('');

    if (nodes.length === 0) {
      console.log('No nodes to migrate.');
      await cleanup(redis, prisma);
      return;
    }

    // Step 3: Generate embeddings
    console.log('Step 3: Generating embeddings...');

    const context: WikiContext = {
      workspaceId: WORKSPACE_ID,
      projectId: undefined, // Workspace wiki
    };

    let totalStored = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    if (!DRY_RUN) {
      const service = new WikiNodeEmbeddingService(prisma);

      // Initialize service
      const initialized = await service.ensureCollection(context);
      if (!initialized) {
        console.error('  Failed to initialize service (no embedding provider?)');
        await cleanup(redis, prisma);
        process.exit(1);
      }

      // Process in batches
      for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
        const batch = nodes.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(nodes.length / BATCH_SIZE);

        console.log(`  Processing batch ${batchNum}/${totalBatches} (${batch.length} nodes)...`);

        // Convert to NodeForEmbedding format
        const nodesForEmbedding: NodeForEmbedding[] = batch.map((node) => ({
          id: `node-${GROUP_ID}-${node.type}-${node.name}`.replace(/[^a-zA-Z0-9-]/g, '_'),
          name: node.name,
          type: node.type,
          groupId: GROUP_ID,
          summary: node.summary,
        }));

        try {
          const result = await service.generateAndStoreBatchNodeEmbeddings(
            context,
            nodesForEmbedding
          );

          totalStored += result.stored;
          totalSkipped += result.skipped;
          totalErrors += result.errors;

          if (VERBOSE) {
            console.log(
              `    Result: ${result.stored} stored, ${result.skipped} skipped, ${result.errors} errors`
            );
          }
        } catch (err) {
          console.error(`    Error processing batch ${batchNum}: ${err}`);
          totalErrors += batch.length;
        }

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < nodes.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } else {
      // Dry run - just count what would be done
      for (const node of nodes) {
        if (VERBOSE) {
          console.log(`  Would embed: [${node.type}] ${node.name}`);
        }
        totalStored++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Complete');
    console.log('='.repeat(60));
    console.log(`  Mode:           ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`  Total nodes:    ${nodes.length}`);
    console.log(`  Stored:         ${totalStored}`);
    console.log(`  Skipped:        ${totalSkipped}`);
    console.log(`  Errors:         ${totalErrors}`);
    console.log('');

    // Step 4: Verify
    if (!DRY_RUN) {
      console.log('Step 4: Verifying migration...');
      const info = await qdrant.getCollection('kanbu_node_embeddings');
      console.log(`  Node embeddings in Qdrant: ${info.points_count ?? 0}`);
    }

    await cleanup(redis, prisma);
    console.log('');
    console.log('Done!');
  } catch (err) {
    console.error('Migration failed:', err);
    await cleanup(redis, prisma);
    process.exit(1);
  }
}

function parseTypeCounts(result: unknown[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!Array.isArray(result) || result.length < 2) return counts;
  const rows = result[1];
  if (!Array.isArray(rows)) return counts;

  for (const row of rows) {
    if (Array.isArray(row) && row.length >= 2) {
      const type = String(row[0]);
      const count = Number(row[1]);
      if (type && type !== 'Other') {
        counts[type] = count;
      }
    }
  }
  return counts;
}

function parseNodes(result: unknown[][]): EntityNode[] {
  if (!Array.isArray(result) || result.length < 2) return [];
  const rows = result[1];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      if (!Array.isArray(row)) return null;
      const name = String(row[1]);
      const type = String(row[2]) as EmbeddableNodeType;

      // Skip if invalid type
      if (!['Person', 'Concept', 'Task', 'Project'].includes(type)) {
        return null;
      }

      return {
        nodeId: String(row[0]),
        name,
        type,
        summary: row[3] as string | undefined,
      };
    })
    .filter((n): n is EntityNode => n !== null && n.name.length > 0);
}

async function cleanup(redis: Redis, prisma: PrismaClient) {
  await redis.quit();
  await prisma.$disconnect();
}

main();
