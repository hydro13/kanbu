# UI Development Guide - Kanbu Design System

**Versie:** 2.0.0
**Status:** VERPLICHT voor alle UI werk
**Laatste update:** 2026-01-16

---

## Quick Start (5 minuten)

### De Gouden Regel

```
NOOIT hardcoded kleuren gebruiken!
```

**FOUT:**
```tsx
<div className="bg-gray-100 text-gray-900 border-gray-200">
<span className="text-blue-500">
<button className="bg-slate-800 hover:bg-slate-700">
```

**GOED:**
```tsx
<div className="bg-surface-1 text-foreground border-border">
<span className="text-primary">
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
```

### Waarom?

- **Dark mode** werkt automatisch met tokens
- **Accent colors** (6 keuzes) werken automatisch
- **Consistentie** door heel de applicatie
- **Toegankelijkheid** is ingebouwd

---

## Token Cheat Sheet

### Achtergrond Kleuren

| Token | Gebruik | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `bg-background` | Pagina achtergrond | wit | donkergrijs |
| `bg-surface-1` | Cards, eerste laag | lichtgrijs | donkergrijs |
| `bg-surface-2` | Nested elementen | iets donkerder | iets lichter |
| `bg-surface-3` | Diepste nesting | nog donkerder | nog lichter |
| `bg-muted` | Subtiele achtergrond | grijs | donkergrijs |
| `bg-primary` | Primaire actie buttons | accent kleur | accent kleur |
| `bg-secondary` | Secundaire elementen | lichtgrijs | donkergrijs |
| `bg-destructive` | Danger/delete acties | rood | rood |

### Tekst Kleuren

| Token | Gebruik |
|-------|---------|
| `text-foreground` | Primaire tekst |
| `text-muted-foreground` | Secundaire/subtiele tekst |
| `text-primary` | Accent gekleurde tekst |
| `text-primary-foreground` | Tekst op primary achtergrond |
| `text-destructive` | Error/danger tekst |

### Border Kleuren

| Token | Gebruik |
|-------|---------|
| `border-border` | Standaard borders |
| `border-input` | Form input borders |
| `border-primary` | Accent borders |
| `border-destructive` | Error borders |

### State Kleuren

| Token | Gebruik |
|-------|---------|
| `bg-success`, `text-success` | Geslaagd, voltooid |
| `bg-warning`, `text-warning` | Waarschuwing |
| `bg-error`, `text-error` | Fouten |
| `bg-info`, `text-info` | Informatie |

### Priority Kleuren (Tasks)

| Token | Priority |
|-------|----------|
| `bg-priority-low`, `text-priority-low` | LOW |
| `bg-priority-medium`, `text-priority-medium` | MEDIUM |
| `bg-priority-high`, `text-priority-high` | HIGH |
| `bg-priority-urgent`, `text-priority-urgent` | URGENT |

---

## Component Patronen

### Card Component

```tsx
<div className="bg-surface-1 border border-border rounded-lg p-4 shadow-sm">
  <h3 className="text-foreground font-medium">Titel</h3>
  <p className="text-muted-foreground text-sm">Beschrijving</p>
</div>
```

### Button Varianten

```tsx
// Primary (hoofdactie)
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Opslaan
</Button>

// Secondary
<Button variant="secondary" className="bg-secondary text-secondary-foreground">
  Annuleren
</Button>

// Destructive
<Button variant="destructive" className="bg-destructive text-destructive-foreground">
  Verwijderen
</Button>

// Ghost (subtiel)
<Button variant="ghost" className="hover:bg-accent hover:text-accent-foreground">
  Meer opties
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
  <p className="text-muted-foreground text-sm">Hulptekst</p>
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
  <td className="text-foreground py-3 px-4">Primaire data</td>
  <td className="text-muted-foreground py-3 px-4">Secundaire data</td>
</tr>
```

### Modal/Dialog

```tsx
<Dialog>
  <DialogContent className="bg-surface-1 border-border">
    <DialogHeader>
      <DialogTitle className="text-foreground">Titel</DialogTitle>
      <DialogDescription className="text-muted-foreground">
        Beschrijving
      </DialogDescription>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button variant="secondary">Annuleren</Button>
      <Button>Bevestigen</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sidebar Item

```tsx
<button className={cn(
  "flex items-center gap-3 px-3 py-2 rounded-md w-full",
  "text-muted-foreground hover:text-foreground",
  "hover:bg-accent transition-colors",
  isActive && "bg-accent text-foreground font-medium"
)}>
  <Icon className="h-4 w-4" />
  <span>Menu Item</span>
