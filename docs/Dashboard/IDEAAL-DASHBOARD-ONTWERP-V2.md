# Ideal Dashboard Design v2

## Version: 2.0.0

## Date: 2026-01-10

## Based on: KANBU-STRUCTUUR.md (Container Hierarchy)

---

## Introduction

This document describes the ideal dashboard design for Kanbu, **aligned with the container hierarchy**:

```
Kanbu (Root) → Workspaces (containers) → Projects (sub-containers)
```

Each container has:

- Own **members** (users member of that container)
- Own **modules** (features specific to that level)
- Own **sidebar** (navigation for that level)

**Core Principle:**

> The UI adapts based on the container the user is in. No complex trees - each container has its own page and navigation.

---

## Part 1: User Analysis (Role-based)

### 1.1 User Types per Container Level

| Role               | Kanbu Equivalent | Sees                      | Container Scope       |
| ------------------ | ---------------- | ------------------------- | --------------------- |
| **CEO Holding**    | Domain Admin     | ALL workspaces            | Kanbu Root            |
| **CEO Subsidiary** | Workspace Owner  | Own workspace(s)          | 1+ Workspaces         |
| **Manager**        | Project Manager  | Projects with permissions | Specific Projects     |
| **Employee**       | Member/Viewer    | Assigned projects         | Specific Projects     |
| **Guest**          | External         | Limited projects          | 1 Project (read-only) |

### 1.2 Cognitive Load per Role

```
Domain Admin:  ████████░░ (80%) - Cross-workspace overview
Workspace Owner: ██████░░░░ (60%) - Workspace + projects
Project Manager: ████░░░░░░ (40%) - Project details
Member:        ██░░░░░░░░ (20%) - Only tasks
```

**Implication:** Dashboard (Personal) only aggregates what's relevant for your role.

### 1.3 What does each role see?

**Domain Admin (CEO Holding):**

```
Dashboard:
├── My Tasks (from ALL projects)
├── Favorites (projects from ALL workspaces)
└── Overview (stats over EVERYTHING)

Workspaces Page:
└── All workspaces in the system
```

**Workspace Owner (CEO Subsidiary):**

```
Dashboard:
├── My Tasks (from own workspace projects)
├── Favorites (projects from own workspace)
└── Overview (stats over own scope)

Workspaces Page:
└── Only own workspace(s)
```

**Member (Employee):**

```
Dashboard:
├── My Tasks (from assigned projects)
├── Favorites (assigned projects)
└── Overview (personal stats)

Workspaces Page:
└── Workspaces where member of
```

---

## Part 2: Information Architecture (Container-based)

### 2.1 Container Hierarchy

```
Level 0: Global (always visible)
├── Header
│   ├── Logo/Home link
│   ├── Search (⌘K)
│   ├── Notifications
│   └── Profile/Settings
│
└── Breadcrumbs (context indicator)
    └── Kanbu > Workspace X > Project Y

Level 1: Container Sidebar
├── Personal (DashboardSidebar)
├── Workspace (WorkspaceSidebar)
└── Project (ProjectSidebar)

Level 2: Container Content
├── Container-specific pages
└── Container-specific modules

Level 3: Details (panels/modals)
├── Task detail
├── Settings
└── Member management
```

### 2.2 URL as Container Indicator

```
/dashboard              → Personal container → DashboardSidebar
/dashboard/tasks        → Personal container → DashboardSidebar
/dashboard/notes        → Personal container → DashboardSidebar

/workspaces             → Workspaces list   → Minimal/no sidebar

/workspace/:slug        → Workspace container → WorkspaceSidebar
/workspace/:slug/wiki   → Workspace container → WorkspaceSidebar
/workspace/:slug/members→ Workspace container → WorkspaceSidebar

/workspace/:slug/project/:id       → Project container → ProjectSidebar
/workspace/:slug/project/:id/board → Project container → ProjectSidebar
/workspace/:slug/project/:id/github→ Project container → ProjectSidebar
```

### 2.3 Progressive Disclosure per Container

**Personal Level:**

```
First glance:  Total tasks, deadlines today
Hover:         Per-project breakdown
Click:         To specific project
```

