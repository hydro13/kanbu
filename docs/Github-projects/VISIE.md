# GitHub Integration Vision

## Version: 1.0.0
## Date: 2026-01-10
## Author: Robin Waslander

---

## Core Vision

**GitHub + Kanbu = WIN (1+1=3)**

Kanbu is a project management application that can work completely standalone, but can also be linked to GitHub repositories. This link is **bi-directional** - changes in Kanbu appear in GitHub and vice versa.

### The Principle

> "Use GitHub as you're used to. Kanbu makes it better. And your data is always yours."

- Kanbu doesn't "fix" GitHub - GitHub is excellent at what it does
- Kanbu is the **orchestration layer** on top of GitHub
- Users work where they want - the result is the same

---

## Why Bi-directional Sync?

### 1. No Vendor Lock-in
- All data is ALSO in GitHub
- Stop using Kanbu? Your project lives on in GitHub
- Users dare to start more easily - no risk

### 2. Flexible Access
- **External contributor** → only GitHub access needed
- **Freelancer** → works via GitHub issues
- **Core team** → Kanbu for the rich experience
- Everyone sees the same data

### 3. Open Source Projects
- Public repo = community contributes via GitHub
- Maintainers manage via Kanbu (better tools)
- Community doesn't need to know Kanbu

### 4. Credibility
- Developers trust GitHub
- "It syncs with GitHub" = instant credibility
- Kanbu adds value, doesn't replace

---

## Architecture

### First Major Milestone: 100% Feature Parity

**Goal:** Build a complete 1-to-1 replica of GitHub Projects within Kanbu.

Everything GitHub Projects can do, the Kanbu GitHub Module must also be able to do:

| Feature | Status |
|---------|--------|
| Board view (Kanban) | 🔲 To build |
| List view | 🔲 To build |
| Table view | 🔲 To build |
| Issues CRUD | ✅ Sync works |
| Milestones CRUD | ✅ Sync works |
| Labels & filters | 🔲 To build |
| Keyboard shortcuts | 🔲 To build |
| Drag & drop | 🔲 To build |
| Bulk actions | 🔲 To build |
| Search | 🔲 To build |

**Why 1-to-1 first? (Three Benefits)**

1. **Feature Parity**
   - Users can switch seamlessly
   - No learning curve - it works as they're used to

2. **Learning from a Working Environment**
   - GitHub Projects is proven and tested by millions of users
   - We learn their UX patterns, keyboard shortcuts, workflows
   - No trial-and-error needed - we build what already works

3. **Reference for Kanbu's Internal Module**
   - After building, we have a beautiful structure
   - We can compare the Kanbu project module
   - Adopt AND enrich the best features
   - Both modules become better through this approach

### Two Project Modules

**Approach:** The workspace gets two project modules that exist side by side:

1. **Internal Projects Module** - existing Kanbu projects
2. **GitHub Projects Module** - 1-to-1 with GitHub Projects

| Aspect | Internal Module | GitHub Module |
|--------|----------------|---------------|
| Structure | Kanbu's own design | 1-to-1 with GitHub |
| Sync | No external sync | Bi-directional |
| Focus | Can evolve freely | Feature parity first |

### Workspace Structure

```
┌─────────────────── KANBU WORKSPACE ─────────────────────┐
│  Workspace: "My Company"                                │
│                                                         │
│  ┌─ 📁 INTERNAL PROJECTS (Kanbu Module) ─────────────┐  │
│  │                                                    │  │
│  │  📋 design-specs                                   │  │
│  │  📋 internal-docs                                  │  │
│  │  📋 team-planning                                  │  │
│  │                                                    │  │
│  │  → Pure Kanbu structure                           │  │
│  │  → No external sync                               │  │
│  │  → Can evolve freely                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 🐙 GITHUB PROJECTS (GitHub Module) ─────────────┐  │
│  │                                                    │  │
│  │  🔗 webapp-frontend    ↔️ github.com/org/webapp    │  │
│  │  🔗 api-service        ↔️ github.com/org/api       │  │
│  │  🔗 component-lib      ↔️ github.com/org/components│  │
│  │                                                    │  │
│  │  → Follows GitHub's structure                     │  │
│  │  → Bi-directional sync                            │  │
│  │  → Issues, Milestones, PRs, etc.                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ Project Groups (optional) ─────────────────────┐  │
│  │  Group "Frontend": webapp + component-lib + design │  │
│  │  → Combines BOTH types for statistics            │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↕️ sync      ↕️ sync
    ┌─────────┐   ┌─────────┐
    │ GitHub  │   │ GitHub  │
    │ webapp  │   │   api   │
    └─────────┘   └─────────┘
```

