# Dashboard Roadmap V2

## Versie: 2.1.0
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
| **Fase 1** | 🚧 IN PROGRESS | 4/6 items compleet |
| **Fase 2** | 📋 Planned | Personal Enhancements |
| **Fase 3** | 📋 Planned | Enhanced Features |
| **Fase 4** | 📋 Planned | Polish & UX |

### Wat is er al?

| Component | Status | Opmerkingen |
|-----------|--------|-------------|
| **BaseLayout** | ✅ Volledig | Header, sidebar slot, resize, collapse |
| **DashboardSidebar** | ✅ Volledig | Personal, Navigation, Notes sections |
| **ProjectSidebar** | ✅ Volledig | ACL-aware, 4 sections, 24 menu items |
| **WorkspaceSidebar** | ✅ Volledig | 6 modules, back link, workspace header |
| **WorkspaceLayout** | ✅ Volledig | Container wrapper met WorkspaceSidebar |
| **Dashboard Overview** | ✅ Basis | Widgets aanwezig |
| **My Tasks** | ✅ Volledig | Tabel met filters |
| **My Subtasks** | ✅ Volledig | Subtasks overzicht |
| **Notes Page** | ✅ Volledig | Route + pagina werken |
| **Workspace Page** | ✅ Volledig | Gebruikt WorkspaceLayout |
| **Workspace Members** | ✅ Volledig | Grouped by role, stats cards |
| **Workspace Statistics** | ✅ Volledig | Aggregated stats, per-project breakdown |
| **Workspace Settings** | ✅ Basis | Via WorkspaceSettingsWrapper |
| **Breadcrumbs** | ✅ Volledig | Container-aware hierarchy |
| **Inbox Page** | ❌ Ontbreekt | Niet geïmplementeerd |
| **Favorites** | ❌ Ontbreekt | Niet geïmplementeerd |
| **Workspace Wiki** | ❌ Ontbreekt | Niet geïmplementeerd |
| **Workspace Groups** | ❌ Ontbreekt | Niet geïmplementeerd |

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
│                           - Favorites            ❌ TODO                    │
│                           - Notes                ✅ Werkt                   │
│                           - Workspaces link      ✅ Werkt                   │
│                                                                             │
│  Workspaces List          DashboardSidebar       /workspaces                │
│                                                  ✅ Werkt                   │
│                                                                             │
│  Workspace                WorkspaceSidebar       /workspace/:slug/*         │
│                           - Projects             ✅ Werkt                   │
│                           - Groups               ❌ TODO                    │
│                           - Wiki                 ❌ TODO                    │
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
│  ██████████      ██████░░░░      ░░░░░░░░░░      ░░░░░░░░░░      ░░░░░░░░░░│
│  COMPLEET        IN PROGRESS     PLANNED         PLANNED         PLANNED   │
│                                                                             │
│  ✅ Fix bugs     ✅ Workspace    - Favorites     - Inbox         - Keyboard│
│  ✅ Notes route    Sidebar       - Dashboard     - Notifications - Context │
│  ✅ Layout       ❌ Wiki           Overview      - Groups        - Search  │
│    switching     ✅ Members        widgets       - Statistics    - DnD     │
│  ✅ Breadcrumbs  ✅ Statistics                                             │
│                  ✅ Settings                                               │
│                  ❌ Groups                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Fase | Naam | Effort | Status | Voortgang |
|------|------|--------|--------|-----------|
| 0 | Foundation | Low | ✅ COMPLEET | 3/3 |
| 1 | Workspace Navigation | High | 🚧 IN PROGRESS | 4/6 |
| 2 | Personal Enhancements | Medium | 📋 Planned | 0/3 |
| 3 | Enhanced Features | High | 📋 Planned | 0/2 |
| 4 | Polish & UX | Medium | 📋 Planned | 0/4 |

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

**Status:** 🚧 IN PROGRESS
**Voortgang:** 4/6 items compleet

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

**Status:** ❌ Todo

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| WikiPage | `pages/workspace/WikiPage.tsx` | Wiki module |
| WikiEditor | `components/wiki/WikiEditor.tsx` | Markdown editor |
| WikiSidebar | `components/wiki/WikiSidebar.tsx` | Page tree |

Route: `/workspace/:slug/wiki`

---

## 1.6 Workspace Groups Page

**Status:** ❌ Todo

### Deliverables

| Item | Bestand | Beschrijving |
|------|---------|--------------|
| GroupsPage | `pages/workspace/GroupsPage.tsx` | Project groups |
| GroupCard | `components/workspace/GroupCard.tsx` | Group visualisatie |
| CreateGroupModal | `components/workspace/CreateGroupModal.tsx` | Nieuwe group |

Route: `/workspace/:slug/groups`

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
- [ ] Wiki module basis werkt
- [ ] Groups feature werkt
- [x] Workspace navigation fixed
- [x] Geen regressies

---

# FASE 2: Personal Enhancements

**Status:** 📋 Planned
**Effort:** Medium (2-3 dagen)
**Prioriteit:** Medium
**Dependencies:** Fase 0 compleet

## Doel

Verbeter de personal (dashboard) sectie met favorites en betere overview.

---

## 2.1 Favorites Systeem

**Status:** ❌ Todo

(Zie originele specificatie in vorige versie)

---

## 2.2 Dashboard Overview Verbetering

**Status:** ❌ Todo

---

## 2.3 My Tasks Verbetering

**Status:** ❌ Todo

---

# FASE 3: Enhanced Features

**Status:** 📋 Planned
**Effort:** High (4-6 dagen)
**Dependencies:** Fase 1 en 2 compleet

---

## 3.1 Inbox / Notifications

**Status:** ❌ Todo

---

## 3.2 Advanced Statistics

**Status:** ❌ Todo

---

# FASE 4: Polish & UX

**Status:** 📋 Planned
**Effort:** Medium (2-3 dagen)
**Dependencies:** Fase 1-3 compleet

---

## 4.1 Keyboard Navigation

**Status:** ❌ Todo

---

## 4.2 Context Menus

**Status:** ❌ Todo

---

## 4.3 Global Search

**Status:** ❌ Todo

---

## 4.4 Drag & Drop

**Status:** ❌ Todo

---

# Changelog

## 2026-01-11 (v2.1.0)

### Compleet

- **Fase 0: Foundation** - Volledig afgerond
  - Notes route fix
  - Container-aware layout switching
  - Breadcrumbs verbetering

- **Fase 1: Workspace Navigation** - 4/6 items compleet
  - WorkspaceSidebar component
  - WorkspaceLayout wrapper
  - Workspace Members page
  - Workspace Statistics page (incl. bug fixes)
  - Workspace Settings integratie
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
