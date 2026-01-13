# Graphiti Bi-Temporal Model - Deep Dive

> **Bron:** `graphiti_core/edges.py`, `graphiti_core/utils/maintenance/temporal_operations.py`
> **Analyse datum:** 2026-01-13

---

## Wat is Bi-Temporal?

Een bi-temporal model trackt twee tijdlijnen:

1. **Transaction Time** - Wanneer we iets LEERDEN (created_at, expired_at)
2. **Valid Time** - Wanneer iets WAAR WAS (valid_at, invalid_at)

```
         Transaction Time (wanneer we het weten)
         ──────────────────────────────────────────────►
         │
Valid    │  ┌────────────────────────────┐
Time     │  │  "Jan werkt bij Acme"      │
(wanneer │  │  valid_at: 2020-01-15      │
 het     │  │  created_at: 2024-01-10    │
 waar    │  └────────────────────────────┘
 is)     │
         │      ┌─────────────────────────────────────┐
         │      │  "Jan werkt NIET MEER bij Acme"    │
         │      │  valid_at: 2020-01-15               │
         │      │  invalid_at: 2024-06-01             │
         │      │  created_at: 2024-06-15             │
         │      └─────────────────────────────────────┘
         ▼
```

---

## Graphiti's EntityEdge Temporal Fields

```python
class EntityEdge(Edge):
    # Transaction time:
    created_at: datetime      # Wanneer deze edge record werd gemaakt
    expired_at: datetime | None  # Wanneer deze edge record werd vervangen

    # Valid time:
    valid_at: datetime | None    # Wanneer het feit WAAR werd
    invalid_at: datetime | None  # Wanneer het feit STOPTE waar te zijn
```

### Field Semantics

| Field | Betekenis | Voorbeeld |
|-------|-----------|-----------|
| `created_at` | Timestamp van edge creation in graph | `2024-01-10T14:30:00Z` |
| `expired_at` | Timestamp wanneer edge vervangen werd door nieuwere info | `2024-06-15T09:00:00Z` |
| `valid_at` | Wanneer de relatie in de echte wereld begon | `2020-01-15T00:00:00Z` |
| `invalid_at` | Wanneer de relatie in de echte wereld eindigde | `2024-06-01T00:00:00Z` |

---

## Temporal Query Patterns

### Query 1: Wat is nu waar?

```cypher
MATCH (n)-[e:RELATES_TO]->(m)
WHERE e.invalid_at IS NULL
  AND e.expired_at IS NULL
RETURN e
```

### Query 2: Wat was waar op datum X?

```cypher
MATCH (n)-[e:RELATES_TO]->(m)
WHERE e.valid_at <= $as_of_date
  AND (e.invalid_at IS NULL OR e.invalid_at > $as_of_date)
  AND (e.expired_at IS NULL)  -- Alleen huidige records
RETURN e
```

### Query 3: Wat wisten we op datum X? (Audit trail)

```cypher
MATCH (n)-[e:RELATES_TO]->(m)
WHERE e.created_at <= $as_of_date
  AND (e.expired_at IS NULL OR e.expired_at > $as_of_date)
RETURN e
```

---

## LLM Date Extraction

Graphiti's `extract_edge_dates()` functie:

### Prompt Structuur

```python
context = {
    'edge_fact': "Jan started working at Acme",
    'current_episode': "Full text of current document",
    'previous_episodes': ["Previous doc 1", "Previous doc 2"],
    'reference_timestamp': "2024-01-10T14:30:00Z"
}
```

### LLM Guidelines

1. Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.SSSSSSZ`
2. Use reference timestamp als "now" voor relative time
3. Present tense fact → valid_at = reference timestamp
4. Handle "10 years ago" → bereken absolute datetime
5. Only year mentioned → January 1st 00:00:00

### Response Model

```python
class EdgeDates(BaseModel):
    valid_at: str | None  # "2020-01-15T00:00:00.000000Z"
    invalid_at: str | None  # null of "2024-06-01T00:00:00.000000Z"
