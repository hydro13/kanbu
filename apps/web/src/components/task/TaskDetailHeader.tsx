/*
 * TaskDetailHeader Component
 * Version: 1.0.0
 *
 * Header section of the task detail modal.
 * Shows editable title, reference badge, status, and priority.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:30 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Check, X, Archive, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

interface Task {
  id: number
  title: string
  reference: string | null
  priority: number
  isActive: boolean
}

export interface TaskDetailHeaderProps {
  task: Task
  onTitleUpdate: (title: string) => Promise<void>
  onPriorityUpdate: (priority: number) => Promise<void>
  onClose: () => Promise<void>
  onReopen: () => Promise<void>
  isUpdating: boolean
  /** Auto-focus title field when modal opens (for new tasks) */
  autoFocusTitle?: boolean
}

// =============================================================================
// Priority Config
// =============================================================================

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Low', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  { value: 1, label: 'Normal', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  { value: 2, label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  { value: 3, label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
]

// =============================================================================
// Component
// =============================================================================

export function TaskDetailHeader({
  task,
  onTitleUpdate,
  onPriorityUpdate,
  onClose,
  onReopen,
  isUpdating,
  autoFocusTitle = false,
}: TaskDetailHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const hasAutoFocused = useRef(false)

  // Auto-focus title when autoFocusTitle is true (for new tasks)
  useEffect(() => {
    if (autoFocusTitle && !hasAutoFocused.current) {
      hasAutoFocused.current = true
      setIsEditingTitle(true)
    }
  }, [autoFocusTitle])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Reset edited title when task changes
  useEffect(() => {
    setEditedTitle(task.title)
  }, [task.title])

  const handleTitleSubmit = useCallback(async () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      await onTitleUpdate(editedTitle)
    }
    setIsEditingTitle(false)
  }, [editedTitle, task.title, onTitleUpdate])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTitleSubmit()
      } else if (e.key === 'Escape') {
        setEditedTitle(task.title)
        setIsEditingTitle(false)
      }
    },
    [handleTitleSubmit, task.title]
  )

  const handlePrioritySelect = useCallback(
    async (priority: number) => {
      await onPriorityUpdate(priority)
      setShowPriorityDropdown(false)
    },
    [onPriorityUpdate]
  )

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === task.priority) ?? PRIORITY_OPTIONS[0]

  return (
    <div className="space-y-3">
      {/* Reference + Status Row */}
      <div className="flex items-center gap-3">
        {task.reference && (
          <span className="text-sm font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {task.reference}
          </span>
        )}
        {!task.isActive && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
            Closed
          </span>
        )}
      </div>

      {/* Title Row */}
      <div className="flex items-start gap-3">
        {isEditingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSubmit}
              className="flex-1 text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white"
              disabled={isUpdating}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTitleSubmit}
              disabled={isUpdating}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditedTitle(task.title)
                setIsEditingTitle(false)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <h2
            className="flex-1 text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => setIsEditingTitle(true)}
          >
            {task.title}
          </h2>
        )}
      </div>

      {/* Priority + Actions Row */}
      <div className="flex items-center justify-between">
        {/* Priority Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
            className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${currentPriority?.color}`}
            disabled={isUpdating}
          >
            {currentPriority?.label}
            <svg
              className="ml-1.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showPriorityDropdown && (
            <div className="absolute z-10 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePrioritySelect(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md ${
                    option.value === task.priority ? 'bg-gray-50 dark:bg-gray-750' : ''
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {task.isActive ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
              className="text-gray-600 dark:text-gray-400"
            >
              <Archive className="h-4 w-4 mr-1" />
              Close Task
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onReopen}
              disabled={isUpdating}
              className="text-green-600 dark:text-green-400"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reopen
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskDetailHeader
