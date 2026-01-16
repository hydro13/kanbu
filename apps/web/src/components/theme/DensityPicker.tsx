/*
 * Density Picker Component
 * Version: 1.0.0
 *
 * UI density selector (compact/normal/spacious).
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * Change: Initial implementation (Fase 8.2 - Density Settings)
 * ===================================================================
 */

import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Minimize2, Square, Maximize2 } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export type Density = 'compact' | 'normal' | 'spacious'

interface DensityPickerProps {
  /** Optional className */
  className?: string
  /** Layout mode */
  layout?: 'horizontal' | 'vertical'
  /** Show labels */
  showLabels?: boolean
}

const densityOptions: Array<{
  value: Density
  label: string
  description: string
  icon: typeof Minimize2
}> = [
  {
    value: 'compact',
    label: 'Compact',
    description: 'Meer content, minder ruimte',
    icon: Minimize2,
  },
  {
    value: 'normal',
    label: 'Normaal',
    description: 'Gebalanceerde weergave',
    icon: Square,
  },
  {
    value: 'spacious',
    label: 'Ruim',
    description: 'Meer witruimte, rustiger',
    icon: Maximize2,
  },
]

// =============================================================================
// Component
// =============================================================================

export function DensityPicker({
  className,
  layout = 'horizontal',
  showLabels = true,
}: DensityPickerProps) {
  const { density, setDensity, isSyncing } = useTheme()

  return (
    <div className={cn('space-y-2', className)}>
      {showLabels && (
        <Label className="text-sm font-medium">Interface Dichtheid</Label>
      )}
      <div
        className={cn(
          'flex gap-2',
          layout === 'vertical' && 'flex-col'
        )}
      >
        {densityOptions.map((option) => {
          const Icon = option.icon
          const isSelected = density === option.value

          return (
            <Button
              key={option.value}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDensity(option.value)}
              disabled={isSyncing}
              className={cn(
                'flex-1 justify-start',
                layout === 'horizontal' && 'justify-center'
              )}
              title={option.description}
            >
              <Icon className="h-4 w-4 mr-2" />
              {option.label}
            </Button>
          )
        })}
      </div>
      {showLabels && (
        <p className="text-xs text-muted-foreground">
          {densityOptions.find(o => o.value === density)?.description}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Compact Variant
// =============================================================================

export function DensityPickerCompact({ className }: { className?: string }) {
  return (
    <DensityPicker
      className={className}
      layout="horizontal"
      showLabels={false}
    />
  )
}

export default DensityPicker
