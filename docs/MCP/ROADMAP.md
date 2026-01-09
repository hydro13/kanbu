# Kanbu MCP Server - Roadmap

## Overzicht

Dit document beschrijft de implementatie roadmap voor de Kanbu MCP Server met one-time setup code pairing.

## Implementatie Fasen

### Fase 1: Pairing Infrastructure ✅ COMPLEET (2026-01-09)

**Doel:** Setup code systeem, profile page UI, en MCP server met pairing.

**Status:** Volledig geïmplementeerd en werkend.

#### 1.1 Database Models

```prisma
// Tijdelijke setup code (5 min TTL, one-time use)
model AssistantSetupCode {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  code        String    @unique  // KNB-XXXX-XXXX
  createdAt   DateTime  @default(now())
  expiresAt   DateTime  // createdAt + 5 min
  consumedAt  DateTime?
  machineId   String?   // Set when consumed

  @@index([code])
  @@index([userId])
}

// Permanente binding (na consumption van setup code)
model AssistantBinding {
  id            Int       @id @default(autoincrement())
  userId        Int
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  machineId     String    // Hash van machine identifier
  machineName   String?   // "MAX (Linux)"
  tokenHash     String    @db.VarChar(255)
  tokenPrefix   String    @db.VarChar(8)
  createdAt     DateTime  @default(now())
  lastUsedAt    DateTime?
  revokedAt     DateTime?

  @@unique([userId, machineId])
  @@index([tokenPrefix])
}
```

- [x] Prisma schema toevoegen (`packages/shared/prisma/schema.prisma`)
- [x] Migration uitvoeren (`prisma db push`)
- [x] Seed data voor testing

#### 1.2 Backend API - Setup Code

- [x] `assistant.generateSetupCode` - Genereer nieuwe setup code
  - Invalideert bestaande ongebruikte codes
  - Format: `KNB-XXXX-XXXX` (uppercase alfanumeriek)
  - TTL: 5 minuten
  - Return: code + expiresAt

- [x] `assistant.exchangeSetupCode` - Wissel code voor permanent token
  - Input: setup code + machineId
  - Validates: niet expired, niet consumed
  - Creates: AssistantBinding met permanent token
  - Marks: setup code als consumed
  - Return: permanent token + user info

- [x] `assistant.getBindings` - Lijst van verbonden machines
  - Return: array van machine bindings (zonder tokens)

- [x] `assistant.revokeBinding` - Disconnect een machine
  - Input: bindingId
  - Sets: revokedAt timestamp

- [x] `assistant.getActiveSetupCode` - Haal actieve setup code op (voor UI polling)

#### 1.3 Backend API - Token Validation

- [x] `assistant.validateToken` - Valideer permanent token
  - Input: token
  - Validates: niet revoked, binding exists
  - Updates: lastUsedAt
  - Return: user context

- [ ] Rate limiting middleware (gepland voor toekomstige fase)
  - 100 req/min per binding
  - 5 setup code attempts per uur

#### 1.4 Profile Page UI

- [x] "AI Assistant" sectie in profile page (`apps/web/src/pages/profile/AiAssistant.tsx`)
- [x] **Niet verbonden staat:**
  - Uitleg tekst
  - "Generate Setup Code" button
- [x] **Setup code gegenereerd:**
  - Code display (groot, duidelijk)
  - Countdown timer
  - "Copy Code" button
  - Warning text over eenmalig gebruik
- [x] **Verbonden staat:**
  - Lijst van verbonden machines
  - Per machine: naam, connected date, last used
  - "Disconnect" button per machine met confirmatie
  - "Generate New Setup Code" button
- [x] Security informatie sectie

#### 1.5 MCP Server Setup

- [x] Package: `packages/mcp-server`
- [x] TypeScript + ESM configuratie (NodeNext module)
- [x] MCP SDK dependency (v1.25.2)
- [x] Local token storage (`~/.config/kanbu/mcp.json`)
- [x] Machine ID generation (SHA256 hash van hostname + user)

#### 1.6 MCP Tools - Pairing

