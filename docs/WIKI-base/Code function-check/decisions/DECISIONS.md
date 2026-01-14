# Feature Beslissingen - Graphiti vs Kanbu

> **Doel:** Track welke Graphiti features we wel/niet gaan implementeren
> **Laatst bijgewerkt:** 2026-01-13

---

## Beslissingen Overzicht

| Feature | Beslissing | Datum | Prioriteit |
|---------|------------|-------|------------|
| Bi-Temporal Model | ✅ JA | 2026-01-13 | HOOG |
| Contradiction Detection | 🔄 FASE 17 | 2026-01-13 | HOOG |
| Edge Embeddings | 🔄 FASE 19 | 2026-01-13 | MEDIUM |
| Community Detection | ⏳ PENDING | 2026-01-13 | LAAG |
| BM25 Search | 🔄 FASE 20 | 2026-01-13 | MEDIUM |
| Node Embeddings | 🔄 FASE 21 | 2026-01-13 | MEDIUM |
| Deduplication | 🔄 FASE 22 | 2026-01-13 | MEDIUM |
| Reflexion Extraction | ⏳ PENDING | 2026-01-13 | LAAG |

**Legenda:**
- ✅ JA - Gaan we implementeren
- 🔄 FASE X - Gepland/In progress in specifieke fase
- ❌ NEE - Niet implementeren
- ⏳ PENDING - Nog geen beslissing

---

## Gedetailleerde Beslissingen

### Bi-Temporal Model

**Status:** ✅ COMPLEET (Fase 16)

**Wat:**
- valid_at/invalid_at velden op edges
- created_at/expired_at voor audit trail
- Temporal queries ("wat was waar op X")

**Geïmplementeerd in Fase 16:**
- ✅ 16.1 Schema Extension - FalkorDB edge velden + migratie (163 edges)
- ✅ 16.2 Date Extraction - LLM prompts + WikiAiService
- ✅ 16.3 Contradiction Detection (basis) - Detect + Invalidate flow
- ✅ 16.4 Temporal Queries - As-of-date + Fix TemporalSearch
- ✅ 16.5 Testing - 77 unit + integration tests

**Bestanden:**
- `graphitiService.ts` v3.5.0 - Temporal edge properties
- `WikiAiService.ts` - extractEdgeDates(), detectContradictions()
- `lib/ai/wiki/prompts/` - LLM prompt templates
- `scripts/migrate-temporal-edges.ts` - Migration script
- `scripts/test-temporal-queries.ts` - Integration tests

**Beslissing:** ✅ GEÏMPLEMENTEERD

