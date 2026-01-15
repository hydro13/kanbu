# Kanbu Design Audit - Samenvatting

**Datum:** 2026-01-15
**Auditor:** Claude Code (Opus 4.5)
**Versie:** 1.1 (Wiki toegevoegd)

---

## Executive Summary

Kanbu is een **functioneel sterke** applicatie met:
- **60+ routes**
- **85,000+ regels** frontend code (30,887 pages + 46,565 components + 8,902 wiki)
- **20+ component directories**
- **Uitgebreid Wiki systeem** met AI-integratie

De basis is solide (React, TypeScript, TailwindCSS, shadcn/ui), maar er zijn significante **consistentie-problemen** die de gebruikerservaring en onderhoudbaarheid beïnvloeden.

### Kritieke Bevindingen

| Prioriteit | Probleem | Impact |
|------------|----------|--------|
| 🔴 Hoog | Priority kleuren inconsistent (oranje vs geel) | Gebruikers vertrouwen visuele cues niet |
| 🔴 Hoog | 75% hardcoded kleuren (niet design system) | Theming onmogelijk, inconsistente look |
| 🟠 Medium | 7 verschillende sidebar implementaties | Code duplicatie, visuele inconsistentie |
| 🟠 Medium | Custom SVG icons naast lucide-react | Inconsistente icon stijl |
| 🟡 Laag | Grote componenten (>500 regels) | Onderhoudslast |

---

## Gedetailleerde Rapporten

| Document | Inhoud |
|----------|--------|
| [01-INVENTORY.md](./01-INVENTORY.md) | Routes, pagina's, tech stack |
| [02-COLOR-AUDIT.md](./02-COLOR-AUDIT.md) | Kleur inconsistenties, CSS tokens |
| [03-COMPONENT-AUDIT.md](./03-COMPONENT-AUDIT.md) | Component analyse, sidebars, layouts |
| [04-UI-PATTERN-LIBRARY.md](./04-UI-PATTERN-LIBRARY.md) | **Volledige inventarisatie** van alle UI patronen |
| [05-DESIGN-SYSTEM-ARCHITECTURE.md](./05-DESIGN-SYSTEM-ARCHITECTURE.md) | **Architectuur plan** voor themeable design system |
| [06-DESIGN-SYSTEM-ROADMAP.md](./06-DESIGN-SYSTEM-ROADMAP.md) | **Implementatie roadmap** met progress tracking |

---

## Top 5 Problemen

### 1. Priority Kleuren Inconsistentie 🔴

**Probleem:** "High" priority is ORANJE in sommige views, GEEL in andere.

**Locaties:**
- FilterBar.tsx, TaskCountWidget.tsx → `bg-orange-500`
- CalendarView.tsx, TimelineView.tsx → `bg-yellow-500`
- TaskRefPlugin.tsx → `bg-orange-100`

**Impact:** Gebruikers kunnen niet consistent op kleur vertrouwen om prioriteit te herkennen.

**Oplossing:** Centraliseer in `lib/colors.ts`

---

### 2. Hardcoded Kleuren (75%) 🔴

**Statistieken:**
- 1,443 `bg-[kleur]-[nummer]` classes
- 2,405 `text-[kleur]-[nummer]` classes
- Slechts 804 design system classes (`bg-primary`, etc.)

**Impact:**
- Dark mode kan inconsistent zijn
- Theming is onmogelijk
- Visuele chaos bij UI updates

**Oplossing:** Migreer naar CSS variabelen in fases

---

### 3. Sidebar Fragmentatie 🟠

**Huidige staat:** 7 verschillende sidebar componenten, elk met eigen implementatie.

| Sidebar | Icons | Drag & Drop | Collapse |
|---------|-------|-------------|----------|
| DashboardSidebar | lucide | ✅ | ✅ |
| ProjectSidebar | **custom SVG** | ❌ | ❌ |
| WorkspaceSidebar | lucide | ❌ | ❌ |
| AdminSidebar | lucide | ❌ | ❌ |
| ProfileSidebar | lucide | ❌ | ❌ |

