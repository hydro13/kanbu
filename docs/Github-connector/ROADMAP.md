# Kanbu GitHub Connector - Roadmap

## Overzicht

Dit document beschrijft de implementatie roadmap voor de Kanbu GitHub Connector.
De connector maakt bidirectionele synchronisatie mogelijk tussen Kanbu projecten en GitHub repositories.

## Twee-Tier Architectuur

De GitHub connector gebruikt een **twee-tier architectuur** om configuratie en beheer te scheiden:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN NIVEAU (Workspace)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Installations │  │  User Mapping   │  │  Repos Overview │     │
│  │   Management    │  │  GitHub ↔ Kanbu │  │  (alle repos)   │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  Wie: Workspace Admins                                              │
│  Waar: Admin → GitHub Settings                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROJECT NIVEAU                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Repo Linking   │  │  Sync Settings  │  │   Sync Status   │     │
│  │  (1 repo/proj)  │  │  Labels/Columns │  │   & Logs        │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  Wie: Project Managers                                              │
│  Waar: Project Settings → GitHub                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Waarom Twee Niveaus?

| Aspect | Admin Niveau | Project Niveau |
|--------|--------------|----------------|
| **GitHub App Installation** | Eenmaal per org/user installeren | Repo selecteren uit installatie |
| **User Mapping** | Centraal beheren voor alle projecten | Automatisch gebruiken bij sync |
| **Overzicht** | Alle gekoppelde repos in workspace | Alleen eigen project repo |
| **Rechten** | Workspace P permission | Project P permission |

## Doelstellingen

1. **Repository Koppeling** - Projecten koppelen aan GitHub repositories
2. **Issue Sync** - Bidirectionele synchronisatie van issues/tasks
3. **PR Tracking** - Pull requests koppelen aan taken
4. **Commit Linking** - Commits automatisch linken aan taken via references
5. **Branch Management** - Feature branches voor taken
6. **Automatisering** - Task status updates op basis van GitHub events
7. **User Mapping** - GitHub logins koppelen aan Kanbu gebruikers (workspace-niveau)

---

## Implementatie Fasen

---

## Fase Completion Protocol

> **VERPLICHT:** Bij elke voltooide fase MOET de volgende checklist worden doorlopen voordat de fase als "COMPLEET" gemarkeerd wordt.

### 1. Code Implementation
- [ ] Alle geplande features geïmplementeerd
- [ ] TypeScript types aangemaakt/bijgewerkt
- [ ] Database schema (indien van toepassing) gesynchroniseerd

### 2. Tests ⚠️ VERPLICHT
- [ ] **Unit tests** voor pure logic functions
- [ ] **Type tests** voor nieuwe TypeScript types/interfaces
- [ ] **Validation tests** voor input validation en constraints
- [ ] **Integration tests** voor API endpoints (indien van toepassing)
- [ ] Alle tests passing (`pnpm test:run`)

**Test locaties:**
| Package | Locatie | Beschrijving |
|---------|---------|--------------|
| `@kanbu/shared` | `src/__tests__/*.test.ts` | Type exports, const arrays, interfaces |
| `@kanbu/api` | `src/lib/__tests__/*.test.ts` | Logic, validation, helpers |
| `@kanbu/api` | `src/services/__tests__/*.test.ts` | Service integration tests |

### 3. Documentation Updates
- [ ] `docs/Github-connector/ROADMAP.md` - Fase status → ✅ COMPLEET
- [ ] `docs/Github-connector/ARCHITECTURE.md` - Technische details bijwerken indien nodig
- [ ] `docs/Github-connector/README.md` - Quick reference updaten

### 4. ACL Integration (indien UI features)
- [ ] Nieuwe features registreren in `packages/shared/prisma/seed-features.ts`
- [ ] Permission requirements documenteren in `docs/ACL/ROADMAP.md`
- [ ] Feature Access Control hooks implementeren (`useProjectFeatureAccess`, etc.)
- [ ] Sidebar menu items toevoegen met ACL checks

### 5. MCP Tools (indien van toepassing)
- [ ] Nieuwe tools toevoegen aan `packages/mcp-server/src/tools/github.ts`
- [ ] Tools documenteren in `docs/MCP/ROADMAP.md`
- [ ] Tool Overzicht tabel updaten in `docs/MCP/README.md`
- [ ] TypeScript types bijwerken

### 6. Project Documentation
- [ ] `v6/dev/kanbu/CLAUDE.md` - Development instructions bijwerken
- [ ] `v6/dev/kanbu/README.md` - Feature list updaten
- [ ] Eventuele nieuwe directories/patterns documenteren

### 7. Git Commit
- [ ] Commit: `feat(github): Fase X - [beschrijving]`
- [ ] Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
- [ ] Push naar kanbu repo, daarna genx submodule update

### 8. Verificatie
- [ ] `pnpm typecheck` passing
- [ ] `pnpm test:run` passing (alle packages)
- [ ] Functionaliteit handmatig getest
- [ ] Documentatie consistent en up-to-date
- [ ] Cold-start test: nieuwe Claude sessie kan features gebruiken

---

### Fase 1: Database & Infrastructure ✅ COMPLEET

**Doel:** Database models en basis infrastructuur voor GitHub integratie.

**Status:** Compleet (2026-01-09).

#### 1.1 Prisma Schema Uitbreiding

```prisma
// GitHub App Installation (org/user level)
model GitHubInstallation {
  id              Int       @id @default(autoincrement())
  installationId  BigInt    @unique @map("installation_id")
  accountType     String    @db.VarChar(20)  // 'user' | 'organization'
  accountId       BigInt    @map("account_id")
  accountLogin    String    @db.VarChar(255) @map("account_login")
  accessToken     String?   @db.Text @map("access_token")
  tokenExpiresAt  DateTime? @map("token_expires_at")
  permissions     Json      @default("{}")
  events          String[]  @default([])
  suspendedAt     DateTime? @map("suspended_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repositories    GitHubRepository[]

  @@map("github_installations")
}

// GitHub Repository linked to Kanbu Project
model GitHubRepository {
  id              Int       @id @default(autoincrement())
  projectId       Int       @unique @map("project_id")
  installationId  Int       @map("installation_id")
  repoId          BigInt    @map("repo_id")
  owner           String    @db.VarChar(255)
  name            String    @db.VarChar(255)
  fullName        String    @db.VarChar(512) @map("full_name")
  defaultBranch   String    @default("main") @db.VarChar(255) @map("default_branch")
  isPrivate       Boolean   @default(false) @map("is_private")
  syncEnabled     Boolean   @default(true) @map("sync_enabled")
  syncSettings    Json      @default("{}") @map("sync_settings")
  lastSyncAt      DateTime? @map("last_sync_at")
  webhookId       BigInt?   @map("webhook_id")
  webhookSecret   String?   @db.VarChar(255) @map("webhook_secret")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  installation    GitHubInstallation @relation(fields: [installationId], references: [id])
  issues          GitHubIssue[]
  pullRequests    GitHubPullRequest[]
  commits         GitHubCommit[]
  syncLogs        GitHubSyncLog[]

  @@unique([owner, name])
  @@map("github_repositories")
}

// Synced GitHub Issues
model GitHubIssue {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  taskId          Int?      @unique @map("task_id")
  issueNumber     Int       @map("issue_number")
  issueId         BigInt    @map("issue_id")
  title           String    @db.VarChar(500)
  state           String    @db.VarChar(20)  // 'open' | 'closed'
  syncDirection   String    @default("bidirectional") @db.VarChar(20) @map("sync_direction")
  lastSyncAt      DateTime? @map("last_sync_at")
  syncHash        String?   @db.VarChar(64) @map("sync_hash")  // Hash to detect changes
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  task            Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@unique([repositoryId, issueNumber])
  @@map("github_issues")
}

// Pull Requests linked to Tasks
model GitHubPullRequest {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  taskId          Int?      @map("task_id")
  prNumber        Int       @map("pr_number")
  prId            BigInt    @map("pr_id")
  title           String    @db.VarChar(500)
  state           String    @db.VarChar(20)  // 'open' | 'closed' | 'merged'
  headBranch      String    @db.VarChar(255) @map("head_branch")
  baseBranch      String    @db.VarChar(255) @map("base_branch")
  authorLogin     String    @db.VarChar(255) @map("author_login")
  mergedAt        DateTime? @map("merged_at")
  closedAt        DateTime? @map("closed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  task            Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@unique([repositoryId, prNumber])
  @@map("github_pull_requests")
}

// Commits linked to Tasks
model GitHubCommit {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  taskId          Int?      @map("task_id")
  sha             String    @db.VarChar(40)
  message         String    @db.Text
  authorName      String    @db.VarChar(255) @map("author_name")
  authorEmail     String    @db.VarChar(255) @map("author_email")
  authorLogin     String?   @db.VarChar(255) @map("author_login")
  committedAt     DateTime  @map("committed_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  task            Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@unique([repositoryId, sha])
  @@map("github_commits")
}

// Sync Activity Log
model GitHubSyncLog {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  action          String    @db.VarChar(50)   // 'issue_created', 'issue_updated', 'pr_linked', etc.
  direction       String    @db.VarChar(20)   // 'kanbu_to_github' | 'github_to_kanbu'
  entityType      String    @db.VarChar(20)   // 'issue' | 'pr' | 'commit' | 'task'
  entityId        String?   @db.VarChar(50)   @map("entity_id")
  details         Json      @default("{}")
  status          String    @default("success") @db.VarChar(20)  // 'success' | 'failed' | 'skipped'
  errorMessage    String?   @db.Text @map("error_message")
  createdAt       DateTime  @default(now()) @map("created_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@index([repositoryId, createdAt])
  @@map("github_sync_logs")
}

// User Mapping: GitHub Login ↔ Kanbu User (Workspace Level)
// Beheerd op admin niveau, gebruikt door alle projecten in de workspace
model GitHubUserMapping {
  id              Int       @id @default(autoincrement())
  workspaceId     Int       @map("workspace_id")
  userId          Int       @map("user_id")
  githubLogin     String    @db.VarChar(255) @map("github_login")
  githubId        BigInt?   @map("github_id")     // GitHub user ID (optioneel, voor verificatie)
  githubEmail     String?   @db.VarChar(255) @map("github_email")
  githubAvatarUrl String?   @db.VarChar(512) @map("github_avatar_url")
  autoMatched     Boolean   @default(false) @map("auto_matched")  // True als automatisch gematcht op email
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, githubLogin])  // 1 mapping per GitHub login per workspace
  @@unique([workspaceId, userId])        // 1 mapping per Kanbu user per workspace
  @@map("github_user_mappings")
}
```

#### 1.2 Task Model Uitbreiding

- [x] Add relations to Task model for GitHubIssue, GitHubPullRequest, GitHubCommit
- [x] Add `githubBranch` field for feature branch tracking

#### 1.3 Project Model Uitbreiding

- [x] Add relation to GitHubRepository

#### 1.4 Tests

- [x] TypeScript type tests (45 tests in `packages/shared/src/__tests__/github.test.ts`)
- [x] API/database logic tests (69 tests in `apps/api/src/lib/__tests__/github.test.ts`)

**Deliverables Fase 1:**
- [x] Database schema extensies (7 models incl. GitHubUserMapping)
- [x] Database synced via `prisma db push`
- [x] Type definitions (`packages/shared/src/types/github.ts`)
- [x] Workspace en User model relations
- [x] Test suite (114 tests)

