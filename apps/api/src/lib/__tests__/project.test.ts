/*
 * Project Library Tests
 * Version: 1.0.0
 *
 * Tests for project helper functions (permission checks, role hierarchy).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest'
import { hasMinProjectRole } from '../project'

describe('project', () => {
  describe('hasMinProjectRole', () => {
    it('returns true when user role is equal to required role', () => {
      expect(hasMinProjectRole('VIEWER', 'VIEWER')).toBe(true)
      expect(hasMinProjectRole('MEMBER', 'MEMBER')).toBe(true)
      expect(hasMinProjectRole('MANAGER', 'MANAGER')).toBe(true)
      expect(hasMinProjectRole('OWNER', 'OWNER')).toBe(true)
    })

    it('returns true when user role is higher than required role', () => {
      // OWNER can do everything
      expect(hasMinProjectRole('OWNER', 'VIEWER')).toBe(true)
      expect(hasMinProjectRole('OWNER', 'MEMBER')).toBe(true)
      expect(hasMinProjectRole('OWNER', 'MANAGER')).toBe(true)

      // MANAGER can do MEMBER and VIEWER actions
      expect(hasMinProjectRole('MANAGER', 'MEMBER')).toBe(true)
      expect(hasMinProjectRole('MANAGER', 'VIEWER')).toBe(true)

      // MEMBER can do VIEWER actions
      expect(hasMinProjectRole('MEMBER', 'VIEWER')).toBe(true)
    })

    it('returns false when user role is lower than required role', () => {
      // VIEWER cannot do higher role actions
      expect(hasMinProjectRole('VIEWER', 'MEMBER')).toBe(false)
      expect(hasMinProjectRole('VIEWER', 'MANAGER')).toBe(false)
      expect(hasMinProjectRole('VIEWER', 'OWNER')).toBe(false)

      // MEMBER cannot do MANAGER or OWNER actions
      expect(hasMinProjectRole('MEMBER', 'MANAGER')).toBe(false)
      expect(hasMinProjectRole('MEMBER', 'OWNER')).toBe(false)

      // MANAGER cannot do OWNER actions
      expect(hasMinProjectRole('MANAGER', 'OWNER')).toBe(false)
    })
  })

  describe('role hierarchy order', () => {
    it('correctly orders roles from lowest to highest', () => {
      // VIEWER < MEMBER
      expect(hasMinProjectRole('VIEWER', 'MEMBER')).toBe(false)
      expect(hasMinProjectRole('MEMBER', 'VIEWER')).toBe(true)

      // MEMBER < MANAGER
      expect(hasMinProjectRole('MEMBER', 'MANAGER')).toBe(false)
      expect(hasMinProjectRole('MANAGER', 'MEMBER')).toBe(true)

      // MANAGER < OWNER
      expect(hasMinProjectRole('MANAGER', 'OWNER')).toBe(false)
      expect(hasMinProjectRole('OWNER', 'MANAGER')).toBe(true)
    })

    it('hierarchy is: VIEWER < MEMBER < MANAGER < OWNER', () => {
      // The only role that can access OWNER-level is OWNER
      expect(hasMinProjectRole('OWNER', 'OWNER')).toBe(true)
      expect(hasMinProjectRole('MANAGER', 'OWNER')).toBe(false)
      expect(hasMinProjectRole('MEMBER', 'OWNER')).toBe(false)
      expect(hasMinProjectRole('VIEWER', 'OWNER')).toBe(false)

      // MANAGER and OWNER can access MANAGER-level
      expect(hasMinProjectRole('OWNER', 'MANAGER')).toBe(true)
      expect(hasMinProjectRole('MANAGER', 'MANAGER')).toBe(true)
      expect(hasMinProjectRole('MEMBER', 'MANAGER')).toBe(false)
      expect(hasMinProjectRole('VIEWER', 'MANAGER')).toBe(false)

      // Everyone except VIEWER can access MEMBER-level
      expect(hasMinProjectRole('OWNER', 'MEMBER')).toBe(true)
      expect(hasMinProjectRole('MANAGER', 'MEMBER')).toBe(true)
      expect(hasMinProjectRole('MEMBER', 'MEMBER')).toBe(true)
      expect(hasMinProjectRole('VIEWER', 'MEMBER')).toBe(false)

      // Everyone can access VIEWER-level
      expect(hasMinProjectRole('OWNER', 'VIEWER')).toBe(true)
      expect(hasMinProjectRole('MANAGER', 'VIEWER')).toBe(true)
      expect(hasMinProjectRole('MEMBER', 'VIEWER')).toBe(true)
      expect(hasMinProjectRole('VIEWER', 'VIEWER')).toBe(true)
    })
  })
})
