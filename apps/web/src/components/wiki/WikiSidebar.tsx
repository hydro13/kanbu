/*
 * Wiki Sidebar Component
 * Version: 1.0.0
 *
 * Tree-based navigation sidebar for wiki pages.
 * Supports both workspace and project wikis.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation following WIKI-MASTER-CONCEPT.md
 * ===================================================================
 */

import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronRight,
  FileText,
  Plus,
  BookOpen,
  Search,
} from 'lucide-react'
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
  /** Wiki type for display */
  wikiType?: 'workspace' | 'project'
  /** Wiki title to display */
  title?: string
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
          'group flex items-center gap-1 py-1 px-2 rounded-md text-sm hover:bg-accent/50 transition-colors',
          isActive && 'bg-accent text-accent-foreground'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse button */}
        <button
          onClick={() => hasChildren && toggleExpanded(page.id)}
          className={cn(
            'p-0.5 rounded hover:bg-accent',
            !hasChildren && 'invisible'
          )}
        >
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        {/* Page icon and link */}
        <Link
          to={`${basePath}/${page.slug}`}
          className={cn(
            'flex-1 flex items-center gap-2 truncate',
            isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{page.title}</span>
        </Link>

        {/* Status badge */}
        {page.status === 'DRAFT' && (
          <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded flex-shrink-0">
            Draft
          </span>
        )}
        {page.status === 'ARCHIVED' && (
          <span className="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">
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
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity"
            title="Add subpage"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
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
  wikiType = 'workspace',
  title,
}: WikiSidebarProps) {
  const location = useLocation()

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

  // Check if on wiki root
  const isWikiRoot = location.pathname === basePath || location.pathname === basePath + '/'

  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <Link
            to={basePath}
            className={cn(
              'flex items-center gap-2 font-semibold text-sm hover:text-primary transition-colors',
              isWikiRoot && 'text-primary'
            )}
          >
            <BookOpen className="h-4 w-4" />
            {title || (wikiType === 'workspace' ? 'Workspace Wiki' : 'Project Wiki')}
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onSearch && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-start text-muted-foreground"
              onClick={onSearch}
            >
              <Search className="h-3.5 w-3.5 mr-2" />
              Search...
            </Button>
          )}
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
        </div>
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
    </div>
  )
}

export default WikiSidebar
