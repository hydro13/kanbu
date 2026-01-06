"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_1 = require("../auth");
(0, vitest_1.describe)('auth', () => {
    (0, vitest_1.describe)('hashPassword', () => {
        (0, vitest_1.it)('returns a hash that is different from the input', async () => {
            const password = 'testPassword123';
            const hash = await (0, auth_1.hashPassword)(password);
            (0, vitest_1.expect)(hash).toBeDefined();
            (0, vitest_1.expect)(hash).not.toBe(password);
            (0, vitest_1.expect)(hash.length).toBeGreaterThan(password.length);
        });
    });
    (0, vitest_1.describe)('verifyPassword', () => {
        (0, vitest_1.it)('returns true for correct password', async () => {
            const password = 'correctPassword123';
            const hash = await (0, auth_1.hashPassword)(password);
            const result = await (0, auth_1.verifyPassword)(hash, password);
            (0, vitest_1.expect)(result).toBe(true);
        });
        (0, vitest_1.it)('returns false for incorrect password', async () => {
            const password = 'correctPassword123';
            const wrongPassword = 'wrongPassword456';
            const hash = await (0, auth_1.hashPassword)(password);
            const result = await (0, auth_1.verifyPassword)(hash, wrongPassword);
            (0, vitest_1.expect)(result).toBe(false);
        });
    });
});
//# sourceMappingURL=auth.test.js.map