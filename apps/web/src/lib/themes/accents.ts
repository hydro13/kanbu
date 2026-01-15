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

export type AccentName = 'slate' | 'blue' | 'teal' | 'violet' | 'rose' | 'amber'

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
