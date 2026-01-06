/*
 * TaskCardSkeleton Component
 * Version: 1.0.0
 *
 * Loading skeleton for TaskCard.
 * Mimics the structure of TaskCard for smooth loading transitions.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T14:36 CET
 * ═══════════════════════════════════════════════════════════════════
 */

// =============================================================================
// Types
// =============================================================================

export interface TaskCardSkeletonProps {
  showTags?: boolean
  showProgress?: boolean
  showAssignees?: boolean
}

// =============================================================================
// Skeleton Primitives
// =============================================================================

function SkeletonBox({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-600 rounded ${className}`}
    />
  )
}

function SkeletonCircle({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-600 rounded-full ${className}`}
    />
  )
}

// =============================================================================
// Component
// =============================================================================

export function TaskCardSkeleton({
  showTags = true,
  showProgress = false,
  showAssignees = true,
}: TaskCardSkeletonProps) {
  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-600">
      {/* Header: Reference + Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <SkeletonBox className="h-3 w-16" />
        <SkeletonBox className="h-5 w-14" />
      </div>

      {/* Title - 2 lines */}
      <div className="space-y-1.5 mb-2">
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-3/4" />
      </div>

      {/* Tags */}
      {showTags && (
        <div className="flex gap-1 mb-2">
          <SkeletonBox className="h-5 w-12" />
          <SkeletonBox className="h-5 w-16" />
          <SkeletonBox className="h-5 w-10" />
        </div>
      )}

      {/* Progress bar */}
      {showProgress && (
        <div className="mb-2">
          <SkeletonBox className="h-1.5 w-full" />
        </div>
      )}

      {/* Footer: Metadata + Assignees */}
      <div className="flex items-center justify-between mt-2">
        {/* Metadata */}
        <div className="flex items-center gap-3">
          <SkeletonBox className="h-3 w-8" />
          <SkeletonBox className="h-3 w-8" />
          <SkeletonBox className="h-3 w-12" />
        </div>

        {/* Assignees */}
        {showAssignees && (
          <div className="flex -space-x-2">
            <SkeletonCircle className="h-6 w-6" />
            <SkeletonCircle className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Multiple Skeletons
// =============================================================================

export function TaskCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton
          key={i}
          showTags={i === 0}
          showProgress={i === 1}
        />
      ))}
    </div>
  )
}

export default TaskCardSkeleton
