# Kanbu GitHub Connector - Roadmap

## Overview

This document describes the implementation roadmap for the Kanbu GitHub Connector.
The connector enables bidirectional synchronization between Kanbu projects and GitHub repositories.

## Two-Tier Architecture

The GitHub connector uses a **two-tier architecture** to separate configuration and management:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN LEVEL (Workspace)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │   Installations │  │  User Mapping   │  │  Repos Overview │     │
│  │   Management    │  │  GitHub ↔ Kanbu │  │  (all repos)    │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  Who: Workspace Admins                                              │
│  Where: Admin → GitHub Settings                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROJECT LEVEL                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Repo Linking   │  │  Sync Settings  │  │   Sync Status   │     │
│  │  (1 repo/proj)  │  │  Labels/Columns │  │   & Logs        │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  Who: Project Managers                                              │
│  Where: Project Settings → GitHub                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Two Levels?

| Aspect                      | Admin Level                       | Project Level                  |
| --------------------------- | --------------------------------- | ------------------------------ |
| **GitHub App Installation** | Install once per org/user         | Select repo from installation  |
| **User Mapping**            | Centrally manage for all projects | Automatically used during sync |
| **Overview**                | All linked repos in workspace     | Only own project repo          |
| **Permissions**             | Workspace P permission            | Project P permission           |

## Objectives

1. **Repository Linking** - Link projects to GitHub repositories
2. **Issue Sync** - Bidirectional synchronization of issues/tasks
3. **PR Tracking** - Link pull requests to tasks
4. **Commit Linking** - Automatically link commits to tasks via references
5. **Branch Management** - Feature branches for tasks
6. **Automation** - Task status updates based on GitHub events
7. **User Mapping** - Link GitHub logins to Kanbu users (workspace-level)

---

## Implementation Phases

---

## Phase Completion Protocol

> **MANDATORY:** For each completed phase, the following checklist MUST be completed before marking the phase as "COMPLETE".

### 1. Code Implementation

- [ ] All planned features implemented
- [ ] TypeScript types created/updated
- [ ] Database schema (if applicable) synchronized

### 2. Tests ⚠️ MANDATORY

- [ ] **Unit tests** for pure logic functions
- [ ] **Type tests** for new TypeScript types/interfaces
- [ ] **Validation tests** for input validation and constraints
- [ ] **Integration tests** for API endpoints (if applicable)
- [ ] All tests passing (`pnpm test:run`)

**Test locations:**
| Package | Location | Description |
|---------|----------|-------------|
| `@kanbu/shared` | `src/__tests__/*.test.ts` | Type exports, const arrays, interfaces |
| `@kanbu/api` | `src/lib/__tests__/*.test.ts` | Logic, validation, helpers |
| `@kanbu/api` | `src/services/__tests__/*.test.ts` | Service integration tests |

### 3. Documentation Updates

- [ ] `docs/Github-connector/ROADMAP.md` - Phase status → ✅ COMPLETE
- [ ] `docs/Github-connector/ARCHITECTURE.md` - Update technical details if needed
- [ ] `docs/Github-connector/README.md` - Update quick reference

### 4. ACL Integration (if UI features)

- [ ] Register new features in `packages/shared/prisma/seed-features.ts`
- [ ] Document permission requirements in `docs/ACL/ROADMAP.md`
- [ ] Implement Feature Access Control hooks (`useProjectFeatureAccess`, etc.)
- [ ] Add sidebar menu items with ACL checks

### 5. MCP Tools (if applicable)

- [ ] Add new tools to `packages/mcp-server/src/tools/github.ts`
- [ ] Document tools in `docs/MCP/ROADMAP.md`
- [ ] Update Tool Overview table in `docs/MCP/README.md`
- [ ] Update TypeScript types

### 6. Project Documentation

- [ ] `v6/dev/kanbu/CLAUDE.md` - Update development instructions
- [ ] `v6/dev/kanbu/README.md` - Update feature list
- [ ] Document any new directories/patterns

### 7. Git Commit

- [ ] Commit: `feat(github): Phase X - [description]`
- [ ] Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
- [ ] Push to kanbu repo, then genx submodule update

### 8. Verification

- [ ] `pnpm typecheck` passing
- [ ] `pnpm test:run` passing (all packages)
- [ ] Functionality manually tested
- [ ] Documentation consistent and up-to-date
- [ ] Cold-start test: new Claude session can use features

---

### Phase 1: Database & Infrastructure ✅ COMPLETE

**Goal:** Database models and basic infrastructure for GitHub integration.

**Status:** Complete (2026-01-09).

#### 1.1 Prisma Schema Extension

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
// Managed at admin level, used by all projects in the workspace
model GitHubUserMapping {
  id              Int       @id @default(autoincrement())
  workspaceId     Int       @map("workspace_id")
  userId          Int       @map("user_id")
  githubLogin     String    @db.VarChar(255) @map("github_login")
  githubId        BigInt?   @map("github_id")     // GitHub user ID (optional, for verification)
  githubEmail     String?   @db.VarChar(255) @map("github_email")
  githubAvatarUrl String?   @db.VarChar(512) @map("github_avatar_url")
  autoMatched     Boolean   @default(false) @map("auto_matched")  // True if automatically matched by email
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, githubLogin])  // 1 mapping per GitHub login per workspace
  @@unique([workspaceId, userId])        // 1 mapping per Kanbu user per workspace
  @@map("github_user_mappings")
}
```

#### 1.2 Task Model Extension

- [x] Add relations to Task model for GitHubIssue, GitHubPullRequest, GitHubCommit
- [x] Add `githubBranch` field for feature branch tracking

#### 1.3 Project Model Extension

- [x] Add relation to GitHubRepository

#### 1.4 Tests

- [x] TypeScript type tests (45 tests in `packages/shared/src/__tests__/github.test.ts`)
- [x] API/database logic tests (69 tests in `apps/api/src/lib/__tests__/github.test.ts`)

**Deliverables Phase 1:**

- [x] Database schema extensions (7 models incl. GitHubUserMapping)
- [x] Database synced via `prisma db push`
- [x] Type definitions (`packages/shared/src/types/github.ts`)
- [x] Workspace and User model relations
- [x] Test suite (114 tests)

#### Phase 1 Completion Checklist

- [x] **Code**: Database schema implemented, database synced
- [x] **Tests**: 114 tests written and passing
- [x] **ACL**: N/A (no new UI features)
- [x] **MCP**: N/A (no new tools)
- [x] **Docs**: ROADMAP updated with final status
- [x] **CLAUDE.md**: GitHub database patterns documented
- [x] **Commit**: `feat(github): Phase 1 - Database & Infrastructure`

---

### Phase 2: GitHub App & OAuth ✅ COMPLETE

**Goal:** GitHub App installation and OAuth flow at **Admin (Workspace) level**.

**Status:** Complete (2026-01-09).

#### 2.1 GitHub App Setup

- [x] GitHub App configuration in `.env` (APP_ID, CLIENT_ID, CLIENT_SECRET, PRIVATE_KEY)
- [x] Configure app permissions:
  - `issues: read/write`
  - `pull_requests: read`
  - `contents: read`
  - `metadata: read`
- [x] Select webhook events:
  - `issues`
  - `pull_request`
  - `push`

#### 2.2 Backend: Admin-Level Procedures

**File:** `apps/api/src/trpc/procedures/githubAdmin.ts`

Installation management (Workspace level):

- [x] `githubAdmin.isConfigured` - Check if GitHub App is configured
- [x] `githubAdmin.getInstallationUrl` - Generate GitHub App installation URL
- [x] `githubAdmin.handleCallback` - Handle OAuth callback from GitHub
- [x] `githubAdmin.listInstallations` - List workspace's GitHub installations
- [x] `githubAdmin.listRepositories` - List repositories for installation
- [x] `githubAdmin.removeInstallation` - Remove installation from workspace
- [x] `githubAdmin.refreshToken` - Refresh installation access token

User mapping (Workspace level):

- [x] `githubAdmin.listUserMappings` - List user mappings in workspace
- [x] `githubAdmin.createUserMapping` - Link GitHub login to Kanbu user
- [x] `githubAdmin.updateUserMapping` - Modify mapping
- [x] `githubAdmin.deleteUserMapping` - Delete mapping
- [x] `githubAdmin.autoMatchUsers` - Auto-match based on email
- [x] `githubAdmin.suggestMappings` - Suggestions for unmapped GitHub users

Overview (Workspace level):

- [x] `githubAdmin.getWorkspaceOverview` - Stats of all GitHub repos in workspace
- [x] `githubAdmin.listLinkedRepositories` - All linked repos in workspace

#### 2.3 Frontend: Admin GitHub Settings Page

**File:** `apps/web/src/pages/admin/GitHubAdminPage.tsx`

Tabs:

1. **Installations** - Manage GitHub App installations
   - [x] "Connect to GitHub" button
   - [x] Installation list with status
   - [x] Available repositories per installation
   - [x] Disconnect button

2. **User Mapping** - Link GitHub users to Kanbu users
   - [x] Mapping table (GitHub login ↔ Kanbu user)
   - [x] "Auto Match" button (match by email)
   - [x] Manual mapping dropdown
   - [x] Unmapped users indicator

3. **Overview** - Overview of all linked repos
   - [x] List of projects with GitHub linking
   - [x] Sync status per project
   - [x] Quick link to project settings

#### 2.4 Admin Sidebar Menu Item

**File:** `apps/web/src/pages/admin/AdminSidebar.tsx`

- [x] Add "GitHub" menu item under INTEGRATIONS section
- [x] GitHubIcon component

**Deliverables Phase 2:**

- [x] GitHub App configuration
- [x] OAuth flow (install → callback → token storage)
- [x] Admin-level installation management
- [x] User mapping UI and API
- [x] Workspace overview dashboard

#### Phase 2 Completion Checklist

- [x] **Code**: OAuth flow working, installations manageable
- [x] **Tests**: OAuth callback tests, installation CRUD tests, user mapping tests (19 tests in `githubAdmin.test.ts`)
- [x] **ACL**: `github-admin` feature registered, Workspace R/P permissions
- [x] **MCP**: Audit logging for installation/mapping actions (`GITHUB_INSTALLATION_*`, `GITHUB_USER_MAPPING_*`). Admin MCP tools to consider for Phase 9+
- [x] **Docs**: OAuth flow documented in ARCHITECTURE
- [x] **CLAUDE.md**: Admin GitHub Settings page documented
- [x] **Commit**: `feat(github): Phase 2 - GitHub App & OAuth`

---

### Phase 3: Repository Linking ✅ COMPLETE

**Goal:** Link projects to GitHub repositories at **Project level**.

**Status:** Complete (2026-01-09).

#### 3.1 Backend: Project-Level Procedures

**File:** `apps/api/src/trpc/procedures/github.ts`

Repository management (Project level):

- [x] `github.linkRepository` - Link repository to project (select from workspace installations)
- [x] `github.unlinkRepository` - Unlink repository from project
- [x] `github.getLinkedRepository` - Get linked repository for project
- [x] `github.updateSyncSettings` - Update sync configuration
- [x] `github.listAvailableRepositories` - List available repos from workspace installations

Sync operations (Project level):

- [x] `github.triggerSync` - Trigger manual sync
- [x] `github.getSyncStatus` - Current sync status
- [x] `github.getSyncLogs` - Sync history

#### 3.2 Sync Settings Schema

```typescript
interface SyncSettings {
  // Issue Sync
  issueSync: {
    enabled: boolean;
    direction: 'kanbu_to_github' | 'github_to_kanbu' | 'bidirectional';
    createIssuesFromTasks: boolean;
    createTasksFromIssues: boolean;
    labelMapping: Record<string, string>; // Kanbu tag → GitHub label
    columnMapping: Record<string, string>; // Kanbu column → GitHub label
  };