#### Fase 1 Completion Checklist
- [x] **Code**: Database schema geïmplementeerd, database synced
- [x] **Tests**: 114 tests geschreven en passing
- [x] **ACL**: N.v.t. (geen nieuwe UI features)
- [x] **MCP**: N.v.t. (geen nieuwe tools)
- [x] **Docs**: ROADMAP bijgewerkt met finale status
- [x] **CLAUDE.md**: GitHub database patterns gedocumenteerd
- [x] **Commit**: `feat(github): Fase 1 - Database & Infrastructure`

---

### Fase 2: GitHub App & OAuth ✅ COMPLEET

**Doel:** GitHub App installatie en OAuth flow op **Admin (Workspace) niveau**.

**Status:** Compleet (2026-01-09).

#### 2.1 GitHub App Setup

- [x] GitHub App configuratie in `.env` (APP_ID, CLIENT_ID, CLIENT_SECRET, PRIVATE_KEY)
- [x] App permissions configureren:
  - `issues: read/write`
  - `pull_requests: read`
  - `contents: read`
  - `metadata: read`
- [x] Webhook events selecteren:
  - `issues`
  - `pull_request`
  - `push`

#### 2.2 Backend: Admin-Level Procedures

**Bestand:** `apps/api/src/trpc/procedures/githubAdmin.ts`

Installatie management (Workspace niveau):
- [x] `githubAdmin.isConfigured` - Check of GitHub App is geconfigureerd
- [x] `githubAdmin.getInstallationUrl` - Generate GitHub App installation URL
- [x] `githubAdmin.handleCallback` - Handle OAuth callback from GitHub
- [x] `githubAdmin.listInstallations` - List workspace's GitHub installations
- [x] `githubAdmin.listRepositories` - List repositories for installation
- [x] `githubAdmin.removeInstallation` - Verwijder installatie uit workspace
- [x] `githubAdmin.refreshToken` - Refresh installation access token

User mapping (Workspace niveau):
- [x] `githubAdmin.listUserMappings` - Lijst van user mappings in workspace
- [x] `githubAdmin.createUserMapping` - Koppel GitHub login aan Kanbu user
- [x] `githubAdmin.updateUserMapping` - Wijzig mapping
- [x] `githubAdmin.deleteUserMapping` - Verwijder mapping
- [x] `githubAdmin.autoMatchUsers` - Auto-match op basis van email
- [x] `githubAdmin.suggestMappings` - Suggesties voor unmapped GitHub users

Overview (Workspace niveau):
- [x] `githubAdmin.getWorkspaceOverview` - Stats van alle GitHub repos in workspace
- [x] `githubAdmin.listLinkedRepositories` - Alle gekoppelde repos in workspace

#### 2.3 Frontend: Admin GitHub Settings Page

**Bestand:** `apps/web/src/pages/admin/GitHubAdminPage.tsx`

Tabs:
1. **Installations** - Beheer GitHub App installaties
   - [x] "Connect to GitHub" button
   - [x] Installatie lijst met status
   - [x] Beschikbare repositories per installatie
   - [x] Disconnect button

2. **User Mapping** - Koppel GitHub users aan Kanbu users
   - [x] Mapping tabel (GitHub login ↔ Kanbu user)
   - [x] "Auto Match" button (match op email)
   - [x] Manual mapping dropdown
   - [x] Unmapped users indicator

3. **Overview** - Overzicht alle gekoppelde repos
   - [x] Lijst van projecten met GitHub koppeling
   - [x] Sync status per project
   - [x] Quick link naar project settings

#### 2.4 Admin Sidebar Menu Item

**Bestand:** `apps/web/src/pages/admin/AdminSidebar.tsx`

- [x] Add "GitHub" menu item onder INTEGRATIONS sectie
- [x] GitHubIcon component

**Deliverables Fase 2:**
- [x] GitHub App configuratie
- [x] OAuth flow (install → callback → token storage)
- [x] Admin-level installation management
- [x] User mapping UI en API
- [x] Workspace overview dashboard

#### Fase 2 Completion Checklist
- [x] **Code**: OAuth flow werkend, installaties beheerbaar
- [x] **Tests**: OAuth callback tests, installation CRUD tests, user mapping tests (19 tests in `githubAdmin.test.ts`)
- [x] **ACL**: `github-admin` feature geregistreerd, Workspace R/P permissions
- [x] **MCP**: Audit logging voor installation/mapping acties (`GITHUB_INSTALLATION_*`, `GITHUB_USER_MAPPING_*`). Admin MCP tools overwegen voor Fase 9+
- [x] **Docs**: OAuth flow gedocumenteerd in ARCHITECTURE
- [x] **CLAUDE.md**: Admin GitHub Settings page gedocumenteerd
- [x] **Commit**: `feat(github): Fase 2 - GitHub App & OAuth`

---

### Fase 3: Repository Linking ✅ COMPLEET

**Doel:** Projecten koppelen aan GitHub repositories op **Project niveau**.

**Status:** Compleet (2026-01-09).

#### 3.1 Backend: Project-Level Procedures

**Bestand:** `apps/api/src/trpc/procedures/github.ts`

Repository management (Project niveau):
- [x] `github.linkRepository` - Link repository to project (selecteer uit workspace installations)
- [x] `github.unlinkRepository` - Unlink repository from project
- [x] `github.getLinkedRepository` - Get linked repository for project
- [x] `github.updateSyncSettings` - Update sync configuration
- [x] `github.listAvailableRepositories` - List available repos from workspace installations

Sync operations (Project niveau):
- [x] `github.triggerSync` - Manual sync triggeren
- [x] `github.getSyncStatus` - Huidige sync status
- [x] `github.getSyncLogs` - Sync history

#### 3.2 Sync Settings Schema

```typescript
interface SyncSettings {
  // Issue Sync
  issueSync: {
    enabled: boolean
    direction: 'kanbu_to_github' | 'github_to_kanbu' | 'bidirectional'
    createIssuesFromTasks: boolean
    createTasksFromIssues: boolean
    labelMapping: Record<string, string>  // Kanbu tag → GitHub label
    columnMapping: Record<string, string> // Kanbu column → GitHub label
  }

  // PR Tracking
  pullRequests: {
    enabled: boolean
    autoLinkByBranch: boolean      // Link PRs by branch name pattern
    autoLinkByMention: boolean     // Link PRs by task reference in title/body
    taskReferencePattern: string   // e.g., "PROJ-123" or "#123"
  }

  // Commit Tracking
  commits: {
    enabled: boolean
    linkByMessage: boolean         // Parse commit messages for task refs
    taskReferencePattern: string
  }

  // Automation
  automation: {
    closeTaskOnPRMerge: boolean
    moveTaskOnPROpen: string | null    // Column ID to move to
    moveTaskOnPRMerge: string | null   // Column ID to move to
    createBranchForTask: boolean
    branchNamePattern: string          // e.g., "feature/{reference}-{slug}"
  }
}
```

#### 3.3 Frontend: Project GitHub Settings Page

**Bestand:** `apps/web/src/pages/project/GitHubProjectSettings.tsx`

- [x] Repository tab met linked repository info
- [x] Link naar Admin pagina voor nieuwe installaties
- [x] Sync settings tab:
  - [x] Sync enabled toggle
  - [x] Issue sync settings (placeholder for full UI in Fase 5-6)
  - [x] PR tracking settings (placeholder for Fase 7)
  - [x] Commit tracking settings (placeholder for Fase 7)
- [ ] Full label/column mapping UI (Fase 5-6)
- [x] Sync status indicator met counts
- [x] Sync logs tab met history

#### 3.4 Project Sidebar Menu Item

**Bestand:** `apps/web/src/components/layout/ProjectSidebar.tsx`

- [x] Add GitHubIcon component
- [x] Add "GitHub" menu item under new "Integrations" section
- [x] Add 'github' feature slug for ACL
- [ ] Badge tonen als repo niet gekoppeld (future enhancement)

**Deliverables Fase 3:**
- [x] Repository linking API (7 procedures)
- [x] Sync settings configuration (Zod schema + DB storage)
- [x] Project GitHub settings page (3 tabs)
- [x] Sidebar navigation with ACL

#### Fase 3 Completion Checklist
- [x] **Code**: Repo linking werkend, settings UI compleet
- [x] **Tests**: Repository linking tests (21 tests in `githubProject.test.ts`), sync settings validation, ACL permission tests
- [x] **ACL**: `github` project feature geregistreerd in `seed-features.ts`, hook updated in `useProjectFeatureAccess.ts`
- [x] **MCP**: Audit logging voor repo linking (`GITHUB_REPO_LINKED`, `GITHUB_SETTINGS_UPDATED`, `GITHUB_SYNC_TRIGGERED`). MCP tools komen in Fase 9
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: Project GitHub Settings gedocumenteerd
- [x] **Commit**: `feat(github): Fase 3 - Repository Linking`

---

### Fase 4: Webhook Handler ✅ COMPLEET

**Doel:** GitHub webhook events verwerken.

**Status:** Compleet (2026-01-09).

#### 4.1 Webhook Endpoint

**Bestand:** `apps/api/src/routes/webhooks/github.ts`

- [x] POST `/api/webhooks/github` - Webhook receiver
- [x] Signature verification (HMAC SHA-256)
- [x] Event type routing

#### 4.2 Event Handlers

- [x] `issues.opened` - Create GitHubIssue record
- [x] `issues.edited` - Update GitHubIssue record
- [x] `issues.closed` - Update state to closed
- [x] `issues.reopened` - Update state to open
- [x] `issues.labeled` / `issues.unlabeled` - Sync labels (via edited)
- [x] `pull_request.opened` - Create GitHubPullRequest record
- [x] `pull_request.closed` - Update PR state (closed/merged)
- [x] `pull_request.merged` - Set state to merged with mergedAt
- [x] `push` - Create GitHubCommit records
- [x] `installation` - Handle suspend/unsuspend events
- [x] `ping` - Respond to webhook setup ping

#### 4.3 Webhook Security

- [x] Signature validation (HMAC SHA-256 with timing-safe comparison)
- [x] Idempotency (in-memory delivery tracking with 1 hour TTL)
- [x] Sync settings respect (direction checks, enabled checks)
- [ ] Per-repository webhook secrets (optional, global secret supported)
- [ ] Rate limiting (to be added if needed)

**Deliverables Fase 4:**
- [x] Webhook endpoint at `/api/webhooks/github`
- [x] Event handlers for issues, PRs, commits, installations
- [x] Security measures (signature verification, idempotency)
- [x] Sync logging for all webhook operations

#### Fase 4 Completion Checklist
- [x] **Code**: Webhook endpoint werkend, events correct gerouted
- [x] **Tests**: 28 tests (signature verification, issue events, PR events, commit events, sync logging, installation events)
- [x] **ACL**: N.v.t. (backend only)
- [x] **MCP**: Sync operaties gelogd in GitHubSyncLog met action prefix (`issue_`, `pr_`, `commits_received`)
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: Webhook endpoint gedocumenteerd (in .gitignore, local only)
- [x] **Commit**: `feat(github): Fase 4 - Webhook Handler` (bc5f4d6d)

---

### Fase 5: Issue Sync (GitHub → Kanbu) ✅ COMPLEET

**Doel:** GitHub issues importeren als Kanbu taken.

**Status:** Compleet (2026-01-09).

#### 5.1 Initial Import

- [x] `github.importIssues` - Bulk import existing issues
- [x] Issue → Task field mapping:
  - `title` → `title`
  - `body` → `description`
  - `state` → column (open=first column, closed=last column)
  - `labels` → tags (auto-created if not exists)
  - `assignees` → assignees (if user mapping exists)
  - `created_at` → `createdAt`
