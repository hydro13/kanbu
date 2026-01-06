import { type WIPValidation } from './board';
export interface TaskProgress {
    taskId: number;
    totalSubtasks: number;
    completedSubtasks: number;
    progressPercentage: number;
    hasSubtasks: boolean;
}
export interface TaskMoveValidation {
    canMove: boolean;
    reason?: string;
    wipValidation?: WIPValidation;
}
export interface TaskWithRelations {
    id: number;
    projectId: number;
    columnId: number;
    swimlaneId: number | null;
    creatorId: number;
    title: string;
    description: string | null;
    reference: string | null;
    priority: number;
    score: number;
    progress: number;
    position: number;
    color: string | null;
    dateStarted: Date | null;
    dateDue: Date | null;
    dateCompleted: Date | null;
    timeEstimated: number;
    timeSpent: number;
    isActive: boolean;
    isDraggable: boolean;
    recurrenceData: unknown;
    createdAt: Date;
    updatedAt: Date;
    milestoneId: number | null;
    moduleId: number | null;
    sprintId: number | null;
    categoryId: number | null;
    column: {
        id: number;
        title: string;
        taskLimit: number;
    };
    swimlane: {
        id: number;
        name: string;
    } | null;
    creator: {
        id: number;
        username: string;
        name: string;
        avatarUrl: string | null;
    };
    assignees: Array<{
        id: number;
        user: {
            id: number;
            username: string;
            name: string;
            avatarUrl: string | null;
        };
    }>;
    subtasks: Array<{
        id: number;
        title: string;
        status: string;
        position: number;
        timeEstimated: number;
        timeSpent: number;
        assignee: {
            id: number;
            username: string;
            name: string;
        } | null;
    }>;
    comments: Array<{
        id: number;
        content: string;
        createdAt: Date;
        user: {
            id: number;
            username: string;
            name: string;
            avatarUrl: string | null;
        };
    }>;
    tags: Array<{
        id: number;
        tag: {
            id: number;
            name: string;
            color: string;
        };
    }>;
    category: {
        id: number;
        name: string;
        color: string;
    } | null;
    milestone: {
        id: number;
        name: string;
    } | null;
    module: {
        id: number;
        name: string;
        color: string;
    } | null;
    sprint: {
        id: number;
        name: string;
        status: string;
    } | null;
}
/**
 * Calculate task progress based on subtasks.
 * Returns 0% if no subtasks, otherwise % of completed subtasks.
 *
 * @param taskId - The task ID to calculate progress for
 * @returns TaskProgress with percentage and counts
 * @throws TRPCError NOT_FOUND if task doesn't exist
 */
export declare function calculateTaskProgress(taskId: number): Promise<TaskProgress>;
/**
 * Update task progress based on its subtasks.
 * Called after subtask status changes.
 *
 * @param taskId - The task ID to update
 * @returns Updated progress percentage
 */
export declare function updateTaskProgress(taskId: number): Promise<number>;
/**
 * Validate if a task can be moved to a column.
 * Checks WIP limits and column existence.
 *
 * @param taskId - The task ID to move
 * @param targetColumnId - The target column ID
 * @returns Validation result with reason if denied
 */
export declare function validateTaskMove(taskId: number, targetColumnId: number): Promise<TaskMoveValidation>;
/**
 * Get task with all related entities loaded.
 * Used for task detail view.
 *
 * @param taskId - The task ID to load
 * @returns Task with all relations
 * @throws TRPCError NOT_FOUND if task doesn't exist
 */
export declare function getTaskWithRelations(taskId: number): Promise<TaskWithRelations>;
/**
 * Get the next available position for a task in a column.
 *
 * @param columnId - The column ID
 * @param swimlaneId - Optional swimlane ID for position within swimlane
 * @returns Next position number
 */
export declare function getNextTaskPosition(columnId: number, swimlaneId?: number | null): Promise<number>;
/**
 * Apply position updates to tasks in a transaction.
 *
 * @param updates - Array of {id, position} updates
 */
export declare function applyTaskPositions(updates: Array<{
    id: number;
    position: number;
}>): Promise<void>;
/**
 * Recalculate task time spent from subtasks.
 *
 * @param taskId - The task ID to update
 * @returns Total time spent in hours
 */
export declare function recalculateTaskTime(taskId: number): Promise<number>;
//# sourceMappingURL=task.d.ts.map