  // PR Tracking
  pullRequests: {
    enabled: boolean;
    autoLinkByBranch: boolean; // Link PRs by branch name pattern
    autoLinkByMention: boolean; // Link PRs by task reference in title/body
    taskReferencePattern: string; // e.g., "PROJ-123" or "#123"
  };

  // Commit Tracking
  commits: {
    enabled: boolean;
    linkByMessage: boolean; // Parse commit messages for task refs
    taskReferencePattern: string;
  };

  // Automation
  automation: {
    closeTaskOnPRMerge: boolean;
    moveTaskOnPROpen: string | null; // Column ID to move to
    moveTaskOnPRMerge: string | null; // Column ID to move to
    createBranchForTask: boolean;
    branchNamePattern: string; // e.g., "feature/{reference}-{slug}"
  };
}
```

#### 3.3 Frontend: Project GitHub Settings Page

**File:** `apps/web/src/pages/project/GitHubProjectSettings.tsx`

- [x] Repository tab with linked repository info
- [x] Link to Admin page for new installations
- [x] Sync settings tab:
  - [x] Sync enabled toggle
  - [x] Issue sync settings (placeholder for full UI in Phase 5-6)
  - [x] PR tracking settings (placeholder for Phase 7)
  - [x] Commit tracking settings (placeholder for Phase 7)
- [ ] Full label/column mapping UI (Phase 5-6)
- [x] Sync status indicator with counts
- [x] Sync logs tab with history

#### 3.4 Project Sidebar Menu Item

**File:** `apps/web/src/components/layout/ProjectSidebar.tsx`

- [x] Add GitHubIcon component
- [x] Add "GitHub" menu item under new "Integrations" section
- [x] Add 'github' feature slug for ACL
- [ ] Show badge if repo not linked (future enhancement)

**Deliverables Phase 3:**

- [x] Repository linking API (7 procedures)
- [x] Sync settings configuration (Zod schema + DB storage)
- [x] Project GitHub settings page (3 tabs)
- [x] Sidebar navigation with ACL

#### Phase 3 Completion Checklist

- [x] **Code**: Repo linking working, settings UI complete
- [x] **Tests**: Repository linking tests (21 tests in `githubProject.test.ts`), sync settings validation, ACL permission tests
- [x] **ACL**: `github` project feature registered in `seed-features.ts`, hook updated in `useProjectFeatureAccess.ts`
- [x] **MCP**: Audit logging for repo linking (`GITHUB_REPO_LINKED`, `GITHUB_SETTINGS_UPDATED`, `GITHUB_SYNC_TRIGGERED`). MCP tools coming in Phase 9
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: Project GitHub Settings documented
- [x] **Commit**: `feat(github): Phase 3 - Repository Linking`

---

### Phase 4: Webhook Handler ✅ COMPLETE

**Goal:** Process GitHub webhook events.

**Status:** Complete (2026-01-09).

#### 4.1 Webhook Endpoint

**File:** `apps/api/src/routes/webhooks/github.ts`

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

**Deliverables Phase 4:**

- [x] Webhook endpoint at `/api/webhooks/github`
- [x] Event handlers for issues, PRs, commits, installations
- [x] Security measures (signature verification, idempotency)
- [x] Sync logging for all webhook operations

#### Phase 4 Completion Checklist

- [x] **Code**: Webhook endpoint working, events correctly routed
- [x] **Tests**: 28 tests (signature verification, issue events, PR events, commit events, sync logging, installation events)
- [x] **ACL**: N/A (backend only)
- [x] **MCP**: Sync operations logged in GitHubSyncLog with action prefix (`issue_`, `pr_`, `commits_received`)
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: Webhook endpoint documented (in .gitignore, local only)
- [x] **Commit**: `feat(github): Phase 4 - Webhook Handler` (bc5f4d6d)

---

### Phase 5: Issue Sync (GitHub → Kanbu) ✅ COMPLETE

**Goal:** Import GitHub issues as Kanbu tasks.

**Status:** Complete (2026-01-09).

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

#### 5.3 User Mapping Integration

User mapping is managed at **Workspace level** (see Phase 2).
During issue sync, the workspace user mapping is used:

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

**Deliverables Phase 5:**

- [x] Issue import functionality (bulk + webhook real-time)
- [x] Real-time issue sync via webhooks
- [x] User mapping integration (via workspace mapping)
- [x] Tag creation from labels
- [x] Sync logging for audit trail

#### Phase 5 Completion Checklist

- [x] **Code**: Issue import working, real-time sync active via webhooks
- [x] **Tests**: 18 tests (user mapping, tag mapping, column mapping, task creation, task update, import progress)
- [x] **ACL**: Sync permissions documented (Project W for import)
- [x] **MCP**: Sync operations logged in GitHubSyncLog (`issue_imported`, `issue_updated`)
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: N/A (service internals)
- [x] **Commit**: `feat(github): Phase 5 - Issue Sync Inbound`

---

### Phase 6: Issue Sync (Kanbu → GitHub) ✅ COMPLETE

**Goal:** Synchronize Kanbu tasks to GitHub issues.

**Status:** Complete (2026-01-09).

#### 6.1 Task → Issue Creation

- [x] Create GitHub issue when task created (`createGitHubIssueFromTask`)
- [x] Field mapping (reverse of Phase 5):
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

**Deliverables Phase 6:**

- [x] Task → Issue creation
- [x] Task → Issue updates
- [x] Bidirectional sync support
- [x] Conflict detection via sync hash

#### Phase 6 Completion Checklist

- [x] **Code**: Bidirectional sync working, sync hash for conflict detection
- [x] **Tests**: 17 tests (reverse user mapping, labels from tags, sync hash, change detection)
- [x] **ACL**: Reuses existing Project W permission (same as Phase 5)
- [x] **MCP**: Outbound sync audit logging (`issue_created`, `issue_updated` with direction=`kanbu_to_github`)
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: N/A (service internals)
- [x] **Commit**: `feat(github): Phase 6 - Issue Sync Outbound`

---

### Phase 7: PR & Commit Tracking ✅ COMPLETE

**Goal:** Link pull requests and commits to tasks.

**Status:** Complete (2026-01-09).

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

**File:** `apps/api/src/trpc/procedures/github.ts` (10 new procedures)

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

**File:** `apps/api/src/routes/webhooks/github.ts` (updated)

- [x] `handlePullRequest()` - Now calls `processNewPR()` for auto-linking on PR open
- [x] `handlePush()` - Now calls `processNewCommits()` for auto-linking on push
- [x] Sync logging includes `taskLinked` and `linkMethod` in details

#### 7.6 Task Detail Integration (Backend Complete)

**Note:** Frontend TaskGitHubPanel component deferred to Phase 8 (Automation).
Backend API is complete and ready for frontend integration.

**Deliverables Phase 7:**

- [x] PR tracking with auto-link (branch, title, body)
- [x] Commit tracking with auto-link (message parsing)
- [x] 10 tRPC procedures for querying and managing links
- [x] 38 tests for task reference extraction and patterns

#### Phase 7 Completion Checklist

- [x] **Code**: PR/Commit linking working, auto-link active via webhooks
- [x] **Tests**: 38 tests (task reference extraction, branch patterns, commit messages, PR titles)
- [x] **ACL**: Uses existing Project R (read) and W (write) permissions
- [x] **MCP**: Audit logging for PR/Commit linking (`GITHUB_PR_LINKED`, `GITHUB_PR_UNLINKED`, `GITHUB_COMMIT_LINKED`, `GITHUB_COMMIT_UNLINKED`)
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: N/A (service internals)
- [x] **Commit**: `feat(github): Phase 7 - PR & Commit Tracking`

---

### Phase 8: Automation ✅ COMPLETE

**Goal:** Automatic actions based on GitHub events.

**Status:** Complete (2026-01-09). Notifications deferred to future phase.

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

**File:** `apps/api/src/trpc/procedures/github.ts` (3 new procedures)

- `github.createBranch` - Create feature branch for task (W)
- `github.previewBranchName` - Preview generated branch name (R)
- `github.getAutomationSettings` - Get automation settings for project (R)

**Deliverables Phase 8:**

- [x] Branch creation automation (via API)
- [x] Task status automation (via webhooks)
- [ ] GitHub event notifications (deferred)

#### Phase 8 Completion Checklist

- [x] **Code**: Branch creation and task status automation working
- [x] **Tests**: 33 tests (slugify, branch generation, settings, column finding, task movement, task closing)
- [x] **ACL**: Reuses existing Project R/W permissions
- [x] **MCP**: Automation actions audit logging (`GITHUB_BRANCH_CREATED`). MCP tool `kanbu_create_github_branch` coming in Phase 9
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: N/A (service internals)
- [x] **Commit**: `feat(github): Phase 8 - Automation`

---

### Phase 9: MCP Tools ✅ COMPLETE

**Goal:** Add GitHub tools to MCP server.

**Status:** Complete (2026-01-09).

**File:** `packages/mcp-server/src/tools/github.ts`

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

**Deliverables Phase 9:**

- [x] 10 GitHub MCP tools (5 query + 5 management)
- [x] Claude Code integration for GitHub workflow

#### Phase 9 Completion Checklist

- [x] **Code**: 10 MCP tools working, TypeScript compiles
- [x] **Tests**: 34 tests (schema validation, tool definitions, response formats)
- [x] **ACL**: Tools use existing project R/W permissions via tRPC
- [x] **MCP**: Tools added to `github.ts`, docs/MCP/ROADMAP.md updated
- [x] **Docs**: Tool specs in both ROADMAPs
- [x] **CLAUDE.md**: N/A (tools are self-describing via MCP)
- [x] **Commit**: `feat(github): Phase 9 - MCP Tools`

---

### Phase 10: CI/CD Integration ✅ COMPLETE

**Goal:** GitHub Actions workflow tracking and frontend display.

**Status:** Complete (2026-01-09). Backend + Frontend implemented.

#### 10.1 GitHub Actions Status

- [x] Workflow run status tracking per PR/commit
- [x] Auto-link workflows to tasks by branch name
- [x] Auto-link workflows to PRs by branch name
- [x] Re-run workflow button from Kanbu (via tRPC)
- [x] Status badges on tasks with active workflows
- [x] CI/CD Panel in task detail view

#### 10.2 Build Status Tracking

**Backend procedures:**

- [x] `github.getWorkflowRuns` - List workflow runs for repo with filters
- [x] `github.getWorkflowRunDetails` - Details of specific run with relations
- [x] `github.getWorkflowJobs` - Get jobs and steps from GitHub API
- [x] `github.getTaskWorkflowRuns` - Get workflow runs for a task
- [x] `github.getWorkflowStats` - Statistics (success rate, avg duration, by workflow)
- [x] `github.rerunWorkflow` - Re-run workflow (full or only failed jobs)
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

**File:** `apps/web/src/components/task/TaskCICDPanel.tsx`

- [x] Workflow runs list per task/PR
- [x] Status badges (success/fail/pending)
- [x] Expand for job details
- [x] Re-run/cancel buttons
- [x] Link to GitHub Actions

**File:** `apps/web/src/components/task/TaskCard.tsx` (extension)

- [x] CI/CD status badge on task card

**Deliverables Phase 10:**

- [x] Workflow run tracking (database + webhook + service)
- [x] Build status integration (7 tRPC procedures)
- [x] CI/CD panel in task detail view
- [x] Status badges on task cards

#### Phase 10 Completion Checklist

- [x] **Code**: Workflow runs tracked, webhook handler working, 7 tRPC procedures, frontend panel
- [x] **Tests**: 26 tests (upsert, filters, task/PR runs, rerun, cancel, jobs, stats, webhook processing)
- [x] **ACL**: Uses existing Project R (read) and W (write) permissions
- [x] **MCP**: CI/CD query tools can be added in future update
- [x] **Docs**: ROADMAP.md updated with final status
- [x] **CLAUDE.md**: TaskCICDPanel documented
- [x] **Commit**: `feat(github): Phase 10 - CI/CD Integration`

---

### Phase 10B: Extended CI/CD ✅ COMPLETE

**Goal:** Advanced CI/CD features: deployment tracking, test results, notifications.

**Status:** Fully implemented (2026-01-09). Deployment tracking, check run tracking, and in-app notifications.

#### 10B.1 Deploy Tracking ✅ COMPLETE

- [x] `deployment` webhook handler
- [x] `deployment_status` webhook handler
- [x] Environment deployments tracking
- [x] Deploy history per environment (getEnvironmentHistory)
- [x] Deployment stats (getDeploymentStats)
- [ ] Deploy status on task (staging/production) → Later
- [ ] Rollback trigger from Kanbu → Later

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
- [ ] `github.triggerDeployment` - Trigger deployment from Kanbu → Later

#### 10B.2 Test Results Integration ✅ COMPLETE

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

#### 10B.3 Workflow Notifications ✅ COMPLETE

- [x] Workflow failure notification system
- [x] Configurable notification triggers (all, failures_only, none)
- [x] In-app notifications via existing notification system
- [x] Settings per repository via syncSettings.notifications
- [x] Notify options: roles, PR author, task assignees
- [ ] Email notifications (optional) → Future extension
- [ ] Slack/webhook integration (optional) → Future extension

**Backend service (implemented):**

- [x] `cicdNotificationService.getCICDSettings` - Get notification settings
- [x] `cicdNotificationService.updateCICDSettings` - Update settings
- [x] `cicdNotificationService.notifyWorkflowRun` - Workflow notifications
- [x] `cicdNotificationService.notifyDeployment` - Deployment notifications
- [x] `cicdNotificationService.notifyCheckRun` - Check run notifications

**Deliverables Phase 10B:**

- [x] Deployment tracking (webhook + database + service)
- [x] Test results integration (webhook + database + service)
- [x] Notification system for CI/CD events

#### Phase 10B Completion Checklist

- [x] **Code**: Deploy tracking, check run tracking, notifications
- [x] **Tests**: 14 deployment + 18 check run + 28 notification = 60 tests
- [x] **ACL**: Uses existing Project permissions
- [x] **Docs**: Extended CI/CD documented in ROADMAP
- [x] **Commit**: `feat(github): Phase 10B - Extended CI/CD`

---

### Phase 11: Advanced Sync ⚡ PARTIALLY COMPLETE

**Goal:** Extended synchronization of GitHub features.

**Status:** 11.1 (Milestones) and 11.2 (Releases) complete. Wiki and Projects deferred to Phase 11B.

#### 11.1 Milestones Sync ✅ COMPLETE

- [x] GitHub milestones tracking
- [x] Milestone progress tracking (open/closed issues)
- [x] Due date tracking
- [x] Frontend panel with progress bars
- [x] Stats component (total, open, closed, overdue)

**Database model:** ✅ IMPLEMENTED

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

**Backend procedures:** ✅ IMPLEMENTED

- [x] `github.getProjectMilestones` - List milestones for project
- [x] `github.getMilestoneStats` - Milestone statistics
- [x] `github.getMilestoneByNumber` - Get milestone details

**Backend services:**

- [x] `milestoneService.ts` - Complete milestone CRUD + webhook sync
- [x] 13 tests for milestone service

**Frontend:**

- [x] `ProjectMilestonesPanel.tsx` - Milestones tab in GitHub settings

#### 11.2 GitHub Releases Tracking ✅ COMPLETE

- [x] Release tracking per repository
- [x] Release notes display
- [x] Draft/prerelease indicator
- [x] Latest release highlight
- [x] Release changelog generation from merged PRs

**Database model:** ✅ IMPLEMENTED

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

**Backend procedures:** ✅ IMPLEMENTED

- [x] `github.getProjectReleases` - List releases for project
- [x] `github.getReleaseStats` - Release statistics
- [x] `github.getLatestRelease` - Latest release
- [x] `github.getReleaseByTag` - Release by tag name
- [x] `github.generateReleaseNotes` - Generate notes from merged PRs

**Backend services:**

- [x] `releaseService.ts` - Complete release CRUD + webhook sync + notes generation
- [x] 17 tests for release service

**Frontend:**

- [x] `ProjectReleasesPanel.tsx` - Releases tab in GitHub settings
- [x] Latest release highlight component
- [x] Release notes generator component

#### 11.3 GitHub Wiki Integration 🚧 PLANNED (→ Phase 11B)

- [ ] Synchronize wiki pages
- [ ] Link wiki pages to tasks
- [ ] Wiki search from Kanbu

#### 11.4 GitHub Projects (Beta) Sync 🚧 PLANNED (→ Phase 11B)

- [ ] GitHub Projects V2 integration
- [ ] Project board ↔ Kanbu board sync
- [ ] Custom fields mapping
- [ ] View sync (optional)

**Deliverables Phase 11:**

- [x] Milestone synchronization (13 tests)
- [x] Releases tracking (17 tests)
- [ ] Wiki integration (→ Phase 11B)
- [ ] GitHub Projects sync (→ Phase 11B)

#### Phase 11 Completion Checklist

- [x] **Code**: Milestones/Releases sync working
- [x] **Tests**: 30 tests (13 milestone + 17 release)
- [x] **ACL**: Uses existing project permissions
- [ ] **MCP**: Add release tools (→ Phase 11B)
- [x] **Docs**: ROADMAP updated
- [x] **Frontend**: ProjectMilestonesPanel + ProjectReleasesPanel
- [ ] **Commit**: `feat(github): Phase 11 - Milestones & Releases`

---

### Phase 12: Code Review Integration ✅ COMPLETE

**Goal:** Deep integration with GitHub code review workflow.

**Status:** Complete. Backend + frontend implemented.

#### 12.1 Review Request Tracking

- [x] Track who needs to review
- [ ] Review request notifications in Kanbu
- [ ] "Needs Review" badge on tasks
- [ ] Auto-assign reviewer based on CODEOWNERS

**Backend procedures:**

- [x] `github.requestReview` - Request review from user
- [x] `github.getPendingReviewRequests` - Pending review requests
- [x] `github.getSuggestedReviewers` - Suggested reviewers

#### 12.2 Review Comments Sync

- [x] Store PR review comments in database
- [x] Review state tracking (PENDING, COMMENTED, APPROVED, CHANGES_REQUESTED, DISMISSED)
- [ ] Comment threads UI with context
- [ ] Reply to review comments from Kanbu
- [ ] Resolved/unresolved tracking

**Database model:** ✅ IMPLEMENTED

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

- `upsertReview()` - Store/update review
- `upsertReviewComment()` - Store/update review comment
- `getReviewsForPR()` - Get reviews for a PR
- `getPRReviewSummary()` - Review summary (approved, changes_requested, etc.)
- `getReviewsForTask()` - Reviews for all PRs of a task
- `getTaskReviewSummary()` - Aggregated review status for task
- `requestReview()` - Review request via GitHub API
- `getSuggestedReviewers()` - Suggested reviewers from GitHub
- `getPendingReviewRequests()` - Pending review requests
- `syncReviewsFromGitHub()` - Sync reviews from GitHub to database

**tRPC procedures:** ✅ 8 procedures added

- `github.getPRReviews` - Reviews for PR
- `github.getPRReviewSummary` - Review summary for PR
- `github.getTaskReviews` - Reviews for task
- `github.getTaskReviewSummary` - Review summary for task
- `github.requestReview` - Request review from user
- `github.getSuggestedReviewers` - Suggested reviewers
- `github.getPendingReviewRequests` - Pending requests
- `github.syncPRReviews` - Sync reviews from GitHub

**Webhook handler:** ✅ `pull_request_review` event

- Automatic upsert of reviews on webhook
- Sync log entries for audit trail

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

#### 12.5 Frontend: Code Review Panel ✅ COMPLETE

**File:** `apps/web/src/components/task/TaskReviewPanel.tsx`

- [x] Review status overview (summary card with approved/changes/comments/pending counts)
- [x] Reviewer list with status (avatar, login, state badge)
- [x] Review body display
- [ ] Comment threads (collapsed) - future enhancement
- [ ] Request review button - future enhancement
- [ ] Approve/Request changes actions - future enhancement

**Deliverables Phase 12:**

- [x] Review tracking backend (database, service, tRPC)
- [x] Webhook handler for pull_request_review
- [x] Review summary aggregation
- [x] Frontend: TaskReviewPanel with Reviews tab in TaskDetailModal
- [ ] CODEOWNERS integration (deferred)

#### Phase 12 Completion Checklist

- [x] **Code**: Backend + Frontend review integration complete
- [x] **Tests**: 17 tests for reviewService
- [x] **ACL**: N/A (uses project R/W permissions)
- [ ] **MCP**: Review tools (deferred to Phase 9B)
- [x] **Frontend**: TaskReviewPanel.tsx + Reviews tab
- [x] **Docs**: ROADMAP updated
- [ ] **Commit**: `feat(github): Phase 12 - Code Review Integration`

---

### Phase 13: Analytics & Insights ✅ COMPLETE

**Goal:** Developer and project metrics from GitHub data.

**Status:** Complete (Core Analytics).

#### 13.1 Cycle Time Analytics

- [x] Time from task creation → PR merged
- [x] Average, median, min, max cycle times
- [x] Total completed tasks tracked
- [ ] Bottleneck identification (deferred)
- [ ] Trend over time per week (deferred)

**Backend service:** `apps/api/src/services/github/analyticsService.ts`

**Backend procedures (5):**

- [x] `github.getCycleTimeStats` - Cycle time metrics
- [x] `github.getReviewTimeStats` - Review time metrics
- [x] `github.getContributorStats` - Contributor statistics
- [x] `github.getThroughputStats` - Throughput per period (week/month)
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

**Integrated in:** `apps/web/src/pages/project/GitHubProjectSettings.tsx` (Analytics tab)

- [x] Metric cards (Cycle Time, Review Time, Contributors, Reviews/PR)
- [x] Cycle time breakdown (Fastest, Median, Slowest)
- [x] Weekly throughput bar chart
- [x] Top contributors list with GitHub avatars
- [x] Loading/empty/error states
- [x] Refresh functionality
- [ ] Export to CSV/PDF (deferred)

**Deliverables Phase 13:**

- [x] Cycle time analytics (backend + frontend)
- [x] Code review metrics (via reviewService)
- [x] Contributor statistics (aggregated from commits/PRs/reviews)
- [x] Throughput statistics (weekly/monthly)
- [ ] Burndown/velocity charts (deferred to 13B)

#### Phase 13 Completion Checklist

- [x] **Code**: Analytics service working, ProjectAnalyticsPanel integrated
- [x] **Tests**: 11 tests for analytics calculations (analyticsService.test.ts)
- [ ] **ACL**: `github-analytics` project feature (deferred - uses existing project perms)
- [ ] **MCP**: Analytics tools (deferred to Phase 13B)
- [x] **Docs**: ROADMAP updated
- [ ] **Commit**: `feat(github): Phase 13 - Analytics & Insights`

---

### Phase 14: Developer Experience ⚡ PARTIALLY COMPLETE

**Goal:** Tools and integrations for developers.

**Status:** Partially complete (2026-01-09) - Bot + CLI ready, VS Code extension planned.

#### 14.1 VS Code Extension 🚧 PLANNED

- [ ] Task list sidebar
- [ ] Quick task creation
- [ ] Branch creation for task
- [ ] Task reference auto-complete in commits
- [ ] PR creation with task link

_Planned for Phase 14B_

#### 14.2 CLI Tool ✅ COMPLETE

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

#### 14.3 Git Hooks Integration 🚧 PLANNED

- [ ] Pre-commit hook: Validate task reference in message
- [ ] Commit-msg hook: Auto-add task reference
- [ ] Pre-push hook: Check PR exists
- [ ] Post-checkout hook: Update task status

_Planned for Phase 14B_

#### 14.4 GitHub Bot ✅ COMPLETE

- [x] Slash command processing in PR/issue comments
- [x] Auto-comment on PRs with task info
- [x] AI-generated PR summaries
- [ ] Reminder comments for stale PRs (Phase 14B)
- [ ] Welcome message for new contributors (Phase 14B)

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

**Deliverables Phase 14:**

- [ ] VS Code extension (Phase 14B)
- [x] CLI tool (`@kanbu/cli` package)
- [ ] Git hooks package (Phase 14B)
- [x] GitHub bot (slash commands + AI summary)

#### Phase 14 Completion Checklist

- [x] **Code**: CLI working (`packages/cli/`), Bot active (`botService.ts`)
- [x] **Tests**: Bot command parsing tests (24 tests), all 134 GitHub tests passing
- [x] **ACL**: N/A (external tools)
- [x] **MCP**: N/A (CLI/extension are standalone)
- [x] **Docs**: ROADMAP.md updated
- [ ] **CLAUDE.md**: Developer tools overview (optional)
- [x] **Commit**: `feat(github): Phase 14 - Developer Experience (Bot + CLI)`

---

### Phase 15: Multi-Repo Support ✅ COMPLETE

**Goal:** Support for complex repository structures.

**Status:** Complete (2026-01-09).

#### 15.1 Monorepo Support ✅

- [x] Multiple packages/apps in one repo
- [x] Path-based filtering with glob patterns
- [x] Package-specific labels and columns
- [x] Affected packages detection

**Implemented in `monorepoService.ts`:**

```typescript
interface MonorepoSettings {
  enabled: boolean;
  packages: Array<{
    path: string; // e.g., "packages/api"
    name: string; // e.g., "API"
    labelPrefix?: string; // e.g., "api:"
    columnId?: number; // Default column
  }>;
  affectedDetection: {
    enabled: boolean;
    baseBranch: string;
  };
  pathPatterns?: {
    include?: string[];
    exclude?: string[];
  };
}
```

**Functions:**

- `matchesPackage()` - Check if file belongs to package
- `findPackageForFile()` - Find package for file
- `getAffectedPackages()` - Find affected packages from changed files
- `generatePackageLabels()` - Generate labels based on packages
- `matchGlob()` - Glob pattern matching (supports `**/*.ts`, `src/**/*`, etc.)
- `filterByPatterns()` - Filter files with include/exclude patterns

#### 15.2 Multi-Repo Projects ✅

- [x] Link project to multiple repositories
- [x] Cross-repo issue references (`owner/repo#123`)
- [x] Unified view of all repos
- [x] Aggregated stats

