# GitHub Integration - Implementation Plan

## Version: 1.1.0

## Date: 2026-01-10

## Status: In Progress

---

## 🎯 First Major Milestone: 100% Feature Parity

### Goal

Build a **complete 1-to-1 replica** of GitHub Projects within Kanbu.

Everything you can do on GitHub must also be possible in Kanbu:

- Same layouts (Board, List, Table)
- Same keyboard shortcuts
- Same drag & drop
- Same filters and search
- Same bulk actions
- **Exact same experience**

### Why Feature Parity First? (Three Benefits)

1. **Feature Parity**
   - Users can switch seamlessly
   - It works exactly as they're used to

2. **Learning from a Working Environment**
   - GitHub Projects is proven by millions of users
   - We learn their UX patterns, shortcuts, workflows
   - No trial-and-error - we build what already works

3. **Reference for Kanbu's Internal Module**
   - After building, we have a beautiful structure
   - We can compare the Kanbu project module with it
   - Adopt AND enrich the best features
   - Both modules become better through this approach

### Architecture

Two project modules side by side in a workspace:

```
Workspace
├── 📁 Internal Projects (existing Kanbu module)
│
└── 🐙 GitHub Projects (GitHub module - 1-to-1 with GitHub)
    └── Board, List, Table views
    └── Issues, Milestones, PRs
    └── Labels, Filters, Search
    └── Keyboard shortcuts
    └── Drag & drop
```

---

## Current Status

### What Works (GitHub Module)

| Feature                  | Status   | Notes                       |
| ------------------------ | -------- | --------------------------- |
| Repo linking             | ✅ Works | Via GitHub App installation |
| Issues sync (import)     | ✅ Works | Bulk import + webhooks      |
| Issue comments sync      | ✅ Works | Including images            |
| Milestones sync (import) | ✅ Works | Bulk import + webhooks      |
| PRs sync                 | ✅ Works | Read-only in Kanbu          |
| Commits sync             | ✅ Works | Read-only in Kanbu          |
| Webhooks receive         | ✅ Works | Real-time updates           |
| GitHub Integration page  | ✅ Works | Shows all data              |

### What's Missing (GitHub Module)

| Feature                              | Status     | Priority |
| ------------------------------------ | ---------- | -------- |
| GitHub projects in workspace list    | ❌ Missing | HIGH     |
| Full GitHub project UI (board view)  | ❌ Missing | HIGH     |
| Kanbu → GitHub sync (bi-directional) | ❌ Missing | HIGH     |
| Visual separation (icons, colors)    | ❌ Missing | MEDIUM   |
| Project Groups (combine both types)  | ❌ Missing | MEDIUM   |

---

## Implementation Steps

### Step 1: GitHub Projects in Workspace (CURRENT FOCUS)

**Goal:** GitHub repositories appear as projects in the workspace list.

#### Current Situation

- Workspace shows only internal Kanbu projects
- GitHub repos are linked to Kanbu projects via `Project.githubRepositoryId`
- This is the OLD approach that we NO LONGER follow

#### New Approach

GitHub projects are shown SEPARATELY in the workspace:

```
Workspace "My Company"
├── 📁 Internal Projects
│   └── (existing project list)
│
└── 🐙 GitHub Projects
    └── (repositories linked to this workspace)
```

#### Database Considerations

Option A: `GitHubRepository` gets direct `workspaceId`:

```prisma
model GitHubRepository {
  // Existing fields...
  workspaceId  Int?
  workspace    Workspace? @relation(fields: [workspaceId], references: [id])
}
```

Option B: Via existing Project link (current situation):

- `GitHubRepository` → `Project` → `Workspace`
- Disadvantage: dependent on internal project

**Recommendation:** Option A - direct link for independence.

#### To Do

- [ ] Make decision: direct workspaceId or via Project
- [ ] Adjust database schema if needed
- [ ] Extend Workspace API with GitHub projects
- [ ] Split Workspace UI into two sections
- [ ] Design GitHub project cards

---

### Step 2: GitHub Project Board View

**Goal:** A complete board view for GitHub projects (like Kanban).

#### Components

```
/workspace/:slug/github/:repoId
├── Board View (issues as cards)
├── List View (issues as list)
├── Milestones Tab
├── Pull Requests Tab
└── Settings Tab
```

#### Issues as Cards

GitHub issues are shown in columns:

- Column determination via **labels** (e.g. `status:todo`, `status:in-progress`)
- Or via **milestone** grouping
- Or via **assignee** grouping

#### To Do

