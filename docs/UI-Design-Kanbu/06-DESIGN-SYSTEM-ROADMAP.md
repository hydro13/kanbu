# Kanbu Design System - Implementatie Roadmap

**Versie:** 2.4.0
**Laatst bijgewerkt:** 2026-01-16
**Status:** ✅ Design System v2.0.0 Voltooid | Fase 8 Voltooid | Fase 9 Documentatie Voltooid

---

## Overzicht Voltooide Fases

| Fase | Status | Datum | Beschrijving |
|------|--------|-------|--------------|
| Fase 1 | ✅ Voltooid | 2026-01-15 | Foundation - Primitive, semantic, component tokens |
| Fase 2 | ✅ Voltooid | 2026-01-15 | Hardcoded Color Migration (100%) |
| Fase 3.1 | ✅ Voltooid | 2026-01-15 | Theme Infrastructure (ThemeContext) |
| Fase 3.2 | ✅ Voltooid | 2026-01-15 | Accent Color System (6 colors) |
| Fase 4 | ✅ Voltooid | 2026-01-15 | Backend Persistence (database sync) |
| Fase 6 | ✅ Voltooid | 2026-01-15 | Design Tokens v2.0.0 (complete system) |
| Fase 7 | ✅ Voltooid | 2026-01-16 | Component Library Audit (alle UI componenten op tokens) |
| Fase 8 | ✅ Voltooid | 2026-01-16 | Advanced Theming (custom colors, density, sidebar, export) |
| Fase 9 | ✅ Voltooid | 2026-01-16 | Documentation (Token Reference, Component Usage, Migration Guide) |

---

## Context voor Nieuwe Claude Code Sessies

### Relevante Bestanden

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

# Documentation (Fase 9)
docs/UI-Design-Kanbu/TOKEN-REFERENCE.md  # Alle design tokens
docs/UI-Design-Kanbu/COMPONENT-USAGE.md  # Component voorbeelden
docs/UI-Design-Kanbu/MIGRATION-GUIDE.md  # Migratie handleiding
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

## FASE 1: Foundation ✅ VOLTOOID

**Doel:** Alle CSS tokens definiëren zonder bestaande code te breken.

**Datum:** 2026-01-15 | **Status:** ✅ Voltooid

### Voltooide Taken

- [x] Fase 1.1: Primitive Color Tokens (Gray, Blue, Orange, Red, Green, Amber)
- [x] Fase 1.2: Typography Tokens (font sizes, weights, line heights)
- [x] Fase 1.3: Spacing Tokens (spacing scale, radius, shadows)
- [x] Fase 1.4: Semantic Tokens (surfaces, text, borders, interactive)
- [x] Fase 1.5: Component Tokens (card, button, input, page, sidebar)
- [x] Fase 1.6: Tailwind Config Update
- [x] Fase 1.7: TypeScript Tokens Update

### Key Commits

```
feat(design-system): Add primitive color tokens
feat(design-system): Add typography tokens
feat(design-system): Add spacing, radius, and shadow tokens
feat(design-system): Add semantic tokens
feat(design-system): Add component tokens
```

---

## FASE 2: Hardcoded Color Migration ✅ VOLTOOID

**Doel:** Alle hardcoded Tailwind kleuren vervangen door design tokens.

**Datum:** 2026-01-15 | **Status:** ✅ Voltooid (100%)

### Voltooide Taken

- [x] Fase 2.1: Page Headers Migration
- [x] Fase 2.2: Card Components Migration
- [x] Fase 2.3: Form Elements Migration
- [x] Fase 2.4: Button Styles Migration
- [x] Fase 2.5: Sidebar Components Migration
- [x] Fase 2.6: Table Styles Migration
- [x] Fase 2.7: Modal/Dialog Migration

### Statistieken

| Metric | Voor | Na |
|--------|------|-----|
| Hardcoded bg-colors | 1,443 | 0 |
| Hardcoded text-colors | 2,405 | 0 |
| Design system usage | 804 | 100% |

### Key Commit

