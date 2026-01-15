# Kanbu Kleur Audit

**Datum:** 2026-01-15
**Versie:** 2.0.0
**Status:** ✅ Alle Problemen Opgelost

---

## Samenvatting: Alle Issues Opgelost

Dit document beschrijft de **historische** kleurproblemen die zijn geïdentificeerd tijdens de design audit. **Alle genoemde problemen zijn opgelost** in het Design System v2.0.0 implementatie.

| Probleem | Status | Oplossing |
|----------|--------|-----------|
| Hardcoded kleuren (75%) | ✅ Opgelost | 100% gemigreerd naar design tokens |
| Priority kleuren inconsistent | ✅ Opgelost | Semantic tokens: `--priority-*` |
| Ontbrekende tokens | ✅ Opgelost | success, warning, error, info toegevoegd |

---

## Historisch: Originele Bevindingen

### Statistieken (VOOR migratie)

| Type | Aantal | Percentage |
|------|--------|------------|
| Hardcoded Tailwind bg-kleuren | 1,443 | ~64% |
| Hardcoded Tailwind text-kleuren | 2,405 | ~75% |
| Design system kleuren | 804 | ~25% |

### Statistieken (NA migratie - Fase 2)

| Type | Aantal | Percentage |
|------|--------|------------|
| Hardcoded Tailwind kleuren | 0 | 0% |
| Design system kleuren | 100% | 100% |

---

## ~~Priority Kleuren Inconsistentie~~ ✅ OPGELOST

### Was Het Probleem

Priority kleuren waren op **4+ verschillende plekken** gedefinieerd met **verschillende waarden**:
- FilterBar.tsx → `bg-orange-500` voor HIGH
- CalendarView.tsx → `bg-yellow-500` voor HIGH
- TimelineView.tsx → `bg-yellow-500` voor HIGH

### Huidige Oplossing

Alle priority kleuren zijn nu gecentraliseerd als semantic tokens in `globals.css`:

```css
/* Priority Colors (globals.css v2.0.0) */
--priority-low: var(--color-gray-400);
--priority-medium: var(--color-blue-500);
--priority-high: var(--color-orange-500);     /* Consistent ORANGE */
--priority-urgent: var(--color-red-500);

/* With light variants for backgrounds */
--priority-low-light: var(--color-gray-100);
--priority-medium-light: var(--color-blue-100);
--priority-high-light: var(--color-orange-100);
--priority-urgent-light: var(--color-red-100);
```

Alle componenten gebruiken nu dezelfde bron:
- `lib/design-tokens.ts` voor TypeScript constants
- `globals.css` voor CSS custom properties

---

## ~~Ontbrekende Design Tokens~~ ✅ OPGELOST

### Was Het Probleem

Het oorspronkelijke design system miste:
- `--success` (voor positieve acties, completed states)
- `--warning` (voor high priority, deadlines)
- `--info` (voor informatieve berichten)

### Huidige Oplossing

Volledige state color set in `globals.css`:

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

## Huidige Token Architectuur

### 1. Primitive Color Tokens

10 complete kleurschalen (50-950):
- Gray, Blue, Orange, Red, Green, Amber
- **Nieuw:** Teal, Violet, Rose, Cyan

### 2. Semantic Tokens

Betekenisvolle kleurnamen die naar primitives verwijzen:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--background` | white | gray-950 |
| `--foreground` | gray-900 | gray-50 |
| `--surface-1` | white | gray-900 |
| `--surface-2` | gray-50 | gray-800 |
| `--surface-3` | gray-100 | gray-700 |
| `--border` | gray-200 | gray-700 |
| `--muted` | gray-100 | gray-800 |

### 3. Component Tokens

Specifieke tokens per component:

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

## Tailwind Integratie

Alle kleuren zijn beschikbaar via Tailwind classes:

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

## Voltooide Stappen

- [x] Creëer gecentraliseerde kleur definities (`lib/design-tokens.ts`)
- [x] Update alle priority kleur referenties
- [x] Voeg success/warning/error/info tokens toe aan `globals.css`
- [x] Migreer 100% hardcoded kleuren
- [x] Test light/dark mode consistency
- [x] Update Tailwind config voor semantic colors

---

## Referentie: Key Files

| Bestand | Functie |
|---------|---------|
| `apps/web/src/styles/globals.css` | CSS custom properties (v2.0.0) |
| `apps/web/src/lib/design-tokens.ts` | TypeScript token constants |
| `apps/web/tailwind.config.js` | Tailwind integratie |
| `apps/web/src/styles/accents.css` | Accent color overrides |

---

*Document versie: 2.0.0*
*Laatst bijgewerkt: 2026-01-15*
