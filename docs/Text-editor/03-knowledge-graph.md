# Knowledge Graph & RAG Integration

## Vision

The Kanbu knowledge system goes beyond a traditional wiki by leveraging:

1. **Bi-directional Links** - Foam/Obsidian-like [[wiki-links]]
2. **Knowledge Graph** - Visual representation of connections
3. **RAG (Retrieval Augmented Generation)** - AI-powered search and suggestions
4. **Automatic Linking** - Suggestions for relevant connections

## Foam-like Features

### Bi-directional Links

Every `[[link]]` is automatically bi-directional:

```
Page A: "See [[Page B]] for details"
         ↓
Page B: Backlinks section shows "Page A"
```

### Daily Notes (optional)

Automatic daily notes for journals/standups:

```
/wiki/daily/2026-01-07
/wiki/daily/2026-01-08
```

### Graph View

Interactive visualization of all pages and their connections:

```
        ┌──────────┐
        │ Page A   │
        └────┬─────┘
             │
     ┌───────┼───────┐
     │       │       │
     ▼       ▼       ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Page B │ │ Page C │ │ Page D │
└────────┘ └───┬────┘ └────────┘
               │
               ▼
          ┌────────┐
          │ Page E │
          └────────┘
```

## Knowledge Graph Data Model

### Graph Nodes

```typescript
interface GraphNode {
  id: string; // "page:123" or "task:456"
  type: 'page' | 'task' | 'user' | 'tag' | 'workspace' | 'project';
  label: string;
  metadata: {
    url: string;
    icon?: string;
    color?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}
```

### Graph Edges

```typescript
interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: EdgeType;
  weight: number; // Strength of connection
  metadata: {
    createdAt: Date;
    context?: string; // Where the link appears
  };
}

type EdgeType =
  | 'wiki-link' // [[Page]] reference
  | 'task-link' // #TASK-123 reference
  | 'mention' // @user mention
  | 'tag' // Shared tag
  | 'semantic' // AI-detected similarity
  | 'hierarchy'; // Parent/child relationship
```

### Graph Storage

```sql
-- Nodes table
CREATE TABLE graph_nodes (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  label TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536),          -- For semantic search
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Edges table
CREATE TABLE graph_edges (
  id SERIAL PRIMARY KEY,
  source_id VARCHAR(255) REFERENCES graph_nodes(id),
  target_id VARCHAR(255) REFERENCES graph_nodes(id),
  edge_type VARCHAR(50) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, target_id, edge_type)
);

-- Indexes
CREATE INDEX idx_edges_source ON graph_edges(source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_id);
CREATE INDEX idx_edges_type ON graph_edges(edge_type);
```

## RAG Integration

### Architecture

```
User Query
    │
    ▼
┌─────────────────┐
│ Query Embedding │ ← OpenAI/local model
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vector Search  │ ← Qdrant
│    (Qdrant)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Re-ranking    │ ← Cross-encoder
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context Window  │ ← Top K results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Response   │ ← GPT-4 / Claude
└─────────────────┘
```

### Embedding Pipeline

```typescript
interface EmbeddingPipeline {
  // 1. Content preparation
  prepareContent(page: WikiPage): string[]; // Split into chunks

  // 2. Generate embeddings
  generateEmbeddings(chunks: string[]): Promise<number[][]>;

  // 3. Store in vector DB
  storeEmbeddings(pageId: number, chunks: string[], embeddings: number[][]): Promise<void>;

  // 4. Search
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

interface SearchOptions {
  workspaceId?: number;
  projectId?: number;
  tags?: string[];
  limit?: number;
  threshold?: number; // Similarity threshold
}

interface SearchResult {
  pageId: number;
  page: WikiPage;
  chunk: string;
  score: number;
  highlight: string; // Highlighted match
}
```

### Chunking Strategy

```typescript
const CHUNK_CONFIG = {
  maxTokens: 512, // Max tokens per chunk
  overlap: 50, // Overlap between chunks
  separators: ['\n\n', '\n', '. ', ' '], // Split priorities
};

function chunkContent(content: string): string[] {
  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Find best split point
    const chunk = findChunkBoundary(remaining, CHUNK_CONFIG);
    chunks.push(chunk);
    remaining = remaining.slice(chunk.length - CHUNK_CONFIG.overlap);
  }

  return chunks;
}
```

### Qdrant Collection Schema