```
c3e7a709 refactor(design-system): Remove ALL hardcoded colors (Fase 2 - 100%)
```

---

## FASE 3: Theme Infrastructure ✅ VOLTOOID

**Doel:** Themeable systeem met light/dark/system mode en accent colors.

**Datum:** 2026-01-15 | **Status:** ✅ Voltooid

### Fase 3.1: Theme System

- [x] ThemeContext.tsx implementatie
- [x] useTheme() hook
- [x] Light/dark/system mode switching
- [x] System preference detection
- [x] Flash prevention (inline script)
- [x] localStorage caching

### Fase 3.2: Accent Colors

- [x] 6 accent colors gedefinieerd (slate, blue, teal, violet, rose, amber)
- [x] accents.css met light + dark variants
- [x] AccentPicker component
- [x] data-accent attribute systeem

### Key Commits

```
be525603 feat(design-system): Add theme infrastructure and accent colors (Fase 3)
```

---

## FASE 4: Backend Persistence ✅ VOLTOOID

**Doel:** Theme en accent preferences opslaan in database.

**Datum:** 2026-01-15 | **Status:** ✅ Voltooid

### Voltooide Taken

- [x] User.theme en User.accent database velden
- [x] tRPC user.updateProfile endpoint uitgebreid
- [x] tRPC user.getProfile retourneert theme/accent
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
2d801549 feat(design-system): Add backend persistence for accent colors (Fase 4)
```

---

## FASE 6: Design Tokens v2.0.0 ✅ VOLTOOID

**Doel:** Compleet design token systeem met alle categorieën.

**Datum:** 2026-01-15 | **Status:** ✅ Voltooid

### Toegevoegde Token Categorieën

| Categorie | Aantal | Beschrijving |
|-----------|--------|--------------|
| Animation | 8 durations + 6 easings | instant→slowest, linear→spring |
| Z-Index | 11 levels | base(0) → max(9999) |
| Focus Ring | 4 tokens | width, offset, color, style |
| Color Scales | 4 nieuwe | Teal, Violet, Rose, Cyan (50-950) |
| State Colors | 12 | success/warning/error/info (+foreground/muted) |
| Component | 40+ | Badge, Avatar, Tooltip, Toast, Tabs, etc. |

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
[data-contrast="high"] { /* enhanced borders, text */ }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) { /* disable animations */ }
```

### Key Commit

```
ce26b0c0 feat(design-system): Complete design token system (Fase 6)
```

---

## Toekomstige Fases (Gepland)

---

## FASE 7: Component Library Audit ✅ VOLTOOID

**Doel:** Alle shadcn/ui componenten doorlopen en design tokens toepassen voor consistente styling.

**Datum:** 2026-01-16 | **Status:** ✅ Voltooid

### Audit Resultaat (2026-01-16)

Alle UI componenten gebruiken design tokens correct:

| Component | Status | Tokens |
|-----------|--------|--------|
| Button | ✅ | `bg-primary`, `bg-destructive`, `bg-success`, `bg-warning`, focus ring |
| Badge | ✅ | Status variants (success/warning/error/info), priority variants |
| Card | ✅ | `bg-card`, `text-card-foreground`, `border`, `shadow-sm` |
| Dialog | ✅ | `bg-background`, `ring-offset-background`, blur overlay |
| Input | ✅ | `border-input`, `bg-background`, focus ring tokens |
| Dropdown | ✅ | `bg-popover`, `text-popover-foreground`, `bg-accent` |
| Tooltip | ✅ | `bg-popover`, `text-popover-foreground` |
| Toast/Sonner | ✅ | `bg-background`, status colors (success/warning/error) |

### Pre-flight Checks (Referentie)

```bash
# Inventariseer huidige shadcn/ui componenten
ls apps/web/src/components/ui/

# Check welke tokens al gedefinieerd zijn
grep -c "^--" apps/web/src/styles/globals.css

# Zoek hardcoded kleuren in ui/ directory
grep -r "bg-\(gray\|blue\|red\|green\)" apps/web/src/components/ui/ | wc -l
```

