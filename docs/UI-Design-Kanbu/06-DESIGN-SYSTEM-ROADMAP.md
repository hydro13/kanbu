# Kanbu Design System - Implementation Roadmap

**Version:** 2.4.0
**Last Updated:** 2026-01-16
**Status:** ✅ Design System v2.0.0 Complete | Phase 8 Complete | Phase 9 Documentation Complete

---

## Overview of Completed Phases

| Phase     | Status      | Date       | Description                                                       |
| --------- | ----------- | ---------- | ----------------------------------------------------------------- |
| Phase 1   | ✅ Complete | 2026-01-15 | Foundation - Primitive, semantic, component tokens                |
| Phase 2   | ✅ Complete | 2026-01-15 | Hardcoded Color Migration (100%)                                  |
| Phase 3.1 | ✅ Complete | 2026-01-15 | Theme Infrastructure (ThemeContext)                               |
| Phase 3.2 | ✅ Complete | 2026-01-15 | Accent Color System (6 colors)                                    |
| Phase 4   | ✅ Complete | 2026-01-15 | Backend Persistence (database sync)                               |
| Phase 6   | ✅ Complete | 2026-01-15 | Design Tokens v2.0.0 (complete system)                            |
| Phase 7   | ✅ Complete | 2026-01-16 | Component Library Audit (all UI components on tokens)             |
| Phase 8   | ✅ Complete | 2026-01-16 | Advanced Theming (custom colors, density, sidebar, export)        |
| Phase 9   | ✅ Complete | 2026-01-16 | Documentation (Token Reference, Component Usage, Migration Guide) |

---

## Context for New Claude Code Sessions

### Relevant Files

```bash
# Design System Core
apps/web/src/styles/globals.css          # Design tokens v2.0.0
apps/web/src/styles/accents.css          # Accent color definitions
apps/web/tailwind.config.js              # Tailwind v2.0.0 config

# Theme System
apps/web/src/contexts/ThemeContext.tsx   # Theme state management
apps/web/src/components/theme/           # Theme UI components
apps/web/src/lib/themes/accents.ts       # Accent definitions

# TypeScript Tokens
apps/web/src/lib/design-tokens.ts        # TS token constants

# Documentation (Phase 9)
docs/UI-Design-Kanbu/TOKEN-REFERENCE.md  # All design tokens
docs/UI-Design-Kanbu/COMPONENT-USAGE.md  # Component examples
docs/UI-Design-Kanbu/MIGRATION-GUIDE.md  # Migration guide
```

### Quick Status Check

```bash
# Check git status
cd ~/genx/v6/dev/kanbu
git log --oneline -5

# Verify tokens are working
cd apps/web && pnpm dev
# Open browser console:
# getComputedStyle(document.documentElement).getPropertyValue('--color-blue-500')
```

---

## PHASE 1: Foundation ✅ COMPLETE

**Goal:** Define all CSS tokens without breaking existing code.

**Date:** 2026-01-15 | **Status:** ✅ Complete

### Completed Tasks

- [x] Phase 1.1: Primitive Color Tokens (Gray, Blue, Orange, Red, Green, Amber)
- [x] Phase 1.2: Typography Tokens (font sizes, weights, line heights)
- [x] Phase 1.3: Spacing Tokens (spacing scale, radius, shadows)
- [x] Phase 1.4: Semantic Tokens (surfaces, text, borders, interactive)
- [x] Phase 1.5: Component Tokens (card, button, input, page, sidebar)
- [x] Phase 1.6: Tailwind Config Update
- [x] Phase 1.7: TypeScript Tokens Update

### Key Commits

```
feat(design-system): Add primitive color tokens
feat(design-system): Add typography tokens
feat(design-system): Add spacing, radius, and shadow tokens
feat(design-system): Add semantic tokens
feat(design-system): Add component tokens
```

---

## PHASE 2: Hardcoded Color Migration ✅ COMPLETE

**Goal:** Replace all hardcoded Tailwind colors with design tokens.

**Date:** 2026-01-15 | **Status:** ✅ Complete (100%)

### Completed Tasks

- [x] Phase 2.1: Page Headers Migration
- [x] Phase 2.2: Card Components Migration
- [x] Phase 2.3: Form Elements Migration
- [x] Phase 2.4: Button Styles Migration
- [x] Phase 2.5: Sidebar Components Migration
- [x] Phase 2.6: Table Styles Migration
- [x] Phase 2.7: Modal/Dialog Migration

### Statistics

| Metric                | Before | After |
| --------------------- | ------ | ----- |
| Hardcoded bg-colors   | 1,443  | 0     |
| Hardcoded text-colors | 2,405  | 0     |
| Design system usage   | 804    | 100%  |

### Key Commit

```
c3e7a709 refactor(design-system): Remove ALL hardcoded colors (Phase 2 - 100%)
```

---

## PHASE 3: Theme Infrastructure ✅ COMPLETE

**Goal:** Themeable system with light/dark/system mode and accent colors.

**Date:** 2026-01-15 | **Status:** ✅ Complete

### Phase 3.1: Theme System

- [x] ThemeContext.tsx implementation
- [x] useTheme() hook
- [x] Light/dark/system mode switching
- [x] System preference detection
- [x] Flash prevention (inline script)
- [x] localStorage caching

### Phase 3.2: Accent Colors