**Database model adjusted:**

```prisma
model GitHubRepository {
  // ... existing fields
  projectId       Int       @map("project_id")  // No longer @unique
  isPrimary       Boolean   @default(false) @map("is_primary")

  @@unique([projectId, owner, name])  // New unique constraint
  @@index([projectId])                // New index
}

// Project relation changed from 1:1 to 1:many
model Project {
  githubRepositories GitHubRepository[]  // Was: githubRepository
}
```

**Implemented in `multiRepoService.ts`:**

- `getProjectRepositories()` - Get all repos for project
- `linkRepository()` / `unlinkRepository()` - Manage repo links
- `setPrimaryRepository()` - Set primary repo
- `getCrossRepoStats()` - Aggregated stats over all repos
- `searchAcrossRepositories()` - Search in all repos of project
- `parseCrossRepoReference()` - Parse `owner/repo#123` format
- `findCrossRepoReferences()` - Find cross-repo references in text

#### 15.3 Cross-Repo PRs ✅

- [x] Cross-repo reference parsing
- [x] Reference resolution to issues/PRs
- [x] Cross-repo search functionality
- [x] Unified search results

#### 15.4 Repository Groups ⏳ DEFERRED

- [ ] Group related repos (future)
- [ ] Bulk operations on group (future)
- [ ] Shared settings per group (future)

