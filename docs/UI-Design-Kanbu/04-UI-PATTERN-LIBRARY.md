# Kanbu UI Pattern Library - Inventory

This document contains a complete inventory of all UI patterns currently existing in the Kanbu codebase. This is a **factual inventory** - no judgments or recommendations.

---

## 1. Layout Patterns

### 1.1 Layout Hierarchy

```
BaseLayout (508 lines)
├── DashboardLayout (uses BaseLayout + DashboardSidebar)
│   ├── AdminLayout (uses DashboardLayout + AdminSidebar + page header)
│   └── ProfileLayout (uses DashboardLayout + ProfileSidebar + page header)
└── ProjectLayout (uses BaseLayout + ProjectSidebar)
```

### 1.2 BaseLayout Characteristics

**Location:** `src/components/layout/BaseLayout.tsx`

| Property | Value |
|----------|-------|
| Header height | `h-10` (40px) |
| Sidebar default width | 224px (w-56) |
| Sidebar collapsed width | 56px (w-14) |
| Sidebar min width | 160px |
| Sidebar max width | 400px |
| Content max width | 1600px (when not full-width) |
| Content padding | `p-6` (24px) |

**Features:**
- Resizable sidebar with drag handle
- Collapsible sidebar (icons-only mode)
- Mobile responsive with overlay menu
- Breadcrumb navigation in header
- User menu dropdown on right

### 1.3 Specific Layouts

| Layout | Sidebar | Extra Header |
|--------|---------|--------------|
| DashboardLayout | DashboardSidebar | - |
| ProjectLayout | ProjectSidebar | Presence indicator |
| AdminLayout | AdminSidebar | Page header with title |
| ProfileLayout | ProfileSidebar | Page header with title |

### 1.4 Sidebar Variants (7 found)

| Sidebar | Location | Lines |
|---------|----------|-------|
| DashboardSidebar | `src/components/layout/DashboardSidebar.tsx` | ~200 |
| ProjectSidebar | `src/components/layout/ProjectSidebar.tsx` | ~250 |
| AdminSidebar | `src/components/layout/AdminSidebar.tsx` | ~150 |
| ProfileSidebar | `src/components/layout/ProfileSidebar.tsx` | ~100 |
| WikiSidebar | `src/components/wiki/WikiSidebar.tsx` | ~300 |
| TaskDetailSidebar | `src/components/task/TaskDetailSidebar.tsx` | ~150 |
| FilterSidebar | Various locations | Varies |

---

## 2. Page Header Patterns

### 2.1 Found Title Styles

There are **7 different title styles** found in the codebase:

| Style | Examples |
|-------|----------|
| `text-3xl font-bold tracking-tight` | WorkspaceSettings, WikiPage, TagManagement, WorkspaceGroups, UserProfile |
| `text-2xl font-bold` | ImportExport, AcceptInvite, BoardSettings |
| `text-2xl font-semibold` | AnalyticsDashboard |
| `text-xl font-bold` | WebhookSettings |
| `text-xl font-semibold` | ApiSettings, AclPage |
| `text-lg font-semibold` | Dialog titles, smaller sections |
| `text-lg font-medium` | Subsections |

### 2.2 Header Layout Patterns

**Pattern A - Simple Header:**
```tsx
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  Page Title
</h1>
```

**Pattern B - Header with Icon:**
```tsx
<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
  <Icon className="w-8 h-8 text-blue-600" />
  Page Title
</h1>
```

**Pattern C - Header with Stats:**
```tsx
<div className="flex items-center justify-between mb-4">
  <h1>...</h1>
  <div className="flex items-center gap-4">
    <div className="text-center">
      <p className="text-2xl font-bold">123</p>
      <p className="text-sm text-gray-500">Label</p>
    </div>
  </div>
</div>
```

**Pattern D - Header with Back Button:**
```tsx
<div className="flex items-center gap-4">
  <Link to="..." className="p-2 hover:bg-gray-100 rounded-lg">
    <ArrowLeft />
  </Link>
  <h1>...</h1>
</div>
```

### 2.3 Page Container Patterns

| Pattern | Classes | Used in |
|---------|---------|---------|
| Max width container | `max-w-7xl mx-auto px-6 py-8` | AnalyticsDashboard |
| Max width smaller | `max-w-4xl mx-auto` | Profile pages |
| Full width | `px-6 py-8` | Board views |
| No padding | - | Custom layouts |

---

## 3. Card/Panel Patterns

### 3.1 shadcn/ui Card Component

**Location:** `src/components/ui/card.tsx`

```tsx
// Basic Card styling
className="rounded-lg border bg-card text-card-foreground shadow-sm"

// CardHeader
className="flex flex-col space-y-1.5 p-6"

// CardTitle
className="text-2xl font-semibold leading-none tracking-tight"

// CardContent
className="p-6 pt-0"
```

### 3.2 Manual Card Styles (common)

