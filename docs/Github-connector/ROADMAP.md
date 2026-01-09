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

### 1. Documentation Updates
- [ ] `docs/Github-connector/ROADMAP.md` - Fase status → ✅ COMPLEET
- [ ] `docs/Github-connector/ARCHITECTURE.md` - Technische details bijwerken indien nodig
- [ ] `docs/Github-connector/README.md` - Quick reference updaten

### 2. ACL Integration
- [ ] Nieuwe features registreren in `packages/shared/prisma/seed-features.ts`
- [ ] Permission requirements documenteren in `docs/ACL/ROADMAP.md`
- [ ] Feature Access Control hooks implementeren (`useProjectFeatureAccess`, etc.)
- [ ] Sidebar menu items toevoegen met ACL checks

### 3. MCP Tools (indien van toepassing)
- [ ] Nieuwe tools toevoegen aan `packages/mcp-server/src/tools/github.ts`
- [ ] Tools documenteren in `docs/MCP/ROADMAP.md`
- [ ] Tool Overzicht tabel updaten in `docs/MCP/README.md`
- [ ] TypeScript types bijwerken

### 4. Project Documentation
- [ ] `v6/dev/kanbu/CLAUDE.md` - Development instructions bijwerken
- [ ] `v6/dev/kanbu/README.md` - Feature list updaten
- [ ] Eventuele nieuwe directories/patterns documenteren

### 5. Git Commit
- [ ] Commit: `feat(github): Fase X - [beschrijving]`
- [ ] Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
- [ ] Push naar kanbu repo, daarna genx submodule update

### 6. Verificatie
- [ ] `pnpm typecheck` passing
- [ ] Functionaliteit handmatig getest
- [ ] Documentatie consistent en up-to-date
- [ ] Cold-start test: nieuwe Claude sessie kan features gebruiken

---

### Fase 1: Database & Infrastructure 🚧 GEPLAND

**Doel:** Database models en basis infrastructuur voor GitHub integratie.

**Status:** Gepland.

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

- [ ] Add relations to Task model for GitHubIssue, GitHubPullRequest, GitHubCommit
- [ ] Add `githubBranch` field for feature branch tracking

#### 1.3 Project Model Uitbreiding

- [ ] Add relation to GitHubRepository

**Deliverables Fase 1:**
- [ ] Database schema extensies (7 models incl. GitHubUserMapping)
- [ ] Migration scripts
- [ ] Type definitions
- [ ] Workspace en User model relations

#### Fase 1 Completion Checklist
- [ ] **Code**: Database schema geïmplementeerd, migrations werkend
- [ ] **ACL**: N.v.t. (geen nieuwe UI features)
- [ ] **MCP**: N.v.t. (geen nieuwe tools)
- [ ] **Docs**: ROADMAP, ARCHITECTURE bijgewerkt met finale schema
- [ ] **CLAUDE.md**: GitHub database patterns gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 1 - Database & Infrastructure`

---

### Fase 2: GitHub App & OAuth 🚧 GEPLAND

**Doel:** GitHub App installatie en OAuth flow op **Admin (Workspace) niveau**.

**Status:** Gepland.

#### 2.1 GitHub App Setup

- [ ] GitHub App registreren (manifest flow)
- [ ] App permissions configureren:
  - `issues: read/write`
  - `pull_requests: read`
  - `contents: read`
  - `metadata: read`
- [ ] Webhook events selecteren:
  - `issues`
  - `pull_request`
  - `push`

#### 2.2 Backend: Admin-Level Procedures

**Bestand:** `apps/api/src/trpc/procedures/githubAdmin.ts`

Installatie management (Workspace niveau):
- [ ] `githubAdmin.getInstallationUrl` - Generate GitHub App installation URL
- [ ] `githubAdmin.handleCallback` - Handle OAuth callback from GitHub
- [ ] `githubAdmin.listInstallations` - List workspace's GitHub installations
- [ ] `githubAdmin.listRepositories` - List repositories for installation
- [ ] `githubAdmin.removeInstallation` - Verwijder installatie uit workspace
- [ ] `githubAdmin.refreshToken` - Refresh installation access token

User mapping (Workspace niveau):
- [ ] `githubAdmin.listUserMappings` - Lijst van user mappings in workspace
- [ ] `githubAdmin.createUserMapping` - Koppel GitHub login aan Kanbu user
- [ ] `githubAdmin.updateUserMapping` - Wijzig mapping
- [ ] `githubAdmin.deleteUserMapping` - Verwijder mapping
- [ ] `githubAdmin.autoMatchUsers` - Auto-match op basis van email
- [ ] `githubAdmin.suggestMappings` - Suggesties voor unmapped GitHub users

Overview (Workspace niveau):
- [ ] `githubAdmin.getWorkspaceOverview` - Stats van alle GitHub repos in workspace
- [ ] `githubAdmin.listLinkedRepositories` - Alle gekoppelde repos in workspace

#### 2.3 Frontend: Admin GitHub Settings Page

**Bestand:** `apps/web/src/pages/admin/GitHubAdminPage.tsx`

Tabs:
1. **Installations** - Beheer GitHub App installaties
   - [ ] "Connect to GitHub" button
   - [ ] Installatie lijst met status
   - [ ] Beschikbare repositories per installatie
   - [ ] Disconnect button

2. **User Mapping** - Koppel GitHub users aan Kanbu users
   - [ ] Mapping tabel (GitHub login ↔ Kanbu user)
   - [ ] "Auto Match" button (match op email)
   - [ ] Manual mapping dropdown
   - [ ] Unmapped users indicator

3. **Overview** - Overzicht alle gekoppelde repos
   - [ ] Lijst van projecten met GitHub koppeling
   - [ ] Sync status per project
   - [ ] Quick link naar project settings

#### 2.4 Admin Sidebar Menu Item

**Bestand:** `apps/web/src/pages/admin/AdminSidebar.tsx`

- [ ] Add "GitHub" menu item onder INTEGRATIONS sectie
- [ ] GitHubIcon component

**Deliverables Fase 2:**
- [ ] GitHub App configuratie
- [ ] OAuth flow (install → callback → token storage)
- [ ] Admin-level installation management
- [ ] User mapping UI en API
- [ ] Workspace overview dashboard

#### Fase 2 Completion Checklist
- [ ] **Code**: OAuth flow werkend, installaties beheerbaar
- [ ] **ACL**: `github-admin` feature geregistreerd, Workspace R/P permissions
- [ ] **MCP**: N.v.t. (admin UI only)
- [ ] **Docs**: OAuth flow gedocumenteerd in ARCHITECTURE
- [ ] **CLAUDE.md**: Admin GitHub Settings page gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 2 - GitHub App & OAuth`

