# Dashboard Visie

## Versie: 1.0.0
## Datum: 2026-01-10
## Auteur: Robin Waslander

---

## Kernvisie

> **Het Dashboard is de cockpit van de gebruiker - één plek voor alles.**

Een gebruiker opent Kanbu en ziet direct:
- Alle workspaces waar hij lid van is
- Alle projecten (Kanbu én GitHub) in die workspaces
- Project groepen voor gecombineerde overzichten
- Zijn persoonlijke taken en notities

---

## Het File System Paradigma

De navigatie werkt zoals een file systeem:

```
📁 Mijn Computer
├── 📁 Documents ▼ (open)
│   ├── 📄 file1.txt
│   └── 📄 file2.txt
├── 📁 Pictures ▶ (dicht)
└── 📁 Downloads ▶ (dicht)
```

Vertaald naar Kanbu:

```
📁 Dashboard
├── 🏢 Workspace A ▼ (open)
│   ├── 📋 Kanbu Projects
│   │   └── 📋 Internal Planning
│   ├── 🐙 GitHub Projects
│   │   └── 🐙 webapp-frontend
│   └── 📂 Project Groups
│       └── 📂 Frontend Team
├── 🏢 Workspace B ▶ (dicht)
└── 🏢 Workspace C ▶ (dicht)
```

### Voordelen

1. **Vertrouwd** - Iedereen kent file explorers
2. **Schaalbaar** - Werkt voor 1 of 100 workspaces
3. **Overzichtelijk** - Open wat je nodig hebt, sluit de rest
4. **Snel** - Direct naar elk project zonder clicks

---

## Drie Soorten Projecten

### 1. Kanbu Projecten (📋)

- Interne projecten zonder externe sync
- Eigen structuur en velden
- Volledig Kanbu-beheerd

**Icoon:** Blauw kanban icoon
**Route:** `/workspace/:slug/project/:id/board`

### 2. GitHub Projecten (🐙)

- Gekoppeld aan GitHub repository
- 1-op-1 feature parity met GitHub Projects
- Bi-directionele sync

**Icoon:** GitHub Octocat icoon
**Route:** `/workspace/:slug/github/:repoId/board`

### 3. Project Groepen (📂)

- Verzameling van projecten (beide types)
- Gecombineerde statistieken
- Cross-project overzicht

**Icoon:** Folder icoon
**Route:** `/workspace/:slug/groups/:groupId`

---

## Dashboard Structuur

### Sidebar (Navigatie)

```
┌────────────────────────┐
│ Menu              [«]  │
├────────────────────────┤
│                        │
│ 🏠 Overview            │
│ ✅ My Tasks            │
│ ✅ My Subtasks         │
│                        │
│ ─────────────────────  │
│                        │
│ 📁 WORKSPACES          │
│                        │
│ ▼ 🏢 Webhook Test...   │
│   │                    │
│   ├─ 📋 KANBU          │
│   │  └─ 📋 test-temp   │
│   │                    │
│   ├─ 🐙 GITHUB         │
│   │  └─ 🐙 kanbu-repo  │
│   │                    │
│   └─ 📂 GROUPS         │
│      └─ (geen)         │
│                        │
│ ▶ 🏢 Andere Workspace  │
│                        │
│ ─────────────────────  │
│                        │
│ 📝 Sticky Notes        │
│                        │
└────────────────────────┘
```

### Content Area

De content area past zich aan op basis van selectie:

| Selectie | Content |
|----------|---------|
| Overview | Stats, quick actions, recent activity |
| Workspace | Workspace overzicht met alle projecten |
| Kanbu Project | Project board/list/calendar |
| GitHub Project | GitHub board (1-op-1 met GitHub) |
| Project Group | Gecombineerde statistieken |

---

## Interactie Patronen

### Collapse/Expand

```
▼ Workspace A (klik = toggle)
  └── projecten zichtbaar

▶ Workspace B (klik = toggle)
   projecten verborgen
```

### Context Menu

Rechtermuisklik op items toont acties:

**Workspace:**
- New Kanbu Project
- Link GitHub Repository
- New Project Group
- Settings

**Project:**
- Open Board
- Open in new tab
- Settings
- Archive

### Drag & Drop (future)

- Projecten tussen groepen slepen
- Projecten ordenen
- Workspaces ordenen

---

## Visuele Hiërarchie

### Kleuren

| Element | Kleur |
|---------|-------|
| Workspace header | Donkergrijs |
| Kanbu section | Blauw accent |
| GitHub section | Wit/grijs (GitHub kleuren) |
| Groups section | Geel/oranje accent |
| Selected item | Primary kleur met highlight |

