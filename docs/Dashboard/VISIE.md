# Dashboard Vision

## Version: 2.0.0
## Date: 2026-01-10
## Author: Robin Waslander

---

## Core Vision

> **The Dashboard is the user's cockpit - real-time, ACL-aware, and scalable from 1 to 100,000+ users.**

We implement "Claude's Planner" - an ideal dashboard design based on best practices from 10 PM tools - adapted to Kanbu's unique architecture:

- **Real-time multi-user** (not offline-first)
- **ACL-first** (every action, every menu item)
- **Docker + SaaS ready** (multi-server with Redis)
- **LDAP-ready** (future identity federation)

---

## Design Principles

### 1. Progressive Disclosure
Show only what's needed, when needed:
- Collapsed workspaces hide projects
- Sections expand on-demand
- Context menus reveal advanced actions

### 2. ACL-First Design
Every UI element respects permissions:
```typescript
// Pattern for ALL menu items
const { canSeeFeature, isLoading } = useDashboardFeatureAccess()

const filteredItems = items.filter(item =>
  isLoading || canSeeFeature(item.slug)
)
```

### 3. Real-Time by Default
All data updates are live:
- Task changes via Socket.io events
- Presence indicators (who is online)
- Typing/editing indicators
- Cursor sharing in boards

### 4. Keyboard-First
Everything accessible via keyboard:
- `Ctrl+K` - Command palette (already present)
- `Ctrl+/` - Toggle sidebar (already present)
- Arrow keys - Tree navigation (to build)
- `Enter` - Open selected item

### 5. 60-30-10 Rule
- **60% Content** - The real work (tasks, boards)
- **30% Navigation** - Sidebar, breadcrumbs
- **10% Chrome** - Header, controls

---

## Dashboard Structure

### Sidebar Hierarchy (Claude's Planner Model)

```
┌────────────────────────────┐
│ Workspace Switcher    [▼]  │  ← Quick switch (future)
│ ─────────────────────────  │
│ 🔍 Search         (⌘K)    │  ← Already present
├────────────────────────────┤
│ PERSONAL                   │
│ ├─ 🏠 Home                 │  ← Widget-based dashboard
│ ├─ 📥 Inbox           (3) │  ← Notifications + mentions
│ ├─ ✅ My Tasks       (12) │  ← Smart grouping
│ ├─ 📅 Today           (5) │  ← Focus view
│ └─ ⏰ Upcoming        (8) │  ← Coming up
├────────────────────────────┤
│ FAVORITES                  │
│ ├─ ⭐ Project Alpha       │  ← Pinned projects
│ └─ ⭐ Sprint Board        │  ← Cross-workspace
├────────────────────────────┤
│ WORKSPACES                 │
│ ▼ 🏢 Acme Corp            │  ← Collapsible
│   ├─ 📋 KANBU             │
│   │   ├─ 📋 Website       │
│   │   └─ 📋 API           │
│   ├─ 🐙 GITHUB            │
│   │   └─ 🐙 api-backend   │
│   └─ 📂 GROUPS            │
│       └─ 📂 Frontend Team │
│ ▶ 🏢 Side Projects        │  ← Collapsed
├────────────────────────────┤
│ 📝 Notes                   │  ← Sticky notes (present)
│ ⚙️ Settings                │  ← Profile link
└────────────────────────────┘
```

### The File System Paradigm

Navigation works like a file system - familiar to everyone:

```
📁 My Computer            →   📁 Dashboard
├── 📁 Documents ▼        →   ├── 🏢 Workspace A ▼
│   ├── 📄 file1.txt      →   │   ├── 📋 Project 1
│   └── 📄 file2.txt      →   │   └── 📋 Project 2
├── 📁 Pictures ▶         →   ├── 🏢 Workspace B ▶
└── 📁 Downloads ▶        →   └── 🏢 Workspace C ▶
```

### Visual Distinction

| Element | Icon | Color | ACL Required |
|---------|------|-------|--------------|
| Workspace | 🏢 Building | Neutral | R on workspace |
| Kanbu Project | 📋 Kanban | Blue | R on project |
| GitHub Project | 🐙 Octocat | Gray | R on project + GitHub feature |
| Project Group | 📂 Folder | Orange/Yellow | R on group |
| Favorite | ⭐ Star | Gold | User-level (no ACL) |

---

## Three Project Types

### 1. Kanbu Projects (📋)

Internal projects without external sync:
- Own structure and fields
- Fully Kanbu-managed
- Real-time collaboration