**Workspace Level:**

```
First glance:  Project cards with status
Hover:         Task count, last activity
Click:         To project board
```

**Project Level:**

```
First glance:  Board with columns
Hover:         Task assignee, priority
Click:         Task detail panel
```

---

## Part 3: Layout Architecture

### 3.1 The Container-Aware Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                       [Search] [Notif] [👤]│
│ ─────────────────────────────────────────────────────────────── │
│ Breadcrumb: Kanbu > Workspace X > Project Y                      │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  CONTAINER   │              CONTAINER CONTENT                   │
│  SIDEBAR     │                                                  │
│              │  ┌─────────────────────────────────────────────┐ │
│  (Changes    │  │  CONTEXTUAL HEADER                          │ │
│   based on   │  │  (Actions for current container)            │ │
│   current    │  ├─────────────────────────────────────────────┤ │
│   container) │  │                                             │ │
│              │  │  PRIMARY CONTENT                            │ │
│              │  │                                             │ │
│              │  │  (Container-specific view)                  │ │
│              │  │                                             │ │
│              │  └─────────────────────────────────────────────┘ │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### 3.2 Sidebar Switching Logic

```typescript
function getSidebarForRoute(pathname: string): SidebarComponent {
  // Project level - most specific first
  if (pathname.match(/^\/workspace\/[^/]+\/project\//)) {
    return ProjectSidebar;
  }

  // Workspace level
  if (pathname.match(/^\/workspace\/[^/]+/)) {
    return WorkspaceSidebar;
  }

  // Workspaces overview - minimal or no sidebar
  if (pathname === '/workspaces') {
    return null; // or MinimalSidebar
  }

  // Personal/Dashboard level
  return DashboardSidebar;
}
```

### 3.3 Responsive Breakpoints

| Breakpoint            | Sidebar      | Content    | Detail Panel |
| --------------------- | ------------ | ---------- | ------------ |
| Desktop XL (>1440px)  | Full (280px) | Wide       | Inline right |
| Desktop (1024-1440px) | Full (240px) | Standard   | Overlay      |
| Tablet (768-1024px)   | Icons (60px) | Full width | Overlay      |
| Mobile (<768px)       | Drawer       | Full width | Full screen  |

---

## Part 4: Sidebar Design (Container-Specific)

### 4.1 DashboardSidebar (Personal Level)

This is the sidebar for `/dashboard/*` routes.

```
┌────────────────────────┐
│                        │
│ PERSONAL               │  ← Cross-container features
│ ├─ 🏠 Overview         │
│ ├─ ✅ My Tasks    (12) │  ← Tasks from ALL projects
│ ├─ 📋 My Subtasks  (5) │
│ └─ 📥 Inbox        (3) │  ← Notifications from EVERYTHING
│                        │
│ ────────────────────   │
│                        │
│ FAVORITES              │  ← Shortcuts (cross-container)
│ ├─ ⭐ Project Alpha    │  ← From Workspace A
│ ├─ ⭐ Project Beta     │  ← From Workspace B
│ └─ [+ Add favorite]    │
│                        │
│ ────────────────────   │
│                        │
│ NAVIGATION             │
│ └─ 🏢 Workspaces       │  ← To workspaces list
│                        │
│ ────────────────────   │
│                        │
│ 📝 Notes               │  ← Personal notes
│                        │
└────────────────────────┘
```

**Characteristics:**

- Favorites are **cross-container** (projects from different workspaces)
- My Tasks aggregates from **all** accessible projects
- Link to Workspaces to go to workspace level

### 4.2 WorkspaceSidebar (Workspace Level)

This is the sidebar for `/workspace/:slug/*` routes (except project routes).

```
┌────────────────────────┐
│                        │
│ ← Back to Workspaces   │  ← Back to container level above
│                        │
│ ────────────────────   │
│                        │
│ WORKSPACE: ACME CORP   │  ← Current container name
│                        │
│ ────────────────────   │
│                        │
│ MODULES                │
│ ├─ 📁 Projects         │  ← Workspace homepage
│ ├─ 📂 Groups           │  ← Project categorization
│ ├─ 📖 Wiki             │  ← Workspace knowledge base
│ ├─ 👥 Members          │  ← Workspace members
│ ├─ 📊 Statistics       │  ← Workspace stats
│ └─ ⚙️ Settings         │  ← Workspace config
│                        │
└────────────────────────┘
```

