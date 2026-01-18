/*
 * Separator Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Separator component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Orientation of the separator',
    },
    decorative: {
      control: 'boolean',
      description: 'Whether the separator is decorative (for accessibility)',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Separator component with design token styling. Built on Radix UI. Supports horizontal and vertical orientations.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

// =============================================================================
// Basic Variants
// =============================================================================

export const Horizontal: Story = {
  render: () => (
    <div>
      <p className="text-sm">Content above</p>
      <Separator className="my-4" />
      <p className="text-sm">Content below</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center space-x-4">
      <span className="text-sm">Left</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Middle</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Right</span>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Vertical separator for inline content.',
      },
    },
  },
};

// =============================================================================
// In Content
// =============================================================================

export const InList: Story = {
  render: () => (
    <div className="max-w-md space-y-1">
      <div className="p-3">
        <h4 className="text-sm font-medium">Item 1</h4>
        <p className="text-sm text-muted-foreground">Description for item 1</p>
      </div>
      <Separator />
      <div className="p-3">
        <h4 className="text-sm font-medium">Item 2</h4>
        <p className="text-sm text-muted-foreground">Description for item 2</p>
      </div>
      <Separator />
      <div className="p-3">
        <h4 className="text-sm font-medium">Item 3</h4>
        <p className="text-sm text-muted-foreground">Description for item 3</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Separators between list items.',
      },
    },
  },
};

export const InSections: Story = {
  render: () => (
    <div className="max-w-md space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Section 1</h3>
        <p className="text-sm text-muted-foreground">This is the content for the first section.</p>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-semibold mb-2">Section 2</h3>
        <p className="text-sm text-muted-foreground">This is the content for the second section.</p>
      </div>
      <Separator />
      <div>
        <h3 className="text-lg font-semibold mb-2">Section 3</h3>
        <p className="text-sm text-muted-foreground">This is the content for the third section.</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Separators dividing content sections.',
      },
    },
  },
};

// =============================================================================
// In Layouts
// =============================================================================

export const InCard: Story = {
  render: () => (
    <div className="max-w-md rounded-lg border">
      <div className="p-4">
        <h3 className="font-semibold">Card Header</h3>
        <p className="text-sm text-muted-foreground">Header description</p>
      </div>
      <Separator />
      <div className="p-4">
        <p className="text-sm">Main card content goes here.</p>
      </div>
      <Separator />
      <div className="p-4 flex justify-end gap-2">
        <button className="px-3 py-1.5 text-sm rounded-md border">Cancel</button>
        <button className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground">
          Save
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Separators in a card layout.',
      },
    },
  },
};

export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Bold</span>
      </button>
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Italic</span>
      </button>
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Underline</span>
      </button>
      <Separator orientation="vertical" className="h-6" />
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Left</span>
      </button>
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Center</span>
      </button>
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Right</span>
      </button>
      <Separator orientation="vertical" className="h-6" />
      <button className="p-2 rounded hover:bg-accent">
        <span className="text-sm">Link</span>
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Vertical separators in a toolbar to group related actions.',
      },
    },
  },
};

export const InMenu: Story = {
  render: () => (
    <div className="w-56 rounded-lg border p-1">
      <button className="w-full px-2 py-1.5 text-left text-sm rounded-sm hover:bg-accent">
        Profile
      </button>
      <button className="w-full px-2 py-1.5 text-left text-sm rounded-sm hover:bg-accent">
        Settings
      </button>
      <Separator className="my-1" />
      <button className="w-full px-2 py-1.5 text-left text-sm rounded-sm hover:bg-accent">
        Help
      </button>
      <button className="w-full px-2 py-1.5 text-left text-sm rounded-sm hover:bg-accent">
        Documentation
      </button>
      <Separator className="my-1" />
      <button className="w-full px-2 py-1.5 text-left text-sm rounded-sm hover:bg-accent text-destructive">
        Log out
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Separators grouping menu items.',
      },
    },
  },
};

// =============================================================================
// Spacing Variations
// =============================================================================

export const WithDifferentSpacing: Story = {
  render: () => (
    <div className="max-w-md space-y-6">
      <div>
        <p className="text-sm">Tight spacing</p>
        <Separator className="my-2" />
        <p className="text-sm">Content below</p>
      </div>

      <div>
        <p className="text-sm">Normal spacing</p>
        <Separator className="my-4" />
        <p className="text-sm">Content below</p>
      </div>

      <div>
        <p className="text-sm">Wide spacing</p>
        <Separator className="my-6" />
        <p className="text-sm">Content below</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Separators with different spacing using my-* classes.',
      },
    },
  },
};

// =============================================================================
// Real-World Examples
// =============================================================================

export const UserProfile: Story = {
  render: () => (
    <div className="max-w-md rounded-lg border">
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div>
            <h3 className="font-semibold">John Doe</h3>
            <p className="text-sm text-muted-foreground">john@example.com</p>
          </div>
        </div>
      </div>
      <Separator />
      <div className="p-6 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Member since</span>
          <span>January 2024</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Projects</span>
          <span>12</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tasks completed</span>
          <span>147</span>
        </div>
      </div>
      <Separator />
      <div className="p-6 flex gap-2">
        <button className="flex-1 px-3 py-1.5 text-sm rounded-md border">View Profile</button>
        <button className="flex-1 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground">
          Edit
        </button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'User profile card with separators between sections.',
      },
    },
  },
};

export const FeatureList: Story = {
  render: () => (
    <div className="max-w-md">
      <div className="space-y-1">
        <div className="flex items-center justify-between p-3 hover:bg-accent rounded-md">
          <div>
            <h4 className="text-sm font-medium">Feature 1</h4>
            <p className="text-sm text-muted-foreground">Description</p>
          </div>
          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">Active</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between p-3 hover:bg-accent rounded-md">
          <div>
            <h4 className="text-sm font-medium">Feature 2</h4>
            <p className="text-sm text-muted-foreground">Description</p>
          </div>
          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">Active</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between p-3 hover:bg-accent rounded-md opacity-60">
          <div>
            <h4 className="text-sm font-medium">Feature 3</h4>
            <p className="text-sm text-muted-foreground">Description</p>
          </div>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Feature list with status indicators.',
      },
    },
  },
};
