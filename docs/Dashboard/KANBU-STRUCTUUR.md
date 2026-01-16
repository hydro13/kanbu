# Kanbu Container Structure

## Version: 1.1.0
## Date: 2026-01-10

---

## ACL Model (Security Groups)

### Core Principle: Everything is an Object

In Kanbu, **literally everything** is an object that can have ACL permissions:

```
Kanbu (root)
├── System
│   └── Administration         ← Object with ACL
├── Dashboard
│   └── Features
│       ├── Overview           ← Object with ACL
│       ├── My Tasks           ← Object with ACL
│       ├── My Subtasks        ← Object with ACL
│       └── My Workspaces      ← Object with ACL
├── Profile                    ← Object with ACL
└── Workspaces
    ├── GenX                   ← Object with ACL
    │   └── Projects
    │       └── Website        ← Object with ACL
    ├── Mblock BV              ← Object with ACL
    └── Private                ← Object with ACL
```

**Objects are:** Workspaces, Projects, Menus, Menu items, Functions, Pages, Actions, Features, etc.

### RWXDP Permissions (Filesystem-style)

| Permission | Meaning |
|------------|---------|
| **R** | Read - View/access |
| **W** | Write - Modify/edit |
| **X** | Execute - Run/use |
| **D** | Delete - Remove |
| **P** | Permissions - Manage ACL |

### Security Groups

All roles are **security groups**. Users get permissions through:

1. **Direct on object** - User gets permissions directly on an object
2. **Via Security Group** - User is member of a group that has permissions

```
Security Groups:
├── Domain Admins              → Permissions on EVERYTHING
├── Workspace-GenX-Admin       → Admin permissions on GenX
├── Workspace-GenX             → Member permissions on GenX
├── Workspace-Mblock-Admin     → Admin permissions on Mblock
├── Workspace-Mblock           → Member permissions on Mblock
├── Project-Website-Admin      → Admin permissions on Website project
├── Project-Website            → Member permissions on Website project
└── ... etc
```

### Permission Inheritance (Downward)

Permissions work **downward** in the hierarchy:

```
Domain Admin
└── Everything downward ─────────────────► Entire system

Workspace-GenX-Admin
└── Everything downward within GenX ─────► GenX + all projects in it

Project-Website-Admin
└── Everything downward within Website ──► Website project only
```

### User Management per Level

| Admin Level | Can create users? | Can send invites? | Scope |
|-------------|-------------------|-------------------|-------|
| **Domain Admin** | ✅ Yes | ✅ Yes | Entire system |
| **Workspace-X-Admin** | ✅ Yes | ✅ Yes | Workspace X |
| **Project-Y-Admin** | ✅ Yes | ✅ Yes | Project Y |

**All users live in one global user pool (Kanbu/Domain level).**

### Invite Flow

The invite **source** determines automatic security group membership:

```
Project-Website-Admin sends invite to jan@email.com
                ↓
Jan accepts invite and creates account
                ↓
Jan automatically becomes member of "Project-Website" security group
                ↓
Jan now has permissions on Project Website (via that group)
```

| Invite from | New user becomes member of |
|-------------|----------------------------|
| Domain Admin | (admin chooses group) |
| Workspace-X-Admin | Workspace-X |
| Project-Y-Admin | Project-Y |

### Example: User with Multiple Roles

```
Robin is member of:
├── Domain Admins              → Admin everywhere
└── (automatically everything)

Jan is member of:
├── Workspace-GenX-Admin       → Admin in GenX (can invite users)
├── Workspace-Mblock           → Member in Mblock (not admin!)
└── Project-Analytics-Admin    → Admin in Analytics project

So Jan:
├── Can create/invite users for GenX     ✅
├── CANNOT create users for Mblock       ❌ (only member)
├── Can add users to Analytics           ✅
└── Sees admin features in GenX, not in Mblock
```

---

## Container Hierarchy

Kanbu follows a **nested container structure** (similar to AD Forest → Domain → OU):

```
Kanbu (Root)
├── Global user pool (all users)
│
└── Workspaces (containers)
    ├── Members (users member of this workspace)
    ├── Modules (Wiki, Statistics, Settings, etc.)
    │
    └── Projects (sub-containers)
        ├── Members (users member of this project)
        └── Modules (Board, List, Calendar, Settings, etc.)
```

---

## Role-based Visibility

### Who sees what? (Via Security Groups)

| Security Group | Sees | Can manage |
|----------------|------|------------|
| **Domain Admins** | EVERYTHING | Users, Workspaces, Projects, ACL |
| **Workspace-X-Admin** | Workspace X + projects | Users for X, Projects in X |
| **Workspace-X** | Workspace X + projects | Tasks in projects |
| **Project-Y-Admin** | Project Y | Users for Y, Project settings |
| **Project-Y** | Project Y | Own tasks |

### Example: GenX Organization

```
Kanbu (Domain)
│
├── Robin
│   └── Member of: Domain Admins ──────────────── Sees EVERYTHING, manages EVERYTHING
│
├── Workspace: "TechCorp BV"
│   ├── Jan
│   │   └── Member of: Workspace-TechCorp-Admin ─ Sees TechCorp, can invite users
│   ├── Piet
│   │   └── Member of: Project-Website-Admin ──── Sees Website project, is admin
│   └── Project: "Website Redesign"
│       └── Klaas
│           └── Member of: Project-Website ────── Sees only this project
│
└── Workspace: "DataFlow BV"
    ├── Marie
    │   └── Member of: Workspace-DataFlow-Admin ─ Sees DataFlow, can invite users
    ├── Piet
    │   └── Member of: Project-Analytics ──────── Sees this project too!
    └── Project: "Analytics Dashboard"

Piet is member of 2 security groups in 2 different workspaces:
- Project-Website-Admin (TechCorp) → Admin
- Project-Analytics (DataFlow) → Member
```

