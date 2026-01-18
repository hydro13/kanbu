/*
 * Accent Color Picker Component
 * Version: 1.0.0
 *
 * Professional accent color selector with visual preview swatches.
 * Uses the 6 carefully curated accent colors from the design system.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-15
 * Change: Initial implementation (Fase 3.2 - Color Scheme Variants)
 * ===================================================================
 */

import { useTheme, type AccentName } from '@/contexts/ThemeContext';
import { accents, accentOrder } from '@/lib/themes/accents';
import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface AccentPickerProps {
  /** Optional className for the container */
  className?: string;
  /** Layout mode */
  layout?: 'grid' | 'inline';
  /** Show labels below swatches */
  showLabels?: boolean;
  /** Size of the swatches */
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// Component
// =============================================================================

export function AccentPicker({
  className,
  layout = 'grid',
  showLabels = true,
  size = 'md',
}: AccentPickerProps) {
  const { accent: currentAccent, setAccent, isSyncing } = useTheme();

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const checkSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleSelect = (accentName: AccentName) => {
    if (accentName !== currentAccent && !isSyncing) {
      setAccent(accentName);
    }
  };

  return (
    <div
      className={cn(
        layout === 'grid' ? 'grid grid-cols-3 gap-3' : 'flex flex-wrap gap-2',
        className
      )}
    >
      {accentOrder.map((accentName) => {
        const accentDef = accents[accentName];
        const isSelected = currentAccent === accentName;

        return (
          <button
            key={accentName}
            type="button"
            onClick={() => handleSelect(accentName)}
            disabled={isSyncing}
            className={cn(
              'group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all',
              'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              isSelected && 'bg-muted',
              isSyncing && 'opacity-50 cursor-not-allowed'
            )}
            title={`${accentDef.label} - ${accentDef.description}`}
          >
            {/* Color Swatch */}
            <div
              className={cn(
                'relative rounded-full ring-2 ring-offset-2 ring-offset-background transition-all',
                sizeClasses[size],
                isSelected
                  ? 'ring-foreground'
                  : 'ring-transparent group-hover:ring-muted-foreground/30'
              )}
              style={{ backgroundColor: accentDef.preview }}
            >
              {isSelected && (
                <CheckIcon
                  className={cn(
                    'absolute inset-0 m-auto text-white drop-shadow-sm',
                    checkSizeClasses[size]
                  )}
                />
              )}
            </div>

            {/* Label */}
            {showLabels && (
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {accentDef.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Compact Variant
// =============================================================================

/**
 * Compact accent picker for use in headers or toolbars
 */
export function AccentPickerCompact({ className }: { className?: string }) {
  return <AccentPicker className={className} layout="inline" showLabels={false} size="sm" />;
}

export default AccentPicker;