**Deliverables Phase 15:**

- [x] Monorepo configuration with glob patterns
- [x] Multi-repo project linking
- [x] Cross-repo reference parsing
- [ ] Repository groups (deferred)

#### Phase 15 Completion Checklist

- [x] **Code**: Multi-repo linking working, monorepo filtering active
- [x] **Tests**: 34 monorepo tests + 23 multi-repo tests (57 total)
- [x] **ACL**: N/A (extension of existing project linking)
- [x] **MCP**: Exports added to index.ts
- [x] **Docs**: ROADMAP.md updated
- [ ] **CLAUDE.md**: Multi-repo patterns documented (optional)
- [ ] **Commit**: `feat(github): Phase 15 - Multi-Repo Support`

---

### Phase 16: AI/Claude Integration ✅ COMPLETE

**Goal:** AI-powered features for GitHub workflow.

**Status:** Complete (2026-01-09).

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

_Moved to future enhancement - core AI features complete_

**Deliverables Phase 16:**

- [x] PR summary generation
- [x] AI code review assistance
- [x] Release notes generation
- [x] Commit message generation
- [x] Multi-provider support (Anthropic Claude, OpenAI)

#### Phase 16 Completion Checklist

- [x] **Code**: AI service (`aiService.ts`) with 4 functions, dual provider support
- [x] **Tests**: 26 tests for configuration, error handling and type validation
- [x] **ACL**: Via existing project READ/WRITE permissions
- [x] **tRPC**: 5 AI procedures added to `github.ts`
- [x] **Docs**: ROADMAP.md updated
- [ ] **CLAUDE.md**: Document AI integration patterns (optional)
- [x] **Commit**: `feat(github): Phase 16 - AI/Claude Integration`

