/*
 * PR & Commit Linking Service Tests
 * Version: 1.0.0
 *
 * Tests for task reference extraction, PR linking, and commit linking.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 7 - PR & Commit Tracking
 * =============================================================================
 */

import { describe, it, expect } from 'vitest'
import {
  extractTaskReferences,
  extractTaskFromBranch,
} from '../github/prCommitLinkService'
import type { TaskReference } from '../github/prCommitLinkService'

// =============================================================================
// Task Reference Extraction Tests
// =============================================================================

describe('extractTaskReferences', () => {
  describe('PREFIX-NUMBER format', () => {
    it('should extract single reference from text', () => {
      const result = extractTaskReferences('Fix bug in PROJ-123')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<TaskReference>({
        prefix: 'PROJ',
        number: 123,
        fullReference: 'PROJ-123',
      })
    })

    it('should extract multiple references from text', () => {
      const result = extractTaskReferences('Fix PROJ-123 and PROJ-456')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual<TaskReference>({
        prefix: 'PROJ',
        number: 123,
        fullReference: 'PROJ-123',
      })
      expect(result[1]).toEqual<TaskReference>({
        prefix: 'PROJ',
        number: 456,
        fullReference: 'PROJ-456',
      })
    })

    it('should extract different project prefixes', () => {
      const result = extractTaskReferences('KANBU-1 and API-99 and WEB-500')
      expect(result).toHaveLength(3)
      expect(result.map(r => r.prefix)).toEqual(['KANBU', 'API', 'WEB'])
    })

    it('should handle lowercase prefixes (converts to uppercase)', () => {
      const result = extractTaskReferences('fix proj-123')
      expect(result).toHaveLength(1)
      expect(result[0]!.prefix).toBe('PROJ')
    })

    it('should handle bracketed format [PREFIX-123]', () => {
      const result = extractTaskReferences('[PROJ-123] Fix bug')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<TaskReference>({
        prefix: 'PROJ',
        number: 123,
        fullReference: 'PROJ-123',
      })
    })

    it('should not duplicate references', () => {
      const result = extractTaskReferences('PROJ-123 is related to PROJ-123')
      expect(result).toHaveLength(1)
    })
  })

  describe('#NUMBER format', () => {
    it('should extract GitHub-style issue reference', () => {
      const result = extractTaskReferences('Fixes #123')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual<TaskReference>({
        prefix: '',
        number: 123,
        fullReference: '#123',
      })
    })

    it('should extract multiple issue references', () => {
      const result = extractTaskReferences('Closes #1, #2, and #3')
      expect(result).toHaveLength(3)
      expect(result.map(r => r.number)).toEqual([1, 2, 3])
    })

    it('should handle both formats in same text', () => {
      const result = extractTaskReferences('PROJ-123 fixes #456')
      expect(result).toHaveLength(2)
      expect(result[0]!.fullReference).toBe('PROJ-123')
      expect(result[1]!.fullReference).toBe('#456')
    })
  })

  describe('edge cases', () => {
    it('should return empty array for no matches', () => {
      const result = extractTaskReferences('No task references here')
      expect(result).toHaveLength(0)
    })

    it('should handle empty string', () => {
      const result = extractTaskReferences('')
      expect(result).toHaveLength(0)
    })

    it('should ignore invalid formats', () => {
      // Single letter prefix not allowed (min 2)
      const result = extractTaskReferences('A-123')
      expect(result).toHaveLength(0)
    })

    it('should handle longer prefixes (up to 10 chars)', () => {
      // Test with 8-character prefix (within 2-10 range)
      const result = extractTaskReferences('LONGPREF-123')
      expect(result).toHaveLength(1)
      expect(result[0]!.prefix).toBe('LONGPREF')
    })
  })

  describe('custom pattern', () => {
    it('should use custom pattern when provided', () => {
      const customPattern = 'TASK-(\\d+)'
      const result = extractTaskReferences('Working on TASK-42', customPattern)
      expect(result).toHaveLength(1)
      expect(result[0]!.number).toBe(42)
    })
  })
})

// =============================================================================
// Branch Name Extraction Tests
// =============================================================================

