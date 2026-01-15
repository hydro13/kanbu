# Kanbu Design System Architecture

**Versie:** 2.0.0
**Datum:** 2026-01-15
**Status:** ✅ Geimplementeerd

---

## 1. Overzicht

Het Kanbu Design System v2.0.0 is een **volledig themeable design system** met:

1. **Theme Mode** - Light/dark/system met automatische detectie
2. **Accent Colors** - 6 professionele kleurschema's
3. **Backend Persistence** - Settings worden opgeslagen per gebruiker
4. **100% Design Tokens** - Geen hardcoded kleuren

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER PREFERENCES                          │
│            (database + localStorage fallback)                    │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      THEME CONFIGURATION                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Theme Mode │  │   Accent    │  │    High Contrast        │ │
│  │ light/dark/ │  │ slate/blue/ │  │    (accessibility)      │ │
│  │   system    │  │ teal/violet │  │                         │ │
│  │             │  │ rose/amber  │  │                         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DESIGN TOKENS                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │ Primitive  │  │  Semantic  │  │ Component  │  │ Animation│  │
│  │  Colors    │  │   Colors   │  │   Tokens   │  │  Tokens  │  │
│  │ 10 scales  │  │ surface,   │  │ badge,card │  │ duration │  │
│  │ (50-950)   │  │ text, etc  │  │ toast,tabs │  │ easing   │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                   TAILWIND CONFIG v2.0.0                         │
│           Volledig geintegreerd met CSS variables                │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    REACT COMPONENTS                              │
│         shadcn/ui + custom components met tokens                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Bestandsstructuur (Geimplementeerd)

```
apps/web/src/
├── styles/
│   ├── globals.css              # Design tokens v2.0.0 (HOOFDBESTAND)
│   └── accents.css              # Accent color overrides
├── contexts/
│   └── ThemeContext.tsx         # Theme state management + hook
├── components/
│   └── theme/
│       ├── index.ts             # Barrel exports
│       ├── ThemeProviderWithAuth.tsx  # Auth-aware theme provider
│       ├── ThemeSwitcher.tsx    # Light/dark/system toggle
│       └── AccentPicker.tsx     # Accent color selector UI
├── lib/
│   ├── design-tokens.ts         # TypeScript token definitions
│   └── themes/
│       └── accents.ts           # Accent definitions + helpers
└── tailwind.config.js           # Tailwind v2.0.0 integration
```

---

## 3. Design Token Hiërarchie

### 3.1 Token Lagen

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: PRIMITIVE TOKENS                                        │
│ Raw values without semantic meaning                              │
│ Example: --color-blue-500: 217 91% 60%                          │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: SEMANTIC TOKENS                                         │
│ Meaningful names that reference primitives                       │
│ Example: --success: var(--color-green-500)                      │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: COMPONENT TOKENS                                        │
│ Component-specific tokens for consistency                        │
│ Example: --badge-success-bg: hsl(var(--success) / 0.1)          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Geimplementeerde Token Categorieën

| Categorie | Tokens | Beschrijving |
|-----------|--------|--------------|
| **Color Scales** | 10 × 19 = 190 | Gray, Blue, Orange, Red, Green, Amber, Teal, Violet, Rose, Cyan (50-950) |
| **Typography** | 20+ | Font sizes, weights, line heights, letter spacing |
| **Spacing** | 20+ | Space scale (0-20), component padding |
| **Radius** | 10 | none, sm, default, md, lg, xl, 2xl, 3xl, full |
| **Shadows** | 10 | xs, sm, default, md, lg, xl, 2xl, inner, none |
| **Animation** | 14 | 8 durations + 6 easing functions |
| **Z-Index** | 11 | base(0) → max(9999) |
| **Focus** | 4 | ring-width, ring-offset, ring-color, ring-style |
| **State Colors** | 12 | success, warning, error, info (+ foreground + muted) |
| **Component** | 40+ | Badge, Avatar, Tooltip, Toast, Tabs, Dropdown, Modal, etc. |

---

## 4. Theme System Implementation

### 4.1 ThemeContext.tsx

```typescript
// contexts/ThemeContext.tsx

export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentName = 'slate' | 'blue' | 'teal' | 'violet' | 'rose' | 'amber'

interface ThemeContextValue {
  theme: ThemeMode              // Current theme setting
  resolvedTheme: 'light' | 'dark'  // Actual applied theme
  setTheme: (theme: ThemeMode) => void
  accent: AccentName            // Current accent color
  setAccent: (accent: AccentName) => void
  systemPrefersDark: boolean    // System preference
  isSyncing: boolean            // Backend sync status
}
```

