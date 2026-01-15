# Kanbu Kleur Audit

**Datum:** 2026-01-15
**Status:** Complete

---

## Kritieke Bevinding: Kleur Inconsistentie

### Statistieken

| Type | Aantal | Percentage |
|------|--------|------------|
| Hardcoded Tailwind bg-kleuren | 1,443 | ~64% |
| Hardcoded Tailwind text-kleuren | 2,405 | ~75% |
| Design system kleuren (primary/secondary/etc) | 804 | ~25% |

**Conclusie:** ~75% van alle kleur classes gebruikt hardcoded Tailwind waarden in plaats van het design system.

---

## Priority Kleuren Inconsistentie

### Probleem
Priority kleuren zijn op **4+ verschillende plekken** gedefinieerd met **verschillende waarden**.

### Definitie 1: FilterBar.tsx & TaskCountWidget.tsx
```javascript
{ value: 0, label: 'Low', color: 'bg-gray-400' },
{ value: 1, label: 'Medium', color: 'bg-blue-500' },
{ value: 2, label: 'High', color: 'bg-orange-500' },    // ORANGE
{ value: 3, label: 'Urgent', color: 'bg-red-500' },
```

### Definitie 2: TaskRefPlugin.tsx (Editor)
```javascript
LOW: 'bg-slate-100 text-slate-600',
MEDIUM: 'bg-blue-100 text-blue-600',
HIGH: 'bg-orange-100 text-orange-600',    // ORANGE (lighter)
URGENT: 'bg-red-100 text-red-600',
```

### Definitie 3: CalendarView.tsx
```javascript
['bg-gray-100', 'bg-blue-100', 'bg-yellow-100', 'bg-red-100']
//                              ↑ YELLOW (niet orange!)
```

### Definitie 4: TimelineView.tsx
```javascript
['bg-gray-400', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500']
//                              ↑ YELLOW (niet orange!)
```

### Impact
- **High priority** is soms ORANJE, soms GEEL
- Gebruikers zien inconsistente kleuren afhankelijk van welke view ze gebruiken
- Dit ondermijnt de betrouwbaarheid van visuele prioriteit-indicatoren

---

## Design System Kleuren (Huidige Staat)

### CSS Variables (globals.css)

**Light Mode:**
| Token | HSL Waarde | Kleur |
|-------|------------|-------|
| `--background` | 0 0% 100% | Wit |
| `--foreground` | 222.2 84% 4.9% | Bijna zwart |
| `--primary` | 222.2 47.4% 11.2% | Donkerblauw |
| `--secondary` | 210 40% 96.1% | Lichtgrijs |
| `--muted` | 210 40% 96.1% | Lichtgrijs (=secondary) |
| `--accent` | 210 40% 96.1% | Lichtgrijs (=secondary) |
| `--destructive` | 0 84.2% 60.2% | Rood |

**Probleem:** `secondary`, `muted`, en `accent` hebben DEZELFDE waarde.

### Ontbrekende Tokens
- `--success` (voor positieve acties, completed states)
- `--warning` (voor high priority, deadlines)
- `--info` (voor informatieve berichten)
- `--urgent` (voor critical items)

---

## Hardcoded Kleur Patronen

### Meest Gebruikte Hardcoded Kleuren

**Grijs (structuur, borders, achtergronden):**
- `gray-100`, `gray-200`, `gray-300` (light backgrounds)
- `gray-700`, `gray-800`, `gray-900` (dark mode equivalents)

**Blauw (primary actions, links):**
- `blue-500`, `blue-600` (buttons, links)
- `blue-100`, `blue-900/30` (highlights)

**Rood (destructive, urgent):**
- `red-500`, `red-600` (errors, urgent)
- `red-100` (light backgrounds)

**Groen (success):**
- `green-500`, `green-600` (completed, success)
- `green-100` (light backgrounds)

**Oranje/Geel (warnings, high priority):**
- `orange-500` (high priority - sommige views)
- `yellow-500` (high priority - andere views)

---

## Aanbevelingen

### 1. Centraliseer Priority Kleuren
Creëer één bron van waarheid:
```typescript
// lib/colors.ts
export const PRIORITY_COLORS = {
  LOW: { bg: 'bg-slate-100', text: 'text-slate-600', solid: 'bg-slate-400' },
  MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-600', solid: 'bg-blue-500' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-600', solid: 'bg-orange-500' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-600', solid: 'bg-red-500' },
}
```

### 2. Voeg Ontbrekende CSS Tokens Toe
```css
:root {
  --success: 142.1 76.2% 36.3%;        /* groen */
  --success-foreground: 355.7 100% 97.3%;
  --warning: 32.1 94.6% 43.7%;         /* oranje */
  --warning-foreground: 26 83.3% 14.1%;
  --info: 221.2 83.2% 53.3%;           /* blauw */
  --info-foreground: 210 40% 98%;
}
```

### 3. Migreer Hardcoded Kleuren
Fase 1: Priority kleuren (hoogste impact)
Fase 2: Status kleuren (success, error, warning)
Fase 3: Structurele kleuren (gray-* naar muted/secondary)

---

## Volgende Stappen

1. [ ] Creëer `lib/colors.ts` met gecentraliseerde kleur definities
2. [ ] Update alle priority kleur referenties
3. [ ] Voeg ontbrekende CSS tokens toe aan globals.css
4. [ ] Migreer high-impact hardcoded kleuren
