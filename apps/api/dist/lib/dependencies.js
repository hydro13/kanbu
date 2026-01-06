"use strict";
/*
 * Task Dependency Utilities
 * Version: 1.0.0
 *
 * Circular dependency detection and blocking chain calculation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 91ee674b-91f8-407e-950b-e02721eb0de6
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T18:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wouldCreateCircularDependency = wouldCreateCircularDependency;
exports.getBlockingChain = getBlockingChain;
exports.getBlockedChain = getBlockedChain;
exports.isTaskBlocked = isTaskBlocked;
const prisma_1 = require("./prisma");
/**
 * Check if creating a link would cause a circular dependency.
 * Uses depth-first search to detect cycles in the blocking graph.
 *
 * @param sourceTaskId - The task that would do the blocking
 * @param targetTaskId - The task that would be blocked
 * @returns true if creating this link would cause a cycle
 */
async function wouldCreateCircularDependency(sourceTaskId, targetTaskId) {
    // If source and target are the same, it's immediately circular
    if (sourceTaskId === targetTaskId) {
        return true;
    }
    // Get all BLOCKS relationships from database
    const allBlockingLinks = await prisma_1.prisma.taskLink.findMany({
        where: {
            linkType: 'BLOCKS',
        },
        select: {
            taskId: true,
            oppositeTaskId: true,
        },
    });
    // Build adjacency list: task -> tasks it blocks
    const blocksGraph = new Map();
    for (const link of allBlockingLinks) {
        const existing = blocksGraph.get(link.taskId) ?? [];
        existing.push(link.oppositeTaskId);
        blocksGraph.set(link.taskId, existing);
    }
    // Add the proposed new link to the graph
    const existingFromSource = blocksGraph.get(sourceTaskId) ?? [];
    existingFromSource.push(targetTaskId);
    blocksGraph.set(sourceTaskId, existingFromSource);
    // DFS to detect if there's a path from targetTaskId back to sourceTaskId
    const visited = new Set();
    const stack = [targetTaskId];
    while (stack.length > 0) {
        const current = stack.pop();
        if (current === sourceTaskId) {
            // Found a path back to source - circular dependency!
            return true;
        }
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const blockedBy = blocksGraph.get(current) ?? [];
        for (const blocked of blockedBy) {
            if (!visited.has(blocked)) {
                stack.push(blocked);
            }
        }
    }
    return false;
}
/**
 * Get all tasks that are blocking a given task (directly or indirectly).
 * Follows the IS_BLOCKED_BY chain up the graph.
 *
 * @param taskId - The task to check
 * @returns Array of task IDs that are blocking this task
 */
async function getBlockingChain(taskId) {
    const blockingTasks = [];
    const visited = new Set();
    const stack = [taskId];
    // Get all blocking relationships
    const allBlockingLinks = await prisma_1.prisma.taskLink.findMany({
        where: {
            OR: [
                { linkType: 'BLOCKS' },
                { linkType: 'IS_BLOCKED_BY' },
            ],
        },
        select: {
            taskId: true,
            oppositeTaskId: true,
            linkType: true,
        },
    });
    // Build reverse adjacency list: task -> tasks that block it
    const blockedByGraph = new Map();
    for (const link of allBlockingLinks) {
        if (link.linkType === 'BLOCKS') {
            // If A BLOCKS B, then B is blocked by A
            const existing = blockedByGraph.get(link.oppositeTaskId) ?? [];
            existing.push(link.taskId);
            blockedByGraph.set(link.oppositeTaskId, existing);
        }
        else if (link.linkType === 'IS_BLOCKED_BY') {
            // If A IS_BLOCKED_BY B, then A is blocked by B
            const existing = blockedByGraph.get(link.taskId) ?? [];
            existing.push(link.oppositeTaskId);
            blockedByGraph.set(link.taskId, existing);
        }
    }
    // DFS to find all blocking tasks
    while (stack.length > 0) {
        const current = stack.pop();
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const blockers = blockedByGraph.get(current) ?? [];
        for (const blocker of blockers) {
            if (!visited.has(blocker)) {
                blockingTasks.push(blocker);
                stack.push(blocker);
            }
        }
    }
    return blockingTasks;
}
/**
 * Get all tasks that are blocked by a given task (directly or indirectly).
 * Follows the BLOCKS chain down the graph.
 *
 * @param taskId - The task to check
 * @returns Array of task IDs that this task is blocking
 */
async function getBlockedChain(taskId) {
    const blockedTasks = [];
    const visited = new Set();
    const stack = [taskId];
    // Get all blocking relationships
    const allBlockingLinks = await prisma_1.prisma.taskLink.findMany({
        where: {
            OR: [
                { linkType: 'BLOCKS' },
                { linkType: 'IS_BLOCKED_BY' },
            ],
        },
        select: {
            taskId: true,
            oppositeTaskId: true,
            linkType: true,
        },
    });
    // Build adjacency list: task -> tasks it blocks
    const blocksGraph = new Map();
    for (const link of allBlockingLinks) {
        if (link.linkType === 'BLOCKS') {
            // If A BLOCKS B, then A blocks B
            const existing = blocksGraph.get(link.taskId) ?? [];
            existing.push(link.oppositeTaskId);
            blocksGraph.set(link.taskId, existing);
        }
        else if (link.linkType === 'IS_BLOCKED_BY') {
            // If A IS_BLOCKED_BY B, then B blocks A
            const existing = blocksGraph.get(link.oppositeTaskId) ?? [];
            existing.push(link.taskId);
            blocksGraph.set(link.oppositeTaskId, existing);
        }
    }
    // DFS to find all blocked tasks
    while (stack.length > 0) {
        const current = stack.pop();
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const blocked = blocksGraph.get(current) ?? [];
        for (const blockedTask of blocked) {
            if (!visited.has(blockedTask)) {
                blockedTasks.push(blockedTask);
                stack.push(blockedTask);
            }
        }
    }
    return blockedTasks;
}
/**
 * Check if a task is currently blocked by any uncompleted tasks.
 *
 * @param taskId - The task to check
 * @returns true if the task is blocked
 */
async function isTaskBlocked(taskId) {
    // Get direct blockers
    const directBlockers = await prisma_1.prisma.taskLink.findMany({
        where: {
            OR: [
                { oppositeTaskId: taskId, linkType: 'BLOCKS' },
                { taskId: taskId, linkType: 'IS_BLOCKED_BY' },
            ],
        },
        select: {
            taskId: true,
            oppositeTaskId: true,
            linkType: true,
        },
    });
    if (directBlockers.length === 0) {
        return false;
    }
    // Get the blocking task IDs
    const blockerIds = directBlockers.map((link) => link.linkType === 'BLOCKS' ? link.taskId : link.oppositeTaskId);
    // Check if any blocker is not completed
    const uncompletedBlockers = await prisma_1.prisma.task.count({
        where: {
            id: { in: blockerIds },
            isActive: true, // Not closed
        },
    });
    return uncompletedBlockers > 0;
}
//# sourceMappingURL=dependencies.js.map