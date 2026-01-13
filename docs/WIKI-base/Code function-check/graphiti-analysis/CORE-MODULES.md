# Graphiti Core Modules Analyse

> **Bron:** `/home/robin/repos/graphiti/graphiti_core/`
> **Versie:** Geïndexeerd 2026-01-12
> **Analyse datum:** 2026-01-13

---

## Overzicht Architectuur

```
graphiti_core/
├── graphiti.py          # Main Graphiti class
├── nodes.py             # Node types (Entity, Episodic, Community)
├── edges.py             # Edge types (Entity, Episodic, Community)
├── embedder/            # Embedding abstraction
├── llm_client/          # LLM abstraction (OpenAI, Anthropic, Groq)
├── driver/              # Database drivers (Neo4j, FalkorDB, Kuzu, Neptune)
├── search/              # Hybrid search implementatie
├── prompts/             # LLM prompts voor alle operaties
└── utils/
    └── maintenance/     # Edge operations, temporal operations
```

---

## 1. Node Types (`nodes.py`)

### 1.1 Base Node Class

```python
class Node(BaseModel, ABC):
    uuid: str           # Unieke identifier
    name: str           # Naam van de node
    group_id: str       # Partition key (bijv. wiki page ID)
    labels: list[str]   # Type labels (Person, Organization, etc.)
    created_at: datetime
```

### 1.2 EpisodicNode - Bron Tracking

**Doel:** Track de originele content waaruit entities geëxtraheerd zijn.

```python
class EpisodicNode(Node):
    source: EpisodeType      # 'message' | 'json' | 'text'
    source_description: str  # Beschrijving van de bron
    content: str             # Raw episode data
    valid_at: datetime       # Wanneer document was gemaakt
    entity_edges: list[str]  # Links naar entity edges
```

**Kanbu equivalent:** WikiPage node (deels)

### 1.3 EntityNode - Geëxtraheerde Entities

**Doel:** Represent a real-world entity (person, concept, project, etc.)

```python
class EntityNode(Node):
    name_embedding: list[float] | None  # Vector embedding van naam
    summary: str                         # Regional summary van edges
    attributes: dict[str, Any]           # Extra attributen per type
```

**Kanbu equivalent:** Concept, Person, Task, Project nodes

### 1.4 CommunityNode - Clustering

**Doel:** Groepeer gerelateerde entities voor summarization.

```python
class CommunityNode(Node):
    name_embedding: list[float] | None
    summary: str  # Samenvatting van de community
```

**Kanbu equivalent:** Niet geïmplementeerd

---

## 2. Edge Types (`edges.py`)

### 2.1 EntityEdge - Relaties met Temporal Model

**Dit is het hart van Graphiti's bi-temporal model!**

```python
class EntityEdge(Edge):
    name: str                          # Relatie type (KNOWS, WORKS_AT, etc.)
    fact: str                          # Menselijke beschrijving van de relatie
    fact_embedding: list[float] | None # Vector embedding voor search
    episodes: list[str]                # Bronnen die deze edge refereren

    # BI-TEMPORAL VELDEN:
    created_at: datetime               # Wanneer we dit leerden
    expired_at: datetime | None        # Wanneer record vervangen werd
    valid_at: datetime | None          # Wanneer feit WAAR werd
    invalid_at: datetime | None        # Wanneer feit STOPTE waar te zijn

    attributes: dict[str, Any]         # Extra attributen
```

**Voorbeelden:**

| Scenario | valid_at | invalid_at | expired_at |
|----------|----------|------------|------------|
| "Jan werkt bij Acme" | 2020-01-15 | null | null |
| "Jan werkte bij Acme (gestopt)" | 2020-01-15 | 2024-06-01 | null |
| "Jan werkt bij Acme" → gecorrigeerd | 2020-01-15 | null | 2024-01-01 |

**Kanbu equivalent:** MENTIONS edge met alleen `updatedAt`

### 2.2 EpisodicEdge - Bron Links

```python
class EpisodicEdge(Edge):
    # Links Episode → Entity
    # Geen extra velden
```

**Kanbu equivalent:** Impliciet via pageId op edges

### 2.3 CommunityEdge - Membership

```python
class CommunityEdge(Edge):
    # Links Community → Entity
```

**Kanbu equivalent:** Niet geïmplementeerd

---

## 3. Temporal Operations (`utils/maintenance/temporal_operations.py`)

### 3.1 extract_edge_dates()

**Doel:** LLM bepaalt wanneer een feit waar werd/stopte.

```python
async def extract_edge_dates(
    llm_client: LLMClient,
    edge: EntityEdge,
    current_episode: EpisodicNode,
    previous_episodes: list[EpisodicNode],
) -> tuple[datetime | None, datetime | None]:
    # LLM prompt vraagt naar valid_at en invalid_at
    # Gebaseerd op episode content + reference timestamp
```

**LLM Prompt (samenvatting):**
- Input: fact, current episode, previous episodes, reference timestamp
- Output: valid_at (wanneer relatie begon), invalid_at (wanneer relatie eindigde)
- Handles relative time ("10 years ago") → absolute datetime