**Zie:** [ROADMAP-STATUS.md - Fase 16](../ROADMAP-STATUS.md#fase-16-bi-temporal-model-implementation-)

---

### Contradiction Detection

**Status:** 🔄 IN PROGRESS (Fase 17)

**Wat:**
- LLM vergelijkt nieuwe facts met bestaande
- Automatisch invalideren van oude edges
- Waarschuwing bij conflicten

**Bestaande Implementatie (Fase 16.3):**
- ✅ `detectContradictions()` method in WikiAiService
- ✅ `resolveContradictions()` flow in graphitiService
- ✅ `invalid_at` en `expired_at` worden gezet
- ✅ Basis tests (5/5 passing)

**Wat Fase 17 toevoegt:**
- 🔄 Batch detection (meerdere facts tegelijk)
- 🔄 Confidence scores (0.0 - 1.0)
- 🔄 Contradiction categories (SEMANTIC, TEMPORAL, FACTUAL, ATTRIBUTE)
- 🔄 UI notifications (toast + dialog)
- 🔄 Audit trail & history view
- 🔄 Undo capability
- 🔄 Resolution strategies (Keep Old / Keep New / Keep Both)

**Argumenten VOOR:**
- Voorkomt data corruptie
- Automatische cleanup
- Betere data kwaliteit
- User feedback verbetert vertrouwen

**Argumenten TEGEN:**
- Extra LLM calls = extra kosten
- False positives mogelijk (mitigated door confidence threshold)

**Beslissing:** ✅ IMPLEMENTEREN in Fase 17

**Zie:** [ROADMAP-STATUS.md - Fase 17](../ROADMAP-STATUS.md#fase-17-contradiction-detection-volledig-)

---

### Edge Embeddings

**Status:** 🔄 GEPLAND (Fase 19)

**Wat:**
- Vector embedding per edge fact
- Semantic search over relaties
- Opslag in Qdrant (aparte collection)

**Bestaande Infrastructuur:**
- ✅ WikiEmbeddingService - Page embeddings in Qdrant
- ✅ Qdrant client configuratie
- ✅ WikiAiService.embed() method
- ⚠️ Edges hebben geen `fact` veld (moet toegevoegd)

**Wat Fase 19 toevoegt:**
- 🔄 19.1 Validatie Bestaande Implementatie
- 🔄 19.2 Schema & Storage Design (Qdrant `kanbu_edge_embeddings` collection)
- 🔄 19.3 Embedding Generation Pipeline (WikiEdgeEmbeddingService)
- 🔄 19.4 Search Integration (edgeSemanticSearch, hybridSemanticSearch)
- 🔄 19.5 Testing & Migration (migrate-edge-embeddings.ts)

**Nieuwe Componenten:**
- `WikiEdgeEmbeddingService.ts` - Edge embedding generatie & storage
- `EdgeSearchResult` interface - Search resultaat format
- `HybridSearchResult` interface - Gecombineerde page + edge results
- `WikiEdgeSearchResults.tsx` - UI component voor edge results

**Argumenten VOOR:**
- Fijnmaziger search resultaten
- Zoeken op relaties, niet alleen paginas
- Betere RAG context voor AI features

**Argumenten TEGEN:**
- Extra storage kosten (Qdrant vectors)
- Extra API calls voor embedding generatie
- Complexiteit in search ranking

**Beslissing:** ✅ IMPLEMENTEREN in Fase 19

**Zie:** [ROADMAP-STATUS.md - Fase 19](../ROADMAP-STATUS.md#fase-19-edge-embeddings-)

---

### Community Detection

**Status:** ⏳ PENDING

**Wat:**
- Automatisch clusteren van entities
- LLM summaries per cluster

**Argumenten VOOR:**
- Automatische categorisatie
- Overzichtelijker graph

**Argumenten TEGEN:**
- Hoge complexiteit
- Niet essentieel voor wiki

**Beslissing:** _Te bepalen door Robin_

---

### BM25 Search

**Status:** 🔄 GEPLAND (Fase 20)

**Wat:**
- Keyword-based search naast vector search
- Hybrid fusion met RRF (Reciprocal Rank Fusion)
- PostgreSQL Full-Text Search (tsvector/tsquery)

**Bestaande Infrastructuur:**
- ✅ Vector search via Qdrant (Fase 15)
- ✅ Edge search via Qdrant (Fase 19)
- ✅ Python Graphiti heeft BM25 (als fallback)
- ⚠️ Geen native BM25 in Kanbu Node.js backend
- ⚠️ Geen searchVector kolom in WikiPage models

**Wat Fase 20 toevoegt:**
- 🔄 20.1 Validatie Bestaande Implementatie
- 🔄 20.2 BM25 Index Schema & Setup (PostgreSQL tsvector + GIN indexes)
- 🔄 20.3 BM25 Search Service (WikiBm25Service.ts)
- 🔄 20.4 Hybrid Fusion RRF (WikiHybridSearchService.ts)
- 🔄 20.5 UI Integration & Testing

**Nieuwe Componenten:**
- `WikiBm25Service.ts` - PostgreSQL full-text search
- `WikiHybridSearchService.ts` - RRF fusion van BM25 + Vector + Edge
- `searchVector` kolom in WikiPage models
- GIN indexes voor snelle full-text search
- `graphiti.hybridSearch` tRPC endpoint
- `graphiti.keywordSearch` tRPC endpoint

**Argumenten VOOR:**
- Betere keyword matching (exacte termen)
- Gefuseerde ranking via RRF
- Gratis - geen API calls nodig
- Sneller dan vector search voor exacte matches
- Highlights in zoekresultaten (ts_headline)

**Argumenten TEGEN:**
- Extra database kolom + indexes
- Iets meer complexity in search layer
- Triggers nodig voor auto-update

**Beslissing:** ✅ IMPLEMENTEREN in Fase 20

**Zie:** [ROADMAP-STATUS.md - Fase 20](../ROADMAP-STATUS.md#fase-20-bm25-search--hybrid-fusion-)

---

### Node Embeddings

**Status:** 🔄 GEPLAND (Fase 21)

**Wat:**
- Vector embedding per entity naam
- Semantic entity matching & resolution
- Opslag in Qdrant (aparte collection)

**Bestaande Infrastructuur:**
- ✅ WikiEmbeddingService - Page embeddings in Qdrant
- ✅ Qdrant client configuratie
- ✅ WikiAiService.embed() method
- ✅ FalkorDB nodes (Concept, Person, Task, Project, WikiPage)
- ⚠️ Nodes hebben geen `name_embedding` property
- ⚠️ Geen entity resolution bij node creation

**Wat Fase 21 toevoegt:**
- 🔄 21.1 Validatie Bestaande Implementatie
- 🔄 21.2 Schema & Storage Design (Qdrant `kanbu_node_embeddings` collection)
- 🔄 21.3 WikiNodeEmbeddingService Implementation
- 🔄 21.4 GraphitiService Integration (findOrCreateEntity met similarity)
- 🔄 21.5 Entity Resolution UI & Testing

**Nieuwe Componenten:**
- `WikiNodeEmbeddingService.ts` - Node embedding generatie & storage
- `NodeEmbeddingPoint` interface - Qdrant payload format
- `SimilarNodeResult` interface - Entity matching resultaten
- `findOrCreateEntity()` method - Hergebruik bestaande entities
- `graphiti.entitySuggest` tRPC endpoint - UI autocomplete
- `migrate-node-embeddings.ts` - Migration script

**Argumenten VOOR:**
- Betere entity resolution ("Jan" ≈ "J. Janssen")
- Fuzzy matching voorkomt duplicates
- Schonere graph met minder redundantie
- Autocomplete suggesties tijdens editing

**Argumenten TEGEN:**
- Extra storage kosten (Qdrant vectors)
- Extra API calls voor embedding generatie
- Threshold tuning nodig (false positives vs misses)

**Beslissing:** ✅ IMPLEMENTEREN in Fase 21

**Zie:** [ROADMAP-STATUS.md - Fase 21](../ROADMAP-STATUS.md#fase-21-node-embeddings--semantic-entity-matching-)

---

### Deduplication

**Status:** 🔄 GEPLAND (Fase 22)

**Wat:**
- Detecteer duplicate entities en edges
- Multi-layer matching: Exact → Fuzzy (MinHash/LSH) → Embedding → LLM
- IS_DUPLICATE_OF edges voor audit trail
- Graph cleanup en consolidatie

**Bestaande Infrastructuur:**
- ✅ WikiNodeEmbeddingService (Fase 21) - Embedding-based similarity
- ✅ WikiAiService - LLM calls infrastructure
- ✅ FalkorDB nodes (Concept, Person, Task, Project, WikiPage)
- ⚠️ Geen IS_DUPLICATE_OF edge type
- ⚠️ Geen dedup logic in syncWikiPage flow
- ⚠️ Geen MinHash/LSH implementatie

**Wat Fase 22 toevoegt:**
- 🔄 22.1 Validatie Bestaande Implementatie
- 🔄 22.2 Schema & Data Structures (IS_DUPLICATE_OF, interfaces)
- 🔄 22.3 WikiDeduplicationService Implementation
- 🔄 22.4 WikiAiService & LLM Prompts (detectNodeDuplicates, detectEdgeDuplicates)
- 🔄 22.5 GraphitiService Integration (syncWikiPageWithDedup)
- 🔄 22.6 tRPC Endpoints & UI (markAsDuplicate, mergeDuplicates, runBatchDedup)
- 🔄 22.7 Testing & Migration (detect-duplicates.ts)

**Nieuwe Componenten:**
- `WikiDeduplicationService.ts` - Main dedup service met MinHash/LSH
- `types/deduplication.ts` - TypeScript interfaces
- `prompts/deduplicateNodes.ts` - LLM prompts voor node dedup
- `IS_DUPLICATE_OF` edge type in FalkorDB
- `graphiti.findDuplicates` tRPC endpoint
- `graphiti.markAsDuplicate` tRPC endpoint
- `graphiti.mergeDuplicates` tRPC endpoint
- `detect-duplicates.ts` - Migration script

**Argumenten VOOR:**
- Schonere graph met minder redundantie
- Automatische cleanup tijdens sync
- Meerdere matching layers voor hoge precision
- Audit trail via IS_DUPLICATE_OF edges

**Argumenten TEGEN:**
- Complex te implementeren (maar geport van Python Graphiti)
- Extra LLM calls voor onzekere matches
- Threshold tuning nodig

**Beslissing:** ✅ IMPLEMENTEREN in Fase 22

**Zie:** [ROADMAP-STATUS.md - Fase 22](../ROADMAP-STATUS.md#fase-22-entity-deduplication--graph-cleanup-)

---

### Reflexion Extraction

**Status:** ⏳ PENDING

**Wat:**
- Multi-pass extraction
- Detecteer gemiste entities

**Argumenten VOOR:**
- Completere graph
- Minder gemiste info

**Argumenten TEGEN:**
- Extra LLM calls
- Huidige extraction voldoende

**Beslissing:** _Te bepalen door Robin_

---

## Beslissing Historie

| Datum | Feature | Beslissing | Door | Notities |
|-------|---------|------------|------|----------|
| 2026-01-13 | Initiële analyse | N/A | Claude Code | Rapport gemaakt |
| 2026-01-13 | Bi-Temporal Model | ✅ JA | Robin | Geïmplementeerd in Fase 16 |
| 2026-01-13 | Contradiction Detection | ✅ JA | Robin | Gepland voor Fase 17 |
| 2026-01-13 | Edge Embeddings | ✅ JA | Robin | Gepland voor Fase 19 |
| 2026-01-13 | BM25 Search | ✅ JA | Robin | Gepland voor Fase 20 |
| 2026-01-13 | Node Embeddings | ✅ JA | Robin | Gepland voor Fase 21 |
| 2026-01-14 | Deduplication | ✅ JA | Robin | Gepland voor Fase 22 |

---

## Volgende Review

**Datum:** Q2 2026 of bij volgende Graphiti release

**Checklist:**
- [ ] Graphiti repo updaten
- [ ] Nieuwe features analyseren
- [ ] Beslissingen heroverwegen
- [ ] Dit document updaten

---

*Laatst bijgewerkt door: Claude Code - 2026-01-13*
