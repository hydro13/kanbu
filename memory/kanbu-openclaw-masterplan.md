# Kanbu × OpenClaw — Masterplan

**Datum:** 22 februari 2026
**Status:** Architectuur volledig — klaar om te bouwen

---

## Visie

Gebruiker heeft OpenClaw. Downloadt Kanbu. `docker compose up`. Heeft enterprise project management + agent dispatch + live observability + knowledge graph die onthoudt wat agents deden. In één product. Bestaat nergens anders.

---

## Beslissingen (genomen)

| Vraag         | Beslissing                                                      |
| ------------- | --------------------------------------------------------------- |
| Repo          | Kanbu core uitbreiden — geen fork                               |
| Naam/branding | "OpenClaw Ready" badge, niet aparte naam                        |
| Licentie      | **MIT** (was AGPL) — maximale adoptie, bedrijven blokkeren niet |
| Docker        | Eerst "bring your own OpenClaw", later all-in-one               |
| MVP definitie | Werkend product voor Robin zelf, daarna community               |
| Timing        | Geen deadline — eerst goed, dan delenk                          |

---

## Het workspace/project/agent model

Dit is de kern van Kanbu's architectuur EN de blauwdruk voor agent isolatie.

```
Workspace (= bedrijf)
  ├── Workspace wiki (root — zichtbaar voor alles)
  ├── Project A (geïsoleerd)
  │     └── Project wiki (ziet workspace wiki, niet B of C)
  ├── Project B (geïsoleerd)
  │     └── Project wiki
  └── Project Group X
        ├── Project C ←→ Project D (zien elkaar + workspace)
        └── Project D
```

**Agents volgen exact dezelfde isolatieregels als data.**

- Agent in Project A: ziet Project A wiki + workspace wiki
- Agent in Project C (group X): ziet C, D en workspace wiki
- Agents binnen hetzelfde project kennen elkaar en kunnen communiceren
- Agents in een group kunnen communiceren en kennis uitwisselen
- Agents in Project A weten niets van Project B

### Voorbeeld 1 — Web agency workspace

- Workspace wiki: bedrijfsinfo, huisstijl, tarieven, medewerkers
- Klant A project: eigen taken, eigen wiki, eigen agents
- Klant B project: volledig geïsoleerd van Klant A
- Beide zien de workspace wiki (huisstijl, tarieven etc.)

### Voorbeeld 2 — Robin's workspace

- Workspace wiki: hoe agents werken, design flows, werkwijze, regels
- kanbu-website, kanbu-saas, kanbu-app = 3 losse projecten
- Samen in één project group → agents zien elkaars context, dependencies mogelijk

---

## Hoe OpenClaw agents opslaat

Filesystem-gebaseerd. Elke agent = directory met markdown bestanden.

```
~/.openclaw/
  agents/{naam}/        ← agent workspace directory
  workspace/            ← SOUL.md, MEMORY.md, AGENTS.md, TOOLS.md
  openclaw.json         ← agents config (model, workspace path per agent)
```

**Implicatie:** Kanbu beheert agent workspace directories. Per project maakt Kanbu een workspace aan met de juiste context. OpenClaw pikt hem op via de config.

---

## Architectuur — wat er gebouwd moet worden

### Laag 1 — Docker compose compleet (uren)

`docker-compose.openclaw.yml` met:

- PostgreSQL
- API (Fastify)
- Web (React/nginx)
- FalkorDB
- Graphiti (Python/FastAPI)
- Optioneel: OpenClaw gateway

Alles getest, één `.env` bestand.

### Laag 2 — OpenClaw koppeling in Kanbu (1-2 dagen)

- Workspace settings: gateway URL + token veld
- `packages/openclaw-bridge/` — de missende schakel. Bevat:
  - `OpenClawClient` — WebSocket client met challenge-response auth
  - Device identity (Ed25519 key pair) — VEREIST door gateway, zonder dit weigert de gateway
  - `call(method, params)` — generieke gateway RPC
  - `dispatchTask(task, sessionKey, contextBundle)` — taak naar agent sturen
- Task dispatch = letterlijk: `client.call('chat.send', { sessionKey: 'agent:main:{name}', message })`
- Session keys: `agent:main:{session_name}` (OpenClaw formaat)
- Terugkoppeling agent → Kanbu: via bestaande MCP tools (agent update tasks direct)
- Environment vars: `OPENCLAW_GATEWAY_URL`, `OPENCLAW_GATEWAY_TOKEN`

**Referentie implementatie:** mission-control `src/lib/openclaw/client.ts` (~400 regels)
Device identity oplossing al uitgewerkt in `src/lib/openclaw/device-identity.ts`

### Laag 3 — Agent management in Kanbu (1 week)

- Agents als eerste-klas entiteiten in het datamodel
  - Agent heeft: naam, specialisme, system prompt basis, workspace path
  - Agent hoort bij: workspace (shared pool) of project (dedicated)
- UI: agents beheren per workspace en per project
- Kanbu maakt/beheert OpenClaw workspace directories per agent
- Context injection bij spawn: wiki bundle compileren (zie Laag 5)

### Laag 4 — "Assign to Agent" + observability (3-5 dagen)

