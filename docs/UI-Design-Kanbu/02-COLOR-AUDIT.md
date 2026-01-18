# Kanbu Color Audit

**Date:** 2026-01-15
**Version:** 2.0.0
**Status:** ✅ All Issues Resolved

---

## Summary: All Issues Resolved

This document describes the **historical** color issues identified during the design audit. **All mentioned issues have been resolved** in Design System v2.0.0 implementation.

| Issue                        | Status      | Solution                            |
| ---------------------------- | ----------- | ----------------------------------- |
| Hardcoded colors (75%)       | ✅ Resolved | 100% migrated to design tokens      |
| Inconsistent priority colors | ✅ Resolved | Semantic tokens: `--priority-*`     |
| Missing tokens               | ✅ Resolved | success, warning, error, info added |

---

## Historical: Original Findings

### Statistics (BEFORE migration)

| Type                           | Count | Percentage |
| ------------------------------ | ----- | ---------- |
| Hardcoded Tailwind bg-colors   | 1,443 | ~64%       |
| Hardcoded Tailwind text-colors | 2,405 | ~75%       |
| Design system colors           | 804   | ~25%       |

### Statistics (AFTER migration - Phase 2)

| Type                      | Count | Percentage |
| ------------------------- | ----- | ---------- |
| Hardcoded Tailwind colors | 0     | 0%         |
| Design system colors      | 100%  | 100%       |

---

## ~~Priority Color Inconsistency~~ ✅ RESOLVED

### Was The Problem

Priority colors were defined in **4+ different locations** with **different values**:

- FilterBar.tsx → `bg-orange-500` for HIGH
- CalendarView.tsx → `bg-yellow-500` for HIGH
- TimelineView.tsx → `bg-yellow-500` for HIGH

### Current Solution

All priority colors are now centralized as semantic tokens in `globals.css`:

```css
/* Priority Colors (globals.css v2.0.0) */
--priority-low: var(--color-gray-400);
--priority-medium: var(--color-blue-500);
--priority-high: var(--color-orange-500); /* Consistent ORANGE */
--priority-urgent: var(--color-red-500);

/* With light variants for backgrounds */
--priority-low-light: var(--color-gray-100);
--priority-medium-light: var(--color-blue-100);
--priority-high-light: var(--color-orange-100);
--priority-urgent-light: var(--color-red-100);
```

All components now use the same source:

- `lib/design-tokens.ts` for TypeScript constants
- `globals.css` for CSS custom properties

---

## ~~Missing Design Tokens~~ ✅ RESOLVED

### Was The Problem

The original design system was missing:

- `--success` (for positive actions, completed states)
- `--warning` (for high priority, deadlines)
- `--info` (for informational messages)

### Current Solution

Complete state color set in `globals.css`:

```css
/* State Colors - Light Mode */
--success: 142 76% 36%;
--success-foreground: 0 0% 100%;
--success-muted: 142 76% 36% / 0.1;

--warning: 38 92% 50%;
--warning-foreground: 48 96% 89%;
--warning-muted: 38 92% 50% / 0.1;

--error: 0 84% 60%;
--error-foreground: 0 0% 100%;
--error-muted: 0 84% 60% / 0.1;

--info: 217 91% 60%;
--info-foreground: 0 0% 100%;
--info-muted: 217 91% 60% / 0.1;

/* State Colors - Dark Mode */
.dark {
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --error: 0 91% 71%;
  --info: 217 91% 60%;
  /* ... foreground and muted variants */
}
```

---

## Current Token Architecture

### 1. Primitive Color Tokens

10 complete color scales (50-950):

- Gray, Blue, Orange, Red, Green, Amber
- **New:** Teal, Violet, Rose, Cyan

### 2. Semantic Tokens

Meaningful color names that reference primitives:

| Token          | Light Mode | Dark Mode |
| -------------- | ---------- | --------- |
| `--background` | white      | gray-950  |
| `--foreground` | gray-900   | gray-50   |
| `--surface-1`  | white      | gray-900  |
| `--surface-2`  | gray-50    | gray-800  |
| `--surface-3`  | gray-100   | gray-700  |
| `--border`     | gray-200   | gray-700  |
| `--muted`      | gray-100   | gray-800  |

### 3. Component Tokens

Specific tokens per component:

```css
/* Badge tokens */
--badge-default-bg
--badge-success-bg
--badge-warning-bg
--badge-error-bg

/* Toast tokens */
--toast-bg
--toast-success-bg
--toast-error-bg
--toast-warning-bg
--toast-info-bg
```

---

## Tailwind Integration

All colors are available via Tailwind classes:

```tsx
// Semantic colors
<div className="bg-surface-1 text-foreground border-border">
<div className="bg-success/10 text-success">
<div className="bg-warning/10 text-warning">

// Priority colors
<Badge className="bg-priority-high/10 text-priority-high">
<Badge className="bg-priority-urgent/10 text-priority-urgent">

// State colors
<Alert className="bg-error/10 border-error text-error">
<Alert className="bg-info/10 border-info text-info">
```

---

## Completed Steps

- [x] Create centralized color definitions (`lib/design-tokens.ts`)
- [x] Update all priority color references
- [x] Add success/warning/error/info tokens to `globals.css`
- [x] Migrate 100% hardcoded colors
- [x] Test light/dark mode consistency
- [x] Update Tailwind config for semantic colors

---

## Reference: Key Files

| File                                | Function                       |
| ----------------------------------- | ------------------------------ |
| `apps/web/src/styles/globals.css`   | CSS custom properties (v2.0.0) |
| `apps/web/src/lib/design-tokens.ts` | TypeScript token constants     |
| `apps/web/tailwind.config.js`       | Tailwind integration           |
| `apps/web/src/styles/accents.css`   | Accent color overrides         |

---

_Document version: 2.0.0_
_Last updated: 2026-01-15_
