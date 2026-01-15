/*
 * Design Tokens - Kanbu UI
 * Version: 2.0.0
 *
 * Single source of truth voor alle visuele styling.
 * Gebruik deze tokens in plaats van hardcoded Tailwind classes.
 *
 * CHANGELOG:
 * - 2.0.0: Complete CSS custom properties foundation (Fase 1)
 *          - Primitive tokens: colors, typography, spacing
 *          - Semantic tokens: surfaces, text, borders
 *          - Component tokens: card, button, input, page, sidebar
 *          - Tailwind config integration
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * ===================================================================
 */

// =============================================================================
// Priority Colors
// =============================================================================
// BESLISSING: HIGH = ORANGE (niet geel) - consistent door hele app

export const priorityColors = {
  LOW: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
    dot: 'bg-gray-400',
  },
  MEDIUM: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-500',
  },
  HIGH: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
  },
  URGENT: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
  },
} as const

export type Priority = keyof typeof priorityColors

// Helper functie voor priority styling
export function getPriorityClasses(priority: Priority, variant: 'bg' | 'text' | 'border' | 'dot' = 'bg') {
  return priorityColors[priority]?.[variant] ?? priorityColors.MEDIUM[variant]
}

// =============================================================================
// Status Colors
// =============================================================================

export const statusColors = {
  // Task/Item status
  TODO: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-600 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  DONE: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
  },
  BLOCKED: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
} as const

export type Status = keyof typeof statusColors

// =============================================================================
// Semantic Colors
// =============================================================================

export const semanticColors = {
  success: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-300 dark:border-green-700',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-700',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-300 dark:border-red-700',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
  },
} as const

// =============================================================================
// Typography
// =============================================================================
// Uses CSS custom properties via Tailwind custom classes

export const typography = {
  // Page titles - de standaard voor alle pagina headers
  // Tailwind class: text-page-title (maps to --page-title-size/weight)
  pageTitle: 'text-page-title text-foreground',

  // Large page titles - voor belangrijke main pages
  // Tailwind class: text-page-title-lg (maps to --page-title-size-lg/weight-lg)
  pageTitleLg: 'text-page-title-lg text-foreground',

  // Section headers binnen pagina's
  // Tailwind class: text-section-title (maps to --section-title-size/weight)
  sectionTitle: 'text-section-title text-foreground',

  // Card/panel headers
  cardTitle: 'text-base font-medium text-foreground',

  // Labels voor form fields
  label: 'text-sm font-medium text-muted-foreground',

  // Body text
  body: 'text-sm text-foreground',
  bodyMuted: 'text-sm text-muted-foreground',

  // Small/helper text
  small: 'text-xs text-muted-foreground',

  // Stats/numbers
  statLarge: 'text-2xl font-bold text-foreground',
  statMedium: 'text-xl font-semibold text-foreground',
} as const

// =============================================================================
// Cards & Panels
// =============================================================================
// Uses CSS custom properties: --card-radius, --card-padding-*

export const cards = {
  // Standaard card - gebruik dit voor alle cards
  // Uses: rounded-card (--card-radius)
  base: 'bg-card border border-border rounded-card shadow-sm',

  // Card met hover effect
  interactive: 'bg-card border border-border rounded-card shadow-sm hover:shadow-md transition-shadow',

  // Inset card (nested binnen andere card)
  inset: 'bg-muted/50 rounded-card',

  // Highlighted card
  highlighted: 'bg-card border-2 border-primary rounded-card shadow-sm',

  // Surface variants (using new semantic tokens)
  surface1: 'bg-surface border border-border rounded-card shadow-sm',
  surface2: 'bg-surface-2 border border-border rounded-card shadow-sm',
  elevated: 'bg-surface-elevated border border-border rounded-card shadow-md',
} as const

export const cardPadding = {
  // Uses CSS custom properties: --card-padding-*
  sm: 'p-card-sm',
  md: 'p-card',
  lg: 'p-card-lg',
} as const

// =============================================================================
// Page Layout
// =============================================================================
// Uses CSS custom properties: --page-max-width, --page-padding-*

export const pageLayout = {
  // Container voor pagina content
  // Uses: max-w-page (--page-max-width)
  container: 'max-w-page mx-auto',

  // Standaard page padding
  padding: 'px-6 py-8',

  // Smaller container (voor forms, settings)
  // Uses: max-w-page-narrow (--page-max-width-narrow)
  containerNarrow: 'max-w-page-narrow mx-auto',
} as const

// =============================================================================
// Spacing
// =============================================================================

export const spacing = {
  // Tussen secties
  section: 'space-y-8',

  // Binnen cards
  card: 'space-y-4',

  // Tussen form fields
  form: 'space-y-4',

  // Grid gaps
  gridSm: 'gap-3',
  gridMd: 'gap-4',
  gridLg: 'gap-6',
} as const

// =============================================================================
// Buttons (aanvulling op shadcn Button)
// =============================================================================