### Fase 7.1: Button Component Audit

**Doel:** Button varianten afstemmen op design tokens.

**Taken:**
- [x] Audit bestaande Button varianten (default, destructive, outline, secondary, ghost, link)
- [x] Vervang hardcoded kleuren door semantic tokens
- [x] Voeg ontbrekende varianten toe (success, warning)
- [x] Implementeer consistent focus ring gedrag
- [x] Test alle varianten in light/dark mode

**Huidige staat analyseren:**

```bash
# Check Button component
cat apps/web/src/components/ui/button.tsx
```

**Gewenste implementatie:**

```tsx
// button.tsx - Token-based variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-error text-error-foreground hover:bg-error/90",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
)
```

**Acceptatiecriteria:**
- [x] Geen hardcoded kleuren in Button component
- [x] Alle varianten werken in light/dark mode
- [x] Focus ring consistent met design system
- [x] Visuele regressie test passed

---

### Fase 7.2: Card Component Audit

**Doel:** Card component consistent maken met surface tokens.

**Taken:**
- [x] Card gebruikt `bg-card` token (equivalent aan surface)
- [x] Card padding consistent
- [x] Card border en shadow via tokens
- [x] Consistent border radius via tokens

**Huidige staat analyseren:**

```bash
cat apps/web/src/components/ui/card.tsx
```

**Gewenste implementatie:**

```tsx
// card.tsx - Token-based styling
const Card = React.forwardRef<HTMLDivElement, CardProps & { variant?: 'default' | 'compact' | 'spacious' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const paddingClasses = {
      compact: 'p-4',
      default: 'p-6',
      spacious: 'p-8',
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border border-border bg-surface-1 text-foreground shadow-sm",
          "transition-shadow duration-fast hover:shadow-md",
          paddingClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
```

**Acceptatiecriteria:**
- [x] Card gebruikt `bg-card` token
- [x] Padding consistent via classes
- [x] Shadow via `shadow-sm` token
- [x] Consistent in light/dark mode

---

### Fase 7.3: Dialog/Modal Component Audit

**Doel:** Dialog overlay en content consistent met design tokens.

**Taken:**
- [x] Overlay kleur via `--modal-overlay`
- [x] Content achtergrond via `--modal-bg`
- [x] Border via `--modal-border`
- [x] Z-index via `--z-modal`
- [x] Focus trap en keyboard navigation verificatie

**Gewenste implementatie:**

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

**Acceptatiecriteria:**
- [x] Overlay gebruikt `--modal-overlay` token
- [x] Content background en border via tokens
- [x] Z-index consistent met z-index scale
- [x] Animaties via duration tokens

---

### Fase 7.4: Input/Form Elements Audit

**Doel:** Alle form elementen consistent maken.

**Taken:**
- [x] Input border kleuren via tokens
- [x] Focus ring via `--focus-ring-*` tokens
- [x] Error state via `--error` tokens
- [x] Disabled state styling
- [x] Placeholder kleur via `--text-muted`

**Componenten:**

| Component | Bestand | Status |
|-----------|---------|--------|
| Input | `input.tsx` | [x] |
| Textarea | `textarea.tsx` | [x] |
| Select | `select.tsx` | [x] |
| Checkbox | `checkbox.tsx` | [x] |
| Switch | `switch.tsx` | [x] |
| Slider | `slider.tsx` | [x] |

**Gewenste implementatie:**

```tsx
// input.tsx - Token-based styling
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-fast",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
```

**Acceptatiecriteria:**
- [x] Alle form elementen gebruiken design tokens
- [x] Focus states consistent
- [x] Error states werken met `--error` token
- [x] Disabled states correct gestyled

---

### Fase 7.5: Badge Component Audit

**Doel:** Badge kleuren via semantic tokens.

**Taken:**
- [x] Gebruik `--badge-*` tokens uit globals.css
- [x] Voeg status varianten toe (success, warning, error, info)
- [x] Priority varianten (low, medium, high, urgent)

**Gewenste implementatie:**

