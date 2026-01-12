# Kanbu Graphiti Service

Knowledge graph service for Kanbu Wiki, based on [Graphiti](https://github.com/getzep/graphiti).

## Features

- **Episode Management**: Store wiki pages as temporal episodes
- **LLM Entity Extraction**: Automatic entity and relationship extraction
- **Semantic Search**: Vector-based search with embeddings
- **Temporal Queries**: "What did we know at time X?"
- **Graph Visualization**: Export graph data for D3.js visualization

## Architecture

```
FastAPI (port 8000)
    │
    ├── /episodes      - Add/list/delete episodes
    ├── /search        - Semantic search
    ├── /search/temporal - Temporal queries
    ├── /graph         - Graph data for visualization
    ├── /health        - Health check
    └── /stats         - Statistics
    │
    ▼
graphiti_core
    │
    ├── LLM Client (OpenAI/Anthropic)
    ├── Embedder (OpenAI/Voyage)
    └── FalkorDB Driver
         │
         ▼
    FalkorDB (port 6379)
```

## Running

### Via Docker Compose (recommended)

```bash
cd docker
docker compose up -d graphiti
```

### Local Development

```bash
cd apps/graphiti
uv pip install -e .
uvicorn src.api.main:app --reload --port 8000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FALKORDB_URI` | FalkorDB connection URI | `redis://localhost:6379` |
| `OPENAI_API_KEY` | OpenAI API key for LLM/embeddings | - |
| `EMBEDDING_PROVIDER` | Embedding provider (openai/voyage) | `openai` |
| `EMBEDDING_MODEL` | Embedding model name | `text-embedding-3-small` |

## API Endpoints

### POST /episodes
Add a wiki page as an episode to the knowledge graph.

### POST /episodes/list
List episodes for a group.

### DELETE /episodes/{uuid}
Delete an episode.

### POST /search
Search the knowledge graph.

### POST /search/temporal
Temporal search - "What did we know at time X?"

### POST /graph
Get graph data for visualization.

### GET /health
Health check endpoint.

### GET /stats
Get graph statistics.
