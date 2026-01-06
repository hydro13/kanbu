/*
 * TagBadge Component
 * Version: 1.0.0
 *
 * Displays colored tag chips for task categorization.
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

export interface Tag {
  id: number
  name: string
  color: string | null
}

export interface TagBadgeProps {
  tag: Tag
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: (tagId: number) => void
}

export interface TagListProps {
  tags: Tag[]
  maxVisible?: number
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: (tagId: number) => void
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_COLOR = '#6B7280' // Gray-500

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-1 py-0.5 text-xs',
  md: 'px-1.5 py-0.5 text-xs',
  lg: 'px-2 py-1 text-sm',
}

// =============================================================================
// Helper Functions
// =============================================================================

function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, dark gray for light backgrounds
  return luminance > 0.5 ? '#1F2937' : '#FFFFFF'
}

// =============================================================================
// Icons
// =============================================================================

function CloseIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

// =============================================================================
// Components
// =============================================================================

export function TagBadge({ tag, size = 'md', removable = false, onRemove }: TagBadgeProps) {
  const bgColor = tag.color ?? DEFAULT_COLOR
  const textColor = getContrastColor(bgColor)
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRemove?.(tag.id)
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${sizeClass}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {tag.name}
      {removable && onRemove && (
        <button
          onClick={handleRemove}
          className="opacity-70 hover:opacity-100 transition-opacity"
          title="Remove tag"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

export function TagList({
  tags,
  maxVisible = 3,
  size = 'md',
  removable = false,
  onRemove,
}: TagListProps) {
  if (tags.length === 0) return null

  const visibleTags = tags.slice(0, maxVisible)
  const hiddenCount = tags.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          removable={removable}
          onRemove={onRemove}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          className={`inline-flex items-center text-gray-400 dark:text-gray-500 ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md}`}
          title={tags.slice(maxVisible).map((t) => t.name).join(', ')}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  )
}

export default TagBadge
