# Feature Beslissingen - Graphiti vs Kanbu

> **Doel:** Track welke Graphiti features we wel/niet gaan implementeren
> **Laatst bijgewerkt:** 2026-01-13

---

## Beslissingen Overzicht

| Feature | Beslissing | Datum | Prioriteit |
|---------|------------|-------|------------|
| Bi-Temporal Model | ✅ JA | 2026-01-13 | HOOG |
| Contradiction Detection | 🔄 FASE 17 | 2026-01-13 | HOOG |
| Edge Embeddings | ⏳ PENDING | 2026-01-13 | MEDIUM |
| Community Detection | ⏳ PENDING | 2026-01-13 | LAAG |
| BM25 Search | ⏳ PENDING | 2026-01-13 | LAAG |
| Node Embeddings | ⏳ PENDING | 2026-01-13 | LAAG |
| Deduplication | ⏳ PENDING | 2026-01-13 | MEDIUM |
| Reflexion Extraction | ⏳ PENDING | 2026-01-13 | LAAG |

**Legenda:**
- ✅ JA - Gaan we implementeren
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

**Status:** ⏳ PENDING

**Wat:**
- Vector embedding per edge fact
- Semantic search over relaties
- Opslag in Qdrant of FalkorDB

**Argumenten VOOR:**
- Fijnmaziger search resultaten
- Zoeken op relaties, niet alleen paginas

**Argumenten TEGEN:**
- Extra storage kosten
- ~16 uur implementatietijd
- Page embeddings werken al goed

**Beslissing:** _Te bepalen door Robin_

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

**Status:** ⏳ PENDING

**Wat:**
- Keyword-based search naast vector search
- Hybrid fusion met RRF

**Argumenten VOOR:**
- Betere keyword matching
- Gefuseerde ranking

**Argumenten TEGEN:**
- Vector search werkt goed
- Extra complexity

**Beslissing:** _Te bepalen door Robin_

---

### Node Embeddings

**Status:** ⏳ PENDING

**Wat:**
- Vector embedding per entity naam
- Semantic entity matching

**Argumenten VOOR:**
- Betere entity resolution
- Fuzzy matching

**Argumenten TEGEN:**
- Edge embeddings zijn belangrijker
- Extra storage

**Beslissing:** _Te bepalen door Robin_

---

### Deduplication

**Status:** ⏳ PENDING

**Wat:**
- Detecteer duplicate entities
- LLM-based fuzzy matching
- IS_DUPLICATE_OF edges

**Argumenten VOOR:**
- Schonere graph
- Minder data redundantie

**Argumenten TEGEN:**
- Complex te implementeren
- Merging is lastig

**Beslissing:** _Te bepalen door Robin_

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