| Style | Count | Example |
|-------|-------|---------|
| `bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700` | 50+ | Most pages |
| `bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm` | 20+ | TaskCard, inline cards |
| `bg-gray-50 dark:bg-gray-900 rounded-lg` | 15+ | Nested cards, sidebars |
| `bg-white rounded-lg border shadow-sm` | 10+ | Simple cards |

### 3.3 Card Padding Variants

| Padding | Used for |
|---------|----------|
| `p-3` | Small cards, list items |
| `p-4` | Medium cards |
| `p-6` | Large cards, settings sections |
| `p-8` | Hero sections, empty states |

### 3.4 Card Headers Within Cards

```tsx
// Pattern 1: Icon + Title
<div className="flex items-center gap-2 mb-4">
  <Icon className="w-5 h-5 text-blue-500" />
  <h3 className="text-lg font-semibold">Title</h3>
</div>

// Pattern 2: Title + Action
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold">Title</h3>
  <Button size="sm">Action</Button>
</div>
```

---

## 4. Form Element Patterns

### 4.1 shadcn/ui Input Component

**Location:** `src/components/ui/input.tsx`

```tsx
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2
           text-base ring-offset-background placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
           focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

### 4.2 Manual Input Styles

There are **108 manual `<input>` or `<Input>` components** used.

**Most common manual style:**
```tsx
className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

### 4.3 Form Layout Patterns

**Pattern A - Vertical Stack:**
```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium mb-1">Label</label>
    <Input />
  </div>
</div>
```

**Pattern B - Grid Layout:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>...</label>
    <Input />
  </div>
</div>
```

### 4.4 Label Styles

| Style | Examples |
|-------|----------|
| `text-sm font-medium text-gray-700 dark:text-gray-300` | Most common |
| `text-sm font-medium mb-1` | Compact |
| `block text-sm font-medium mb-2` | With spacing |

### 4.5 Select/Dropdown Components

- **shadcn/ui Select:** `src/components/ui/select.tsx` (Radix-based)
- **Native selects:** ~50 instances with manual styling

---

## 5. Modal/Dialog Patterns

### 5.1 shadcn/ui Dialog Component

**Location:** `src/components/ui/dialog.tsx`

| Component | Styling |
|-----------|---------|
| Overlay | `bg-black/50 backdrop-blur-sm` |
| Content | `max-w-4xl p-6 rounded-lg shadow-lg` |
| Title | `text-lg font-semibold leading-none tracking-tight` |
| Description | `text-sm text-muted-foreground` |

### 5.2 Dialog Usage Locations (16 files)

| Component | Type |
|-----------|------|
| TaskDetailModal | Large, complex |
| SubtaskEditModal | Medium |
| WikiSearchDialog | Medium |
| FactCheckDialog | Medium |
| ContradictionDialog | Medium |
| AddMembersModal | Medium |
| ConflictWarningModal | Small |
| WikiDuplicateManager | Medium |
| WikiVersionHistory | Large |
| WikiTemporalSearch | Medium |

### 5.3 Modal Widths

| Width | Usage |
|-------|-------|
| `max-w-sm` | Confirmation dialogs |
| `max-w-md` | Small forms |
| `max-w-lg` | Medium forms |
| `max-w-xl` | Large forms |
| `max-w-2xl` | Detail views |
| `max-w-4xl` | Complex modals (default) |
| `max-w-6xl` | Full feature modals |

---

## 6. Button Patterns

### 6.1 shadcn/ui Button Variants

**Location:** `src/components/ui/button.tsx`

| Variant | Styling |
|---------|---------|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |
| `outline` | `border border-input bg-background hover:bg-accent` |
| `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

### 6.2 Button Sizes

| Size | Styling |
|------|---------|
| `default` | `h-10 px-4 py-2` |
| `sm` | `h-9 rounded-md px-3` |
| `lg` | `h-11 rounded-md px-8` |
| `icon` | `h-10 w-10` |

### 6.3 Button Usage Statistics

- **Total `<Button>` components:** 217 instances in 50 files
- **Most common variant:** `default` and `outline`
- **Most common size:** `default` and `sm`

### 6.4 Manual Button Styles

Besides the shadcn Button, manual buttons are also used:

```tsx
// Primary manual
className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"

// Secondary manual
className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
           dark:hover:bg-gray-600 rounded-lg"

// Icon button manual
className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
```

---

## 7. UI Component Library

### 7.1 shadcn/ui Components (20 files)

| Component | File | Radix-based |
|-----------|------|-------------|
| Button | button.tsx | No (Slot) |
| Card | card.tsx | No |
| Input | input.tsx | No |
| Label | label.tsx | Yes |
| Dialog | dialog.tsx | Yes |
| Dropdown Menu | dropdown-menu.tsx | Yes |
| Select | select.tsx | Yes |
| Tabs | tabs.tsx | Yes |
| Tooltip | tooltip.tsx | Yes |
| Badge | badge.tsx | No |
| Checkbox | checkbox.tsx | Yes |
| Switch | switch.tsx | Yes |
| Slider | slider.tsx | Yes |
| Progress | progress.tsx | Yes |
| Scroll Area | scroll-area.tsx | Yes |
| Separator | separator.tsx | Yes |
| Collapsible | collapsible.tsx | Yes |
| Sonner (Toast) | sonner.tsx | No |
| HoverPopover | HoverPopover.tsx | Custom |
| UndoRedoButtons | UndoRedoButtons.tsx | Custom |

