# Kanbu Design Token Migration Guide

**Version:** 2.0.0
**Last updated:** 2026-01-16
**Status:** Design System v2.0.0 Complete

---

## Contents

1. [Overview](#overview)
2. [Quick Migration Table](#quick-migration-table)
3. [Regex Search Patterns](#regex-search-patterns)
4. [Common Migrations](#common-migrations)
5. [Component-Specific Migrations](#component-specific-migrations)
6. [Code Review Checklist](#code-review-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This document describes how to migrate hardcoded Tailwind colors to the Kanbu design token system. The design token system provides:

- **Automatic dark mode** - No `dark:` prefixes needed
- **Consistent colors** - All UI elements share the same color scheme
- **Themeability** - Users can choose accent colors
- **Maintainability** - Changes in one place, applied everywhere

### Principle

**Avoid:**

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

**Use:**

```tsx
<div className="bg-background text-foreground">
```

---

## Quick Migration Table

### Backgrounds

| Old Pattern                      | New Pattern     | Token          |
| -------------------------------- | --------------- | -------------- |
| `bg-white dark:bg-gray-900`      | `bg-background` | `--background` |
| `bg-white dark:bg-gray-800`      | `bg-card`       | `--card`       |
| `bg-gray-50 dark:bg-gray-800`    | `bg-surface-2`  | `--surface-2`  |
| `bg-gray-100 dark:bg-gray-700`   | `bg-surface-3`  | `--surface-3`  |
| `bg-gray-50 dark:bg-gray-700`    | `bg-muted`      | `--muted`      |
| `bg-blue-50 dark:bg-blue-900/20` | `bg-accent`     | `--accent`     |

### Text Colors

| Old Pattern                        | New Pattern             | Token                |
| ---------------------------------- | ----------------------- | -------------------- |
| `text-gray-900 dark:text-gray-100` | `text-foreground`       | `--foreground`       |
| `text-gray-900 dark:text-white`    | `text-foreground`       | `--foreground`       |
| `text-gray-600 dark:text-gray-300` | `text-muted-foreground` | `--muted-foreground` |
| `text-gray-500 dark:text-gray-400` | `text-muted-foreground` | `--muted-foreground` |
| `text-gray-400 dark:text-gray-500` | `text-muted-foreground` | `--muted-foreground` |

### Borders

| Old Pattern                            | New Pattern     | Token      |
| -------------------------------------- | --------------- | ---------- |
| `border-gray-200 dark:border-gray-700` | `border-border` | `--border` |
| `border-gray-200 dark:border-gray-800` | `border-border` | `--border` |
| `border-gray-300 dark:border-gray-600` | `border-border` | `--border` |
| `divide-gray-200 dark:divide-gray-700` | `divide-border` | `--border` |

### Status Colors

| Old Pattern                          | New Pattern         | Token           |
| ------------------------------------ | ------------------- | --------------- |
| `text-green-500` / `text-green-600`  | `text-success`      | `--success`     |
| `text-red-500` / `text-red-600`      | `text-destructive`  | `--destructive` |
| `text-yellow-500` / `text-amber-600` | `text-warning`      | `--warning`     |
| `text-blue-500` / `text-blue-600`    | `text-info`         | `--info`        |
| `bg-green-100 dark:bg-green-900/30`  | `bg-success/10`     | `--success`     |
| `bg-red-100 dark:bg-red-900/30`      | `bg-destructive/10` | `--destructive` |
| `bg-yellow-100 dark:bg-amber-900/30` | `bg-warning/10`     | `--warning`     |

### Interactive States

| Old Pattern                                | New Pattern         | Token      |
| ------------------------------------------ | ------------------- | ---------- |
| `hover:bg-gray-50 dark:hover:bg-gray-800`  | `hover:bg-accent`   | `--accent` |
| `hover:bg-gray-100 dark:hover:bg-gray-700` | `hover:bg-muted`    | `--muted`  |
| `focus:ring-blue-500`                      | `focus:ring-ring`   | `--ring`   |
| `focus:border-blue-500`                    | `focus:border-ring` | `--ring`   |

### Primary/Brand Colors

| Old Pattern                   | New Pattern               | Token                  |
| ----------------------------- | ------------------------- | ---------------------- |
| `bg-blue-500` / `bg-blue-600` | `bg-primary`              | `--primary`            |
| `text-white` (on primary)     | `text-primary-foreground` | `--primary-foreground` |
| `hover:bg-blue-600`           | `hover:bg-primary/90`     | `--primary`            |

---

## Regex Search Patterns

### Find Hardcoded Background Colors

```regex
bg-(white|black|gray|blue|red|green|orange|yellow|amber|teal|violet|rose|cyan)-?\d{0,3}
```

**Usage in VS Code:**

1. Open Search (Ctrl+Shift+F)
2. Enable Regex (Alt+R)
3. Search in `*.tsx` files

### Find Hardcoded Text Colors

```regex
text-(gray|blue|red|green|orange|yellow|amber|teal|violet|rose|cyan)-\d{2,3}
```

### Find Dark Mode Overrides

```regex
dark:(bg|text|border|ring)-\w+-\d{2,3}
```

### Find Border Colors

```regex
border-(gray|blue|red|green)-\d{2,3}
```

### Find Divide Colors

```regex
divide-(gray)-\d{2,3}
```

### Combined Pattern (All Hardcoded Colors)

```regex
(bg|text|border|ring|divide|from|to|via)-(white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-?\d{0,3}
```

---

## Common Migrations

### Card Component

**Before:**

```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
  <h3 className="text-gray-900 dark:text-white font-semibold">Title</h3>
  <p className="text-gray-600 dark:text-gray-300">Description</p>
</div>
```

**After:**

```tsx
<div className="bg-card border border-border rounded-lg shadow-sm">
  <h3 className="text-card-foreground font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Page Header

**Before:**

```tsx
<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page Title</h1>
  <p className="text-gray-500 dark:text-gray-400">Subtitle text</p>
</div>
```

**After:**

```tsx
<div className="bg-background border-b border-border">
  <h1 className="text-2xl font-bold text-foreground">Page Title</h1>
  <p className="text-muted-foreground">Subtitle text</p>
</div>
```

### Table Row

**Before:**

```tsx
<tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
  <td className="text-gray-900 dark:text-gray-100">Content</td>
  <td className="text-gray-500 dark:text-gray-400">Secondary</td>
</tr>
```

**After:**

```tsx
<tr className="border-b border-border hover:bg-muted/50">
  <td className="text-foreground">Content</td>
  <td className="text-muted-foreground">Secondary</td>
</tr>
```

### Status Badge

**Before:**

```tsx
<span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs">
  Active
</span>
```

**After:**

```tsx
<Badge variant="success">Active</Badge>
```

Or manually:

```tsx
<span className="bg-success/10 text-success px-2 py-1 rounded-full text-xs">Active</span>
```

### Form Input

**Before:**

```tsx
<input className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500" />
```

**After:**

```tsx
<Input />
```

Or manually:

```tsx
<input className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-ring" />
```

### Button

**Before:**

```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Save</button>
```

**After:**

```tsx
<Button>Save</Button>
```

Or manually:

```tsx
<button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md">
  Save
</button>
```

### Sidebar Item

**Before:**

```tsx
<a className="flex items-center px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
  <Icon className="text-gray-500 dark:text-gray-400" />
  <span>Menu Item</span>
</a>
```

**After:**

```tsx
<a className="flex items-center px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
  <Icon />
  <span>Menu Item</span>
</a>
```

### Active Sidebar Item

**Before:**

```tsx
<a className="flex items-center px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
```

**After:**

```tsx
<a className="flex items-center px-3 py-2 rounded-md bg-accent text-accent-foreground">
```

---

## Component-Specific Migrations

### Dialog/Modal

**Before:**

```tsx
<div className="fixed inset-0 bg-black/50">
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
```

**After:**

```tsx
<DialogOverlay />
<DialogContent>
  {/* Uses bg-background, shadow-lg automatically */}
</DialogContent>
```

### Tooltip

**Before:**

```tsx
<div className="bg-gray-900 dark:bg-gray-700 text-white px-2 py-1 rounded text-sm">
```

**After:**

```tsx
<TooltipContent>{/* Uses --tooltip-background, --tooltip-foreground */}</TooltipContent>
```

### Dropdown Menu

**Before:**

```tsx
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
  <button className="hover:bg-gray-100 dark:hover:bg-gray-700">
```

**After:**

```tsx
<DropdownMenuContent>
  <DropdownMenuItem>{/* Uses bg-popover, hover:bg-accent automatically */}</DropdownMenuItem>
</DropdownMenuContent>
```

---

## Code Review Checklist

### Pre-Commit Check

- [ ] No hardcoded colors (`bg-gray-*`, `text-blue-*`, etc.)
- [ ] No `dark:` prefixes for colors
- [ ] Semantic tokens used where possible
- [ ] Priority colors via `--priority-*` tokens
- [ ] State colors via `--success/warning/error/info`
- [ ] Buttons use `<Button>` component
- [ ] Badges use `<Badge>` component
- [ ] Inputs use `<Input>` component

### Quick Grep Commands

```bash
# Check for hardcoded colors in a file
grep -E "(bg|text|border)-(gray|blue|red|green)-\d" src/components/MyComponent.tsx

# Check entire src directory
grep -rE "(bg|text|border)-(gray|blue|red|green)-\d" src/ --include="*.tsx"

# Count remaining hardcoded colors
grep -rE "(bg|text|border)-(gray|blue|red|green)-\d" src/ --include="*.tsx" | wc -l

# Find dark mode overrides
grep -rE "dark:(bg|text|border)" src/ --include="*.tsx"
```

### Acceptable Exceptions

Some hardcoded colors are acceptable:

1. **Gradients** - Gradients often use specific colors
2. **Syntax highlighting** - Code blocks with specific colors
3. **Charts/graphs** - Data visualizations with fixed colors
4. **Brand assets** - Logos or external brand colors
5. **Third-party libraries** - Where tokens cannot be applied

Document these exceptions with a comment:

```tsx
{
  /* Exception: External brand color, cannot use token */
}
<div className="bg-[#1DA1F2]">Twitter Blue</div>;
```

---

## Troubleshooting

### Problem: Color doesn't change in dark mode

**Cause:** Hardcoded color without `dark:` variant.

**Solution:** Replace with semantic token.

```tsx
// Problem
<div className="bg-white">...</div>  // Stays white in dark mode

// Solution
<div className="bg-background">...</div>  // Automatically dark in dark mode
```

### Problem: Focus ring has wrong color

**Cause:** Hardcoded `focus:ring-blue-500`.

**Solution:**

```tsx
// Problem
<input className="focus:ring-blue-500" />

// Solution
<input className="focus:ring-ring" />
```

### Problem: Hover state is too light/dark

**Cause:** Hardcoded hover color.

**Solution:**

```tsx
// Problem
<button className="hover:bg-gray-100 dark:hover:bg-gray-700">

// Solution
<button className="hover:bg-accent">
// Or for subtle hover:
<button className="hover:bg-muted/50">
```

### Problem: Badge color doesn't match status

**Cause:** Wrong variant or hardcoded color.

**Solution:**

```tsx
// Problem
<span className="bg-green-100 text-green-800">Success</span>

// Solution
<Badge variant="success">Success</Badge>
```

### Problem: Border is invisible in dark mode

**Cause:** Hardcoded light border color.

**Solution:**

```tsx
// Problem
<div className="border border-gray-200">  // Invisible on dark background

// Solution
<div className="border border-border">  // Automatically adjusted
```

---

## Related Documentation

- [Token Reference Guide](./TOKEN-REFERENCE.md) - All available design tokens
- [Component Usage Guide](./COMPONENT-USAGE.md) - Component examples
- [Design System Roadmap](./06-DESIGN-SYSTEM-ROADMAP.md) - Implementation history

---

_Document Version: 2.0.0_
_Last Updated: 2026-01-16_
