/*
 * Bot Service Tests
 * Version: 1.0.0
 *
 * Tests for GitHub bot command parsing and processing.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 14 - Developer Experience
 * =============================================================================
 */

import { describe, it, expect } from 'vitest'
import { parseCommands } from '../botService'

describe('botService', () => {
  // ===========================================================================
  // Command Parsing Tests
  // ===========================================================================

  describe('parseCommands', () => {
    it('should return empty array for comment without commands', () => {
      const result = parseCommands('This is a regular comment')
      expect(result).toEqual([])
    })

    it('should parse single command', () => {
      const result = parseCommands('/kanbu status')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        command: 'status',
        args: [],
        raw: '/kanbu status',
      })
    })

    it('should parse command with argument', () => {
      const result = parseCommands('/kanbu link PROJ-123')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        command: 'link',
        args: ['PROJ-123'],
        raw: '/kanbu link PROJ-123',
      })
    })

    it('should parse command with multiple arguments', () => {
      const result = parseCommands('/kanbu assign @user1 @user2')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        command: 'assign',
        args: ['@user1', '@user2'],
        raw: '/kanbu assign @user1 @user2',
      })
    })

    it('should parse multiple commands in same comment', () => {
      const body = `
I think this looks good!

/kanbu link PROJ-456
/kanbu status

Thanks for the PR!
`
      const result = parseCommands(body)
      expect(result).toHaveLength(2)
      expect(result[0]?.command).toBe('link')
      expect(result[0]?.args).toEqual(['PROJ-456'])
      expect(result[1]?.command).toBe('status')
    })

    it('should handle command case-insensitively', () => {
      const result = parseCommands('/kanbu LINK PROJ-123')
      expect(result).toHaveLength(1)
      expect(result[0]?.command).toBe('link')
    })

    it('should ignore commands that are not /kanbu', () => {
      const result = parseCommands('/other-bot command')
      expect(result).toEqual([])
    })

    it('should ignore /kanbu in the middle of text', () => {
      const result = parseCommands('Please check /kanbu docs for more info')
      // This should still parse as it starts with /kanbu
      expect(result).toEqual([])
    })

    it('should parse help command', () => {
      const result = parseCommands('/kanbu help')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        command: 'help',
        args: [],
        raw: '/kanbu help',
      })
    })

    it('should parse unlink command', () => {
      const result = parseCommands('/kanbu unlink')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        command: 'unlink',
        args: [],
        raw: '/kanbu unlink',
      })
    })

    it('should parse summary command', () => {
      const result = parseCommands('/kanbu summary')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        command: 'summary',
        args: [],
        raw: '/kanbu summary',
      })
    })

    it('should handle extra whitespace', () => {
      const result = parseCommands('/kanbu   link    PROJ-123  ')
      expect(result).toHaveLength(1)
      expect(result[0]?.command).toBe('link')
      expect(result[0]?.args).toEqual(['PROJ-123'])
    })

    it('should ignore empty /kanbu command', () => {
      const result = parseCommands('/kanbu')
      expect(result).toEqual([])
    })

    it('should handle /kanbu followed by just whitespace', () => {
      const result = parseCommands('/kanbu   ')
      expect(result).toEqual([])
    })
  })

  // ===========================================================================
  // Command Type Tests
  // ===========================================================================

  describe('supported commands', () => {
    const supportedCommands = ['link', 'unlink', 'status', 'summary', 'help']

    supportedCommands.forEach((cmd) => {
      it(`should recognize ${cmd} command`, () => {
        const result = parseCommands(`/kanbu ${cmd}`)
        expect(result).toHaveLength(1)
        expect(result[0]?.command).toBe(cmd)
      })
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle command in code block (should still parse)', () => {
      // Note: In real usage, GitHub markdown would render this differently
      // but at the text level, we still parse it
      const body = '```\n/kanbu status\n```'
      const result = parseCommands(body)
      expect(result).toHaveLength(1)
    })

    it('should handle Windows line endings', () => {
      const body = '/kanbu link PROJ-1\r\n/kanbu status'
      const result = parseCommands(body)
      expect(result).toHaveLength(2)
    })

    it('should handle indented commands', () => {
      const result = parseCommands('  /kanbu status')
      expect(result).toHaveLength(1)
    })

    it('should handle tab-indented commands', () => {
      const result = parseCommands('\t/kanbu status')
      expect(result).toHaveLength(1)
    })

    it('should handle task reference with various formats', () => {
      const formats = ['PROJ-123', 'proj-123', 'ABC-1', 'TEST-99999']
      formats.forEach((ref) => {
        const result = parseCommands(`/kanbu link ${ref}`)
        expect(result[0]?.args).toEqual([ref])
      })
    })
  })
})