---

## Tool Overview

| Phase     | Tools/Features                                                       | Level           | Status                |
| --------- | -------------------------------------------------------------------- | --------------- | --------------------- |
| Phase 1   | Database schema (7 models incl. UserMapping) + 69 tests              | -               | ✅ Complete           |
| Phase 2   | OAuth + Installation + User Mapping (15 procedures) + 19 tests       | Admin/Workspace | ✅ Complete           |
| Phase 3   | Repository linking + Settings UI (7 procedures) + 21 tests           | Project         | ✅ Complete           |
| Phase 4   | Webhook handler (11 event types) + 28 tests                          | System          | ✅ Complete           |
| Phase 5   | Issue sync GitHub→Kanbu (sync service + 2 procedures) + 18 tests     | Project         | ✅ Complete           |
| Phase 6   | Issue sync Kanbu→GitHub (outbound service + 3 procedures) + 17 tests | Project         | ✅ Complete           |
| Phase 7   | PR & Commit tracking (10 procedures) + 38 tests                      | Project         | ✅ Complete           |
| Phase 8   | Automation (branch creation, task status) + 33 tests                 | Project         | ✅ Complete           |
| Phase 9   | MCP tools (10 tools) + 34 tests                                      | MCP             | ✅ Complete           |
| Phase 10  | CI/CD workflow tracking (7 procedures) + frontend panel + 26 tests   | Project         | ✅ Complete           |
| Phase 10B | Extended CI/CD (Deploy, Check runs, Notifications) + 60 tests        | Project         | ✅ Complete           |
| Phase 11  | Advanced Sync (Milestones, Releases) + 30 tests                      | Project         | ⚡ Partially Complete |
| Phase 12  | Code Review Integration (Reviews, CODEOWNERS)                        | Project         | ✅ Complete           |
| Phase 13  | Analytics & Insights (Cycle Time, Stats)                             | Project         | ✅ Complete           |
| Phase 14  | Developer Experience (Bot + CLI + Git Hooks) + 53 tests              | Tools           | ⚡ Partially Complete |
| Phase 15  | Multi-Repo Support (Monorepo, Cross-repo) + 57 tests                 | Project         | ✅ Complete           |
| Phase 16  | AI/Claude Integration (PR Summary, Review AI) + 26 tests             | MCP/AI          | ✅ Complete           |

