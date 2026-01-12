/*
 * Workspace Wiki Page
 * Version: 1.1.0
 *
 * Shows the workspace wiki/knowledge base with hierarchical pages.
 * Supports create, edit, delete, and publish/unpublish operations.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 *
 * Modified: 2026-01-11
 * Change: Added edit, delete, and toggle publish features
 * ===================================================================
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc'
import {
  BookOpen,
  FileText,
  Plus,
  ChevronRight,
  ArrowLeft,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface WikiPageSummary {
  id: number
  title: string
  slug: string
  isPublished: boolean
  sortOrder: number
  parentId: number | null
  createdAt: string
  updatedAt: string
  childCount: number
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceWikiPage() {
  const { slug } = useParams<{ slug: string }>()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPage, setEditingPage] = useState<WikiPageSummary | null>(null)
  const [deletingPage, setDeletingPage] = useState<WikiPageSummary | null>(null)

  const utils = trpc.useUtils()

  // Fetch workspace
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Fetch wiki pages
  const pagesQuery = trpc.workspaceWiki.list.useQuery(
    { workspaceId: workspace?.id ?? 0, includeUnpublished: true },
    { enabled: !!workspace?.id }
  )
  const pages = (pagesQuery.data ?? []) as WikiPageSummary[]

  // Toggle publish mutation
  const togglePublishMutation = trpc.workspaceWiki.update.useMutation({
    onSuccess: () => {
      utils.workspaceWiki.list.invalidate()
    },
  })

  // Delete mutation
  const deleteMutation = trpc.workspaceWiki.delete.useMutation({
    onSuccess: () => {
      utils.workspaceWiki.list.invalidate()
      setDeletingPage(null)
    },
  })

  // Build tree structure
  const rootPages = pages.filter((p) => p.parentId === null)
  const getChildren = (parentId: number) => pages.filter((p) => p.parentId === parentId)

  const isLoading = workspaceQuery.isLoading || pagesQuery.isLoading

  // Handle toggle publish
  const handleTogglePublish = (page: WikiPageSummary) => {
    togglePublishMutation.mutate({
      id: page.id,
      isPublished: !page.isPublished,
    })
  }

  // Handle delete
  const handleDelete = () => {
    if (deletingPage) {
      deleteMutation.mutate({ id: deletingPage.id })
    }
  }

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
              <BookOpen className="h-8 w-8" />
              Wiki
            </h1>
            <p className="text-muted-foreground">
              Knowledge base for {workspace.name}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>

        {/* Wiki Pages */}
        {rootPages.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No wiki pages yet</h3>
                <p className="text-sm mb-4">
                  Create your first wiki page to start building your knowledge base.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Page
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rootPages.map((page) => (
              <WikiPageCard
                key={page.id}
                page={page}
                workspaceSlug={slug!}
                depth={0}
                getChildren={getChildren}
                onEdit={setEditingPage}
                onDelete={setDeletingPage}
                onTogglePublish={handleTogglePublish}
              />
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateWikiPageModal
            workspaceId={workspace.id}
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false)
              pagesQuery.refetch()
            }}
          />
        )}

        {/* Edit Modal */}
        {editingPage && (
          <EditWikiPageModal
            page={editingPage}
            onClose={() => setEditingPage(null)}
            onSaved={() => {
              setEditingPage(null)
              pagesQuery.refetch()
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingPage} onOpenChange={() => setDeletingPage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Wiki Page</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingPage?.title}"?
                {deletingPage && deletingPage.childCount > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Warning: This will also delete {deletingPage.childCount} child page(s).
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingPage(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}

// =============================================================================
// Wiki Page Card
// =============================================================================

interface WikiPageCardProps {
  page: WikiPageSummary
  workspaceSlug: string
  depth: number
  getChildren: (parentId: number) => WikiPageSummary[]
  onEdit: (page: WikiPageSummary) => void
  onDelete: (page: WikiPageSummary) => void
  onTogglePublish: (page: WikiPageSummary) => void
}

function WikiPageCard({
  page,
  workspaceSlug,
  depth,
  getChildren,
  onEdit,
  onDelete,
  onTogglePublish,
}: WikiPageCardProps) {
  const [expanded, setExpanded] = useState(false)
  const children = getChildren(page.id)
  const hasChildren = children.length > 0

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <Card className="hover:bg-accent/30 transition-colors">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 hover:bg-accent rounded"
                >
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 transition-transform',
                      expanded && 'rotate-90'
                    )}
                  />
                </button>
              )}
              {!hasChildren && <div className="w-6" />}
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Link
                to={`/workspace/${workspaceSlug}/wiki/${page.slug}`}
                className="font-medium hover:underline"
              >
                {page.title}
              </Link>
              {!page.isPublished && (
                <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                  Draft
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              {page.childCount > 0 && (
                <span className="text-xs">{page.childCount} subpages</span>
              )}
              <span className="text-xs">
                {new Date(page.updatedAt).toLocaleDateString()}
              </span>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(page)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTogglePublish(page)}>
                    {page.isPublished ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Publish
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(page)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
      {expanded && hasChildren && (
        <div className="mt-2 space-y-2">
          {children.map((child) => (
            <WikiPageCard
              key={child.id}
              page={child}
              workspaceSlug={workspaceSlug}
              depth={depth + 1}
              getChildren={getChildren}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Create Wiki Page Modal
// =============================================================================

interface CreateWikiPageModalProps {
  workspaceId: number
  parentId?: number | null
  onClose: () => void
  onCreated: () => void
}

function CreateWikiPageModal({ workspaceId, parentId, onClose, onCreated }: CreateWikiPageModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  const createMutation = trpc.workspaceWiki.create.useMutation({
    onSuccess: () => {
      onCreated()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    createMutation.mutate({
      workspaceId,
      parentId: parentId ?? null,
      title: title.trim(),
      content,
      isPublished,
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Wiki Page</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your content here..."
              rows={8}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isPublished" className="text-sm">
              Publish immediately
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Page'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// Edit Wiki Page Modal
// =============================================================================

interface EditWikiPageModalProps {
  page: WikiPageSummary
  onClose: () => void
  onSaved: () => void
}

function EditWikiPageModal({ page, onClose, onSaved }: EditWikiPageModalProps) {
  const [title, setTitle] = useState(page.title)
  const [isPublished, setIsPublished] = useState(page.isPublished)

  // Fetch full page content
  const pageQuery = trpc.workspaceWiki.get.useQuery({ id: page.id })
  const [content, setContent] = useState('')

  // Set content when loaded
  if (pageQuery.data && content === '' && pageQuery.data.content) {
    setContent(pageQuery.data.content)
  }

  const updateMutation = trpc.workspaceWiki.update.useMutation({
    onSuccess: () => {
      onSaved()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    updateMutation.mutate({
      id: page.id,
      title: title.trim(),
      content,
      isPublished,
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Wiki Page</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title..."
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Content</label>
            {pageQuery.isLoading ? (
              <div className="h-48 bg-muted rounded-md animate-pulse" />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your content here..."
                rows={12}
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="editIsPublished" className="text-sm">
              Published
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default WorkspaceWikiPage