- [ ] Set up route structure
- [ ] Create GitHubProjectPage component
- [ ] Create board view component
- [ ] Create issue card component
- [ ] Column configuration (labels/milestones/assignees)

---

### Step 3: Bi-directional Sync (Kanbu → GitHub)

**Goal:** Changes in Kanbu's GitHub module are pushed to GitHub.

#### What Synchronizes

| Action in Kanbu    | Action to GitHub                          |
| ------------------ | ----------------------------------------- |
| Change issue title | `PATCH /issues/:number`                   |
| Change issue body  | `PATCH /issues/:number`                   |
| Close issue        | `PATCH /issues/:number {state: 'closed'}` |
| Move issue (label) | `PUT /issues/:number/labels`              |
| Add comment        | `POST /issues/:number/comments`           |
| Change milestone   | `PATCH /milestones/:number`               |

#### Sync Logic

```typescript
// On change in GitHubIssue
async function syncIssueToGitHub(issueId: number, changes: Partial<GitHubIssue>) {
  const issue = await prisma.gitHubIssue.findUnique({
    where: { id: issueId },
    include: { repository: { include: { installation: true } } },
  });

  const octokit = await getInstallationOctokit(issue.repository.installation.installationId);

  await octokit.issues.update({
    owner: issue.repository.owner,
    repo: issue.repository.name,
    issue_number: issue.issueNumber,
    ...mapChangesToGitHub(changes),
  });

  // Log sync
  await prisma.gitHubSyncLog.create({
    data: {
      repositoryId: issue.repositoryId,
      action: 'issue_updated',
      direction: 'kanbu_to_github',
      entityType: 'issue',
      entityId: issue.id,
      status: 'success',
    },
  });
}
```

#### To Do

- [ ] Sync service for Kanbu → GitHub
- [ ] Trigger on changes in GitHub\* tables
- [ ] Conflict detection (timestamp check)
- [ ] Retry mechanism on failures

---

### Step 4: UI Updates

#### Visual Indicators

```tsx
// ProjectCard.tsx
function ProjectCard({ project }) {
  return (
    <Card>
      <CardHeader>
        {project.githubRepositoryId && <GitHubIcon className="w-4 h-4 text-gray-500" />}
        <span>{project.name}</span>
      </CardHeader>
    </Card>
  );
}
```

#### Sync Status

```tsx
// SyncStatus.tsx
function SyncStatus({ entityType, entityId }) {
  const { data: syncInfo } = trpc.sync.getStatus.useQuery({ entityType, entityId });

  return (
    <Badge variant={syncInfo.status}>
      {syncInfo.status === 'synced' && <CheckIcon />}
      {syncInfo.status === 'pending' && <ClockIcon />}
      {syncInfo.status === 'error' && <AlertIcon />}
      Last sync: {formatDate(syncInfo.lastSyncAt)}
    </Badge>
  );
}
```

---

## Database Migrations

### Migration 1: GitHubRepository direct workspace link (optional)

If we decide on Option A (direct workspaceId):

```sql
-- AddWorkspaceIdToGitHubRepository
ALTER TABLE "GitHubRepository" ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "GitHubRepository" ADD CONSTRAINT "GitHubRepository_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE SET NULL;

-- Index for fast queries
CREATE INDEX "GitHubRepository_workspaceId_idx" ON "GitHubRepository"("workspaceId");
```

### Database Approach

The GitHub module uses the existing `GitHub*` tables:

- `GitHubRepository`
- `GitHubIssue`
- `GitHubMilestone`
- `GitHubPullRequest`
- `GitHubCommit`
- `GitHubComment`

The UI is completely built around these tables for 1-to-1 feature parity with GitHub.

---

## Testing Strategy

### Unit Tests

- [ ] `syncGitHubMilestoneToKanbu` - correct mapping
- [ ] `syncKanbuMilestoneToGitHub` - correct API calls
- [ ] Conflict detection works

### Integration Tests

- [ ] Full sync flow GitHub → Kanbu
- [ ] Full sync flow Kanbu → GitHub
- [ ] Webhook processing
- [ ] Error recovery

### E2E Tests

- [ ] Milestone create in GitHub → appears in Kanbu
- [ ] Milestone change in Kanbu → changes in GitHub
- [ ] Cross-project dependency with GitHub milestone

---

## Rollback Plan

In case of problems:

1. Disable bi-directional sync (feature flag)
2. Fallback to read-only mode (GitHub → Kanbu only)
3. Data is safe in both systems

---

## References

- [VISIE.md](./VISIE.md) - The overarching vision
- [GitHub API Docs](https://docs.github.com/en/rest)
- [Prisma Docs](https://www.prisma.io/docs)
