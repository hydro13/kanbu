/*
 * TaskDescription Component
 * Version: 1.0.0
 *
 * Markdown description editor with view/edit modes.
 * Supports auto-save on blur and live editing presence.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:30 CET
 *
 * Modified by:
 * Session: realtime-editing-presence
 * Signed: 2026-01-04T00:00 CET
 * Change: Added live editing presence with visual feedback when another user is editing
 *
 * Session: realtime-editing-presence
 * Signed: 2026-01-04T00:00 CET
 * Change: Added auto-save every 30 seconds to prevent data loss on crash
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Pencil, Check, X, AlertCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EditingUser } from '@/hooks/useEditingPresence'

// =============================================================================
// Constants
// =============================================================================

/** Auto-save interval to prevent data loss */
const AUTO_SAVE_INTERVAL_MS = 30 * 1000 // 30 seconds

// =============================================================================
// Types
// =============================================================================

export interface TaskDescriptionProps {
  description: string
  onUpdate: (description: string) => Promise<void>
  isUpdating: boolean
  /** User currently editing this field (if any) */
  editingUser?: EditingUser
  /** Called when user starts editing */
  onEditStart?: () => void
  /** Called when user stops editing */
  onEditStop?: () => void
}

// =============================================================================
// Component
// =============================================================================

export function TaskDescription({
  description,
  onUpdate,
  isUpdating,
  editingUser,
  onEditStart,
  onEditStop,
}: TaskDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedDescription, setEditedDescription] = useState(description)
  const [lastSavedDescription, setLastSavedDescription] = useState(description)
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset edited description when prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditedDescription(description)
      setLastSavedDescription(description)
    }
  }, [description, isEditing])

  // Focus and resize textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      resizeTextarea()
    }
  }, [isEditing])

  // Notify when editing state changes
  useEffect(() => {
    if (isEditing) {
      onEditStart?.()
    } else {
      onEditStop?.()
    }
  }, [isEditing, onEditStart, onEditStop])

  // Auto-save while editing to prevent data loss on crash
  useEffect(() => {
    if (!isEditing) return

    const interval = setInterval(async () => {
      // Only auto-save if there are unsaved changes
      if (editedDescription !== lastSavedDescription && !isUpdating) {
        console.log('[TaskDescription] Auto-saving...')
        try {
          await onUpdate(editedDescription)
          setLastSavedDescription(editedDescription)
          setLastAutoSaveTime(new Date())
        } catch (error) {
          console.error('[TaskDescription] Auto-save failed:', error)
        }
      }
    }, AUTO_SAVE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isEditing, editedDescription, lastSavedDescription, isUpdating, onUpdate])

  const resizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`
    }
  }, [])

  const handleStartEditing = useCallback(() => {
    // Don't allow editing if someone else is editing
    if (editingUser) return
    setIsEditing(true)
  }, [editingUser])

  const handleSave = useCallback(async () => {
    if (editedDescription !== lastSavedDescription) {
      await onUpdate(editedDescription)
      setLastSavedDescription(editedDescription)
    }
    setLastAutoSaveTime(null)
    setIsEditing(false)
  }, [editedDescription, lastSavedDescription, onUpdate])

  const handleCancel = useCallback(() => {
    setEditedDescription(description)
    setIsEditing(false)
  }, [description])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleCancel, handleSave]
  )

  // Editing user display name
  const editorDisplayName = editingUser
    ? editingUser.name || editingUser.username
    : null

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={editedDescription}
          onChange={(e) => {
            setEditedDescription(e.target.value)
            resizeTextarea()
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[200px] p-3 text-sm font-mono bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Add a description... (Markdown supported)"
          disabled={isUpdating}
        />
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Ctrl+S to save, Escape to cancel</span>
          {lastAutoSaveTime && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Save className="h-3 w-3" />
              Auto-saved {lastAutoSaveTime.toLocaleTimeString()}
            </span>
          )}
          {editedDescription !== lastSavedDescription && !lastAutoSaveTime && (
            <span className="text-amber-600 dark:text-amber-400">
              Unsaved changes (auto-save in 30s)
            </span>
          )}
        </div>
      </div>
    )
  }

  // Someone else is editing - show locked state
  const isLockedByOther = !!editingUser

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </h3>
        <div className="relative group">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartEditing}
            disabled={isLockedByOther}
            className={isLockedByOther ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {/* Tooltip when disabled */}
          {isLockedByOther && (
            <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>{editorDisplayName} is editing</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {description ? (
        <div
          className={`prose prose-sm dark:prose-invert max-w-none p-3 rounded-lg transition-all ${
            isLockedByOther
              ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 cursor-not-allowed'
              : 'bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750'
          }`}
          onClick={handleStartEditing}
          title={isLockedByOther ? `${editorDisplayName} is currently editing this field` : undefined}
        >
          {/* Editing indicator banner */}
          {isLockedByOther && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50">
                <Pencil className="h-3 w-3 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {editorDisplayName} is editing...
              </span>
            </div>
          )}
          {/* Simple markdown-like rendering */}
          {description.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return <h1 key={i} className="text-lg font-bold">{line.slice(2)}</h1>
            }
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-base font-semibold">{line.slice(3)}</h2>
            }
            if (line.startsWith('- ')) {
              return <li key={i} className="ml-4">{line.slice(2)}</li>
            }
            if (line.startsWith('* ')) {
              return <li key={i} className="ml-4">{line.slice(2)}</li>
            }
            if (line.trim() === '') {
              return <br key={i} />
            }
            return <p key={i}>{line}</p>
          })}
        </div>
      ) : (
        <div
          className={`p-4 text-sm rounded-lg border-2 border-dashed transition-all ${
            isLockedByOther
              ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 cursor-not-allowed'
              : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750'
          }`}
          onClick={handleStartEditing}
          title={isLockedByOther ? `${editorDisplayName} is currently editing this field` : undefined}
        >
          {isLockedByOther ? (
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              <span>{editorDisplayName} is editing...</span>
            </div>
          ) : (
            'Click to add a description...'
          )}
        </div>
      )}
    </div>
  )
}

export default TaskDescription
