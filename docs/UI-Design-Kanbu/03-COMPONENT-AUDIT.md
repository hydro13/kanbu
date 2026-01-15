# Kanbu Component Audit

**Datum:** 2026-01-15
**Status:** Complete (Updated)

---

## Overzicht

| Metric | Waarde |
|--------|--------|
| Totaal componenten (regels) | 46,565 |
| Wiki componenten (regels) | 8,902 |
| Pages (regels) | 30,887 |
| **Totaal frontend** | **~85,000 regels** |
| Component directories | 20 |
| Grootste component | WikiGraphView.tsx (2,177 regels) |
| Sidebars | 7 verschillende |
| Layouts | 5 verschillende |

---

## Sidebar Componenten

### Huidige Sidebars
| Component | Locatie | Icon Bron |
|-----------|---------|-----------|
| DashboardSidebar | components/dashboard/ | lucide-react |
| ProjectSidebar | components/layout/ | **Custom SVG** |
| WorkspaceSidebar | components/layout/ | lucide-react |
| AdminSidebar | components/admin/ | lucide-react |
| ProfileSidebar | components/profile/ | lucide-react |
| WikiSidebar | components/wiki/ | lucide-react |
| TaskSidebar | components/task/ | lucide-react |

### Probleem: Icon Inconsistentie
**ProjectSidebar** definieert 10+ custom SVG icons in het bestand zelf:
- BoardIcon, ListIcon, CalendarIcon, TimelineIcon, MilestoneIcon, etc.

Alle andere sidebars gebruiken `lucide-react`.

### Impact
- Visuele inconsistentie (stroke width, sizing kan verschillen)
- Code duplicatie (~100 regels SVG definities)
- Onderhoudslast (changes moeten op meerdere plekken)

---

## Layout Componenten

### Huidige Layouts
| Component | Gebruik | Sidebar |
|-----------|---------|---------|
| BaseLayout | Algemene wrapper | DashboardSidebar |
| DashboardLayout | Dashboard pagina's | DashboardSidebar |
| ProjectLayout | Project views | ProjectSidebar |
| WorkspaceLayout | Workspace pagina's | WorkspaceSidebar |
| ProfileLayout | Profiel pagina's | ProfileSidebar |
| AdminLayout | Admin pagina's | AdminSidebar |

### Observatie
Er is geen gedeelde basis voor de sidebars. Elk layout type heeft zijn eigen sidebar implementatie.

---

## Core Componenten per Directory

### `/components/task/` (32 componenten)
De kern van de applicatie. Belangrijke componenten:
- TaskDetailModal.tsx - Hoofd task detail view
- TaskQuickActions.tsx - Inline acties
- PriorityBadge.tsx - Priority indicator
- DueDateBadge.tsx - Due date indicator
- SubtaskList.tsx - Subtask management
- CommentSection.tsx - Comments
- AttachmentSection.tsx - File attachments
- TimeTracker.tsx - Time tracking

### `/components/board/` (10+ componenten)
Kanban board functionaliteit:
- Board.tsx - Hoofd board component
- Column.tsx - Kolom container
- DraggableTask.tsx - Sleepbare task card
- FilterBar.tsx (688 regels) - Filtering UI
- LiveCursors.tsx - Real-time collaboration

### `/components/editor/` (15+ componenten)
Rich text editor (Lexical-based):
- RichTextEditor.tsx - Hoofd editor
- ToolbarPlugin.tsx (681 regels) - Editor toolbar
- MentionPlugin.tsx - @mentions
- TaskRefPlugin.tsx - Task references
- WikiLinkPlugin.tsx - Wiki links
- MediaPlugin.tsx - Media embedding

### `/components/wiki/` (17 componenten, 8,902 regels)
**Het meest uitgebreide subsysteem!**