**Characteristics:**

- "Back" link to Workspaces overview
- Only modules of **this workspace**
- No projects in sidebar (they're in content area)

### 4.3 ProjectSidebar (Project Level)

This is the sidebar for `/workspace/:slug/project/:id/*` routes.

```
┌────────────────────────┐
│                        │
│ ← Back to Projects     │  ← Back to workspace
│                        │
│ ────────────────────   │
│                        │
│ PROJECT: WEBSITE       │  ← Current container name
│ [KANBU-123]            │  ← Project identifier
│                        │
│ ────────────────────   │
│                        │
│ VIEWS                  │
│ ├─ 📋 Board            │  ← Kanban
│ ├─ 📄 List             │  ← Task list
│ ├─ 📅 Calendar         │  ← Calendar
│ └─ 📈 Timeline         │  ← Gantt
│                        │
│ ────────────────────   │
│                        │
│ PLANNING               │
│ ├─ 🏃 Sprints          │
│ ├─ 🎯 Milestones       │
│ └─ 📊 Analytics        │
│                        │
│ ────────────────────   │
│                        │
│ MANAGE                 │
│ ├─ 📝 Details          │  ← Project info/edit
│ ├─ 👥 Members          │  ← Project members
│ ├─ 🐙 GitHub           │  ← Repo integration
│ └─ ⚙️ Settings         │  ← Project config
│                        │
└────────────────────────┘
```

**Characteristics:**

- "Back" link to Workspace projects
- Only modules of **this project**
- Sections grouped by function (Views, Planning, Manage)

### 4.4 Sidebar States

**Expanded (280px):**

- Full labels
- Badges visible
- Section headers

**Collapsed (60px):**

- Only icons
- Tooltips on hover
- Flyout menus for sections

**Hidden (0px):**

- Focus mode (⌘/)
- Maximum content space

---

## Part 5: Home/Overview Dashboard (Personal Level)

### 5.1 Widget-Based Personal Dashboard

This is `/dashboard` - the personal hub that aggregates **cross-container**.

```
┌────────────────────────────────────────────────────────────────┐
│  Good morning, Robin!                               Jan 10, 2026│
│  You have 5 tasks due today across 3 projects                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  📊 MY STATS        │  │  📅 TODAY           │              │
│  │  ───────────────    │  │  ───────────────    │              │
│  │  Active Tasks: 12   │  │  ☐ Review PR #123   │  [Website]   │
│  │  Across: 4 projects │  │  ☐ Team standup     │  [Internal]  │
│  │  Workspaces: 2      │  │  ☐ Deploy v2.1      │  [API]       │
│  │                     │  │  ☐ Write docs       │  [Docs]      │
│  │  ████████░░ 80%     │  │  ☐ Client call      │  [External]  │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │  ⏰ UPCOMING        │  │  📈 ACTIVITY        │              │
│  │  ───────────────    │  │  ───────────────    │              │
│  │  Tomorrow (3)       │  │  [Sparkline chart]  │              │
│  │  This Week (8)      │  │                     │              │
│  │  Overdue (2) ⚠️     │  │  All workspaces     │              │
│  │                     │  │  Tasks: 47 this week│              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                │
│  ┌──────────────────────────────────────────────┐              │
│  │  ⭐ FAVORITES                                 │              │
│  │  ─────────────────────────────────────────   │              │
│  │  [Project A]   [Project B]   [Project C]     │              │
│  │  Workspace 1   Workspace 2   Workspace 1     │              │
│  └──────────────────────────────────────────────┘              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Widget Types for Personal Level

| Widget        | Data Source         | Aggregation            |
| ------------- | ------------------- | ---------------------- |
| **Stats**     | All projects        | Cross-container counts |
| **Today**     | All tasks due today | Per-project labels     |
| **Upcoming**  | All future tasks    | Grouped by date        |
| **Activity**  | All workspaces      | Recent activity stream |
| **Favorites** | User favorites      | Quick access           |

### 5.3 Personalization per Role

```yaml
member:
  widgets: [today, upcoming, favorites]
  focus: 'My tasks'

manager:
  widgets: [today, team_overview, activity, favorites]
  focus: 'Team progress'

workspace_owner:
  widgets: [workspace_stats, projects_overview, activity]
  focus: 'Workspace health'

domain_admin:
  widgets: [all_workspaces_stats, system_health, activity]
  focus: 'Organization overview'
```

---

## Part 6: Workspaces Page

### 6.1 Workspaces Overview (`/workspaces`)

This is the list of all workspaces the user has access to.

```
┌────────────────────────────────────────────────────────────────┐
│  Workspaces                                    [+ New Workspace]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Search workspaces...]                      [Filter ▼] [Sort ▼]│
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🏢 TechCorp BV                                    OWNER    ││
│  │    12 projects • 8 members • Last activity: 2h ago         ││
│  │    ████████████████░░░░ 80% tasks complete                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🏢 DataFlow BV                                    MANAGER  ││
│  │    5 projects • 4 members • Last activity: 1d ago          ││
│  │    ████████████░░░░░░░░ 60% tasks complete                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🏢 Side Projects                                  MEMBER   ││
│  │    3 projects • 2 members • Last activity: 3d ago          ││
│  │    ██████░░░░░░░░░░░░░░ 30% tasks complete                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 Sidebar Option for Workspaces