---

### Fase 3: Repository Linking 🚧 GEPLAND

**Doel:** Projecten koppelen aan GitHub repositories op **Project niveau**.

**Status:** Gepland.

#### 3.1 Backend: Project-Level Procedures

**Bestand:** `apps/api/src/trpc/procedures/github.ts`

Repository management (Project niveau):
- [ ] `github.linkRepository` - Link repository to project (selecteer uit workspace installations)
- [ ] `github.unlinkRepository` - Unlink repository from project
- [ ] `github.getLinkedRepository` - Get linked repository for project
- [ ] `github.updateSyncSettings` - Update sync configuration

Sync operations (Project niveau):
- [ ] `github.triggerSync` - Manual sync triggeren
- [ ] `github.getSyncStatus` - Huidige sync status
- [ ] `github.getSyncLogs` - Sync history

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

- [ ] Repository selector (uit workspace installations)
- [ ] Link naar Admin pagina voor nieuwe installaties
- [ ] Sync settings form:
  - Issue sync toggle + direction
  - PR tracking toggle + options
  - Commit tracking toggle
  - Automation settings
- [ ] Label/column mapping UI
- [ ] Test connection button
- [ ] Sync status indicator
- [ ] Recent sync logs

#### 3.4 Project Sidebar Menu Item

**Bestand:** `apps/web/src/components/layout/ProjectSidebar.tsx`

- [ ] Add GitHubIcon component
- [ ] Add "GitHub" menu item under MANAGE section
- [ ] Add 'github' feature slug for ACL
- [ ] Badge tonen als repo niet gekoppeld

**Deliverables Fase 3:**
- [ ] Repository linking API (Project niveau)
- [ ] Sync settings configuration
- [ ] Project GitHub settings page
- [ ] Sidebar navigation