- [x] Import progress tracking (in-memory with getImportProgress/clearImportProgress)

#### 5.2 Real-time Sync

- [x] New issue → Create task (via webhook handler)
- [x] Issue update → Update task title, description, state
- [x] Issue close → Move task to last column, set isActive=false
- [x] Issue reopen → Move task to first column, set isActive=true

#### 5.3 User Mapping Integratie

User mapping wordt beheerd op **Workspace niveau** (zie Fase 2).
Bij issue sync wordt de workspace user mapping gebruikt:

- [x] Lookup GitHub assignee → Kanbu user via `GitHubUserMapping`
- [x] Track unmapped users in sync log details
- [x] Automatic creator determination (first assignee → workspace creator → any active user)
- [x] Warning in sync log for unmapped assignees

#### 5.4 Implementation Details

**Service:** `apps/api/src/services/github/issueSyncService.ts`

Key functions:
- `mapGitHubUserToKanbu()` - User mapping lookup
- `mapGitHubAssignees()` - Batch assignee mapping with unmapped tracking
- `getOrCreateTagsFromLabels()` - Tag creation from GitHub labels
- `getColumnForIssueState()` - Column mapping (open → first, closed → last)
- `createTaskFromGitHubIssue()` - Full task creation with assignees, tags, logging
- `updateTaskFromGitHubIssue()` - Task updates on issue edits
- `importIssuesFromGitHub()` - Bulk import with GitHub API pagination

**tRPC Procedures:** `apps/api/src/trpc/procedures/github.ts`
- `github.importIssues` - Trigger bulk import
- `github.getImportProgress` - Check import status

**Deliverables Fase 5:**
- [x] Issue import functionality (bulk + webhook real-time)
- [x] Real-time issue sync via webhooks
- [x] User mapping integratie (via workspace mapping)
- [x] Tag creation from labels
- [x] Sync logging for audit trail

#### Fase 5 Completion Checklist
- [x] **Code**: Issue import werkend, real-time sync actief via webhooks
- [x] **Tests**: 18 tests (user mapping, tag mapping, column mapping, task creation, task update, import progress)
- [x] **ACL**: Sync permissions documented (Project W for import)
- [x] **MCP**: Sync operaties gelogd in GitHubSyncLog (`issue_imported`, `issue_updated`)
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: N.v.t. (service internals)
- [x] **Commit**: `feat(github): Fase 5 - Issue Sync Inbound`

---

### Fase 6: Issue Sync (Kanbu → GitHub) ✅ COMPLEET

**Doel:** Kanbu taken synchroniseren naar GitHub issues.

**Status:** Compleet (2026-01-09).

#### 6.1 Task → Issue Creation

- [x] Create GitHub issue when task created (`createGitHubIssueFromTask`)
- [x] Field mapping (reverse of Fase 5):
  - `title` → `title`
  - `description` → `body`
  - `isActive` → `state` (true=open, false=closed)
  - `tags` → `labels`
  - `assignees` → `assignees` (if user mapping exists)
- [x] Label sync (labels created on GitHub if needed by GitHub API)

#### 6.2 Task → Issue Updates

- [x] Update GitHub issue on task edit (`updateGitHubIssueFromTask`)
- [x] Sync task completion → close issue
- [x] Tag changes → label sync
- [x] Unified sync function (`syncTaskToGitHub`)

#### 6.3 Conflict Resolution

- [x] Sync hash comparison (`calculateSyncHash`)
- [x] Skip sync if no changes detected (hash unchanged)
- [x] Force sync option to bypass hash check
- [x] `hasTaskChangedSinceSync` for change detection
- [ ] Manual conflict resolution UI (future enhancement)

#### 6.4 Implementation Details

**Service:** `apps/api/src/services/github/issueSyncService.ts` (extended)

New functions:
- `mapKanbuUserToGitHub()` - Reverse user mapping lookup
- `mapKanbuAssigneesToGitHub()` - Batch reverse assignee mapping
- `getLabelsFromTags()` - Get label names from task tags
- `calculateSyncHash()` - SHA-256 hash of title, description, state
- `hasTaskChangedSinceSync()` - Check if task changed since last sync
- `createGitHubIssueFromTask()` - Create issue from task
- `updateGitHubIssueFromTask()` - Update issue from task
- `syncTaskToGitHub()` - Unified create-or-update

**tRPC Procedures:** `apps/api/src/trpc/procedures/github.ts` (extended)
- `github.createIssueFromTask` - Create GitHub issue from task
- `github.updateIssueFromTask` - Update GitHub issue from task
- `github.syncTaskToGitHub` - Unified sync (create or update)

**Deliverables Fase 6:**
- [x] Task → Issue creation
- [x] Task → Issue updates
- [x] Bidirectional sync support
- [x] Conflict detection via sync hash

#### Fase 6 Completion Checklist
- [x] **Code**: Bidirectionele sync werkend, sync hash voor conflict detectie
- [x] **Tests**: 17 tests (reverse user mapping, labels from tags, sync hash, change detection)
- [x] **ACL**: Reuses existing Project W permission (same as Fase 5)
- [x] **MCP**: Outbound sync audit loggen (`issue_created`, `issue_updated` with direction=`kanbu_to_github`)
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: N.v.t. (service internals)
- [x] **Commit**: `feat(github): Fase 6 - Issue Sync Outbound`

---

### Fase 7: PR & Commit Tracking ✅ COMPLEET

**Doel:** Pull requests en commits koppelen aan taken.

**Status:** Compleet (2026-01-09).

#### 7.1 PR Linking

- [x] Auto-link by branch name pattern (e.g., `feature/PROJ-123-*`)
- [x] Auto-link by task reference in PR title/body
- [x] Manual linking via tRPC API (`github.linkPRToTask`, `github.unlinkPRFromTask`)

#### 7.2 Commit Linking

- [x] Parse commit messages for task references
- [x] Auto-link commits to tasks on push webhook
- [x] Manual linking via tRPC API (`github.linkCommitToTask`, `github.unlinkCommitFromTask`)

#### 7.3 Task Reference Patterns

**Service:** `apps/api/src/services/github/prCommitLinkService.ts`

Supported patterns:
- **PREFIX-NUMBER**: e.g., `PROJ-123`, `KANBU-456` (2-10 char prefix)
- **#NUMBER**: GitHub-style issue reference, e.g., `#123`
- **[PREFIX-NUMBER]**: Bracketed format, e.g., `[PROJ-123]`
- **Branch patterns**: `feature/PROJ-123-*`, `fix/123-*`, `PROJ-123/description`

Key functions:
- `extractTaskReferences()` - Extract task refs from text (PR title, body, commit message)
- `extractTaskFromBranch()` - Extract task ref from branch name
- `findTaskByReference()` - Resolve reference to task ID
- `autoLinkPRToTask()` / `autoLinkPRToTaskWithBody()` - Auto-link PR
- `autoLinkCommitToTask()` - Auto-link commit
- `processNewPR()` / `processNewCommits()` - Batch processing for webhooks

#### 7.4 tRPC Procedures

**Bestand:** `apps/api/src/trpc/procedures/github.ts` (10 new procedures)

Query procedures:
- `github.getTaskPRs` - Get PRs linked to a task
- `github.getTaskCommits` - Get commits linked to a task
- `github.listProjectPRs` - List all PRs in a project (with filtering)
- `github.listProjectCommits` - List all commits in a project

Mutation procedures:
- `github.linkPRToTask` - Manually link PR to task
- `github.unlinkPRFromTask` - Unlink PR from task
- `github.linkCommitToTask` - Manually link commit to task
- `github.unlinkCommitFromTask` - Unlink commit from task

#### 7.5 Webhook Integration

**Bestand:** `apps/api/src/routes/webhooks/github.ts` (updated)

- [x] `handlePullRequest()` - Now calls `processNewPR()` for auto-linking on PR open
- [x] `handlePush()` - Now calls `processNewCommits()` for auto-linking on push
- [x] Sync logging includes `taskLinked` and `linkMethod` in details

#### 7.6 Task Detail Integration (Backend Complete)

**Note:** Frontend TaskGitHubPanel component deferred to Fase 8 (Automation).
Backend API is complete and ready for frontend integration.

**Deliverables Fase 7:**
- [x] PR tracking with auto-link (branch, title, body)
- [x] Commit tracking with auto-link (message parsing)
- [x] 10 tRPC procedures for querying and managing links
- [x] 38 tests for task reference extraction and patterns

#### Fase 7 Completion Checklist
- [x] **Code**: PR/Commit linking werkend, auto-link actief via webhooks
- [x] **Tests**: 38 tests (task reference extraction, branch patterns, commit messages, PR titles)
- [x] **ACL**: Uses existing Project R (read) and W (write) permissions
- [x] **MCP**: Audit logging voor PR/Commit linking (`GITHUB_PR_LINKED`, `GITHUB_PR_UNLINKED`, `GITHUB_COMMIT_LINKED`, `GITHUB_COMMIT_UNLINKED`)
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: N.v.t. (service internals)
- [x] **Commit**: `feat(github): Fase 7 - PR & Commit Tracking`

---

### Fase 8: Automation ✅ COMPLEET

**Doel:** Automatische acties op basis van GitHub events.

**Status:** Compleet (2026-01-09). Notifications deferred naar toekomstige fase.

#### 8.1 Branch Automation

- [x] Auto-create feature branch from task
- [x] Branch naming based on task reference (configurable pattern)
- [x] Preview branch name before creation

**Service:** `apps/api/src/services/github/automationService.ts`

Key functions:
- `createBranchForTask()` - Create feature branch on GitHub
- `generateBranchName()` - Generate branch name from task reference and title
- `branchExists()` - Check if branch exists on GitHub
- `slugify()` - Convert text to URL-safe slug

#### 8.2 Task Status Automation

- [x] Move task to "In Progress" when PR opened
- [x] Move task to "Review" when PR ready for review
- [x] Move task to "Done" when PR merged
- [x] Close task when issue closed

Event handlers:
- `onPROpened()` - Move task to In Progress column
- `onPRReadyForReview()` - Move task to Review column
- `onPRMerged()` - Move task to Done column
- `onIssueClosed()` - Close task (set isActive=false)

Helper functions:
- `findColumnByName()` - Find column by exact name (case-insensitive)
- `findColumnByNameFuzzy()` - Find column by partial match or aliases
- `moveTaskToColumn()` - Move task to specified column
- `closeTask()` - Close a task

#### 8.3 Notification Integration

- [ ] Notify on PR status changes (deferred)
- [ ] Notify on review requests (deferred)
- [ ] Notify on CI/CD status changes (deferred)

**Note:** Notifications deferred to future phase - requires notification system infrastructure.

#### 8.4 Sync Settings Extension

**Type:** `GitHubSyncSettings.automation` (in `packages/shared/src/types/github.ts`)

```typescript
automation?: {
  enabled: boolean
  moveToInProgressOnPROpen?: boolean      // default: true
  moveToReviewOnPRReady?: boolean         // default: true
  moveToDoneOnPRMerge?: boolean           // default: true
  closeTaskOnIssueClosed?: boolean        // default: true
  inProgressColumn?: string               // default: "In Progress"
  reviewColumn?: string                   // default: "Review"
  doneColumn?: string                     // default: "Done"
}
```

#### 8.5 tRPC Procedures

**Bestand:** `apps/api/src/trpc/procedures/github.ts` (3 new procedures)

