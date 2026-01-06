/*
 * Auth Library Tests
 * Version: 1.0.0
 *
 * Tests for password hashing and verification functions.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T03:53 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../auth'

describe('auth', () => {
  describe('hashPassword', () => {
    it('returns a hash that is different from the input', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(password.length)
    })
  })

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const password = 'correctPassword123'
      const hash = await hashPassword(password)

      const result = await verifyPassword(hash, password)

      expect(result).toBe(true)
    })

    it('returns false for incorrect password', async () => {
      const password = 'correctPassword123'
      const wrongPassword = 'wrongPassword456'
      const hash = await hashPassword(password)

      const result = await verifyPassword(hash, wrongPassword)

      expect(result).toBe(false)
    })
  })
})
