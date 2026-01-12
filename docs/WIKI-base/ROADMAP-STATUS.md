# Wiki Implementation Roadmap & Status

> **Laatst bijgewerkt:** 2026-01-12
> **Huidige fase:** Fase 14 - AI Provider Configuration (multi-environment support)
> **Sub-fase:** 14.0 Research ✅ COMPLEET | 14.1 Database ❌ VOLGENDE
> **Volgende actie:** Fase 14.1 Database Model implementatie (AiProviderConfig)

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

## Fase 11: Embeddings & Semantic Search ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| Embedding provider setup | ✅ | OpenAI text-embedding-3-small (configurable via env) |
| fact_embedding generatie | ✅ | Automatisch bij add_episode via graphiti_core |
| Vector storage | ✅ | FalkorDB (native in graphiti_core, niet Qdrant) |
| Hybrid search (BM25 + vector) | ✅ | POST /search/hybrid endpoint met configurable methods |
| Search ranking/reranking | ✅ | RRF, MMR, Cross-encoder reranking support |

**Notitie:** Graphiti_core slaat embeddings op in FalkorDB zelf (als node/edge properties), niet in een externe vector DB zoals Qdrant.

**Endpoints:**
- `POST /search/hybrid` - Hybrid search met BM25 + vector similarity + BFS
- `GET /health` - Nu met embedding_model en embedding_dim info

**Environment variabelen:**
- `EMBEDDING_MODEL` (default: text-embedding-3-small)
- `EMBEDDING_DIM` (default: 1024)

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

## Fase 14: AI Provider Configuration 🆕

> **Doel:** Multi-environment deployment ondersteuning met configureerbare AI providers op 3 niveaus.
> **Scope:** Van laptop/offline tot enterprise SaaS met volledige provider keuze.

### Waarom Fase 14?

Kanbu moet werken in verschillende deployment scenarios:
- **Laptop/Offline:** Ollama met lokale modellen (privacy-first)
- **On-premise:** Eigen LLM servers achter firewall
- **SaaS:** Managed service met OpenAI/Anthropic
- **Enterprise:** ChatLLM Teams (Abacus.ai) integratie

### Sub-fases

#### 14.0 Research: Providers & Hardware

##### 14.0.1 Ollama: Hardware & Model Configuratie ✅ COMPLEET

| Item | Status | Notities |
|------|--------|----------|
| Hardware tier definitie | ✅ | 7 tiers: CPU-only, Entry, Mid, High, Pro, Apple, Ultra |
| VRAM requirements per model | ✅ | Complete matrix Q4/Q5/Q8/FP16 |
| Quantization impact analyse | ✅ | Q4_K_M = best balance, FP16 = 4x meer VRAM |
| Model aanbevelingen per tier | ✅ | Per tier model combos (LLM + embed + context) |
| Vision model haalbaarheid | ✅ | Vanaf 8GB VRAM (llava:7b) |
| CPU-only fallback strategie | ✅ | 3-6 tok/s, bruikbaar voor batch |
| Auto-detect hardware capability | ✅ | Via Ollama API `/api/ps` en `/api/tags` |

**Status:** ✅ COMPLEET - Zie [RESEARCH-Ollama-Hardware.md](RESEARCH-Ollama-Hardware.md)

**Key Findings:**

| Eigenschap | Waarde |
|------------|--------|
| Minimum VRAM | **8GB** (7B Q4 + embeddings) |
| Aanbevolen VRAM | **12-16GB** (13B + ruimte) |
| Default num_ctx | **2048** ⚠️ TE KLEIN! |
| NPU Support | ❌ Niet in Ollama |

**Hardware Tiers (definitief):**

| Tier | VRAM | LLM | Embed | Vision | Performance |
|------|------|-----|-------|--------|-------------|
| CPU-only | 16GB RAM | 7B Q4 | ✅ | ❌ | 3-6 tok/s |
| Entry | 6-8 GB | 7B Q4 | ✅ | ❌ | 40+ tok/s |
| **Mid** | 10-12 GB | 13B Q4 | ✅ | ⚠️ | 35-50 tok/s |
| High | 16-24 GB | 30B Q4 | ✅ | ✅ | 30-45 tok/s |
| Pro | 48+ GB | 70B Q4 | ✅ | ✅ | Full speed |
| Apple M1-M3 | 8-64GB | 7-13B | ✅ | ⚠️ | 15-45 tok/s |
| Apple Ultra | 64-192GB | 70B+ | ✅ | ✅ | 50+ tok/s |

**GPU Vendor Support:**

| Vendor | Status | Notes |
|--------|--------|-------|
| NVIDIA (CUDA) | ✅ Best | GTX 900+, RTX, A-series |
| AMD (ROCm) | ✅ Good | RX 6000+, via HSA_OVERRIDE voor older |
| Apple (Metal) | ✅ Excellent | M1-M4 series, unified memory |
| Intel (Vulkan) | ⚠️ Experimental | Arc GPUs, OLLAMA_VULKAN=1 |
| NPU (all) | ❌ None | Niet in Ollama/llama.cpp |

**Kanbu Aanbevolen Configuratie:**

```bash
# KRITIEK: Verhoog context window!
export OLLAMA_CONTEXT_LENGTH=8192
export OLLAMA_FLASH_ATTENTION=1

# Model combinatie (Mid tier):
# LLM: llama3.2:8b (~5GB)
# Embed: nomic-embed-text (~0.5GB)
# Context 16K: +4GB
# Total: ~9.5GB
```