Two options:

**Option A: No sidebar**

- Full width for workspace cards
- Cleaner UI
- Back via breadcrumbs or logo

**Option B: Minimal sidebar**

```
┌────────────────────┐
│                    │
│ 🏠 Dashboard       │  ← Back to personal
│                    │
│ ────────────────   │
│                    │
│ 🏢 All Workspaces  │  ← Current page
│                    │
│ ────────────────   │
│                    │
│ [Filter options]   │
│ ☐ Show archived    │
│ ☐ Only owned       │
│                    │
└────────────────────┘
```

---

## Part 7: Workspace Page

### 7.1 Workspace Homepage (`/workspace/:slug`)

The workspace homepage shows the projects.

```
┌────────────────────────────────────────────────────────────────┐
│  TechCorp BV                              [+ New Project] [⚙️]  │
│  12 projects • 8 members                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Search projects...]                       [Filter ▼] [View ▼] │
│                                                                │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
│  │ 📋 Website Redesign         │  │ 📋 Mobile App           │  │
│  │ KANBU-WEB                   │  │ KANBU-MOB               │  │
│  │                             │  │                         │  │
│  │ 24 tasks • 3 members        │  │ 18 tasks • 2 members    │  │
│  │ 🐙 GitHub linked            │  │                         │  │
│  │ ████████░░ 80%              │  │ ██████░░░░ 60%          │  │
│  │                    [⚙️]      │  │                    [⚙️]  │  │
│  └─────────────────────────────┘  └─────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐  │
│  │ 📋 API Backend              │  │ 📋 Documentation        │  │
│  │ KANBU-API                   │  │ KANBU-DOC               │  │
│  │                             │  │                         │  │
│  │ 42 tasks • 4 members        │  │ 8 tasks • 1 member      │  │
│  │ 🐙 GitHub linked ✓          │  │                         │  │
│  │ ██████████░░░░░░ 65%        │  │ ████████████░░ 85%      │  │
│  │                    [⚙️]      │  │                    [⚙️]  │  │
│  └─────────────────────────────┘  └─────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 Workspace Modules

Accessible via WorkspaceSidebar:

| Module         | URL                         | Description              |
| -------------- | --------------------------- | ------------------------ |
| **Projects**   | `/workspace/:slug`          | Project cards (homepage) |
| **Groups**     | `/workspace/:slug/groups`   | Project categorization   |
| **Wiki**       | `/workspace/:slug/wiki`     | Knowledge base           |
| **Members**    | `/workspace/:slug/members`  | Member management        |
| **Statistics** | `/workspace/:slug/stats`    | Workspace analytics      |
| **Settings**   | `/workspace/:slug/settings` | Configuration            |

---

## Part 8: Project Page

### 8.1 Project Board (`/workspace/:slug/project/:id/board`)

```
┌────────────────────────────────────────────────────────────────┐
│  Website Redesign                        [+ Task] [Filter] [⚙️] │
│  KANBU-WEB • 24 tasks • Sprint 3                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  TODO (6)        IN PROGRESS (4)    REVIEW (2)    DONE (12)    │
│  ──────────      ───────────────    ──────────    ─────────    │
│  ┌──────────┐    ┌──────────┐       ┌──────────┐  ┌──────────┐ │
│  │ KANBU-45 │    │ KANBU-42 │       │ KANBU-38 │  │ KANBU-35 │ │
│  │ Homepage │    │ Navbar   │       │ Footer   │  │ Logo     │ │
│  │          │    │          │       │          │  │          │ │
│  │ 🔴 High  │    │ 🟡 Med   │       │ 🟢 Low   │  │ ✓ Done   │ │
│  │ @Sarah   │    │ @Mike    │       │ @Robin   │  │ @Sarah   │ │
│  └──────────┘    └──────────┘       └──────────┘  └──────────┘ │
│  ...             ...                              [+11 more]   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Project Modules

