# Claude Cowork Briefing — Kanbu

> **LEES DIT EERST bij elke nieuwe sessie.**
> Laatst bijgewerkt: 2026-02-06

---

## Wie ben ik in dit project?

Ik ben Claude Cowork — de **strateeg en regisseur** van Kanbu. Ik werk samen met Robin (founder) om het project te plannen, overzicht te houden, en instructies te schrijven voor Claude Code.

**Mijn rol:** Overzicht, planning, instructies schrijven, voortgang monitoren.
**Ik schrijf GEEN code direct.** Ik schrijf instructies die Claude Code uitvoert.

---

## Over Robin

- **Naam:** Robin Waslander, 56 jaar
- **Dagelijks werk:** Ramp handler & walkout bij DHL Aviation, luchthaven Brussel (BRU) — nachtdienst
- **Projecten:** Overdag en in de kantine tussen vluchten door. Weekendsprints van 19+ uur
- **Schema:** ~18-19 uur/dag actief (DHL + eigen projecten), weinig slaap nodig, 6+ maanden dit ritme
- **GitHub:** hydro13
- **Rol in projecten:** Founder, beslisser, tester, enige developer
- **Taal:** Nederlands, code is Engels
- **Stijl:** Direct, pragmatisch, "samen beter dan los van elkaar"
- **Implicatie:** Beperkte tijdvensters — overhead minimaliseren, efficiënt werken

---

## Het Project: Kanbu

**Wat:** Self-hosted, open-source project management met AI superkrachten
**Versie:** 0.1.0-beta.4 (released 18 jan 2026)
**Licentie:** MIT (gewijzigd op 22 feb 2026)
**GitHub:** https://github.com/hydro13/kanbu

### Live Omgevingen

| Omgeving      | URL                  | Status    |
| ------------- | -------------------- | --------- |
| **Productie** | https://app.kanbu.be | ✅ LIVE   |
| **Dev**       | localhost (Docker)   | ✅ Draait |

**Robin's login:** robin (Admin op alle workspaces)

### Workspaces op Productie

| Workspace     | Projecten                                       | Leden | Rol   |
| ------------- | ----------------------------------------------- | ----- | ----- |
| **ClaroNote** | 1 (CLARO)                                       | 1     | Admin |
| **GenX**      | 6 (Kanbu, Kanbu.Be, SAAS, Wiki, GitHub, Vector) | 4     | Admin |
| **Mblock BV** | 2                                               | 1     | Admin |
| **Privé**     | test                                            | -     | Admin |

### Productie Stats (6 feb 2026)

- 33 actieve taken, 63 subtasks, 4 overdue, 1 due today, 125 completed
- Weekly velocity: avg 9.8/week (9 completed deze week, +9 vs vorige week)
- Top projects: Kanbu Wiki (27 tasks), Kanbu (15 tasks), Kanbu.Be (3 tasks)
- Velocity chart: Jan 5 (13), Jan 12 (27), Jan 19-26 (laag), Feb 2 (9)

### Productie Details (live browsing 6 feb 2026)

**Dashboard features:**

- Persoonlijke begroeting met datum
- Stats bar: Active Tasks, Subtasks, Overdue, This Week, Completed
- Today widget (taken voor vandaag)
- Favorites widget (snelle toegang)
- My Productivity widget (velocity chart, top projects)
- Workspaces overzicht met cards

**GenX Workspace — 6 Projecten:**
| Project | Code | Taken | Leden | Beschrijving |
|---------|------|-------|-------|-------------|
| Kanbu | PROJTEMP | 81 | 4 | Hoofdproject, gekoppeld aan GitHub repo |
| GitHub Projects | GITHUB | 36 | 1 | Bi-directionele sync met GitHub |
| Kanbu Wiki | KWIKI | 30 | 1 | Wiki systeem development |
| Kanbu.Be | KBWEB | 4 | 1 | Website |
| SAAS | SAASKB | 3 | 1 | SaaS features voor Kanbu |
| Genx-vector | VECTOR | 0 | 1 | Vector indexer |

**Kanbu Board (PROJTEMP) — Live status:**

- Backlog (24): Analytics widgets, AI assistent MCP test, burndown chart, team performance
- Ready (1): Project Analytics - Forecast Widget (High)
- WIP (3):
  - PROJTEMP-81: OAuth MCP server function (Urgent, 10 subtasks, due Feb 27)
  - PROJTEMP-12: Dashboard UI en Menu flow (Urgent, 7 subtasks, due Feb 20)
  - PROJTEMP-14: Editor aanpassen voor tasks (Urgent, due Feb 4 — OVERDUE)
- Review: leeg
- Done: leeg
- Archive (53): o.a. UI redesign, drag & drop, avatars fix, realtime updates

**ClaroNote Workspace:**

- 1 Project: ClaroNote (CLARO), 4 taken, laatste activiteit 2 feb 2026
- Beschrijving: "Een note taking app, voor apple, android, en windows"
- Wiki: 1 pagina "Planning v0.01" (Draft, 25 jan 2026) — AudioPen gap analyse + SQL schema

**ClaroNote Board (CLARO) — Live status:**

- Backlog (2):
  - CLARO-2: Betaal mogelijkheid implementeren (Payments, due Mar 4)
  - CLARO-3: Saas backend beheer (Saas, due Feb 12)
