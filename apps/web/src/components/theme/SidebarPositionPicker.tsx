/*
 * Sidebar Position Picker Component
 * Version: 1.0.0
 *
 * Toggle for sidebar position (left/right).
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * Change: Initial implementation (Fase 8.3 - Sidebar Position Setting)
 * ===================================================================
 */

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PanelLeft, PanelRight } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export type SidebarPosition = 'left' | 'right';

interface SidebarPositionPickerProps {
  /** Optional className */
  className?: string;
  /** Show label */
  showLabel?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function SidebarPositionPicker({ className, showLabel = true }: SidebarPositionPickerProps) {
  const { sidebarPosition, setSidebarPosition, isSyncing } = useTheme();

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && <Label className="text-sm font-medium">Sidebar Positie</Label>}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={sidebarPosition === 'left' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSidebarPosition('left')}
          disabled={isSyncing}
          className="flex-1"
        >
          <PanelLeft className="h-4 w-4 mr-2" />
          Links
        </Button>
        <Button
          type="button"
          variant={sidebarPosition === 'right' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSidebarPosition('right')}
          disabled={isSyncing}
          className="flex-1"
        >
          <PanelRight className="h-4 w-4 mr-2" />
          Rechts
        </Button>
      </div>
    </div>
  );
}

export default SidebarPositionPicker;
