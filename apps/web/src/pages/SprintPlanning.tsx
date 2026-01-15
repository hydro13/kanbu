/*
 * Sprint Planning Page
 * Version: 1.0.0
 *
 * Sprint planning view for managing sprints and assigning tasks.
 * Supports CRUD operations, task assignment, and sprint lifecycle.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 88ca040e-8890-4144-8c81-3661c8cdd582
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T23:15 CET
 *
 * Modified by:
 * Session: 6d3e997a-128a-4d11-88ac-c4caee3bb622
 * Signed: 2025-12-29T00:49 CET
 * Change: Updated to use ProjectLayout (EXT-15)
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Play,
  Square,
  Calendar,
  Users,
  CheckSquare,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

interface CreateSprintFormData {
  name: string
  description: string
  dateStart: string
  dateEnd: string
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Active
        </span>
      )
    case 'PLANNING':
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Planning
        </span>
      )
    case 'COMPLETED':
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          Completed
        </span>
      )
    default:
      return null
  }
}

// =============================================================================
// Create Sprint Modal
// =============================================================================

interface CreateSprintModalProps {
  projectId: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateSprintModal({ projectId, isOpen, onClose, onSuccess }: CreateSprintModalProps) {
  const [formData, setFormData] = useState<CreateSprintFormData>({
    name: '',
    description: '',
    dateStart: new Date().toISOString().split('T')[0]!,
    dateEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
  })

  const createMutation = trpc.sprint.create.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
      setFormData({
        name: '',
        description: '',
        dateStart: new Date().toISOString().split('T')[0]!,
        dateEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      projectId,
      name: formData.name,
      description: formData.description || undefined,
      dateStart: new Date(formData.dateStart).toISOString(),
      dateEnd: new Date(formData.dateEnd).toISOString(),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Create Sprint
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sprint Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Sprint 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Sprint goals and scope..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.dateStart}
                onChange={(e) => setFormData({ ...formData, dateStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.dateEnd}
                onChange={(e) => setFormData({ ...formData, dateEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-500">{createMutation.error.message}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Sprint Card
// =============================================================================

interface SprintCardProps {
  sprint: {
    id: number
    name: string
    status: string
    description: string | null
    dateStart: string
    dateEnd: string
    totalTasks: number
    completedTasks: number
    progress: number
  }
  projectId: number
  onRefresh: () => void
}

function SprintCard({ sprint, projectId, onRefresh }: SprintCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()
  const utils = trpc.useUtils()

  const startMutation = trpc.sprint.start.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate()
      onRefresh()
    },
  })

  const completeMutation = trpc.sprint.complete.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate()
      utils.task.list.invalidate()
      onRefresh()
    },
  })

  const deleteMutation = trpc.sprint.delete.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate()
      onRefresh()
    },
  })

  const handleStart = () => {
    startMutation.mutate({ sprintId: sprint.id })
  }

  const handleComplete = () => {
    completeMutation.mutate({ sprintId: sprint.id, moveRemainingToBacklog: true })
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${sprint.name}"?`)) {
      deleteMutation.mutate({ sprintId: sprint.id })
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {sprint.name}
              </h3>
              {getStatusBadge(sprint.status)}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(sprint.dateStart)} - {formatDate(sprint.dateEnd)}
              </span>
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" />
                {sprint.completedTasks}/{sprint.totalTasks} tasks
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {sprint.status === 'PLANNING' && (
            <button
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Start Sprint"
            >
              {startMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          {sprint.status === 'ACTIVE' && (
            <button
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Complete Sprint"
            >
              {completeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          )}
          <Link
            to={`/project/${projectId}/sprint/${sprint.id}`}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="View Sprint Board"
          >
            <Users className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate(`/project/${projectId}/sprint/${sprint.id}/edit`)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Edit Sprint"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {sprint.status !== 'ACTIVE' && sprint.totalTasks === 0 && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete Sprint"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              sprint.progress >= 75
                ? 'bg-green-500'
                : sprint.progress >= 50
                  ? 'bg-blue-500'
                  : sprint.progress >= 25
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
            }`}
            style={{ width: `${sprint.progress}%` }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
          {sprint.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {sprint.description}
            </p>
          )}
          <div className="flex gap-3">
            <Link
              to={`/project/${projectId}/sprint/${sprint.id}`}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              View Board
            </Link>
            <Link
              to={`/project/${projectId}/sprint/${sprint.id}/burndown`}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Burndown Chart
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function SprintPlanning() {
  const { projectIdentifier } = useParams<{ projectIdentifier: string }>()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'planning' | 'completed'>('active')

  // Fetch project by identifier (SEO-friendly URL)
  const { data: project, isLoading: isProjectLoading } = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )

  // Get project ID from fetched data
  const projectIdNum = project?.id ?? 0

  const { data: sprints, isLoading: isSprintsLoading, refetch } = trpc.sprint.list.useQuery(
    { projectId: projectIdNum },
    { enabled: projectIdNum > 0 }
  )

  // Filter sprints by tab
  const filteredSprints = (sprints ?? []).filter((sprint) => {
    switch (activeTab) {
      case 'active':
        return sprint.status === 'ACTIVE'
      case 'planning':
        return sprint.status === 'PLANNING'
      case 'completed':
        return sprint.status === 'COMPLETED'
      default:
        return true
    }
  })

  const activeSprints = (sprints ?? []).filter((s) => s.status === 'ACTIVE')
  const planningSprints = (sprints ?? []).filter((s) => s.status === 'PLANNING')
  const completedSprints = (sprints ?? []).filter((s) => s.status === 'COMPLETED')

  // Loading state
  if (isProjectLoading || isSprintsLoading) {
    return (
      <ProjectLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ProjectLayout>
    )
  }

  // Error state
  if (!project) {
    return (
      <ProjectLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Project not found
          </h2>
          <Link
            to="/"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
          >
            Return to projects
          </Link>
        </div>
      </ProjectLayout>
    )
  }

  return (
    <ProjectLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              to={`/project/${projectIdNum}/board`}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-page-title text-foreground">
                Sprint Planning
              </h1>
              <p className="text-sm text-muted-foreground">
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sprint
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'active'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Active ({activeSprints.length})
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'planning'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Planning ({planningSprints.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Completed ({completedSprints.length})
          </button>
        </div>

        {/* Sprint List */}
        <div className="space-y-4">
          {filteredSprints.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-card border border-border">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No {activeTab} sprints
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {activeTab === 'active'
                  ? 'Start a planning sprint to begin working'
                  : activeTab === 'planning'
                    ? 'Create a new sprint to get started'
                    : 'Complete some sprints to see them here'}
              </p>
              {activeTab !== 'completed' && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Sprint
                </button>
              )}
            </div>
          ) : (
            filteredSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                projectId={projectIdNum}
                onRefresh={() => refetch()}
              />
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      <CreateSprintModal
        projectId={projectIdNum}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </ProjectLayout>
  )
}

export default SprintPlanning