- [x] 6 accent colors defined (slate, blue, teal, violet, rose, amber)
- [x] accents.css with light + dark variants
- [x] AccentPicker component
- [x] data-accent attribute system

### Key Commits

```
be525603 feat(design-system): Add theme infrastructure and accent colors (Phase 3)
```

---

## PHASE 4: Backend Persistence ✅ COMPLETE

**Goal:** Save theme and accent preferences in database.

**Date:** 2026-01-15 | **Status:** ✅ Complete

### Completed Tasks

- [x] User.theme and User.accent database fields
- [x] tRPC user.updateProfile endpoint extended
- [x] tRPC user.getProfile returns theme/accent
- [x] ThemeProviderWithAuth component
- [x] Optimistic updates (localStorage first, backend async)
- [x] Profile query caching (5 min staleTime)

### Persistence Flow

```
User clicks theme/accent
    ↓
1. Update localStorage (immediate)
2. Apply to DOM (immediate)
3. Backend sync (async, fire-and-forget)
    ↓
Next login: backend value restored
```

### Key Commit

```
2d801549 feat(design-system): Add backend persistence for accent colors (Phase 4)
```

---

## PHASE 6: Design Tokens v2.0.0 ✅ COMPLETE

**Goal:** Complete design token system with all categories.

**Date:** 2026-01-15 | **Status:** ✅ Complete

### Added Token Categories

| Category     | Count                   | Description                                    |
| ------------ | ----------------------- | ---------------------------------------------- |
| Animation    | 8 durations + 6 easings | instant→slowest, linear→spring                 |
| Z-Index      | 11 levels               | base(0) → max(9999)                            |
| Focus Ring   | 4 tokens                | width, offset, color, style                    |
| Color Scales | 4 new                   | Teal, Violet, Rose, Cyan (50-950)              |
| State Colors | 12                      | success/warning/error/info (+foreground/muted) |
| Component    | 40+                     | Badge, Avatar, Tooltip, Toast, Tabs, etc.      |

### Animation Tokens

```css
--duration-instant: 0ms;
--duration-fastest: 50ms;
--duration-faster: 100ms;
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 400ms;
--duration-slowest: 500ms;

--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Z-Index Scale

```css
--z-base: 0;
--z-docked: 10;
--z-dropdown: 1000;
--z-sticky: 1100;
--z-banner: 1200;
--z-overlay: 1300;
--z-modal: 1400;
--z-popover: 1500;
--z-toast: 1600;
--z-tooltip: 1700;
--z-max: 9999;
```

### Component Tokens (Examples)

```css
/* Badge */
--badge-default-bg, --badge-success-bg, --badge-warning-bg, --badge-error-bg

/* Toast */
--toast-bg, --toast-border, --toast-success-bg, --toast-error-bg

/* Skeleton */
--skeleton-base, --skeleton-highlight
```

### Accessibility Features

```css
/* Focus indicators */
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
--focus-ring-color: var(--color-blue-500);

/* High contrast mode */
[data-contrast='high'] {
  /* enhanced borders, text */
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  /* disable animations */
}
```

### Key Commit

```
ce26b0c0 feat(design-system): Complete design token system (Phase 6)
```

---

## Future Phases (Planned)

---

## PHASE 7: Component Library Audit ✅ COMPLETE

**Goal:** Review all shadcn/ui components and apply design tokens for consistent styling.

**Date:** 2026-01-16 | **Status:** ✅ Complete

### Audit Result (2026-01-16)

All UI components use design tokens correctly:

| Component    | Status | Tokens                                                                 |
| ------------ | ------ | ---------------------------------------------------------------------- |
| Button       | ✅     | `bg-primary`, `bg-destructive`, `bg-success`, `bg-warning`, focus ring |
| Badge        | ✅     | Status variants (success/warning/error/info), priority variants        |
| Card         | ✅     | `bg-card`, `text-card-foreground`, `border`, `shadow-sm`               |
| Dialog       | ✅     | `bg-background`, `ring-offset-background`, blur overlay                |
| Input        | ✅     | `border-input`, `bg-background`, focus ring tokens                     |
| Dropdown     | ✅     | `bg-popover`, `text-popover-foreground`, `bg-accent`                   |
| Tooltip      | ✅     | `bg-popover`, `text-popover-foreground`                                |
| Toast/Sonner | ✅     | `bg-background`, status colors (success/warning/error)                 |

### Pre-flight Checks (Reference)

```bash
# Inventory current shadcn/ui components
ls apps/web/src/components/ui/

# Check which tokens are defined
grep -c "^--" apps/web/src/styles/globals.css

# Find hardcoded colors in ui/ directory
grep -r "bg-\(gray\|blue\|red\|green\)" apps/web/src/components/ui/ | wc -l
```

### Phase 7.1: Button Component Audit

**Goal:** Align Button variants with design tokens.

**Tasks:**

- [x] Audit existing Button variants (default, destructive, outline, secondary, ghost, link)
- [x] Replace hardcoded colors with semantic tokens
- [x] Add missing variants (success, warning)
- [x] Implement consistent focus ring behavior
- [x] Test all variants in light/dark mode

**Analyze current state:**

```bash
# Check Button component
cat apps/web/src/components/ui/button.tsx
```

**Desired implementation:**

```tsx
// button.tsx - Token-based variants
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-error text-error-foreground hover:bg-error/90',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
  }
);
```

**Acceptance criteria:**

- [x] No hardcoded colors in Button component
- [x] All variants work in light/dark mode
- [x] Focus ring consistent with design system
- [x] Visual regression test passed

---

### Phase 7.2: Card Component Audit

**Goal:** Make Card component consistent with surface tokens.

**Tasks:**

- [x] Card uses `bg-card` token (equivalent to surface)
- [x] Card padding consistent
- [x] Card border and shadow via tokens
- [x] Consistent border radius via tokens

**Analyze current state:**

```bash
cat apps/web/src/components/ui/card.tsx
```

**Desired implementation:**

```tsx
// card.tsx - Token-based styling
const Card = React.forwardRef<
  HTMLDivElement,
  CardProps & { variant?: 'default' | 'compact' | 'spacious' }