```

---

## Contradiction Detection Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NIEUWE EPISODE                               │
│  "Jan is nu manager bij Acme, niet meer developer"                  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ENTITY EXTRACTION                                │
│  → EntityEdge: Jan --[IS_MANAGER]--> Acme                          │
│    valid_at: 2024-01-01                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 ZOEK BESTAANDE EDGES                                │
│  → EntityEdge: Jan --[IS_DEVELOPER]--> Acme                        │
│    valid_at: 2020-01-15, invalid_at: null                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│               LLM CONTRADICTION CHECK                               │
│  Prompt: "Does 'Jan is manager at Acme' contradict                 │
│           'Jan is developer at Acme'?"                             │
│  Response: contradicted_facts: [0]                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              UPDATE OUDE EDGE                                       │
│  EntityEdge: Jan --[IS_DEVELOPER]--> Acme                          │
│    valid_at: 2020-01-15                                            │
│    invalid_at: 2024-01-01  ← TOEGEVOEGD                            │
│    expired_at: 2024-01-10  ← TOEGEVOEGD                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## resolve_edge_contradictions() Logic

```python
def resolve_edge_contradictions(resolved_edge, invalidation_candidates):
    invalidated_edges = []

    for edge in invalidation_candidates:
        # Case 1: Edge was al invalid voor new edge valid werd
        if edge.invalid_at <= resolved_edge.valid_at:
            continue  # Geen conflict

        # Case 2: New edge was invalid voor edge valid werd
        if resolved_edge.invalid_at <= edge.valid_at:
            continue  # Geen conflict

        # Case 3: New edge is nieuwer → invalidate oude edge
        if edge.valid_at < resolved_edge.valid_at:
            edge.invalid_at = resolved_edge.valid_at  # Oude stopt wanneer nieuwe begint
            edge.expired_at = now()  # Mark als vervangen
            invalidated_edges.append(edge)

    return invalidated_edges
```

---

## Implementatie Complexiteit voor Kanbu

### Wat We Moeten Doen

| Stap | Complexiteit | Uren |
|------|--------------|------|
| 1. FalkorDB schema uitbreiden | Laag | 2-4 |
| 2. GraphitiService temporal fields toevoegen | Medium | 4-6 |
| 3. LLM date extraction prompt maken | Medium | 3-4 |
| 4. Contradiction detection implementeren | Medium | 4-6 |
| 5. Temporal query endpoints maken | Medium | 3-4 |
| 6. WikiTemporalSearch.tsx fixen | Laag | 2-3 |

**Totaal geschat:** 18-27 uur

### Code Locaties om aan te passen

| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/graphitiService.ts` | Add temporal fields to edge operations |
| `apps/api/src/lib/ai/wiki/WikiAiService.ts` | Add extractEdgeDates(), detectContradictions() |
| `apps/api/src/lib/ai/wiki/prompts/` | Nieuw: temporal prompts |
| `apps/web/src/components/wiki/WikiTemporalSearch.tsx` | Fix to use new endpoints |

---

## Prompts om te Kopiëren

### Date Extraction Prompt

```typescript
const extractEdgeDatesPrompt = `
You are an AI assistant that extracts datetime information for graph edges.

<FACT>
{edge_fact}
</FACT>

<REFERENCE TIMESTAMP>
{reference_timestamp}
</REFERENCE TIMESTAMP>

<EPISODE CONTENT>
{episode_content}
</EPISODE CONTENT>

Task: Extract valid_at and invalid_at for this fact.
- valid_at: When did this relationship become true?
- invalid_at: When did this relationship stop being true? (null if still true)

Use ISO 8601 format: YYYY-MM-DDTHH:MM:SS.SSSSSSZ
If present tense, valid_at = reference timestamp.
Handle relative time ("10 years ago") based on reference timestamp.
`;
```

### Contradiction Detection Prompt

```typescript
const detectContradictionsPrompt = `
You are an AI assistant that determines which facts contradict each other.

<EXISTING FACTS>
{existing_facts}
</EXISTING FACTS>

<NEW FACT>
{new_fact}
</NEW FACT>

Return a JSON array of indices of existing facts that the new fact contradicts.
Example: [0, 2] if facts at index 0 and 2 are contradicted.
Return [] if no contradictions.
`;
```

---

*Gegenereerd door Claude Code analyse - 2026-01-13*
