/*
 * Theme Export/Import Component
 * Version: 1.0.0
 *
 * Export and import theme settings for sharing between users.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * Change: Initial implementation (Fase 8.4 - Theme Import/Export)
 * ===================================================================
 */

import { useState, useCallback } from 'react'
import { useTheme, type ThemeMode, type AccentName } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, Copy, Check } from 'lucide-react'
import type { Density } from './DensityPicker'
import type { SidebarPosition } from './SidebarPositionPicker'
import type { CustomAccentHSL } from '@/lib/themes/accents'

// =============================================================================
// Types
// =============================================================================

interface ThemeExport {
  version: '1.0'
  theme: ThemeMode
  accent: AccentName
  customAccent?: CustomAccentHSL | null
  density: Density
  sidebarPosition: SidebarPosition
}

interface ThemeExportImportProps {
  /** Optional className */
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function encodeTheme(settings: ThemeExport): string {
  return btoa(JSON.stringify(settings))
}

function decodeTheme(encoded: string): ThemeExport | null {
  try {
    const decoded = JSON.parse(atob(encoded)) as unknown
    if (typeof decoded !== 'object' || decoded === null) return null

    const obj = decoded as Record<string, unknown>
    if (obj.version !== '1.0') return null

    // Validate required fields
    if (!['light', 'dark', 'system'].includes(obj.theme as string)) return null
    if (!['slate', 'blue', 'teal', 'violet', 'rose', 'amber', 'custom'].includes(obj.accent as string)) return null
    if (!['compact', 'normal', 'spacious'].includes(obj.density as string)) return null
    if (!['left', 'right'].includes(obj.sidebarPosition as string)) return null

    return obj as unknown as ThemeExport
  } catch {
    return null
  }
}

// =============================================================================
// Component
// =============================================================================

export function ThemeExportImport({ className }: ThemeExportImportProps) {
  const {
    theme,
    accent,
    customAccent,
    density,
    sidebarPosition,
    setTheme,
    setAccent,
    setCustomAccent,
    setDensity,
    setSidebarPosition,
  } = useTheme()

  const [importCode, setImportCode] = useState('')
  const [copied, setCopied] = useState(false)

  // Export current settings
  const handleExport = useCallback(() => {
    const settings: ThemeExport = {
      version: '1.0',
      theme,
      accent,
      customAccent: accent === 'custom' ? customAccent : null,
      density,
      sidebarPosition,
    }

    const code = encodeTheme(settings)
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Theme code gekopieerd naar klembord')
  }, [theme, accent, customAccent, density, sidebarPosition])

  // Import settings from code
  const handleImport = useCallback(() => {
    const trimmedCode = importCode.trim()
    if (!trimmedCode) {
      toast.error('Voer een theme code in')
      return
    }

    const settings = decodeTheme(trimmedCode)
    if (!settings) {
      toast.error('Ongeldige theme code')
      return
    }

    // Apply all settings
    setTheme(settings.theme)
    setAccent(settings.accent)
    if (settings.accent === 'custom' && settings.customAccent) {
      setCustomAccent(settings.customAccent)
    }
    setDensity(settings.density)
    setSidebarPosition(settings.sidebarPosition)

    setImportCode('')
    toast.success('Theme instellingen toegepast')
  }, [importCode, setTheme, setAccent, setCustomAccent, setDensity, setSidebarPosition])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Export */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Exporteren</Label>
        <p className="text-xs text-muted-foreground">
          Kopieer je huidige theme instellingen om te delen.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Gekopieerd!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Kopieer Theme Code
            </>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">of</span>
        </div>
      </div>

      {/* Import */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Importeren</Label>
        <p className="text-xs text-muted-foreground">
          Plak een theme code om instellingen over te nemen.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Plak theme code hier..."
            value={importCode}
            onChange={(e) => setImportCode(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={!importCode.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importeren
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ThemeExportImport
