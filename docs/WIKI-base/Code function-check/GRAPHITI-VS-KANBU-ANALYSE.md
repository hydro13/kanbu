# Graphiti vs Kanbu Implementatie - Code Analyse

> **Datum:** 2026-01-13
> **Doel:** Grondige code-analyse om te bepalen wat we echt gebruiken van Graphiti vs onze eigen implementatie
> **Status:** ✅ COMPLEET

---

## Executive Summary

Na grondige code-analyse is de conclusie:

**We gebruiken graphiti_core NIET effectief.** De Python Graphiti service draait maar faalt op elke request (500 errors) omdat er geen OPENAI_API_KEY geconfigureerd is. Alle wiki functionaliteit komt van onze eigen Fase 14/15 implementatie.

---

## Onderzoek Todo List

- [x] Welke endpoints zijn gedefinieerd in Python Graphiti service?
- [x] Wordt de Python service ooit aangeroepen vanuit TypeScript?
- [x] Wat doet de fallback chain exact?
- [x] Doet onze code contradiction detection?
- [x] Worden valid_at/invalid_at correct gezet?
- [x] Werkt WikiTemporalSearch.tsx?
- [x] Waar worden embeddings opgeslagen?
- [x] Wat is het actuele FalkorDB data model?

---

## 1. Python Graphiti Service Analyse

### 1.1 Endpoints Gedefinieerd

| Endpoint | Method | Functie | Wordt Aangeroepen? | Resultaat |
|----------|--------|---------|-------------------|-----------|
| `/health` | GET | Health check | ✅ Ja (elke 60s) | 200 OK |
| `/entity-types` | GET | Lijst entity types | ❌ Nee | N/A |
| `/stats` | GET | Graph statistieken | ❌ Nee | N/A |
| `/episodes` | POST | Wiki page sync | ✅ Ja | **500 Error** |
| `/episodes/list` | POST | Get episodes | ❌ Nee | N/A |
| `/search` | POST | Zoeken | ✅ Ja | **500 Error** |
| `/search/temporal` | POST | Temporal query | ✅ Ja | **500 Error** |
| `/search/hybrid` | POST | Hybrid search | ❌ Nee | N/A |
| `/graph` | POST | Graph data | ❌ Nee | N/A |

### 1.2 Waarom 500 Errors?

```
Docker logs kanbu-graphiti:

INFO:httpx:HTTP Request: POST https://api.openai.com/v1/embeddings "HTTP/1.1 401 Unauthorized"
INFO:     172.19.0.1:43498 - "POST /search HTTP/1.1" 500 Internal Server Error
INFO:     172.19.0.1:38758 - "POST /episodes HTTP/1.1" 500 Internal Server Error
```

**Oorzaak:** De Python service heeft geen `OPENAI_API_KEY` geconfigureerd. Het gebruikt een mock key (`mock-key`) die door OpenAI wordt afgewezen met 401 Unauthorized.

### 1.3 Health Check Status

```json
{
  "status": "healthy",           // FalkorDB is connected
  "database_connected": true,
  "llm_configured": false,       // ❌ Geen LLM!
  "embedder_configured": false,  // ❌ Geen embedder!
  "version": "1.0.0"
}
```

---

## 2. GraphitiService.ts Fallback Chain

### 2.1 Code Flow

```typescript
async syncWikiPage(episode: WikiEpisode): Promise<void> {
  // 1. Try Python Graphiti service
  if (await this.isPythonServiceAvailable()) {  // Returns TRUE (health = healthy)
    try {
      await this.pythonClient.addEpisode({...})  // ❌ FAILS with 500 error
    } catch (error) {
      // Falls through to step 2
    }
  }

  // 2. Try WikiAiService (Fase 14 providers)
  if (this.wikiAiService && workspaceId) {
    const aiResult = await this.syncWikiPageWithAiService(episode)  // ✅ SUCCESS
    if (aiResult) return
  }

  // 3. Rules-based fallback to FalkorDB
  await this.syncWikiPageFallback(episode)  // ✅ Fallback
}
```

