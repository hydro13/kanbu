/*
 * StickyNoteModal Component
 * Version: 1.0.0
 *
 * Modal for creating and editing sticky notes.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T01:20 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import type { StickyNoteData, StickyNoteColor, StickyVisibility } from './StickyNote'

// =============================================================================
// Types
// =============================================================================

interface StickyNoteModalProps {
  isOpen: boolean
  onClose: () => void
  note?: StickyNoteData | null // null = create mode, StickyNoteData = edit mode
}

// =============================================================================
// Color Options
// =============================================================================

const colorOptions: Array<{ value: StickyNoteColor; label: string; className: string }> = [
  { value: 'YELLOW', label: 'Yellow', className: 'bg-yellow-300 dark:bg-yellow-600' },
  { value: 'PINK', label: 'Pink', className: 'bg-pink-300 dark:bg-pink-600' },
  { value: 'BLUE', label: 'Blue', className: 'bg-blue-300 dark:bg-blue-600' },
  { value: 'GREEN', label: 'Green', className: 'bg-green-300 dark:bg-green-600' },
  { value: 'PURPLE', label: 'Purple', className: 'bg-purple-300 dark:bg-purple-600' },
  { value: 'ORANGE', label: 'Orange', className: 'bg-orange-300 dark:bg-orange-600' },
]

// =============================================================================
// Icons
// =============================================================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function StickyNoteModal({ isOpen, onClose, note }: StickyNoteModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState<StickyNoteColor>('YELLOW')
  const [visibility, setVisibility] = useState<StickyVisibility>('PRIVATE')
  const [isPinned, setIsPinned] = useState(false)

  const utils = trpc.useUtils()

  const createMutation = trpc.stickyNote.create.useMutation({
    onSuccess: () => {
      utils.stickyNote.list.invalidate()
      onClose()
    },
  })

  const updateMutation = trpc.stickyNote.update.useMutation({
    onSuccess: () => {
      utils.stickyNote.list.invalidate()
      onClose()
    },
  })

  // Reset form when modal opens/closes or note changes
  useEffect(() => {
    if (isOpen && note) {
      setTitle(note.title || '')
      setContent(note.content)
      setColor(note.color)
      setVisibility(note.visibility)
      setIsPinned(note.isPinned)
    } else if (isOpen) {
      setTitle('')
      setContent('')
      setColor('YELLOW')
      setVisibility('PRIVATE')
      setIsPinned(false)
    }
  }, [isOpen, note])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) return

    if (note) {
      updateMutation.mutate({
        id: note.id,
        title: title || null,
        content,
        color,
        visibility,
        isPinned,
      })
    } else {
      createMutation.mutate({
        title: title || undefined,
        content,
        color,
        visibility,
        isPinned,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {note ? 'Edit Sticky Note' : 'New Sticky Note'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <CloseIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={255}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={10000}
              required
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={`w-8 h-8 rounded-full ${opt.className} transition-transform ${
                    color === opt.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
                  }`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visibility
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={visibility === 'PRIVATE'}
                  onChange={() => setVisibility('PRIVATE')}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Private</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="PUBLIC"
                  checked={visibility === 'PUBLIC'}
                  onChange={() => setVisibility('PUBLIC')}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Public</span>
              </label>
            </div>
          </div>

          {/* Pin */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Pin to top</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={isLoading || !content.trim()}
            >
              {isLoading ? 'Saving...' : note ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default StickyNoteModal
