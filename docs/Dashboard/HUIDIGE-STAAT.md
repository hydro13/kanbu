# Dashboard - Huidige Staat

## Versie: 1.0.0
## Datum: 2026-01-10
## Status: Analyse

---

## Screenshot Analyse

Op basis van de huidige Kanbu applicatie (screenshots 2026-01-10).

---

## 1. Dashboard Pagina (`/dashboard`)

### Huidige Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Kanbu > Dashboard                              [?] [←→] [user] │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  Menu        │  Welcome, Robin Waslander!                       │
│  ──────      │  Your personal dashboard                         │
│              │                                                  │
│  🏠 Overview │  ┌─────────┬─────────┬─────────┬─────────┐      │
│  ✅ My Tasks │  │ Active  │ Active  │ Due This│Completed│      │
│  ✅ My Sub.. │  │ Tasks   │ Subtasks│ Week    │         │      │
│  🏢 My Work..│  │   0     │    0    │    0    │    0    │      │
│              │  └─────────┴─────────┴─────────┴─────────┘      │
│              │                                                  │
│              │  📁 Your Workspaces                              │
│              │  ┌─────────────────────────┐                     │
│              │  │ Webhook Test Workspace  │                     │
│              │  │ 1767969455862           │                     │
│              │  │ No description          │                     │
│              │  │ 1 Projects | 1 Members  │                     │
│              │  └─────────────────────────┘                     │
│              │                                                  │
│              │  📝 Sticky Notes            [+ New Note]         │
│              │  ┌───────┐ ┌───────┐ ┌───────┐                  │
│              │  │ Note1 │ │ Note2 │ │ Note3 │                  │
│              │  └───────┘ └───────┘ └───────┘                  │
└──────────────┴──────────────────────────────────────────────────┘
```

### Componenten

| Component | Status | Locatie |
|-----------|--------|---------|
| Stats Cards | ✅ Werkt | 4 cards bovenaan |
| Workspace Cards | ✅ Werkt | Platte lijst |
| Sticky Notes | ✅ Werkt | Grid met kleuren |
| Sidebar | ✅ Werkt | 4 menu items |

### Wat Werkt

- [x] Welkomstbericht met gebruikersnaam
- [x] Persoonlijke statistieken
- [x] Workspace cards met basis info
- [x] Sticky notes met kleuren
- [x] Navigatie naar workspaces
- [x] **Collapsible sidebar** - `Ctrl + /` toggle (werkend, icon-only mode)
- [x] **Command palette** - `Ctrl + K` (basis implementatie, in ontwikkeling)
- [x] **Keyboard shortcuts** - Aanwezig, niet feature-complete

### Wat Mist (Dashboard Specifiek)

- [ ] **Collapsible workspace tree** - Workspaces in sidebar niet open/dicht te klappen
- [ ] **Project onderscheid** - Geen Kanbu vs GitHub visueel verschil
- [ ] **Project Groepen UI** - Niet zichtbaar in UI (model bestaat wel in database)
- [ ] **Inline projecten** - Projecten niet direct in sidebar zichtbaar
- [ ] **GitHub projecten sectie** - Niet apart getoond per workspace

---

## 2. Sidebar Analyse

### Huidige Sidebar (Dashboard)

```
Menu
├── 🏠 Overview
├── ✅ My Tasks
├── ✅ My Subtasks
└── 🏢 My Workspaces
```

**Kenmerken:**
- 4 statische items
- Geen hiërarchie (workspaces niet collapsible)
- Geen workspaces inline
- Geen projecten zichtbaar

**Bestaande Features (in ontwikkeling):**
- 🔶 Sidebar collapse naar icon-only mode (`Ctrl + /`)
- 🔶 Command palette (`Ctrl + K`) - basis
- 🔶 Keyboard shortcuts modal - niet compleet

### Gewenste Sidebar (Dashboard)

```
Menu
├── 🏠 Overview
├── ✅ My Tasks
├── ✅ My Subtasks
│
├── 📁 Workspaces
│   ├── 🏢 Webhook Test Workspace ▼
│   │   ├── 📋 Kanbu Projects
│   │   │   └── 📋 test-temp
│   │   ├── 🐙 GitHub Projects
│   │   │   └── 🐙 kanbu (linked repo)
│   │   └── 📂 Project Groups
│   │       └── (geen groepen)
│   │
│   └── 🏢 Andere Workspace ▶
│
└── 📝 Sticky Notes
```

---

## 3. Project Sidebar (binnen project)

### Huidige Sidebar (Project View)

```
VIEWS
├── 📋 Board
├── 📋 List
├── 📅 Calendar
└── 📊 Timeline

PLANNING
├── 🔄 Sprints
├── 🎯 Milestones
└── 📈 Analytics