#### Fase 3 Completion Checklist
- [ ] **Code**: Repo linking werkend, settings UI compleet
- [ ] **ACL**: `github` project feature geregistreerd, Project R/W/P permissions
- [ ] **MCP**: N.v.t. (UI focus)
- [ ] **Docs**: Sync settings schema gedocumenteerd
- [ ] **CLAUDE.md**: Project GitHub Settings gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 3 - Repository Linking`

---

### Fase 4: Webhook Handler 🚧 GEPLAND

**Doel:** GitHub webhook events verwerken.

**Status:** Gepland.

#### 4.1 Webhook Endpoint

**Bestand:** `apps/api/src/routes/webhooks/github.ts`

- [ ] POST `/api/webhooks/github` - Webhook receiver
- [ ] Signature verification (HMAC SHA-256)
- [ ] Event type routing

#### 4.2 Event Handlers

- [ ] `issues.opened` - Create task from issue
- [ ] `issues.edited` - Update task from issue
- [ ] `issues.closed` - Close/move task
- [ ] `issues.reopened` - Reopen task
- [ ] `issues.labeled` / `issues.unlabeled` - Sync labels to tags
- [ ] `pull_request.opened` - Link PR to task
- [ ] `pull_request.closed` - Update task on PR close
- [ ] `pull_request.merged` - Complete task on merge
- [ ] `push` - Parse commits for task references

#### 4.3 Webhook Security

- [ ] Per-repository webhook secrets
- [ ] Signature validation middleware
- [ ] Rate limiting
- [ ] Idempotency (prevent duplicate processing)

**Deliverables Fase 4:**
- [ ] Webhook endpoint
- [ ] Event handlers
- [ ] Security measures

#### Fase 4 Completion Checklist
- [ ] **Code**: Webhook endpoint werkend, events correct gerouted
- [ ] **ACL**: N.v.t. (backend only)
- [ ] **MCP**: N.v.t. (system level)
- [ ] **Docs**: Webhook security gedocumenteerd in ARCHITECTURE
- [ ] **CLAUDE.md**: Webhook troubleshooting tips
- [ ] **Commit**: `feat(github): Fase 4 - Webhook Handler`

---

### Fase 5: Issue Sync (GitHub → Kanbu) 🚧 GEPLAND

**Doel:** GitHub issues importeren als Kanbu taken.

**Status:** Gepland.

#### 5.1 Initial Import

- [ ] `github.importIssues` - Bulk import existing issues
- [ ] Issue → Task field mapping:
  - `title` → `title`
  - `body` → `description`
  - `state` → column (open=Backlog, closed=Done)
  - `labels` → tags
  - `assignees` → assignees (if user mapping exists)
  - `milestone` → milestone
- [ ] Import progress tracking

#### 5.2 Real-time Sync

- [ ] New issue → Create task
- [ ] Issue update → Update task (with conflict detection)
- [ ] Issue close → Move task to Done column
- [ ] Label changes → Tag sync

#### 5.3 User Mapping Integratie

User mapping wordt beheerd op **Workspace niveau** (zie Fase 2).
Bij issue sync wordt de workspace user mapping gebruikt:

- [ ] Lookup GitHub assignee → Kanbu user via `GitHubUserMapping`
- [ ] Fallback naar "Unassigned" als geen mapping gevonden
- [ ] Warning in sync log voor unmapped users
- [ ] Link naar Admin pagina om mapping aan te maken

**Deliverables Fase 5:**
- [ ] Issue import functionality
- [ ] Real-time issue sync
- [ ] User mapping integratie (via workspace mapping)

#### Fase 5 Completion Checklist
- [ ] **Code**: Issue import werkend, real-time sync actief
- [ ] **ACL**: Sync permissions (Project W) gedocumenteerd
- [ ] **MCP**: N.v.t. (webhook-driven)
- [ ] **Docs**: Issue mapping gedocumenteerd
- [ ] **CLAUDE.md**: Sync troubleshooting gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 5 - Issue Sync Inbound`

---

### Fase 6: Issue Sync (Kanbu → GitHub) 🚧 GEPLAND

**Doel:** Kanbu taken synchroniseren naar GitHub issues.

**Status:** Gepland.

#### 6.1 Task → Issue Creation

- [ ] Create GitHub issue when task created
- [ ] Field mapping (reverse of Fase 5)
- [ ] Label creation if not exists

#### 6.2 Task → Issue Updates

- [ ] Update GitHub issue on task edit
- [ ] Sync task completion → close issue
- [ ] Tag changes → label sync

#### 6.3 Conflict Resolution

- [ ] Last-write-wins with conflict log
- [ ] Sync hash comparison
- [ ] Manual conflict resolution UI (future)

**Deliverables Fase 6:**
- [ ] Task → Issue sync
- [ ] Bidirectional sync
- [ ] Conflict handling

#### Fase 6 Completion Checklist
- [ ] **Code**: Bidirectionele sync werkend, conflicts gelogd
- [ ] **ACL**: N.v.t. (uitbreiding fase 5)
- [ ] **MCP**: N.v.t.
- [ ] **Docs**: Conflict resolution gedocumenteerd
- [ ] **CLAUDE.md**: Bidirectional sync patterns
- [ ] **Commit**: `feat(github): Fase 6 - Issue Sync Outbound`

---

### Fase 7: PR & Commit Tracking 🚧 GEPLAND

**Doel:** Pull requests en commits koppelen aan taken.

**Status:** Gepland.

#### 7.1 PR Linking

- [ ] Auto-link by branch name pattern (e.g., `feature/PROJ-123-*`)
- [ ] Auto-link by task reference in PR title/body
- [ ] Manual linking via UI

#### 7.2 Commit Linking

- [ ] Parse commit messages for task references
- [ ] Link commits to tasks
- [ ] Show commit history on task detail

#### 7.3 Task Detail Integration

**Bestand:** `apps/web/src/components/task/TaskGitHubPanel.tsx`

- [ ] Linked PRs list with status badges
- [ ] Linked commits list
- [ ] Branch info
- [ ] Quick actions (view on GitHub)

**Deliverables Fase 7:**
- [ ] PR tracking
- [ ] Commit tracking
- [ ] Task detail GitHub panel

