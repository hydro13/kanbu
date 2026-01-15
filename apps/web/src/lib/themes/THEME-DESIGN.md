# Kanbu Theme System - Design Document

## Design Principes

### 1. Neutraliteit als Basis
- **Achtergronden**: Altijd neutraal (grijs/wit tonen)
- **Tekst**: Hoog contrast, leesbaar
- **Borders**: Subtiel, niet afleidend
- **Één accent kleur**: De enige "kleur" in de UI

### 2. Professionele Kleurtheorie
- **60-30-10 Regel**: 60% neutraal, 30% secondary, 10% accent
- **Geen competing colors**: Eén primary accent, geen secundaire kleuren
- **Semantische kleuren blijven vast**: Success=groen, Error=rood, Warning=amber

### 3. Toegankelijkheid (WCAG AA)
- Minimum contrast ratio 4.5:1 voor tekst
- Minimum contrast ratio 3:1 voor UI elementen
- Focus states altijd zichtbaar

---

## Theme Structuur

### Base Themes (Mode)
| Theme | Beschrijving |
|-------|--------------|
| Light | Witte achtergrond, donkere tekst |
| Dark | Donkere achtergrond, lichte tekst |

### Accent Colors (6 professionele opties)
| Naam | Hex | Gebruik |
|------|-----|---------|
| **Slate** | `#475569` | Neutraal, zakelijk (default) |
| **Blue** | `#2563eb` | Vertrouwen, technologie |
| **Teal** | `#0d9488` | Fris, modern |
| **Violet** | `#7c3aed` | Creatief, premium |
| **Rose** | `#e11d48` | Energie, urgentie |
| **Amber** | `#d97706` | Warm, vriendelijk |

### High Contrast Mode (Accessibility)
- Verhoogde contrast ratios
- Dikkere borders
- Geen transparanties

---

## Wat NIET verandert per theme

De volgende kleuren zijn **semantisch** en veranderen NIET:

```
Success: green-500/600
Error: red-500/600
Warning: amber-500/600
Info: blue-500/600 (of primary als primary niet blue is)
```

---

## Implementatie Strategie

### CSS Custom Properties Structuur

```css
:root {
  /* Base neutrals - NOOIT wijzigen per accent */
  --color-background: 0 0% 100%;
  --color-foreground: 222 47% 11%;
  --color-muted: 210 40% 96%;
  --color-border: 214 32% 91%;

  /* Primary accent - WEL wijzigen per accent */
  --color-primary: 221 83% 53%;      /* Blue default */
  --color-primary-foreground: 0 0% 100%;

  /* Ring/focus - volgt primary */
  --color-ring: 221 83% 53%;
}

.dark {
  /* Donkere neutrals */
  --color-background: 222 47% 11%;
  --color-foreground: 210 40% 98%;
  /* ... primary blijft hetzelfde ... */
}

/* Accent variant: Teal */
[data-accent="teal"] {
  --color-primary: 166 76% 32%;
  --color-ring: 166 76% 32%;
}
```

### Data Attributes
- `data-theme="light|dark"` - Op <html>
- `data-accent="slate|blue|teal|violet|rose|amber"` - Op <html>
- `data-contrast="normal|high"` - Op <html> (optioneel)

---

## Visueel Voorbeeld

### Light + Blue (Default)
```
┌─────────────────────────────────────┐
│ ████ Header          [🔵 Action]    │  <- Blue accent
├─────────────────────────────────────┤
│                                     │
│  Card Title                         │  <- Neutral text
│  ─────────────────────────          │  <- Subtle border
│  Content hier...                    │
│                                     │
│  [🔵 Primary] [○ Secondary]         │  <- Blue primary, gray secondary
│                                     │
└─────────────────────────────────────┘
   Background: white
   Text: slate-900
   Accent: blue-600
```

### Dark + Teal
```
┌─────────────────────────────────────┐
│ ████ Header          [🟢 Action]    │  <- Teal accent
├─────────────────────────────────────┤
│                                     │
│  Card Title                         │  <- Light text on dark
│  ─────────────────────────          │  <- Subtle border
│  Content hier...                    │
│                                     │
│  [🟢 Primary] [○ Secondary]         │  <- Teal primary, gray secondary
│                                     │
└─────────────────────────────────────┘
   Background: slate-900
   Text: slate-100
   Accent: teal-500
```

---

## Gebruiker Flow

1. **Theme Settings pagina** (/profile/edit)
   - Mode toggle: Light / Dark / System
   - Accent picker: 6 opties met preview
   - (Optioneel) High contrast toggle

2. **Quick toggle in header**
   - Alleen light/dark mode switch
   - Accent wijzigen via settings

---

## Files to Create/Modify

1. `src/lib/themes/accents.ts` - Accent color definitions
2. `src/lib/themes/index.ts` - Theme utilities
3. `src/styles/themes/` - CSS voor elke accent variant
4. Update `globals.css` - Base theme structure
5. Update `ThemeContext.tsx` - Add accent support
6. Update `EditProfile.tsx` - Accent picker UI
