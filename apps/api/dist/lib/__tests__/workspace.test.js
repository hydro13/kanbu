"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const workspace_1 = require("../workspace");
(0, vitest_1.describe)('workspace', () => {
    (0, vitest_1.describe)('hasMinRole', () => {
        (0, vitest_1.it)('returns true when user role is equal to required role', () => {
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('VIEWER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('MEMBER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('ADMIN', 'ADMIN')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('OWNER', 'OWNER')).toBe(true);
        });
        (0, vitest_1.it)('returns true when user role is higher than required role', () => {
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('OWNER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('OWNER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('OWNER', 'ADMIN')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('ADMIN', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('ADMIN', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('MEMBER', 'VIEWER')).toBe(true);
        });
        (0, vitest_1.it)('returns false when user role is lower than required role', () => {
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('VIEWER', 'MEMBER')).toBe(false);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('VIEWER', 'ADMIN')).toBe(false);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('VIEWER', 'OWNER')).toBe(false);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('MEMBER', 'ADMIN')).toBe(false);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('MEMBER', 'OWNER')).toBe(false);
            (0, vitest_1.expect)((0, workspace_1.hasMinRole)('ADMIN', 'OWNER')).toBe(false);
        });
    });
    (0, vitest_1.describe)('generateInviteToken', () => {
        (0, vitest_1.it)('generates a 64-character hex token', () => {
            const token = (0, workspace_1.generateInviteToken)();
            (0, vitest_1.expect)(token).toBeDefined();
            (0, vitest_1.expect)(token.length).toBe(64);
            (0, vitest_1.expect)(/^[0-9a-f]+$/.test(token)).toBe(true);
        });
        (0, vitest_1.it)('generates unique tokens on each call', () => {
            const token1 = (0, workspace_1.generateInviteToken)();
            const token2 = (0, workspace_1.generateInviteToken)();
            const token3 = (0, workspace_1.generateInviteToken)();
            (0, vitest_1.expect)(token1).not.toBe(token2);
            (0, vitest_1.expect)(token2).not.toBe(token3);
            (0, vitest_1.expect)(token1).not.toBe(token3);
        });
    });
    (0, vitest_1.describe)('getInviteExpiration', () => {
        (0, vitest_1.it)('returns a date 7 days from now by default', () => {
            const now = new Date();
            const expiration = (0, workspace_1.getInviteExpiration)();
            // Check it's roughly 7 days from now (allowing for test execution time)
            const diffDays = Math.round((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            (0, vitest_1.expect)(diffDays).toBe(7);
        });
        (0, vitest_1.it)('returns a date N days from now when specified', () => {
            const now = new Date();
            const exp3 = (0, workspace_1.getInviteExpiration)(3);
            const exp14 = (0, workspace_1.getInviteExpiration)(14);
            const exp30 = (0, workspace_1.getInviteExpiration)(30);
            const diffDays3 = Math.round((exp3.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const diffDays14 = Math.round((exp14.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const diffDays30 = Math.round((exp30.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            (0, vitest_1.expect)(diffDays3).toBe(3);
            (0, vitest_1.expect)(diffDays14).toBe(14);
            (0, vitest_1.expect)(diffDays30).toBe(30);
        });
        (0, vitest_1.it)('returns a date in the future', () => {
            const now = new Date();
            const expiration = (0, workspace_1.getInviteExpiration)();
            (0, vitest_1.expect)(expiration.getTime()).toBeGreaterThan(now.getTime());
        });
    });
});
//# sourceMappingURL=workspace.test.js.map