/*
 * Wiki Sidebar Component
 * Version: 1.5.0
 *
 * Tree-based navigation sidebar for wiki pages.
 * Supports both workspace and project wikis.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation following WIKI-MASTER-CONCEPT.md
 * Modified: 2026-01-12
 * Change: Added temporal search button (Fase 9)
 * Modified: 2026-01-12
 * Change: Removed title/icon, repositioned action icons above search
 * Modified: 2026-01-13
 * Change: VSCode-style tree: smaller indent (8px), no file icons
 * Modified: 2026-01-13
 * Change: Added VSCode-style vertical indent guide lines
 * Modified: 2026-01-14
 * Change: Fase 22 - Added WikiDuplicateManager integration
 * ===================================================================
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronRight,
  FileText,
  Plus,
  Search,
  Network,
  Clock,
  Sparkles,
  GitMerge,
} from 'lucide-react'
import { WikiDuplicateManager } from './WikiDuplicateManager'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type WikiPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface WikiPageNode {
  id: number
  title: string
  slug: string
  status: WikiPageStatus
  sortOrder: number
  parentId: number | null
  childCount: number
  updatedAt: string
}

interface WikiSidebarProps {
  /** List of all wiki pages */
  pages: WikiPageNode[]
  /** Base path for wiki links (e.g., /workspace/slug/wiki) */
  basePath: string
  /** Currently active page slug */
  activeSlug?: string
  /** Whether to show unpublished pages */
  showUnpublished?: boolean
  /** Callback when "New Page" is clicked */
  onCreatePage?: (parentId?: number) => void
  /** Callback when search is triggered */
  onSearch?: () => void
  /** Callback when graph view is triggered */
  onShowGraph?: () => void
  /** Whether graph view is currently shown */
  graphViewActive?: boolean
  /** Callback when temporal search is triggered */
  onTemporalSearch?: () => void
  /** Callback when Ask Wiki is triggered */
  onAskWiki?: () => void
  /** Whether Ask Wiki dialog is currently shown */
  askWikiActive?: boolean
  /** Wiki type for display */
  wikiType?: 'workspace' | 'project'
  /** Wiki title to display */
  title?: string
  /** Workspace ID for duplicate detection (required for Fase 22 features) */
  workspaceId?: number
  /** Project ID for duplicate detection scope */
  projectId?: number
}

// =============================================================================
// Helpers
// =============================================================================

function buildTree(
  pages: WikiPageNode[],
  showUnpublished: boolean
): { rootPages: WikiPageNode[]; childrenMap: Map<number, WikiPageNode[]> } {
  // Filter pages based on visibility
  const visiblePages = showUnpublished
    ? pages
    : pages.filter((p) => p.status === 'PUBLISHED')

  // Sort by sortOrder
  const sortedPages = [...visiblePages].sort((a, b) => a.sortOrder - b.sortOrder)

  // Build children map
  const childrenMap = new Map<number, WikiPageNode[]>()
  const rootPages: WikiPageNode[] = []

  for (const page of sortedPages) {
    if (page.parentId === null) {
      rootPages.push(page)
    } else {
      const siblings = childrenMap.get(page.parentId) || []
      siblings.push(page)
      childrenMap.set(page.parentId, siblings)
    }
  }

  return { rootPages, childrenMap }
}

// =============================================================================
// WikiTreeNode Component
// =============================================================================

interface WikiTreeNodeProps {
  page: WikiPageNode
  basePath: string
  activeSlug?: string
  childrenMap: Map<number, WikiPageNode[]>
  depth: number
  onCreatePage?: (parentId?: number) => void
  expandedIds: Set<number>
  toggleExpanded: (id: number) => void
}

