/*
 * Kanbu Design System - Tailwind Configuration
 * Version: 2.0.0
 *
 * Extends Tailwind with design tokens from globals.css
 * All custom utilities map to CSS variables for consistency.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * Change: Complete Tailwind integration (Fase 6)
 * ===================================================================
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      /* =================================================================
         COLORS
         ================================================================= */
      colors: {
        // Shadcn/UI compatibility colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Semantic surface colors
        surface: {
          DEFAULT: 'hsl(var(--surface-1))',
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
          elevated: 'hsl(var(--surface-elevated))',
          sunken: 'hsl(var(--surface-sunken))',
        },

        // Text semantic colors
        'text-color': {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
          muted: 'hsl(var(--text-muted))',
          disabled: 'hsl(var(--text-disabled))',
          inverse: 'hsl(var(--text-inverse))',
          link: 'hsl(var(--text-link))',
          'link-hover': 'hsl(var(--text-link-hover))',
          success: 'hsl(var(--text-success))',
          warning: 'hsl(var(--text-warning))',
          error: 'hsl(var(--text-error))',
        },

        // State colors
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          muted: 'hsl(var(--success-muted))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          muted: 'hsl(var(--warning-muted))',
        },
        error: {
          DEFAULT: 'hsl(var(--error))',
          foreground: 'hsl(var(--error-foreground))',
          muted: 'hsl(var(--error-muted))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          muted: 'hsl(var(--info-muted))',
        },

        // Priority colors
        priority: {
          low: 'hsl(var(--priority-low))',
          medium: 'hsl(var(--priority-medium))',
          high: 'hsl(var(--priority-high))',
          urgent: 'hsl(var(--priority-urgent))',
        },

        // Border semantic colors
        'border-color': {
          DEFAULT: 'hsl(var(--border-default))',
          muted: 'hsl(var(--border-muted))',
          strong: 'hsl(var(--border-strong))',
          focus: 'hsl(var(--border-focus))',
          error: 'hsl(var(--border-error))',
          success: 'hsl(var(--border-success))',
        },

        // Interactive states
        interactive: {
          hover: 'var(--interactive-hover)',
          active: 'var(--interactive-active)',
          selected: 'hsl(var(--interactive-selected))',
          disabled: 'hsl(var(--interactive-disabled))',
        },

        // Primitive color scales (for advanced use)
        gray: {
          50: 'hsl(var(--color-gray-50))',
          100: 'hsl(var(--color-gray-100))',
          200: 'hsl(var(--color-gray-200))',
          300: 'hsl(var(--color-gray-300))',
          400: 'hsl(var(--color-gray-400))',
          500: 'hsl(var(--color-gray-500))',
          600: 'hsl(var(--color-gray-600))',
          700: 'hsl(var(--color-gray-700))',
          800: 'hsl(var(--color-gray-800))',
          900: 'hsl(var(--color-gray-900))',
          950: 'hsl(var(--color-gray-950))',
        },
        blue: {
          50: 'hsl(var(--color-blue-50))',
          100: 'hsl(var(--color-blue-100))',
          200: 'hsl(var(--color-blue-200))',
          300: 'hsl(var(--color-blue-300))',
          400: 'hsl(var(--color-blue-400))',
          500: 'hsl(var(--color-blue-500))',
          600: 'hsl(var(--color-blue-600))',
          700: 'hsl(var(--color-blue-700))',
          800: 'hsl(var(--color-blue-800))',
          900: 'hsl(var(--color-blue-900))',
          950: 'hsl(var(--color-blue-950))',
        },
        teal: {
          50: 'hsl(var(--color-teal-50))',
          100: 'hsl(var(--color-teal-100))',
          200: 'hsl(var(--color-teal-200))',
          300: 'hsl(var(--color-teal-300))',
          400: 'hsl(var(--color-teal-400))',
          500: 'hsl(var(--color-teal-500))',
          600: 'hsl(var(--color-teal-600))',
          700: 'hsl(var(--color-teal-700))',
          800: 'hsl(var(--color-teal-800))',
          900: 'hsl(var(--color-teal-900))',
          950: 'hsl(var(--color-teal-950))',
        },
        violet: {
          50: 'hsl(var(--color-violet-50))',
          100: 'hsl(var(--color-violet-100))',
          200: 'hsl(var(--color-violet-200))',
          300: 'hsl(var(--color-violet-300))',
          400: 'hsl(var(--color-violet-400))',
          500: 'hsl(var(--color-violet-500))',
          600: 'hsl(var(--color-violet-600))',
          700: 'hsl(var(--color-violet-700))',
          800: 'hsl(var(--color-violet-800))',
          900: 'hsl(var(--color-violet-900))',
          950: 'hsl(var(--color-violet-950))',
        },
        rose: {
          50: 'hsl(var(--color-rose-50))',
          100: 'hsl(var(--color-rose-100))',
          200: 'hsl(var(--color-rose-200))',
          300: 'hsl(var(--color-rose-300))',
          400: 'hsl(var(--color-rose-400))',
          500: 'hsl(var(--color-rose-500))',
          600: 'hsl(var(--color-rose-600))',
          700: 'hsl(var(--color-rose-700))',
          800: 'hsl(var(--color-rose-800))',
          900: 'hsl(var(--color-rose-900))',
          950: 'hsl(var(--color-rose-950))',
        },
        orange: {
          50: 'hsl(var(--color-orange-50))',
          100: 'hsl(var(--color-orange-100))',
          200: 'hsl(var(--color-orange-200))',
          300: 'hsl(var(--color-orange-300))',
          400: 'hsl(var(--color-orange-400))',
          500: 'hsl(var(--color-orange-500))',
          600: 'hsl(var(--color-orange-600))',
          700: 'hsl(var(--color-orange-700))',
          800: 'hsl(var(--color-orange-800))',
          900: 'hsl(var(--color-orange-900))',
          950: 'hsl(var(--color-orange-950))',
        },
        amber: {
          50: 'hsl(var(--color-amber-50))',
          100: 'hsl(var(--color-amber-100))',
          200: 'hsl(var(--color-amber-200))',
          300: 'hsl(var(--color-amber-300))',
          400: 'hsl(var(--color-amber-400))',
          500: 'hsl(var(--color-amber-500))',
          600: 'hsl(var(--color-amber-600))',
          700: 'hsl(var(--color-amber-700))',
          800: 'hsl(var(--color-amber-800))',
          900: 'hsl(var(--color-amber-900))',
          950: 'hsl(var(--color-amber-950))',
        },
        red: {
          50: 'hsl(var(--color-red-50))',
          100: 'hsl(var(--color-red-100))',
          200: 'hsl(var(--color-red-200))',
          300: 'hsl(var(--color-red-300))',
          400: 'hsl(var(--color-red-400))',
          500: 'hsl(var(--color-red-500))',
          600: 'hsl(var(--color-red-600))',
          700: 'hsl(var(--color-red-700))',
          800: 'hsl(var(--color-red-800))',
          900: 'hsl(var(--color-red-900))',
          950: 'hsl(var(--color-red-950))',
        },
        green: {
          50: 'hsl(var(--color-green-50))',
          100: 'hsl(var(--color-green-100))',
          200: 'hsl(var(--color-green-200))',
          300: 'hsl(var(--color-green-300))',
          400: 'hsl(var(--color-green-400))',
          500: 'hsl(var(--color-green-500))',
          600: 'hsl(var(--color-green-600))',
          700: 'hsl(var(--color-green-700))',
          800: 'hsl(var(--color-green-800))',
          900: 'hsl(var(--color-green-900))',
          950: 'hsl(var(--color-green-950))',
        },
        cyan: {
          50: 'hsl(var(--color-cyan-50))',
          100: 'hsl(var(--color-cyan-100))',
          200: 'hsl(var(--color-cyan-200))',
          300: 'hsl(var(--color-cyan-300))',
          400: 'hsl(var(--color-cyan-400))',
          500: 'hsl(var(--color-cyan-500))',
          600: 'hsl(var(--color-cyan-600))',
          700: 'hsl(var(--color-cyan-700))',
          800: 'hsl(var(--color-cyan-800))',
          900: 'hsl(var(--color-cyan-900))',
          950: 'hsl(var(--color-cyan-950))',
        },
      },

      /* =================================================================
         BORDER RADIUS
         ================================================================= */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Component-specific radii
        card: 'var(--card-radius)',
        button: 'var(--button-radius)',
        input: 'var(--input-radius)',
        badge: 'var(--badge-radius)',
        avatar: 'var(--avatar-radius)',
        tooltip: 'var(--tooltip-radius)',
        toast: 'var(--toast-radius)',
        tabs: 'var(--tabs-radius)',
        dropdown: 'var(--dropdown-radius)',
        modal: 'var(--modal-radius)',
        popover: 'var(--popover-radius)',
        table: 'var(--table-radius)',
      },

      /* =================================================================
         TYPOGRAPHY
         ================================================================= */
      fontSize: {
        '2xs': ['var(--font-size-2xs)', { lineHeight: 'var(--line-height-normal)' }],
        // Component-specific font sizes
        'page-title': ['var(--page-title-size)', { fontWeight: 'var(--page-title-weight)' }],
        'page-title-lg': [
          'var(--page-title-size-lg)',
          { fontWeight: 'var(--page-title-weight-lg)' },
        ],
        'section-title': [
          'var(--section-title-size)',
          { fontWeight: 'var(--section-title-weight)' },
        ],
        button: 'var(--button-font-size)',
        'button-sm': 'var(--button-font-size-sm)',
        'button-lg': 'var(--button-font-size-lg)',
        input: 'var(--input-font-size)',
        badge: 'var(--badge-font-size)',
        tooltip: 'var(--tooltip-font-size)',
        tabs: 'var(--tabs-font-size)',
      },
      fontWeight: {
        button: 'var(--button-font-weight)',
        badge: 'var(--badge-font-weight)',
        tabs: 'var(--tabs-font-weight)',
      },

      /* =================================================================
         SPACING & SIZING
         ================================================================= */
      width: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
      maxWidth: {
        page: 'var(--page-max-width)',
        'page-narrow': 'var(--page-max-width-narrow)',
        'page-wide': 'var(--page-max-width-wide)',
        toast: 'var(--toast-max-width)',
        modal: 'var(--modal-max-width)',
        'modal-sm': 'var(--modal-max-width-sm)',
        'modal-lg': 'var(--modal-max-width-lg)',
        'modal-xl': 'var(--modal-max-width-xl)',
      },
      padding: {
        card: 'var(--card-padding)',
        'card-sm': 'var(--card-padding-sm)',
        'card-lg': 'var(--card-padding-lg)',
        modal: 'var(--modal-padding)',
        toast: 'var(--toast-padding)',
        popover: 'var(--popover-padding)',
        dropdown: 'var(--dropdown-padding)',
      },
      gap: {
        section: 'var(--section-gap)',
      },

      /* =================================================================
         SHADOWS
         ================================================================= */
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-default)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        inner: 'var(--shadow-inner)',
        none: 'var(--shadow-none)',
        // Component-specific shadows
        card: 'var(--card-shadow)',
        tooltip: 'var(--tooltip-shadow)',
        toast: 'var(--toast-shadow)',
        dropdown: 'var(--dropdown-shadow)',
        modal: 'var(--modal-shadow)',
        popover: 'var(--popover-shadow)',
      },

      /* =================================================================
         Z-INDEX
         ================================================================= */
      zIndex: {
        base: 'var(--z-base)',
        docked: 'var(--z-docked)',
        dropdown: 'var(--z-dropdown)',
        sticky: 'var(--z-sticky)',
        banner: 'var(--z-banner)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        toast: 'var(--z-toast)',
        tooltip: 'var(--z-tooltip)',
        max: 'var(--z-max)',
      },

      /* =================================================================
         ANIMATION & TRANSITIONS
         ================================================================= */
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fastest: 'var(--duration-fastest)',
        faster: 'var(--duration-faster)',
        fast: 'var(--duration-fast)',
        DEFAULT: 'var(--duration-normal)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
        slowest: 'var(--duration-slowest)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease-out)',
        linear: 'var(--ease-linear)',
        in: 'var(--ease-in)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        bounce: 'var(--ease-bounce)',
        spring: 'var(--ease-spring)',
      },

      /* =================================================================
         COMPONENT SIZES (Avatar, etc.)
         ================================================================= */
      size: {
        'avatar-xs': 'var(--avatar-size-xs)',
        'avatar-sm': 'var(--avatar-size-sm)',
        'avatar-md': 'var(--avatar-size-md)',
        'avatar-lg': 'var(--avatar-size-lg)',
        'avatar-xl': 'var(--avatar-size-xl)',
      },

      /* =================================================================
         KEYFRAME ANIMATIONS
         ================================================================= */
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 100%': {
            transform: 'translateY(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        skeleton: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in var(--duration-normal) var(--ease-out)',
        'fade-out': 'fade-out var(--duration-normal) var(--ease-out)',
        'slide-in-from-top': 'slide-in-from-top var(--duration-normal) var(--ease-out)',
        'slide-in-from-bottom': 'slide-in-from-bottom var(--duration-normal) var(--ease-out)',
        'slide-in-from-left': 'slide-in-from-left var(--duration-normal) var(--ease-out)',
        'slide-in-from-right': 'slide-in-from-right var(--duration-normal) var(--ease-out)',
        'scale-in': 'scale-in var(--duration-fast) var(--ease-out)',
        'scale-out': 'scale-out var(--duration-fast) var(--ease-out)',
        spin: 'spin 1s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite',
        skeleton: 'skeleton 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
