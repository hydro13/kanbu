/*
 * Card Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Card component and its sub-components.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card'
import { Button } from './button'
import { Badge } from './badge'
import { Input } from './input'
import { Label } from './label'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Card component for grouping related content. Uses design tokens for consistent theming in light and dark mode.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Card>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area where you can place any content.
        </p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px] p-6">
      <h3 className="font-semibold">Simple Card</h3>
      <p className="text-sm text-muted-foreground mt-2">
        A simple card without using sub-components.
      </p>
    </Card>
  ),
}

// =============================================================================
// With Content
// =============================================================================

export const WithForm: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to create an account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="John Doe" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="john@example.com" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Create Account</Button>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Card with a form inside, common pattern for settings and dialogs.',
      },
    },
  },
}

export const WithBadges: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>KANBU-123</CardTitle>
          <Badge variant="priority-high">High</Badge>
        </div>
        <CardDescription>Implement user authentication flow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Badge variant="warning">In Progress</Badge>
          <Badge variant="outline">Frontend</Badge>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Updated 2 hours ago
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Card representing a task with status badges.',
      },
    },
  },
}

// =============================================================================
// Stat Cards
// =============================================================================

export const StatCard: Story = {
  render: () => (
    <Card className="w-[200px]">
      <CardHeader className="pb-2">
        <CardDescription>Total Tasks</CardDescription>
        <CardTitle className="text-4xl">128</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          <span className="text-success">+12%</span> from last month
        </p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Compact stat card for dashboard metrics.',
      },
    },
  },
}

export const StatCards: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card className="w-[180px]">
        <CardHeader className="pb-2">
          <CardDescription>Open</CardDescription>
          <CardTitle className="text-3xl">42</CardTitle>
        </CardHeader>
      </Card>
      <Card className="w-[180px]">
        <CardHeader className="pb-2">
          <CardDescription>In Progress</CardDescription>
          <CardTitle className="text-3xl">18</CardTitle>
        </CardHeader>
      </Card>
      <Card className="w-[180px]">
        <CardHeader className="pb-2">
          <CardDescription>Completed</CardDescription>
          <CardTitle className="text-3xl">68</CardTitle>
        </CardHeader>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple stat cards for a dashboard overview.',
      },
    },
  },
}

// =============================================================================
// Interactive States
// =============================================================================

export const Hoverable: Story = {
  render: () => (
    <Card className="w-[350px] cursor-pointer transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>Hoverable Card</CardTitle>
        <CardDescription>Hover over me to see the shadow effect.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use this pattern for clickable cards that navigate to detail pages.
        </p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Card with hover effect for interactive/clickable cards.',
      },
    },
  },
}

// =============================================================================
// Grid Layout
// =============================================================================

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[700px]">
      <Card>
        <CardHeader>
          <CardTitle>Project Alpha</CardTitle>
          <CardDescription>Development project</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="success">Active</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Project Beta</CardTitle>
          <CardDescription>Research project</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="warning">In Progress</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Project Gamma</CardTitle>
          <CardDescription>Marketing campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="info">Planning</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Project Delta</CardTitle>
          <CardDescription>Legacy system</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Archived</Badge>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Cards in a responsive grid layout.',
      },
    },
  },
}
