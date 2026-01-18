# GitHub Projects Documentation

This directory contains the vision and implementation documentation for GitHub integration in Kanbu.

## Documents

| Document                                         | Description                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| [VISIE.md](./VISIE.md)                           | The overarching vision for GitHub integration - **READ THIS FIRST** |
| [ROADMAP.md](./ROADMAP.md)                       | Phasing and deliverables per phase                                  |
| [IMPLEMENTATIE-PLAN.md](./IMPLEMENTATIE-PLAN.md) | Technical implementation plan with steps and code examples          |

## Core Message

> **Kanbu is the orchestration layer on top of GitHub.**

- GitHub remains the "source of truth" for code-related items
- Kanbu adds value: workspaces, project groups, cross-project features
- Bi-directional sync ensures users can work where they want
- No vendor lock-in - data lives in both systems

---

## 🎯 FIRST MAJOR MILESTONE

### 100% Feature Parity with GitHub Projects

**Goal:** Build a complete 1-to-1 replica of GitHub Projects within Kanbu.

Everything GitHub Projects can do, Kanbu must also be able to do:

- ✅ Board views (Kanban)
- ✅ List views
- ✅ Table views
- ✅ Issue management
- ✅ Milestone management
- ✅ Labels and filters
- ✅ Keyboard shortcuts
- ✅ Drag & drop
- ✅ Bulk actions
- ✅ All layouts

**Why 1-to-1 first?**

1. **Feature Parity** - Users transition seamlessly
2. **Learning** - GitHub is proven by millions of users
3. **Reference** - Adopt best features into Kanbu's internal module

---

## Architecture

### Two Project Modules in a Workspace

```
Workspace
├── 📁 Internal Projects (Kanbu Module)
│   └── Existing Kanbu structure
│
└── 🐙 GitHub Projects (GitHub Module)
    └── 1-to-1 with GitHub Projects
```

### Two Types of Projects

1. **Internal Kanbu Projects** - own structure, no external sync
2. **GitHub Projects** - follows GitHub's structure, bi-directional sync

### GitHub Module Entities

| GitHub       | Kanbu Table       | Sync          |
| ------------ | ----------------- | ------------- |
| Repository   | GitHubRepository  | ↔️            |
| Issue        | GitHubIssue       | ↔️            |
| Milestone    | GitHubMilestone   | ↔️            |
| Pull Request | GitHubPullRequest | ← (read-only) |
| Commit       | GitHubCommit      | ← (read-only) |
| Comment      | GitHubComment     | ↔️            |

### What Does NOT Sync (Kanbu-only)

- Workspaces
- Project Groups
- Internal Kanbu projects
- Cross-project dependencies

## For Developers

If you're working on the GitHub integration:

1. Read [VISIE.md](./VISIE.md) first for the why
2. Check [IMPLEMENTATIE-PLAN.md](./IMPLEMENTATIE-PLAN.md) for current status
3. Follow existing sync patterns
4. Always log in `GitHubSyncLog`

## Contact

For questions about the vision or implementation, consult with Robin Waslander.
