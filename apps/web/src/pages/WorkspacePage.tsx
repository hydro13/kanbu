/*
 * Workspace Page
 * Version: 1.0.0
 *
 * Homepage for a workspace showing its projects.
 * Accessed via /workspace/:workspaceId
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-06
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ProjectCard } from '@/components/project/ProjectCard'
import { useAppDispatch } from '@/store'
import { setProjects, setLoading, setError } from '@/store/projectSlice'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'grid' | 'list'

// =============================================================================
// Component
// =============================================================================

export function WorkspacePage() {
  const dispatch = useAppDispatch()
  const { slug } = useParams<{ slug: string }>()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch workspace info by slug (SEO-friendly URL)
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Fetch projects for this workspace (needs workspaceId from workspace query)
  const {
    data,
    isLoading: isFetching,
    error,
    refetch,
  } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? 0, includeArchived: showArchived },
    { enabled: !!workspace?.id }
  )

  // Sync API data to Redux store
  useEffect(() => {
    if (isFetching) {
      dispatch(setLoading(true))
    } else if (error) {
      dispatch(setError(error.message))
    } else if (data) {
      dispatch(setProjects(data))
    }
  }, [data, isFetching, error, dispatch])

  // Use fetched data directly
  const projects = data ?? []

  // Filter projects by search query
  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      project.name.toLowerCase().includes(query) ||
      project.identifier?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    )
  })

  // Loading state
  if (workspaceQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Workspace not found
  if (!workspace) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Workspace not found</p>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {workspace.logoUrl ? (
              <img
                src={workspace.logoUrl}
                alt={workspace.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <WorkspaceIcon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
              <p className="text-muted-foreground">
                {workspace.description || 'No description'}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-md">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{workspace.projectCount}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{workspace.memberCount}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold capitalize">{workspace.role.toLowerCase()}</p>
              <p className="text-xs text-muted-foreground">Your Role</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <GridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show archived
          </label>
        </div>

        {/* Projects */}
        {isFetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-2/3 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12">
            <CardHeader className="text-center">
              <CardTitle>No projects found</CardTitle>
              <CardDescription>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first project to get started'}
              </CardDescription>
            </CardHeader>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </Card>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
            }
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                className={viewMode === 'list' ? 'max-w-none' : ''}
              />
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && workspace && (
          <CreateProjectModal
            workspaceId={workspace.id}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false)
              refetch()
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// =============================================================================
// Create Project Modal
// =============================================================================

interface CreateProjectModalProps {
  workspaceId: number
  onClose: () => void
  onCreated: () => void
}

function CreateProjectModal({ workspaceId, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      onCreated()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      workspaceId,
      name,
      identifier: identifier || undefined,
      description: description || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>Add a new project to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Identifier</label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                placeholder="PROJ"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Used for task references (e.g., PROJ-123). Auto-generated if empty.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
            {createMutation.error && (
              <p className="text-sm text-destructive">{createMutation.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function WorkspaceIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default WorkspacePage