### Benefits of this Approach

1. **100% Feature Parity** - GitHub module becomes an exact replica of GitHub Projects
2. **Seamless experience** - Users feel immediately at home
3. **Clear code** - Separated services, routes, components
4. **Phased building** - First 1-to-1, then Kanbu-specific features

### Database

The GitHub module uses the existing `GitHub*` tables:

```
GitHubRepository  → Projects
GitHubIssue       → Issues/Cards
GitHubMilestone   → Milestones
GitHubPullRequest → Pull Requests
GitHubCommit      → Commits
GitHubComment     → Comments
```

The UI and logic are completely built around these tables.

---

## What Kanbu Adds (GitHub doesn't have this)

### 1. Workspaces
GitHub doesn't know workspaces. You have organizations and repositories, but no overarching structure.

**Kanbu:**
- A workspace can contain multiple projects
- Mix of GitHub AND internal projects
- Centralized user management

### 2. Project Groups
Group related projects together.

**Kanbu:**
- Combine statistics across multiple projects
- See total velocity, burndown, etc.
- Visualize cross-project dependencies

### 3. Cross-Project Dependencies
A task in GitHub project A can depend on a task in internal project B.

**In GitHub:** You only see project A and "has a dependency"
**In Kanbu:** You see BOTH projects and the complete dependency chain

### 4. The Big Picture
GitHub shows you one repo/project at a time. Kanbu shows:
- Portfolio overview
- Resource allocation across projects
- Combined reports
- Cross-project search

---

## Sync Strategy

### Entities that Synchronize

| GitHub | Kanbu | Sync Direction |
|--------|-------|---------------|
| Repository | Project | GitHub → Kanbu (when linking) |
| Issue | Task | Bi-directional |
| Milestone | Milestone | Bi-directional |
| Pull Request | PR (read-only in Kanbu) | GitHub → Kanbu |
| Commit | Commit (read-only in Kanbu) | GitHub → Kanbu |
| Comment | Comment | Bi-directional |
| Label | Tag | Bi-directional |
| Release | Release | Bi-directional |

### What Does NOT Sync (Kanbu-only)

- Workspaces
- Project Groups
- Cross-project dependencies to internal projects
- Kanbu-specific fields (time tracking, custom fields, etc.)
- ACL/Permissions

### Conflict Resolution

In case of simultaneous changes:
1. **Timestamp comparison** - most recent wins
2. **Optional: Merge** - for text fields (descriptions, comments)
3. **Audit log** - all changes are logged

---

## Implementation Flow

### When Linking a Repo

1. User selects GitHub repo in Kanbu
2. Kanbu creates/updates Project with `githubRepositoryId`
3. **Initial sync:**
   - Import all issues → Kanbu tasks
   - Import all milestones → Kanbu milestones
   - Import all labels → Kanbu tags
   - Import all PRs → Kanbu PRs (read-only)
4. Webhook registration for real-time updates

### When Changing in GitHub (via Webhook)

1. GitHub sends webhook to Kanbu
2. Kanbu receives and validates
3. Update corresponding Kanbu entity
4. Log in sync history

### When Changing in Kanbu

1. User modifies task/milestone/etc.
2. Kanbu detects that project is GitHub-linked
3. Push change to GitHub API
4. Log in sync history

---

## UI/UX Considerations

### Visual Indicators

- **GitHub icon** for linked projects
- **Sync status indicator** (synced, pending, error)
- **"Open in GitHub" link** for all synced entities
- **Different color/badge** for GitHub vs local items

### Sync Controls

- **Manual sync button** - force sync now
- **Sync history** - view what has been synchronized
- **Conflict resolution UI** - for merge conflicts

---

## Future Extensions

### Phase 2: GitHub Projects (Boards)
- Sync with GitHub's own Project boards
- Column mapping (To Do → Backlog, etc.)

### Phase 3: GitHub Actions Integration
- See CI/CD status in Kanbu
- Trigger workflows from Kanbu

### Phase 4: Multi-Provider
- GitLab support
- Bitbucket support
- Azure DevOps support

---

## Summary

Kanbu is the **orchestration layer** on top of GitHub (and other providers). It adds value through:

1. **Workspaces** - overarching structure
2. **Project Groups** - combined insights
3. **Cross-project features** - dependencies, search, reports
4. **Better UI/UX** - for project management

The bi-directional sync ensures that:
- Data is never lost (GitHub backup)
- Everyone can work where they want
- No vendor lock-in
- Instant adoption possible

**The business case:**
> GitHub + Kanbu = better than both separately. Your data, your choice where you work.
