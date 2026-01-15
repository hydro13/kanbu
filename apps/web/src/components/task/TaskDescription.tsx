/*
 * TaskDescription Component
 * Version: 2.0.0
 *
 * Rich text description editor with view/edit modes.
 * Now uses Lexical RichTextEditor for full rich text support.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T17:30 CET
 *
 * Modified by:
 * Session: MAX-2026-01-09
 * Change: Upgraded to RichTextEditor (Lexical) for rich text support
 * ===================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Pencil, Check, X, AlertCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor, getDisplayContent, isLexicalContent, lexicalToPlainText } from '@/components/editor'
import type { EditorState, LexicalEditor } from 'lexical'
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
  const [editedContent, setEditedContent] = useState('')
  const [lastSavedContent, setLastSavedContent] = useState('')
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const hasUnsavedChanges = useRef(false)

  // Initialize content when description prop changes or editing starts
  useEffect(() => {
    if (!isEditing) {
      const displayContent = getDisplayContent(description)
      setEditedContent(displayContent)
      setLastSavedContent(displayContent)
    }
  }, [description, isEditing])

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
      if (hasUnsavedChanges.current && !isUpdating) {
        console.log('[TaskDescription] Auto-saving...')
        try {
          await onUpdate(editedContent)
          setLastSavedContent(editedContent)
          setLastAutoSaveTime(new Date())
          hasUnsavedChanges.current = false
        } catch (error) {
          console.error('[TaskDescription] Auto-save failed:', error)
        }
      }
    }, AUTO_SAVE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isEditing, editedContent, isUpdating, onUpdate])

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (_editorState: EditorState, _editor: LexicalEditor, jsonString: string) => {
      setEditedContent(jsonString)
      hasUnsavedChanges.current = jsonString !== lastSavedContent
    },
    [lastSavedContent]
  )

  const handleStartEditing = useCallback(() => {
    // Don't allow editing if someone else is editing
    if (editingUser) return
    setEditorKey((k) => k + 1) // Force re-mount for clean editor state
    setIsEditing(true)
  }, [editingUser])

  const handleSave = useCallback(async () => {
    if (editedContent !== lastSavedContent) {
      await onUpdate(editedContent)
      setLastSavedContent(editedContent)
      hasUnsavedChanges.current = false
    }
    setLastAutoSaveTime(null)
    setIsEditing(false)
  }, [editedContent, lastSavedContent, onUpdate])

  const handleCancel = useCallback(() => {
    setEditedContent(getDisplayContent(description))
    hasUnsavedChanges.current = false
    setIsEditing(false)
  }, [description])

  // Editing user display name
  const editorDisplayName = editingUser
    ? editingUser.name || editingUser.username
    : null

  // Check if content is empty
  const isContentEmpty = useCallback(() => {
    if (!description) return true
    if (!isLexicalContent(description)) return !description.trim()
    const plainText = lexicalToPlainText(description)
    return !plainText.trim()
  }, [description])

  // Someone else is editing - show locked state
  const isLockedByOther = !!editingUser

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

        {/* Rich Text Editor */}
        <RichTextEditor
          key={editorKey}
          initialContent={editedContent || undefined}
          onChange={handleEditorChange}
          placeholder="Add a description... Use **bold**, *italic*, # headings, lists, and more!"
          minHeight="200px"
          maxHeight="500px"
          namespace={`task-description-${editorKey}`}
          autoFocus
        />

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Rich text formatting supported</span>
          {lastAutoSaveTime && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Save className="h-3 w-3" />
              Auto-saved {lastAutoSaveTime.toLocaleTimeString()}
            </span>
          )}
          {hasUnsavedChanges.current && !lastAutoSaveTime && (
            <span className="text-amber-600 dark:text-amber-400">
              Unsaved changes (auto-save in 30s)
            </span>
          )}
        </div>
      </div>
    )
  }

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

      {!isContentEmpty() ? (
        <div
          className={`rounded-lg transition-all ${
            isLockedByOther
              ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 cursor-not-allowed'
              : 'bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750'
          }`}
          onClick={handleStartEditing}
          title={isLockedByOther ? `${editorDisplayName} is currently editing this field` : undefined}
        >
          {/* Editing indicator banner */}
          {isLockedByOther && (
            <div className="flex items-center gap-2 p-3 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/50">
                <Pencil className="h-3 w-3 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {editorDisplayName} is editing...
              </span>
            </div>
          )}
          {/* Read-only Rich Text Display */}
          <div className="p-1">
            <RichTextEditor
              initialContent={getDisplayContent(description)}
              readOnly={true}
              showToolbar={false}
              minHeight="auto"
              maxHeight="none"
              namespace="task-description-view"
            />
          </div>
        </div>
      ) : (
        <div
          className={`p-4 text-sm rounded-lg border-2 border-dashed transition-all ${
            isLockedByOther
              ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 cursor-not-allowed'
              : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-input cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750'
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
