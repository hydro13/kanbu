# Kanbu Design System - Implementatie Roadmap

**Versie:** 1.0.0
**Laatst bijgewerkt:** 2026-01-15
**Status:** In Progress

---

## BELANGRIJK: Lees Dit Eerst!

### Voor Elke Nieuwe Claude Code Sessie

Dit document is ontworpen zodat een **nieuwe sessie zonder context** veilig kan verder werken.

**Stap 1:** Lees deze sectie volledig
**Stap 2:** Voer de Context Gathering uit (zie hieronder)
**Stap 3:** Check de huidige progress
**Stap 4:** Ga verder waar gestopt is

### Test Omgeving is LIVE!

De Kanbu dev omgeving draait **live** op:
- **Frontend:** https://localhost:5173
- **API:** https://localhost:3001
- **Database:** PostgreSQL op poort 5432

**VEILIGHEIDSREGELS:**
1. **NOOIT** database schema wijzigen zonder migratie
2. **ALTIJD** testen na elke wijziging
3. **COMMIT VAAK** - kleine, atomische commits
4. **GEEN** breaking changes in API endpoints
5. **BACKUP** belangrijke bestanden voor grote wijzigingen

---

## Context Gathering voor Nieuwe Sessie

**Voer deze commando's uit VOORDAT je begint:**

```bash
# 1. Check of dev omgeving draait
lsof -i :5173  # Frontend
lsof -i :3001  # API
sudo docker ps | grep postgres  # Database

# 2. Check huidige git status
cd ~/genx/v6/dev/kanbu
git status
git log --oneline -5

# 3. Lees de design system bestanden
cat apps/web/src/styles/globals.css
cat apps/web/src/lib/design-tokens.ts

# 4. Check Tailwind config
cat apps/web/tailwind.config.ts
```

**Lees deze documenten:**
1. [00-DESIGN-AUDIT-SUMMARY.md](./00-DESIGN-AUDIT-SUMMARY.md) - Overzicht
2. [04-UI-PATTERN-LIBRARY.md](./04-UI-PATTERN-LIBRARY.md) - Huidige patronen
3. [05-DESIGN-SYSTEM-ARCHITECTURE.md](./05-DESIGN-SYSTEM-ARCHITECTURE.md) - Architectuur

---

## Progress Tracker

### Legenda
- [ ] Niet gestart
- [~] In progress
- [x] Voltooid
- [!] Geblokkeerd

---

## FASE 1: Foundation

**Doel:** Alle CSS tokens definiëren zonder bestaande code te breken.

**Start datum:** 2026-01-15
**Status:** [~] In Progress

### Pre-flight Checks Fase 1

```bash
# Controleer of globals.css bestaat en leesbaar is
cat ~/genx/v6/dev/kanbu/apps/web/src/styles/globals.css | head -80

# Controleer of de app start zonder errors
cd ~/genx/v6/dev/kanbu/apps/web
pnpm dev &
# Wacht 10 sec, check http://localhost:5173
```

---

### Fase 1.1: Primitive Color Tokens

**Status:** [x] Voltooid (2026-01-15)

**Wat:** Definieer alle basis kleuren als CSS variabelen.

**Bestanden:**
- `apps/web/src/styles/globals.css`

**Taken:**
- [x] Gray scale (50-900) toevoegen
- [x] Blue scale toevoegen
- [x] Orange scale toevoegen
- [x] Red scale toevoegen
- [x] Green scale toevoegen
- [x] Amber/Yellow scale toevoegen

