/*
 * ProjectList Page
 * Version: 1.0.0
 *
 * Grid view of projects in the current workspace.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
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

export function ProjectListPage() {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get workspace ID from URL query param
  const workspaceIdParam = searchParams.get('workspace')
  const workspaceId = workspaceIdParam ? parseInt(workspaceIdParam, 10) : null

  // Fetch all workspaces the user has access to
  const workspacesQuery = trpc.workspace.list.useQuery()
  const workspaces = workspacesQuery.data ?? []

  // Find the current workspace from the list
  const currentWorkspace = workspaceId
    ? workspaces.find((w) => w.id === workspaceId)
    : null

  // Fetch projects for current workspace (if one is selected)
  const {
    data,
    isLoading: isFetching,
    error,
    refetch,
  } = trpc.project.list.useQuery(
    { workspaceId: workspaceId ?? 0, includeArchived: showArchived },
    { enabled: !!workspaceId }
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

  // Use fetched data directly instead of Redux
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

  // No workspace selected - show workspace selection
  if (!workspaceId || !currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Select a workspace to view projects
            </p>
          </div>
          {workspacesQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 w-1/2 bg-muted rounded" />
                    <div className="h-4 w-3/4 bg-muted rounded" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <p>No workspaces available</p>
                  <p className="text-sm mt-2">Contact an administrator to get access</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <Link key={workspace.id} to={`/projects?workspace=${workspace.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {workspace.logoUrl ? (
                          <img
                            src={workspace.logoUrl}
                            alt={workspace.name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <WorkspaceIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        {workspace.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {workspace.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{workspace.projectCount} projects</span>
                        <span>{workspace.memberCount} members</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Manage projects in {currentWorkspace.name}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </Button>
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

        {/* Loading State */}
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
          /* Empty State */
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
          /* Project Grid/List */
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
        {showCreateModal && (
          <CreateProjectModal
            workspaceId={currentWorkspace.id}
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
          <CardDescription>Add a new project to your workspace</CardDescription>
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

export default ProjectListPage
