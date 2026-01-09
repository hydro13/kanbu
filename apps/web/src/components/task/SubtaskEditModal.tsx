/*
 * SubtaskEditModal Component
 * Version: 2.0.0
 *
 * Modal for editing subtask details including title, description, status, assignee, and time.
 * Now uses RichTextEditor for rich text description support.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: (Opus 4.5)
 * Host: max
 * Signed: 2026-01-03
 * Change: Task 266 - Created SubtaskEditModal for mini-task functionality
 *
 * Modified by:
 * Session: MAX-2026-01-09
 * Change: Upgraded to RichTextEditor (Lexical) for rich text support
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor, getDisplayContent, isLexicalContent, lexicalToPlainText } from '@/components/editor'
import type { EditorState, LexicalEditor } from 'lexical'
import type { Subtask } from './SubtaskList'

// =============================================================================
// Types
// =============================================================================

type SubtaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

interface ProjectMember {
  id: number
  username: string
  name: string | null
  avatarUrl?: string | null
}

export interface SubtaskEditModalProps {
  subtask: Subtask | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    subtaskId: number
    title?: string
    description?: string | null
    status?: SubtaskStatus
    assigneeId?: number | null
    timeEstimated?: number
    timeSpent?: number
  }) => Promise<unknown>
  projectMembers?: ProjectMember[]
  isSaving?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function SubtaskEditModal({
  subtask,
  isOpen,
  onClose,
  onSave,
  projectMembers = [],
  isSaving = false,
}: SubtaskEditModalProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<SubtaskStatus>('TODO')
  const [assigneeId, setAssigneeId] = useState<string>('none')
  const [timeEstimated, setTimeEstimated] = useState('')
  const [timeSpent, setTimeSpent] = useState('')
  const [editorKey, setEditorKey] = useState(0)

  // Reset form when subtask changes
  useEffect(() => {
    if (subtask) {
      setTitle(subtask.title)
      setDescription(getDisplayContent(subtask.description ?? ''))
      setStatus(subtask.status)
      setAssigneeId(subtask.assignee?.id.toString() ?? 'none')
      setTimeEstimated(subtask.timeEstimated > 0 ? subtask.timeEstimated.toString() : '')
      setTimeSpent(subtask.timeSpent > 0 ? subtask.timeSpent.toString() : '')
      setEditorKey((k) => k + 1)
    }
  }, [subtask])

  // Handle editor content changes
  const handleEditorChange = useCallback(
    (_editorState: EditorState, _editor: LexicalEditor, jsonString: string) => {
      setDescription(jsonString)
    },
    []
  )

  // Check if description content is empty
  const isDescriptionEmpty = useCallback((content: string) => {
    if (!content) return true
    if (!isLexicalContent(content)) return !content.trim()
    const plainText = lexicalToPlainText(content)
    return !plainText.trim()
  }, [])

  const handleSave = async () => {
    if (!subtask || !title.trim()) return

    await onSave({
      subtaskId: subtask.id,
      title: title.trim(),
      description: isDescriptionEmpty(description) ? null : description,
      status,
      assigneeId: assigneeId === 'none' ? null : parseInt(assigneeId),
      timeEstimated: parseFloat(timeEstimated) || 0,
      timeSpent: parseFloat(timeSpent) || 0,
    })

    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  if (!subtask) return null

  const selectClassName = 'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subtask</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Subtask title"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              key={editorKey}
              initialContent={description || undefined}
              onChange={handleEditorChange}
              placeholder="Optional description or instructions..."
              minHeight="80px"
              maxHeight="200px"
              namespace={`subtask-description-${subtask?.id}-${editorKey}`}
            />
            <p className="text-xs text-muted-foreground">Rich text formatting supported</p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as SubtaskStatus)}
              className={selectClassName}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <select
              id="assignee"
              value={assigneeId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssigneeId(e.target.value)}
              className={selectClassName}
            >
              <option value="none">Unassigned</option>
              {projectMembers.map((member) => (
                <option key={member.id} value={member.id.toString()}>
                  {member.name ?? member.username}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeEstimated">Estimated (hours)</Label>
              <Input
                id="timeEstimated"
                type="number"
                min="0"
                step="0.25"
                value={timeEstimated}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeEstimated(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeSpent">Spent (hours)</Label>
              <Input
                id="timeSpent"
                type="number"
                min="0"
                step="0.25"
                value={timeSpent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeSpent(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SubtaskEditModal