**Route:** `/workspace/:slug/project/:id/board`

### 2. GitHub Projects (🐙)

Linked to GitHub repository:
- Bi-directional issue sync
- PR/Commit tracking
- Milestone sync
- CI/CD status indicators

**Route:** `/workspace/:slug/github/:repoId/board`

### 3. Project Groups (📂)

Collection of projects (both types):
- Combined statistics
- Cross-project overview
- Portfolio management

**Route:** `/workspace/:slug/groups/:groupId`

---

## Content Areas

The content area adapts based on selection:

| Selection | Content | Features |
|-----------|---------|----------|
| **Home** | Widget-based dashboard | Customizable, drag-drop widgets |
| **Inbox** | Notifications + mentions | Filters, mark read, bulk actions |
| **My Tasks** | Task list | Smart grouping, filters |
| **Today** | Focus view | Only today + overdue |
| **Workspace** | Overview + stats | Recent activity, quick actions |
| **Kanbu Project** | Board/List/Calendar | Real-time, presence |
| **GitHub Project** | GitHub board | Sync status, CI indicators |
| **Project Group** | Combined stats | Portfolio view |

---

## State Management

### Expand/Collapse State

Stored in localStorage via Zustand store:

```typescript
// stores/dashboardTreeStore.ts
interface DashboardTreeState {
  expandedWorkspaces: Set<number>
  expandedSections: Map<number, Set<'kanbu' | 'github' | 'groups'>>
  favorites: number[] // project IDs

  toggleWorkspace: (id: number) => void
  toggleSection: (workspaceId: number, section: string) => void
  toggleFavorite: (projectId: number) => void
}

// localStorage key
const STORAGE_KEY = 'kanbu_dashboard_tree_state'
```

### Real-Time Sync

Tree state is user-local, but project data is real-time:

```typescript
// Project changes via Socket.io
useSocket({
  onProjectCreated: (payload) => invalidateQueries(['workspace.getHierarchy']),
  onProjectUpdated: (payload) => updateProjectInCache(payload),
  onProjectDeleted: (payload) => removeProjectFromCache(payload),
})
```

---

## ACL Integration

### Dashboard Features

Each sidebar item has a feature slug:

```typescript
// Dashboard feature slugs
const DASHBOARD_FEATURES = {
  home: 'dashboard:home',           // R on dashboard
  inbox: 'dashboard:inbox',         // R on dashboard
  myTasks: 'dashboard:my-tasks',    // R on dashboard (already present)
  today: 'dashboard:today',         // R on dashboard
  upcoming: 'dashboard:upcoming',   // R on dashboard
  favorites: 'dashboard:favorites', // User-level (always accessible)
  notes: 'dashboard:notes',         // R on dashboard (already present)
}
```

### Workspace/Project Visibility

Only show what user may see:

```typescript
// Sidebar filtering
const workspaces = await trpc.workspace.list.query()
// ^ Backend already filters on ACL - only workspaces with R permission

const projects = await trpc.project.list.query({ workspaceId })
// ^ Backend already filters on ACL - only projects with R permission
```

---

## API Requirements

### New Endpoints

| Endpoint | Description | ACL |
|----------|-------------|-----|
| `dashboard.getHierarchy` | All workspaces + projects + groups | R per resource |
| `dashboard.getStats` | Personal statistics | R on dashboard |
| `favorites.list` | User favorites | User-level |
| `favorites.add` | Add favorite | User-level |
| `favorites.remove` | Remove favorite | User-level |
| `projectGroup.list` | Groups in workspace | R on workspace |
| `projectGroup.getStats` | Combined stats | R on group |

### Existing Endpoints (Extend)

| Endpoint | Change |
|----------|--------|
| `workspace.list` | Already correct - returns visible workspaces |
| `project.list` | Already correct - filters on ACL |
| `github.listWorkspaceRepos` | Needed for GitHub section |

---

## Component Architecture

### New Components

```
components/
├── dashboard/
│   ├── DashboardSidebar.tsx        # REFACTOR: Current to tree-based
│   ├── WorkspaceTree.tsx           # Collapsible workspace node
│   ├── ProjectNode.tsx             # Project item in tree
│   ├── GitHubProjectNode.tsx       # GitHub project item
│   ├── ProjectGroupNode.tsx        # Group item
│   ├── TreeSection.tsx             # KANBU/GITHUB/GROUPS section
│   ├── FavoritesSection.tsx        # Starred projects
│   ├── PersonalSection.tsx         # Home/Inbox/My Tasks
│   └── TreeContextMenu.tsx         # Right-click menu
│
├── shared/
│   ├── CollapsiblePanel.tsx        # Generic expand/collapse
│   ├── ProjectTypeIcon.tsx         # Kanbu vs GitHub icon
│   └── TreeView.tsx                # Generic tree component
│
└── stores/
    └── dashboardTreeStore.ts       # Zustand store for tree state
```