Accessible via ProjectSidebar:

| Category     | Module     | URL                       |
| ------------ | ---------- | ------------------------- |
| **Views**    | Board      | `/project/:id/board`      |
|              | List       | `/project/:id/list`       |
|              | Calendar   | `/project/:id/calendar`   |
|              | Timeline   | `/project/:id/timeline`   |
| **Planning** | Sprints    | `/project/:id/sprints`    |
|              | Milestones | `/project/:id/milestones` |
|              | Analytics  | `/project/:id/analytics`  |
| **Manage**   | Details    | `/project/:id/details`    |
|              | Members    | `/project/:id/members`    |
|              | GitHub     | `/project/:id/github`     |
|              | Settings   | `/project/:id/settings`   |

---

## Part 9: My Tasks (Personal Level)

### 9.1 Cross-Container Task Aggregation

`/dashboard/tasks` shows tasks from **all** projects the user has access to.

```
┌────────────────────────────────────────────────────────────────┐
│  My Tasks                                    [Filter ▼] [Sort ▼]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  📍 PINNED                                                     │
│  ─────────────────────────────────────────────────────────     │
│  ☐ 🔴 Fix production bug      Today    [API]      TechCorp    │
│                                                                │
│  📅 TODAY                                                      │
│  ─────────────────────────────────────────────────────────     │
│  ☐ 🟡 Review Sarah's PR       Today    [Website]  TechCorp    │
│  ☐ 🟢 Update documentation    Today    [Docs]     DataFlow    │
│  ☑ 🟢 Morning standup         Done     [Internal] TechCorp    │
│                                                                │
│  📆 THIS WEEK                                                  │
│  ─────────────────────────────────────────────────────────     │
│  ☐ 🟡 Implement search        Wed      [Website]  TechCorp    │
│  ☐ 🟡 Write test cases        Thu      [API]      TechCorp    │
│  ☐ 🟢 Client presentation     Fri      [External] DataFlow    │
│                                                                │
│  ⚠️ OVERDUE                                                    │
│  ─────────────────────────────────────────────────────────     │
│  ☐ 🔴 Submit report           2d ago   [Admin]    Internal    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 9.2 Filters for My Tasks

```
Workspace:  [All] [TechCorp] [DataFlow] [Side Projects]
Project:    [All] [Website] [API] [Mobile] ...
Priority:   [All] [Urgent] [High] [Medium] [Low]
Due Date:   [All] [Today] [This Week] [Overdue] [No Date]
Status:     [Open] [In Progress] [Done] [All]
```

**Key insight:** My Tasks is the only place where tasks from multiple workspaces/projects come together. This is a **Personal level** feature.

---

## Part 10: Favorites (Personal Level)

### 10.1 Cross-Container Favorites

Favorites are shortcuts to **projects from different workspaces**.

```
┌────────────────────────────────────────────────────────────────┐
│  FAVORITES in DashboardSidebar                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ⭐ Website Redesign      [TechCorp]                           │
│  ⭐ Mobile App            [TechCorp]                           │
│  ⭐ Analytics Dashboard   [DataFlow]                           │
│  ⭐ Personal Blog         [Side Projects]                      │
│                                                                │
│  [+ Add favorite]                                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 10.2 Favorite Actions

