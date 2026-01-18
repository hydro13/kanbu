# GitHub Module Roadmap

## Version: 1.0.0

## Date: 2026-01-10

## Status: Active

---

## Overview

This roadmap describes the phases to achieve 100% Feature Parity with GitHub Projects.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  PHASE 1       PHASE 2       PHASE 3       PHASE 4       PHASE 5   │
│  ──────        ──────        ──────        ──────        ──────    │
│                                                                     │
│  Workspace     Board         Complete      Bi-direc-     Advanced  │
│  Integration   View          UI            tional        Features  │
│                                                                     │
│  ▓▓▓▓▓▓▓▓▓▓    ░░░░░░░░░░    ░░░░░░░░░░    ░░░░░░░░░░    ░░░░░░░░░░│
│  IN PROGRESS   PLANNED       PLANNED       PLANNED       PLANNED   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Workspace Integration

**Status:** 🔄 In Progress

**Goal:** Make GitHub repositories visible as separate projects in the workspace.

### Deliverables

| Item                         | Status  | Description                     |
| ---------------------------- | ------- | ------------------------------- |
| GitHubRepository.workspaceId | 🔲 Todo | Direct link to workspace        |
| Database migration           | 🔲 Todo | Adjust schema for workspaceId   |
| Extend Workspace API         | 🔲 Todo | Endpoint for GitHub projects    |
| Split Workspace UI           | 🔲 Todo | Two sections: Internal + GitHub |
| GitHub project cards         | 🔲 Todo | Card design for repos           |
| Navigate to GitHub project   | 🔲 Todo | Set up routes                   |

### Technical Details

```
Workspace "My Company"
├── 📁 Internal Projects
│   └── (existing project list)
│
└── 🐙 GitHub Projects
    └── (repositories in this workspace)
```

**Database change:**

```prisma
model GitHubRepository {
  // Existing fields...
  workspaceId  Int?
  workspace    Workspace? @relation(fields: [workspaceId], references: [id])
}
```

### Acceptance Criteria

- [ ] GitHub repos appear in workspace sidebar
- [ ] Clear visual distinction (GitHub icon)
- [ ] Clicking opens GitHub project page
- [ ] Sync status visible per repo

---

## Phase 2: Board View

**Status:** 📋 Planned

**Goal:** A working Kanban board for GitHub issues.

### Deliverables

| Item                 | Status  | Description                       |
| -------------------- | ------- | --------------------------------- |
| Route structure      | 🔲 Todo | `/workspace/:slug/github/:repoId` |
| GitHubProjectPage    | 🔲 Todo | Container component               |
| Board layout         | 🔲 Todo | Columns with issues               |
| Issue cards          | 🔲 Todo | Compact issue display             |
| Column configuration | 🔲 Todo | Via labels/status                 |
| Basic drag & drop    | 🔲 Todo | Move issues                       |

### Column Strategies

**Option A: Label-based (recommended)**

```
[Backlog]     [Todo]        [In Progress]  [Done]
status:       status:       status:        status:
backlog       todo          in-progress    done
```

**Option B: Milestone-based**

```
[No Milestone]  [v1.0]       [v1.1]        [v2.0]
```

**Option C: Assignee-based**

```
[Unassigned]   [Robin]      [Jan]         [Piet]
```

### Acceptance Criteria

- [ ] Board shows all open issues
- [ ] Issues grouped in columns
- [ ] Issue card shows: title, labels, assignee, comments count
- [ ] Drag & drop moves issue (label update)
- [ ] Real-time sync with GitHub

---

## Phase 3: Complete UI

**Status:** 📋 Planned

**Goal:** All views and interactions that GitHub Projects has.

### Deliverables

| Item               | Status  | Description                        |
| ------------------ | ------- | ---------------------------------- |
| List View          | 🔲 Todo | Issues as list                     |
| Table View         | 🔲 Todo | Spreadsheet-like display           |
| Filters            | 🔲 Todo | Label, assignee, milestone filters |
| Search             | 🔲 Todo | Search in issues                   |
| Keyboard shortcuts | 🔲 Todo | `j/k` navigation, `c` create, etc. |
| Bulk actions       | 🔲 Todo | Select/modify multiple issues      |
| Issue detail panel | 🔲 Todo | Side panel with full issue         |
| Comment thread     | 🔲 Todo | Read/write comments                |
| Milestones view    | 🔲 Todo | Milestone overview                 |
| PR tab             | 🔲 Todo | Pull requests overview             |

### Keyboard Shortcuts (GitHub Parity)

| Shortcut      | Action                |
| ------------- | --------------------- |
| `j` / `k`     | Next / previous issue |
| `o` / `Enter` | Open issue detail     |
| `c`           | Create new issue      |
| `x`           | Select issue          |
| `e`           | Edit issue            |
| `/`           | Focus search          |
| `?`           | Show shortcuts        |

