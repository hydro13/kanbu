/*
 * Theme Switcher Component
 * Version: 1.0.0
 *
 * Dropdown to switch between light, dark, and system themes.
 * Uses shadcn/ui DropdownMenu for consistent styling.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * Change: Initial implementation (Fase 3.1 - Theme Infrastructure)
 * ===================================================================
 */

import { Sun, Moon, Monitor, Check, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ThemeSwitcherProps {
  /** Variant of the trigger button */
  variant?: 'default' | 'outline' | 'ghost'
  /** Size of the trigger button */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional class names */
  className?: string
  /** Show label next to icon */
  showLabel?: boolean
}

// =============================================================================
// Theme Options
// =============================================================================

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// =============================================================================
// Component
// =============================================================================

export function ThemeSwitcher({
  variant = 'ghost',
  size = 'icon',
  className,
  showLabel = false,
}: ThemeSwitcherProps) {
  const { theme, resolvedTheme, setTheme, isSyncing } = useTheme()

  // Get the icon for current theme
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('relative', className)}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CurrentIcon className="h-4 w-4" />
          )}
          {showLabel && (
            <span className="ml-2">
              {themeOptions.find((o) => o.value === theme)?.label ?? 'Theme'}
            </span>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = theme === option.value

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isSelected && 'bg-accent'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{option.label}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// =============================================================================
// Inline Theme Toggle (for headers/toolbars)
// =============================================================================

interface ThemeToggleProps {
  className?: string
}

/**
 * Simple toggle button that cycles through themes.
 * Useful for compact UI like headers.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, isSyncing } = useTheme()

  const handleToggle = () => {
    // Cycle: system -> light -> dark -> system
    const next: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    }
    setTheme(next[theme])
  }

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isSyncing}
      className={className}
      title={`Current: ${theme} (${resolvedTheme}). Click to change.`}
    >
      {isSyncing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CurrentIcon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

export default ThemeSwitcher