---

## Feature Levels

Each feature belongs to a specific container level:

### Personal Level (Dashboard)

Features that are **cross-container** - aggregation of everything you have access to.

| Feature | Description |
|---------|-------------|
| **Favorites** | Your shortcuts to projects from ALL workspaces |
| **My Tasks** | Tasks from ALL projects you're member of |
| **My Subtasks** | Subtasks from ALL projects |
| **Overview/Widgets** | Personal stats and dashboards |
| **Notes** | Personal notes |
| **Inbox** | Notifications from ALL containers |

**URL Pattern:** `/dashboard/*`

**Sidebar:** `DashboardSidebar`

### Workspace Level

Features that belong to **one workspace**.

| Feature | Description |
|---------|-------------|
| **Projects** | List of projects in this workspace |
| **Groups** | Organization/categorization of projects |
| **Wiki** | Knowledge base of the workspace |
| **Members** | Users member of this workspace |
| **Statistics** | Stats about this workspace |
| **Settings** | Workspace configuration |

**URL Pattern:** `/workspace/:slug/*`

**Sidebar:** `WorkspaceSidebar`

### Project Level

Features that belong to **one project**.

| Feature | Description |
|---------|-------------|
| **Board** | Kanban board |
| **List** | Task list |
| **Calendar** | Calendar view |
| **Timeline** | Gantt/timeline view |
| **Sprints** | Sprint planning |
| **Milestones** | Milestones management |
| **Analytics** | Project statistics |
| **GitHub** | Linked repository |
| **Members** | Users member of this project |
| **Settings** | Project configuration |

**URL Pattern:** `/workspace/:slug/project/:id/*`

**Sidebar:** `ProjectSidebar`

---

## Navigation Principles

### 1. Context-aware Sidebars

Each container level has its own sidebar:

```
/dashboard              → DashboardSidebar (Personal items)
/workspaces             → No sidebar or minimal
/workspace/:slug        → WorkspaceSidebar (Workspace modules)
/workspace/:slug/project/:id → ProjectSidebar (Project features)
```

### 2. No Tree in Sidebar

- Workspaces are shown on `/workspaces` page
- Projects are shown on `/workspace/:slug` page
- Sidebar shows only **modules of current container**

### 3. Favorites are Personal

Favorites only appear in `DashboardSidebar` because:
- They are cross-container (projects from different workspaces)
- They are personal (your shortcuts)
- They don't belong to one workspace

### 4. ACL determines visibility

- User only sees objects they have permissions on (via security group)
- Modules/menu items are objects - only visible with correct permissions
- Sidebar items are filtered on ACL (RWXDP)
- Admin features only visible for users in Admin security groups

---

## URL Structure

```
/dashboard                              → Personal overview
/dashboard/tasks                        → My Tasks (cross-container)
/dashboard/subtasks                     → My Subtasks
/dashboard/notes                        → Personal notes

/workspaces                             → List of workspaces

/workspace/:slug                        → Workspace homepage (projects)
/workspace/:slug/wiki                   → Workspace wiki
/workspace/:slug/members                → Workspace members
/workspace/:slug/groups                 → Project groups
/workspace/:slug/stats                  → Workspace statistics
/workspace/:slug/settings               → Workspace settings

/workspace/:slug/project/:id            → Project homepage (board)
/workspace/:slug/project/:id/board      → Kanban board
/workspace/:slug/project/:id/list       → List view
/workspace/:slug/project/:id/calendar   → Calendar view
/workspace/:slug/project/:id/members    → Project members
/workspace/:slug/project/:id/github     → GitHub integration
/workspace/:slug/project/:id/settings   → Project settings
```

---

## Sidebar Components

### DashboardSidebar

```
┌─────────────────────┐
│ PERSONAL            │
│ ○ Overview          │
│ ○ My Tasks          │
│ ○ My Subtasks       │
├─────────────────────┤
│ FAVORITES           │  ← Cross-container shortcuts
│ ★ Project Alpha     │
│ ★ Project Beta      │
├─────────────────────┤
│ NAVIGATION          │
│ ○ Workspaces        │
├─────────────────────┤
│ ○ Notes             │
└─────────────────────┘
```

### WorkspaceSidebar

```
┌─────────────────────┐
│ ← Back to Workspaces│
├─────────────────────┤
│ WORKSPACE           │
│ ○ Projects          │
│ ○ Groups            │
│ ○ Wiki              │
│ ○ Members           │
│ ○ Statistics        │
│ ○ Settings          │
└─────────────────────┘
```

### ProjectSidebar

```
┌─────────────────────┐
│ ← Back to Projects  │
├─────────────────────┤
│ VIEWS               │
│ ○ Board             │
│ ○ List              │
│ ○ Calendar          │
│ ○ Timeline          │
├─────────────────────┤
│ PLANNING            │
│ ○ Sprints           │
│ ○ Milestones        │
│ ○ Analytics         │
├─────────────────────┤
│ MANAGE              │
│ ○ Details           │
│ ○ Members           │
│ ○ GitHub            │
│ ○ Settings          │
└─────────────────────┘
```

---

## Important Rules

### DO's

- ✅ Each container has own members
- ✅ Each container has own modules
- ✅ Sidebar adapts to container level
- ✅ ACL determines what is visible
- ✅ Favorites are always personal level

### DON'Ts

- ❌ No tree structure in sidebar
- ❌ No workspace modules in ProjectSidebar
- ❌ No project-specific items in DashboardSidebar
- ❌ No cross-container features on workspace/project level

---

## References

- [ROADMAP.md](./ROADMAP.md) - Implementation roadmap
- [VISIE.md](./VISIE.md) - Design principles
