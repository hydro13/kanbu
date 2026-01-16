# Kanbu Design Token Reference Guide

**Version:** 2.0.0
**Last updated:** 2026-01-16
**Status:** Design System v2.0.0 Complete

---

## Contents

1. [Quick Reference](#quick-reference)
2. [Primitive Tokens](#primitive-tokens)
   - [Color Palette](#color-palette)
   - [Typography](#typography)
   - [Spacing & Layout](#spacing--layout)
   - [Animation & Motion](#animation--motion)
   - [Z-Index Scale](#z-index-scale)
3. [Semantic Tokens](#semantic-tokens)
   - [Surfaces](#surfaces)
   - [Text Colors](#text-colors)
   - [Borders](#borders)
   - [Interactive States](#interactive-states)
   - [State Colors](#state-colors)
4. [Component Tokens](#component-tokens)
5. [Accent Colors](#accent-colors)
6. [Dark Mode](#dark-mode)
7. [Density Settings](#density-settings)
8. [Sidebar Position](#sidebar-position)
9. [Accessibility](#accessibility)
10. [Usage Examples](#usage-examples)

---

## Quick Reference

### Token Categories Overview

| Category | Count | Example Token | Tailwind Class |
|----------|-------|---------------|----------------|
| Color Scales | 10 scales × 11 shades | `--color-blue-500` | `bg-blue-500` |
| Semantic Colors | 40+ | `--surface-1` | `bg-surface-1` |
| Typography | 25+ | `--font-size-lg` | `text-lg` |
| Spacing | 24 | `--space-4` | `p-4`, `m-4` |
| Shadows | 9 | `--shadow-md` | `shadow-md` |
| Animation | 14 | `--duration-normal` | `duration-200` |
| Z-Index | 11 | `--z-modal` | `z-modal` |
| Border Radius | 9 | `--radius-lg` | `rounded-lg` |

### File Locations

```
apps/web/src/styles/
├── globals.css      # All design tokens
├── accents.css      # Accent color variants
└── ...

apps/web/tailwind.config.js  # Tailwind token mapping
apps/web/src/lib/design-tokens.ts  # TypeScript constants
```

---

## Primitive Tokens

### Color Palette

#### Gray Scale (Neutral Foundation)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--color-gray-50` | 210 40% 98% | Subtle backgrounds |
| `--color-gray-100` | 210 40% 96% | Muted backgrounds |
| `--color-gray-200` | 214 32% 91% | Borders, dividers |
| `--color-gray-300` | 213 27% 84% | Disabled borders |
| `--color-gray-400` | 215 20% 65% | Muted text |
| `--color-gray-500` | 215 16% 47% | Secondary text |
| `--color-gray-600` | 215 19% 35% | Primary text (light) |
| `--color-gray-700` | 215 25% 27% | Headings |
| `--color-gray-800` | 217 33% 17% | Dark backgrounds |
| `--color-gray-900` | 222 84% 5% | Darkest backgrounds |
| `--color-gray-950` | 229 84% 5% | Near-black |

#### Blue Scale (Primary Brand)

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--color-blue-50` | 214 100% 97% | Info backgrounds |
| `--color-blue-100` | 214 95% 93% | Light blue accents |
| `--color-blue-200` | 213 97% 87% | Hover states |
| `--color-blue-300` | 212 96% 78% | Active states |
| `--color-blue-400` | 213 94% 68% | Links (dark mode) |
| `--color-blue-500` | 217 91% 60% | Primary buttons |
| `--color-blue-600` | 221 83% 53% | Primary hover |
| `--color-blue-700` | 224 76% 48% | Primary active |
| `--color-blue-800` | 226 71% 40% | Dark blue |
| `--color-blue-900` | 224 64% 33% | Very dark blue |
| `--color-blue-950` | 226 57% 21% | Darkest blue |

#### Additional Color Scales

<details>
<summary><strong>Teal Scale</strong> (Fresh and Modern)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-teal-50` | 166 76% 97% |
| `--color-teal-100` | 167 85% 93% |
| `--color-teal-200` | 168 84% 85% |
| `--color-teal-300` | 171 77% 72% |
| `--color-teal-400` | 172 66% 58% |
| `--color-teal-500` | 173 80% 40% |
| `--color-teal-600` | 175 84% 32% |
| `--color-teal-700` | 175 77% 26% |
| `--color-teal-800` | 176 69% 22% |
| `--color-teal-900` | 176 61% 19% |
| `--color-teal-950` | 179 84% 10% |

</details>

<details>
<summary><strong>Violet Scale</strong> (Creative and Premium)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-violet-50` | 250 100% 98% |
| `--color-violet-100` | 251 91% 95% |
| `--color-violet-200` | 251 95% 92% |
| `--color-violet-300` | 252 95% 85% |
| `--color-violet-400` | 255 92% 76% |
| `--color-violet-500` | 258 90% 66% |
| `--color-violet-600` | 262 83% 58% |
| `--color-violet-700` | 263 70% 50% |
| `--color-violet-800` | 263 69% 42% |
| `--color-violet-900` | 264 67% 35% |
| `--color-violet-950` | 265 61% 22% |

</details>

<details>
<summary><strong>Rose Scale</strong> (Bold and Energetic)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-rose-50` | 356 100% 97% |
| `--color-rose-100` | 356 100% 95% |
| `--color-rose-200` | 353 96% 90% |
| `--color-rose-300` | 353 96% 82% |
| `--color-rose-400` | 351 95% 71% |
| `--color-rose-500` | 349 89% 60% |
| `--color-rose-600` | 347 77% 50% |
| `--color-rose-700` | 345 83% 41% |
| `--color-rose-800` | 343 80% 35% |
| `--color-rose-900` | 342 75% 30% |
| `--color-rose-950` | 343 88% 16% |

</details>

<details>
<summary><strong>Orange Scale</strong> (Attention and Warmth)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-orange-50` | 33 100% 96% |
| `--color-orange-100` | 34 100% 92% |
| `--color-orange-200` | 32 98% 83% |
| `--color-orange-300` | 31 97% 72% |
| `--color-orange-400` | 27 96% 61% |
| `--color-orange-500` | 25 95% 53% |
| `--color-orange-600` | 21 90% 48% |
| `--color-orange-700` | 17 88% 40% |
| `--color-orange-800` | 15 79% 34% |
| `--color-orange-900` | 15 75% 28% |
| `--color-orange-950` | 13 81% 15% |

</details>

<details>
<summary><strong>Amber Scale</strong> (Warm and Friendly)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-amber-50` | 48 100% 96% |
| `--color-amber-100` | 48 96% 89% |
| `--color-amber-200` | 48 97% 77% |
| `--color-amber-300` | 46 97% 65% |
| `--color-amber-400` | 43 96% 56% |
| `--color-amber-500` | 38 92% 50% |
| `--color-amber-600` | 32 95% 44% |
| `--color-amber-700` | 26 90% 37% |
| `--color-amber-800` | 23 83% 31% |
| `--color-amber-900` | 22 78% 26% |
| `--color-amber-950` | 21 92% 14% |

</details>

<details>
<summary><strong>Red Scale</strong> (Danger and Errors)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-red-50` | 0 86% 97% |
| `--color-red-100` | 0 93% 94% |
| `--color-red-200` | 0 96% 89% |
| `--color-red-300` | 0 94% 82% |
| `--color-red-400` | 0 91% 71% |
| `--color-red-500` | 0 84% 60% |
| `--color-red-600` | 0 72% 51% |
| `--color-red-700` | 0 74% 42% |
| `--color-red-800` | 0 70% 35% |
| `--color-red-900` | 0 63% 31% |
| `--color-red-950` | 0 75% 15% |

</details>

<details>
<summary><strong>Green Scale</strong> (Success and Positive)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-green-50` | 138 76% 97% |
| `--color-green-100` | 141 84% 93% |
| `--color-green-200` | 141 79% 85% |
| `--color-green-300` | 142 77% 73% |
| `--color-green-400` | 142 69% 58% |
| `--color-green-500` | 142 71% 45% |
| `--color-green-600` | 142 76% 36% |
| `--color-green-700` | 142 72% 29% |
| `--color-green-800` | 143 64% 24% |
| `--color-green-900` | 144 61% 20% |
| `--color-green-950` | 145 80% 10% |

</details>

<details>
<summary><strong>Cyan Scale</strong> (Information and Links)</summary>

| Token | HSL Value |
|-------|-----------|
| `--color-cyan-50` | 183 100% 96% |
| `--color-cyan-100` | 185 96% 90% |
| `--color-cyan-200` | 186 94% 82% |
| `--color-cyan-300` | 187 92% 69% |
| `--color-cyan-400` | 188 86% 53% |
| `--color-cyan-500` | 189 94% 43% |
| `--color-cyan-600` | 192 91% 36% |
| `--color-cyan-700` | 193 82% 31% |
| `--color-cyan-800` | 194 70% 27% |
| `--color-cyan-900` | 196 64% 24% |
| `--color-cyan-950` | 197 79% 15% |

</details>

---

### Typography

#### Font Sizes

| Token | Value | Pixels | Tailwind |
|-------|-------|--------|----------|
| `--font-size-2xs` | 0.625rem | 10px | `text-2xs` |
| `--font-size-xs` | 0.75rem | 12px | `text-xs` |
| `--font-size-sm` | 0.875rem | 14px | `text-sm` |
| `--font-size-base` | 1rem | 16px | `text-base` |
| `--font-size-lg` | 1.125rem | 18px | `text-lg` |
| `--font-size-xl` | 1.25rem | 20px | `text-xl` |
| `--font-size-2xl` | 1.5rem | 24px | `text-2xl` |
| `--font-size-3xl` | 1.875rem | 30px | `text-3xl` |
| `--font-size-4xl` | 2.25rem | 36px | `text-4xl` |
| `--font-size-5xl` | 3rem | 48px | `text-5xl` |
| `--font-size-6xl` | 3.75rem | 60px | `text-6xl` |

#### Font Weights

| Token | Value | Tailwind |
|-------|-------|----------|
| `--font-weight-thin` | 100 | `font-thin` |
| `--font-weight-light` | 300 | `font-light` |
| `--font-weight-normal` | 400 | `font-normal` |
| `--font-weight-medium` | 500 | `font-medium` |
| `--font-weight-semibold` | 600 | `font-semibold` |
| `--font-weight-bold` | 700 | `font-bold` |
| `--font-weight-extrabold` | 800 | `font-extrabold` |

#### Line Heights

| Token | Value | Tailwind |
|-------|-------|----------|
| `--line-height-none` | 1 | `leading-none` |
| `--line-height-tight` | 1.25 | `leading-tight` |
| `--line-height-snug` | 1.375 | `leading-snug` |
| `--line-height-normal` | 1.5 | `leading-normal` |
| `--line-height-relaxed` | 1.625 | `leading-relaxed` |
| `--line-height-loose` | 2 | `leading-loose` |

#### Letter Spacing

| Token | Value | Tailwind |
|-------|-------|----------|
| `--letter-spacing-tighter` | -0.05em | `tracking-tighter` |
| `--letter-spacing-tight` | -0.025em | `tracking-tight` |
| `--letter-spacing-normal` | 0 | `tracking-normal` |
| `--letter-spacing-wide` | 0.025em | `tracking-wide` |
| `--letter-spacing-wider` | 0.05em | `tracking-wider` |
| `--letter-spacing-widest` | 0.1em | `tracking-widest` |

---

### Spacing & Layout

#### Spacing Scale

| Token | Value | Pixels | Tailwind |
|-------|-------|--------|----------|
| `--space-0` | 0 | 0px | `p-0`, `m-0` |
| `--space-px` | 1px | 1px | `p-px`, `m-px` |
| `--space-0-5` | 0.125rem | 2px | `p-0.5`, `m-0.5` |
| `--space-1` | 0.25rem | 4px | `p-1`, `m-1` |
| `--space-1-5` | 0.375rem | 6px | `p-1.5`, `m-1.5` |
| `--space-2` | 0.5rem | 8px | `p-2`, `m-2` |
| `--space-2-5` | 0.625rem | 10px | `p-2.5`, `m-2.5` |
| `--space-3` | 0.75rem | 12px | `p-3`, `m-3` |
| `--space-3-5` | 0.875rem | 14px | `p-3.5`, `m-3.5` |
| `--space-4` | 1rem | 16px | `p-4`, `m-4` |
| `--space-5` | 1.25rem | 20px | `p-5`, `m-5` |
| `--space-6` | 1.5rem | 24px | `p-6`, `m-6` |
| `--space-8` | 2rem | 32px | `p-8`, `m-8` |
| `--space-10` | 2.5rem | 40px | `p-10`, `m-10` |
| `--space-12` | 3rem | 48px | `p-12`, `m-12` |
| `--space-16` | 4rem | 64px | `p-16`, `m-16` |
| `--space-20` | 5rem | 80px | `p-20`, `m-20` |
| `--space-24` | 6rem | 96px | `p-24`, `m-24` |
| `--space-32` | 8rem | 128px | `p-32`, `m-32` |

#### Border Radius

| Token | Value | Tailwind |
|-------|-------|----------|
| `--radius-none` | 0 | `rounded-none` |
| `--radius-sm` | 0.125rem (2px) | `rounded-sm` |
| `--radius-default` | 0.25rem (4px) | `rounded` |
| `--radius-md` | 0.375rem (6px) | `rounded-md` |
| `--radius-lg` | 0.5rem (8px) | `rounded-lg` |
| `--radius-xl` | 0.75rem (12px) | `rounded-xl` |
| `--radius-2xl` | 1rem (16px) | `rounded-2xl` |
| `--radius-3xl` | 1.5rem (24px) | `rounded-3xl` |
| `--radius-full` | 9999px | `rounded-full` |

#### Box Shadows

| Token | Tailwind | Description |
|-------|----------|-------------|
| `--shadow-xs` | `shadow-xs` | Minimal elevation |
| `--shadow-sm` | `shadow-sm` | Subtle lift |
| `--shadow-default` | `shadow` | Default shadow |
| `--shadow-md` | `shadow-md` | Medium elevation |
| `--shadow-lg` | `shadow-lg` | High elevation |
| `--shadow-xl` | `shadow-xl` | Modal/popover |
| `--shadow-2xl` | `shadow-2xl` | Maximum elevation |
| `--shadow-inner` | `shadow-inner` | Inset shadow |
| `--shadow-none` | `shadow-none` | No shadow |

---

### Animation & Motion

#### Durations

| Token | Value | Use Case |
|-------|-------|----------|
| `--duration-instant` | 0ms | Immediate |
| `--duration-fastest` | 50ms | Micro-interactions |
| `--duration-faster` | 100ms | Quick feedback |
| `--duration-fast` | 150ms | Button hover |
| `--duration-normal` | 200ms | Default transitions |
| `--duration-slow` | 300ms | Page transitions |
| `--duration-slower` | 400ms | Complex animations |
| `--duration-slowest` | 500ms | Modal open/close |

#### Easing Functions

| Token | Value | Use Case |
|-------|-------|----------|
| `--ease-linear` | linear | Continuous animations |
| `--ease-in` | cubic-bezier(0.4, 0, 1, 1) | Exit animations |
| `--ease-out` | cubic-bezier(0, 0, 0.2, 1) | Enter animations |
| `--ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | Symmetric transitions |
| `--ease-bounce` | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Playful bounce |
| `--ease-spring` | cubic-bezier(0.175, 0.885, 0.32, 1.275) | Natural spring |

---

### Z-Index Scale

| Token | Value | Use Case |
|-------|-------|----------|
| `--z-base` | 0 | Default content |
| `--z-docked` | 10 | Fixed sidebars |
| `--z-dropdown` | 1000 | Dropdown menus |
| `--z-sticky` | 1100 | Sticky headers |
| `--z-banner` | 1200 | Alert banners |
| `--z-overlay` | 1300 | Background overlays |
| `--z-modal` | 1400 | Modal dialogs |
| `--z-popover` | 1500 | Popovers |
| `--z-toast` | 1600 | Toast notifications |
| `--z-tooltip` | 1700 | Tooltips |
| `--z-max` | 9999 | Emergency override |

---

## Semantic Tokens

### Surfaces

| Token | Light Mode | Dark Mode | Tailwind | Usage |
|-------|------------|-----------|----------|-------|
| `--background` | white | gray-950 | `bg-background` | Page background |
| `--surface-1` | white | gray-800 | `bg-surface-1` | Cards, panels |
| `--surface-2` | gray-50 | gray-700 | `bg-surface-2` | Sidebar, secondary |
| `--surface-3` | gray-100 | gray-600 | `bg-surface-3` | Muted areas |
| `--surface-elevated` | white | gray-800 | `bg-surface-elevated` | Elevated content |
| `--surface-sunken` | gray-100 | gray-950 | `bg-surface-sunken` | Recessed areas |
| `--surface-overlay` | rgba(0,0,0,0.5) | rgba(0,0,0,0.7) | - | Modal overlays |

### Text Colors

| Token | Light Mode | Dark Mode | Tailwind | Usage |
|-------|------------|-----------|----------|-------|
| `--text-primary` | gray-900 | gray-50 | `text-foreground` | Primary content |
| `--text-secondary` | gray-600 | gray-300 | `text-muted-foreground` | Secondary content |
| `--text-tertiary` | gray-500 | gray-400 | - | Tertiary content |
| `--text-muted` | gray-400 | gray-500 | - | Placeholders |
| `--text-disabled` | gray-300 | gray-600 | - | Disabled state |
| `--text-inverse` | gray-50 | gray-900 | - | On dark backgrounds |
| `--text-link` | blue-600 | blue-400 | - | Links |
| `--text-link-hover` | blue-700 | blue-300 | - | Link hover |
| `--text-success` | green-600 | green-400 | `text-success` | Success messages |
| `--text-warning` | amber-600 | amber-400 | `text-warning` | Warning messages |
| `--text-error` | red-600 | red-400 | `text-error` | Error messages |

### Borders

| Token | Light Mode | Dark Mode | Tailwind |
|-------|------------|-----------|----------|
| `--border-default` | gray-200 | gray-700 | `border-border` |
| `--border-muted` | gray-100 | gray-800 | - |
| `--border-strong` | gray-300 | gray-600 | - |
| `--border-focus` | blue-500 | blue-400 | - |
| `--border-error` | red-500 | red-500 | `border-destructive` |
| `--border-success` | green-500 | green-500 | - |

### Interactive States

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--interactive-hover` | rgba(0,0,0,0.04) | rgba(255,255,255,0.04) | Hover backgrounds |
| `--interactive-active` | rgba(0,0,0,0.08) | rgba(255,255,255,0.08) | Active/pressed |
| `--interactive-selected` | blue-50 | rgba(59,130,246,0.2) | Selected items |
| `--interactive-disabled` | gray-100 | gray-800 | Disabled state |

### State Colors

| Token | Light | Dark | Tailwind | Usage |
|-------|-------|------|----------|-------|
| `--success` | 142 71% 45% | 142 60% 40% | `bg-success` | Success state |
| `--success-foreground` | white | white | `text-success-foreground` | Text on success |
| `--success-muted` | 142 76% 95% | 143 64% 15% | - | Success backgrounds |
| `--warning` | 38 92% 50% | 38 85% 45% | `bg-warning` | Warning state |
| `--warning-foreground` | 26 83% 14% | 26 83% 14% | `text-warning-foreground` | Text on warning |
| `--warning-muted` | 48 100% 95% | 26 90% 15% | - | Warning backgrounds |
| `--error` | 0 84% 60% | 0 75% 50% | `bg-error`, `bg-destructive` | Error state |
| `--error-foreground` | white | white | `text-error-foreground` | Text on error |
| `--error-muted` | 0 86% 97% | 0 63% 18% | - | Error backgrounds |
| `--info` | 217 91% 60% | 217 80% 55% | `bg-info` | Info state |
| `--info-foreground` | white | white | `text-info-foreground` | Text on info |
| `--info-muted` | 214 100% 97% | 224 64% 20% | - | Info backgrounds |

### Priority Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--priority-low` | 156 15% 62% | 156 10% 50% | Low priority |
| `--priority-medium` | 217 91% 60% | 217 80% 55% | Medium priority |
| `--priority-high` | 25 95% 53% | 25 90% 55% | High priority |
| `--priority-urgent` | 0 84% 60% | 0 75% 50% | Urgent priority |

---

## Component Tokens

### Card

| Token | Value | Tailwind |
|-------|-------|----------|
| `--card-background` | surface-1 | `bg-card` |
| `--card-border` | border-default | `border-border` |
| `--card-radius` | radius-lg (8px) | `rounded-lg` |
| `--card-shadow` | shadow-sm | `shadow-sm` |
| `--card-padding` | space-6 (24px) | `p-6` |
| `--card-padding-sm` | space-4 (16px) | `p-4` |
| `--card-padding-lg` | space-8 (32px) | `p-8` |

### Button

| Token | Value |
|-------|-------|
| `--button-radius` | radius-md (6px) |
| `--button-padding-x` | space-4 (16px) |
| `--button-padding-y` | space-2 (8px) |
| `--button-padding-x-sm` | space-3 (12px) |
| `--button-padding-y-sm` | space-1-5 (6px) |
| `--button-padding-x-lg` | space-6 (24px) |
| `--button-padding-y-lg` | space-3 (12px) |
| `--button-font-weight` | font-weight-medium (500) |
| `--button-font-size` | font-size-sm (14px) |
| `--button-transition` | 150ms ease-out |

### Input

| Token | Value |
|-------|-------|
| `--input-radius` | radius-md (6px) |
| `--input-border` | border-default |
| `--input-border-focus` | border-focus |
| `--input-border-error` | border-error |
| `--input-padding-x` | space-3 (12px) |
| `--input-padding-y` | space-2 (8px) |
| `--input-font-size` | font-size-sm (14px) |
| `--input-background` | surface-background |
| `--input-placeholder` | text-muted |

### Badge

| Token | Value |
|-------|-------|
| `--badge-radius` | radius-full |
| `--badge-padding-x` | space-2-5 (10px) |
| `--badge-padding-y` | space-0-5 (2px) |
| `--badge-font-size` | font-size-xs (12px) |
| `--badge-font-weight` | font-weight-medium (500) |

### Avatar

| Token | Value |
|-------|-------|
| `--avatar-size-xs` | 1.5rem (24px) |
| `--avatar-size-sm` | 2rem (32px) |
| `--avatar-size-md` | 2.5rem (40px) |
| `--avatar-size-lg` | 3rem (48px) |
| `--avatar-size-xl` | 4rem (64px) |
| `--avatar-radius` | radius-full |

### Tooltip

| Token | Value |
|-------|-------|
| `--tooltip-background` | gray-900 (light) / gray-700 (dark) |
| `--tooltip-foreground` | gray-50 (light) / gray-100 (dark) |
| `--tooltip-radius` | radius-md |
| `--tooltip-padding-x` | space-3 |
| `--tooltip-padding-y` | space-1-5 |
| `--tooltip-shadow` | shadow-lg |
| `--tooltip-z` | z-tooltip (1700) |

### Modal / Dialog

| Token | Value |
|-------|-------|
| `--modal-background` | surface-1 |
| `--modal-overlay` | rgba(0,0,0,0.5) / rgba(0,0,0,0.7) |
| `--modal-radius` | radius-lg |
| `--modal-shadow` | shadow-xl |
| `--modal-padding` | space-6 |
| `--modal-z` | z-modal (1400) |
| `--modal-max-width` | 32rem (512px) |
| `--modal-max-width-sm` | 24rem (384px) |
| `--modal-max-width-lg` | 48rem (768px) |
| `--modal-max-width-xl` | 64rem (1024px) |

### Sidebar

| Token | Value |
|-------|-------|
| `--sidebar-width` | 14rem (224px) |
| `--sidebar-width-collapsed` | 3.5rem (56px) |
| `--sidebar-background` | surface-2 |
| `--sidebar-item-radius` | radius-md |
| `--sidebar-item-padding-x` | space-3 |
| `--sidebar-item-padding-y` | space-2 |
| `--sidebar-transition` | 200ms ease-out |

### Table

| Token | Value |
|-------|-------|
| `--table-header-background` | surface-2 |
| `--table-row-hover` | interactive-hover |
| `--table-border` | border-default |
| `--table-cell-padding-x` | space-4 |
| `--table-cell-padding-y` | space-3 |
| `--table-radius` | radius-lg |

### Page Layout

| Token | Value |
|-------|-------|
| `--page-padding-x` | space-6 (24px) |
| `--page-padding-y` | space-8 (32px) |
| `--page-max-width` | 80rem (1280px) |
| `--page-max-width-narrow` | 48rem (768px) |
| `--page-max-width-wide` | 96rem (1536px) |
| `--page-title-size` | font-size-2xl |
| `--page-title-weight` | font-weight-semibold |

---

## Accent Colors

Kanbu supports 6 built-in accent colors plus custom colors. Applied via `data-accent` attribute on `<html>`.

| Accent | Character | Light Primary | Dark Primary |
|--------|-----------|---------------|--------------|
| `slate` | Neutral, professional | 215 25% 27% | 215 20% 65% |
| `blue` | Trust, reliability | 221 83% 53% | 217 91% 60% |
| `teal` | Fresh, modern | 173 80% 32% | 172 66% 50% |
| `violet` | Creative, premium | 262 83% 58% | 263 70% 50% |
| `rose` | Bold, energetic | 347 77% 50% | 349 89% 60% |
| `amber` | Warm, friendly | 32 95% 44% | 38 92% 50% |
| `custom` | User-defined | HSL from picker | HSL from picker |

### Usage

```tsx
// Set accent via ThemeContext
const { setAccent } = useTheme();
setAccent('teal');

// Or for custom color
const { setCustomAccent } = useTheme();
setCustomAccent({ h: 180, s: 70, l: 45 });
```

---

## Dark Mode

Dark mode is toggled via the `dark` class on `<html>`. The ThemeContext manages this automatically based on user preference or system setting.

### Key Differences

| Aspect | Light Mode | Dark Mode |
|--------|------------|-----------|
| Background | white | gray-950 |
| Surface-1 | white | gray-800 |
| Surface-2 | gray-50 | gray-700 |
| Text Primary | gray-900 | gray-50 |
| Text Secondary | gray-600 | gray-300 |
| Borders | gray-200 | gray-700 |
| Shadows | Low opacity | Higher opacity |
| Focus Ring | blue-500 | blue-400 |

### Usage

```tsx
// Set theme via ThemeContext
const { setTheme } = useTheme();
setTheme('dark');    // Force dark
setTheme('light');   // Force light
setTheme('system');  // Follow OS preference
```

---

## Density Settings

UI density is controlled via `data-density` attribute on `<html>`.

| Density | Multiplier | Page Padding | Card Padding | Section Gap |
|---------|------------|--------------|--------------|-------------|
| `compact` | 0.75 | 1rem | 0.75rem | 1rem |
| `normal` | 1.0 | 1.5rem | 1rem | 1.5rem |
| `spacious` | 1.5 | 2rem | 1.5rem | 2rem |

### Affected Elements

- Main content padding
- Card padding
- Section gaps (space-y-6)
- Element gaps (gap-2, gap-4)
- Typography sizes (compact: smaller, spacious: larger)
- Button padding

### Usage

```tsx
const { setDensity } = useTheme();
setDensity('compact');
setDensity('normal');
setDensity('spacious');
```

---

## Sidebar Position

Sidebar position is controlled via `data-sidebar` attribute on `<html>`.

| Position | Sidebar Order | Main Order | Border |
|----------|---------------|------------|--------|
| `left` | 0 | 2 | Right border |
| `right` | 2 | 0 | Left border |

### Usage

```tsx
const { setSidebarPosition } = useTheme();
setSidebarPosition('left');
setSidebarPosition('right');
```

---

## Accessibility

### Focus Ring

```css
:focus-visible {
  outline: var(--focus-ring-width) var(--focus-ring-style) hsl(var(--focus-ring-color));
  outline-offset: var(--focus-ring-offset);
}
```

| Token | Value |
|-------|-------|
| `--focus-ring-width` | 2px |
| `--focus-ring-offset` | 2px |
| `--focus-ring-color` | blue-500 (light) / blue-400 (dark) |
| `--focus-ring-style` | solid |

### High Contrast Mode

```html
<html data-contrast="high">
```

Increases border visibility and text contrast for users with visual impairments.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Automatically respects user's OS preference for reduced motion.

---

## Usage Examples

### Backgrounds

```tsx
// Correct - Use semantic tokens
<div className="bg-background">Page background</div>
<div className="bg-card">Card surface</div>
<div className="bg-surface-2">Secondary surface</div>

// Avoid - Hardcoded colors
<div className="bg-white dark:bg-gray-900">...</div>
<div className="bg-gray-50 dark:bg-gray-800">...</div>
```

### Text Colors

```tsx
// Correct
<p className="text-foreground">Primary text</p>
<p className="text-muted-foreground">Secondary text</p>
<span className="text-success">Success message</span>
<span className="text-destructive">Error message</span>

// Avoid
<p className="text-gray-900 dark:text-gray-100">...</p>
<span className="text-green-500">...</span>
```

### Borders

```tsx
// Correct
<div className="border border-border">...</div>
<input className="border-input focus:border-ring">...</input>

// Avoid
<div className="border border-gray-200 dark:border-gray-700">...</div>
```

### Interactive States

```tsx
// Correct
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Primary Action
</button>
<button className="bg-destructive text-destructive-foreground">
  Delete
</button>

// Avoid
<button className="bg-blue-500 text-white hover:bg-blue-600">...</button>
```

### Status Badges

```tsx
// Correct
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>

// Avoid
<span className="bg-green-100 text-green-800">...</span>
```

### Shadows

```tsx
// Correct
<Card className="shadow-sm hover:shadow-md">...</Card>
<Dialog className="shadow-xl">...</Dialog>

// All shadow tokens work automatically in dark mode
```

---

## Migration Reference

See [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) for detailed instructions on migrating from hardcoded colors to design tokens.

---

*Document Version: 2.0.0*
*Last Updated: 2026-01-16*
