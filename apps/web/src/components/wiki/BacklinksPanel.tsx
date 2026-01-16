/*
 * Backlinks Panel Component
 * Version: 1.0.0
 *
 * Displays pages that link to the current wiki page (backlinks)
 * and related pages based on shared entities from the knowledge graph.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation for Fase 3
 * ===================================================================
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Sparkles,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface BacklinksPanelProps {
  /** The wiki page ID to show backlinks for */
  pageId: number
  /** Base path for wiki links (e.g., /workspace/genx/wiki) */
  basePath: string
  /** Optional className */
  className?: string
}

// =============================================================================
// Backlinks Section
// =============================================================================

interface BacklinksSectionProps {
  pageId: number
  basePath: string
}

function BacklinksSection({ pageId, basePath }: BacklinksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const { data: backlinks, isLoading, error } = trpc.graphiti.getBacklinks.useQuery(
    { pageId },
    { enabled: pageId > 0 }
  )

  const hasBacklinks = backlinks && backlinks.length > 0

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 h-8 px-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <LinkIcon className="h-4 w-4" />
        <span className="font-medium">Backlinks</span>
        {!isLoading && hasBacklinks && (
          <span className="ml-auto text-xs text-muted-foreground">
            {backlinks.length}
          </span>
        )}
        {isLoading && (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-2 py-1">
              Loading...
            </p>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2 py-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Could not load backlinks</span>
            </div>
          ) : hasBacklinks ? (
            backlinks.map((link) => (
              <Link
                key={`backlink-${link.pageId}`}
                to={`${basePath}/${link.slug || link.pageId}`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors group"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                <span className="truncate">{link.title}</span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-2 py-1">
              No pages link to this page yet
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Related Pages Section
// =============================================================================

interface RelatedSectionProps {
  pageId: number
  basePath: string
}

function RelatedSection({ pageId, basePath }: RelatedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const { data: related, isLoading, error } = trpc.graphiti.getRelated.useQuery(
    { pageId, limit: 5 },
    { enabled: pageId > 0 }
  )

  const hasRelated = related && related.length > 0

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 h-8 px-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Sparkles className="h-4 w-4" />
        <span className="font-medium">Related Pages</span>
        {!isLoading && hasRelated && (
          <span className="ml-auto text-xs text-muted-foreground">
            {related.length}
          </span>
        )}
        {isLoading && (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-2 py-1">
              Loading...
            </p>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2 py-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Could not load related pages</span>
            </div>
          ) : hasRelated ? (
            related.map((page, index) => (
              <Link
                key={`related-${page.pageId}-${index}`}
                to={`${basePath}/${page.slug || page.pageId}`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors group"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                <span className="truncate flex-1">{page.title}</span>
                <span className="text-xs text-muted-foreground" title="Shared concepts">
                  {page.sharedCount} shared
                </span>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-2 py-1">
              No related pages found
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function BacklinksPanel({ pageId, basePath, className }: BacklinksPanelProps) {
  // Check if Graphiti is connected
  const { data: connectionStatus } = trpc.graphiti.isConnected.useQuery()

  if (!connectionStatus?.connected) {
    return (
      <div className={cn('border-t pt-4 mt-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>Knowledge graph not available</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border-t pt-4 mt-4 space-y-4', className)}>
      <BacklinksSection pageId={pageId} basePath={basePath} />
      <RelatedSection pageId={pageId} basePath={basePath} />
    </div>
  )
}

export default BacklinksPanel
