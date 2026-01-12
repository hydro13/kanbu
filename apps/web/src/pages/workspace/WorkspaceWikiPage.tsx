/*
 * Workspace Wiki Page
 * Version: 2.1.0
 *
 * Shows the workspace wiki/knowledge base with:
 * - Sidebar navigation (page tree)
 * - Page view/edit with Lexical editor
 * - Status management (draft/published/archived)
 * - Version history
 * - Temporal search (what did we know at time X?)
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-11
 * Change: Initial implementation
 *
 * Modified: 2026-01-12
 * Change: Refactored to use WikiSidebar and WikiPageView components
 *         Updated to use status enum instead of isPublished
 *
 * Modified: 2026-01-12
 * Change: Added WikiTemporalSearch integration (Fase 9)
 * ===================================================================
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout'
import { WikiSidebar, WikiPageView, WikiVersionHistory, WikiSearchDialog, WikiGraphView, WikiTemporalSearch } from '@/components/wiki'
import type { WikiPageNode, WikiPageStatus, WikiBreadcrumb, WikiPageForSearch } from '@/components/wiki'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor, type WikiPage as WikiPageForLink, type TaskResult, type MentionResult } from '@/components/editor'
import { trpc } from '@/lib/trpc'
import { useAppSelector } from '@/store'
import { selectUser } from '@/store/authSlice'
import { BookOpen, Plus, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

// =============================================================================
// Types
// =============================================================================

interface PageFromApi {
  id: number
  title: string
  slug: string
  status: WikiPageStatus
  sortOrder: number
  parentId: number | null
  createdAt: string
  updatedAt: string
  childCount: number
  versionCount?: number
}

interface FullPageFromApi {
  id: number
  title: string
  slug: string
  content: string
  contentJson: unknown
  status: WikiPageStatus
  sortOrder: number
  parentId: number | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  workspace: {
    id: number
    name: string
    slug: string
  }
  parent: {
    id: number
    title: string
    slug: string
  } | null
  children: {
    id: number
    title: string
    slug: string
  }[]
  versionCount: number
}

// =============================================================================
// Component
// =============================================================================

export function WorkspaceWikiPage() {
  const { slug, pageSlug } = useParams<{ slug: string; pageSlug?: string }>()
  const navigate = useNavigate()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createParentId, setCreateParentId] = useState<number | undefined>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showGraphView, setShowGraphView] = useState(false)
  const [graphFullscreen, setGraphFullscreen] = useState(false)
  const [showTemporalSearch, setShowTemporalSearch] = useState(false)

  const utils = trpc.useUtils()
  const user = useAppSelector(selectUser)

  // Current user for signature feature
  const currentUser = user
    ? {
        id: user.id,
        username: user.username,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl,
      }
    : undefined

  // Fetch workspace
  const workspaceQuery = trpc.workspace.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  )
  const workspace = workspaceQuery.data

  // Fetch wiki pages list
  const pagesQuery = trpc.workspaceWiki.list.useQuery(
    { workspaceId: workspace?.id ?? 0, includeUnpublished: true },
    { enabled: !!workspace?.id }
  )
  const pages = (pagesQuery.data ?? []) as PageFromApi[]

  // Fetch current page if pageSlug is provided
  const currentPageQuery = trpc.workspaceWiki.getBySlug.useQuery(
    { workspaceId: workspace?.id ?? 0, slug: pageSlug! },
    { enabled: !!workspace?.id && !!pageSlug }
  )
  const currentPage = currentPageQuery.data as FullPageFromApi | undefined

  // Update mutation
  const updateMutation = trpc.workspaceWiki.update.useMutation({
    onSuccess: () => {
      utils.workspaceWiki.list.invalidate()
      utils.workspaceWiki.getBySlug.invalidate()
    },
  })

  // Delete mutation
  const deleteMutation = trpc.workspaceWiki.delete.useMutation({
    onSuccess: () => {
      utils.workspaceWiki.list.invalidate()
      setShowDeleteConfirm(false)
      navigate(`/workspace/${slug}/wiki`)
    },
  })

  // Convert pages to WikiPageNode format
  const pageNodes: WikiPageNode[] = useMemo(
    () =>
      pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        sortOrder: p.sortOrder,
        parentId: p.parentId,
        childCount: p.childCount,
        updatedAt: p.updatedAt,
      })),
    [pages]
  )

  // Build breadcrumbs for current page
  const breadcrumbs: WikiBreadcrumb[] = useMemo(() => {
    if (!currentPage || !currentPage.parentId) return []

    const trail: WikiBreadcrumb[] = []
    let parentId: number | null = currentPage.parentId

    // Walk up the tree
    while (parentId) {
      const parent = pages.find((p) => p.id === parentId)
      if (parent) {
        trail.unshift({
          id: parent.id,
          title: parent.title,
          slug: parent.slug,
        })
        parentId = parent.parentId
      } else {
        break
      }
    }

    return trail
  }, [currentPage, pages])

  // Convert pages to WikiPageForLink format for wiki link autocomplete
  const wikiPagesForLinks: WikiPageForLink[] = useMemo(
    () =>
      pages
        .filter((p) => p.status === 'PUBLISHED' || p.status === 'DRAFT')
        .map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          exists: true,
        })),
    [pages]
  )

  // Priority number to string conversion
  const priorityToString = (priority: number): TaskResult['priority'] => {
    switch (priority) {
      case 1: return 'MEDIUM'
      case 2: return 'HIGH'
      case 3: return 'URGENT'
      default: return 'LOW'
    }
  }

  // Search tasks function for #task-ref autocomplete
  // Searches across all projects in this workspace
  const searchTasks = useCallback(
    async (query: string): Promise<TaskResult[]> => {
      if (!workspace?.id || query.length < 1) {
        return []
      }

      try {
        const results = await utils.client.search.tasksInWorkspace.query({
          workspaceId: workspace.id,
          query,
          limit: 10,
          includeCompleted: false,
        })

        return results.map((task) => ({
          id: task.id,
          title: task.title,
          reference: task.reference,
          priority: priorityToString(task.priority),
          isActive: task.isActive,
          column: task.column ? { title: task.column.title } : undefined,
        }))
      } catch (error) {
        console.error('Task search failed:', error)
        return []
      }
    },
    [workspace?.id, utils.client]
  )

  // Search users function for @mention autocomplete
  // Searches across all members in this workspace
  const searchUsers = useCallback(
    async (query: string): Promise<MentionResult[]> => {
      if (!workspace?.id) {
        return []
      }

      try {
        const results = await utils.client.search.membersInWorkspace.query({
          workspaceId: workspace.id,
          query,
          limit: 10,
        })

        return results.map((user) => ({
          id: user.id,
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
        }))
      } catch (error) {
        console.error('User search failed:', error)
        return []
      }
    },
    [workspace?.id, utils.client]
  )

  // Memoize the page object to prevent unnecessary re-renders during auto-save
  // Only update when page.id changes (not on every refetch)
  const currentPageRef = useRef(currentPage)
  if (currentPage && (!currentPageRef.current || currentPageRef.current.id !== currentPage.id)) {
    currentPageRef.current = currentPage
  }

  const pageForView = useMemo(() => {
    const cp = currentPage
    if (!cp) return null
    return {
      id: cp.id,
      title: cp.title,
      slug: cp.slug,
      content: cp.content,
      contentJson:
        typeof cp.contentJson === 'string'
          ? cp.contentJson
          : cp.contentJson
          ? JSON.stringify(cp.contentJson)
          : null,
      status: cp.status,
      sortOrder: cp.sortOrder,
      parentId: cp.parentId,
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
      publishedAt: cp.publishedAt,
    }
  }, [currentPage?.id, currentPage?.title, currentPage?.slug, currentPage?.content,
      currentPage?.contentJson, currentPage?.status, currentPage?.sortOrder,
      currentPage?.parentId, currentPage?.createdAt, currentPage?.updatedAt,
      currentPage?.publishedAt])

  // Handlers
  const handleCreatePage = useCallback((parentId?: number) => {
    setCreateParentId(parentId)
    setShowCreateModal(true)
  }, [])

  const handleSavePage = useCallback(
    async (data: { title: string; content: string; contentJson: string }) => {
      if (!currentPage) return

      await updateMutation.mutateAsync({
        id: currentPage.id,
        title: data.title,
        content: data.content,
        contentJson: data.contentJson ? JSON.parse(data.contentJson) : null,
      })
    },
    [currentPage, updateMutation]
  )

  const handleStatusChange = useCallback(
    async (status: WikiPageStatus) => {
      if (!currentPage) return

      await updateMutation.mutateAsync({
        id: currentPage.id,
        status,
      })
    },
    [currentPage, updateMutation]
  )

  const handleDelete = useCallback(async () => {
    if (!currentPage) return
    await deleteMutation.mutateAsync({ id: currentPage.id })
  }, [currentPage, deleteMutation])

  const handleSearch = useCallback(() => {
    setShowSearchDialog(true)
  }, [])

  const basePath = `/workspace/${slug}/wiki`
  const isLoading = workspaceQuery.isLoading || pagesQuery.isLoading

  // Loading state
  if (isLoading) {
    return (
      <WorkspaceLayout>
        <div className="flex h-[calc(100vh-8rem)]">
          <div className="w-64 border-r animate-pulse bg-muted/20" />
          <div className="flex-1 p-6 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4" />
            <div className="h-4 w-64 bg-muted rounded" />
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
      <div className="flex h-[calc(100vh-8rem)] -m-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <WikiSidebar
            pages={pageNodes}
            basePath={basePath}
            activeSlug={pageSlug}
            showUnpublished={true}
            onCreatePage={handleCreatePage}
            onSearch={handleSearch}
            onShowGraph={() => setShowGraphView(!showGraphView)}
            graphViewActive={showGraphView}
            onTemporalSearch={() => setShowTemporalSearch(true)}
            wikiType="workspace"
            title={`${workspace.name} Wiki`}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {pageSlug && pageForView ? (
            /* Page View */
            <WikiPageView
              page={pageForView}
              basePath={basePath}
              breadcrumbs={breadcrumbs}
              canEdit={true}
              onSave={handleSavePage}
              onStatusChange={handleStatusChange}
              onDelete={() => setShowDeleteConfirm(true)}
              onViewHistory={() => setShowVersionHistory(true)}
              isSaving={updateMutation.isPending}
              autoSaveDelay={2000}
              wikiPages={wikiPagesForLinks}
              searchTasks={searchTasks}
              searchUsers={searchUsers}
              currentUser={currentUser}
            />
          ) : pageSlug && currentPageQuery.isLoading ? (
            /* Loading page */
            <div className="animate-pulse">
              <div className="h-8 w-48 bg-muted rounded mb-4" />
              <div className="h-4 w-64 bg-muted rounded mb-8" />
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </div>
            </div>
          ) : pageSlug && currentPageQuery.isError ? (
            /* Page not found */
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">Page not found</h3>
              <p className="text-muted-foreground mb-4">
                The page "{pageSlug}" doesn't exist in this wiki.
              </p>
              <Button onClick={() => handleCreatePage()}>
                <Plus className="h-4 w-4 mr-2" />
                Create "{pageSlug}"
              </Button>
            </div>
          ) : (
            /* Wiki Home */
            <WikiHome
              workspace={workspace}
              pages={pages}
              onCreatePage={() => handleCreatePage()}
            />
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      {showCreateModal && (
        <CreateWikiPageModal
          workspaceId={workspace.id}
          parentId={createParentId}
          pages={pages}
          onClose={() => {
            setShowCreateModal(false)
            setCreateParentId(undefined)
          }}
          onCreated={(newSlug) => {
            setShowCreateModal(false)
            setCreateParentId(undefined)
            pagesQuery.refetch()
            navigate(`${basePath}/${newSlug}`)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Wiki Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{currentPage?.title}"?
              {currentPage && (currentPage.children?.length ?? 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This page has {currentPage.children.length} child page(s) that will also
                  be deleted.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
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

      {/* Version History Modal */}
      {currentPage && (
        <WikiVersionHistory
          pageId={currentPage.id}
          pageTitle={currentPage.title}
          open={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestored={() => {
            currentPageQuery.refetch()
            pagesQuery.refetch()
          }}
        />
      )}

      {/* Search Dialog */}
      {workspace && (
        <WikiSearchDialog
          open={showSearchDialog}
          onClose={() => setShowSearchDialog(false)}
          workspaceId={workspace.id}
          pages={pages as WikiPageForSearch[]}
          basePath={basePath}
        />
      )}

      {/* Graph View */}
      {showGraphView && workspace && (
        <WikiGraphView
          workspaceId={workspace.id}
          basePath={basePath}
          height={graphFullscreen ? undefined : 400}
          fullscreen={graphFullscreen}
          onToggleFullscreen={() => setGraphFullscreen(!graphFullscreen)}
          className={graphFullscreen ? '' : 'mt-4'}
        />
      )}

      {/* Temporal Search Dialog */}
      {workspace && (
        <WikiTemporalSearch
          open={showTemporalSearch}
          onClose={() => setShowTemporalSearch(false)}
          groupId={`wiki-ws-${workspace.id}`}
          onResultSelect={(result) => {
            // If result has a pageId, navigate to it
            if (result.pageId) {
              const page = pages.find((p) => p.id === result.pageId)
              if (page) {
                navigate(`${basePath}/${page.slug}`)
              }
            }
          }}
        />
      )}
    </WorkspaceLayout>
  )
}

// =============================================================================
// Wiki Home Component
// =============================================================================

interface WikiHomeProps {
  workspace: { id: number; name: string; slug: string }
  pages: PageFromApi[]
  onCreatePage: () => void
}

function WikiHome({ workspace, pages, onCreatePage }: WikiHomeProps) {
  const publishedCount = pages.filter((p) => p.status === 'PUBLISHED').length
  const draftCount = pages.filter((p) => p.status === 'DRAFT').length
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          {workspace.name} Wiki
        </h1>
        <p className="text-muted-foreground mt-2">
          Knowledge base and documentation for your workspace
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{pages.length}</div>
            <div className="text-sm text-muted-foreground">Total Pages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
            <div className="text-sm text-muted-foreground">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{draftCount}</div>
            <div className="text-sm text-muted-foreground">Drafts</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pages */}
      {recentPages.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Recently Updated</h2>
          <Card>
            <CardContent className="divide-y">
              {recentPages.map((page) => (
                <Link
                  key={page.id}
                  to={`/workspace/${workspace.slug}/wiki/${page.slug}`}
                  className="flex items-center justify-between py-3 hover:bg-accent/50 -mx-4 px-4 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{page.title}</span>
                    {page.status === 'DRAFT' && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                        Draft
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {pages.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No wiki pages yet</h3>
              <p className="text-sm mb-4">
                Create your first wiki page to start building your knowledge base.
              </p>
              <Button onClick={onCreatePage}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Page
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {pages.length > 0 && (
        <div className="flex justify-center">
          <Button onClick={onCreatePage}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
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
  parentId?: number
  pages: PageFromApi[]
  onClose: () => void
  onCreated: (slug: string) => void
}

function CreateWikiPageModal({
  workspaceId,
  parentId,
  pages,
  onClose,
  onCreated,
}: CreateWikiPageModalProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<WikiPageStatus>('DRAFT')
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentId ?? null)
  const [contentJson, setContentJson] = useState('')

  const createMutation = trpc.workspaceWiki.create.useMutation({
    onSuccess: (data) => {
      onCreated(data.slug)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    // Extract plain text from Lexical JSON for backwards compat
    let content = ''
    if (contentJson) {
      try {
        const parsed = JSON.parse(contentJson)
        content = extractPlainText(parsed)
      } catch {
        // Keep empty
      }
    }

    createMutation.mutate({
      workspaceId,
      parentId: selectedParentId,
      title: title.trim(),
      content,
      contentJson: contentJson ? JSON.parse(contentJson) : undefined,
      status,
    })
  }

  // Get root pages for parent selection
  const rootPages = pages.filter((p) => p.parentId === null)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Wiki Page</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title..."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: string) => setStatus(v as WikiPageStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {rootPages.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Page (optional)</Label>
              <Select
                value={selectedParentId?.toString() ?? 'none'}
                onValueChange={(v: string) => setSelectedParentId(v === 'none' ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent page..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (root page)</SelectItem>
                  {rootPages.map((page) => (
                    <SelectItem key={page.id} value={page.id.toString()}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              onChange={(_state, _editor, json) => setContentJson(json)}
              placeholder="Start writing..."
              minHeight="200px"
              maxHeight="300px"
              namespace="create-wiki-page"
            />
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
// Helper: Extract plain text from Lexical JSON
// =============================================================================

function extractPlainText(node: Record<string, unknown>): string {
  if (!node) return ''

  const parts: string[] = []

  if (node.text && typeof node.text === 'string') {
    parts.push(node.text)
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      parts.push(extractPlainText(child as Record<string, unknown>))
    }
  }

  if (node.root && typeof node.root === 'object') {
    parts.push(extractPlainText(node.root as Record<string, unknown>))
  }

  return parts.join(' ').trim()
}

export default WorkspaceWikiPage
