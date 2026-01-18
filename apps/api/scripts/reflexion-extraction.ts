#!/usr/bin/env npx ts-node

/**
 * Reflexion Extraction Script (Fase 23.8)
 *
 * Run reflexion extraction on existing wiki pages to detect missed entities.
 * This script analyzes pages that have already been synced to the knowledge graph
 * and identifies entities that may have been missed during initial extraction.
 *
 * Usage:
 *   pnpm tsx scripts/reflexion-extraction.ts --workspace 1
 *   pnpm tsx scripts/reflexion-extraction.ts --workspace 1 --project 5
 *   pnpm tsx scripts/reflexion-extraction.ts --workspace 1 --dry-run
 *   pnpm tsx scripts/reflexion-extraction.ts --workspace 1 --limit 10
 *   pnpm tsx scripts/reflexion-extraction.ts --help
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-14
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import { getWikiAiService } from '../src/lib/ai/wiki';
import { getGraphitiService } from '../src/services/graphitiService';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface Options {
  workspace?: number;
  project?: number;
  limit: number;
  dryRun: boolean;
  verbose: boolean;
  skipResync: boolean;
  help: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    workspace: undefined,
    project: undefined,
    limit: 100,
    dryRun: false,
    verbose: false,
    skipResync: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-w':
      case '--workspace':
        options.workspace = parseInt(args[++i], 10);
        break;
      case '-p':
      case '--project':
        options.project = parseInt(args[++i], 10);
        break;
      case '-l':
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '-d':
      case '--dry-run':
        options.dryRun = true;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '--skip-resync':
        options.skipResync = true;
        break;
      case '-h':
      case '--help':
        options.help = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Reflexion Extraction Script (Fase 23.8)

Run reflexion extraction on existing wiki pages to detect missed entities.
This analyzes pages already synced to the knowledge graph and identifies
entities that may have been missed during initial extraction.

Usage:
  pnpm tsx scripts/reflexion-extraction.ts [options]

Required:
  -w, --workspace <id>   Workspace ID to process

Options:
  -p, --project <id>     Filter to specific project (optional)
  -l, --limit <count>    Maximum number of pages to process (default: 100)
  -d, --dry-run          Show what would be extracted without saving
  -v, --verbose          Show detailed output including reasons
  --skip-resync          Only analyze, do not re-sync pages
  -h, --help             Show this help message

Examples:
  pnpm tsx scripts/reflexion-extraction.ts --workspace 1
  pnpm tsx scripts/reflexion-extraction.ts --workspace 1 --project 5
  pnpm tsx scripts/reflexion-extraction.ts --workspace 1 --dry-run
  pnpm tsx scripts/reflexion-extraction.ts --workspace 1 --limit 10 --verbose
`);
}

// ============================================================================
// Statistics
// ============================================================================

interface Stats {
  pagesProcessed: number;
  pagesWithMissed: number;
  totalMissedEntities: number;
  errors: number;
  resynced: number;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  if (!opts.workspace) {
    console.error('Error: --workspace is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Reflexion Extraction Script');
  console.log('='.repeat(60));
  console.log(`  Workspace ID: ${opts.workspace}`);
  if (opts.project) console.log(`  Project ID:   ${opts.project}`);
  console.log(`  Page Limit:   ${opts.limit}`);
  console.log(`  Mode:         ${opts.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (opts.skipResync) console.log(`  Skip Resync:  Yes (analysis only)`);
  console.log('='.repeat(60) + '\n');

  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: opts.workspace },
  });

  if (!workspace) {
    console.error(`Error: Workspace ${opts.workspace} not found`);
    process.exit(1);
  }

  console.log(`Workspace: ${workspace.name}\n`);

  // Initialize services
  const wikiAiService = getWikiAiService(prisma);
  const graphitiService = getGraphitiService(prisma);

  // Check if AI service is available
  const capabilities = await wikiAiService.getCapabilities({
    workspaceId: opts.workspace,
    projectId: opts.project,
  });

  if (!capabilities.reasoning) {
    console.error('Error: No AI provider with reasoning capability available');
    console.error('Please configure an AI provider for this workspace first');
    process.exit(1);
  }

  console.log(`AI Provider: ${capabilities.provider || 'default'}\n`);

  // Fetch wiki pages
  const pages = await prisma.wikiPage.findMany({
    where: {
      workspaceId: opts.workspace,
      ...(opts.project ? { projectId: opts.project } : {}),
      deletedAt: null, // Only active pages
    },
    take: opts.limit,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      workspaceId: true,
      projectId: true,
      createdBy: true,
    },
  });

  if (pages.length === 0) {
    console.log('No wiki pages found matching the criteria');
    process.exit(0);
  }

  console.log(`Found ${pages.length} page(s) to analyze\n`);
  console.log('-'.repeat(60));

  const stats: Stats = {
    pagesProcessed: 0,
    pagesWithMissed: 0,
    totalMissedEntities: 0,
    errors: 0,
    resynced: 0,
  };

  // Process each page
  for (const page of pages) {
    stats.pagesProcessed++;

    if (opts.verbose) {
      console.log(`\n[${stats.pagesProcessed}/${pages.length}] Processing: ${page.title}`);
    }

    try {
      // Get current extracted entities from the graph
      const currentEntities = await graphitiService.getPageEntities(page.id);
      const entityNames = currentEntities.map((e) => e.name);

      if (opts.verbose) {
        console.log(`  Current entities: ${entityNames.length}`);
        if (entityNames.length > 0 && entityNames.length <= 10) {
          console.log(`    ${entityNames.join(', ')}`);
        }
      }

      // Skip pages with no content
      if (!page.content || page.content.trim().length === 0) {
        if (opts.verbose) {
          console.log('  Skipping: empty content');
        }
        continue;
      }

      // Run reflexion extraction
      const result = await wikiAiService.extractNodesReflexion(
        {
          workspaceId: opts.workspace,
          projectId: opts.project ?? undefined,
        },
        page.content,
        entityNames
      );

      if (result.missedEntities.length > 0) {
        stats.pagesWithMissed++;
        stats.totalMissedEntities += result.missedEntities.length;

        console.log(`\n  ${page.title}`);
        console.log(`  Missed entities: ${result.missedEntities.length}`);

        for (const missed of result.missedEntities) {
          const typeInfo = missed.suggestedType ? ` (${missed.suggestedType})` : '';
          console.log(`    - ${missed.name}${typeInfo}`);

          if (opts.verbose && missed.reason) {
            console.log(`      Reason: ${missed.reason}`);
          }
        }

        if (opts.verbose && result.reasoning) {
          console.log(`  Analysis: ${result.reasoning}`);
        }

        // Re-sync page with reflexion enabled (unless dry-run or skip-resync)
        if (!opts.dryRun && !opts.skipResync) {
          try {
            const groupId = page.projectId
              ? `wiki-proj-${page.projectId}`
              : `wiki-ws-${page.workspaceId}`;

            await graphitiService.syncWikiPage(
              {
                pageId: page.id,
                title: page.title,
                slug: page.slug,
                content: page.content,
                workspaceId: page.workspaceId,
                projectId: page.projectId ?? undefined,
                groupId,
                userId: page.createdBy,
                timestamp: new Date(),
              },
              {
                enableReflexion: true,
              }
            );

            stats.resynced++;
            console.log(`    Re-synced with missed entities`);
          } catch (syncError) {
            console.error(
              `    Failed to re-sync: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`
            );
            stats.errors++;
          }
        }
      } else if (opts.verbose) {
        console.log('  No missed entities found');
      }
    } catch (err) {
      stats.errors++;
      console.error(
        `\n  Error processing ${page.title}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );

      if (opts.verbose && err instanceof Error && err.stack) {
        console.error(`  Stack: ${err.stack.split('\n')[1]}`);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('  Summary');
  console.log('='.repeat(60));
  console.log(`  Pages processed:           ${stats.pagesProcessed}`);
  console.log(`  Pages with missed entities: ${stats.pagesWithMissed}`);
  console.log(`  Total missed entities:     ${stats.totalMissedEntities}`);
  if (!opts.dryRun && !opts.skipResync) {
    console.log(`  Pages re-synced:           ${stats.resynced}`);
  }
  if (stats.errors > 0) {
    console.log(`  Errors:                    ${stats.errors}`);
  }
  console.log(`  Mode:                      ${opts.dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
  console.log('='.repeat(60) + '\n');

  // Exit with error code if there were errors
  if (stats.errors > 0) {
    console.log(`Completed with ${stats.errors} error(s)`);
  }
}

main()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nFatal error:', err);
    prisma.$disconnect();
    process.exit(1);
  });
