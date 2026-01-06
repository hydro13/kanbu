/*
 * TagSelector Component
 * Version: 1.0.0
 *
 * Multi-select tag picker with inline creation and color picker.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:42 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '../../lib/trpc'
import { TagBadge } from './TagBadge'
import { Plus, Check, X, Loader2 } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface Tag {
  id: number
  name: string
  color: string | null
}

export interface TagSelectorProps {
  projectId: number
  taskId: number
  selectedTags: Tag[]
  onTagsChange?: (tags: Tag[]) => void
  disabled?: boolean
}

// =============================================================================
// Constants
// =============================================================================

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
]

// =============================================================================
// TagSelector Component
// =============================================================================

export function TagSelector({
  projectId,
  taskId,
  selectedTags,
  onTagsChange,
  disabled = false,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch all tags for the project
  const { data: allTags, isLoading } = trpc.tag.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  // Mutations
  const utils = trpc.useUtils()

  const createTagMutation = trpc.tag.create.useMutation({
    onSuccess: (newTag) => {
      utils.tag.list.invalidate({ projectId })
      // Auto-select the newly created tag
      addTagToTaskMutation.mutate({ taskId, tagId: newTag.id })
      setNewTagName('')
      setIsCreating(false)
    },
  })

  const addTagToTaskMutation = trpc.tag.addToTask.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId })
    },
  })

  const removeTagFromTaskMutation = trpc.tag.removeFromTask.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId })
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreating(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedTagIds = new Set(selectedTags.map((t) => t.id))

  const handleToggleTag = (tag: Tag) => {
    if (disabled) return

    if (selectedTagIds.has(tag.id)) {
      removeTagFromTaskMutation.mutate({ taskId, tagId: tag.id })
      onTagsChange?.(selectedTags.filter((t) => t.id !== tag.id))
    } else {
      addTagToTaskMutation.mutate({ taskId, tagId: tag.id })
      onTagsChange?.([...selectedTags, tag])
    }
  }

  const handleRemoveTag = (tagId: number) => {
    if (disabled) return
    removeTagFromTaskMutation.mutate({ taskId, tagId })
    onTagsChange?.(selectedTags.filter((t) => t.id !== tagId))
  }

  const handleCreateTag = () => {
    if (!newTagName.trim()) return
    createTagMutation.mutate({
      projectId,
      name: newTagName.trim(),
      color: newTagColor,
    })
  }

  const isMutating =
    addTagToTaskMutation.isPending ||
    removeTagFromTaskMutation.isPending ||
    createTagMutation.isPending

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-1 min-h-[32px] items-center">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            size="sm"
            removable={!disabled}
            onRemove={handleRemoveTag}
          />
        ))}
        {!disabled && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            disabled={isMutating}
          >
            {isMutating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Add tag
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Available Tags */}
          <div className="max-h-48 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : allTags && allTags.length > 0 ? (
              <div className="space-y-1">
                {allTags.map((tag) => {
                  const isSelected = selectedTagIds.has(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag({ id: tag.id, name: tag.name, color: tag.color })}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      disabled={isMutating}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color ?? '#6B7280' }}
                      />
                      <span className="flex-1 text-gray-900 dark:text-white">{tag.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No tags yet
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Create New Tag */}
          {isCreating ? (
            <div className="p-2 space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newTagColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || createTagMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createTagMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create new tag
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TagSelector