```tsx
// badge.tsx - Complete variant set
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-error text-error-foreground",
        outline: "text-foreground border-border",
        // Status variants
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        error: "border-transparent bg-error/10 text-error",
        info: "border-transparent bg-info/10 text-info",
        // Priority variants
        "priority-low": "border-transparent bg-priority-low-light text-priority-low",
        "priority-medium": "border-transparent bg-priority-medium-light text-priority-medium",
        "priority-high": "border-transparent bg-priority-high-light text-priority-high",
        "priority-urgent": "border-transparent bg-priority-urgent-light text-priority-urgent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

**Acceptatiecriteria:**
- [x] Alle badge varianten beschikbaar
- [x] Priority badges consistent met rest van app
- [x] Status badges voor feedback berichten

---

### Fase 7.6: Toast/Sonner Component Audit

**Doel:** Toast notificaties consistent met design system.

**Taken:**
- [x] Toast achtergrond via `--toast-bg`
- [x] Status kleuren (success, error, warning, info)
- [x] Z-index via `--z-toast`
- [x] Animaties via duration tokens

**Gewenste implementatie:**

```tsx
// sonner.tsx of toast.tsx - Token-based
<Toaster
  toastOptions={{
    classNames: {
      toast: "bg-toast-bg border-toast-border text-foreground shadow-lg",
      success: "bg-toast-success-bg border-success/20 text-success-foreground",
      error: "bg-toast-error-bg border-error/20 text-error-foreground",
      warning: "bg-toast-warning-bg border-warning/20 text-warning-foreground",
      info: "bg-toast-info-bg border-info/20 text-info-foreground",
    },
  }}
/>
```

**Acceptatiecriteria:**
- [x] Toast gebruikt design tokens
- [x] Alle status varianten werken
- [x] Correct z-index niveau

---

### Fase 7.7: Dropdown Menu Audit

**Doel:** Dropdown consistent met popover tokens.

**Taken:**
- [x] Background via `--dropdown-bg`
- [x] Border via `--dropdown-border`
- [x] Item hover via `--dropdown-item-hover`
- [x] Z-index via `--z-dropdown`

**Acceptatiecriteria:**
- [x] Dropdown styling via tokens
- [x] Hover states consistent
- [x] Separator via `--dropdown-separator`

---

### Fase 7.8: Tooltip Component Audit

**Doel:** Tooltip consistent met design system.

**Taken:**
- [x] Background via `--tooltip-bg`
- [x] Text via `--tooltip-text`
- [x] Z-index via `--z-tooltip`

**Acceptatiecriteria:**
- [x] Tooltip gebruikt tokens
- [x] Correct z-index (boven modals)
- [x] Arrow kleur consistent

---

### Fase 7 Commit Template

```
refactor(ui): Migrate component library to design tokens (Fase 7)

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

## FASE 8: Advanced Theming ✅ VOLTOOID

**Doel:** Uitgebreide themecustomization opties voor eindgebruikers.

**Datum:** 2026-01-16 | **Status:** ✅ Voltooid

### Pre-flight Checks

```bash
# Bekijk huidige ThemeContext implementatie
cat apps/web/src/contexts/ThemeContext.tsx

# Check beschikbare accent colors
cat apps/web/src/lib/themes/accents.ts

# Bekijk User model velden
grep -A5 "theme" apps/api/prisma/schema.prisma
```

### Fase 8.1: Custom Accent Color Picker ✅

**Doel:** Gebruikers kunnen eigen accent kleur kiezen buiten de 6 presets.

**Taken:**
- [x] Color picker component bouwen (HSL input)
- [x] Live preview van custom accent
- [x] Validatie van kleur contrast (WCAG)
- [x] Opslaan custom kleur in database
- [x] CSS variable injection voor custom color

**Database wijziging:**

```prisma
// schema.prisma
model User {
  // Bestaande velden
  theme       String?   @default("system")
  accent      String?   @default("blue")

  // Nieuwe velden
  customAccentHue        Int?      // 0-360
  customAccentSaturation Int?      // 0-100
  customAccentLightness  Int?      // 0-100
}
```