>(({ className, variant = 'default', ...props }, ref) => {
  const paddingClasses = {
    compact: 'p-4',
    default: 'p-6',
    spacious: 'p-8',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface-1 text-foreground shadow-sm',
        'transition-shadow duration-fast hover:shadow-md',
        paddingClasses[variant],
        className
      )}
      {...props}
    />
  );
});
```

**Acceptance criteria:**

- [x] Card uses `bg-card` token
- [x] Padding consistent via classes
- [x] Shadow via `shadow-sm` token
- [x] Consistent in light/dark mode

---

### Phase 7.3: Dialog/Modal Component Audit

**Goal:** Dialog overlay and content consistent with design tokens.

**Tasks:**

- [x] Overlay color via `--modal-overlay`
- [x] Content background via `--modal-bg`
- [x] Border via `--modal-border`
- [x] Z-index via `--z-modal`
- [x] Focus trap and keyboard navigation verification

**Desired implementation:**

```tsx
// dialog.tsx - Token-based overlay
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-modal bg-modal-overlay",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))

const DialogContent = React.forwardRef<...>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-modal -translate-x-1/2 -translate-y-1/2",
        "w-full max-w-lg bg-modal-bg border border-modal-border rounded-lg shadow-lg",
        "duration-normal data-[state=open]:animate-in data-[state=closed]:animate-out",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

**Acceptance criteria:**

- [x] Overlay uses `--modal-overlay` token
- [x] Content background and border via tokens
- [x] Z-index consistent with z-index scale
- [x] Animations via duration tokens

---

### Phase 7.4: Input/Form Elements Audit

**Goal:** Make all form elements consistent.

**Tasks:**

- [x] Input border colors via tokens
- [x] Focus ring via `--focus-ring-*` tokens
- [x] Error state via `--error` tokens
- [x] Disabled state styling
- [x] Placeholder color via `--text-muted`

**Components:**

| Component | File           | Status |
| --------- | -------------- | ------ |
| Input     | `input.tsx`    | [x]    |
| Textarea  | `textarea.tsx` | [x]    |
| Select    | `select.tsx`   | [x]    |
| Checkbox  | `checkbox.tsx` | [x]    |
| Switch    | `switch.tsx`   | [x]    |
| Slider    | `slider.tsx`   | [x]    |

**Desired implementation:**

```tsx
// input.tsx - Token-based styling
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-fast',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**Acceptance criteria:**

- [x] All form elements use design tokens
- [x] Focus states consistent
- [x] Error states work with `--error` token
- [x] Disabled states correctly styled

---

### Phase 7.5: Badge Component Audit

**Goal:** Badge colors via semantic tokens.

**Tasks:**

- [x] Use `--badge-*` tokens from globals.css
- [x] Add status variants (success, warning, error, info)
- [x] Priority variants (low, medium, high, urgent)

**Desired implementation:**

```tsx
// badge.tsx - Complete variant set
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-error text-error-foreground',
        outline: 'text-foreground border-border',
        // Status variants
        success: 'border-transparent bg-success/10 text-success',
        warning: 'border-transparent bg-warning/10 text-warning',
        error: 'border-transparent bg-error/10 text-error',
        info: 'border-transparent bg-info/10 text-info',
        // Priority variants
        'priority-low': 'border-transparent bg-priority-low-light text-priority-low',
        'priority-medium': 'border-transparent bg-priority-medium-light text-priority-medium',
        'priority-high': 'border-transparent bg-priority-high-light text-priority-high',
        'priority-urgent': 'border-transparent bg-priority-urgent-light text-priority-urgent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
```

**Acceptance criteria:**

- [x] All badge variants available
- [x] Priority badges consistent with rest of app
- [x] Status badges for feedback messages

---

### Phase 7.6: Toast/Sonner Component Audit

**Goal:** Toast notifications consistent with design system.

**Tasks:**

- [x] Toast background via `--toast-bg`
- [x] Status colors (success, error, warning, info)
- [x] Z-index via `--z-toast`
- [x] Animations via duration tokens

**Desired implementation:**

```tsx
// sonner.tsx or toast.tsx - Token-based
<Toaster
  toastOptions={{
    classNames: {
      toast: 'bg-toast-bg border-toast-border text-foreground shadow-lg',
      success: 'bg-toast-success-bg border-success/20 text-success-foreground',
      error: 'bg-toast-error-bg border-error/20 text-error-foreground',
      warning: 'bg-toast-warning-bg border-warning/20 text-warning-foreground',
      info: 'bg-toast-info-bg border-info/20 text-info-foreground',
    },
  }}