### Iconen

| Element | Icoon |
|---------|-------|
| Workspace | 🏢 Building |
| Kanbu Project | 📋 Kanban board |
| GitHub Project | 🐙 GitHub Octocat |
| Project Group | 📂 Folder |
| Collapse/Expand | ▶/▼ Chevron |

### Badges

| Badge | Betekenis |
|-------|-----------|
| 🟢 | Active/Synced |
| 🟡 | Pending sync |
| 🔴 | Error/Attention |
| (3) | Aantal items |

---

## Data Flow

### Laden van Dashboard

```
1. User opent /dashboard
2. Fetch workspaces waar user lid van is
3. Per workspace: fetch projects, groups, github repos
4. Render tree met collapsed state uit localStorage
5. User interactie: expand/collapse opslaan
```

### Collapsed State

De expand/collapse staat wordt opgeslagen in localStorage:

```json
{
  "dashboard_tree_state": {
    "workspace_534": {
      "expanded": true,
      "sections": {
        "kanbu": true,
        "github": false,
        "groups": false
      }
    },
    "workspace_535": {
      "expanded": false
    }
  }
}
```

---

## API Requirements

### Nieuwe Endpoints

```typescript
// Workspace met volledige hiërarchie
workspace.getHierarchy(workspaceId: number) => {
  workspace: Workspace
  kanbuProjects: Project[]
  githubProjects: GitHubRepository[]
  projectGroups: ProjectGroup[]
}

// Dashboard data in één call
dashboard.getOverview() => {
  workspaces: WorkspaceHierarchy[]
  stats: UserStats
  recentActivity: Activity[]
}
```

### Bestaande Endpoints Uitbreiden

```typescript
// Project list met type indicator
project.list(workspaceId) => Project[] // add: hasGitHub flag

// GitHub repos direct per workspace
github.listWorkspaceRepos(workspaceId) => GitHubRepository[]
```

---

## Component Architectuur

### Nieuwe Componenten

```
components/
├── dashboard/
│   ├── DashboardSidebar.tsx      # Nieuwe tree-based sidebar
│   ├── WorkspaceTree.tsx         # Collapsible workspace node
│   ├── ProjectNode.tsx           # Project item in tree
│   ├── ProjectGroupNode.tsx      # Group item in tree
│   └── TreeSection.tsx           # Kanbu/GitHub/Groups section
│
├── shared/
│   ├── CollapsiblePanel.tsx      # Generiek collapse component
│   ├── ProjectTypeIcon.tsx       # Kanbu vs GitHub icoon
│   └── TreeView.tsx              # Generieke tree component
```

### State Management

```typescript
// Zustand store voor tree state
interface DashboardTreeState {
  expandedWorkspaces: Set<number>
  expandedSections: Map<number, Set<'kanbu' | 'github' | 'groups'>>
  toggleWorkspace: (id: number) => void
  toggleSection: (workspaceId: number, section: string) => void
}
```

---

## Implementatie Prioriteiten

### Fase 1: Basis Tree
- Collapsible workspaces in sidebar
- Projecten per workspace (alleen Kanbu eerst)
- localStorage persistence

### Fase 2: GitHub Integratie
- GitHub sectie per workspace
- GitHub project icoon/onderscheid
- Route naar GitHub board

### Fase 3: Project Groups
- Groups sectie per workspace
- Group CRUD operaties
- Gecombineerde stats

### Fase 4: Polish
- Drag & drop ordering
- Context menus
- Tree-specifieke keyboard navigatie (basis shortcuts bestaan al)
- Search/filter in tree

---

## Bestaande Features (in ontwikkeling)

Kanbu heeft de volgende features in verschillende stadia (🔶 = in ontwikkeling):
- 🔶 **Collapsible sidebar** - `Ctrl + /` (basis)
- 🔶 **Command palette** - `Ctrl + K` (basis)
- 🔶 **Keyboard shortcuts** - Niet compleet
- 🔶 **Sticky Notes** - Basis

*Deze features bestaan maar zijn nog niet allemaal gepolished of MVP-klaar.*

---

## Samenvatting

Het nieuwe dashboard biedt:

1. **Hiërarchische navigatie** - Zoals een file systeem
2. **Duidelijk onderscheid** - Kanbu vs GitHub vs Groups
3. **Schaalbaarheid** - Werkt voor kleine en grote organisaties
4. **Snelle toegang** - Alles bereikbaar vanuit één sidebar

De implementatie volgt de bestaande patronen van Kanbu en bouwt voort op de database modellen die al bestaan.
