/*
 * Wiki Page View Component
 * Version: 1.1.0
 *
 * Displays a single wiki page with view/edit mode toggle.
 * Integrates Lexical RichTextEditor for content editing.
 * Includes backlinks and related pages panel (Graphiti integration).
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation following WIKI-MASTER-CONCEPT.md
 *
 * Modified: 2026-01-12
 * Change: Added BacklinksPanel for Fase 3 Graphiti integration
 * ===================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RichTextEditor, type WikiPage as WikiPageForLink } from '@/components/editor'
import {
  Edit2,
  Eye,
  X,
  MoreVertical,
  History,
  Trash2,
  Archive,
  Globe,
  FileText,
  ChevronRight,
  Clock,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WikiPageStatus } from './WikiSidebar'
import { BacklinksPanel } from './BacklinksPanel'

// =============================================================================
// Types
// =============================================================================

export interface WikiPage {
  id: number
  title: string
  slug: string
  content: string
  contentJson: string | null
  status: WikiPageStatus
  sortOrder: number
  parentId: number | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  createdBy?: {
    id: number
    name: string
  }
  updatedBy?: {
    id: number
    name: string
  }
}

export interface WikiBreadcrumb {
  id: number
  title: string
  slug: string
}

interface WikiPageViewProps {
  /** The wiki page to display */
  page: WikiPage
  /** Base path for wiki links */
  basePath: string
  /** Breadcrumb trail to this page */
  breadcrumbs?: WikiBreadcrumb[]
  /** Whether the user can edit this page */
  canEdit?: boolean
  /** Callback when page is saved */
  onSave?: (data: { title: string; content: string; contentJson: string }) => Promise<void>
  /** Callback when page status is changed */
  onStatusChange?: (status: WikiPageStatus) => Promise<void>
  /** Callback when page is deleted */
  onDelete?: () => void
  /** Callback when viewing version history */
  onViewHistory?: () => void
  /** Whether save is in progress */
  isSaving?: boolean
  /** Auto-save debounce delay in ms (0 to disable) */
  autoSaveDelay?: number
  /** Function to search wiki pages for [[ link autocomplete */
  searchWikiPages?: (query: string) => Promise<WikiPageForLink[]>
  /** Static list of wiki pages (alternative to searchWikiPages) */
  wikiPages?: WikiPageForLink[]
}

// =============================================================================
// Status Badge Component
// =============================================================================

function StatusBadge({ status }: { status: WikiPageStatus }) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          <FileText className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      )
    case 'PUBLISHED':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <Globe className="h-3 w-3 mr-1" />
          Published
        </Badge>
      )
    case 'ARCHIVED':
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
          <Archive className="h-3 w-3 mr-1" />
          Archived
        </Badge>
      )
    default:
      return null
  }
}

// =============================================================================
// Breadcrumbs Component
// =============================================================================

interface BreadcrumbsProps {
  basePath: string
  breadcrumbs: WikiBreadcrumb[]
  currentTitle: string
}