- Knop op elke taak: "Run with Agent"
- Kanbu bouwt context bundle (taak + wiki + graph) → stuurt naar OpenClaw
- Inline observability panel in taak: agent thoughts streamen live
- Exec approval requests → blokkerende subtasks in Kanbu
- Agent updates taak status via bestaande MCP tools

### Laag 5 — Wiki context injection (1 week)

Automatische context bundle bij agent dispatch:

- Project wiki pagina's (relevant aan de taak)
- Workspace wiki pagina's
- Group project wikis (indien van toepassing)
- Graphiti graph nodes (eerdere agent runs)
- Token budget per bundle (agent bepaalt zelf welke context hij nodig heeft)

**Open vraag:** push model (Kanbu injecteert alles) of pull model (agent vraagt zelf context op via API)? Waarschijnlijk: Kanbu pusht basis context, agent kan extra opvragen via MCP tools.

### Laag 6 — Agent-to-agent communicatie (nader te onderzoeken)

- Binnen project: via gedeelde taak context + Kanbu comment systeem
- Binnen group: via group wiki + gedeelde Graphiti namespace
- Orchestratie agent ("CEO agent"): coördineert andere agents, ziet alles binnen zijn scope
- Open: directe agent-to-agent via OpenClaw sessions of altijd via Kanbu als bemiddelaar?

### Laag 7 — Graphiti als agent geheugen (1 week)

- Alles wat agents doen wordt in Graphiti geschreven
- Aparte entity types voor agent acties vs wiki kennis (maar zelfde graph)
- Namespace: `workspace:{id}`, `project:{id}`, `agent:{id}`
- Temporele queries: "wat deed agent X vorige week in dit project?"

### Laag 8 — CEO laag / Symbiose interface (nader te ontwerpen)

De plek waar Robin en OpenClaw samen alles overzien en aansturen.

- Geen dashboardje — dit is de strategische command layer
- Overzicht: alle actieve agents, alle lopende taken, alle approvals
- Robin kan prioriteiten zetten, agents bijsturen, context toevoegen
- OpenClaw kan vragen stellen, opties voorleggen, besluiten aanvragen
- Nog te onderzoeken: hoe ziet de UX hiervan eruit?

---

## Architectuurbeslissingen (beantwoord 22 feb 2026, samen met Max ⚡)

### Q1 — Agent datamodel in Prisma

**Plat Prisma model:**

```prisma
model Agent {
  id          String   @id @default(cuid())
  name        String
  role        String?          // "developer", "researcher", etc.
  workspaceId String           // shared pool
  projectId   String?          // dedicated (nullable)
  systemPrompt String?
  workspacePath String?        // ~/.openclaw/agents/{name}/
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model AgentRun {
  id        String   @id @default(cuid())
  agentId   String
  taskId    String
  sessionKey String   // agent:main:{name}
  status    String   // running/waiting/blocked/done
  startedAt DateTime @default(now())
  endedAt   DateTime?
}
```

