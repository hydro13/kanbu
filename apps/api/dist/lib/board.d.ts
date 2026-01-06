export interface PositionedItem {
    id: number;
    position: number;
}
export interface WIPValidation {
    columnId: number;
    taskLimit: number;
    currentCount: number;
    isOverLimit: boolean;
    canAddTask: boolean;
}
/**
 * Check if a column can be safely deleted.
 * A column can only be deleted if it has no tasks.
 *
 * @param columnId - The column ID to check
 * @returns Object with validation result and task count
 * @throws TRPCError NOT_FOUND if column doesn't exist
 */
export declare function validateColumnDelete(columnId: number): Promise<{
    canDelete: boolean;
    taskCount: number;
    columnTitle: string;
}>;
/**
 * Check WIP (Work In Progress) limit for a column.
 *
 * @param columnId - The column ID to check
 * @returns WIP validation result
 * @throws TRPCError NOT_FOUND if column doesn't exist
 */
export declare function checkWIPLimit(columnId: number): Promise<WIPValidation>;
/**
 * Check if a swimlane can be safely deleted.
 * A swimlane can only be deleted if it has no tasks.
 *
 * @param swimlaneId - The swimlane ID to check
 * @returns Object with validation result and task count
 * @throws TRPCError NOT_FOUND if swimlane doesn't exist
 */
export declare function validateSwimlaneDelete(swimlaneId: number): Promise<{
    canDelete: boolean;
    taskCount: number;
    swimlaneName: string;
}>;
/**
 * Calculate new positions after moving an item.
 * Used for drag & drop reordering of columns or swimlanes.
 *
 * @param items - Array of items with id and position
 * @param itemId - The ID of the item being moved
 * @param newPosition - The new position for the item
 * @returns Array of items with updated positions
 */
export declare function calculateNewPositions<T extends PositionedItem>(items: T[], itemId: number, newPosition: number): Array<{
    id: number;
    position: number;
}>;
/**
 * Apply position updates to columns in a transaction.
 *
 * @param projectId - The project ID for verification
 * @param updates - Array of {id, position} updates
 */
export declare function applyColumnPositions(projectId: number, updates: Array<{
    id: number;
    position: number;
}>): Promise<void>;
/**
 * Apply position updates to swimlanes in a transaction.
 *
 * @param projectId - The project ID for verification
 * @param updates - Array of {id, position} updates
 */
export declare function applySwimlanePositions(projectId: number, updates: Array<{
    id: number;
    position: number;
}>): Promise<void>;
/**
 * Get the next available position for a new column.
 *
 * @param projectId - The project ID
 * @returns Next position number
 */
export declare function getNextColumnPosition(projectId: number): Promise<number>;
/**
 * Get the next available position for a new swimlane.
 *
 * @param projectId - The project ID
 * @returns Next position number
 */
export declare function getNextSwimlanePosition(projectId: number): Promise<number>;
//# sourceMappingURL=board.d.ts.map