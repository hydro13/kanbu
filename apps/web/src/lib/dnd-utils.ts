/*
 * Drag & Drop Utilities
 * Version: 1.0.0
 *
 * Helper functions for drag and drop operations on the Kanban board.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T15:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a droppable ID for a column
 */
export function getColumnDroppableId(columnId: number): string {
  return `column-${columnId}`
}

/**
 * Generate a droppable ID for a column/swimlane combination
 */
export function getColumnSwimlaneDroppableId(
  columnId: number,
  swimlaneId: number | null
): string {
  if (swimlaneId === null) {
    return `column-${columnId}`
  }
  return `column-${columnId}-swimlane-${swimlaneId}`
}

/**
 * Parse a droppable ID to extract column and swimlane IDs
 */
export function parseDroppableId(id: string): {
  columnId: number
  swimlaneId: number | null
} | null {
  if (!id.startsWith('column-')) {
    return null
  }

  const parts = id.split('-')
  const columnId = parseInt(parts[1]!, 10)

  if (isNaN(columnId)) {
    return null
  }

  if (parts.length > 3 && parts[2] === 'swimlane') {
    const swimlaneId = parseInt(parts[3]!, 10)
    return {
      columnId,
      swimlaneId: isNaN(swimlaneId) ? null : swimlaneId,
    }
  }

  return { columnId, swimlaneId: null }
}

/**
 * Generate a draggable ID for a task
 */
export function getTaskDraggableId(taskId: number): string {
  return `task-${taskId}`
}

/**
 * Parse a draggable ID to extract task ID
 */
export function parseTaskDraggableId(id: string): number | null {
  if (!id.startsWith('task-')) {
    return null
  }

  const taskId = parseInt(id.slice(5), 10)
  return isNaN(taskId) ? null : taskId
}

// =============================================================================
// Position Calculation
// =============================================================================

/**
 * Calculate the new position for a task when dropped
 * Returns a position value that ensures proper ordering
 * Always returns a value >= 0.5 to allow space at the beginning
 */
export function calculateNewPosition(
  currentPositions: number[],
  targetIndex: number
): number {
  if (currentPositions.length === 0) {
    return 1
  }

  const sorted = [...currentPositions].sort((a, b) => a - b)

  // Inserting at the beginning
  if (targetIndex <= 0) {
    const firstPos = sorted[0] ?? 1
    // Return half of the first position, minimum 0.5
    return Math.max(0.5, firstPos / 2)
  }

  // Inserting at the end
  if (targetIndex >= sorted.length) {
    return (sorted[sorted.length - 1] ?? 0) + 1
  }

  // Inserting in the middle - calculate midpoint
  const before = sorted[targetIndex - 1] ?? 0
  const after = sorted[targetIndex] ?? before + 2
  return (before + after) / 2
}

/**
 * Check if positions need rebalancing (too many decimal places)
 */
export function needsRebalancing(positions: number[]): boolean {
  return positions.some((pos) => {
    const str = pos.toString()
    const decimalIndex = str.indexOf('.')
    return decimalIndex !== -1 && str.length - decimalIndex > 6
  })
}

/**
 * Rebalance positions to use simple integers
 */
export function rebalancePositions<T extends { position: number }>(
  items: T[]
): T[] {
  return items
    .sort((a, b) => a.position - b.position)
    .map((item, index) => ({
      ...item,
      position: index,
    }))
}

// =============================================================================
// WIP Limit Helpers
// =============================================================================

/**
 * Check if a column has reached its WIP limit
 */
export function isWipLimitReached(taskCount: number, wipLimit: number): boolean {
  return wipLimit > 0 && taskCount >= wipLimit
}

/**
 * Check if adding a task would exceed the WIP limit
 */
export function wouldExceedWipLimit(
  currentCount: number,
  wipLimit: number
): boolean {
  return wipLimit > 0 && currentCount >= wipLimit
}

// =============================================================================
// Animation Helpers
// =============================================================================

/**
 * Get CSS classes for drag state
 */
export function getDragStateClasses(
  isDragging: boolean,
  isOver: boolean
): string {
  const classes: string[] = []

  if (isDragging) {
    classes.push('opacity-50', 'ring-2', 'ring-blue-400')
  }

  if (isOver) {
    classes.push('ring-2', 'ring-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20')
  }

  return classes.join(' ')
}

export default {
  getColumnDroppableId,
  getColumnSwimlaneDroppableId,
  parseDroppableId,
  getTaskDraggableId,
  parseTaskDraggableId,
  calculateNewPosition,
  needsRebalancing,
  rebalancePositions,
  isWipLimitReached,
  wouldExceedWipLimit,
  getDragStateClasses,
}