describe('extractTaskFromBranch', () => {
  describe('feature branch patterns', () => {
    it('should extract from feature/PREFIX-123 pattern', () => {
      const result = extractTaskFromBranch('feature/PROJ-123-add-login')
      expect(result).not.toBeNull()
      expect(result).toEqual<TaskReference>({
        prefix: 'PROJ',
        number: 123,
        fullReference: 'PROJ-123',
      })
    })

    it('should extract from fix/PREFIX-123 pattern', () => {
      const result = extractTaskFromBranch('fix/KANBU-456-bug-fix')
      expect(result).not.toBeNull()
      expect(result?.prefix).toBe('KANBU')
      expect(result?.number).toBe(456)
    })

    it('should extract from bugfix/PREFIX-123 pattern', () => {
      const result = extractTaskFromBranch('bugfix/API-789')
      expect(result).not.toBeNull()
      expect(result?.prefix).toBe('API')
      expect(result?.number).toBe(789)
    })

    it('should extract from hotfix/PREFIX-123 pattern', () => {
      const result = extractTaskFromBranch('hotfix/WEB-100-critical')
      expect(result).not.toBeNull()
      expect(result?.number).toBe(100)
    })

    it('should extract from task/PREFIX-123 pattern', () => {
      const result = extractTaskFromBranch('task/PROJ-55')
      expect(result).not.toBeNull()
      expect(result?.number).toBe(55)
    })
  })

  describe('number-only branch patterns', () => {
    it('should extract from feature/123 pattern (no prefix)', () => {
      const result = extractTaskFromBranch('feature/123-description')
      expect(result).not.toBeNull()
      expect(result?.prefix).toBe('')
      expect(result?.number).toBe(123)
    })

    it('should extract from fix/456 pattern', () => {
      const result = extractTaskFromBranch('fix/456')
      expect(result).not.toBeNull()
      expect(result?.number).toBe(456)
    })
  })

  describe('PREFIX-123 at start patterns', () => {
    it('should extract from PREFIX-123/description pattern', () => {
      const result = extractTaskFromBranch('PROJ-123/add-new-feature')
      expect(result).not.toBeNull()
      expect(result?.prefix).toBe('PROJ')
      expect(result?.number).toBe(123)
    })

    it('should extract from PREFIX-123-description pattern', () => {
      const result = extractTaskFromBranch('KANBU-789-implement-auth')
      expect(result).not.toBeNull()
      expect(result?.prefix).toBe('KANBU')
      expect(result?.number).toBe(789)
    })
  })

  describe('edge cases', () => {
    it('should return null for no match', () => {
      const result = extractTaskFromBranch('main')
      expect(result).toBeNull()
    })

    it('should return null for develop branch', () => {
      const result = extractTaskFromBranch('develop')
      expect(result).toBeNull()
    })

    it('should return null for random branch name', () => {
      const result = extractTaskFromBranch('some-random-branch')
      expect(result).toBeNull()
    })

    it('should handle lowercase branch name', () => {
      const result = extractTaskFromBranch('feature/proj-123')
      expect(result).not.toBeNull()
      expect(result?.prefix).toBe('PROJ')
    })
  })

  describe('custom pattern', () => {
    it('should use custom branch pattern', () => {
      const customPattern = 'issue-(\\d+)'
      const result = extractTaskFromBranch('issue-42', customPattern)
      expect(result).not.toBeNull()
      expect(result?.number).toBe(42)
    })
  })
})

// =============================================================================
// Common Commit Message Patterns Tests
// =============================================================================

describe('extractTaskReferences - commit messages', () => {
  it('should extract from conventional commit with scope', () => {
    const result = extractTaskReferences('feat(PROJ-123): Add new feature')
    expect(result).toHaveLength(1)
    expect(result[0]!.fullReference).toBe('PROJ-123')
  })

  it('should extract from conventional commit without scope', () => {
    const result = extractTaskReferences('fix: Fix bug #456')
    expect(result).toHaveLength(1)
    expect(result[0]!.fullReference).toBe('#456')
  })

  it('should extract from footer references', () => {
    const message = `feat: Add login

Implements user authentication flow.

Closes PROJ-123
Related-to: PROJ-456`
    const result = extractTaskReferences(message)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.fullReference)).toEqual(['PROJ-123', 'PROJ-456'])
  })

  it('should extract from "Fixes #X" format', () => {
    const result = extractTaskReferences('Fixes #123')
    expect(result).toHaveLength(1)
    expect(result[0]!.number).toBe(123)
  })

  it('should extract from "Closes #X" format', () => {
    const result = extractTaskReferences('Closes #789')
    expect(result).toHaveLength(1)
    expect(result[0]!.number).toBe(789)
  })

  it('should extract from "Resolves #X" format', () => {
    const result = extractTaskReferences('Resolves #42')
    expect(result).toHaveLength(1)
    expect(result[0]!.number).toBe(42)
  })
})

// =============================================================================
// Common PR Title Patterns Tests
// =============================================================================

describe('extractTaskReferences - PR titles', () => {
  it('should extract from PR title with prefix at start', () => {
    const result = extractTaskReferences('PROJ-123: Add new feature')
    expect(result).toHaveLength(1)
    expect(result[0]!.fullReference).toBe('PROJ-123')
  })

  it('should extract from PR title with bracketed prefix', () => {
    const result = extractTaskReferences('[KANBU-456] Fix authentication bug')
    expect(result).toHaveLength(1)
    expect(result[0]!.fullReference).toBe('KANBU-456')
  })

  it('should extract from PR title with multiple references', () => {
    const result = extractTaskReferences('PROJ-123, PROJ-124: Implement features')
    expect(result).toHaveLength(2)
  })

  it('should extract from PR title with "Fixes" keyword', () => {
    const result = extractTaskReferences('Fix login bug (Fixes #99)')
    expect(result).toHaveLength(1)
    expect(result[0]!.fullReference).toBe('#99')
  })
})
