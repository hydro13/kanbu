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

### Fase 5: Analytics & Insights ✅ COMPLEET (2026-01-09)

**Doel:** Inzichten en rapportage.

**Status:** Volledig geïmplementeerd en werkend.

#### 5.1 Project Analytics

- [x] `kanbu_project_stats` - Task counts, completion rate, trends, time tracking
- [x] `kanbu_velocity` - Tasks completed per week, rolling average
- [x] `kanbu_cycle_time` - Time per column, bottleneck identification
- [x] `kanbu_team_workload` - Tasks per member, overdue counts

**Deliverables Fase 5:** ✅ ALLEMAAL OPGELEVERD
- ✅ 4 analytics tools
- ✅ Project statistics and trends
- ✅ Velocity tracking and visualization
- ✅ Cycle time analysis with bottleneck detection
- ✅ Team workload distribution

---

---

### Fase 6: User Management ✅ COMPLEET

**Doel:** Beheer van gebruikers via MCP.

**Status:** Voltooid.

#### 6.1 User Query Tools

- [x] `kanbu_list_users` - Lijst alle gebruikers (met filters)
- [x] `kanbu_get_user` - Gebruiker details ophalen
- [x] `kanbu_get_user_logins` - Login historie van gebruiker

#### 6.2 User Management Tools

- [x] `kanbu_create_user` - Nieuwe gebruiker aanmaken
- [x] `kanbu_update_user` - Gebruiker gegevens wijzigen
- [x] `kanbu_delete_user` - Gebruiker deactiveren (soft delete)
- [x] `kanbu_reactivate_user` - Gebruiker heractiveren
- [x] `kanbu_reset_password` - Wachtwoord resetten
- [x] `kanbu_unlock_user` - Geblokkeerde gebruiker deblokkeren
- [x] `kanbu_disable_2fa` - 2FA uitschakelen
- [x] `kanbu_revoke_sessions` - Alle sessies beëindigen

**Deliverables Fase 6:**
- [x] 11 user management tools
- [x] Admin-only access via ACL check
- [x] Audit logging voor alle acties

---

### Fase 7: Groups Management ✅ COMPLEET

**Doel:** Security groups beheer via MCP.

**Status:** Voltooid.

#### 7.1 Group Query Tools

- [x] `kanbu_list_groups` - Lijst alle groepen (met filters)
- [x] `kanbu_get_group` - Groep details ophalen
- [x] `kanbu_my_groups` - Mijn groepen ophalen
- [x] `kanbu_list_group_members` - Leden van een groep

#### 7.2 Group Management Tools

- [x] `kanbu_create_group` - Nieuwe groep aanmaken
- [x] `kanbu_create_security_group` - Security group aanmaken (Domain Admin)
- [x] `kanbu_update_group` - Groep wijzigen
- [x] `kanbu_delete_group` - Groep verwijderen
- [x] `kanbu_add_group_member` - Lid toevoegen aan groep
- [x] `kanbu_remove_group_member` - Lid verwijderen uit groep

**Deliverables Fase 7:**
- [x] 10 group management tools
- [x] Privilege escalation prevention
- [x] WebSocket events voor real-time updates

---

### Fase 8: ACL Manager ✅ COMPLEET

**Doel:** Access Control List beheer via MCP.

**Status:** Voltooid.

#### 8.1 ACL Query Tools

- [x] `kanbu_list_acl` - ACL entries voor resource
- [x] `kanbu_check_permission` - Permissies checken
- [x] `kanbu_my_permission` - Mijn permissies op resource
- [x] `kanbu_get_principals` - Alle users/groups voor ACL
- [x] `kanbu_get_resources` - Alle resources voor ACL
- [x] `kanbu_get_acl_presets` - Beschikbare presets en bitmask waardes
- [x] `kanbu_get_permission_matrix` - Permission matrix view
- [x] `kanbu_calculate_effective` - Effectieve permissies berekenen met breakdown

#### 8.2 ACL Management Tools

- [x] `kanbu_grant_permission` - Permissies toekennen
- [x] `kanbu_deny_permission` - Permissies weigeren (DENY entry)
- [x] `kanbu_revoke_permission` - Permissies intrekken
- [x] `kanbu_update_acl` - ACL entry wijzigen
- [x] `kanbu_delete_acl` - ACL entry verwijderen
- [x] `kanbu_bulk_grant` - Bulk permissies toekennen
- [x] `kanbu_bulk_revoke` - Bulk permissies intrekken
- [x] `kanbu_copy_permissions` - Permissies kopiëren naar andere resources
- [x] `kanbu_apply_template` - Permission template toepassen
- [x] `kanbu_simulate_change` - What-If analyse voor ACL wijzigingen
- [x] `kanbu_export_acl` - ACL exporteren (JSON/CSV)
- [x] `kanbu_import_acl` - ACL importeren (JSON/CSV)