**Code toe te voegen aan globals.css:**
```css
/* ═══════════════════════════════════════════════════════════════
   PRIMITIVE TOKENS - Color Palette
   ═══════════════════════════════════════════════════════════════ */

/* Gray Scale */
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

/* Blue Scale */
--color-blue-50: 214 100% 97%;
--color-blue-100: 214 95% 93%;
--color-blue-200: 213 97% 87%;
--color-blue-300: 212 96% 78%;
--color-blue-400: 213 94% 68%;
--color-blue-500: 217 91% 60%;
--color-blue-600: 221 83% 53%;
--color-blue-700: 224 76% 48%;
--color-blue-800: 226 71% 40%;
--color-blue-900: 224 64% 33%;

/* Orange Scale */
--color-orange-50: 33 100% 96%;
--color-orange-100: 34 100% 92%;
--color-orange-200: 32 98% 83%;
--color-orange-300: 31 97% 72%;
--color-orange-400: 27 96% 61%;
--color-orange-500: 25 95% 53%;
--color-orange-600: 21 90% 48%;
--color-orange-700: 17 88% 40%;
--color-orange-800: 15 79% 34%;
--color-orange-900: 15 75% 28%;

/* Red Scale */
--color-red-50: 0 86% 97%;
--color-red-100: 0 93% 94%;
--color-red-200: 0 96% 89%;
--color-red-300: 0 94% 82%;
--color-red-400: 0 91% 71%;
--color-red-500: 0 84% 60%;
--color-red-600: 0 72% 51%;
--color-red-700: 0 74% 42%;
--color-red-800: 0 70% 35%;
--color-red-900: 0 63% 31%;

/* Green Scale */
--color-green-50: 138 76% 97%;
--color-green-100: 141 84% 93%;
--color-green-200: 141 79% 85%;
--color-green-300: 142 77% 73%;
--color-green-400: 142 69% 58%;
--color-green-500: 142 71% 45%;
--color-green-600: 142 76% 36%;
--color-green-700: 142 72% 29%;
--color-green-800: 143 64% 24%;
--color-green-900: 144 61% 20%;

/* Amber Scale */
--color-amber-50: 48 100% 96%;
--color-amber-100: 48 96% 89%;
--color-amber-200: 48 97% 77%;
--color-amber-300: 46 97% 65%;
--color-amber-400: 43 96% 56%;
--color-amber-500: 38 92% 50%;
--color-amber-600: 32 95% 44%;
--color-amber-700: 26 90% 37%;
--color-amber-800: 23 83% 31%;
--color-amber-900: 22 78% 26%;
```

**Test na voltooiing:**
```bash
# App moet nog steeds starten
cd ~/genx/v6/dev/kanbu/apps/web && pnpm dev

# Check of variabelen beschikbaar zijn in browser console:
# getComputedStyle(document.documentElement).getPropertyValue('--color-gray-500')
```

**Commit message:**
```
feat(design-system): Add primitive color tokens to globals.css
```

---

### Fase 1.2: Typography Tokens

**Status:** [x] Voltooid (2026-01-15)

**Wat:** Definieer typography scale als CSS variabelen.

**Bestanden:**
- `apps/web/src/styles/globals.css`

**Taken:**
- [x] Font size scale toevoegen
- [x] Font weight tokens toevoegen
- [x] Line height tokens toevoegen
- [x] Letter spacing tokens toevoegen

**Code toe te voegen:**
```css
/* ═══════════════════════════════════════════════════════════════
   PRIMITIVE TOKENS - Typography
   ═══════════════════════════════════════════════════════════════ */

/* Font Sizes */
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
--line-height-none: 1;
--line-height-tight: 1.25;
--line-height-snug: 1.375;
--line-height-normal: 1.5;
--line-height-relaxed: 1.625;
--line-height-loose: 2;

/* Letter Spacing */
--letter-spacing-tighter: -0.05em;
--letter-spacing-tight: -0.025em;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.025em;
--letter-spacing-wider: 0.05em;
```

**Test na voltooiing:**
```bash
# Check in browser console
# getComputedStyle(document.documentElement).getPropertyValue('--font-size-xl')
```

**Commit message:**
```
feat(design-system): Add typography tokens to globals.css
```

---

### Fase 1.3: Spacing Tokens

**Status:** [ ] Niet gestart

**Wat:** Definieer spacing scale als CSS variabelen.

**Bestanden:**
- `apps/web/src/styles/globals.css`

**Taken:**
- [ ] Spacing scale (0-16) toevoegen
- [ ] Radius tokens toevoegen
- [ ] Shadow tokens toevoegen

**Code toe te voegen:**
```css
/* ═══════════════════════════════════════════════════════════════
   PRIMITIVE TOKENS - Spacing & Layout
   ═══════════════════════════════════════════════════════════════ */

/* Spacing Scale */
--space-0: 0;
--space-px: 1px;
--space-0-5: 0.125rem;  /* 2px */
--space-1: 0.25rem;     /* 4px */
--space-1-5: 0.375rem;  /* 6px */
--space-2: 0.5rem;      /* 8px */
--space-2-5: 0.625rem;  /* 10px */
--space-3: 0.75rem;     /* 12px */
--space-3-5: 0.875rem;  /* 14px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-7: 1.75rem;     /* 28px */
--space-8: 2rem;        /* 32px */
--space-9: 2.25rem;     /* 36px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-14: 3.5rem;     /* 56px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */

/* Border Radius */
--radius-none: 0;
--radius-sm: 0.125rem;   /* 2px */
--radius-default: 0.25rem; /* 4px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-3xl: 1.5rem;    /* 24px */
--radius-full: 9999px;

/* Shadows */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-default: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
--shadow-none: none;
```