### 2.2 Wat Werkt?

| Stap | Component | Status | Reden |
|------|-----------|--------|-------|
| 1 | Python Graphiti | ❌ Faalt | 500 error (geen API key) |
| 2 | WikiAiService | ✅ Werkt | OpenAI via Fase 14 |
| 3 | Rules-based | ✅ Werkt | Geen LLM nodig |

---

## 3. WikiAiService Analyse

### 3.1 Geïmplementeerde Functies

| Functie | Locatie | Werkt? |
|---------|---------|--------|
| `embed(text)` | WikiAiService.ts:157 | ✅ Via OpenAI |
| `embedBatch(texts)` | WikiAiService.ts:179 | ✅ Via OpenAI |
| `extractEntities(text)` | WikiAiService.ts:226 | ✅ Via OpenAI GPT-4o-mini |
| `summarize(text)` | WikiAiService.ts:249 | ✅ Via OpenAI |
| `chat(messages)` | WikiAiService.ts:269 | ✅ Via OpenAI |
| `stream(messages)` | WikiAiService.ts:282 | ✅ Via OpenAI |

### 3.2 Contradiction Detection

**❌ NIET GEÏMPLEMENTEERD**

```bash
grep -r "contradiction\|conflict\|invalid_at" apps/api/src/
# Geen resultaten behalve GitHub issue sync (niet gerelateerd)
```

WikiAiService doet entity extraction, maar:
- Vergelijkt NIET met bestaande entities
- Detecteert GEEN tegenstrijdigheden
- Zet GEEN `invalid_at` op oude edges

---

## 4. Temporal Functionaliteit

### 4.1 WikiTemporalSearch.tsx

**Component bestaat**, maar:

```typescript
// GraphitiService.ts:693-697
async temporalSearch(query, groupId, asOf, limit): Promise<SearchResult[]> {
  if (!await this.isPythonServiceAvailable()) {
    console.warn('[GraphitiService] Temporal search requires Python service - not available')
    return []  // ❌ Returns empty!
  }
  // Python service call...
}
```

**Resultaat:** Temporal search geeft altijd lege resultaten omdat:
1. Python service IS "available" (health = healthy)
2. Maar de request FAALT met 500 error
3. Error wordt opgevangen, leeg array teruggegeven

### 4.2 FalkorDB Temporal Velden

**❌ NIET GEÏMPLEMENTEERD**

Query FalkorDB:
```
MATCH (n:WikiPage) RETURN keys(n)
→ [title, pageId, groupId, updatedAt, slug, contentLength, updatedBy]
```

**Ontbrekende velden:**
- `valid_at` - wanneer feit waar werd
- `invalid_at` - wanneer feit stopte waar te zijn
- `created_at` - wanneer we dit leerden
- `expired_at` - wanneer record vervangen werd

We hebben alleen `updatedAt` - dat is GEEN bi-temporal model.

---

## 5. Embeddings Architectuur

### 5.1 Waar Worden Embeddings Opgeslagen?

| Systeem | Wat | Bewijs |
|---------|-----|--------|
| **Qdrant** | Wiki page embeddings | `kanbu_wiki_embeddings` collection, 9 points, 1536 dims |
| **FalkorDB** | Graph nodes/edges | GEEN embeddings op nodes |

### 5.2 Graphiti's Aanpak vs Onze Aanpak

```
Graphiti (hoe het zou moeten):
─────────────────────────────
FalkorDB:
  - Node: {name: "OAuth", embedding: [0.1, 0.2, ...]}
  - Edge: {fact_embedding: [0.3, 0.4, ...]}
  - Alles in één systeem

Onze implementatie:
───────────────────
FalkorDB:
  - Node: {name: "OAuth"}  ← GEEN embedding
  - Edge: {updatedAt: "..."}  ← GEEN embedding

Qdrant:
  - Point: {pageId: 1, embedding: [0.1, 0.2, ...]}
  - Aparte vector database
```

