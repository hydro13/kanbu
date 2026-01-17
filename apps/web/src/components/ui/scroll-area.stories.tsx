/*
 * ScrollArea Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the ScrollArea component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScrollArea, ScrollBar } from './scroll-area'
import { Separator } from './separator'

const meta: Meta<typeof ScrollArea> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Custom scrollbar component with design token styling. Built on Radix UI. Supports vertical and horizontal scrolling.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ScrollArea>

// =============================================================================
// Basic Variants
// =============================================================================

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
      <div className="space-y-4">
        <h4 className="font-medium leading-none">Tags</h4>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="text-sm">
            Tag {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-24 rounded-md bg-muted flex items-center justify-center"
          >
            {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Horizontal scrolling with custom scrollbar.',
      },
    },
  },
}

// =============================================================================
// Different Heights
// =============================================================================

export const SmallHeight: Story = {
  render: () => (
    <ScrollArea className="h-32 w-[350px] rounded-md border p-4">
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="text-sm">
            Item {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const MediumHeight: Story = {
  render: () => (
    <ScrollArea className="h-64 w-[350px] rounded-md border p-4">
      <div className="space-y-2">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="text-sm">
            Item {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const LargeHeight: Story = {
  render: () => (
    <ScrollArea className="h-96 w-[350px] rounded-md border p-4">
      <div className="space-y-2">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="text-sm">
            Item {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const ChatMessages: Story = {
  render: () => (
    <ScrollArea className="h-[400px] w-[350px] rounded-md border">
      <div className="p-4 space-y-4">
        {[
          { user: 'Alice', message: 'Hey, how are you?', time: '10:32 AM' },
          { user: 'Bob', message: "I'm good! Working on the new project.", time: '10:33 AM' },
          { user: 'Alice', message: 'That sounds interesting! Tell me more.', time: '10:34 AM' },
          { user: 'Bob', message: "It's a design system project with React.", time: '10:35 AM' },
          { user: 'Alice', message: 'Cool! Are you using Tailwind?', time: '10:36 AM' },
          { user: 'Bob', message: 'Yes, with custom design tokens.', time: '10:37 AM' },
          { user: 'Alice', message: 'Nice! How is it going so far?', time: '10:38 AM' },
          { user: 'Bob', message: "Pretty well! Making good progress.", time: '10:39 AM' },
          { user: 'Alice', message: 'Let me know if you need any help!', time: '10:40 AM' },
          { user: 'Bob', message: 'Will do, thanks!', time: '10:41 AM' },
        ].map((msg, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{msg.user}</span>
              <span className="text-xs text-muted-foreground">{msg.time}</span>
            </div>
            <p className="text-sm text-muted-foreground">{msg.message}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Chat message list with scrollable area.',
      },
    },
  },
}

export const FileList: Story = {
  render: () => (
    <ScrollArea className="h-[300px] w-[400px] rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 font-semibold">Files</h4>
        <div className="space-y-1">
          {[
            { name: 'document.pdf', size: '2.4 MB', date: 'Jan 15, 2024' },
            { name: 'image.png', size: '1.2 MB', date: 'Jan 14, 2024' },
            { name: 'spreadsheet.xlsx', size: '856 KB', date: 'Jan 13, 2024' },
            { name: 'presentation.pptx', size: '4.8 MB', date: 'Jan 12, 2024' },
            { name: 'report.docx', size: '1.1 MB', date: 'Jan 11, 2024' },
            { name: 'data.csv', size: '234 KB', date: 'Jan 10, 2024' },
            { name: 'archive.zip', size: '12.3 MB', date: 'Jan 9, 2024' },
            { name: 'video.mp4', size: '45.2 MB', date: 'Jan 8, 2024' },
            { name: 'audio.mp3', size: '3.4 MB', date: 'Jan 7, 2024' },
            { name: 'notes.txt', size: '12 KB', date: 'Jan 6, 2024' },
          ].map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-sm hover:bg-accent"
            >
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.size}</p>
              </div>
              <span className="text-xs text-muted-foreground">{file.date}</span>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'File list with metadata.',
      },
    },
  },
}

export const MenuList: Story = {
  render: () => (
    <ScrollArea className="h-[300px] w-[250px] rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium">Categories</h4>
        <div className="space-y-1">
          {[
            'All Items',
            'Electronics',
            'Computers & Laptops',
            'Mobile Phones',
            'Tablets',
            'Cameras',
            'Audio Equipment',
            'Home & Garden',
            'Furniture',
            'Kitchen Appliances',
            'Outdoor',
            'Fashion',
            'Men\'s Clothing',
            'Women\'s Clothing',
            'Shoes',
            'Accessories',
            'Sports & Outdoors',
            'Books & Media',
            'Toys & Games',
          ].map((item, i) => (
            <React.Fragment key={i}>
              <button className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent">
                {item}
              </button>
              {(i === 6 || i === 10 || i === 15) && <Separator className="my-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Category menu with sections.',
      },
    },
  },
}

export const CodeBlock: Story = {
  render: () => (
    <ScrollArea className="h-[300px] w-[500px] rounded-md border">
      <div className="p-4 font-mono text-sm">
        <pre>{`import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Login with:', email, password)
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}`}</pre>
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Code block with syntax highlighting.',
      },
    },
  },
}

export const ImageGallery: Story = {
  render: () => (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-[200px] w-[200px] rounded-md bg-muted flex items-center justify-center"
          >
            Image {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Horizontal image gallery.',
      },
    },
  },
}

export const NotificationList: Story = {
  render: () => (
    <ScrollArea className="h-[350px] w-[400px] rounded-md border">
      <div className="p-4 space-y-4">
        {[
          {
            title: 'New message',
            description: 'You have a new message from Alice',
            time: '5 minutes ago',
          },
          {
            title: 'Task completed',
            description: 'Your task "Update documentation" is complete',
            time: '1 hour ago',
          },
          {
            title: 'System update',
            description: 'A new system update is available',
            time: '2 hours ago',
          },
          {
            title: 'Meeting reminder',
            description: 'Team meeting starts in 30 minutes',
            time: '3 hours ago',
          },
          {
            title: 'New follower',
            description: 'John Doe started following you',
            time: '5 hours ago',
          },
          {
            title: 'File uploaded',
            description: 'document.pdf was successfully uploaded',
            time: '1 day ago',
          },
          {
            title: 'Comment added',
            description: 'Someone commented on your post',
            time: '2 days ago',
          },
        ].map((notif, i) => (
          <div key={i} className="pb-4 border-b last:border-0">
            <div className="space-y-1">
              <p className="text-sm font-medium">{notif.title}</p>
              <p className="text-sm text-muted-foreground">{notif.description}</p>
              <p className="text-xs text-muted-foreground">{notif.time}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Notification list with timestamps.',
      },
    },
  },
}
