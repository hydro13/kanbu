# Sync Status - Graphiti vs Kanbu Analyse

> **Doel:** Track wanneer we laatst Graphiti hebben geanalyseerd

---

## Huidige Status

| Item | Waarde |
|------|--------|
| **Laatste Analyse** | 2026-01-15 |
| **Graphiti Versie** | 0.25.3 |
| **Graphiti Commit** | 104c916e4e9afc0b3f10869c23e79d514f65446c |
| **Kanbu Versie** | Fase 17.x + Fase 24.10 |
| **Kanbu Chunks** | 13,870 (was 4,457 op 2026-01-04) |
| **Analyst** | Claude Code (Opus 4.5) |

---

## Analyse Historie

### 2026-01-15 - Update Analyse (GROOT)

**Trigger:** Kanbu heeft enorme wijzigingen ondergaan sinds 2026-01-13

**Kanbu Re-indexering:**
- + 469 nieuwe bestanden
- ~ 135 gewijzigde bestanden
- - 2 verwijderde bestanden
- Totaal: 13,870 chunks (was 4,457)

**Belangrijkste Veranderingen in Kanbu:**
1. ✅ **Fase 16 COMPLEET** - Bi-Temporal Model
   - valid_at/invalid_at/created_at/expired_at velden
   - LLM date extraction (WikiAiService.extractEdgeDates)
   - Contradiction detection basis

2. ✅ **Fase 17.1-17.3 COMPLEET** - Enhanced Contradiction Detection
   - Batch detection (max 10 facts per LLM call)
   - Confidence scores (0.0 - 1.0) - **Kanbu exclusief**
   - Categories (SEMANTIC/TEMPORAL/FACTUAL/ATTRIBUTE) - **Kanbu exclusief**

3. ✅ **Fase 24.1-24.9 COMPLEET** - Community Detection
   - Label Propagation algorithm (TypeScript port)
   - LLM summarization prompts
   - WikiClusterService
   - tRPC endpoints
   - UI components (ClusterLegend, ClusterDetailPanel)
   - 49 tests (100% passing)
   - Migration script

**Conclusie 2026-01-15:**
- **GAP IS GEDICHT!** Kanbu heeft nu feature parity met Graphiti
- Kanbu heeft **11+ exclusieve features** die Graphiti niet heeft
- Score: Kanbu 79/81 vs Graphiti 66/70
- **Geen verdere Graphiti parity werk nodig**

**Documenten Geüpdatet:**
- `comparison/FEATURE-MATRIX.md` - Volledig herschreven met nieuwe scores

---

### 2026-01-13 - Initiële Analyse

**Scope:**
- [x] Python Graphiti service endpoints geanalyseerd
- [x] GraphitiService.ts fallback chain onderzocht
- [x] WikiAiService functies gemapt
- [x] FalkorDB data model gequeried
- [x] Qdrant embeddings gecontroleerd
- [x] Graphiti broncode deep-dive (compleet)

**Bevindingen:**
- Python Graphiti service faalt (500 errors, geen API key)
- WikiAiService werkt voor LLM calls
- ~~Geen bi-temporal model geïmplementeerd~~ → Nu COMPLEET
- ~~Geen contradiction detection~~ → Nu COMPLEET
- ~~Temporal queries zijn kapot~~ → Nu FIXED

**Documenten Gemaakt:**
- `GRAPHITI-VS-KANBU-ANALYSE.md` - Initieel rapport (nu verouderd)
- `graphiti-analysis/CORE-MODULES.md` - Deep-dive Graphiti broncode
- `graphiti-analysis/TEMPORAL-MODEL.md` - Bi-temporal model analyse
- `comparison/FEATURE-MATRIX.md` - Feature-by-feature vergelijking
- `comparison/GRAPHITI-KANBU-DIFF.md` - Gap analyse en aanbevelingen
- `decisions/DECISIONS.md` - Beslissingen

---

## Volgende Analyse

**Gepland:** Q2 2026 of bij major Graphiti release

**Trigger voor nieuwe analyse:**
- [ ] Graphiti major version update (0.26.0+)
- [ ] Nieuwe significante Graphiti features
- [ ] Kanbu architecture wijzigingen

**Huidige prioriteit:**
- Fase 24.10 - UI Integration in WikiGraphView
- Fase 17.4/17.5 - Contradiction Detection UI & E2E tests
- Fase 12 - MCP Server & Claude Desktop integratie

---

## Graphiti Release Tracking

Check: https://github.com/getzep/graphiti/releases

| Release | Datum | Relevante Changes | Geanalyseerd? |
|---------|-------|-------------------|---------------|
| v0.25.3 | 2026-01 | Bump version (#1139) | ✅ Ja (2026-01-15) |

---

## Kanbu vs Graphiti Score Evolution

| Datum | Kanbu Score | Graphiti Score | Gap | Status |
|-------|-------------|----------------|-----|--------|
| 2026-01-13 | 31/64 | 60/64 | -29 | ❌ Grote gap |
| **2026-01-15** | **79/81** | **66/70** | **+13** | ✅ **Kanbu voorop!** |

---

*Automatisch bijgewerkt door Claude Code analyse sessies*
