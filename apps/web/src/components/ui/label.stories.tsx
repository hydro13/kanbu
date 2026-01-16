/*
 * Label Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Label component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { Input } from './input'
import { Checkbox } from './checkbox'
import { Switch } from './switch'

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Label component with design token styling. Works with peer-disabled pattern for disabled state styling.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Label>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => <Label htmlFor="example">Label Text</Label>,
}

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email">Email address</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label paired with an input field.',
      },
    },
  },
}

export const Required: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="name">
        Full name <span className="text-destructive">*</span>
      </Label>
      <Input id="name" required />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label with required indicator.',
      },
    },
  },
}

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="username">Username</Label>
      <Input id="username" />
      <p className="text-sm text-muted-foreground">
        This is your public display name.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label with helper text below the input.',
      },
    },
  },
}

// =============================================================================
// With Different Form Elements
// =============================================================================

export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms" className="cursor-pointer">
        Accept terms and conditions
      </Label>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label for a checkbox with cursor-pointer for better UX.',
      },
    },
  },
}

export const WithSwitch: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="notifications" />
      <Label htmlFor="notifications" className="cursor-pointer">
        Enable notifications
      </Label>
    </div>
  ),
}

// =============================================================================
// States
// =============================================================================

export const Disabled: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="disabled-input">Disabled field</Label>
      <Input id="disabled-input" disabled value="Cannot edit this" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Label with disabled input. The peer-disabled class automatically reduces opacity.',
      },
    },
  },
}

export const DisabledCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="disabled-checkbox" disabled />
      <Label htmlFor="disabled-checkbox">Disabled option</Label>
    </div>
  ),
}

// =============================================================================
// Form Examples
// =============================================================================

export const CompleteForm: Story = {
  render: () => (
    <form className="space-y-6 w-[400px]">
      <div className="space-y-2">
        <Label htmlFor="form-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="form-name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="form-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input id="form-email" type="email" required />
        <p className="text-sm text-muted-foreground">
          We'll never share your email.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="form-company">Company</Label>
        <Input id="form-company" placeholder="Optional" />
      </div>

      <div className="space-y-4">
        <Label>Preferences</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="newsletter" />
            <Label htmlFor="newsletter" className="cursor-pointer">
              Subscribe to newsletter
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="updates" defaultChecked />
            <Label htmlFor="updates" className="cursor-pointer">
              Receive product updates
            </Label>
          </div>
        </div>
      </div>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete form with various label patterns.',
      },
    },
  },
}

// =============================================================================
// Variations
// =============================================================================

export const Inline: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Label htmlFor="inline-input">Quick search:</Label>
      <Input id="inline-input" className="w-[200px]" placeholder="Type here..." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label displayed inline with input.',
      },
    },
  },
}

export const MultipleLabels: Story = {
  render: () => (
    <div className="space-y-6 w-[400px]">
      <div className="space-y-2">
        <Label htmlFor="field1">Field 1</Label>
        <Input id="field1" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field2">Field 2</Label>
        <Input id="field2" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="field3">Field 3</Label>
        <Input id="field3" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple labels in a form layout.',
      },
    },
  },
}

export const WithError: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="error-input">
        Email <span className="text-destructive">*</span>
      </Label>
      <Input
        id="error-input"
        type="email"
        value="invalid-email"
        className="border-destructive"
        aria-invalid="true"
      />
      <p className="text-sm text-destructive">Please enter a valid email address</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label with error state and error message.',
      },
    },
  },
}
