/*
 * Button Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Button component showcasing all variants and sizes.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Plus, ChevronRight, Loader2, Settings, Trash } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'outline',
        'ghost',
        'link',
        'destructive',
        'success',
        'warning',
      ],
      description: 'The visual style of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child component (for composition)',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Button component with multiple variants for different use cases. Uses design tokens for consistent theming.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  args: {
    children: 'Default Button',
    variant: 'default',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
}

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
}

export const Ghost: Story = {
  args: {
    children: 'Ghost',
    variant: 'ghost',
  },
}

export const Link: Story = {
  args: {
    children: 'Link Button',
    variant: 'link',
  },
}

// =============================================================================
// Status Variants
// =============================================================================

export const Destructive: Story = {
  args: {
    children: 'Delete',
    variant: 'destructive',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for dangerous or destructive actions like delete.',
      },
    },
  },
}

export const Success: Story = {
  args: {
    children: 'Approve',
    variant: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for positive confirmations and success actions.',
      },
    },
  },
}

export const Warning: Story = {
  args: {
    children: 'Archive',
    variant: 'warning',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for cautionary actions that require attention.',
      },
    },
  },
}

// =============================================================================
// Sizes
// =============================================================================

export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
}

export const IconButton: Story = {
  args: {
    size: 'icon',
    'aria-label': 'Settings',
    children: <Settings className="h-4 w-4" />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Icon-only buttons must have an aria-label for accessibility.',
      },
    },
  },
}

// =============================================================================
// With Icons
// =============================================================================

export const WithIconLeft: Story = {
  render: () => (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Add Item
    </Button>
  ),
}

export const WithIconRight: Story = {
  render: () => (
    <Button>
      Next
      <ChevronRight className="ml-2 h-4 w-4" />
    </Button>
  ),
}

// =============================================================================
// States
// =============================================================================

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
}

export const Loading: Story = {
  render: () => (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Use a spinner icon and disabled state to indicate loading.',
      },
    },
  },
}

// =============================================================================
// All Variants Overview
// =============================================================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All button variants displayed together for comparison.',
      },
    },
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Settings">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All button sizes displayed together for comparison.',
      },
    },
  },
}

export const DestructiveActions: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">
        <Trash className="mr-2 h-4 w-4" />
        Delete Project
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Example of destructive action pattern with cancel and delete buttons.',
      },
    },
  },
}
