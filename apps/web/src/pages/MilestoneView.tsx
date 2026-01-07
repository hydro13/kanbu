/*
 * Milestone View Page
 * Version: 1.0.0
 *
 * Displays all milestones for a project with progress tracking.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 114f11bf-23b9-4a07-bc94-a4e80ec0c02e
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:15 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 *
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Signed: 2025-12-29T11:15 CET
 * Change: Fixed MilestoneModal state reset using useEffect for edit mode
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { MilestoneCard } from '@/components/milestone/MilestoneCard'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Icons
// =============================================================================

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-8 w-8 text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      className="h-6 w-6 text-red-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

function PlusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function ArrowLeftIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  )
}

function FlagIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  )
}

function XIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// =============================================================================
// Create/Edit Modal
// =============================================================================

interface MilestoneModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: number
  milestone?: {
    id: number
    name: string
    description: string | null
    dateDue: Date | string | null
  } | null
}

function MilestoneModal({ isOpen, onClose, projectId, milestone }: MilestoneModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dateDue, setDateDue] = useState('')
  const [error, setError] = useState('')

  // Reset form state when milestone prop changes (for edit mode)
  useEffect(() => {
    if (isOpen) {
      setName(milestone?.name ?? '')
      setDescription(milestone?.description ?? '')
      if (milestone?.dateDue) {
        const d = typeof milestone.dateDue === 'string' ? new Date(milestone.dateDue) : milestone.dateDue
        setDateDue(d.toISOString().split('T')[0] ?? '')
      } else {
        setDateDue('')
      }
      setError('')
    }
  }, [milestone, isOpen])

  const utils = trpc.useUtils()

  const createMutation = trpc.milestone.create.useMutation({
    onSuccess: () => {
      utils.milestone.list.invalidate()
      onClose()
    },
    onError: (err) => setError(err.message),
  })

  const updateMutation = trpc.milestone.update.useMutation({
    onSuccess: () => {
      utils.milestone.list.invalidate()
      onClose()
    },
    onError: (err) => setError(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (milestone) {
      updateMutation.mutate({
        milestoneId: milestone.id,
        name: name.trim(),
        description: description.trim() || undefined,
        dateDue: dateDue || null,
      })
    } else {
      createMutation.mutate({
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        dateDue: dateDue || undefined,
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">
            {milestone ? 'Edit Milestone' : 'Create Milestone'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Beta Launch"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="What does this milestone represent?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dateDue}
              onChange={(e) => setDateDue(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  milestoneName: string
  isDeleting: boolean
}

function DeleteModal({ isOpen, onClose, onConfirm, milestoneName, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Milestone</h2>
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete <strong>{milestoneName}</strong>? Tasks linked to this milestone will be unlinked but not deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function MilestoneViewPage() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()
  const navigate = useNavigate()

  const [showCompleted, setShowCompleted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<{
    id: number
    name: string
    description: string | null
    dateDue: Date | string | null
  } | null>(null)
  const [deletingMilestone, setDeletingMilestone] = useState<{
    id: number
    name: string
  } | null>(null)

  const utils = trpc.useUtils()

  // Fetch project by identifier (SEO-friendly URL)
  const { data: project, isLoading: projectLoading, error: projectError } = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectIdNum = project?.id ?? 0

  // Fetch milestones
  const { data: milestones, isLoading: milestonesLoading } = trpc.milestone.list.useQuery(
    { projectId: projectIdNum, includeCompleted: showCompleted },
    { enabled: projectIdNum > 0 }
  )

  // Delete mutation
  const deleteMutation = trpc.milestone.delete.useMutation({
    onSuccess: () => {
      utils.milestone.list.invalidate()
      setDeletingMilestone(null)
    },
  })

  // Handle edit
  const handleEdit = (milestoneId: number) => {
    const milestone = milestones?.find((m) => m.id === milestoneId)
    if (milestone) {
      setEditingMilestone({
        id: milestone.id,
        name: milestone.name,
        description: milestone.description,
        dateDue: milestone.dateDue,
      })
      setModalOpen(true)
    }
  }

  // Handle delete
  const handleDelete = (milestoneId: number) => {
    const milestone = milestones?.find((m) => m.id === milestoneId)
    if (milestone) {
      setDeletingMilestone({ id: milestone.id, name: milestone.name })
    }
  }

  // Handle click (view details)
  const handleMilestoneClick = (milestoneId: number) => {
    // Could navigate to milestone detail page in the future
    // For now, open edit modal
    handleEdit(milestoneId)
  }

  // Loading state
  if (projectLoading || milestonesLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </ProjectLayout>
    )
  }

  // Error state
  if (projectError) {
    return (
      <ProjectLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <AlertIcon />
          <p className="text-gray-600">Failed to load project</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="text-blue-500 hover:underline"
          >
            Back to projects
          </button>
        </div>
      </ProjectLayout>
    )
  }

  // Calculate stats
  const activeMilestones = milestones?.filter((m) => !m.isCompleted) ?? []
  const completedMilestones = milestones?.filter((m) => m.isCompleted) ?? []
  const overdueMilestones = activeMilestones.filter((m) => m.dueStatus === 'overdue')

  return (
    <ProjectLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/project/${projectIdNum}`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Back to board"
            >
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FlagIcon className="h-6 w-6 text-blue-500" />
                Milestones
              </h1>
              <p className="text-gray-500">{project?.name}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingMilestone(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <PlusIcon className="h-4 w-4" />
            New Milestone
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-900">{activeMilestones.length}</div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{completedMilestones.length}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-red-600">{overdueMilestones.length}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">
              {activeMilestones.length > 0
                ? Math.round(activeMilestones.reduce((sum, m) => sum + m.progress, 0) / activeMilestones.length)
                : 0}%
            </div>
            <div className="text-sm text-gray-500">Avg Progress</div>
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            Show completed milestones
          </label>
        </div>

        {/* Milestones Grid */}
        {milestones && milestones.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={handleMilestoneClick}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <FlagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No milestones yet</h3>
            <p className="text-gray-500 mb-4">
              Create milestones to track progress toward important goals.
            </p>
            <button
              onClick={() => {
                setEditingMilestone(null)
                setModalOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <PlusIcon className="h-4 w-4" />
              Create Milestone
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <MilestoneModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingMilestone(null)
        }}
        projectId={projectIdNum}
        milestone={editingMilestone}
      />

      <DeleteModal
        isOpen={!!deletingMilestone}
        onClose={() => setDeletingMilestone(null)}
        onConfirm={() => {
          if (deletingMilestone) {
            deleteMutation.mutate({ milestoneId: deletingMilestone.id })
          }
        }}
        milestoneName={deletingMilestone?.name ?? ''}
        isDeleting={deleteMutation.isPending}
      />
    </ProjectLayout>
  )
}

export default MilestoneViewPage
