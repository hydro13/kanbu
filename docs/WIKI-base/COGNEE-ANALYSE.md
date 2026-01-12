# Cognee Analyse - Kandidaat voor Wiki Knowledge Features

> **Datum:** Januari 2025
> **Repository:** https://github.com/topoteretes/cognee
> **Status:** Onderzocht en gevalideerd als kandidaat

## Samenvatting

Cognee is een open-source Python framework voor het bouwen van knowledge graphs uit ongestructureerde data. Na analyse blijkt het een sterke kandidaat voor de AI/knowledge features die we nodig hebben in ons wiki systeem.

**Kernvraag:** Welke onderdelen kunnen we "cherry-picken" voor Kanbu Wiki?

---

## Wat Cognee Doet

```
┌──────────────────────────────────────────────────────────────┐
│                    Cognee ECL Pipeline                        │
│                                                               │
│   Extract          Cognify              Load                  │
│   ┌─────┐         ┌─────────┐          ┌──────┐              │
│   │ Add │ ──────► │ Process │ ───────► │ Search│              │
│   │Data │         │ + Graph │          │ Query │              │
│   └─────┘         └─────────┘          └──────┘              │
│                                                               │
│   - Documenten    - Chunking           - Semantic search      │
│   - Tekst         - Entity extraction  - Graph traversal      │
│   - Code          - Relationship       - RAG completion       │
│                     detection          - Cypher queries       │
└──────────────────────────────────────────────────────────────┘
```

---

## De Kersen - Bruikbare Componenten

### 1. KnowledgeGraph Model

**Wat:** Pydantic data model voor nodes en edges.

```python
class Node(BaseModel):
    id: str
    name: str
    type: str          # "Person", "Concept", "WikiPage", etc.
    description: str

class Edge(BaseModel):
    source_node_id: str
    target_node_id: str
    relationship_name: str  # "relates_to", "mentions", "depends_on"

class KnowledgeGraph(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
```

**Waarom interessant:**
- Simpel maar effectief model
- Past perfect bij onze wiki cross-references
- Uitbreidbaar met custom properties

**Toepassing Kanbu Wiki:**
- WikiPage → Node
- [[Wiki Link]] → Edge
- @mentions → Edge (type: "mentions")
- Task references → Edge (type: "task_link")

---

### 2. TextChunker - Intelligente Tekst Segmentatie

**Wat:** Paragraph-based chunking met size limits.

**Kenmerken:**
- Respecteert paragraaf grenzen
- Configurable max chunk size
- Houdt context intact
- Batch processing support

**Waarom interessant:**
- Essentieel voor RAG (Retrieval Augmented Generation)
- Voorkomt dat zinnen midden in worden geknipt
- Optimaliseert voor embedding kwaliteit

**Toepassing Kanbu Wiki:**
- Wiki pagina's chunken voor semantic search
- Lange documenten splitsen voor LLM context
- Embeddings genereren per chunk

---

### 3. Entity & Relationship Extraction

**Wat:** LLM-based extractie van entiteiten en relaties uit tekst.

**Pipeline:**
```
Wiki Tekst → LLM Prompt → Structured Output → Knowledge Graph
```

**Kenmerken:**
- Custom graph models mogelijk
- Ontology support (voorgedefinieerde vocabulaire)
- Batch processing voor efficiency
- Filtering van ongeldige edges

**Waarom interessant:**
- **Automatische link discovery** - Vindt relaties die gebruiker niet expliciet maakte
- **Concept extraction** - Identificeert belangrijke termen
- **Cross-page connections** - Ontdekt verbanden tussen wiki pagina's

**Toepassing Kanbu Wiki:**
- Automatische [[suggested links]] genereren
- "Related pages" sectie vullen
- Knowledge graph visualisatie voeden
- Backlinks ontdekken die niet expliciet zijn

---

### 4. Search Types - Meerdere Zoek Modi

**Beschikbare search types:**

| Type | Beschrijving | Wiki Toepassing |
|------|--------------|-----------------|
| `GRAPH_COMPLETION` | Natural language Q&A met graph context | "Wat weten we over project X?" |
| `RAG_COMPLETION` | Traditionele RAG zonder graph | Snelle document search |
| `CHUNKS` | Ruwe tekst segmenten | Exacte passages vinden |
| `SUMMARIES` | Pre-generated samenvattingen | Quick overviews |
| `CYPHER` | Direct graph queries | Power users, debugging |

**Waarom interessant:**
- Verschillende use cases, één systeem
- Graph-aware search is uniek
- Combineert vector + graph databases

**Toepassing Kanbu Wiki:**
- Semantic search over alle wiki content
- "Ask the wiki" feature
- Smart autocomplete voor [[links]]

---

### 5. Database Adapters - Flexibele Storage

**Graph Databases:**
- Neo4j (enterprise, krachtige queries)
- Kuzu (embedded, lightweight)
- NetworkX (in-memory, development)

**Vector Databases:**
- pgvector (PostgreSQL extensie!)
- Qdrant (standalone, al geïnstalleerd op MAX)
- ChromaDB, LanceDB, Weaviate

**Waarom interessant:**
- **pgvector** past in onze bestaande PostgreSQL stack
- **Qdrant** draait al op MAX machine
- Neo4j voor complexe graph traversals

