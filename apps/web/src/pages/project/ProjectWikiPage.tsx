/*
 * Project Wiki Page
 * Version: 1.0.0
 *
 * Shows the project wiki/knowledge base with:
 * - Sidebar navigation (page tree)
 * - Page view/edit with Lexical editor
 * - Status management (draft/published/archived)
 * - Version history
 * - Search functionality
 * - Ask the Wiki (RAG chat with AI)
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-16
 * Change: Initial implementation for project-level wikis (Phase 18)
 * ===================================================================
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectLayout } from '@/components/layout/ProjectLayout'
import {
  WikiSidebar,
  WikiPageView,
  WikiVersionHistory,
  WikiSearchDialog,
  WikiGraphView,
  AskWikiDialog,
  AskWikiFab,
  type WikiPageNode,
  type WikiPageStatus,
  type WikiBreadcrumb,
  type WikiPageForSearch,
} from '@/components/wiki'
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
import { useWikiBackgroundIndexing } from '@/hooks/useWikiBackgroundIndexing'
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
  project: {
    id: number
    name: string
    prefix: string
    workspace: {
      id: number
      name: string
      slug: string
    }
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

export function ProjectWikiPage() {
  const { workspaceSlug, projectIdentifier, pageSlug } = useParams<{
    workspaceSlug: string
    projectIdentifier: string
    pageSlug?: string
  }>()
  const navigate = useNavigate()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createParentId, setCreateParentId] = useState<number | undefined>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showGraphView, setShowGraphView] = useState(false)
  const [graphFullscreen, setGraphFullscreen] = useState(false)
  const [showAskWiki, setShowAskWiki] = useState(false)
  const [askWikiInitialQuery, setAskWikiInitialQuery] = useState<string | undefined>()

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

  // Fetch project by identifier
  const projectQuery = trpc.project.getByIdentifier.useQuery(
    { identifier: projectIdentifier! },
    { enabled: !!projectIdentifier }
  )
  const project = projectQuery.data
  const workspaceId = project?.workspace?.id

  // Background indexing - runs during idle time
  useWikiBackgroundIndexing({
    workspaceId: workspaceId ?? 0,
    projectId: project?.id,
    enabled: !!workspaceId && !!project?.id,
    idleThreshold: 30_000, // 30 seconds
    cooldown: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch wiki pages list
  const pagesQuery = trpc.projectWiki.list.useQuery(
    { projectId: project?.id ?? 0, includeUnpublished: true },
    { enabled: !!project?.id }
  )
  const pages = (pagesQuery.data ?? []) as PageFromApi[]

  // Fetch current page if pageSlug is provided
  const currentPageQuery = trpc.projectWiki.getBySlug.useQuery(
    { projectId: project?.id ?? 0, slug: pageSlug! },
    { enabled: !!project?.id && !!pageSlug }
  )
  const currentPage = currentPageQuery.data as FullPageFromApi | undefined

  // Update mutation
  const updateMutation = trpc.projectWiki.update.useMutation({
    onSuccess: () => {
      utils.projectWiki.list.invalidate()
      utils.projectWiki.getBySlug.invalidate()
    },
  })

  // Delete mutation
  const deleteMutation = trpc.projectWiki.delete.useMutation({
    onSuccess: () => {
      utils.projectWiki.list.invalidate()
      setShowDeleteConfirm(false)
      navigate(`/workspace/${workspaceSlug}/project/${projectIdentifier}/wiki`)
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
  // Searches within this project
  const searchTasks = useCallback(
    async (query: string): Promise<TaskResult[]> => {
      if (!project?.id || query.length < 1) {
        return []
      }

      try {
        const results = await utils.client.search.tasks.query({
          projectId: project.id,
          query,
          limit: 10,
          includeCompleted: false,
        })

        return results.map((task) => ({
          id: task.id,
          title: task.title,
          reference: task.reference ?? `#${task.id}`,
          priority: priorityToString(task.priority),
          isActive: task.isActive,
          column: task.column ? { title: task.column.title } : undefined,
        }))
      } catch (error) {
        console.error('Task search failed:', error)
        return []
      }
    },
    [project?.id, utils.client]
  )

  // Search users function for @mention autocomplete
  // Searches across all members in the workspace
  const searchUsers = useCallback(
    async (query: string): Promise<MentionResult[]> => {
      if (!workspaceId) {
        return []
      }

      try {
        const results = await utils.client.search.membersInWorkspace.query({
          workspaceId,
          query,
          limit: 10,
        })

        return results.map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          avatarUrl: u.avatarUrl,
        }))
      } catch (error) {
        console.error('User search failed:', error)
        return []
      }
    },
    [workspaceId, utils.client]
  )

  // Memoize the page object to prevent unnecessary re-renders during auto-save
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

  const handleParentChange = useCallback(
    async (parentId: number | null) => {
      if (!currentPage) return

      await updateMutation.mutateAsync({
        id: currentPage.id,
        parentId,
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

  // Handler: Show a page in the graph view (from search results)
  const handleShowInGraph = useCallback((pageId: number) => {
    if (!showGraphView) {
      setShowGraphView(true)
    }
    console.log(`[ProjectWiki] Show in graph: pageId=${pageId}`)
  }, [showGraphView])

  // Handler: Open Ask Wiki with context about a graph node
  const handleAskAboutNode = useCallback((nodeLabel: string, nodeType: string) => {
    const query = nodeType === 'page'
      ? `Tell me more about "${nodeLabel}"`
      : `What does "${nodeLabel}" mean in the context of this wiki?`
    setAskWikiInitialQuery(query)
    setShowAskWiki(true)
  }, [])

  // Handler: Open Ask Wiki dialog
  const handleOpenAskWiki = useCallback(() => {
    setAskWikiInitialQuery(undefined)
    setShowAskWiki(true)
  }, [])

  // Handler: Open Ask Wiki with page context
  const handleAskAboutPage = useCallback((pageTitle: string, _pageContent: string) => {
    const query = `Explain what "${pageTitle}" means and how it relates to other topics.`
    setAskWikiInitialQuery(query)
    setShowAskWiki(true)
  }, [])

  const basePath = `/workspace/${workspaceSlug}/project/${projectIdentifier}/wiki`

  // Handler: Navigate to page from Ask Wiki sources
  const handleNavigateToPage = useCallback((_pageId: number, pageSlugParam: string) => {
    navigate(`${basePath}/${pageSlugParam}`)
  }, [navigate, basePath])

  // Handler: Close Ask Wiki and clear initial query
  const handleCloseAskWiki = useCallback(() => {
    setShowAskWiki(false)
    setAskWikiInitialQuery(undefined)
  }, [])

  const isLoading = projectQuery.isLoading || pagesQuery.isLoading

  // Loading state
  if (isLoading) {
    return (
      <ProjectLayout>
        <div className="flex h-[calc(100vh-8rem)]">
          <div className="w-64 border-r animate-pulse bg-muted/20" />
          <div className="flex-1 p-6 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
        </div>
      </ProjectLayout>
    )
  }

  // Project not found
  if (!project) {
    return (
      <ProjectLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Link to={`/workspace/${workspaceSlug}`} className="text-primary hover:underline flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
        </div>
      </ProjectLayout>
    )
  }

  return (
    <ProjectLayout>
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
            onAskWiki={handleOpenAskWiki}
            askWikiActive={showAskWiki}
            wikiType="project"
            title={`${project.name} Wiki`}
            workspaceId={workspaceId!}
            projectId={project.id}
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
              onAskWiki={handleOpenAskWiki}
              onAskAboutPage={handleAskAboutPage}
              availablePages={pages.map((p) => ({ id: p.id, title: p.title, parentId: p.parentId }))}
              onParentChange={handleParentChange}
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
            <ProjectWikiHome
              project={{ id: project.id, name: project.name, identifier: project.identifier ?? '' }}
              pages={pages}
              basePath={basePath}
              onCreatePage={() => handleCreatePage()}
            />
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      {showCreateModal && project && (
        <CreateProjectWikiPageModal
          projectId={project.id}
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
      {/* Note: WikiVersionHistory currently only supports workspace wikis.
          For full project wiki support, it needs to be updated to accept a wikiType prop. */}
      {currentPage && workspaceId && (
        <WikiVersionHistory
          pageId={currentPage.id}
          pageTitle={currentPage.title}
          open={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          onRestored={() => {
            currentPageQuery.refetch()
            pagesQuery.refetch()
          }}
          // TODO: Add wikiType="project" and projectId props once WikiVersionHistory is updated
        />
      )}

      {/* Search Dialog */}
      {project && workspaceId && (
        <WikiSearchDialog
          open={showSearchDialog}
          onClose={() => setShowSearchDialog(false)}
          workspaceId={workspaceId}
          projectId={project.id}
          pages={pages as WikiPageForSearch[]}
          basePath={basePath}
          onShowInGraph={handleShowInGraph}
        />
      )}

      {/* Graph View */}
      {/* Note: WikiGraphView currently shows workspace-level graph.
          TODO: Add projectId support for project-scoped graphs */}
      {showGraphView && workspaceId && project && (
        <WikiGraphView
          workspaceId={workspaceId}
          basePath={basePath}
          height={graphFullscreen ? undefined : 400}
          fullscreen={graphFullscreen}
          onToggleFullscreen={() => setGraphFullscreen(!graphFullscreen)}
          className={graphFullscreen ? '' : 'mt-4'}
          onAskAboutNode={handleAskAboutNode}
        />
      )}

      {/* Ask Wiki Dialog */}
      {workspaceId && project && (
        <>
          <AskWikiFab onClick={handleOpenAskWiki} />
          <AskWikiDialog
            isOpen={showAskWiki}
            onClose={handleCloseAskWiki}
            workspaceId={workspaceId}
            projectId={project.id}
            wikiBaseUrl={basePath}
            workspaceName={project.name}
            initialQuery={askWikiInitialQuery}
            onNavigateToPage={handleNavigateToPage}
          />
        </>
      )}
    </ProjectLayout>
  )
}

