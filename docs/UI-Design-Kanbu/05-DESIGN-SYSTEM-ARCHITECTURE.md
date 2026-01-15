# Kanbu Design System Architecture

**Versie:** 1.0.0
**Datum:** 2026-01-15
**Status:** Voorstel

---

## 1. Visie

Een **volledig themeable design system** dat:

1. **Nu:** Consistente, professionele uitstraling
2. **Later:** Kleuren EN stijl aanpasbaar via themes
3. **Toekomst:** Layout aanpasbaar binnen richtlijnen

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER PREFERENCES                          │
│            (opgeslagen in database of localStorage)              │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      THEME CONFIGURATION                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Kleuren    │  │   Stijl     │  │       Layout            │ │
│  │  (Fase 1)   │  │  (Fase 2)   │  │      (Fase 3)           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DESIGN TOKENS                              │
│              CSS Custom Properties (variabelen)                  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    UTILITY CLASSES                               │
│           Tailwind classes die tokens gebruiken                  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENTEN                                 │
│         React components die utilities gebruiken                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Token Structuur

### 2.1 Token Hiërarchie

```
Primitive Tokens (laagste niveau)
    ↓
Semantic Tokens (betekenisvolle namen)
    ↓
Component Tokens (component-specifiek)
```

### 2.2 Primitive Tokens

Basis waarden zonder context:

```css
:root {
  /* ═══════════════════════════════════════════════════════════════
     PRIMITIVE TOKENS - Basis waarden
     ═══════════════════════════════════════════════════════════════ */

  /* Color Palette - Raw HSL values */
  --color-gray-50: 210 40% 98%;
  --color-gray-100: 210 40% 96%;
  --color-gray-200: 214 32% 91%;
  --color-gray-300: 213 27% 84%;
  --color-gray-400: 215 20% 65%;
  --color-gray-500: 215 16% 47%;
  --color-gray-600: 215 19% 35%;
  --color-gray-700: 215 25% 27%;
  --color-gray-800: 217 33% 17%;
  --color-gray-900: 222 84% 5%;

  --color-blue-50: 214 100% 97%;
  --color-blue-100: 214 95% 93%;
  --color-blue-500: 217 91% 60%;
  --color-blue-600: 221 83% 53%;
  --color-blue-700: 224 76% 48%;

  --color-orange-50: 33 100% 96%;
  --color-orange-100: 34 100% 92%;
  --color-orange-500: 25 95% 53%;
  --color-orange-600: 21 90% 48%;

  --color-red-50: 0 86% 97%;
  --color-red-100: 0 93% 94%;
  --color-red-500: 0 84% 60%;
  --color-red-600: 0 72% 51%;

  --color-green-50: 138 76% 97%;
  --color-green-100: 141 84% 93%;
  --color-green-500: 142 71% 45%;
  --color-green-600: 142 76% 36%;

  /* Typography Scale */
  --font-size-xs: 0.75rem;     /* 12px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px */

  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing Scale */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.375rem;   /* 6px */
  --radius-lg: 0.5rem;     /* 8px */
  --radius-xl: 0.75rem;    /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-none: none;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2.3 Semantic Tokens

Betekenisvolle namen die verwijzen naar primitives:

```css
:root {
  /* ═══════════════════════════════════════════════════════════════
     SEMANTIC TOKENS - Light Mode
     ═══════════════════════════════════════════════════════════════ */

  /* Background & Foreground */
  --background: var(--color-gray-50);
  --foreground: var(--color-gray-900);

  /* Surface Levels (voor nested containers) */
  --surface-1: hsl(0 0% 100%);           /* Cards op background */
  --surface-2: hsl(var(--color-gray-50)); /* Nested elements */
  --surface-3: hsl(var(--color-gray-100)); /* Deeply nested */

  /* Brand Colors */
  --primary: var(--color-gray-900);
  --primary-foreground: var(--color-gray-50);
  --secondary: var(--color-gray-100);
  --secondary-foreground: var(--color-gray-900);

  /* Functional Colors */
  --success: var(--color-green-500);
  --success-foreground: hsl(0 0% 100%);
  --warning: var(--color-orange-500);
  --warning-foreground: hsl(0 0% 100%);
  --error: var(--color-red-500);
  --error-foreground: hsl(0 0% 100%);
  --info: var(--color-blue-500);
  --info-foreground: hsl(0 0% 100%);

  /* Priority Colors */
  --priority-low: var(--color-gray-400);
  --priority-medium: var(--color-blue-500);
  --priority-high: var(--color-orange-500);
  --priority-urgent: var(--color-red-500);

  /* Interactive States */
  --hover-overlay: rgb(0 0 0 / 0.04);
  --active-overlay: rgb(0 0 0 / 0.08);
  --focus-ring: var(--color-blue-500);

  /* Borders */
  --border-default: var(--color-gray-200);
  --border-muted: var(--color-gray-100);
  --border-strong: var(--color-gray-300);

  /* Text */
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --text-muted: var(--color-gray-400);
  --text-inverse: var(--color-gray-50);
}