**Deliverables Fase 8:**
- [x] 20 ACL management tools (8 query + 12 management)
- [x] RWXDP bitmask support (R=1, W=2, X=4, D=8, P=16)
- [x] Presets: None (0), Read Only (1), Contributor (7), Editor (15), Full Control (31)
- [x] What-If simulator voor change preview

---

### Fase 9: Invites ✅ COMPLEET

**Doel:** Uitnodigingen beheer via MCP.

**Status:** Voltooid.

- [x] `kanbu_list_invites` - Lijst alle uitnodigingen (met status filter)
- [x] `kanbu_get_invite` - Uitnodiging details ophalen
- [x] `kanbu_send_invite` - Uitnodiging versturen (max 50 emails per call)
- [x] `kanbu_cancel_invite` - Uitnodiging annuleren
- [x] `kanbu_resend_invite` - Uitnodiging opnieuw versturen (met nieuwe token)

**Deliverables Fase 9:**
- [x] 5 invite management tools
- [x] Status tracking (pending, accepted, expired)
- [x] Bulk invite support

---

### Fase 10: Audit Logs ✅ COMPLEET

**Doel:** Audit logs raadplegen via MCP.

**Status:** Voltooid.

- [x] `kanbu_list_audit_logs` - Audit logs ophalen (met filters: category, action, date, workspace)
- [x] `kanbu_get_audit_log` - Enkele audit log entry met alle details
- [x] `kanbu_audit_stats` - Audit statistieken (counts by category, top actors, recent actions)
- [x] `kanbu_export_audit_logs` - Audit logs exporteren (CSV/JSON, max 10.000)
- [x] `kanbu_get_audit_categories` - Beschikbare categorieën (ACL, GROUP, USER, WORKSPACE, SETTINGS)

**Deliverables Fase 10:**
- [x] 5 audit log tools
- [x] Scoped access (Domain Admin vs Workspace Admin)
- [x] Export functionaliteit (CSV en JSON)
- [x] Statistics dashboard data

---

### Fase 11: System Settings & Backup ✅ COMPLEET

**Doel:** Systeeminstellingen en backups via MCP.

**Status:** Voltooid.

#### 11.1 Settings Tools

- [x] `kanbu_get_settings` - Alle instellingen ophalen
- [x] `kanbu_get_setting` - Enkele instelling ophalen
- [x] `kanbu_set_setting` - Instelling wijzigen (create/update)
- [x] `kanbu_set_settings` - Meerdere instellingen wijzigen (bulk)
- [x] `kanbu_delete_setting` - Instelling verwijderen

#### 11.2 Backup Tools

- [x] `kanbu_create_db_backup` - Database backup naar Google Drive (keeps 10)
- [x] `kanbu_create_source_backup` - Source code backup naar Google Drive (keeps 5)

#### 11.3 Admin Workspace Tools

- [x] `kanbu_admin_list_workspaces` - Alle workspaces (admin view, scoped)
- [x] `kanbu_admin_get_workspace` - Workspace details met stats
- [x] `kanbu_admin_update_workspace` - Workspace wijzigen
- [x] `kanbu_admin_delete_workspace` - Workspace deactiveren (soft delete)
- [x] `kanbu_admin_reactivate_workspace` - Workspace heractiveren

**Deliverables Fase 11:**
- [x] 12 system management tools
- [x] Domain Admin / Workspace Admin scoped access
- [x] Backup naar Google Drive met automatic cleanup

---

### Fase 12: Profile Management ✅ COMPLEET

**Doel:** Eigen profiel beheer via MCP (alle functies uit Profile Settings sidebar).

**Status:** Voltooid.

#### 12.1 Profile Information Tools

- [x] `kanbu_get_profile` - Eigen profiel samenvatting ophalen
- [x] `kanbu_get_time_tracking` - Eigen time tracking overzicht (per project/periode)
- [x] `kanbu_get_logins` - Eigen login historie
- [x] `kanbu_get_sessions` - Actieve sessies ophalen
- [x] `kanbu_get_password_history` - Wachtwoord reset historie
- [x] `kanbu_get_metadata` - Eigen user metadata

#### 12.2 Profile Update Tools

- [x] `kanbu_update_profile` - Profiel bewerken (name, display name, email, timezone, etc.)
- [x] `kanbu_remove_avatar` - Avatar verwijderen
- [x] `kanbu_change_password` - Eigen wachtwoord wijzigen

#### 12.3 Two Factor Authentication Tools

- [x] `kanbu_get_2fa_status` - 2FA status ophalen (enabled, backup codes count)
- [x] `kanbu_setup_2fa` - 2FA setup initiëren (genereert TOTP secret en QR data)
- [x] `kanbu_verify_2fa` - 2FA verificatie (code checken en activeren)
- [x] `kanbu_disable_2fa` - Eigen 2FA uitschakelen (vereist wachtwoord)
- [x] `kanbu_regenerate_backup_codes` - Nieuwe backup codes genereren

#### 12.4 Public Access Tools

