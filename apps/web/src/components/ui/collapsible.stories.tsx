/*
 * Collapsible Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Collapsible component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible'
import { Button } from './button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Collapsible> = {
  title: 'UI/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Collapsible component for showing and hiding content. Built on Radix UI with smooth transitions.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Collapsible>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px]">
        <div className="flex items-center justify-between space-x-4">
          <h4 className="text-sm font-semibold">
            @peduarte starred 3 repositories
          </h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="rounded-md border px-4 py-2 text-sm">
          @radix-ui/primitives
        </div>
        <CollapsibleContent className="space-y-2 mt-2">
          <div className="rounded-md border px-4 py-2 text-sm">
            @radix-ui/colors
          </div>
          <div className="rounded-md border px-4 py-2 text-sm">@stitches/react</div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
}

export const WithButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Can I use this in my project?</h4>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              {isOpen ? 'Hide' : 'Show'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border p-4 text-sm">
            <p className="text-muted-foreground">
              Yes! This project is MIT licensed. You are free to use it in your own projects, both commercial and non-commercial.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Collapsible with a button trigger.',
      },
    },
  },
}

// =============================================================================
// Icon Rotation
// =============================================================================

export const WithIconRotation: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[400px]">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg p-4 hover:bg-accent">
          <span className="font-semibold">Advanced Settings</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pt-2 pb-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Configure advanced options for your application.</p>
            <div className="space-y-2 mt-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span>Enable debug mode</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span>Use experimental features</span>
              </label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Collapsible with rotating chevron icon.',
      },
    },
  },
}

// =============================================================================
// FAQ Style
// =============================================================================

export const FAQItem: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[500px]">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <span className="font-medium text-left">
            How do I get started with the platform?
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-2">
          <div className="text-sm text-muted-foreground">
            <p>
              Getting started is easy! Follow these steps:
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Create an account</li>
              <li>Complete your profile</li>
              <li>Explore the dashboard</li>
              <li>Start creating your first project</li>
            </ol>
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'FAQ-style collapsible item.',
      },
    },
  },
}

export const MultipleFAQs: Story = {
  render: () => (
    <div className="w-[500px] space-y-2">
      {[
        {
          question: 'What is included in the free plan?',
          answer: 'The free plan includes up to 3 projects, 100 MB storage, and basic support.',
        },
        {
          question: 'Can I upgrade or downgrade my plan?',
          answer: 'Yes, you can change your plan at any time. Changes take effect immediately.',
        },
        {
          question: 'How do I cancel my subscription?',
          answer: 'You can cancel your subscription from the billing section in your account settings.',
        },
      ].map((faq, index) => (
        <Collapsible key={index}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
            <span className="font-medium text-left">{faq.question}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 pt-2">
            <p className="text-sm text-muted-foreground">{faq.answer}</p>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple FAQ items.',
      },
    },
  },
}

// =============================================================================
// Nested Collapsibles
// =============================================================================

export const Nested: Story = {
  render: () => (
    <div className="w-[500px]">
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <span className="font-semibold">Documentation</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 pt-2 space-y-2">
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-accent">
              <span className="font-medium">Getting Started</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 pt-2">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Installation</li>
                <li>• Quick Start Guide</li>
                <li>• Basic Concepts</li>
              </ul>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-accent">
              <span className="font-medium">Advanced Topics</span>
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 pt-2">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Authentication</li>
                <li>• State Management</li>
                <li>• Performance Optimization</li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nested collapsible sections.',
      },
    },
  },
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const SettingsPanel: Story = {
  render: () => (
    <div className="w-[500px] space-y-2">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted p-4">
          <span className="font-semibold">Account Settings</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-md border bg-background"
              defaultValue="user@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border bg-background"
              defaultValue="@username"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted p-4">
          <span className="font-semibold">Privacy Settings</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 space-y-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Make profile public</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" />
            <span className="text-sm">Show email address</span>
          </label>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted p-4">
          <span className="font-semibold">Notification Settings</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 space-y-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Email notifications</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Push notifications</span>
          </label>
        </CollapsibleContent>
      </Collapsible>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Settings panel with multiple collapsible sections.',
      },
    },
  },
}

export const FilterPanel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <h3 className="font-semibold mb-4">Filters</h3>

      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded">
          <span className="text-sm font-medium">Category</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="py-2 space-y-2">
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Electronics</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Clothing</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Books</span>
          </label>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded">
          <span className="text-sm font-medium">Price Range</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="py-2 space-y-2">
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Under $25</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">$25 - $50</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">$50 - $100</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Over $100</span>
          </label>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-2 hover:bg-accent rounded">
          <span className="text-sm font-medium">Brand</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="py-2 space-y-2">
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Brand A</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Brand B</span>
          </label>
          <label className="flex items-center space-x-2 px-2">
            <input type="checkbox" />
            <span className="text-sm">Brand C</span>
          </label>
        </CollapsibleContent>
      </Collapsible>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Filter sidebar with collapsible filter groups.',
      },
    },
  },
}