.dark {
  /* ═══════════════════════════════════════════════════════════════
     SEMANTIC TOKENS - Dark Mode
     ═══════════════════════════════════════════════════════════════ */

  --background: var(--color-gray-900);
  --foreground: var(--color-gray-50);

  --surface-1: hsl(var(--color-gray-800));
  --surface-2: hsl(var(--color-gray-700));
  --surface-3: hsl(var(--color-gray-600));

  /* ... etc */
}
```

### 2.4 Component Tokens

Specifieke tokens per component:

```css
:root {
  /* ═══════════════════════════════════════════════════════════════
     COMPONENT TOKENS
     ═══════════════════════════════════════════════════════════════ */

  /* Card */
  --card-bg: var(--surface-1);
  --card-border: var(--border-default);
  --card-radius: var(--radius-lg);
  --card-shadow: var(--shadow-sm);
  --card-padding: var(--space-6);

  /* Button */
  --button-radius: var(--radius-md);
  --button-padding-x: var(--space-4);
  --button-padding-y: var(--space-2);
  --button-font-weight: var(--font-weight-medium);

  /* Input */
  --input-radius: var(--radius-md);
  --input-border: var(--border-default);
  --input-padding-x: var(--space-3);
  --input-padding-y: var(--space-2);

  /* Page */
  --page-padding-x: var(--space-6);
  --page-padding-y: var(--space-8);
  --page-max-width: 80rem; /* 1280px */

  /* Page Title */
  --page-title-size: var(--font-size-2xl);
  --page-title-weight: var(--font-weight-semibold);
  --page-title-color: var(--text-primary);

  /* Section Title */
  --section-title-size: var(--font-size-lg);
  --section-title-weight: var(--font-weight-semibold);

  /* Sidebar */
  --sidebar-width: 14rem;
  --sidebar-width-collapsed: 3.5rem;
  --sidebar-bg: var(--surface-2);
  --sidebar-item-radius: var(--radius-md);
  --sidebar-item-padding: var(--space-2) var(--space-3);
}
```

---

## 3. Theme System

### 3.1 Theme Structure

```typescript
// types/theme.ts

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  foreground: string
  // ... etc
}

export interface ThemeStyle {
  radius: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  shadow: 'none' | 'sm' | 'md' | 'lg'
  density: 'compact' | 'normal' | 'spacious'
}

export interface ThemeLayout {
  sidebarPosition: 'left' | 'right'
  sidebarStyle: 'floating' | 'fixed' | 'overlay'
  headerStyle: 'fixed' | 'static'
  maxWidth: 'full' | 'wide' | 'normal' | 'narrow'
}

export interface Theme {
  name: string
  colors: ThemeColors
  style: ThemeStyle
  layout: ThemeLayout
}
```

### 3.2 Preset Themes

```typescript
// themes/presets.ts

export const defaultTheme: Theme = {
  name: 'Default',
  colors: {
    primary: '222.2 47.4% 11.2%',
    // ... shadcn defaults
  },
  style: {
    radius: 'lg',
    shadow: 'sm',
    density: 'normal',
  },
  layout: {
    sidebarPosition: 'left',
    sidebarStyle: 'fixed',
    headerStyle: 'fixed',
    maxWidth: 'wide',
  },
}

