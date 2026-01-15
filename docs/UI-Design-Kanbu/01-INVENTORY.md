# Kanbu UI Inventarisatie

**Datum:** 2026-01-15
**Status:** Complete (Updated)

## Overzicht

Kanbu is een uitgebreide project management applicatie met **60+ routes**, **20+ component directories**, en **77,000+ regels** frontend code.

### Totalen

| Categorie | Aantal |
|-----------|--------|
| Pages (regels code) | 30,887 |
| Components (regels code) | 46,565 |
| Wiki componenten alleen | 8,902 |
| **Totaal frontend** | **~85,000 regels** |

---

## Tech Stack

| Technologie | Details |
|-------------|---------|
| Framework | React + TypeScript |
| Build | Vite 6.x |
| Styling | TailwindCSS + CSS Variables |
| UI Components | shadcn/ui basis |
| State | Redux (store/) |
| Routing | React Router v6 |

---

## Design System Basis

### Tailwind Config
- Dark mode via `class`
- CSS variabelen voor kleuren (HSL formaat)
- shadcn/ui compatible setup

### Kleuren Tokens (globals.css)

**Light Mode:**
```css
--background: 0 0% 100%          /* wit */
--foreground: 222.2 84% 4.9%     /* bijna zwart */
--primary: 222.2 47.4% 11.2%     /* donkerblauw */
--secondary: 210 40% 96.1%       /* lichtgrijs */
--destructive: 0 84.2% 60.2%     /* rood */
--muted: 210 40% 96.1%           /* lichtgrijs */
--accent: 210 40% 96.1%          /* lichtgrijs */
```

**Dark Mode:**
```css
--background: 222.2 84% 4.9%     /* donkerblauw/zwart */
--foreground: 210 40% 98%        /* bijna wit */
--primary: 210 40% 98%           /* bijna wit */
--secondary: 217.2 32.6% 17.5%   /* donkergrijs */
--destructive: 0 62.8% 30.6%     /* donkerrood */
```

### Observatie
- Secondary, muted, en accent hebben **dezelfde waarde** in beide modes
- Dit suggereert dat het kleurenpalet niet volledig is uitgewerkt
- Geen aparte tokens voor: success, warning, info

---

## Routes Inventarisatie

### Public Routes (3)
| Route | Component | Beschrijving |
|-------|-----------|--------------|
| `/login` | LoginPage | Inlogpagina |
| `/register` | RegisterPage | Registratiepagina |
| `/invite/:token` | AcceptInvitePage | Uitnodiging accepteren |

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

## Wiki Systeem (Belangrijk!)

De Wiki is een **compleet kennisbeheersysteem** met:
- Pagina's met rich text editor
- Kennisgraaf visualisatie
- AI-powered zoeken
- Contradictie detectie
- Versie geschiedenis
- Backlinks tracking
- Duplicaat detectie

### Wiki Route
| Route | Component | Regels |
|-------|-----------|--------|
| `/workspace/:slug/wiki` | WorkspaceWikiPage | 1,088 |
| `/workspace/:slug/wiki/:pageSlug` | WorkspaceWikiPage | (zelfde) |

### Wiki Componenten (8,902 regels totaal)
| Component | Regels | Functie |
|-----------|--------|---------|
| WikiGraphView.tsx | 2,177 | Kennisgraaf D3.js visualisatie |
| AskWikiDialog.tsx | 881 | AI-powered wiki search |
| WikiSearchDialog.tsx | 865 | Zoekinterface |
| WikiPageView.tsx | 766 | Wiki pagina weergave |
| WikiDuplicateManager.tsx | 728 | Duplicaat pagina beheer |
| ContradictionHistory.tsx | 492 | Contradictie geschiedenis |
| WikiSidebar.tsx | 458 | Wiki navigatie sidebar |
| ContradictionDialog.tsx | 432 | Contradictie details |
| WikiTemporalSearch.tsx | 349 | Tijdlijn zoeken |
| WikiVersionHistory.tsx | 317 | Versie beheer |
| ContradictionToast.tsx | 311 | Contradictie notificaties |
| FactCheckDialog.tsx | 288 | Fact checking UI |
| BacklinksPanel.tsx | 227 | Backlink overzicht |
| WikiDuplicateBadge.tsx | 177 | Duplicaat indicator |
| ClusterDetailPanel.tsx | ~100 | Cluster details |
| ClusterLegend.tsx | ~100 | Graaf legenda |
| EdgeSearchResult.tsx | ~150 | Zoekresultaat item |

### Observatie
Het Wiki systeem is **zeer uitgebreid** met AI-integratie (contradictie detectie, fact checking, semantic search). Dit is een differentiërende feature die speciale aandacht verdient bij UI updates.

---

## Grootste Pagina's (per regels code)

| Pagina | Regels | Notities |
|--------|--------|----------|
| PermissionTreePage.tsx | 1,231 | Admin permissions boom |
| AclPage.tsx | 1,113 | Access Control List beheer |
| AiSystemsPage.tsx | 1,096 | AI systeem configuratie |
| WorkspaceWikiPage.tsx | 1,088 | Wiki hoofdpagina |
| CalendarView.tsx | 1,076 | Kalender view |
| TimelineView.tsx | 960 | Gantt-achtige timeline |
| GitHubProjectSettings.tsx | 871 | GitHub integratie |
| WorkspaceSettings.tsx | 790 | Workspace instellingen |
| GitHubAdminPage.tsx | 763 | GitHub admin |
| UserEditPage.tsx | 755 | Gebruiker bewerken |

---

## Component Directories

```
components/
├── admin/          # Admin specifieke componenten
├── analytics/      # Grafieken, charts, stats
├── auth/           # Login, register, protected routes
├── board/          # Kanban board componenten
├── command/        # Command palette (⌘K)
├── common/         # Gedeelde utilities
├── dashboard/      # Dashboard widgets
├── editor/         # Rich text editor
├── github/         # GitHub integratie
├── import/         # Import/export functionaliteit
├── layout/         # Page layouts, sidebars
├── milestone/      # Milestone componenten
├── profile/        # Profiel pagina componenten
├── project/        # Project specifieke componenten
├── sprint/         # Sprint/scrum componenten
├── sticky/         # Sticky notes
├── task/           # Task cards, modals
├── ui/             # shadcn/ui basis componenten
├── wiki/           # Wiki editor/viewer
└── workspace/      # Workspace componenten
```

---

## UI Base Components (shadcn/ui)

Aanwezige componenten:
- badge, button, card, checkbox, collapsible
- dialog, dropdown-menu, input, label
- progress, scroll-area, select, separator
- slider, sonner (toast), switch, tabs, tooltip

Custom toevoegingen:
- HoverPopover
- UndoRedoButtons

---

## Volgende Stappen

1. [ ] Analyseer component structuur per directory
2. [ ] Identificeer hergebruikte vs. duplicate componenten
3. [ ] Documenteer kleur/typography inconsistenties
4. [ ] Maak design token aanbevelingen
