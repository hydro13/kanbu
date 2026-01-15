# Kanbu UI Pattern Library - Inventarisatie

Dit document bevat een complete inventarisatie van alle UI patronen die momenteel in de Kanbu codebase bestaan. Dit is een **feitelijke inventarisatie** - geen oordeel of aanbevelingen.

---

## 1. Layout Patronen

### 1.1 Layout Hiërarchie

```
BaseLayout (508 regels)
├── DashboardLayout (gebruikt BaseLayout + DashboardSidebar)
│   ├── AdminLayout (gebruikt DashboardLayout + AdminSidebar + page header)
│   └── ProfileLayout (gebruikt DashboardLayout + ProfileSidebar + page header)
└── ProjectLayout (gebruikt BaseLayout + ProjectSidebar)
```

### 1.2 BaseLayout Kenmerken

**Locatie:** `src/components/layout/BaseLayout.tsx`

| Eigenschap | Waarde |
|------------|--------|
| Header hoogte | `h-10` (40px) |
| Sidebar default breedte | 224px (w-56) |
| Sidebar collapsed breedte | 56px (w-14) |
| Sidebar min breedte | 160px |
| Sidebar max breedte | 400px |
| Content max breedte | 1600px (wanneer niet full-width) |
| Content padding | `p-6` (24px) |

**Features:**
- Resizable sidebar met drag handle
- Collapsible sidebar (icons-only mode)
- Mobile responsive met overlay menu
- Breadcrumb navigatie in header
- User menu dropdown rechts

### 1.3 Specifieke Layouts

| Layout | Sidebar | Extra Header |
|--------|---------|--------------|
| DashboardLayout | DashboardSidebar | - |
| ProjectLayout | ProjectSidebar | Presence indicator |
| AdminLayout | AdminSidebar | Page header met titel |
| ProfileLayout | ProfileSidebar | Page header met titel |

### 1.4 Sidebar Varianten (7 gevonden)

| Sidebar | Locatie | Regels |
|---------|---------|--------|
| DashboardSidebar | `src/components/layout/DashboardSidebar.tsx` | ~200 |
| ProjectSidebar | `src/components/layout/ProjectSidebar.tsx` | ~250 |
| AdminSidebar | `src/components/layout/AdminSidebar.tsx` | ~150 |
| ProfileSidebar | `src/components/layout/ProfileSidebar.tsx` | ~100 |
| WikiSidebar | `src/components/wiki/WikiSidebar.tsx` | ~300 |
| TaskDetailSidebar | `src/components/task/TaskDetailSidebar.tsx` | ~150 |
| FilterSidebar | Diverse locaties | Varies |

---

## 2. Page Header Patronen

### 2.1 Gevonden Title Stijlen

Er zijn **7 verschillende title stijlen** gevonden in de codebase:

| Stijl | Voorbeelden |
|-------|-------------|
| `text-3xl font-bold tracking-tight` | WorkspaceSettings, WikiPage, TagManagement, WorkspaceGroups, UserProfile |
| `text-2xl font-bold` | ImportExport, AcceptInvite, BoardSettings |
| `text-2xl font-semibold` | AnalyticsDashboard |
| `text-xl font-bold` | WebhookSettings |
| `text-xl font-semibold` | ApiSettings, AclPage |
| `text-lg font-semibold` | Dialog titles, kleinere secties |
| `text-lg font-medium` | Subsecties |

### 2.2 Header Layout Patronen

**Patroon A - Simple Header:**
```tsx
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
  Page Title
</h1>
```

**Patroon B - Header met Icon:**
```tsx
<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
  <Icon className="w-8 h-8 text-blue-600" />
  Page Title
</h1>
```

**Patroon C - Header met Stats:**
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

**Patroon D - Header met Back Button:**
```tsx
<div className="flex items-center gap-4">
  <Link to="..." className="p-2 hover:bg-gray-100 rounded-lg">
    <ArrowLeft />
  </Link>
  <h1>...</h1>
</div>
```

### 2.3 Page Container Patronen

| Patroon | Classes | Gebruikt in |
|---------|---------|-------------|
| Max width container | `max-w-7xl mx-auto px-6 py-8` | AnalyticsDashboard |
| Max width smaller | `max-w-4xl mx-auto` | Profile pages |
| Full width | `px-6 py-8` | Board views |
| No padding | - | Custom layouts |

---

## 3. Card/Panel Patronen

### 3.1 shadcn/ui Card Component

**Locatie:** `src/components/ui/card.tsx`