**Kanbu equivalent:** NIET GEÏMPLEMENTEERD

### 3.2 get_edge_contradictions()

**Doel:** Vind bestaande edges die contradicted worden door nieuwe edge.

```python
async def get_edge_contradictions(
    llm_client: LLMClient,
    new_edge: EntityEdge,
    existing_edges: list[EntityEdge],
) -> list[EntityEdge]:
    # LLM vergelijkt new_edge.fact met existing_edges[].fact
    # Returns lijst van contradicted edge indices
```

**LLM Prompt (v2):**
```
Based on the provided EXISTING FACTS and a NEW FACT,
determine which existing facts the new fact contradicts.
Return a list containing all ids of the facts that are contradicted.
```

**Kanbu equivalent:** NIET GEÏMPLEMENTEERD

---

## 4. Edge Operations (`utils/maintenance/edge_operations.py`)

### 4.1 resolve_edge_contradictions()

**Doel:** Pas invalid_at/expired_at aan op basis van contradictions.

```python
def resolve_edge_contradictions(
    resolved_edge: EntityEdge,
    invalidation_candidates: list[EntityEdge]
) -> list[EntityEdge]:
    for edge in invalidation_candidates:
        # Als new_edge.valid_at > edge.valid_at:
        #   edge.invalid_at = resolved_edge.valid_at
        #   edge.expired_at = now()
```

**Logica:**
1. Vergelijk valid_at timestamps
2. Oudere edge krijgt invalid_at = nieuwe edge's valid_at
3. Oudere edge krijgt expired_at = now()

**Kanbu equivalent:** NIET GEÏMPLEMENTEERD

### 4.2 extract_edges()

**Doel:** Extract relaties uit episode content.

```python
async def extract_edges(
    clients: GraphitiClients,
    episode: EpisodicNode,
    nodes: list[EntityNode],
    previous_episodes: list[EpisodicNode],
    ...
) -> list[EntityEdge]:
```

**Kanbu equivalent:** WikiAiService.extractEntities() (deels)

### 4.3 resolve_extracted_edges()

**Doel:** Deduplicate en validate extracted edges.

```python
async def resolve_extracted_edges(...) -> tuple[list[EntityEdge], list[EntityEdge]]:
    # 1. Fast path: exact string match deduplication
    # 2. Generate embeddings voor edges
    # 3. Search for related edges in graph
    # 4. LLM determines duplicates and contradictions
    # 5. Return: (resolved_edges, invalidated_edges)
```

**Kanbu equivalent:** Deels in GraphitiService.syncWikiPageFallback()

---

## 5. Search System (`search/`)

### 5.1 Hybrid Search

Graphiti combineert:
1. **Vector similarity** - embedding cosine similarity
2. **BM25 text search** - keyword matching
3. **Graph traversal** - volg edges

**Kanbu equivalent:** WikiEmbeddingService.semanticSearch() (alleen vector)

### 5.2 Temporal Filtering

```python
# Filter edges op valid_at/invalid_at
WHERE edge.valid_at <= $as_of_date
  AND (edge.invalid_at IS NULL OR edge.invalid_at > $as_of_date)
```

**Kanbu equivalent:** NIET GEÏMPLEMENTEERD

---

## 6. LLM Client (`llm_client/`)

### Supported Providers

| Provider | Kanbu Support |
|----------|---------------|
| OpenAI | ✅ Via WikiAiService |
| Anthropic | ❌ Niet geïmplementeerd |
| Groq | ❌ Niet geïmplementeerd |
| Azure OpenAI | ❌ Niet geïmplementeerd |

### Model Sizes

```python
class ModelSize(Enum):
    small = 'small'   # gpt-4o-mini equivalent
    medium = 'medium' # gpt-4o equivalent
    large = 'large'   # gpt-4 equivalent
```

**Kanbu equivalent:** Fase 14 provider registry met models

---

## 7. Database Drivers (`driver/`)

### Supported Databases

| Database | Graphiti | Kanbu |
|----------|----------|-------|
| Neo4j | ✅ | ❌ |
| FalkorDB | ✅ | ✅ |
| Kuzu | ✅ | ❌ |
| Neptune | ✅ | ❌ |

---

## Samenvatting: Wat Graphiti Biedt

| Feature | Graphiti | Complexiteit |
|---------|----------|--------------|
| Entity Extraction | LLM-based | Medium |
| Bi-Temporal Model | valid_at/invalid_at/created_at/expired_at | Medium |
| Contradiction Detection | LLM vergelijkt facts | Medium |
| Episode Tracking | EpisodicNode links | Laag |
| Fact Embeddings | On edges | Laag |
| Community Detection | CommunityNode clustering | Hoog |
| Hybrid Search | Vector + BM25 + Graph | Medium |
| Temporal Queries | Filter op date range | Laag |

---

*Gegenereerd door Claude Code analyse - 2026-01-13*