### 4.2 Theme Persistence Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Action   │────▶│   ThemeContext  │────▶│   localStorage  │
│ (click button)  │     │   setTheme()    │     │   (immediate)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Backend tRPC    │
                        │ user.updateProfile │
                        │ (async, fire-   │
                        │  and-forget)    │
                        └─────────────────┘
```

### 4.3 Flash Prevention

```typescript
// In index.html <head> - runs before React
export const themeInitScript = `(function(){
  var t=localStorage.getItem('kanbu-theme-cache');
  var a=localStorage.getItem('kanbu-accent-cache');
  var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(d)document.documentElement.classList.add('dark');
  if(a)document.documentElement.setAttribute('data-accent',a);
})();`
```

---

## 5. Accent Color System

### 5.1 Beschikbare Accenten

| Accent | Beschrijving | Light Primary | Dark Primary |
|--------|--------------|---------------|--------------|
| **Slate** | Neutral and professional | 215 25% 27% | 215 20% 65% |
| **Blue** | Trust and reliability (default) | 221 83% 53% | 217 91% 60% |
| **Teal** | Fresh and modern | 173 80% 32% | 172 66% 50% |
| **Violet** | Creative and premium | 262 83% 58% | 263 70% 50% |
| **Rose** | Bold and energetic | 347 77% 50% | 349 89% 60% |
| **Amber** | Warm and friendly | 32 95% 44% | 38 92% 50% |

### 5.2 Accent Implementation

```css
/* accents.css */
[data-accent="blue"] {
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
  --ring: 221 83% 53%;
}

[data-accent="blue"].dark,
.dark[data-accent="blue"] {
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --ring: 217 91% 60%;
}
```

### 5.3 AccentPicker Component

```typescript
// components/theme/AccentPicker.tsx
export function AccentPicker() {
  const { accent, setAccent } = useTheme()

  return (
    <div className="flex gap-2">
      {accentOrder.map((name) => (
        <button
          key={name}
          onClick={() => setAccent(name)}
          className={cn(
            "w-6 h-6 rounded-full",
            accent === name && "ring-2 ring-offset-2"
          )}
          style={{ backgroundColor: getAccent(name).preview }}
        />
      ))}
    </div>
  )
}
```

---

## 6. Tailwind Configuration v2.0.0

### 6.1 Key Extensions

```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        // Primitive scales
        gray: { 50: 'hsl(var(--color-gray-50))', /* ... */ 950: 'hsl(var(--color-gray-950))' },
        blue: { /* ... */ },
        // ... 10 color scales total

        // Semantic colors
        surface: {
          DEFAULT: 'hsl(var(--surface-1))',
          '1': 'hsl(var(--surface-1))',
          '2': 'hsl(var(--surface-2))',
          '3': 'hsl(var(--surface-3))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          muted: 'hsl(var(--success-muted))',
        },
        // ... warning, error, info
      },

      zIndex: {
        base: 'var(--z-base)',           // 0
        dropdown: 'var(--z-dropdown)',   // 1000
        modal: 'var(--z-modal)',         // 1400
        toast: 'var(--z-toast)',         // 1600
        tooltip: 'var(--z-tooltip)',     // 1700
        max: 'var(--z-max)',             // 9999
      },

      transitionDuration: {
        instant: 'var(--duration-instant)',   // 0ms
        fastest: 'var(--duration-fastest)',   // 50ms
        fast: 'var(--duration-fast)',         // 150ms
        normal: 'var(--duration-normal)',     // 200ms
        slow: 'var(--duration-slow)',         // 300ms
      },

      transitionTimingFunction: {
        bounce: 'var(--ease-bounce)',
        spring: 'var(--ease-spring)',
      },

      animation: {
        'fade-in': 'fade-in var(--duration-normal) var(--ease-out)',
        'slide-in-from-top': 'slide-in-from-top var(--duration-normal) var(--ease-out)',
        'scale-in': 'scale-in var(--duration-fast) var(--ease-out)',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
}
```

---

## 7. Component Token Examples

### 7.1 Badge Tokens

```css
/* Light mode */
--badge-default-bg: hsl(var(--muted));
--badge-default-text: hsl(var(--muted-foreground));
--badge-success-bg: hsl(var(--success) / 0.1);
--badge-success-text: hsl(var(--success));
--badge-warning-bg: hsl(var(--warning) / 0.1);
--badge-warning-text: hsl(var(--warning));
--badge-error-bg: hsl(var(--error) / 0.1);
--badge-error-text: hsl(var(--error));

