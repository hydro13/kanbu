import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeTime, truncate, success, error } from '../src/tools.js';

describe('Formatting Helpers', () => {
  describe('formatDate', () => {
    it('should format a valid date string correctly', () => {
      // Note: Locale output depends on system/Node locale, assuming 'nl-NL' from implementation
      // We might need to adjust expectations if vitest runs in a different locale environment
      // For now, let's check if it returns a string that contains key date parts
      const result = formatDate('2023-12-25');
      expect(result).toContain('25');
      expect(result).toContain('dec');
      expect(result).toContain('2023');
    });

    it('should return "-" for null/undefined/empty input', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "just now" for very recent dates', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('should handle "-" for invalid inputs', () => {
      expect(formatRelativeTime(null)).toBe('-');
    });
  });

  describe('truncate', () => {
    it('should not truncate text shorter than maxLength', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate text longer than maxLength and add ellipsis', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });

    it('should handle empty strings', () => {
      expect(truncate(null, 10)).toBe('');
      expect(truncate(undefined, 10)).toBe('');
      expect(truncate('', 10)).toBe('');
    });
  });
});

describe('Response Helpers', () => {
  describe('success', () => {
    it('should return a properly formatted content array', () => {
      const result = success('All good');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'All good' }],
      });
    });
  });

  describe('error', () => {
    it('should return isError true and prefixed message', () => {
      const result = error('Something bad');
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Something bad' }],
        isError: true,
      });
    });
  });
});