**Toepassing Kanbu Wiki:**
- pgvector voor embeddings (geen extra DB nodig)
- Optioneel: Neo4j voor graph visualisatie queries
- Qdrant als alternatief (al beschikbaar)

---

### 6. LLM Provider Flexibiliteit

**Ondersteunde providers:**

| Provider | Use Case |
|----------|----------|
| OpenAI | Cloud, snelle start, gpt-4o-mini |
| Anthropic | Cloud, Claude modellen |
| Gemini | Cloud, Google |
| **Ollama** | **Lokaal, privacy, geen kosten** |

**Waarom interessant:**
- **Ollama support** = lokale modellen mogelijk
- Geen vendor lock-in
- Privacy-sensitive wiki content blijft lokaal

**MAX Machine Capaciteit:**
```
CPU:  AMD RYZEN AI MAX+ 395 (16 cores, 32 threads)
RAM:  123 GB (!)
NPU:  XDNA 2 (50 TOPS) - /dev/accel0 actief
GPU:  Radeon 8060S (geïntegreerd)

→ Kan Llama 3 70B lokaal draaien
→ Geen cloud API nodig
→ Volledige privacy
```

---

## Extra Mogelijkheden

### Temporal Knowledge Graph
Cognee heeft een `temporal_cognify` mode die:
- Events en timestamps extraheert
- Tijdlijn-gebaseerde relaties maakt
- Handig voor: project historiek, changelog tracking

### Code Analysis
Speciaal search type voor code:
- Functie/class herkenning
- Import analysis
- Handig voor: technische wiki's, API documentatie

### Ontology Support
Custom vocabulaire definiëren:
- Voorgedefinieerde entity types
- Relationship constraints
- Handig voor: domein-specifieke wiki's (medisch, juridisch, etc.)

### Summarization Pipeline
Automatische samenvattingen:
- Per chunk
- Hiërarchisch (pagina → sectie → paragraaf)
- Handig voor: "TL;DR" feature, hover previews

---

## Mapping naar Kanbu Wiki Requirements

| Wiki Feature | Cognee Component | Status |
|--------------|------------------|--------|
| `[[Wiki Links]]` | KnowledgeGraph Edge model | Direct toepasbaar |
| Backlinks | Entity extraction + Edge queries | Direct toepasbaar |
| Semantic search | TextChunker + pgvector | Direct toepasbaar |
| Graph visualisatie | Neo4j adapter + Cypher queries | Beschikbaar |
| "Related pages" | GRAPH_COMPLETION search | Direct toepasbaar |
| Auto-suggest links | Entity extraction | Direct toepasbaar |
| @mentions | Edge type extension | Uitbreidbaar |
| Task links | Edge type extension | Uitbreidbaar |
| Hover cards | Summarization + CHUNKS search | Beschikbaar |
| "Ask the wiki" | RAG_COMPLETION / GRAPH_COMPLETION | Direct toepasbaar |

---

## Architectuur Voorstel

```
┌─────────────────────────────────────────────────────────────────┐
│                      Kanbu Wiki + Cognee                         │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     │
│  │ Lexical      │     │ Cognee       │     │ Storage      │     │
│  │ Editor       │────►│ Pipeline     │────►│              │     │
│  │              │     │              │     │ PostgreSQL   │     │
│  │ - Rich text  │     │ - Chunking   │     │ + pgvector   │     │
│  │ - [[Links]]  │     │ - Extraction │     │              │     │
│  │ - @mentions  │     │ - Embedding  │     │ Neo4j/Kuzu   │     │
│  └──────────────┘     └──────────────┘     │ (graph)      │     │
│         │                    │             └──────────────┘     │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Search & Query                         │   │
│  │  - Semantic search (vector)                               │   │
│  │  - Graph traversal (relationships)                        │   │
│  │  - RAG completion (AI answers)                            │   │
│  │  - Cypher queries (advanced)                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    User Features                          │   │
│  │  - [[Auto-suggest links]]                                 │   │
│  │  - Related pages sidebar                                  │   │
│  │  - Graph visualization (D3.js)                            │   │
│  │  - "Ask the wiki" chatbox                                 │   │
│  │  - Hover cards met previews                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conclusie

**Cognee is een sterke kandidaat** voor de knowledge graph en AI features in Kanbu Wiki.

### Sterke Punten
1. **Modulair** - We kunnen specifieke componenten cherry-picken
2. **Database flexibel** - pgvector past in bestaande stack
3. **Lokaal mogelijk** - Ollama + MAX hardware = geen cloud nodig
4. **Bewezen patterns** - Entity extraction, RAG, graph queries
5. **Open source** - MIT license, aanpasbaar

### Te Onderzoeken
1. Performance bij grote wiki's (1000+ pagina's)
2. Integratie met Lexical editor events
3. Incremental updates (niet hele wiki re-indexen)
4. Real-time suggestions tijdens typen

### Volgende Stappen
1. Proof of concept: Cognee pipeline op test wiki content
2. pgvector integratie in Kanbu PostgreSQL
3. Entity extraction prompts tunen voor wiki context
4. Graph visualisatie component bouwen (D3.js)

---

## Referenties

- [Cognee GitHub](https://github.com/topoteretes/cognee)
- [Cognee Docs](https://docs.cognee.ai)
- Geïndexeerd in MAX vector store: `cognee` (23,711 chunks)
- Lokale clone: `/home/robin/repos/cognee/`