#### Fase 7 Completion Checklist
- [ ] **Code**: PR/Commit linking werkend, TaskGitHubPanel zichtbaar
- [ ] **ACL**: N.v.t. (onderdeel van project R access)
- [ ] **MCP**: N.v.t.
- [ ] **Docs**: PR linking patterns gedocumenteerd
- [ ] **CLAUDE.md**: TaskGitHubPanel component gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 7 - PR & Commit Tracking`

---

### Fase 8: Automation 🚧 GEPLAND

**Doel:** Automatische acties op basis van GitHub events.

**Status:** Gepland.

#### 8.1 Branch Automation

- [ ] Auto-create feature branch from task
- [ ] Branch naming based on task reference
- [ ] Quick "Start Working" button

#### 8.2 Task Status Automation

- [ ] Move task to "In Progress" when PR opened
- [ ] Move task to "Review" when PR ready for review
- [ ] Move task to "Done" when PR merged
- [ ] Close task when issue closed

#### 8.3 Notification Integration

- [ ] Notify on PR status changes
- [ ] Notify on review requests
- [ ] Notify on CI/CD status changes

**Deliverables Fase 8:**
- [ ] Branch creation automation
- [ ] Task status automation
- [ ] GitHub event notifications

#### Fase 8 Completion Checklist
- [ ] **Code**: Automations werkend, notifications actief
- [ ] **ACL**: N.v.t. (configuratie via sync settings)
- [ ] **MCP**: N.v.t.
- [ ] **Docs**: Automation rules gedocumenteerd
- [ ] **CLAUDE.md**: Automation patterns
- [ ] **Commit**: `feat(github): Fase 8 - Automation`

---

### Fase 9: MCP Tools 🚧 GEPLAND

**Doel:** GitHub tools toevoegen aan MCP server.

**Status:** Gepland.

#### 9.1 GitHub Query Tools

- [ ] `kanbu_get_github_repo` - Get linked repository info
- [ ] `kanbu_list_github_issues` - List synced issues
- [ ] `kanbu_list_github_prs` - List pull requests for project
- [ ] `kanbu_list_github_commits` - List commits linked to task

#### 9.2 GitHub Management Tools

- [ ] `kanbu_link_github_repo` - Link repository to project
- [ ] `kanbu_unlink_github_repo` - Unlink repository
- [ ] `kanbu_sync_github_issues` - Trigger issue sync
- [ ] `kanbu_create_github_branch` - Create feature branch for task
- [ ] `kanbu_link_pr_to_task` - Manually link PR to task

**Deliverables Fase 9:**
- [ ] 9 GitHub MCP tools
- [ ] Claude Code integration voor GitHub workflow

#### Fase 9 Completion Checklist
- [ ] **Code**: 9 MCP tools werkend en getest
- [ ] **ACL**: MCP tool permissions gedocumenteerd
- [ ] **MCP**: Tools toegevoegd aan `github.ts`, docs/MCP/ROADMAP.md bijgewerkt
- [ ] **Docs**: Tool specs gedocumenteerd
- [ ] **CLAUDE.md**: MCP GitHub tools gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 9 - MCP Tools`

---

### Fase 10: CI/CD Integratie 🚧 GEPLAND

**Doel:** GitHub Actions en CI/CD pipeline integratie.

**Status:** Gepland.

#### 10.1 GitHub Actions Status

- [ ] Workflow run status tracking per PR/commit
- [ ] Status badges op tasks met actieve workflows
- [ ] Re-run workflow button vanuit Kanbu
- [ ] Workflow failure notifications

#### 10.2 Build Status Tracking

**Backend procedures:**
- [ ] `github.getWorkflowRuns` - List workflow runs voor repo/PR
- [ ] `github.getWorkflowRunDetails` - Details van specifieke run
- [ ] `github.rerunWorkflow` - Re-run failed workflow
- [ ] `github.cancelWorkflow` - Cancel running workflow

**Database model:**
```prisma
model GitHubWorkflowRun {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  taskId          Int?      @map("task_id")
  pullRequestId   Int?      @map("pull_request_id")
  runId           BigInt    @map("run_id")
  workflowName    String    @db.VarChar(255) @map("workflow_name")
  status          String    @db.VarChar(50)   // 'queued' | 'in_progress' | 'completed'
  conclusion      String?   @db.VarChar(50)   // 'success' | 'failure' | 'cancelled' | 'skipped'
  headSha         String    @db.VarChar(40) @map("head_sha")
  headBranch      String    @db.VarChar(255) @map("head_branch")
  htmlUrl         String    @db.VarChar(512) @map("html_url")
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, runId])
  @@map("github_workflow_runs")
}
```

#### 10.3 Deploy Tracking

- [ ] Environment deployments tracking
- [ ] Deploy status op task (staging/production)
- [ ] Deploy history per environment
- [ ] Rollback trigger vanuit Kanbu

#### 10.4 Test Results Integration

- [ ] Test suite results parsing
- [ ] Failed test count op PR
- [ ] Test coverage tracking (optional)
- [ ] Test trend visualisatie

#### 10.5 Frontend: CI/CD Panel

**Bestand:** `apps/web/src/components/task/TaskCICDPanel.tsx`

- [ ] Workflow runs lijst per task/PR
- [ ] Status badges (success/fail/pending)
- [ ] Expand voor job details
- [ ] Re-run/cancel buttons
- [ ] Link naar GitHub Actions

**Deliverables Fase 10:**
- [ ] Workflow run tracking
- [ ] Build status integration
- [ ] Deploy tracking
- [ ] CI/CD panel in task detail

