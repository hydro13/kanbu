/*
 * PriorityBadge Component
 * Version: 1.0.0
 *
 * Displays task priority with color-coded badges.
 * Priority levels: 0 (Low), 1 (Normal), 2 (High), 3 (Urgent)
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T14:36 CET
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// Types
// =============================================================================

export interface PriorityBadgeProps {
  priority: number;
  showLow?: boolean; // Show badge even for low priority (default: false)
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// Constants
// =============================================================================

const PRIORITY_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  1: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  3: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Low',
  1: 'Normal',
  2: 'High',
  3: 'Urgent',
};

const PRIORITY_ICONS: Record<number, string> = {
  0: '○',
  1: '●',
  2: '▲',
  3: '⚠',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-1 py-0.5 text-xs',
  md: 'px-1.5 py-0.5 text-xs',
  lg: 'px-2 py-1 text-sm',
};

// =============================================================================
// Component
// =============================================================================

export function PriorityBadge({ priority, showLow = false, size = 'md' }: PriorityBadgeProps) {
  // Don't show low priority unless explicitly requested
  if (priority === 0 && !showLow) return null;

  const colorClass = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[0];
  const label = PRIORITY_LABELS[priority] ?? 'Low';
  const icon = PRIORITY_ICONS[priority] ?? '○';
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${colorClass} ${sizeClass}`}
      title={`Priority: ${label}`}
    >
      <span className="opacity-75">{icon}</span>
      {label}
    </span>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getPriorityLabel(priority: number): string {
  return PRIORITY_LABELS[priority] ?? 'Low';
}

export function getPriorityColor(priority: number): string {
  return PRIORITY_COLORS[priority] ?? PRIORITY_COLORS[0]!;
}

export default PriorityBadge;
