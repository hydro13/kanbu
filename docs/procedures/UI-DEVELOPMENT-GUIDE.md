# UI Development Guide - Kanbu Design System

**Version:** 2.0.0
**Status:** MANDATORY for all UI work
**Last update:** 2026-01-16

---

## Quick Start (5 minutes)

### The Golden Rule

```
NEVER use hardcoded colors!
```

**WRONG:**

```tsx
<div className="bg-gray-100 text-gray-900 border-gray-200">
<span className="text-blue-500">
<button className="bg-slate-800 hover:bg-slate-700">
```

**RIGHT:**

```tsx
<div className="bg-surface-1 text-foreground border-border">
<span className="text-primary">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
```

### Why?

- **Dark mode** works automatically with tokens
- **Accent colors** (6 choices) work automatically
- **Consistency** throughout the application
- **Accessibility** is built-in

---

## Token Cheat Sheet

### Background Colors

| Token            | Usage                  | Light Mode      | Dark Mode        |
| ---------------- | ---------------------- | --------------- | ---------------- |
| `bg-background`  | Page background        | white           | dark gray        |
| `bg-surface-1`   | Cards, first layer     | light gray      | dark gray        |
| `bg-surface-2`   | Nested elements        | slightly darker | slightly lighter |
| `bg-surface-3`   | Deepest nesting        | even darker     | even lighter     |
| `bg-muted`       | Subtle background      | gray            | dark gray        |
| `bg-primary`     | Primary action buttons | accent color    | accent color     |
| `bg-secondary`   | Secondary elements     | light gray      | dark gray        |
| `bg-destructive` | Danger/delete actions  | red             | red              |

### Text Colors

| Token                     | Usage                      |
| ------------------------- | -------------------------- |
| `text-foreground`         | Primary text               |
| `text-muted-foreground`   | Secondary/subtle text      |
| `text-primary`            | Accent colored text        |
| `text-primary-foreground` | Text on primary background |
| `text-destructive`        | Error/danger text          |

### Border Colors

| Token                | Usage              |
| -------------------- | ------------------ |
| `border-border`      | Standard borders   |
| `border-input`       | Form input borders |
| `border-primary`     | Accent borders     |
| `border-destructive` | Error borders      |

### State Colors

| Token                        | Usage              |
| ---------------------------- | ------------------ |
| `bg-success`, `text-success` | Success, completed |
| `bg-warning`, `text-warning` | Warning            |
| `bg-error`, `text-error`     | Errors             |
| `bg-info`, `text-info`       | Information        |

### Priority Colors (Tasks)

| Token                                        | Priority |
| -------------------------------------------- | -------- |
| `bg-priority-low`, `text-priority-low`       | LOW      |
| `bg-priority-medium`, `text-priority-medium` | MEDIUM   |
| `bg-priority-high`, `text-priority-high`     | HIGH     |
| `bg-priority-urgent`, `text-priority-urgent` | URGENT   |

---

## Component Patterns

### Card Component

```tsx
<div className="bg-surface-1 border border-border rounded-lg p-4 shadow-sm">
  <h3 className="text-foreground font-medium">Title</h3>
  <p className="text-muted-foreground text-sm">Description</p>
</div>
```

### Button Variants

```tsx
// Primary (main action)
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Save
</Button>

// Secondary
<Button variant="secondary" className="bg-secondary text-secondary-foreground">
  Cancel
</Button>

// Destructive
<Button variant="destructive" className="bg-destructive text-destructive-foreground">
  Delete
</Button>

// Ghost (subtle)
<Button variant="ghost" className="hover:bg-accent hover:text-accent-foreground">
  More options
</Button>
```

### Form Input

```tsx
<div className="space-y-2">
  <Label className="text-foreground">Label</Label>
  <Input
    className="bg-background border-input text-foreground
               placeholder:text-muted-foreground
               focus:border-primary focus:ring-primary"
  />
  <p className="text-muted-foreground text-sm">Helper text</p>
</div>
```

### Badge/Tag

