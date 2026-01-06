/*
 * Workspace Library Tests
 * Version: 1.0.0
 *
 * Tests for workspace helper functions (permission checks, token generation).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T04:18 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest'
import { hasMinRole, generateInviteToken, getInviteExpiration } from '../workspace'

describe('workspace', () => {
  describe('hasMinRole', () => {
    it('returns true when user role is equal to required role', () => {
      expect(hasMinRole('VIEWER', 'VIEWER')).toBe(true)
      expect(hasMinRole('MEMBER', 'MEMBER')).toBe(true)
      expect(hasMinRole('ADMIN', 'ADMIN')).toBe(true)
      expect(hasMinRole('OWNER', 'OWNER')).toBe(true)
    })

    it('returns true when user role is higher than required role', () => {
      expect(hasMinRole('OWNER', 'VIEWER')).toBe(true)
      expect(hasMinRole('OWNER', 'MEMBER')).toBe(true)
      expect(hasMinRole('OWNER', 'ADMIN')).toBe(true)
      expect(hasMinRole('ADMIN', 'MEMBER')).toBe(true)
      expect(hasMinRole('ADMIN', 'VIEWER')).toBe(true)
      expect(hasMinRole('MEMBER', 'VIEWER')).toBe(true)
    })

    it('returns false when user role is lower than required role', () => {
      expect(hasMinRole('VIEWER', 'MEMBER')).toBe(false)
      expect(hasMinRole('VIEWER', 'ADMIN')).toBe(false)
      expect(hasMinRole('VIEWER', 'OWNER')).toBe(false)
      expect(hasMinRole('MEMBER', 'ADMIN')).toBe(false)
      expect(hasMinRole('MEMBER', 'OWNER')).toBe(false)
      expect(hasMinRole('ADMIN', 'OWNER')).toBe(false)
    })
  })

  describe('generateInviteToken', () => {
    it('generates a 64-character hex token', () => {
      const token = generateInviteToken()

      expect(token).toBeDefined()
      expect(token.length).toBe(64)
      expect(/^[0-9a-f]+$/.test(token)).toBe(true)
    })

    it('generates unique tokens on each call', () => {
      const token1 = generateInviteToken()
      const token2 = generateInviteToken()
      const token3 = generateInviteToken()

      expect(token1).not.toBe(token2)
      expect(token2).not.toBe(token3)
      expect(token1).not.toBe(token3)
    })
  })

  describe('getInviteExpiration', () => {
    it('returns a date 7 days from now by default', () => {
      const now = new Date()
      const expiration = getInviteExpiration()

      // Check it's roughly 7 days from now (allowing for test execution time)
      const diffDays = Math.round((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffDays).toBe(7)
    })

    it('returns a date N days from now when specified', () => {
      const now = new Date()

      const exp3 = getInviteExpiration(3)
      const exp14 = getInviteExpiration(14)
      const exp30 = getInviteExpiration(30)

      const diffDays3 = Math.round((exp3.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const diffDays14 = Math.round((exp14.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const diffDays30 = Math.round((exp30.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(diffDays3).toBe(3)
      expect(diffDays14).toBe(14)
      expect(diffDays30).toBe(30)
    })

    it('returns a date in the future', () => {
      const now = new Date()
      const expiration = getInviteExpiration()

      expect(expiration.getTime()).toBeGreaterThan(now.getTime())
    })
  })
})