- `github.createBranch` - Create feature branch for task (W)
- `github.previewBranchName` - Preview generated branch name (R)
- `github.getAutomationSettings` - Get automation settings for project (R)

**Deliverables Fase 8:**
- [x] Branch creation automation (via API)
- [x] Task status automation (via webhooks)
- [ ] GitHub event notifications (deferred)

#### Fase 8 Completion Checklist
- [x] **Code**: Branch creation en task status automation werkend
- [x] **Tests**: 33 tests (slugify, branch generation, settings, column finding, task movement, task closing)
- [x] **ACL**: Reuses existing Project R/W permissions
- [x] **MCP**: Automation acties audit loggen (`GITHUB_BRANCH_CREATED`). MCP tool `kanbu_create_github_branch` komt in Fase 9
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: N.v.t. (service internals)
- [x] **Commit**: `feat(github): Fase 8 - Automation`

---

### Fase 9: MCP Tools ✅ COMPLEET

**Doel:** GitHub tools toevoegen aan MCP server.

**Status:** Compleet (2026-01-09).

**Bestand:** `packages/mcp-server/src/tools/github.ts`

#### 9.1 GitHub Query Tools

- [x] `kanbu_get_github_repo` - Get linked repository info
- [x] `kanbu_list_github_prs` - List pull requests for project
- [x] `kanbu_list_github_commits` - List commits for project
- [x] `kanbu_get_task_prs` - Get PRs linked to a task
- [x] `kanbu_get_task_commits` - Get commits linked to a task

#### 9.2 GitHub Management Tools

- [x] `kanbu_link_github_repo` - Link repository to project
- [x] `kanbu_unlink_github_repo` - Unlink repository
- [x] `kanbu_sync_github_issues` - Trigger issue sync
- [x] `kanbu_create_github_branch` - Create feature branch for task
- [x] `kanbu_link_pr_to_task` - Manually link PR to task

**Deliverables Fase 9:**
- [x] 10 GitHub MCP tools (5 query + 5 management)
- [x] Claude Code integration voor GitHub workflow

#### Fase 9 Completion Checklist
- [x] **Code**: 10 MCP tools werkend, TypeScript compileert
- [x] **Tests**: 34 tests (schema validatie, tool definitions, response formats)
- [x] **ACL**: Tools gebruiken bestaande project R/W permissions via tRPC
- [x] **MCP**: Tools toegevoegd aan `github.ts`, docs/MCP/ROADMAP.md bijgewerkt
- [x] **Docs**: Tool specs in beide ROADMAPs
- [x] **CLAUDE.md**: N.v.t. (tools zijn zelf-beschrijvend via MCP)
- [x] **Commit**: `feat(github): Fase 9 - MCP Tools`

---

### Fase 10: CI/CD Integratie ✅ COMPLEET

**Doel:** GitHub Actions workflow tracking en frontend weergave.

**Status:** Compleet (2026-01-09). Backend + Frontend geïmplementeerd.

#### 10.1 GitHub Actions Status

- [x] Workflow run status tracking per PR/commit
- [x] Auto-link workflows to tasks by branch name
- [x] Auto-link workflows to PRs by branch name
- [x] Re-run workflow button vanuit Kanbu (via tRPC)
- [x] Status badges op tasks met actieve workflows
- [x] CI/CD Panel in task detail view

#### 10.2 Build Status Tracking

**Backend procedures:**
- [x] `github.getWorkflowRuns` - List workflow runs voor repo met filters
- [x] `github.getWorkflowRunDetails` - Details van specifieke run met relations
- [x] `github.getWorkflowJobs` - Get jobs en steps van GitHub API
- [x] `github.getTaskWorkflowRuns` - Get workflow runs voor een task
- [x] `github.getWorkflowStats` - Statistics (success rate, avg duration, by workflow)
- [x] `github.rerunWorkflow` - Re-run workflow (volledig of alleen failed jobs)
- [x] `github.cancelWorkflow` - Cancel running workflow

**Database model:**
```prisma
model GitHubWorkflowRun {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  taskId          Int?      @map("task_id")
  pullRequestId   Int?      @map("pull_request_id")
  runId           BigInt    @map("run_id")
  workflowId      BigInt    @map("workflow_id")
  workflowName    String    @db.VarChar(255) @map("workflow_name")
  event           String    @db.VarChar(50)
  status          String    @db.VarChar(50)   // 'queued' | 'in_progress' | 'completed' | 'waiting'
  conclusion      String?   @db.VarChar(50)   // 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out'
  headSha         String    @db.VarChar(40) @map("head_sha")
  headBranch      String    @db.VarChar(255) @map("head_branch")
  htmlUrl         String    @db.VarChar(512) @map("html_url")
  runNumber       Int       @map("run_number")
  runAttempt      Int       @default(1) @map("run_attempt")
  actor           String?   @db.VarChar(255)
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  task            Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)
  pullRequest     GitHubPullRequest? @relation(fields: [pullRequestId], references: [id], onDelete: SetNull)

  @@unique([repositoryId, runId])
  @@index([taskId])
  @@index([pullRequestId])
  @@map("github_workflow_runs")
}
```

**Service:** `apps/api/src/services/github/workflowService.ts`

Key functions:
- `upsertWorkflowRun()` - Create/update workflow run with auto-linking
- `getWorkflowRuns()` - List runs with filters (status, conclusion, branch, event)
- `getTaskWorkflowRuns()` - Get runs for a specific task
- `getPRWorkflowRuns()` - Get runs for a specific PR
- `getWorkflowRunDetails()` - Get run with all relations
- `rerunWorkflow()` - Re-run completed workflow via GitHub API
- `rerunFailedJobs()` - Re-run only failed jobs via GitHub API
- `cancelWorkflow()` - Cancel running workflow via GitHub API
- `getWorkflowJobs()` - Fetch job details from GitHub API
- `getWorkflowStats()` - Calculate success rate, avg duration, by workflow stats
- `processWorkflowRunEvent()` - Process webhook payload

**Webhook:** `apps/api/src/routes/webhooks/github.ts`
- [x] `workflow_run` event handler (requested, in_progress, completed)

#### 10.3 Frontend: CI/CD Panel

**Bestand:** `apps/web/src/components/task/TaskCICDPanel.tsx`

- [x] Workflow runs lijst per task/PR
- [x] Status badges (success/fail/pending)
- [x] Expand voor job details
- [x] Re-run/cancel buttons
- [x] Link naar GitHub Actions

**Bestand:** `apps/web/src/components/task/TaskCard.tsx` (uitbreiding)

- [x] CI/CD status badge op task card

**Deliverables Fase 10:**
- [x] Workflow run tracking (database + webhook + service)
- [x] Build status integration (7 tRPC procedures)
- [x] CI/CD panel in task detail view
- [x] Status badges op task cards

#### Fase 10 Completion Checklist
- [x] **Code**: Workflow runs getracked, webhook handler werkend, 7 tRPC procedures, frontend panel
- [x] **Tests**: 26 tests (upsert, filters, task/PR runs, rerun, cancel, jobs, stats, webhook processing)
- [x] **ACL**: Uses existing Project R (read) and W (write) permissions
- [x] **MCP**: CI/CD query tools kunnen toegevoegd worden in toekomstige update
- [x] **Docs**: ROADMAP.md bijgewerkt met finale status
- [x] **CLAUDE.md**: TaskCICDPanel gedocumenteerd
- [x] **Commit**: `feat(github): Fase 10 - CI/CD Integratie`

---

### Fase 10B: Extended CI/CD ✅ COMPLEET

**Doel:** Geavanceerde CI/CD features: deployment tracking, test results, notifications.

**Status:** Volledig geïmplementeerd (2026-01-09). Deployment tracking, check run tracking, en in-app notifications.

#### 10B.1 Deploy Tracking ✅ COMPLEET

- [x] `deployment` webhook handler
- [x] `deployment_status` webhook handler
- [x] Environment deployments tracking
- [x] Deploy history per environment (getEnvironmentHistory)
- [x] Deployment stats (getDeploymentStats)
- [ ] Deploy status op task (staging/production) → Later
- [ ] Rollback trigger vanuit Kanbu → Later

**Database model:**
```prisma
model GitHubDeployment {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  deploymentId    BigInt    @map("deployment_id")
  environment     String    @db.VarChar(255)
  ref             String    @db.VarChar(255)
  sha             String    @db.VarChar(40)
  task            String?   @db.VarChar(255)   // deployment task name
  description     String?   @db.Text
  creator         String?   @db.VarChar(255)
  status          String    @db.VarChar(50)     // 'pending' | 'success' | 'failure' | 'error' | 'inactive'
  targetUrl       String?   @db.VarChar(512) @map("target_url")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, deploymentId])
  @@index([environment])
  @@map("github_deployments")
}
```

**Backend services (implemented):**
- [x] `deploymentService.upsertDeployment` - Create/update deployment
- [x] `deploymentService.updateDeploymentStatus` - Update status
- [x] `deploymentService.getDeployment` - Get single deployment
- [x] `deploymentService.getRepositoryDeployments` - List per repo
- [x] `deploymentService.getLatestDeployments` - Latest per environment
- [x] `deploymentService.getEnvironmentHistory` - History per environment
- [x] `deploymentService.getDeploymentStats` - Stats with success rate
- [x] `deploymentService.processDeploymentWebhook` - Webhook handler
- [x] `deploymentService.processDeploymentStatusWebhook` - Status webhook
- [ ] `github.triggerDeployment` - Trigger deployment vanuit Kanbu → Later

#### 10B.2 Test Results Integration ✅ COMPLEET

- [x] `check_run` webhook handler
- [x] Check run tracking (create, update, completed)
- [x] Check run stats (getCheckRunStats)
- [x] Check run trends (getCheckRunTrends)
- [x] Failed/success rate per PR/commit
- [ ] `check_suite` webhook handler → Later
- [ ] Test coverage tracking (optional) → Later

**Database model:**
```prisma
model GitHubCheckRun {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  pullRequestId   Int?      @map("pull_request_id")
  checkRunId      BigInt    @map("check_run_id")
  name            String    @db.VarChar(255)
  headSha         String    @db.VarChar(40) @map("head_sha")
  status          String    @db.VarChar(50)     // 'queued' | 'in_progress' | 'completed'
  conclusion      String?   @db.VarChar(50)     // 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out'
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  outputTitle     String?   @db.VarChar(255) @map("output_title")
  outputSummary   String?   @db.Text @map("output_summary")
  createdAt       DateTime  @default(now()) @map("created_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  pullRequest     GitHubPullRequest? @relation(fields: [pullRequestId], references: [id], onDelete: SetNull)

  @@unique([repositoryId, checkRunId])
  @@index([pullRequestId])
  @@map("github_check_runs")
}
```

**Backend services (implemented):**
- [x] `checkRunService.upsertCheckRun` - Create/update check run
- [x] `checkRunService.getCheckRun` - Get single check run
- [x] `checkRunService.getCheckRunsByPR` - List check runs for PR
- [x] `checkRunService.getCheckRunsBySha` - List check runs for commit
- [x] `checkRunService.getCheckRunStats` - Stats per repository
- [x] `checkRunService.getCheckRunTrends` - Trends over time
- [x] `checkRunService.processCheckRunWebhook` - Webhook handler

#### 10B.3 Workflow Notifications ✅ COMPLEET

