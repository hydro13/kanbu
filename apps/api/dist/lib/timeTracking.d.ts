/**
 * Format hours as human-readable string
 * @param hours - Time in hours (e.g., 1.5)
 * @returns Formatted string (e.g., "1h 30m")
 */
export declare function formatTimeDisplay(hours: number): string;
/**
 * Parse time input string to hours
 * Supports formats: "1h 30m", "1.5h", "90m", "1:30"
 * @param input - Time string to parse
 * @returns Time in hours, or null if invalid
 */
export declare function parseTimeInput(input: string): number | null;
/**
 * Calculate elapsed time in hours between two dates
 * @param startTime - Start timestamp
 * @param endTime - End timestamp (defaults to now)
 * @returns Elapsed time in hours
 */
export declare function calculateElapsedHours(startTime: Date, endTime?: Date): number;
/**
 * Round hours to nearest quarter (0.25)
 * Useful for time logging
 * @param hours - Raw hours value
 * @returns Rounded hours
 */
export declare function roundToQuarterHour(hours: number): number;
/**
 * Add time to existing time
 * @param current - Current time spent in hours
 * @param toAdd - Time to add in hours
 * @returns Total time in hours
 */
export declare function addTime(current: number, toAdd: number): number;
//# sourceMappingURL=timeTracking.d.ts.map