**NPU Conclusie:** AMD XDNA en Intel NPU zijn **niet bruikbaar** met Ollama. Voor NPU moet ONNX/OpenVINO stack gebruikt worden (out of scope voor v1).

---

##### 14.0.2 Abacus.ai / ChatLLM Teams

| Item | Status | Notities |
|------|--------|----------|
| ChatLLM Teams documentatie onderzoeken | ❌ | API capabilities, pricing model |
| Enterprise features inventariseren | ❌ | SSO, audit logs, compliance |
| LLM gateway functionaliteit | ❌ | Model routing, fallbacks |
| Embedding support onderzoeken | ❌ | Welke embedding modellen? |
| API authenticatie methode | ❌ | API keys, OAuth, SAML? |
| Kanbu integratie haalbaarheid | ❌ | Conclusie + recommendation |

**Deliverable:** Research document met conclusie over ChatLLM Teams integratie.

**Status:** ✅ COMPLEET - Zie [RESEARCH-Abacus-AI-ChatLLM.md](RESEARCH-Abacus-AI-ChatLLM.md)

**Conclusie:** Niet aanbevolen als primaire provider. Geen embedding API zonder Enterprise tier ($5K+/maand).

---

##### 14.0.3 OpenCode: Open Source AI Coding Agent ✅ COMPLEET