/>
```

**Acceptance criteria:**

- [x] Toast uses design tokens
- [x] All status variants work
- [x] Correct z-index level

---

### Phase 7.7: Dropdown Menu Audit

**Goal:** Dropdown consistent with popover tokens.

**Tasks:**

- [x] Background via `--dropdown-bg`
- [x] Border via `--dropdown-border`
- [x] Item hover via `--dropdown-item-hover`
- [x] Z-index via `--z-dropdown`

**Acceptance criteria:**

- [x] Dropdown styling via tokens
- [x] Hover states consistent
- [x] Separator via `--dropdown-separator`

---

### Phase 7.8: Tooltip Component Audit

**Goal:** Tooltip consistent with design system.

**Tasks:**

- [x] Background via `--tooltip-bg`
- [x] Text via `--tooltip-text`
- [x] Z-index via `--z-tooltip`

**Acceptance criteria:**

- [x] Tooltip uses tokens
- [x] Correct z-index (above modals)
- [x] Arrow color consistent

---

### Phase 7 Commit Template

```
refactor(ui): Migrate component library to design tokens (Phase 7)

- Button: Add success/warning variants, token-based colors
- Card: Surface tokens, padding variants
- Dialog: Modal overlay/bg tokens, z-index scale
- Input: Focus ring tokens, error states
- Badge: Status and priority variants
- Toast: Status color tokens
- Dropdown: Popover tokens
- Tooltip: Tooltip tokens

Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
```

---

## PHASE 8: Advanced Theming ✅ COMPLETE

**Goal:** Extended theme customization options for end users.

**Date:** 2026-01-16 | **Status:** ✅ Complete

### Pre-flight Checks

```bash
# View current ThemeContext implementation
cat apps/web/src/contexts/ThemeContext.tsx

# Check available accent colors
cat apps/web/src/lib/themes/accents.ts

# View User model fields
grep -A5 "theme" apps/api/prisma/schema.prisma
```

### Phase 8.1: Custom Accent Color Picker ✅

**Goal:** Users can choose their own accent color outside the 6 presets.

**Tasks:**

- [x] Build color picker component (HSL input)
- [x] Live preview of custom accent
- [x] Color contrast validation (WCAG)
- [x] Save custom color in database
- [x] CSS variable injection for custom color

**Database change:**

```prisma
// schema.prisma
model User {
  // Existing fields
  theme       String?   @default("system")
  accent      String?   @default("blue")

  // New fields
  customAccentHue        Int?      // 0-360
  customAccentSaturation Int?      // 0-100
  customAccentLightness  Int?      // 0-100
}
```

**Component implementation:**

```tsx
// components/theme/CustomColorPicker.tsx
interface CustomColorPickerProps {
  currentHue: number;
  currentSaturation: number;
  currentLightness: number;
  onChange: (hsl: { h: number; s: number; l: number }) => void;
}

export function CustomColorPicker({
  currentHue,
  currentSaturation,
  currentLightness,
  onChange,
}: CustomColorPickerProps) {
  const [hue, setHue] = useState(currentHue);
  const [saturation, setSaturation] = useState(currentSaturation);
  const [lightness, setLightness] = useState(currentLightness);

  // Preview color
  const previewColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // Contrast check
  const contrastRatio = calculateContrastRatio(previewColor, '#ffffff');
  const meetsWCAG = contrastRatio >= 4.5;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg border" style={{ backgroundColor: previewColor }} />
        <div className="flex-1">
          <Label>Hue (0-360)</Label>
          <Slider value={[hue]} onValueChange={([v]) => setHue(v)} max={360} />
        </div>
      </div>

      <div>
        <Label>Saturation (0-100%)</Label>
        <Slider value={[saturation]} onValueChange={([v]) => setSaturation(v)} max={100} />
      </div>

      <div>
        <Label>Lightness (0-100%)</Label>
        <Slider value={[lightness]} onValueChange={([v]) => setLightness(v)} max={100} />
      </div>

      {!meetsWCAG && (
        <Alert variant="warning">Color has insufficient contrast. Adjust the lightness.</Alert>
      )}

      <Button onClick={() => onChange({ h: hue, s: saturation, l: lightness })}>Apply</Button>
    </div>
  );
}
```

**CSS Injection:**

```tsx
// ThemeContext.tsx extension
useEffect(() => {
  if (customAccent) {
    const { h, s, l } = customAccent;
    document.documentElement.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    document.documentElement.style.setProperty(
      '--accent-foreground',
      l > 50 ? '222 47% 11%' : '0 0% 100%'
    );
  }
}, [customAccent]);
```

**Acceptance criteria:**

- [x] Custom color picker works with HSL
- [x] Live preview available
- [x] Contrast validation (WCAG AA)
- [x] Stored in database
- [x] Sync between devices

---

### Phase 8.2: Density Settings ✅

**Goal:** Users can choose UI density (compact/normal/spacious).

**Tasks:**

- [x] Define density tokens
- [x] Implement DensityContext
- [x] Adjust sidebar padding
- [x] Adjust card padding
- [x] Adjust table row height
- [x] Add database field

**Density tokens:**

```css
/* globals.css - Density tokens */
:root {
  /* Default (normal) */
  --density-spacing-xs: 0.25rem;
  --density-spacing-sm: 0.5rem;
  --density-spacing-md: 1rem;
  --density-spacing-lg: 1.5rem;
  --density-spacing-xl: 2rem;

  --density-row-height: 2.5rem;
  --density-card-padding: 1.5rem;
  --density-sidebar-padding: 1rem;
}