**Component implementatie:**

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
  onChange
}: CustomColorPickerProps) {
  const [hue, setHue] = useState(currentHue);
  const [saturation, setSaturation] = useState(currentSaturation);
  const [lightness, setLightness] = useState(currentLightness);

  // Preview kleur
  const previewColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // Contrast check
  const contrastRatio = calculateContrastRatio(previewColor, '#ffffff');
  const meetsWCAG = contrastRatio >= 4.5;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-lg border"
          style={{ backgroundColor: previewColor }}
        />
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
        <Alert variant="warning">
          Kleur heeft onvoldoende contrast. Pas de lightness aan.
        </Alert>
      )}

      <Button onClick={() => onChange({ h: hue, s: saturation, l: lightness })}>
        Toepassen
      </Button>
    </div>
  );
}
```

**CSS Injection:**

```tsx
// ThemeContext.tsx uitbreiding
useEffect(() => {
  if (customAccent) {
    const { h, s, l } = customAccent;
    document.documentElement.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    document.documentElement.style.setProperty('--accent-foreground', l > 50 ? '222 47% 11%' : '0 0% 100%');
  }
}, [customAccent]);
```

**Acceptatiecriteria:**
- [x] Custom color picker werkt met HSL
- [x] Live preview beschikbaar
- [x] Contrast validatie (WCAG AA)
- [x] Opslag in database
- [x] Sync tussen devices

---

### Fase 8.2: Density Settings ✅

**Doel:** Gebruikers kunnen UI dichtheid kiezen (compact/normal/spacious).

**Taken:**
- [x] Density tokens definiëren
- [x] DensityContext implementeren
- [x] Sidebar padding aanpassen
- [x] Card padding aanpassen
- [x] Table row height aanpassen
- [x] Database veld toevoegen

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

[data-density="compact"] {
  --density-spacing-xs: 0.125rem;
  --density-spacing-sm: 0.25rem;
  --density-spacing-md: 0.5rem;
  --density-spacing-lg: 1rem;
  --density-spacing-xl: 1.5rem;

  --density-row-height: 2rem;
  --density-card-padding: 1rem;
  --density-sidebar-padding: 0.75rem;
}

[data-density="spacious"] {
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

**Database wijziging:**

```prisma
model User {
  // ...
  density     String?   @default("normal") // compact | normal | spacious
}
```

**Context implementatie:**

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
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
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
      <Label>Interface Dichtheid</Label>
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

**Acceptatiecriteria:**
- [x] 3 density levels beschikbaar
- [x] Consistent toegepast op alle componenten
- [x] Opgeslagen in database
- [x] Geen layout breaking bij wisselen

---

### Fase 8.3: Sidebar Position Setting ✅

**Doel:** Sidebar links of rechts kunnen plaatsen.

**Taken:**
- [x] SidebarPosition context
- [x] Layout component aanpassen
- [x] CSS voor rechter sidebar
- [x] Database veld toevoegen
- [x] Animatie bij wisselen

**Database wijziging:**

```prisma
model User {
  // ...
  sidebarPosition String? @default("left") // left | right
}
```

**Layout aanpassing:**

```tsx
// components/layout/DashboardLayout.tsx
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { sidebarPosition } = useSidebarPosition();

  return (
    <div className={cn(
      "flex min-h-screen",
      sidebarPosition === 'right' && "flex-row-reverse"
    )}>
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Acceptatiecriteria:**
- [x] Sidebar kan links/rechts staan
- [x] Smooth transitie bij wisselen
- [x] Keyboard shortcuts respecteren positie
- [x] Opgeslagen in database

---

### Fase 8.4: Theme Import/Export ✅

**Doel:** Gebruikers kunnen theme settings exporteren en delen.

**Taken:**
- [x] Export functie (JSON format)
- [x] Import functie met validatie
- [x] Share URL generatie
- [x] Community presets pagina (optioneel)

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

**Export/Import functies:**

```tsx
// lib/theme-export.ts
export function exportTheme(): string {
  const settings: ThemeExport = {
    version: '1.0',
    theme: localStorage.getItem('kanbu-theme') as any || 'system',
    accent: localStorage.getItem('kanbu-accent') || 'blue',
    density: localStorage.getItem('kanbu-density') as any || 'normal',
    sidebarPosition: localStorage.getItem('kanbu-sidebar-position') as any || 'left',
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
    toast.success('Theme gekopieerd naar klembord');
  };

  const handleImport = () => {
    const settings = importTheme(importCode);
    if (!settings) {
      toast.error('Ongeldige theme code');
      return;
    }
    applyThemeSettings(settings);
    toast.success('Theme toegepast');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Exporteren</Label>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Kopieer Theme Code
        </Button>
      </div>

      <div>
        <Label>Importeren</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Plak theme code..."
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
          />
          <Button onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            Importeren
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Acceptatiecriteria:**
- [x] Export genereert shareable code
- [x] Import valideert en past toe
- [x] Foutafhandeling voor ongeldige codes
- [x] Versioning voor backwards compatibility

---

### Fase 8 Commit Template

```
feat(theme): Add advanced theming options (Fase 8)

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

## FASE 9: Documentation & Storybook ✅ VOLTOOID

**Doel:** Uitgebreide developer documentatie en component showcase.

**Datum:** 2026-01-16 | **Status:** ✅ Voltooid

### Voltooide Taken

- [x] Fase 9.1: Token Reference Guide - Volledige referentie van alle design tokens
- [x] Fase 9.2: Component Usage Examples - Praktische voorbeelden met Do's en Don'ts
- [x] Fase 9.3: Migration Guide - Handleiding voor migratie naar design tokens
- [x] Fase 9.4: Storybook Integration - Stories voor Button, Badge, Card, Input
- [ ] Fase 9.5: Token Documentation Generator (optioneel, niet geïmplementeerd)

### Documentatie Bestanden

| Document | Locatie | Beschrijving |
|----------|---------|--------------|
| Token Reference | [TOKEN-REFERENCE.md](./TOKEN-REFERENCE.md) | Alle design tokens met waarden en Tailwind mapping |
| Component Usage | [COMPONENT-USAGE.md](./COMPONENT-USAGE.md) | Do's en Don'ts, accessibility guidelines |
| Migration Guide | [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) | Migratie van hardcoded kleuren naar tokens |

### Storybook

**Locatie:** `apps/web/.storybook/`

**Scripts:**
```bash
pnpm storybook      # Start dev server op poort 6006
pnpm build-storybook # Build static storybook
```

**Stories:**
- `src/components/ui/button.stories.tsx` - Alle Button varianten
- `src/components/ui/badge.stories.tsx` - Status en priority badges
- `src/components/ui/card.stories.tsx` - Card layouts en patterns
- `src/components/ui/input.stories.tsx` - Form inputs en states

**Geschatte complexiteit:** Medium | **Geschatte duur:** 3-4 dagen

### Pre-flight Checks

```bash
# Check of Storybook al geconfigureerd is
ls apps/web/.storybook/ 2>/dev/null || echo "Storybook niet geïnstalleerd"

# Check package.json voor storybook dependencies
grep -i storybook apps/web/package.json

# Bekijk huidige docs structuur
ls -la docs/UI-Design-Kanbu/
```

### Fase 9.1: Token Reference Guide ✅

**Doel:** Complete referentie van alle design tokens met voorbeelden.

**Taken:**
- [x] Genereer token overzicht uit globals.css
- [x] Categoriseer tokens (colors, typography, spacing, etc.)
- [x] Voeg voorbeelden toe per token
- [x] Light/dark mode vergelijking
- [x] Tailwind class mapping

**Document structuur:**

```markdown
# Design Token Reference Guide

## Quick Reference

| Category | Count | Example |
|----------|-------|---------|
| Color Scales | 10 | `--color-blue-500` |
| Semantic Colors | 40+ | `--surface-1` |
| Typography | 15 | `--text-sm` |
| Spacing | 12 | `--spacing-4` |
| Shadows | 6 | `--shadow-md` |
| Animation | 14 | `--duration-normal` |
| Z-Index | 11 | `--z-modal` |

## Color Tokens

### Primitive Colors

#### Gray Scale
| Token | Light Value | Usage |
|-------|-------------|-------|
| `--color-gray-50` | #f9fafb | Background subtle |
| `--color-gray-100` | #f3f4f6 | Background muted |
| ... | ... | ... |

### Semantic Colors

#### Surfaces
| Token | Light | Dark | Tailwind |
|-------|-------|------|----------|
| `--background` | white | gray-950 | `bg-background` |
| `--surface-1` | white | gray-900 | `bg-surface-1` |
| `--surface-2` | gray-50 | gray-800 | `bg-surface-2` |
| `--surface-3` | gray-100 | gray-700 | `bg-surface-3` |

## Usage Examples

### Background Colors
```tsx
// ✅ Correct
<div className="bg-surface-1">
<div className="bg-background">

// ❌ Vermijden
<div className="bg-white dark:bg-gray-900">
<div className="bg-gray-50">
```

### Text Colors
```tsx
// ✅ Correct
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>

// ❌ Vermijden
<p className="text-gray-900 dark:text-gray-100">
```
```

**Acceptatiecriteria:**
- [x] Alle tokens gedocumenteerd
- [x] Voorbeelden voor elke categorie
- [x] Tailwind class mapping
- [x] Doorzoekbaar formaat

---

### Fase 9.2: Component Usage Examples ✅

**Doel:** Praktische voorbeelden van component gebruik.

**Taken:**
- [x] Voorbeeld pagina's per component category
- [x] Do's and Don'ts
- [x] Accessibility guidelines
- [x] Responsive patterns

**Document structuur:**

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
```

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
```

**Acceptatiecriteria:**
- [x] Voorbeelden voor alle componenten
- [x] Do's and Don'ts per component
- [x] Accessibility guidelines
- [x] Copy-paste ready code

---

### Fase 9.3: Migration Guide ✅

**Doel:** Guide voor migratie van oude code naar design tokens.

**Taken:**
- [x] Mapping van oude naar nieuwe classes
- [x] Regex patronen voor bulk migration
- [x] Common pitfalls en oplossingen
- [x] Checklist voor code review

**Document structuur:**

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
```

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

## Checklist voor Code Review

- [ ] Geen hardcoded kleuren (bg-gray-*, text-blue-*, etc.)
- [ ] Geen `dark:` prefixes voor kleuren
- [ ] Semantic tokens gebruikt waar mogelijk
- [ ] Priority kleuren via `--priority-*` tokens
- [ ] State kleuren via `--success/warning/error/info`
```

**Acceptatiecriteria:**
- [x] Complete mapping tabel
- [x] Werkende regex patronen
- [x] Praktische voorbeelden
- [x] Code review checklist

---

### Fase 9.4: Storybook Integration ✅

**Doel:** Interactive component documentation met Storybook.

**Taken:**
- [x] Storybook installeren en configureren
- [x] Stories schrijven voor alle ui/ componenten
- [x] Theme switcher addon
- [x] A11y addon voor accessibility testing
- [ ] Chromatic voor visual regression (optioneel, niet geïmplementeerd)

**Installatie:**

```bash
cd apps/web

# Installeer Storybook
pnpm dlx storybook@latest init

# Installeer addons
pnpm add -D @storybook/addon-a11y @storybook/addon-themes
```

**Configuratie:**

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

**Voorbeeld story:**

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
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'success', 'warning'],
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

