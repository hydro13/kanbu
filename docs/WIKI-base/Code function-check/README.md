# Code Function Check - Graphiti vs Kanbu Analyse Systeem

> **Doel:** Systematisch vergelijken van Graphiti broncode met onze eigen implementatie
> **Herhaalbaar:** Dit proces kan herhaald worden bij Graphiti updates

---

## Quick Start

### Voor Claude Code

```
1. Check of Graphiti repo geïndexeerd is:
   → Gebruik: mcp__genx-reference-repos__list_repos

2. Als niet geïndexeerd of outdated:
   → Gebruik: mcp__genx-reference-repos__fetch_repo met url="https://github.com/getzep/graphiti"
   → Gebruik: mcp__genx-reference-repos__index_repo met name="graphiti"

3. Zoek in Graphiti code:
   → Gebruik: mcp__genx-reference-repos__search_code met query="<zoekterm>" repos=["graphiti"]

4. Update de rapporten in deze map
```

### Voor Robin

1. **Check huidige status:** Bekijk `SYNC-STATUS.md` voor laatste analyse datum
2. **Bekijk diff:** `GRAPHITI-KANBU-DIFF.md` toont wat we missen
3. **Beslissingen:** `DECISIONS.md` bevat wat we wel/niet gaan implementeren

---

## Mapstructuur

```
Code function-check/
├── README.md                      ← Dit bestand (handleiding)
├── SYNC-STATUS.md                 ← Wanneer laatst geanalyseerd + Graphiti versie
├── GRAPHITI-VS-KANBU-ANALYSE.md   ← Bestaand: initiële analyse
│
├── graphiti-analysis/             ← Graphiti broncode analyse
│   ├── CORE-MODULES.md            ← Overzicht van graphiti_core modules
│   ├── ENTITY-EXTRACTION.md       ← Hoe Graphiti entities extract
│   ├── TEMPORAL-MODEL.md          ← Bi-temporal implementatie details
│   ├── CONTRADICTION-DETECTION.md ← Hoe conflicts gedetecteerd worden
│   └── SEARCH-SYSTEM.md           ← Hybrid search implementatie
│
├── kanbu-analysis/                ← Onze code analyse
│   ├── WIKI-AI-SERVICE.md         ← WikiAiService functies
│   ├── GRAPHITI-SERVICE.md        ← GraphitiService.ts analyse
│   ├── EMBEDDING-SERVICE.md       ← WikiEmbeddingService analyse
│   └── FALKORDB-MODEL.md          ← Huidig FalkorDB schema
│
├── comparison/                    ← Vergelijkingen
│   ├── FEATURE-MATRIX.md          ← Feature-by-feature vergelijking
│   ├── GRAPHITI-KANBU-DIFF.md     ← Wat missen we? Wat hebben we extra?
│   └── IMPLEMENTATION-GAP.md      ← Technische gap analyse
│
└── decisions/                     ← Beslissingen
    ├── DECISIONS.md               ← Wat gaan we wel/niet bouwen
    ├── IMPLEMENTATION-PLAN.md     ← Stappenplan voor gekozen features
    └── CHANGELOG.md               ← Historie van beslissingen
```

---

## Herhaalbaar Analyse Proces

### Wanneer Uitvoeren?

- [ ] Bij major Graphiti release (check: https://github.com/getzep/graphiti/releases)
- [ ] Wanneer we nieuwe wiki features plannen
- [ ] Minimaal 1x per kwartaal

### Stappen

#### Stap 1: Update Graphiti Repo (5 min)

```
# In Claude Code:
1. mcp__genx-reference-repos__fetch_repo
   url: "https://github.com/getzep/graphiti"
   branch: "main"

2. mcp__genx-reference-repos__index_repo
   name: "graphiti"
   incremental: true
```

#### Stap 2: Check Graphiti Versie

```python
# Zoek in graphiti repo:
search_code("__version__", repos=["graphiti"])
# Of check pyproject.toml
```

#### Stap 3: Analyseer Nieuwe/Gewijzigde Code

Focus gebieden:
- `graphiti_core/nodes.py` - Node definities
- `graphiti_core/edges.py` - Edge definities
- `graphiti_core/graphiti.py` - Main class
- `graphiti_core/search/` - Search implementatie
- `graphiti_core/llm_client/` - LLM integratie

#### Stap 4: Update Rapporten

1. Update `SYNC-STATUS.md` met nieuwe datum/versie
2. Update `graphiti-analysis/` documenten indien nodig
3. Update `comparison/GRAPHITI-KANBU-DIFF.md`
4. Bespreek met Robin wat te doen

#### Stap 5: Documenteer Beslissingen

Update `decisions/DECISIONS.md` met:
- Datum
- Graphiti versie
- Wat we overnemen
- Wat we NIET overnemen (en waarom)

---

## Graphiti Repository Info

| Item | Waarde |
|------|--------|
| **GitHub** | https://github.com/getzep/graphiti |
| **Docs** | https://docs.getzep.com/graphiti |
| **License** | Apache 2.0 |
| **Taal** | Python |
| **Dependencies** | Neo4j/FalkorDB, OpenAI/Anthropic |

### Key Files om te Monitoren

| File | Wat het doet |
|------|--------------|
| `graphiti_core/graphiti.py` | Main Graphiti class |
| `graphiti_core/nodes.py` | EntityNode, EpisodicNode definities |
| `graphiti_core/edges.py` | EntityEdge, EpisodicEdge definities |
| `graphiti_core/search/search.py` | Search implementatie |
| `graphiti_core/search/search_utils.py` | Hybrid search helpers |
| `graphiti_core/llm_client/` | LLM abstractie layer |
| `graphiti_core/prompts/` | LLM prompts voor extraction |

---

## Onze Stack (Kanbu)

| Component | Locatie | Functie |
|-----------|---------|---------|
| **WikiAiService** | `apps/api/src/lib/ai/wiki/WikiAiService.ts` | LLM calls (embed, extract, chat) |
| **WikiEmbeddingService** | `apps/api/src/lib/ai/wiki/WikiEmbeddingService.ts` | Qdrant vector storage |
| **GraphitiService** | `apps/api/src/services/graphitiService.ts` | FalkorDB graph + fallback chain |
| **ProviderRegistry** | `apps/api/src/lib/ai/providers/` | Multi-provider support |

---

## Versie Historie

| Datum | Graphiti Versie | Kanbu Status | Beslissing |
|-------|-----------------|--------------|------------|
| 2026-01-13 | v0.x | Initiële analyse | Zie GRAPHITI-VS-KANBU-ANALYSE.md |

---

*Laatst bijgewerkt: 2026-01-13*