> **Bron:** [opencode.ai](https://opencode.ai/) | [GitHub](https://github.com/opencode-ai/opencode)

| Item | Status | Notities |
|------|--------|----------|
| OpenCode architectuur onderzoeken | ✅ | Go-based CLI, TUI, client/server, 50K+ stars |
| Multi-provider support analyseren | ✅ | 75+ LLM providers via AI SDK + Models.dev |
| Self-hosted endpoint support | ✅ | @ai-sdk/openai-compatible, Ollama (num_ctx fix!) |
| OpenCode Zen evalueren | ✅ | Pay-as-you-go, free tier incl. GLM-4.7 |
| GitHub Actions integratie | ✅ | /opencode mentions, auto PR creation |
| Kanbu integratie haalbaarheid | ✅ | Inspiratie ja, directe integratie nee |

**Status:** ✅ COMPLEET - Zie [RESEARCH-OpenCode.md](RESEARCH-OpenCode.md)

**Key Findings:**

| Eigenschap | Waarde |
|------------|--------|
| GitHub Stars | 50.000+ |
| Monthly Users | 650.000+ |
| Providers | 75+ via AI SDK |
| Ollama Support | ✅ (maar num_ctx fix nodig!) |
| Embedding Support | ❌ **Geen** |
| Web UI | ❌ CLI/TUI only |

**OpenCode Zen Pricing:**

| Tier | Voorbeelden | Per 1M tokens |
|------|-------------|---------------|
| Free | GLM-4.7, GPT 5 Nano, Grok Code | $0 |
| Budget | Claude Haiku, Gemini Flash | $0.50-$1 / $3-$5 |
| Premium | Claude Opus, GPT 5.2 | $1.75-$5 / $14-$25 |

**Kritieke Ollama Fix:**
```bash
# Default context window is 4096 - TE KLEIN!
ollama run <model>
/set parameter num_ctx 32768
/save <model>
```

**Conclusie:**
- ✅ **Waardevolle inspiratie** voor provider abstractie patroon
- ✅ **Ollama config lesson** learned (num_ctx!)
- ❌ **Niet voor directe integratie** (geen embeddings, CLI-only)

---

##### 14.0.4 GLM-4.7: Chinese Open Source Coding Model ✅ COMPLEET

> **Bron:** [Z.ai GLM-4.7 Blog](https://z.ai/blog/glm-4.7) | [Hugging Face](https://huggingface.co/zai-org/GLM-4.7)

| Item | Status | Notities |
|------|--------|----------|
| GLM-4.7 capabilities onderzoeken | ✅ | 358B MoE, 200K context, #1 SWE-bench |
| Model varianten inventariseren | ✅ | Alleen 358B (geen 9B/32B varianten!) |
| API toegang evalueren | ✅ | OpenAI-compatible, $0.40/$1.50 per 1M |
| Local deployment onderzoeken | ✅ | Ollama/vLLM/SGLang, 135-205GB RAM vereist |
| Benchmark vergelijking | ✅ | #1 open-source coding model |
| Kanbu integratie haalbaarheid | ✅ | ✅ CODE via API, ❌ self-hosted |

**Status:** ✅ COMPLEET - Zie [RESEARCH-GLM-4.7.md](RESEARCH-GLM-4.7.md)

**Key Findings:**

| Specificatie | Waarde |
|--------------|--------|
| Parameters | **358B MoE** (geen kleinere varianten!) |
| Context Window | 200.000 tokens |
| Max Output | 128.000 tokens |
| API Prijs | $0.40/$1.50 per 1M tokens |
| Coding Plan | $3/maand |
| Self-hosted | 135-205GB RAM vereist |

**Benchmarks (december 2025):**

| Benchmark | Score | Opmerking |
|-----------|-------|-----------|
| SWE-bench Verified | **73.8%** | #1 open-source model |
| LiveCodeBench | **84.9%** | > Claude Sonnet 4.5 |
| AIME 2025 (math) | 95.7% | Zeer sterke reasoning |

**Embedding Support:**
- Z.ai biedt `embedding-3` model (configureerbare dimensies)
- LangChain integratie beschikbaar

**Conclusie:**
- ✅ **Aanbevolen als CODE capability provider** via API of OpenRouter
- ❌ **Niet aanbevolen voor self-hosted** (hardware te zwaar)
- ⚠️ **GDPR:** Chinese servers, onduidelijk privacy beleid

---

##### 14.0.5 LM Studio: Local Model Server ✅ COMPLEET

> **Bron:** [lmstudio.ai](https://lmstudio.ai/) | [GitHub](https://github.com/lmstudio-ai/lms)

| Item | Status | Notities |
|------|--------|----------|
| LM Studio architectuur onderzoeken | ✅ | Desktop app + CLI (`lms`), llama.cpp + MLX engines |
| OpenAI-compatible API analyseren | ✅ | /v1/chat/completions, /v1/embeddings, /v1/responses |
| Model management features | ✅ | GGUF + MLX, HuggingFace direct, JIT loading |
| Hardware acceleration support | ✅ | CUDA (incl. RTX 50), Metal/MLX, Vulkan, CPU |
| Multi-model serving capability | ✅ | Model switching (geen concurrent serving) |
| Vergelijking met Ollama | ✅ | Ollama 20% sneller, LM Studio beter op integrated GPU |
| Kanbu integratie haalbaarheid | ✅ | Optioneel alternatief voor desktop users |

**Status:** ✅ COMPLEET - Zie [RESEARCH-LM-Studio.md](RESEARCH-LM-Studio.md)

**Key Findings:**

| Eigenschap | Waarde |
|------------|--------|
| Licentie | Gratis (closed source) |
| Huidige versie | 0.3.37 |
| Default Port | **1234** (vs Ollama 11434) |
| API | OpenAI-compatible (`/v1/*`) |
| Embeddings | ✅ nomic-embed-text, bge-small |
| Headless | ⚠️ Vereist GUI support op systeem |
| Docker | ❌ Geen official image |

**Performance vs Ollama (M3 Max):**

| Metric | Ollama | LM Studio |
|--------|--------|-----------|
| Cold Start | 3.2s | 8.7s |
| Tokens/sec | 85.2 | 72.8 |
| Memory | 4.2GB | 5.8GB |

**Unieke Voordelen LM Studio:**
- ✅ **Vulkan support** - Werkt op integrated GPUs (Intel/AMD)
- ✅ **MLX engine** - Apple Silicon geoptimaliseerd
- ✅ **GUI** - Intuïtief voor eindgebruikers
- ✅ **Model browser** - 1000+ pre-configured modellen

**Beperkingen:**
- ❌ Geen echte headless mode (vereist X11/Wayland)
- ❌ Geen Docker container
- ❌ Closed source
- ⚠️ Tool calling experimenteel

**Conclusie:**
- ✅ **Optioneel alternatief** voor desktop/GUI users
- ✅ **Aanbevolen voor integrated GPU** users
- ❌ **Niet voor server deployments** - gebruik Ollama
- ✅ **Zelfde API** - kan via @ai-sdk/openai-compatible

---

#### 14.1 Database Model: AiProviderConfig

> **BESLUIT (2026-01-12):** Na research van 5 providers (Ollama, Abacus.ai, OpenCode, GLM-4.7, LM Studio) is besloten om slechts 3 providers te ondersteunen voor de Wiki/Graphiti implementatie.
>
> **Focus:** Embeddings, Reasoning, Vision - GEEN code generation (niet relevant voor Wiki).
>
> **Afgevallen:**
> - Anthropic: Geen embedding API
> - Abacus.ai: Embeddings alleen in Enterprise tier ($5K+/maand)
> - GLM-4.7: Alleen code specialist, overkill voor Wiki
> - OpenCode: Inspiratie, geen directe integratie
> - CUSTOM: Complexiteit niet nodig in v1

```prisma
// Nieuwe modellen in schema.prisma

enum AiProviderType {
  OPENAI       // Cloud - volledig (embeddings + reasoning + vision)
  OLLAMA       // Local - primair
  LM_STUDIO    // Local - optioneel (GUI/desktop users)
}

enum AiCapability {
  EMBEDDING    // Vector embeddings (Wiki search)
  REASONING    // Entity extraction, summarization (Graphiti)
  VISION       // Image understanding (optioneel, toekomstig)
}

model AiProviderConfig {
  id              Int             @id @default(autoincrement())

  // Scope (alleen één is gezet)
  isGlobal        Boolean         @default(false)
  workspaceId     Int?
  projectId       Int?

  // Provider settings
  providerType    AiProviderType  // OPENAI, OLLAMA, LM_STUDIO
  name            String          // Display name (bijv. "Production OpenAI")
  isActive        Boolean         @default(true)
  priority        Int             @default(0)  // Voor fallback ordering (0 = hoogste)

  // Capabilities die deze provider ondersteunt
  capabilities    AiCapability[]  // EMBEDDING, REASONING, VISION

  // Connection settings (encrypted)
  baseUrl         String?         // Endpoint URL
                                  // OpenAI: https://api.openai.com/v1 (default)
                                  // Ollama: http://localhost:11434
                                  // LM Studio: http://localhost:1234
  apiKey          String?         // Encrypted API key (alleen OpenAI)
  organizationId  String?         // OpenAI organization ID (optioneel)

  // Model preferences per capability
  embeddingModel  String?         // bijv. "text-embedding-3-small", "nomic-embed-text"
  reasoningModel  String?         // bijv. "gpt-4o-mini", "llama3.2:8b"
  visionModel     String?         // bijv. "gpt-4o", "llava:7b" (optioneel)

  // Rate limiting (alleen relevant voor cloud providers)
  maxRequestsPerMinute  Int?
  maxTokensPerMinute    Int?

  // Metadata
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdBy       Int?

  // Relations
  workspace       Workspace?      @relation(fields: [workspaceId], references: [id])
  project         Project?        @relation(fields: [projectId], references: [id])
  creator         User?           @relation(fields: [createdBy], references: [id])

  @@index([workspaceId])
  @@index([projectId])
  @@index([isGlobal])
  @@index([providerType])
}
```

| Item | Status | Notities |
|------|--------|----------|
| AiProviderConfig model | ✅ | Prisma schema toegevoegd (2026-01-12) |
| AiProviderType enum | ✅ | OPENAI, OLLAMA, LM_STUDIO (besluit 2026-01-12) |
| AiCapability enum | ✅ | EMBEDDING, REASONING, VISION (geen CODE - niet voor Wiki) |
| Database migratie | ✅ | `pnpm prisma db push` uitgevoerd (2026-01-12) |
| Seed data voor defaults | ✅ | 3 global providers aangemaakt (2026-01-12) |

**Implementatie Details (2026-01-12):**
- Schema: `packages/shared/prisma/schema.prisma`
- Seed: `packages/shared/prisma/seed-ai-providers.ts`
- Providers: OpenAI (Global), Ollama (Local), LM Studio (Desktop)
- Alle providers staan standaard op `isActive: false` (handmatige configuratie vereist)

---

#### 14.2 Admin UI: System Settings > AI Systems

**Locatie:** Administration > System Settings > AI Systems (nieuw menu item)

> **Scope:** Alleen 3 providers (OpenAI, Ollama, LM Studio) en 3 capabilities (Embedding, Reasoning, Vision).

| Item | Status | Notities |
|------|--------|----------|
| AiSystemsPage.tsx | ❌ | Main admin page |
| AiProviderList.tsx | ❌ | Lijst van 3 providers |
| AiProviderForm.tsx | ❌ | Add/edit provider modal |
| AiProviderCard.tsx | ❌ | Provider card met status |
| API key input met mask | ❌ | Show/hide toggle, encrypted storage (alleen OpenAI) |
| Connection test button | ❌ | Test API connectivity |
| Model selector dropdown | ❌ | Dynamisch ophalen van beschikbare modellen |
| Ollama URL configuratie | ❌ | Default: http://localhost:11434 |
| LM Studio URL configuratie | ❌ | Default: http://localhost:1234 |

**UI Mockup:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Administration > System Settings > AI Systems                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Providers (3) ──────────────────────────────────────────────┐ │
│ │                                                               │ │
│ │ ┌──────────────────────┐  ┌──────────────────────┐           │ │
│ │ │ ☁️ OpenAI             │  │ 🖥️ Ollama (Local)    │           │ │
│ │ │ ✓ Active (primair)   │  │ ○ Not configured     │           │ │
│ │ │ gpt-4o-mini          │  │                      │           │ │
│ │ │ text-embed-3-small   │  │ [Configure]          │           │ │
│ │ │ [Edit] [Test]        │  │                      │           │ │
│ │ └──────────────────────┘  └──────────────────────┘           │ │
│ │                                                               │ │
│ │ ┌──────────────────────┐                                     │ │
│ │ │ 🖥️ LM Studio (Local)  │  ⓘ Optioneel voor GUI users        │ │
│ │ │ ○ Not configured     │  Alleen als Ollama niet werkt       │ │
│ │ │                      │  op integrated GPU                  │ │
│ │ │ [Configure]          │                                     │ │
│ │ └──────────────────────┘                                     │ │
│ │                                                               │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Capabilities Status ────────────────────────────────────────┐ │
│ │                                                               │ │
│ │ Embedding:  OpenAI (text-embedding-3-small)   ✓ Configured   │ │
│ │ Reasoning:  OpenAI (gpt-4o-mini)              ✓ Configured   │ │
│ │ Vision:     Not configured                    ⚠ Optional     │ │
│ │                                                               │ │
│ │ ⓘ Embedding en Reasoning zijn vereist voor Wiki/Graphiti.    │ │
│ │   Vision is optioneel voor image understanding.              │ │
│ │                                                               │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─ Quick Setup ────────────────────────────────────────────────┐ │
│ │                                                               │ │
│ │ ☁️ Cloud Setup (OpenAI)                                       │ │
│ │ ┌─────────────────────────────────────────────────────────┐  │ │
│ │ │ API Key: sk-••••••••••••••••••••••••••••    [Show] [Test]│  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ │ 🖥️ Local Setup (Ollama)                                       │ │
│ │ ┌─────────────────────────────────────────────────────────┐  │ │
│ │ │ URL: http://localhost:11434                       [Test]│  │ │
│ │ │ Status: ⚠ Not running                                   │  │ │
│ │ │ [Start Guide] - Hoe Ollama installeren                  │  │ │
│ │ └─────────────────────────────────────────────────────────┘  │ │
│ │                                                               │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Provider Form Fields:**

| Provider | Velden |
|----------|--------|
| OpenAI | API Key (required), Organization ID (optional), Base URL (optional voor Azure) |
| Ollama | Base URL (default: http://localhost:11434), Model selection |
| LM Studio | Base URL (default: http://localhost:1234), Model selection |

---

#### 14.3 Provider Abstraction Layer

> **Scope:** 3 providers (OpenAI, Ollama, LM Studio), 3 capabilities (Embedding, Reasoning, Vision).
> **Aanpak:** OpenAI-compatible API voor alle providers (Ollama en LM Studio gebruiken zelfde interface).

```typescript
// lib/ai/providers/types.ts

export type AiProviderType = 'OPENAI' | 'OLLAMA' | 'LM_STUDIO'
export type AiCapability = 'EMBEDDING' | 'REASONING' | 'VISION'

export interface AiProvider {
  readonly type: AiProviderType
  readonly capabilities: AiCapability[]
  readonly baseUrl: string

  // Health check
  testConnection(): Promise<{ success: boolean; error?: string; models?: string[] }>

  // Model discovery
  listModels(capability?: AiCapability): Promise<string[]>
}

export interface EmbeddingProvider extends AiProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimensions(): number
  getModelName(): string
}

export interface ReasoningProvider extends AiProvider {
  // Entity extraction, summarization voor Graphiti
  extractEntities(text: string, entityTypes: string[]): Promise<ExtractedEntity[]>
  summarize(text: string, maxLength?: number): Promise<string>

  // Generic chat (indien nodig)
  chat(messages: ChatMessage[], options?: ReasoningOptions): Promise<string>
  stream(messages: ChatMessage[], options?: ReasoningOptions): AsyncIterable<string>
}

export interface VisionProvider extends AiProvider {
  // Image understanding (optioneel)
  describeImage(image: Buffer | string, prompt?: string): Promise<string>
  extractTextFromImage(image: Buffer | string): Promise<string>
}

// Factory
export function createProvider(config: AiProviderConfig): AiProvider
export function createEmbeddingProvider(config: AiProviderConfig): EmbeddingProvider
export function createReasoningProvider(config: AiProviderConfig): ReasoningProvider
export function createVisionProvider(config: AiProviderConfig): VisionProvider | null
```

| Item | Status | Notities |
|------|--------|----------|
| AiProvider interface | ❌ | Base interface |
| EmbeddingProvider interface | ❌ | Vector embeddings voor Wiki search |
| ReasoningProvider interface | ❌ | Entity extraction voor Graphiti |
| VisionProvider interface | ❌ | Image understanding (optioneel) |
| **OpenAiProvider** | ❌ | Bestaande code refactoren |
| **OllamaProvider** | ❌ | OpenAI-compatible op :11434/v1 |
| **LmStudioProvider** | ❌ | OpenAI-compatible op :1234/v1 |
| Provider factory | ❌ | createProvider() functie |
| Provider registry | ❌ | Singleton met active providers |

**Provider Implementatie Details:**

```typescript
// lib/ai/providers/OpenAiProvider.ts
export class OpenAiProvider implements EmbeddingProvider, ReasoningProvider, VisionProvider {
  readonly type = 'OPENAI'
  readonly capabilities: AiCapability[] = ['EMBEDDING', 'REASONING', 'VISION']

  constructor(private config: { apiKey: string; baseUrl?: string }) {}

  // Gebruikt official OpenAI SDK
  // text-embedding-3-small voor embeddings
  // gpt-4o-mini voor reasoning
  // gpt-4o voor vision
}

// lib/ai/providers/OllamaProvider.ts
export class OllamaProvider implements EmbeddingProvider, ReasoningProvider, VisionProvider {
  readonly type = 'OLLAMA'
  readonly capabilities: AiCapability[] = ['EMBEDDING', 'REASONING', 'VISION']

  constructor(private config: { baseUrl: string }) {}

  // Gebruikt @ai-sdk/openai-compatible
  // nomic-embed-text voor embeddings
  // llama3.2:8b voor reasoning
  // llava:7b voor vision (indien beschikbaar)

  // KRITIEK: num_ctx moet 8192+ zijn!
}

// lib/ai/providers/LmStudioProvider.ts
export class LmStudioProvider implements EmbeddingProvider, ReasoningProvider, VisionProvider {
  readonly type = 'LM_STUDIO'
  readonly capabilities: AiCapability[] = ['EMBEDDING', 'REASONING', 'VISION']

  constructor(private config: { baseUrl: string }) {}

  // Zelfde interface als Ollama (OpenAI-compatible)
  // Alleen baseUrl verschilt (poort 1234 vs 11434)
}
```

**Belangrijke Notities:**

1. **Geen Anthropic/Abacus.ai:** Afgevallen wegens geen embeddings (zie 14.0 research).
2. **OpenAI-compatible:** Ollama en LM Studio gebruiken dezelfde API structuur als OpenAI.
3. **Ollama num_ctx:** Default 2048 is te klein! Moet naar 8192+ voor Graphiti context.
4. **Vision optioneel:** Niet alle installaties hebben vision modellen.

---

#### 14.4 Workspace & Project Overrides

> **Use Case:** Privacy-gevoelige workspaces kunnen lokale LLM (Ollama) forceren.
> **Use Case:** Offline development met Ollama/LM Studio als fallback.

| Item | Status | Notities |
|------|--------|----------|
| Workspace AI Settings page | ❌ | /workspace/:slug/settings/ai |
| Project AI Settings tab | ❌ | In project settings modal |
| Inheritance logic | ❌ | Project → Workspace → Global |
| Override indicators in UI | ❌ | "Using Ollama (workspace override)" badge |
| getEffectiveProvider() service | ❌ | Resolve provider per capability |
| Fallback logic | ❌ | OpenAI → Ollama → LM Studio |

**Inheritance Regels:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Resolution (per Capability)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Request: getEmbeddingProvider() voor Project "KANBU-123"        │
│                                                                  │
│  1. Check Project config [EMBEDDING] → Not set                   │
│  2. Check Workspace config [EMBEDDING] → Ollama (override!)      │
│  3. Check Global config [EMBEDDING] → OpenAI (default)           │
│                                                                  │
│  Result: Use Ollama for embeddings in this project               │
│                                                                  │
│  Note: Reasoning en Vision kunnen andere providers hebben!       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Fallback Chain:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Automatic Fallback                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scenario: OpenAI API onbereikbaar                               │
│                                                                  │
│  1. Try OpenAI          → Error: API unavailable                 │
│  2. Fallback to Ollama  → Error: Not running                     │
│  3. Fallback to LM Studio → Success!                             │
│                                                                  │
│  Logging: "Using LM Studio fallback (OpenAI, Ollama unavailable)"│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**UI: Workspace Override Settings:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Workspace Settings > AI Configuration                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ⚙️ Override Global AI Settings                                   │
│                                                                  │
│ ┌─ Provider Override ──────────────────────────────────────────┐│
│ │                                                               ││
│ │ [ ] Use workspace-specific AI provider                        ││
│ │                                                               ││
│ │     Provider: [Ollama (Local) ▾]                              ││
│ │                                                               ││
│ │     ⓘ Alle wiki pages en tasks in deze workspace              ││
│ │       gebruiken Ollama i.p.v. OpenAI.                         ││
│ │                                                               ││
│ │     Reden: [ Privacy - data blijft lokaal            ]        ││
│ │            [ Offline werken                          ]        ││
│ │            [ Kostenbesparing                         ]        ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ [Cancel]                                            [Save]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 14.5 Testing & Validation

> **Scope:** Test alle 3 providers en alle 3 capabilities.

| Item | Status | Notities |
|------|--------|----------|
| **Unit Tests** | | |
| OpenAiProvider unit tests | ❌ | Mock OpenAI API responses |
| OllamaProvider unit tests | ❌ | Mock Ollama API responses |
| LmStudioProvider unit tests | ❌ | Mock LM Studio API responses |
| Provider factory tests | ❌ | createProvider() met alle types |
| **Integration Tests** | | |
| OpenAI embedding integration | ❌ | Real API call (test key) |
| Ollama embedding integration | ❌ | Local Ollama vereist |
| LM Studio embedding integration | ❌ | Local LM Studio vereist |
| **E2E Tests** | | |
| Provider switching in UI | ❌ | Cypress/Playwright |
| Workspace override flow | ❌ | Global → Workspace override |
| **Error Handling Tests** | | |
| Fallback chain tests | ❌ | OpenAI → Ollama → LM Studio |
| Connection failure tests | ❌ | Graceful degradation |
| Rate limit handling (429) | ❌ | Retry met backoff |
| Timeout handling | ❌ | 30s timeout default |

**Test Matrix:**

| Provider | Embedding | Reasoning | Vision | Connection Test |
|----------|-----------|-----------|--------|-----------------|
| OpenAI | ✓ text-embedding-3-small | ✓ gpt-4o-mini | ✓ gpt-4o | ✓ /models |
| Ollama | ✓ nomic-embed-text | ✓ llama3.2 | ⚠ llava | ✓ /api/tags |
| LM Studio | ✓ nomic-embed-text | ✓ llama3.2 | ⚠ llava | ✓ /v1/models |

**CI/CD Configuratie:**

```yaml
# .github/workflows/ai-providers.yml
name: AI Provider Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run provider unit tests
        run: pnpm test:providers

  integration-tests:
    runs-on: ubuntu-latest
    # Alleen met OpenAI (API key in secrets)
    env:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - name: Run OpenAI integration tests
        run: pnpm test:providers:integration

  # Ollama/LM Studio tests draaien lokaal (self-hosted runner)
  local-integration:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Start Ollama
        run: ollama serve &
      - name: Run local provider tests
        run: pnpm test:providers:local
```

---

### Fase 14 Status Overzicht

| Sub-fase | Status | Beschrijving |
|----------|--------|--------------|
| **14.0 Research** | ✅ **COMPLEET** | Alle 5 providers onderzocht, besluit genomen |
| ↳ 14.0.1 Ollama | ✅ | Hardware tiers, VRAM requirements, model selectie |
| ↳ 14.0.2 Abacus.ai | ✅ | ChatLLM Teams API → **AFGEVALLEN** (geen embeddings) |
| ↳ 14.0.3 OpenCode | ✅ | Inspiratie voor provider abstractie |
| ↳ 14.0.4 GLM-4.7 | ✅ | Code specialist → **AFGEVALLEN** (overkill voor Wiki) |
| ↳ 14.0.5 LM Studio | ✅ | GUI alternatief voor Ollama → **GESELECTEERD** |
| **14.1 Database** | 🔄 | AiProviderConfig model + migratie |
| 14.2 Admin UI | ❌ | System Settings > AI Systems |
| 14.3 Abstraction | ❌ | Provider interfaces + implementaties |
| 14.4 Overrides | ❌ | Workspace/Project level configuratie |
| 14.5 Testing | ❌ | Unit + integration + E2E tests |

**Geselecteerde Providers:** OpenAI, Ollama, LM Studio
**Capabilities:** Embeddings, Reasoning, Vision (geen Code)

---

### Provider Support Matrix (Wiki/Graphiti Focus)

> **Scope:** Embeddings, Reasoning, Vision voor Wiki implementatie.
> **Niet in scope:** Code generation (niet relevant voor Wiki).

#### Geselecteerde Providers (v1)

| Provider | Embeddings | Reasoning | Vision | Deployment | Status |
|----------|------------|-----------|--------|------------|--------|
| **OpenAI** | ✅ text-embedding-3-small | ✅ gpt-4o-mini | ✅ gpt-4o | Cloud | ✅ Primair (Fase 10/11) |
| **Ollama** | ✅ nomic-embed-text | ✅ llama3.2 | ⚠️¹ llava | Local | ✅ Primair local |
| **LM Studio** | ✅ nomic-embed-text | ✅ llama3.2 | ⚠️² | Local (GUI) | ✅ Optioneel |

**Legenda:**
- ✅ Volledig ondersteund
- ⚠️ Hardware-afhankelijk / beperkt

**Footnotes:**
1. **Ollama Vision:** Vereist 8+ GB VRAM, vision modellen moeten expliciet gepulled worden.
2. **LM Studio Vision:** Zelfde als Ollama, maar via GUI model browser.

---

#### Afgevallen Providers (Research Compleet)

| Provider | Reden Afvallen | Research Document |
|----------|----------------|-------------------|
| Anthropic | ❌ Geen embedding API | N/A |
| Abacus.ai | ❌ Embeddings alleen Enterprise ($5K+/maand) | [RESEARCH-Abacus-AI-ChatLLM.md](RESEARCH-Abacus-AI-ChatLLM.md) |
| GLM-4.7 | ⚠️ Code specialist, overkill voor Wiki | [RESEARCH-GLM-4.7.md](RESEARCH-GLM-4.7.md) |
| OpenCode | ⚠️ Inspiratie, geen provider | [RESEARCH-OpenCode.md](RESEARCH-OpenCode.md) |
| CUSTOM | ⚠️ Complexiteit niet nodig in v1 | N/A |

---

#### Provider Capabilities Detail

**OpenAI (Cloud - Primair):**
- **Embeddings:** text-embedding-3-small (1536 dim), text-embedding-3-large (3072 dim)
- **Reasoning:** gpt-4o-mini (goedkoop), gpt-4o (krachtig)
- **Vision:** gpt-4o met image input
- **API:** Standaard OpenAI SDK

**Ollama (Local - Primair):**
- **Embeddings:** nomic-embed-text (768 dim, 8192 context)
- **Reasoning:** llama3.2:8b, qwen3:8b, mistral:7b
- **Vision:** llava:7b (8GB+ VRAM vereist)
- **Minimum hardware:** 8GB VRAM (zie [RESEARCH-Ollama-Hardware.md](RESEARCH-Ollama-Hardware.md))
- **KRITIEK:** `num_ctx` moet naar 8192+ (default 2048 is te klein!)

**LM Studio (Local - Optioneel):**
- **Embeddings:** nomic-embed-text, bge-small
- **Reasoning:** Zelfde GGUF modellen als Ollama
- **Vision:** GGUF vision modellen
- **Voordelen:** GUI, Vulkan (integrated GPU), MLX (Apple Silicon)
- **Nadelen:** Geen echte headless, geen Docker, 20% langzamer
- **API:** OpenAI-compatible op poort 1234 (zie [RESEARCH-LM-Studio.md](RESEARCH-LM-Studio.md))

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
| 2026-01-12 | **Fase 11 gestart: Embeddings & Semantic Search** |
| 2026-01-12 | OpenAI embedder expliciet geconfigureerd in main.py |
| 2026-01-12 | Environment variabelen: EMBEDDING_MODEL, EMBEDDING_DIM |
| 2026-01-12 | HybridSearchRequest/Response schemas toegevoegd |
| 2026-01-12 | POST /search/hybrid endpoint met BM25 + vector + BFS |
| 2026-01-12 | Reranking support: RRF, MMR, Cross-encoder |
| 2026-01-12 | TypeScript client uitgebreid met hybridSearch() method |
| 2026-01-12 | HealthResponse uitgebreid met embedding_model en embedding_dim |
| 2026-01-12 | **Fase 11 COMPLEET** |
| 2026-01-12 | **Fase 14 toegevoegd: AI Provider Configuration** |
| 2026-01-12 | Sub-fases: 14.0 Research, 14.1 Database, 14.2 Admin UI, 14.3 Abstraction, 14.4 Overrides, 14.5 Testing |
| 2026-01-12 | Provider Support Matrix: OpenAI, Anthropic (placeholder embeddings), Ollama, Abacus.ai |
| 2026-01-12 | 3-level configuratie: Global → Workspace → Project inheritance |
| 2026-01-12 | **14.0.1 Ollama Research toegevoegd:** Hardware tiers, VRAM matrices, model selectie |
| 2026-01-12 | Open vragen: Minimum hardware, GPU auto-detection, cloud fallback strategie |
| 2026-01-12 | Development hardware gedocumenteerd: AMD RYZEN AI MAX+ 395 / Radeon 8060S / 123GB RAM |
| 2026-01-12 | Multi-vendor support vragen: NVIDIA CUDA vs AMD ROCm vs Apple Metal |
| 2026-01-12 | **NPU tier toegevoegd:** AMD XDNA (`/dev/accel0`) aanwezig op MAX - 50 TOPS |
| 2026-01-12 | Open vragen: NPU vs GPU performance, Ryzen AI software stack |
| 2026-01-12 | **14.0.2 Abacus.ai Research COMPLEET** - Zie RESEARCH-Abacus-AI-ChatLLM.md |
| 2026-01-12 | Conclusie 14.0.2: Niet aanbevolen als primaire provider (geen embeddings in Teams tier) |
| 2026-01-12 | **14.0.3 OpenCode toegevoegd:** Open source AI coding agent, 75+ providers, self-hosted support |
| 2026-01-12 | **14.0.4 GLM-4.7 toegevoegd:** Z.ai Chinese open-source model, #1 SWE-bench |
| 2026-01-12 | Provider Support Matrix uitgebreid met OpenCode en GLM-4.7 |
| 2026-01-12 | **14.0.4 GLM-4.7 Research COMPLEET** - Zie RESEARCH-GLM-4.7.md |
| 2026-01-12 | GLM-4.7: 358B MoE model (GEEN 9B/32B varianten!), $0.40/$1.50 per 1M tokens |
| 2026-01-12 | GLM-4.7 self-hosted: 135-205GB RAM vereist - niet haalbaar voor community |
| 2026-01-12 | Z.ai embedding-3 model beschikbaar voor vector embeddings |
| 2026-01-12 | Conclusie 14.0.4: ✅ Aanbevolen als CODE provider via API, ❌ niet voor self-hosted |
| 2026-01-12 | **14.0.3 OpenCode Research COMPLEET** - Zie RESEARCH-OpenCode.md |
| 2026-01-12 | OpenCode: 50K+ stars, 75+ providers via AI SDK + Models.dev |
| 2026-01-12 | OpenCode Zen: Pay-as-you-go gateway met free tier (GLM-4.7, Grok Code) |
| 2026-01-12 | KRITIEK: Ollama default num_ctx = 4096 - te klein voor agents! Fix nodig |
| 2026-01-12 | Conclusie 14.0.3: Inspiratie voor provider abstractie, geen directe integratie (geen embeddings) |
| 2026-01-12 | **14.0.1 Ollama Hardware Research COMPLEET** - Zie RESEARCH-Ollama-Hardware.md |
| 2026-01-12 | Hardware tiers gedefinieerd: CPU-only, Entry (8GB), Mid (12GB), High (24GB), Pro (48GB+), Apple Silicon |
| 2026-01-12 | VRAM matrices: LLM modellen (7B-70B), Embedding modellen, Vision modellen |
| 2026-01-12 | Quantization impact: Q4_K_M = best balance (4x minder dan FP16) |
| 2026-01-12 | GPU vendor support: NVIDIA ✅, AMD ROCm ✅, Apple Metal ✅, Intel Vulkan ⚠️ |
| 2026-01-12 | NPU support: ❌ Niet in Ollama/llama.cpp (AMD XDNA, Intel NPU niet bruikbaar) |
| 2026-01-12 | KRITIEK: Ollama default num_ctx = 2048 - moet naar 8192+ voor Kanbu! |
| 2026-01-12 | Kanbu minimum: 8GB VRAM (llama3.2:8b + nomic-embed-text) |
| 2026-01-12 | **Fase 14.0.5 LM Studio Research COMPLEET** - Zie RESEARCH-LM-Studio.md |
| 2026-01-12 | LM Studio: Desktop app + CLI, OpenAI-compatible API, GGUF + MLX engines |
| 2026-01-12 | LM Studio vs Ollama: Ollama 20% sneller, LM Studio beter op integrated GPU (Vulkan) |
| 2026-01-12 | LM Studio beperkingen: Geen echte headless, geen Docker, closed source |
| 2026-01-12 | Conclusie 14.0.5: Optioneel alternatief voor GUI/desktop users, niet voor servers |
| 2026-01-12 | **Fase 14.0 Research volledig COMPLEET** - Alle 5 sub-fases afgerond |
| 2026-01-12 | **BESLUIT: Provider selectie voor Wiki/Graphiti** |
| 2026-01-12 | Geselecteerd: OpenAI (cloud), Ollama (local primair), LM Studio (local optioneel) |
| 2026-01-12 | Afgevallen: Anthropic (geen embeddings), Abacus.ai (te duur), GLM-4.7 (overkill), CUSTOM (v1 scope) |
| 2026-01-12 | AiProviderType enum: OPENAI, OLLAMA, LM_STUDIO |
| 2026-01-12 | AiCapability enum: EMBEDDING, REASONING, VISION (geen CODE - niet voor Wiki) |
| 2026-01-12 | Provider Support Matrix geüpdatet met Wiki focus |
| 2026-01-12 | **Fase 14.2-14.5 aangepast aan nieuwe provider selectie** |
| 2026-01-12 | 14.2 Admin UI: 3 providers (OpenAI, Ollama, LM Studio), nieuwe UI mockup |
| 2026-01-12 | 14.3 Abstraction: EmbeddingProvider, ReasoningProvider, VisionProvider interfaces |
| 2026-01-12 | 14.3: Anthropic/Abacus.ai providers verwijderd uit scope |
| 2026-01-12 | 14.4 Overrides: Fallback chain OpenAI → Ollama → LM Studio |
| 2026-01-12 | 14.5 Testing: Test matrix voor 3 providers, CI/CD configuratie |
| 2026-01-12 | **Fase 14.1 Database Model COMPLEET** |
| 2026-01-12 | AiProviderType enum toegevoegd aan schema.prisma (OPENAI, OLLAMA, LM_STUDIO) |
| 2026-01-12 | AiCapability enum toegevoegd (EMBEDDING, REASONING, VISION) |
| 2026-01-12 | AiProviderConfig model toegevoegd met alle velden |
| 2026-01-12 | Relations toegevoegd aan Workspace, Project, User models |
| 2026-01-12 | `pnpm prisma db push` succesvol uitgevoerd |
| 2026-01-12 | seed-ai-providers.ts script aangemaakt |
| 2026-01-12 | 3 global providers geseeded: OpenAI, Ollama, LM Studio (alle inactief) |