```typescript
// Collection: kanbu_wiki_pages
{
  "name": "kanbu_wiki_pages",
  "vectors": {
    "size": 1536,                  // OpenAI ada-002 dimensions
    "distance": "Cosine"
  },
  "payload_schema": {
    "page_id": "integer",
    "workspace_id": "integer",
    "project_id": "integer",
    "chunk_index": "integer",
    "chunk_text": "text",
    "tags": "keyword[]",
    "title": "text",
    "updated_at": "datetime"
  }
}
```

## Smart Features

### 1. Link Suggestions

When you type, the system suggests relevant links:

```typescript
interface LinkSuggestion {
  page: WikiPage;
  relevance: number; // 0-1 score
  reason: 'semantic' | 'tag' | 'recent' | 'popular';
  preview: string;
}

async function suggestLinks(
  currentContent: string,
  context: WikiContext
): Promise<LinkSuggestion[]> {
  // 1. Extract key terms
  const terms = extractKeyTerms(currentContent);

  // 2. Semantic search for similar pages
  const semanticMatches = await vectorSearch(terms.join(' '), {
    workspaceId: context.workspaceId,
    exclude: [context.currentPageId],
  });

  // 3. Tag-based matches
  const tagMatches = await findPagesWithTags(context.currentTags);

  // 4. Recently edited in same project
  const recentMatches = await getRecentPages(context.projectId);

  // 5. Combine and rank
  return rankSuggestions([...semanticMatches, ...tagMatches, ...recentMatches]);
}
```

### 2. Auto-tagging

AI-powered tag suggestions:

```typescript
async function suggestTags(content: string): Promise<TagSuggestion[]> {
  // 1. Extract from content using NLP
  const extractedTags = await extractTopics(content);

  // 2. Match against existing tags
  const existingTags = await findMatchingTags(extractedTags);

  // 3. Suggest new tags if needed
  const newTagSuggestions = extractedTags
    .filter((t) => !existingTags.some((e) => e.name === t))
    .map((t) => ({ name: t, isNew: true }));

  return [...existingTags, ...newTagSuggestions];
}
```

### 3. Related Content

Show related content at the bottom of each page:

```typescript
interface RelatedContent {
  pages: WikiPage[]; // Similar wiki pages
  tasks: Task[]; // Related tasks
  discussions: Comment[]; // Related discussions
}

async function findRelatedContent(pageId: number): Promise<RelatedContent> {
  const page = await getPage(pageId);

  // 1. Vector similarity
  const similarPages = await vectorSearch(page.plainText, {
    limit: 5,
    exclude: [pageId],
  });

  // 2. Shared tags
  const taggedPages = await findPagesWithTags(page.tags, {
    limit: 5,
    exclude: [pageId],
  });

  // 3. Tasks that reference this page
  const linkedTasks = await findTasksReferencingPage(pageId);

  // 4. Combine unique results
  return {
    pages: dedupePages([...similarPages, ...taggedPages]),
    tasks: linkedTasks,
    discussions: await findDiscussionsAboutPage(pageId),
  };
}
```

### 4. Knowledge Gap Detection

Identify missing documentation:

```typescript
interface KnowledgeGap {
  topic: string; // What's missing
  evidence: string[]; // Why we think it's missing
  suggestedTitle: string; // Suggested page title
  relatedPages: WikiPage[]; // Related existing pages
}

async function detectKnowledgeGaps(workspaceId: number): Promise<KnowledgeGap[]> {
  // 1. Find broken links (pages that don't exist)
  const brokenLinks = await findBrokenLinks(workspaceId);

  // 2. Find frequently searched but not found
  const missedSearches = await getMissedSearches(workspaceId);

  // 3. Analyze task descriptions for undocumented topics
  const undocumentedTopics = await analyzeTasksForGaps(workspaceId);

  return [...brokenLinks, ...missedSearches, ...undocumentedTopics];
}
```

## Graph Visualization

### D3.js Force Graph

```typescript
import * as d3 from 'd3';

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (node: GraphNode | null) => void;
  highlightNode?: string;          // Currently selected node
  filterTags?: string[];           // Filter by tags
}

function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  onNodeHover,
  highlightNode,
  filterTags,
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Draw edges
    const link = svg.selectAll('.link')
      .data(edges)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6);

    // Draw nodes
    const node = svg.selectAll('.node')
      .data(nodes)
      .join('circle')
      .attr('class', 'node')
      .attr('r', d => getNodeSize(d))
      .attr('fill', d => getNodeColor(d))
      .call(drag(simulation))
      .on('click', (_, d) => onNodeClick(d))
      .on('mouseenter', (_, d) => onNodeHover(d))
      .on('mouseleave', () => onNodeHover(null));

    // Labels
    const label = svg.selectAll('.label')
      .data(nodes)
      .join('text')
      .attr('class', 'label')
      .text(d => d.label)
      .attr('font-size', 10);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x + 12)
        .attr('y', d => d.y + 4);
    });

    return () => simulation.stop();
  }, [nodes, edges]);

  return <svg ref={svgRef} width={width} height={height} />;
}
```

