/**
 * Unit Tests: Extract Edge Dates (Fase 16.2)
 *
 * Tests for the bi-temporal date extraction prompt utilities.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

import { describe, it, expect } from 'vitest'
import {
  getExtractEdgeDatesSystemPrompt,
  getExtractEdgeDatesUserPrompt,
  parseExtractEdgeDatesResponse,
  calculateRelativeDate,
} from './extractEdgeDates'

describe('extractEdgeDates', () => {
  // ===========================================================================
  // Prompt Generation Tests
  // ===========================================================================

  describe('getExtractEdgeDatesSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getExtractEdgeDatesSystemPrompt()
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('should contain key instructions', () => {
      const prompt = getExtractEdgeDatesSystemPrompt()
      expect(prompt).toContain('ISO 8601')
      expect(prompt).toContain('valid_at')
      expect(prompt).toContain('invalid_at')
      expect(prompt).toContain('JSON')
    })
  })

  describe('getExtractEdgeDatesUserPrompt', () => {
    it('should format context correctly', () => {
      const prompt = getExtractEdgeDatesUserPrompt({
        fact: 'Jan works at Acme',
        referenceTimestamp: '2026-01-13T12:00:00.000Z',
        episodeContent: 'Jan is een developer bij Acme Corp.',
      })

      expect(prompt).toContain('<FACT>')
      expect(prompt).toContain('Jan works at Acme')
      expect(prompt).toContain('<REFERENCE_TIMESTAMP>')
      expect(prompt).toContain('2026-01-13T12:00:00.000Z')
      expect(prompt).toContain('<EPISODE_CONTENT>')
      expect(prompt).toContain('Jan is een developer bij Acme Corp.')
    })
  })

  // ===========================================================================
  // Response Parsing Tests
  // ===========================================================================

  describe('parseExtractEdgeDatesResponse', () => {
    it('should parse valid JSON response', () => {
      const response = `{
        "valid_at": "2026-01-13T00:00:00.000Z",
        "invalid_at": null,
        "reasoning": "Present tense fact"
      }`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBe('2026-01-13T00:00:00.000Z')
      expect(result.invalid_at).toBeNull()
      expect(result.reasoning).toBe('Present tense fact')
    })

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Here is the result:
\`\`\`json
{
  "valid_at": "2025-06-01T00:00:00.000Z",
  "invalid_at": "2026-01-01T00:00:00.000Z",
  "reasoning": "Time-bound fact"
}
\`\`\`
`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBe('2025-06-01T00:00:00.000Z')
      expect(result.invalid_at).toBe('2026-01-01T00:00:00.000Z')
      expect(result.reasoning).toBe('Time-bound fact')
    })

    it('should extract JSON from surrounding text', () => {
      const response = `Based on my analysis:
{"valid_at": "2024-03-15T00:00:00.000Z", "invalid_at": null, "reasoning": "Found in text"}
Hope that helps!`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBe('2024-03-15T00:00:00.000Z')
      expect(result.invalid_at).toBeNull()
    })

    it('should handle null values correctly', () => {
      const response = `{"valid_at": null, "invalid_at": null, "reasoning": "Cannot determine"}`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBeNull()
      expect(result.invalid_at).toBeNull()
      expect(result.reasoning).toBe('Cannot determine')
    })

    it('should handle invalid JSON gracefully', () => {
      const response = 'This is not valid JSON at all'

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBeNull()
      expect(result.invalid_at).toBeNull()
      expect(result.reasoning).toContain('Failed to parse')
    })

    it('should validate and normalize ISO dates', () => {
      // Date without milliseconds should still work
      const response = `{"valid_at": "2024-01-15T00:00:00Z", "invalid_at": null, "reasoning": "Test"}`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBe('2024-01-15T00:00:00.000Z')
    })

    it('should reject invalid date strings', () => {
      const response = `{"valid_at": "not-a-date", "invalid_at": null, "reasoning": "Test"}`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.valid_at).toBeNull()
    })

    it('should provide default reasoning when missing', () => {
      const response = `{"valid_at": null, "invalid_at": null}`

      const result = parseExtractEdgeDatesResponse(response)

      expect(result.reasoning).toBe('No reasoning provided')
    })
  })

  // ===========================================================================
  // Relative Date Calculation Tests
  // ===========================================================================

  describe('calculateRelativeDate', () => {
    const referenceDate = new Date('2026-01-13T12:00:00.000Z')

    describe('years ago', () => {
      it('should calculate "5 years ago"', () => {
        const result = calculateRelativeDate('5 years ago', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getFullYear()).toBe(2021)
      })

      it('should calculate "5 jaar geleden" (Dutch)', () => {
        const result = calculateRelativeDate('5 jaar geleden', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getFullYear()).toBe(2021)
      })

      it('should calculate "10 jaren geleden"', () => {
        const result = calculateRelativeDate('10 jaren geleden', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getFullYear()).toBe(2016)
      })
    })

    describe('months ago', () => {
      it('should calculate "3 months ago"', () => {
        const result = calculateRelativeDate('3 months ago', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getMonth()).toBe(9) // October (0-indexed)
      })

      it('should calculate "2 maanden geleden" (Dutch)', () => {
        const result = calculateRelativeDate('2 maanden geleden', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getMonth()).toBe(10) // November (0-indexed)
      })
    })

    describe('days ago', () => {
      it('should calculate "7 days ago"', () => {
        const result = calculateRelativeDate('7 days ago', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getDate()).toBe(6)
      })

      it('should calculate "14 dagen geleden" (Dutch)', () => {
        const result = calculateRelativeDate('14 dagen geleden', referenceDate)
        expect(result).not.toBeNull()
        // January 13 - 14 = December 30
        expect(result?.getMonth()).toBe(11) // December
        expect(result?.getDate()).toBe(30)
      })
    })

    describe('relative expressions', () => {
      it('should calculate "last month"', () => {
        const result = calculateRelativeDate('last month', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getMonth()).toBe(11) // December
      })

      it('should calculate "vorige maand" (Dutch)', () => {
        const result = calculateRelativeDate('vorige maand', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getMonth()).toBe(11) // December
      })

      it('should calculate "last year"', () => {
        const result = calculateRelativeDate('last year', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getFullYear()).toBe(2025)
      })

      it('should calculate "vorig jaar" (Dutch)', () => {
        const result = calculateRelativeDate('vorig jaar', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getFullYear()).toBe(2025)
      })

      it('should calculate "yesterday"', () => {
        const result = calculateRelativeDate('yesterday', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getDate()).toBe(12)
      })

      it('should calculate "gisteren" (Dutch)', () => {
        const result = calculateRelativeDate('gisteren', referenceDate)
        expect(result).not.toBeNull()
        expect(result?.getDate()).toBe(12)
      })
    })

    describe('unknown expressions', () => {
      it('should return null for unknown expressions', () => {
        expect(calculateRelativeDate('in the future', referenceDate)).toBeNull()
        expect(calculateRelativeDate('someday', referenceDate)).toBeNull()
        expect(calculateRelativeDate('random text', referenceDate)).toBeNull()
      })
    })
  })
})
