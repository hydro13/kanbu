"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const zod_1 = require("zod");
// Re-define schemas here for testing (avoiding circular imports)
// These mirror the schemas in user.ts
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    timezone: zod_1.z.string().max(50).optional(),
    language: zod_1.z.string().max(10).optional(),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
});
(0, vitest_1.describe)('user schemas', () => {
    (0, vitest_1.describe)('updateProfileSchema', () => {
        (0, vitest_1.it)('accepts valid profile update with all fields', () => {
            const result = updateProfileSchema.safeParse({
                name: 'John Doe',
                timezone: 'Europe/Amsterdam',
                language: 'nl',
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('accepts partial updates', () => {
            const nameOnly = updateProfileSchema.safeParse({ name: 'John Doe' });
            const timezoneOnly = updateProfileSchema.safeParse({ timezone: 'UTC' });
            const languageOnly = updateProfileSchema.safeParse({ language: 'en' });
            (0, vitest_1.expect)(nameOnly.success).toBe(true);
            (0, vitest_1.expect)(timezoneOnly.success).toBe(true);
            (0, vitest_1.expect)(languageOnly.success).toBe(true);
        });
        (0, vitest_1.it)('accepts empty object (no updates)', () => {
            const result = updateProfileSchema.safeParse({});
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('rejects name longer than 255 characters', () => {
            const result = updateProfileSchema.safeParse({
                name: 'a'.repeat(256),
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('rejects timezone longer than 50 characters', () => {
            const result = updateProfileSchema.safeParse({
                timezone: 'a'.repeat(51),
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('rejects language longer than 10 characters', () => {
            const result = updateProfileSchema.safeParse({
                language: 'a'.repeat(11),
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    (0, vitest_1.describe)('changePasswordSchema', () => {
        (0, vitest_1.it)('accepts valid password change', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'myCurrentPassword',
                newPassword: 'myNewSecurePassword123',
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('rejects empty current password', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: '',
                newPassword: 'myNewSecurePassword123',
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('rejects new password shorter than 8 characters', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'current',
                newPassword: 'short',
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('rejects new password longer than 128 characters', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'current',
                newPassword: 'a'.repeat(129),
            });
            (0, vitest_1.expect)(result.success).toBe(false);
        });
        (0, vitest_1.it)('accepts password exactly 8 characters', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'current',
                newPassword: '12345678',
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('accepts password exactly 128 characters', () => {
            const result = changePasswordSchema.safeParse({
                currentPassword: 'current',
                newPassword: 'a'.repeat(128),
            });
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
});
//# sourceMappingURL=user.test.js.map