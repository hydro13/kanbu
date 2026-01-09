# Kanbu GitHub Connector - Roadmap

## Overzicht

Dit document beschrijft de implementatie roadmap voor de Kanbu GitHub Connector.
De connector maakt bidirectionele synchronisatie mogelijk tussen Kanbu projecten en GitHub repositories.

## Doelstellingen

1. **Repository Koppeling** - Projecten koppelen aan GitHub repositories
2. **Issue Sync** - Bidirectionele synchronisatie van issues/tasks
3. **PR Tracking** - Pull requests koppelen aan taken
4. **Commit Linking** - Commits automatisch linken aan taken via references
5. **Branch Management** - Feature branches voor taken
6. **Automatisering** - Task status updates op basis van GitHub events

---

## Implementatie Fasen

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
```

#### 1.2 Task Model Uitbreiding

- [ ] Add relations to Task model for GitHubIssue, GitHubPullRequest, GitHubCommit
- [ ] Add `githubBranch` field for feature branch tracking

#### 1.3 Project Model Uitbreiding

- [ ] Add relation to GitHubRepository

**Deliverables Fase 1:**
- [ ] Database schema extensies
- [ ] Migration scripts
- [ ] Type definitions

---

### Fase 2: GitHub App & OAuth 🚧 GEPLAND

**Doel:** GitHub App installatie en OAuth flow.

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

#### 2.2 Backend: Installation Flow

**Bestand:** `apps/api/src/trpc/procedures/github.ts`

- [ ] `github.getInstallationUrl` - Generate GitHub App installation URL
- [ ] `github.handleCallback` - Handle OAuth callback from GitHub
- [ ] `github.getInstallations` - List user's GitHub installations
- [ ] `github.getRepositories` - List repositories for installation
- [ ] `github.refreshToken` - Refresh installation access token

#### 2.3 Frontend: Installation UI

**Bestand:** `apps/web/src/pages/GitHubSettings.tsx`

- [ ] "Connect to GitHub" button
- [ ] Installation status display
- [ ] Repository selection dropdown
- [ ] Disconnect button

**Deliverables Fase 2:**
- [ ] GitHub App configuratie
- [ ] OAuth flow (install → callback → token storage)
- [ ] Installation management UI

---

### Fase 3: Repository Linking 🚧 GEPLAND

**Doel:** Projecten koppelen aan GitHub repositories.

**Status:** Gepland.

#### 3.1 Backend: Repository Management

- [ ] `github.linkRepository` - Link repository to project
- [ ] `github.unlinkRepository` - Unlink repository from project
- [ ] `github.getLinkedRepository` - Get linked repository for project
- [ ] `github.updateSyncSettings` - Update sync configuration

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

#### 3.3 Frontend: GitHub Settings Page

**Bestand:** `apps/web/src/pages/GitHubSettings.tsx`

- [ ] Repository selector (from available repos)
- [ ] Sync settings form:
  - Issue sync toggle + direction
  - PR tracking toggle + options
  - Commit tracking toggle
  - Automation settings
- [ ] Label/column mapping UI
- [ ] Test connection button
- [ ] Sync status indicator

#### 3.4 Sidebar Menu Item

**Bestand:** `apps/web/src/components/layout/ProjectSidebar.tsx`

- [ ] Add GitHubIcon component
- [ ] Add "GitHub" menu item under MANAGE section
- [ ] Add 'github' feature slug for ACL

**Deliverables Fase 3:**
- [ ] Repository linking API
- [ ] Sync settings configuration
- [ ] GitHub settings page
- [ ] Sidebar navigation

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

#### 5.3 User Mapping

- [ ] GitHub login → Kanbu user mapping table
- [ ] Auto-suggest based on email
- [ ] Manual mapping UI

**Deliverables Fase 5:**
- [ ] Issue import functionality
- [ ] Real-time issue sync
- [ ] User mapping

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

---

## Tool Overzicht

| Fase | Tools/Features | Status |
|------|----------------|--------|
| Fase 1 | Database schema (6 models) | 🚧 Gepland |
| Fase 2 | OAuth + Installation (5 procedures) | 🚧 Gepland |
| Fase 3 | Repository linking + Settings UI | 🚧 Gepland |
| Fase 4 | Webhook handler (9 event types) | 🚧 Gepland |
| Fase 5 | Issue sync GitHub→Kanbu | 🚧 Gepland |
| Fase 6 | Issue sync Kanbu→GitHub | 🚧 Gepland |
| Fase 7 | PR & Commit tracking | 🚧 Gepland |
| Fase 8 | Automation rules | 🚧 Gepland |
| Fase 9 | MCP tools (9 tools) | 🚧 Gepland |

---

## Prioriteit Matrix

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

---

## Te Wijzigen/Maken Bestanden

### Database & Types
| Bestand | Wijziging |
|---------|-----------|
| `packages/shared/prisma/schema.prisma` | 6 nieuwe models |
| `packages/shared/src/types/github.ts` | **Nieuw** - TypeScript types |

### Backend API
| Bestand | Wijziging |
|---------|-----------|
| `apps/api/src/trpc/procedures/github.ts` | **Nieuw** - tRPC procedures |
| `apps/api/src/routes/webhooks/github.ts` | **Nieuw** - Webhook handler |
| `apps/api/src/services/github/` | **Nieuw** - GitHub service classes |
| `apps/api/src/lib/github.ts` | **Nieuw** - GitHub API client |

### Frontend
| Bestand | Wijziging |
|---------|-----------|
| `apps/web/src/pages/GitHubSettings.tsx` | **Nieuw** - Main settings page |
| `apps/web/src/components/github/` | **Nieuw** - GitHub components directory |
| `apps/web/src/components/task/TaskGitHubPanel.tsx` | **Nieuw** - Task GitHub info panel |
| `apps/web/src/components/layout/ProjectSidebar.tsx` | Add GitHub menu item + GitHubIcon |
| `apps/web/src/hooks/useProjectFeatureAccess.ts` | Add 'github' feature slug |
| `apps/web/src/router.tsx` | Nieuwe route `/workspace/:slug/project/:id/github` |

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

---

## ACL Integratie

### Nieuwe Permissions

De GitHub connector introduceert nieuwe ACL permissions op project niveau:

| Permission | Bitmask | Beschrijving |
|------------|---------|--------------|
| `github:read` | Via project R | Synced issues, PRs, commits bekijken |
| `github:configure` | Via project P | Repository koppelen, settings wijzigen |
| `github:sync` | Via project W | Manual sync triggeren |

### Feature Access Control

**Bestand:** `apps/api/src/permissions/definitions/index.ts`

```typescript
// Add to PROJECT_FEATURES
{
  slug: 'github',
  name: 'GitHub',
  permissions: ['R', 'W', 'P'],  // R=view, W=sync, P=configure
  default: 'MANAGER',
}
```

### ACL Checks per Actie

| Actie | Required Permission |
|-------|---------------------|
| View GitHub panel | Project R |
| View synced issues/PRs | Project R |
| Trigger manual sync | Project W |
| Link/unlink repository | Project P |
| Configure sync settings | Project P |
| Create feature branch | Project W + GitHub W |

### Audit Logging

Alle GitHub acties worden gelogd in het audit systeem:

```typescript
// Nieuwe audit actions
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

---

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-09 | Initiële roadmap aangemaakt |
