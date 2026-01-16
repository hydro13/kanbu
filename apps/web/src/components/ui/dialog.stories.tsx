/*
 * Dialog Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Dialog component showcasing all patterns and use cases.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Checkbox } from './checkbox'
import { Trash2, AlertTriangle, Settings } from 'lucide-react'

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Dialog (modal) component with design token styling. Built on Radix UI with backdrop blur and smooth animations.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Dialog>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a basic dialog example with header, description, and footer.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Dialog content goes here. You can add any content you want.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const WithoutDescription: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm">Dialog without description text.</p>
        </div>
        <DialogFooter>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// =============================================================================
// Form Dialog
// =============================================================================

export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Enter your details to create a new account.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms" className="cursor-pointer text-sm">
              I agree to the terms and conditions
            </Label>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">Create Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog containing a form with inputs and validation.',
      },
    },
  },
}

export const EditProfile: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" defaultValue="@johndoe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              defaultValue="I like to build things."
              placeholder="Tell us about yourself"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Website</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              defaultValue="https://johndoe.com"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

// =============================================================================
// Confirmation Dialogs
// =============================================================================

export const ConfirmAction: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Save Changes</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action will save all your changes. You can undo this later if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Simple confirmation dialog for user actions.',
      },
    },
  },
}

export const DestructiveAction: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">
              Warning: This is a permanent action
            </p>
            <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All your data will be deleted</li>
              <li>You will lose access to all projects</li>
              <li>This cannot be recovered</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive">Delete Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Destructive action dialog with warning styling and clear consequences.',
      },
    },
  },
}

// =============================================================================
// Content Variations
// =============================================================================

export const ScrollableContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Terms of Service</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Please read our terms of service carefully.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[50vh] py-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Introduction</h3>
              <p className="text-muted-foreground">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
                ad minim veniam, quis nostrud exercitation ullamco laboris.
              </p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">2. User Accounts</h3>
              <p className="text-muted-foreground">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt mollit
                anim id est laborum.
              </p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">3. Privacy Policy</h3>
              <p className="text-muted-foreground">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
                quae ab illo inventore veritatis et quasi architecto beatae vitae
                dicta sunt explicabo.
              </p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">4. Terms and Conditions</h3>
              <p className="text-muted-foreground">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
                fugit, sed quia consequuntur magni dolores eos qui ratione
                voluptatem sequi nesciunt.
              </p>
            </section>
            <section>
              <h3 className="font-semibold mb-2">5. Liability</h3>
              <p className="text-muted-foreground">
                Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
                consectetur, adipisci velit, sed quia non numquam eius modi tempora
                incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
              </p>
            </section>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Decline</Button>
          </DialogClose>
          <Button>Accept</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog with scrollable content for long text.',
      },
    },
  },
}

export const SmallDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Small Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Link</DialogTitle>
          <DialogDescription>
            Anyone with this link can view the document.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 py-4">
          <Input value="https://example.com/share/abc123" readOnly />
          <Button size="sm">Copy</Button>
        </div>
        <DialogFooter className="sm:justify-start">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Smaller dialog width (max-w-md) for compact content.',
      },
    },
  },
}

export const LargeDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Large Dialog</Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Image Gallery</DialogTitle>
          <DialogDescription>Browse through your uploaded images.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 py-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted flex items-center justify-center"
            >
              <span className="text-muted-foreground">Image {i}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Larger dialog width (max-w-6xl) for content-rich layouts.',
      },
    },
  },
}

// =============================================================================
// Alert Dialog Pattern
// =============================================================================

export const AlertDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Show Alert</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Expired</DialogTitle>
          <DialogDescription>
            Your session has expired. Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button>Log In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Alert-style dialog with single action (no cancel button).',
      },
    },
  },
}

// =============================================================================
// Complex Content
// =============================================================================

export const ComplexContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Project Settings</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Configure your project settings and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">General</h4>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input id="project-name" defaultValue="My Awesome Project" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="A brief description"
                defaultValue="This is my project"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">Notifications</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="email-updates" defaultChecked />
                <Label htmlFor="email-updates" className="cursor-pointer">
                  Email me when someone comments
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="push-updates" />
                <Label htmlFor="push-updates" className="cursor-pointer">
                  Push notifications for mentions
                </Label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">Danger Zone</h4>
            <div className="rounded-lg border border-destructive/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">Delete Project</p>
                  <p className="text-sm text-muted-foreground">
                    Once deleted, this cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Complex dialog with multiple sections, inputs, checkboxes, and danger zone.',
      },
    },
  },
}