[data-density='compact'] {
  --density-spacing-xs: 0.125rem;
  --density-spacing-sm: 0.25rem;
  --density-spacing-md: 0.5rem;
  --density-spacing-lg: 1rem;
  --density-spacing-xl: 1.5rem;

  --density-row-height: 2rem;
  --density-card-padding: 1rem;
  --density-sidebar-padding: 0.75rem;
}

[data-density='spacious'] {
  --density-spacing-xs: 0.5rem;
  --density-spacing-sm: 0.75rem;
  --density-spacing-md: 1.5rem;
  --density-spacing-lg: 2rem;
  --density-spacing-xl: 3rem;

  --density-row-height: 3rem;
  --density-card-padding: 2rem;
  --density-sidebar-padding: 1.5rem;
}
```

**Database change:**

```prisma
model User {
  // ...
  density     String?   @default("normal") // compact | normal | spacious
}
```

**Context implementation:**

```tsx
// contexts/DensityContext.tsx
type Density = 'compact' | 'normal' | 'spacious';

interface DensityContextType {
  density: Density;
  setDensity: (density: Density) => void;
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>('normal');

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  const setDensity = (newDensity: Density) => {
    setDensityState(newDensity);
    localStorage.setItem('kanbu-density', newDensity);
    // Backend sync
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>{children}</DensityContext.Provider>
  );
}
```

**Selector component:**

```tsx
// components/theme/DensityPicker.tsx
export function DensityPicker() {
  const { density, setDensity } = useDensity();

  return (
    <div className="space-y-2">
      <Label>Interface Density</Label>
      <div className="flex gap-2">
        {(['compact', 'normal', 'spacious'] as const).map((d) => (
          <Button
            key={d}
            variant={density === d ? 'default' : 'outline'}
            onClick={() => setDensity(d)}
            className="flex-1"
          >
            {d === 'compact' && <Minimize2 className="mr-2 h-4 w-4" />}
            {d === 'normal' && <Square className="mr-2 h-4 w-4" />}
            {d === 'spacious' && <Maximize2 className="mr-2 h-4 w-4" />}
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

**Acceptance criteria:**

- [x] 3 density levels available
- [x] Consistently applied to all components
- [x] Stored in database
- [x] No layout breaking when switching

---

### Phase 8.3: Sidebar Position Setting ✅

**Goal:** Sidebar can be placed left or right.

**Tasks:**

- [x] SidebarPosition context
- [x] Adjust layout component
- [x] CSS for right sidebar
- [x] Add database field
- [x] Animation when switching

**Database change:**

```prisma
model User {
  // ...
  sidebarPosition String? @default("left") // left | right
}
```

**Layout adjustment:**

```tsx
// components/layout/DashboardLayout.tsx
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { sidebarPosition } = useSidebarPosition();

  return (
    <div className={cn('flex min-h-screen', sidebarPosition === 'right' && 'flex-row-reverse')}>
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Acceptance criteria:**

- [x] Sidebar can be left/right
- [x] Smooth transition when switching
- [x] Keyboard shortcuts respect position
- [x] Stored in database

---

### Phase 8.4: Theme Import/Export ✅

**Goal:** Users can export and share theme settings.

**Tasks:**

- [x] Export function (JSON format)
- [x] Import function with validation
- [x] Share URL generation
- [x] Community presets page (optional)

**Export format:**

```typescript
interface ThemeExport {
  version: '1.0';
  theme: 'light' | 'dark' | 'system';
  accent: string;
  customAccent?: { h: number; s: number; l: number };
  density: 'compact' | 'normal' | 'spacious';
  sidebarPosition: 'left' | 'right';
}
```

**Export/Import functions:**

```tsx
// lib/theme-export.ts
export function exportTheme(): string {
  const settings: ThemeExport = {
    version: '1.0',
    theme: (localStorage.getItem('kanbu-theme') as any) || 'system',
    accent: localStorage.getItem('kanbu-accent') || 'blue',
    density: (localStorage.getItem('kanbu-density') as any) || 'normal',
    sidebarPosition: (localStorage.getItem('kanbu-sidebar-position') as any) || 'left',
  };

  return btoa(JSON.stringify(settings));
}

export function importTheme(encoded: string): ThemeExport | null {
  try {
    const decoded = JSON.parse(atob(encoded));
    if (decoded.version !== '1.0') return null;
    return decoded as ThemeExport;
  } catch {
    return null;
  }
}
```

**UI Component:**

```tsx
// components/theme/ThemeExportImport.tsx
export function ThemeExportImport() {
  const [importCode, setImportCode] = useState('');

  const handleExport = () => {
    const code = exportTheme();
    navigator.clipboard.writeText(code);
    toast.success('Theme copied to clipboard');
  };

  const handleImport = () => {
    const settings = importTheme(importCode);
    if (!settings) {
      toast.error('Invalid theme code');
      return;
    }
    applyThemeSettings(settings);
    toast.success('Theme applied');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Export</Label>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Copy Theme Code
        </Button>
      </div>

      <div>
        <Label>Import</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Paste theme code..."
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
          />
          <Button onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance criteria:**

- [x] Export generates shareable code
- [x] Import validates and applies
- [x] Error handling for invalid codes
- [x] Versioning for backwards compatibility

---

### Phase 8 Commit Template

```
feat(theme): Add advanced theming options (Phase 8)

- Custom accent color picker with HSL controls
- WCAG contrast validation for accessibility
- Density settings (compact/normal/spacious)
- Sidebar position toggle (left/right)
- Theme import/export functionality

Database: Added customAccentHue, customAccentSaturation,
customAccentLightness, density, sidebarPosition fields

Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
```

---

## PHASE 9: Documentation & Storybook ✅ COMPLETE

**Goal:** Comprehensive developer documentation and component showcase.

**Date:** 2026-01-16 | **Status:** ✅ Complete

### Completed Tasks

- [x] Phase 9.1: Token Reference Guide - Complete reference of all design tokens
- [x] Phase 9.2: Component Usage Examples - Practical examples with Do's and Don'ts
- [x] Phase 9.3: Migration Guide - Guide for migration to design tokens
- [x] Phase 9.4: Storybook Integration - Stories for Button, Badge, Card, Input
- [ ] Phase 9.5: Token Documentation Generator (optional, not implemented)

### Documentation Files

| Document        | Location                                   | Description                                        |
| --------------- | ------------------------------------------ | -------------------------------------------------- |
| Token Reference | [TOKEN-REFERENCE.md](./TOKEN-REFERENCE.md) | All design tokens with values and Tailwind mapping |
| Component Usage | [COMPONENT-USAGE.md](./COMPONENT-USAGE.md) | Do's and Don'ts, accessibility guidelines          |
| Migration Guide | [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) | Migration from hardcoded colors to tokens          |

### Storybook

**Location:** `apps/web/.storybook/`

**Scripts:**

```bash
pnpm storybook      # Start dev server on port 6006
pnpm build-storybook # Build static storybook
```

**Stories:**

- `src/components/ui/button.stories.tsx` - All Button variants
- `src/components/ui/badge.stories.tsx` - Status and priority badges
- `src/components/ui/card.stories.tsx` - Card layouts and patterns
- `src/components/ui/input.stories.tsx` - Form inputs and states

**Estimated complexity:** Medium | **Estimated duration:** 3-4 days

### Pre-flight Checks

```bash
# Check if Storybook is already configured
ls apps/web/.storybook/ 2>/dev/null || echo "Storybook not installed"

# Check package.json for storybook dependencies
grep -i storybook apps/web/package.json

# View current docs structure
ls -la docs/UI-Design-Kanbu/
```

### Phase 9.1: Token Reference Guide ✅

**Goal:** Complete reference of all design tokens with examples.

**Tasks:**

- [x] Generate token overview from globals.css
- [x] Categorize tokens (colors, typography, spacing, etc.)
- [x] Add examples per token
- [x] Light/dark mode comparison
- [x] Tailwind class mapping

**Document structure:**

````markdown
# Design Token Reference Guide

## Quick Reference

| Category        | Count | Example             |
| --------------- | ----- | ------------------- |
| Color Scales    | 10    | `--color-blue-500`  |
| Semantic Colors | 40+   | `--surface-1`       |
| Typography      | 15    | `--text-sm`         |
| Spacing         | 12    | `--spacing-4`       |
| Shadows         | 6     | `--shadow-md`       |
| Animation       | 14    | `--duration-normal` |
| Z-Index         | 11    | `--z-modal`         |

## Color Tokens

### Primitive Colors

#### Gray Scale

| Token              | Light Value | Usage             |
| ------------------ | ----------- | ----------------- |
| `--color-gray-50`  | #f9fafb     | Background subtle |
| `--color-gray-100` | #f3f4f6     | Background muted  |
| ...                | ...         | ...               |

### Semantic Colors

#### Surfaces

| Token          | Light    | Dark     | Tailwind        |
| -------------- | -------- | -------- | --------------- |
| `--background` | white    | gray-950 | `bg-background` |
| `--surface-1`  | white    | gray-900 | `bg-surface-1`  |
| `--surface-2`  | gray-50  | gray-800 | `bg-surface-2`  |
| `--surface-3`  | gray-100 | gray-700 | `bg-surface-3`  |

## Usage Examples

### Background Colors

```tsx
// ✅ Correct
<div className="bg-surface-1">
<div className="bg-background">

// ❌ Avoid
<div className="bg-white dark:bg-gray-900">
<div className="bg-gray-50">
```
````

### Text Colors

```tsx
// ✅ Correct
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>

// ❌ Avoid
<p className="text-gray-900 dark:text-gray-100">
```

````

**Acceptance criteria:**
- [x] All tokens documented
- [x] Examples for each category
- [x] Tailwind class mapping
- [x] Searchable format

---

### Phase 9.2: Component Usage Examples ✅

**Goal:** Practical examples of component usage.

**Tasks:**
- [x] Example pages per component category
- [x] Do's and Don'ts
- [x] Accessibility guidelines
- [x] Responsive patterns

**Document structure:**

```markdown
# Component Usage Guide

## Buttons

### Basic Usage
```tsx
import { Button } from '@/components/ui/button'

// Primary action
<Button>Save Changes</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Status buttons
<Button variant="success">Approve</Button>
<Button variant="warning">Review Required</Button>
````

### Button Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Plus /></Button>
```

### Do's and Don'ts

✅ **Do:**

- Use `variant="destructive"` for delete actions
- Use `variant="success"` for confirmations
- Provide clear action labels

❌ **Don't:**

- Use custom colors: `className="bg-red-500"`
- Mix icon-only with text buttons in same group
- Use destructive style for non-destructive actions

### Accessibility

- Buttons must have accessible names
- Icon-only buttons need `aria-label`
- Disabled buttons should explain why

```tsx
// ✅ Accessible icon button
<Button size="icon" aria-label="Add new item">
  <Plus className="h-4 w-4" />
</Button>
```

````

**Acceptance criteria:**
- [x] Examples for all components
- [x] Do's and Don'ts per component
- [x] Accessibility guidelines
- [x] Copy-paste ready code

---

### Phase 9.3: Migration Guide ✅

**Goal:** Guide for migrating old code to design tokens.

**Tasks:**
- [x] Mapping from old to new classes
- [x] Regex patterns for bulk migration
- [x] Common pitfalls and solutions
- [x] Checklist for code review

**Document structure:**

```markdown
# Migration Guide: Hardcoded Colors to Design Tokens

## Quick Migration Table

| Old Pattern | New Pattern |
|-------------|-------------|
| `bg-white dark:bg-gray-900` | `bg-background` |
| `bg-gray-50 dark:bg-gray-800` | `bg-surface-2` |
| `bg-gray-100 dark:bg-gray-700` | `bg-surface-3` |
| `text-gray-900 dark:text-gray-100` | `text-foreground` |
| `text-gray-500 dark:text-gray-400` | `text-muted-foreground` |
| `border-gray-200 dark:border-gray-700` | `border-border` |

## Regex Search Patterns

### Find hardcoded backgrounds
```regex
bg-(white|black|gray|blue|red|green|orange|yellow)-\d{2,3}
````

### Find hardcoded text colors

```regex
text-(gray|blue|red|green|orange|yellow)-\d{2,3}
```

### Find dark mode overrides

```regex
dark:(bg|text|border)-\w+-\d{2,3}
```

## Common Migrations

### Card backgrounds

```tsx
// Before
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">

// After
<div className="bg-surface-1 border border-border">
```

### Status colors

```tsx
// Before
<span className="text-green-500">Success</span>
<span className="text-red-500">Error</span>

// After
<span className="text-success">Success</span>
<span className="text-error">Error</span>
```

## Checklist for Code Review

- [ ] No hardcoded colors (bg-gray-_, text-blue-_, etc.)
- [ ] No `dark:` prefixes for colors
- [ ] Semantic tokens used where possible
- [ ] Priority colors via `--priority-*` tokens
- [ ] State colors via `--success/warning/error/info`

````

**Acceptance criteria:**
- [x] Complete mapping table
- [x] Working regex patterns
- [x] Practical examples
- [x] Code review checklist

---

### Phase 9.4: Storybook Integration ✅

**Goal:** Interactive component documentation with Storybook.

**Tasks:**
- [x] Install and configure Storybook
- [x] Write stories for all ui/ components
- [x] Theme switcher addon
- [x] A11y addon for accessibility testing
- [ ] Chromatic for visual regression (optional, not implemented)

**Installation:**

```bash
cd apps/web

# Install Storybook
pnpm dlx storybook@latest init

# Install addons
pnpm add -D @storybook/addon-a11y @storybook/addon-themes
````

**Configuration:**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/styles/globals.css';
import '../src/styles/accents.css';

const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'class',
    }),
  ],
};

export default preview;
```

**Example story:**

```tsx
// src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
        'success',
        'warning',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
};

export const Success: Story = {
  args: {
    children: 'Approve',
    variant: 'success',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
    </div>
  ),
};
```

**Package.json scripts:**

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

**Component Index (20 total):**

| Component       | Stories | Priority | Status   |
| --------------- | ------- | -------- | -------- |
| badge           | ✅      | High     | Complete |
| button          | ✅      | High     | Complete |
| card            | ✅      | High     | Complete |
| checkbox        | ✅      | High     | Complete |
| collapsible     | ✅      | Low      | Complete |
| dialog          | ✅      | High     | Complete |
| dropdown-menu   | ✅      | High     | Complete |
| HoverPopover    | ✅      | Medium   | Complete |
| input           | ✅      | High     | Complete |
| label           | ✅      | Medium   | Complete |
| progress        | ✅      | Medium   | Complete |
| scroll-area     | ✅      | Low      | Complete |
| select          | ✅      | High     | Complete |
| separator       | ✅      | Low      | Complete |
| slider          | ✅      | Medium   | Complete |
| sonner          | ✅      | Medium   | Complete |
| switch          | ✅      | High     | Complete |
| tabs            | ✅      | High     | Complete |
| tooltip         | ✅      | High     | Complete |
| UndoRedoButtons | ✅      | Low      | Complete |

**Priority for stories:**

1. **High (9):** checkbox, dialog, dropdown-menu, select, switch, tabs, tooltip (+ badge, button, card, input ✅)
2. **Medium (4):** HoverPopover, label, progress, slider, sonner
3. **Low (3):** collapsible, scroll-area, separator, UndoRedoButtons

**Acceptance criteria:**

- [x] Storybook runs locally
- [x] Stories for all ui/ components (20/20 complete)
- [x] Theme switching works
- [x] A11y tests available
- [x] Autodocs generation works

---

### Phase 9.5: Token Documentation Generator (Optional)

**Goal:** Automatically generate token documentation from CSS.

**Tasks:**

- [ ] Write script that parses globals.css
- [ ] JSON/TypeScript output for tokens
- [ ] Markdown generator for docs
- [ ] CI integration for automatic updates

**Generator script:**

```typescript
// scripts/generate-token-docs.ts
import fs from 'fs';
import path from 'path';

interface Token {
  name: string;
  value: string;
  category: string;
  lightValue?: string;
  darkValue?: string;
}

function parseGlobalsCss(): Token[] {
  const content = fs.readFileSync(path.join(__dirname, '../src/styles/globals.css'), 'utf-8');

  const tokens: Token[] = [];
  const rootMatch = content.match(/:root\s*{([^}]+)}/);
  const darkMatch = content.match(/\.dark\s*{([^}]+)}/);

  if (rootMatch) {
    const lines = rootMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/--([^:]+):\s*([^;]+);/);
      if (match) {
        tokens.push({
          name: `--${match[1].trim()}`,
          value: match[2].trim(),
          category: categorizeToken(match[1].trim()),
        });
      }
    }
  }

  return tokens;
}

