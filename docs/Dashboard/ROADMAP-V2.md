# Dashboard Roadmap V2

## Version: 2.7.0

## Date: 2026-01-11

## Based on: IDEAAL-DASHBOARD-ONTWERP-V2.md

---

## Reading Guide

This document is the **implementation roadmap** for the container-aware dashboard system.
Based on the design in [IDEAAL-DASHBOARD-ONTWERP-V2.md](./IDEAAL-DASHBOARD-ONTWERP-V2.md).

**Important documents:**

- [IDEAAL-DASHBOARD-ONTWERP-V2.md](./IDEAAL-DASHBOARD-ONTWERP-V2.md) - The complete UI/UX design
- [KANBU-STRUCTUUR.md](./KANBU-STRUCTUUR.md) - Container hierarchy definition
- [ROADMAP.md](./ROADMAP.md) - Old roadmap (v1, deprecated)

---

## Current Status

### Implementation Progress

| Phase       | Status      | Progress                            |
| ----------- | ----------- | ----------------------------------- |
| **Phase 0** | ✅ COMPLETE | Foundation, bug fixes               |
| **Phase 1** | ✅ COMPLETE | 6/6 items complete                  |
| **Phase 2** | ✅ COMPLETE | 2/3 items (My Tasks already good)   |
| **Phase 3** | ✅ COMPLETE | 2/2 items complete                  |
| **Phase 4** | ✅ COMPLETE | 5/5 items complete (all sub-phases) |

### What's Already There?

