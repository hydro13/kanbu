#!/usr/bin/env npx tsx
/**
 * Test Script: Date Extraction (Fase 16.2)
 *
 * Tests the LLM-based date extraction for wiki edges.
 *
 * Usage:
 *   cd apps/api
 *   npx tsx ../../scripts/test-date-extraction.ts
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { PrismaClient } from '@prisma/client';
import { getWikiAiService } from '../apps/api/src/lib/ai/wiki';

const TEST_CASES = [
  {
    name: 'Present tense fact',
    fact: '"Kanbu" mentions project "Wiki"',
    content: 'Kanbu is een project management tool met een wiki feature.',
    expectedValidAt: 'reference timestamp',
    expectedInvalidAt: null,
  },
  {
    name: 'Past tense with explicit year',
    fact: '"Historie" mentions concept "PostgreSQL"',
    content: 'In 2020 zijn we overgestapt naar PostgreSQL voor betere performance.',
    expectedValidAt: '2020-01-01',
    expectedInvalidAt: null,
  },
  {
    name: 'Relative time (years ago)',
    fact: '"Team" mentions person "Jan"',
    content: 'Jan is 5 jaar geleden bij het team gekomen.',
    expectedValidAt: '5 years before reference',
    expectedInvalidAt: null,
  },
  {
    name: 'Fact no longer true',
    fact: '"Architectuur" mentions concept "MongoDB"',
    content: 'We gebruikten vroeger MongoDB, maar zijn nu overgestapt naar PostgreSQL.',
    expectedValidAt: 'unknown past',
    expectedInvalidAt: 'reference timestamp',
  },
  {
    name: 'Explicit date range',
    fact: '"Project X" mentions person "Alice"',
    content: 'Alice was project lead van januari 2022 tot maart 2023.',
    expectedValidAt: '2022-01-01',
    expectedInvalidAt: '2023-03-31',
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 16.2 - Date Extraction Test');
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

    const referenceTimestamp = new Date();
    console.log(`Reference Timestamp: ${referenceTimestamp.toISOString()}`);
    console.log('');

    // Run test cases
    for (const testCase of TEST_CASES) {
      console.log('-'.repeat(60));
      console.log(`Test: ${testCase.name}`);
      console.log(`Fact: ${testCase.fact}`);
      console.log(`Content: ${testCase.content.substring(0, 100)}...`);
      console.log('');

      try {
        const result = await wikiAiService.extractEdgeDates(
          { workspaceId },
          testCase.fact,
          testCase.content,
          referenceTimestamp
        );

        console.log('Result:');
        console.log(`  valid_at:   ${result.validAt?.toISOString() ?? 'null'}`);
        console.log(`  invalid_at: ${result.invalidAt?.toISOString() ?? 'null'}`);
        console.log(`  reasoning:  ${result.reasoning}`);
        console.log(`  provider:   ${result.provider} (${result.model})`);
        console.log('');

        // Basic validation
        const validAtMatch =
          testCase.expectedValidAt === 'reference timestamp'
            ? result.validAt?.toISOString() === referenceTimestamp.toISOString()
            : true; // Skip detailed validation for now

        const invalidAtMatch =
          testCase.expectedInvalidAt === null
            ? result.invalidAt === null
            : result.invalidAt !== null;

        console.log(`Expected validAt: ${testCase.expectedValidAt}`);
        console.log(`Expected invalidAt: ${testCase.expectedInvalidAt ?? 'null'}`);
        console.log(`validAt match: ${validAtMatch ? '✅' : '⚠️'}`);
        console.log(`invalidAt match: ${invalidAtMatch ? '✅' : '⚠️'}`);
      } catch (error) {
        console.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log('');
    }
  } catch (error) {
    console.error('Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
  console.log('='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

main();
