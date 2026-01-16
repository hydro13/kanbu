/*
 * Custom Color Picker Component
 * Version: 1.0.0
 *
 * HSL color picker for custom accent colors with WCAG contrast validation.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * Change: Initial implementation (Fase 8.1 - Custom Accent Color Picker)
 * ===================================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  type CustomAccentHSL,
  hslToHex,
  meetsWCAGContrast,
  getForegroundForBackground,
} from '@/lib/themes/accents'
import { AlertTriangle, Check, RotateCcw } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface CustomColorPickerProps {
  /** Current custom HSL values (null if using preset) */
  value: CustomAccentHSL | null
  /** Called when color changes */
  onChange: (hsl: CustomAccentHSL) => void
  /** Called when user wants to apply the color */
  onApply: (hsl: CustomAccentHSL) => void
  /** Called when user wants to reset to preset */
  onReset?: () => void
  /** Whether save is in progress */
  isSaving?: boolean
  /** Optional className */
  className?: string
}

// Default values for new custom colors
const DEFAULT_CUSTOM: CustomAccentHSL = {
  h: 239,  // Indigo-ish
  s: 84,
  l: 67,
}

// =============================================================================
// Component
// =============================================================================

export function CustomColorPicker({
  value,
  onChange,
  onApply,
  onReset,
  isSaving = false,
  className,
}: CustomColorPickerProps) {
  // Local state for live editing
  const [localHsl, setLocalHsl] = useState<CustomAccentHSL>(
    value ?? DEFAULT_CUSTOM
  )

  // Sync local state when value prop changes
  useEffect(() => {
    if (value) {
      setLocalHsl(value)
    }
  }, [value])

  // Derived values
  const previewColor = hslToHex(localHsl.h, localHsl.s, localHsl.l)
  const foregroundHsl = getForegroundForBackground(localHsl.h, localHsl.s, localHsl.l)
  const foregroundColor = foregroundHsl === '0 0% 100%' ? '#ffffff' : '#1e293b'
  const hasGoodContrast = meetsWCAGContrast(localHsl.h, localHsl.s, localHsl.l)

  // Check if current differs from saved value
  const hasChanges = !value || (
    localHsl.h !== value.h ||
    localHsl.s !== value.s ||
    localHsl.l !== value.l
  )

  // Handlers
  const handleHueChange = useCallback((values: number[]) => {
    const newHsl = { ...localHsl, h: values[0] ?? localHsl.h }
    setLocalHsl(newHsl)
    onChange(newHsl)
  }, [localHsl, onChange])

  const handleSaturationChange = useCallback((values: number[]) => {
    const newHsl = { ...localHsl, s: values[0] ?? localHsl.s }
    setLocalHsl(newHsl)
    onChange(newHsl)
  }, [localHsl, onChange])

  const handleLightnessChange = useCallback((values: number[]) => {
    const newHsl = { ...localHsl, l: values[0] ?? localHsl.l }
    setLocalHsl(newHsl)
    onChange(newHsl)
  }, [localHsl, onChange])

  const handleApply = useCallback(() => {
    onApply(localHsl)
  }, [localHsl, onApply])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preview */}
      <div className="flex items-start gap-4">
        {/* Color Swatch */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-lg border shadow-sm flex items-center justify-center text-lg font-semibold"
            style={{ backgroundColor: previewColor, color: foregroundColor }}
          >
            Aa
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {previewColor.toUpperCase()}
          </span>
        </div>

        {/* Preview buttons */}
        <div className="flex-1 space-y-2">
          <Button
            type="button"
            size="sm"
            className="w-full"
            style={{
              backgroundColor: previewColor,
              color: foregroundColor,
            }}
          >
            Button Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            style={{
              borderColor: previewColor,
              color: previewColor,
            }}
          >
            Outline Preview
          </Button>
        </div>
      </div>

      {/* Contrast warning */}
      {!hasGoodContrast && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Onvoldoende contrast. Pas de helderheid aan voor betere leesbaarheid.
          </span>
        </div>
      )}

      {/* Hue Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Tint (Hue)</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {localHsl.h}°
          </span>
        </div>
        <Slider
          value={[localHsl.h]}
          onValueChange={handleHueChange}
          min={0}
          max={360}
          step={1}
          className="hue-slider"
        />
        {/* Hue gradient preview */}
        <div
          className="h-2 rounded-full"
          style={{
            background:
              'linear-gradient(to right, hsl(0, 80%, 50%), hsl(60, 80%, 50%), hsl(120, 80%, 50%), hsl(180, 80%, 50%), hsl(240, 80%, 50%), hsl(300, 80%, 50%), hsl(360, 80%, 50%))',
          }}
        />
      </div>

      {/* Saturation Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Verzadiging (Saturation)</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {localHsl.s}%
          </span>
        </div>
        <Slider
          value={[localHsl.s]}
          onValueChange={handleSaturationChange}
          min={0}
          max={100}
          step={1}
        />
        {/* Saturation gradient preview */}
        <div
          className="h-2 rounded-full"
          style={{
            background: `linear-gradient(to right, hsl(${localHsl.h}, 0%, ${localHsl.l}%), hsl(${localHsl.h}, 100%, ${localHsl.l}%))`,
          }}
        />
      </div>

      {/* Lightness Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Helderheid (Lightness)</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {localHsl.l}%
          </span>
        </div>
        <Slider
          value={[localHsl.l]}
          onValueChange={handleLightnessChange}
          min={0}
          max={100}
          step={1}
        />
        {/* Lightness gradient preview */}
        <div
          className="h-2 rounded-full"
          style={{
            background: `linear-gradient(to right, hsl(${localHsl.h}, ${localHsl.s}%, 0%), hsl(${localHsl.h}, ${localHsl.s}%, 50%), hsl(${localHsl.h}, ${localHsl.s}%, 100%))`,
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          className="flex-1"
          onClick={handleApply}
          disabled={isSaving || !hasChanges || !hasGoodContrast}
          style={{
            backgroundColor: previewColor,
            color: foregroundColor,
          }}
        >
          {isSaving ? (
            'Opslaan...'
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Toepassen
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default CustomColorPicker