---

## Priority Matrix

### Core (P0-P1) - Phase 1-9

| Item                  | Impact   | Effort | Priority |
| --------------------- | -------- | ------ | -------- |
| Database schema       | Critical | Medium | P0       |
| GitHub App setup      | Critical | Medium | P0       |
| Repository linking    | Critical | Low    | P0       |
| Sidebar menu item     | High     | Low    | P1       |
| GitHub settings page  | High     | Medium | P1       |
| Webhook handler       | High     | Medium | P1       |
| Issue sync (inbound)  | High     | High   | P1       |
| Issue sync (outbound) | Medium   | High   | P2       |
| PR tracking           | Medium   | Medium | P2       |
| Commit tracking       | Medium   | Low    | P2       |
| Automation            | Medium   | High   | P3       |
| MCP tools             | Low      | Medium | P3       |

### Extended (P3-P4) - Phase 10-16

| Item                          | Impact | Effort | Priority |
| ----------------------------- | ------ | ------ | -------- |
| CI/CD - Build status          | High   | Medium | P3       |
| CI/CD - Deploy tracking       | Medium | Medium | P3       |
| Code Review - Reviews sync    | High   | High   | P3       |
| Code Review - CODEOWNERS      | Medium | Low    | P4       |
| Analytics - Cycle time        | High   | Medium | P3       |
| Analytics - Contributor stats | Medium | Medium | P4       |
| Milestones sync               | Medium | Medium | P4       |
| Releases tracking             | Medium | Low    | P4       |
| VS Code Extension             | High   | High   | P4       |
| CLI Tool                      | Medium | Medium | P4       |
| Git Hooks                     | Medium | Low    | P4       |
| GitHub Bot                    | Medium | High   | P4       |
| Monorepo support              | Medium | High   | P4       |
| Multi-repo projects           | Low    | High   | P5       |
| AI - PR Summary               | High   | Medium | P4       |
| AI - Code Review              | High   | High   | P5       |
| AI - Release Notes            | Medium | Medium | P5       |
| AI - Bug Triage               | Medium | High   | P5       |

---

## Files to Modify/Create

### Database & Types

| File                                   | Change                                 |
| -------------------------------------- | -------------------------------------- |
| `packages/shared/prisma/schema.prisma` | 7 new models (incl. GitHubUserMapping) |
| `packages/shared/src/types/github.ts`  | **New** - TypeScript types             |

### Backend API - Admin Level

| File                                                  | Change                                |
| ----------------------------------------------------- | ------------------------------------- |
| `apps/api/src/trpc/procedures/githubAdmin.ts`         | **New** - Admin-level tRPC procedures |
| `apps/api/src/services/github/installationService.ts` | **New** - Installation management     |
| `apps/api/src/services/github/userMappingService.ts`  | **New** - User mapping service        |

### Backend API - Project Level

| File                                                | Change                                  |
| --------------------------------------------------- | --------------------------------------- |
| `apps/api/src/trpc/procedures/github.ts`            | **New** - Project-level tRPC procedures |
| `apps/api/src/services/github/syncService.ts`       | **New** - Sync service                  |
| `apps/api/src/services/github/repositoryService.ts` | **New** - Repository linking            |

### Backend API - Shared

| File                                     | Change                           |
| ---------------------------------------- | -------------------------------- |
| `apps/api/src/routes/webhooks/github.ts` | **New** - Webhook handler        |
| `apps/api/src/services/github/`          | **New** - GitHub service classes |
| `apps/api/src/lib/github.ts`             | **New** - GitHub API client      |

### Frontend - Admin Level

| File                                                        | Change                             |
| ----------------------------------------------------------- | ---------------------------------- |
| `apps/web/src/pages/admin/GitHubAdminPage.tsx`              | **New** - Admin GitHub settings    |
| `apps/web/src/components/admin/github/InstallationsTab.tsx` | **New** - Installations management |
| `apps/web/src/components/admin/github/UserMappingTab.tsx`   | **New** - User mapping UI          |
| `apps/web/src/components/admin/github/OverviewTab.tsx`      | **New** - Repos overview           |
| `apps/web/src/pages/admin/AdminSidebar.tsx`                 | Add GitHub menu item               |

### Frontend - Project Level

| File                                                   | Change                            |
| ------------------------------------------------------ | --------------------------------- |
| `apps/web/src/pages/project/GitHubProjectSettings.tsx` | **New** - Project GitHub settings |
| `apps/web/src/components/github/RepoLinkForm.tsx`      | **New** - Repo linking form       |
| `apps/web/src/components/github/SyncSettingsForm.tsx`  | **New** - Sync settings           |
| `apps/web/src/components/github/SyncStatusPanel.tsx`   | **New** - Sync status + logs      |
| `apps/web/src/components/task/TaskGitHubPanel.tsx`     | **New** - Task GitHub info panel  |
| `apps/web/src/components/layout/ProjectSidebar.tsx`    | Add GitHub menu item + GitHubIcon |

### Frontend - Shared

| File                                            | Change                                |
| ----------------------------------------------- | ------------------------------------- |
| `apps/web/src/components/github/`               | **New** - GitHub components directory |
| `apps/web/src/hooks/useProjectFeatureAccess.ts` | Add 'github' feature slug             |
| `apps/web/src/router.tsx`                       | New routes (admin + project)          |

### ACL & Permissions

| File                                            | Change                          |
| ----------------------------------------------- | ------------------------------- |
| `apps/api/src/permissions/definitions/index.ts` | Add 'github' feature definition |
| `apps/api/src/services/auditService.ts`         | Add GITHUB\_\* audit actions    |

