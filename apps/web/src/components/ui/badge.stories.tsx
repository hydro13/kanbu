/*
 * Badge Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Badge component showcasing all variants.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'outline',
        'destructive',
        'success',
        'warning',
        'error',
        'info',
        'priority-low',
        'priority-medium',
        'priority-high',
        'priority-urgent',
      ],
      description: 'The visual style of the badge',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Badge component for labels, statuses, and priorities. Uses semantic design tokens for consistent theming.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  args: {
    children: 'Badge',
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
    children: 'v2.0.0',
    variant: 'outline',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Deleted',
    variant: 'destructive',
  },
}

// =============================================================================
// Status Variants
// =============================================================================

export const Success: Story = {
  args: {
    children: 'Completed',
    variant: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for completed, active, or successful states.',
      },
    },
  },
}

export const Warning: Story = {
  args: {
    children: 'In Progress',
    variant: 'warning',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for pending, in-progress, or cautionary states.',
      },
    },
  },
}

export const Error: Story = {
  args: {
    children: 'Failed',
    variant: 'error',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for failed, blocked, or error states.',
      },
    },
  },
}

export const Info: Story = {
  args: {
    children: 'Pending Review',
    variant: 'info',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use for informational states or pending actions.',
      },
    },
  },
}

// =============================================================================
// Priority Variants
// =============================================================================

export const PriorityLow: Story = {
  args: {
    children: 'Low',
    variant: 'priority-low',
  },
}

export const PriorityMedium: Story = {
  args: {
    children: 'Medium',
    variant: 'priority-medium',
  },
}

export const PriorityHigh: Story = {
  args: {
    children: 'High',
    variant: 'priority-high',
  },
}

export const PriorityUrgent: Story = {
  args: {
    children: 'Urgent',
    variant: 'priority-urgent',
  },
}

// =============================================================================
// Overview Stories
// =============================================================================

export const AllStatusVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success">Completed</Badge>
      <Badge variant="warning">In Progress</Badge>
      <Badge variant="error">Failed</Badge>
      <Badge variant="info">Pending</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All status badge variants for quick comparison.',
      },
    },
  },
}

export const AllPriorityVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="priority-low">Low</Badge>
      <Badge variant="priority-medium">Medium</Badge>
      <Badge variant="priority-high">High</Badge>
      <Badge variant="priority-urgent">Urgent</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All priority badge variants for quick comparison.',
      },
    },
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">
          Basic
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">
          Status
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">
          Priority
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="priority-low">Low</Badge>
          <Badge variant="priority-medium">Medium</Badge>
          <Badge variant="priority-high">High</Badge>
          <Badge variant="priority-urgent">Urgent</Badge>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete overview of all badge variants.',
      },
    },
  },
}

// =============================================================================
// Usage Examples
// =============================================================================

export const TaskExample: Story = {
  render: () => (
    <div className="flex items-center gap-2 p-4 border rounded-lg">
      <span className="font-medium">KANBU-123</span>
      <span className="text-muted-foreground">Implement login flow</span>
      <Badge variant="priority-high">High</Badge>
      <Badge variant="warning">In Progress</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of badges used in a task list item.',
      },
    },
  },
}
