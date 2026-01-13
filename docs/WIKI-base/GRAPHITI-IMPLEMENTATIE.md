# Graphiti Implementatie Rapport - Wiki Knowledge System

> **Datum:** Januari 2025
> **Repository:** https://github.com/getzep/graphiti
> **Lokale clone:** `/home/robin/repos/graphiti/`
> **Geïndexeerd:** 2776 code chunks
> **Status:** Aanbevolen voor implementatie

---

## Executive Summary

Graphiti is **precies gebouwd voor wat wij nodig hebben**: een levende wiki waar kennis evolueert, meerdere mensen/agents tegelijkertijd werken, en je de volledige versie historie kunt zien en bevragen.

**Kernfeatures voor Wiki:**
- ✅ Bi-temporaal model (wanneer was iets waar? wanneer leerden we het?)
- ✅ Real-time incremental updates (geen batch re-indexing)
- ✅ Concurrent editing support (queue-based processing)
- ✅ MCP Server (direct bruikbaar met Claude)
- ✅ Multiple graph backends (Neo4j, FalkorDB, Kuzu)

---

## Waarom Graphiti Perfect is voor Wiki

### 1. Kennis Evolueert - Bi-Temporeel Model

Graphiti heeft **twee tijdsdimensies** ingebouwd:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Bi-Temporal Knowledge Model                   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  valid_at       = Wanneer werd dit feit WAAR?           │   │
│   │  invalid_at     = Wanneer stopte dit feit waar te zijn? │   │
│   │  created_at     = Wanneer LEERDEN we dit?               │   │
│   │  expired_at     = Wanneer werd deze info vervangen?     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Voorbeeld Wiki Scenario:                                       │
│                                                                  │
│   Wiki pagina "Project X Status":                                │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ Versie 1 (Jan 5): "Project X is in development"          │  │
│   │   valid_at: 2025-01-05, invalid_at: 2025-01-20           │  │
│   │   created_at: 2025-01-05                                 │  │
│   │                                                          │  │
│   │ Versie 2 (Jan 20): "Project X launched to beta"          │  │
│   │   valid_at: 2025-01-20, invalid_at: NULL (still valid)   │  │
│   │   created_at: 2025-01-20                                 │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   Query: "Wat was de status van Project X op 10 januari?"        │
│   Answer: "In development" (valid_at <= 2025-01-10 < invalid_at) │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Wiki Leeft - Episodes als Versies

In Graphiti terminologie:

| Graphiti Concept | Wiki Equivalent |
|------------------|-----------------|
| **Episode** | Wiki pagina versie (een save/edit) |
| **EntityNode** | Concept, persoon, project, term |
| **EntityEdge** | Relatie tussen concepten (fact) |
| **group_id** | Workspace isolatie |

```python
# Graphiti EpisodicNode - Perfect voor wiki versies
class EpisodicNode(Node):
    source: EpisodeType          # 'text', 'json', 'message'
    source_description: str      # "wiki_page_edit"
    content: str                 # De wiki pagina content
    valid_at: datetime           # Wanneer deze versie gemaakt werd
    entity_edges: list[str]      # Links naar geëxtraheerde concepts
```

### 3. Meerdere Editors/Agents - Queue-Based Processing

Graphiti heeft een ingebouwde **QueueService** die concurrent edits afhandelt:

```python
# Van mcp_server/graphiti_mcp_server.py
class QueueService:
    """
    Episodes for the same group_id are processed sequentially
    to avoid race conditions.
    """
```

Dit betekent:
- **Binnen één workspace**: Edits worden sequentieel verwerkt (geen conflicts)
- **Tussen workspaces**: Parallelle verwerking (group_id isolatie)
- **Agents + Users**: Kunnen tegelijk werken, queue regelt volgorde

---

## Data Model voor Kanbu Wiki

### EntityEdge - De Kern van Kennisrelaties

```python
class EntityEdge(Edge):
    name: str               # Relatie naam: "relates_to", "mentions", "depends_on"
    fact: str               # Human-readable feit: "Claude verwerkt documenten"
    fact_embedding: list    # Vector voor semantic search
    episodes: list[str]     # Welke wiki versies noemen dit feit

    # TEMPORAL FIELDS - Dit maakt het speciaal!
    valid_at: datetime      # Wanneer werd dit feit waar
    invalid_at: datetime    # Wanneer stopte dit waar te zijn (NULL = nog geldig)
    expired_at: datetime    # Wanneer werd dit record vervangen
    created_at: datetime    # Wanneer leerden we dit
```