### MCP Server

| File                                      | Change                 |
| ----------------------------------------- | ---------------------- |
| `packages/mcp-server/src/tools/github.ts` | **New** - GitHub tools |
| `packages/mcp-server/src/tools/index.ts`  | Export github tools    |
| `packages/mcp-server/src/index.ts`        | Add github handlers    |

### Phase 10-16: Extended Features

#### CI/CD & Analytics (Phase 10, 13)

| File                                                 | Change                              |
| ---------------------------------------------------- | ----------------------------------- |
| `apps/api/src/services/github/cicdService.ts`        | **New** - CI/CD integration service |
| `apps/api/src/services/github/analyticsService.ts`   | **New** - Analytics service         |
| `apps/web/src/components/task/TaskCICDPanel.tsx`     | **New** - CI/CD status panel        |
| `apps/web/src/pages/project/GitHubAnalyticsPage.tsx` | **New** - Analytics dashboard       |

#### Code Review (Phase 12)

| File                                               | Change                        |
| -------------------------------------------------- | ----------------------------- |
| `apps/api/src/services/github/reviewService.ts`    | **New** - Code review service |
| `apps/web/src/components/task/TaskReviewPanel.tsx` | **New** - Review status panel |

#### Advanced Sync (Phase 11)

| File                                               | Change                     |
| -------------------------------------------------- | -------------------------- |
| `apps/api/src/services/github/milestoneService.ts` | **New** - Milestone sync   |
| `apps/api/src/services/github/releaseService.ts`   | **New** - Release tracking |

#### Developer Experience (Phase 14) ⚡

| File                                                        | Change                                         |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `packages/cli/`                                             | **New** - CLI tool package ✅                  |
| `packages/cli/src/index.ts`                                 | CLI entry point with all commands              |
| `packages/cli/src/config.ts`                                | Configuration storage                          |
| `packages/cli/src/api.ts`                                   | tRPC API client                                |
| `packages/cli/src/commands/auth.ts`                         | login, logout, whoami                          |
| `packages/cli/src/commands/task.ts`                         | list, show, start, done, create                |
| `packages/cli/src/commands/pr.ts`                           | create, status, link                           |
| `apps/api/src/services/github/botService.ts`                | **New** - Bot slash commands ✅                |
| `apps/api/src/services/github/__tests__/botService.test.ts` | **New** - 24 tests                             |
| `apps/api/src/routes/webhooks/github.ts`                    | Issue comment handler added                    |
| `packages/git-hooks/`                                       | **New** - Git hooks package ✅                 |
| `packages/git-hooks/src/cli.ts`                             | CLI: install, uninstall, status, config, run   |
| `packages/git-hooks/src/utils.ts`                           | Utilities for task extraction, hook management |
| `packages/git-hooks/src/hooks/prepare-commit-msg.ts`        | Auto-add task ref to commits                   |
| `packages/git-hooks/src/hooks/commit-msg.ts`                | Validate task reference                        |
| `packages/git-hooks/src/hooks/post-commit.ts`               | Link commit to task in Kanbu                   |
| `packages/git-hooks/src/__tests__/utils.test.ts`            | **New** - 29 tests                             |
| `packages/vscode-extension/`                                | 🚧 Planned for Phase 14B                       |

#### Multi-Repo (Phase 15) ✅

| File                                                              | Change                                            |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `packages/shared/prisma/schema.prisma`                            | GitHubRepository: isPrimary, projectId multi-repo |
| `apps/api/src/services/github/monorepoService.ts`                 | **New** - Monorepo support (13 functions)         |
| `apps/api/src/services/github/multiRepoService.ts`                | **New** - Multi-repo linking (10 functions)       |
| `apps/api/src/services/github/__tests__/monorepoService.test.ts`  | **New** - 34 tests                                |
| `apps/api/src/services/github/__tests__/multiRepoService.test.ts` | **New** - 23 tests                                |
| `apps/api/src/services/github/index.ts`                           | Exports for monorepo and multi-repo services      |

#### AI/Claude Integration (Phase 16) ✅

| File                                                       | Change                             |
| ---------------------------------------------------------- | ---------------------------------- |
| `apps/api/src/services/github/aiService.ts`                | **New** - AI service (4 functions) |
| `apps/api/src/services/github/__tests__/aiService.test.ts` | **New** - 26 tests                 |
| `apps/api/src/services/github/index.ts`                    | Export AI service                  |
| `apps/api/src/trpc/procedures/github.ts`                   | 5 AI procedures added              |
| `apps/api/.env.example`                                    | AI provider configuration          |

---

## ACL Integration

### Two-Level Permissions

The GitHub connector requires permissions at **two levels**:

#### Workspace Level (Admin)

| Action                      | Required Permission |
| --------------------------- | ------------------- |
| View installations          | Workspace R         |
| Manage installations        | Workspace P         |
| View user mappings          | Workspace R         |
| Create/edit user mappings   | Workspace P         |
| View all repos in workspace | Workspace R         |

#### Project Level

| Action                  | Required Permission |
| ----------------------- | ------------------- |
| View GitHub panel       | Project R           |
| View synced issues/PRs  | Project R           |
| Trigger manual sync     | Project W           |
| Link/unlink repository  | Project P           |
| Configure sync settings | Project P           |
| Create feature branch   | Project W           |

### Feature Access Control

**File:** `apps/api/src/permissions/definitions/index.ts`

```typescript
// Add to WORKSPACE_FEATURES (Admin level)
{
  slug: 'github-admin',
  name: 'GitHub Administration',
  description: 'Manage GitHub installations and user mappings',
  permissions: ['R', 'P'],  // R=view, P=manage
  requiredPermission: 'R',
}

// Add to PROJECT_FEATURES (Project level)
{
  slug: 'github',
  name: 'GitHub',
  description: 'Link project to GitHub repository',
  permissions: ['R', 'W', 'P'],  // R=view, W=sync, P=configure
  default: 'MANAGER',
}
```

### Example Permission Flow

```
User wants to link repo to project:

1. Check: Does user have Project P on this project?
   → Yes: Continue
   → No: "You need Project Manager permission"

2. Check: Are there GitHub installations in the workspace?
   → Yes: Show repo selector
   → No: "No GitHub installations. Contact workspace admin."
        (Link to admin page if user also has Workspace P)

3. User selects repo and saves
   → Repo linked to project
   → Audit log: GITHUB_REPO_LINKED
```

### Audit Logging

All GitHub actions are logged in the audit system:

