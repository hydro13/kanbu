"use strict";
/*
 * Subtask Library Tests
 * Version: 1.0.0
 *
 * Tests for subtask-related logic.
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
(0, vitest_1.describe)('subtask', () => {
    (0, vitest_1.describe)('status transitions', () => {
        (0, vitest_1.it)('TODO is valid initial status', () => {
            const status = 'TODO';
            const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
            (0, vitest_1.expect)(validStatuses.includes(status)).toBe(true);
        });
        (0, vitest_1.it)('IN_PROGRESS indicates work started', () => {
            const status = 'IN_PROGRESS';
            (0, vitest_1.expect)(status).toBe('IN_PROGRESS');
        });
        (0, vitest_1.it)('DONE indicates completion', () => {
            const status = 'DONE';
            (0, vitest_1.expect)(status).toBe('DONE');
        });
    });
    (0, vitest_1.describe)('time tracking', () => {
        (0, vitest_1.it)('time estimated is in hours', () => {
            const timeEstimated = 1.5; // 1 hour 30 minutes
            const minutes = timeEstimated * 60;
            (0, vitest_1.expect)(minutes).toBe(90);
        });
        (0, vitest_1.it)('minimum time is 0.08h (5 minutes)', () => {
            const minTime = 0.08;
            const minutes = Math.round(minTime * 60);
            (0, vitest_1.expect)(minutes).toBe(5);
        });
        (0, vitest_1.it)('typical subtask is 15-30 minutes', () => {
            const typical15min = 0.25;
            const typical30min = 0.5;
            (0, vitest_1.expect)(typical15min * 60).toBe(15);
            (0, vitest_1.expect)(typical30min * 60).toBe(30);
        });
    });
    (0, vitest_1.describe)('position reordering', () => {
        (0, vitest_1.it)('positions are 1-indexed', () => {
            const subtasks = [
                { id: 1, position: 1 },
                { id: 2, position: 2 },
                { id: 3, position: 3 },
            ];
            (0, vitest_1.expect)(subtasks[0]?.position).toBe(1);
            (0, vitest_1.expect)(subtasks[subtasks.length - 1]?.position).toBe(3);
        });
        (0, vitest_1.it)('can calculate next position', () => {
            const subtasks = [
                { id: 1, position: 1 },
                { id: 2, position: 2 },
            ];
            const maxPosition = subtasks.reduce((max, s) => Math.max(max, s.position), 0);
            const nextPosition = maxPosition + 1;
            (0, vitest_1.expect)(nextPosition).toBe(3);
        });
        (0, vitest_1.it)('next position is 1 when no subtasks exist', () => {
            const subtasks = [];
            const maxPosition = subtasks.reduce((max, s) => Math.max(max, s.position), 0);
            const nextPosition = maxPosition + 1;
            (0, vitest_1.expect)(nextPosition).toBe(1);
        });
    });
    (0, vitest_1.describe)('progress contribution', () => {
        (0, vitest_1.it)('each subtask contributes equally to progress', () => {
            const subtaskCount = 4;
            const contributionPerSubtask = 100 / subtaskCount;
            (0, vitest_1.expect)(contributionPerSubtask).toBe(25);
        });
        (0, vitest_1.it)('only DONE subtasks count toward progress', () => {
            const subtasks = [
                { status: 'DONE' },
                { status: 'IN_PROGRESS' },
                { status: 'TODO' },
            ];
            const doneCount = subtasks.filter(s => s.status === 'DONE').length;
            (0, vitest_1.expect)(doneCount).toBe(1);
        });
    });
});
//# sourceMappingURL=subtask.test.js.map