### Mapping naar Kanbu Wiki

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kanbu Wiki → Graphiti                         │
│                                                                  │
│   Kanbu                          Graphiti                        │
│   ─────────────────────────────────────────────────────────     │
│   WorkspaceWikiPage              EpisodicNode                    │
│   - id                           - uuid                          │
│   - title                        - name                          │
│   - content                      - content                       │
│   - version                      - (implicit via valid_at)       │
│   - workspaceId                  - group_id                      │
│   - updatedAt                    - valid_at                      │
│   - updatedById                  - source_description            │
│                                                                  │
│   [[Wiki Link]]                  EntityEdge                      │
│   - source page                  - source_node_uuid              │
│   - target page                  - target_node_uuid              │
│   - link text                    - name                          │
│                                                                  │
│   @mention                       EntityEdge                      │
│   - page                         - source_node_uuid              │
│   - user                         - target_node_uuid              │
│   - type: "mentions"             - name: "mentions_user"         │
│                                                                  │
│   #task-123                      EntityEdge                      │
│   - page                         - source_node_uuid              │
│   - task                         - target_node_uuid              │
│   - type: "references"           - name: "references_task"       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Versie Historie - 20 Versies per Pagina

### Implementatie Strategie

```
┌─────────────────────────────────────────────────────────────────┐
│           Wiki Page Version History met Graphiti                 │
│                                                                  │
│   WikiPage "Architectuur Documentatie"                           │
│   group_id: "workspace-123"                                      │
│                                                                  │
│   Episodes (versies):                                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Episode 1  │ valid_at: Jan 1  │ Editor: Robin           │   │
│   │ Episode 2  │ valid_at: Jan 3  │ Editor: Claude Agent    │   │
│   │ Episode 3  │ valid_at: Jan 5  │ Editor: Robin           │   │
│   │ ...        │                  │                         │   │
│   │ Episode 20 │ valid_at: Jan 25 │ Editor: Claude Agent    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Bij Episode 21:                                                │
│   → Delete Episode 1 (oldest)                                    │
│   → Behoud edges die nog relevant zijn                           │
│   → expired_at wordt gezet op verwijderde edges                  │
└─────────────────────────────────────────────────────────────────┘
```

### Temporal Queries

```python
# Wat wisten we op een specifieke datum?
from graphiti_core.search.search_filters import SearchFilters, DateFilter, ComparisonOperator

# Query: "Wat stond er op 15 januari in de Architectuur pagina?"
filters = SearchFilters(
    valid_at=[
        [DateFilter(
            date=datetime(2025, 1, 15),
            comparison_operator=ComparisonOperator.less_than_equal
        )]
    ],
    invalid_at=[
        [DateFilter(
            date=datetime(2025, 1, 15),
            comparison_operator=ComparisonOperator.greater_than
        )],
        [DateFilter(
            comparison_operator=ComparisonOperator.is_null  # Of nog geldig
        )]
    ]
)
```

---

## MCP Server - Claude Integratie

Graphiti komt met een **productie-klare MCP server**:

### Beschikbare Tools

| MCP Tool | Functie | Wiki Toepassing |
|----------|---------|-----------------|
| `add_memory` | Episode toevoegen | Wiki pagina opslaan |
| `search_nodes` | Entiteiten zoeken | Concepten vinden |
| `search_memory_facts` | Feiten zoeken | Relaties ontdekken |
| `get_episodes` | Versies ophalen | Historie bekijken |
| `delete_episode` | Versie verwijderen | Oude versies opruimen |
| `clear_graph` | Graph legen | Workspace reset |
| `get_status` | Status check | Health monitoring |

### MCP Configuratie voor Kanbu

```yaml
# config.yaml voor Graphiti MCP Server
server:
  transport: http
  host: 0.0.0.0
  port: 8000

database:
  provider: neo4j  # of falkordb, kuzu
  uri: bolt://localhost:7687
  user: neo4j
  password: your_password

llm:
  provider: openai  # of anthropic, groq, ollama
  model: gpt-4o-mini

embedder:
  provider: openai
  model: text-embedding-3-small

graphiti:
  group_id: kanbu-wiki-default
  entity_types:
    - name: WikiPage
      description: A wiki page in the knowledge base
    - name: Concept
      description: A concept or topic mentioned in wiki content
    - name: Person
      description: A person mentioned in wiki content
    - name: Task
      description: A task referenced in wiki content
```

---