function WikiTreeNode({
  page,
  basePath,
  activeSlug,
  childrenMap,
  depth,
  onCreatePage,
  expandedIds,
  toggleExpanded,
}: WikiTreeNodeProps) {
  const children = childrenMap.get(page.id) || []
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(page.id)
  const isActive = activeSlug === page.slug

  return (
    <div>
      <div
        className={cn(
          'group relative flex items-center gap-0.5 py-0.5 px-1 rounded text-sm hover:bg-accent/50 transition-colors',
          isActive && 'bg-accent text-accent-foreground'
        )}
      >
        {/* Indent guides (VSCode-style vertical lines) */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 flex" style={{ width: `${depth * 8 + 4}px` }}>
            {Array.from({ length: depth }).map((_, i) => (
              <div
                key={i}
                className="border-l border-muted-foreground/30 h-full"
                style={{ marginLeft: `${i === 0 ? 8 : 8}px` }}
              />
            ))}
          </div>
        )}

        {/* Spacer for indent */}
        <div style={{ width: `${depth * 8}px` }} className="flex-shrink-0" />

        {/* Expand/collapse button or leaf indicator */}
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(page.id)}
            className="p-0.5 rounded hover:bg-accent flex-shrink-0"
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 text-muted-foreground transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <div className="p-0.5 flex-shrink-0 flex items-center justify-center w-4 h-4">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
        )}

        {/* Page link (no icon, like VSCode) */}
        <Link
          to={`${basePath}/${page.slug}`}
          className={cn(
            'flex-1 truncate',
            isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {page.title}
        </Link>

        {/* Status badge */}
        {page.status === 'DRAFT' && (
          <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0 rounded flex-shrink-0">
            Draft
          </span>
        )}
        {page.status === 'ARCHIVED' && (
          <span className="text-[9px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1 py-0 rounded flex-shrink-0">
            Archived
          </span>
        )}

        {/* Add child page button (shows on hover) */}
        {onCreatePage && (
          <button
            onClick={(e) => {
              e.preventDefault()
              onCreatePage(page.id)
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity flex-shrink-0"
            title="Add subpage"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <WikiTreeNode
              key={child.id}
              page={child}
              basePath={basePath}
              activeSlug={activeSlug}
              childrenMap={childrenMap}
              depth={depth + 1}
              onCreatePage={onCreatePage}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiSidebar({
  pages,
  basePath,
  activeSlug,
  showUnpublished = true,
  onCreatePage,
  onSearch,
  onShowGraph,
  graphViewActive = false,
  onTemporalSearch,
  onAskWiki,
  askWikiActive = false,
  wikiType: _wikiType = 'workspace',
  title: _title,
  workspaceId,
  projectId,
}: WikiSidebarProps) {
  // Note: wikiType and title props kept for backwards compatibility but no longer displayed
  void _wikiType
  void _title

  // Fase 22: Duplicate manager dialog state
  const [duplicateManagerOpen, setDuplicateManagerOpen] = useState(false)

  // Track expanded nodes
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    // Auto-expand parents of active page
    if (!activeSlug) return new Set()

    const activePage = pages.find((p) => p.slug === activeSlug)
    if (!activePage || !activePage.parentId) return new Set()

    const expanded = new Set<number>()
    let currentId: number | null = activePage.parentId

    while (currentId) {
      expanded.add(currentId)
      const parent = pages.find((p) => p.id === currentId)
      currentId = parent?.parentId ?? null
    }

    return expanded
  })

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Build tree structure
  const { rootPages, childrenMap } = useMemo(
    () => buildTree(pages, showUnpublished),
    [pages, showUnpublished]
  )

  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      {/* Header */}
      <div className="p-3 border-b">
        {/* Action icons row */}
        <div className="flex items-center gap-1.5 mb-2">
          {onCreatePage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreatePage()}
              title="Create new page"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          {onShowGraph && (
            <Button
              variant={graphViewActive ? 'default' : 'outline'}
              size="sm"
              onClick={onShowGraph}
              title="Knowledge graph"
            >
              <Network className="h-3.5 w-3.5" />
            </Button>
          )}
          {onAskWiki && (
            <Button
              variant={askWikiActive ? 'default' : 'outline'}
              size="sm"
              onClick={onAskWiki}
              title="Ask the Wiki"
              className={cn(
                !askWikiActive && 'text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}
          {onTemporalSearch && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTemporalSearch}
              title="Temporal search - what did we know at time X?"
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          )}
          {workspaceId && (
            <Button
              variant={duplicateManagerOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDuplicateManagerOpen(true)}
              title="Manage duplicate entities"
            >
              <GitMerge className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Search button */}
        {onSearch && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={onSearch}
          >
            <Search className="h-3.5 w-3.5 mr-2" />
            Search...
          </Button>
        )}
      </div>

      {/* Page Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {rootPages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pages yet</p>
              {onCreatePage && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => onCreatePage()}
                  className="mt-2"
                >
                  Create first page
                </Button>
              )}
            </div>
          ) : (
            rootPages.map((page) => (
              <WikiTreeNode
                key={page.id}
                page={page}
                basePath={basePath}
                activeSlug={activeSlug}
                childrenMap={childrenMap}
                depth={0}
                onCreatePage={onCreatePage}
                expandedIds={expandedIds}
                toggleExpanded={toggleExpanded}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="p-3 border-t text-xs text-muted-foreground">
        {pages.length} page{pages.length !== 1 ? 's' : ''}
        {showUnpublished && (
          <span className="ml-2">
            ({pages.filter((p) => p.status === 'DRAFT').length} drafts)
          </span>
        )}
      </div>

      {/* Fase 22: Duplicate Manager Dialog */}
      {workspaceId && (
        <WikiDuplicateManager
          workspaceId={workspaceId}
          projectId={projectId}
          open={duplicateManagerOpen}
          onOpenChange={setDuplicateManagerOpen}
        />
      )}
    </div>
  )
}

export default WikiSidebar