**Component Index (20 totaal):**

| Component | Stories | Prioriteit | Status |
|-----------|---------|------------|--------|
| badge | ✅ | Hoog | Voltooid |
| button | ✅ | Hoog | Voltooid |
| card | ✅ | Hoog | Voltooid |
| checkbox | ✅ | Hoog | Voltooid |
| collapsible | ✅ | Laag | Voltooid |
| dialog | ✅ | Hoog | Voltooid |
| dropdown-menu | ✅ | Hoog | Voltooid |
| HoverPopover | ✅ | Medium | Voltooid |
| input | ✅ | Hoog | Voltooid |
| label | ✅ | Medium | Voltooid |
| progress | ✅ | Medium | Voltooid |
| scroll-area | ✅ | Laag | Voltooid |
| select | ✅ | Hoog | Voltooid |
| separator | ✅ | Laag | Voltooid |
| slider | ✅ | Medium | Voltooid |
| sonner | ✅ | Medium | Voltooid |
| switch | ✅ | Hoog | Voltooid |
| tabs | ✅ | Hoog | Voltooid |
| tooltip | ✅ | Hoog | Voltooid |
| UndoRedoButtons | ✅ | Laag | Voltooid |

**Prioriteit voor stories:**
1. **Hoog (9):** checkbox, dialog, dropdown-menu, select, switch, tabs, tooltip (+ badge, button, card, input ✅)
2. **Medium (4):** HoverPopover, label, progress, slider, sonner
3. **Laag (3):** collapsible, scroll-area, separator, UndoRedoButtons