---

## 6. FalkorDB Data Model (Actueel)

### 6.1 Node Types en Properties

| Type | Count | Properties |
|------|-------|------------|
| WikiPage | 47 | `title`, `pageId`, `groupId`, `updatedAt`, `slug`, `contentLength`, `updatedBy` |
| Concept | 190 | `name`, `lastSeen` |
| Task | 70 | `name` |
| Project | 34 | `name` |
| Person | 33 | `name` |

### 6.2 Edge Types en Properties

| Type | Count | Properties |
|------|-------|------------|
| MENTIONS | 154 | `updatedAt` |
| LINKS_TO | 9 | `updatedAt` |

### 6.3 Ontbrekende Graphiti Features

| Feature | Graphiti | Onze FalkorDB |
|---------|----------|---------------|
| `valid_at` | ✅ | ❌ |
| `invalid_at` | ✅ | ❌ |
| `created_at` | ✅ | ❌ |
| `expired_at` | ✅ | ❌ |
| `fact_embedding` | ✅ | ❌ |
| `name_embedding` | ✅ | ❌ |
| Episode tracking | ✅ | ❌ |
| Contradiction detection | ✅ | ❌ |

---

## 7. Conclusie: Vergelijkingstabel

| Feature | Graphiti (Theorie) | Onze Code (Praktijk) | Status |
|---------|-------------------|---------------------|--------|
| **Entity Extraction** | LLM via graphiti_core | LLM via WikiAiService | ✅ Anders maar werkt |
| **Embeddings** | In FalkorDB nodes | In Qdrant (apart) | ⚠️ Werkt, complexer |
| **Bi-Temporal Model** | valid_at/invalid_at | Alleen updatedAt | ❌ Niet geïmplementeerd |
| **Contradiction Detection** | LLM detecteert conflicts | Niet aanwezig | ❌ Ontbreekt |
| **Temporal Queries** | Werkt met filters | Faalt (Python 500) | ❌ Kapot |
| **Graph Visualization** | Via /graph endpoint | Via rules-based data | ✅ Werkt |
| **Backlinks** | Via episodes | Via direct queries | ✅ Werkt |
| **Search** | Hybrid in graphiti_core | Hybrid via Qdrant+FalkorDB | ✅ Werkt |

---

## 8. Aanbevelingen

### Optie A: Fix Python Graphiti Service
```bash
# Voeg OPENAI_API_KEY toe aan apps/graphiti/.env
OPENAI_API_KEY=sk-xxx

# Herstart container
sudo docker compose restart graphiti
```

**Voordelen:**
- Krijg bi-temporal model
- Krijg contradiction detection
- Temporal queries werken

**Nadelen:**
- Dubbele LLM kosten (Python + WikiAiService)
- Complexere architectuur

### Optie B: Verwijder Python Graphiti Service
```bash
# Stop container
sudo docker compose stop graphiti

# Update GraphitiService.ts om Python nooit te proberen
```

**Voordelen:**
- Simpelere architectuur
- Minder resources
- Één LLM flow

**Nadelen:**
- Geen bi-temporal model
- Geen contradiction detection
- Temporal queries moeten herbouwd worden

### Optie C: Migreer naar Pure Graphiti
Vervang WikiAiService met graphiti_core volledig.

**Voordelen:**
- Alle Graphiti features
- Proven architecture

**Nadelen:**
- Veel werk
- Verlies Fase 14 provider flexibiliteit

---

## 9. Eindoordeel

**Huidige situatie:** We hebben een hybride systeem dat niet optimaal werkt:
- Python Graphiti service draait maar faalt
- WikiAiService werkt goed voor LLM
- Bi-temporal model is niet geïmplementeerd
- Temporal queries zijn kapot

**Aanbeveling:** Kies Optie A (fix API key) of Optie B (verwijder Python service) om een consistent systeem te krijgen.

---

*Rapport gegenereerd: 2026-01-13*
*Door: Claude Code Analyse*
