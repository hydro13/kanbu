# Kanbu Design System - Implementatie Roadmap

**Versie:** 2.0.0
**Laatst bijgewerkt:** 2026-01-15
**Status:** ✅ Design System v2.0.0 Voltooid

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

### Fase 7: Component Library Audit (Niet Gestart)

**Doel:** Alle shadcn/ui componenten doorlopen en design tokens toepassen.

| Component | Status | Notities |
|-----------|--------|----------|
| Button | [ ] | Primaire varianten |
| Card | [ ] | Padding varianten |
| Dialog | [ ] | Overlay kleur |
| Input | [ ] | Focus states |
| Badge | [ ] | Nieuwe kleuren |
| Toast | [ ] | Status kleuren |

### Fase 8: Advanced Theming (Niet Gestart)

**Doel:** Stijl en layout aanpasbaar maken.

| Feature | Status |
|---------|--------|
| Custom color picker | [ ] |
| Density settings (compact/normal/spacious) | [ ] |
| Sidebar position (left/right) | [ ] |
| Theme import/export | [ ] |

### Fase 9: Documentation (Niet Gestart)

**Doel:** Developer documentation genereren.

| Item | Status |
|------|--------|
| Token reference guide | [ ] |
| Usage examples | [ ] |
| Migration guide | [ ] |
| Storybook integration | [ ] |

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

*Document versie: 2.0.0*
*Laatst bijgewerkt: 2026-01-15*
