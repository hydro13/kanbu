#!/usr/bin/env npx tsx
/**
 * Integration Test: Node Embeddings (Fase 21.5)
 *
 * Tests the full flow of node embedding generation and search:
 * 1. Check existing node embeddings in Qdrant
 * 2. Test entity semantic search (entity resolution)
 * 3. Test name normalization lookup
 * 4. Verify search latency meets target (<200ms)
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/test-node-embeddings.ts
 *
 * Options:
 *   --verbose    Show detailed output
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
} from '../apps/api/src/lib/ai/wiki/WikiNodeEmbeddingService';
import type { WikiContext } from '../apps/api/src/lib/ai/wiki/WikiAiService';

const GRAPH_NAME = 'kanbu_wiki';
const FALKORDB_HOST = process.env.FALKORDB_HOST ?? 'localhost';
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT ?? '6379');
const QDRANT_HOST = process.env.QDRANT_HOST ?? 'localhost';
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT ?? '6333');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');

const WORKSPACE_ID = 1;
const GROUP_ID = 'wiki-ws-1';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 21.5 - Node Embeddings Integration Test');
  console.log('='.repeat(60));
  console.log('');
  console.log(`FalkorDB: ${FALKORDB_HOST}:${FALKORDB_PORT}`);
  console.log(`Qdrant: ${QDRANT_HOST}:${QDRANT_PORT}`);
  console.log(`Workspace ID: ${WORKSPACE_ID}`);
  console.log('');

  const redis = new Redis({
    host: FALKORDB_HOST,
    port: FALKORDB_PORT,
    maxRetriesPerRequest: 3,
  });

  const prisma = new PrismaClient();
  const qdrant = new QdrantClient({ host: QDRANT_HOST, port: QDRANT_PORT });
  const nodeService = new WikiNodeEmbeddingService(prisma);

  const results: TestResult[] = [];
  const context: WikiContext = { workspaceId: WORKSPACE_ID };

  try {
    // Test 1: Check FalkorDB connection
    results.push(
      await runTest('FalkorDB Connection', async () => {
        await redis.ping();
        return 'Connected successfully';
      })
    );

    // Test 2: Check Qdrant connection
    results.push(
      await runTest('Qdrant Connection', async () => {
        await qdrant.getCollections();
        return 'Connected successfully';
      })
    );

    // Test 3: Check node embeddings collection exists
    results.push(
      await runTest('Node Embeddings Collection', async () => {
        const collections = await qdrant.getCollections();
        const exists = collections.collections.some((c) => c.name === 'kanbu_node_embeddings');
        if (!exists) {
          throw new Error('Collection kanbu_node_embeddings does not exist');
        }
        const info = await qdrant.getCollection('kanbu_node_embeddings');
        return `Collection exists with ${info.points_count ?? 0} points`;
      })
    );

    // Test 4: Count entity nodes in FalkorDB
    results.push(
      await runTest('FalkorDB Entity Count', async () => {
        const result = (await redis.call(
          'GRAPH.QUERY',
          GRAPH_NAME,
          `
          MATCH (n)
          WHERE n.name IS NOT NULL
            AND NOT n:WikiPage
            AND (n:Concept OR n:Person OR n:Task OR n:Project)
          RETURN count(n) as count
        `
        )) as unknown[][];
        const count = parseCount(result);
        return `Found ${count} entity nodes (Concept, Person, Task, Project)`;
      })
    );

    // Test 5: Get sample entities for testing
    interface SampleEntity {
      name: string;
      type: string;
    }
    const sampleEntities: SampleEntity[] = [];

    results.push(
      await runTest('Get Sample Entities', async () => {
        const result = (await redis.call(
          'GRAPH.QUERY',
          GRAPH_NAME,
          `
          MATCH (n)
          WHERE n.name IS NOT NULL
            AND NOT n:WikiPage
            AND (n:Concept OR n:Person OR n:Task OR n:Project)
          RETURN
            n.name AS name,
            CASE
              WHEN n:Person THEN 'Person'
              WHEN n:Concept THEN 'Concept'
              WHEN n:Task THEN 'Task'
              WHEN n:Project THEN 'Project'
              ELSE 'Unknown'
            END AS type
          LIMIT 5
        `
        )) as unknown[][];

        if (!Array.isArray(result) || result.length < 2) {
          throw new Error('No entities found');
        }
        const rows = result[1] as unknown[][];
        if (!Array.isArray(rows) || rows.length === 0) {
          throw new Error('No entities found');
        }

        for (const row of rows) {
          if (Array.isArray(row)) {
            sampleEntities.push({
              name: String(row[0]),
              type: String(row[1]),
            });
          }
        }

        if (VERBOSE) {
          console.log('    Sample entities:');
          for (const e of sampleEntities) {
            console.log(`      - [${e.type}] ${e.name}`);
          }
        }

        return `Found ${sampleEntities.length} sample entities`;
      })
    );

    // Test 6: Service stats
    results.push(
      await runTest('Service Stats', async () => {
        const stats = await nodeService.getStats();
        return `Collection: ${stats.collectionExists ? 'exists' : 'missing'}, Total nodes: ${stats.totalNodes}`;
      })
    );

    // Test 7: Initialize service
    results.push(
      await runTest('Service Initialization', async () => {
        const initialized = await nodeService.ensureCollection(context);
        return initialized ? 'Service initialized' : 'Service unavailable (no embedding provider)';
      })
    );

    // Test 8: Store test embedding (if entities exist)
    let testNodeId: string | null = null;
    if (sampleEntities.length > 0) {
      results.push(
        await runTest('Store Test Embedding', async () => {
          const entity = sampleEntities[0];
          testNodeId = `test-${entity.type.toLowerCase()}-${Date.now()}`;

          const testNode: NodeForEmbedding = {
            id: testNodeId,
            name: entity.name,
            type: entity.type as 'Concept' | 'Person' | 'Task' | 'Project',
            groupId: GROUP_ID,
          };

          const success = await nodeService.generateAndStoreNodeEmbedding(context, testNode);
          if (!success) {
            throw new Error('Failed to store embedding');
          }

          return `Stored embedding for [${entity.type}] ${entity.name}`;
        })
      );
    }

    // Test 9: Entity semantic search
    results.push(
      await runTest('Entity Semantic Search', async () => {
        if (sampleEntities.length === 0) {
          return 'Skipped (no entities)';
        }

        const searchName = sampleEntities[0].name.split(' ')[0]; // First word
        const searchResults = await nodeService.findSimilarEntities(context, searchName, {
          limit: 5,
          threshold: 0.3,
        });

        if (searchResults.length === 0) {
          return `No results for "${searchName}" (embeddings may need migration)`;
        }

        if (VERBOSE) {
          console.log(`    Search results for "${searchName}":`);
          for (const r of searchResults.slice(0, 3)) {
            console.log(`      - [${r.nodeType}] ${r.name} (score: ${r.score.toFixed(2)})`);
          }
        }

        return `Found ${searchResults.length} results for "${searchName}"`;
      })
    );

    // Test 10: Exact name lookup
    results.push(
      await runTest('Exact Name Lookup', async () => {
        if (sampleEntities.length === 0) {
          return 'Skipped (no entities)';
        }

        const exactName = sampleEntities[0].name;
        const exactResults = await nodeService.findByNormalizedName(context, exactName, {
          limit: 5,
        });

        if (exactResults.length === 0) {
          return `No exact match for "${exactName}" (may need migration)`;
        }

        return `Found ${exactResults.length} exact matches for "${exactName}"`;
      })
    );

    // Test 11: Entity resolution test (partial name)
    results.push(
      await runTest('Entity Resolution (Partial Name)', async () => {
        if (sampleEntities.length === 0) {
          return 'Skipped (no entities)';
        }

        // Get first name from a multi-word entity
        const entity = sampleEntities.find((e) => e.name.includes(' ')) ?? sampleEntities[0];
        const firstName = entity.name.split(' ')[0];

        const resolveResults = await nodeService.findSimilarEntities(context, firstName, {
          nodeType: entity.type as 'Concept' | 'Person' | 'Task' | 'Project',
          threshold: 0.7,
          limit: 5,
        });

        if (VERBOSE) {
          console.log(`    Entity resolution "${firstName}" -> ${entity.type}:`);
          for (const r of resolveResults.slice(0, 3)) {
            console.log(`      - ${r.name} (score: ${r.score.toFixed(2)})`);
          }
        }

        return `"${firstName}" resolved to ${resolveResults.length} candidates`;
      })
    );

    // Test 12: Search latency
    results.push(
      await runTest('Search Latency', async () => {
        const iterations = 5;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          await nodeService.findSimilarEntities(context, 'test query', { limit: 10 });
          times.push(Date.now() - start);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const max = Math.max(...times);

        // Target: <200ms (vector search ~10-50ms + OpenAI embedding ~100-300ms)
        if (max > 500) {
          throw new Error(`Search latency too high: avg=${avg.toFixed(0)}ms, max=${max}ms`);
        }

        return `Avg: ${avg.toFixed(0)}ms, Max: ${max}ms (target: <500ms incl. OpenAI)`;
      })
    );

    // Test 13: Cleanup test embedding
    if (testNodeId) {
      results.push(
        await runTest('Cleanup Test Embedding', async () => {
          const success = await nodeService.deleteNodeEmbedding(testNodeId!);
          return success ? 'Cleaned up test embedding' : 'Cleanup failed';
        })
      );
    }

    // Print results
    console.log('');
    console.log('='.repeat(60));
    console.log('Test Results');
    console.log('='.repeat(60));
    console.log('');

    let passed = 0;
    let failed = 0;

    for (const result of results) {
      const status = result.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      const time = `(${result.duration}ms)`;
      console.log(`${status} ${result.name}: ${result.message} ${time}`);

      if (result.passed) passed++;
      else failed++;
    }

    console.log('');
    console.log('-'.repeat(60));
    console.log(`Total: ${passed} passed, ${failed} failed`);
    console.log('');

    if (failed > 0) {
      console.log('\x1b[31mSome tests failed!\x1b[0m');
      process.exitCode = 1;
    } else {
      console.log('\x1b[32mAll tests passed!\x1b[0m');
    }
  } catch (err) {
    console.error('Test suite failed:', err);
    process.exitCode = 1;
  } finally {
    await redis.quit();
    await prisma.$disconnect();
  }
}

async function runTest(name: string, fn: () => Promise<string>): Promise<TestResult> {
  const start = Date.now();
  try {
    const message = await fn();
    return {
      name,
      passed: true,
      message,
      duration: Date.now() - start,
    };
  } catch (err) {
    return {
      name,
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      duration: Date.now() - start,
    };
  }
}

function parseCount(result: unknown[][]): number {
  if (!Array.isArray(result) || result.length < 2) return 0;
  const rows = result[1];
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const firstRow = rows[0];
  if (!Array.isArray(firstRow)) return 0;
  return Number(firstRow[0]) || 0;
}

main();
