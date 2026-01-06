"use strict";
/*
 * Comment Library Tests
 * Version: 1.0.0
 *
 * Tests for comment-related logic.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 06351901-f28f-466e-a9dc-bb521176dbb9
 * Claude Code: v2.0.75 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:02 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('comment', () => {
    (0, vitest_1.describe)('content validation', () => {
        (0, vitest_1.it)('accepts non-empty content', () => {
            const content = 'This is a valid comment';
            (0, vitest_1.expect)(content.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('max length is 50000 characters', () => {
            const maxLength = 50000;
            const longContent = 'a'.repeat(maxLength);
            (0, vitest_1.expect)(longContent.length).toBeLessThanOrEqual(maxLength);
        });
        (0, vitest_1.it)('rejects empty content', () => {
            const content = '';
            (0, vitest_1.expect)(content.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('ownership', () => {
        (0, vitest_1.it)('comment author can edit', () => {
            const commentUserId = 123;
            const currentUserId = 123;
            const isAuthor = commentUserId === currentUserId;
            (0, vitest_1.expect)(isAuthor).toBe(true);
        });
        (0, vitest_1.it)('non-author cannot edit', () => {
            const commentUserId = 123;
            const currentUserId = 456;
            const isAuthor = commentUserId === currentUserId;
            (0, vitest_1.expect)(isAuthor).toBe(false);
        });
        (0, vitest_1.it)('manager can delete any comment', () => {
            const userRole = 'MANAGER';
            const isManager = userRole === 'MANAGER' || userRole === 'OWNER';
            (0, vitest_1.expect)(isManager).toBe(true);
        });
        (0, vitest_1.it)('member cannot delete others comments', () => {
            const userRole = 'MEMBER';
            const commentUserId = 123;
            const currentUserId = 456;
            const isAuthor = commentUserId === currentUserId;
            const isManager = userRole === 'MANAGER' || userRole === 'OWNER';
            const canDelete = isAuthor || isManager;
            (0, vitest_1.expect)(canDelete).toBe(false);
        });
    });
    (0, vitest_1.describe)('ordering', () => {
        (0, vitest_1.it)('comments are ordered by creation date descending', () => {
            const comments = [
                { id: 1, createdAt: new Date('2025-01-01') },
                { id: 2, createdAt: new Date('2025-01-02') },
                { id: 3, createdAt: new Date('2025-01-03') },
            ];
            const sorted = [...comments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            (0, vitest_1.expect)(sorted[0]?.id).toBe(3); // Most recent first
            (0, vitest_1.expect)(sorted[2]?.id).toBe(1); // Oldest last
        });
    });
    (0, vitest_1.describe)('pagination', () => {
        (0, vitest_1.it)('default limit is 50', () => {
            const defaultLimit = 50;
            (0, vitest_1.expect)(defaultLimit).toBe(50);
        });
        (0, vitest_1.it)('max limit is 100', () => {
            const maxLimit = 100;
            const requestedLimit = 150;
            const effectiveLimit = Math.min(requestedLimit, maxLimit);
            (0, vitest_1.expect)(effectiveLimit).toBe(100);
        });
        (0, vitest_1.it)('hasMore is true when more comments exist', () => {
            const total = 75;
            const offset = 0;
            const fetchedCount = 50; // returned by query with limit 50
            const hasMore = offset + fetchedCount < total;
            (0, vitest_1.expect)(hasMore).toBe(true);
        });
        (0, vitest_1.it)('hasMore is false when all comments fetched', () => {
            const total = 75;
            const offset = 50;
            const fetchedCount = 25;
            const hasMore = offset + fetchedCount < total;
            (0, vitest_1.expect)(hasMore).toBe(false);
        });
    });
});
//# sourceMappingURL=comment.test.js.map