### Graph Controls

```
┌────────────────────────────────────────────────────┐
│ Knowledge Graph                          [⛶] [✕]  │
├────────────────────────────────────────────────────┤
│ ┌──────────────────┐                               │
│ │ 🔍 Filter...     │  [All] [Pages] [Tasks] [Tags]│
│ └──────────────────┘                               │
├────────────────────────────────────────────────────┤
│                                                    │
│     ○───────○                                      │
│    /│       │\                                     │
│   ○ │       │ ○                                    │
│     │       │                                      │
│     ○───────○                                      │
│      \     /                                       │
│       ○───○                                        │
│                                                    │
├────────────────────────────────────────────────────┤
│ Depth: [1] [2] [3]     Zoom: [-] [100%] [+]       │
└────────────────────────────────────────────────────┘
```

## AI-Powered Features

### 1. Question Answering

```typescript
async function answerQuestion(question: string, context: WikiContext): Promise<Answer> {
  // 1. Search for relevant content
  const relevantChunks = await vectorSearch(question, {
    workspaceId: context.workspaceId,
    limit: 10,
  });

  // 2. Build context
  const contextText = relevantChunks.map((c) => `[${c.page.title}]: ${c.chunk}`).join('\n\n');

  // 3. Generate answer with LLM
  const answer = await llm.complete({
    prompt: `Based on the following knowledge base content, answer the question.

Context:
${contextText}

Question: ${question}

Answer:`,
  });

  // 4. Return with sources
  return {
    answer: answer.text,
    sources: relevantChunks.map((c) => ({
      page: c.page,
      relevantText: c.chunk,
    })),
    confidence: calculateConfidence(relevantChunks),
  };
}
```

### 2. Content Summarization

```typescript
async function summarizePage(pageId: number): Promise<Summary> {
  const page = await getPage(pageId);

  const summary = await llm.complete({
    prompt: `Summarize the following content in 2-3 sentences:

${page.plainText}

Summary:`,
  });

  return {
    short: summary.text,
    keyPoints: await extractKeyPoints(page.plainText),
    relatedTopics: await extractTopics(page.plainText),
  };
}
```

### 3. Writing Assistance

```typescript
interface WritingAssistant {
  // Autocomplete suggestion
  suggest(currentText: string, cursorPosition: number): Promise<string>;

  // Improve writing
  improve(text: string, style: 'formal' | 'casual' | 'technical'): Promise<string>;

  // Fix grammar/spelling
  fix(text: string): Promise<CorrectionSuggestion[]>;

  // Expand outline to full content
  expand(outline: string): Promise<string>;
}
```

## Implementation Timeline

### Phase 1: Basic Graph

- Link extraction and storage
- Simple backlinks display
- Basic graph visualization

### Phase 2: RAG Foundation

- Embedding pipeline setup
- Qdrant integration
- Semantic search

### Phase 3: Smart Features

- Link suggestions
- Auto-tagging
- Related content

### Phase 4: Advanced AI

- Question answering
- Writing assistance
- Knowledge gap detection

## Performance Considerations

### Caching Strategy

```typescript
// Cache layers
const cacheConfig = {
  // L1: In-memory (per request)
  memory: {
    ttl: 60, // 1 minute
    maxSize: 1000, // Max entries
  },

  // L2: Redis (shared)
  redis: {
    ttl: 300, // 5 minutes
    prefix: 'wiki:',
  },

  // L3: CDN (static content)
  cdn: {
    ttl: 3600, // 1 hour
    paths: ['/api/wiki/pages/*/rendered'],
  },
};
```

### Embedding Updates

```typescript
// Background job for embedding updates
async function updateEmbeddingsJob() {
  // 1. Find pages updated since last run
  const updatedPages = await findPagesUpdatedSince(lastRun);

  // 2. Process in batches
  for (const batch of chunk(updatedPages, 10)) {
    await Promise.all(batch.map((page) => embeddingPipeline.processPage(page)));
  }

  // 3. Clean up old embeddings
  await cleanupOrphanedEmbeddings();
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', updateEmbeddingsJob);
```