**Acceptatiecriteria:**
- [x] Storybook draait lokaal
- [x] Stories voor alle ui/ componenten (20/20 voltooid)
- [x] Theme switching werkt
- [x] A11y tests beschikbaar
- [x] Autodocs generatie werkt

---

### Fase 9.5: Token Documentation Generator (Optioneel)

**Doel:** Automatisch token documentatie genereren uit CSS.

**Taken:**
- [ ] Script schrijven dat globals.css parsed
- [ ] JSON/TypeScript output voor tokens
- [ ] Markdown generator voor docs
- [ ] CI integration voor automatische updates

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
  const content = fs.readFileSync(
    path.join(__dirname, '../src/styles/globals.css'),
    'utf-8'
  );

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

**Acceptatiecriteria:**
- [ ] Script parsed globals.css correct
- [ ] Output is accuraat en compleet
- [ ] Kan in CI draaien
- [ ] Documenteert light/dark verschillen

---

### Fase 9 Commit Template

```
docs(design-system): Add comprehensive documentation (Fase 9)

- Token reference guide with all CSS variables
- Component usage examples with do's and don'ts
- Migration guide for hardcoded colors
- Storybook integration with theme switching
- A11y testing addon configured

Signed-off-by: Robin Waslander <R.Waslander@gmail.com>
```

