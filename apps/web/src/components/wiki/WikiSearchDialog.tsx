/*
 * Wiki Search Dialog Component
 * Version: 1.0.0
 *
 * Search dialog for wiki pages with:
 * - Local title/slug search
 * - Graphiti semantic search integration
 * - Keyboard navigation
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 4 - Search & Discovery)
 * ===================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export interface WikiPageForSearch {
  id: number
  title: string
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  updatedAt: string
  parentId: number | null
}

interface SearchResult {
  id: number
  title: string
  slug: string
  type: 'local' | 'semantic'
  score?: number
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  snippet?: string
}

interface WikiSearchDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Workspace ID for Graphiti search */
  workspaceId: number
  /** Local wiki pages for quick search */
  pages: WikiPageForSearch[]
  /** Base path for navigation (e.g., /workspace/slug/wiki) */
  basePath: string
}

// =============================================================================
// Search Logic
// =============================================================================

function searchLocalPages(
  pages: WikiPageForSearch[],
  query: string
): SearchResult[] {
  if (!query.trim()) return []

  const lowerQuery = query.toLowerCase()

  return pages
    .filter((page) => {
      const titleMatch = page.title.toLowerCase().includes(lowerQuery)
      const slugMatch = page.slug.toLowerCase().includes(lowerQuery)
      return titleMatch || slugMatch
    })
    .map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      type: 'local' as const,
      status: page.status,
    }))
    .slice(0, 10)
}

// =============================================================================
// Result Item Component
// =============================================================================

interface ResultItemProps {
  result: SearchResult
  isSelected: boolean
  onClick: () => void
}

function ResultItem({ result, isSelected, onClick }: ResultItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50'
      )}
    >
      {result.type === 'semantic' ? (
        <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          {result.status === 'DRAFT' && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200">
              Draft
            </Badge>
          )}
        </div>
        {result.snippet && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {result.snippet}
          </p>
        )}
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
    </button>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiSearchDialog({
  open,
  onClose,
  workspaceId,
  pages,
  basePath,
}: WikiSearchDialogProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const utils = trpc.useUtils()

  // Local search results
  const localResults = searchLocalPages(pages, query)

  // Combined results: local first, then semantic
  const allResults = [...localResults, ...semanticResults.filter(
    (sr) => !localResults.some((lr) => lr.id === sr.id)
  )]

  // Semantic search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSemanticResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        // Use groupId format for workspace wikis: 'wiki-ws-{id}'
        const groupId = `wiki-ws-${workspaceId}`

        const results = await utils.client.graphiti.search.query({
          query,
          groupId,
          limit: 5,
        })

        // Convert to SearchResult format
        // Look up page details from local pages array
        const semantic: SearchResult[] = results
          .filter((r) => r.pageId !== undefined)
          .map((r) => {
            const localPage = pages.find((p) => p.id === r.pageId)
            return {
              id: r.pageId!,
              title: localPage?.title ?? r.name,
              slug: localPage?.slug ?? '',
              type: 'semantic' as const,
              score: r.score,
              status: localPage?.status,
            }
          })
          .filter((r) => r.slug) // Only include if we have a slug

        setSemanticResults(semantic)
      } catch (error) {
        console.error('Semantic search failed:', error)
        setSemanticResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, workspaceId, pages, utils.client])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setSemanticResults([])
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [allResults.length])

  // Navigate to selected result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      navigate(`${basePath}/${result.slug}`)
      onClose()
    },
    [navigate, basePath, onClose]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < allResults.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          e.preventDefault()
          if (allResults[selectedIndex]) {
            navigateToResult(allResults[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [allResults, selectedIndex, navigateToResult, onClose]
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">Search Wiki</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search wiki pages..."
              className="pl-9 pr-8"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[300px]">
          <div className="px-2 pb-2">
            {query.trim() === '' ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start typing to search wiki pages</p>
                <p className="text-xs mt-1">
                  Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to select,{' '}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
                </p>
              </div>
            ) : allResults.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {isSearching ? (
                  <>
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p>Searching...</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pages found for "{query}"</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {localResults.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                      Pages
                    </div>
                    {localResults.map((result, index) => (
                      <ResultItem
                        key={`local-${result.id}`}
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => navigateToResult(result)}
                      />
                    ))}
                  </>
                )}

                {semanticResults.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1 mt-2">
                      <Sparkles className="h-3 w-3" />
                      Semantic Matches
                    </div>
                    {semanticResults
                      .filter((sr) => !localResults.some((lr) => lr.id === sr.id))
                      .map((result, index) => (
                        <ResultItem
                          key={`semantic-${result.id}`}
                          result={result}
                          isSelected={localResults.length + index === selectedIndex}
                          onClick={() => navigateToResult(result)}
                        />
                      ))}
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {allResults.length} result{allResults.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd>
            <span>Navigate</span>
            <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd>
            <span>Open</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WikiSearchDialog