MANAGE
├── 👥 Members
├── ⚙️ Board Settings
├── 🔄 Import/Export
└── 🔗 Webhooks

INTEGRATIONS
└── 🐙 GitHub
```

**Status:** Deze sidebar is goed gestructureerd en heeft GitHub integratie al.

---

## 4. Database Modellen

### ProjectGroup (bestaat in schema)

```prisma
model ProjectGroup {
  id          Int                  @id @default(autoincrement())
  workspaceId Int                  @map("workspace_id")
  name        String               @db.VarChar(255)
  description String?
  color       String               @default("blue")
  status      ProjectGroupStatus   @default(DRAFT)
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt
  projects    ProjectGroupMember[]
  workspace   Workspace            @relation(...)
}

enum ProjectGroupStatus {
  DRAFT
  PLANNED
  ACTIVE
  COMPLETED
  CLOSED
}
```

**Status:** Model bestaat, maar geen UI implementatie.

### GitHubRepository → Workspace

Huidige relatie: `GitHubRepository` → `Project` → `Workspace`

Gewenste: Directe `workspaceId` op `GitHubRepository` voor onafhankelijke GitHub projecten.

---

## 5. Routes Analyse

### Huidige Routes

| Route | Pagina | Sidebar |
|-------|--------|---------|
| `/dashboard` | Dashboard | Dashboard sidebar |
| `/workspaces` | Workspace lijst | Dashboard sidebar |
| `/workspaces?workspace=ID` | Projects in workspace | Dashboard sidebar |
| `/workspace/:slug/project/:id/board` | Project board | Project sidebar |
| `/admin/github` | GitHub admin | Admin sidebar |

### Ontbrekende Routes

| Route | Doel |
|-------|------|
| `/workspace/:slug/github/:repoId` | GitHub project board view |
| `/workspace/:slug/groups` | Project groups overzicht |
| `/workspace/:slug/groups/:groupId` | Project group detail |

---

## 6. Componenten Inventaris

### Dashboard Componenten

| Component | Bestand | Status |
|-----------|---------|--------|
| DashboardPage | `pages/dashboard/DashboardPage.tsx` | ✅ Bestaat |
| WorkspaceCard | `components/workspace/WorkspaceCard.tsx` | ✅ Bestaat |
| StickyNote | `components/notes/StickyNote.tsx` | ✅ Bestaat |
| StatsCard | (inline in dashboard) | ✅ Bestaat |

### Ontbrekende Componenten

| Component | Doel |
|-----------|------|
| `WorkspaceTree` | Collapsible workspace hiërarchie |
| `ProjectTypeIcon` | Kanbu vs GitHub icoon |
| `ProjectGroupCard` | Project group weergave |
| `CollapsibleSection` | Open/dicht klap functie |

---

## 7. API Endpoints

### Beschikbare Endpoints

- `workspace.list` - Lijst workspaces voor user
- `workspace.getById` - Workspace details
- `project.list` - Projecten in workspace
- `github.getLinkedRepository` - GitHub repo voor project

### Ontbrekende Endpoints

| Endpoint | Doel |
|----------|------|
| `workspace.getWithHierarchy` | Workspace met projecten + groups + GitHub |
| `projectGroup.list` | Project groups in workspace |
| `projectGroup.create` | Nieuwe project group |
| `github.listWorkspaceRepositories` | GitHub repos direct aan workspace |

---

## 8. Samenvatting

### Wat Bestaat

| Laag | Component | Status |
|------|-----------|--------|
| Database | ProjectGroup model | 🔶 Bestaat |
| Database | GitHubRepository | 🔶 Bestaat |
| Backend | Workspace API | 🔶 Basis |
| Backend | Project API | 🔶 Basis |
| Frontend | Dashboard page | 🔶 Basis |
| Frontend | Workspace cards | 🔶 Basis |
| Frontend | Project sidebar | 🔶 Basis |
| Frontend | Collapsible sidebar | 🔶 Basis |
| Frontend | Command palette | 🔶 Basis |
| Frontend | Keyboard shortcuts | 🔶 Niet compleet |
| Frontend | Sticky Notes | 🔶 Basis |

### Wat Moet Gebouwd Worden

| Prioriteit | Item |
|------------|------|
| HOOG | Collapsible workspace tree (hiërarchie) in sidebar |
| HOOG | Kanbu/GitHub project icoon onderscheid |
| HOOG | GitHub projecten sectie per workspace |
| MEDIUM | Project Groups UI (model bestaat al) |
| MEDIUM | Workspace hierarchy API endpoint |
| LAAG | Starred/favorites systeem |

---

## Volgende Stap

Zie [ROADMAP.md](./ROADMAP.md) voor de implementatie fasering.
