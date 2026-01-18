/*
 * Reminders Library
 * Version: 1.0.0
 *
 * Helper functions for reminder scheduling and due date calculations.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:XX CET
 * ===================================================================
 */

// =============================================================================
// Types
// =============================================================================

export type ReminderPreset = 'none' | '15min' | '1hour' | '1day' | '1week' | 'custom';

export interface DueDateStatus {
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // Within 48 hours
  daysUntilDue: number;
  hoursUntilDue: number;
}

export interface ReminderOffset {
  preset: ReminderPreset;
  label: string;
  offsetMs: number;
}

// =============================================================================
// Constants
// =============================================================================

export const REMINDER_PRESETS: ReminderOffset[] = [
  { preset: 'none', label: 'No reminder', offsetMs: 0 },
  { preset: '15min', label: '15 minutes before', offsetMs: 15 * 60 * 1000 },
  { preset: '1hour', label: '1 hour before', offsetMs: 60 * 60 * 1000 },
  { preset: '1day', label: '1 day before', offsetMs: 24 * 60 * 60 * 1000 },
  { preset: '1week', label: '1 week before', offsetMs: 7 * 24 * 60 * 60 * 1000 },
];

// =============================================================================
// Due Date Calculations
// =============================================================================

/**
 * Calculate the status of a due date relative to now
 */
export function getDueDateStatus(dateDue: Date | null): DueDateStatus | null {
  if (!dateDue) {
    return null;
  }

  const now = new Date();
  const diffMs = dateDue.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return {
    isOverdue: diffMs < 0,
    isDueToday: diffDays >= 0 && diffDays < 1,
    isDueSoon: diffDays >= 0 && diffDays <= 2,
    daysUntilDue: Math.ceil(diffDays),
    hoursUntilDue: Math.ceil(diffHours),
  };
}

/**
 * Format a due date for display
 */
export function formatDueDateRelative(dateDue: Date): string {
  const status = getDueDateStatus(dateDue);
  if (!status) return '';

  if (status.isOverdue) {
    const daysAgo = Math.abs(status.daysUntilDue);
    if (daysAgo === 0) return 'Overdue today';
    if (daysAgo === 1) return 'Overdue by 1 day';
    return `Overdue by ${daysAgo} days`;
  }

  if (status.isDueToday) {
    if (status.hoursUntilDue <= 1) return 'Due within 1 hour';
    return `Due in ${status.hoursUntilDue} hours`;
  }

  if (status.daysUntilDue === 1) return 'Due tomorrow';
  if (status.daysUntilDue <= 7) return `Due in ${status.daysUntilDue} days`;

  return dateDue.toLocaleDateString();
}

// =============================================================================
// Reminder Calculations
// =============================================================================

/**
 * Calculate reminder datetime based on due date and preset
 */
export function calculateReminderTime(dateDue: Date, preset: ReminderPreset): Date | null {
  if (preset === 'none' || preset === 'custom') {
    return null;
  }

  const presetConfig = REMINDER_PRESETS.find((p) => p.preset === preset);
  if (!presetConfig) {
    return null;
  }

  return new Date(dateDue.getTime() - presetConfig.offsetMs);
}

/**
 * Get the preset that matches a reminder time relative to due date
 */
export function getReminderPreset(dateDue: Date, reminderAt: Date): ReminderPreset {
  const diffMs = dateDue.getTime() - reminderAt.getTime();

  // Find closest matching preset (with 5% tolerance)
  for (const preset of REMINDER_PRESETS) {
    if (preset.offsetMs === 0) continue;
    const tolerance = preset.offsetMs * 0.05;
    if (Math.abs(diffMs - preset.offsetMs) <= tolerance) {
      return preset.preset;
    }
  }

  return 'custom';
}

/**
 * Format reminder time for display
 */
export function formatReminderRelative(dateDue: Date | null, reminderAt: Date): string {
  if (!dateDue) {
    return reminderAt.toLocaleString();
  }

  const diffMs = dateDue.getTime() - reminderAt.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} before`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} before`;
  }
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} before`;
}

// =============================================================================
// Quick Date Options
// =============================================================================

/**
 * Get quick date options for date picker
 */
export function getQuickDateOptions(): { label: string; date: Date }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: tomorrow },
    { label: 'Next week', date: nextWeek },
    { label: 'Next month', date: nextMonth },
  ];
}

/**
 * Check if a date is a quick option
 */
export function isQuickDateOption(date: Date): string | null {
  const options = getQuickDateOptions();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  for (const option of options) {
    if (option.date.getTime() === dateOnly.getTime()) {
      return option.label;
    }
  }

  return null;
}

// =============================================================================
// Timezone Helpers
// =============================================================================

/**
 * Convert a date to UTC while preserving the local time interpretation
 */
export function toUTC(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    )
  );
}

/**
 * Convert a UTC date to local time
 */
export function fromUTC(utcDate: Date): Date {
  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds()
  );
}

/**
 * Get start of day in local timezone
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get end of day in local timezone
 */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
