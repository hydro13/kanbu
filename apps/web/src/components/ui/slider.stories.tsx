/*
 * Slider Component Stories
 * Version: 1.0.0
 *
 * Storybook stories for the Slider component.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * ===================================================================
 */

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Slider } from './slider'
import { Label } from './label'
import { Volume2, Sun, DollarSign } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    defaultValue: {
      control: { type: 'array' },
      description: 'Default value(s) for the slider',
    },
    min: {
      control: 'number',
      description: 'Minimum value',
    },
    max: {
      control: 'number',
      description: 'Maximum value',
    },
    step: {
      control: 'number',
      description: 'Step increment',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the slider is disabled',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Slider component with design token styling. Built on Radix UI with keyboard navigation and touch support.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Slider>

// =============================================================================
// Basic Variants
// =============================================================================

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <Label>Volume</Label>
      <Slider defaultValue={[50]} max={100} />
    </div>
  ),
}

export const WithValueDisplay: Story = {
  render: function ValueDisplayStory() {
    const [value, setValue] = useState([50])

    return (
      <div className="w-[400px] space-y-4">
        <div className="flex justify-between">
          <Label>Brightness</Label>
          <span className="text-sm text-muted-foreground">{value[0]}%</span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Slider with real-time value display.',
      },
    },
  },
}

// =============================================================================
// States and Configurations
// =============================================================================

export const Disabled: Story = {
  render: () => (
    <div className="w-[400px] space-y-4">
      <Label>Disabled Slider</Label>
      <Slider defaultValue={[50]} max={100} disabled />
    </div>
  ),
}

export const DifferentRanges: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div className="space-y-2">
        <Label>0-10</Label>
        <Slider defaultValue={[5]} max={10} />
      </div>
      <div className="space-y-2">
        <Label>0-50</Label>
        <Slider defaultValue={[25]} max={50} />
      </div>
      <div className="space-y-2">
        <Label>0-200</Label>
        <Slider defaultValue={[100]} max={200} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sliders with different maximum values.',
      },
    },
  },
}

export const WithStep: Story = {
  render: function StepStory() {
    const [value, setValue] = useState([50])

    return (
      <div className="w-[400px] space-y-4">
        <div className="flex justify-between">
          <Label>Volume (Steps of 10)</Label>
          <span className="text-sm text-muted-foreground">{value[0]}%</span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} step={10} />
        <p className="text-sm text-muted-foreground">
          This slider increments by 10 each step
        </p>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Slider with step increments.',
      },
    },
  },
}

export const MinMaxRange: Story = {
  render: function MinMaxStory() {
    const [value, setValue] = useState([0])

    return (
      <div className="w-[400px] space-y-4">
        <div className="flex justify-between">
          <Label>Temperature (-20°C to 40°C)</Label>
          <span className="text-sm text-muted-foreground">{value[0]}°C</span>
        </div>
        <Slider value={value} onValueChange={setValue} min={-20} max={40} />
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Slider with custom min and max values.',
      },
    },
  },
}

// =============================================================================
// Real-World Examples
// =============================================================================

export const VolumeControl: Story = {
  render: function VolumeStory() {
    const [volume, setVolume] = useState([70])

    return (
      <div className="w-[300px]">
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <Label>Volume</Label>
            </div>
            <span className="text-sm font-medium">{volume[0]}%</span>
          </div>
          <Slider value={volume} onValueChange={setVolume} max={100} />
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Volume control with icon and percentage display.',
      },
    },
  },
}

export const BrightnessControl: Story = {
  render: function BrightnessStory() {
    const [brightness, setBrightness] = useState([50])

    return (
      <div className="w-[300px]">
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <Label>Brightness</Label>
            </div>
            <span className="text-sm font-medium">{brightness[0]}%</span>
          </div>
          <Slider value={brightness} onValueChange={setBrightness} max={100} />
        </div>
      </div>
    )
  },
}

