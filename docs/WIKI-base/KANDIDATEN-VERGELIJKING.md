# Knowledge Graph Kandidaten Vergelijking

> **Datum:** Januari 2025
> **Doel:** Beste framework vinden voor Kanbu Wiki knowledge features
> **Status:** Research compleet

---

## Executive Summary

Na uitgebreid onderzoek zijn er **8 serieuze kandidaten** gevonden naast Cognee. De meest interessante voor onze wiki use case zijn:

| Rank | Framework | Waarom Interessant |
|------|-----------|-------------------|
| 🥇 | **LightRAG** | 99% minder tokens, simpel, snel, academisch bewezen |
| 🥈 | **Graphiti (Zep)** | Temporal awareness, real-time updates, 20K+ GitHub stars |
| 🥉 | **Cognee** | Volledig pakket, Ollama support, goede docs |
| 4 | **nano-graphrag** | Ultra-lightweight, makkelijk te embedden |
| 5 | **Microsoft GraphRAG** | De "gold standard", maar zwaar |

---

## Kandidaat 1: LightRAG ⭐⭐⭐⭐⭐

> **"Simple and Fast Retrieval-Augmented Generation"**

**Repository:** [github.com/HKUDS/LightRAG](https://github.com/HKUDS/LightRAG)
**Ontwikkelaar:** University of Hong Kong
**Publicatie:** EMNLP 2025 (academisch peer-reviewed)

### Waarom LightRAG Opvalt

```
┌─────────────────────────────────────────────────────────────┐
│                    LightRAG Architecture                     │
│                                                              │
│   Text Input                                                 │
│       │                                                      │
│       ▼                                                      │
│   ┌─────────────────────────────────────────┐               │
│   │  Dual-Level Retrieval System            │               │
│   │  ┌─────────────┐  ┌─────────────────┐   │               │
│   │  │ Low-Level   │  │ High-Level      │   │               │
│   │  │ (Entities)  │  │ (Relationships) │   │               │
│   │  └─────────────┘  └─────────────────┘   │               │
│   └─────────────────────────────────────────┘               │
│       │                                                      │
│       ▼                                                      │
│   Knowledge Graph + Vector Index (Hybrid)                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Stats

| Metric | LightRAG | Traditional RAG | GraphRAG |
|--------|----------|-----------------|----------|
| Token usage | **1%** | 100% | 50-80% |
| API calls | **1** | Multiple | Multiple |
| Performance | +86.4% | Baseline | +40% |
| Setup complexity | Low | Low | High |

### Sterke Punten voor Wiki

1. **99% minder tokens** = dramatisch lagere kosten
2. **Incremental updates** = geen volledige re-index nodig
3. **Dual-level retrieval** = zowel entiteiten als relaties
4. **Academisch bewezen** = peer-reviewed research
5. **Open source** = MIT license

### Mogelijke Nadelen

- Minder enterprise features dan Cognee
- Geen built-in Ollama support (moet zelf configureren)
- Jonger project, minder community

### Relevantie voor Kanbu Wiki

| Wiki Feature | LightRAG Support |
|--------------|------------------|
| Semantic search | ✅ Excellent |
| Entity extraction | ✅ Built-in |
| Relationship mapping | ✅ Dual-level |
| Incremental updates | ✅ Native |
| Local LLM | ⚠️ Configureerbaar |
| Graph visualization | ❌ Niet built-in |

**Verdict:** Zeer sterke kandidaat voor kostenefficiënte, snelle knowledge retrieval.

---

## Kandidaat 2: Graphiti (Zep) ⭐⭐⭐⭐⭐

> **"Build Real-Time Knowledge Graphs for AI Agents"**

**Repository:** [github.com/getzep/graphiti](https://github.com/getzep/graphiti)
**Ontwikkelaar:** Zep
**GitHub Stars:** 20,000+

### Waarom Graphiti Opvalt

```
┌─────────────────────────────────────────────────────────────┐
│                 Graphiti Temporal Model                      │
│                                                              │
│   Episode 1 ──► Episode 2 ──► Episode 3 ──► ...             │
│       │             │             │                          │
│       ▼             ▼             ▼                          │
│   ┌─────────────────────────────────────────────┐           │
│   │           Bi-Temporal Knowledge Graph        │           │
│   │                                              │           │
│   │   Event Time: When did this happen?          │           │
│   │   Ingestion Time: When did we learn this?    │           │
│   │                                              │           │
│   │   → Point-in-time queries mogelijk           │           │
│   │   → "Wat wisten we op datum X?"              │           │
│   └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Unieke Features

1. **Bi-Temporal Model** - Zowel event time als ingestion time
2. **Incremental Updates** - Geen batch recomputation
3. **P95 Latency: 300ms** - Zeer snel
4. **MCP Server** - Direct integreerbaar met Claude!
5. **Neo4j/Kuzu/FalkorDB** - Meerdere graph backends

### Research Paper

Zep publiceerde een paper met benchmark resultaten:
- **DMR Benchmark:** 94.8% vs 93.4% (beter dan alternatieven)
- Focus op conversational memory en enterprise data

### Sterke Punten voor Wiki

1. **Temporal awareness** = Perfect voor wiki versie historie
2. **Real-time updates** = Geen wachten op re-indexing
3. **MCP integration** = Direct bruikbaar met Claude Code
4. **Enterprise-ready** = Zep biedt ook hosted versie

### Mogelijke Nadelen

- Primair gebouwd voor AI agents, niet wiki's
- Complexere setup dan LightRAG
- Minder focus op document chunking

### Relevantie voor Kanbu Wiki

| Wiki Feature | Graphiti Support |
|--------------|------------------|
| Semantic search | ✅ Good |
| Entity extraction | ✅ Built-in |
| Version history | ✅ **Excellent** (bi-temporal) |
| Real-time updates | ✅ **Excellent** |
| MCP integration | ✅ **Native** |
| Graph visualization | ⚠️ Via Neo4j |

**Verdict:** Uitstekend voor wiki's waar versie historie en temporal queries belangrijk zijn.

---

## Kandidaat 3: Microsoft GraphRAG ⭐⭐⭐⭐

> **"A modular graph-based Retrieval-Augmented Generation system"**

**Repository:** [github.com/microsoft/graphrag](https://github.com/microsoft/graphrag)
**Ontwikkelaar:** Microsoft Research
**Status:** De "gold standard" voor Graph RAG

### Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│              Microsoft GraphRAG Pipeline                     │
│                                                              │
│   Documents                                                  │
│       │                                                      │
│       ▼                                                      │
│   Entity Extraction ──► Community Detection                  │
│       │                        │                             │
│       ▼                        ▼                             │
│   Knowledge Graph        Community Summaries                 │
│       │                        │                             │
│       └────────┬───────────────┘                             │
│                ▼                                              │
│   ┌─────────────────────────────────────────┐               │
│   │  Query Modes:                           │               │
│   │  • Global Search (holistic questions)   │               │
│   │  • Local Search (specific entities)     │               │
│   │  • DRIFT Search (community context)     │               │
│   └─────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Sterke Punten

1. **Community Detection** - Ontdekt clusters van gerelateerde content
2. **Hierarchical Summaries** - Van detail naar overzicht
3. **3 Query Modes** - Global, Local, DRIFT
4. **Microsoft backing** - Actief onderhouden
5. **Research-backed** - Veel academische citations

### Mogelijke Nadelen

1. **Zwaar** - Veel compute voor indexing
2. **Batch-only** - Geen real-time incremental updates
3. **Complex setup** - Meer configuratie nodig
4. **Token-intensief** - Duurder dan LightRAG

### Relevantie voor Kanbu Wiki

| Wiki Feature | GraphRAG Support |
|--------------|------------------|
| Semantic search | ✅ Excellent |
| Community discovery | ✅ **Unique feature** |
| Hierarchical summaries | ✅ Built-in |
| Incremental updates | ❌ Batch only |
| Local LLM | ⚠️ Configureerbaar |
| Setup complexity | ❌ High |

**Verdict:** Krachtig maar mogelijk overkill voor wiki. Beter voor grote document corpora.

---

## Kandidaat 4: RAGFlow ⭐⭐⭐⭐

> **"Open-source RAG engine with Agent capabilities"**

**Repository:** [github.com/infiniflow/ragflow](https://github.com/infiniflow/ragflow)
**Ontwikkelaar:** InfiniFlow

### Unieke Features

1. **Visual Web Interface** - Dashboard voor document management
2. **GraphRAG Support** - Knowledge graph creation
3. **Agentic Reasoning** - Complex query resolution
4. **Multi-Embedding** - Verschillende embedding models
5. **Elasticsearch + Infinity** - Flexible storage

### Sterke Punten voor Wiki

- **UI Dashboard** - Direct bruikbaar zonder custom frontend
- **Document parsing** - Layout recognition
- **Template chunking** - Configureerbare strategieën

### Mogelijke Nadelen

- Meer focus op document management dan knowledge graphs
- UI is fixed, minder flexibel te integreren
- Grotere footprint

**Verdict:** Interessant als je een complete oplossing wilt, maar minder geschikt voor embedding in Kanbu.

---

## Kandidaat 5: nano-graphrag ⭐⭐⭐⭐

> **"Lightweight GraphRAG implementation"**

**Repository:** [github.com/gusye1234/nano-graphrag](https://github.com/gusye1234/nano-graphrag)

### Waarom Interessant

```python
# nano-graphrag in ~500 lines of code
from nano_graphrag import GraphRAG

rag = GraphRAG(working_dir="./wiki_graph")
rag.insert("Your wiki content here...")
result = rag.query("What are the main topics?")
```

### Sterke Punten

1. **Ultra-lightweight** - Kleine codebase, makkelijk te begrijpen
2. **Easy to embed** - Direct in bestaande applicatie
3. **Local-first** - Privacy-friendly
4. **Customizable** - Makkelijk aan te passen

### Mogelijke Nadelen

- Minder features dan volledige GraphRAG
- Kleinere community
- Minder documentatie

**Verdict:** Perfect voor proof-of-concept of als je volledige controle wilt.

---

## Kandidaat 6: KGGen ⭐⭐⭐

> **"Extracting Knowledge Graphs from Plain Text"**

**Repository:** PyPI: `pip install kg-gen`
**Paper:** [arxiv.org/html/2502.09956v1](https://arxiv.org/html/2502.09956v1)

### Key Claim

> "KGGen outperforms leading existing text-to-KG extractors by **18%**"

### Features

- LLM + clustering algorithm voor KG extraction
- Pure Python library
- Focus op extraction quality

**Verdict:** Interessant als component, niet als volledig framework.

---

## Kandidaat 7: LlamaIndex ⭐⭐⭐

> **"Data framework for LLM applications"**

**Repository:** [github.com/run-llama/llama_index](https://github.com/run-llama/llama_index)

### Sterke Punten

- Mature ecosystem
- Veel integrations
- Graph index support
- Enterprise adoption

### Mogelijke Nadelen

- General purpose, niet specifiek voor knowledge graphs
- Kan overkill zijn voor wiki use case

**Verdict:** Goede keuze als je al in het LlamaIndex ecosystem zit.

---

## Vergelijkingstabel

| Feature | Cognee | LightRAG | Graphiti | GraphRAG | nano |
|---------|--------|----------|----------|----------|------|
| **Setup** | Medium | Easy | Medium | Hard | Easy |
| **Token efficiency** | Good | **Best** | Good | Poor | Good |
| **Incremental updates** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Temporal queries** | ❌ | ❌ | **✅** | ❌ | ❌ |
| **Community detection** | ❌ | ❌ | ❌ | **✅** | ❌ |
| **Local LLM (Ollama)** | **✅** | ⚠️ | ⚠️ | ⚠️ | ✅ |
| **MCP integration** | ❌ | ❌ | **✅** | ❌ | ❌ |
| **Graph visualization** | Via Neo4j | ❌ | Via Neo4j | ❌ | ❌ |
| **Documentation** | Good | Good | Good | Excellent | Basic |
| **GitHub Stars** | ~2K | ~8K | ~20K | ~25K | ~3K |
| **License** | MIT | MIT | Apache 2 | MIT | MIT |

---

## Aanbeveling voor Kanbu Wiki

### Optie A: LightRAG + Custom Graph Viz

**Best voor:** Kostenefficiëntie, snelheid, academisch bewezen

```
LightRAG (extraction + search)
    │
    ├── pgvector (embeddings)
    ├── Custom D3.js (visualization)
    └── Ollama (local LLM)
```

**Pro:** 99% minder tokens, simpele architectuur
**Con:** Moet graph viz zelf bouwen

---

### Optie B: Graphiti + Neo4j

**Best voor:** Temporal features, enterprise-ready

```
Graphiti (knowledge graph)
    │
    ├── Neo4j (graph storage + queries)
    ├── MCP Server (Claude integration)
    └── Native temporal queries
```

**Pro:** Versie historie, real-time updates
**Con:** Complexere setup, meer dependencies

---

### Optie C: Cognee (oorspronkelijke keuze)

**Best voor:** All-in-one oplossing, bewezen Ollama support

```
Cognee (complete pipeline)
    │
    ├── pgvector (past in PostgreSQL)
    ├── TextChunker (proven)
    └── Ollama (native support)
```

**Pro:** Complete oplossing, goede docs
**Con:** Minder gespecialiseerd

---

### Optie D: Hybrid Approach

**Best voor:** Maximale flexibiliteit

```
┌─────────────────────────────────────────┐
│         Kanbu Wiki Hybrid Stack          │
│                                          │
│   LightRAG          Graphiti             │
│   (efficiency)      (temporal)           │
│       │                 │                │
│       └────────┬────────┘                │
│                │                         │
│       ┌────────▼────────┐               │
│       │   Shared Layer   │               │
│       │  - pgvector      │               │
│       │  - Neo4j         │               │
│       │  - Ollama        │               │
│       └─────────────────┘               │
└─────────────────────────────────────────┘
```

---

## Volgende Stappen

1. **Proof of Concept** - Test top 2-3 kandidaten op sample wiki content
2. **Benchmark** - Meet token usage, latency, accuracy
3. **Integration test** - Hoe goed past het in Kanbu architectuur?
4. **Beslissing** - Kies framework of hybrid approach

---

## Bronnen

- [Morphik Blog - RAG Frameworks Guide](https://www.morphik.ai/blog/guide-to-oss-rag-frameworks-for-developers)
- [LightRAG Paper (EMNLP 2025)](https://aclanthology.org/2025.findings-emnlp.568/)
- [Graphiti - Neo4j Blog](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/)
- [Microsoft GraphRAG Docs](https://microsoft.github.io/graphrag/)
- [Zep Temporal KG Paper](https://blog.getzep.com/content/files/2025/01/ZEP__USING_KNOWLEDGE_GRAPHS_TO_POWER_LLM_AGENT_MEMORY_2025011700.pdf)
- [Medium - From LLMs to Knowledge Graphs 2025](https://medium.com/@claudiubranzan/from-llms-to-knowledge-graphs-building-production-ready-graph-systems-in-2025-2b4aff1ec99a)
- [Sider - GraphRAG Alternatives](https://sider.ai/blog/ai-tools/best-graphrag-alternatives-to-try-in-2025)