- [x] Workflow failure notification system
- [x] Configurable notification triggers (all, failures_only, none)
- [x] In-app notifications via bestaand notification systeem
- [x] Settings per repository via syncSettings.notifications
- [x] Notify options: roles, PR author, task assignees
- [ ] Email notifications (optional) → Toekomstige uitbreiding
- [ ] Slack/webhook integration (optional) → Toekomstige uitbreiding

**Backend service (implemented):**
- [x] `cicdNotificationService.getCICDSettings` - Get notification settings
- [x] `cicdNotificationService.updateCICDSettings` - Update settings
- [x] `cicdNotificationService.notifyWorkflowRun` - Workflow notifications
- [x] `cicdNotificationService.notifyDeployment` - Deployment notifications
- [x] `cicdNotificationService.notifyCheckRun` - Check run notifications

**Deliverables Fase 10B:**
- [x] Deployment tracking (webhook + database + service)
- [x] Test results integration (webhook + database + service)
- [x] Notification system voor CI/CD events

#### Fase 10B Completion Checklist
- [x] **Code**: Deploy tracking, check run tracking, notifications
- [x] **Tests**: 14 deployment + 18 check run + 28 notification = 60 tests
- [x] **ACL**: Uses existing Project permissions
- [x] **Docs**: Extended CI/CD gedocumenteerd in ROADMAP
- [x] **Commit**: `feat(github): Fase 10B - Extended CI/CD`

---

### Fase 11: Geavanceerde Sync ⚡ DEELS COMPLEET

**Doel:** Uitgebreide synchronisatie van GitHub features.

**Status:** 11.1 (Milestones) en 11.2 (Releases) compleet. Wiki en Projects uitgesteld naar Fase 11B.

#### 11.1 Milestones Sync ✅ COMPLEET

- [x] GitHub milestones tracking
- [x] Milestone progress tracking (open/closed issues)
- [x] Due date tracking
- [x] Frontend panel met progress bars
- [x] Stats component (total, open, closed, overdue)

**Database model:** ✅ GEÏMPLEMENTEERD
```prisma
model GitHubMilestone {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  milestoneNumber Int       @map("milestone_number")
  milestoneId     BigInt    @map("milestone_id")
  title           String    @db.VarChar(255)
  description     String?   @db.Text
  state           String    @db.VarChar(20)   // 'open' | 'closed'
  dueOn           DateTime? @map("due_on")
  closedAt        DateTime? @map("closed_at")
  openIssues      Int       @default(0) @map("open_issues")
  closedIssues    Int       @default(0) @map("closed_issues")
  htmlUrl         String?   @map("html_url") @db.VarChar(512)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, milestoneNumber])
  @@index([state])
  @@map("github_milestones")
}
```

**Backend procedures:** ✅ GEÏMPLEMENTEERD
- [x] `github.getProjectMilestones` - List milestones voor project
- [x] `github.getMilestoneStats` - Milestone statistieken
- [x] `github.getMilestoneByNumber` - Get milestone details

**Backend services:**
- [x] `milestoneService.ts` - Complete milestone CRUD + webhook sync
- [x] 13 tests voor milestone service

**Frontend:**
- [x] `ProjectMilestonesPanel.tsx` - Milestones tab in GitHub settings

#### 11.2 GitHub Releases Tracking ✅ COMPLEET

- [x] Release tracking per repository
- [x] Release notes display
- [x] Draft/prerelease indicator
- [x] Latest release highlight
- [x] Release changelog generation from merged PRs

**Database model:** ✅ GEÏMPLEMENTEERD
```prisma
model GitHubRelease {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  releaseId       BigInt    @map("release_id")
  tagName         String    @map("tag_name") @db.VarChar(255)
  name            String?   @db.VarChar(255)
  body            String?   @db.Text
  draft           Boolean   @default(false)
  prerelease      Boolean   @default(false)
  authorLogin     String?   @map("author_login") @db.VarChar(255)
  htmlUrl         String?   @map("html_url") @db.VarChar(512)
  tarballUrl      String?   @map("tarball_url") @db.VarChar(512)
  zipballUrl      String?   @map("zipball_url") @db.VarChar(512)
  publishedAt     DateTime? @map("published_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, releaseId])
  @@index([tagName])
  @@index([publishedAt])
  @@map("github_releases")
}
```

**Backend procedures:** ✅ GEÏMPLEMENTEERD
- [x] `github.getProjectReleases` - List releases voor project
- [x] `github.getReleaseStats` - Release statistieken
- [x] `github.getLatestRelease` - Nieuwste release
- [x] `github.getReleaseByTag` - Release by tag name
- [x] `github.generateReleaseNotes` - Generate notes from merged PRs

**Backend services:**
- [x] `releaseService.ts` - Complete release CRUD + webhook sync + notes generation
- [x] 17 tests voor release service

**Frontend:**
- [x] `ProjectReleasesPanel.tsx` - Releases tab in GitHub settings
- [x] Latest release highlight component
- [x] Release notes generator component

#### 11.3 GitHub Wiki Integration 🚧 GEPLAND (→ Fase 11B)

- [ ] Wiki pagina's synchroniseren
- [ ] Link wiki pagina's aan tasks
- [ ] Wiki search vanuit Kanbu

#### 11.4 GitHub Projects (Beta) Sync 🚧 GEPLAND (→ Fase 11B)

- [ ] GitHub Projects V2 integratie
- [ ] Project board ↔ Kanbu board sync
- [ ] Custom fields mapping
- [ ] View sync (optional)

**Deliverables Fase 11:**
- [x] Milestone synchronisatie (13 tests)
- [x] Releases tracking (17 tests)
- [ ] Wiki integratie (→ Fase 11B)
- [ ] GitHub Projects sync (→ Fase 11B)

#### Fase 11 Completion Checklist
- [x] **Code**: Milestones/Releases sync werkend
- [x] **Tests**: 30 tests (13 milestone + 17 release)
- [x] **ACL**: Gebruikt bestaande project permissions
- [ ] **MCP**: Release tools toegevoegen (→ Fase 11B)
- [x] **Docs**: ROADMAP bijgewerkt
- [x] **Frontend**: ProjectMilestonesPanel + ProjectReleasesPanel
- [ ] **Commit**: `feat(github): Fase 11 - Milestones & Releases`

---

### Fase 12: Code Review Integratie ✅ COMPLEET

**Doel:** Diepe integratie met GitHub code review workflow.

**Status:** Compleet. Backend + frontend geïmplementeerd.

#### 12.1 Review Request Tracking

- [x] Track wie moet reviewen
- [ ] Review request notifications in Kanbu
- [ ] "Needs Review" badge op tasks
- [ ] Auto-assign reviewer based on CODEOWNERS

**Backend procedures:**
- [x] `github.requestReview` - Request review van user
- [x] `github.getPendingReviewRequests` - Pending review requests
- [x] `github.getSuggestedReviewers` - Suggested reviewers

#### 12.2 Review Comments Sync

- [x] PR review comments opslaan in database
- [x] Review state tracking (PENDING, COMMENTED, APPROVED, CHANGES_REQUESTED, DISMISSED)
- [ ] Comment threads UI met context
- [ ] Reply op review comments vanuit Kanbu
- [ ] Resolved/unresolved tracking

**Database model:** ✅ GEÏMPLEMENTEERD
```prisma
model GitHubReview {
  id              Int       @id @default(autoincrement())
  pullRequestId   Int       @map("pull_request_id")
  reviewId        BigInt    @map("review_id")
  authorLogin     String    @db.VarChar(255) @map("author_login")
  state           String    @db.VarChar(50)   // 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED'
  body            String?   @db.Text
  htmlUrl         String?   @db.VarChar(512) @map("html_url")
  submittedAt     DateTime? @map("submitted_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  pullRequest     GitHubPullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  comments        GitHubReviewComment[]

  @@unique([pullRequestId, reviewId])
  @@index([authorLogin])
  @@index([state])
  @@map("github_reviews")
}

model GitHubReviewComment {
  id              Int       @id @default(autoincrement())
  reviewId        Int       @map("review_id")
  commentId       BigInt    @map("comment_id")
  path            String    @db.VarChar(512)
  line            Int?
  side            String?   @db.VarChar(10)  // 'LEFT' | 'RIGHT'
  body            String    @db.Text
  authorLogin     String    @db.VarChar(255) @map("author_login")
  htmlUrl         String?   @db.VarChar(512) @map("html_url")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  review          GitHubReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@unique([reviewId, commentId])
  @@map("github_review_comments")
}
```

**Service layer:** ✅ `apps/api/src/services/github/reviewService.ts`
- `upsertReview()` - Review opslaan/updaten
- `upsertReviewComment()` - Review comment opslaan/updaten
- `getReviewsForPR()` - Reviews voor een PR ophalen
- `getPRReviewSummary()` - Review summary (approved, changes_requested, etc.)
- `getReviewsForTask()` - Reviews voor alle PRs van een task
- `getTaskReviewSummary()` - Geaggregeerde review status voor task
- `requestReview()` - Review request via GitHub API
- `getSuggestedReviewers()` - Suggested reviewers van GitHub
- `getPendingReviewRequests()` - Pending review requests
- `syncReviewsFromGitHub()` - Sync reviews van GitHub naar database

**tRPC procedures:** ✅ 8 procedures toegevoegd
- `github.getPRReviews` - Reviews voor PR
- `github.getPRReviewSummary` - Review summary voor PR
- `github.getTaskReviews` - Reviews voor task
- `github.getTaskReviewSummary` - Review summary voor task
- `github.requestReview` - Request review van user
- `github.getSuggestedReviewers` - Suggested reviewers
- `github.getPendingReviewRequests` - Pending requests
- `github.syncPRReviews` - Sync reviews van GitHub

**Webhook handler:** ✅ `pull_request_review` event
- Automatische upsert van reviews bij webhook
- Sync log entries voor audit trail

**Tests:** ✅ 17 tests in `reviewService.test.ts`

#### 12.3 Approval Workflow

- [x] Track approval status (via review state)
- [ ] Required approvals indicator
- [x] Approval history (via getReviewsForPR)
- [ ] Auto-move task on all approvals

#### 12.4 CODEOWNERS Integration

- [ ] Parse CODEOWNERS file
- [ ] Suggest reviewers based on changed files
- [ ] Show code ownership in file list

#### 12.5 Frontend: Code Review Panel ✅ COMPLEET

**Bestand:** `apps/web/src/components/task/TaskReviewPanel.tsx`

- [x] Review status overview (summary card met approved/changes/comments/pending counts)
- [x] Reviewer list met status (avatar, login, state badge)
- [x] Review body weergave
- [ ] Comment threads (collapsed) - future enhancement
- [ ] Request review button - future enhancement
- [ ] Approve/Request changes actions - future enhancement

**Deliverables Fase 12:**
- [x] Review tracking backend (database, service, tRPC)
- [x] Webhook handler voor pull_request_review
- [x] Review summary aggregatie
- [x] Frontend: TaskReviewPanel met Reviews tab in TaskDetailModal
- [ ] CODEOWNERS integratie (deferred)

#### Fase 12 Completion Checklist
- [x] **Code**: Backend + Frontend review integration compleet
- [x] **Tests**: 17 tests voor reviewService
- [x] **ACL**: N.v.t. (gebruikt project R/W permissions)
- [ ] **MCP**: Review tools (deferred naar Fase 9B)
- [x] **Frontend**: TaskReviewPanel.tsx + Reviews tab
- [x] **Docs**: ROADMAP bijgewerkt
- [ ] **Commit**: `feat(github): Fase 12 - Code Review Integratie`

---

