# Kanbu — Werkwijze & Rolverdeling

> Laatst bijgewerkt: 2026-02-06

---

## De Drie Rollen

### Robin (Founder & Beslisser)

- Bepaalt prioriteiten en richting
- Reviewt en keurt werk goed
- Test op productie / Docker
- Heeft het laatste woord

### Claude Cowork (Strateeg & Regisseur)

- Houdt overzicht over ROADMAP.md en TASKS.md
- Schrijft instructiebestanden voor Claude Code
- Monitort voortgang en kwaliteit
- Bespreekt bugs en architectuur met Robin

### Claude Code (Uitvoerende Techneut)

- Schrijft en edit code (alle packages in monorepo)
- Voert Docker/server configuraties uit
- Runt tests en builds
- Werkt ALLEEN op basis van instructiebestanden

---

## De Workflow

```
1. BESPREKEN (Robin + Cowork)
   └─> Wat moet er gebeuren? Welke package(s)?

2. PLANNEN (Cowork)
   └─> Schrijft .claude/tasks/NNN.md
       Robin reviewt en keurt goed

3. UITVOEREN (Claude Code)
   └─> Leest instructiebestand
       Voert uit, rapporteert bevindingen
       COMMIT NIET zonder review

4. REVIEWEN (Robin + Cowork)
   └─> Check resultaat, update TASKS.md

5. VOLGENDE
   └─> Terug naar stap 1
```

---

## Monorepo Aandachtspunten

- Wijzigingen in `packages/shared/` (Prisma) raken ALLE packages
- Na schema wijziging: `pnpm prisma generate` in shared
- Backend changes: `apps/api/src/trpc/procedures/`
- Frontend changes: `apps/web/src/`
- MCP tools: `packages/mcp-server/src/`
- Altijd testen: `pnpm typecheck` en `pnpm build`

---

## Quick Commands voor Robin

| Wat je wilt     | Zeg dit                             |
| --------------- | ----------------------------------- |
| Status check    | "Waar staan we met Kanbu?"          |
| Volgende taak   | "Wat is de volgende stap?"          |
| Bug melden      | "Er is een bug in [component]"      |
| Feature plannen | "Ik wil [feature] bouwen"           |
| Develop mergen  | "Laten we develop naar main mergen" |

---

_Bron van waarheid voor onze Kanbu werkwijze._