**Commit message:**
```
feat(design-system): Add spacing, radius, and shadow tokens
```

---

### Fase 1.4: Semantic Tokens

**Status:** [ ] Niet gestart

**Wat:** Definieer semantic tokens die naar primitives verwijzen.

**Bestanden:**
- `apps/web/src/styles/globals.css`

**Taken:**
- [ ] Surface/background tokens
- [ ] Text color tokens
- [ ] Border tokens
- [ ] Interactive state tokens

**Code toe te voegen (in :root):**
```css
/* ═══════════════════════════════════════════════════════════════
   SEMANTIC TOKENS - Light Mode
   ═══════════════════════════════════════════════════════════════ */

/* Surfaces */
--surface-background: 0 0% 100%;
--surface-1: 0 0% 100%;
--surface-2: var(--color-gray-50);
--surface-3: var(--color-gray-100);
--surface-elevated: 0 0% 100%;

/* Text */
--text-primary: var(--color-gray-900);
--text-secondary: var(--color-gray-600);
--text-tertiary: var(--color-gray-500);
--text-muted: var(--color-gray-400);
--text-inverse: var(--color-gray-50);
--text-link: var(--color-blue-600);
--text-link-hover: var(--color-blue-700);

/* Borders */
--border-default: var(--color-gray-200);
--border-muted: var(--color-gray-100);
--border-strong: var(--color-gray-300);
--border-focus: var(--color-blue-500);

/* Interactive */
--interactive-hover: rgb(0 0 0 / 0.04);
--interactive-active: rgb(0 0 0 / 0.08);
--interactive-selected: var(--color-blue-50);
```

**Code toe te voegen (in .dark):**
```css
/* ═══════════════════════════════════════════════════════════════
   SEMANTIC TOKENS - Dark Mode
   ═══════════════════════════════════════════════════════════════ */

/* Surfaces */
--surface-background: var(--color-gray-900);
--surface-1: var(--color-gray-800);
--surface-2: var(--color-gray-700);
--surface-3: var(--color-gray-600);
--surface-elevated: var(--color-gray-800);

/* Text */
--text-primary: var(--color-gray-50);
--text-secondary: var(--color-gray-300);
--text-tertiary: var(--color-gray-400);
--text-muted: var(--color-gray-500);
--text-inverse: var(--color-gray-900);
--text-link: var(--color-blue-400);
--text-link-hover: var(--color-blue-300);

/* Borders */
--border-default: var(--color-gray-700);
--border-muted: var(--color-gray-800);
--border-strong: var(--color-gray-600);

/* Interactive */
--interactive-hover: rgb(255 255 255 / 0.04);
--interactive-active: rgb(255 255 255 / 0.08);
--interactive-selected: rgb(59 130 246 / 0.2);
```

**Test na voltooiing:**
```bash
# Test light mode
# Open http://localhost:5173
# Check kleuren zijn correct

# Test dark mode
# Toggle naar dark mode
# Check kleuren zijn correct
```

**Commit message:**
```
feat(design-system): Add semantic tokens for surfaces, text, and borders
```

---

### Fase 1.5: Component Tokens

**Status:** [ ] Niet gestart

**Wat:** Definieer component-specifieke tokens.

**Bestanden:**
- `apps/web/src/styles/globals.css`

**Taken:**
- [ ] Card tokens
- [ ] Button tokens
- [ ] Input tokens
- [ ] Page layout tokens
- [ ] Sidebar tokens