// =============================================================================
// Project Wiki Home Component
// =============================================================================

interface ProjectWikiHomeProps {
  project: { id: number; name: string; identifier: string }
  pages: PageFromApi[]
  basePath: string
  onCreatePage: () => void
}

function ProjectWikiHome({ project, pages, basePath, onCreatePage }: ProjectWikiHomeProps) {
  const publishedCount = pages.filter((p) => p.status === 'PUBLISHED').length
  const draftCount = pages.filter((p) => p.status === 'DRAFT').length
  const recentPages = [...pages]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-page-title-lg tracking-tight text-foreground flex items-center gap-3">
          <BookOpen className="h-8 w-8" />
          {project.name} Wiki
        </h1>
        <p className="text-muted-foreground mt-2">
          Knowledge base and documentation for this project
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
                  to={`${basePath}/${page.slug}`}
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
                Create your first wiki page to start building this project's knowledge base.
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
// Create Project Wiki Page Modal
// =============================================================================

interface CreateProjectWikiPageModalProps {
  projectId: number
  parentId?: number
  pages: PageFromApi[]
  onClose: () => void
  onCreated: (slug: string) => void
}

function CreateProjectWikiPageModal({
  projectId,
  parentId,
  pages,
  onClose,
  onCreated,
}: CreateProjectWikiPageModalProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<WikiPageStatus>('DRAFT')
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentId ?? null)
  const [contentJson, setContentJson] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMutation = trpc.projectWiki.create.useMutation({
    onSuccess: (result: any) => {
      onCreated(result.slug)
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
      projectId,
      parentId: selectedParentId,
      title: title.trim(),
      content,
      contentJson: contentJson ? JSON.parse(contentJson) : undefined,
      status,
    })
  }

  // Build indented page list for parent selection (showing hierarchy)
  const buildPageOptions = (
    allPages: PageFromApi[],
    parentId: number | null = null,
    depth: number = 0
  ): Array<{ id: number; title: string; depth: number }> => {
    const children = allPages.filter((p) => p.parentId === parentId)
    const result: Array<{ id: number; title: string; depth: number }> = []
    for (const child of children) {
      result.push({ id: child.id, title: child.title, depth })
      result.push(...buildPageOptions(allPages, child.id, depth + 1))
    }
    return result
  }
  const pageOptions = buildPageOptions(pages)

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

          {pageOptions.length > 0 && (
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
                  {pageOptions.map((page) => (
                    <SelectItem key={page.id} value={page.id.toString()}>
                      {'—'.repeat(page.depth)}{page.depth > 0 ? ' ' : ''}{page.title}
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
              namespace="create-project-wiki-page"
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

  return parts.join(' ')
}

export default ProjectWikiPage
