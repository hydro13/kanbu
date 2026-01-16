# Kanbu UI Inventory

**Date:** 2026-01-15
**Status:** Complete (Updated)

## Overview

Kanbu is a comprehensive project management application with **60+ routes**, **20+ component directories**, and **77,000+ lines** of frontend code.

### Totals

| Category | Count |
|----------|-------|
| Pages (lines of code) | 30,887 |
| Components (lines of code) | 46,565 |
| Wiki components only | 8,902 |
| **Total frontend** | **~85,000 lines** |

---

## Tech Stack

| Technology | Details |
|------------|---------|
| Framework | React + TypeScript |
| Build | Vite 6.x |
| Styling | TailwindCSS + CSS Variables |
| UI Components | shadcn/ui base |
| State | Redux (store/) |
| Routing | React Router v6 |

---

## Design System Base

### Tailwind Config
- Dark mode via `class`
- CSS variables for colors (HSL format)
- shadcn/ui compatible setup

### Color Tokens (globals.css)

**Light Mode:**
```css
--background: 0 0% 100%          /* white */
--foreground: 222.2 84% 4.9%     /* almost black */
--primary: 222.2 47.4% 11.2%     /* dark blue */
--secondary: 210 40% 96.1%       /* light gray */
--destructive: 0 84.2% 60.2%     /* red */
--muted: 210 40% 96.1%           /* light gray */
--accent: 210 40% 96.1%          /* light gray */
```

**Dark Mode:**
```css
--background: 222.2 84% 4.9%     /* dark blue/black */
--foreground: 210 40% 98%        /* almost white */
--primary: 210 40% 98%           /* almost white */
--secondary: 217.2 32.6% 17.5%   /* dark gray */
--destructive: 0 62.8% 30.6%     /* dark red */
```

### Observation
- Secondary, muted, and accent have **the same value** in both modes
- This suggests that the color palette is not fully developed
- No separate tokens for: success, warning, info

---

## Routes Inventory

### Public Routes (3)
| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginPage | Login page |
| `/register` | RegisterPage | Registration page |
| `/invite/:token` | AcceptInvitePage | Accept invitation |

### Dashboard Routes (5)
| Route | Component |
|-------|-----------|
| `/dashboard` | DashboardOverview |
| `/dashboard/tasks` | MyTasks |
| `/dashboard/subtasks` | MySubtasks |
| `/dashboard/notes` | NotesPage |
| `/dashboard/inbox` | InboxPage |

### Workspace Routes (7)
| Route | Component |
|-------|-----------|
| `/workspaces` | ProjectListPage |
| `/workspace/:slug` | WorkspacePage |
| `/workspace/:slug/members` | WorkspaceMembersPage |
| `/workspace/:slug/stats` | WorkspaceStatisticsPage |
| `/workspace/:slug/wiki` | WorkspaceWikiPage |
| `/workspace/:slug/groups` | WorkspaceGroupsPage |
| `/workspace/:slug/settings` | WorkspaceSettingsWrapper |

### Profile Routes (18)
| Route | Component |
|-------|-----------|
| `/profile` | ProfileSummary |
| `/profile/edit` | EditProfile |
| `/profile/avatar` | Avatar |
| `/profile/password` | ChangePassword |
| `/profile/2fa` | TwoFactorAuth |
| `/profile/timetracking` | TimeTracking |
| `/profile/logins` | LastLogins |
| `/profile/sessions` | Sessions |
| `/profile/password-history` | PasswordHistory |
| `/profile/metadata` | Metadata |
| `/profile/public` | PublicAccess |
| `/profile/notifications` | NotificationPreferences |
| `/profile/external` | ExternalAccounts |
| `/profile/integrations` | Integrations |
| `/profile/api` | ApiTokens |
| `/profile/assistant` | AiAssistant |
| `/profile/hourly-rate` | HourlyRate |

### Project View Routes (12)
| Route | Component |
|-------|-----------|
| `.../project/:id/board` | BoardViewPage |
| `.../project/:id/list` | ListViewPage |
| `.../project/:id/calendar` | CalendarViewPage |
| `.../project/:id/timeline` | TimelineViewPage |
| `.../project/:id/milestones` | MilestoneViewPage |
| `.../project/:id/analytics` | AnalyticsDashboard |
| `.../project/:id/import-export` | ImportExportPage |
| `.../project/:id/webhooks` | WebhookSettings |
| `.../project/:id/github` | GitHubProjectSettings |
| `.../project/:id/details` | ProjectDetailsPage |
| `.../project/:id/settings` | BoardSettingsPage |
| `.../project/:id/members` | ProjectMembersPage |

### Sprint Routes (3)
| Route | Component |
|-------|-----------|
| `.../project/:id/sprints` | SprintPlanning |
| `.../project/:id/sprint/:sprintId` | SprintBoard |
| `.../project/:id/sprint/:sprintId/burndown` | SprintBurndown |

