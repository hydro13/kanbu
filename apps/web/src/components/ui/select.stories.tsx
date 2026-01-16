/*
 * Select Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Select component showcasing all patterns.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from './select'
import { Label } from './label'
import { Button } from './button'

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Select component with design token styling. Built on Radix UI with keyboard navigation and animations.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Select>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
        <SelectItem value="pear">Pear</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="fruit-select">Choose a fruit</Label>
      <Select>
        <SelectTrigger id="fruit-select">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="orange">Orange</SelectItem>
          <SelectItem value="pear">Pear</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="timezone">Timezone</Label>
      <Select defaultValue="utc">
        <SelectTrigger id="timezone">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="utc">UTC</SelectItem>
          <SelectItem value="est">Eastern Time</SelectItem>
          <SelectItem value="pst">Pacific Time</SelectItem>
          <SelectItem value="cet">Central European Time</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Select your preferred timezone
      </p>
    </div>
  ),
}

// =============================================================================
// With Groups and Labels
// =============================================================================

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
          <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
          <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
          <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
          <SelectItem value="akst">Alaska Standard Time (AKST)</SelectItem>
          <SelectItem value="hst">Hawaii Standard Time (HST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
          <SelectItem value="cet">Central European Time (CET)</SelectItem>
          <SelectItem value="eet">Eastern European Time (EET)</SelectItem>
          <SelectItem value="west">Western European Summer Time (WEST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Asia</SelectLabel>
          <SelectItem value="ist">India Standard Time (IST)</SelectItem>
          <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
          <SelectItem value="kst">Korea Standard Time (KST)</SelectItem>
          <SelectItem value="cst-china">China Standard Time (CST)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select with grouped options using labels and separators.',
      },
    },
  },
}

// =============================================================================
// States
// =============================================================================

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithDisabledOptions: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select your plan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="free">Free</SelectItem>
        <SelectItem value="pro">Pro</SelectItem>
        <SelectItem value="enterprise" disabled>
          Enterprise (Coming Soon)
        </SelectItem>
        <SelectItem value="custom" disabled>
          Custom (Contact Sales)
        </SelectItem>
      </SelectContent>
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select with some disabled options.',
      },
    },
  },
}

export const WithDefaultValue: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="language">Programming Language</Label>
      <Select defaultValue="typescript">
        <SelectTrigger id="language">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="javascript">JavaScript</SelectItem>
          <SelectItem value="typescript">TypeScript</SelectItem>
          <SelectItem value="python">Python</SelectItem>
          <SelectItem value="java">Java</SelectItem>
          <SelectItem value="csharp">C#</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select with a default value pre-selected.',
      },
    },
  },
}

// =============================================================================
// Long Lists
// =============================================================================

export const LongList: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="us">United States</SelectItem>
        <SelectItem value="uk">United Kingdom</SelectItem>
        <SelectItem value="ca">Canada</SelectItem>
        <SelectItem value="au">Australia</SelectItem>
        <SelectItem value="de">Germany</SelectItem>
        <SelectItem value="fr">France</SelectItem>
        <SelectItem value="es">Spain</SelectItem>
        <SelectItem value="it">Italy</SelectItem>
        <SelectItem value="nl">Netherlands</SelectItem>
        <SelectItem value="be">Belgium</SelectItem>
        <SelectItem value="ch">Switzerland</SelectItem>
        <SelectItem value="at">Austria</SelectItem>
        <SelectItem value="se">Sweden</SelectItem>
        <SelectItem value="no">Norway</SelectItem>
        <SelectItem value="dk">Denmark</SelectItem>
        <SelectItem value="fi">Finland</SelectItem>
        <SelectItem value="pl">Poland</SelectItem>
        <SelectItem value="cz">Czech Republic</SelectItem>
        <SelectItem value="ie">Ireland</SelectItem>
        <SelectItem value="pt">Portugal</SelectItem>
      </SelectContent>
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Select with many options. Scroll buttons appear automatically when content exceeds max height.',
      },
    },
  },
}

// =============================================================================
// Form Examples
// =============================================================================

export const InForm: Story = {
  render: () => (
    <form className="space-y-4 w-[350px]">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <input
          id="name"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Select required>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="developer">Developer</SelectItem>
            <SelectItem value="designer">Designer</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="experience">Experience Level</Label>
        <Select>
          <SelectTrigger id="experience">
            <SelectValue placeholder="Select experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="junior">Junior (0-2 years)</SelectItem>
            <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
            <SelectItem value="senior">Senior (5+ years)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit">Submit</Button>
      </div>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select components used in a form with other inputs.',
      },
    },
  },
}

// =============================================================================
// Width Variations
// =============================================================================

export const SmallWidth: Story = {
  render: () => (
    <Select defaultValue="sm">
      <SelectTrigger className="w-[100px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="xs">XS</SelectItem>
        <SelectItem value="sm">SM</SelectItem>
        <SelectItem value="md">MD</SelectItem>
        <SelectItem value="lg">LG</SelectItem>
        <SelectItem value="xl">XL</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <div className="w-full">
      <Select>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="This select spans the full width" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
          <SelectItem value="option3">Option 3</SelectItem>
        </SelectContent>
      </SelectContent>
    </div>
  ),
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const PrioritySelector: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="priority">Task Priority</Label>
      <Select defaultValue="medium">
        <SelectTrigger id="priority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="urgent">🔴 Urgent</SelectItem>
          <SelectItem value="high">🟠 High</SelectItem>
          <SelectItem value="medium">🟡 Medium</SelectItem>
          <SelectItem value="low">🟢 Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Priority selector with emoji indicators.',
      },
    },
  },
}

export const StatusSelector: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="status">Project Status</Label>
      <Select>
        <SelectTrigger id="status">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Active</SelectLabel>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Completed</SelectLabel>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Issues</SelectLabel>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status selector with grouped options by category.',
      },
    },
  },
}

export const ThemeSelector: Story = {
  render: () => (
    <div className="space-y-2 w-[250px]">
      <Label htmlFor="theme">Theme</Label>
      <Select defaultValue="system">
        <SelectTrigger id="theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">☀️ Light</SelectItem>
          <SelectItem value="dark">🌙 Dark</SelectItem>
          <SelectItem value="system">💻 System</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        Choose your preferred theme
      </p>
    </div>
  ),
}

export const MultipleSelects: Story = {
  render: () => (
    <div className="space-y-6 w-[400px]">
      <h3 className="text-lg font-semibold">Filter Options</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select>
            <SelectTrigger id="category">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="work">Work</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select>
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort">Sort By</Label>
          <Select defaultValue="date">
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="order">Order</Label>
          <Select defaultValue="desc">
            <SelectTrigger id="order">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="w-full">Apply Filters</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple selects working together for filtering and sorting.',
      },
    },
  },
}