| Component                | Status      | Notes                                    |
| ------------------------ | ----------- | ---------------------------------------- |
| **BaseLayout**           | ✅ Complete | Header, sidebar slot, resize, collapse   |
| **DashboardSidebar**     | ✅ Complete | Personal, Navigation, Notes sections     |
| **ProjectSidebar**       | ✅ Complete | ACL-aware, 4 sections, 24 menu items     |
| **WorkspaceSidebar**     | ✅ Complete | 6 modules, back link, workspace header   |
| **WorkspaceLayout**      | ✅ Complete | Container wrapper with WorkspaceSidebar  |
| **Dashboard Overview**   | ✅ Complete | Stats, Today, Favorites, Workspaces      |
| **My Tasks**             | ✅ Complete | Table with filters                       |
| **My Subtasks**          | ✅ Complete | Subtasks overview                        |
| **Notes Page**           | ✅ Complete | Route + page working                     |
| **Workspace Page**       | ✅ Complete | Uses WorkspaceLayout                     |
| **Workspace Members**    | ✅ Complete | Grouped by role, stats cards             |
| **Workspace Statistics** | ✅ Complete | Aggregated stats, per-project breakdown  |
| **Workspace Settings**   | ✅ Basic    | Via WorkspaceSettingsWrapper             |
| **Breadcrumbs**          | ✅ Complete | Container-aware hierarchy                |
| **Inbox Page**           | ✅ Complete | Notifications page with grouping         |
| **Favorites**            | ✅ Complete | Sidebar + star buttons + overview widget |
| **Workspace Wiki**       | ✅ Complete | Hierarchical pages, CRUD                 |
| **Workspace Groups**     | ✅ Complete | Project categorization                   |
| **ProductivityWidget**   | ✅ Complete | Velocity chart, top projects             |
| **CommandPalette**       | ✅ Complete | Context-aware, global search             |
| **ShortcutsModal**       | ✅ Complete | Navigation shortcuts added               |
| **useNavigationContext** | ✅ Complete | Context detection hook                   |
| **ContextMenu**          | ✅ Complete | Reusable base + Project + Favorite menus |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Container Level          Sidebar                Routes                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Personal                 DashboardSidebar       /dashboard/*               │
│  (cross-container)        - Overview             ✅ Working                 │
│                           - My Tasks             ✅ Working                 │
│                           - Inbox                ✅ Working                 │
│                           - Favorites            ✅ Working                 │
│                           - Notes                ✅ Working                 │
│                           - Workspaces link      ✅ Working                 │
│                                                                             │
│  Workspaces List          DashboardSidebar       /workspaces                │
│                                                  ✅ Working                 │
│                                                                             │
│  Workspace                WorkspaceSidebar       /workspace/:slug/*         │
│                           - Projects             ✅ Working                 │
│                           - Groups               ✅ Working                 │
│                           - Wiki                 ✅ Working                 │
│                           - Members              ✅ Working                 │
│                           - Statistics           ✅ Working                 │
│                           - Settings             ✅ Working                 │
│                                                                             │
│  Project                  ProjectSidebar         /workspace/:slug/project/* │
│                           - Board, List, etc.    ✅ Working                 │
│                           - Settings             ✅ Working                 │
│                           - GitHub               ✅ Working                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phases Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PHASE 0          PHASE 1          PHASE 2          PHASE 3          PHASE 4│
│  Foundation       Workspace        Personal         Enhanced         Polish │
│  ██████████       ██████████       ██████████       ██████████       ██████████
│  COMPLETE         COMPLETE         COMPLETE         COMPLETE         COMPLETE│
│                                                                             │
│  ✅ Fix bugs      ✅ Workspace     ✅ Favorites     ✅ Inbox         ✅ Keyboard
│  ✅ Notes route     Sidebar        ✅ Dashboard     ✅ Advanced      ✅ Context│
│  ✅ Layout        ✅ Wiki            Overview         Statistics     ✅ Search │
│    switching      ✅ Members       ✅ My Tasks                       - DnD    │
│  ✅ Breadcrumbs   ✅ Statistics      (already good)                          │
│                   ✅ Settings                                                │
│                   ✅ Groups                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Phase | Name                  | Effort | Status      | Progress |
| ----- | --------------------- | ------ | ----------- | -------- |
| 0     | Foundation            | Low    | ✅ COMPLETE | 3/3      |
| 1     | Workspace Navigation  | High   | ✅ COMPLETE | 6/6      |
| 2     | Personal Enhancements | Medium | ✅ COMPLETE | 2/3      |
| 3     | Enhanced Features     | High   | ✅ COMPLETE | 2/2      |
| 4     | Polish & UX           | Medium | ✅ COMPLETE | 5/5      |

---

# PHASE 0: Foundation (Bug Fixes & Setup)

**Status:** ✅ COMPLETE
**Completed:** 2026-01-11

## Goal

Fix critical bugs and prepare the foundation for container-aware navigation.

---

## 0.1 Notes Route Fix

**Status:** ✅ Complete

### What Was Done

- Created new `NotesPage.tsx` component
- Added route `/dashboard/notes` to App.tsx
- Reused existing `StickyNoteList` component
- Added DashboardLayout wrapper

### Files

| File                            | Action       |
| ------------------------------- | ------------ |
| `pages/dashboard/NotesPage.tsx` | Created      |
| `pages/dashboard/index.ts`      | Export added |
| `App.tsx`                       | Route added  |

---

## 0.2 Container-Aware Layout Switching

**Status:** ✅ Complete

### What Was Done

- Created `WorkspaceSidebar.tsx` component with 6 modules
- Created `WorkspaceLayout.tsx` wrapper component
- Modified `WorkspacePage.tsx` to use WorkspaceLayout
- Route switching per container level works

### Files

| File                                     | Action   |
| ---------------------------------------- | -------- |
| `components/layout/WorkspaceSidebar.tsx` | Created  |
| `components/layout/WorkspaceLayout.tsx`  | Created  |
| `pages/WorkspacePage.tsx`                | Modified |

---

## 0.3 Breadcrumbs Improvement

**Status:** ✅ Complete

### What Was Done

- Extended `useBreadcrumbs.ts` with workspace module support
- Added labels: wiki, members, stats, groups, settings
- Dashboard subpage support: tasks, subtasks, notes, inbox
- Container hierarchy is displayed correctly

### Files

| File                      | Action   |
| ------------------------- | -------- |
| `hooks/useBreadcrumbs.ts` | Extended |

---

# PHASE 1: Workspace Navigation

**Status:** ✅ COMPLETE
**Progress:** 6/6 items complete

## Goal

Implement complete WorkspaceSidebar and workspace-level pages.

---

## 1.1 WorkspaceSidebar Component

**Status:** ✅ Complete

### What Was Done

- Fully functional WorkspaceSidebar with:
  - "Back to Workspaces" link
  - Workspace name header with description
  - 6 modules: Projects, Groups, Wiki, Members, Statistics, Settings
  - Active state on current page
  - Lucide icons for all modules

### Files

| File                                     | Action       |
| ---------------------------------------- | ------------ |
| `components/layout/WorkspaceSidebar.tsx` | Created      |
| `components/layout/index.ts`             | Export added |

---

## 1.2 Workspace Members Page

**Status:** ✅ Complete

### What Was Done

- `WorkspaceMembersPage.tsx` with members grouped by role:
  - Domain Administrators (SYSTEM)
  - Workspace Administrators (ADMIN)
  - Members (MEMBER)
  - Viewers (VIEWER)
- Stats cards with counts per role
- Member cards with avatar, name, email, role badge
- Route `/workspace/:slug/members` added

### Files

| File                                       | Action       |
| ------------------------------------------ | ------------ |
| `pages/workspace/WorkspaceMembersPage.tsx` | Created      |
| `pages/workspace/index.ts`                 | Export added |
| `App.tsx`                                  | Route added  |

---

## 1.3 Workspace Statistics Page

**Status:** ✅ Complete

### What Was Done

- `WorkspaceStatisticsPage.tsx` with:
  - Summary stats: Projects, Total Tasks, Open Tasks, Completed
  - Overall completion rate progress bar
  - Per-project breakdown with clickable cards
  - Route `/workspace/:slug/stats` added
- **Bug fix:** Fixed React hooks violation (useQuery in map)
- **Bug fix:** Fixed infinite re-render loop (useCallback)

### Files

| File                                          | Action       |
| --------------------------------------------- | ------------ |
| `pages/workspace/WorkspaceStatisticsPage.tsx` | Created      |
| `pages/workspace/index.ts`                    | Export added |
| `App.tsx`                                     | Route added  |

---

## 1.4 Workspace Settings Integration

**Status:** ✅ Complete

### What Was Done

- Created `WorkspaceSettingsWrapper.tsx`
- Wrapper sets workspace in Redux via URL slug
- Route `/workspace/:slug/settings` added
- Settings link in WorkspaceSidebar works

### Files

| File                                           | Action       |
| ---------------------------------------------- | ------------ |
| `pages/workspace/WorkspaceSettingsWrapper.tsx` | Created      |
| `pages/workspace/index.ts`                     | Export added |
| `App.tsx`                                      | Route added  |

---

## 1.5 Workspace Wiki Page

**Status:** ✅ Complete

### What Was Done

- `WorkspaceWikiPage.tsx` with:
  - Hierarchical page structure (parent/child)
  - Create page modal with title, content, publish toggle
  - Expandable page tree
  - Draft/published status indicators
- `WorkspaceWikiPage` database model added:
  - Workspace-level wiki (separate from project wiki)
  - Hierarchical structure with parentId
  - Slug-based URLs
  - isPublished flag for draft support
- tRPC `workspaceWiki` router with CRUD operations
- Routes: `/workspace/:slug/wiki` and `/workspace/:slug/wiki/:pageSlug`

### Files

| File                                            | Action                        |
| ----------------------------------------------- | ----------------------------- |
| `packages/shared/prisma/schema.prisma`          | WorkspaceWikiPage model added |
| `apps/api/src/trpc/procedures/workspaceWiki.ts` | New router                    |
| `apps/api/src/trpc/index.ts`                    | Router registered             |
| `pages/workspace/WorkspaceWikiPage.tsx`         | Created                       |
| `pages/workspace/index.ts`                      | Export added                  |
| `App.tsx`                                       | Routes added                  |

---

## 1.6 Workspace Groups Page

**Status:** ✅ Complete

### What Was Done

- `WorkspaceGroupsPage.tsx` with:
  - Project group listing with expandable cards
  - Color-coded group badges
  - Create group modal with name, description, color
  - Delete group functionality
  - Ungrouped projects section
- `projectGroup` tRPC router with CRUD operations:
  - list, get, create, update, delete
  - addProject, removeProject, reorderProjects
  - getUngrouped for projects without group
- Route: `/workspace/:slug/groups`

### Files

| File                                           | Action            |
| ---------------------------------------------- | ----------------- |
| `apps/api/src/trpc/procedures/projectGroup.ts` | New router        |
| `apps/api/src/trpc/index.ts`                   | Router registered |
| `pages/workspace/WorkspaceGroupsPage.tsx`      | Created           |
| `pages/workspace/index.ts`                     | Export added      |
| `App.tsx`                                      | Route added       |

---

## Other Bug Fixes (Phase 1)

### Workspace Navigation Bug

**Status:** ✅ Fixed

**Problem:** Clicking on workspace card went to `/workspaces?workspace=ID` instead of `/workspace/slug`

**Solution:**

- Modified `ProjectList.tsx`: Link to `/workspace/${workspace.slug}`
- Modified settings button: Navigate to `/workspace/${workspace.slug}/settings`

---

## Phase 1 Checklist

- [x] WorkspaceSidebar fully functional
- [x] Members page works
- [x] Statistics page works
- [x] Settings page accessible via sidebar
- [x] Wiki module basic works
- [x] Groups feature works
- [x] Workspace navigation fixed
- [x] No regressions

---

# PHASE 2: Personal Enhancements

**Status:** ✅ COMPLETE
**Progress:** 2/3 items complete (My Tasks was already good)

## Goal

Improve the personal (dashboard) section with favorites and better overview.

---

## 2.1 Favorites System

**Status:** ✅ Complete

### What Was Done

- `UserFavorite` database model added:
  - User-Project relationship with sortOrder
  - Unique constraint per user/project
- `favorite` tRPC router with:
  - list, add, remove, toggle, reorder, isFavorite
- DashboardSidebar extended with Favorites section:
  - Shows favorite projects with workspace label
  - Cross-container navigation
  - Yellow star icons
- ProjectCard star button:
  - Toggle favorite on hover
  - Yellow fill when active
  - Optimistic updates

### Files

| File                                        | Action             |
| ------------------------------------------- | ------------------ |
| `packages/shared/prisma/schema.prisma`      | UserFavorite model |
| `apps/api/src/trpc/procedures/favorite.ts`  | New router         |
| `apps/api/src/trpc/index.ts`                | Router registered  |
| `components/dashboard/DashboardSidebar.tsx` | Favorites section  |
| `components/project/ProjectCard.tsx`        | Star button        |

---

## 2.2 Dashboard Overview Improvement

**Status:** ✅ Complete

### What Was Done

- Greeting with date and overdue/today summary
- 5 stat cards (was 4):
  - Active Tasks, Subtasks, Overdue (red highlight), This Week, Completed
- Today widget:
  - Tasks due today
  - Priority indicator
  - Link to project board
- Favorites widget:
  - Quick access to favorite projects
  - Workspace label
- Existing workspaces and sticky notes preserved

### Files

| File                                    | Action        |
| --------------------------------------- | ------------- |
| `pages/dashboard/DashboardOverview.tsx` | Fully updated |

---

## 2.3 My Tasks Improvement

**Status:** ✅ Already good

My Tasks page already worked correctly with filters and grouping. No changes needed.

---

# PHASE 3: Enhanced Features

**Status:** ✅ COMPLETE
**Progress:** 2/2 items complete
**Completed:** 2026-01-11
**Dependencies:** Phase 1 and 2 complete

---

## 3.1 Inbox / Notifications

**Status:** ✅ Complete

### What Was Done

- `InboxPage.tsx` component created with:
  - Notifications grouped by date (Today, Yesterday, Older)
  - Unread count badge in sidebar
  - Mark as read / Mark all read functionality
  - Delete / Delete all read functionality
  - Type-specific icons (task, comment, deployment, etc.)
  - Link to related entity per notification
- DashboardSidebar extended with:
  - Inbox link in Personal section
  - Unread count badge with notification count
- Route `/dashboard/inbox` added

### Files

| File                                        | Action                   |
| ------------------------------------------- | ------------------------ |
| `pages/dashboard/InboxPage.tsx`             | Created                  |
| `pages/dashboard/index.ts`                  | Export added             |
| `components/dashboard/DashboardSidebar.tsx` | Inbox link + badge added |
| `App.tsx`                                   | Route added              |

### Existing Infrastructure (reused)

- `Notification` model was already present in schema
- `notification` tRPC router was already complete with list, markRead, markAllRead, delete

---

## 3.2 Advanced Statistics

**Status:** ✅ Complete

### What Was Done

- `getMyProductivity` tRPC endpoint created:
  - Tasks completed this week vs last week
  - Velocity trend over last N weeks
  - Top projects by number of completed tasks
  - Average velocity calculation
- `ProductivityWidget` component for Dashboard Overview:
  - "Completed this week" with trend indicator
  - Velocity bar chart (visual display)
  - Top projects list
  - Empty state handling

### Files

| File                                          | Action                           |
| --------------------------------------------- | -------------------------------- |
| `api/src/trpc/procedures/user.ts`             | getMyProductivity endpoint added |
| `components/dashboard/ProductivityWidget.tsx` | Created                          |
| `components/dashboard/index.ts`               | Export added                     |
| `pages/dashboard/DashboardOverview.tsx`       | Widget added in 3-column grid    |

### Existing Infrastructure (reused)

- Analytics router was already present with velocity/cycleTime endpoints (project level)
- Task model with dateCompleted field
- TaskAssignee relation for personal queries

---

# PHASE 4: Polish & UX

**Status:** ✅ COMPLETE
**Progress:** 5/5 items complete
**Completed:** 2026-01-12
**Dependencies:** Phase 1-3 complete

---

## 4.1 Keyboard Navigation

**Status:** ✅ Complete

### What Was Done

- `shortcuts.ts` extended with new categories:
  - `navigation` - Quick navigation shortcuts (G+key pattern)
  - `dashboard` - Dashboard-specific shortcuts
  - `workspace` - Workspace-specific shortcuts
- New navigation shortcuts added:
  - `G D` - Go to Dashboard
  - `G T` - Go to My Tasks
  - `G I` - Go to Inbox
  - `G W` - Go to Workspaces
  - `G N` - Go to Notes
- `formatShortcut()` function extended for chord-style shortcuts
- `ShortcutsModal` now shows all new categories (filters empty groups)

### Files

| File                                   | Action                       |
| -------------------------------------- | ---------------------------- |
| `lib/shortcuts.ts`                     | Extended with new categories |
| `components/common/ShortcutsModal.tsx` | Filters empty groups         |

---

## 4.2 Context Menus

**Status:** ✅ Complete

### What Was Done

- **Reusable ContextMenu component:**
  - Base component with submenu support
  - Click-outside and Escape key handling
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

### Integrations

- `ProjectCard` - Right-click on project cards
- `DashboardSidebar` - Right-click on favorites

### Files

| File                                           | Action                           |
| ---------------------------------------------- | -------------------------------- |
| `components/common/ContextMenu.tsx`            | New - reusable base component    |
| `components/project/ProjectContextMenu.tsx`    | New - project-specific menu      |
| `components/dashboard/FavoriteContextMenu.tsx` | New - favorites-specific menu    |
| `components/project/ProjectCard.tsx`           | Added context menu               |
| `components/dashboard/DashboardSidebar.tsx`    | Added context menu for favorites |

---

## 4.3 Global Search

**Status:** ✅ Complete

### What Was Done

- `useNavigationContext` hook created:
  - Detects current navigation level (dashboard/workspace/project)
  - Extracts workspaceSlug and projectIdentifier from URL
  - Determines currentPage for context-aware behavior
- `CommandPalette` completely redesigned (v2.0.0):
  - **Context-aware commands:**
    - Navigation: Always available (Dashboard, Tasks, Inbox, etc.)
    - Workspace: Only in workspace context (Members, Stats, Wiki, Settings)
    - Project: Only in project context (Board, List, Calendar, Analytics)
  - **Global search:**
    - Search workspaces via `trpc.workspace.list`
    - Search tasks via `trpc.user.getMyTasks`
    - Search project tasks (in project context)
  - **Improved UX:**
    - Grouped results with section headers
    - Type-specific icons
    - Keyboard navigation over all groups
    - Keywords for better search matches

### Files

| File                                    | Action                  |
| --------------------------------------- | ----------------------- |
| `hooks/useNavigationContext.ts`         | New - context detection |
| `components/command/CommandPalette.tsx` | Completely redesigned   |

---

## 4.4 Drag & Drop

**Status:** ✅ Complete

### What Was Done

Drag & Drop was already fully implemented before this roadmap item was added. The complete implementation includes:

- **@dnd-kit ecosystem:** core, sortable, utilities libraries
- **BoardDndContext:** Configures sensors (pointer, touch, keyboard) and collision detection
- **DraggableTask:** Wrapper for draggable tasks with visual feedback
- **DroppableColumn:** Drop zones per column/swimlane with WIP limit highlighting
- **useDragDrop hook:** Optimistic updates with rollback on error
- **task.move API:** Server-side validation, WIP limits, real-time sync via Socket.io

### Features

| Feature                               | Status |
| ------------------------------------- | ------ |
| Drag between columns                  | ✅     |
| Drag between swimlanes                | ✅     |
| Reorder within column                 | ✅     |
| Visual feedback (overlay, drop zones) | ✅     |
| WIP limit enforcement                 | ✅     |
| Touch support                         | ✅     |
| Keyboard navigation                   | ✅     |
| Optimistic updates                    | ✅     |
| Error handling with rollback          | ✅     |
| Real-time sync                        | ✅     |

### Files

| File                                   | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| `components/board/DndContext.tsx`      | Drag context, sensors, position calculation |
| `components/board/DraggableTask.tsx`   | Draggable wrapper for TaskCard              |
| `components/board/DroppableColumn.tsx` | Drop zone with WIP feedback                 |
| `hooks/useDragDrop.ts`                 | API mutation with optimistic updates        |
| `lib/dnd-utils.ts`                     | Helper functions for IDs and positions      |

---

## 4.5 Sidebar Drag & Drop

**Status:** ✅ Complete (2/2)

### Goal

Implement drag & drop for reordering items in the sidebar:

1. ✅ **Favorites reordering** - Drag favorites in DashboardSidebar to change order
2. ✅ **Projects in Groups** - Drag projects within groups on WorkspaceGroupsPage

### What Was Done

#### Favorites Drag & Drop (Complete)

- `@dnd-kit/sortable` integrated in DashboardSidebar
- `SortableFavoriteItem` component with drag handle (grip icon)
- Optimistic updates with rollback on errors
- `favorite.reorder` API call on drag end
- Visual feedback: opacity during drag, cursor-grab on handle

#### Projects in Groups Drag & Drop (Complete)

- `@dnd-kit/sortable` integrated in WorkspaceGroupsPage
- `SortableProjectItem` component with drag handle (grip icon)
- Optimistic updates with `isReordering` state for sync control
- `projectGroup.reorderProjects` API call on drag end
- Visual feedback: opacity during drag, cursor-grab on handle
- Drag handle visible on hover for clean UI

### Files

| File                                        | Status | Change                             |
| ------------------------------------------- | ------ | ---------------------------------- |
| `components/dashboard/DashboardSidebar.tsx` | ✅     | Drag & drop for favorites          |
| `pages/workspace/WorkspaceGroupsPage.tsx`   | ✅     | Drag & drop for projects in groups |

---

# Changelog

## 2026-01-11 (v2.7.0)

### Complete

- **Phase 4.5: Sidebar Drag & Drop** - Fully implemented
- **Phase 4: Keyboard Navigation & UX Enhancements** - All items completed

### New Features

- **Projects in Groups Drag & Drop:**
  - `SortableProjectItem` component with drag handle
  - Optimistic updates with `isReordering` state
  - Calls `projectGroup.reorderProjects` API

### Modified Files

| File                                      | Change                                 |
| ----------------------------------------- | -------------------------------------- |
| `pages/workspace/WorkspaceGroupsPage.tsx` | Drag & drop for projects within groups |

---

## 2026-01-11 (v2.6.0)

### Complete

- **Phase 4.2: Context Menus** - Fully implemented

### New Features

- **Reusable ContextMenu** base component with:
  - Submenu support
  - Keyboard navigation (Escape to close)
  - Click-outside handling
  - Viewport edge detection
  - Disabled/danger item styling
- **ProjectContextMenu** for project cards:
  - Open, favorite, copy link, settings, archive, delete
  - Permission-aware (canEdit, canDelete)
- **FavoriteContextMenu** for sidebar favorites:
  - Open, open in new tab, copy link, remove

### Integrations

- ProjectCard with right-click context menu
- DashboardSidebar favorites with right-click context menu

### New Files

| File                                           | Description                |
| ---------------------------------------------- | -------------------------- |
| `components/common/ContextMenu.tsx`            | Reusable context menu base |
| `components/project/ProjectContextMenu.tsx`    | Project-specific menu      |
| `components/dashboard/FavoriteContextMenu.tsx` | Favorites-specific menu    |

### Modified Files

| File                                        | Change                           |
| ------------------------------------------- | -------------------------------- |
| `components/project/ProjectCard.tsx`        | Added context menu               |
| `components/dashboard/DashboardSidebar.tsx` | Added context menu for favorites |

---

## 2026-01-11 (v2.5.0)

### Complete

- **Phase 4.1: Keyboard Navigation** - Fully implemented
- **Phase 4.3: Global Search** - Fully implemented

### New Features

- **shortcuts.ts** extended with navigation/dashboard/workspace categories
- **useNavigationContext** hook for context-aware behavior
- **CommandPalette v2.0** with:
  - Context-aware navigation commands
  - Global search over workspaces and tasks
  - Grouped results with section headers
  - Type-specific icons

### New Files

| File                            | Description            |
| ------------------------------- | ---------------------- |
| `hooks/useNavigationContext.ts` | Context detection hook |

### Modified Files

| File                                    | Change                          |
| --------------------------------------- | ------------------------------- |
| `lib/shortcuts.ts`                      | New categories, chord shortcuts |
| `components/command/CommandPalette.tsx` | Completely redesigned           |
| `components/common/ShortcutsModal.tsx`  | Filters empty groups            |

---

## 2026-01-11 (v2.4.0)

### Complete

- **Phase 3: Enhanced Features** - Fully completed (2/2 items)
  - Phase 3.1: Inbox / Notifications
  - Phase 3.2: Advanced Statistics

### New Features

- **getMyProductivity** tRPC endpoint for personal statistics
- **ProductivityWidget** component with velocity chart and top projects
- Dashboard Overview now with 3-column layout (Today, Favorites, Productivity)

---

## 2026-01-11 (v2.3.0)

### Complete

- **Phase 3.1: Inbox / Notifications** - Fully implemented
  - InboxPage component with date grouping
  - Unread count badge in sidebar
  - Mark read / delete functionality

### New Features

- **InboxPage** component at `/dashboard/inbox`
- **Unread badge** in DashboardSidebar next to Inbox link
- Reuse of existing `notification` tRPC router

---

## 2026-01-11 (v2.2.0)

### Complete

- **Phase 2: Personal Enhancements** - 2/3 items complete
  - Favorites system (model, router, sidebar, star buttons)
  - Dashboard Overview improvements (greeting, today widget, favorites widget)
  - My Tasks was already complete

### New Features

- **UserFavorite** database model for project favorites
- **favorite** tRPC router with toggle, list, reorder
- **Favorites section** in DashboardSidebar
- **Star button** on ProjectCard
- **Today widget** on dashboard with due today tasks
- **Overdue indicator** in stats with red highlight

---

## 2026-01-11 (v2.1.0)

### Complete

- **Phase 0: Foundation** - Fully completed
  - Notes route fix
  - Container-aware layout switching
  - Breadcrumbs improvement

- **Phase 1: Workspace Navigation** - 6/6 items complete
  - WorkspaceSidebar component
  - WorkspaceLayout wrapper
  - Workspace Members page
  - Workspace Statistics page (incl. bug fixes)
  - Workspace Settings integration
  - Workspace Wiki page
  - Workspace Groups page
  - Navigation bug fix (workspace cards)

### Bug Fixes

- **React hooks violation** in WorkspaceStatisticsPage (useQuery in map)
- **Infinite re-render loop** in WorkspaceStatisticsPage (useCallback fix)
- **Workspace navigation** went to wrong URL

---

# General Rules

## DO's

- ✅ Use existing hooks and utilities
- ✅ Follow existing code patterns (ProjectSidebar as example)
- ✅ TypeScript strict mode
- ✅ Test after each sub-phase
- ✅ Update this roadmap upon completion
- ✅ ACL checks on all actions

## DON'Ts

- ❌ NO new dependencies without discussion
- ❌ NO breaking changes to existing APIs
- ❌ NO ACL bypass
- ❌ NO console.log in production code
- ❌ NO `any` types

---

# References

- [IDEAAL-DASHBOARD-ONTWERP-V2.md](./IDEAAL-DASHBOARD-ONTWERP-V2.md) - Complete UI/UX design
- [KANBU-STRUCTUUR.md](./KANBU-STRUCTUUR.md) - Container hierarchy
- [ROADMAP.md](./ROADMAP.md) - Old roadmap (deprecated)
- [ProjectSidebar.tsx](../../apps/web/src/components/layout/ProjectSidebar.tsx) - Reference implementation
