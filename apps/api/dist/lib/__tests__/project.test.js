"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const project_1 = require("../project");
(0, vitest_1.describe)('project', () => {
    (0, vitest_1.describe)('hasMinProjectRole', () => {
        (0, vitest_1.it)('returns true when user role is equal to required role', () => {
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'MANAGER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'OWNER')).toBe(true);
        });
        (0, vitest_1.it)('returns true when user role is higher than required role', () => {
            // OWNER can do everything
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'MANAGER')).toBe(true);
            // MANAGER can do MEMBER and VIEWER actions
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'VIEWER')).toBe(true);
            // MEMBER can do VIEWER actions
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'VIEWER')).toBe(true);
        });
        (0, vitest_1.it)('returns false when user role is lower than required role', () => {
            // VIEWER cannot do higher role actions
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'MEMBER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'MANAGER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'OWNER')).toBe(false);
            // MEMBER cannot do MANAGER or OWNER actions
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'MANAGER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'OWNER')).toBe(false);
            // MANAGER cannot do OWNER actions
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'OWNER')).toBe(false);
        });
    });
    (0, vitest_1.describe)('role hierarchy order', () => {
        (0, vitest_1.it)('correctly orders roles from lowest to highest', () => {
            // VIEWER < MEMBER
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'MEMBER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'VIEWER')).toBe(true);
            // MEMBER < MANAGER
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'MANAGER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'MEMBER')).toBe(true);
            // MANAGER < OWNER
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'OWNER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'MANAGER')).toBe(true);
        });
        (0, vitest_1.it)('hierarchy is: VIEWER < MEMBER < MANAGER < OWNER', () => {
            // The only role that can access OWNER-level is OWNER
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'OWNER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'OWNER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'OWNER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'OWNER')).toBe(false);
            // MANAGER and OWNER can access MANAGER-level
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'MANAGER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'MANAGER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'MANAGER')).toBe(false);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'MANAGER')).toBe(false);
            // Everyone except VIEWER can access MEMBER-level
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'MEMBER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'MEMBER')).toBe(false);
            // Everyone can access VIEWER-level
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('OWNER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MANAGER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('MEMBER', 'VIEWER')).toBe(true);
            (0, vitest_1.expect)((0, project_1.hasMinProjectRole)('VIEWER', 'VIEWER')).toBe(true);
        });
    });
});
//# sourceMappingURL=project.test.js.map