- [x] `kanbu_get_public_access` - Public access instellingen ophalen
- [x] `kanbu_update_public_access` - Public access instellingen wijzigen
- [x] `kanbu_get_public_link` - Public profile link ophalen
- [x] `kanbu_regenerate_public_token` - Nieuwe public access token genereren

#### 12.5 Notification Tools

- [x] `kanbu_get_notifications` - Notificatie-instellingen ophalen
- [x] `kanbu_update_notifications` - Notificatie-instellingen wijzigen (email, push, in-app)

#### 12.6 External Accounts Tools

- [x] `kanbu_list_external_accounts` - Gekoppelde externe accounts (OAuth providers)
- [x] `kanbu_unlink_external_account` - Externe account ontkoppelen

#### 12.7 API Tokens Tools

- [x] `kanbu_list_api_tokens` - Eigen API tokens ophalen
- [x] `kanbu_create_api_token` - Nieuw API token aanmaken (met scope en expiry)
- [x] `kanbu_get_api_token` - API token details ophalen
- [x] `kanbu_revoke_api_token` - API token intrekken

#### 12.8 AI Assistant Tools (uitbreiding)

- [x] `kanbu_list_ai_bindings` - Alle AI assistant bindings bekijken
- [x] `kanbu_revoke_ai_binding` - Specifieke AI binding intrekken

#### 12.9 Hourly Rate Tools

- [x] `kanbu_get_hourly_rate` - Eigen uurtarief ophalen
- [x] `kanbu_set_hourly_rate` - Uurtarief instellen (currency, rate)

#### 12.10 Session Management Tools

- [x] `kanbu_revoke_session` - Specifieke sessie beëindigen
- [x] `kanbu_revoke_all_sessions` - Alle sessies beëindigen (behalve huidige)

**Deliverables Fase 12:**
- [x] 36 profile management tools
- [x] Self-service profiel beheer
- [x] 2FA setup en beheer (TOTP)
- [x] API tokens beheer met scopes
- [x] Notification preferences
- [x] Hourly rate voor time tracking
- [x] Public access link management
- [x] Session management

---

## Tool Overzicht

| Fase | Tools | Cumulatief | Status |
|------|-------|------------|--------|
| Fase 1 | 3 (pairing) | 3 | ✅ Compleet |
| Fase 2 | 11 (core) | 14 | ✅ Compleet |
| Fase 3 | 9 (subtasks/comments) | 23 | ✅ Compleet |
| Fase 4 | 5 (search/activity) | 28 | ✅ Compleet |
| Fase 5 | 4 (analytics) | 32 | ✅ Compleet |
| Fase 6 | 11 (user management) | 43 | ✅ Compleet |
| Fase 7 | 10 (groups) | 53 | ✅ Compleet |
| Fase 8 | 20 (ACL) | 73 | ✅ Compleet |
| Fase 9 | 5 (invites) | 78 | ✅ Compleet |
| Fase 10 | 5 (audit) | 83 | ✅ Compleet |
| Fase 11 | 12 (system) | 95 | ✅ Compleet |
| Fase 12 | 36 (profile) | 131 | ✅ Compleet |

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
| 2026-01-09 | **Fase 12 COMPLEET** - 36 tools voor profile management (info, 2FA, notifications, API tokens, sessions, hourly rate) |
| 2026-01-09 | **ALL 12 PHASES COMPLETE!** - 131 MCP tools geïmplementeerd across 12 phases |
| 2026-01-09 | **Fase 11 COMPLEET** - 12 tools voor system settings & backup (settings, backup, admin workspaces) |
| 2026-01-09 | **Fase 10 COMPLEET** - 5 tools voor audit logs (list, get, stats, export, categories) |
| 2026-01-09 | **Fase 9 COMPLEET** - 5 tools voor invite management (list, get, send, cancel, resend) |
| 2026-01-09 | **Fase 8 COMPLEET** - 20 tools voor ACL management (query, grant, deny, bulk, export, import, simulate) |
| 2026-01-09 | **Fase 7 COMPLEET** - 10 tools voor groups management (list, create, members, etc.) |
| 2026-01-09 | **Fase 6 COMPLEET** - 11 tools voor user management (list, create, update, delete, etc.) |
| 2026-01-09 | **ROADMAP UPDATE** - Fases 6-11 toegevoegd (61 nieuwe tools gepland, totaal 93) |
| 2026-01-09 | **Fase 5 COMPLEET** - 4 tools voor analytics en insights |
| 2026-01-09 | **Fase 4 COMPLEET** - 5 tools voor search en activity queries |
| 2026-01-09 | **Fase 3 COMPLEET** - 9 tools voor subtask en comment management |
| 2026-01-09 | **Fase 2 COMPLEET** - 11 core tools voor workspace/project/task management |
| 2026-01-09 | **Fase 1 COMPLEET** - MCP server met pairing tools werkend |
| 2026-01-09 | Roadmap herschreven voor one-time setup code pairing |
| 2026-01-09 | Initiële roadmap aangemaakt |
