/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
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
        // Design System: Semantic surface colors
        surface: {
          DEFAULT: 'hsl(var(--surface-1))',
          1: 'hsl(var(--surface-1))',
          2: 'hsl(var(--surface-2))',
          3: 'hsl(var(--surface-3))',
          elevated: 'hsl(var(--surface-elevated))',
        },
        // Design System: Text colors
        'text-color': {
          primary: 'hsl(var(--text-primary))',
          secondary: 'hsl(var(--text-secondary))',
          tertiary: 'hsl(var(--text-tertiary))',
          muted: 'hsl(var(--text-muted))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Design System: Component-specific radii
        card: 'var(--card-radius)',
        button: 'var(--button-radius)',
        input: 'var(--input-radius)',
      },
      // Design System: Custom font sizes
      fontSize: {
        'page-title': ['var(--page-title-size)', { fontWeight: 'var(--page-title-weight)' }],
        'page-title-lg': ['var(--page-title-size-lg)', { fontWeight: 'var(--page-title-weight-lg)' }],
        'section-title': ['var(--section-title-size)', { fontWeight: 'var(--section-title-weight)' }],
      },
      // Design System: Custom widths
      width: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-width-collapsed)',
      },
      // Design System: Custom max-widths
      maxWidth: {
        page: 'var(--page-max-width)',
        'page-narrow': 'var(--page-max-width-narrow)',
      },
      // Design System: Custom padding
      padding: {
        card: 'var(--card-padding)',
        'card-sm': 'var(--card-padding-sm)',
        'card-lg': 'var(--card-padding-lg)',
      },
    },
  },
  plugins: [],
}