export const compactTheme: Theme = {
  name: 'Compact',
  colors: { /* same */ },
  style: {
    radius: 'sm',
    shadow: 'none',
    density: 'compact',
  },
  layout: {
    sidebarPosition: 'left',
    sidebarStyle: 'fixed',
    headerStyle: 'fixed',
    maxWidth: 'full',
  },
}

export const modernTheme: Theme = {
  name: 'Modern',
  colors: {
    primary: '250 95% 64%', // Purple
    // ...
  },
  style: {
    radius: 'xl',
    shadow: 'lg',
    density: 'spacious',
  },
  layout: { /* ... */ },
}
```

### 3.3 Theme Provider

```typescript
// providers/ThemeProvider.tsx

import { createContext, useContext, useEffect, useState } from 'react'
import { Theme, defaultTheme } from '@/themes/presets'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  setColors: (colors: Partial<ThemeColors>) => void
  setStyle: (style: Partial<ThemeStyle>) => void
  setLayout: (layout: Partial<ThemeLayout>) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement

    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })

    // Style
    root.style.setProperty('--radius', getRadiusValue(theme.style.radius))
    root.style.setProperty('--shadow-default', getShadowValue(theme.style.shadow))
    root.dataset.density = theme.style.density

    // Layout
    root.dataset.sidebarPosition = theme.layout.sidebarPosition
    root.dataset.sidebarStyle = theme.layout.sidebarStyle
  }, [theme])

  // ... implementation
}
```

---

## 4. Implementatie Roadmap

### Fase 1: Foundation (Week 1-2)

**Doel:** Alle CSS tokens definiëren, bestaande code breekt niet.

| Taak | Prioriteit | Geschatte tijd |
|------|------------|----------------|
| Uitbreiden globals.css met alle primitive tokens | Hoog | 2 uur |
| Semantic tokens toevoegen | Hoog | 2 uur |
| Component tokens toevoegen | Hoog | 2 uur |
| Tailwind config updaten voor custom tokens | Hoog | 1 uur |
| Documentatie schrijven | Medium | 2 uur |

**Deliverable:** Volledige token set beschikbaar, nog niet in gebruik.

---

### Fase 2: Component Migration (Week 3-6)

**Doel:** Alle componenten migreren naar tokens.

| Component Groep | Aantal | Geschatte tijd |
|-----------------|--------|----------------|
| UI Components (shadcn) | 20 | Al deels klaar |
| Page Headers | ~35 pages | 4 uur |
| Cards & Panels | ~100 instances | 6 uur |
| Forms & Inputs | ~108 instances | 4 uur |
| Buttons (custom) | ~50 instances | 2 uur |
| Sidebars | 7 componenten | 4 uur |
| Tables | ~20 instances | 2 uur |
| Modals | 16 componenten | 3 uur |

**Aanpak per bestand:**
```typescript
// VOOR
<h1 className="text-2xl font-bold text-gray-900 dark:text-white">

// NA
<h1 className="text-[length:var(--page-title-size)] font-[number:var(--page-title-weight)] text-[color:hsl(var(--text-primary))]">

