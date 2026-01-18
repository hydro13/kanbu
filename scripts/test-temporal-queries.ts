/**
 * Test Script: Temporal Queries (Fase 16.4)
 *
 * Tests the bi-temporal query capabilities:
 * - getFactsAsOf(): Get facts valid at a specific time
 * - temporalSearch(): Search with temporal constraints (FalkorDB fallback)
 *
 * Usage: npx tsx scripts/test-temporal-queries.ts
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { GraphitiService } from '../apps/api/src/services/graphitiService';

// Test configuration
const TEST_GROUP_ID = 'wiki-ws-1'; // Adjust to your test workspace

async function main() {
  console.log('='.repeat(60));
  console.log('Fase 16.4: Temporal Queries Test');
  console.log('='.repeat(60));
  console.log();

  const graphiti = new GraphitiService();

  // Wait for connection
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as { name: string; passed: boolean; details: string }[],
  };

  // ===========================================================================
  // Test 1: getFactsAsOf with current time (should return all valid facts)
  // ===========================================================================
  console.log('Test 1: getFactsAsOf(now)');
  console.log('-'.repeat(40));

  try {
    const now = new Date();
    const facts = await graphiti.getFactsAsOf(TEST_GROUP_ID, now, 10);

    console.log(`  Facts returned: ${facts.length}`);
    if (facts.length > 0) {
      console.log('  Sample fact:');
      console.log(`    Source: ${facts[0].sourceName} (${facts[0].sourceType})`);
      console.log(`    Target: ${facts[0].targetName} (${facts[0].targetType})`);
      console.log(`    Fact: ${facts[0].fact}`);
      console.log(`    Valid at: ${facts[0].validAt || 'null'}`);
      console.log(`    Invalid at: ${facts[0].invalidAt || 'null'}`);
    }

    results.tests.push({
      name: 'getFactsAsOf(now)',
      passed: true,
      details: `Returned ${facts.length} facts`,
    });
    results.passed++;
    console.log('  ✅ PASS');
  } catch (error) {
    results.tests.push({
      name: 'getFactsAsOf(now)',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    results.failed++;
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log();

  // ===========================================================================
  // Test 2: getFactsAsOf with past time (should return facts valid at that time)
  // ===========================================================================
  console.log('Test 2: getFactsAsOf(yesterday)');
  console.log('-'.repeat(40));

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const facts = await graphiti.getFactsAsOf(TEST_GROUP_ID, yesterday, 10);

    console.log(`  Facts valid yesterday: ${facts.length}`);

    results.tests.push({
      name: 'getFactsAsOf(yesterday)',
      passed: true,
      details: `Returned ${facts.length} facts`,
    });
    results.passed++;
    console.log('  ✅ PASS');
  } catch (error) {
    results.tests.push({
      name: 'getFactsAsOf(yesterday)',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    results.failed++;
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log();

  // ===========================================================================
  // Test 3: getFactsAsOf with future time (should return all non-invalidated facts)
  // ===========================================================================
  console.log('Test 3: getFactsAsOf(tomorrow)');
  console.log('-'.repeat(40));

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const facts = await graphiti.getFactsAsOf(TEST_GROUP_ID, tomorrow, 10);

    console.log(`  Facts valid tomorrow: ${facts.length}`);

    results.tests.push({
      name: 'getFactsAsOf(tomorrow)',
      passed: true,
      details: `Returned ${facts.length} facts`,
    });
    results.passed++;
    console.log('  ✅ PASS');
  } catch (error) {
    results.tests.push({
      name: 'getFactsAsOf(tomorrow)',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    results.failed++;
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log();

  // ===========================================================================
  // Test 4: temporalSearch with FalkorDB fallback
  // ===========================================================================
  console.log('Test 4: temporalSearch (FalkorDB fallback)');
  console.log('-'.repeat(40));

  try {
    const now = new Date();
    // Search for a common term that should exist
    const results_search = await graphiti.temporalSearch('page', TEST_GROUP_ID, now, 5);

    console.log(`  Search results: ${results_search.length}`);
    if (results_search.length > 0) {
      console.log('  Sample result:');
      console.log(`    Name: ${results_search[0].name}`);
      console.log(`    Type: ${results_search[0].type}`);
      console.log(`    Score: ${results_search[0].score}`);
    }

    results.tests.push({
      name: 'temporalSearch(FalkorDB fallback)',
      passed: true,
      details: `Returned ${results_search.length} results`,
    });
    results.passed++;
    console.log('  ✅ PASS');
  } catch (error) {
    results.tests.push({
      name: 'temporalSearch(FalkorDB fallback)',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    results.failed++;
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log();

  // ===========================================================================
  // Test 5: temporalSearch with specific entity name
  // ===========================================================================
  console.log('Test 5: temporalSearch with entity search');
  console.log('-'.repeat(40));

  try {
    const now = new Date();
    // Search for a generic term
    const results_search = await graphiti.temporalSearch('test', TEST_GROUP_ID, now, 5);

    console.log(`  Search results for "test": ${results_search.length}`);

    results.tests.push({
      name: 'temporalSearch(entity search)',
      passed: true,
      details: `Returned ${results_search.length} results`,
    });
    results.passed++;
    console.log('  ✅ PASS');
  } catch (error) {
    results.tests.push({
      name: 'temporalSearch(entity search)',
      passed: false,
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    results.failed++;
    console.log(`  ❌ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log();

  // ===========================================================================
  // Summary
  // ===========================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total: ${results.passed + results.failed}`);
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log();

  results.tests.forEach((test) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`  ${status} ${test.name}: ${test.details}`);
  });

  console.log();

  // Cleanup
  await graphiti.close();

  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test script failed:', error);
  process.exit(1);
});
