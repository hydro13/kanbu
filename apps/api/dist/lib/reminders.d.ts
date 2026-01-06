export type ReminderPreset = 'none' | '15min' | '1hour' | '1day' | '1week' | 'custom';
export interface DueDateStatus {
    isOverdue: boolean;
    isDueToday: boolean;
    isDueSoon: boolean;
    daysUntilDue: number;
    hoursUntilDue: number;
}
export interface ReminderOffset {
    preset: ReminderPreset;
    label: string;
    offsetMs: number;
}
export declare const REMINDER_PRESETS: ReminderOffset[];
/**
 * Calculate the status of a due date relative to now
 */
export declare function getDueDateStatus(dateDue: Date | null): DueDateStatus | null;
/**
 * Format a due date for display
 */
export declare function formatDueDateRelative(dateDue: Date): string;
/**
 * Calculate reminder datetime based on due date and preset
 */
export declare function calculateReminderTime(dateDue: Date, preset: ReminderPreset): Date | null;
/**
 * Get the preset that matches a reminder time relative to due date
 */
export declare function getReminderPreset(dateDue: Date, reminderAt: Date): ReminderPreset;
/**
 * Format reminder time for display
 */
export declare function formatReminderRelative(dateDue: Date | null, reminderAt: Date): string;
/**
 * Get quick date options for date picker
 */
export declare function getQuickDateOptions(): {
    label: string;
    date: Date;
}[];
/**
 * Check if a date is a quick option
 */
export declare function isQuickDateOption(date: Date): string | null;
/**
 * Convert a date to UTC while preserving the local time interpretation
 */
export declare function toUTC(date: Date): Date;
/**
 * Convert a UTC date to local time
 */
export declare function fromUTC(utcDate: Date): Date;
/**
 * Get start of day in local timezone
 */
export declare function startOfDay(date: Date): Date;
/**
 * Get end of day in local timezone
 */
export declare function endOfDay(date: Date): Date;
//# sourceMappingURL=reminders.d.ts.map