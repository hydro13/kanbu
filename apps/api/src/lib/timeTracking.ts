/*
 * Time Tracking Utilities
 * Version: 1.0.0
 *
 * Helper functions for time tracking on subtasks.
 * - Format time for display (hours to "1h 30m" format)
 * - Parse time input ("1h 30m" to hours)
 * - Calculate elapsed time
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 404dd64e-7f41-4608-bb62-2cc5ead5fd6a
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Format hours as human-readable string
 * @param hours - Time in hours (e.g., 1.5)
 * @returns Formatted string (e.g., "1h 30m")
 */
export function formatTimeDisplay(hours: number): string {
  if (hours <= 0) return '0m'

  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60

  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Parse time input string to hours
 * Supports formats: "1h 30m", "1.5h", "90m", "1:30"
 * @param input - Time string to parse
 * @returns Time in hours, or null if invalid
 */
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  // Try "Xh Ym" format (e.g., "1h 30m", "2h", "45m")
  const hmMatch = trimmed.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?$/)
  if (hmMatch && (hmMatch[1] || hmMatch[2])) {
    const hours = parseFloat(hmMatch[1] || '0')
    const minutes = parseInt(hmMatch[2] || '0', 10)
    return hours + minutes / 60
  }

  // Try "X:Y" format (e.g., "1:30")
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch && colonMatch[1] && colonMatch[2]) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (minutes < 60) {
      return hours + minutes / 60
    }
  }

  // Try plain number (assumes hours)
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
  if (numMatch && numMatch[1]) {
    return parseFloat(numMatch[1])
  }

  return null
}

/**
 * Calculate elapsed time in hours between two dates
 * @param startTime - Start timestamp
 * @param endTime - End timestamp (defaults to now)
 * @returns Elapsed time in hours
 */
export function calculateElapsedHours(
  startTime: Date,
  endTime: Date = new Date()
): number {
  const elapsedMs = endTime.getTime() - startTime.getTime()
  if (elapsedMs < 0) return 0
  return elapsedMs / (1000 * 60 * 60)
}

/**
 * Round hours to nearest quarter (0.25)
 * Useful for time logging
 * @param hours - Raw hours value
 * @returns Rounded hours
 */
export function roundToQuarterHour(hours: number): number {
  return Math.round(hours * 4) / 4
}

/**
 * Add time to existing time
 * @param current - Current time spent in hours
 * @param toAdd - Time to add in hours
 * @returns Total time in hours
 */
export function addTime(current: number, toAdd: number): number {
  return Math.max(0, current + toAdd)
}
