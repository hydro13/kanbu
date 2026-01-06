"use strict";
/*
 * Board Helper Functions
 * Version: 1.0.0
 *
 * Utilities for column and swimlane management.
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
exports.validateColumnDelete = validateColumnDelete;
exports.checkWIPLimit = checkWIPLimit;
exports.validateSwimlaneDelete = validateSwimlaneDelete;
exports.calculateNewPositions = calculateNewPositions;
exports.applyColumnPositions = applyColumnPositions;
exports.applySwimlanePositions = applySwimlanePositions;
exports.getNextColumnPosition = getNextColumnPosition;
exports.getNextSwimlanePosition = getNextSwimlanePosition;
const server_1 = require("@trpc/server");
const prisma_1 = require("./prisma");
// =============================================================================
// Column Validation Helpers
// =============================================================================
/**
 * Check if a column can be safely deleted.
 * A column can only be deleted if it has no tasks.
 *
 * @param columnId - The column ID to check
 * @returns Object with validation result and task count
 * @throws TRPCError NOT_FOUND if column doesn't exist
 */
async function validateColumnDelete(columnId) {
    const column = await prisma_1.prisma.column.findUnique({
        where: { id: columnId },
        select: {
            title: true,
            _count: {
                select: { tasks: true },
            },
        },
    });
    if (!column) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Column not found',
        });
    }
    return {
        canDelete: column._count.tasks === 0,
        taskCount: column._count.tasks,
        columnTitle: column.title,
    };
}
/**
 * Check WIP (Work In Progress) limit for a column.
 *
 * @param columnId - The column ID to check
 * @returns WIP validation result
 * @throws TRPCError NOT_FOUND if column doesn't exist
 */
async function checkWIPLimit(columnId) {
    const column = await prisma_1.prisma.column.findUnique({
        where: { id: columnId },
        select: {
            id: true,
            taskLimit: true,
            _count: {
                select: {
                    tasks: {
                        where: { isActive: true },
                    },
                },
            },
        },
    });
    if (!column) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Column not found',
        });
    }
    const currentCount = column._count.tasks;
    const hasLimit = column.taskLimit > 0;
    const isOverLimit = hasLimit && currentCount >= column.taskLimit;
    const canAddTask = !hasLimit || currentCount < column.taskLimit;
    return {
        columnId,
        taskLimit: column.taskLimit,
        currentCount,
        isOverLimit,
        canAddTask,
    };
}
// =============================================================================
// Swimlane Validation Helpers
// =============================================================================
/**
 * Check if a swimlane can be safely deleted.
 * A swimlane can only be deleted if it has no tasks.
 *
 * @param swimlaneId - The swimlane ID to check
 * @returns Object with validation result and task count
 * @throws TRPCError NOT_FOUND if swimlane doesn't exist
 */
async function validateSwimlaneDelete(swimlaneId) {
    const swimlane = await prisma_1.prisma.swimlane.findUnique({
        where: { id: swimlaneId },
        select: {
            name: true,
            _count: {
                select: { tasks: true },
            },
        },
    });
    if (!swimlane) {
        throw new server_1.TRPCError({
            code: 'NOT_FOUND',
            message: 'Swimlane not found',
        });
    }
    return {
        canDelete: swimlane._count.tasks === 0,
        taskCount: swimlane._count.tasks,
        swimlaneName: swimlane.name,
    };
}
// =============================================================================
// Position Reorder Helpers
// =============================================================================
/**
 * Calculate new positions after moving an item.
 * Used for drag & drop reordering of columns or swimlanes.
 *
 * @param items - Array of items with id and position
 * @param itemId - The ID of the item being moved
 * @param newPosition - The new position for the item
 * @returns Array of items with updated positions
 */
function calculateNewPositions(items, itemId, newPosition) {
    // Sort items by current position
    const sortedItems = [...items].sort((a, b) => a.position - b.position);
    // Find the item being moved
    const itemIndex = sortedItems.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
        return sortedItems.map((item, idx) => ({ id: item.id, position: idx + 1 }));
    }
    // Remove item from current position (we know it exists because itemIndex !== -1)
    const removedItems = sortedItems.splice(itemIndex, 1);
    const movedItem = removedItems[0];
    // Clamp new position to valid range
    const clampedPosition = Math.max(0, Math.min(newPosition - 1, sortedItems.length));
    // Insert at new position
    sortedItems.splice(clampedPosition, 0, movedItem);
    // Return with sequential positions starting at 1
    return sortedItems.map((item, idx) => ({
        id: item.id,
        position: idx + 1,
    }));
}
/**
 * Apply position updates to columns in a transaction.
 *
 * @param projectId - The project ID for verification
 * @param updates - Array of {id, position} updates
 */
async function applyColumnPositions(projectId, updates) {
    await prisma_1.prisma.$transaction(updates.map((update) => prisma_1.prisma.column.update({
        where: { id: update.id, projectId },
        data: { position: update.position },
    })));
}
/**
 * Apply position updates to swimlanes in a transaction.
 *
 * @param projectId - The project ID for verification
 * @param updates - Array of {id, position} updates
 */
async function applySwimlanePositions(projectId, updates) {
    await prisma_1.prisma.$transaction(updates.map((update) => prisma_1.prisma.swimlane.update({
        where: { id: update.id, projectId },
        data: { position: update.position },
    })));
}
/**
 * Get the next available position for a new column.
 *
 * @param projectId - The project ID
 * @returns Next position number
 */
async function getNextColumnPosition(projectId) {
    const maxColumn = await prisma_1.prisma.column.findFirst({
        where: { projectId },
        orderBy: { position: 'desc' },
        select: { position: true },
    });
    return (maxColumn?.position ?? 0) + 1;
}
/**
 * Get the next available position for a new swimlane.
 *
 * @param projectId - The project ID
 * @returns Next position number
 */
async function getNextSwimlanePosition(projectId) {
    const maxSwimlane = await prisma_1.prisma.swimlane.findFirst({
        where: { projectId },
        orderBy: { position: 'desc' },
        select: { position: true },
    });
    return (maxSwimlane?.position ?? 0) + 1;
}
//# sourceMappingURL=board.js.map