---

## 8. Spacing & Sizing Patterns

### 8.1 Spacing Scale (Tailwind)

| Token | Pixels | Usage |
|-------|--------|-------|
| `1` | 4px | Micro spacing |
| `2` | 8px | Small gaps |
| `3` | 12px | List item padding |
| `4` | 16px | Card padding, gaps |
| `6` | 24px | Section padding |
| `8` | 32px | Large spacing |

### 8.2 Gap Patterns

| Pattern | Usage |
|---------|-------|
| `gap-2` | Icons next to text |
| `gap-3` | List items |
| `gap-4` | Card grids |
| `gap-6` | Section spacing |

### 8.3 Margin Patterns

| Pattern | Usage |
|---------|-------|
| `mb-2` | Label to input |
| `mb-4` | Section headers |
| `mb-6` | Page sections |
| `mb-8` | Major sections |

---

## 9. Color Patterns (Summary)

### 9.1 Design System Colors (CSS Variables)

Design tokens are defined in `globals.css`:

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `0 0% 100%` | `240 10% 3.9%` |
| `--foreground` | `240 10% 3.9%` | `0 0% 98%` |
| `--primary` | `240 5.9% 10%` | `0 0% 98%` |
| `--secondary` | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--muted` | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--accent` | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` |

### 9.2 Hardcoded Colors (Problem)

| Type | Count |
|------|-------|
| Hardcoded `bg-*` classes | 1,443 |
| Hardcoded `text-*` classes | 2,405 |
| Design system usage | 804 |
| **Ratio hardcoded vs design system** | **~5:1** |

### 9.3 Priority Color Inconsistency

| View | LOW | MEDIUM | HIGH | URGENT |
|------|-----|--------|------|--------|
| FilterBar, TaskCountWidget | gray | blue | **orange** | red |
| CalendarView, TimelineView | gray | blue | **yellow** | red |

---

## 10. Responsive Patterns

### 10.1 Breakpoints (Tailwind defaults)

| Prefix | Min-width |
|--------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### 10.2 Responsive Patterns

**Grid Responsive:**
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

**Hide/Show:**
```tsx
className="hidden md:block"  // Hide on mobile
className="md:hidden"        // Mobile only
```

**Text Size:**
```tsx
className="text-sm md:text-base"
```

---

## 11. State Patterns

### 11.1 Loading States

```tsx
// Spinner pattern
<Loader2 className="w-8 h-8 animate-spin text-blue-500" />

// Skeleton pattern
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />

// Full page loading
<div className="flex items-center justify-center h-64">
  <Loader2 className="w-8 h-8 animate-spin" />
</div>
```

### 11.2 Empty States

```tsx
<div className="flex flex-col items-center justify-center h-64 gap-4">
  <Icon className="w-12 h-12 text-gray-400" />
  <p className="text-gray-500">No items found</p>
  <Button>Add Item</Button>
</div>
```

### 11.3 Error States

```tsx
<div className="flex flex-col items-center justify-center h-64 gap-4">
  <AlertCircle className="w-12 h-12 text-red-500" />
  <h2 className="text-xl font-semibold">Something went wrong</h2>
  <p className="text-gray-500">Error message here</p>
</div>
```

---

## 12. Statistics Summary

| Metric | Value |
|--------|-------|
| **Total frontend files** | 180+ |
| **Total lines of code** | 85,000+ |
| **shadcn/ui components** | 20 |
| **Layout components** | 5 |
| **Sidebar variants** | 7 |
| **Dialog/Modal files** | 16 |
| **Button instances** | 217 |
| **Input instances** | 108 |
| **Hardcoded colors** | 3,848 |
| **Design system colors** | 804 |
| **Title style variants** | 7 |
| **Card style variants** | 4+ |

---

## 13. Files by Category

### 13.1 Layout Files

```
src/components/layout/
├── BaseLayout.tsx (508 lines)
├── DashboardLayout.tsx
├── ProjectLayout.tsx
├── AdminLayout.tsx
├── ProfileLayout.tsx
├── DashboardSidebar.tsx
├── ProjectSidebar.tsx
├── AdminSidebar.tsx
├── ProfileSidebar.tsx
└── WidthToggle.tsx
```

### 13.2 UI Component Files

```
src/components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
├── label.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── select.tsx
├── tabs.tsx
├── tooltip.tsx
├── badge.tsx
├── checkbox.tsx
├── switch.tsx
├── slider.tsx
├── progress.tsx
├── scroll-area.tsx
├── separator.tsx
├── collapsible.tsx
├── sonner.tsx
├── HoverPopover.tsx
└── UndoRedoButtons.tsx
```

---

*Document generated: 2026-01-15*
*Version: 1.0.0*