## Architectuur Voorstel

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kanbu Wiki + Graphiti Stack                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Frontend Layer                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │ Lexical      │  │ Graph View   │  │ Version History  │  │ │
│  │  │ Editor       │  │ (D3.js)      │  │ Panel            │  │ │
│  │  │ [[links]]    │  │ Visualize    │  │ Compare versions │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Kanbu API Layer                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │ tRPC Router  │  │ Graphiti    │  │ Sync Service     │  │ │
│  │  │ wiki.*       │  │ Client      │  │ (PostgreSQL ↔    │  │ │
│  │  │              │  │             │  │  Graphiti)       │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Storage Layer                            │ │
│  │  ┌──────────────────────┐  ┌─────────────────────────────┐ │ │
│  │  │ PostgreSQL           │  │ Neo4j/FalkorDB              │ │ │
│  │  │ - WikiPage (source)  │  │ - EpisodicNodes (versions)  │ │ │
│  │  │ - User/Workspace     │  │ - EntityNodes (concepts)    │ │ │
│  │  │ - Task links         │  │ - EntityEdges (relations)   │ │ │
│  │  │ - Permissions        │  │ - Temporal metadata         │ │ │
│  │  └──────────────────────┘  └─────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    AI/Search Layer                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │ Graphiti MCP │  │ Ollama       │  │ Embedding        │  │ │
│  │  │ Server       │  │ (local LLM)  │  │ Service          │  │ │
│  │  │ Port 8000    │  │ Port 11434   │  │ (OpenAI/local)   │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Concurrent Editing - Agents & Users

### Scenario: Robin + Claude Agent editen tegelijk

```
Timeline:
─────────────────────────────────────────────────────────────────

T=0   Robin opent "API Docs" pagina
T=1   Claude Agent opent dezelfde pagina
T=2   Robin maakt edit, klikt save
      → add_memory(name="API Docs", episode_body="...", source_description="user:robin")
      → Queue: [Robin's edit]

T=3   Claude Agent maakt edit, klikt save
      → add_memory(name="API Docs", episode_body="...", source_description="agent:claude")
      → Queue: [Robin's edit, Claude's edit]

T=4   Graphiti verwerkt Robin's edit
      → Extract entities, create edges
      → Episode saved met valid_at=T=2

T=5   Graphiti verwerkt Claude's edit
      → Extract entities
      → DETECTEERT: Nieuwe info contradicts oude info
      → Oude edges krijgen invalid_at=T=3
      → Nieuwe edges created met valid_at=T=3
      → Episode saved met valid_at=T=3

Resultaat:
─────────────────────────────────────────────────────────────────
- Beide edits behouden
- Temporal trail volledig intact
- Geen data verloren
- Contradictions automatisch gedetecteerd
```

### Contradiction Detection

```python
# Van temporal_operations.py
async def get_edge_contradictions(
    llm_client: LLMClient,
    new_edge: EntityEdge,
    existing_edges: list[EntityEdge],
) -> list[EntityEdge]:
    """
    LLM detecteert of nieuwe feiten oude feiten tegenspreken.
    Gecontradicteerde edges krijgen invalid_at gezet.
    """
```

---

## Search Capabilities

### Search Types

```python
# Hybride search - combineert vector + BM25
results = await graphiti.search(
    query="Hoe werkt de authentication?",
    group_ids=["workspace-123"],
    num_results=10
)

# Node search - vind concepten
from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_RRF
results = await graphiti._search(
    query="Claude Agent",
    config=NODE_HYBRID_SEARCH_RRF
)

# Center node reranking - relevantie vanuit specifiek concept
results = await graphiti.search(
    query="authentication",
    center_node_uuid="concept-oauth-uuid",  # Rerank based on graph distance
)
```

### Temporal Filters

```python
# Alleen feiten die NU geldig zijn
filters = SearchFilters(
    invalid_at=[
        [DateFilter(comparison_operator=ComparisonOperator.is_null)]
    ]
)

# Feiten die geldig waren op specifieke datum
filters = SearchFilters(
    valid_at=[[DateFilter(
        date=specific_date,
        comparison_operator=ComparisonOperator.less_than_equal
    )]],
    invalid_at=[
        [DateFilter(
            date=specific_date,
            comparison_operator=ComparisonOperator.greater_than
        )],
        [DateFilter(comparison_operator=ComparisonOperator.is_null)]
    ]
)
```

---

## Database Backends

### Ondersteunde Backends

| Backend | Type | Beste Voor | Setup |
|---------|------|------------|-------|
| **Neo4j** | Enterprise | Production, complex queries | Docker/Desktop |
| **FalkorDB** | Redis-based | Snelheid, Redis ecosystem | Docker |
| **Kuzu** | Embedded | Local-first, geen server | Pip install |

### Aanbeveling voor Kanbu

```
Development:  Kuzu (embedded, geen setup)
Production:   Neo4j (enterprise, visualisatie tools)
              of FalkorDB (sneller, simpler)
```

---

## Implementatie Stappenplan

### Fase 1: Proof of Concept (1-2 dagen)

1. **Graphiti MCP Server opzetten**
   ```bash
   cd ~/repos/graphiti/mcp_server
   docker compose up -d  # Start FalkorDB
   python -m graphiti_mcp_server
   ```

