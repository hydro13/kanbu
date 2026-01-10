# Kanbu Container Structuur

## Versie: 1.1.0
## Datum: 2026-01-10

---

## ACL Model (Security Groups)

### Kernprincipe: Alles is een Object

In Kanbu is **letterlijk alles** een object waar ACL rechten op kunnen staan:

```
Kanbu (root)
├── System
│   └── Administration         ← Object met ACL
├── Dashboard
│   └── Features
│       ├── Overview           ← Object met ACL
│       ├── My Tasks           ← Object met ACL
│       ├── My Subtasks        ← Object met ACL
│       └── My Workspaces      ← Object met ACL
├── Profile                    ← Object met ACL
└── Workspaces
    ├── GenX                   ← Object met ACL
    │   └── Projects
    │       └── Website        ← Object met ACL
    ├── Mblock BV              ← Object met ACL
    └── Privé                  ← Object met ACL
```

**Objecten zijn:** Workspaces, Projects, Menus, Menu items, Functies, Pagina's, Acties, Features, etc.

### RWXDP Permissions (Filesystem-style)

| Permission | Betekenis |
|------------|-----------|
| **R** | Read - Lezen/bekijken |
| **W** | Write - Aanpassen/bewerken |
| **X** | Execute - Uitvoeren/gebruiken |
| **D** | Delete - Verwijderen |
| **P** | Permissions - ACL beheren |

### Security Groups

Alle rollen zijn **security groups**. Users krijgen rechten door:

1. **Direct op object** - User krijgt rechtstreeks rechten op een object
2. **Via Security Group** - User is lid van een groep die rechten heeft

```
Security Groups:
├── Domain Admins              → Rechten op ALLES
├── Workspace-GenX-Admin       → Admin rechten op GenX
├── Workspace-GenX             → Member rechten op GenX
├── Workspace-Mblock-Admin     → Admin rechten op Mblock
├── Workspace-Mblock           → Member rechten op Mblock
├── Project-Website-Admin      → Admin rechten op Website project
├── Project-Website            → Member rechten op Website project
└── ... etc
```

### Rechten Inheritance (Naar Beneden)

Rechten werken **naar beneden** in de hiërarchie:

```
Domain Admin
└── Alles naar beneden ─────────────────► Hele systeem

Workspace-GenX-Admin
└── Alles naar beneden binnen GenX ─────► GenX + alle projecten erin

Project-Website-Admin
└── Alles naar beneden binnen Website ──► Website project alleen
```

### User Management per Level

| Admin Level | Kan users aanmaken? | Kan invites versturen? | Scope |
|-------------|---------------------|------------------------|-------|
| **Domain Admin** | ✅ Ja | ✅ Ja | Hele systeem |
| **Workspace-X-Admin** | ✅ Ja | ✅ Ja | Workspace X |
| **Project-Y-Admin** | ✅ Ja | ✅ Ja | Project Y |

**Alle users leven in één global user pool (Kanbu/Domain level).**

### Invite Flow

De invite **bron** bepaalt de automatische security group membership:

```
Project-Website-Admin stuurt invite naar jan@email.com
                ↓
Jan accepteert invite en maakt account aan
                ↓
Jan wordt automatisch lid van "Project-Website" security group
                ↓
Jan heeft nu rechten op Project Website (via die groep)
```

| Invite van | Nieuwe user wordt lid van |
|------------|---------------------------|
| Domain Admin | (admin kiest groep) |
| Workspace-X-Admin | Workspace-X |
| Project-Y-Admin | Project-Y |

### Voorbeeld: User met Meerdere Rollen

```
Robin is lid van:
├── Domain Admins              → Admin overal
└── (automatisch alles)

Jan is lid van:
├── Workspace-GenX-Admin       → Admin in GenX (kan users inviten)
├── Workspace-Mblock           → Member in Mblock (geen admin!)
└── Project-Analytics-Admin    → Admin in Analytics project

Dus Jan:
├── Kan users aanmaken/inviten voor GenX     ✅
├── Kan GEEN users aanmaken voor Mblock      ❌ (alleen member)
├── Kan users toevoegen aan Analytics        ✅
└── Ziet admin features in GenX, niet in Mblock
```

---

## Container Hiërarchie

Kanbu volgt een **geneste container structuur** (vergelijkbaar met AD Forest → Domain → OU):

```
Kanbu (Root)
├── Global user pool (alle users)
│
└── Workspaces (containers)
    ├── Members (users lid van deze workspace)
    ├── Modules (Wiki, Statistics, Settings, etc.)
    │
    └── Projects (sub-containers)
        ├── Members (users lid van dit project)
        └── Modules (Board, List, Calendar, Settings, etc.)
```

---

## Rol-gebaseerde Zichtbaarheid

### Wie ziet wat? (Via Security Groups)

| Security Group | Ziet | Kan beheren |
|----------------|------|-------------|
| **Domain Admins** | ALLES | Users, Workspaces, Projects, ACL |
| **Workspace-X-Admin** | Workspace X + projecten | Users voor X, Projects in X |
| **Workspace-X** | Workspace X + projecten | Taken in projecten |
| **Project-Y-Admin** | Project Y | Users voor Y, Project settings |
| **Project-Y** | Project Y | Eigen taken |

