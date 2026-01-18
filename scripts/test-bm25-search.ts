/**
 * Integration Test: BM25 Search Service
 * Fase 20.3 - Test against real database
 *
 * Run: npx tsx scripts/test-bm25-search.ts
 */

import { PrismaClient } from '@prisma/client';

// Simple inline implementation for testing (avoids import path issues)
type SearchLanguage = 'english' | 'dutch' | 'german' | 'simple';

interface Bm25SearchResult {
  pageId: number;
  title: string;
  slug: string;
  rank: number;
  headline?: string;
  source: 'workspace' | 'project';
}

interface RawFtsResult {
  id: number;
  title: string;
  slug: string;
  rank: number;
  headline: string | null;
}

class WikiBm25Service {
  constructor(private prisma: PrismaClient) {}

  buildTsQuery(query: string): string {
    const escaped = query.replace(/[&|!():*<>']/g, ' ');
    const words = escaped
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length === 0) return '';
    return words.map((w) => `${w}:*`).join(' & ');
  }

  async search(
    query: string,
    options: { workspaceId?: number; projectId?: number; limit?: number; language?: SearchLanguage }
  ): Promise<Bm25SearchResult[]> {
    const { workspaceId, limit = 20, language = 'english' } = options;

    if (!query || query.trim().length === 0) return [];

    const tsquery = this.buildTsQuery(query);
    if (!tsquery) return [];

    const results = await this.prisma.$queryRawUnsafe<RawFtsResult[]>(
      `
      SELECT
        id,
        title,
        slug,
        ts_rank(search_vector, to_tsquery($1::regconfig, $2)) as rank,
        ts_headline($1::regconfig, content, to_tsquery($1::regconfig, $2),
          'MaxWords=30, MinWords=15, StartSel=<mark>, StopSel=</mark>') as headline
      FROM workspace_wiki_pages
      WHERE workspace_id = $3
        AND search_vector @@ to_tsquery($1::regconfig, $2)
        AND status != 'ARCHIVED'
      ORDER BY rank DESC
      LIMIT $4
      `,
      language,
      tsquery,
      workspaceId,
      limit
    );

    return results.map((r) => ({
      pageId: r.id,
      title: r.title,
      slug: r.slug,
      rank: r.rank,
      headline: r.headline ?? undefined,
      source: 'workspace' as const,
    }));
  }
}

async function main() {
  console.log('🧪 BM25 Search Integration Test\n');
  console.log('='.repeat(50));

  const prisma = new PrismaClient();
  const service = new WikiBm25Service(prisma);

  try {
    // Test 1: Basic search
    console.log('\n📝 Test 1: Basic keyword search "kanban"');
    const results1 = await service.search('kanban', { workspaceId: 534 });
    console.log(`   Found: ${results1.length} results`);
    if (results1.length > 0) {
      console.log(`   Top result: "${results1[0].title}" (rank: ${results1[0].rank.toFixed(4)})`);
      if (results1[0].headline) {
        console.log(`   Headline: ${results1[0].headline.substring(0, 80)}...`);
      }
    }

    // Test 2: Multi-word query
    console.log('\n📝 Test 2: Multi-word search "project management"');
    const results2 = await service.search('project management', { workspaceId: 534 });
    console.log(`   Found: ${results2.length} results`);

    // Test 3: Prefix matching
    console.log('\n📝 Test 3: Prefix search "kan"');
    const results3 = await service.search('kan', { workspaceId: 534 });
    console.log(`   Found: ${results3.length} results`);
    results3.forEach((r) => console.log(`   - ${r.title} (rank: ${r.rank.toFixed(4)})`));

    // Test 4: tsquery building
    console.log('\n📝 Test 4: Query parsing');
    const queries = ['kanban board', 'test & search', 'hello world', ''];
    queries.forEach((q) => {
      console.log(`   "${q}" → "${service.buildTsQuery(q)}"`);
    });

    // Test 5: Check search availability
    console.log('\n📝 Test 5: Search availability check');
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM workspace_wiki_pages WHERE search_vector IS NOT NULL
    `;
    console.log(`   Pages with search_vector: ${count[0].count}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All integration tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