- [x] `kanbu_connect` - Verbind met setup code
  - Input: setup code
  - Calls: exchangeSetupCode API
  - Stores: permanent token locally
  - Return: user info + permissions summary

- [x] `kanbu_whoami` - Toon verbindingsinfo
  - Return: user, role, permissions, machine

- [x] `kanbu_disconnect` - Verbreek verbinding
  - Removes: local token file
  - (Server-side revocation gepland voor volgende fase)

**Deliverables Fase 1:** ✅ ALLEMAAL OPGELEVERD
- ✅ Werkend setup code pairing systeem
- ✅ Profile page AI Assistant sectie
- ✅ MCP server met 3 pairing tools
- ✅ Multi-machine support

---

### Fase 2: Core Kanbu Tools ✅ COMPLEET (2026-01-09)

**Doel:** Basis project en task management via MCP.

**Status:** Volledig geïmplementeerd en werkend.

#### 2.1 Workspace & Project Tools

- [x] `kanbu_list_workspaces` - Lijst toegankelijke workspaces
- [x] `kanbu_get_workspace` - Workspace details met projecten
- [x] `kanbu_list_projects` - Lijst projecten (gefilterd op ACL)
- [x] `kanbu_get_project` - Project details met columns
- [x] `kanbu_create_project` - Nieuw project (W op workspace)

#### 2.2 Task Tools

- [x] `kanbu_list_tasks` - Taken in project met filters
- [x] `kanbu_get_task` - Taak details met subtasks/comments
- [x] `kanbu_create_task` - Nieuwe taak aanmaken
- [x] `kanbu_update_task` - Taak properties bewerken
- [x] `kanbu_move_task` - Status/kolom wijzigen
- [x] `kanbu_my_tasks` - Mijn toegewezen taken

#### 2.3 ACL Integration

- [x] Permission check via Bearer token authenticatie
- [x] Duidelijke foutmeldingen bij geen toegang
- [ ] Audit logging met "via Claude Code" marker (gepland)

**Deliverables Fase 2:** ✅ ALLEMAAL OPGELEVERD
- ✅ 11 core tools (workspace, project, task management)
- ✅ ACL enforcement via tRPC procedures
- ✅ Tools files georganiseerd in `src/tools/` directory

---

### Fase 3: Subtasks & Comments ✅ COMPLEET (2026-01-09)

**Doel:** Subtaak en comment management.

**Status:** Volledig geïmplementeerd en werkend.

#### 3.1 Subtask Tools

- [x] `kanbu_list_subtasks` - Lijst subtaken met status/assignee/time
- [x] `kanbu_create_subtask` - Nieuwe subtaak aanmaken
- [x] `kanbu_update_subtask` - Subtaak properties bewerken
- [x] `kanbu_toggle_subtask` - Toggle tussen TODO en DONE
- [x] `kanbu_delete_subtask` - Subtaak verwijderen

#### 3.2 Comment Tools

- [x] `kanbu_list_comments` - Comments op een taak
- [x] `kanbu_add_comment` - Comment toevoegen
- [x] `kanbu_update_comment` - Eigen comment bewerken
- [x] `kanbu_delete_comment` - Comment verwijderen

**Deliverables Fase 3:** ✅ ALLEMAAL OPGELEVERD
- ✅ 9 extra tools (5 subtask + 4 comment)
- ✅ Time tracking display in subtasks
- ✅ Status toggle functionaliteit

---

### Fase 4: Search & Smart Features ✅ COMPLEET (2026-01-09)

**Doel:** Zoeken en activiteit queries.

**Status:** Volledig geïmplementeerd en werkend.

#### 4.1 Search Tools

- [x] `kanbu_search_tasks` - Full-text search in tasks (title, reference, description)
- [x] `kanbu_search_global` - Search across tasks, comments, and wiki pages

#### 4.2 Activity Tools

- [x] `kanbu_recent_activity` - Recent project activity
- [x] `kanbu_task_activity` - Activity history for a specific task
- [x] `kanbu_activity_stats` - Activity statistics (last 30 days)