```tsx
// Status badge
<span className="bg-success/10 text-success px-2 py-1 rounded text-xs font-medium">
  Completed
</span>

// Priority badge
<span className="bg-priority-high text-white px-2 py-1 rounded text-xs font-medium">
  High
</span>

// Neutral badge
<span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-medium">
  Draft
</span>
```

### Table/List Item

```tsx
<tr className="border-b border-border hover:bg-muted/50 transition-colors">
  <td className="text-foreground py-3 px-4">Primary data</td>
  <td className="text-muted-foreground py-3 px-4">Secondary data</td>
</tr>
```

### Modal/Dialog

```tsx
<Dialog>
  <DialogContent className="bg-surface-1 border-border">
    <DialogHeader>
      <DialogTitle className="text-foreground">Title</DialogTitle>
      <DialogDescription className="text-muted-foreground">Description</DialogDescription>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button variant="secondary">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sidebar Item

```tsx
<button
  className={cn(
    'flex items-center gap-3 px-3 py-2 rounded-md w-full',
    'text-muted-foreground hover:text-foreground',
    'hover:bg-accent transition-colors',
    isActive && 'bg-accent text-foreground font-medium'
  )}
>
  <Icon className="h-4 w-4" />
  <span>Menu Item</span>
</button>
```

---

## Do's and Don'ts

### DO: Use Semantic Tokens

```tsx
// GOOD - semantic meaning
className = 'bg-surface-1 text-foreground border-border';
className = 'bg-destructive text-destructive-foreground';
className = 'text-muted-foreground';
```

### DON'T: Hardcoded Colors

```tsx
// WRONG - hardcoded colors
className = 'bg-gray-100 text-gray-900 border-gray-200';
className = 'bg-red-500 text-white';
className = 'text-gray-500';
```

### DO: Use State Tokens

```tsx
// GOOD - state tokens
className = 'bg-success text-success-foreground'; // completed
className = 'bg-warning text-warning-foreground'; // pending
className = 'bg-error text-error-foreground'; // failed
```

### DON'T: Hardcoded State Colors

```tsx
// WRONG - hardcoded state colors
className = 'bg-green-500'; // completed
className = 'bg-yellow-500'; // pending
className = 'bg-red-500'; // failed
```

### DO: Hover/Focus States

```tsx
// GOOD - consistent interaction states
className = 'hover:bg-accent focus:ring-2 focus:ring-ring';
className = 'hover:bg-primary/90 active:bg-primary/80';
```

### DON'T: Hardcoded Hover States

```tsx
// WRONG - hardcoded hover
className = 'hover:bg-gray-200';
className = 'hover:bg-blue-600';
```

### DO: Opacity for Variations

```tsx
// GOOD - use opacity for lighter variants
className = 'bg-primary/10 text-primary'; // light background
className = 'bg-destructive/10 text-destructive';
className = 'border-primary/50'; // subtle border
```

### DON'T: Separate Color Shades

```tsx
// WRONG - hardcoded shades
className = 'bg-blue-100 text-blue-700';
className = 'bg-red-50 text-red-600';
```

---

## Pre-Commit Checklist

Run these commands BEFORE you commit to find hardcoded colors:

### Check for Hardcoded Background Colors

```bash
cd apps/web/src
grep -rn "bg-\(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-[0-9]" --include="*.tsx" --include="*.ts"
```

### Check for Hardcoded Text Colors

```bash
grep -rn "text-\(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-[0-9]" --include="*.tsx" --include="*.ts"
```

### Check for Hardcoded Border Colors

```bash
grep -rn "border-\(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-[0-9]" --include="*.tsx" --include="*.ts"
```

### Expected Output

The output should be **EMPTY**, or only contain false positives (e.g., in comments or disabled code).

If there are matches: **REPLACE** them with the correct tokens from the cheat sheet above.

---

## Design Token Locations

| File                   | Contents                                  |
| ---------------------- | ----------------------------------------- |
| `styles/globals.css`   | All CSS custom properties (design tokens) |
| `styles/accents.css`   | Accent color overrides                    |
| `lib/design-tokens.ts` | TypeScript token definitions              |
| `tailwind.config.js`   | Tailwind integration with tokens          |

### Token Structure (globals.css)

```css
:root {
  /* Primitive Colors - DO NOT use directly */
  --gray-50: ...;
  --gray-100: ...;

  /* Semantic Colors - USE THESE */
  --background: ...;
  --foreground: ...;
  --surface-1: ...;
  --primary: ...;

  /* Component Tokens */
  --card-background: var(--surface-1);
  --button-primary: var(--primary);
}

