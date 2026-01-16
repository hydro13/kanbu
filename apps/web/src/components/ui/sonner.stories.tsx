/*
 * Sonner (Toast) Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Sonner toast notifications.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toaster } from './sonner'
import { Button } from './button'
import { toast } from 'sonner'

const meta: Meta<typeof Toaster> = {
  title: 'UI/Sonner',
  component: Toaster,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Toast notification system using Sonner with design token styling. Supports success, error, warning, loading, and custom toasts.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Toaster>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  render: () => (
    <Button onClick={() => toast('This is a toast notification')}>
      Show Toast
    </Button>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('Event created', {
          description: 'Your event has been created successfully.',
        })
      }
    >
      With Description
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Toast with a description for additional context.',
      },
    },
  },
}

// =============================================================================
// Status Variants
// =============================================================================

export const Success: Story = {
  render: () => (
    <Button
      onClick={() => toast.success('Changes saved successfully')}
      variant="outline"
    >
      Success Toast
    </Button>
  ),
}

export const Error: Story = {
  render: () => (
    <Button
      onClick={() => toast.error('Failed to save changes')}
      variant="outline"
    >
      Error Toast
    </Button>
  ),
}

export const Warning: Story = {
  render: () => (
    <Button
      onClick={() => toast.warning('Your session will expire soon')}
      variant="outline"
    >
      Warning Toast
    </Button>
  ),
}

export const Info: Story = {
  render: () => (
    <Button
      onClick={() => toast.info('New update available')}
      variant="outline"
    >
      Info Toast
    </Button>
  ),
}

// =============================================================================
// With Actions
// =============================================================================

export const WithAction: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('File uploaded', {
          description: 'document.pdf has been uploaded.',
          action: {
            label: 'View',
            onClick: () => console.log('View clicked'),
          },
        })
      }
    >
      With Action
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Toast with an action button.',
      },
    },
  },
}

export const WithCancel: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('Are you sure?', {
          description: 'This action cannot be undone.',
          cancel: {
            label: 'Cancel',
            onClick: () => console.log('Cancelled'),
          },
          action: {
            label: 'Continue',
            onClick: () => console.log('Continued'),
          },
        })
      }
    >
      With Cancel
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Toast with both cancel and action buttons.',
      },
    },
  },
}

// =============================================================================
// Loading States
// =============================================================================

export const LoadingPromise: Story = {
  render: () => (
    <Button
      onClick={() => {
        toast.promise(
          new Promise((resolve) => setTimeout(resolve, 2000)),
          {
            loading: 'Saving changes...',
            success: 'Changes saved!',
            error: 'Failed to save changes',
          }
        )
      }}
    >
      Promise Toast
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Toast that shows loading, success, or error state based on a promise.',
      },
    },
  },
}

export const Loading: Story = {
  render: () => (
    <Button onClick={() => toast.loading('Processing your request...')}>
      Loading Toast
    </Button>
  ),
}

// =============================================================================
// Duration and Dismissal
// =============================================================================

export const CustomDuration: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button
        onClick={() =>
          toast('Quick notification', {
            duration: 1000,
          })
        }
        variant="outline"
        size="sm"
      >
        1 second
      </Button>
      <Button
        onClick={() =>
          toast('Normal notification', {
            duration: 4000,
          })
        }
        variant="outline"
        size="sm"
      >
        4 seconds
      </Button>
      <Button
        onClick={() =>
          toast('Long notification', {
            duration: 10000,
          })
        }
        variant="outline"
        size="sm"
      >
        10 seconds
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Toasts with custom duration.',
      },
    },
  },
}

export const PersistentToast: Story = {
  render: () => (
    <Button
      onClick={() =>
        toast('This toast will stay until dismissed', {
          duration: Infinity,
        })
      }
    >
      Persistent Toast
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Toast that stays until manually dismissed.',
      },
    },
  },
}

// =============================================================================
// Multiple Toasts
// =============================================================================

export const MultipleToasts: Story = {
  render: () => (
    <Button
      onClick={() => {
        toast.success('Task 1 completed')
        setTimeout(() => toast.success('Task 2 completed'), 500)
        setTimeout(() => toast.success('Task 3 completed'), 1000)
      }}
    >
      Show Multiple
    </Button>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple toasts appearing in sequence.',
      },
    },
  },
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const FileOperations: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() =>
          toast.success('File uploaded', {
            description: 'document.pdf (2.4 MB)',
            action: {
              label: 'View',
              onClick: () => console.log('View file'),
            },
          })
        }
        size="sm"
      >
        Upload Success
      </Button>
      <Button
        onClick={() =>
          toast.error('Upload failed', {
            description: 'File size exceeds 10 MB limit',
            action: {
              label: 'Retry',
              onClick: () => console.log('Retry upload'),
            },
          })
        }
        variant="outline"
        size="sm"
      >
        Upload Error
      </Button>
      <Button
        onClick={() => {
          toast.promise(
            new Promise((resolve) => setTimeout(resolve, 3000)),
            {
              loading: 'Uploading file...',
              success: 'File uploaded successfully',
              error: 'Upload failed',
            }
          )
        }}
        variant="outline"
        size="sm"
      >
        Uploading
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'File operation notifications.',
      },
    },
  },
}

export const FormValidation: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() =>
          toast.error('Validation failed', {
            description: 'Please fill in all required fields',
          })
        }
        variant="outline"
        size="sm"
      >
        Validation Error
      </Button>
      <Button
        onClick={() =>
          toast.success('Form submitted', {
            description: 'Your changes have been saved',
          })
        }
        size="sm"
      >
        Submit Success
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Form validation and submission notifications.',
      },
    },
  },
}

export const UserActions: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() =>
          toast('Item deleted', {
            description: 'The item has been removed from your list',
            action: {
              label: 'Undo',
              onClick: () => toast.success('Deletion undone'),
            },
          })
        }
        variant="outline"
        size="sm"
      >
        Delete with Undo
      </Button>
      <Button
        onClick={() =>
          toast('Profile updated', {
            description: 'Your profile changes have been saved',
          })
        }
        variant="outline"
        size="sm"
      >
        Profile Update
      </Button>
      <Button
        onClick={() =>
          toast.warning('Unsaved changes', {
            description: 'You have unsaved changes. Do you want to save them?',
            action: {
              label: 'Save',
              onClick: () => toast.success('Changes saved'),
            },
            cancel: {
              label: 'Discard',
              onClick: () => toast('Changes discarded'),
            },
          })
        }
        variant="outline"
        size="sm"
      >
        Unsaved Warning
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Common user action notifications.',
      },
    },
  },
}

export const NetworkStatus: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() => toast.error('Connection lost', {
          description: 'Please check your internet connection',
        })}
        variant="outline"
        size="sm"
      >
        Offline
      </Button>
      <Button
        onClick={() => toast.success('Connected', {
          description: 'Your internet connection has been restored',
        })}
        variant="outline"
        size="sm"
      >
        Online
      </Button>
      <Button
        onClick={() => {
          const id = toast.loading('Connecting...')
          setTimeout(() => {
            toast.success('Connected successfully', { id })
          }, 2000)
        }}
        variant="outline"
        size="sm"
      >
        Connecting
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Network status notifications.',
      },
    },
  },
}