### Views Comparison

| Feature      | GitHub | Kanbu Status |
| ------------ | ------ | ------------ |
| Board view   | ✅     | 🔲 Phase 2   |
| List view    | ✅     | 🔲 Phase 3   |
| Table view   | ✅     | 🔲 Phase 3   |
| Roadmap view | ✅     | 🔲 Future    |

### Acceptance Criteria

- [ ] All three views work (Board, List, Table)
- [ ] Filters persist in URL
- [ ] Keyboard navigation complete
- [ ] Bulk actions work
- [ ] Comments can be read and written

---

## Phase 4: Bi-directional Sync

**Status:** 📋 Planned

**Goal:** Changes in Kanbu are pushed to GitHub.

### Deliverables

| Item                      | Status  | Description                     |
| ------------------------- | ------- | ------------------------------- |
| Issue create → GitHub     | 🔲 Todo | Create new issues               |
| Issue update → GitHub     | 🔲 Todo | Change title, body, state       |
| Issue move → GitHub       | 🔲 Todo | Update labels on drag           |
| Comment create → GitHub   | 🔲 Todo | Post comments                   |
| Milestone update → GitHub | 🔲 Todo | Milestone changes               |
| Conflict detection        | 🔲 Todo | Timestamp comparison            |
| Retry mechanism           | 🔲 Todo | On temporary failures           |
| Sync status UI            | 🔲 Todo | Pending/synced/error indicators |

### Sync Flow

```
┌─────────────┐          ┌─────────────┐
│   KANBU     │          │   GITHUB    │
│             │          │             │
│  Issue      │─────────▶│  Issue      │
│  change     │   API    │  updated    │
│             │          │             │
│  Webhook    │◀─────────│  Confirm    │
│  receive    │          │             │
└─────────────┘          └─────────────┘
```

### Acceptance Criteria

- [ ] Issue create in Kanbu → appears in GitHub
- [ ] Issue change in Kanbu → changes in GitHub
- [ ] Issue close in Kanbu → closes in GitHub
- [ ] Comment write in Kanbu → appears in GitHub
- [ ] Conflict warning on simultaneous edits

---

## Phase 5: Advanced Features

**Status:** 📋 Planned

**Goal:** Kanbu-specific features that GitHub doesn't have.

### Deliverables

| Item                       | Status  | Description                        |
| -------------------------- | ------- | ---------------------------------- |
| Project Groups             | 🔲 Todo | Combine internal + GitHub projects |
| Cross-project dependencies | 🔲 Todo | Link issues between projects       |
| Combined statistics        | 🔲 Todo | Velocity across multiple repos     |
| Custom fields              | 🔲 Todo | Extra fields (Kanbu-only)          |
| Time tracking              | 🔲 Todo | Register hours (Kanbu-only)        |
| Portfolio view             | 🔲 Todo | Overview all projects              |

### Project Groups

```
Group "Frontend Team"
├── 🐙 webapp-frontend (GitHub)
├── 🐙 component-lib (GitHub)
└── 📁 design-specs (Kanbu internal)

→ Combined velocity
→ Combined burndown
→ Cross-project dependencies visible
```

### Acceptance Criteria

- [ ] Create project groups with both types
- [ ] Combined statistics per group
- [ ] Visualize dependencies between projects
- [ ] Add custom fields to GitHub issues (Kanbu-only)

---

## Priorities

### Must Have (Phase 1-2)

- GitHub repos in workspace
- Basic board view
- Issue cards with drag & drop

### Should Have (Phase 3)

- All views (Board, List, Table)
- Filters and search
- Keyboard shortcuts

### Could Have (Phase 4)

- Bi-directional sync
- Conflict detection

### Won't Have (Now)

- GitLab/Bitbucket support
- GitHub Actions integration

---

## Risks and Mitigations

| Risk                         | Impact | Mitigation                              |
| ---------------------------- | ------ | --------------------------------------- |
| GitHub API rate limits       | Medium | Caching, batch requests                 |
| Sync conflicts               | High   | Timestamp-based resolution, UI warnings |
| Webhook reliability          | Medium | Periodic full sync as fallback          |
| Performance with many issues | Medium | Pagination, virtual scrolling           |

---

## Definitions

- **GitHub Module:** The separate section in Kanbu for GitHub projects
- **Feature Parity:** Exact same functionality as GitHub Projects
- **Bi-directional:** Changes go both ways
- **Project Group:** Collection of both internal and GitHub projects

---

## References

- [VISIE.md](./VISIE.md) - The overarching vision
- [IMPLEMENTATIE-PLAN.md](./IMPLEMENTATIE-PLAN.md) - Technical details
- [GitHub Projects Docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
