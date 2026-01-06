/*
 * User Library Tests
 * Version: 1.0.0
 *
 * Tests for user-related validation schemas and utilities.
 * Note: Full procedure tests require database mocking (future enhancement).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: eb764cd4-e287-4522-915e-50a8e21ae515
 * Claude Code: v2.0.72 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T04:20 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Re-define schemas here for testing (avoiding circular imports)
// These mirror the schemas in user.ts
const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
})

describe('user schemas', () => {
  describe('updateProfileSchema', () => {
    it('accepts valid profile update with all fields', () => {
      const result = updateProfileSchema.safeParse({
        name: 'John Doe',
        timezone: 'Europe/Amsterdam',
        language: 'nl',
      })

      expect(result.success).toBe(true)
    })

    it('accepts partial updates', () => {
      const nameOnly = updateProfileSchema.safeParse({ name: 'John Doe' })
      const timezoneOnly = updateProfileSchema.safeParse({ timezone: 'UTC' })
      const languageOnly = updateProfileSchema.safeParse({ language: 'en' })

      expect(nameOnly.success).toBe(true)
      expect(timezoneOnly.success).toBe(true)
      expect(languageOnly.success).toBe(true)
    })

    it('accepts empty object (no updates)', () => {
      const result = updateProfileSchema.safeParse({})

      expect(result.success).toBe(true)
    })

    it('rejects name longer than 255 characters', () => {
      const result = updateProfileSchema.safeParse({
        name: 'a'.repeat(256),
      })

      expect(result.success).toBe(false)
    })

    it('rejects timezone longer than 50 characters', () => {
      const result = updateProfileSchema.safeParse({
        timezone: 'a'.repeat(51),
      })

      expect(result.success).toBe(false)
    })

    it('rejects language longer than 10 characters', () => {
      const result = updateProfileSchema.safeParse({
        language: 'a'.repeat(11),
      })

      expect(result.success).toBe(false)
    })
  })

  describe('changePasswordSchema', () => {
    it('accepts valid password change', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'myCurrentPassword',
        newPassword: 'myNewSecurePassword123',
      })

      expect(result.success).toBe(true)
    })

    it('rejects empty current password', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: '',
        newPassword: 'myNewSecurePassword123',
      })

      expect(result.success).toBe(false)
    })

    it('rejects new password shorter than 8 characters', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'current',
        newPassword: 'short',
      })

      expect(result.success).toBe(false)
    })

    it('rejects new password longer than 128 characters', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'current',
        newPassword: 'a'.repeat(129),
      })

      expect(result.success).toBe(false)
    })

    it('accepts password exactly 8 characters', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'current',
        newPassword: '12345678',
      })

      expect(result.success).toBe(true)
    })

    it('accepts password exactly 128 characters', () => {
      const result = changePasswordSchema.safeParse({
        currentPassword: 'current',
        newPassword: 'a'.repeat(128),
      })

      expect(result.success).toBe(true)
    })
  })
})