### Voorbeeld: GenX Organisatie

```
Kanbu (Domain)
│
├── Robin
│   └── Lid van: Domain Admins ──────────────── Ziet ALLES, beheert ALLES
│
├── Workspace: "TechCorp BV"
│   ├── Jan
│   │   └── Lid van: Workspace-TechCorp-Admin ─ Ziet TechCorp, kan users inviten
│   ├── Piet
│   │   └── Lid van: Project-Website-Admin ──── Ziet Website project, is admin
│   └── Project: "Website Redesign"
│       └── Klaas
│           └── Lid van: Project-Website ────── Ziet alleen dit project
│
└── Workspace: "DataFlow BV"
    ├── Marie
    │   └── Lid van: Workspace-DataFlow-Admin ─ Ziet DataFlow, kan users inviten
    ├── Piet
    │   └── Lid van: Project-Analytics ──────── Ziet ook dit project!
    └── Project: "Analytics Dashboard"

Piet is lid van 2 security groups in 2 verschillende workspaces:
- Project-Website-Admin (TechCorp) → Admin
- Project-Analytics (DataFlow) → Member
```

---

## Feature Levels

Elke feature hoort bij een specifiek container level:

### Personal Level (Dashboard)

Features die **cross-container** zijn - aggregatie van alles waar je toegang hebt.

| Feature | Beschrijving |
|---------|--------------|
| **Favorites** | Jouw shortcuts naar projecten uit ALLE workspaces |
| **My Tasks** | Taken uit ALLE projecten waar je lid van bent |
| **My Subtasks** | Subtaken uit ALLE projecten |
| **Overview/Widgets** | Persoonlijke stats en dashboards |
| **Notes** | Persoonlijke notities |
| **Inbox** | Notificaties van ALLE containers |

**URL Patroon:** `/dashboard/*`

**Sidebar:** `DashboardSidebar`

### Workspace Level

Features die bij **één workspace** horen.

| Feature | Beschrijving |
|---------|--------------|
| **Projects** | Lijst van projecten in deze workspace |
| **Groups** | Organisatie/categorisatie van projecten |
| **Wiki** | Kennisbank van de workspace |
| **Members** | Gebruikers lid van deze workspace |
| **Statistics** | Stats over deze workspace |
| **Settings** | Workspace configuratie |

**URL Patroon:** `/workspace/:slug/*`

**Sidebar:** `WorkspaceSidebar`

### Project Level

Features die bij **één project** horen.

| Feature | Beschrijving |
|---------|--------------|
| **Board** | Kanban bord |
| **List** | Takenlijst |
| **Calendar** | Kalenderweergave |
| **Timeline** | Gantt/timeline view |
| **Sprints** | Sprint planning |
| **Milestones** | Milestones beheer |
| **Analytics** | Project statistieken |
| **GitHub** | Gekoppelde repository |
| **Members** | Gebruikers lid van dit project |
| **Settings** | Project configuratie |

**URL Patroon:** `/workspace/:slug/project/:id/*`

**Sidebar:** `ProjectSidebar`

---

## Navigatie Principes

### 1. Context-aware Sidebars

Elke container level heeft zijn eigen sidebar:

```
/dashboard              → DashboardSidebar (Personal items)
/workspaces             → Geen sidebar of minimaal
/workspace/:slug        → WorkspaceSidebar (Workspace modules)
/workspace/:slug/project/:id → ProjectSidebar (Project features)
```

### 2. Geen Tree in Sidebar

- Workspaces worden getoond op `/workspaces` pagina
- Projects worden getoond op `/workspace/:slug` pagina
- Sidebar toont alleen **modules van huidige container**

### 3. Favorites zijn Personal

Favorites verschijnen alleen in `DashboardSidebar` omdat:
- Ze cross-container zijn (projecten uit verschillende workspaces)
- Ze persoonlijk zijn (jouw shortcuts)
- Ze niet bij één workspace horen

### 4. ACL bepaalt zichtbaarheid

- User ziet alleen objecten waar hij (via security group) rechten op heeft
- Modules/menu items zijn objecten - alleen zichtbaar met juiste permissions
- Sidebar items worden gefilterd op ACL (RWXDP)
- Admin features alleen zichtbaar voor users in Admin security groups

---

## URL Structuur

```
/dashboard                              → Personal overview
/dashboard/tasks                        → My Tasks (cross-container)
/dashboard/subtasks                     → My Subtasks
/dashboard/notes                        → Personal notes

/workspaces                             → Lijst van workspaces

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

## Sidebar Componenten

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

## Belangrijke Regels

### DO's

- ✅ Elke container heeft eigen members
- ✅ Elke container heeft eigen modules
- ✅ Sidebar past zich aan op container level
- ✅ ACL bepaalt wat zichtbaar is
- ✅ Favorites zijn altijd personal level

### DON'Ts

- ❌ Geen tree structuur in sidebar
- ❌ Geen workspace modules in ProjectSidebar
- ❌ Geen project-specifieke items in DashboardSidebar
- ❌ Geen cross-container features op workspace/project level

---

## Referenties

- [ROADMAP.md](./ROADMAP.md) - Implementatie roadmap
- [VISIE.md](./VISIE.md) - Design principes
