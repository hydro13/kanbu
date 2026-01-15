/*
 * ProjectList Page
 * Version: 2.0.0
 *
 * Grid view of workspaces and projects.
 * Domain Admins can create and edit workspaces.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 22f325f5-4611-4a4e-b7d1-fb1e422742de
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T13:XX CET
 *
 * Modified: 2026-01-07
 * Change: Added workspace create/edit functionality for Domain Admins
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ProjectCard } from '@/components/project/ProjectCard'
import { useAppDispatch } from '@/store'
import { setProjects, setLoading, setError } from '@/store/projectSlice'
import { trpc, getMediaUrl } from '@/lib/trpc'
import { lexicalToPlainText, isLexicalContent } from '@/components/editor'

// =============================================================================
// Types
// =============================================================================

type ViewMode = 'grid' | 'list'

// =============================================================================
// Helper Functions
// =============================================================================

/** Get plain text description for display in cards (handles Lexical JSON) */
function getPlainDescription(description: string | null): string {
  if (!description) return 'No description'
  if (isLexicalContent(description)) {
    const plainText = lexicalToPlainText(description).trim()
    return plainText || 'No description'
  }
  return description
}

// =============================================================================
// Component
// =============================================================================

export function ProjectListPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showArchived, setShowArchived] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: number; name: string; description: string | null } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Get workspace ID from URL query param
  const workspaceIdParam = searchParams.get('workspace')
  const workspaceId = workspaceIdParam ? parseInt(workspaceIdParam, 10) : null

  // Check if user is Domain Admin (can create/edit workspaces)
  const { data: adminScope } = trpc.group.myAdminScope.useQuery()
  const isDomainAdmin = adminScope?.isDomainAdmin ?? false

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title-lg tracking-tight text-foreground">My Workspaces</h1>
              <p className="text-muted-foreground">
                Select a workspace to view projects
              </p>
            </div>
            {isDomainAdmin && (
              <Button onClick={() => setShowCreateWorkspaceModal(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                New Workspace
              </Button>
            )}
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
                  {isDomainAdmin ? (
                    <Button
                      className="mt-4"
                      onClick={() => setShowCreateWorkspaceModal(true)}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create your first workspace
                    </Button>
                  ) : (
                    <p className="text-sm mt-2">Contact an administrator to get access</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <Card key={workspace.id} className="hover:bg-accent/50 transition-colors h-full group relative">
                  <Link to={`/workspace/${workspace.slug}`} className="block">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {workspace.logoUrl ? (
                          <img
                            src={getMediaUrl(workspace.logoUrl)}
                            alt={workspace.name}
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <WorkspaceIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        {workspace.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {getPlainDescription(workspace.description)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{workspace.projectCount} projects</span>
                        <span>{workspace.memberCount} members</span>
                      </div>
                    </CardContent>
                  </Link>
                  {/* Edit button for Domain Admins */}
                  {isDomainAdmin && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditingWorkspace({
                            id: workspace.id,
                            name: workspace.name,
                            description: workspace.description,
                          })
                        }}
                        title="Edit workspace"
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          navigate(`/workspace/${workspace.slug}/settings`)
                        }}
                        title="Workspace settings"
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Create Workspace Modal */}
          {showCreateWorkspaceModal && (
            <CreateWorkspaceModal
              onClose={() => setShowCreateWorkspaceModal(false)}
              onCreated={() => {
                setShowCreateWorkspaceModal(false)
                workspacesQuery.refetch()
              }}
            />
          )}

          {/* Edit Workspace Modal */}
          {editingWorkspace && (
            <EditWorkspaceModal
              workspace={editingWorkspace}
              onClose={() => setEditingWorkspace(null)}
              onUpdated={() => {
                setEditingWorkspace(null)
                workspacesQuery.refetch()
              }}
            />
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
            <h1 className="text-page-title-lg tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground">
              Manage projects in {currentWorkspace.name}
            </p>
          </div>
          {currentWorkspace.role === 'ADMIN' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
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
                workspaceSlug={currentWorkspace?.slug ?? ''}
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

function EditIcon({ className }: { className?: string }) {
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
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

// =============================================================================
// Create Workspace Modal
// =============================================================================

interface CreateWorkspaceModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateWorkspaceModal({ onClose, onCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: () => {
      onCreated()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      name,
      description: description || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Workspace</CardTitle>
          <CardDescription>Add a new workspace to organize your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Workspace description..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
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
// Edit Workspace Modal
// =============================================================================

interface EditWorkspaceModalProps {
  workspace: { id: number; name: string; description: string | null }
  onClose: () => void
  onUpdated: () => void
}

function EditWorkspaceModal({ workspace, onClose, onUpdated }: EditWorkspaceModalProps) {
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description || '')

  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
      onUpdated()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      workspaceId: workspace.id,
      name,
      description: description || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Edit Workspace</CardTitle>
          <CardDescription>Update workspace details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workspace name"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Workspace description..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name || updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
            {updateMutation.error && (
              <p className="text-sm text-destructive">{updateMutation.error.message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ProjectListPage