### Admin Routes (14)
| Route | Component |
|-------|-----------|
| `/admin/users` | UserListPage |
| `/admin/users/create` | UserCreatePage |
| `/admin/users/:userId` | UserEditPage |
| `/admin/invites` | InvitesPage |
| `/admin/settings` | SystemSettingsPage |
| `/admin/settings/ai` | AiSystemsPage |
| `/admin/workspaces` | WorkspaceListPage |
| `/admin/workspaces/new` | WorkspaceCreatePage |
| `/admin/workspaces/:id` | WorkspaceEditPage |
| `/admin/backup` | BackupPage |
| `/admin/permissions` | PermissionTreePage |
| `/admin/acl` | AclPage |
| `/admin/audit-logs` | AuditLogsPage |
| `/admin/permission-matrix` | PermissionMatrixPage |
| `/admin/github` | GitHubAdminPage |

---

## Wiki System (Important!)

The Wiki is a **complete knowledge management system** with:
- Pages with rich text editor
- Knowledge graph visualization
- AI-powered search
- Contradiction detection
- Version history
- Backlinks tracking
- Duplicate detection

### Wiki Route
| Route | Component | Lines |
|-------|-----------|-------|
| `/workspace/:slug/wiki` | WorkspaceWikiPage | 1,088 |
| `/workspace/:slug/wiki/:pageSlug` | WorkspaceWikiPage | (same) |

### Wiki Components (8,902 total lines)
| Component | Lines | Function |
|-----------|-------|----------|
| WikiGraphView.tsx | 2,177 | Knowledge graph D3.js visualization |
| AskWikiDialog.tsx | 881 | AI-powered wiki search |
| WikiSearchDialog.tsx | 865 | Search interface |
| WikiPageView.tsx | 766 | Wiki page display |
| WikiDuplicateManager.tsx | 728 | Duplicate page management |
| ContradictionHistory.tsx | 492 | Contradiction history |
| WikiSidebar.tsx | 458 | Wiki navigation sidebar |
| ContradictionDialog.tsx | 432 | Contradiction details |
| WikiTemporalSearch.tsx | 349 | Timeline search |
| WikiVersionHistory.tsx | 317 | Version management |
| ContradictionToast.tsx | 311 | Contradiction notifications |
| FactCheckDialog.tsx | 288 | Fact checking UI |
| BacklinksPanel.tsx | 227 | Backlink overview |
| WikiDuplicateBadge.tsx | 177 | Duplicate indicator |
| ClusterDetailPanel.tsx | ~100 | Cluster details |
| ClusterLegend.tsx | ~100 | Graph legend |
| EdgeSearchResult.tsx | ~150 | Search result item |

### Observation
The Wiki system is **very extensive** with AI integration (contradiction detection, fact checking, semantic search). This is a differentiating feature that deserves special attention during UI updates.

---

## Largest Pages (by lines of code)

| Page | Lines | Notes |
|------|-------|-------|
| PermissionTreePage.tsx | 1,231 | Admin permissions tree |
| AclPage.tsx | 1,113 | Access Control List management |
| AiSystemsPage.tsx | 1,096 | AI system configuration |
| WorkspaceWikiPage.tsx | 1,088 | Wiki main page |
| CalendarView.tsx | 1,076 | Calendar view |
| TimelineView.tsx | 960 | Gantt-like timeline |
| GitHubProjectSettings.tsx | 871 | GitHub integration |
| WorkspaceSettings.tsx | 790 | Workspace settings |
| GitHubAdminPage.tsx | 763 | GitHub admin |
| UserEditPage.tsx | 755 | Edit user |

---

## Component Directories

```
components/
├── admin/          # Admin-specific components
├── analytics/      # Charts, stats
├── auth/           # Login, register, protected routes
├── board/          # Kanban board components
├── command/        # Command palette (⌘K)
├── common/         # Shared utilities
├── dashboard/      # Dashboard widgets
├── editor/         # Rich text editor
├── github/         # GitHub integration
├── import/         # Import/export functionality
├── layout/         # Page layouts, sidebars
├── milestone/      # Milestone components
├── profile/        # Profile page components
├── project/        # Project-specific components
├── sprint/         # Sprint/scrum components
├── sticky/         # Sticky notes
├── task/           # Task cards, modals
├── ui/             # shadcn/ui base components
├── wiki/           # Wiki editor/viewer
└── workspace/      # Workspace components
```

---

## UI Base Components (shadcn/ui)

Available components:
- badge, button, card, checkbox, collapsible
- dialog, dropdown-menu, input, label
- progress, scroll-area, select, separator
- slider, sonner (toast), switch, tabs, tooltip

Custom additions:
- HoverPopover
- UndoRedoButtons

---

## Next Steps

1. [ ] Analyze component structure per directory
2. [ ] Identify reused vs. duplicate components
3. [ ] Document color/typography inconsistencies
4. [ ] Make design token recommendations
