# Dashboard Visie

## Versie: 2.0.0
## Datum: 2026-01-10
## Auteur: Robin Waslander

---

## Kernvisie

> **Het Dashboard is de cockpit van de gebruiker - real-time, ACL-aware, en schaalbaar van 1 tot 100.000+ gebruikers.**

We implementeren "Claude's Planner" - een ideaal dashboard ontwerp gebaseerd op best practices van 10 PM tools - aangepast aan Kanbu's unieke architectuur:

- **Real-time multi-user** (geen offline-first)
- **ACL-first** (elke actie, elk menu item)
- **Docker + SaaS ready** (multi-server met Redis)
- **LDAP-ready** (toekomstige identity federation)

---

## Design Principes

### 1. Progressive Disclosure
Toon alleen wat nodig is, wanneer nodig:
- Collapsed workspaces verbergen projecten
- Sections expanden on-demand
- Context menus onthullen advanced acties

### 2. ACL-First Design
Elk UI element respecteert permissions:
```typescript
// Pattern voor ALLE menu items
const { canSeeFeature, isLoading } = useDashboardFeatureAccess()

const filteredItems = items.filter(item =>
  isLoading || canSeeFeature(item.slug)
)
```

### 3. Real-Time by Default
Alle data updates zijn live:
- Task wijzigingen via Socket.io events
- Presence indicators (wie is online)
- Typing/editing indicators
- Cursor sharing in boards

### 4. Keyboard-First
Alles bereikbaar via toetsenbord:
- `Ctrl+K` - Command palette (al aanwezig)
- `Ctrl+/` - Toggle sidebar (al aanwezig)
- Pijltjes - Tree navigatie (te bouwen)
- `Enter` - Open geselecteerd item

### 5. 60-30-10 Regel
- **60% Content** - Het echte werk (tasks, boards)
- **30% Navigatie** - Sidebar, breadcrumbs
- **10% Chrome** - Header, controls

---

## Dashboard Structuur

### Sidebar Hiërarchie (Claude's Planner Model)

```
┌────────────────────────────┐
│ Workspace Switcher    [▼]  │  ← Snel wisselen (future)
│ ─────────────────────────  │
│ 🔍 Search         (⌘K)    │  ← Al aanwezig
├────────────────────────────┤
│ PERSONAL                   │
│ ├─ 🏠 Home                 │  ← Widget-based dashboard
│ ├─ 📥 Inbox           (3) │  ← Notificaties + mentions
│ ├─ ✅ My Tasks       (12) │  ← Smart grouping
│ ├─ 📅 Today           (5) │  ← Focus view
│ └─ ⏰ Upcoming        (8) │  ← Coming up
├────────────────────────────┤
│ FAVORITES                  │
│ ├─ ⭐ Project Alpha       │  ← Gepinde projecten
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
│ 📝 Notes                   │  ← Sticky notes (aanwezig)
│ ⚙️ Settings                │  ← Profile link
└────────────────────────────┘
```

### Het File System Paradigma

De navigatie werkt zoals een file systeem - vertrouwd voor iedereen:

```
📁 Mijn Computer           →   📁 Dashboard
├── 📁 Documents ▼         →   ├── 🏢 Workspace A ▼
│   ├── 📄 file1.txt       →   │   ├── 📋 Project 1
│   └── 📄 file2.txt       →   │   └── 📋 Project 2
├── 📁 Pictures ▶          →   ├── 🏢 Workspace B ▶
└── 📁 Downloads ▶         →   └── 🏢 Workspace C ▶
```

### Visueel Onderscheid

| Element | Icoon | Kleur | ACL Vereist |
|---------|-------|-------|-------------|
| Workspace | 🏢 Building | Neutraal | R op workspace |
| Kanbu Project | 📋 Kanban | Blauw | R op project |
| GitHub Project | 🐙 Octocat | Grijs | R op project + GitHub feature |
| Project Group | 📂 Folder | Oranje/Geel | R op group |
| Favorite | ⭐ Star | Goud | User-level (geen ACL) |

---

## Drie Project Types

### 1. Kanbu Projecten (📋)

Interne projecten zonder externe sync:
- Eigen structuur en velden
- Volledig Kanbu-beheerd
- Real-time collaboration

