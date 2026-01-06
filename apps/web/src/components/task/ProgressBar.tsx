/*
 * ProgressBar Component
 * Version: 1.0.0
 *
 * Displays task completion progress based on subtasks.
 * Color coding: Green (100%), Blue (in progress), Gray (0%)
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

export interface ProgressBarProps {
  progress: number // 0-100
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export interface SubtaskProgressProps {
  completed: number
  total: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CLASSES: Record<string, { bar: string; text: string }> = {
  sm: { bar: 'h-1', text: 'text-xs' },
  md: { bar: 'h-1.5', text: 'text-xs' },
  lg: { bar: 'h-2', text: 'text-sm' },
}

// =============================================================================
// Helper Functions
// =============================================================================

function getProgressColor(progress: number): string {
  if (progress === 100) {
    return 'bg-green-500 dark:bg-green-400'
  } else if (progress > 0) {
    return 'bg-blue-500 dark:bg-blue-400'
  }
  return 'bg-gray-300 dark:bg-gray-500'
}

// =============================================================================
// Components
// =============================================================================

export function ProgressBar({
  progress,
  showPercentage = false,
  size = 'md',
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const sizeConfig = SIZE_CLASSES[size] ?? SIZE_CLASSES.md!
  const progressColor = getProgressColor(clampedProgress)

  return (
    <div className="w-full">
      <div
        className={`${sizeConfig.bar} bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden`}
      >
        <div
          className={`h-full ${progressColor} rounded-full ${animated ? 'transition-all duration-300' : ''}`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <span className={`${sizeConfig.text} text-gray-500 dark:text-gray-400 mt-0.5`}>
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  )
}

export function SubtaskProgress({
  completed,
  total,
  showCount = true,
  size = 'md',
}: SubtaskProgressProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0
  const sizeConfig = SIZE_CLASSES[size] ?? SIZE_CLASSES.md!

  return (
    <div className="w-full">
      <ProgressBar progress={progress} size={size} />
      {showCount && (
        <div className={`flex items-center justify-between ${sizeConfig.text} text-gray-500 dark:text-gray-400 mt-0.5`}>
          <span>
            {completed}/{total} subtasks
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Compact Progress Indicator
// =============================================================================

export function ProgressIndicator({ progress }: { progress: number }) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  const progressColor = getProgressColor(clampedProgress)

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} rounded-full`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  )
}

export default ProgressBar
