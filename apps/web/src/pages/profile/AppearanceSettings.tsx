/*
 * AppearanceSettings Page
 * Version: 1.0.0
 *
 * Dedicated page for all visual/theme preferences.
 * Includes theme mode, accent colors, density, sidebar position, and export/import.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-16
 * Change: Initial implementation (Fase 8 - Advanced Theming)
 * ===================================================================
 */

import { useCallback } from 'react';
import { ProfileLayout } from '../../components/profile/ProfileLayout';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AccentPicker,
  CustomColorPicker,
  DensityPicker,
  SidebarPositionPicker,
  ThemeExportImport,
} from '@/components/theme';
import type { CustomAccentHSL } from '@/lib/themes/accents';

// =============================================================================
// Theme Mode Options
// =============================================================================

const themeModeOptions: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  { value: 'light', label: 'Licht', description: 'Heldere achtergrond', icon: Sun },
  { value: 'dark', label: 'Donker', description: 'Donkere achtergrond', icon: Moon },
  { value: 'system', label: 'Systeem', description: 'Volgt OS instelling', icon: Monitor },
];

// =============================================================================
// Component
// =============================================================================

export function AppearanceSettings() {
  const { theme, setTheme, accent, customAccent, setCustomAccent, isSyncing } = useTheme();

  // CustomColorPicker handlers
  const handleCustomColorChange = useCallback((_hsl: CustomAccentHSL) => {
    // Live preview could be implemented here
  }, []);

  const handleCustomColorApply = useCallback(
    (hsl: CustomAccentHSL) => {
      setCustomAccent(hsl);
    },
    [setCustomAccent]
  );

  return (
    <ProfileLayout title="Appearance" description="Customize the look and feel of your workspace">
      <div className="space-y-6">
        {/* Theme Mode */}
        <section className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Theme Mode</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose between light, dark, or system theme
            </p>
          </div>
          <div className="p-4">
            <div className="flex gap-2">
              {themeModeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(option.value)}
                    disabled={isSyncing}
                    className="flex-1"
                    title={option.description}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {option.label}
                    {isSelected && <Check className="h-4 w-4 ml-2" />}
                  </Button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Accent Color */}
        <section className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Accent Color
              {isSyncing && <span className="text-xs ml-2">(saving...)</span>}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose your preferred accent color for buttons and highlights
            </p>
          </div>
          <div className="p-4 space-y-4">
            <AccentPicker layout="inline" size="md" showLabels />
            {accent === 'custom' && (
              <div className={cn('pt-4 border-t border-border')}>
                <CustomColorPicker
                  value={customAccent}
                  onChange={handleCustomColorChange}
                  onApply={handleCustomColorApply}
                  isSaving={isSyncing}
                />
              </div>
            )}
          </div>
        </section>

        {/* Density */}
        <section className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">UI Density</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Adjust spacing and element sizes</p>
          </div>
          <div className="p-4">
            <DensityPicker showLabels={false} />
          </div>
        </section>

        {/* Sidebar Position */}
        <section className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Sidebar Position</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose where the navigation sidebar appears
            </p>
          </div>
          <div className="p-4">
            <SidebarPositionPicker showLabel={false} />
          </div>
        </section>

        {/* Export/Import */}
        <section className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Theme Sharing</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export or import theme settings to share with others
            </p>
          </div>
          <div className="p-4">
            <ThemeExportImport />
          </div>
        </section>
      </div>
    </ProfileLayout>
  );
}

export default AppearanceSettings;
