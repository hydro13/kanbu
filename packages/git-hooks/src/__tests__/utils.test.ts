/*
 * Git Hooks Utils Tests
 * Version: 1.0.0
 *
 * Tests for git hooks utility functions.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14B - Developer Experience (Git Hooks)
 * =============================================================================
 */

import { describe, it, expect } from 'vitest'
import {
  extractTaskFromBranch,
  extractTaskFromMessage,
  hasTaskReference,
  addTaskToMessage,
} from '../utils.js'

describe('git-hooks utils', () => {
  // ===========================================================================
  // extractTaskFromBranch Tests
  // ===========================================================================

  describe('extractTaskFromBranch', () => {
    it('should extract task from feature branch', () => {
      expect(extractTaskFromBranch('feature/PROJ-123-add-login')).toBe('PROJ-123')
    })

    it('should extract task from fix branch', () => {
      expect(extractTaskFromBranch('fix/BUG-456-fix-crash')).toBe('BUG-456')
    })

    it('should extract task from bugfix branch', () => {
      expect(extractTaskFromBranch('bugfix/ABC-789')).toBe('ABC-789')
    })

    it('should extract task from hotfix branch', () => {
      expect(extractTaskFromBranch('hotfix/HOT-1')).toBe('HOT-1')
    })

    it('should extract task from branch with just reference', () => {
      expect(extractTaskFromBranch('PROJ-123')).toBe('PROJ-123')
    })

    it('should extract task case-insensitively and uppercase result', () => {
      expect(extractTaskFromBranch('feature/proj-123-something')).toBe('PROJ-123')
    })

    it('should return null for branch without task reference', () => {
      expect(extractTaskFromBranch('main')).toBeNull()
      expect(extractTaskFromBranch('develop')).toBeNull()
      expect(extractTaskFromBranch('feature/add-something')).toBeNull()
    })

    it('should handle complex branch names', () => {
      expect(extractTaskFromBranch('feature/KANBU-42-add-user-authentication-flow')).toBe('KANBU-42')
    })

    it('should extract first task reference if multiple exist', () => {
      expect(extractTaskFromBranch('feature/PROJ-123-related-to-PROJ-456')).toBe('PROJ-123')
    })
  })

  // ===========================================================================
  // extractTaskFromMessage Tests
  // ===========================================================================

  describe('extractTaskFromMessage', () => {
    it('should extract task from bracketed reference', () => {
      expect(extractTaskFromMessage('Add login feature [PROJ-123]')).toBe('PROJ-123')
    })

    it('should extract task from unbracketed reference', () => {
      expect(extractTaskFromMessage('PROJ-456: Fix bug')).toBe('PROJ-456')
    })

    it('should extract task case-insensitively', () => {
      expect(extractTaskFromMessage('fix proj-789 issue')).toBe('PROJ-789')
    })

    it('should return null for message without task reference', () => {
      expect(extractTaskFromMessage('Add new feature')).toBeNull()
      expect(extractTaskFromMessage('Fix bug in login')).toBeNull()
    })

    it('should extract from multiline message', () => {
      const message = `Add feature

This implements the new feature [PROJ-123]
with some additional details.`
      expect(extractTaskFromMessage(message)).toBe('PROJ-123')
    })

    it('should handle reference at start of message', () => {
      expect(extractTaskFromMessage('[ABC-1] Initial commit')).toBe('ABC-1')
    })
  })

  // ===========================================================================
  // hasTaskReference Tests
  // ===========================================================================

  describe('hasTaskReference', () => {
    it('should return true for bracketed reference', () => {
      expect(hasTaskReference('Add feature [PROJ-123]')).toBe(true)
    })

    it('should return true for unbracketed reference', () => {
      expect(hasTaskReference('PROJ-456: Fix bug')).toBe(true)
    })

    it('should return true for lowercase reference', () => {
      expect(hasTaskReference('fix proj-789')).toBe(true)
    })

    it('should return false for no reference', () => {
      expect(hasTaskReference('Add new feature')).toBe(false)
      expect(hasTaskReference('Update README')).toBe(false)
    })

    it('should return false for partial matches', () => {
      expect(hasTaskReference('PROJECT-ABC')).toBe(false)
      expect(hasTaskReference('PROJ123')).toBe(false)
      expect(hasTaskReference('123-PROJ')).toBe(false)
    })
  })

  // ===========================================================================
  // addTaskToMessage Tests
  // ===========================================================================

  describe('addTaskToMessage', () => {
    it('should add task to simple message', () => {
      expect(addTaskToMessage('Add login feature', 'PROJ-123')).toBe('Add login feature [PROJ-123]')
    })

    it('should not add task if already present (bracketed)', () => {
      expect(addTaskToMessage('Add feature [PROJ-123]', 'PROJ-456')).toBe('Add feature [PROJ-123]')
    })

    it('should not add task if already present (unbracketed)', () => {
      expect(addTaskToMessage('PROJ-123: Add feature', 'PROJ-456')).toBe('PROJ-123: Add feature')
    })

    it('should add task to first line of multiline message', () => {
      const message = `Add feature

This is a detailed description.`
      const expected = `Add feature [PROJ-123]

This is a detailed description.`
      expect(addTaskToMessage(message, 'PROJ-123')).toBe(expected)
    })

    it('should handle empty message', () => {
      expect(addTaskToMessage('', 'PROJ-123')).toBe(' [PROJ-123]')
    })

    it('should preserve trailing content', () => {
      expect(addTaskToMessage('Fix bug\n\nSigned-off-by: Dev', 'BUG-1')).toBe(
        'Fix bug [BUG-1]\n\nSigned-off-by: Dev'
      )
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle various task prefixes', () => {
      expect(extractTaskFromBranch('feature/ABC-1')).toBe('ABC-1')
      expect(extractTaskFromBranch('feature/KANBU-999')).toBe('KANBU-999')
      expect(extractTaskFromBranch('feature/A-1')).toBe('A-1')
      expect(extractTaskFromBranch('feature/VERYLONGPREFIX-12345')).toBe('VERYLONGPREFIX-12345')
    })

    it('should handle branch names with special characters', () => {
      expect(extractTaskFromBranch('feature/PROJ-123_some_feature')).toBe('PROJ-123')
      expect(extractTaskFromBranch('fix/PROJ-456.hotfix')).toBe('PROJ-456')
    })

    it('should handle messages with multiple references', () => {
      // Should return first reference
      expect(extractTaskFromMessage('[PROJ-1] and [PROJ-2]')).toBe('PROJ-1')
    })
  })
})