- Ready (2):
  - CLARO-4: Hydra editor bestandformaat (Urgent, due Feb 7 — MORGEN)
  - CLARO-1: Schrijf Stijlen popups nog gedeeltelijk in het engels (due Feb 12)
- WIP/Review/Done: leeg

**Board sidebar features (per project):**

- Views: Board, List, Calendar, Timeline
- Knowledge: Wiki
- Planning: Sprints, Milestones, Analytics
- Manage: Project Details, Board Settings, Members, Import/Export, Webhooks
- Integrations: GitHub

**Mblock BV Workspace:** 2 projecten, 1 lid
**Privé Workspace:** test workspace

**BELANGRIJK:** Robin geeft aan dat veel projecten in Kanbu achter lopen op de werkelijkheid. Hij heeft geen tijd om alles handmatig bij te houden. → Dit is precies waar de Cowork + MCP integratie kan helpen.

**BELANGRIJK:** Productie = echte werkplek met echte data. Develop branch loopt bewust voor — nieuwe features moeten grondig getest worden voordat ze naar productie gaan. Merge-besluit develop → main raakt Robin's dagelijkse operatie.

### Core Kenmerken

- Kanban boards met drag-and-drop, swimlanes, sprints, milestones
- NTFS-style ACL permissiesysteem (bitmask: R=1, W=2, X=4, D=8, P=16)
- 154+ MCP tools voor Claude Code integratie
- GitHub bi-directional sync (issues, PRs, commits)
- Knowledge wiki met Graphiti graph database
- Real-time samenwerking (cursors, presence, heartbeat, conflict resolution)
- Enterprise backup (AES-256-GCM, scheduling, restore wizard)
- Docker self-hosted deployment (Coolify PaaS support)
- **ClaroNote project wordt al gemanaged IN Kanbu** (wiki + board)

### Tech Stack

| Layer    | Technologie                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind 3, Shadcn/ui, Redux Toolkit                  |
| Backend  | Node.js 22, Fastify 5, tRPC 11, Socket.io                                           |
| Database | PostgreSQL 15, Prisma 6 (50+ modellen)                                              |
| AI/Graph | TypeScript (33K+ regels custom), Graphiti graph DB layer (Python/FastAPI), FalkorDB |
| Monorepo | pnpm workspaces                                                                     |
| Deploy   | Docker, nginx, Coolify                                                              |

### Monorepo Structuur

```
kanbu/
├── apps/api/        # Fastify + tRPC backend
├── apps/web/        # React + Vite frontend
├── apps/graphiti/   # Python FastAPI knowledge graph
├── packages/shared/ # Prisma schema + types
├── packages/mcp-server/  # Claude Code MCP (154 tools)
├── packages/cli/    # Terminal CLI
└── packages/git-hooks/   # Husky pre-commit
```

---

## Huidige Status (per 2026-02-06)

### Wat af is:

- ✅ Complete PM feature set (board, tasks, sprints, milestones, views)
- ✅ ACL permissiesysteem (90%, edge cases open)
- ✅ 154+ MCP tools
- ✅ GitHub integration (bi-directional)
- ✅ Enterprise backup (encrypted, scheduled, verified)
- ✅ Wiki met knowledge graph
- ✅ Real-time collaboration
- ✅ Docker deployment
- ✅ CI/CD (GitHub Actions)

### Develop branch (NIET gemerged):

- 🔄 OAuth 2.1 voor MCP Server (Phase 19) — 8 commits
- 🔄 MCP Services admin page
- 🔄 Coolify multi-env fixes

### Wat ontbreekt:

- ❌ Custom fields
- ❌ Email notificaties
- ❌ Multi-instance (Redis voor Socket.io)
- ❌ Budget module
- ❌ Discord/Slack integraties
- ❌ Mobile responsive testing

---

## Werkproces

Identiek aan ClaroNote:

```
Robin + Cowork bespreken → Cowork schrijft instructie → Claude Code voert uit → Robin reviewt
```

### Kernbestanden

| Bestand                     | Functie                              |
| --------------------------- | ------------------------------------ |
| `ROADMAP.md`                | Globaal overzicht                    |
| `TASKS.md`                  | Geordende takenlijst                 |
| `CHANGELOG.md`              | Release history                      |
| `.claude/tasks/*.md`        | Instructiebestanden voor Claude Code |
| `memory/cowork-briefing.md` | Dit bestand                          |

---

## Gouden Regels

1. **Develop branch heeft ongemerged werk** — altijd eerst checken
2. **Monorepo** — wijzigingen kunnen meerdere packages raken
3. **Prisma schema = bron van waarheid** — `packages/shared/prisma/schema.prisma`
4. **tRPC procedures** — backend API in `apps/api/src/trpc/procedures/`
5. **ACL is complex** — 50KB acl.ts, altijd voorzichtig mee omgaan
6. **Docker deployment** — test altijd in Docker context
7. **Claude Code commit NOOIT zonder Robin's goedkeuring**

---

## Bij Nieuwe Sessie

1. Lees dit bestand
2. Lees `ROADMAP.md` voor overzicht
3. Lees `TASKS.md` voor huidige taken
4. Check: `git status` en `git log origin/main..origin/develop`
5. Vraag Robin: "Waar waren we gebleven?"

---

_Wordt bijgewerkt na elke sessie._