function Breadcrumbs({ basePath, breadcrumbs, currentTitle }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link to={basePath} className="hover:text-foreground transition-colors">
        Wiki
      </Link>
      {breadcrumbs.map((crumb) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            to={`${basePath}/${crumb.slug}`}
            className="hover:text-foreground transition-colors"
          >
            {crumb.title}
          </Link>
        </span>
      ))}
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="text-foreground font-medium">{currentTitle}</span>
    </nav>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiPageView({
  page,
  basePath,
  breadcrumbs = [],
  canEdit = true,
  onSave,
  onStatusChange,
  onDelete,
  onViewHistory,
  isSaving = false,
  autoSaveDelay = 2000,
  searchWikiPages,
  wikiPages,
}: WikiPageViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(page.title)
  const [editedContent, setEditedContent] = useState(page.content)
  const [editedContentJson, setEditedContentJson] = useState(page.contentJson || '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef({ title: page.title, contentJson: page.contentJson })

  // Reset state when page changes
  useEffect(() => {
    setEditedTitle(page.title)
    setEditedContent(page.content)
    setEditedContentJson(page.contentJson || '')
    setHasUnsavedChanges(false)
    setIsEditing(false)
    lastSavedRef.current = { title: page.title, contentJson: page.contentJson }
  }, [page.id])

  // Auto-save logic
  useEffect(() => {
    if (!isEditing || !autoSaveDelay || !hasUnsavedChanges) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave()
    }, autoSaveDelay)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [editedTitle, editedContentJson, hasUnsavedChanges, isEditing, autoSaveDelay])

  // Handle editor content change
  const handleEditorChange = useCallback(
    (_editorState: unknown, _editor: unknown, jsonString: string) => {
      setEditedContentJson(jsonString)
      // Extract plain text content for backwards compatibility
      try {
        const parsed = JSON.parse(jsonString)
        const text = extractPlainText(parsed)
        setEditedContent(text)
      } catch {
        // Keep existing content if parsing fails
      }

      // Check if content actually changed
      if (jsonString !== lastSavedRef.current.contentJson) {
        setHasUnsavedChanges(true)
      }
    },
    []
  )

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value)
    if (e.target.value !== lastSavedRef.current.title) {
      setHasUnsavedChanges(true)
    }
  }

  // Save changes
  const handleSave = async () => {
    if (!onSave || isSaving) return

    await onSave({
      title: editedTitle,
      content: editedContent,
      contentJson: editedContentJson,
    })

    lastSavedRef.current = { title: editedTitle, contentJson: editedContentJson }
    setHasUnsavedChanges(false)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedTitle(page.title)
    setEditedContent(page.content)
    setEditedContentJson(page.contentJson || '')
    setHasUnsavedChanges(false)
    setIsEditing(false)
  }

  // Enter edit mode
  const handleStartEdit = () => {
    setIsEditing(true)
  }

  // Exit edit mode (save first if needed)
  const handleExitEdit = async () => {
    if (hasUnsavedChanges && onSave) {
      await handleSave()
    }
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <Breadcrumbs
        basePath={basePath}
        breadcrumbs={breadcrumbs}
        currentTitle={isEditing ? editedTitle : page.title}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={handleTitleChange}
              className="text-3xl font-bold tracking-tight w-full bg-transparent border-b-2 border-primary/50 focus:border-primary outline-none pb-1"
              placeholder="Page title..."
              autoFocus
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <StatusBadge status={page.status} />
            {page.updatedBy && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {page.updatedBy.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(page.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              {hasUnsavedChanges && (
                <span className="text-xs text-muted-foreground">
                  {isSaving ? 'Saving...' : 'Unsaved changes'}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExitEdit}
                disabled={isSaving}
              >
                <Eye className="h-4 w-4 mr-1" />
                Done
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewHistory && (
                    <DropdownMenuItem onClick={onViewHistory}>
                      <History className="h-4 w-4 mr-2" />
                      Version History
                    </DropdownMenuItem>
                  )}

                  {onStatusChange && (
                    <>
                      <DropdownMenuSeparator />
                      {page.status !== 'PUBLISHED' && (
                        <DropdownMenuItem onClick={() => onStatusChange('PUBLISHED')}>
                          <Globe className="h-4 w-4 mr-2" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      {page.status === 'PUBLISHED' && (
                        <DropdownMenuItem onClick={() => onStatusChange('DRAFT')}>
                          <FileText className="h-4 w-4 mr-2" />
                          Unpublish
                        </DropdownMenuItem>
                      )}
                      {page.status !== 'ARCHIVED' && (
                        <DropdownMenuItem onClick={() => onStatusChange('ARCHIVED')}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Content + Backlinks */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <RichTextEditor
          key={`${page.id}-${page.updatedAt}-${isEditing}`}
          initialContent={isEditing ? editedContentJson || undefined : page.contentJson || undefined}
          onChange={handleEditorChange}
          readOnly={!isEditing}
          showToolbar={isEditing}
          placeholder="Start writing..."
          minHeight="300px"
          maxHeight={isEditing ? '600px' : 'none'}
          namespace={`wiki-page-${page.id}`}
          className={cn(!isEditing && 'wiki-view-mode')}
          enableWikiLinks={true}
          searchWikiPages={searchWikiPages}
          wikiPages={wikiPages}
          wikiBasePath={basePath}
        />

        {/* Backlinks and Related Pages panel */}
        {!isEditing && (
          <BacklinksPanel
            pageId={page.id}
            basePath={basePath}
          />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Helper: Extract plain text from Lexical JSON
// =============================================================================

function extractPlainText(node: Record<string, unknown>): string {
  if (!node) return ''

  const parts: string[] = []

  // Handle text nodes
  if (node.text && typeof node.text === 'string') {
    parts.push(node.text)
  }

  // Recursively handle children
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      parts.push(extractPlainText(child as Record<string, unknown>))
    }
  }

  // Handle root
  if (node.root && typeof node.root === 'object') {
    parts.push(extractPlainText(node.root as Record<string, unknown>))
  }

  return parts.join(' ').trim()
}

export default WikiPageView
