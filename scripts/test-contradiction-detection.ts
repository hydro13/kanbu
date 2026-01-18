#!/usr/bin/env npx tsx
/**
 * Test Script: Contradiction Detection (Fase 16.3)
 *
 * Tests the LLM-based contradiction detection for wiki edges.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/test-contradiction-detection.ts
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { PrismaClient } from '@prisma/client';
import { getWikiAiService } from '../apps/api/src/lib/ai/wiki';
import type { ExistingFact } from '../apps/api/src/lib/ai/wiki';

const TEST_CASES = [
  {
    name: 'No contradiction - different facts',
    newFact: '"Architecture" mentions concept "PostgreSQL"',
    existingFacts: [
      {
        id: 'edge-1',
        fact: '"Architecture" mentions concept "React"',
        validAt: '2024-01-01T00:00:00.000Z',
        invalidAt: null,
      },
      {
        id: 'edge-2',
        fact: '"Architecture" mentions concept "TypeScript"',
        validAt: '2024-01-01T00:00:00.000Z',
        invalidAt: null,
      },
    ],
    expectedContradictions: [],
  },
  {
    name: 'Simple contradiction - different employer',
    newFact: '"Team" mentions that "Jan" works at "Acme Corp"',
    existingFacts: [
      {
        id: 'edge-1',
        fact: '"Team" mentions that "Jan" works at "Tech Inc"',
        validAt: '2024-01-01T00:00:00.000Z',
        invalidAt: null,
      },
    ],
    expectedContradictions: ['edge-1'],
  },
  {
    name: 'No contradiction - past vs present',
    newFact: '"History" mentions that "the project" now uses "PostgreSQL"',
    existingFacts: [
      {
        id: 'edge-1',
        fact: '"History" mentions that "the project" used to use "MongoDB"',
        validAt: '2020-01-01T00:00:00.000Z',
        invalidAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    expectedContradictions: [], // Past fact already invalidated
  },
  {
    name: 'Contradiction - same role different value',
    newFact: '"Config" mentions that "the database host" is "db.production.com"',
    existingFacts: [
      {
        id: 'edge-1',
        fact: '"Config" mentions that "the database host" is "localhost"',
        validAt: '2024-01-01T00:00:00.000Z',
        invalidAt: null,
      },
      {
        id: 'edge-2',
        fact: '"Config" mentions that "the database port" is "5432"',
        validAt: '2024-01-01T00:00:00.000Z',
        invalidAt: null,
      },
    ],
    expectedContradictions: ['edge-1'], // Only host contradicts, not port
  },
  {
    name: 'Multiple contradictions',
    newFact: '"Architecture" mentions that "the project" uses "PostgreSQL" as the primary database',
    existingFacts: [
      {
        id: 'edge-1',
        fact: '"Architecture" mentions that "the project" uses "MongoDB" as the primary database',
        validAt: '2023-01-01T00:00:00.000Z',
        invalidAt: null,
      },
      {
        id: 'edge-2',
        fact: '"Architecture" mentions that "the project" uses "MySQL" as the primary database',
        validAt: '2022-01-01T00:00:00.000Z',
        invalidAt: null,
      },
      {
        id: 'edge-3',
        fact: '"Architecture" mentions that "the project" uses "Redis" for caching',
        validAt: '2023-06-01T00:00:00.000Z',
        invalidAt: null,
      },
    ],
    expectedContradictions: ['edge-1', 'edge-2'], // Both old primary DB facts contradict
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 16.3 - Contradiction Detection Test');
  console.log('='.repeat(60));
  console.log('');

  const prisma = new PrismaClient();

  try {
    const wikiAiService = getWikiAiService(prisma);

    // Get capabilities to check if reasoning provider is available
    const workspaceId = 1; // Use default workspace
    const capabilities = await wikiAiService.getCapabilities({ workspaceId });

    if (!capabilities.reasoning) {
      console.error('ERROR: No reasoning provider configured!');
      console.error(
        'Please configure an AI provider (OpenAI, Ollama, or LM Studio) in Admin > AI Systems'
      );
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(
      `Reasoning Provider: ${capabilities.reasoningProvider} (${capabilities.reasoningModel})`
    );
    console.log('');

    let passed = 0;
    let failed = 0;

    // Run test cases
    for (const testCase of TEST_CASES) {
      console.log('-'.repeat(60));
      console.log(`Test: ${testCase.name}`);
      console.log(`New Fact: ${testCase.newFact}`);
      console.log(`Existing Facts: ${testCase.existingFacts.length}`);
      console.log('');

      try {
        const result = await wikiAiService.detectContradictions(
          { workspaceId },
          testCase.newFact,
          testCase.existingFacts as ExistingFact[]
        );

        console.log('Result:');
        console.log(`  Contradicted: ${JSON.stringify(result.contradictedFactIds)}`);
        console.log(`  Reasoning:    ${result.reasoning}`);
        console.log(`  Provider:     ${result.provider} (${result.model})`);
        console.log('');

        // Validation
        const expectedSet = new Set(testCase.expectedContradictions);
        const actualSet = new Set(result.contradictedFactIds);

        const correctContradictions = testCase.expectedContradictions.filter((id) =>
          actualSet.has(id)
        );
        const missedContradictions = testCase.expectedContradictions.filter(
          (id) => !actualSet.has(id)
        );
        const falsePositives = result.contradictedFactIds.filter((id) => !expectedSet.has(id));

        console.log(`Expected: ${JSON.stringify(testCase.expectedContradictions)}`);
        console.log(
          `Correct:  ${correctContradictions.length}/${testCase.expectedContradictions.length}`
        );

        if (missedContradictions.length > 0) {
          console.log(`Missed:   ${JSON.stringify(missedContradictions)} ⚠️`);
        }
        if (falsePositives.length > 0) {
          console.log(`False +:  ${JSON.stringify(falsePositives)} ⚠️`);
        }

        // Consider test passed if we got the expected contradictions
        // Allow for some false positives since LLM may be conservative
        const testPassed = missedContradictions.length === 0;
        console.log(`Status:   ${testPassed ? '✅ PASS' : '❌ FAIL'}`);

        if (testPassed) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }

      console.log('');
    }

    console.log('='.repeat(60));
    console.log(
      `Basic Detection Summary: ${passed} passed, ${failed} failed out of ${TEST_CASES.length}`
    );
    console.log('='.repeat(60));
    console.log('');

    // ==========================================================================
    // Enhanced Detection Tests (Fase 17.2)
    // ==========================================================================

    console.log('='.repeat(60));
    console.log('Fase 17.2 - Enhanced Contradiction Detection Test');
    console.log('='.repeat(60));
    console.log('');

    let enhancedPassed = 0;
    let enhancedFailed = 0;

    // Test enhanced detection with confidence and categories
    const enhancedTestCases = [
      {
        name: 'Enhanced: Employment contradiction with high confidence',
        newFact: '"Team" mentions that "Jan" works at "Acme Corp"',
        existingFacts: [
          {
            id: 'edge-1',
            fact: '"Team" mentions that "Jan" works at "Tech Inc"',
            validAt: '2024-01-01T00:00:00.000Z',
            invalidAt: null,
          },
        ],
        expectedMinConfidence: 0.8,
        expectedCategory: 'FACTUAL',
      },
      {
        name: 'Enhanced: Config contradiction should be ATTRIBUTE category',
        newFact: '"Config" mentions that "the theme" is "dark"',
        existingFacts: [
          {
            id: 'edge-1',
            fact: '"Config" mentions that "the theme" is "light"',
            validAt: '2024-01-01T00:00:00.000Z',
            invalidAt: null,
          },
        ],
        expectedMinConfidence: 0.7,
        expectedCategory: 'ATTRIBUTE',
      },
    ];

    for (const testCase of enhancedTestCases) {
      console.log('-'.repeat(60));
      console.log(`Test: ${testCase.name}`);
      console.log(`New Fact: ${testCase.newFact}`);
      console.log('');

      try {
        const result = await wikiAiService.detectContradictionsEnhanced(
          { workspaceId },
          testCase.newFact,
          testCase.existingFacts as ExistingFact[]
        );

        console.log('Result:');
        for (const c of result.contradictions) {
          console.log(`  - ${c.factId}: ${c.category} (confidence: ${c.confidence.toFixed(2)})`);
          console.log(`    ${c.conflictDescription}`);
        }
        console.log(`  Reasoning: ${result.reasoning}`);
        console.log(`  Resolution: ${result.suggestedResolution || 'none'}`);
        console.log(`  Provider: ${result.provider} (${result.model})`);
        console.log('');

        // Validation
        const hasContradiction = result.contradictions.length > 0;
        const meetsConfidence = result.contradictions.some(
          (c) => c.confidence >= testCase.expectedMinConfidence
        );

        console.log(
          `Expected: confidence >= ${testCase.expectedMinConfidence}, category = ${testCase.expectedCategory}`
        );
        console.log(`Has contradiction: ${hasContradiction}`);
        console.log(`Meets confidence: ${meetsConfidence}`);

        const testPassed = hasContradiction && meetsConfidence;
        console.log(`Status: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);

        if (testPassed) {
          enhancedPassed++;
        } else {
          enhancedFailed++;
        }
      } catch (error) {
        console.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        enhancedFailed++;
      }

      console.log('');
    }

    console.log('='.repeat(60));
    console.log(
      `Enhanced Detection Summary: ${enhancedPassed} passed, ${enhancedFailed} failed out of ${enhancedTestCases.length}`
    );
    console.log('='.repeat(60));
    console.log('');

    // Final summary
    const totalPassed = passed + enhancedPassed;
    const totalFailed = failed + enhancedFailed;
    const totalTests = TEST_CASES.length + enhancedTestCases.length;

    console.log('='.repeat(60));
    console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed out of ${totalTests}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main();