### Fase 13: Analytics & Insights ✅ COMPLEET

**Doel:** Developer en project metrics vanuit GitHub data.

**Status:** Compleet (Core Analytics).

#### 13.1 Cycle Time Analytics

- [x] Time from task creation → PR merged
- [x] Average, median, min, max cycle times
- [x] Total completed tasks tracked
- [ ] Bottleneck identificatie (deferred)
- [ ] Trend over tijd per week (deferred)

**Backend service:** `apps/api/src/services/github/analyticsService.ts`

**Backend procedures (5):**
- [x] `github.getCycleTimeStats` - Cycle time metrics
- [x] `github.getReviewTimeStats` - Review time metrics
- [x] `github.getContributorStats` - Contributor statistics
- [x] `github.getThroughputStats` - Throughput per periode (week/month)
- [x] `github.getProjectAnalytics` - Combined analytics

#### 13.2 Code Review Analytics

- [x] Average time to first review
- [x] Average time to approval
- [x] Reviews per PR
- [x] Comments per review
- [x] Total PRs reviewed

#### 13.3 Contributor Statistics

- [x] Commits per contributor
- [x] PRs opened/merged
- [x] Reviews given
- [x] Comments given
- [x] Sorted by total activity
- [ ] Lines added/removed (deferred - requires GitHub API call)

#### 13.4 Throughput Statistics

- [x] Weekly/monthly throughput
- [x] Tasks completed per period
- [x] PRs merged per period
- [x] Issues closed per period
- [ ] Burndown/velocity charts (deferred)
- [ ] Predictive completion dates (deferred)

#### 13.5 Frontend: Analytics Tab

**Component:** `apps/web/src/components/github/ProjectAnalyticsPanel.tsx`

**Geïntegreerd in:** `apps/web/src/pages/project/GitHubProjectSettings.tsx` (Analytics tab)

- [x] Metric cards (Cycle Time, Review Time, Contributors, Reviews/PR)
- [x] Cycle time breakdown (Fastest, Median, Slowest)
- [x] Weekly throughput bar chart
- [x] Top contributors list with GitHub avatars
- [x] Loading/empty/error states
- [x] Refresh functionality
- [ ] Export to CSV/PDF (deferred)

**Deliverables Fase 13:**
- [x] Cycle time analytics (backend + frontend)
- [x] Code review metrics (via reviewService)
- [x] Contributor statistics (aggregated from commits/PRs/reviews)
- [x] Throughput statistics (weekly/monthly)
- [ ] Burndown/velocity charts (deferred to 13B)

#### Fase 13 Completion Checklist
- [x] **Code**: Analytics service werkend, ProjectAnalyticsPanel geïntegreerd
- [x] **Tests**: 11 tests voor analytics calculations (analyticsService.test.ts)
- [ ] **ACL**: `github-analytics` project feature (deferred - uses existing project perms)
- [ ] **MCP**: Analytics tools (deferred to Fase 13B)
- [x] **Docs**: ROADMAP bijgewerkt
- [ ] **Commit**: `feat(github): Fase 13 - Analytics & Insights`

---

### Fase 14: Developer Experience ⚡ DEELS COMPLEET

**Doel:** Tools en integraties voor developers.

**Status:** Deels compleet (2026-01-09) - Bot + CLI klaar, VS Code extension gepland.

#### 14.1 VS Code Extension 🚧 GEPLAND

- [ ] Task list sidebar
- [ ] Quick task creation
- [ ] Branch creation voor task
- [ ] Task reference auto-complete in commits
- [ ] PR creation met task link

*Gepland voor Fase 14B*

#### 14.2 CLI Tool ✅ COMPLEET

- [x] `kanbu task list` - List tasks
- [x] `kanbu task start <id>` - Create branch and assign
- [x] `kanbu task done <id>` - Move to done
- [x] `kanbu task show <id>` - Show task details
- [x] `kanbu task create` - Create new task
- [x] `kanbu pr create` - Create PR with task link
- [x] `kanbu pr status` - PR status for current branch
- [x] `kanbu pr link <task>` - Link PR to task
- [x] `kanbu login/logout/whoami` - Authentication

**Package:** `packages/cli/`

```bash
# Installation
npm install -g @kanbu/cli

# Usage
kanbu login --token YOUR_TOKEN
kanbu task list --project my-project
kanbu task start PROJ-123
kanbu task done PROJ-123
kanbu pr create --title "feat: Add feature"
kanbu pr status
```

#### 14.3 Git Hooks Integration 🚧 GEPLAND

- [ ] Pre-commit hook: Validate task reference in message
- [ ] Commit-msg hook: Auto-add task reference
- [ ] Pre-push hook: Check PR exists
- [ ] Post-checkout hook: Update task status

*Gepland voor Fase 14B*

#### 14.4 GitHub Bot ✅ COMPLEET

- [x] Slash command processing in PR/issue comments
- [x] Auto-comment op PRs met task info
- [x] AI-generated PR summaries
- [ ] Reminder comments voor stale PRs (Fase 14B)
- [ ] Welcome message voor nieuwe contributors (Fase 14B)

**Bot commands:**
```
/kanbu link PROJ-123      - Link PR to task
/kanbu unlink             - Unlink PR from task
/kanbu status             - Show task/PR status
/kanbu summary            - Generate AI summary
/kanbu help               - Show available commands
```

**Implementation:**
- `apps/api/src/services/github/botService.ts` - Bot service (24 tests)
- `apps/api/src/routes/webhooks/github.ts` - Issue comment handler

**Deliverables Fase 14:**
- [ ] VS Code extension (Fase 14B)
- [x] CLI tool (`@kanbu/cli` package)
- [ ] Git hooks package (Fase 14B)
- [x] GitHub bot (slash commands + AI summary)

#### Fase 14 Completion Checklist
- [x] **Code**: CLI werkend (`packages/cli/`), Bot actief (`botService.ts`)
- [x] **Tests**: Bot command parsing tests (24 tests), all 134 GitHub tests passing
- [x] **ACL**: N.v.t. (externe tools)
- [x] **MCP**: N.v.t. (CLI/extension zijn standalone)
- [x] **Docs**: ROADMAP.md bijgewerkt
- [ ] **CLAUDE.md**: Developer tools overzicht (optioneel)
- [x] **Commit**: `feat(github): Fase 14 - Developer Experience (Bot + CLI)`

---

### Fase 15: Multi-Repo Support 🚧 GEPLAND

**Doel:** Ondersteuning voor complexe repository structuren.

**Status:** Gepland.

#### 15.1 Monorepo Support

- [ ] Multiple packages/apps in één repo
- [ ] Path-based filtering
- [ ] Package-specific workflows
- [ ] Affected packages detection

**Sync settings uitbreiding:**
```typescript
interface MonorepoSettings {
  enabled: boolean
  packages: Array<{
    path: string            // e.g., "packages/api"
    name: string            // e.g., "API"
    labelPrefix?: string    // e.g., "api:"
  }>
  affectedDetection: {
    enabled: boolean
    baseBranch: string
  }
}
```

#### 15.2 Multi-Repo Projects

- [ ] Project linken aan meerdere repositories
- [ ] Cross-repo issue references
- [ ] Unified view van alle repos
- [ ] Aggregated stats

**Database model uitbreiding:**
```prisma
// Change GitHubRepository projectId from @unique to regular relation
// Add support for multiple repos per project

model GitHubRepository {
  // ... existing fields
  projectId       Int       @map("project_id")  // Remove @unique
  isPrimary       Boolean   @default(false) @map("is_primary")

  @@unique([projectId, owner, name])  // New unique constraint
}
```

#### 15.3 Cross-Repo PRs

- [ ] PRs die meerdere repos affecten
- [ ] Dependency PRs tracking
- [ ] Linked PRs view
- [ ] Coordinated merging

#### 15.4 Repository Groups

- [ ] Groepeer gerelateerde repos
- [ ] Bulk operations op groep
- [ ] Shared settings per groep
- [ ] Cross-repo search

**Deliverables Fase 15:**
- [ ] Monorepo configuratie
- [ ] Multi-repo project linking
- [ ] Cross-repo PR tracking
- [ ] Repository groups