#### Fase 10 Completion Checklist
- [ ] **Code**: CI/CD panel werkend, workflow runs getracked
- [ ] **ACL**: N.v.t. (onderdeel van project R access)
- [ ] **MCP**: CI/CD query tools (4 tools) toegevoegd
- [ ] **Docs**: CI/CD integratie gedocumenteerd
- [ ] **CLAUDE.md**: TaskCICDPanel gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 10 - CI/CD Integratie`

---

### Fase 11: Geavanceerde Sync 🚧 GEPLAND

**Doel:** Uitgebreide synchronisatie van GitHub features.

**Status:** Gepland.

#### 11.1 Milestones Sync

- [ ] GitHub milestones ↔ Kanbu milestones (als feature bestaat)
- [ ] Milestone progress tracking
- [ ] Due date sync
- [ ] Auto-create milestone in GitHub

**Database model:**
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
  kanbuMilestoneId Int?     @map("kanbu_milestone_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, milestoneNumber])
  @@map("github_milestones")
}
```

#### 11.2 GitHub Releases Tracking

- [ ] Release tracking per repository
- [ ] Release notes sync
- [ ] Link releases aan sprints/milestones
- [ ] Release changelog generation

**Backend procedures:**
- [ ] `github.listReleases` - List releases voor repo
- [ ] `github.getReleaseDetails` - Release details
- [ ] `github.createRelease` - Create release vanuit Kanbu
- [ ] `github.generateReleaseNotes` - Generate notes from tasks

#### 11.3 GitHub Wiki Integration

- [ ] Wiki pagina's synchroniseren
- [ ] Link wiki pagina's aan tasks
- [ ] Wiki search vanuit Kanbu

#### 11.4 GitHub Projects (Beta) Sync

- [ ] GitHub Projects V2 integratie
- [ ] Project board ↔ Kanbu board sync
- [ ] Custom fields mapping
- [ ] View sync (optional)

**Deliverables Fase 11:**
- [ ] Milestone synchronisatie
- [ ] Releases tracking
- [ ] Wiki integratie
- [ ] GitHub Projects sync

