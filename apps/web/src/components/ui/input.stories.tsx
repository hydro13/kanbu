/*
 * Input Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Input component showcasing all states and patterns.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { Search as SearchIcon, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      description: 'The type of input',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Input component with design token styling. Automatically adapts to light and dark mode.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="username">Username</Label>
      <Input id="username" placeholder="johndoe" />
      <p className="text-sm text-muted-foreground">Your username must be unique.</p>
    </div>
  ),
};

// =============================================================================
// Input Types
// =============================================================================

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
    min: 0,
    max: 100,
  },
};

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

// =============================================================================
// States
// =============================================================================

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Disabled input',
  },
};

export const WithError: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="email-error">Email</Label>
      <Input
        id="email-error"
        type="email"
        value="invalid-email"
        className="border-destructive focus-visible:ring-destructive"
        aria-invalid="true"
        aria-describedby="email-error-message"
      />
      <p id="email-error-message" className="text-sm text-destructive">
        Please enter a valid email address.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input with error state. Use border-destructive and aria-invalid for accessibility.',
      },
    },
  },
};

export const Required: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="required-input">
        Name <span className="text-destructive">*</span>
      </Label>
      <Input id="required-input" required aria-required="true" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Required field with visual indicator and aria attribute.',
      },
    },
  },
};

// =============================================================================
// With Icons
// =============================================================================

export const WithIconLeft: Story = {
  render: () => (
    <div className="relative w-[300px]">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input className="pl-10" placeholder="Search..." />
    </div>
  ),
};

export const WithIconRight: Story = {
  render: () => (
    <div className="relative w-[300px]">
      <Input type="email" placeholder="Email" className="pr-10" />
      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  ),
};

export const PasswordToggle: Story = {
  render: function PasswordToggleStory() {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <div className="relative w-[300px]">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          className="pl-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Password input with show/hide toggle button.',
      },
    },
  },
};

// =============================================================================
// With Button
// =============================================================================

export const WithButton: Story = {
  render: () => (
    <div className="flex w-[400px] gap-2">
      <Input type="email" placeholder="Email address" />
      <Button>Subscribe</Button>
    </div>
  ),
};

export const SearchWithButton: Story = {
  render: () => (
    <div className="flex w-[400px] gap-2">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search tasks..." />
      </div>
      <Button>Search</Button>
    </div>
  ),
};

// =============================================================================
// Form Example
// =============================================================================

export const FormExample: Story = {
  render: () => (
    <form className="space-y-4 w-[350px]">
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="form-company">Company</Label>
        <Input id="form-company" placeholder="Optional" />
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
        story: 'Complete form example with multiple inputs.',
      },
    },
  },
};

// =============================================================================
// File Input
// =============================================================================

export const FileInput: Story = {
  render: () => (
    <div className="space-y-2 w-[300px]">
      <Label htmlFor="file">Upload File</Label>
      <Input id="file" type="file" />
    </div>
  ),
};
