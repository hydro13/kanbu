/*
 * Workspace Groups Page
 * Version: 1.0.0
 *
 * Shows project groups within a workspace for organizing projects.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 * ===================================================================
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { trpc } from '@/lib/trpc'
import {
  FolderKanban,
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ProjectInfo {
  id: number
  name: string
  identifier: string | null
  description: string | null
  position: number
}

interface ProjectGroup {
  id: number
  name: string
  description: string | null
  color: string
  status: string
  createdAt: Date
  updatedAt: Date
  projectCount: number
  projects: ProjectInfo[]
}

// Color map for groups
const colorClasses: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceGroupsPage() {
  const { slug } = useParams<{ slug: string }>()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  // Fetch workspace
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Fetch groups
  const groupsQuery = trpc.projectGroup.list.useQuery(
    { workspaceId: workspace?.id ?? 0 },
    { enabled: !!workspace?.id }
  )
  const groups = (groupsQuery.data ?? []) as ProjectGroup[]

  // Fetch ungrouped projects
  const ungroupedQuery = trpc.projectGroup.getUngrouped.useQuery(
    { workspaceId: workspace?.id ?? 0 },
    { enabled: !!workspace?.id }
  )
  const ungroupedProjects = ungroupedQuery.data ?? []

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const isLoading = workspaceQuery.isLoading || groupsQuery.isLoading

  // Loading state
  if (isLoading) {
    return (
      <WorkspaceLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-2" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-4">
                  <div className="h-5 w-48 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </WorkspaceLayout>
    )
  }

  // Workspace not found
  if (!workspace) {
    return (
      <WorkspaceLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Workspace not found</p>
          <Link to="/workspaces" className="text-primary hover:underline flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Link>
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Layers className="h-8 w-8" />
              Groups
            </h1>
            <p className="text-muted-foreground">
              Organize projects in {workspace.name}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>

        {/* Groups List */}
        {groups.length === 0 && ungroupedProjects.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No project groups yet</h3>
                <p className="text-sm mb-4">
                  Create groups to organize your projects into categories.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Group
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Project Groups */}
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                workspaceSlug={slug!}
                expanded={expandedGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
                onRefresh={() => groupsQuery.refetch()}
              />
            ))}

            {/* Ungrouped Projects */}
            {ungroupedProjects.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                    Ungrouped Projects
                    <span className="text-sm font-normal text-muted-foreground">
                      ({ungroupedProjects.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {ungroupedProjects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/workspace/${slug}/project/${project.identifier}`}
                        className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 transition-colors"
                      >
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{project.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({project.identifier})
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateGroupModal
            workspaceId={workspace.id}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false)
              groupsQuery.refetch()
            }}
          />
        )}
      </div>
    </WorkspaceLayout>
  )
}

// =============================================================================
// Group Card
// =============================================================================

interface GroupCardProps {
  group: ProjectGroup
  workspaceSlug: string
  expanded: boolean
  onToggle: () => void
  onRefresh: () => void
}

function GroupCard({ group, workspaceSlug, expanded, onToggle, onRefresh }: GroupCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const deleteMutation = trpc.projectGroup.delete.useMutation({
    onSuccess: () => onRefresh(),
  })

  const handleDelete = () => {
    if (confirm(`Delete group "${group.name}"? Projects will not be deleted.`)) {
      deleteMutation.mutate({ id: group.id })
    }
    setShowMenu(false)
  }

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggle}
              className="p-1 hover:bg-accent rounded"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colorClasses[group.color] || colorClasses.blue)}>
              {group.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {group.projectCount} {group.projectCount === 1 ? 'project' : 'projects'}
            </span>
            {group.description && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                - {group.description}
              </span>
            )}
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-lg z-20 py-1 min-w-[120px]">
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Expanded project list */}
        {expanded && group.projects.length > 0 && (
          <div className="mt-3 ml-8 border-l pl-4 space-y-1">
            {group.projects.map((project) => (
              <Link
                key={project.id}
                to={`/workspace/${workspaceSlug}/project/${project.identifier}`}
                className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 transition-colors"
              >
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({project.identifier})
                </span>
              </Link>
            ))}
          </div>
        )}
        {expanded && group.projects.length === 0 && (
          <div className="mt-3 ml-8 text-sm text-muted-foreground">
            No projects in this group yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Create Group Modal
// =============================================================================

interface CreateGroupModalProps {
  workspaceId: number
  onClose: () => void
  onCreated: () => void
}

function CreateGroupModal({ workspaceId, onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<string>('blue')

  const createMutation = trpc.projectGroup.create.useMutation({
    onSuccess: () => {
      onCreated()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    createMutation.mutate({
      workspaceId,
      name: name.trim(),
      description: description.trim() || undefined,
      color: color as any,
    })
  }

  const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'orange', 'pink', 'cyan']

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for?"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2 mt-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    colorClasses[c],
                    color === c ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                  )}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default WorkspaceGroupsPage