#### Fase 15 Completion Checklist
- [ ] **Code**: Multi-repo linking werkend, monorepo filtering actief
- [ ] **Tests**: Monorepo path filtering tests, multi-repo linking tests, cross-repo PR tests
- [ ] **ACL**: N.v.t. (uitbreiding bestaande project linking)
- [ ] **MCP**: Multi-repo tools (indien nodig) toegevoegd
- [ ] **Docs**: Multi-repo configuratie gedocumenteerd
- [ ] **CLAUDE.md**: Multi-repo patterns gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 15 - Multi-Repo Support`

---

### Fase 16: AI/Claude Integratie ✅ COMPLEET

**Doel:** AI-powered features voor GitHub workflow.

**Status:** Compleet (2026-01-09).

#### 16.1 PR Summary Generation ✅

- [x] Auto-generate PR description from commits
- [x] Summarize changes for reviewers
- [x] Highlight breaking changes
- [x] Suggest affected areas

**tRPC procedures:**
- [x] `generateAIPRSummary` - Generate PR summary from commits and diff
- [x] `getAIStatus` - Check if AI service is configured

#### 16.2 Code Review Assistance ✅

- [x] AI-powered code review suggestions
- [x] Security vulnerability detection
- [x] Performance issue detection
- [x] Code style recommendations
- [x] Complexity warnings

**Backend service:**
```typescript
// apps/api/src/services/github/aiService.ts
aiService = {
  isConfigured(): boolean
  getProvider(): AIProvider | null
  generatePRSummary(input: PRSummaryInput): Promise<PRSummary>
  reviewCode(input: CodeReviewInput): Promise<CodeReviewResult>
  generateReleaseNotes(input: ReleaseNotesInput): Promise<ReleaseNotes>
  generateCommitMessage(input: CommitMessageInput): Promise<CommitMessage>
}
```

**tRPC procedures:**
- [x] `generateAICodeReview` - AI-powered code review suggestions

#### 16.3 Release Notes Generation ✅

- [x] Generate release notes from merged PRs
- [x] Categorize changes (features, fixes, etc.)
- [x] Highlight breaking changes
- [x] Credit contributors

**tRPC procedures:**
- [x] `generateAIReleaseNotes` - Generate release notes from PRs

#### 16.4 Commit Message Generation ✅

- [x] Generate conventional commit messages
- [x] Detect commit type (feat, fix, refactor, etc.)
- [x] Suggest scope from file paths
- [x] Include body for complex changes

**tRPC procedures:**
- [x] `generateAICommitMessage` - Generate commit message from staged files

#### 16.5 Bug Triage & Smart Tasks 🚧 FUTURE

- [ ] Auto-categorize new issues
- [ ] Suggest priority based on content
- [ ] Create tasks from PR review comments
- [ ] Auto-link related tasks

*Moved to future enhancement - core AI features complete*

**Deliverables Fase 16:**
- [x] PR summary generation
- [x] AI code review assistance
- [x] Release notes generation
- [x] Commit message generation
- [x] Multi-provider support (Anthropic Claude, OpenAI)

#### Fase 16 Completion Checklist
- [x] **Code**: AI service (`aiService.ts`) met 4 functies, dual provider support
- [x] **Tests**: 26 tests voor configuratie, error handling en type validation
- [x] **ACL**: Via bestaande project READ/WRITE permissions
- [x] **tRPC**: 5 AI procedures toegevoegd aan `github.ts`
- [x] **Docs**: ROADMAP.md bijgewerkt
- [ ] **CLAUDE.md**: AI integratie patterns documenteren (optioneel)
- [x] **Commit**: `feat(github): Fase 16 - AI/Claude Integratie`

---

## Tool Overzicht

| Fase | Tools/Features | Niveau | Status |
|------|----------------|--------|--------|
| Fase 1 | Database schema (7 models incl. UserMapping) + 69 tests | - | ✅ Compleet |
| Fase 2 | OAuth + Installation + User Mapping (15 procedures) + 19 tests | Admin/Workspace | ✅ Compleet |
| Fase 3 | Repository linking + Settings UI (7 procedures) + 21 tests | Project | ✅ Compleet |
| Fase 4 | Webhook handler (11 event types) + 28 tests | System | ✅ Compleet |
| Fase 5 | Issue sync GitHub→Kanbu (sync service + 2 procedures) + 18 tests | Project | ✅ Compleet |
| Fase 6 | Issue sync Kanbu→GitHub (outbound service + 3 procedures) + 17 tests | Project | ✅ Compleet |
| Fase 7 | PR & Commit tracking (10 procedures) + 38 tests | Project | ✅ Compleet |
| Fase 8 | Automation (branch creation, task status) + 33 tests | Project | ✅ Compleet |
| Fase 9 | MCP tools (10 tools) + 34 tests | MCP | ✅ Compleet |
| Fase 10 | CI/CD workflow tracking (7 procedures) + frontend panel + 26 tests | Project | ✅ Compleet |
| Fase 10B | Extended CI/CD (Deploy, Check runs, Notifications) + 60 tests | Project | ✅ Compleet |
| Fase 11 | Geavanceerde Sync (Milestones, Releases) + 30 tests | Project | ⚡ Deels Compleet |
| Fase 12 | Code Review Integratie (Reviews, CODEOWNERS) | Project | ✅ Compleet |
| Fase 13 | Analytics & Insights (Cycle Time, Stats) | Project | ✅ Compleet |
| Fase 14 | Developer Experience (Bot + CLI + Git Hooks) + 53 tests | Tools | ⚡ Deels Compleet |
| Fase 15 | Multi-Repo Support (Monorepo, Cross-repo) | Project | 🚧 Gepland |
| Fase 16 | AI/Claude Integratie (PR Summary, Review AI) + 26 tests | MCP/AI | ✅ Compleet |

---

## Prioriteit Matrix

### Core (P0-P1) - Fase 1-9
| Item | Impact | Effort | Prioriteit |
|------|--------|--------|------------|
| Database schema | Kritiek | Medium | P0 |
| GitHub App setup | Kritiek | Medium | P0 |
| Repository linking | Kritiek | Low | P0 |
| Sidebar menu item | Hoog | Low | P1 |
| GitHub settings page | Hoog | Medium | P1 |
| Webhook handler | Hoog | Medium | P1 |
| Issue sync (inbound) | Hoog | High | P1 |
| Issue sync (outbound) | Medium | High | P2 |
| PR tracking | Medium | Medium | P2 |
| Commit tracking | Medium | Low | P2 |
| Automation | Medium | High | P3 |
| MCP tools | Low | Medium | P3 |

### Extended (P3-P4) - Fase 10-16
| Item | Impact | Effort | Prioriteit |
|------|--------|--------|------------|
| CI/CD - Build status | Hoog | Medium | P3 |
| CI/CD - Deploy tracking | Medium | Medium | P3 |
| Code Review - Reviews sync | Hoog | High | P3 |
| Code Review - CODEOWNERS | Medium | Low | P4 |
| Analytics - Cycle time | Hoog | Medium | P3 |
| Analytics - Contributor stats | Medium | Medium | P4 |
| Milestones sync | Medium | Medium | P4 |
| Releases tracking | Medium | Low | P4 |
| VS Code Extension | Hoog | High | P4 |
| CLI Tool | Medium | Medium | P4 |
| Git Hooks | Medium | Low | P4 |
| GitHub Bot | Medium | High | P4 |
| Monorepo support | Medium | High | P4 |
| Multi-repo projects | Low | High | P5 |
| AI - PR Summary | Hoog | Medium | P4 |
| AI - Code Review | Hoog | High | P5 |
| AI - Release Notes | Medium | Medium | P5 |
| AI - Bug Triage | Medium | High | P5 |

---

## Te Wijzigen/Maken Bestanden

### Database & Types
| Bestand | Wijziging |
|---------|-----------|
| `packages/shared/prisma/schema.prisma` | 7 nieuwe models (incl. GitHubUserMapping) |
| `packages/shared/src/types/github.ts` | **Nieuw** - TypeScript types |

### Backend API - Admin Niveau
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/trpc/procedures/githubAdmin.ts` | **Nieuw** - Admin-level tRPC procedures |
| `apps/api/src/services/github/installationService.ts` | **Nieuw** - Installation management |
| `apps/api/src/services/github/userMappingService.ts` | **Nieuw** - User mapping service |

### Backend API - Project Niveau
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/trpc/procedures/github.ts` | **Nieuw** - Project-level tRPC procedures |
| `apps/api/src/services/github/syncService.ts` | **Nieuw** - Sync service |
| `apps/api/src/services/github/repositoryService.ts` | **Nieuw** - Repository linking |

### Backend API - Shared
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/routes/webhooks/github.ts` | **Nieuw** - Webhook handler |
| `apps/api/src/services/github/` | **Nieuw** - GitHub service classes |
| `apps/api/src/lib/github.ts` | **Nieuw** - GitHub API client |

### Frontend - Admin Niveau
| Bestand | Wijziging |
|---------|-----------|
| `apps/web/src/pages/admin/GitHubAdminPage.tsx` | **Nieuw** - Admin GitHub settings |
| `apps/web/src/components/admin/github/InstallationsTab.tsx` | **Nieuw** - Installations beheer |
| `apps/web/src/components/admin/github/UserMappingTab.tsx` | **Nieuw** - User mapping UI |
| `apps/web/src/components/admin/github/OverviewTab.tsx` | **Nieuw** - Repos overview |
| `apps/web/src/pages/admin/AdminSidebar.tsx` | Add GitHub menu item |

### Frontend - Project Niveau
| Bestand | Wijziging |
|---------|-----------|
| `apps/web/src/pages/project/GitHubProjectSettings.tsx` | **Nieuw** - Project GitHub settings |
| `apps/web/src/components/github/RepoLinkForm.tsx` | **Nieuw** - Repo linking form |
| `apps/web/src/components/github/SyncSettingsForm.tsx` | **Nieuw** - Sync settings |
| `apps/web/src/components/github/SyncStatusPanel.tsx` | **Nieuw** - Sync status + logs |
| `apps/web/src/components/task/TaskGitHubPanel.tsx` | **Nieuw** - Task GitHub info panel |
| `apps/web/src/components/layout/ProjectSidebar.tsx` | Add GitHub menu item + GitHubIcon |

### Frontend - Shared
| Bestand | Wijziging |
|---------|-----------|
| `apps/web/src/components/github/` | **Nieuw** - GitHub components directory |
| `apps/web/src/hooks/useProjectFeatureAccess.ts` | Add 'github' feature slug |
| `apps/web/src/router.tsx` | Nieuwe routes (admin + project) |

### ACL & Permissions
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/permissions/definitions/index.ts` | Add 'github' feature definition |
| `apps/api/src/services/auditService.ts` | Add GITHUB_* audit actions |

### MCP Server
| Bestand | Wijziging |
|---------|-----------|
| `packages/mcp-server/src/tools/github.ts` | **Nieuw** - GitHub tools |
| `packages/mcp-server/src/tools/index.ts` | Export github tools |
| `packages/mcp-server/src/index.ts` | Add github handlers |

### Fase 10-16: Extended Features

#### CI/CD & Analytics (Fase 10, 13)
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/cicdService.ts` | **Nieuw** - CI/CD integration service |
| `apps/api/src/services/github/analyticsService.ts` | **Nieuw** - Analytics service |
| `apps/web/src/components/task/TaskCICDPanel.tsx` | **Nieuw** - CI/CD status panel |
| `apps/web/src/pages/project/GitHubAnalyticsPage.tsx` | **Nieuw** - Analytics dashboard |

#### Code Review (Fase 12)
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/reviewService.ts` | **Nieuw** - Code review service |
| `apps/web/src/components/task/TaskReviewPanel.tsx` | **Nieuw** - Review status panel |

#### Geavanceerde Sync (Fase 11)
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/milestoneService.ts` | **Nieuw** - Milestone sync |
| `apps/api/src/services/github/releaseService.ts` | **Nieuw** - Release tracking |

#### Developer Experience (Fase 14) ⚡
| Bestand | Wijziging |
|---------|-----------|
| `packages/cli/` | **Nieuw** - CLI tool package ✅ |
| `packages/cli/src/index.ts` | CLI entry point met alle commands |
| `packages/cli/src/config.ts` | Configuration storage |
| `packages/cli/src/api.ts` | tRPC API client |
| `packages/cli/src/commands/auth.ts` | login, logout, whoami |
| `packages/cli/src/commands/task.ts` | list, show, start, done, create |
| `packages/cli/src/commands/pr.ts` | create, status, link |
| `apps/api/src/services/github/botService.ts` | **Nieuw** - Bot slash commands ✅ |
| `apps/api/src/services/github/__tests__/botService.test.ts` | **Nieuw** - 24 tests |
| `apps/api/src/routes/webhooks/github.ts` | Issue comment handler toegevoegd |
| `packages/git-hooks/` | **Nieuw** - Git hooks package ✅ |
| `packages/git-hooks/src/cli.ts` | CLI: install, uninstall, status, config, run |
| `packages/git-hooks/src/utils.ts` | Utilities voor task extraction, hook management |
| `packages/git-hooks/src/hooks/prepare-commit-msg.ts` | Auto-add task ref to commits |
| `packages/git-hooks/src/hooks/commit-msg.ts` | Validate task reference |
| `packages/git-hooks/src/hooks/post-commit.ts` | Link commit to task in Kanbu |
| `packages/git-hooks/src/__tests__/utils.test.ts` | **Nieuw** - 29 tests |
| `packages/vscode-extension/` | 🚧 Gepland voor Fase 14B |

#### Multi-Repo (Fase 15)
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/monorepoService.ts` | **Nieuw** - Monorepo support |
| `apps/api/src/services/github/multiRepoService.ts` | **Nieuw** - Multi-repo linking |

#### AI/Claude Integration (Fase 16) ✅
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/aiService.ts` | **Nieuw** - AI service (4 functies) |
| `apps/api/src/services/github/__tests__/aiService.test.ts` | **Nieuw** - 26 tests |
| `apps/api/src/services/github/index.ts` | Export AI service |
| `apps/api/src/trpc/procedures/github.ts` | 5 AI procedures toegevoegd |
| `apps/api/.env.example` | AI provider configuratie |

---

## ACL Integratie

### Twee-Niveau Permissions

De GitHub connector vereist permissions op **twee niveaus**:

#### Workspace Niveau (Admin)

| Actie | Required Permission |
|-------|---------------------|
| Bekijk installations | Workspace R |
| Manage installations | Workspace P |
| Bekijk user mappings | Workspace R |
| Create/edit user mappings | Workspace P |
| Bekijk alle repos in workspace | Workspace R |

#### Project Niveau

| Actie | Required Permission |
|-------|---------------------|
| View GitHub panel | Project R |
| View synced issues/PRs | Project R |
| Trigger manual sync | Project W |
| Link/unlink repository | Project P |
| Configure sync settings | Project P |
| Create feature branch | Project W |

