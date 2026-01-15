/*
 * CategorySelector Component
 * Version: 1.0.0
 *
 * Single-select category picker with inline creation.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 4799aa36-9c39-404a-b0b7-b6c15fd8b02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T19:43 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '../../lib/trpc'
import { ChevronDown, Plus, Check, X, Loader2, Folder } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface Category {
  id: number
  name: string
  color: string | null
  description?: string | null
}

export interface CategorySelectorProps {
  projectId: number
  taskId: number
  selectedCategory: Category | null
  onCategoryChange?: (category: Category | null) => void
  disabled?: boolean
}

// =============================================================================
// Constants
// =============================================================================

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#EAB308', // Yellow
  '#F97316', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
]

// =============================================================================
// CategorySelector Component
// =============================================================================

export function CategorySelector({
  projectId,
  taskId,
  selectedCategory,
  onCategoryChange,
  disabled = false,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0])
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch all categories for the project
  const { data: categories, isLoading } = trpc.category.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  // Mutations
  const utils = trpc.useUtils()

  const createCategoryMutation = trpc.category.create.useMutation({
    onSuccess: (newCategory) => {
      utils.category.list.invalidate({ projectId })
      // Auto-select the newly created category
      setCategoryMutation.mutate({ taskId, categoryId: newCategory.id })
      setNewCategoryName('')
      setIsCreating(false)
    },
  })

  const setCategoryMutation = trpc.category.setForTask.useMutation({
    onSuccess: (result) => {
      utils.task.get.invalidate({ taskId })
      if ('category' in result && result.category) {
        onCategoryChange?.(result.category as Category)
      } else {
        onCategoryChange?.(null)
      }
      setIsOpen(false)
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

  const handleSelectCategory = (category: Category | null) => {
    if (disabled) return
    setCategoryMutation.mutate({ taskId, categoryId: category?.id ?? null })
  }

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return
    createCategoryMutation.mutate({
      projectId,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    })
  }

  const isMutating = setCategoryMutation.isPending || createCategoryMutation.isPending

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Category Display */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isMutating}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-card hover:border-gray-400 dark:hover:border-gray-500'
        } border-input`}
      >
        {selectedCategory ? (
          <>
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: selectedCategory.color ?? '#6B7280' }}
            />
            <span className="flex-1 text-left text-foreground">
              {selectedCategory.name}
            </span>
          </>
        ) : (
          <>
            <Folder className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-left text-gray-500 dark:text-gray-400">
              No category
            </span>
          </>
        )}
        {isMutating ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Available Categories */}
          <div className="max-h-48 overflow-y-auto p-2">
            {/* No Category Option */}
            <button
              onClick={() => handleSelectCategory(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                !selectedCategory
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'hover:bg-accent'
              }`}
              disabled={isMutating}
            >
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500" />
              <span className="flex-1 text-gray-500 dark:text-gray-400">No category</span>
              {!selectedCategory && <Check className="w-4 h-4 text-blue-500" />}
            </button>

            {/* Divider */}
            {categories && categories.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : categories && categories.length > 0 ? (
              <div className="space-y-1">
                {categories.map((category) => {
                  const isSelected = selectedCategory?.id === category.id
                  return (
                    <button
                      key={category.id}
                      onClick={() =>
                        handleSelectCategory({
                          id: category.id,
                          name: category.name,
                          color: category.color,
                          description: category.description,
                        })
                      }
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-accent'
                      }`}
                      disabled={isMutating}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color ?? '#6B7280' }}
                      />
                      <span className="flex-1 text-foreground">{category.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Create New Category */}
          {isCreating ? (
            <div className="p-2 space-y-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCategory()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newCategoryColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCategoryMutation.isPending ? (
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
              Create new category
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CategorySelector
