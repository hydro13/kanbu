/*
 * Progress Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Progress component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Progress } from './progress'
import { Label } from './label'
import { Button } from './button'
import { useState, useEffect } from 'react'

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progress value (0-100)',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Progress bar component with design token styling. Built on Radix UI with smooth transitions.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Progress>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  args: {
    value: 50,
  },
}

export const Empty: Story = {
  args: {
    value: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress bar at 0%.',
      },
    },
  },
}

export const Quarter: Story = {
  args: {
    value: 25,
  },
}

export const Half: Story = {
  args: {
    value: 50,
  },
}

export const ThreeQuarters: Story = {
  args: {
    value: 75,
  },
}

export const Complete: Story = {
  args: {
    value: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Progress bar at 100%.',
      },
    },
  },
}

// =============================================================================
// With Labels
// =============================================================================

export const WithLabel: Story = {
  render: () => (
    <div className="w-[400px] space-y-2">
      <div className="flex justify-between text-sm">
        <Label>Uploading...</Label>
        <span className="text-muted-foreground">65%</span>
      </div>
      <Progress value={65} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Progress bar with label and percentage.',
      },
    },
  },
}

export const WithDescription: Story = {
  render: () => (
    <div className="w-[400px] space-y-2">
      <Label>Installation Progress</Label>
      <Progress value={33} />
      <p className="text-sm text-muted-foreground">
        Installing dependencies... (2 of 6 packages)
      </p>
    </div>
  ),
}

// =============================================================================
// Sizes
// =============================================================================

export const Sizes: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div className="space-y-2">
        <Label>Small (h-2)</Label>
        <Progress value={60} className="h-2" />
      </div>
      <div className="space-y-2">
        <Label>Default (h-4)</Label>
        <Progress value={60} />
      </div>
      <div className="space-y-2">
        <Label>Large (h-6)</Label>
        <Progress value={60} className="h-6" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Progress bars in different sizes.',
      },
    },
  },
}

// =============================================================================
// Animated/Interactive
// =============================================================================

export const Animated: Story = {
  render: function AnimatedStory() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0
          return prev + 1
        })
      }, 50)
      return () => clearInterval(timer)
    }, [])

    return (
      <div className="w-[400px] space-y-2">
        <div className="flex justify-between text-sm">
          <Label>Processing...</Label>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Animated progress bar that increments automatically.',
      },
    },
  },
}

export const Interactive: Story = {
  render: function InteractiveStory() {
    const [progress, setProgress] = useState(0)

    return (
      <div className="w-[400px] space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Label>Progress</Label>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setProgress(Math.max(0, progress - 10))}
            variant="outline"
            size="sm"
          >
            -10%
          </Button>
          <Button
            onClick={() => setProgress(Math.min(100, progress + 10))}
            variant="outline"
            size="sm"
          >
            +10%
          </Button>
          <Button onClick={() => setProgress(0)} variant="outline" size="sm">
            Reset
          </Button>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive progress bar with controls.',
      },
    },
  },
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const FileUpload: Story = {
  render: function FileUploadStory() {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)

    const startUpload = () => {
      setUploading(true)
      setProgress(0)

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setUploading(false)
            return 100
          }
          return prev + 2
        })
      }, 50)
    }

    return (
      <div className="w-[400px] space-y-4">
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">document.pdf</p>
              <p className="text-sm text-muted-foreground">2.4 MB</p>
            </div>
            <span className="text-sm text-muted-foreground">
              {uploading ? `${progress}%` : progress === 100 ? 'Complete' : 'Ready'}
            </span>
          </div>
          <Progress value={progress} />
        </div>
        <Button onClick={startUpload} disabled={uploading} className="w-full">
          {uploading ? 'Uploading...' : progress === 100 ? 'Upload Again' : 'Start Upload'}
        </Button>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'File upload simulation with progress tracking.',
      },
    },
  },
}

export const MultipleProgress: Story = {
  render: () => (
    <div className="w-[500px] space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>HTML/CSS</Label>
          <span className="text-muted-foreground">90%</span>
        </div>
        <Progress value={90} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>JavaScript</Label>
          <span className="text-muted-foreground">75%</span>
        </div>
        <Progress value={75} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>TypeScript</Label>
          <span className="text-muted-foreground">60%</span>
        </div>
        <Progress value={60} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Label>React</Label>
          <span className="text-muted-foreground">85%</span>
        </div>
        <Progress value={85} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple progress bars showing skill levels or completion rates.',
      },
    },
  },
}

export const StepProgress: Story = {
  render: function StepProgressStory() {
    const [step, setStep] = useState(1)
    const progress = (step / 4) * 100

    return (
      <div className="w-[500px] space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <Label>Setup Progress</Label>
            <span className="text-muted-foreground">
              Step {step} of 4
            </span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-medium mb-2">
            Step {step}: {
              ['Choose Plan', 'Account Details', 'Payment', 'Confirmation'][step - 1]
            }
          </h3>
          <p className="text-sm text-muted-foreground">
            Complete this step to continue.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setStep(Math.max(1, step - 1))}
            variant="outline"
            disabled={step === 1}
          >
            Previous
          </Button>
          <Button
            onClick={() => setStep(Math.min(4, step + 1))}
            disabled={step === 4}
            className="flex-1"
          >
            {step === 4 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-step form progress indicator.',
      },
    },
  },
}

export const TaskCompletion: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Project Tasks</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Completed Tasks</span>
              <span className="text-muted-foreground">7/10</span>
            </div>
            <Progress value={70} />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>3 tasks remaining</p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Task completion progress indicator.',
      },
    },
  },
}
