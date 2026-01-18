/*
 * Tabs Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Tabs component showcasing all patterns.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { User, Settings, Bell, CreditCard, FileText } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Tabs component with design token styling. Built on Radix UI with keyboard navigation and smooth transitions.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">
        <p className="text-sm">This is the content for Tab 1.</p>
      </TabsContent>
      <TabsContent value="tab2">
        <p className="text-sm">This is the content for Tab 2.</p>
      </TabsContent>
      <TabsContent value="tab3">
        <p className="text-sm">This is the content for Tab 3.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">
          <User className="mr-2 h-4 w-4" />
          Account
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm">Manage your account settings.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm">Configure application settings.</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p className="text-sm">Manage notification preferences.</p>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tabs with icons next to labels.',
      },
    },
  },
};

export const IconsOnly: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[300px]">
      <TabsList>
        <TabsTrigger value="account">
          <User className="h-4 w-4" />
          <span className="sr-only">Account</span>
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm">Account settings</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm">App settings</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p className="text-sm">Notification preferences</p>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Icon-only tabs with screen reader labels for accessibility.',
      },
    },
  },
};

// =============================================================================
// States
// =============================================================================

export const WithDisabled: Story = {
  render: () => (
    <Tabs defaultValue="available" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="available">Available</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
      </TabsList>
      <TabsContent value="available">
        <p className="text-sm">This tab is available.</p>
      </TabsContent>
      <TabsContent value="disabled">
        <p className="text-sm">This content is not accessible.</p>
      </TabsContent>
      <TabsContent value="active">
        <p className="text-sm">This tab is active.</p>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tabs with disabled state.',
      },
    },
  },
};

// =============================================================================
// With Cards
// =============================================================================

export const WithCards: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[500px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>View your dashboard overview</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your recent activity and key metrics will appear here.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>Detailed analytics and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Charts and graphs showing your performance metrics.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Generate and download reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Export your data in various formats.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tabs with card content for each tab.',
      },
    },
  },
};

// =============================================================================
// Full Width
// =============================================================================

export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View all your tasks regardless of status.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="active">
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Tasks that are currently in progress.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="completed">
        <Card>
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Tasks that have been finished.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full width tabs using grid layout for equal spacing.',
      },
    },
  },
};

// =============================================================================
// Complex Content
// =============================================================================

export const AccountSettings: Story = {
  render: () => (
    <Tabs defaultValue="general" className="w-[600px]">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
      </TabsList>
      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Input id="bio" defaultValue="Software developer" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Manage your password and security preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button>Update Password</Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="billing">
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Manage your payment method and billing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/24</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
            </div>
            <Button>Update Billing</Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete account settings with forms in each tab.',
      },
    },
  },
};

export const Documentation: Story = {
  render: () => (
    <Tabs defaultValue="introduction" className="w-[700px]">
      <TabsList>
        <TabsTrigger value="introduction">
          <FileText className="mr-2 h-4 w-4" />
          Introduction
        </TabsTrigger>
        <TabsTrigger value="installation">Installation</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="api">API</TabsTrigger>
      </TabsList>
      <TabsContent value="introduction" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Introduction</h3>
          <p className="text-sm text-muted-foreground">
            Welcome to our component library. This documentation will help you get started with
            building beautiful, accessible user interfaces.
          </p>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm">
            Get started by installing the package and importing the components you need.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="installation" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Installation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Install the package using your preferred package manager.
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">npm install @company/ui</div>
        </div>
      </TabsContent>
      <TabsContent value="usage" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Usage</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Import and use components in your application.
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm">
            <code>import &#123; Button &#125; from '@company/ui'</code>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="api" className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">API Reference</h3>
          <p className="text-sm text-muted-foreground">
            Detailed API documentation for all components.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Documentation-style tabs with rich content.',
      },
    },
  },
};

// =============================================================================
// Nested Tabs
// =============================================================================

export const NestedTabs: Story = {
  render: () => (
    <Tabs defaultValue="profile" className="w-[600px]">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="nested-name">Name</Label>
                  <Input id="nested-name" defaultValue="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nested-age">Age</Label>
                  <Input id="nested-age" type="number" defaultValue="30" />
                </div>
              </TabsContent>
              <TabsContent value="professional" className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="nested-job">Job Title</Label>
                  <Input id="nested-job" defaultValue="Software Engineer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nested-company">Company</Label>
                  <Input id="nested-company" defaultValue="Acme Inc" />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">General settings go here.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nested tabs within tab content.',
      },
    },
  },
};
