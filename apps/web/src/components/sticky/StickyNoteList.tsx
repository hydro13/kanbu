/*
 * StickyNoteList Component
 * Version: 1.0.0
 *
 * Grid display of sticky notes with create button.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: ff2f815e-190c-4f7e-ada7-0c0a74177ac4
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-30T01:25 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { StickyNote, type StickyNoteData } from './StickyNote'
import { StickyNoteModal } from './StickyNoteModal'

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

interface StickyNoteListProps {
  className?: string
}

export function StickyNoteList({ className }: StickyNoteListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<StickyNoteData | null>(null)

  const user = useAppSelector(selectUser)
  const notesQuery = trpc.stickyNote.list.useQuery({
    includePublic: true,
    limit: 50,
  })

  const handleEdit = (note: StickyNoteData) => {
    setEditingNote(note)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingNote(null)
  }

  const handleCreate = () => {
    setEditingNote(null)
    setIsModalOpen(true)
  }

  if (notesQuery.isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    )
  }

  if (notesQuery.error) {
    return (
      <div className={`${className}`}>
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <p>Failed to load notes</p>
          <button
            onClick={() => notesQuery.refetch()}
            className="mt-2 text-sm text-blue-500 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const notes = notesQuery.data?.notes ?? []

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <NoteIcon className="h-5 w-5" />
          Sticky Notes
        </h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Note
        </button>
      </div>

      {/* Notes Grid */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <NoteIcon className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-center">No sticky notes yet</p>
          <button
            onClick={handleCreate}
            className="mt-3 text-sm text-blue-500 hover:underline"
          >
            Create your first note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <StickyNote
              key={note.id}
              note={note as StickyNoteData}
              currentUserId={user?.id ?? 0}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <StickyNoteModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        note={editingNote}
      />
    </div>
  )
}

export default StickyNoteList
