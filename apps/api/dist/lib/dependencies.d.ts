/**
 * Check if creating a link would cause a circular dependency.
 * Uses depth-first search to detect cycles in the blocking graph.
 *
 * @param sourceTaskId - The task that would do the blocking
 * @param targetTaskId - The task that would be blocked
 * @returns true if creating this link would cause a cycle
 */
export declare function wouldCreateCircularDependency(sourceTaskId: number, targetTaskId: number): Promise<boolean>;
/**
 * Get all tasks that are blocking a given task (directly or indirectly).
 * Follows the IS_BLOCKED_BY chain up the graph.
 *
 * @param taskId - The task to check
 * @returns Array of task IDs that are blocking this task
 */
export declare function getBlockingChain(taskId: number): Promise<number[]>;
/**
 * Get all tasks that are blocked by a given task (directly or indirectly).
 * Follows the BLOCKS chain down the graph.
 *
 * @param taskId - The task to check
 * @returns Array of task IDs that this task is blocking
 */
export declare function getBlockedChain(taskId: number): Promise<number[]>;
/**
 * Check if a task is currently blocked by any uncompleted tasks.
 *
 * @param taskId - The task to check
 * @returns true if the task is blocked
 */
export declare function isTaskBlocked(taskId: number): Promise<boolean>;
//# sourceMappingURL=dependencies.d.ts.map