**Route:** `/workspace/:slug/project/:id/board`

### 2. GitHub Projecten (🐙)

Gekoppeld aan GitHub repository:
- Bi-directionele issue sync
- PR/Commit tracking
- Milestone sync
- CI/CD status indicators

**Route:** `/workspace/:slug/github/:repoId/board`

### 3. Project Groepen (📂)

Verzameling van projecten (beide types):
- Gecombineerde statistieken
- Cross-project overzicht
- Portfolio management

**Route:** `/workspace/:slug/groups/:groupId`

---

## Content Areas

De content area past zich aan op basis van selectie:

| Selectie | Content | Features |
|----------|---------|----------|
| **Home** | Widget-based dashboard | Personaliseerbaar, drag-drop widgets |
| **Inbox** | Notificaties + mentions | Filters, mark read, bulk actions |
| **My Tasks** | Task lijst | Smart grouping, filters |
| **Today** | Focus view | Alleen vandaag + overdue |
| **Workspace** | Overview + stats | Recent activity, quick actions |
| **Kanbu Project** | Board/List/Calendar | Real-time, presence |
| **GitHub Project** | GitHub board | Sync status, CI indicators |
| **Project Group** | Gecombineerde stats | Portfolio view |

---

## State Management

### Expand/Collapse State

Opgeslagen in localStorage via Zustand store:

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

Tree state is user-local, maar project data is real-time:

```typescript
// Project changes via Socket.io
useSocket({
  onProjectCreated: (payload) => invalidateQueries(['workspace.getHierarchy']),
  onProjectUpdated: (payload) => updateProjectInCache(payload),
  onProjectDeleted: (payload) => removeProjectFromCache(payload),
})
```

---

## ACL Integratie

### Dashboard Features

Elk sidebar item heeft een feature slug:

```typescript
// Dashboard feature slugs
const DASHBOARD_FEATURES = {
  home: 'dashboard:home',           // R on dashboard
  inbox: 'dashboard:inbox',         // R on dashboard
  myTasks: 'dashboard:my-tasks',    // R on dashboard (al aanwezig)
  today: 'dashboard:today',         // R on dashboard
  upcoming: 'dashboard:upcoming',   // R on dashboard
  favorites: 'dashboard:favorites', // User-level (altijd toegankelijk)
  notes: 'dashboard:notes',         // R on dashboard (al aanwezig)
}
```

### Workspace/Project Visibility

Alleen tonen wat user mag zien:

```typescript
// Sidebar filtering
const workspaces = await trpc.workspace.list.query()
// ^ Backend filtert al op ACL - alleen workspaces met R permission

const projects = await trpc.project.list.query({ workspaceId })
// ^ Backend filtert al op ACL - alleen projecten met R permission
```

---

## API Requirements

### Nieuwe Endpoints

| Endpoint | Beschrijving | ACL |
|----------|--------------|-----|
| `dashboard.getHierarchy` | Alle workspaces + projecten + groups | R per resource |
| `dashboard.getStats` | Persoonlijke statistieken | R on dashboard |
| `favorites.list` | Gebruiker favorites | User-level |
| `favorites.add` | Add favorite | User-level |
| `favorites.remove` | Remove favorite | User-level |
| `projectGroup.list` | Groups in workspace | R on workspace |
| `projectGroup.getStats` | Gecombineerde stats | R on group |

### Bestaande Endpoints (Uitbreiden)

| Endpoint | Wijziging |
|----------|-----------|
| `workspace.list` | Al correct - returns visible workspaces |
| `project.list` | Al correct - filters op ACL |
| `github.listWorkspaceRepos` | Nodig voor GitHub sectie |

---

## Component Architectuur

### Nieuwe Componenten

```
components/
├── dashboard/
│   ├── DashboardSidebar.tsx        # REFACTOR: Huidige naar tree-based
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
│   ├── CollapsiblePanel.tsx        # Generiek expand/collapse
│   ├── ProjectTypeIcon.tsx         # Kanbu vs GitHub icoon
│   └── TreeView.tsx                # Generieke tree component
│
└── stores/
    └── dashboardTreeStore.ts       # Zustand store voor tree state
```

