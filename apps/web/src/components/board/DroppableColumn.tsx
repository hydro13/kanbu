/*
 * DroppableColumn Component
 * Version: 1.0.0
 *
 * Drop zone wrapper for board columns using dnd-kit.
 * Provides visual feedback during drag operations.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T15:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ReactNode } from 'react';
import { getColumnSwimlaneDroppableId, isWipLimitReached } from '@/lib/dnd-utils';
import type { BoardTask } from './Board';

// =============================================================================
// Types
// =============================================================================

export interface DroppableColumnProps {
  columnId: number;
  swimlaneId: number | null;
  tasks: BoardTask[];
  taskLimit: number;
  children: ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function DroppableColumn({
  columnId,
  swimlaneId,
  tasks,
  taskLimit,
  children,
}: DroppableColumnProps) {
  const droppableId = getColumnSwimlaneDroppableId(columnId, swimlaneId);

  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    data: {
      type: 'column',
      columnId,
      swimlaneId,
    },
  });

  // Check WIP limit
  const wipLimitReached = isWipLimitReached(tasks.length, taskLimit);
  const taskIds = tasks.map((t) => t.id);

  // Determine styling based on drag state
  const getDropZoneClasses = () => {
    const classes = ['min-h-[100px]', 'rounded-md', 'transition-colors', 'duration-200'];

    if (isOver) {
      if (wipLimitReached) {
        // Visual feedback: can't drop here (WIP limit)
        classes.push('bg-red-50', 'dark:bg-red-900/20', 'ring-2', 'ring-red-400');
      } else {
        // Visual feedback: valid drop target
        classes.push('bg-blue-50', 'dark:bg-blue-900/20', 'ring-2', 'ring-blue-400');
      }
    }

    return classes.join(' ');
  };

  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={getDropZoneClasses()}>
        {children}

        {/* Empty state drop indicator */}
        {tasks.length === 0 && isOver && !wipLimitReached && (
          <div className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center text-blue-500 dark:text-blue-400 text-sm">
            Drop here
          </div>
        )}

        {/* WIP limit warning */}
        {isOver && wipLimitReached && (
          <div className="border-2 border-dashed border-red-400 rounded-lg p-4 text-center text-red-500 dark:text-red-400 text-sm">
            WIP limit reached
          </div>
        )}
      </div>
    </SortableContext>
  );
}

export default DroppableColumn;
