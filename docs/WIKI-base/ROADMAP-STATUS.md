# Wiki Implementation Roadmap & Status

> **Laatst bijgewerkt:** 2026-01-12
> **Huidige fase:** Fase 10 - LLM Entity Extraction ✅ COMPLEET
> **Volgende actie:** Fase 11 - Embeddings & Semantic Search (of Fase 9.2/9.5 afhankelijkheden)

---

## Fase 0: Foundation ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| WikiPage model (project) | ✅ | schema.prisma |
| WorkspaceWikiPage model | ✅ | schema.prisma |
| ProjectWikiVersion model | ✅ | Voor version history |
| WorkspaceWikiVersion model | ✅ | Voor version history |
| WikiPageStatus enum | ✅ | DRAFT, PUBLISHED, ARCHIVED |
| Graphiti sync velden | ✅ | graphitiGroupId, graphitiSynced, graphitiSyncedAt |
| projectWiki.ts router | ✅ | Full CRUD + versions |
| workspaceWiki.ts router | ✅ | Full CRUD + versions |
| wiki.permissions.ts | ✅ | view, create, edit, delete, publish, history |

---

## Fase 1: Editor Integration ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| WikiSidebar.tsx | ✅ | Tree navigation |
| WikiPageView.tsx | ✅ | View/edit met Lexical |
| WikiVersionHistory.tsx | ✅ | Version modal |
| WikiLinkPlugin.tsx | ✅ | [[wiki links]] in editor |
| WikiLinkNode.tsx | ✅ | Lexical node |
| WorkspaceWikiPage.tsx | ✅ | Volledige pagina |
| Routes in App.tsx | ✅ | /workspace/:slug/wiki/* |
| MarkdownPastePlugin | ✅ | Showdown + tables support |

---

## Fase 2: Graphiti Integration ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| Graphiti/FalkorDB opzetten | ✅ | Port 6379 (redis), 3000 (UI) |
| GraphitiService class | ✅ | apps/api/src/services/graphitiService.ts |
| Sync on wiki save | ✅ | Hooks in create/update/delete mutations |
| Entity extraction | ✅ | Rules-based (@mentions, #tasks, concepts) |
| graphiti.getBacklinks endpoint | ✅ | graphiti.ts router |
| graphiti.search endpoint | ✅ | graphiti.ts router |
| graphiti.getRelated endpoint | ✅ | graphiti.ts router |

### Vereisten voor Fase 2:
- [x] FalkorDB draaiend op MAX (kanbu-falkordb container)
- [ ] LLM-based entity extraction (future improvement)
- [x] Sync hooks in wiki routers
- [x] tRPC endpoints voor graph queries

---

## Fase 3: Cross-References ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| BacklinksPanel component | ✅ | components/wiki/BacklinksPanel.tsx |
| Related pages in panel | ✅ | Geïntegreerd in BacklinksPanel |
| Integratie in WikiPageView | ✅ | Toont panel onder content |
| @mentions plugin | ✅ | MentionPlugin.tsx, MentionNode.tsx |
| &Sign plugin | ✅ | SignaturePlugin.tsx, SignatureNode.tsx (DecoratorNode) |
| #task-refs plugin | ✅ | TaskRefPlugin.tsx, TaskRefNode.tsx |

---

## Fase 4: Search & Discovery 🔄 IN PROGRESS

| Item | Status | Notities |
|------|--------|----------|
| Text search (graph) | ✅ | Cypher CONTAINS query op titles/entities |
| Wiki search UI | ✅ | WikiSearchDialog.tsx met keyboard nav |
| Cmd+K wiki search | ✅ | Wiki pages zoeken via CommandPalette |
| Semantic search (vectors) | ❌ | Vereist embeddings + Qdrant (toekomst) |

---

## Fase 5: Graph Visualization 🔄 IN PROGRESS

| Item | Status | Notities |
|------|--------|----------|
| D3.js installatie | ✅ | d3 + @types/d3 |
| getGraph endpoint | ✅ | graphiti.ts + graphitiService.ts |
| WikiGraphView component | ✅ | Force-directed layout, zoom/pan |
| Sidebar toggle button | ✅ | Network icon in WikiSidebar |
| Fullscreen mode | ✅ | Uitklapbaar naar volledig scherm |
| 3D/WebXR support | ❌ | Three.js integratie (toekomst) |
| 100k+ nodes | ❌ | WebGPU/Cosmos integratie (toekomst) |

---

---

# GRAPHITI CORE INTEGRATIE

> **Doel:** Volledige Graphiti Python library integreren in Kanbu voor maximale controle en aanpasbaarheid.
> **Bron:** https://github.com/getzep/graphiti (geforkt naar apps/graphiti/)

---

## Fase 7: Python Service Setup ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| apps/graphiti/ directory aanmaken | ✅ | Nieuwe app in monorepo |
| graphiti_core code kopiëren | ✅ | Van ~/repos/graphiti/ naar src/core/ |
| pyproject.toml + dependencies | ✅ | uv package manager |
| FastAPI wrapper service | ✅ | src/api/main.py + schemas.py |
| Dockerfile voor graphiti service | ✅ | Python 3.11-slim image |
| docker-compose.yml updaten | ✅ | graphiti service op poort 8000 |
| .env configuratie | ✅ | .env.example aangemaakt |
| Health check endpoint | ✅ | GET /health endpoint

---

## Fase 8: Kanbu API Integratie ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| GraphitiClient class in Node.js | ✅ | lib/graphitiClient.ts met typed methods |
| graphitiService.ts refactoren | ✅ | Python service first, FalkorDB fallback |
| Episode sync bij wiki save | ✅ | add_episode via HTTP met fallback |
| Error handling + retries | ✅ | GraphitiClientError, timeout, graceful degradation |
| Connection pooling | ✅ | Native fetch, 60s health check cache |

---

## Fase 9: Bi-Temporal Model 🔄 IN PROGRESS

| Item | Status | Notities |
|------|--------|----------|
| valid_at / invalid_at velden | ✅ | graphiti_core heeft native support |
| created_at / expired_at tracking | ❌ | Audit trail |
| Temporal query endpoints | ✅ | temporalSearch in graphiti.ts + Python service |
| Version diff met temporal context | ✅ | WikiTemporalSearch.tsx component |
| Contradiction detection | ❌ | LLM detecteert conflicten |

---

## Fase 10: LLM Entity Extraction ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| LLM provider configuratie | ✅ | OpenAI via graphiti_core (al geïntegreerd in Fase 7/8) |
| Entity extraction pipeline | ✅ | graphiti_core add_episode met custom entity_types |
| Custom entity types | ✅ | WikiPage, Task, User, Project, Concept in kanbu_entities.py |
| Relation extraction | ✅ | Native in graphiti_core - automatische relatie-extractie via LLM |
| Concept deduplicatie | ✅ | Native in graphiti_core - dedupe_nodes.py prompts |

**Notitie:** Graphiti_core heeft built-in LLM-based:
- **Entity extraction** met custom types (via `entity_types` parameter)
- **Relation extraction** (automatisch bij `add_episode()`)
- **Entity deduplication** (via dedupe_nodes prompts)

Alle functies zijn nu actief wanneer de Python Graphiti service draait met OPENAI_API_KEY.

---

## Fase 11: Embeddings & Semantic Search

| Item | Status | Notities |
|------|--------|----------|
| Embedding provider setup | ❌ | OpenAI/Voyage/local |
| fact_embedding generatie | ❌ | Bij elke wiki save |
| Qdrant integratie | ❌ | Vector storage (draait al) |
| Hybrid search (BM25 + vector) | ❌ | Beste van beide werelden |
| Search ranking tuning | ❌ | Relevantie optimalisatie |

---

## Fase 12: MCP Server & Claude Integratie

| Item | Status | Notities |
|------|--------|----------|
| MCP protocol endpoints | ❌ | add_memory, search_nodes, etc. |
| Claude Desktop integratie | ❌ | Persistent memory |
| Agent memory per workspace | ❌ | group_id isolatie |
| "Ask the Wiki" chatbox | ❌ | RAG over wiki content |

---

## Fase 13: Advanced Features

| Item | Status | Notities |
|------|--------|----------|
| Queue-based processing | ❌ | Concurrent editing support |
| Auto-suggestions tijdens typen | ❌ | Real-time entity hints |
| Graph analytics dashboard | ❌ | Statistieken, trends |
| Export/import graph data | ❌ | Backup/restore |
| Multi-tenant graph isolation | ❌ | Workspace boundaries |

---

## Graphiti Architectuur

```
┌─────────────────────────────────────────────────────────────────┐
│                         Kanbu Stack                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Web App    │  │   API (Node) │  │   Graphiti (Python)    │ │
│  │   React      │──│   Fastify    │──│   FastAPI              │ │
│  │   Vite       │  │   tRPC       │  │   graphiti_core        │ │
│  │   :5173      │  │   :3001      │  │   :8000                │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                              │                    │              │
│                              ▼                    ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Data Layer                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ PostgreSQL   │  │ FalkorDB     │  │ Qdrant         │  │   │
│  │  │ :5432        │  │ :6379        │  │ :6333          │  │   │
│  │  │ Source data  │  │ Graph DB     │  │ Vectors        │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     LLM Layer                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ OpenAI       │  │ Anthropic    │  │ Ollama (local) │  │   │
│  │  │ gpt-4o-mini  │  │ claude-3     │  │ llama3.2       │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Blocking Issues

| Issue | Impact | Oplossing |
|-------|--------|-----------|
| ~~Geen Graphiti server~~ | ~~Fase 2 blocked~~ | ✅ FalkorDB draait |
| Project Wiki page mist | Minor | Kan later, workspace wiki werkt |
| ~~tRPC endpoints voor graph queries~~ | ~~Fase 3 blocked~~ | ✅ graphiti.ts router |

---

## Quick Commands

```bash
# Start Kanbu dev
bash ~/genx/v6/dev/kanbu/scripts/api.sh start
cd ~/genx/v6/dev/kanbu/apps/web && pnpm dev

# Wiki URL
https://max:5173/workspace/genx/wiki

# Graphiti docs
cat ~/genx/v6/dev/kanbu/docs/WIKI-base/GRAPHITI-IMPLEMENTATIE.md
```

---

## Changelog

| Datum | Actie |
|-------|-------|
| 2026-01-12 | Fase 0 & 1 compleet, MarkdownPastePlugin met Showdown |
| 2026-01-12 | Roadmap bestand aangemaakt |
| 2026-01-12 | FalkorDB toegevoegd aan docker-compose.yml |
| 2026-01-12 | GraphitiService.ts aangemaakt |
| 2026-01-12 | Sync hooks toegevoegd aan workspaceWiki.ts en projectWiki.ts |
| 2026-01-12 | graphiti.ts tRPC router toegevoegd (Fase 2 compleet) |
| 2026-01-12 | BacklinksPanel.tsx component aangemaakt |
| 2026-01-12 | BacklinksPanel geïntegreerd in WikiPageView.tsx |
| 2026-01-12 | TaskRefNode.tsx en TaskRefPlugin.tsx toegevoegd (#task-refs) |
| 2026-01-12 | MentionNode.tsx en MentionPlugin.tsx toegevoegd (@mentions) |
| 2026-01-12 | SignatureNode.tsx en SignaturePlugin.tsx toegevoegd (&Sign) |
| 2026-01-12 | Dropdown positioning fix (center ipv far right) |
| 2026-01-12 | WikiLinkNode importJSON fix voor duplicate children bug |
| 2026-01-12 | Fase 3 COMPLEET |
| 2026-01-12 | WikiSearchDialog.tsx met local + semantic search |
| 2026-01-12 | Search dialog geïntegreerd in WorkspaceWikiPage |
| 2026-01-12 | Wiki pages zoeken via Cmd+K CommandPalette |
| 2026-01-12 | Fase 4 COMPLEET |
| 2026-01-12 | D3.js geïnstalleerd voor graph visualization |
| 2026-01-12 | getGraph endpoint toegevoegd aan graphiti router |
| 2026-01-12 | WikiGraphView.tsx component met D3.js force-directed graph |
| 2026-01-12 | Graph toggle button in WikiSidebar |
| 2026-01-12 | Correctie: "Semantic search" → "Text search" (geen echte vectors) |
| 2026-01-12 | GRAPHITI CORE INTEGRATIE roadmap toegevoegd (Fase 7-13) |
| 2026-01-12 | apps/graphiti/ directory + graphiti_core gekopieerd |
| 2026-01-12 | pyproject.toml + FastAPI service (main.py, schemas.py) |
| 2026-01-12 | Dockerfile + .env.example aangemaakt |
| 2026-01-12 | graphiti service toegevoegd aan docker-compose.yml |
| 2026-01-12 | Fase 7 COMPLEET |
| 2026-01-12 | GraphitiClient class (lib/graphitiClient.ts) |
| 2026-01-12 | graphitiService.ts v2 - Python service + fallback |
| 2026-01-12 | temporalSearch() method toegevoegd |
| 2026-01-12 | GRAPHITI_SERVICE_URL in .env |
| 2026-01-12 | Fase 8 COMPLEET |
| 2026-01-12 | Fase 9 gestart: Bi-Temporal Model |
| 2026-01-12 | graphiti_core heeft native valid_at/invalid_at support (9.1 ✅) |
| 2026-01-12 | temporalSearch tRPC endpoint toegevoegd aan graphiti.ts (9.3 ✅) |
| 2026-01-12 | POST /search/temporal endpoint in Python service |
| 2026-01-12 | WikiTemporalSearch.tsx component aangemaakt (9.4 ✅) |
| 2026-01-12 | Temporal search button toegevoegd aan WikiSidebar (Clock icon) |
| 2026-01-12 | **Fase 10 gestart: LLM Entity Extraction** |
| 2026-01-12 | Custom entity types aangemaakt: WikiPage, Task, User, Project, Concept |
| 2026-01-12 | src/entity_types/kanbu_entities.py met Pydantic models |
| 2026-01-12 | AddEpisodeRequest uitgebreid met use_kanbu_entities optie |
| 2026-01-12 | /entity-types endpoint toegevoegd aan Python service |
| 2026-01-12 | graphitiService.ts gebruikt nu Kanbu entity types by default |
| 2026-01-12 | Entity details in AddEpisodeResponse (entity_name, entity_type) |
| 2026-01-12 | Fase 10.1-10.3 COMPLEET |
| 2026-01-12 | **Fase 10 COMPLEET** - Relation extraction en deduplicatie zijn native in graphiti_core |
