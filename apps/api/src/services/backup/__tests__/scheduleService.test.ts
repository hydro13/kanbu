/**
 * Schedule Service Tests
 *
 * Tests for backup schedule service including:
 * - Cron expression validation
 * - Next run calculation
 * - Human-readable descriptions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidCronExpression,
  calculateNextRun,
  describeCronExpression,
} from '../scheduler/scheduleService';

describe('isValidCronExpression', () => {
  it('should return true for valid cron expressions', () => {
    expect(isValidCronExpression('0 2 * * *')).toBe(true); // Daily at 02:00
    expect(isValidCronExpression('*/15 * * * *')).toBe(true); // Every 15 minutes
    expect(isValidCronExpression('0 0 * * 0')).toBe(true); // Weekly on Sunday
    expect(isValidCronExpression('0 0 1 * *')).toBe(true); // Monthly on 1st
    expect(isValidCronExpression('30 4 * * 1-5')).toBe(true); // Weekdays at 04:30
  });

  it('should return false for out-of-range values', () => {
    expect(isValidCronExpression('60 * * * *')).toBe(false); // Invalid minute (max 59)
    expect(isValidCronExpression('* 25 * * *')).toBe(false); // Invalid hour (max 23)
    expect(isValidCronExpression('* * 32 * *')).toBe(false); // Invalid day (max 31)
    expect(isValidCronExpression('* * * 13 *')).toBe(false); // Invalid month (max 12)
  });
});

describe('calculateNextRun', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to 2026-01-18 12:00:00 UTC
    vi.setSystemTime(new Date('2026-01-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate next run for daily schedule', () => {
    const nextRun = calculateNextRun('0 2 * * *');
    expect(nextRun).not.toBeNull();
    // Should be 02:00 (either today or tomorrow depending on timezone)
    expect(nextRun!.getMinutes()).toBe(0);
  });

  it('should calculate next run for hourly schedule', () => {
    const nextRun = calculateNextRun('0 * * * *');
    expect(nextRun).not.toBeNull();
    // Should be at minute 0 of some hour
    expect(nextRun!.getMinutes()).toBe(0);
  });

  it('should return a valid date for valid expressions', () => {
    const nextRun = calculateNextRun('0 0 * * *');
    expect(nextRun).toBeInstanceOf(Date);
    expect(nextRun!.getTime()).toBeGreaterThan(0);
  });
});

describe('describeCronExpression', () => {
  it('should describe daily schedules', () => {
    expect(describeCronExpression('0 2 * * *')).toBe('Daily at 02:00');
    expect(describeCronExpression('0 14 * * *')).toBe('Daily at 14:00');
    expect(describeCronExpression('0 0 * * *')).toBe('Daily at 00:00');
  });

  it('should describe weekly schedules', () => {
    expect(describeCronExpression('30 2 * * 0')).toBe('Weekly on Sunday at 02:30');
    expect(describeCronExpression('0 9 * * 0')).toBe('Weekly on Sunday at 09:00');
  });

  it('should describe monthly schedules', () => {
    expect(describeCronExpression('0 3 1 * *')).toBe('Monthly on the 1st at 03:00');
    expect(describeCronExpression('30 12 1 * *')).toBe('Monthly on the 1st at 12:30');
  });

  it('should return raw expression for every-N-minute patterns', () => {
    expect(describeCronExpression('*/15 * * * *')).toBe('*/15 * * * *');
    expect(describeCronExpression('*/5 * * * *')).toBe('*/5 * * * *');
  });

  it('should return raw expression for weekday patterns', () => {
    expect(describeCronExpression('0 2 * * 1-5')).toBe('0 2 * * 1-5');
  });

  it('should handle invalid expressions gracefully', () => {
    expect(describeCronExpression('invalid')).toBe('invalid');
    expect(describeCronExpression('')).toBe('');
  });
});