| Action      | Where            | How                  |
| ----------- | ---------------- | -------------------- |
| **Add**     | Project card     | Star icon click      |
| **Add**     | ProjectSidebar   | Star in header       |
| **Remove**  | DashboardSidebar | Right-click → Remove |
| **Reorder** | DashboardSidebar | Drag & drop          |

### 10.3 Why Personal Level?

- User A can favorite project X
- User B doesn't have to favorite project X
- Favorites are **personal**, not shared
- They aggregate projects from **different containers**

---

## Part 11: Keyboard Navigation (Container-Aware)

### 11.1 Global Shortcuts (Always)

| Shortcut | Action          |
| -------- | --------------- |
| `⌘K`     | Command palette |
| `⌘/`     | Toggle sidebar  |
| `⌘,`     | Settings        |
| `⌘?`     | Shortcuts help  |

### 11.2 Navigation Shortcuts

| Shortcut | Action           | Goes to            |
| -------- | ---------------- | ------------------ |
| `G H`    | Go to Home       | `/dashboard`       |
| `G T`    | Go to Tasks      | `/dashboard/tasks` |
| `G W`    | Go to Workspaces | `/workspaces`      |
| `G N`    | Go to Notes      | `/dashboard/notes` |

### 11.3 Container-Specific Shortcuts

**In Workspace:**
| Shortcut | Action |
|----------|--------|
| `G P` | Go to Projects |
| `G M` | Go to Members |
| `G S` | Go to Settings |

**In Project:**
| Shortcut | Action |
|----------|--------|
| `G B` | Go to Board |
| `G L` | Go to List |
| `G C` | Go to Calendar |

---

## Part 12: Notifications (Cross-Container)

### 12.1 Inbox as Personal Feature

`/dashboard/inbox` aggregates notifications from **all** containers.

```
┌────────────────────────────────────────────────────────────────┐
│  Inbox                                     [Mark All Read] [⚙️] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  TODAY                                                         │
│  ─────────────────────────────────────────────────────────     │
│  ● Sarah mentioned you in "API Design"                         │
│    Project: API Backend • Workspace: TechCorp                  │
│    [View] [Reply]                                              │
│                                                                │
│  ● You were assigned "Fix login bug"                           │
│    Project: Website • Workspace: TechCorp                      │
│    [View] [Accept]                                             │
│                                                                │
│  ○ New member joined DataFlow workspace                        │
│    Workspace: DataFlow                                         │
│    [View]                                                      │
│                                                                │
│  YESTERDAY                                                     │
│  ─────────────────────────────────────────────────────────     │
│  ○ Sprint 3 completed in Website project                       │
│    Project: Website • Workspace: TechCorp                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 12.2 Notification Sources per Container Level

| Source              | Container Level | Example                       |
| ------------------- | --------------- | ----------------------------- |
| **@mention**        | Project         | "Sarah mentioned you in task" |
| **Assignment**      | Project         | "You were assigned task X"    |
| **Comment**         | Project         | "New comment on your task"    |
| **Status change**   | Project         | "Task moved to Done"          |
| **Member joined**   | Workspace       | "John joined the workspace"   |
| **Project created** | Workspace       | "New project: Mobile App"     |
| **System**          | Kanbu Root      | "New feature available"       |

---

## Part 13: Search (Container-Scoped)

### 13.1 Global Search (⌘K)

Searches across **all** accessible containers.

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 Search everything...                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Searching for: "login bug"                                    │
│                                                                │
│  TASKS                                                         │
│  ├─ 🔴 Fix login bug on mobile     [Website]    TechCorp      │
│  ├─ 🟢 Login page redesign         [Website]    TechCorp      │
│  └─ 🟡 Login timeout issue         [API]        DataFlow      │
│                                                                │
│  PROJECTS                                                      │
│  └─ 📁 Authentication System       TechCorp                   │
│                                                                │
│  WORKSPACES                                                    │
│  └─ (no results)                                               │
│                                                                │
│  ─────────────────────────────────────────────────────────     │
│  Scope: [All ▼] [Tasks] [Projects] [Workspaces] [Wiki]         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 13.2 Container-Scoped Search

| Where          | Scope      | Searches in           |
| -------------- | ---------- | --------------------- |
| Global (⌘K)    | Everything | All containers        |
| Workspace page | Workspace  | Projects in workspace |
| Project page   | Project    | Tasks in project      |
| Wiki page      | Wiki       | Wiki pages            |

---

## Part 14: ACL Integration

### 14.1 Visibility per Role

The UI **automatically filters** based on ACL:

```typescript
// What does the user see?
const visibleWorkspaces = workspaces.filter((ws) => userHasPermission(user, ws, 'READ'));