2. **Test met sample wiki content**
   ```python
   await graphiti.add_episode(
       name="Test Wiki Page",
       episode_body="Dit is een test wiki pagina over [[Claude]] en [[Kanbu]].",
       source=EpisodeType.text,
       source_description="wiki_edit:user:robin"
   )
   ```

3. **Verificatie queries**
   ```python
   # Check extracted entities
   results = await graphiti.search("Claude")
   # Check temporal data
   results = await graphiti.search("Kanbu", filters=temporal_filters)
   ```

### Fase 2: Kanbu Integratie (3-5 dagen)

1. **GraphitiService class** in Kanbu API
2. **Sync hooks** op WikiPage CRUD operaties
3. **tRPC endpoints** voor graph queries
4. **Version comparison** UI component

### Fase 3: Advanced Features (1-2 weken)

1. **Graph visualisatie** (D3.js force-directed)
2. **"Ask the Wiki"** chatbox met MCP
3. **Auto-suggested links** tijdens typing
4. **Backlinks panel** met temporal context

---

## Voordelen vs. Cognee

| Aspect | Graphiti | Cognee |
|--------|----------|--------|
| **Temporal model** | ✅ Bi-temporal native | ❌ Niet built-in |
| **Real-time updates** | ✅ Queue-based | ⚠️ Batch processing |
| **MCP Server** | ✅ Production-ready | ❌ Niet beschikbaar |
| **Concurrent editing** | ✅ Designed for it | ⚠️ Niet primair focus |
| **Version queries** | ✅ Native filters | ❌ Custom implementatie |
| **Graph backends** | Neo4j, FalkorDB, Kuzu | Neo4j, Kuzu, pgvector |
| **Local LLM** | ✅ Via configuratie | ✅ Ollama native |

---

## Conclusie

**Graphiti is de juiste keuze voor Kanbu Wiki** omdat:

1. **Gebouwd voor evoluerende kennis** - Bi-temporal model is exact wat een wiki nodig heeft
2. **Multi-user/agent ready** - Queue-based processing voorkomt conflicts
3. **MCP native** - Direct bruikbaar met Claude agents
4. **Temporele queries** - "Wat wisten we toen?" is een first-class feature
5. **Production proven** - Zep gebruikt dit voor enterprise AI memory

### Volgende Stap

Start met Fase 1: Graphiti MCP Server opzetten en testen met sample wiki content.

---

## Privacy & Telemetry

### Ontdekking (Januari 2025)

Tijdens review van de Graphiti codebase is ontdekt dat Graphiti **anonieme telemetry data verzamelt** en naar PostHog stuurt. Dit is een **opt-out** systeem, wat betekent dat telemetry standaard **AAN** staat.

### Wat wordt verzameld?

- Anonieme usage statistics
- Geen persoonlijke data of content
- Verzonden naar PostHog analytics platform

### Onze Oplossing

In Kanbu is telemetry **uitgeschakeld** door de environment variable te zetten **voordat** graphiti_core modules worden geïmporteerd:

```python
# apps/graphiti/src/api/main.py
import os

# BELANGRIJK: Moet VOOR graphiti_core imports staan
os.environ['GRAPHITI_TELEMETRY_ENABLED'] = 'false'

from graphiti_core.graphiti import Graphiti  # Nu zonder telemetry
```

### Waarom op code-niveau?

| Optie | Voordeel | Nadeel |
|-------|----------|--------|
| ~/.bashrc | Simpel | Alleen lokale machine, niet voor andere installaties |
| .env file | Per project | Kan vergeten worden, moet handmatig toegevoegd |
| **Code-niveau** | Werkt altijd | Kan breken bij upstream changes |
| Fork | Volledige controle | Geen automatische updates meer |

De code-niveau oplossing is gekozen omdat:
1. Werkt voor alle Kanbu installaties
2. Geen handmatige configuratie nodig
3. Expliciet gedocumenteerd in de code

### Toekomstige Overwegingen

Als Graphiti de environment variable naam wijzigt in een toekomstige versie, kan deze oplossing breken. In dat geval overwegen we:

1. **Versie pinnen**: `graphiti-core==X.Y.Z` in requirements
2. **Fork**: Eigen versie onderhouden zonder telemetry
3. **Upstream PR**: Bijdragen aan Graphiti om opt-in te maken

---

## Referenties

- [Graphiti GitHub](https://github.com/getzep/graphiti)
- [Graphiti Docs](https://docs.getzep.com/)
- [Zep Temporal KG Paper](https://blog.getzep.com/content/files/2025/01/ZEP__USING_KNOWLEDGE_GRAPHS_TO_POWER_LLM_AGENT_MEMORY_2025011700.pdf)
- [Neo4j Graphiti Blog](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/)
- Lokale clone: `/home/robin/repos/graphiti/`
- Geïndexeerd in MAX vector store: `graphiti` (2776 chunks)