**Code toe te voegen:**
```css
/* ═══════════════════════════════════════════════════════════════
   COMPONENT TOKENS
   ═══════════════════════════════════════════════════════════════ */

/* Card */
--card-background: var(--surface-1);
--card-border: var(--border-default);
--card-radius: var(--radius-lg);
--card-shadow: var(--shadow-sm);
--card-padding: var(--space-6);
--card-padding-sm: var(--space-4);
--card-padding-lg: var(--space-8);

/* Button */
--button-radius: var(--radius-md);
--button-padding-x: var(--space-4);
--button-padding-y: var(--space-2);
--button-padding-x-sm: var(--space-3);
--button-padding-y-sm: var(--space-1-5);
--button-padding-x-lg: var(--space-6);
--button-padding-y-lg: var(--space-3);
--button-font-weight: var(--font-weight-medium);
--button-font-size: var(--font-size-sm);

/* Input */
--input-radius: var(--radius-md);
--input-border: var(--border-default);
--input-border-focus: var(--border-focus);
--input-padding-x: var(--space-3);
--input-padding-y: var(--space-2);
--input-font-size: var(--font-size-sm);
--input-background: var(--surface-background);

/* Page */
--page-padding-x: var(--space-6);
--page-padding-y: var(--space-8);
--page-max-width: 80rem;
--page-max-width-narrow: 48rem;

/* Page Title */
--page-title-size: var(--font-size-2xl);
--page-title-weight: var(--font-weight-semibold);
--page-title-size-lg: var(--font-size-3xl);
--page-title-weight-lg: var(--font-weight-bold);

/* Section */
--section-title-size: var(--font-size-lg);
--section-title-weight: var(--font-weight-semibold);
--section-gap: var(--space-8);

/* Sidebar */
--sidebar-width: 14rem;
--sidebar-width-collapsed: 3.5rem;
--sidebar-background: var(--surface-2);
--sidebar-item-radius: var(--radius-md);
--sidebar-item-padding-x: var(--space-3);
--sidebar-item-padding-y: var(--space-2);

/* Table */
--table-header-background: var(--surface-2);
--table-row-hover: var(--interactive-hover);
--table-border: var(--border-default);
--table-cell-padding-x: var(--space-4);
--table-cell-padding-y: var(--space-3);

/* Modal */
--modal-background: var(--surface-1);
--modal-overlay: rgb(0 0 0 / 0.5);
--modal-radius: var(--radius-lg);
--modal-shadow: var(--shadow-xl);
--modal-padding: var(--space-6);
```

**Test na voltooiing:**
```bash
# Volledige test suite
cd ~/genx/v6/dev/kanbu/apps/web
pnpm build  # Moet zonder errors bouwen
```

**Commit message:**
```
feat(design-system): Add component tokens for card, button, input, page, sidebar
```

---

### Fase 1.6: Tailwind Config Update

**Status:** [ ] Niet gestart

**Wat:** Tailwind config aanpassen om tokens te gebruiken.

**Bestanden:**
- `apps/web/tailwind.config.ts`

**Taken:**
- [ ] Custom colors toevoegen
- [ ] Custom spacing toevoegen
- [ ] Custom border-radius toevoegen
- [ ] Custom font-sizes toevoegen

**BACKUP EERST:**
```bash
cp apps/web/tailwind.config.ts apps/web/tailwind.config.ts.backup
```

**Code wijzigingen:**
```typescript
// tailwind.config.ts - extend theme section

export default {
  theme: {
    extend: {
      colors: {
        // Semantic colors mapped to CSS vars
        surface: {
          DEFAULT: 'hsl(var(--surface-1))',
          '1': 'hsl(var(--surface-1))',
          '2': 'hsl(var(--surface-2))',
          '3': 'hsl(var(--surface-3))',
          elevated: 'hsl(var(--surface-elevated))',
        },
        'text-color': {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
          muted: 'hsl(var(--text-muted))',
        },
      },
      borderRadius: {
        'card': 'var(--card-radius)',
        'button': 'var(--button-radius)',
        'input': 'var(--input-radius)',
      },
      padding: {
        'card': 'var(--card-padding)',
        'card-sm': 'var(--card-padding-sm)',
        'card-lg': 'var(--card-padding-lg)',
      },
      fontSize: {
        'page-title': ['var(--page-title-size)', { fontWeight: 'var(--page-title-weight)' }],
        'page-title-lg': ['var(--page-title-size-lg)', { fontWeight: 'var(--page-title-weight-lg)' }],
        'section-title': ['var(--section-title-size)', { fontWeight: 'var(--section-title-weight)' }],
      },
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
      maxWidth: {
        'page': 'var(--page-max-width)',
        'page-narrow': 'var(--page-max-width-narrow)',
      },
    },
  },
}
```

