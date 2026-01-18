/*
 * DueDateBadge Component
 * Version: 1.0.0
 *
 * Displays task due date with color coding:
 * - Red: Overdue
 * - Orange: Due today or tomorrow
 * - Gray: Future dates
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T14:36 CET
 *
 * Modified by:
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Signed: 2025-12-28T21:55 CET
 * Change: Added variant prop with 'pill' option for background colors (EXT-04)
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// Types
// =============================================================================

export interface DueDateBadgeProps {
  dueDate: string | Date;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'text' | 'pill'; // 'pill' adds background color
}

export interface DueDateInfo {
  text: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // Within 2 days
  daysUntilDue: number;
}

// =============================================================================
// Icons
// =============================================================================

function CalendarIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ClockIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatDueDate(dateInput: string | Date): DueDateInfo {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();

  // Reset time to midnight for accurate day comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = dateOnly.getTime() - nowOnly.getTime();
  const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const isOverdue = daysUntilDue < 0;
  const isDueToday = daysUntilDue === 0;
  const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 2;

  // Format text based on how far away
  let text: string;
  if (isOverdue) {
    const daysAgo = Math.abs(daysUntilDue);
    text = daysAgo === 1 ? 'Yesterday' : `${daysAgo}d overdue`;
  } else if (isDueToday) {
    text = 'Today';
  } else if (daysUntilDue === 1) {
    text = 'Tomorrow';
  } else if (daysUntilDue <= 7) {
    text = `${daysUntilDue}d`;
  } else {
    // Use short date format
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    text = date.toLocaleDateString(undefined, options);
  }

  return { text, isOverdue, isDueToday, isDueSoon, daysUntilDue };
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CLASSES: Record<string, { container: string; icon: string }> = {
  sm: { container: 'text-xs gap-0.5', icon: 'h-3 w-3' },
  md: { container: 'text-xs gap-1', icon: 'h-3.5 w-3.5' },
  lg: { container: 'text-sm gap-1', icon: 'h-4 w-4' },
};

// =============================================================================
// Component
// =============================================================================

export function DueDateBadge({
  dueDate,
  showIcon = true,
  size = 'md',
  variant = 'text',
}: DueDateBadgeProps) {
  const info = formatDueDate(dueDate);
  const sizeConfig = SIZE_CLASSES[size] ?? SIZE_CLASSES.md!;

  // Determine color based on status
  let colorClass: string;
  let bgClass = '';

  if (info.isOverdue) {
    colorClass = 'text-red-500 dark:text-red-400';
    if (variant === 'pill') {
      bgClass = 'bg-red-100 dark:bg-red-900/30';
    }
  } else if (info.isDueToday) {
    colorClass = 'text-orange-600 dark:text-orange-400 font-medium';
    if (variant === 'pill') {
      bgClass = 'bg-orange-100 dark:bg-orange-900/30';
    }
  } else if (info.isDueSoon) {
    colorClass = 'text-orange-500 dark:text-orange-400';
    if (variant === 'pill') {
      bgClass = 'bg-orange-50 dark:bg-orange-900/20';
    }
  } else {
    colorClass = 'text-gray-500 dark:text-gray-400';
    if (variant === 'pill') {
      bgClass = 'bg-gray-100 dark:bg-gray-800';
    }
  }

  const Icon = info.isOverdue ? ClockIcon : CalendarIcon;

  // Pill variant adds padding and rounded corners
  const pillClasses = variant === 'pill' ? 'px-2 py-0.5 rounded-full' : '';

  return (
    <span
      className={`inline-flex items-center ${colorClass} ${bgClass} ${pillClasses} ${sizeConfig.container}`}
      title={`Due: ${new Date(dueDate).toLocaleDateString()}`}
    >
      {showIcon && <Icon className={sizeConfig.icon} />}
      {info.text}
    </span>
  );
}

export default DueDateBadge;