/* Dark mode */
.dark {
  --badge-success-bg: hsl(var(--success) / 0.2);
  --badge-warning-bg: hsl(var(--warning) / 0.2);
  --badge-error-bg: hsl(var(--error) / 0.2);
}
```

### 7.2 Toast Tokens

```css
--toast-bg: hsl(var(--card));
--toast-border: hsl(var(--border));
--toast-text: hsl(var(--card-foreground));
--toast-success-bg: hsl(var(--success));
--toast-error-bg: hsl(var(--error));
--toast-warning-bg: hsl(var(--warning));
--toast-info-bg: hsl(var(--info));
```

### 7.3 Skeleton Tokens

```css
--skeleton-base: hsl(var(--muted));
--skeleton-highlight: hsl(var(--muted-foreground) / 0.1);
```

---

## 8. Accessibility Features

### 8.1 High Contrast Mode

```css
[data-contrast="high"] {
  --border: 214 32% 70%;
  --muted-foreground: 215 25% 35%;
}

[data-contrast="high"].dark {
  --border: 215 20% 40%;
  --muted-foreground: 215 20% 75%;
}
```

### 8.2 Focus Indicators

```css
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
--focus-ring-color: var(--color-blue-500);
--focus-ring-style: solid;
```

### 8.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Backend Integration

### 9.1 Database Schema

```prisma
// prisma/schema.prisma
model User {
  // ... other fields
  theme   String?  @default("system")  // light, dark, system
  accent  String?  @default("blue")    // slate, blue, teal, violet, rose, amber
}
```

### 9.2 tRPC Endpoints

```typescript
// API: user.updateProfile
input: z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accent: z.enum(['slate', 'blue', 'teal', 'violet', 'rose', 'amber']).optional(),
})

// API: user.getProfile
output: {
  theme: string | null,
  accent: string | null,
  // ... other fields
}
```

### 9.3 ThemeProviderWithAuth

```typescript
// components/theme/ThemeProviderWithAuth.tsx
export function ThemeProviderWithAuth({ children }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const { data: profile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => utils.user.getProfile.invalidate(),
  })

  const handleThemeChange = async (theme: ThemeMode) => {
    await updateProfile.mutateAsync({ theme })
  }

  const handleAccentChange = async (accent: AccentName) => {
    await updateProfile.mutateAsync({ accent })
  }

  return (
    <ThemeProvider
      isAuthenticated={isAuthenticated}
      userTheme={profile?.theme}
      userAccent={profile?.accent}
      onThemeChange={handleThemeChange}
      onAccentChange={handleAccentChange}
    >
      {children}
    </ThemeProvider>
  )
}
```

---

## 10. Usage Guidelines

### 10.1 Using Colors

```tsx
// ✅ CORRECT - Use semantic tokens
<div className="bg-surface-1 text-foreground border-border">
<Badge className="bg-success/10 text-success">

// ❌ WRONG - Hardcoded colors
<div className="bg-white dark:bg-gray-800 text-gray-900">
<Badge className="bg-green-100 text-green-600">
```

### 10.2 Using Animations

```tsx
// ✅ CORRECT - Use animation tokens
<div className="animate-fade-in duration-normal ease-out">
<div className="transition-all duration-fast ease-spring">

// ❌ WRONG - Hardcoded values
<div className="animate-[fadeIn_200ms_ease-out]">
<div className="transition-all duration-200 ease-in-out">
```

### 10.3 Using Z-Index

```tsx
// ✅ CORRECT - Use z-index scale
<div className="z-dropdown">   // 1000
<div className="z-modal">      // 1400
<div className="z-tooltip">    // 1700

// ❌ WRONG - Arbitrary values
<div className="z-50">
<div className="z-[1000]">
```

---

## 11. Future Roadmap

### Potential Extensions

| Feature | Status | Description |
|---------|--------|-------------|
| Custom Color Picker | Planned | Let users pick any primary color |
| Density Settings | Planned | Compact/normal/spacious UI density |
| Layout Preferences | Planned | Sidebar position, header style |
| Theme Import/Export | Planned | Share themes between users |
| Font Family Selection | Considered | Custom font choices |

---

*Document versie: 2.0.0*
*Laatst bijgewerkt: 2026-01-15*
