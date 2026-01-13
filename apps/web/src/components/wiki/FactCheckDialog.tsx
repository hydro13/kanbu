/**
 * Fact Check Dialog Component
 *
 * Fase 17.5 - User-Triggered Fact Check
 *
 * Displays results of a fact check operation on selected text.
 * Shows entities found and related facts from other wiki pages.
 */

import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface FactCheckEntity {
  name: string
  type: string
  confidence: number
}

export interface RelatedFact {
  entityName: string
  entityType: string
  fact: string
  pageId: number
  pageTitle: string
  pageSlug?: string
  validAt: string | null
  invalidAt: string | null
}

export interface FactCheckResult {
  success: boolean
  selectedText: string
  entities: FactCheckEntity[]
  relatedFacts: RelatedFact[]
  message: string
}

export interface FactCheckDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void
  /** The selected text being checked */
  selectedText: string
  /** Fact check results (null while loading) */
  result: FactCheckResult | null
  /** Whether fact check is in progress */
  isLoading: boolean
  /** Error message if check failed */
  error?: string
  /** Base path for wiki page navigation */
  wikiBasePath: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function getEntityTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'person':
    case 'user':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
    case 'project':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
    case 'concept':
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400'
    case 'task':
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400'
    case 'wikipage':
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

// =============================================================================
// Fact Card Component
// =============================================================================

interface FactCardProps {
  fact: RelatedFact
  onNavigate: (slug: string) => void
}

function FactCard({ fact, onNavigate }: FactCardProps) {
  const handleClick = () => {
    if (fact.pageSlug) {
      onNavigate(fact.pageSlug)
    }
  }

  return (
    <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
      {/* Source page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{fact.pageTitle}</span>
        </div>
        {fact.pageSlug && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleClick}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
        )}
      </div>

      {/* Entity badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', getEntityTypeColor(fact.entityType))}>
          <Tag className="h-3 w-3 mr-1" />
          {fact.entityName}
        </Badge>
      </div>

      {/* Fact content */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {fact.fact}
      </p>

      {/* Temporal info if available */}
      {(fact.validAt || fact.invalidAt) && (
        <div className="text-xs text-muted-foreground">
          {fact.validAt && <span>Valid from: {new Date(fact.validAt).toLocaleDateString()}</span>}
          {fact.invalidAt && <span className="ml-2">Until: {new Date(fact.invalidAt).toLocaleDateString()}</span>}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function FactCheckDialog({
  open,
  onOpenChange,
  selectedText,
  result,
  isLoading,
  error,
  wikiBasePath,
}: FactCheckDialogProps) {
  const navigate = useNavigate()

  const handleNavigateToPage = (slug: string) => {
    onOpenChange(false)
    navigate(`${wikiBasePath}/${slug}`)
  }

  const hasResults = result && result.relatedFacts.length > 0
  const noResults = result && result.relatedFacts.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Fact Check Results
          </DialogTitle>
          <DialogDescription>
            Checking selected text against existing wiki knowledge
          </DialogDescription>
        </DialogHeader>

        {/* Selected text preview */}
        <div className="p-3 bg-muted rounded-lg border-l-4 border-primary">
          <p className="text-sm font-medium mb-1">Selected Text:</p>
          <p className="text-sm text-muted-foreground italic">
            "{selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}"
          </p>
        </div>

        <div className="border-t" />

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing text and searching for related facts...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <p>{error}</p>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <ScrollArea className="flex-1 pr-4">
            {/* Entities found */}
            {result.entities.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Entities Found:</p>
                <div className="flex flex-wrap gap-2">
                  {result.entities.map((entity, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={cn('text-xs', getEntityTypeColor(entity.type))}
                    >
                      {entity.name}
                      <span className="ml-1 opacity-60">({entity.type})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t my-4" />

            {/* Related facts */}
            {hasResults && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">
                    Found {result.relatedFacts.length} related fact(s) from other pages:
                  </p>
                </div>
                {result.relatedFacts.map((fact, idx) => (
                  <FactCard
                    key={idx}
                    fact={fact}
                    onNavigate={handleNavigateToPage}
                  />
                ))}
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="font-medium text-foreground">No conflicting facts found</p>
                  <p className="text-sm mt-1">{result.message}</p>
                </div>
              </div>
            )}
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