**Graphiti entity types (nieuw, toevoegen aan Robin's fork):**

- `Agent` — persistente identiteit, edges naar Project/User/Concept (ASSIGNED_TO, CREATED_BY, KNOWS_ABOUT)
- `AgentAction` — per significante actie: action_type, summary, edges naar Task/WikiPage/Agent
- Geen `AgentRun` in graph — dat is Prisma metadata

### Q2 — Context injection: Push-first hybride

**MVP (push):** Kanbu stuurt `contextBundle` bij dispatch:

- Task title + description + subtasks
- 2-3 direct gerelateerde wiki pagina's
- Graphiti 1-hop snapshot rondom de taak
- Project-level SOUL.md (agent persona)

**Fase 2 (pull erbij):** agent krijgt read-only MCP subset: `wiki.get`, `task.list`, `graphiti.query`. Pas als permissiemodel klaar is — 154 tools zonder scoping = security nachtmerrie.

### Q3 — Approval flow (technisch)

1. Agent in OpenClaw bereikt punt waar exec nodig is → OpenClaw pauzeer
2. OpenClaw stuurt event via WebSocket naar Kanbu bridge: `{ type: "approval_required", runId, sessionKey, command, reason }`
3. Kanbu maakt blokkerende subtask: "⚠️ Approval: `command`" — status `blocked`, assigned aan Robin
4. Robin keurt goed op het board (of Telegram notificatie via Kees)
5. Kanbu stuurt approve/reject terug via bridge
6. OpenClaw hervat session
7. Subtask → `completed` of `cancelled`

**Technisch:** bridge houdt pending approvals map bij (runId:approvalId → callback). Timeout → auto-reject + graceful failure aan agent.

### Q4 — CEO laag MVP (3 dingen, niet meer)

1. **Dashboard view:** actieve AgentRuns met status, blocked items bovenaan
2. **One-click dispatch:** "Run with Agent" knop op elke task → kiest agent → stuurt contextBundle
3. **Run log:** per AgentRun, wat deed de agent, gelinkt aan gewijzigde tasks/wiki

Geen multi-agent orchestration, geen cost dashboard, geen agent marketplace voor MVP.

### Q5 — Graphiti namespacing

Property-based filtering met `workspace_id` en `project_id` op de bestaande entiteiten. Geen aparte grafen per workspace/project. Robin's entity types (WikiPage/KanbuTask/KanbuUser/KanbuProject/Concept) zijn al een vorm van typing. Voeg `Agent` en `AgentAction` toe aan het bestaande model.

---

## Strategie — van obscuur naar zichtbaar

Robin's doel: geld verdienen als AI architect.
Huidige realiteit: DHL ramp loader met sterke portfolio maar geen publiek.

**Volgorde:**

1. Kanbu werkend voor Robin zelf (MVP)
2. Licentie naar MIT
3. Goede README + demo op app.kanbu.be
4. Posten in OpenClaw Discord + community
5. Content op LinkedIn/X over wat je gebouwd hebt
6. Zichtbaarheid → freelance/consulting aanvragen → inkomen als AI architect

Kanbu is niet het product dat geld oplevert. Kanbu is het bewijs dat jij het kunt.

---

## Kanbu Repository & Deployment Architectuur

### Branching strategie

- `develop` branch → Coolify webhook → **dev.kanbu.be** (test/development)
- `main` branch → Coolify webhook → **app.kanbu.be** (productie, Robin's echte projecten)

### Locaties

| Omgeving       | Branch        | Locatie                                        |
| -------------- | ------------- | ---------------------------------------------- |
| Productie      | `main`        | Hetzner via Coolify (46.224.226.106)           |
| Development    | `develop`     | Hetzner via Coolify (46.224.226.106)           |
| **Max lokaal** | **`develop`** | **`~/genx/v6/dev/kanbu/`** ← de echte dev repo |

### Lokale stack op Max (draait al 12 dagen)

- `kanbu-graphiti` — Robin's EIGEN fork van Graphiti, gebouwd in `apps/graphiti/graphiti_core/`
  - FalkorDB driver (ipv Neo4j)
  - Anthropic + Gemini + Groq LLM clients (Robin zelf toegevoegd)
  - Voyage embedder (Robin zelf toegevoegd)
  - Kanbu-specifieke entity types: WikiPage, KanbuTask, KanbuUser, KanbuProject, Concept
  - 827-regel FastAPI service voor wiki-integratie
- `kanbu-falkordb` — graph database (port 6379 + 3000)
- `kanbu-postgres` — hoofddatabase (port 5432)
- Container image gebouwd vanuit `docker/docker-compose.yml` op 12 jan 2026
- **Geen live mounts** — image is geïsoleerd, codewijzigingen raken de container niet

### BELANGRIJK

- Nooit werken vanuit een GitHub clone — Max's `develop` branch heeft altijd de nieuwste code
- Altijd werken in `~/genx/v6/dev/kanbu/` op Max
- Graphiti is GEEN externe dependency — het zit IN de Kanbu repo als `apps/graphiti/`
- De 8 commits boven `main` (OAuth 2.1 MCP Server) zitten in `develop` en staan op dev.kanbu.be

## Build volgorde — voortgang

### ✅ Stap 0 — MIT licentie (KLAAR — 22 feb 2026)

Gewijzigd van AGPL-3.0 naar MIT. Bijgewerkt in: LICENSE, package.json, README, CHANGELOG, SECURITY, CONTRIBUTING, ROADMAP, cowork-briefing.

### ✅ Stap 1 — `packages/openclaw-bridge/` (KLAAR — 22 feb 2026)

HTTP client naar OpenClaw gateway. Gebouwd als `@kanbu/openclaw-bridge`:

- `OpenClawHttpClient` — `send()`, `dispatchTask()`, `ping()` via `POST /v1/chat/completions`
- `ApprovalBridge` — `waitForApproval()`, `resolve()`, `getPending()` met auto-timeout
- `buildTaskMessage()` — bouwt gestructureerde prompt van KanbuTaskContext
- Types: `OpenClawConfig`, `KanbuTaskContext`, `PendingApproval`, `ApprovalDecision`
- 21 tests groen, dist/ aangemaakt

**Noot:** HTTP variant gekozen (niet WebSocket). WebSocket + Ed25519 = Fase 2 voor streaming observability.

### 🔄 Stap 2 — Prisma Agent model (VOLGENDE)

Nieuw `Agent` + `AgentRun` model toevoegen aan `packages/shared/prisma/schema.prisma`. Migration draaien.

```prisma
model Agent {
  id            String    @id @default(cuid())
  name          String
  role          String?
  workspaceId   String
  projectId     String?
  systemPrompt  String?
  workspacePath String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model AgentRun {
  id         String    @id @default(cuid())
  agentId    String
  taskId     String
  sessionKey String
  status     String    // running / waiting / blocked / done
  startedAt  DateTime  @default(now())
  endedAt    DateTime?
}
```

### ⏳ Stap 3 — Docker compose uitbreiden

`docker/docker-compose.openclaw.yml` toevoegen. Optioneel: OpenClaw gateway erbij.

### ⏳ Stap 4 — UI: "Run with Agent" knop + run log

Eenvoudige dispatch knop op taak detail. AgentRun detail pagina.