**Deliverables Fase 4:** ✅ ALLEMAAL OPGELEVERD
- ✅ 5 extra tools (2 search + 3 activity)
- ✅ Full-text search in tasks, comments, wiki
- ✅ Activity timeline and statistics

---

### Fase 5: Analytics & Insights

**Doel:** Inzichten en rapportage.

#### 5.1 Project Analytics

- [ ] `kanbu_project_stats`
- [ ] `kanbu_burndown_data`
- [ ] `kanbu_task_distribution`

#### 5.2 Personal Insights

- [ ] `kanbu_my_productivity`
- [ ] `kanbu_pending_reviews`

**Deliverables Fase 5:**
- 5 analytics tools

---

## Tool Overzicht

| Fase | Tools | Cumulatief | Status |
|------|-------|------------|--------|
| Fase 1 | 3 (pairing) | 3 | ✅ Compleet |
| Fase 2 | 11 (core) | 14 | ✅ Compleet |
| Fase 3 | 9 (subtasks/comments) | 23 | ✅ Compleet |
| Fase 4 | 5 (search/activity) | 28 | ✅ Compleet |
| Fase 5 | 5 (analytics) | 33 | Gepland |

## Prioriteit Matrix

| Item | Impact | Effort | Prioriteit |
|------|--------|--------|------------|
| Setup code systeem | Kritiek | Medium | P0 |
| Profile page UI | Kritiek | Low | P0 |
| `kanbu_connect` | Kritiek | Low | P0 |
| `kanbu_my_tasks` | Hoog | Low | P1 |
| `kanbu_create_task` | Hoog | Low | P1 |
| `kanbu_move_task` | Hoog | Low | P1 |
| `kanbu_search_tasks` | Hoog | Medium | P2 |
| `kanbu_add_comment` | Medium | Low | P2 |

## Security Checklist

### Setup Code
- [x] Format: `KNB-XXXX-XXXX` (14 chars inclusief hyphens)
- [x] Alfanumeriek uppercase (geen O/0/I/1 ambiguity)
- [x] TTL: 5 minuten
- [x] One-time use: consumed na exchange
- [ ] Max 5 attempts per uur per user (gepland)

### Permanent Token
- [x] 256-bit entropy
- [x] argon2 hash in database
- [x] Nooit getoond aan user
- [x] Alleen lokaal opgeslagen

### Machine Binding
- [x] Machine ID = SHA256(hostname + user)
- [x] Niet portable naar andere machines
- [x] Revokable per machine

### Audit Trail
- [x] Alle acties gelogd (ASSISTANT_PAIRED, ASSISTANT_DISCONNECTED)
- [ ] viaAssistant flag (gepland voor Fase 2)
- [x] Machine identifier in logs

## UI/UX Flow

### Setup Code Genereren

```
1. User klikt "Generate Setup Code"
2. API genereert: KNB-A3X9-7MK2
3. UI toont code met countdown
4. User vertelt code aan Claude
5. Timer loopt af → code invalid
   OF code consumed → UI update naar connected
```

### Pairing

```
1. User: "Connect met Kanbu, code KNB-A3X9-7MK2"
2. Claude: kanbu_connect(code)
3. MCP → Kanbu API: exchangeSetupCode(code, machineId)
4. API: validate, consume, create binding, return token
5. MCP: store token locally
6. Claude: "Verbonden als Robin!"
```

### Disconnect

```
1. User klikt "Disconnect" in profile page
   OF
   User: "Disconnect van Kanbu"

2. API: set revokedAt on binding
3. MCP: remove local token file
4. UI: update naar "not connected"
```

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-09 | **Fase 4 COMPLEET** - 5 tools voor search en activity queries |
| 2026-01-09 | **Fase 3 COMPLEET** - 9 tools voor subtask en comment management |
| 2026-01-09 | **Fase 2 COMPLEET** - 11 core tools voor workspace/project/task management |
| 2026-01-09 | **Fase 1 COMPLEET** - MCP server met pairing tools werkend |
| 2026-01-09 | Roadmap herschreven voor one-time setup code pairing |
| 2026-01-09 | Initiële roadmap aangemaakt |
