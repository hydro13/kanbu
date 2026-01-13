# Graphiti-Kanbu DIFF Rapport

> **Doel:** Identificeer wat we missen en besluit wat we gaan implementeren
> **Analyse datum:** 2026-01-13
> **Te herhalen bij:** Graphiti updates, nieuwe Kanbu features

---

## Executive Summary

| Metric | Waarde |
|--------|--------|
| **Features in Graphiti** | 60 |
| **Features in Kanbu** | 31 |
| **Gap** | 29 features |
| **Kritieke gaps** | 3 (temporal model, contradiction detection, edge embeddings) |
| **Nice-to-have gaps** | 5 (community detection, BM25 search, etc.) |
| **Kanbu-only features** | 3 (multi-provider, per-workspace config, fallback chain) |

---

## Gap Analyse

### KRITIEK: Temporal Model (Impact: HOOG)

**Wat Graphiti heeft:**
```python
class EntityEdge:
    valid_at: datetime     # Wanneer feit waar werd
    invalid_at: datetime   # Wanneer feit stopte waar te zijn
    created_at: datetime   # Wanneer we dit leerden
    expired_at: datetime   # Wanneer record vervangen werd
```

**Wat Kanbu heeft:**
```typescript
// MENTIONS edge
{
    updatedAt: Date  // Alleen dit
}
```

**Impact:**
- ❌ Geen historische queries mogelijk
- ❌ Geen "wat was waar op datum X"
- ❌ WikiTemporalSearch.tsx is broken
- ❌ Geen audit trail van wijzigingen

**Aanbeveling:** IMPLEMENTEREN - Dit is kernfunctionaliteit voor knowledge management.

---

### KRITIEK: Contradiction Detection (Impact: HOOG)

**Wat Graphiti heeft:**
```python
async def get_edge_contradictions(new_edge, existing_edges):
    # LLM vergelijkt facts
    # Returns: list van contradicted edges
```

**Wat Kanbu heeft:**
```typescript
// Niets - nieuwe facts overschrijven oude zonder check
```

**Impact:**
- ❌ Conflicterende informatie wordt niet gedetecteerd
- ❌ Oude feiten worden niet automatisch geïnvalideerd
- ❌ Geen waarschuwing bij tegenstrijdige wiki updates

**Aanbeveling:** IMPLEMENTEREN - Voorkomt data corruptie.

---

### KRITIEK: Edge Embeddings (Impact: MEDIUM)

**Wat Graphiti heeft:**
```python
class EntityEdge:
    fact: str                     # "Jan werkt bij Acme"
    fact_embedding: list[float]   # Vector van de fact
```

**Wat Kanbu heeft:**
```typescript
// Page embeddings in Qdrant (apart)
// Geen edge embeddings
```

**Impact:**
- ❌ Geen semantic search over relaties
- ❌ Alleen pagina-niveau search
- ⚠️ Mist fijnmazige zoekresultaten

**Aanbeveling:** IMPLEMENTEREN - Verbetert search significant.

---

### NICE-TO-HAVE: Community Detection (Impact: LAAG)

**Wat Graphiti heeft:**
- CommunityNode voor entity clustering
- LLM-generated summaries per community

**Wat Kanbu heeft:**
- Niets

**Impact:**
- ⚠️ Geen automatische categorisatie
- ⚠️ Geen cluster summaries

**Aanbeveling:** LATER - Niet essentieel voor wiki functionaliteit.

---

### NICE-TO-HAVE: BM25 Text Search (Impact: MEDIUM)

**Wat Graphiti heeft:**
- Hybrid search: vector + BM25 keyword matching
- RRF (Reciprocal Rank Fusion) voor combinatie

**Wat Kanbu heeft:**
- Alleen vector search in Qdrant
- Basis text search apart

**Impact:**
- ⚠️ Keyword searches zijn minder precies
- ⚠️ Geen gefuseerde ranking

**Aanbeveling:** LATER - Vector search werkt goed genoeg.

---

### NICE-TO-HAVE: Node Embeddings (Impact: LAAG)

**Wat Graphiti heeft:**
```python
class EntityNode:
    name_embedding: list[float]  # Vector van entity naam
```

**Wat Kanbu heeft:**
- Geen embeddings op nodes

**Impact:**
- ⚠️ Geen semantic entity matching
- ⚠️ Alleen exacte naam match

**Aanbeveling:** LATER - Edge embeddings zijn belangrijker.

---

### NICE-TO-HAVE: Reflexion/Multi-pass Extraction (Impact: LAAG)

