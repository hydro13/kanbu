/*
 * Switch Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Switch component showcasing all states and patterns.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './switch';
import { Label } from './label';
import { Button } from './button';
import { useState } from 'react';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the switch is disabled',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the switch is checked',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Switch (toggle) component with design token styling. Automatically adapts to light and dark mode. Built on Radix UI.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

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
        story: 'Disabled switch in checked state.',
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
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode" className="cursor-pointer">
        Airplane Mode
      </Label>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Switch with label. The label has cursor-pointer for better UX when clicking.',
      },
    },
  },
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch id="marketing-emails" defaultChecked />
        <Label htmlFor="marketing-emails" className="cursor-pointer">
          Marketing emails
        </Label>
      </div>
      <p className="text-sm text-muted-foreground ml-8">
        Receive emails about new products, features, and more.
      </p>
    </div>
  ),
};

// =============================================================================
// Controlled State
// =============================================================================

export const Controlled: Story = {
  render: function ControlledStory() {
    const [enabled, setEnabled] = useState(false);

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch id="controlled" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="controlled" className="cursor-pointer">
            Notifications
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">Status: {enabled ? 'Enabled' : 'Disabled'}</p>
        <Button size="sm" onClick={() => setEnabled(!enabled)}>
          Toggle
        </Button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled switch with external state management.',
      },
    },
  },
};

// =============================================================================
// Switch Groups
// =============================================================================

export const NotificationSettings: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="text-base font-semibold mb-1">Notifications</h3>
        <p className="text-sm text-muted-foreground">Manage how you receive notifications</p>
      </div>
      <div className="space-y-4 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notif" className="cursor-pointer">
              Email notifications
            </Label>
            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
          </div>
          <Switch id="email-notif" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notif" className="cursor-pointer">
              Push notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive push notifications on your device
            </p>
          </div>
          <Switch id="push-notif" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sms-notif" className="cursor-pointer">
              SMS notifications
            </Label>
            <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
          </div>
          <Switch id="sms-notif" />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple switches in a settings panel layout.',
      },
    },
  },
};

export const FeatureToggles: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="text-base font-semibold mb-1">Feature Flags</h3>
        <p className="text-sm text-muted-foreground">Enable or disable experimental features</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="cursor-pointer">
            Dark Mode
          </Label>
          <Switch id="dark-mode" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-save" className="cursor-pointer">
            Auto Save
          </Label>
          <Switch id="auto-save" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="compact-mode" className="cursor-pointer">
            Compact Mode
          </Label>
          <Switch id="compact-mode" />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="animations" className="cursor-pointer">
            Animations
          </Label>
          <Switch id="animations" defaultChecked />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Feature toggle switches in a simple list layout.',
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
          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <h4 className="font-medium mb-3">Privacy</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="profile-public" className="cursor-pointer">
                      Public profile
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Make your profile visible to everyone
                    </p>
                  </div>
                  <Switch id="profile-public" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-email" className="cursor-pointer">
                      Show email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Display your email on your profile
                    </p>
                  </div>
                  <Switch id="show-email" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <h4 className="font-medium mb-3">Communication</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="newsletter" className="cursor-pointer">
                    Newsletter
                  </Label>
                  <Switch id="newsletter" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="product-updates" className="cursor-pointer">
                    Product updates
                  </Label>
                  <Switch id="product-updates" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="special-offers" className="cursor-pointer">
                    Special offers
                  </Label>
                  <Switch id="special-offers" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" type="button">
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete form example with grouped switches.',
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
        <Switch id="unchecked" />
        <Label htmlFor="unchecked">Unchecked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="checked-demo" defaultChecked />
        <Label htmlFor="checked-demo">Checked</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-off" disabled />
        <Label htmlFor="disabled-off" className="opacity-50">
          Disabled (off)
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="disabled-on" disabled checked />
        <Label htmlFor="disabled-on" className="opacity-50">
          Disabled (on)
        </Label>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcase of all switch states.',
      },
    },
  },
};

// =============================================================================
// Real-World Examples
// =============================================================================

export const SecuritySettings: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="text-base font-semibold mb-1">Security</h3>
        <p className="text-sm text-muted-foreground">Manage your account security settings</p>
      </div>
      <div className="space-y-4 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="2fa" className="cursor-pointer font-medium">
              Two-factor authentication
            </Label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <Switch id="2fa" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="session-alerts" className="cursor-pointer font-medium">
              Login alerts
            </Label>
            <p className="text-sm text-muted-foreground">Get notified about new login activity</p>
          </div>
          <Switch id="session-alerts" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-logout" className="cursor-pointer font-medium">
              Auto logout
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically log out after 30 minutes of inactivity
            </p>
          </div>
          <Switch id="auto-logout" defaultChecked />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Security settings with switches for various security features.',
      },
    },
  },
};

export const AccessibilitySettings: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="text-base font-semibold mb-1">Accessibility</h3>
        <p className="text-sm text-muted-foreground">Customize your experience</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="reduce-motion" className="cursor-pointer">
              Reduce motion
            </Label>
            <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
          </div>
          <Switch id="reduce-motion" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="high-contrast" className="cursor-pointer">
              High contrast
            </Label>
            <p className="text-sm text-muted-foreground">
              Increase contrast for better readability
            </p>
          </div>
          <Switch id="high-contrast" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="large-text" className="cursor-pointer">
              Large text
            </Label>
            <p className="text-sm text-muted-foreground">Increase text size throughout the app</p>
          </div>
          <Switch id="large-text" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="keyboard-nav" className="cursor-pointer">
              Keyboard navigation hints
            </Label>
            <p className="text-sm text-muted-foreground">Show keyboard shortcuts and hints</p>
          </div>
          <Switch id="keyboard-nav" defaultChecked />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Accessibility settings with various toggle options.',
      },
    },
  },
};
