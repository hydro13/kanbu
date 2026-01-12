# Dashboard Concurrentie Analyse

## Versie: 2.0.0
## Datum: 2026-01-11
## Status: Updated after Fase 0-4 completion

---

## Onderzochte Tools

| Tool | Type | Focus |
|------|------|-------|
| [Jira](https://www.atlassian.com/software/jira) | Enterprise | Issue tracking, Agile |
| [GitHub Projects](https://github.com/features/issues) | Developer | Code-first planning |
| [Linear](https://linear.app) | Startup/Scale-up | Speed, keyboard-first |
| [Plane](https://plane.so) | Open Source | Jira alternative |
| [ClickUp](https://clickup.com) | All-in-one | Feature-rich |
| [Notion](https://notion.so) | Docs + PM | Flexibility |
| [Asana](https://asana.com) | Team work | Goals & tasks |
| [Monday.com](https://monday.com) | Work OS | Visual workflows |
| [Trello](https://trello.com) | Kanban | Simplicity |
| [Claude's Planner](./IDEAAL-DASHBOARD-ONTWERP.md) | Theoretisch | Best practices synthesis |

---

## 1. Jira (Atlassian)

### Sidebar Structuur
```
┌────────────────────┐
│ 🏠 Home            │
│ 🔍 Search          │
│ 📊 Dashboards ★    │
│ 📁 Projects        │
│ 🎯 Goals           │
│ 🔔 Notifications   │
├────────────────────┤
│ ▼ Recent Projects  │
│   └── Project A    │
│   └── Project B    │
├────────────────────┤
│ ★ Starred          │
│ ⚙️ Settings        │
└────────────────────┘
```

### Sterke Punten
- **Collapsible sidebar** - Maximize screen space
- **Customizable** - Show/hide/reorder items persoonlijk
- **Global top bar** - Settings, notifications, search altijd bereikbaar
- **Starred items** - Snel naar favorieten
- **Dashboards met gadgets** - Pie charts, bar charts, issue lists

### Zwakke Punten
- **Complex** - Steile leercurve
- **Traag** - Performance issues bij grote datasets
- **Overwhelming** - Te veel opties voor kleine teams

### Wat Kanbu Kan Leren
✅ Personaliseerbare sidebar per gebruiker
✅ Starred/favoriten systeem
✅ Gadget-based dashboards

**Bronnen:** [Jira's UI Update 2025](https://orangeava.com/blogs/blogs/jira-s-ui-and-navigation-update-2025-q-a-guide), [Jira Dashboard Guide](https://planyway.com/blog/how-to-create-a-jira-dashboard)

---

## 2. GitHub Projects

### Sidebar Structuur
```
┌────────────────────┐
│ 🏠 Home            │
│ 📋 Issues          │
│ 🔀 Pull Requests   │
│ 💬 Discussions     │
│ 📦 Projects        │
├────────────────────┤
│ ▼ Your Projects    │
│   └── Project 1    │
│   └── Project 2    │
├────────────────────┤
│ 📊 Insights        │
└────────────────────┘
```

### Sterke Punten
- **Code-first** - Issues, PRs, Projects in één plek
- **Automations** - Cards auto-move bij PR merge
- **Views** - Board, Table, Roadmap
- **Geen context switch** - Alles in GitHub

### Nieuwe Features (2025)
- **Agent module** - AI task status
- **My Work tab** - Recent PRs/issues met filters
- **Default workflows** - Auto "In Progress" bij linked PR
- **Improved API** - Status change events

### Zwakke Punten
- **Beperkte dashboards** - Geen custom widgets
- **Geen multi-repo overview** - Per-project view
- **Geen workspaces** - Flat structure

### Wat Kanbu Kan Leren
✅ "My Work" tab met filters
✅ Automations bij PR/issue links
✅ Clean, focused interface

**Bronnen:** [GitHub Dashboard Update](https://github.blog/changelog/2025-08-28-improvements-to-the-home-dashboard-available-in-public-preview/), [GitHub Projects Onboarding](https://github.blog/changelog/2025-11-06-improved-onboarding-flow-for-github-projects/)

---

## 3. Linear

### Sidebar Structuur
```
┌────────────────────┐
│ 🏠 Home            │
│ 📥 Inbox           │
│ ✅ My Issues       │
├────────────────────┤
│ ▼ Teams            │
│   ├── Engineering  │
│   │   └── Cycles   │
│   │   └── Backlog  │
│   └── Design       │
├────────────────────┤
│ 📊 Dashboards      │
│ 🎯 Initiatives     │
│ 🗺️ Roadmaps       │
├────────────────────┤
│ ⚙️ Settings        │
└────────────────────┘
```

### Sterke Punten
- **Keyboard-first** - Alles via shortcuts
- **Minimal design** - Geen clutter
- **Fast** - Geoptimaliseerd voor snelheid
- **Custom themes** - Light/dark + custom
- **Personalized sidebar** - Drag & drop reorder

### Design Filosofie
> "We rely on structured layouts that support navigation elements and content. We spent time aligning labels, icons, and buttons both vertically and horizontally."

### Dashboards (Juli 2025)
- Modular en customizable
- Charts, tables, single-number metrics
- Cross-team data combining
- 50%+ enterprise adoption

### Wat Kanbu Kan Leren
✅ Keyboard shortcuts OVERAL
✅ Alignment en visual rhythm
✅ Minimal maar niet basic
✅ Teams als eerste-niveau groepering

**Bronnen:** [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui), [Linear Dashboards](https://linear.app/changelog/2025-07-24-dashboards), [Personalized Sidebar](https://linear.app/changelog/2024-12-18-personalized-sidebar)

---

## 4. Plane (Open Source)

### Sidebar Structuur
```
┌────────────────────┐
│ 🏠 Home            │
│ 📥 Inbox           │
├────────────────────┤
│ ▼ Projects         │
│   └── Project A    │
│   └── Project B    │
├────────────────────┤
│ 📊 Analytics       │
│ 📄 Pages           │
│ ⚙️ Settings        │
└────────────────────┘
```

### Sterke Punten
- **Simple UI** - Clean, intuitive
- **Quick onboarding** - Teams starten snel
- **Pages feature** - Docs naast tasks
- **Self-hostable** - Full control over data
- **Open source** - Transparantie

### User Feedback (G2)
> "Hits the sweet spot between flexibility and simplicity"
> "The simple UI means teams can focus on delivering work instead of learning software"

### Zwakke Punten
- Geen native mobile apps
- Beperkte workflow customization
- Minder integraties dan concurrentie

### Wat Kanbu Kan Leren
✅ Simplicity als feature
✅ Pages/docs naast tasks
✅ Self-hosting als selling point

**Bronnen:** [Plane.so](https://plane.so), [Plane G2 Reviews](https://www.g2.com/products/plane-so/reviews)

---

## 5. ClickUp

### Sidebar Structuur (ClickUp 4.0)
```
┌────────────────────┐
│ Global Navigation  │
│ ──────────────────│
│ 💬 Chat            │
│ 🤖 AI Hub          │
│ 📅 Planner         │
│ 🔧 App Center      │
├────────────────────┤
│ HOME SIDEBAR       │
│ ──────────────────│
│ 🔔 Notifications   │
│ ✅ My Tasks        │
│   ├── Assigned     │
│   ├── Today        │
│   └── Personal     │
│ 💬 Conversations   │
│ ★ Favorites        │
├────────────────────┤
│ SPACES SIDEBAR     │
│ ──────────────────│
│ ▼ Space A          │
│   ├── 📁 Folder 1  │
│   │   └── List A   │
│   └── 📁 Folder 2  │
│ ▼ Space B          │
└────────────────────┘
```

### Sterke Punten
- **Dual sidebar** - Home + Spaces apart
- **Hiërarchie** - Spaces > Folders > Lists > Tasks
- **Pinnable items** - Top/bottom pinning
- **Overlay mode** - Quick peek zonder navigeren
- **Dashboards Hub** - All dashboards in één plek

### Features
- `Cmd + \` collapse sidebar
- Drag & drop reordering
- Search + filters in sidebar
- Sub-folders support

### Zwakke Punten
- **Te veel features** - Overwhelming
- **Complexe hiërarchie** - 4 niveaus
- **Performance** - Kan traag zijn

### Wat Kanbu Kan Leren
✅ Spaces/Workspaces als top-level
✅ Folders voor groepering
✅ Quick overlay voor peek
✅ Keyboard shortcut voor collapse

**Bronnen:** [ClickUp Sidebar Intro](https://help.clickup.com/hc/en-us/articles/12755292456983-Intro-to-Sidebar), [Dashboards Hub](https://help.clickup.com/hc/en-us/articles/14236332445335-Dashboards-Hub)

---

## 6. Notion

### Sidebar Structuur
```
┌────────────────────┐
│ Workspace Switcher │
│ ──────────────────│
│ 🔍 Search (⌘K)    │
│ 🤖 Notion AI       │
│ 🏠 Home            │
│ 📥 Inbox           │
├────────────────────┤
│ TEAMSPACES         │
│ ▼ Engineering      │
│   └── Docs         │
│   └── Tasks        │
│ ▼ Marketing        │
├────────────────────┤
│ SHARED             │
│   └── Page A       │
├────────────────────┤
│ PRIVATE            │
│   └── Notes        │
├────────────────────┤
│ ★ Favorites        │
└────────────────────┘
```

### Design Specs
- **224px breed** - Vaste breedte
- **22px icon squares** - Consistent
- **131px nav section** - Search, AI, Home, Inbox
- **Infinite nesting** - Pages in pages

### Sterke Punten
- **Teamspaces** - Per team groepering
- **Private section** - Persoonlijke ruimte
- **Drag & drop** - Secties herordenen
- **Consistent icons** - Builds trust
- **Collapsible** - Hide voor focus

### Filosofie
> "Built to match how users think. Starts at top with workspace, then search, navigation, and content—a clean top-to-bottom flow."

### Wat Kanbu Kan Leren
✅ Teamspaces/Workspaces als secties
✅ Private section voor persoonlijk werk
✅ Vaste breedte voor consistency
✅ Top-to-bottom logical flow

**Bronnen:** [Notion Sidebar UI Breakdown](https://medium.com/@quickmasum/ui-breakdown-of-notions-sidebar-2121364ec78d), [Notion Sidebar Blog](https://www.notion.com/blog/new-sidebar-design)

---

## 7. Asana

### Sidebar Structuur
```
┌────────────────────┐
│ 🏠 Home            │
│ ✅ My Tasks        │
│ 📥 Inbox           │
│ 📊 Reporting       │
│ 🎯 Goals           │
├────────────────────┤
│ ★ Starred          │
├────────────────────┤
│ 📁 Projects        │
│ ▼ Team A           │
│   └── Project 1    │
│ ▼ Team B           │
├────────────────────┤
│ 👥 Teams           │
└────────────────────┘
```

### Home Features
- **Customizable widgets** - Resize, rearrange, remove
- **Private notepad** - Quick notes widget
- **Status updates** - Project health at a glance
- **Cross-device sync** - Desktop + mobile

### Sterke Punten
- **Goal tracking** - OKRs ingebouwd
- **Portfolio dashboards** - Cross-project view
- **Status updates** - Project health

### Zwakke Punten
- **Beperkte KPIs** - Geen formulas
- **Paywall** - Goals/Portfolios duur
- **Limited cross-project** - Per dashboard

### Wat Kanbu Kan Leren
✅ Widget-based home
✅ Private notepad (sticky notes!)
✅ Status updates prominent

**Bronnen:** [Asana Home](https://asana.com/features/project-management/home), [Asana Dashboard Features](https://www.projectmanager.com/blog/asana-dashboard)

---

## 8. Monday.com

### Sidebar Structuur
```
┌────────────────────┐
│ Workspace Dropdown │
│ ──────────────────│
│ 🔍 Quick Search    │
├────────────────────┤
│ ★ Favorites        │
├────────────────────┤
│ ▼ Workspace A      │
│   ├── 📁 Folder    │
│   │   └── Board 1  │
│   │   └── Board 2  │
│   └── 📊 Dashboard │
├────────────────────┤
│ ▼ Workspace B      │
├────────────────────┤
│ 📋 Browse All      │
└────────────────────┘
```

### Features
- **Workspace dropdown** - Switch contexts
- **Folders + Sub-folders** - Deep organization
- **Open in overlay** - Quick peek
- **Recent items** - Per workspace
- **Drag & drop** - Reorder boards

### Sterke Punten
- **Visual** - Color-coded everything
- **Flexible** - Aanpasbaar aan elk proces
- **Workspace homepage** - Overview per workspace

### Wat Kanbu Kan Leren
✅ Sub-folders voor structuur
✅ Open in overlay feature
✅ Workspace homepage met recents
✅ Browse all voor ontdekking

**Bronnen:** [Monday Workspaces](https://support.monday.com/hc/en-us/articles/360010785460-Getting-started-with-workspaces), [Monday Board Features](https://everhour.com/blog/monday-board/)

---

## 9. Trello

### Sidebar Structuur
```
┌────────────────────┐
│ 🏠 Home            │
├────────────────────┤
│ ★ Starred Boards   │
│   └── Board A      │
├────────────────────┤
│ ▼ Workspace 1      │
│   └── Board B      │
│   └── Board C      │
├────────────────────┤
│ ▼ Workspace 2      │
└────────────────────┘
```

### Features
- **Board switcher** - Grid or list view
- **Starred boards** - Quick access
- **Global search** - '/' shortcut
- **Dashboard view** - Cards per list, due date, member, label

### Sterke Punten
- **Simple** - Easy to understand
- **Keyboard shortcuts** - 'b' for boards, '/' for search
- **Visual boards** - Drag & drop

### Zwakke Punten
- **Flat structure** - Geen folders
- **Premium features** - Views achter paywall
- **Limited dashboards** - Basic analytics

### Wat Kanbu Kan Leren
✅ Starred als top priority
✅ Grid vs list toggle
✅ Keep it simple

**Bronnen:** [Trello Navigation](https://support.atlassian.com/trello/docs/navigation-in-trello/), [Trello New Sidebar](https://www.atlassian.com/blog/trello/new-sidebar-and-header-navigation)

---

## 10. Claude's Planner (Theoretisch Ontwerp)

### Sidebar Structuur
```
┌────────────────────────┐
│ Workspace Switcher     │
│ ──────────────────     │
│ 🔍 Search (⌘K)         │
├────────────────────────┤
│ PERSONAL               │
│ ├─ 🏠 Home             │
│ ├─ 📥 Inbox        (3) │
│ ├─ ✅ My Tasks    (12) │
│ ├─ 📅 Today        (5) │
│ └─ ⏰ Upcoming     (8) │
├────────────────────────┤
│ FAVORITES              │
│ ├─ ⭐ Project Alpha    │
│ └─ ⭐ Sprint Board     │
├────────────────────────┤
│ WORKSPACES             │
│ ▼ 🏢 Acme Corp         │
│   ├─ 📋 KANBU          │
│   │   └─ Website       │
│   ├─ 🐙 GITHUB         │
│   │   └─ api-backend   │
│   └─ 📂 GROUPS         │
│       └─ Frontend Team │
│ ▶ 🏢 Side Projects     │
├────────────────────────┤
│ 📝 Notes               │
│ ⚙️ Settings            │
└────────────────────────┘
```

### Ontwerpprincipes

1. **Progressive Disclosure** - Toon alleen wat nodig is, wanneer nodig
2. **Keyboard-First** - Alles bereikbaar via toetsenbord
3. **60-30-10 Regel** - 60% content, 30% navigatie, 10% chrome
4. **Cognitieve Belasting** - Aanpassen per gebruikersrol
5. **Offline-First** - Werkt zonder internet, sync later

### Sterke Punten
- **Theoretisch ideaal** - Combineert beste van alle tools
- **Schaalbaarheid** - Ontworpen voor 1 tot 100K+ gebruikers
- **Accessibility** - WCAG 2.1 compliant by design
- **Role-based UI** - Andere view voor dev vs CEO
- **Universal Search** - Zoek alles met operators

### Unieke Features
- **Smart Grouping** - Today/Upcoming/Backlog/Overdue automatisch
- **Widget-based Home** - Personaliseerbaar per gebruiker
- **Vim-style Navigation** - Optional voor power users
- **Conflict Resolution UI** - Bij offline sync
- **4-Level Notificaties** - Urgent → Important → Info → Silent

### Wat Het Mist
- **Niet getest** - Puur theoretisch
- **Geen implementatie** - Bestaat niet in code
- **Geen gebruikers** - Geen echte feedback
- **Te idealistisch?** - Mogelijk te complex voor MVP

### Wat Kanbu Kan Leren
✅ Progressive disclosure pattern
✅ Role-based dashboard personalisatie
✅ Universal search met operators
✅ Widget-based home layout
✅ Offline-first architectuur
✅ 4-level notificatie systeem

**Bronnen:** [IDEAAL-DASHBOARD-ONTWERP.md](./IDEAAL-DASHBOARD-ONTWERP.md) - Volledig 18-delig document

---

## Vergelijkingstabel (Bijgewerkt 2026-01-11)

**Legenda:** ✅ = Volledig | 🔶 = Gedeeltelijk | 🔲 = Niet aanwezig | ⭐ = Uniek voor Kanbu

### Basis Features

| Feature | Jira | GitHub | Linear | Plane | ClickUp | Notion | Asana | Monday | Trello | **Kanbu** |
|---------|------|--------|--------|-------|---------|--------|-------|--------|--------|-----------|
| Collapsible sidebar | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Container-aware sidebars | ❌ | ❌ | ❌ | ❌ | 🔶 | ❌ | ❌ | ❌ | ❌ | **⭐** |
| Starred/favorites | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Personal customization | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | **🔶** |
| Keyboard navigation | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | **✅** |
| Command palette (⌘K) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | **✅** |
| My Tasks section | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | **✅** |
| My Subtasks section | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **⭐** |
| Folders/Groups | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | **✅** |
| Open in overlay | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | **🔲** |
| Dashboard widgets | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | **✅** |
| Private notes | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | **✅** |
| Context menus | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | **✅** |
| Drag & drop board | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | **✅** |
| Drag & drop sidebar | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | **✅** |
| Inbox/Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Productivity stats | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | **✅** |
| Universal search | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | **✅** |

### Geavanceerde Features

| Feature | Jira | GitHub | Linear | Plane | ClickUp | Notion | Asana | Monday | Trello | **Kanbu** |
|---------|------|--------|--------|-------|---------|--------|-------|--------|--------|-----------|
| **Wiki systeem** | ✅ | ✅ | ❌ | ✅ | 🔶 | ✅ | ❌ | ❌ | ❌ | **✅** |
| Workspace Wiki | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Project Wiki | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | **✅** |
| Wiki cross-linking | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **🔶** |
| **Project Types** | | | | | | | | | | |
| Internal projects | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| GitHub repo projects | ❌ | ✅ | ✅ | ❌ | 🔶 | ❌ | ❌ | ❌ | ❌ | **✅** |
| GitHub Wiki sync | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **🔶** |
| **Integraties** | | | | | | | | | | |
| GitHub deep integration | ❌ | ✅ | ✅ | ❌ | 🔶 | ❌ | ❌ | ❌ | ❌ | **✅** |
| MCP AI integration | ❌ | 🔶 | ❌ | ❌ | 🔶 | ❌ | ❌ | ❌ | ❌ | **⭐** |
| **Security** | | | | | | | | | | |
| Role-based ACL | ✅ | ✅ | 🔶 | 🔶 | ✅ | 🔶 | ✅ | ✅ | 🔶 | **✅** |
| LDAP integration | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | **✅** |
| Self-hostable | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| **Nog niet geïmplementeerd** | | | | | | | | | | |
| Offline-first | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | **🔲** |
| Vim-style nav | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **🔲** |

---

## Kanbu Unieke Features (⭐)

### 1. Container-Aware UI Architectuur

Kanbu heeft een **unieke 3-level sidebar architectuur** die geen enkele concurrent biedt:

```
Level 1: DashboardSidebar (/dashboard/*)
├── Personal overview, My Tasks, Inbox
├── Favorites (cross-workspace)
└── Notes

Level 2: WorkspaceSidebar (/workspace/:slug/*)
├── Projects, Groups, Wiki
├── Members, Statistics
└── Settings

Level 3: ProjectSidebar (/workspace/:slug/project/:id/*)
├── Board, List, Calendar views
├── Sprints, Milestones, Analytics
└── GitHub, Members, Settings
```

**Voordeel:** De sidebar past zich automatisch aan op basis van de container waar je bent. Geen onnodige complexiteit.

### 2. Dual Wiki Systeem

Kanbu biedt wiki's op **twee niveaus** met koppelingen:

```
Workspace Wiki (Bedrijf/Organisatie level)
├── Interne kennisbank
├── Bedrijfsbrede procedures
└── Cross-project documentatie
    │
    ├──── koppeling ────┐
    │                   ▼
Project Wiki (Project level)
├── Project-specifieke docs
├── Technical specs
└── GitHub Wiki sync (voor GitHub projecten)
```

**Gepland:** Wiki cross-linking zodat project wiki kan refereren naar workspace wiki en vice versa.

### 3. Dual Project Types

Kanbu ondersteunt **twee verschillende project structuren**:

| Type | Beschrijving | Wiki | Sync |
|------|--------------|------|------|
| **Kanbu Project** | Interne project structuur met board, sprints, milestones | Project Wiki | N/A |
| **GitHub Project** | Gekoppeld aan GitHub repo met issues, PRs, commits | GitHub Wiki sync | 1:1 met repo |

**GitHub Project Features:**
- PR/commit tracking linked to tasks
- Auto-branch creation from tasks
- Issue sync van/naar GitHub
- Wiki synchroniseert 1:1 met repo wiki

### 4. MCP AI Integration (Claude Code) ⭐⭐⭐

Kanbu is de **eerste project management tool waar AI een volwaardige systeembeheerder is**, niet slechts een chatbot.

**141 MCP Tools** verdeeld over 16 implementatiefases:

```
┌─────────────────────────────────────────────────────────────────┐
│                    KANBU MCP ARCHITECTUUR                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Claude Code ←──── Secure Pairing ────→ Kanbu API             │
│        │           (KNB-XXXX-XXXX)            │                 │
│        │                                      │                 │
│        ▼                                      ▼                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                   141 MCP TOOLS                          │  │
│   ├─────────────────────────────────────────────────────────┤  │
│   │ CORE (45 tools)           │ ADMIN (50 tools)            │  │
│   │ • Workspaces (5)          │ • User Management (11)      │  │
│   │ • Projects (6)            │ • Groups & Members (10)     │  │
│   │ • Tasks & Subtasks (14)   │ • ACL/Permissions (20)      │  │
│   │ • Comments (5)            │ • Invites (5)               │  │
│   │ • Search & Activity (5)   │ • Audit Logs (5)            │  │
│   │ • Analytics (4)           │                             │  │
│   ├─────────────────────────────────────────────────────────┤  │
│   │ PROFILE (36 tools)        │ SYSTEM (10 tools)           │  │
│   │ • 2FA Setup/Disable       │ • Database Backup           │  │
│   │ • API Tokens              │ • Source Code Backup        │  │
│   │ • Sessions Management     │ • System Settings           │  │
│   │ • OAuth Accounts          │ • Admin Workspaces          │  │
│   │ • Notifications           │                             │  │
│   │ • Public Access           │                             │  │
│   ├─────────────────────────────────────────────────────────┤  │
│   │ GITHUB (10 tools)                                        │  │
│   │ • Link/Unlink Repos  • List PRs/Commits                 │  │
│   │ • Sync Issues        • Create Feature Branches          │  │
│   │ • Link PRs to Tasks  • Get Task PR/Commits              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    SECURITY MODEL                        │  │
│   │                                                          │  │
│   │  • One-time pairing code (5 min TTL)                    │  │
│   │  • Machine binding (SHA256 hostname+user)               │  │
│   │  • ACL inheritance van verbonden gebruiker              │  │
│   │  • Alle acties in audit log (via: "assistant")          │  │
│   └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Wat Claude Code kan doen in Kanbu:**

| Categorie | Voorbeelden |
|-----------|-------------|
| **Task Management** | Taken aanmaken, toewijzen, verplaatsen, zoeken, subtasks beheren |
| **User Administration** | Gebruikers aanmaken, wachtwoord resetten, 2FA uitschakelen, accounts unlocken |
| **Security Management** | Permissions toekennen/intrekken, ACL export/import, permission simulatie |
| **GitHub Operations** | Repos linken, feature branches maken, issues synchroniseren |
| **System Operations** | Database backup naar Google Drive, system settings aanpassen |
| **Audit & Compliance** | Audit logs opvragen, exporteren (CSV/JSON), statistieken bekijken |

**Vergelijking met concurrenten:**

| Tool | AI Capability | Diepgang |
|------|---------------|----------|
| **ClickUp** | AI schrijft task descriptions | Oppervlakkig |
| **Notion** | AI genereert content | Alleen content |
| **GitHub Copilot** | AI in code editor | Geen PM access |
| **Jira** | Atlassian Intelligence | Beperkt tot suggestions |
| **Kanbu** | **AI is volwaardige systeembeheerder** | **141 tools, volledige toegang** |

**Praktijkvoorbeeld:**
```
Gebruiker: "Maak een nieuwe workspace 'Acme Corp', voeg project 'Website Redesign'
           toe met 5 taken voor de homepage redesign, en nodig jan@acme.com uit"

Claude Code (via MCP):
1. kanbu_create_workspace → Workspace ID 42
2. kanbu_create_project → Project ID 156
3. kanbu_create_task (×5) → 5 taken aangemaakt
4. kanbu_send_invite → Uitnodiging verstuurd
5. Alle acties gelogd met "via: assistant"
```

> **Kanbu's MCP is geen AI-assistent die taken suggereert - het is een AI-agent die volledige systeemtoegang heeft met de exacte permissies van de verbonden gebruiker.**

#### Live Case Study: Project Setup (2026-01-12)

**Opdracht:**
> "Bekijk de GitHub-projects documentatie en maak een project onder workspace GenX met dezelfde naam. Richt taken in voor wat er allemaal nog moet gedaan worden."

**Wat Claude Code deed:**

```
Stap 1: Documentatie analyseren
├── README.md gelezen (kernboodschap, architectuur)
├── ROADMAP.md gelezen (5 fases, 36 deliverables)
├── VISIE.md gelezen (sync strategie, entiteiten)
└── IMPLEMENTATIE-PLAN.md gelezen (technische details)

Stap 2: Project aanmaken
├── kanbu_whoami → Verbinding checken (Robin Waslander, ADMIN)
├── kanbu_list_workspaces → GenX workspace vinden (ID: 534)
├── kanbu_create_project → "GitHub Projects" aanmaken (ID: 321)
└── kanbu_get_project → Column IDs ophalen (Backlog: 107)

Stap 3: Taken aanmaken (36 stuks)
├── [Fase 1] 6 taken - Workspace Integratie
├── [Fase 2] 6 taken - Board View
├── [Fase 3] 10 taken - Complete UI
├── [Fase 4] 8 taken - Bi-directionele Sync
└── [Fase 5] 6 taken - Advanced Features
```

**Resultaat:**

| Metric | Waarde |
|--------|--------|
| Totale tijd | **~2 minuten** |
| Taken aangemaakt | 36 |
| MCP calls | 42 |
| Fouten | 0 |
| Handmatige input nodig | 1 zin |

**Vergelijking met handmatig:**

| Tool | Tijd voor 36 taken | Leercurve |
|------|-------------------|-----------|
| Jira | 1-2 uur | Weken training |
| ClickUp | 45 min | Dagen |
| Linear | 30 min | Uren |
| Kanbu (UI) | 20-30 min | Uren |
| **Kanbu (MCP)** | **2 min** | **0** |

**Conclusie:** De gebruiker typte één zin. Claude Code las 4 documenten, analyseerde de structuur, en creëerde een volledig project met 36 taken in de juiste categorieën. Zero UI interactie. Zero leercurve. Volledige audit trail.

### 5. ACL + LDAP Security

Enterprise-grade security die concurrenten alleen in dure tiers bieden:

| Feature | Jira | Linear | ClickUp | **Kanbu** |
|---------|------|--------|---------|-----------|
| Granular ACL | Enterprise tier | ❌ | Business+ | **✅ Standaard** |
| LDAP/AD | Data Center | ❌ | Enterprise | **✅ Standaard** |
| Self-hosted | Data Center ($) | ❌ | ❌ | **✅ Gratis** |
| Permission inheritance | ✅ | ❌ | 🔶 | **✅** |

### 6. My Subtasks Dashboard

Geen enkele concurrent biedt een dedicated subtasks view:

```
/dashboard/subtasks
├── Subtasks assigned to me (cross-project)
├── Grouped by parent task
├── Status tracking (TODO, IN_PROGRESS, DONE)
└── Time tracking per subtask
```

---

## Top Patronen (Best Practices)

### 1. Sidebar Structuur
Alle tools hebben een **hiërarchische sidebar**:
```
Top Navigation (Search, Notifications)
├── Personal Items (My Tasks, Inbox)
├── Workspaces/Teams (collapsible)
│   └── Projects/Boards
└── Settings
```

### 2. Collapsible Alles
- Sidebar collapse (`Cmd + \`)
- Workspaces collapse
- Folders/sections collapse
- Persoonlijke state per gebruiker

### 3. Starred/Favorites
7 van 9 tools hebben een favorites systeem:
- Pinned to top
- Quick access
- Cross-workspace

### 4. Personal Customization
Trend naar personalisatie:
- Drag & drop reordering
- Show/hide items
- Saved per user (niet team)

### 5. Keyboard First (Linear Invloed)
Linear's success heeft gezorgd voor:
- Shortcuts voor alles
- Command palette (⌘K)
- Focus op speed

### 6. My Tasks/Work
Centrale plek voor persoonlijk werk:
- Assigned to me
- Today + Overdue
- Quick filters

---

## Implementatie Status (2026-01-11)

### Volledig Geïmplementeerd (✅)

| Feature | Status | Sinds |
|---------|--------|-------|
| Collapsible sidebar | ✅ | Fase 0 |
| Container-aware sidebars | ✅ | Fase 0-1 |
| Command palette (⌘K) | ✅ | Fase 4.3 |
| Keyboard navigation (G+key) | ✅ | Fase 4.1 |
| Favorites systeem | ✅ | Fase 2.1 |
| My Tasks page | ✅ | Fase 2.3 |
| My Subtasks page | ✅ | Fase 2.3 |
| Inbox/Notifications | ✅ | Fase 3.1 |
| Dashboard widgets | ✅ | Fase 3.2 |
| Workspace Wiki | ✅ | Fase 1.5 |
| Project Groups | ✅ | Fase 1.6 |
| Context menus | ✅ | Fase 4.2 |
| Drag & drop (board) | ✅ | Pre-roadmap |
| Drag & drop (sidebar) | ✅ | Fase 4.5 |
| ACL + LDAP | ✅ | Core |
| MCP AI integration | ✅ | Core |
| GitHub integration | ✅ | Core |
| Dual project types | ✅ | Core |

### Gepland (🔶)

| Feature | Status | Gepland |
|---------|--------|---------|
| Wiki cross-linking | 🔶 | Q1 2026 |
| GitHub Wiki sync | 🔶 | Q1 2026 |
| Widget customization | 🔶 | Q2 2026 |
| Open in overlay | 🔶 | Q2 2026 |

### Niet Gepland (🔲)

| Feature | Reden |
|---------|-------|
| Offline-first | Complexiteit vs. use case |
| Vim-style nav | Niche power-user feature |

---

## Conclusie

### Feature Completeness Score

```
                    FEATURE COMPLETENESS (2026-01-11)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ClickUp    ████████████████████████████░░░░  88%  (Overwhelming)
Jira       ██████████████████████████░░░░░░  82%  (Enterprise-only)
Linear     █████████████████████████░░░░░░░  78%  (Paid features)
Notion     ████████████████████████░░░░░░░░  75%  (Docs-first)
────────────────────────────────────────────────────────
Kanbu      █████████████████████████░░░░░░░  78%  ← NU (+ unieke features)
────────────────────────────────────────────────────────
Asana      ████████████████████░░░░░░░░░░░░  65%
Monday     ████████████████████░░░░░░░░░░░░  63%
GitHub     ███████████████░░░░░░░░░░░░░░░░░  48%
Plane      █████████████░░░░░░░░░░░░░░░░░░░  42%
Trello     ████████████░░░░░░░░░░░░░░░░░░░░  38%
```

### Wat Kanbu Uniek Maakt

| Differentiator | Impact |
|----------------|--------|
| **Container-aware UI** | Cleaner dan ClickUp's 4-level hiërarchie |
| **MCP AI integration** | Eerste PM tool met echte AI-agent support |
| **Dual Wiki systeem** | Workspace + Project level met koppelingen |
| **GitHub-native** | Dieper geïntegreerd dan Linear |
| **Self-hosted + ACL/LDAP** | Enterprise features gratis |
| **My Subtasks** | Unieke feature die niemand heeft |

### Kanbu vs. Top 3 Concurrenten

| vs. | Kanbu Wint | Kanbu Verliest |
|-----|------------|----------------|
| **ClickUp** | Simpler UI, MCP, self-hosted | Minder widgets, geen overlay |
| **Linear** | More features, MCP, LDAP | Geen offline, minder polish |
| **Notion** | Task management, GitHub, MCP | Minder flexible docs |

### Strategic Position

#### Traditionele Vergelijking (UI-based)

```
                    COMPLEXITY
                        ↑
            Jira ●      │      ● ClickUp
                        │
                        │
         Plane ●        │        ● Monday
                        │
                        │        ● Kanbu (UI mode)
                        │
          Trello ●      │      ● Asana
                        │
           GitHub ●     │     ● Linear
                        │
                        ↓
                    SIMPLICITY
```

#### Met MCP: Paradigmaverschuiving

```
                    LEERCURVE
                        ↑
            Jira ●      │      ● ClickUp
                        │
            Asana ●     │      ● Monday
                        │
            Linear ●    │      ● Notion
                        │
            Plane ●     │      ● GitHub Projects
                        │
            Trello ●    │
                        │
    ════════════════════╪══════════════════════════→ FEATURES
                        │
                        │
                        │
         ┌──────────────┴──────────────┐
         │     🤖 KANBU + CLAUDE CODE   │
         │                              │
         │   "Configureer LDAP met     │
         │    onze Azure AD structuur"  │
         │                              │
         │         ↓ (10 min) ↓         │
         │                              │
         │   ✅ Security groups         │
         │   ✅ Permissions             │
         │   ✅ User sync               │
         │   ✅ Audit logging           │
         └──────────────────────────────┘
                        │
                        ↓
               ZERO LEERCURVE
           (Natural Language = UI)
```

### De MCP Game-Changer

**Waarom Kanbu de simpelste én krachtigste tool is:**

| Scenario | Zonder MCP | Met Kanbu + Claude Code |
|----------|------------|-------------------------|
| **LDAP configureren** | Documentatie lezen, 20+ schermen, trial & error | *"Koppel LDAP met onze Azure AD"* → 10 min |
| **Security groups opzetten** | ACL interface leren, handmatig aanmaken | *"Maak groups voor Dev, QA, Management"* → 2 min |
| **Nieuwe medewerker onboarden** | Account aanmaken, groups toewijzen, projecten toevoegen | *"Voeg jan@bedrijf.nl toe aan team Frontend"* → 30 sec |
| **Project structuur migreren** | Export/import, handmatig herstructureren | *"Verplaats alle taken van Sprint 3 naar Sprint 4"* → 1 min |
| **Compliance audit** | Audit logs doorzoeken, exporteren, rapporteren | *"Geef me alle permission changes van deze maand"* → 10 sec |

### Effectieve Complexiteit per User Type

```
                    ┌─────────────────────────────────────────────────┐
                    │           EFFECTIEVE COMPLEXITEIT               │
                    ├─────────────────────────────────────────────────┤
                    │                                                 │
                    │  ADMIN (LDAP, ACL, Users)                       │
                    │  ─────────────────────────                      │
                    │  Jira        ████████████████████████  Zeer hoog│
                    │  ClickUp     ██████████████████░░░░░░  Hoog     │
                    │  Kanbu (UI)  ████████████░░░░░░░░░░░░  Medium   │
                    │  Kanbu (MCP) ██░░░░░░░░░░░░░░░░░░░░░░  Minimaal │
                    │                                                 │
                    │  DEVELOPER (Tasks, GitHub, PRs)                 │
                    │  ──────────────────────────────                 │
                    │  Jira        ████████████████░░░░░░░░  Hoog     │
                    │  Linear      ████████░░░░░░░░░░░░░░░░  Medium   │
                    │  Kanbu (UI)  ██████░░░░░░░░░░░░░░░░░░  Laag     │
                    │  Kanbu (MCP) ██░░░░░░░░░░░░░░░░░░░░░░  Minimaal │
                    │                                                 │
                    │  EINDGEBRUIKER (Taken bekijken/updaten)         │
                    │  ──────────────────────────────────────         │
                    │  Trello      ████░░░░░░░░░░░░░░░░░░░░  Laag     │
                    │  Kanbu (UI)  ████░░░░░░░░░░░░░░░░░░░░  Laag     │
                    │  Kanbu (MCP) █░░░░░░░░░░░░░░░░░░░░░░░  Bijna 0  │
                    │                                                 │
                    └─────────────────────────────────────────────────┘
```

### De Ultieme Positionering

> **Kanbu is niet een tool die je moet leren - het is een tool die je begrijpt.**
>
> Met Claude Code MCP integratie wordt de gebruikersinterface letterlijk je moedertaal.
> Een Azure admin hoeft geen Kanbu documentatie te lezen. Hij zegt gewoon:
>
> *"Configureer Kanbu met onze Active Directory, maak security groups aan die
> matchen met onze Azure AD groups, zet de juiste permissions, en nodig het
> hele development team uit."*
>
> Claude Code doet de rest. In 10 minuten. Zonder fouten. Met volledige audit trail.

**Dit is waarom Kanbu uniek is:**
- **Andere tools** → Features achter complexe UI's
- **Kanbu** → Alle features toegankelijk via natuurlijke taal

> **Kanbu differentiator:** De enige project management tool waar je de UI niet hoeft te leren, omdat de UI gewoon praten is.
