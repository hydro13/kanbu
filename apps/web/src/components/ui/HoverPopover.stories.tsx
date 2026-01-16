/*
 * HoverPopover Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the HoverPopover component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { HoverPopover, PopoverHeader, PopoverContent } from './HoverPopover'
import { Button } from './button'
import { User, Info, HelpCircle, Settings, Mail, Star } from 'lucide-react'

const meta: Meta<typeof HoverPopover> = {
  title: 'UI/HoverPopover',
  component: HoverPopover,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Hover-triggered popover with smart positioning and delays. Shows content when hovering over trigger element.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof HoverPopover>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <div className="flex items-center justify-center h-64">
      <HoverPopover
        content={
          <div className="p-4">
            <p className="text-sm">This is a hover popover with default settings.</p>
          </div>
        }
      >
        <Button variant="outline">Hover me</Button>
      </HoverPopover>
    </div>
  ),
}

export const WithHeader: Story = {
  render: () => (
    <div className="flex items-center justify-center h-64">
      <HoverPopover
        content={
          <>
            <PopoverHeader icon={<Info className="h-4 w-4" />} title="Information" />
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                This popover includes a header with an icon.
              </p>
            </div>
          </>
        }
      >
        <Button variant="outline">
          <Info className="mr-2 h-4 w-4" />
          Show Info
        </Button>
      </HoverPopover>
    </div>
  ),
}

// =============================================================================
// Positions
// =============================================================================

export const Positions: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-32 p-16">
      <HoverPopover
        position="top"
        content={
          <div className="p-4">
            <p className="text-sm">Popover on top</p>
          </div>
        }
      >
        <Button variant="outline">Top</Button>
      </HoverPopover>

      <div className="flex gap-16">
        <HoverPopover
          position="left"
          content={
            <div className="p-4">
              <p className="text-sm">Popover on left</p>
            </div>
          }
        >
          <Button variant="outline">Left</Button>
        </HoverPopover>

        <HoverPopover
          position="right"
          content={
            <div className="p-4">
              <p className="text-sm">Popover on right</p>
            </div>
          }
        >
          <Button variant="outline">Right</Button>
        </HoverPopover>
      </div>

      <HoverPopover
        position="bottom"
        content={
          <div className="p-4">
            <p className="text-sm">Popover on bottom</p>
          </div>
        }
      >
        <Button variant="outline">Bottom</Button>
      </HoverPopover>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Popovers positioned on all four sides.',
      },
    },
  },
}

// =============================================================================
// Content Variations
// =============================================================================

export const RichContent: Story = {
  render: () => (
    <div className="flex items-center justify-center h-96">
      <HoverPopover
        content={
          <>
            <PopoverHeader icon={<Settings className="h-4 w-4" />} title="Settings" />
            <div className="p-4 space-y-3">
              <div>
                <h4 className="font-medium text-sm">General Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Configure your preferences
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked />
                  <span className="text-sm">Enable notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" />
                  <span className="text-sm">Auto-save</span>
                </label>
              </div>
            </div>
          </>
        }
      >
        <Button variant="outline">
          <Settings className="h-4 w-4" />
        </Button>
      </HoverPopover>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Popover with rich content including checkboxes and sections.',
      },
    },
  },
}

export const LongContent: Story = {
  render: () => (
    <div className="flex items-center justify-center h-96">
      <HoverPopover
        maxHeight={250}
        content={
          <>
            <PopoverHeader title="Terms of Service" />
            <PopoverContent className="p-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                  eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <p>
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
                  nisi ut aliquip ex ea commodo consequat.
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur.
                </p>
                <p>
                  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
                  officia deserunt mollit anim id est laborum.
                </p>
              </div>
            </PopoverContent>
          </>
        }
      >
        <Button variant="outline">Show Terms</Button>
      </HoverPopover>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Popover with long scrollable content.',
      },
    },
  },
}

// =============================================================================
// Width Variations
// =============================================================================

export const CustomWidth: Story = {
  render: () => (
    <div className="flex items-center justify-center gap-4 h-64">
      <HoverPopover
        width={200}
        content={
          <div className="p-4">
            <p className="text-sm">Narrow popover (200px)</p>
          </div>
        }
      >
        <Button variant="outline" size="sm">
          Narrow
        </Button>
      </HoverPopover>

      <HoverPopover
        width={400}
        content={
          <div className="p-4">
            <p className="text-sm">Wide popover (400px)</p>
          </div>
        }
      >
        <Button variant="outline" size="sm">
          Wide
        </Button>
      </HoverPopover>

      <HoverPopover
        width={600}
        content={
          <div className="p-4">
            <p className="text-sm">Extra wide popover (600px)</p>
          </div>
        }
      >
        <Button variant="outline" size="sm">
          Extra Wide
        </Button>
      </HoverPopover>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Popovers with different widths.',
      },
    },
  },
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const UserCard: Story = {
  render: () => (
    <div className="flex items-center justify-center h-80">
      <HoverPopover
        content={
          <>
            <PopoverHeader icon={<User className="h-4 w-4" />} title="John Doe" subtitle="@johndoe" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="font-medium">142</span>
                  <p className="text-muted-foreground">Following</p>
                </div>
                <div>
                  <span className="font-medium">1,247</span>
                  <p className="text-muted-foreground">Followers</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Software developer passionate about design systems and user
                experience.
              </p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">
                  Follow
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        }
      >
        <button className="text-sm font-medium text-primary hover:underline">
          @johndoe
        </button>
      </HoverPopover>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'User profile card shown on hover.',
      },
    },
  },
}

export const HelpTooltip: Story = {
  render: () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2">
        <span className="text-sm">Complex Setting</span>
        <HoverPopover
          width={300}
          content={
            <>
              <PopoverHeader icon={<HelpCircle className="h-4 w-4" />} title="Help" />
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  This setting controls how the system handles data synchronization.
                  When enabled, changes are synced automatically every 5 minutes.
                </p>
                <div className="mt-3 text-sm">
                  <p className="font-medium">Recommended:</p>
                  <p className="text-muted-foreground">Enable for most users</p>
                </div>
              </div>
            </>
          }
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
        </HoverPopover>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Help icon with detailed explanation on hover.',
      },
    },
  },
}

export const FeaturePreview: Story = {
  render: () => (
    <div className="flex items-center justify-center gap-4 h-96">
      {['Analytics', 'Reports', 'Exports'].map((feature) => (
        <HoverPopover
          key={feature}
          content={
            <>
              <PopoverHeader icon={<Star className="h-4 w-4" />} title={`${feature} Feature`} />
              <div className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  This feature allows you to {feature.toLowerCase()} your data with
                  advanced filtering and customization options.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span>Real-time updates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span>Export to CSV/PDF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span>Custom filters</span>
                  </div>
                </div>
                <Button size="sm" className="w-full mt-4">
                  Learn More
                </Button>
              </div>
            </>
          }
        >
          <Button variant="outline">{feature}</Button>
        </HoverPopover>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Feature previews with bullet points and call-to-action.',
      },
    },
  },
}

export const MultiplePopovers: Story = {
  render: () => (
    <div className="flex items-center justify-center gap-8 h-64">
      {[1, 2, 3, 4].map((num) => (
        <HoverPopover
          key={num}
          content={
            <div className="p-4">
              <p className="text-sm">Popover {num}</p>
              <p className="text-sm text-muted-foreground">
                This is the content for popover number {num}.
              </p>
            </div>
          }
        >
          <Button variant="outline">Item {num}</Button>
        </HoverPopover>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple independent popovers.',
      },
    },
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center justify-center h-64">
      <HoverPopover
        disabled
        content={
          <div className="p-4">
            <p className="text-sm">This should not appear</p>
          </div>
        }
      >
        <Button variant="outline" disabled>
          Disabled Popover
        </Button>
      </HoverPopover>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled popover that does not show on hover.',
      },
    },
  },
}

export const OnText: Story = {
  render: () => (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm max-w-md">
        This is a paragraph with a{' '}
        <HoverPopover
          content={
            <div className="p-3">
              <p className="text-sm">Additional information appears on hover.</p>
            </div>
          }
        >
          <span className="underline decoration-dotted cursor-help text-primary">
            hover trigger
          </span>
        </HoverPopover>{' '}
        that shows more information when you hover over it.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Popover triggered by inline text.',
      },
    },
  },
}