**Wat Graphiti heeft:**
- Reflexion prompts om gemiste entities te vinden
- Multi-pass extraction voor betere coverage

**Wat Kanbu heeft:**
- Single-pass extraction

**Impact:**
- ⚠️ Mogelijk gemiste entities
- ⚠️ Minder complete graph

**Aanbeveling:** LATER - Huidige extraction is voldoende.

---

### NICE-TO-HAVE: Deduplication (Impact: MEDIUM)

**Wat Graphiti heeft:**
- Exact match deduplication
- LLM-based fuzzy deduplication
- IS_DUPLICATE_OF edges

**Wat Kanbu heeft:**
- Basis checks in rules-based extraction

**Impact:**
- ⚠️ Mogelijke duplicate entities
- ⚠️ Graph kan "dirty" worden

**Aanbeveling:** MEDIUM PRIORITEIT - Implementeer na temporal model.

---

## Kanbu-Only Features (Behouden!)

### Multi-Provider Support

**Wat Kanbu heeft:**
- OpenAI, Ollama, LM Studio support
- Fase 14 provider registry
- Fallback chain

**Wat Graphiti heeft:**
- Alleen cloud providers (OpenAI, Anthropic, Groq)
- Geen local LLM support

**Waarde:** HOOG - Flexibiliteit en kosten controle.

### Per-Workspace Configuration

**Wat Kanbu heeft:**
- AiProviderConfig per workspace
- Verschillende providers per workspace

**Wat Graphiti heeft:**
- Global configuration

**Waarde:** HOOG - Multi-tenant support.

### Fallback Chain

**Wat Kanbu heeft:**
```typescript
// 1. Try Python Graphiti
// 2. Fallback to WikiAiService
// 3. Fallback to rules-based
```

**Wat Graphiti heeft:**
- Geen fallback, faalt direct

**Waarde:** MEDIUM - Robuustheid.

---

## Implementatie Prioriteiten

### Fase 1: Temporal Model (Week 1-2)

| Stap | Uren | Bestanden |
|------|------|-----------|
| 1. Extend FalkorDB edge schema | 4 | graphitiService.ts |
| 2. Add temporal fields to WikiAiService | 4 | WikiAiService.ts |
| 3. Create date extraction prompts | 4 | prompts/ |
| 4. Implement extractEdgeDates() | 4 | WikiAiService.ts |
| 5. Update edge creation flow | 4 | graphitiService.ts |
| 6. Fix WikiTemporalSearch.tsx | 4 | components/ |

**Totaal:** ~24 uur

### Fase 2: Contradiction Detection (Week 2-3)

| Stap | Uren | Bestanden |
|------|------|-----------|
| 1. Create contradiction prompts | 3 | prompts/ |
| 2. Implement detectContradictions() | 4 | WikiAiService.ts |
| 3. Update syncWikiPage flow | 4 | graphitiService.ts |
| 4. Add invalidation logic | 4 | graphitiService.ts |
| 5. Test edge cases | 3 | tests/ |

**Totaal:** ~18 uur

### Fase 3: Edge Embeddings (Week 3-4)

| Stap | Uren | Bestanden |
|------|------|-----------|
| 1. Add fact field to edges | 2 | graphitiService.ts |
| 2. Generate edge embeddings | 4 | WikiEmbeddingService.ts |
| 3. Store in Qdrant or FalkorDB | 4 | decision needed |
| 4. Update search to include edges | 4 | WikiEmbeddingService.ts |
| 5. Test search improvements | 2 | tests/ |

**Totaal:** ~16 uur

### Later: Deduplication, Communities, BM25

**Geschatte uren:** 30-40 uur totaal

---

## Beslissing Template

```markdown
## Beslissing: [FEATURE NAAM]

**Datum:** YYYY-MM-DD
**Beslisser:** Robin Waslander

### Wat
[Beschrijving van de feature]

### Waarom wel/niet
[Argumenten]

### Implementatie
[ ] Ja, implementeren in Fase X
[ ] Nee, niet implementeren
[ ] Later heroverwegen op datum X

### Notities
[Extra context]
```

---

## Volgende Stappen

1. [ ] Robin: Review dit rapport
2. [ ] Besluit: Welke features implementeren?
3. [ ] Prioriteer: In welke volgorde?
4. [ ] Plan: Maak implementatie plan met Claude Code
5. [ ] Implementeer: Start met hoogste prioriteit

---

*Gegenereerd door Claude Code analyse - 2026-01-13*
*Volgende review aanbevolen: Bij Graphiti update of Q2 2026*