```typescript
// Admin-level audit actions (Workspace)
GITHUB_INSTALLATION_ADDED = 'github:installation_added';
GITHUB_INSTALLATION_REMOVED = 'github:installation_removed';
GITHUB_USER_MAPPING_CREATED = 'github:user_mapping_created';
GITHUB_USER_MAPPING_UPDATED = 'github:user_mapping_updated';
GITHUB_USER_MAPPING_DELETED = 'github:user_mapping_deleted';
GITHUB_AUTO_MATCH_TRIGGERED = 'github:auto_match_triggered';

// Project-level audit actions
GITHUB_REPO_LINKED = 'github:repo_linked';
GITHUB_REPO_UNLINKED = 'github:repo_unlinked';
GITHUB_SETTINGS_UPDATED = 'github:settings_updated';
GITHUB_SYNC_TRIGGERED = 'github:sync_triggered';
GITHUB_ISSUE_IMPORTED = 'github:issue_imported';
GITHUB_ISSUE_EXPORTED = 'github:issue_exported';
GITHUB_PR_LINKED = 'github:pr_linked';
GITHUB_BRANCH_CREATED = 'github:branch_created';
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

## Verification Checklist

### Phase 1 ✅

- [x] Database synced successfully (`prisma db push`)
- [x] Types correctly generated (`packages/shared/src/types/github.ts`)
- [x] Relations work correctly (7 models implemented)
- [x] Tests passing (114 tests)

### Phase 2 ✅

- [x] GitHub App installable
- [x] OAuth callback works
- [x] Token refresh automatic
- [x] User mapping CRUD works
- [x] Admin UI functional

### Phase 3 ✅

- [x] Repository linking works (7 tRPC procedures)
- [x] Settings save works (Zod schema validation)
- [x] Settings UI responsive (3 tabs: Repository, Settings, Logs)
- [x] Sidebar menu item with ACL check
- [x] Tests passing (21 tests in `githubProject.test.ts`)

### Phase 4 ✅

- [x] Webhook receives events
- [x] Signature verification works
- [x] Events correctly routed

### Phase 5 ✅

- [x] Issues correctly imported
- [x] User mapping lookup works
- [x] Tags created from labels
- [x] No duplicate creates (skipExisting)

### Phase 6 ✅

- [x] Bidirectional sync works
- [x] Conflict detection active (sync hash)

### Phase 7 ✅

- [x] PRs auto-linked via branch/title/body
- [x] Commits auto-linked via message parsing
- [x] Manual linking/unlinking works
- [x] Task reference patterns correctly extracted

### Phase 8 ✅

- [x] Branch creation via API works
- [x] Task status automation via webhooks works
- [x] Column matching (exact + fuzzy) correct
- [x] Automation settings configurable via sync settings

### Phase 9 ✅

- [x] MCP tools typecheck
- [x] MCP tools functional (10 tools implemented)

### Phase 10 (CI/CD) ✅

- [x] Workflow runs correctly tracked (webhook + database)
- [x] Auto-link to tasks/PRs by branch name
- [x] Re-run workflow works (via GitHub API)
- [x] Cancel workflow works
- [x] Workflow jobs and steps retrievable
- [x] Statistics (success rate, avg duration)
- [x] Build status badges shown on task cards
- [x] CI/CD panel in task detail view

### Phase 10B (Extended CI/CD) ✅ COMPLETE

- [x] Deployment webhook handlers (deployment, deployment_status)
- [x] Deploy history per environment (getEnvironmentHistory)
- [x] Deployment stats (success rate, by environment)
- [x] Check run webhook handlers (check_run)
- [x] Check run stats and trends
- [x] CI/CD notifications (workflow, deployment, check run)
- [x] Configurable triggers (all, failures_only, none)
- [x] In-app notifications via existing system

### Phase 11 (Advanced Sync) ⚡

- [x] Milestones sync works (GitHubMilestone model, 13 tests)
- [x] Releases tracking (GitHubRelease model, 17 tests)
- [x] Frontend: ProjectMilestonesPanel + ProjectReleasesPanel
- [ ] Wiki integration (→ Phase 11B)
- [ ] GitHub Projects V2 (→ Phase 11B)

### Phase 12 (Code Review) ✅

- [x] Review tracking in database (GitHubReview + GitHubReviewComment models)
- [x] Review comments sync via webhook
- [x] Approval status correct (via getPRReviewSummary)
- [x] 8 tRPC procedures, 17 tests
- [x] Frontend: TaskReviewPanel with Reviews tab
- [ ] CODEOWNERS parsing (deferred)

### Phase 13 (Analytics) ✅

- [x] Cycle time correctly calculated (avg, median, min, max)
- [x] Review time stats accurate (time to first review, time to approval)
- [x] Contributor stats accurate (commits, PRs, reviews per user)
- [x] Throughput stats (weekly/monthly)
- [x] 11 tests passing
- [x] ProjectAnalyticsPanel integrated in GitHubProjectSettings
- [ ] Burndown/velocity charts (deferred to 13B)
- [ ] Export to CSV/PDF (deferred)

### Phase 14 (Developer Experience)

- [ ] VS Code extension installs
- [ ] CLI tool works
- [ ] Git hooks install correctly
- [ ] GitHub bot responds to commands

### Phase 15 (Multi-Repo) ✅

- [x] Monorepo path filtering works (matchGlob, filterByPatterns)
- [x] Multiple repos per project possible (linkRepository, isPrimary)
- [x] Cross-repo references parsing (parseCrossRepoReference, findCrossRepoReferences)
- [x] 57 tests written and passed

### Phase 16 (AI/Claude) ✅

- [x] PR summary generation works
- [x] AI code review suggestions correct
- [x] Release notes generation accurate
- [x] Commit message generation works
- [x] Multi-provider support (Anthropic, OpenAI)
- [ ] Bug triage suggestions relevant

---

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-01-09 | **Phase 12 COMPLETE**: Code Review Integration - GitHubReview + GitHubReviewComment models, reviewService.ts (10 functions), webhook handler for pull_request_review events, 8 tRPC procedures, 17 tests, TypeScript types extended. Frontend: TaskReviewPanel.tsx with Reviews tab in TaskDetailModal.                                    |
| 2026-01-09 | **Phase 10 COMPLETE**: CI/CD Integration - GitHubWorkflowRun model, workflowService.ts, webhook handler for workflow_run events, 7 tRPC procedures (getWorkflowRuns, getWorkflowRunDetails, getWorkflowJobs, getTaskWorkflowRuns, getWorkflowStats, rerunWorkflow, cancelWorkflow), 26 tests. Frontend panel and deploy tracking deferred. |
| 2026-01-09 | **Phase 9 COMPLETE**: MCP Tools - 10 GitHub tools in `packages/mcp-server/src/tools/github.ts` (5 query + 5 management), 34 tests, TypeScript compiles, docs/MCP/ROADMAP.md updated                                                                                                                                                        |
| 2026-01-09 | **Phase 8 COMPLETE**: Automation - automationService.ts with branch creation, task status automation via webhooks, column fuzzy matching, sync settings extension, 3 tRPC procedures, 33 tests                                                                                                                                             |
| 2026-01-09 | **Phase 7 COMPLETE**: PR & Commit Tracking - prCommitLinkService.ts with task reference extraction, auto-linking via webhook, 10 tRPC procedures, 38 tests                                                                                                                                                                                 |
| 2026-01-09 | **Phase 6 COMPLETE**: Outbound sync (createGitHubIssueFromTask, updateGitHubIssueFromTask, syncTaskToGitHub), reverse user mapping, sync hash conflict detection, 17 tests, 3 tRPC procedures                                                                                                                                              |
| 2026-01-09 | **Phase 5 COMPLETE**: Issue sync service (issueSyncService.ts), bulk import, real-time webhook sync, user mapping integration, tag creation from labels, 18 tests                                                                                                                                                                          |
| 2026-01-09 | **Phase 3 COMPLETE**: 7 project-level tRPC procedures, GitHubProjectSettings page with 3 tabs, ProjectSidebar integration, `github` ACL feature, 21 tests                                                                                                                                                                                  |
| 2026-01-09 | **Phase 2 COMPLETE**: GitHub service layer, 15 tRPC procedures, Admin UI with 3 tabs, 19 tests                                                                                                                                                                                                                                             |
| 2026-01-09 | **MCP corrections**: Phase 2-8 "MCP: N/A" corrected to audit logging + MCP tool references to Phase 9                                                                                                                                                                                                                                      |
| 2026-01-09 | **Tests mandatory**: Phase Completion Protocol extended with mandatory tests section, all phases (2-16) updated                                                                                                                                                                                                                            |
| 2026-01-09 | **Phase 1 COMPLETE**: Database schema (7 models), TypeScript types, 114 tests                                                                                                                                                                                                                                                              |
| 2026-01-09 | Phase Completion Protocol added with per-phase completion checklists                                                                                                                                                                                                                                                                       |
| 2026-01-09 | Phase 10-16 added: CI/CD, Advanced Sync, Code Review, Analytics, DX, Multi-Repo, AI                                                                                                                                                                                                                                                        |
| 2026-01-09 | Priority Matrix extended with Extended features (P3-P5)                                                                                                                                                                                                                                                                                    |
| 2026-01-09 | Database models added for Workflow Runs, Reviews, Contributor Stats                                                                                                                                                                                                                                                                        |
| 2026-01-09 | Two-tier architecture added (Admin + Project level)                                                                                                                                                                                                                                                                                        |
| 2026-01-09 | GitHubUserMapping model added (workspace level)                                                                                                                                                                                                                                                                                            |
| 2026-01-09 | Files list split into Admin and Project level                                                                                                                                                                                                                                                                                              |
| 2026-01-09 | ACL section extended with workspace permissions                                                                                                                                                                                                                                                                                            |
| 2026-01-09 | Initial roadmap created                                                                                                                                                                                                                                                                                                                    |