```tsx
// Basis Card styling
className="rounded-lg border bg-card text-card-foreground shadow-sm"

// CardHeader
className="flex flex-col space-y-1.5 p-6"

// CardTitle
className="text-2xl font-semibold leading-none tracking-tight"

// CardContent
className="p-6 pt-0"
```

### 3.2 Handmatige Card Stijlen (veel voorkomend)

| Stijl | Aantal | Voorbeeld |
|-------|--------|-----------|
| `bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700` | 50+ | Meeste pages |
| `bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm` | 20+ | TaskCard, inline cards |
| `bg-gray-50 dark:bg-gray-900 rounded-lg` | 15+ | Nested cards, sidebars |
| `bg-white rounded-lg border shadow-sm` | 10+ | Simpele cards |

### 3.3 Card Padding Varianten

| Padding | Gebruikt voor |
|---------|---------------|
| `p-3` | Kleine cards, list items |
| `p-4` | Medium cards |
| `p-6` | Grote cards, settings sections |
| `p-8` | Hero sections, empty states |

### 3.4 Card Header Binnen Cards

```tsx
// Patroon 1: Icon + Title
<div className="flex items-center gap-2 mb-4">
  <Icon className="w-5 h-5 text-blue-500" />
  <h3 className="text-lg font-semibold">Title</h3>
</div>

// Patroon 2: Title + Action
<div className="flex items-center justify-between mb-4">
  <h3 className="text-lg font-semibold">Title</h3>
  <Button size="sm">Action</Button>
</div>
```

---

## 4. Form Element Patronen

### 4.1 shadcn/ui Input Component

**Locatie:** `src/components/ui/input.tsx`

```tsx
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2
           text-base ring-offset-background placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
           focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

### 4.2 Handmatige Input Stijlen

Er worden **108 handmatige `<input>` of `<Input>` componenten** gebruikt.

**Meest voorkomende handmatige stijl:**
```tsx
className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

### 4.3 Form Layout Patronen

**Patroon A - Vertical Stack:**
```tsx
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium mb-1">Label</label>
    <Input />
  </div>
</div>
```

**Patroon B - Grid Layout:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <label>...</label>
    <Input />
  </div>
</div>
```

### 4.4 Label Stijlen

| Stijl | Voorbeelden |
|-------|-------------|
| `text-sm font-medium text-gray-700 dark:text-gray-300` | Meest voorkomend |
| `text-sm font-medium mb-1` | Compact |
| `block text-sm font-medium mb-2` | Met spacing |

### 4.5 Select/Dropdown Componenten

- **shadcn/ui Select:** `src/components/ui/select.tsx` (Radix-based)
- **Native selects:** ~50 instances met handmatige styling

---

## 5. Modal/Dialog Patronen

### 5.1 shadcn/ui Dialog Component

**Locatie:** `src/components/ui/dialog.tsx`

| Onderdeel | Styling |
|-----------|---------|
| Overlay | `bg-black/50 backdrop-blur-sm` |
| Content | `max-w-4xl p-6 rounded-lg shadow-lg` |
| Title | `text-lg font-semibold leading-none tracking-tight` |
| Description | `text-sm text-muted-foreground` |

### 5.2 Dialog Gebruikslocaties (16 bestanden)

| Component | Type |
|-----------|------|
| TaskDetailModal | Groot, complex |
| SubtaskEditModal | Medium |
| WikiSearchDialog | Medium |
| FactCheckDialog | Medium |
| ContradictionDialog | Medium |
| AddMembersModal | Medium |
| ConflictWarningModal | Klein |
| WikiDuplicateManager | Medium |
| WikiVersionHistory | Groot |
| WikiTemporalSearch | Medium |

### 5.3 Modal Breedtes

| Breedte | Gebruik |
|---------|---------|
| `max-w-sm` | Confirmatie dialogs |
| `max-w-md` | Kleine forms |
| `max-w-lg` | Medium forms |
| `max-w-xl` | Grote forms |
| `max-w-2xl` | Detail views |
| `max-w-4xl` | Complexe modals (default) |
| `max-w-6xl` | Full feature modals |

---

## 6. Button Patronen

### 6.1 shadcn/ui Button Variants

**Locatie:** `src/components/ui/button.tsx`

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

### 6.3 Button Gebruik Statistieken

- **Totaal `<Button>` componenten:** 217 instances in 50 bestanden
- **Meest voorkomende variant:** `default` en `outline`
- **Meest voorkomende size:** `default` en `sm`

### 6.4 Handmatige Button Stijlen

Naast de shadcn Button worden er ook handmatige buttons gebruikt:

```tsx
// Primary handmatig
className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"

// Secondary handmatig
className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
           dark:hover:bg-gray-600 rounded-lg"