function categorizeToken(name: string): string {
  if (name.startsWith('color-')) return 'colors';
  if (name.startsWith('text-')) return 'typography';
  if (name.startsWith('spacing-')) return 'spacing';
  if (name.startsWith('shadow-')) return 'shadows';
  if (name.startsWith('duration-') || name.startsWith('ease-')) return 'animation';
  if (name.startsWith('z-')) return 'z-index';
  return 'other';
}

function generateMarkdown(tokens: Token[]): string {
  // Generate markdown documentation
  // ...
}

// Run generator
const tokens = parseGlobalsCss();
const markdown = generateMarkdown(tokens);
fs.writeFileSync('docs/UI-Design-Kanbu/TOKEN-REFERENCE.md', markdown);
```

**Acceptance criteria:**

- [ ] Script parses globals.css correctly
- [ ] Output is accurate and complete
- [ ] Can run in CI
- [ ] Documents light/dark differences

---

### Phase 9 Commit Template

```
docs(design-system): Add comprehensive documentation (Phase 9)

- Token reference guide with all CSS variables
- Component usage examples with do's and don'ts
- Migration guide for hardcoded colors
- Storybook integration with theme switching
- A11y testing addon configured

Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
```

---

## Overview of Completed Implementation Phases

| Phase   | Status      | Complexity | Description               |
| ------- | ----------- | ---------- | ------------------------- |
| Phase 7 | ✅ Complete | High       | Component Library Audit   |
| Phase 8 | ✅ Complete | High       | Advanced Theming          |
| Phase 9 | ✅ Complete | Medium     | Documentation & Storybook |

### Implementation Order (Completed)

1. **Phase 7** - Component audit for consistent foundation ✅
2. **Phase 8** - Advanced theming features ✅
3. **Phase 9** - Documentation and Storybook ✅

---

## Appendix: Key Files Reference

### globals.css Structure

```css
/* 1. PRIMITIVE TOKENS */
/*    - Color Palette (10 scales × 19 shades) */
/*    - Typography Scale */
/*    - Spacing Scale */
/*    - Border Radius */
/*    - Box Shadows */
/*    - Animation & Motion */
/*    - Z-Index Scale */
/*    - Focus Ring */