const visibleProjects = projects.filter((proj) => userHasPermission(user, proj, 'READ'));

// Sidebar modules
const visibleModules = modules.filter((mod) =>
  mod.requiredPermission ? userHasPermission(user, container, mod.requiredPermission) : true
);
```

### 14.2 UI Feedback for Permissions

```
┌────────────────────────────────────────────────────────────────┐
│  ProjectSidebar                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  VIEWS (always visible with READ)                              │
│  ├─ 📋 Board                                                   │
│  ├─ 📄 List                                                    │
│  └─ 📅 Calendar                                                │
│                                                                │
│  MANAGE (only with WRITE/MANAGE_PERMISSIONS)                   │
│  ├─ 👥 Members          ← Only if canManageMembers             │
│  └─ ⚙️ Settings         ← Only if canManageSettings            │
│                                                                │
│  No access to Settings?                                        │
│  → Don't show module (not grayed out)                          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Part 15: Component Checklist (Per Container Level)

### 15.1 Personal Level Components

```
PERSONAL (DashboardSidebar + /dashboard/*)
├─ [x] DashboardSidebar
├─ [ ] Dashboard Overview (widgets)
├─ [x] My Tasks page
├─ [x] My Subtasks page
├─ [ ] Inbox page
├─ [x] Notes page
├─ [ ] Favorites section
└─ [ ] Personal settings
```

### 15.2 Workspace Level Components

```
WORKSPACE (WorkspaceSidebar + /workspace/:slug/*)
├─ [ ] WorkspaceSidebar
├─ [x] Projects page (cards)
├─ [ ] Groups page
├─ [ ] Wiki module
├─ [ ] Members page
├─ [ ] Statistics page
└─ [ ] Settings page
```

### 15.3 Project Level Components

```
PROJECT (ProjectSidebar + /workspace/:slug/project/:id/*)
├─ [x] ProjectSidebar
├─ [x] Board view
├─ [x] List view
├─ [ ] Calendar view
├─ [ ] Timeline view
├─ [ ] Sprints page
├─ [ ] Milestones page
├─ [ ] Analytics page
├─ [x] Details page
├─ [ ] Members page
├─ [x] GitHub integration
└─ [x] Settings page
```

---

## Part 16: Conclusion

### The Container-Aware Golden Rules

1. **Each container has own members** - Users can be member at multiple levels

2. **Each container has own modules** - No workspace modules in project sidebar

3. **Sidebar adapts** - Route determines which sidebar is shown

4. **Personal is cross-container** - My Tasks, Favorites, Inbox aggregate over everything

5. **ACL determines visibility** - Not grayed out, but don't show

6. **No tree in sidebar** - Containers are shown on their own pages

7. **Back links for navigation** - Clear way back to parent container

8. **Breadcrumbs for context** - Always know where you are

### The Ultimate Test

> Does the user immediately understand which container level they're in?
> Can they navigate between containers without confusion?
> Do they only see what's relevant for their role and current container?
> Does the aggregation (My Tasks, Favorites) work correctly cross-container?

If all these questions are "yes", the container-aware UI is successful.

---

## References

- [KANBU-STRUCTUUR.md](./KANBU-STRUCTUUR.md) - Container hierarchy definition
- [ROADMAP.md](./ROADMAP.md) - Implementation roadmap
- [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) - Original version (v1)
