/*
 * Checkbox Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Checkbox component showcasing all states and patterns.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Button } from './button';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Checkbox component with design token styling. Automatically adapts to light and dark mode. Built on Radix UI.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled checkbox in checked state.',
      },
    },
  },
};

// =============================================================================
// With Label
// =============================================================================

export const WithLabel: Story = {
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
        story: 'Checkbox with label. The label has cursor-pointer for better UX.',
      },
    },
  },
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="marketing" />
        <Label htmlFor="marketing" className="cursor-pointer">
          Email marketing
        </Label>
      </div>
      <p className="text-sm text-muted-foreground ml-6">
        Receive emails about new products, features, and more.
      </p>
    </div>
  ),
};

// =============================================================================
// Required/Validation
// =============================================================================

export const Required: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="required-checkbox" required aria-required="true" />
        <Label htmlFor="required-checkbox" className="cursor-pointer">
          I agree to the terms <span className="text-destructive">*</span>
        </Label>
      </div>
      <p className="text-sm text-muted-foreground ml-6">This field is required</p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Required checkbox with visual indicator and aria attribute for accessibility.',
      },
    },
  },
};

export const WithError: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="error-checkbox"
          className="border-destructive"
          aria-invalid="true"
          aria-describedby="error-message"
        />
        <Label htmlFor="error-checkbox" className="cursor-pointer">
          I agree to the terms <span className="text-destructive">*</span>
        </Label>
      </div>
      <p id="error-message" className="text-sm text-destructive ml-6">
        You must accept the terms and conditions
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Checkbox with error state. Use border-destructive and aria-invalid for accessibility.',
      },
    },
  },
};

// =============================================================================
// Checkbox Groups
// =============================================================================

export const CheckboxGroup: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Notifications</Label>
        <p className="text-sm text-muted-foreground">
          Choose which notifications you want to receive
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox id="email-notif" defaultChecked />
          <Label htmlFor="email-notif" className="cursor-pointer">
            Email notifications
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="push-notif" defaultChecked />
          <Label htmlFor="push-notif" className="cursor-pointer">
            Push notifications
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="sms-notif" />
          <Label htmlFor="sms-notif" className="cursor-pointer">
            SMS notifications
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="weekly-digest" />
          <Label htmlFor="weekly-digest" className="cursor-pointer">
            Weekly digest
          </Label>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple checkboxes in a group with section header.',
      },
    },
  },
};

export const NestedCheckboxes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="all-notifications" />
        <Label htmlFor="all-notifications" className="cursor-pointer font-semibold">
          Enable all notifications
        </Label>
      </div>
      <div className="ml-6 space-y-3 border-l-2 border-border pl-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="comments" defaultChecked />
          <Label htmlFor="comments" className="cursor-pointer">
            Comments
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="mentions" defaultChecked />
          <Label htmlFor="mentions" className="cursor-pointer">
            Mentions
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="updates" />
          <Label htmlFor="updates" className="cursor-pointer">
            Updates
          </Label>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nested checkboxes with parent/child relationship.',
      },
    },
  },
};

// =============================================================================
// Form Example
// =============================================================================

export const FormExample: Story = {
  render: () => (
    <form className="space-y-6 max-w-md">
      <div>
        <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="font-medium">Email Preferences</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="form-newsletter" defaultChecked />
              <Label htmlFor="form-newsletter" className="cursor-pointer">
                Newsletter
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="form-updates" defaultChecked />
              <Label htmlFor="form-updates" className="cursor-pointer">
                Product updates
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="form-offers" />
              <Label htmlFor="form-offers" className="cursor-pointer">
                Special offers
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="font-medium">Privacy</Label>
            <div className="flex items-center space-x-2">
              <Checkbox id="form-public" />
              <Label htmlFor="form-public" className="cursor-pointer">
                Make profile public
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="form-analytics" defaultChecked />
              <Label htmlFor="form-analytics" className="cursor-pointer">
                Allow analytics
              </Label>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="form-terms" required />
              <Label htmlFor="form-terms" className="cursor-pointer">
                I agree to the terms and conditions <span className="text-destructive">*</span>
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit">Save preferences</Button>
      </div>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete form example with multiple checkbox groups.',
      },
    },
  },
};

// =============================================================================
// States Showcase
// =============================================================================

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="checked-demo" defaultChecked />
        <Label htmlFor="checked-demo">Checked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-unchecked" disabled />
        <Label htmlFor="disabled-unchecked" className="opacity-50">
          Disabled (unchecked)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="disabled-checked" disabled checked />
        <Label htmlFor="disabled-checked" className="opacity-50">
          Disabled (checked)
        </Label>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcase of all checkbox states.',
      },
    },
  },
};
