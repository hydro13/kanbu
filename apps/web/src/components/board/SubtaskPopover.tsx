/*
 * SubtaskPopover Component
 * Version: 1.2.0
 *
 * Interactive hover popover showing subtask list with status, assignee, and time.
 * Subtasks are clickable to open task detail modal.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { trpc } from '@/lib/trpc';
import { HoverPopover, PopoverContent } from '@/components/ui/HoverPopover';

// =============================================================================
// Types
// =============================================================================

interface SubtaskPopoverProps {
  taskId: number;
  subtaskCount: number;
  progress: number;
  children: React.ReactNode;
  /** Callback when subtask is clicked (opens task modal with subtask focus) */
  onSubtaskClick?: (taskId: number, subtaskId: number) => void;
}

// =============================================================================
// Status Icons
// =============================================================================

function StatusIcon({ status }: { status: string }) {
  if (status === 'DONE') {
    return (
      <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <svg
        className="h-4 w-4 text-blue-500 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  // TODO
  return (
    <svg
      className="h-4 w-4 text-gray-400 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

// =============================================================================
// Time Formatting
// =============================================================================

function formatTime(hours: number): string {
  if (hours === 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// =============================================================================
// Subtask Content Component
// =============================================================================

interface SubtaskContentProps {
  taskId: number;
  subtaskCount: number;
  progress: number;
  onSubtaskClick?: (taskId: number, subtaskId: number) => void;
}

function SubtaskContent({ taskId, subtaskCount, progress, onSubtaskClick }: SubtaskContentProps) {
  // Lazy load subtasks
  const subtasksQuery = trpc.subtask.list.useQuery({ taskId });

  const completedCount = subtasksQuery.data?.filter((s) => s.status === 'DONE').length ?? 0;

  const handleSubtaskClick = (subtaskId: number) => {
    if (onSubtaskClick) {
      onSubtaskClick(taskId, subtaskId);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-t-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtasks</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {completedCount}/{subtaskCount} ({progress}%)
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <PopoverContent className="max-h-[300px]">
        {subtasksQuery.isLoading ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </div>
        ) : subtasksQuery.error ? (
          <div className="px-3 py-4 text-center text-sm text-red-500">Failed to load subtasks</div>
        ) : subtasksQuery.data && subtasksQuery.data.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-3 py-1.5 text-left font-medium">Subtask</th>
                <th className="px-2 py-1.5 text-left font-medium">Assignee</th>
                <th className="px-2 py-1.5 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {subtasksQuery.data.map((subtask) => (
                <tr
                  key={subtask.id}
                  onClick={() => handleSubtaskClick(subtask.id)}
                  className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <StatusIcon status={subtask.status} />
                      <span
                        className={`${
                          subtask.status === 'DONE'
                            ? 'text-gray-400 dark:text-gray-500 line-through'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {subtask.assignee ? (
                      <span>{subtask.assignee.name ?? subtask.assignee.username}</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {subtask.timeSpent > 0 ? (
                      <span>
                        {formatTime(subtask.timeSpent)}
                        {subtask.timeEstimated > 0 && (
                          <span className="text-gray-300 dark:text-gray-600">
                            /{formatTime(subtask.timeEstimated)}
                          </span>
                        )}
                      </span>
                    ) : subtask.timeEstimated > 0 ? (
                      <span className="text-gray-300 dark:text-gray-600">
                        -{formatTime(subtask.timeEstimated)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No subtasks
          </div>
        )}
      </PopoverContent>

      {/* Footer hint */}
      {subtasksQuery.data && subtasksQuery.data.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-b-lg">
          <span className="text-xs text-gray-400 dark:text-gray-500">Click subtask to edit</span>
        </div>
      )}
    </>
  );
}

// =============================================================================
// SubtaskPopover Component
// =============================================================================

export function SubtaskPopover({
  taskId,
  subtaskCount,
  progress,
  children,
  onSubtaskClick,
}: SubtaskPopoverProps) {
  if (subtaskCount === 0) {
    return <>{children}</>;
  }

  return (
    <HoverPopover
      content={
        <SubtaskContent
          taskId={taskId}
          subtaskCount={subtaskCount}
          progress={progress}
          onSubtaskClick={onSubtaskClick}
        />
      }
      width={520}
      maxHeight={400}
    >
      {children}
    </HoverPopover>
  );
}

export default SubtaskPopover;
