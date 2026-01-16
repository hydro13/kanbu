# Kanbu Component Audit

**Date:** 2026-01-15
**Status:** Complete (Updated)

---

## Overview

| Metric | Value |
|--------|-------|
| Total components (lines) | 46,565 |
| Wiki components (lines) | 8,902 |
| Pages (lines) | 30,887 |
| **Total frontend** | **~85,000 lines** |
| Component directories | 20 |
| Largest component | WikiGraphView.tsx (2,177 lines) |
| Sidebars | 7 different |
| Layouts | 5 different |

---

## Sidebar Components

### Current Sidebars
| Component | Location | Icon Source |
|-----------|----------|-------------|
| DashboardSidebar | components/dashboard/ | lucide-react |
| ProjectSidebar | components/layout/ | **Custom SVG** |
| WorkspaceSidebar | components/layout/ | lucide-react |
| AdminSidebar | components/admin/ | lucide-react |
| ProfileSidebar | components/profile/ | lucide-react |
| WikiSidebar | components/wiki/ | lucide-react |
| TaskSidebar | components/task/ | lucide-react |

### Problem: Icon Inconsistency
**ProjectSidebar** defines 10+ custom SVG icons in the file itself:
- BoardIcon, ListIcon, CalendarIcon, TimelineIcon, MilestoneIcon, etc.

All other sidebars use `lucide-react`.

### Impact
- Visual inconsistency (stroke width, sizing can differ)
- Code duplication (~100 lines of SVG definitions)
- Maintenance burden (changes needed in multiple places)

---

## Layout Components

### Current Layouts
| Component | Usage | Sidebar |
|-----------|-------|---------|
| BaseLayout | General wrapper | DashboardSidebar |
| DashboardLayout | Dashboard pages | DashboardSidebar |
| ProjectLayout | Project views | ProjectSidebar |
| WorkspaceLayout | Workspace pages | WorkspaceSidebar |
| ProfileLayout | Profile pages | ProfileSidebar |
| AdminLayout | Admin pages | AdminSidebar |

### Observation
There is no shared base for the sidebars. Each layout type has its own sidebar implementation.

---

## Core Components per Directory

### `/components/task/` (32 components)
The core of the application. Important components:
- TaskDetailModal.tsx - Main task detail view
- TaskQuickActions.tsx - Inline actions
- PriorityBadge.tsx - Priority indicator
- DueDateBadge.tsx - Due date indicator
- SubtaskList.tsx - Subtask management
- CommentSection.tsx - Comments
- AttachmentSection.tsx - File attachments
- TimeTracker.tsx - Time tracking

### `/components/board/` (10+ components)
Kanban board functionality:
- Board.tsx - Main board component
- Column.tsx - Column container
- DraggableTask.tsx - Draggable task card
- FilterBar.tsx (688 lines) - Filtering UI
- LiveCursors.tsx - Real-time collaboration

### `/components/editor/` (15+ components)
Rich text editor (Lexical-based):
- RichTextEditor.tsx - Main editor
- ToolbarPlugin.tsx (681 lines) - Editor toolbar
- MentionPlugin.tsx - @mentions
- TaskRefPlugin.tsx - Task references
- WikiLinkPlugin.tsx - Wiki links
- MediaPlugin.tsx - Media embedding

### `/components/wiki/` (17 components, 8,902 lines)
**The most extensive subsystem!**

| Component | Lines | Function |
|-----------|-------|----------|
| WikiGraphView.tsx | 2,177 | D3.js knowledge graph visualization |
| AskWikiDialog.tsx | 881 | AI-powered semantic search |
| WikiSearchDialog.tsx | 865 | Search interface with filters |
| WikiPageView.tsx | 766 | Page display with editor |
| WikiDuplicateManager.tsx | 728 | Duplicate detection and merge |
| ContradictionHistory.tsx | 492 | Contradiction tracking |
| WikiSidebar.tsx | 458 | Navigation and page list |
| ContradictionDialog.tsx | 432 | Contradiction details |
| WikiTemporalSearch.tsx | 349 | Timeline-based search |
| WikiVersionHistory.tsx | 317 | Version management |
| ContradictionToast.tsx | 311 | Real-time notifications |
| FactCheckDialog.tsx | 288 | Fact checking interface |
| BacklinksPanel.tsx | 227 | Backlink overview |
| WikiDuplicateBadge.tsx | 177 | Duplicate indicator |

**Features:**
- AI contradiction detection
- Knowledge graph with D3.js
- Semantic search
- Version history
- Backlinks tracking
- Duplicate detection

### `/components/analytics/` (5 components)
Analytics dashboards:
- TaskCountWidget.tsx
- VelocityChart.tsx
- CycleTimeChart.tsx
- WorkloadChart.tsx

---

## UI Base Components (shadcn/ui)

### Present (20)
```
badge, button, card, checkbox, collapsible,
dialog, dropdown-menu, input, label, progress,
scroll-area, select, separator, slider, sonner,
switch, tabs, tooltip, HoverPopover, UndoRedoButtons
```

### Missing (often needed)
- Avatar (exists custom in task/)
- Alert/AlertDialog
- Breadcrumb
- Calendar (exists custom in pages/)
- Command (shadcn version)
- Form (shadcn form wrapper)
- Menubar
- NavigationMenu
- Pagination
- Popover (only HoverPopover exists)
- RadioGroup
- Sheet (slide-over panel)
- Skeleton (loading states)
- Table
- Textarea
- Toast (only sonner)

---

## Large Components (>500 lines)

| Component | Lines | Notes |
|-----------|-------|-------|
| WikiGraphView.tsx | 2,177 | Could be split |
| AskWikiDialog.tsx | 881 | AI functionality |
| WikiSearchDialog.tsx | 865 | Search interface |
| ResourceTree.tsx | 839 | Admin permissions |
| CommandPalette.tsx | 812 | ⌘K interface |
| WikiPageView.tsx | 766 | Wiki display |
| WikiDuplicateManager.tsx | 728 | Duplicate detection |
| FilterBar.tsx | 688 | Board filtering |
| ToolbarPlugin.tsx | 681 | Editor toolbar |
| WhatIfSimulator.tsx | 667 | Permission simulator |

### Recommendation
Components >500 lines should be split into:
- Presentation components
- Logic hooks
- Sub-components

---

## Recommendations

### 1. Standardize Icons
- Remove custom SVG icons from ProjectSidebar
- Use lucide-react consistently for all icons
- Create an `icons/` directory for any custom icons

### 2. Consolidate Sidebar Logic
Create a shared `SidebarBase` component:
```typescript
interface SidebarItem {
  label: string
  path: string
  icon: LucideIcon
  badge?: number
}

function SidebarBase({ items, collapsed }: { items: SidebarItem[], collapsed: boolean })
```

### 3. Add Missing UI Components
Priority:
1. Skeleton (loading states)
2. Sheet (mobile-friendly modals)
3. Table (data display)
4. Breadcrumb (navigation)

### 4. Refactor Large Components
Start with WikiGraphView.tsx (2,177 lines):
- Extract graph logic to custom hook
- Split rendering into sub-components
- Separate data fetching