**Test na voltooiing:**
```bash
# Rebuild met nieuwe config
cd ~/genx/v6/dev/kanbu/apps/web
pnpm build

# Als errors, rollback:
# mv tailwind.config.ts.backup tailwind.config.ts
```

**Commit message:**
```
feat(design-system): Update Tailwind config to use CSS custom properties
```

---

### Fase 1.7: Design Tokens TypeScript Update

**Status:** [ ] Niet gestart

**Wat:** design-tokens.ts updaten met nieuwe tokens.

**Bestanden:**
- `apps/web/src/lib/design-tokens.ts`

**Taken:**
- [ ] TypeScript types toevoegen voor tokens
- [ ] Helper functies updaten
- [ ] Documentatie toevoegen

**Commit message:**
```
feat(design-system): Update TypeScript design tokens with full token set
```

---

### Fase 1: Acceptance Test

**Voer uit na alle sub-fases:**

```bash
# 1. Build test
cd ~/genx/v6/dev/kanbu/apps/web
pnpm build
# MOET: Geen errors

# 2. Dev server test
pnpm dev
# MOET: Applicatie start
# MOET: Geen console errors

# 3. Visual test - Light mode
# Open http://localhost:5173
# MOET: Alle pagina's zien er hetzelfde uit als voor

# 4. Visual test - Dark mode
# Toggle dark mode
# MOET: Alle pagina's zien er hetzelfde uit als voor

# 5. CSS Variables test (browser console)
getComputedStyle(document.documentElement).getPropertyValue('--color-gray-500')
# MOET: Een waarde teruggeven

getComputedStyle(document.documentElement).getPropertyValue('--card-radius')
# MOET: Een waarde teruggeven
```

**Fase 1 is VOLTOOID wanneer:**
- [ ] Alle sub-fases zijn afgerond
- [ ] Build slaagt zonder errors
- [ ] App werkt in light en dark mode
- [ ] Geen visuele regressies
- [ ] Alle tokens beschikbaar in browser

---

## FASE 2: Component Migration

**Doel:** Alle componenten migreren naar design tokens.

**Start datum:** [Nog niet gestart]
**Status:** [ ] Niet gestart

### Pre-flight Checks Fase 2

```bash
# Controleer dat Fase 1 compleet is
# Alle tokens moeten beschikbaar zijn

# Test token availability
cd ~/genx/v6/dev/kanbu/apps/web
pnpm dev &
# In browser console:
# getComputedStyle(document.documentElement).getPropertyValue('--page-title-size')
# Moet een waarde teruggeven
```

---

### Fase 2.1: Page Headers Migration

**Status:** [ ] Niet gestart

**Wat:** Alle h1 pagina titels standaardiseren.

**Scope:**
- ~35 pagina's met h1 titels
- Standaardiseer naar 2 varianten:
  - Main pages: `text-page-title-lg` (text-3xl font-bold)
  - Sub pages: `text-page-title` (text-2xl font-semibold)

**Context Gathering:**
```bash
# Vind alle h1 elementen
grep -rn "<h1 className" apps/web/src/pages/
```

**Migratie Pattern:**
```tsx
// VOOR
<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">

// NA (optie 1 - Tailwind custom class)
<h1 className="text-page-title text-text-color-primary">

// NA (optie 2 - Direct CSS vars, als Tailwind niet werkt)
<h1 className="text-[length:var(--page-title-size)] font-[number:var(--page-title-weight)] text-foreground">
```

**Bestanden te wijzigen:**
1. [ ] SprintPlanning.tsx
2. [ ] AnalyticsDashboard.tsx
3. [ ] ImportExport.tsx
4. [ ] AcceptInvite.tsx
5. [ ] WebhookSettings.tsx
6. [ ] ApiSettings.tsx
7. [ ] NotificationSettings.tsx
8. [ ] SprintBurndown.tsx
9. [ ] MyTasks.tsx
10. [ ] MySubtasks.tsx
11. [ ] SprintBoard.tsx
12. [ ] ProjectDetailsPage.tsx
13. [ ] GitHubProjectSettings.tsx
14. [ ] MilestoneView.tsx

**Test per bestand:**
```bash
# Na elke wijziging
# 1. Save file
# 2. Check hot reload in browser
# 3. Vergelijk met screenshot/geheugen
# 4. Check dark mode
```

