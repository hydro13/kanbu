/*
 * Workspace Wiki Page
 * Version: 1.0.0
 *
 * Shows the workspace wiki/knowledge base with hierarchical pages.
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
  BookOpen,
  FileText,
  Plus,
  ChevronRight,
  ArrowLeft,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
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
  createdAt: Date
  updatedAt: Date
  childCount: number
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceWikiPage() {
  const { slug } = useParams<{ slug: string }>()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPage, setSelectedPage] = useState<WikiPageSummary | null>(null)

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

  // Build tree structure
  const rootPages = pages.filter((p) => p.parentId === null)
  const getChildren = (parentId: number) => pages.filter((p) => p.parentId === parentId)

  const isLoading = workspaceQuery.isLoading || pagesQuery.isLoading

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
                onSelect={setSelectedPage}
                onRefresh={() => pagesQuery.refetch()}
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
  onSelect: (page: WikiPageSummary) => void
  onRefresh: () => void
}

function WikiPageCard({ page, workspaceSlug, depth, getChildren, onSelect, onRefresh }: WikiPageCardProps) {
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
              onSelect={onSelect}
              onRefresh={onRefresh}
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

export default WorkspaceWikiPage