### Pattern: ACL-Aware Sidebar Item

```typescript
interface SidebarItem {
  label: string
  path: string
  icon: React.ComponentType
  slug?: FeatureSlug  // Voor ACL check
  badge?: number      // Notification count
}

function SidebarNavItem({ item, collapsed }: Props) {
  const { canSeeFeature, isLoading } = useDashboardFeatureAccess()

  // Verberg als geen toegang
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

### Bestaand (in ontwikkeling)

| Shortcut | Actie | Status |
|----------|-------|--------|
| `Ctrl+K` | Command palette | 🔶 Basis |
| `Ctrl+/` | Toggle sidebar | 🔶 Werkend |
| `?` | Shortcuts modal | 🔶 Basis |

### Toe te Voegen (Tree-specifiek)

| Shortcut | Actie | Fase |
|----------|-------|------|
| `↑` / `↓` | Navigeer items | 4 |
| `←` / `→` | Collapse / Expand | 4 |
| `Enter` | Open geselecteerd | 4 |
| `Space` | Toggle expand | 4 |
| `/` | Focus search | 4 |
| `g h` | Go to Home | 4 |
| `g t` | Go to My Tasks | 4 |

---

## Context Menus

### Workspace Context Menu

| Actie | ACL Vereist |
|-------|-------------|
| New Kanbu Project | W on workspace |
| Link GitHub Repository | W + GitHub feature |
| New Project Group | W on workspace |
| Workspace Settings | P on workspace |

### Project Context Menu

| Actie | ACL Vereist |
|-------|-------------|
| Open Board | R on project |
| Open in new tab | R on project |
| Add to Favorites | User-level |
| Add to Group | W on group |
| Settings | P on project |
| Archive | D on project |

---

## Implementatie Fasering

Zie [ROADMAP.md](./ROADMAP.md) voor de complete, gedetailleerde implementatie gids.

### Overzicht

```
FASE 1: Foundation
├── 1.1 Tree Data API
├── 1.2 Zustand Store
└── 1.3 Basic Tree Rendering

FASE 2: Core Tree
├── 2.1 Workspace Nodes
├── 2.2 Project Nodes (Kanbu)
└── 2.3 Section Collapse

FASE 3: GitHub Integration
├── 3.1 GitHub Section
├── 3.2 GitHub Project Nodes
└── 3.3 Sync Status Indicators

FASE 4: Project Groups
├── 4.1 Groups API
├── 4.2 Groups Section
└── 4.3 Group Stats

FASE 5: Personal Section
├── 5.1 Home (Widgets)
├── 5.2 Inbox (Notifications)
├── 5.3 Smart Task Grouping
└── 5.4 Today/Upcoming

FASE 6: Favorites
├── 6.1 Favorites API
├── 6.2 Star/Unstar UI
└── 6.3 Favorites Section

FASE 7: Polish & UX
├── 7.1 Keyboard Navigation
├── 7.2 Context Menus
├── 7.3 Search/Filter
└── 7.4 Drag & Drop
```

---

## Wat We NIET Doen

| Feature | Reden |
|---------|-------|
| Offline-first | Conflicteert met real-time multi-user |
| Local-first data | Redis adapter voor multi-server SaaS |
| Custom icon library | Lucide/Heroicons al in gebruik |
| Nieuwe router | React Router al geïntegreerd |
| GraphQL | tRPC is de standaard |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Navigatie naar project | < 2 clicks |
| Sidebar initial load | < 500ms |
| Expand/collapse | < 100ms perceived |
| Tree keyboard navigatie | 100% items bereikbaar |
| ACL response tijd | < 50ms (cached) |

---

## Referenties

- [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) - Claude's Planner volledig ontwerp
- [CONCURRENTIE-ANALYSE.md](./CONCURRENTIE-ANALYSE.md) - Analyse van 10 PM tools
- [HUIDIGE-STAAT.md](./HUIDIGE-STAAT.md) - Huidige implementatie analyse
- [ROADMAP.md](./ROADMAP.md) - Gedetailleerde implementatie fases
- [../Github-projects/VISIE.md](../Github-projects/VISIE.md) - GitHub integratie visie
