# Feature Matrix: Graphiti vs Kanbu

> **Analyse datum:** 2026-01-13
> **Graphiti versie:** Main branch (geïndexeerd 2026-01-12)
> **Kanbu versie:** Fase 15.x

---

## Legenda

| Symbool | Betekenis |
|---------|-----------|
| ✅ | Volledig geïmplementeerd |
| ⚠️ | Deels geïmplementeerd |
| ❌ | Niet geïmplementeerd |
| 🔧 | Aanwezig maar broken |
| N/A | Niet van toepassing |

---

## 1. Data Model

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **Node Types** |
| Entity nodes | ✅ EntityNode | ✅ Concept/Person/Task/Project | Andere namen, zelfde concept |
| Episode nodes | ✅ EpisodicNode | ⚠️ WikiPage | WikiPage bevat minder metadata |
| Community nodes | ✅ CommunityNode | ❌ | Voor clustering/summarization |
| **Edge Types** |
| Entity-Entity edges | ✅ EntityEdge | ✅ MENTIONS | Kanbu mist temporal fields |
| Episode-Entity edges | ✅ EpisodicEdge | ⚠️ Impliciet | Via pageId, niet expliciet |
| Community edges | ✅ CommunityEdge | ❌ | |
| **Temporal Fields** |
| created_at | ✅ | ✅ updatedAt | Kanbu heeft alleen updatedAt |
| expired_at | ✅ | ❌ | Wanneer record vervangen |
| valid_at | ✅ | ❌ | Wanneer feit waar werd |
| invalid_at | ✅ | ❌ | Wanneer feit stopte |
| **Embeddings** |
| Node name embedding | ✅ In FalkorDB | ❌ | |
| Edge fact embedding | ✅ In FalkorDB | ❌ | Kanbu: page embeddings in Qdrant |
| Batch embedding | ✅ | ✅ | |

---

## 2. Entity Extraction

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **LLM Extraction** |
| Extract entities from text | ✅ extract_nodes.py | ✅ WikiAiService.extractEntities() | |
| Extract relations | ✅ extract_edges.py | ⚠️ Rules-based + LLM | Kanbu: minder geavanceerd |
| Entity type classification | ✅ | ⚠️ | Kanbu: basis types |
| Custom entity types | ✅ | ❌ | Graphiti: edge_type_map |
| **Reflexion** |
| Missing entity detection | ✅ reflexion prompts | ❌ | |
| Multi-pass extraction | ✅ | ❌ | |
| **Chunking** |
| Large text chunking | ✅ _extract_nodes_chunked | ❌ | Kanbu: max 8000 chars |

---

## 3. Temporal Intelligence

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **Date Extraction** |
| Extract valid_at from text | ✅ extract_edge_dates() | ❌ | LLM-based |
| Extract invalid_at from text | ✅ extract_edge_dates() | ❌ | LLM-based |
| Relative time handling | ✅ "10 years ago" | ❌ | |
| Reference timestamp | ✅ | ❌ | |
| **Contradiction Detection** |
| Detect conflicting facts | ✅ get_edge_contradictions() | ❌ | LLM compares facts |
| Auto-invalidate old edges | ✅ resolve_edge_contradictions() | ❌ | |
| Temporal overlap detection | ✅ | ❌ | |
| **Temporal Queries** |
| "As of date" queries | ✅ | 🔧 | Kanbu: endpoint exists but broken |
| Historical fact retrieval | ✅ | ❌ | |
| Audit trail | ✅ via expired_at | ❌ | |

---

## 4. Search Capabilities

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **Vector Search** |
| Semantic search | ✅ | ✅ WikiEmbeddingService | |
| Page embeddings | ✅ In graph | ✅ In Qdrant | Andere storage |
| Edge embeddings | ✅ fact_embedding | ❌ | |
| Node embeddings | ✅ name_embedding | ❌ | |
| **Text Search** |
| BM25 search | ✅ | ❌ | Keyword matching |
| Full-text search | ✅ | ⚠️ | Kanbu: basis text search |
| **Hybrid Search** |
| Vector + Text fusion | ✅ RRF | ⚠️ | Kanbu: apart, niet gefuseerd |
| Graph traversal in search | ✅ | ❌ | |
| **Temporal Search** |
| Filter by date range | ✅ | 🔧 | Broken in Kanbu |
| "What was true on X" | ✅ | ❌ | |

