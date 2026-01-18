/*
 * Storybook Preview Configuration
 * Version: 1.0.0
 *
 * Configures global decorators, parameters, and styling for all stories.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Preview, ReactRenderer } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/styles/globals.css';
import '../src/styles/accents.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true, // We handle backgrounds via theme
    },
    layout: 'centered',
    docs: {
      toc: true,
    },
  },
  decorators: [
    // Theme decorator for light/dark mode
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    // Wrapper decorator for consistent styling
    (Story) => (
      <div className="font-sans bg-background text-foreground p-4">
        <Story />
      </div>
    ),
  ],
  globalTypes: {
    accent: {
      name: 'Accent Color',
      description: 'Accent color theme',
      defaultValue: 'blue',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'slate', title: 'Slate' },
          { value: 'blue', title: 'Blue' },
          { value: 'teal', title: 'Teal' },
          { value: 'violet', title: 'Violet' },
          { value: 'rose', title: 'Rose' },
          { value: 'amber', title: 'Amber' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