**Impact:** Inconsistente UX per sectie van de app.

**Oplossing:** Creëer `SidebarBase` component

---

### 4. Icon Inconsistentie 🟠

**Probleem:** ProjectSidebar definieert 10+ custom SVG icons terwijl alle andere componenten lucide-react gebruiken.

**Impact:**
- Verschillende stroke widths
- Verschillende sizing
- ~100 regels onnodige code

**Oplossing:** Vervang custom icons door lucide equivalenten

---

### 5. Ontbrekende Design Tokens 🟡

**Huidige tokens:**
- primary, secondary, muted, accent, destructive

**Ontbrekend:**
- success (groen voor completed)
- warning (oranje voor deadlines)
- info (blauw voor notificaties)

**Impact:** Inconsistent gebruik van groen/oranje/blauw door de app.

---

## Verbeterplan

### Fase 1: Quick Wins (1-2 dagen)

| Taak | Bestanden | Impact |
|------|-----------|--------|
| Centraliseer priority kleuren | Nieuw: `lib/colors.ts` | Hoog |
| Update priority referenties | ~10 bestanden | Hoog |
| Voeg success/warning/info tokens toe | `globals.css` | Medium |

**Deliverable:** Consistente priority kleuren in alle views.

---

### Fase 2: Icon Standardisatie (1 dag)

| Taak | Bestanden |
|------|-----------|
| Vervang custom SVG icons in ProjectSidebar | `ProjectSidebar.tsx` |
| Audit andere custom icons | Codebase-wide |

**Deliverable:** Alle icons komen uit lucide-react.

---

### Fase 3: Sidebar Consolidatie (3-5 dagen)

| Taak | Complexiteit |
|------|--------------|
| Creëer `SidebarBase` component | Medium |
| Migreer DashboardSidebar | Laag |
| Migreer ProjectSidebar | Medium |
| Migreer overige sidebars | Laag |

**Deliverable:** Één sidebar basis met consistente UX.

---

### Fase 4: Kleur Migratie (5-10 dagen)

| Stap | Aanpak |
|------|--------|
| 1. Audit alle `gray-*` gebruik | Grep + document |
| 2. Creëer semantic tokens | `--surface-1`, `--surface-2`, etc. |
| 3. Migreer per component directory | Start met `ui/`, dan `board/` |
| 4. Test light/dark mode | Visuele QA |

**Deliverable:** Design system-compliant kleuren.

---

### Fase 5: Component Refactoring (Ongoing)

**Prioriteit componenten:**
1. WikiGraphView.tsx (2,177 regels)
2. FilterBar.tsx (688 regels)
3. ToolbarPlugin.tsx (681 regels)

**Aanpak per component:**
- Extract state naar custom hooks
- Split in presentatie sub-components
- Improve TypeScript types

---

## Aanbevolen Tooling

### Design Tokens
```bash
# Installeer style-dictionary voor token management
npm install style-dictionary --save-dev
```

### Lint Rules
```javascript
// eslint-plugin-tailwindcss kan hardcoded kleuren detecteren
{
  "rules": {
    "tailwindcss/no-arbitrary-value": "warn"
  }
}
```

### Storybook (Optioneel)
Voor component documentatie en visuele testing.

---

## Conclusie

Kanbu heeft een **sterke functionele basis** maar lijdt aan organische groei zonder strikte design system governance. De voorgestelde verbeteringen zijn:

1. **Laag risico** - Geen functionele wijzigingen
2. **Hoog rendement** - Significante UX verbetering
3. **Gefaseerd** - Kan incrementeel worden uitgevoerd

De priority kleur fix (Fase 1) kan vandaag nog worden geïmplementeerd en heeft directe gebruikersimpact.

---

## Volgende Stappen

1. [ ] Review dit rapport met stakeholder
2. [ ] Prioriteer fases
3. [ ] Start met Fase 1 (priority kleuren)
4. [ ] Plan Fase 2-5 in sprint backlog
