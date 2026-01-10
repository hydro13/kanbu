# Dashboard Concurrentie Analyse

## Versie: 1.0.0
## Datum: 2026-01-10
## Status: Research Complete

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

## Vergelijkingstabel

| Feature | Jira | GitHub | Linear | Plane | ClickUp | Notion | Asana | Monday | Trello | Claude's | **Kanbu** |
|---------|------|--------|--------|-------|---------|--------|-------|--------|--------|----------|-----------|
| Collapsible sidebar | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔶 |
| Workspace tree | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔲 |
| Starred/favorites | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔲 |
| Personal customization | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 🔲 |
| Keyboard navigation | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | 🔶 |
| Command palette (⌘K) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | 🔶 |
| My Tasks section | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | 🔶 |
| Folders/Groups | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | 🔲 |
| Open in overlay | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | 🔲 |
| Dashboard widgets | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | 🔲 |
| Private section | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 🔶 |
| Role-based UI | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 🔲 |
| Offline-first | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | 🔲 |
| Universal search | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 🔲 |
| Vim-style nav | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 🔲 |

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

## Aanbevelingen voor Kanbu

### Basis Aanwezig (Beta/Ontwikkeling)

Kanbu heeft de volgende features in verschillende stadia (🔶 = in ontwikkeling):
- 🔶 **Collapsible sidebar** - `Ctrl + /` (basis)
- 🔶 **Command palette** - `Ctrl + K` (basis)
- 🔶 **Keyboard shortcuts** - Niet compleet
- 🔶 **Sticky Notes** - Basis

*Let op: Bovenstaande features bestaan maar zijn niet allemaal feature-complete of gepolished.*

### Must Have (Fase 1-2)

1. **Collapsible Workspace Tree**
   - Workspaces open/dicht
   - Projecten onder workspace
   - State persist in localStorage

2. **Starred/Favorites**
   - Star any project
   - Pinned to top
   - Cross-workspace visible

### Should Have (Fase 3)

4. **Project Type Icons**
   - Kanbu = 📋
   - GitHub = 🐙
   - Group = 📂

5. **Personal Section**
   - Private projects
   - Sticky Notes
   - Personal tasks view

6. **Open in Overlay**
   - Quick peek zonder navigeren
   - Zoals Monday.com

### Could Have (Fase 4)

7. **Customizable Home**
   - Widget-based
   - Drag & drop layout
   - Per-user settings

8. **Sub-folders/Groups**
   - Project Groups als folders
   - Gecombineerde stats

---

## Conclusie

### Wat Iedereen Doet
- Collapsible sidebar
- Workspace/Team hiërarchie
- Personal task view
- Search everywhere

### Wat Differentieert
- **Linear**: Keyboard-first, minimal design
- **Notion**: Infinite flexibility, teamspaces
- **ClickUp**: Alles-in-één, dual sidebar
- **GitHub**: Code-first, automations

### Kanbu's Kans
Combineer het beste van:
- **Linear's speed** - Keyboard shortcuts, clean UI
- **Notion's structure** - Teamspaces, private section
- **GitHub's integration** - Code-first waar nodig
- **Plane's simplicity** - Easy onboarding

> **Kanbu differentiator:** GitHub + Kanbu in één unified experience
