/*
 * HourlyRate Page
 * Version: 1.1.0
 *
 * User profile page for setting hourly rate for cost calculations.
 * Compact layout with inline input and preview.
 *
 * Task: USER-01 (Task 247), Task 264 - UX improvements
 */

import { useState, useEffect } from 'react';
import { ProfileLayout } from '../../components/profile/ProfileLayout';
import { Button } from '../../components/ui/button';
import { trpc } from '../../lib/trpc';

// =============================================================================
// Component
// =============================================================================

export function HourlyRate() {
  const [rate, setRate] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.user.getHourlyRate.useQuery();

  const updateRate = trpc.user.updateHourlyRate.useMutation({
    onSuccess: () => {
      utils.user.getHourlyRate.invalidate();
      setHasChanges(false);
    },
  });

  // Initialize form with current rate
  useEffect(() => {
    if (data?.hourlyRate !== undefined) {
      setRate(data.hourlyRate !== null ? String(data.hourlyRate) : '');
    }
  }, [data]);

  // Track changes
  useEffect(() => {
    if (data !== undefined) {
      const currentRate = data.hourlyRate !== null ? String(data.hourlyRate) : '';
      setHasChanges(rate !== currentRate);
    }
  }, [rate, data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericRate = rate.trim() === '' ? null : parseFloat(rate);
    updateRate.mutate({ hourlyRate: numericRate });
  };

  const handleRateChange = (value: string) => {
    // Only allow valid decimal numbers
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setRate(value);
    }
  };

  if (isLoading) {
    return (
      <ProfileLayout title="Hourly Rate" description="Set your hourly rate for cost calculations">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </ProfileLayout>
    );
  }

  const numericRate = rate ? parseFloat(rate) : 0;

  return (
    <ProfileLayout title="Hourly Rate" description="Set your hourly rate for cost calculations">
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Rate Setting */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-foreground">Your Rate</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Used for cost calculations</p>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => handleRateChange(e.target.value)}
                placeholder="0.00"
                className="flex-1 h-9 px-3 text-sm text-right font-mono rounded border border-input bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-xs text-muted-foreground">/hour</span>
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to disable cost tracking</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentRate =
                    data?.hourlyRate !== null ? String(data?.hourlyRate ?? '') : '';
                  setRate(currentRate);
                }}
                disabled={!hasChanges}
              >
                Reset
              </Button>
              <Button type="submit" size="sm" disabled={!hasChanges || updateRate.isPending}>
                {updateRate.isPending ? '...' : 'Save'}
              </Button>
            </div>
            {updateRate.isSuccess && (
              <p className="text-xs text-green-600 dark:text-green-400">Saved!</p>
            )}
            {updateRate.isError && (
              <p className="text-xs text-red-600 dark:text-red-400">Failed to save</p>
            )}
          </form>
        </div>

        {/* Right: Preview + Info */}
        <div className="space-y-4">
          {/* Cost Preview */}
          {numericRate > 0 && (
            <div className="bg-card rounded-card border border-border">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-foreground">Cost Preview</h3>
              </div>
              <div className="p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">1 hour:</span>
                  <span className="font-mono">€ {numericRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">8 hours (day):</span>
                  <span className="font-mono">€ {(numericRate * 8).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">40 hours (week):</span>
                  <span className="font-mono">€ {(numericRate * 40).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-foreground">About Rates</h3>
            </div>
            <div className="p-4 space-y-2 text-xs text-muted-foreground">
              <p>
                <strong>Time Tracking:</strong> Rate × time = cost per task
              </p>
              <p>
                <strong>Reports:</strong> Used for budget and cost reports
              </p>
              <p>
                <strong>Privacy:</strong> Only visible to you and admins
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProfileLayout>
  );
}

export default HourlyRate;