// OF met Tailwind custom classes
<h1 className="page-title">
```

**Deliverable:** Alle componenten gebruiken tokens.

---

### Fase 3: Theme System (Week 7-8)

**Doel:** Themes kunnen wisselen.

| Taak | Prioriteit |
|------|------------|
| ThemeProvider implementeren | Hoog |
| Theme presets maken (3-4 stuks) | Hoog |
| Theme selector UI | Medium |
| User preference opslag (DB) | Medium |
| Dark mode integratie | Hoog |

**Deliverable:** Gebruikers kunnen theme kiezen.

---

### Fase 4: Advanced Theming (Week 9-12)

**Doel:** Stijl en layout aanpasbaar.

| Feature | Complexiteit |
|---------|--------------|
| Radius presets (sharp/rounded) | Laag |
| Shadow presets (flat/elevated) | Laag |
| Density presets (compact/spacious) | Medium |
| Sidebar position (left/right) | Medium |
| Custom color picker | Medium |
| Theme import/export | Laag |

**Deliverable:** Volledig themeable systeem.

---

## 5. Migratie Strategie

### 5.1 Geleidelijke Migratie

**Niet alles tegelijk!** Gebruik feature flags:

```typescript
// lib/feature-flags.ts
export const FEATURES = {
  USE_DESIGN_TOKENS: true,  // Schakel per component in
  THEME_SELECTOR: false,    // Pas inschakelen als klaar
}
```

### 5.2 Component-voor-Component

```
1. Kies component (bijv. Card)
2. Update naar tokens
3. Test light + dark mode
4. Test responsive
5. Commit
6. Volgende component
```

### 5.3 Backwards Compatibility

Oude classes blijven werken totdat alles gemigreerd is:

```css
/* Tijdelijke backwards compat */
.text-gray-900 {
  color: hsl(var(--text-primary));
}
```

---

## 6. Bestandsstructuur

```
apps/web/src/
├── styles/
│   ├── globals.css              # Alle CSS tokens
│   ├── themes/
│   │   ├── index.ts             # Theme exports
│   │   ├── default.ts           # Default theme
│   │   ├── compact.ts           # Compact variant
│   │   └── modern.ts            # Modern variant
│   └── utilities.css            # Custom Tailwind utilities
├── providers/
│   └── ThemeProvider.tsx        # Theme context
├── hooks/
│   └── useTheme.ts              # Theme hook
├── components/
│   └── theme/
│       ├── ThemeSelector.tsx    # UI voor theme keuze
│       └── ThemePreview.tsx     # Preview component
└── lib/
    └── design-tokens.ts         # TypeScript constants (bestaand)
```

---

## 7. Tailwind Configuratie

```typescript
// tailwind.config.ts

export default {
  theme: {
    extend: {
      colors: {
        // Map naar CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... etc
      },
      borderRadius: {
        'card': 'var(--card-radius)',
        'button': 'var(--button-radius)',
        'input': 'var(--input-radius)',
      },
      spacing: {
        'card': 'var(--card-padding)',
        'page-x': 'var(--page-padding-x)',
        'page-y': 'var(--page-padding-y)',
      },
      fontSize: {
        'page-title': 'var(--page-title-size)',
        'section-title': 'var(--section-title-size)',
      },
    },
  },
}
```

---

## 8. Success Criteria

### Fase 1 Complete wanneer:
- [ ] Alle tokens gedefinieerd in globals.css
- [ ] Tailwind config gebruikt tokens
- [ ] Bestaande app werkt nog steeds
- [ ] Documentatie geschreven

### Fase 2 Complete wanneer:
- [ ] 0 hardcoded kleuren in components
- [ ] Alle h1/h2/h3 gebruiken typography tokens
- [ ] Alle cards gebruiken card tokens
- [ ] Dark mode werkt consistent

### Fase 3 Complete wanneer:
- [ ] ThemeProvider geïmplementeerd
- [ ] Minimaal 3 theme presets
- [ ] Theme selector in UI
- [ ] User preference opgeslagen

### Fase 4 Complete wanneer:
- [ ] Stijl (radius, shadow) aanpasbaar
- [ ] Layout (sidebar position) aanpasbaar
- [ ] Custom colors mogelijk
- [ ] Import/export van themes

---

## 9. Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Breaking changes tijdens migratie | Hoog | Component-voor-component, uitgebreid testen |
| Performance impact van CSS variables | Laag | Minimaal, browser optimalisaties |
| Complexity voor developers | Medium | Goede documentatie, TypeScript types |
| Inconsistente migratie | Medium | Lint rules, code review |

---

## 10. Volgende Stappen

1. **Review dit document** met stakeholder
2. **Besluit** over scope en prioriteit
3. **Start Fase 1** met token definitie
4. **Commit regelmatig** met kleine wijzigingen

---

*Document versie: 1.0.0*
*Laatst bijgewerkt: 2026-01-15*
