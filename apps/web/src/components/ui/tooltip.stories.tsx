/*
 * Tooltip Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Tooltip component showcasing all patterns.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'
import { Button } from './button'
import {
  Plus,
  Settings,
  HelpCircle,
  Info,
  Trash2,
  Edit,
  Copy,
  Download,
} from 'lucide-react'

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Tooltip component with design token styling. Built on Radix UI with positioning and animations. Requires TooltipProvider wrapper.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
}

export const OnButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Add Item</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Add a new item to your list</p>
      </TooltipContent>
    </Tooltip>
  ),
}

export const OnIconButton: Story = {
  render: () => (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Help & Support</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add new</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltips on icon buttons for better accessibility.',
      },
    },
  },
}

export const OnText: Story = {
  render: () => (
    <p className="text-sm">
      This is a paragraph with a{' '}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted cursor-help">
            tooltip trigger
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>This text has a tooltip</p>
        </TooltipContent>
      </Tooltip>{' '}
      in the middle of it.
    </p>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltip on inline text with dotted underline.',
      },
    },
  },
}

// =============================================================================
// Positioning
// =============================================================================

export const Positions: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-16">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Top (default)</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex gap-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Left</Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tooltip on left</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Right</Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Tooltip on right</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltips can be positioned on all four sides.',
      },
    },
  },
}

// =============================================================================
// Content Variations
// =============================================================================

export const WithRichContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">
          <Info className="mr-2 h-4 w-4" />
          More Info
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <p className="font-semibold">Feature Information</p>
          <p className="text-sm">
            This feature allows you to manage your settings and preferences
            efficiently.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltip with richer content including heading and paragraph.',
      },
    },
  },
}

export const LongText: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Long tooltip</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>
          This is a longer tooltip with more text to demonstrate how the tooltip
          handles longer content. The max-width keeps it readable.
        </p>
      </TooltipContent>
    </Tooltip>
  ),
}

export const WithKeyboardShortcut: Story = {
  render: () => (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <span>Copy</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>C
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <span>Download</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>S
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltips showing keyboard shortcuts.',
      },
    },
  },
}

// =============================================================================
// Disabled State
// =============================================================================

export const DisabledButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button disabled>Disabled Button</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>This action is currently unavailable</p>
      </TooltipContent>
    </Tooltip>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Tooltip on disabled button. Note: disabled buttons need a wrapper span to receive focus.',
      },
    },
  },
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const Toolbar: Story = {
  render: () => (
    <div className="flex gap-1 rounded-lg border p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Copy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Toolbar with icon buttons, each having a tooltip.',
      },
    },
  },
}

export const StatusIndicators: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-3 w-3 rounded-full bg-success cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>All systems operational</p>
          </TooltipContent>
        </Tooltip>
        <span className="text-sm">Services Status</span>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-3 w-3 rounded-full bg-warning cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Minor performance issues detected</p>
          </TooltipContent>
        </Tooltip>
        <span className="text-sm">Database Status</span>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-3 w-3 rounded-full bg-destructive cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Service unavailable - investigating</p>
          </TooltipContent>
        </Tooltip>
        <span className="text-sm">API Status</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status indicators with tooltips explaining the status.',
      },
    },
  },
}

export const InlineHelp: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Your username must be 3-20 characters and can only contain letters,
                numbers, and underscores.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <input
          id="username"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="johndoe"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="api-key" className="text-sm font-medium">
            API Key
          </label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Your API key is used to authenticate requests. Keep it secret and
                never share it publicly.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <input
          id="api-key"
          type="password"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="sk_live_..."
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Help icons with tooltips providing inline assistance.',
      },
    },
  },
}

// =============================================================================
// Delay Configuration
// =============================================================================

export const CustomDelay: Story = {
  render: () => (
    <div className="flex gap-4">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="outline">Instant</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>No delay</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={700}>
        <TooltipTrigger asChild>
          <Button variant="outline">Default (700ms)</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Default delay</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={1500}>
        <TooltipTrigger asChild>
          <Button variant="outline">Slow (1500ms)</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Longer delay</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tooltips with different delay durations before showing.',
      },
    },
  },
}