### Feature Access Control

**Bestand:** `apps/api/src/permissions/definitions/index.ts`

```typescript
// Add to WORKSPACE_FEATURES (Admin niveau)
{
  slug: 'github-admin',
  name: 'GitHub Administration',
  description: 'Manage GitHub installations and user mappings',
  permissions: ['R', 'P'],  // R=view, P=manage
  requiredPermission: 'R',
}

// Add to PROJECT_FEATURES (Project niveau)
{
  slug: 'github',
  name: 'GitHub',
  description: 'Link project to GitHub repository',
  permissions: ['R', 'W', 'P'],  // R=view, W=sync, P=configure
  default: 'MANAGER',
}
```

### Voorbeeld Permission Flow

```
User wil repo koppelen aan project:

1. Check: Heeft user Project P op dit project?
   → Ja: Ga door
   → Nee: "You need Project Manager permission"

2. Check: Zijn er GitHub installations in de workspace?
   → Ja: Toon repo selector
   → Nee: "No GitHub installations. Contact workspace admin."
        (Link naar admin pagina als user ook Workspace P heeft)

3. User selecteert repo en slaat op
   → Repo gekoppeld aan project
   → Audit log: GITHUB_REPO_LINKED
```

### Audit Logging

Alle GitHub acties worden gelogd in het audit systeem:

```typescript
// Admin-niveau audit actions (Workspace)
GITHUB_INSTALLATION_ADDED = 'github:installation_added'
GITHUB_INSTALLATION_REMOVED = 'github:installation_removed'
GITHUB_USER_MAPPING_CREATED = 'github:user_mapping_created'
GITHUB_USER_MAPPING_UPDATED = 'github:user_mapping_updated'
GITHUB_USER_MAPPING_DELETED = 'github:user_mapping_deleted'
GITHUB_AUTO_MATCH_TRIGGERED = 'github:auto_match_triggered'

// Project-niveau audit actions
GITHUB_REPO_LINKED = 'github:repo_linked'
GITHUB_REPO_UNLINKED = 'github:repo_unlinked'
GITHUB_SETTINGS_UPDATED = 'github:settings_updated'
GITHUB_SYNC_TRIGGERED = 'github:sync_triggered'
GITHUB_ISSUE_IMPORTED = 'github:issue_imported'
GITHUB_ISSUE_EXPORTED = 'github:issue_exported'
GITHUB_PR_LINKED = 'github:pr_linked'
GITHUB_BRANCH_CREATED = 'github:branch_created'
```

---

## Security Considerations

1. **GitHub App Private Key** - Secure storage in environment variable, never expose
2. **Installation Access Tokens** - Short-lived (1 hour), auto-refresh before expiry
3. **Webhook Secrets** - Per-repository, HMAC SHA-256 validation
4. **ACL Integration** - Project P permission required for configuration
5. **Rate Limiting** - Respect GitHub API limits (5000 req/hour for apps)
6. **Audit Logging** - All sync operations and config changes logged
7. **Token Encryption** - Access tokens encrypted at rest in database

---

## Verificatie Checklist

### Fase 1 ✅
- [x] Database synced succesvol (`prisma db push`)
- [x] Types correct gegenereerd (`packages/shared/src/types/github.ts`)
- [x] Relations werken correct (7 models geïmplementeerd)
- [x] Tests passing (114 tests)

### Fase 2 ✅
- [x] GitHub App installeerbaar
- [x] OAuth callback werkt
- [x] Token refresh automatisch
- [x] User mapping CRUD werkt
- [x] Admin UI functioneel

### Fase 3 ✅
- [x] Repository linken werkt (7 tRPC procedures)
- [x] Settings opslaan werkt (Zod schema validation)
- [x] Settings UI responsive (3 tabs: Repository, Settings, Logs)
- [x] Sidebar menu item met ACL check
- [x] Tests passing (21 tests in `githubProject.test.ts`)

### Fase 4 ✅
- [x] Webhook ontvangt events
- [x] Signature verificatie werkt
- [x] Events correct gerouted

### Fase 5 ✅
- [x] Issues correct geïmporteerd
- [x] User mapping lookup werkt
- [x] Tags worden aangemaakt van labels
- [x] Geen duplicate creates (skipExisting)

### Fase 6 ✅
- [x] Bidirectionele sync werkt
- [x] Conflict detection actief (sync hash)

### Fase 7 ✅
- [x] PRs auto-gelinkt via branch/title/body
- [x] Commits auto-gelinkt via message parsing
- [x] Manual linking/unlinking werkt
- [x] Task reference patterns correct geëxtraheerd

### Fase 8 ✅
- [x] Branch creation via API werkt
- [x] Task status automation via webhooks werkt
- [x] Column matching (exact + fuzzy) correct
- [x] Automation settings configurable via sync settings

### Fase 9 ✅
- [x] MCP tools typecheck
- [x] MCP tools functioneel (10 tools geïmplementeerd)

### Fase 10 (CI/CD) ✅
- [x] Workflow runs correct getracked (webhook + database)
- [x] Auto-link to tasks/PRs by branch name
- [x] Re-run workflow werkt (via GitHub API)
- [x] Cancel workflow werkt
- [x] Workflow jobs en steps ophaalbaar
- [x] Statistics (success rate, avg duration)
- [x] Build status badges tonen op task cards
- [x] CI/CD panel in task detail view

### Fase 10B (Extended CI/CD) ✅ COMPLEET
- [x] Deployment webhook handlers (deployment, deployment_status)
- [x] Deploy history per environment (getEnvironmentHistory)
- [x] Deployment stats (success rate, by environment)
- [x] Check run webhook handlers (check_run)
- [x] Check run stats and trends
- [x] CI/CD notifications (workflow, deployment, check run)
- [x] Configurable triggers (all, failures_only, none)
- [x] In-app notifications via bestaand systeem

### Fase 11 (Geavanceerde Sync) ⚡
- [x] Milestones sync werkt (GitHubMilestone model, 13 tests)
- [x] Releases tracking (GitHubRelease model, 17 tests)
- [x] Frontend: ProjectMilestonesPanel + ProjectReleasesPanel
- [ ] Wiki integratie (→ Fase 11B)
- [ ] GitHub Projects V2 (→ Fase 11B)

### Fase 12 (Code Review) ✅
- [x] Review tracking in database (GitHubReview + GitHubReviewComment models)
- [x] Review comments sync via webhook
- [x] Approval status correct (via getPRReviewSummary)
- [x] 8 tRPC procedures, 17 tests
- [x] Frontend: TaskReviewPanel met Reviews tab
- [ ] CODEOWNERS parsing (deferred)

### Fase 13 (Analytics) ✅
- [x] Cycle time correct berekend (avg, median, min, max)
- [x] Review time stats accuraat (time to first review, time to approval)
- [x] Contributor stats accuraat (commits, PRs, reviews per user)
- [x] Throughput stats (weekly/monthly)
- [x] 11 tests passing
- [x] ProjectAnalyticsPanel geïntegreerd in GitHubProjectSettings
- [ ] Burndown/velocity charts (deferred to 13B)
- [ ] Export to CSV/PDF (deferred)

### Fase 14 (Developer Experience)
- [ ] VS Code extension installeert
- [ ] CLI tool werkt
- [ ] Git hooks installeren correct
- [ ] GitHub bot reageert op commands

### Fase 15 (Multi-Repo)
- [ ] Monorepo path filtering werkt
- [ ] Multiple repos per project mogelijk
- [ ] Cross-repo view werkt

### Fase 16 (AI/Claude) ✅
- [x] PR summary generation werkt
- [x] AI code review suggestions correct
- [x] Release notes generation accuraat
- [x] Commit message generation werkt
- [x] Multi-provider support (Anthropic, OpenAI)
- [ ] Bug triage suggestions relevant

---

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-09 | **Fase 12 COMPLEET**: Code Review Integratie - GitHubReview + GitHubReviewComment models, reviewService.ts (10 functies), webhook handler voor pull_request_review events, 8 tRPC procedures, 17 tests, TypeScript types uitgebreid. Frontend: TaskReviewPanel.tsx met Reviews tab in TaskDetailModal. |
| 2026-01-09 | **Fase 10 COMPLEET**: CI/CD Integratie - GitHubWorkflowRun model, workflowService.ts, webhook handler voor workflow_run events, 7 tRPC procedures (getWorkflowRuns, getWorkflowRunDetails, getWorkflowJobs, getTaskWorkflowRuns, getWorkflowStats, rerunWorkflow, cancelWorkflow), 26 tests. Frontend panel en deploy tracking deferred. |
| 2026-01-09 | **Fase 9 COMPLEET**: MCP Tools - 10 GitHub tools in `packages/mcp-server/src/tools/github.ts` (5 query + 5 management), 34 tests, TypeScript compileert, docs/MCP/ROADMAP.md bijgewerkt |
| 2026-01-09 | **Fase 8 COMPLEET**: Automation - automationService.ts met branch creation, task status automation via webhooks, column fuzzy matching, sync settings extension, 3 tRPC procedures, 33 tests |
| 2026-01-09 | **Fase 7 COMPLEET**: PR & Commit Tracking - prCommitLinkService.ts met task reference extraction, auto-linking via webhook, 10 tRPC procedures, 38 tests |
| 2026-01-09 | **Fase 6 COMPLEET**: Outbound sync (createGitHubIssueFromTask, updateGitHubIssueFromTask, syncTaskToGitHub), reverse user mapping, sync hash conflict detection, 17 tests, 3 tRPC procedures |
| 2026-01-09 | **Fase 5 COMPLEET**: Issue sync service (issueSyncService.ts), bulk import, real-time webhook sync, user mapping integration, tag creation from labels, 18 tests |
| 2026-01-09 | **Fase 3 COMPLEET**: 7 project-level tRPC procedures, GitHubProjectSettings page met 3 tabs, ProjectSidebar integratie, `github` ACL feature, 21 tests |
| 2026-01-09 | **Fase 2 COMPLEET**: GitHub service layer, 15 tRPC procedures, Admin UI met 3 tabs, 19 tests |
| 2026-01-09 | **MCP correcties**: Fase 2-8 "MCP: N.v.t." gecorrigeerd naar audit logging + MCP tool referenties naar Fase 9 |
| 2026-01-09 | **Tests verplicht**: Fase Completion Protocol uitgebreid met verplichte tests sectie, alle fases (2-16) bijgewerkt |
| 2026-01-09 | **Fase 1 COMPLEET**: Database schema (7 models), TypeScript types, 114 tests |
| 2026-01-09 | Fase Completion Protocol toegevoegd met per-fase completion checklists |
| 2026-01-09 | Fase 10-16 toegevoegd: CI/CD, Geavanceerde Sync, Code Review, Analytics, DX, Multi-Repo, AI |
| 2026-01-09 | Prioriteit Matrix uitgebreid met Extended features (P3-P5) |
| 2026-01-09 | Database models toegevoegd voor Workflow Runs, Reviews, Contributor Stats |
| 2026-01-09 | Twee-tier architectuur toegevoegd (Admin + Project niveau) |
| 2026-01-09 | GitHubUserMapping model toegevoegd (workspace niveau) |
| 2026-01-09 | Bestanden lijst gesplitst in Admin en Project niveau |
| 2026-01-09 | ACL sectie uitgebreid met workspace permissions |
| 2026-01-09 | Initiële roadmap aangemaakt |