| Component | Regels | Functie |
|-----------|--------|---------|
| WikiGraphView.tsx | 2,177 | D3.js kennisgraaf visualisatie |
| AskWikiDialog.tsx | 881 | AI-powered semantic search |
| WikiSearchDialog.tsx | 865 | Zoekinterface met filters |
| WikiPageView.tsx | 766 | Pagina weergave met editor |
| WikiDuplicateManager.tsx | 728 | Duplicaat detectie en merge |
| ContradictionHistory.tsx | 492 | Contradictie tracking |
| WikiSidebar.tsx | 458 | Navigatie en paginalijst |
| ContradictionDialog.tsx | 432 | Contradictie details |
| WikiTemporalSearch.tsx | 349 | Tijdlijn-gebaseerd zoeken |
| WikiVersionHistory.tsx | 317 | Versie beheer |
| ContradictionToast.tsx | 311 | Real-time notificaties |
| FactCheckDialog.tsx | 288 | Fact checking interface |
| BacklinksPanel.tsx | 227 | Backlink overzicht |
| WikiDuplicateBadge.tsx | 177 | Duplicaat indicator |

**Features:**
- AI contradictie detectie
- Kennisgraaf met D3.js
- Semantic search
- Versie geschiedenis
- Backlinks tracking
- Duplicaat detectie

### `/components/analytics/` (5 componenten)
Analytics dashboards:
- TaskCountWidget.tsx
- VelocityChart.tsx
- CycleTimeChart.tsx
- WorkloadChart.tsx

---

## UI Base Components (shadcn/ui)

### Aanwezig (20)
```
badge, button, card, checkbox, collapsible,
dialog, dropdown-menu, input, label, progress,
scroll-area, select, separator, slider, sonner,
switch, tabs, tooltip, HoverPopover, UndoRedoButtons
```

### Ontbrekend (vaak nodig)
- Avatar (bestaat custom in task/)
- Alert/AlertDialog
- Breadcrumb
- Calendar (bestaat custom in pages/)
- Command (shadcn versie)
- Form (shadcn form wrapper)
- Menubar
- NavigationMenu
- Pagination
- Popover (alleen HoverPopover bestaat)
- RadioGroup
- Sheet (slide-over panel)
- Skeleton (loading states)
- Table
- Textarea
- Toast (alleen sonner)

---

## Grote Componenten (>500 regels)

| Component | Regels | Notities |
|-----------|--------|----------|
| WikiGraphView.tsx | 2,177 | Mogelijk te splitten |
| AskWikiDialog.tsx | 881 | AI functionaliteit |
| WikiSearchDialog.tsx | 865 | Search interface |
| ResourceTree.tsx | 839 | Admin permissions |
| CommandPalette.tsx | 812 | ⌘K interface |
| WikiPageView.tsx | 766 | Wiki display |
| WikiDuplicateManager.tsx | 728 | Duplicate detection |
| FilterBar.tsx | 688 | Board filtering |
| ToolbarPlugin.tsx | 681 | Editor toolbar |
| WhatIfSimulator.tsx | 667 | Permission simulator |

### Aanbeveling
Componenten >500 regels zouden gesplitst moeten worden in:
- Presentatie componenten
- Logic hooks
- Sub-componenten

---

## Aanbevelingen

### 1. Standaardiseer Icons
- Verwijder custom SVG icons uit ProjectSidebar
- Gebruik consistent lucide-react voor alle icons
- Creëer een `icons/` directory voor eventuele custom icons

### 2. Consolideer Sidebar Logic
Creëer een gedeelde `SidebarBase` component:
```typescript
interface SidebarItem {
  label: string
  path: string
  icon: LucideIcon
  badge?: number
}

function SidebarBase({ items, collapsed }: { items: SidebarItem[], collapsed: boolean })
```

### 3. Voeg Ontbrekende UI Components Toe
Prioriteit:
1. Skeleton (loading states)
2. Sheet (mobile-friendly modals)
3. Table (data display)
4. Breadcrumb (navigation)

### 4. Refactor Grote Componenten
Start met WikiGraphView.tsx (2,177 regels):
- Extract graph logic naar custom hook
- Split rendering in sub-components
- Separate data fetching