### Pattern: ACL-Aware Sidebar Item

```typescript
interface SidebarItem {
  label: string
  path: string
  icon: React.ComponentType
  slug?: FeatureSlug  // For ACL check
  badge?: number      // Notification count
}

function SidebarNavItem({ item, collapsed }: Props) {
  const { canSeeFeature, isLoading } = useDashboardFeatureAccess()

  // Hide if no access
  if (!isLoading && item.slug && !canSeeFeature(item.slug)) {
    return null
  }

  return (
    <NavLink to={item.path}>
      <item.icon />
      {!collapsed && <span>{item.label}</span>}
      {item.badge && <Badge>{item.badge}</Badge>}
    </NavLink>
  )
}
```

---

## Keyboard Shortcuts

### Existing (in development)

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+K` | Command palette | 🔶 Basic |
| `Ctrl+/` | Toggle sidebar | 🔶 Working |
| `?` | Shortcuts modal | 🔶 Basic |

### To Add (Tree-specific)

| Shortcut | Action | Phase |
|----------|--------|-------|
| `↑` / `↓` | Navigate items | 4 |
| `←` / `→` | Collapse / Expand | 4 |
| `Enter` | Open selected | 4 |
| `Space` | Toggle expand | 4 |
| `/` | Focus search | 4 |
| `g h` | Go to Home | 4 |
| `g t` | Go to My Tasks | 4 |

---

## Context Menus

### Workspace Context Menu

| Action | ACL Required |
|--------|--------------|
| New Kanbu Project | W on workspace |
| Link GitHub Repository | W + GitHub feature |
| New Project Group | W on workspace |
| Workspace Settings | P on workspace |

### Project Context Menu

| Action | ACL Required |
|--------|--------------|
| Open Board | R on project |
| Open in new tab | R on project |
| Add to Favorites | User-level |
| Add to Group | W on group |
| Settings | P on project |
| Archive | D on project |

---

## Implementation Phases

See [ROADMAP.md](./ROADMAP.md) for the complete, detailed implementation guide.

### Overview

```
PHASE 1: Foundation
├── 1.1 Tree Data API
├── 1.2 Zustand Store
└── 1.3 Basic Tree Rendering

PHASE 2: Core Tree
├── 2.1 Workspace Nodes
├── 2.2 Project Nodes (Kanbu)
└── 2.3 Section Collapse

PHASE 3: GitHub Integration
├── 3.1 GitHub Section
├── 3.2 GitHub Project Nodes
└── 3.3 Sync Status Indicators

PHASE 4: Project Groups
├── 4.1 Groups API
├── 4.2 Groups Section
└── 4.3 Group Stats

PHASE 5: Personal Section
├── 5.1 Home (Widgets)
├── 5.2 Inbox (Notifications)
├── 5.3 Smart Task Grouping
└── 5.4 Today/Upcoming

PHASE 6: Favorites
├── 6.1 Favorites API
├── 6.2 Star/Unstar UI
└── 6.3 Favorites Section

PHASE 7: Polish & UX
├── 7.1 Keyboard Navigation
├── 7.2 Context Menus
├── 7.3 Search/Filter
└── 7.4 Drag & Drop
```

---

## What We DON'T Do

| Feature | Reason |
|---------|--------|
| Offline-first | Conflicts with real-time multi-user |
| Local-first data | Redis adapter for multi-server SaaS |
| Custom icon library | Lucide/Heroicons already in use |
| New router | React Router already integrated |
| GraphQL | tRPC is the standard |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Navigation to project | < 2 clicks |
| Sidebar initial load | < 500ms |
| Expand/collapse | < 100ms perceived |
| Tree keyboard navigation | 100% items reachable |
| ACL response time | < 50ms (cached) |

---

## References

- [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) - Claude's Planner full design
- [CONCURRENTIE-ANALYSE.md](./CONCURRENTIE-ANALYSE.md) - Analysis of 10 PM tools
- [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) - Current implementation analysis
- [ROADMAP.md](./ROADMAP.md) - Detailed implementation phases
- [../Github-projects/VISIE.md](../Github-projects/VISIE.md) - GitHub integration vision