export const buttonVariants = {
  // Icon-only button
  icon: 'p-2 rounded-lg hover:bg-accent transition-colors',

  // Text link style
  link: 'text-primary hover:underline',
} as const

// =============================================================================
// Form Elements
// =============================================================================

export const formElements = {
  // Standaard input (aanvulling als shadcn Input niet gebruikt wordt)
  input: 'w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring',

  // Select
  select: 'w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring',

  // Textarea
  textarea: 'w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none',
} as const

// =============================================================================
// Empty States
// =============================================================================

export const emptyState = {
  container: 'flex flex-col items-center justify-center py-12 text-center',
  icon: 'w-12 h-12 text-muted-foreground mb-4',
  title: 'text-lg font-medium text-foreground mb-2',
  description: 'text-sm text-muted-foreground mb-4 max-w-md',
} as const

// =============================================================================
// Loading States
// =============================================================================

export const loadingState = {
  container: 'flex items-center justify-center py-12',
  spinner: 'w-8 h-8 animate-spin text-primary',
} as const

// =============================================================================
// Sidebar
// =============================================================================
// Uses CSS custom properties: --sidebar-width, --sidebar-item-*

export const sidebar = {
  // Sidebar container
  // Uses: w-sidebar (--sidebar-width)
  container: 'flex flex-col h-full bg-surface-2 w-sidebar',

  // Collapsed sidebar container
  // Uses: w-sidebar-collapsed (--sidebar-width-collapsed)
  containerCollapsed: 'flex flex-col h-full bg-surface-2 w-sidebar-collapsed',

  // Sidebar item (niet actief)
  item: 'flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors',

  // Sidebar item (actief)
  itemActive: 'flex items-center gap-3 px-3 py-2 text-sm text-foreground bg-accent rounded-lg font-medium',

  // Section header
  sectionHeader: 'px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider',
} as const

// =============================================================================
// Tables
// =============================================================================

export const table = {
  container: 'w-full border border-border rounded-lg overflow-hidden',
  header: 'bg-muted/50',
  headerCell: 'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
  row: 'border-t border-border hover:bg-muted/30 transition-colors',
  cell: 'px-4 py-3 text-sm text-foreground',
} as const

// =============================================================================
// Badges
// =============================================================================

export const badges = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',

  // Varianten
  default: 'bg-secondary text-secondary-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
} as const

// =============================================================================
// Tooltips & Popovers
// =============================================================================

export const tooltip = {
  content: 'bg-popover text-popover-foreground px-3 py-1.5 text-sm rounded-lg shadow-lg border border-border',
} as const

// =============================================================================
// Helper: Combine classes with design tokens
// =============================================================================

export function combineCardClasses(
  variant: keyof typeof cards = 'base',
  padding: keyof typeof cardPadding = 'md',
  extraClasses?: string
): string {
  const base = cards[variant]
  const pad = cardPadding[padding]
  return extraClasses ? `${base} ${pad} ${extraClasses}` : `${base} ${pad}`
}

// =============================================================================
// CSS Custom Properties Reference
// =============================================================================
// This TypeScript file works in conjunction with globals.css
// The CSS file defines the actual token values, this file provides
// type-safe Tailwind class combinations.
//
// Token Hierarchy:
// 1. PRIMITIVE TOKENS (in globals.css)
//    - Colors: --color-{color}-{shade} (e.g., --color-gray-500)
//    - Typography: --font-size-*, --font-weight-*, --line-height-*
//    - Spacing: --space-*, --radius-*, --shadow-*
//
// 2. SEMANTIC TOKENS (in globals.css)
//    - Surfaces: --surface-1, --surface-2, --surface-3, --surface-elevated
//    - Text: --text-primary, --text-secondary, --text-tertiary, --text-muted
//    - Borders: --border-default, --border-muted, --border-strong
//    - Interactive: --interactive-hover, --interactive-active, --interactive-selected
//
// 3. COMPONENT TOKENS (in globals.css)
//    - Card: --card-background, --card-border, --card-radius, --card-padding-*
//    - Button: --button-radius, --button-padding-*, --button-font-*
//    - Input: --input-radius, --input-border, --input-padding-*
//    - Page: --page-padding-*, --page-max-width-*, --page-title-*
//    - Sidebar: --sidebar-width, --sidebar-width-collapsed, --sidebar-item-*
//    - Table: --table-header-background, --table-row-hover, --table-cell-padding-*
//    - Modal: --modal-background, --modal-overlay, --modal-radius, --modal-padding
//
// Tailwind Integration:
// The tailwind.config.js extends Tailwind with custom utilities that map to these tokens.
// Examples:
//   - bg-surface-2 → background: hsl(var(--surface-2))
//   - text-page-title → font-size: var(--page-title-size)
//   - rounded-card → border-radius: var(--card-radius)
//   - w-sidebar → width: var(--sidebar-width)
//   - max-w-page → max-width: var(--page-max-width)