#### Fase 11 Completion Checklist
- [ ] **Code**: Milestones/Releases sync werkend
- [ ] **ACL**: N.v.t. (uitbreiding sync features)
- [ ] **MCP**: Release tools (4 tools) toegevoegd
- [ ] **Docs**: Advanced sync gedocumenteerd
- [ ] **CLAUDE.md**: Milestone/Release sync gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 11 - Geavanceerde Sync`

---

### Fase 12: Code Review Integratie 🚧 GEPLAND

**Doel:** Diepe integratie met GitHub code review workflow.

**Status:** Gepland.

#### 12.1 Review Request Tracking

- [ ] Track wie moet reviewen
- [ ] Review request notifications in Kanbu
- [ ] "Needs Review" badge op tasks
- [ ] Auto-assign reviewer based on CODEOWNERS

**Backend procedures:**
- [ ] `github.requestReview` - Request review van user
- [ ] `github.listReviewRequests` - Pending review requests
- [ ] `github.getReviewers` - Suggested reviewers

#### 12.2 Review Comments Sync

- [ ] PR review comments tonen in task detail
- [ ] Comment threads met context
- [ ] Reply op review comments vanuit Kanbu
- [ ] Resolved/unresolved tracking

**Database model:**
```prisma
model GitHubReview {
  id              Int       @id @default(autoincrement())
  pullRequestId   Int       @map("pull_request_id")
  reviewId        BigInt    @map("review_id")
  authorLogin     String    @db.VarChar(255) @map("author_login")
  state           String    @db.VarChar(50)   // 'PENDING' | 'COMMENTED' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED'
  body            String?   @db.Text
  submittedAt     DateTime? @map("submitted_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  pullRequest     GitHubPullRequest @relation(fields: [pullRequestId], references: [id], onDelete: Cascade)
  comments        GitHubReviewComment[]

  @@unique([pullRequestId, reviewId])
  @@map("github_reviews")
}

model GitHubReviewComment {
  id              Int       @id @default(autoincrement())
  reviewId        Int       @map("review_id")
  commentId       BigInt    @map("comment_id")
  path            String    @db.VarChar(512)
  line            Int?
  body            String    @db.Text
  authorLogin     String    @db.VarChar(255) @map("author_login")
  createdAt       DateTime  @default(now()) @map("created_at")

  review          GitHubReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@map("github_review_comments")
}
```

#### 12.3 Approval Workflow

- [ ] Track approval status
- [ ] Required approvals indicator
- [ ] Approval history
- [ ] Auto-move task on all approvals

#### 12.4 CODEOWNERS Integration

- [ ] Parse CODEOWNERS file
- [ ] Suggest reviewers based on changed files
- [ ] Show code ownership in file list

#### 12.5 Frontend: Code Review Panel

**Bestand:** `apps/web/src/components/task/TaskReviewPanel.tsx`

- [ ] Review status overview
- [ ] Reviewer list met status
- [ ] Comment threads (collapsed)
- [ ] Request review button
- [ ] Approve/Request changes actions (if authorized)

**Deliverables Fase 12:**
- [ ] Review request tracking
- [ ] Review comments sync
- [ ] Approval workflow
- [ ] CODEOWNERS integratie

#### Fase 12 Completion Checklist
- [ ] **Code**: Review panel werkend, CODEOWNERS parsing actief
- [ ] **ACL**: N.v.t. (onderdeel van project R access)
- [ ] **MCP**: Review tools (3 tools) toegevoegd
- [ ] **Docs**: Code review integratie gedocumenteerd
- [ ] **CLAUDE.md**: TaskReviewPanel gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 12 - Code Review Integratie`

---

### Fase 13: Analytics & Insights 🚧 GEPLAND

**Doel:** Developer en project metrics vanuit GitHub data.

**Status:** Gepland.

#### 13.1 Cycle Time Analytics

- [ ] Time from issue open → PR merged
- [ ] Time in each column/status
- [ ] Bottleneck identificatie
- [ ] Trend over tijd

**Backend procedures:**
- [ ] `github.getCycleTimeStats` - Cycle time metrics
- [ ] `github.getLeadTimeStats` - Lead time metrics
- [ ] `github.getThroughputStats` - Throughput per periode

#### 13.2 Code Review Analytics

- [ ] Average review time
- [ ] Reviews per developer
- [ ] Review thoroughness (comments per PR)
- [ ] Time to first review

#### 13.3 Contributor Statistics

- [ ] Commits per contributor
- [ ] Lines added/removed
- [ ] PRs opened/merged
- [ ] Issues resolved
- [ ] Code review participation

**Database model:**
```prisma
model GitHubContributorStats {
  id              Int       @id @default(autoincrement())
  repositoryId    Int       @map("repository_id")
  githubLogin     String    @db.VarChar(255) @map("github_login")
  period          String    @db.VarChar(20)   // 'week' | 'month' | 'quarter'
  periodStart     DateTime  @map("period_start")
  commits         Int       @default(0)
  linesAdded      Int       @default(0) @map("lines_added")
  linesRemoved    Int       @default(0) @map("lines_removed")
  prsOpened       Int       @default(0) @map("prs_opened")
  prsMerged       Int       @default(0) @map("prs_merged")
  reviewsGiven    Int       @default(0) @map("reviews_given")
  issuesClosed    Int       @default(0) @map("issues_closed")
  createdAt       DateTime  @default(now()) @map("created_at")

  repository      GitHubRepository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)

  @@unique([repositoryId, githubLogin, period, periodStart])
  @@map("github_contributor_stats")
}
```

#### 13.4 Burndown & Velocity Charts

- [ ] Sprint burndown met GitHub data
- [ ] Velocity tracking (issues/PRs per sprint)
- [ ] Predictive completion dates
- [ ] Compare planned vs actual

#### 13.5 Frontend: Analytics Dashboard

**Bestand:** `apps/web/src/pages/project/GitHubAnalyticsPage.tsx`

- [ ] Cycle time chart
- [ ] Contributor leaderboard
- [ ] Review time metrics
- [ ] Burndown/velocity charts
- [ ] Export to CSV/PDF

**Deliverables Fase 13:**
- [ ] Cycle time analytics
- [ ] Code review metrics
- [ ] Contributor statistics
- [ ] Burndown/velocity charts

#### Fase 13 Completion Checklist
- [ ] **Code**: Analytics dashboard werkend, charts renderen correct
- [ ] **ACL**: `github-analytics` project feature geregistreerd
- [ ] **MCP**: Analytics tools (3 tools) toegevoegd
- [ ] **Docs**: Analytics metrics gedocumenteerd
- [ ] **CLAUDE.md**: GitHubAnalyticsPage gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 13 - Analytics & Insights`

---

### Fase 14: Developer Experience 🚧 GEPLAND

**Doel:** Tools en integraties voor developers.

**Status:** Gepland.

#### 14.1 VS Code Extension

- [ ] Task list sidebar
- [ ] Quick task creation
- [ ] Branch creation voor task
- [ ] Task reference auto-complete in commits
- [ ] PR creation met task link

**Extension features:**
- View assigned tasks
- Start working on task (create branch)
- See task details in hover
- Insert task reference in commit message
- View GitHub PR status

#### 14.2 CLI Tool

- [ ] `kanbu task list` - List tasks
- [ ] `kanbu task start <id>` - Create branch and assign
- [ ] `kanbu task done <id>` - Move to done
- [ ] `kanbu pr create` - Create PR with task link
- [ ] `kanbu pr status` - PR status for current branch

**Package:** `packages/cli/`

```bash
# Installation
npm install -g @kanbu/cli

# Usage
kanbu login
kanbu task list --project my-project
kanbu task start PROJ-123
kanbu pr create --title "feat: Add feature"
```

#### 14.3 Git Hooks Integration

- [ ] Pre-commit hook: Validate task reference in message
- [ ] Commit-msg hook: Auto-add task reference
- [ ] Pre-push hook: Check PR exists
- [ ] Post-checkout hook: Update task status

**Bestand:** `packages/git-hooks/`

```bash
# Install hooks
kanbu hooks install

# Hook config in .kanburc
{
  "hooks": {
    "commit-msg": {
      "requireTaskRef": true,
      "pattern": "PROJ-\\d+"
    }
  }
}
```

#### 14.4 GitHub Bot

- [ ] Auto-comment op PRs met task info
- [ ] Checklist in PR description
- [ ] Auto-label based on task tags
- [ ] Reminder comments voor stale PRs
- [ ] Welcome message voor nieuwe contributors

**Bot commands:**
```
/kanbu link PROJ-123      - Link PR to task
/kanbu unlink             - Unlink PR from task
/kanbu status             - Show task status
/kanbu assign @user       - Assign task to user
```

**Deliverables Fase 14:**
- [ ] VS Code extension
- [ ] CLI tool
- [ ] Git hooks package
- [ ] GitHub bot

#### Fase 14 Completion Checklist
- [ ] **Code**: CLI werkend, VS Code extension gepubliceerd, bot actief
- [ ] **ACL**: N.v.t. (externe tools)
- [ ] **MCP**: N.v.t. (CLI/extension zijn standalone)
- [ ] **Docs**: CLI, extension, hooks gedocumenteerd
- [ ] **CLAUDE.md**: Developer tools overzicht
- [ ] **Commit**: `feat(github): Fase 14 - Developer Experience`

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
- [ ] **ACL**: N.v.t. (uitbreiding bestaande project linking)
- [ ] **MCP**: Multi-repo tools (indien nodig) toegevoegd
- [ ] **Docs**: Multi-repo configuratie gedocumenteerd
- [ ] **CLAUDE.md**: Multi-repo patterns gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 15 - Multi-Repo Support`

---

### Fase 16: AI/Claude Integratie 🚧 GEPLAND

**Doel:** AI-powered features voor GitHub workflow.

**Status:** Gepland.

#### 16.1 PR Summary Generation

- [ ] Auto-generate PR description from commits
- [ ] Summarize changes for reviewers
- [ ] Highlight breaking changes
- [ ] Suggest affected areas

**MCP tools:**
- [ ] `kanbu_generate_pr_summary` - Generate PR summary
- [ ] `kanbu_summarize_diff` - Summarize code changes

#### 16.2 Code Review Assistance

- [ ] AI-powered code review suggestions
- [ ] Security vulnerability detection
- [ ] Performance issue detection
- [ ] Code style recommendations
- [ ] Complexity warnings

**Backend service:**
```typescript
// apps/api/src/services/github/aiReviewService.ts
class AIReviewService {
  async reviewPullRequest(prId: number): Promise<ReviewSuggestions>
  async analyzeCodeChanges(diff: string): Promise<ChangeAnalysis>
  async detectSecurityIssues(files: FileChange[]): Promise<SecurityIssue[]>
}
```

#### 16.3 Release Notes Generation

- [ ] Generate release notes from merged PRs
- [ ] Categorize changes (features, fixes, etc.)
- [ ] Highlight breaking changes
- [ ] Credit contributors

**MCP tools:**
- [ ] `kanbu_generate_release_notes` - Generate release notes
- [ ] `kanbu_categorize_changes` - Categorize PR changes

#### 16.4 Bug Triage Assistance

- [ ] Auto-categorize new issues
- [ ] Suggest priority based on content
- [ ] Find related issues/PRs
- [ ] Suggest assignees based on expertise

#### 16.5 Smart Task Creation

- [ ] Create tasks from PR review comments
- [ ] Extract TODOs from code comments
- [ ] Suggest task breakdown from large issues
- [ ] Auto-link related tasks

**Deliverables Fase 16:**
- [ ] PR summary generation
- [ ] AI code review assistance
- [ ] Release notes generation
- [ ] Bug triage automation

#### Fase 16 Completion Checklist
- [ ] **Code**: AI services werkend, MCP tools geïntegreerd
- [ ] **ACL**: `github-ai-features` project feature geregistreerd (indien restricted)
- [ ] **MCP**: AI tools (4+ tools) toegevoegd aan `github.ts`
- [ ] **Docs**: AI features en prompts gedocumenteerd
- [ ] **CLAUDE.md**: AI integratie patterns gedocumenteerd
- [ ] **Commit**: `feat(github): Fase 16 - AI/Claude Integratie`

---

## Tool Overzicht

| Fase | Tools/Features | Niveau | Status |
|------|----------------|--------|--------|
| Fase 1 | Database schema (7 models incl. UserMapping) | - | 🚧 Gepland |
| Fase 2 | OAuth + Installation + User Mapping (14 procedures) | Admin/Workspace | 🚧 Gepland |
| Fase 3 | Repository linking + Settings UI (7 procedures) | Project | 🚧 Gepland |
| Fase 4 | Webhook handler (9 event types) | System | 🚧 Gepland |
| Fase 5 | Issue sync GitHub→Kanbu | Project | 🚧 Gepland |
| Fase 6 | Issue sync Kanbu→GitHub | Project | 🚧 Gepland |
| Fase 7 | PR & Commit tracking | Project | 🚧 Gepland |
| Fase 8 | Automation rules | Project | 🚧 Gepland |
| Fase 9 | MCP tools (9 tools) | MCP | 🚧 Gepland |
| Fase 10 | CI/CD Integratie (Actions, Deploy, Tests) | Project | 🚧 Gepland |
| Fase 11 | Geavanceerde Sync (Milestones, Releases, Wiki) | Project | 🚧 Gepland |
| Fase 12 | Code Review Integratie (Reviews, CODEOWNERS) | Project | 🚧 Gepland |
| Fase 13 | Analytics & Insights (Cycle Time, Stats) | Project | 🚧 Gepland |
| Fase 14 | Developer Experience (VSCode, CLI, Bot) | Tools | 🚧 Gepland |
| Fase 15 | Multi-Repo Support (Monorepo, Cross-repo) | Project | 🚧 Gepland |
| Fase 16 | AI/Claude Integratie (PR Summary, Review AI) | MCP/AI | 🚧 Gepland |

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

#### Developer Experience (Fase 14)
| Bestand | Wijziging |
|---------|-----------|
| `packages/cli/` | **Nieuw** - CLI tool package |
| `packages/git-hooks/` | **Nieuw** - Git hooks package |
| `packages/vscode-extension/` | **Nieuw** - VS Code extension |
| `apps/api/src/routes/bot/github.ts` | **Nieuw** - GitHub bot webhook handler |

#### Multi-Repo (Fase 15)
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/monorepoService.ts` | **Nieuw** - Monorepo support |
| `apps/api/src/services/github/multiRepoService.ts` | **Nieuw** - Multi-repo linking |

#### AI/Claude Integration (Fase 16)
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/services/github/aiReviewService.ts` | **Nieuw** - AI code review |
| `apps/api/src/services/github/aiSummaryService.ts` | **Nieuw** - PR/Release summaries |
| `packages/mcp-server/src/tools/githubAI.ts` | **Nieuw** - AI MCP tools |

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

### Fase 1
- [ ] Database migration succesvol
- [ ] Types correct gegenereerd
- [ ] Relations werken correct

### Fase 2
- [ ] GitHub App installeerbaar
- [ ] OAuth callback werkt
- [ ] Token refresh automatisch

### Fase 3
- [ ] Repository linken werkt
- [ ] Settings opslaan werkt
- [ ] Settings UI responsive

### Fase 4
- [ ] Webhook ontvangt events
- [ ] Signature verificatie werkt
- [ ] Events correct gerouted

### Fase 5-6
- [ ] Issues correct geïmporteerd
- [ ] Bidirectionele sync werkt
- [ ] Geen duplicate creates

### Fase 7-8
- [ ] PRs correct gelinkt
- [ ] Commits getracked
- [ ] Automations triggeren correct

### Fase 9
- [ ] MCP tools typecheck
- [ ] MCP tools functioneel

### Fase 10 (CI/CD)
- [ ] Workflow runs correct getracked
- [ ] Build status badges tonen
- [ ] Re-run workflow werkt
- [ ] Deploy history zichtbaar

### Fase 11 (Geavanceerde Sync)
- [ ] Milestones sync werkt
- [ ] Releases worden getracked
- [ ] Wiki integratie functioneel

### Fase 12 (Code Review)
- [ ] Review requests zichtbaar
- [ ] Review comments sync
- [ ] Approval status correct
- [ ] CODEOWNERS parsing werkt

### Fase 13 (Analytics)
- [ ] Cycle time correct berekend
- [ ] Contributor stats accuraat
- [ ] Charts renderen correct
- [ ] Export werkt

### Fase 14 (Developer Experience)
- [ ] VS Code extension installeert
- [ ] CLI tool werkt
- [ ] Git hooks installeren correct
- [ ] GitHub bot reageert op commands

### Fase 15 (Multi-Repo)
- [ ] Monorepo path filtering werkt
- [ ] Multiple repos per project mogelijk
- [ ] Cross-repo view werkt

### Fase 16 (AI/Claude)
- [ ] PR summary generation werkt
- [ ] AI code review suggestions correct
- [ ] Release notes generation accuraat
- [ ] Bug triage suggestions relevant

---

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-09 | Fase Completion Protocol toegevoegd met per-fase completion checklists |
| 2026-01-09 | Fase 10-16 toegevoegd: CI/CD, Geavanceerde Sync, Code Review, Analytics, DX, Multi-Repo, AI |
| 2026-01-09 | Prioriteit Matrix uitgebreid met Extended features (P3-P5) |
| 2026-01-09 | Database models toegevoegd voor Workflow Runs, Reviews, Contributor Stats |
| 2026-01-09 | Twee-tier architectuur toegevoegd (Admin + Project niveau) |
| 2026-01-09 | GitHubUserMapping model toegevoegd (workspace niveau) |
| 2026-01-09 | Bestanden lijst gesplitst in Admin en Project niveau |
| 2026-01-09 | ACL sectie uitgebreid met workspace permissions |
| 2026-01-09 | Initiële roadmap aangemaakt |