/* 2. SEMANTIC TOKENS - Light Mode */
/*    - Background & Foreground */
/*    - Surface Levels */
/*    - Card Colors */
/*    - Brand Colors */
/*    - Functional Colors */
/*    - Priority Colors */
/*    - Text Colors */
/*    - Border Colors */
/*    - Interactive States */

/* 3. DARK MODE OVERRIDES */
/*    - All semantic tokens for .dark class */

/* 4. STATE COLORS */
/*    - Success, Warning, Error, Info */
/*    - With foreground and muted variants */

/* 5. COMPONENT TOKENS */
/*    - Badge, Avatar, Tooltip, Toast */
/*    - Tabs, Dropdown, Modal, Popover */
/*    - Skeleton */

/* 6. ACCESSIBILITY */
/*    - High Contrast Mode */
/*    - Reduced Motion */
/*    - Focus Visible */
```

### Tailwind Config Structure

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // 10 color scales mapped to CSS vars
        // Semantic colors (surface, text-color, success, etc.)
      },
      zIndex: {
        /* 11 levels */
      },
      transitionDuration: {
        /* 8 durations */
      },
      transitionTimingFunction: {
        /* 6 easings */
      },
      animation: {
        /* fade, slide, scale, pulse, shimmer, bounce */
      },
      borderRadius: {
        /* component-specific */
      },
      fontSize: {
        /* page-title, section-title */
      },
      boxShadow: {
        /* custom shadows */
      },
    },
  },
};
```

---

## Appendix: Commit History

```
ce26b0c0 feat(design-system): Complete design token system (Phase 6)
2d801549 feat(design-system): Add backend persistence for accent colors (Phase 4)
be525603 feat(design-system): Add theme infrastructure and accent colors (Phase 3)
c3e7a709 refactor(design-system): Remove ALL hardcoded colors (Phase 2 - 100%)
0698ad93 refactor(design-system): Migrate table and component hover patterns (Phase 2.6)
167cf189 refactor(design-system): Migrate sidebar components (Phase 2.5)
...
```

---

_Document version: 2.4.0_
_Last updated: 2026-01-16_