.dark {
  /* Dark mode overrides */
  --background: ...;
  --foreground: ...;
}
```

---

## Creating New Components

### Step 1: Check existing components

Before creating a new component, check if something similar already exists:

```bash
# Search in ui/ directory
ls apps/web/src/components/ui/

# Search for specific component
grep -rn "ComponentName" apps/web/src/components/
```

### Step 2: Use shadcn/ui as base

Kanbu uses shadcn/ui. Check if the component is available there first:

- https://ui.shadcn.com/docs/components

### Step 3: Token-first approach

ALWAYS start with tokens:

```tsx
// Step 1: Define the base with tokens
const baseStyles = 'bg-surface-1 text-foreground border-border rounded-lg';

// Step 2: Add interaction states
const interactiveStyles = 'hover:bg-accent focus:ring-2 focus:ring-ring';

// Step 3: Combine with variants
const variants = {
  default: 'bg-surface-1',
  primary: 'bg-primary text-primary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
};
```

### Step 4: Test both themes

**ALWAYS** test in:

1. Light mode
2. Dark mode
3. All 6 accent colors (if relevant)

---

## Common Mistakes

### Mistake 1: "It works in light mode"

```tsx
// WRONG - looks good in light, unreadable in dark
<div className="bg-white text-black">

// RIGHT - works in both modes
<div className="bg-background text-foreground">
```

### Mistake 2: Inline hex/rgb colors

```tsx
// WRONG - inline colors
<div style={{ backgroundColor: '#f3f4f6', color: '#111827' }}>

// GOOD - CSS variables if needed
<div style={{ backgroundColor: 'var(--surface-1)', color: 'var(--foreground)' }}>

// BEST - Tailwind classes
<div className="bg-surface-1 text-foreground">
```

### Mistake 3: Color in component props

```tsx
// WRONG - hardcoded color as prop
<Icon color="#3b82f6" />
<Badge color="blue" />

// RIGHT - semantic meaning
<Icon className="text-primary" />
<Badge variant="primary" />
```

### Mistake 4: Forgetting hover states

```tsx
// WRONG - no hover feedback
<button className="bg-primary text-white">Click</button>

// RIGHT - clear hover feedback
<button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
  Click
</button>
```

---

## Quick Reference Card

Print this out or keep open during development:

```
BACKGROUNDS          TEXT                 BORDERS
─────────────────────────────────────────────────────
bg-background        text-foreground      border-border
bg-surface-1         text-muted-foreground border-input
bg-surface-2         text-primary         border-primary
bg-surface-3         text-destructive     border-destructive
bg-muted
bg-primary
bg-secondary
bg-destructive

STATES               PRIORITY
─────────────────────────────────────────────────────
bg-success           bg-priority-low
bg-warning           bg-priority-medium
bg-error             bg-priority-high
bg-info              bg-priority-urgent

INTERACTION
─────────────────────────────────────────────────────
hover:bg-accent      focus:ring-ring
hover:bg-primary/90  active:bg-primary/80
hover:text-foreground transition-colors
```

---

## Need Help?

### Documentation

- Design System Architecture: `docs/UI-Design-Kanbu/05-DESIGN-SYSTEM-ARCHITECTURE.md`
- Token Definitions: `apps/web/src/styles/globals.css`
- Component Audit: `docs/UI-Design-Kanbu/03-COMPONENT-AUDIT.md`

### When in Doubt

1. Check globals.css for available tokens
2. Look at existing components for patterns
3. Test in dark mode BEFORE you commit
4. Ask the user if unclear

---

_Document version: 2.0.0_
_Last updated: 2026-01-16_