**Commit na elke 3-5 bestanden:**
```
refactor(design-system): Migrate page headers to design tokens (batch N)
```

---

### Fase 2.2: Card Components Migration

**Status:** [ ] Niet gestart

**Wat:** Alle card/panel styling standaardiseren.

**Scope:**
- ~100 card instances
- Standaardiseer naar token-based styling

**Context Gathering:**
```bash
# Vind alle card patterns
grep -rn "bg-white dark:bg-gray-800 rounded-lg" apps/web/src/
grep -rn "bg-card" apps/web/src/
```

**Migratie Pattern:**
```tsx
// VOOR
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">

// NA
<div className="bg-card rounded-card border border-border p-card">
```

*[Verdere sub-fases volgen hetzelfde patroon...]*

---

### Fase 2.3: Form Elements Migration

**Status:** [ ] Niet gestart

### Fase 2.4: Button Styles Migration

**Status:** [ ] Niet gestart

### Fase 2.5: Sidebar Components Migration

**Status:** [ ] Niet gestart

### Fase 2.6: Table Styles Migration

**Status:** [ ] Niet gestart

### Fase 2.7: Modal/Dialog Migration

**Status:** [ ] Niet gestart

---

### Fase 2: Acceptance Test

```bash
# 1. Full build
pnpm build

# 2. Visual regression check
# Vergelijk screenshots van VOOR migratie met NA

# 3. Token usage audit
grep -rn "text-gray-900 dark:text-white" apps/web/src/
# MOET: Significant minder dan voor Fase 2

grep -rn "bg-white dark:bg-gray-800" apps/web/src/
# MOET: Significant minder dan voor Fase 2
```

**Fase 2 is VOLTOOID wanneer:**
- [ ] Alle sub-fases zijn afgerond
- [ ] >80% van hardcoded kleuren verwijderd
- [ ] Geen visuele regressies
- [ ] Dark mode werkt correct

---

## FASE 3: Theme System

**Doel:** Themes kunnen wisselen (kleuren + stijl).

**Start datum:** [Nog niet gestart]
**Status:** [ ] Niet gestart

*[Details worden toegevoegd wanneer Fase 2 compleet is]*

---

## FASE 4: Advanced Theming

**Doel:** Stijl en layout aanpasbaar maken.

**Start datum:** [Nog niet gestart]
**Status:** [ ] Niet gestart

*[Details worden toegevoegd wanneer Fase 3 compleet is]*

---

## Appendix: Veiligheidsprotocol

### Voor Elke Wijziging

1. **Backup maken (bij grote wijzigingen)**
   ```bash
   cp bestand.tsx bestand.tsx.backup
   ```

2. **Kleine commits**
   - Max 5 bestanden per commit
   - Beschrijvende commit messages

3. **Test na elke wijziging**
   - Hot reload checken
   - Dark mode checken
   - Console errors checken

### Bij Problemen

1. **Build faalt:**
   ```bash
   # Check error message
   # Fix of rollback:
   git checkout -- pad/naar/bestand.tsx
   ```

2. **Visuele regressie:**
   ```bash
   # Vergelijk met origineel
   git diff pad/naar/bestand.tsx
   # Rollback indien nodig
   git checkout -- pad/naar/bestand.tsx
   ```

3. **CSS niet geladen:**
   ```bash
   # Hard refresh in browser (Cmd+Shift+R)
   # Restart dev server
   ```

### Rollback Procedure

```bash
# Laatste commit ongedaan maken (NIET gepusht)
git reset --soft HEAD~1

# Specifiek bestand terugzetten
git checkout -- pad/naar/bestand.tsx

# Alle uncommitted changes wegggooien
git checkout -- .
```

---

## Appendix: Quick Reference

### Token Naming Convention

```
--{category}-{element}-{property}-{variant}

Voorbeelden:
--color-gray-500           # Primitive
--text-primary             # Semantic
--card-radius              # Component
--button-padding-x-sm      # Component variant
```

### Commit Message Format

```
<type>(design-system): <description>

Types:
- feat: Nieuwe tokens/features
- refactor: Migratie naar tokens
- fix: Bug fixes
- docs: Documentatie
```

---

*Document versie: 1.0.0*
*Laatst bijgewerkt: 2026-01-15*
