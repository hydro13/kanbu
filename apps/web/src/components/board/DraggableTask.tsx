/*
 * DraggableTask Component
 * Version: 1.0.0
 *
 * Wrapper component that makes TaskCard draggable using dnd-kit.
 * Handles drag state styling and accessibility.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T15:35 CET
 *
 * Modified by:
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Signed: 2025-12-28T18:10 CET
 * Change: Added onTaskClick prop forwarding to TaskCard
 * ═══════════════════════════════════════════════════════════════════
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import type { BoardTask } from './Board'

// =============================================================================
// Types
// =============================================================================

export interface DraggableTaskProps {
  task: BoardTask
  projectId: number
  onTaskClick?: (taskId: number) => void
  onTaskContextMenu?: (taskId: number, event: React.MouseEvent) => void
}

// =============================================================================
// Component
// =============================================================================

export function DraggableTask({ task, projectId, onTaskClick, onTaskContextMenu }: DraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-none ${isDragging ? 'z-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} projectId={projectId} onTaskClick={onTaskClick} onContextMenu={onTaskContextMenu} />
    </div>
  )
}

export default DraggableTask