---

## 5. LLM Integration

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **Providers** |
| OpenAI | ✅ | ✅ | |
| Anthropic | ✅ | ❌ | |
| Groq | ✅ | ❌ | |
| Ollama | ❌ | ✅ | Kanbu heeft local LLM |
| LM Studio | ❌ | ✅ | Kanbu heeft local LLM |
| **Model Management** |
| Model size selection | ✅ small/medium/large | ⚠️ | Kanbu: per provider config |
| Fallback chain | ❌ | ✅ | Kanbu: Python → WikiAI → Rules |
| Per-workspace config | ❌ | ✅ | Fase 14 provider registry |
| **Prompts** |
| Entity extraction prompts | ✅ | ✅ | Verschillende implementaties |
| Date extraction prompts | ✅ | ❌ | |
| Contradiction prompts | ✅ | ❌ | |
| Deduplication prompts | ✅ | ❌ | |

---

## 6. Graph Operations

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **CRUD** |
| Create nodes | ✅ | ✅ | |
| Update nodes | ✅ | ✅ | |
| Delete nodes | ✅ cascade | ⚠️ | Kanbu: handmatig |
| Create edges | ✅ | ✅ | |
| **Batch Operations** |
| Bulk node insert | ✅ | ⚠️ | |
| Bulk edge resolution | ✅ | ❌ | |
| **Deduplication** |
| Exact match dedup | ✅ | ❌ | |
| Fuzzy dedup | ✅ LLM | ❌ | |
| IS_DUPLICATE_OF edges | ✅ | ❌ | |

---

## 7. Database Support

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| Neo4j | ✅ | ❌ | |
| FalkorDB | ✅ | ✅ | Beide ondersteunen |
| Kuzu | ✅ | ❌ | Embedded graph DB |
| Neptune | ✅ | ❌ | AWS managed |
| Qdrant | ❌ | ✅ | Kanbu: apart voor vectors |

---

## 8. Additional Features

| Feature | Graphiti | Kanbu | Notities |
|---------|----------|-------|----------|
| **Communities** |
| Community detection | ✅ | ❌ | Entity clustering |
| Community summaries | ✅ | ❌ | LLM summarization |
| **Visualization** |
| Graph visualization | ⚠️ Via API | ✅ | Kanbu: WikiGraphVisualization |
| Timeline view | ❌ | 🔧 WikiTemporalSearch | Broken |
| **Backlinks** |
| Bidirectional links | ✅ | ✅ | |
| Reference tracking | ✅ episodes[] | ⚠️ | |
| **Telemetry** |
| Usage tracking | ✅ PostHog (opt-out) | ❌ | Kanbu: disabled |

---

## Score Summary

| Categorie | Graphiti | Kanbu | Gap |
|-----------|----------|-------|-----|
| Data Model | 15/15 | 8/15 | -7 |
| Entity Extraction | 8/8 | 4/8 | -4 |
| Temporal Intelligence | 9/9 | 1/9 | -8 |
| Search | 8/8 | 4/8 | -4 |
| LLM Integration | 5/8 | 6/8 | +1 |
| Graph Operations | 6/6 | 3/6 | -3 |
| Database Support | 4/4 | 2/4 | -2 |
| Additional | 5/6 | 3/6 | -2 |
| **TOTAAL** | **60/64** | **31/64** | **-29** |

---

## Conclusie

**Kanbu mist voornamelijk:**
1. Bi-temporal model (valid_at/invalid_at) - -8 punten
2. Contradiction detection - onderdeel van temporal
3. Edge embeddings - -4 punten op search
4. Community detection - -2 punten

**Kanbu heeft extra:**
1. Multi-provider support (Ollama, LM Studio) - +1 punt
2. Per-workspace provider config - niet in Graphiti
3. Fallback chain architecture - robuuster

---

*Gegenereerd door Claude Code analyse - 2026-01-13*