// Icon button handmatig
className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
```

---

## 7. UI Component Bibliotheek

### 7.1 shadcn/ui Componenten (20 bestanden)

| Component | Bestand | Radix-based |
|-----------|---------|-------------|
| Button | button.tsx | Nee (Slot) |
| Card | card.tsx | Nee |
| Input | input.tsx | Nee |
| Label | label.tsx | Ja |
| Dialog | dialog.tsx | Ja |
| Dropdown Menu | dropdown-menu.tsx | Ja |
| Select | select.tsx | Ja |
| Tabs | tabs.tsx | Ja |
| Tooltip | tooltip.tsx | Ja |
| Badge | badge.tsx | Nee |
| Checkbox | checkbox.tsx | Ja |
| Switch | switch.tsx | Ja |
| Slider | slider.tsx | Ja |
| Progress | progress.tsx | Ja |
| Scroll Area | scroll-area.tsx | Ja |
| Separator | separator.tsx | Ja |
| Collapsible | collapsible.tsx | Ja |
| Sonner (Toast) | sonner.tsx | Nee |
| HoverPopover | HoverPopover.tsx | Custom |
| UndoRedoButtons | UndoRedoButtons.tsx | Custom |

---

## 8. Spacing & Sizing Patronen

### 8.1 Spacing Schaal (Tailwind)

| Token | Pixels | Gebruik |
|-------|--------|---------|
| `1` | 4px | Micro spacing |
| `2` | 8px | Kleine gaps |
| `3` | 12px | List item padding |
| `4` | 16px | Card padding, gaps |
| `6` | 24px | Section padding |
| `8` | 32px | Large spacing |

### 8.2 Gap Patronen

| Pattern | Gebruik |
|---------|---------|
| `gap-2` | Icons naast text |
| `gap-3` | List items |
| `gap-4` | Card grids |
| `gap-6` | Section spacing |

### 8.3 Margin Patronen

| Pattern | Gebruik |
|---------|---------|
| `mb-2` | Label naar input |
| `mb-4` | Sectie headers |
| `mb-6` | Page sections |
| `mb-8` | Major sections |

---

## 9. Color Patronen (Samenvatting)

### 9.1 Design System Colors (CSS Variables)

De design tokens zijn gedefinieerd in `globals.css`:

| Token | Light | Dark |
|-------|-------|------|
| `--background` | `0 0% 100%` | `240 10% 3.9%` |
| `--foreground` | `240 10% 3.9%` | `0 0% 98%` |
| `--primary` | `240 5.9% 10%` | `0 0% 98%` |
| `--secondary` | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--muted` | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--accent` | `240 4.8% 95.9%` | `240 3.7% 15.9%` |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` |

### 9.2 Hardcoded Colors (Probleem)

| Type | Aantal |
|------|--------|
| Hardcoded `bg-*` classes | 1,443 |
| Hardcoded `text-*` classes | 2,405 |
| Design system usage | 804 |
| **Ratio hardcoded vs design system** | **~5:1** |

### 9.3 Priority Color Inconsistentie

| View | LOW | MEDIUM | HIGH | URGENT |
|------|-----|--------|------|--------|
| FilterBar, TaskCountWidget | gray | blue | **orange** | red |
| CalendarView, TimelineView | gray | blue | **yellow** | red |

---

## 10. Responsive Patronen

### 10.1 Breakpoints (Tailwind defaults)

| Prefix | Min-width |
|--------|-----------|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### 10.2 Responsive Patronen

**Grid Responsive:**
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

**Hide/Show:**
```tsx
className="hidden md:block"  // Verberg op mobile
className="md:hidden"        // Alleen mobile
```

**Text Size:**
```tsx
className="text-sm md:text-base"
```

---

## 11. State Patronen

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

## 12. Statistieken Samenvatting

| Metric | Waarde |
|--------|--------|
| **Totaal frontend bestanden** | 180+ |
| **Totaal regels code** | 85,000+ |
| **shadcn/ui componenten** | 20 |
| **Layout componenten** | 5 |
| **Sidebar varianten** | 7 |
| **Dialog/Modal bestanden** | 16 |
| **Button instances** | 217 |
| **Input instances** | 108 |
| **Hardcoded kleuren** | 3,848 |
| **Design system kleuren** | 804 |
| **Title stijl varianten** | 7 |
| **Card stijl varianten** | 4+ |

---

## 13. Bestanden per Categorie

### 13.1 Layout Bestanden

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

### 13.2 UI Component Bestanden

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

*Document gegenereerd: 2026-01-15*
*Versie: 1.0.0*