export const PriceRange: Story = {
  render: function PriceStory() {
    const [price, setPrice] = useState([500])

    return (
      <div className="w-[400px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <Label>Maximum Price</Label>
            </div>
            <span className="text-sm font-medium">${price[0]}</span>
          </div>
          <Slider
            value={price}
            onValueChange={setPrice}
            min={0}
            max={1000}
            step={50}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>$0</span>
            <span>$1,000</span>
          </div>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Price range slider with step increments and min/max labels.',
      },
    },
  },
}

export const MultipleSliders: Story = {
  render: function MultipleStory() {
    const [volume, setVolume] = useState([70])
    const [bass, setBass] = useState([50])
    const [treble, setTreble] = useState([50])
    const [balance, setBalance] = useState([0])

    return (
      <div className="w-[400px] space-y-6">
        <h3 className="font-semibold">Audio Settings</h3>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Volume</Label>
            <span className="text-sm text-muted-foreground">{volume[0]}%</span>
          </div>
          <Slider value={volume} onValueChange={setVolume} max={100} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Bass</Label>
            <span className="text-sm text-muted-foreground">{bass[0]}%</span>
          </div>
          <Slider value={bass} onValueChange={setBass} max={100} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Treble</Label>
            <span className="text-sm text-muted-foreground">{treble[0]}%</span>
          </div>
          <Slider value={treble} onValueChange={setTreble} max={100} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Balance</Label>
            <span className="text-sm text-muted-foreground">
              {balance[0] > 0 ? `R ${balance[0]}` : balance[0] < 0 ? `L ${Math.abs(balance[0])}` : 'Center'}
            </span>
          </div>
          <Slider value={balance} onValueChange={setBalance} min={-50} max={50} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Left</span>
            <span>Right</span>
          </div>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple sliders for audio equalizer settings.',
      },
    },
  },
}

export const ProgressiveValues: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Low</Label>
          <span className="text-sm text-muted-foreground">25%</span>
        </div>
        <Slider defaultValue={[25]} max={100} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Medium</Label>
          <span className="text-sm text-muted-foreground">50%</span>
        </div>
        <Slider defaultValue={[50]} max={100} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>High</Label>
          <span className="text-sm text-muted-foreground">75%</span>
        </div>
        <Slider defaultValue={[75]} max={100} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Maximum</Label>
          <span className="text-sm text-muted-foreground">100%</span>
        </div>
        <Slider defaultValue={[100]} max={100} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sliders showing different value levels.',
      },
    },
  },
}

export const WithUnits: Story = {
  render: function UnitsStory() {
    const [fontSize, setFontSize] = useState([16])
    const [lineHeight, setLineHeight] = useState([1.5])
    const [spacing, setSpacing] = useState([0])

    return (
      <div className="w-[400px] space-y-6">
        <h3 className="font-semibold">Typography Settings</h3>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Font Size</Label>
            <span className="text-sm text-muted-foreground">{fontSize[0]}px</span>
          </div>
          <Slider
            value={fontSize}
            onValueChange={setFontSize}
            min={12}
            max={24}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Line Height</Label>
            <span className="text-sm text-muted-foreground">
              {lineHeight[0].toFixed(1)}
            </span>
          </div>
          <Slider
            value={lineHeight}
            onValueChange={setLineHeight}
            min={1}
            max={2}
            step={0.1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Letter Spacing</Label>
            <span className="text-sm text-muted-foreground">
              {spacing[0] > 0 ? `+${spacing[0]}px` : `${spacing[0]}px`}
            </span>
          </div>
          <Slider
            value={spacing}
            onValueChange={setSpacing}
            min={-2}
            max={4}
            step={0.5}
          />
        </div>

        <div className="rounded-lg border p-4">
          <p
            style={{
              fontSize: `${fontSize[0]}px`,
              lineHeight: lineHeight[0],
              letterSpacing: `${spacing[0]}px`,
            }}
          >
            The quick brown fox jumps over the lazy dog.
          </p>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Typography sliders with live preview.',
      },
    },
  },
}