</button>
```

---

## Do's and Don'ts

### DO: Gebruik Semantic Tokens

```tsx
// GOED - semantic meaning
className="bg-surface-1 text-foreground border-border"
className="bg-destructive text-destructive-foreground"
className="text-muted-foreground"
```

### DON'T: Hardcoded Kleuren

```tsx
// FOUT - hardcoded kleuren
className="bg-gray-100 text-gray-900 border-gray-200"
className="bg-red-500 text-white"
className="text-gray-500"
```

### DO: Gebruik State Tokens

```tsx
// GOED - state tokens
className="bg-success text-success-foreground"  // completed
className="bg-warning text-warning-foreground"  // pending
className="bg-error text-error-foreground"      // failed
```

### DON'T: Hardcoded State Kleuren

```tsx
// FOUT - hardcoded state kleuren
className="bg-green-500"   // completed
className="bg-yellow-500"  // pending
className="bg-red-500"     // failed
```

### DO: Hover/Focus States

```tsx
// GOED - consistente interactie states
className="hover:bg-accent focus:ring-2 focus:ring-ring"
className="hover:bg-primary/90 active:bg-primary/80"
```

### DON'T: Hardcoded Hover States

```tsx
// FOUT - hardcoded hover
className="hover:bg-gray-200"
className="hover:bg-blue-600"
```

### DO: Opacity voor Variaties

```tsx
// GOED - gebruik opacity voor lichtere varianten
className="bg-primary/10 text-primary"      // lichte achtergrond
className="bg-destructive/10 text-destructive"
className="border-primary/50"               // subtiele border
```

### DON'T: Aparte Kleur Shades

```tsx
// FOUT - hardcoded shades
className="bg-blue-100 text-blue-700"
className="bg-red-50 text-red-600"
```

---

## Pre-Commit Checklist

Voer deze commando's uit VOORDAT je commit om hardcoded kleuren te vinden:

### Check voor Hardcoded Background Colors

```bash
cd apps/web/src
grep -rn "bg-\(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-[0-9]" --include="*.tsx" --include="*.ts"
```

### Check voor Hardcoded Text Colors

```bash
grep -rn "text-\(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-[0-9]" --include="*.tsx" --include="*.ts"
```

### Check voor Hardcoded Border Colors

```bash
grep -rn "border-\(gray\|slate\|zinc\|neutral\|stone\|red\|orange\|amber\|yellow\|lime\|green\|emerald\|teal\|cyan\|sky\|blue\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-[0-9]" --include="*.tsx" --include="*.ts"
```

### Verwachte Output

De output moet **LEEG** zijn, of alleen false positives bevatten (bijv. in comments of disabled code).

Als er matches zijn: **VERVANG** ze met de juiste tokens uit de cheat sheet hierboven.

---

## Design Token Locaties

| Bestand | Inhoud |
|---------|--------|
| `styles/globals.css` | Alle CSS custom properties (design tokens) |
| `styles/accents.css` | Accent color overrides |
| `lib/design-tokens.ts` | TypeScript token definities |
| `tailwind.config.js` | Tailwind integratie met tokens |

### Token Structuur (globals.css)

```css
:root {
  /* Primitive Colors - NIET direct gebruiken */
  --gray-50: ...;
  --gray-100: ...;

  /* Semantic Colors - GEBRUIK DEZE */
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

## Nieuwe Componenten Maken

### Stap 1: Check bestaande componenten

Voordat je een nieuw component maakt, check of er al iets vergelijkbaars bestaat:

```bash
# Zoek in ui/ directory
ls apps/web/src/components/ui/

# Zoek specifiek component
grep -rn "ComponentNaam" apps/web/src/components/
```

### Stap 2: Gebruik shadcn/ui als basis

Kanbu gebruikt shadcn/ui. Check eerst of het component daar beschikbaar is:
- https://ui.shadcn.com/docs/components

### Stap 3: Token-first approach

Begin ALTIJD met tokens:

```tsx
// Stap 1: Definieer de basis met tokens
const baseStyles = "bg-surface-1 text-foreground border-border rounded-lg";

// Stap 2: Voeg interactie states toe
const interactiveStyles = "hover:bg-accent focus:ring-2 focus:ring-ring";

// Stap 3: Combineer met variants
const variants = {
  default: "bg-surface-1",
  primary: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};
```

### Stap 4: Test beide themes

**ALTIJD** testen in:
1. Light mode
2. Dark mode
3. Alle 6 accent colors (indien relevant)

---

## Veelgemaakte Fouten

### Fout 1: "Het werkt in light mode"

```tsx
// FOUT - ziet er goed uit in light, onleesbaar in dark
<div className="bg-white text-black">

// GOED - werkt in beide modes
<div className="bg-background text-foreground">
```

### Fout 2: Inline hex/rgb kleuren

```tsx
// FOUT - inline kleuren
<div style={{ backgroundColor: '#f3f4f6', color: '#111827' }}>

// GOED - CSS variables als nodig
<div style={{ backgroundColor: 'var(--surface-1)', color: 'var(--foreground)' }}>

// BEST - Tailwind classes
<div className="bg-surface-1 text-foreground">
```

### Fout 3: Kleur in component props

```tsx
// FOUT - hardcoded kleur als prop
<Icon color="#3b82f6" />
<Badge color="blue" />

// GOED - semantic meaning
<Icon className="text-primary" />
<Badge variant="primary" />
```

### Fout 4: Vergeten van hover states

```tsx
// FOUT - geen hover feedback
<button className="bg-primary text-white">Click</button>

// GOED - duidelijke hover feedback
<button className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
  Click
</button>
```

---

## Quick Reference Card

Print deze uit of houd open tijdens development:

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

INTERACTIE
─────────────────────────────────────────────────────
hover:bg-accent      focus:ring-ring
hover:bg-primary/90  active:bg-primary/80
hover:text-foreground transition-colors
```

---

## Hulp Nodig?

### Documentatie

- Design System Architectuur: `docs/UI-Design-Kanbu/05-DESIGN-SYSTEM-ARCHITECTURE.md`
- Token Definities: `apps/web/src/styles/globals.css`
- Component Audit: `docs/UI-Design-Kanbu/03-COMPONENT-AUDIT.md`

### Bij Twijfel

1. Check globals.css voor beschikbare tokens
2. Kijk naar bestaande componenten voor patronen
3. Test in dark mode VOORDAT je commit
4. Vraag de gebruiker bij onduidelijkheid

---

*Document versie: 2.0.0*
*Laatst bijgewerkt: 2026-01-16*
