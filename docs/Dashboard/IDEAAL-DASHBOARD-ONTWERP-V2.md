# Ideaal Dashboard Ontwerp v2

## Versie: 2.0.0
## Datum: 2026-01-10
## Gebaseerd op: KANBU-STRUCTUUR.md (Container Hiërarchie)

---

## Inleiding

Dit document beschrijft het ideale dashboard-ontwerp voor Kanbu, **afgestemd op de container hiërarchie**:

```
Kanbu (Root) → Workspaces (containers) → Projects (sub-containers)
```

Elke container heeft:
- Eigen **members** (gebruikers lid van die container)
- Eigen **modules** (features specifiek voor dat level)
- Eigen **sidebar** (navigatie voor dat level)

**Kernprincipe:**
> De UI past zich aan op basis van de container waar de gebruiker zich bevindt. Geen complexe trees - elke container heeft zijn eigen pagina en navigatie.

---

## Deel 1: Gebruikersanalyse (Rol-gebaseerd)

### 1.1 Gebruikerstypen per Container Level

| Rol | Kanbu Equivalent | Ziet | Container Scope |
|-----|------------------|------|-----------------|
| **CEO Holding** | Domain Admin | ALLE workspaces | Kanbu Root |
| **CEO Dochter** | Workspace Owner | Eigen workspace(s) | 1+ Workspaces |
| **Manager** | Project Manager | Projecten met rechten | Specifieke Projects |
| **Medewerker** | Member/Viewer | Toegewezen projecten | Specifieke Projects |
| **Gast** | External | Beperkte projecten | 1 Project (read-only) |

### 1.2 Cognitieve Belasting per Rol

```
Domain Admin:  ████████░░ (80%) - Cross-workspace overzicht
Workspace Owner: ██████░░░░ (60%) - Workspace + projecten
Project Manager: ████░░░░░░ (40%) - Project details
Member:        ██░░░░░░░░ (20%) - Alleen taken
```

**Implicatie:** Dashboard (Personal) aggregeert alleen wat relevant is voor jouw rol.

### 1.3 Wat ziet elke rol?

**Domain Admin (CEO Holding):**
```
Dashboard:
├── My Tasks (uit ALLE projecten)
├── Favorites (projecten uit ALLE workspaces)
└── Overview (stats over ALLES)

Workspaces Page:
└── Alle workspaces in het systeem
```

**Workspace Owner (CEO Dochter):**
```
Dashboard:
├── My Tasks (uit eigen workspace projecten)
├── Favorites (projecten uit eigen workspace)
└── Overview (stats over eigen scope)

Workspaces Page:
└── Alleen eigen workspace(s)
```

**Member (Medewerker):**
```
Dashboard:
├── My Tasks (uit toegewezen projecten)
├── Favorites (toegewezen projecten)
└── Overview (persoonlijke stats)

Workspaces Page:
└── Workspaces waar lid van
```

---

## Deel 2: Informatie Architectuur (Container-based)

### 2.1 Container Hiërarchie

```
Level 0: Global (altijd zichtbaar)
├── Header
│   ├── Logo/Home link
│   ├── Zoeken (⌘K)
│   ├── Notificaties
│   └── Profiel/Settings
│
└── Breadcrumbs (context indicator)
    └── Kanbu > Workspace X > Project Y

Level 1: Container Sidebar
├── Personal (DashboardSidebar)
├── Workspace (WorkspaceSidebar)
└── Project (ProjectSidebar)

Level 2: Container Content
├── Container-specifieke pagina's
└── Container-specifieke modules

Level 3: Details (panels/modals)
├── Task detail
├── Settings
└── Member management
```

### 2.2 URL als Container Indicator

```
/dashboard              → Personal container → DashboardSidebar
/dashboard/tasks        → Personal container → DashboardSidebar
/dashboard/notes        → Personal container → DashboardSidebar

/workspaces             → Workspaces list   → Minimal/geen sidebar

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
Eerste blik:    Totaal taken, deadlines vandaag
Hover:          Per-project breakdown
Click:          Naar specifiek project
```

**Workspace Level:**
```
Eerste blik:    Project cards met status
Hover:          Task count, last activity
Click:          Naar project board
```

**Project Level:**
```
Eerste blik:    Board met kolommen
Hover:          Task assignee, priority
Click:          Task detail panel
```

---

## Deel 3: Layout Architectuur

