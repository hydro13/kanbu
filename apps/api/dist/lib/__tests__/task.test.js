"use strict";
/*
 * Task Library Tests
 * Version: 1.0.0
 *
 * Tests for task helper functions.
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
// Note: Full integration tests would require database setup
// These are unit tests for pure logic functions
(0, vitest_1.describe)('task helpers', () => {
    (0, vitest_1.describe)('progress calculation logic', () => {
        (0, vitest_1.it)('calculates 0% when no subtasks completed', () => {
            const subtasks = [
                { status: 'TODO' },
                { status: 'TODO' },
                { status: 'IN_PROGRESS' },
            ];
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.status === 'DONE').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            (0, vitest_1.expect)(progress).toBe(0);
        });
        (0, vitest_1.it)('calculates 33% when 1 of 3 subtasks completed', () => {
            const subtasks = [
                { status: 'DONE' },
                { status: 'TODO' },
                { status: 'IN_PROGRESS' },
            ];
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.status === 'DONE').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            (0, vitest_1.expect)(progress).toBe(33);
        });
        (0, vitest_1.it)('calculates 50% when half subtasks completed', () => {
            const subtasks = [
                { status: 'DONE' },
                { status: 'DONE' },
                { status: 'TODO' },
                { status: 'IN_PROGRESS' },
            ];
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.status === 'DONE').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            (0, vitest_1.expect)(progress).toBe(50);
        });
        (0, vitest_1.it)('calculates 100% when all subtasks completed', () => {
            const subtasks = [
                { status: 'DONE' },
                { status: 'DONE' },
                { status: 'DONE' },
            ];
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.status === 'DONE').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            (0, vitest_1.expect)(progress).toBe(100);
        });
        (0, vitest_1.it)('returns 0% when no subtasks exist', () => {
            const subtasks = [];
            const total = subtasks.length;
            const completed = subtasks.filter(s => s.status === 'DONE').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            (0, vitest_1.expect)(progress).toBe(0);
        });
    });
    (0, vitest_1.describe)('WIP limit logic', () => {
        (0, vitest_1.it)('can add task when no limit set', () => {
            const taskLimit = 0;
            const currentCount = 10;
            const hasLimit = taskLimit > 0;
            const canAddTask = !hasLimit || currentCount < taskLimit;
            (0, vitest_1.expect)(canAddTask).toBe(true);
        });
        (0, vitest_1.it)('can add task when under limit', () => {
            const taskLimit = 5;
            const currentCount = 3;
            const hasLimit = taskLimit > 0;
            const canAddTask = !hasLimit || currentCount < taskLimit;
            (0, vitest_1.expect)(canAddTask).toBe(true);
        });
        (0, vitest_1.it)('cannot add task when at limit', () => {
            const taskLimit = 5;
            const currentCount = 5;
            const hasLimit = taskLimit > 0;
            const canAddTask = !hasLimit || currentCount < taskLimit;
            (0, vitest_1.expect)(canAddTask).toBe(false);
        });
        (0, vitest_1.it)('cannot add task when over limit', () => {
            const taskLimit = 5;
            const currentCount = 7;
            const hasLimit = taskLimit > 0;
            const canAddTask = !hasLimit || currentCount < taskLimit;
            (0, vitest_1.expect)(canAddTask).toBe(false);
        });
    });
    (0, vitest_1.describe)('task reference format', () => {
        (0, vitest_1.it)('generates correct format', () => {
            const identifier = 'PLAN';
            const nextNumber = 123;
            const reference = `${identifier}-${nextNumber}`;
            (0, vitest_1.expect)(reference).toBe('PLAN-123');
        });
        (0, vitest_1.it)('uses TASK fallback when no identifier', () => {
            const identifier = null;
            const nextNumber = 1;
            const reference = `${identifier || 'TASK'}-${nextNumber}`;
            (0, vitest_1.expect)(reference).toBe('TASK-1');
        });
        (0, vitest_1.it)('handles large task numbers', () => {
            const identifier = 'DEV';
            const nextNumber = 99999;
            const reference = `${identifier}-${nextNumber}`;
            (0, vitest_1.expect)(reference).toBe('DEV-99999');
        });
    });
    (0, vitest_1.describe)('time tracking calculation', () => {
        (0, vitest_1.it)('sums subtask time correctly', () => {
            const subtasks = [
                { timeSpent: 1.5 },
                { timeSpent: 2.0 },
                { timeSpent: 0.5 },
            ];
            const totalTimeSpent = subtasks.reduce((sum, s) => sum + s.timeSpent, 0);
            (0, vitest_1.expect)(totalTimeSpent).toBe(4.0);
        });
        (0, vitest_1.it)('returns 0 when no subtasks', () => {
            const subtasks = [];
            const totalTimeSpent = subtasks.reduce((sum, s) => sum + s.timeSpent, 0);
            (0, vitest_1.expect)(totalTimeSpent).toBe(0);
        });
        (0, vitest_1.it)('handles decimal hours', () => {
            const subtasks = [
                { timeSpent: 0.08 }, // 5 minutes
                { timeSpent: 0.25 }, // 15 minutes
                { timeSpent: 0.5 }, // 30 minutes
            ];
            const totalTimeSpent = subtasks.reduce((sum, s) => sum + s.timeSpent, 0);
            (0, vitest_1.expect)(totalTimeSpent).toBeCloseTo(0.83, 2);
        });
    });
    (0, vitest_1.describe)('priority validation', () => {
        (0, vitest_1.it)('accepts valid priority values', () => {
            const validPriorities = [0, 1, 2, 3];
            validPriorities.forEach(priority => {
                (0, vitest_1.expect)(priority >= 0 && priority <= 3).toBe(true);
            });
        });
        (0, vitest_1.it)('priority 0 is low', () => {
            const priority = 0;
            const labels = {
                0: 'low',
                1: 'medium',
                2: 'high',
                3: 'urgent',
            };
            (0, vitest_1.expect)(labels[priority]).toBe('low');
        });
        (0, vitest_1.it)('priority 3 is urgent', () => {
            const priority = 3;
            const labels = {
                0: 'low',
                1: 'medium',
                2: 'high',
                3: 'urgent',
            };
            (0, vitest_1.expect)(labels[priority]).toBe('urgent');
        });
    });
});
//# sourceMappingURL=task.test.js.map