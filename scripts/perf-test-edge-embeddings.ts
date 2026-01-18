#!/usr/bin/env npx tsx
/**
 * Performance Test: Edge Embeddings (Fase 19.5)
 *
 * Measures:
 * 1. Embedding generation time per edge
 * 2. Qdrant storage time per edge
 * 3. Search latency breakdown
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { PrismaClient } from '@prisma/client';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  WikiEdgeEmbeddingService,
  type EdgeForEmbedding,
  type WikiContext,
} from '../apps/api/src/lib/ai/wiki/WikiEdgeEmbeddingService';

const QDRANT_HOST = process.env.QDRANT_HOST ?? 'localhost';
const QDRANT_PORT = parseInt(process.env.QDRANT_PORT ?? '6333');

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 19.5 - Edge Embeddings Performance Test');
  console.log('='.repeat(60));
  console.log('');

  const prisma = new PrismaClient();
  const qdrant = new QdrantClient({ host: QDRANT_HOST, port: QDRANT_PORT });
  const service = new WikiEdgeEmbeddingService(prisma);

  const context: WikiContext = { workspaceId: 1 };

  try {
    // Test 1: Single embedding generation + storage time
    console.log('Test 1: Single Edge Embedding Time');
    console.log('-'.repeat(40));

    const testEdge: EdgeForEmbedding = {
      id: 'perf-test-edge-1',
      fact: 'Performance test edge for measuring embedding generation time',
      edgeType: 'MENTIONS',
      sourceNode: 'TestSource',
      targetNode: 'TestTarget',
    };

    const startGen = Date.now();
    const result = await service.generateAndStoreEdgeEmbeddings(context, 999, [testEdge]);
    const genTime = Date.now() - startGen;

    console.log(`  Embedding + Storage: ${genTime}ms`);
    console.log(`  Result: ${result.stored} stored, ${result.errors} errors`);
    console.log('');

    // Test 2: Batch embedding (5 edges)
    console.log('Test 2: Batch Embedding Time (5 edges)');
    console.log('-'.repeat(40));

    const batchEdges: EdgeForEmbedding[] = [
      {
        id: 'perf-batch-1',
        fact: 'First test edge for batch performance',
        edgeType: 'MENTIONS',
        sourceNode: 'A',
        targetNode: 'B',
      },
      {
        id: 'perf-batch-2',
        fact: 'Second test edge for batch performance',
        edgeType: 'LINKS_TO',
        sourceNode: 'B',
        targetNode: 'C',
      },
      {
        id: 'perf-batch-3',
        fact: 'Third test edge for batch performance',
        edgeType: 'MENTIONS',
        sourceNode: 'C',
        targetNode: 'D',
      },
      {
        id: 'perf-batch-4',
        fact: 'Fourth test edge for batch performance',
        edgeType: 'LINKS_TO',
        sourceNode: 'D',
        targetNode: 'E',
      },
      {
        id: 'perf-batch-5',
        fact: 'Fifth test edge for batch performance',
        edgeType: 'MENTIONS',
        sourceNode: 'E',
        targetNode: 'F',
      },
    ];

    const startBatch = Date.now();
    const batchResult = await service.generateAndStoreEdgeEmbeddings(context, 998, batchEdges);
    const batchTime = Date.now() - startBatch;

    console.log(`  Total time: ${batchTime}ms`);
    console.log(`  Per edge: ${Math.round(batchTime / 5)}ms`);
    console.log(`  Result: ${batchResult.stored} stored, ${batchResult.errors} errors`);
    console.log('');

    // Test 3: Search latency breakdown
    console.log('Test 3: Search Latency Breakdown');
    console.log('-'.repeat(40));

    const searchIterations = 10;
    const latencies: number[] = [];

    for (let i = 0; i < searchIterations; i++) {
      const start = Date.now();
      await service.edgeSemanticSearch(context, 'test performance query', { limit: 10 });
      latencies.push(Date.now() - start);
    }

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const p50 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log(`  Iterations: ${searchIterations}`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Avg: ${Math.round(avg)}ms`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  Max: ${max}ms`);
    console.log('');

    // Test 4: Qdrant-only latency (no embedding generation)
    console.log('Test 4: Qdrant Vector Search Only');
    console.log('-'.repeat(40));

    // Get collection info to get vector dimension
    const info = await qdrant.getCollection('kanbu_edge_embeddings');
    const vectorSize =
      typeof info.config.params.vectors === 'object' && 'size' in info.config.params.vectors
        ? info.config.params.vectors.size
        : 1536;

    // Generate random vector
    const randomVector = Array.from({ length: vectorSize }, () => Math.random());

    const qdrantLatencies: number[] = [];
    for (let i = 0; i < searchIterations; i++) {
      const start = Date.now();
      await qdrant.search('kanbu_edge_embeddings', {
        vector: randomVector,
        limit: 10,
      });
      qdrantLatencies.push(Date.now() - start);
    }

    const qdrantAvg = qdrantLatencies.reduce((a, b) => a + b, 0) / qdrantLatencies.length;
    const qdrantMin = Math.min(...qdrantLatencies);
    const qdrantMax = Math.max(...qdrantLatencies);

    console.log(`  Min: ${qdrantMin}ms`);
    console.log(`  Avg: ${Math.round(qdrantAvg)}ms`);
    console.log(`  Max: ${qdrantMax}ms`);
    console.log(`  (OpenAI embedding adds ~${Math.round(avg - qdrantAvg)}ms)`);
    console.log('');

    // Cleanup test data
    console.log('Cleaning up test data...');
    await service.deleteEdgeEmbedding('perf-test-edge-1');
    for (let i = 1; i <= 5; i++) {
      await service.deleteEdgeEmbedding(`perf-batch-${i}`);
    }
    console.log('Done!');
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('Performance Summary');
    console.log('='.repeat(60));
    console.log(`  Single edge embedding: ${genTime}ms`);
    console.log(`  Batch embedding (5):   ${batchTime}ms (${Math.round(batchTime / 5)}ms/edge)`);
    console.log(`  Search latency (full): avg ${Math.round(avg)}ms, max ${max}ms`);
    console.log(`  Qdrant search only:    avg ${Math.round(qdrantAvg)}ms, max ${qdrantMax}ms`);
    console.log(`  OpenAI overhead:       ~${Math.round(avg - qdrantAvg)}ms`);
    console.log('');

    // Check against targets
    const searchPassed = max < 800;
    const embeddingPassed = genTime < 2000;

    console.log('Target Compliance:');
    console.log(`  Search < 800ms: ${searchPassed ? '✓ PASS' : '✗ FAIL'} (${max}ms)`);
    console.log(`  Embed < 2s:     ${embeddingPassed ? '✓ PASS' : '✗ FAIL'} (${genTime}ms)`);
    console.log('');
  } catch (err) {
    console.error('Performance test failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
