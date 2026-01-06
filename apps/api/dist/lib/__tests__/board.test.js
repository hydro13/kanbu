"use strict";
/*
 * Board Library Tests
 * Version: 1.0.0
 *
 * Tests for board helper functions (position calculation, reordering).
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 1d704110-bdc1-417f-a584-942696f49132
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T12:46 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const board_1 = require("../board");
(0, vitest_1.describe)('board', () => {
    (0, vitest_1.describe)('calculateNewPositions', () => {
        // Sample items for testing
        const createItems = () => [
            { id: 1, position: 1 },
            { id: 2, position: 2 },
            { id: 3, position: 3 },
            { id: 4, position: 4 },
            { id: 5, position: 5 },
        ];
        (0, vitest_1.it)('moves item forward (higher position)', () => {
            const items = createItems();
            // Move item 2 to position 4
            const result = (0, board_1.calculateNewPositions)(items, 2, 4);
            // Should result in: 1, 3, 4, 2, 5 order
            (0, vitest_1.expect)(result).toEqual([
                { id: 1, position: 1 },
                { id: 3, position: 2 },
                { id: 4, position: 3 },
                { id: 2, position: 4 },
                { id: 5, position: 5 },
            ]);
        });
        (0, vitest_1.it)('moves item backward (lower position)', () => {
            const items = createItems();
            // Move item 4 to position 2
            const result = (0, board_1.calculateNewPositions)(items, 4, 2);
            // Should result in: 1, 4, 2, 3, 5 order
            (0, vitest_1.expect)(result).toEqual([
                { id: 1, position: 1 },
                { id: 4, position: 2 },
                { id: 2, position: 3 },
                { id: 3, position: 4 },
                { id: 5, position: 5 },
            ]);
        });
        (0, vitest_1.it)('moves item to first position', () => {
            const items = createItems();
            // Move item 5 to position 1
            const result = (0, board_1.calculateNewPositions)(items, 5, 1);
            // Should result in: 5, 1, 2, 3, 4 order
            (0, vitest_1.expect)(result).toEqual([
                { id: 5, position: 1 },
                { id: 1, position: 2 },
                { id: 2, position: 3 },
                { id: 3, position: 4 },
                { id: 4, position: 5 },
            ]);
        });
        (0, vitest_1.it)('moves item to last position', () => {
            const items = createItems();
            // Move item 1 to position 5
            const result = (0, board_1.calculateNewPositions)(items, 1, 5);
            // Should result in: 2, 3, 4, 5, 1 order
            (0, vitest_1.expect)(result).toEqual([
                { id: 2, position: 1 },
                { id: 3, position: 2 },
                { id: 4, position: 3 },
                { id: 5, position: 4 },
                { id: 1, position: 5 },
            ]);
        });
        (0, vitest_1.it)('keeps same order when moving to current position', () => {
            const items = createItems();
            // Move item 3 to position 3 (same position)
            const result = (0, board_1.calculateNewPositions)(items, 3, 3);
            (0, vitest_1.expect)(result).toEqual([
                { id: 1, position: 1 },
                { id: 2, position: 2 },
                { id: 3, position: 3 },
                { id: 4, position: 4 },
                { id: 5, position: 5 },
            ]);
        });
        (0, vitest_1.it)('handles item not found gracefully', () => {
            const items = createItems();
            // Try to move non-existent item 99
            const result = (0, board_1.calculateNewPositions)(items, 99, 3);
            // Should normalize positions without changing order
            (0, vitest_1.expect)(result).toEqual([
                { id: 1, position: 1 },
                { id: 2, position: 2 },
                { id: 3, position: 3 },
                { id: 4, position: 4 },
                { id: 5, position: 5 },
            ]);
        });
        (0, vitest_1.it)('clamps position to valid range (too low)', () => {
            const items = createItems();
            // Move item 3 to position 0 (should clamp to 1)
            const result = (0, board_1.calculateNewPositions)(items, 3, 0);
            // Should result in: 3, 1, 2, 4, 5 order
            (0, vitest_1.expect)(result).toEqual([
                { id: 3, position: 1 },
                { id: 1, position: 2 },
                { id: 2, position: 3 },
                { id: 4, position: 4 },
                { id: 5, position: 5 },
            ]);
        });
        (0, vitest_1.it)('clamps position to valid range (too high)', () => {
            const items = createItems();
            // Move item 1 to position 100 (should clamp to 5)
            const result = (0, board_1.calculateNewPositions)(items, 1, 100);
            // Should result in: 2, 3, 4, 5, 1 order
            (0, vitest_1.expect)(result).toEqual([
                { id: 2, position: 1 },
                { id: 3, position: 2 },
                { id: 4, position: 3 },
                { id: 5, position: 4 },
                { id: 1, position: 5 },
            ]);
        });
        (0, vitest_1.it)('handles empty array', () => {
            const result = (0, board_1.calculateNewPositions)([], 1, 1);
            (0, vitest_1.expect)(result).toEqual([]);
        });
        (0, vitest_1.it)('handles single item', () => {
            const items = [{ id: 1, position: 1 }];
            const result = (0, board_1.calculateNewPositions)(items, 1, 5);
            (0, vitest_1.expect)(result).toEqual([{ id: 1, position: 1 }]);
        });
        (0, vitest_1.it)('handles items with non-sequential positions', () => {
            const items = [
                { id: 1, position: 10 },
                { id: 2, position: 20 },
                { id: 3, position: 30 },
            ];
            // Move item 3 to position 1
            const result = (0, board_1.calculateNewPositions)(items, 3, 1);
            // Should normalize to sequential positions
            (0, vitest_1.expect)(result).toEqual([
                { id: 3, position: 1 },
                { id: 1, position: 2 },
                { id: 2, position: 3 },
            ]);
        });
    });
});
//# sourceMappingURL=board.test.js.map