### 3.1 De Container-Aware Layout

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
  // Project level - meest specifiek eerst
  if (pathname.match(/^\/workspace\/[^/]+\/project\//)) {
    return ProjectSidebar
  }

  // Workspace level
  if (pathname.match(/^\/workspace\/[^/]+/)) {
    return WorkspaceSidebar
  }

  // Workspaces overview - minimaal of geen sidebar
  if (pathname === '/workspaces') {
    return null // of MinimalSidebar
  }

  // Personal/Dashboard level
  return DashboardSidebar
}
```

### 3.3 Responsive Breakpoints

| Breakpoint | Sidebar | Content | Detail Panel |
|------------|---------|---------|--------------|
| Desktop XL (>1440px) | Full (280px) | Wide | Inline right |
| Desktop (1024-1440px) | Full (240px) | Standard | Overlay |
| Tablet (768-1024px) | Icons (60px) | Full width | Overlay |
| Mobile (<768px) | Drawer | Full width | Full screen |

---

## Deel 4: Sidebar Design (Container-Specific)

### 4.1 DashboardSidebar (Personal Level)

Dit is de sidebar voor `/dashboard/*` routes.

```
┌────────────────────────┐
│                        │
│ PERSONAL               │  ← Cross-container features
│ ├─ 🏠 Overview         │
│ ├─ ✅ My Tasks    (12) │  ← Taken uit ALLE projecten
│ ├─ 📋 My Subtasks  (5) │
│ └─ 📥 Inbox        (3) │  ← Notificaties van ALLES
│                        │
│ ────────────────────   │
│                        │
│ FAVORITES              │  ← Snelkoppelingen (cross-container)
│ ├─ ⭐ Project Alpha    │  ← Uit Workspace A
│ ├─ ⭐ Project Beta     │  ← Uit Workspace B
│ └─ [+ Add favorite]    │
│                        │
│ ────────────────────   │
│                        │
│ NAVIGATION             │
│ └─ 🏢 Workspaces       │  ← Naar workspaces lijst
│                        │
│ ────────────────────   │
│                        │
│ 📝 Notes               │  ← Personal notes
│                        │
└────────────────────────┘
```

**Kenmerken:**
- Favorites zijn **cross-container** (projecten uit verschillende workspaces)
- My Tasks aggregeert uit **alle** toegankelijke projecten
- Link naar Workspaces om naar workspace level te gaan

### 4.2 WorkspaceSidebar (Workspace Level)

Dit is de sidebar voor `/workspace/:slug/*` routes (behalve project routes).

```
┌────────────────────────┐
│                        │
│ ← Back to Workspaces   │  ← Terug naar container level erboven
│                        │
│ ────────────────────   │
│                        │
│ WORKSPACE: ACME CORP   │  ← Huidige container naam
│                        │
│ ────────────────────   │
│                        │
│ MODULES                │
│ ├─ 📁 Projects         │  ← Workspace homepage
│ ├─ 📂 Groups           │  ← Project categorisatie
│ ├─ 📖 Wiki             │  ← Workspace kennisbank
│ ├─ 👥 Members          │  ← Workspace members
│ ├─ 📊 Statistics       │  ← Workspace stats
│ └─ ⚙️ Settings         │  ← Workspace config
│                        │
└────────────────────────┘
```

**Kenmerken:**
- "Back" link naar Workspaces overview
- Alleen modules van **deze workspace**
- Geen projecten in sidebar (die staan in content area)

### 4.3 ProjectSidebar (Project Level)

Dit is de sidebar voor `/workspace/:slug/project/:id/*` routes.

```
┌────────────────────────┐
│                        │
│ ← Back to Projects     │  ← Terug naar workspace
│                        │
│ ────────────────────   │
│                        │
│ PROJECT: WEBSITE       │  ← Huidige container naam
│ [KANBU-123]            │  ← Project identifier
│                        │
│ ────────────────────   │
│                        │
│ VIEWS                  │
│ ├─ 📋 Board            │  ← Kanban
│ ├─ 📄 List             │  ← Takenlijst
│ ├─ 📅 Calendar         │  ← Kalender
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
│ ├─ 🐙 GitHub           │  ← Repo integratie
│ └─ ⚙️ Settings         │  ← Project config
│                        │
└────────────────────────┘
```

**Kenmerken:**
- "Back" link naar Workspace projects
- Alleen modules van **dit project**
- Secties gegroepeerd op functie (Views, Planning, Manage)

### 4.4 Sidebar States

**Expanded (280px):**
- Volledige labels
- Badges zichtbaar
- Section headers

**Collapsed (60px):**
- Alleen iconen
- Tooltips on hover
- Flyout menus voor secties

**Hidden (0px):**
- Focus mode (⌘/)
- Maximale content ruimte

---

## Deel 5: Home/Overview Dashboard (Personal Level)

### 5.1 Widget-Based Personal Dashboard

Dit is `/dashboard` - de persoonlijke hub die **cross-container** aggregeert.

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

### 5.2 Widget Types voor Personal Level

| Widget | Data Source | Aggregatie |
|--------|-------------|------------|
| **Stats** | Alle projecten | Cross-container counts |
| **Today** | Alle taken due today | Per-project labels |
| **Upcoming** | Alle toekomstige taken | Grouped by date |
| **Activity** | Alle workspaces | Recent activity stream |
| **Favorites** | User favorites | Quick access |

### 5.3 Personalisatie per Rol

```yaml
member:
  widgets: [today, upcoming, favorites]
  focus: "Mijn taken"

manager:
  widgets: [today, team_overview, activity, favorites]
  focus: "Team voortgang"

workspace_owner:
  widgets: [workspace_stats, projects_overview, activity]
  focus: "Workspace health"

domain_admin:
  widgets: [all_workspaces_stats, system_health, activity]
  focus: "Organisatie overzicht"
```

---

## Deel 6: Workspaces Page

### 6.1 Workspaces Overview (`/workspaces`)

Dit is de lijst van alle workspaces waar de gebruiker toegang toe heeft.

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

### 6.2 Sidebar Optie voor Workspaces

Twee opties:

**Optie A: Geen sidebar**
- Volledige breedte voor workspace cards
- Cleaner UI
- Back via breadcrumbs of logo

**Optie B: Minimale sidebar**
```
┌────────────────────┐
│                    │
│ 🏠 Dashboard       │  ← Terug naar personal
│                    │
│ ────────────────   │
│                    │
│ 🏢 All Workspaces  │  ← Huidige pagina
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

## Deel 7: Workspace Page

### 7.1 Workspace Homepage (`/workspace/:slug`)

De homepage van een workspace toont de projecten.

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

Via WorkspaceSidebar bereikbaar:

| Module | URL | Beschrijving |
|--------|-----|--------------|
| **Projects** | `/workspace/:slug` | Project cards (homepage) |
| **Groups** | `/workspace/:slug/groups` | Project categorisatie |
| **Wiki** | `/workspace/:slug/wiki` | Kennisbank |
| **Members** | `/workspace/:slug/members` | Member management |
| **Statistics** | `/workspace/:slug/stats` | Workspace analytics |
| **Settings** | `/workspace/:slug/settings` | Configuration |

---

## Deel 8: Project Page

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

Via ProjectSidebar bereikbaar:

| Category | Module | URL |
|----------|--------|-----|
| **Views** | Board | `/project/:id/board` |
| | List | `/project/:id/list` |
| | Calendar | `/project/:id/calendar` |
| | Timeline | `/project/:id/timeline` |
| **Planning** | Sprints | `/project/:id/sprints` |
| | Milestones | `/project/:id/milestones` |
| | Analytics | `/project/:id/analytics` |
| **Manage** | Details | `/project/:id/details` |
| | Members | `/project/:id/members` |
| | GitHub | `/project/:id/github` |
| | Settings | `/project/:id/settings` |

---

## Deel 9: My Tasks (Personal Level)

### 9.1 Cross-Container Task Aggregatie

`/dashboard/tasks` toont taken uit **alle** projecten waar de gebruiker toegang toe heeft.

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

### 9.2 Filters voor My Tasks

```
Workspace:  [All] [TechCorp] [DataFlow] [Side Projects]
Project:    [All] [Website] [API] [Mobile] ...
Priority:   [All] [Urgent] [High] [Medium] [Low]
Due Date:   [All] [Today] [This Week] [Overdue] [No Date]
Status:     [Open] [In Progress] [Done] [All]
```

**Key insight:** My Tasks is de enige plek waar taken van meerdere workspaces/projecten samen komen. Dit is een **Personal level** feature.

---

## Deel 10: Favorites (Personal Level)

### 10.1 Cross-Container Favorites

Favorites zijn shortcuts naar **projecten uit verschillende workspaces**.

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

| Actie | Waar | Hoe |
|-------|------|-----|
| **Add** | Project card | Star icon click |
| **Add** | ProjectSidebar | Star in header |
| **Remove** | DashboardSidebar | Right-click → Remove |
| **Reorder** | DashboardSidebar | Drag & drop |

### 10.3 Waarom Personal Level?

- User A kan project X favoriet hebben
- User B hoeft project X niet favoriet te hebben
- Favorites zijn **persoonlijk**, niet gedeeld
- Ze aggregeren projecten uit **verschillende containers**

---

## Deel 11: Keyboard Navigation (Container-Aware)

### 11.1 Global Shortcuts (Altijd)

| Shortcut | Actie |
|----------|-------|
| `⌘K` | Command palette |
| `⌘/` | Toggle sidebar |
| `⌘,` | Settings |
| `⌘?` | Shortcuts help |

### 11.2 Navigation Shortcuts

| Shortcut | Actie | Gaat naar |
|----------|-------|-----------|
| `G H` | Go to Home | `/dashboard` |
| `G T` | Go to Tasks | `/dashboard/tasks` |
| `G W` | Go to Workspaces | `/workspaces` |
| `G N` | Go to Notes | `/dashboard/notes` |

### 11.3 Container-Specific Shortcuts

**In Workspace:**
| Shortcut | Actie |
|----------|-------|
| `G P` | Go to Projects |
| `G M` | Go to Members |
| `G S` | Go to Settings |

**In Project:**
| Shortcut | Actie |
|----------|-------|
| `G B` | Go to Board |
| `G L` | Go to List |
| `G C` | Go to Calendar |

---

## Deel 12: Notifications (Cross-Container)

### 12.1 Inbox als Personal Feature

`/dashboard/inbox` aggregeert notificaties uit **alle** containers.

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

| Source | Container Level | Voorbeeld |
|--------|-----------------|-----------|
| **@mention** | Project | "Sarah mentioned you in task" |
| **Assignment** | Project | "You were assigned task X" |
| **Comment** | Project | "New comment on your task" |
| **Status change** | Project | "Task moved to Done" |
| **Member joined** | Workspace | "John joined the workspace" |
| **Project created** | Workspace | "New project: Mobile App" |
| **System** | Kanbu Root | "New feature available" |

---

## Deel 13: Search (Container-Scoped)

### 13.1 Global Search (⌘K)

Zoekt over **alle** toegankelijke containers.

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

| Waar | Scope | Zoekt in |
|------|-------|----------|
| Global (⌘K) | Alles | Alle containers |
| Workspace page | Workspace | Projecten in workspace |
| Project page | Project | Taken in project |
| Wiki page | Wiki | Wiki pagina's |

---

## Deel 14: ACL Integration

### 14.1 Zichtbaarheid per Rol

De UI **filtert automatisch** op basis van ACL:

```typescript
// Wat ziet de gebruiker?
const visibleWorkspaces = workspaces.filter(ws =>
  userHasPermission(user, ws, 'READ')
)

const visibleProjects = projects.filter(proj =>
  userHasPermission(user, proj, 'READ')
)

// Sidebar modules
const visibleModules = modules.filter(mod =>
  mod.requiredPermission ? userHasPermission(user, container, mod.requiredPermission) : true
)
```

### 14.2 UI Feedback voor Permissions

```
┌────────────────────────────────────────────────────────────────┐
│  ProjectSidebar                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  VIEWS (altijd zichtbaar bij READ)                             │
│  ├─ 📋 Board                                                   │
│  ├─ 📄 List                                                    │
│  └─ 📅 Calendar                                                │
│                                                                │
│  MANAGE (alleen bij WRITE/MANAGE_PERMISSIONS)                  │
│  ├─ 👥 Members          ← Alleen als canManageMembers          │
│  └─ ⚙️ Settings         ← Alleen als canManageSettings         │
│                                                                │
│  Geen toegang tot Settings?                                    │
│  → Module niet tonen (niet grayed out)                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Deel 15: Component Checklist (Per Container Level)

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

## Deel 16: Conclusie

### De Container-Aware Gulden Regels

1. **Elke container heeft eigen members** - Users kunnen op meerdere levels lid zijn

2. **Elke container heeft eigen modules** - Geen workspace modules in project sidebar

3. **Sidebar past zich aan** - Route bepaalt welke sidebar wordt getoond

4. **Personal is cross-container** - My Tasks, Favorites, Inbox aggregeren over alles

5. **ACL bepaalt zichtbaarheid** - Niet grayed out, maar niet tonen

6. **Geen tree in sidebar** - Containers worden op eigen pagina's getoond

7. **Back links voor navigatie** - Duidelijke weg terug naar parent container

8. **Breadcrumbs voor context** - Altijd weten waar je bent

### De Ultieme Test

> Begrijpt de gebruiker direct op welk container level hij zich bevindt?
> Kan hij navigeren tussen containers zonder verwarring?
> Ziet hij alleen wat relevant is voor zijn rol en huidige container?
> Werkt de aggregatie (My Tasks, Favorites) correct cross-container?

Als al deze vragen "ja" zijn, is de container-aware UI geslaagd.

---

## Referenties

- [KANBU-STRUCTUUR.md](./KANBU-STRUCTUUR.md) - Container hiërarchie definitie
- [ROADMAP.md](./ROADMAP.md) - Implementatie roadmap
- [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) - Originele versie (v1)