---

## Overzicht Voltooide Implementatie Fases

| Fase | Status | Complexiteit | Beschrijving |
|------|--------|--------------|--------------|
| Fase 7 | ✅ Voltooid | Hoog | Component Library Audit |
| Fase 8 | ✅ Voltooid | Hoog | Advanced Theming |
| Fase 9 | ✅ Voltooid | Medium | Documentation & Storybook |

### Implementatie Volgorde (Voltooid)

1. **Fase 7** - Component audit voor consistente basis ✅
2. **Fase 8** - Advanced theming features ✅
3. **Fase 9** - Documentatie en Storybook ✅

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
      zIndex: { /* 11 levels */ },
      transitionDuration: { /* 8 durations */ },
      transitionTimingFunction: { /* 6 easings */ },
      animation: { /* fade, slide, scale, pulse, shimmer, bounce */ },
      borderRadius: { /* component-specific */ },
      fontSize: { /* page-title, section-title */ },
      boxShadow: { /* custom shadows */ },
    },
  },
}
```

---

## Appendix: Commit History

```
ce26b0c0 feat(design-system): Complete design token system (Fase 6)
2d801549 feat(design-system): Add backend persistence for accent colors (Fase 4)
be525603 feat(design-system): Add theme infrastructure and accent colors (Fase 3)
c3e7a709 refactor(design-system): Remove ALL hardcoded colors (Fase 2 - 100%)
0698ad93 refactor(design-system): Migrate table and component hover patterns (Fase 2.6)
167cf189 refactor(design-system): Migrate sidebar components (Fase 2.5)
...
```

---

*Document versie: 2.4.0*
*Laatst bijgewerkt: 2026-01-16*
