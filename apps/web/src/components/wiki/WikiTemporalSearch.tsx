/*
 * Wiki Temporal Search Component
 * Version: 1.0.0
 *
 * Dialog for querying the knowledge graph at a specific point in time.
 * "What did we know about X on date Y?"
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Fase 9 - Bi-Temporal Model
 * ===================================================================
 */

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/lib/trpc'
import {
  Calendar,
  Search,
  Clock,
  FileText,
  ArrowRight,
  Loader2,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface WikiTemporalSearchProps {
  /** Whether the dialog is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Group ID for the wiki (e.g., 'wiki-ws-1') */
  groupId: string
  /** Callback when a result is selected */
  onResultSelect?: (result: TemporalSearchResult) => void
}

interface TemporalSearchResult {
  nodeId: string
  name: string
  type: string
  score: number
  pageId?: number
}

// =============================================================================
// Date Helpers
// =============================================================================

function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const dateParts = dateStr.split('-').map(Number)
  const timeParts = timeStr.split(':').map(Number)
  const year = dateParts[0] ?? 2026
  const month = (dateParts[1] ?? 1) - 1
  const day = dateParts[2] ?? 1
  const hours = timeParts[0] ?? 0
  const minutes = timeParts[1] ?? 0
  return new Date(year, month, day, hours, minutes)
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiTemporalSearch({
  open,
  onClose,
  groupId,
  onResultSelect,
}: WikiTemporalSearchProps) {
  // State
  const [query, setQuery] = useState('')
  const [asOfDate, setAsOfDate] = useState(formatDateForInput(new Date()))
  const [asOfTime, setAsOfTime] = useState(formatTimeForInput(new Date()))
  const [hasSearched, setHasSearched] = useState(false)

  // Build the ISO datetime string
  const asOfDatetime = combineDateAndTime(asOfDate, asOfTime).toISOString()

  // Temporal search query
  const searchQuery = trpc.graphiti.temporalSearch.useQuery(
    {
      query,
      groupId,
      asOf: asOfDatetime,
      limit: 20,
    },
    {
      enabled: hasSearched && query.length >= 2,
    }
  )

  // Handle search
  const handleSearch = useCallback(() => {
    if (query.length >= 2) {
      setHasSearched(true)
    }
  }, [query])

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Handle result click
  const handleResultClick = (result: TemporalSearchResult) => {
    onResultSelect?.(result)
    onClose()
  }

  // Quick date presets
  const setPresetDate = (daysAgo: number) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    setAsOfDate(formatDateForInput(date))
    setAsOfTime('23:59')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Temporal Search
          </DialogTitle>
          <DialogDescription>
            Search the knowledge graph at a specific point in time.
            "What did we know about X on date Y?"
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="space-y-4 border-b pb-4">
          {/* Query Input */}
          <div className="space-y-2">
            <Label htmlFor="temporal-query">Search Query</Label>
            <div className="flex gap-2">
              <Input
                id="temporal-query"
                placeholder="e.g., authentication, Robin, project deadline..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHasSearched(false)
                }}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={query.length < 2}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
          </div>

          {/* Date/Time Picker */}
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="temporal-date">As of Date</Label>
              <Input
                id="temporal-date"
                type="date"
                value={asOfDate}
                onChange={(e) => {
                  setAsOfDate(e.target.value)
                  setHasSearched(false)
                }}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temporal-time">Time</Label>
              <Input
                id="temporal-time"
                type="time"
                value={asOfTime}
                onChange={(e) => {
                  setAsOfTime(e.target.value)
                  setHasSearched(false)
                }}
                className="w-28"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAsOfDate(formatDateForInput(new Date()))
                  setAsOfTime(formatTimeForInput(new Date()))
                  setHasSearched(false)
                }}
              >
                Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetDate(1)}
              >
                Yesterday
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetDate(7)}
              >
                Week ago
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetDate(30)}
              >
                Month ago
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0">
          {!hasSearched ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  Enter a search query and select a date to see
                  <br />
                  what was known at that point in time.
                </p>
              </div>
            </div>
          ) : searchQuery.isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : searchQuery.error ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Info className="h-12 w-12 mx-auto mb-3 text-amber-500" />
                <p className="text-sm font-medium text-amber-600">
                  Temporal search requires the Graphiti service
                </p>
                <p className="text-xs mt-1">
                  The Python Graphiti service must be running for temporal queries.
                </p>
              </div>
            </div>
          ) : searchQuery.data?.results.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  No facts found for "{query}"
                  <br />
                  as of {new Date(asOfDatetime).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {searchQuery.data?.results.length} fact
                  {searchQuery.data?.results.length !== 1 ? 's' : ''} found
                  as of {new Date(asOfDatetime).toLocaleString()}
                </p>
                {searchQuery.data?.results.map((result, index) => (
                  <button
                    key={`${result.nodeId}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border',
                      'hover:bg-accent hover:border-accent-foreground/20',
                      'transition-colors'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {result.type}
                          </span>
                          <span className="font-medium truncate">
                            {result.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          Score: {(result.score * 100).toFixed(0)}%
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Info Footer */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Temporal search shows facts that were valid at the specified time.
            Facts may have been added or invalidated since then.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WikiTemporalSearch
