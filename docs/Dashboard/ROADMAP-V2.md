# Dashboard Roadmap V2

## Versie: 2.7.0
## Datum: 2026-01-11
## Gebaseerd op: IDEAAL-DASHBOARD-ONTWERP-V2.md

---

## Leeswijzer

Dit document is de **implementatie roadmap** voor het container-aware dashboard systeem.
Gebaseerd op het ontwerp in [IDEAAL-DASHBOARD-ONTWERP-V2.md](./IDEAAL-DASHBOARD-ONTWERP-V2.md).

**Belangrijke documenten:**
- [IDEAAL-DASHBOARD-ONTWERP-V2.md](./IDEAAL-DASHBOARD-ONTWERP-V2.md) - Het volledige UI/UX ontwerp
- [KANBU-STRUCTUUR.md](./KANBU-STRUCTUUR.md) - Container hiërarchie definitie
- [ROADMAP.md](./ROADMAP.md) - Oude roadmap (v1, deprecated)

---

## Huidige Status

### Implementatie Progress

| Fase | Status | Voortgang |
|------|--------|-----------|
| **Fase 0** | ✅ COMPLEET | Foundation, bug fixes |
| **Fase 1** | ✅ COMPLEET | 6/6 items compleet |
| **Fase 2** | ✅ COMPLEET | 2/3 items (My Tasks al goed) |
| **Fase 3** | ✅ COMPLEET | 2/2 items compleet |
| **Fase 4** | ✅ COMPLEET | 5/5 items compleet (alle sub-fases) |

### Wat is er al?

| Component | Status | Opmerkingen |
|-----------|--------|-------------|
| **BaseLayout** | ✅ Volledig | Header, sidebar slot, resize, collapse |
| **DashboardSidebar** | ✅ Volledig | Personal, Navigation, Notes sections |
| **ProjectSidebar** | ✅ Volledig | ACL-aware, 4 sections, 24 menu items |
| **WorkspaceSidebar** | ✅ Volledig | 6 modules, back link, workspace header |
| **WorkspaceLayout** | ✅ Volledig | Container wrapper met WorkspaceSidebar |
| **Dashboard Overview** | ✅ Volledig | Stats, Today, Favorites, Workspaces |
| **My Tasks** | ✅ Volledig | Tabel met filters |
| **My Subtasks** | ✅ Volledig | Subtasks overzicht |
| **Notes Page** | ✅ Volledig | Route + pagina werken |
| **Workspace Page** | ✅ Volledig | Gebruikt WorkspaceLayout |
| **Workspace Members** | ✅ Volledig | Grouped by role, stats cards |
| **Workspace Statistics** | ✅ Volledig | Aggregated stats, per-project breakdown |
| **Workspace Settings** | ✅ Basis | Via WorkspaceSettingsWrapper |
| **Breadcrumbs** | ✅ Volledig | Container-aware hierarchy |
| **Inbox Page** | ✅ Volledig | Notifications pagina met grouping |
| **Favorites** | ✅ Volledig | Sidebar + star buttons + overview widget |
| **Workspace Wiki** | ✅ Volledig | Hierarchische paginas, CRUD |
| **Workspace Groups** | ✅ Volledig | Project categorisatie |
| **ProductivityWidget** | ✅ Volledig | Velocity chart, top projects |
| **CommandPalette** | ✅ Volledig | Context-aware, global search |
| **ShortcutsModal** | ✅ Volledig | Navigation shortcuts toegevoegd |
| **useNavigationContext** | ✅ Volledig | Context detection hook |
| **ContextMenu** | ✅ Volledig | Reusable base + Project + Favorite menus |

---

## Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Container Level          Sidebar                Routes                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Personal                 DashboardSidebar       /dashboard/*               │
│  (cross-container)        - Overview             ✅ Werkt                   │
│                           - My Tasks             ✅ Werkt                   │
│                           - Inbox                ✅ Werkt                   │
│                           - Favorites            ✅ Werkt                   │
│                           - Notes                ✅ Werkt                   │
│                           - Workspaces link      ✅ Werkt                   │
│                                                                             │
│  Workspaces List          DashboardSidebar       /workspaces                │
│                                                  ✅ Werkt                   │
│                                                                             │
│  Workspace                WorkspaceSidebar       /workspace/:slug/*         │
│                           - Projects             ✅ Werkt                   │
│                           - Groups               ✅ Werkt                   │
│                           - Wiki                 ✅ Werkt                   │
│                           - Members              ✅ Werkt                   │
│                           - Statistics           ✅ Werkt                   │
│                           - Settings             ✅ Werkt                   │
│                                                                             │
│  Project                  ProjectSidebar         /workspace/:slug/project/* │
│                           - Board, List, etc.    ✅ Werkt                   │
│                           - Settings             ✅ Werkt                   │
│                           - GitHub               ✅ Werkt                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fases Overzicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  FASE 0          FASE 1          FASE 2          FASE 3          FASE 4    │
│  Foundation      Workspace       Personal        Enhanced        Polish    │
│  ██████████      ██████████      ██████████      ██████████      ██████████│
│  COMPLEET        COMPLEET        COMPLEET        COMPLEET        COMPLEET  │
│                                                                             │
│  ✅ Fix bugs     ✅ Workspace    ✅ Favorites    ✅ Inbox        ✅ Keyboard│
│  ✅ Notes route    Sidebar       ✅ Dashboard    ✅ Advanced     ✅ Context │
│  ✅ Layout       ✅ Wiki           Overview        Statistics    ✅ Search  │
│    switching     ✅ Members      ✅ My Tasks                     - DnD     │
│  ✅ Breadcrumbs  ✅ Statistics     (al goed)                               │
│                  ✅ Settings                                               │
│                  ✅ Groups                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Fase | Naam | Effort | Status | Voortgang |
|------|------|--------|--------|-----------|
| 0 | Foundation | Low | ✅ COMPLEET | 3/3 |
| 1 | Workspace Navigation | High | ✅ COMPLEET | 6/6 |
| 2 | Personal Enhancements | Medium | ✅ COMPLEET | 2/3 |
| 3 | Enhanced Features | High | ✅ COMPLEET | 2/2 |
| 4 | Polish & UX | Medium | ✅ COMPLEET | 5/5 |

---

# FASE 0: Foundation (Bug Fixes & Setup)

**Status:** ✅ COMPLEET
**Voltooid:** 2026-01-11

## Doel

Fix kritieke bugs en maak de basis klaar voor container-aware navigation.

---

## 0.1 Notes Route Fix

**Status:** ✅ Compleet

### Wat is gedaan

- Nieuwe `NotesPage.tsx` component aangemaakt
- Route `/dashboard/notes` toegevoegd aan App.tsx
- Hergebruikt bestaande `StickyNoteList` component
- DashboardLayout wrapper toegevoegd

### Bestanden

| Bestand | Actie |
|---------|-------|
| `pages/dashboard/NotesPage.tsx` | Aangemaakt |
| `pages/dashboard/index.ts` | Export toegevoegd |
| `App.tsx` | Route toegevoegd |

---

## 0.2 Container-Aware Layout Switching

**Status:** ✅ Compleet

### Wat is gedaan

- `WorkspaceSidebar.tsx` component aangemaakt met 6 modules
- `WorkspaceLayout.tsx` wrapper component aangemaakt
- `WorkspacePage.tsx` aangepast om WorkspaceLayout te gebruiken
- Route switching per container level werkt

### Bestanden

| Bestand | Actie |
|---------|-------|
| `components/layout/WorkspaceSidebar.tsx` | Aangemaakt |
| `components/layout/WorkspaceLayout.tsx` | Aangemaakt |
| `pages/WorkspacePage.tsx` | Aangepast |

---

## 0.3 Breadcrumbs Verbetering

**Status:** ✅ Compleet

### Wat is gedaan

- `useBreadcrumbs.ts` uitgebreid met workspace module support
- Labels toegevoegd: wiki, members, stats, groups, settings
- Dashboard subpage support: tasks, subtasks, notes, inbox
- Container hierarchy wordt correct weergegeven

### Bestanden

| Bestand | Actie |
|---------|-------|
| `hooks/useBreadcrumbs.ts` | Uitgebreid |

---

# FASE 1: Workspace Navigation

**Status:** ✅ COMPLEET
**Voortgang:** 6/6 items compleet

## Doel

Volledige WorkspaceSidebar en workspace-level pagina's implementeren.

---

## 1.1 WorkspaceSidebar Component

**Status:** ✅ Compleet

### Wat is gedaan

- Volledig functionele WorkspaceSidebar met:
  - "Back to Workspaces" link
  - Workspace naam header met beschrijving
  - 6 modules: Projects, Groups, Wiki, Members, Statistics, Settings
  - Active state op huidige pagina
  - Lucide icons voor alle modules

### Bestanden

| Bestand | Actie |
|---------|-------|
| `components/layout/WorkspaceSidebar.tsx` | Aangemaakt |
| `components/layout/index.ts` | Export toegevoegd |

---

## 1.2 Workspace Members Page

**Status:** ✅ Compleet

### Wat is gedaan

- `WorkspaceMembersPage.tsx` met members grouped by role:
  - Domain Administrators (SYSTEM)
  - Workspace Administrators (ADMIN)
  - Members (MEMBER)
  - Viewers (VIEWER)
- Stats cards met counts per role
- Member cards met avatar, naam, email, role badge
- Route `/workspace/:slug/members` toegevoegd

### Bestanden

| Bestand | Actie |
|---------|-------|
| `pages/workspace/WorkspaceMembersPage.tsx` | Aangemaakt |
| `pages/workspace/index.ts` | Export toegevoegd |
| `App.tsx` | Route toegevoegd |

---

## 1.3 Workspace Statistics Page

**Status:** ✅ Compleet

### Wat is gedaan

- `WorkspaceStatisticsPage.tsx` met:
  - Summary stats: Projects, Total Tasks, Open Tasks, Completed
  - Overall completion rate progress bar
  - Per-project breakdown met clickable cards
  - Route `/workspace/:slug/stats` toegevoegd
- **Bug fix:** React hooks violation gefixed (useQuery in map)
- **Bug fix:** Infinite re-render loop gefixed (useCallback)

### Bestanden

| Bestand | Actie |
|---------|-------|
| `pages/workspace/WorkspaceStatisticsPage.tsx` | Aangemaakt |
| `pages/workspace/index.ts` | Export toegevoegd |
| `App.tsx` | Route toegevoegd |

---

## 1.4 Workspace Settings Integratie

**Status:** ✅ Compleet

### Wat is gedaan

- `WorkspaceSettingsWrapper.tsx` aangemaakt
- Wrapper zet workspace in Redux via URL slug
- Route `/workspace/:slug/settings` toegevoegd
- Settings link in WorkspaceSidebar werkt

### Bestanden

| Bestand | Actie |
|---------|-------|
| `pages/workspace/WorkspaceSettingsWrapper.tsx` | Aangemaakt |
| `pages/workspace/index.ts` | Export toegevoegd |
| `App.tsx` | Route toegevoegd |

---

## 1.5 Workspace Wiki Page

**Status:** ✅ Compleet

### Wat is gedaan

- `WorkspaceWikiPage.tsx` met:
  - Hierarchische pagina structuur (parent/child)
  - Create page modal met title, content, publish toggle
  - Expandable page tree
  - Draft/published status indicators
- `WorkspaceWikiPage` database model toegevoegd:
  - Workspace-level wiki (apart van project wiki)
  - Hierarchische structuur met parentId
  - Slug-based URLs
  - isPublished flag voor draft support
- tRPC `workspaceWiki` router met CRUD operaties
- Routes: `/workspace/:slug/wiki` en `/workspace/:slug/wiki/:pageSlug`

### Bestanden

| Bestand | Actie |
|---------|-------|
| `packages/shared/prisma/schema.prisma` | WorkspaceWikiPage model toegevoegd |
| `apps/api/src/trpc/procedures/workspaceWiki.ts` | Nieuwe router |
| `apps/api/src/trpc/index.ts` | Router geregistreerd |
| `pages/workspace/WorkspaceWikiPage.tsx` | Aangemaakt |
| `pages/workspace/index.ts` | Export toegevoegd |
| `App.tsx` | Routes toegevoegd |

---

## 1.6 Workspace Groups Page

**Status:** ✅ Compleet

### Wat is gedaan

- `WorkspaceGroupsPage.tsx` met:
  - Project group listing met expandable cards
  - Color-coded group badges
  - Create group modal met naam, beschrijving, kleur
  - Delete group functionaliteit
  - Ungrouped projects section
- `projectGroup` tRPC router met CRUD operaties:
  - list, get, create, update, delete
  - addProject, removeProject, reorderProjects
  - getUngrouped voor projecten zonder groep
- Route: `/workspace/:slug/groups`

### Bestanden

| Bestand | Actie |
|---------|-------|
| `apps/api/src/trpc/procedures/projectGroup.ts` | Nieuwe router |
| `apps/api/src/trpc/index.ts` | Router geregistreerd |
| `pages/workspace/WorkspaceGroupsPage.tsx` | Aangemaakt |
| `pages/workspace/index.ts` | Export toegevoegd |
| `App.tsx` | Route toegevoegd |

---

## Andere Bug Fixes (Fase 1)

### Workspace Navigation Bug

**Status:** ✅ Gefixed

**Probleem:** Klikken op workspace card ging naar `/workspaces?workspace=ID` ipv `/workspace/slug`

**Oplossing:**
- `ProjectList.tsx` aangepast: Link naar `/workspace/${workspace.slug}`
- Settings button aangepast: Navigate naar `/workspace/${workspace.slug}/settings`

---

## Fase 1 Checklist

- [x] WorkspaceSidebar volledig functioneel
- [x] Members pagina werkt
- [x] Statistics pagina werkt
- [x] Settings pagina bereikbaar via sidebar
- [x] Wiki module basis werkt
- [x] Groups feature werkt
- [x] Workspace navigation fixed
- [x] Geen regressies

---

# FASE 2: Personal Enhancements

**Status:** ✅ COMPLEET
**Voortgang:** 2/3 items compleet (My Tasks was al goed)

## Doel

Verbeter de personal (dashboard) sectie met favorites en betere overview.

---

## 2.1 Favorites Systeem

**Status:** ✅ Compleet

### Wat is gedaan

- `UserFavorite` database model toegevoegd:
  - User-Project relatie met sortOrder
  - Unique constraint per user/project
- `favorite` tRPC router met:
  - list, add, remove, toggle, reorder, isFavorite
- DashboardSidebar uitgebreid met Favorites sectie:
  - Toont gefavorite projecten met workspace label
  - Cross-container navigatie
  - Yellow star icons
- ProjectCard star button:
  - Toggle favorite op hover
  - Yellow fill wanneer actief
  - Optimistic updates

### Bestanden

| Bestand | Actie |
|---------|-------|
| `packages/shared/prisma/schema.prisma` | UserFavorite model |
| `apps/api/src/trpc/procedures/favorite.ts` | Nieuwe router |
| `apps/api/src/trpc/index.ts` | Router geregistreerd |
| `components/dashboard/DashboardSidebar.tsx` | Favorites sectie |
| `components/project/ProjectCard.tsx` | Star button |

---

## 2.2 Dashboard Overview Verbetering

**Status:** ✅ Compleet

### Wat is gedaan

- Greeting met datum en overdue/today summary
- 5 stat cards (was 4):
  - Active Tasks, Subtasks, Overdue (red highlight), This Week, Completed
- Today widget:
  - Taken die vandaag due zijn
  - Priority indicator
  - Link naar project board
- Favorites widget:
  - Quick access tot favorite projects
  - Workspace label
- Bestaande workspaces en sticky notes behouden

### Bestanden

| Bestand | Actie |
|---------|-------|
| `pages/dashboard/DashboardOverview.tsx` | Volledig geupdate |

---

## 2.3 My Tasks Verbetering

**Status:** ✅ Al goed

My Tasks pagina werkte al correct met filters en grouping. Geen wijzigingen nodig.

---

# FASE 3: Enhanced Features

**Status:** ✅ COMPLEET
**Voortgang:** 2/2 items compleet
**Voltooid:** 2026-01-11
**Dependencies:** Fase 1 en 2 compleet

---

## 3.1 Inbox / Notifications

**Status:** ✅ Compleet

### Wat is gedaan

- `InboxPage.tsx` component aangemaakt met:
  - Notificaties gegroepeerd per datum (Today, Yesterday, Older)
  - Unread count badge in sidebar
  - Mark as read / Mark all read functionaliteit
  - Delete / Delete all read functionaliteit
  - Type-specifieke iconen (task, comment, deployment, etc.)
  - Link naar gerelateerde entiteit per notificatie
- DashboardSidebar uitgebreid met:
  - Inbox link in Personal sectie
  - Unread count badge met notificatie telling
- Route `/dashboard/inbox` toegevoegd

### Bestanden

| Bestand | Actie |
|---------|-------|
| `pages/dashboard/InboxPage.tsx` | Aangemaakt |
| `pages/dashboard/index.ts` | Export toegevoegd |
| `components/dashboard/DashboardSidebar.tsx` | Inbox link + badge toegevoegd |
| `App.tsx` | Route toegevoegd |

### Bestaande Infra (hergebruikt)

- `Notification` model was al aanwezig in schema
- `notification` tRPC router was al volledig met list, markRead, markAllRead, delete

---

## 3.2 Advanced Statistics

**Status:** ✅ Compleet

### Wat is gedaan

- `getMyProductivity` tRPC endpoint aangemaakt:
  - Taken voltooid deze week vs vorige week
  - Velocity trend over laatste N weken
  - Top projecten per aantal voltooide taken
  - Gemiddelde velocity berekening
- `ProductivityWidget` component voor Dashboard Overview:
  - "Completed this week" met trend indicator
  - Velocity bar chart (visuele weergave)
  - Top projects lijst
  - Empty state handling

### Bestanden

| Bestand | Actie |
|---------|-------|
| `api/src/trpc/procedures/user.ts` | getMyProductivity endpoint toegevoegd |
| `components/dashboard/ProductivityWidget.tsx` | Aangemaakt |
| `components/dashboard/index.ts` | Export toegevoegd |
| `pages/dashboard/DashboardOverview.tsx` | Widget toegevoegd in 3-kolom grid |

### Bestaande Infra (hergebruikt)

- Analytics router was al aanwezig met velocity/cycleTime endpoints (project level)
- Task model met dateCompleted field
- TaskAssignee relatie voor persoonlijke queries

---

# FASE 4: Polish & UX

**Status:** ✅ COMPLEET
**Voortgang:** 5/5 items compleet
**Voltooid:** 2026-01-12
**Dependencies:** Fase 1-3 compleet

---

## 4.1 Keyboard Navigation

**Status:** ✅ Compleet

### Wat is gedaan

- `shortcuts.ts` uitgebreid met nieuwe categorieën:
  - `navigation` - Quick navigation shortcuts (G+key pattern)
  - `dashboard` - Dashboard-specifieke shortcuts
  - `workspace` - Workspace-specifieke shortcuts
- Nieuwe navigation shortcuts toegevoegd:
  - `G D` - Go to Dashboard
  - `G T` - Go to My Tasks
  - `G I` - Go to Inbox
  - `G W` - Go to Workspaces
  - `G N` - Go to Notes
- `formatShortcut()` functie uitgebreid voor chord-style shortcuts
- `ShortcutsModal` toont nu alle nieuwe categorieën (filtert lege groepen)

### Bestanden

| Bestand | Actie |
|---------|-------|
| `lib/shortcuts.ts` | Uitgebreid met nieuwe categorieën |
| `components/common/ShortcutsModal.tsx` | Filtert lege groepen |

---

## 4.2 Context Menus

**Status:** ✅ Compleet

### Wat is gedaan

- **Reusable ContextMenu component:**
  - Base component met submenu support
  - Click-outside en Escape key handling
  - Viewport edge detection
  - Disabled/danger item styling
  - Common icons library

- **ProjectContextMenu:**
  - Open project
  - Add/remove from favorites
  - Copy link / Copy project ID
  - Members (if canEdit)
  - Project settings (if canEdit)
  - Archive/unarchive (if canEdit)
  - Delete project (if canDelete)

- **FavoriteContextMenu:**
  - Open project
  - Open in new tab
  - Copy link
  - Remove from favorites

### Integraties

- `ProjectCard` - Right-click op project cards
- `DashboardSidebar` - Right-click op favorites

### Bestanden

| Bestand | Actie |
|---------|-------|
| `components/common/ContextMenu.tsx` | Nieuw - reusable base component |
| `components/project/ProjectContextMenu.tsx` | Nieuw - project-specifiek menu |
| `components/dashboard/FavoriteContextMenu.tsx` | Nieuw - favorites-specifiek menu |
| `components/project/ProjectCard.tsx` | Toegevoegd context menu |
| `components/dashboard/DashboardSidebar.tsx` | Toegevoegd context menu voor favorites |

---

## 4.3 Global Search

**Status:** ✅ Compleet

### Wat is gedaan

- `useNavigationContext` hook aangemaakt:
  - Detecteert huidige navigation level (dashboard/workspace/project)
  - Extraheert workspaceSlug en projectIdentifier uit URL
  - Bepaalt currentPage voor context-aware behavior
- `CommandPalette` volledig herontworpen (v2.0.0):
  - **Context-aware commands:**
    - Navigation: Altijd beschikbaar (Dashboard, Tasks, Inbox, etc.)
    - Workspace: Alleen in workspace context (Members, Stats, Wiki, Settings)
    - Project: Alleen in project context (Board, List, Calendar, Analytics)
  - **Global search:**
    - Workspaces zoeken via `trpc.workspace.list`
    - Tasks zoeken via `trpc.user.getMyTasks`
    - Project tasks zoeken (in project context)
  - **Verbeterde UX:**
    - Grouped results met section headers
    - Type-specifieke iconen
    - Keyboard navigation over alle groepen
    - Keywords voor betere search matches

### Bestanden

| Bestand | Actie |
|---------|-------|
| `hooks/useNavigationContext.ts` | Nieuw - context detection |
| `components/command/CommandPalette.tsx` | Volledig herontworpen |

---

## 4.4 Drag & Drop

**Status:** ✅ Compleet

### Wat is gedaan

Drag & Drop was al volledig geïmplementeerd vóór dit roadmap item werd toegevoegd. De volledige implementatie omvat:

- **@dnd-kit ecosystem:** core, sortable, utilities libraries
- **BoardDndContext:** Configureert sensors (pointer, touch, keyboard) en collision detection
- **DraggableTask:** Wrapper voor draggable taken met visuele feedback
- **DroppableColumn:** Drop zones per kolom/swimlane met WIP limit highlighting
- **useDragDrop hook:** Optimistic updates met rollback on error
- **task.move API:** Server-side validatie, WIP limits, real-time sync via Socket.io

### Features

| Feature | Status |
|---------|--------|
| Drag tussen kolommen | ✅ |
| Drag tussen swimlanes | ✅ |
| Reorder binnen kolom | ✅ |
| Visuele feedback (overlay, drop zones) | ✅ |
| WIP limit enforcement | ✅ |
| Touch support | ✅ |
| Keyboard navigation | ✅ |
| Optimistic updates | ✅ |
| Error handling met rollback | ✅ |
| Real-time sync | ✅ |

### Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `components/board/DndContext.tsx` | Drag context, sensors, position calculation |
| `components/board/DraggableTask.tsx` | Draggable wrapper voor TaskCard |
| `components/board/DroppableColumn.tsx` | Drop zone met WIP feedback |
| `hooks/useDragDrop.ts` | API mutation met optimistic updates |
| `lib/dnd-utils.ts` | Helper functies voor IDs en posities |

---

## 4.5 Sidebar Drag & Drop

**Status:** ✅ Compleet (2/2)

### Doel

Implementeer drag & drop voor het herordenen van items in de sidebar:

1. ✅ **Favorites reordering** - Sleep favorites in DashboardSidebar om volgorde aan te passen
2. ✅ **Projects in Groups** - Sleep projecten binnen groepen op WorkspaceGroupsPage

### Wat is gedaan

#### Favorites Drag & Drop (Compleet)
- `@dnd-kit/sortable` geïntegreerd in DashboardSidebar
- `SortableFavoriteItem` component met drag handle (grip icon)
- Optimistic updates met rollback bij errors
- `favorite.reorder` API call bij drag end
- Visuele feedback: opacity tijdens slepen, cursor-grab op handle

#### Projects in Groups Drag & Drop (Compleet)
- `@dnd-kit/sortable` geïntegreerd in WorkspaceGroupsPage
- `SortableProjectItem` component met drag handle (grip icon)
- Optimistic updates met `isReordering` state voor sync control
- `projectGroup.reorderProjects` API call bij drag end
- Visuele feedback: opacity tijdens slepen, cursor-grab op handle
- Drag handle zichtbaar op hover voor cleane UI

### Bestanden

| Bestand | Status | Wijziging |
|---------|--------|-----------|
| `components/dashboard/DashboardSidebar.tsx` | ✅ | Drag & drop voor favorites |
| `pages/workspace/WorkspaceGroupsPage.tsx` | ✅ | Drag & drop voor projecten in groepen |

---

# Changelog

## 2026-01-11 (v2.7.0)

### Compleet

- **Fase 4.5: Sidebar Drag & Drop** - Volledig geïmplementeerd
- **Fase 4: Keyboard Navigation & UX Enhancements** - Alle items afgerond

### Nieuwe Features

- **Projects in Groups Drag & Drop:**
  - `SortableProjectItem` component met drag handle
  - Optimistic updates met `isReordering` state
  - Roept `projectGroup.reorderProjects` API aan

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `pages/workspace/WorkspaceGroupsPage.tsx` | Drag & drop voor projecten binnen groepen |

---

## 2026-01-11 (v2.6.0)

### Compleet

- **Fase 4.2: Context Menus** - Volledig geïmplementeerd

### Nieuwe Features

- **Reusable ContextMenu** base component met:
  - Submenu support
  - Keyboard navigation (Escape to close)
  - Click-outside handling
  - Viewport edge detection
  - Disabled/danger item styling
- **ProjectContextMenu** voor project cards:
  - Open, favorite, copy link, settings, archive, delete
  - Permission-aware (canEdit, canDelete)
- **FavoriteContextMenu** voor sidebar favorites:
  - Open, open in new tab, copy link, remove

### Integraties

- ProjectCard met right-click context menu
- DashboardSidebar favorites met right-click context menu

### Nieuwe Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `components/common/ContextMenu.tsx` | Reusable context menu base |
| `components/project/ProjectContextMenu.tsx` | Project-specifiek menu |
| `components/dashboard/FavoriteContextMenu.tsx` | Favorites-specifiek menu |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `components/project/ProjectCard.tsx` | Toegevoegd context menu |
| `components/dashboard/DashboardSidebar.tsx` | Toegevoegd context menu voor favorites |

---

## 2026-01-11 (v2.5.0)

### Compleet

- **Fase 4.1: Keyboard Navigation** - Volledig geïmplementeerd
- **Fase 4.3: Global Search** - Volledig geïmplementeerd

### Nieuwe Features

- **shortcuts.ts** uitgebreid met navigation/dashboard/workspace categorieën
- **useNavigationContext** hook voor context-aware behavior
- **CommandPalette v2.0** met:
  - Context-aware navigation commands
  - Global search over workspaces en tasks
  - Grouped results met section headers
  - Type-specifieke iconen

### Nieuwe Bestanden

| Bestand | Beschrijving |
|---------|--------------|
| `hooks/useNavigationContext.ts` | Context detection hook |

### Gewijzigde Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `lib/shortcuts.ts` | Nieuwe categorieën, chord shortcuts |
| `components/command/CommandPalette.tsx` | Volledig herontworpen |
| `components/common/ShortcutsModal.tsx` | Filtert lege groepen |

---

## 2026-01-11 (v2.4.0)

### Compleet

- **Fase 3: Enhanced Features** - Volledig afgerond (2/2 items)
  - Fase 3.1: Inbox / Notifications
  - Fase 3.2: Advanced Statistics

### Nieuwe Features

- **getMyProductivity** tRPC endpoint voor persoonlijke statistieken
- **ProductivityWidget** component met velocity chart en top projects
- Dashboard Overview nu met 3-kolom layout (Today, Favorites, Productivity)

---

## 2026-01-11 (v2.3.0)

### Compleet

- **Fase 3.1: Inbox / Notifications** - Volledig geïmplementeerd
  - InboxPage component met date grouping
  - Unread count badge in sidebar
  - Mark read / delete functionaliteit

### Nieuwe Features

- **InboxPage** component op `/dashboard/inbox`
- **Unread badge** in DashboardSidebar naast Inbox link
- Hergebruik van bestaande `notification` tRPC router

---

## 2026-01-11 (v2.2.0)

### Compleet

- **Fase 2: Personal Enhancements** - 2/3 items compleet
  - Favorites systeem (model, router, sidebar, star buttons)
  - Dashboard Overview verbeteringen (greeting, today widget, favorites widget)
  - My Tasks was al compleet

### Nieuwe Features

- **UserFavorite** database model voor project favorites
- **favorite** tRPC router met toggle, list, reorder
- **Favorites sectie** in DashboardSidebar
- **Star button** op ProjectCard
- **Today widget** op dashboard met due today taken
- **Overdue indicator** in stats met red highlight

---

## 2026-01-11 (v2.1.0)

### Compleet

- **Fase 0: Foundation** - Volledig afgerond
  - Notes route fix
  - Container-aware layout switching
  - Breadcrumbs verbetering

- **Fase 1: Workspace Navigation** - 6/6 items compleet
  - WorkspaceSidebar component
  - WorkspaceLayout wrapper
  - Workspace Members page
  - Workspace Statistics page (incl. bug fixes)
  - Workspace Settings integratie
  - Workspace Wiki page
  - Workspace Groups page
  - Navigation bug fix (workspace cards)

### Bug Fixes

- **React hooks violation** in WorkspaceStatisticsPage (useQuery in map)
- **Infinite re-render loop** in WorkspaceStatisticsPage (useCallback fix)
- **Workspace navigation** ging naar verkeerde URL

---

# Algemene Regels

## DO's

- ✅ Gebruik bestaande hooks en utilities
- ✅ Volg bestaande code patterns (ProjectSidebar als voorbeeld)
- ✅ TypeScript strict mode
- ✅ Test na elke sub-fase
- ✅ Update deze roadmap bij afronding
- ✅ ACL checks op alle acties

## DON'Ts

- ❌ GEEN nieuwe dependencies zonder overleg
- ❌ GEEN breaking changes aan bestaande APIs
- ❌ GEEN ACL bypass
- ❌ GEEN console.log in productie code
- ❌ GEEN `any` types

---

# Referenties

- [IDEAAL-DASHBOARD-ONTWERP-V2.md](./IDEAAL-DASHBOARD-ONTWERP-V2.md) - Volledig UI/UX ontwerp
- [KANBU-STRUCTUUR.md](./KANBU-STRUCTUUR.md) - Container hiërarchie
- [ROADMAP.md](./ROADMAP.md) - Oude roadmap (deprecated)
- [ProjectSidebar.tsx](../../apps/web/src/components/layout/ProjectSidebar.tsx) - Referentie implementatie
