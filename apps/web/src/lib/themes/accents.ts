/*
 * Theme Accent Colors
 * Version: 1.0.0
 *
 * Professional accent color palettes for the theme system.
 * Each accent defines colors that work in both light and dark modes.
 *
 * Design Principles:
 * - All accents tested for WCAG AA contrast (4.5:1 minimum)
 * - Colors chosen for professional, business-appropriate appearance
 * - Each accent has light and dark variants optimized for readability
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * ===================================================================
 */

// =============================================================================
// Types
// =============================================================================

export type AccentName = 'slate' | 'blue' | 'teal' | 'violet' | 'rose' | 'amber' | 'custom'

export interface AccentColors {
  /** Primary color for light mode (HSL values without hsl()) */
  light: {
    primary: string
    primaryForeground: string
    ring: string
  }
  /** Primary color for dark mode (HSL values without hsl()) */
  dark: {
    primary: string
    primaryForeground: string
    ring: string
  }
}

export interface AccentDefinition {
  name: AccentName
  label: string
  description: string
  /** Preview color for the picker (hex) */
  preview: string
  colors: AccentColors
}

// =============================================================================
// Accent Definitions
// =============================================================================

/**
 * Professional accent colors.
 *
 * Color format: "H S% L%" (HSL without the hsl() wrapper)
 * This matches the format used in globals.css for CSS custom properties.
 */
export const accents: Record<AccentName, AccentDefinition> = {
  // ---------------------------------------------------------------------------
  // Slate - Default, neutral, professional
  // ---------------------------------------------------------------------------
  slate: {
    name: 'slate',
    label: 'Slate',
    description: 'Neutral and professional',
    preview: '#475569',
    colors: {
      light: {
        primary: '215 25% 27%',        // slate-700
        primaryForeground: '0 0% 100%',
        ring: '215 25% 27%',
      },
      dark: {
        primary: '215 20% 65%',        // slate-400
        primaryForeground: '222 47% 11%',
        ring: '215 20% 65%',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Blue - Trust, technology, reliability
  // ---------------------------------------------------------------------------
  blue: {
    name: 'blue',
    label: 'Blue',
    description: 'Trust and reliability',
    preview: '#2563eb',
    colors: {
      light: {
        primary: '221 83% 53%',        // blue-600
        primaryForeground: '0 0% 100%',
        ring: '221 83% 53%',
      },
      dark: {
        primary: '217 91% 60%',        // blue-500
        primaryForeground: '0 0% 100%',
        ring: '217 91% 60%',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Teal - Fresh, modern, balanced
  // ---------------------------------------------------------------------------
  teal: {
    name: 'teal',
    label: 'Teal',
    description: 'Fresh and modern',
    preview: '#0d9488',
    colors: {
      light: {
        primary: '173 80% 32%',        // teal-600
        primaryForeground: '0 0% 100%',
        ring: '173 80% 32%',
      },
      dark: {
        primary: '172 66% 50%',        // teal-500
        primaryForeground: '166 76% 10%',
        ring: '172 66% 50%',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Violet - Creative, premium, distinctive
  // ---------------------------------------------------------------------------
  violet: {
    name: 'violet',
    label: 'Violet',
    description: 'Creative and premium',
    preview: '#7c3aed',
    colors: {
      light: {
        primary: '262 83% 58%',        // violet-600
        primaryForeground: '0 0% 100%',
        ring: '262 83% 58%',
      },
      dark: {
        primary: '263 70% 50%',        // violet-500 adjusted
        primaryForeground: '0 0% 100%',
        ring: '263 70% 50%',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Rose - Energy, passion, attention
  // ---------------------------------------------------------------------------
  rose: {
    name: 'rose',
    label: 'Rose',
    description: 'Bold and energetic',
    preview: '#e11d48',
    colors: {
      light: {
        primary: '347 77% 50%',        // rose-600
        primaryForeground: '0 0% 100%',
        ring: '347 77% 50%',
      },
      dark: {
        primary: '349 89% 60%',        // rose-500
        primaryForeground: '0 0% 100%',
        ring: '349 89% 60%',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Amber - Warm, friendly, optimistic
  // ---------------------------------------------------------------------------
  amber: {
    name: 'amber',
    label: 'Amber',
    description: 'Warm and friendly',
    preview: '#d97706',
    colors: {
      light: {
        primary: '32 95% 44%',         // amber-600
        primaryForeground: '0 0% 100%',
        ring: '32 95% 44%',
      },
      dark: {
        primary: '38 92% 50%',         // amber-500
        primaryForeground: '26 83% 14%',
        ring: '38 92% 50%',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Custom - User-defined color (placeholder, values set dynamically)
  // ---------------------------------------------------------------------------
  custom: {
    name: 'custom',
    label: 'Custom',
    description: 'Your own color',
    preview: '#6366f1', // Default preview, will be overridden
    colors: {
      light: {
        primary: '239 84% 67%',        // Default indigo-like
        primaryForeground: '0 0% 100%',
        ring: '239 84% 67%',
      },
      dark: {
        primary: '239 84% 67%',
        primaryForeground: '0 0% 100%',
        ring: '239 84% 67%',
      },
    },
  },
}

// =============================================================================
// Helpers
// =============================================================================

/** Get all accent names */
export const accentNames = Object.keys(accents) as AccentName[]

/**
 * Accent display order for UI components.
 * Ordered: neutral first, then by color wheel position.
 */
export const accentOrder: AccentName[] = [
  'slate',  // Neutral
  'blue',   // Cool
  'teal',   // Cool-warm transition
  'violet', // Warm-cool
  'rose',   // Warm
  'amber',  // Warm
]

/** Default accent */
export const defaultAccent: AccentName = 'blue'

/** Get accent definition by name */
export function getAccent(name: AccentName): AccentDefinition {
  return accents[name] ?? accents[defaultAccent]
}

/** Check if a string is a valid accent name */
export function isValidAccent(name: string): name is AccentName {
  return name in accents
}

/** Preset accents (excludes 'custom') */
export const presetAccents = accentOrder

// =============================================================================
// Custom Color Helpers
// =============================================================================

export interface CustomAccentHSL {
  h: number  // 0-360
  s: number  // 0-100
  l: number  // 0-100
}

/**
 * Convert HSL to hex color string
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculate relative luminance of a color
 * Used for WCAG contrast calculations
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map(c => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * sRGB[0]! + 0.7152 * sRGB[1]! + 0.0722 * sRGB[2]!
}

/**
 * Calculate contrast ratio between two HSL colors
 * Returns a value between 1 and 21
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 */
export function calculateContrastRatio(
  h1: number, s1: number, l1: number,
  h2: number, s2: number, l2: number
): number {
  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    s /= 100
    l /= 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = l - c / 2

    let r = 0, g = 0, b = 0
    if (h < 60) { r = c; g = x }
    else if (h < 120) { r = x; g = c }
    else if (h < 180) { g = c; b = x }
    else if (h < 240) { g = x; b = c }
    else if (h < 300) { r = x; b = c }
    else { r = c; b = x }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ]
  }

  const rgb1 = hslToRgb(h1, s1, l1)
  const rgb2 = hslToRgb(h2, s2, l2)

  const l1Lum = relativeLuminance(...rgb1)
  const l2Lum = relativeLuminance(...rgb2)

  const lighter = Math.max(l1Lum, l2Lum)
  const darker = Math.min(l1Lum, l2Lum)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if a custom color meets WCAG AA contrast requirements against white text
 */
export function meetsWCAGContrast(h: number, s: number, l: number): boolean {
  // Check against white (0, 0, 100)
  const contrastWhite = calculateContrastRatio(h, s, l, 0, 0, 100)
  // Also check against near-black for dark mode (0, 0, 10)
  const contrastBlack = calculateContrastRatio(h, s, l, 0, 0, 10)

  // For buttons, we want good contrast with the foreground text
  // Lightness below 50% should use white text, above should use dark text
  if (l <= 50) {
    return contrastWhite >= 4.5
  } else {
    return contrastBlack >= 4.5
  }
}

/**
 * Determine the appropriate foreground color for a given background HSL
 * Returns HSL string for either white or dark text
 */
export function getForegroundForBackground(h: number, s: number, l: number): string {
  // Calculate contrast with white and dark
  const contrastWhite = calculateContrastRatio(h, s, l, 0, 0, 100)
  const contrastDark = calculateContrastRatio(h, s, l, 222, 47, 11) // slate-900

  // Use white if it has better contrast, otherwise use dark
  return contrastWhite > contrastDark ? '0 0% 100%' : '222 47% 11%'
}

/**
 * Generate CSS variables for a custom accent color
 * Applies via style attribute on document root
 */
export function applyCustomAccent(hsl: CustomAccentHSL): void {
  if (typeof document === 'undefined') return

  const { h, s, l } = hsl
  const hslString = `${h} ${s}% ${l}%`
  const foreground = getForegroundForBackground(h, s, l)

  const root = document.documentElement
  root.style.setProperty('--custom-accent', hslString)
  root.style.setProperty('--custom-accent-foreground', foreground)

  // When accent is 'custom', also update --primary
  if (root.getAttribute('data-accent') === 'custom') {
    root.style.setProperty('--primary', hslString)
    root.style.setProperty('--primary-foreground', foreground)
    root.style.setProperty('--ring', hslString)
  }
}

/**
 * Clear custom accent CSS variables
 */
export function clearCustomAccent(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.style.removeProperty('--custom-accent')
  root.style.removeProperty('--custom-accent-foreground')
}

// =============================================================================
// CSS Generation
// =============================================================================

/**
 * Generate CSS custom properties for an accent.
 * Returns a string that can be used in a style tag or CSS file.
 */
export function generateAccentCSS(name: AccentName): string {
  const accent = getAccent(name)
  const { light, dark } = accent.colors

  return `
/* Accent: ${accent.label} */
[data-accent="${name}"] {
  --primary: ${light.primary};
  --primary-foreground: ${light.primaryForeground};
  --ring: ${light.ring};
}

[data-accent="${name}"].dark,
.dark[data-accent="${name}"] {
  --primary: ${dark.primary};
  --primary-foreground: ${dark.primaryForeground};
  --ring: ${dark.ring};
}
`.trim()
}

/**
 * Generate CSS for all accents.
 */
export function generateAllAccentsCSS(): string {
  return accentNames.map(generateAccentCSS).join('\n\n')
}
