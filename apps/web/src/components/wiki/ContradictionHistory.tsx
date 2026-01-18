/**
 * Contradiction History Component
 *
 * Fase 17.4 - UI Notifications & User Feedback
 *
 * Displays a timeline/list view of contradiction resolutions.
 * Supports filtering by page, user, category, and date range.
 */

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Filter,
  History,
  Merge,
  Search,
  Undo2,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContradictionCategory, ResolutionStrategy } from './ContradictionToast';

// =============================================================================
// Types
// =============================================================================

/**
 * Audit entry for display in history
 */
export interface ContradictionAuditEntry {
  id: number;
  workspaceId: number;
  projectId: number | null;
  wikiPageId: number;
  wikiPageTitle?: string;
  userId: number;
  userName?: string;
  newFactId: string;
  newFact: string;
  invalidatedFacts: Array<{
    id: string;
    fact: string;
  }>;
  strategy: ResolutionStrategy;
  confidence: number;
  category: ContradictionCategory;
  reasoning: string | null;
  createdAt: Date;
  revertedAt: Date | null;
  revertedBy: number | null;
  revertedByName?: string;
  revertExpiresAt: Date;
  canRevert: boolean;
}

export interface ContradictionHistoryProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void;
  /** List of audit entries to display */
  entries: ContradictionAuditEntry[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when user wants to revert an entry */
  onRevert?: (entry: ContradictionAuditEntry) => Promise<void>;
  /** Callback when user clicks on an entry to view details */
  onViewDetails?: (entry: ContradictionAuditEntry) => void;
  /** Available wiki pages for filtering */
  wikiPages?: Array<{ id: number; title: string }>;
  /** Available users for filtering */
  users?: Array<{ id: number; name: string }>;
  /** Title for the dialog */
  title?: string;
  /** Description for the dialog */
  description?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getCategoryLabel(category: ContradictionCategory): string {
  switch (category) {
    case ContradictionCategory.FACTUAL:
      return 'Factual';
    case ContradictionCategory.ATTRIBUTE:
      return 'Attribute';
    case ContradictionCategory.TEMPORAL:
      return 'Temporal';
    case ContradictionCategory.SEMANTIC:
      return 'Semantic';
    default:
      return 'Unknown';
  }
}

function getCategoryBadgeClass(category: ContradictionCategory): string {
  switch (category) {
    case ContradictionCategory.FACTUAL:
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    case ContradictionCategory.ATTRIBUTE:
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
    case ContradictionCategory.TEMPORAL:
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    case ContradictionCategory.SEMANTIC:
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
    default:
      return '';
  }
}

function getStrategyIcon(strategy: ResolutionStrategy): React.ReactNode {
  switch (strategy) {
    case ResolutionStrategy.INVALIDATE_OLD:
      return <ArrowRight className="h-4 w-4" />;
    case ResolutionStrategy.INVALIDATE_NEW:
      return <Undo2 className="h-4 w-4" />;
    case ResolutionStrategy.KEEP_BOTH:
      return <Check className="h-4 w-4" />;
    case ResolutionStrategy.MERGE:
      return <Merge className="h-4 w-4" />;
    case ResolutionStrategy.ASK_USER:
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return null;
  }
}

function getStrategyLabel(strategy: ResolutionStrategy): string {
  switch (strategy) {
    case ResolutionStrategy.INVALIDATE_OLD:
      return 'Kept new fact';
    case ResolutionStrategy.INVALIDATE_NEW:
      return 'Kept old fact';
    case ResolutionStrategy.KEEP_BOTH:
      return 'Kept both facts';
    case ResolutionStrategy.MERGE:
      return 'Merged facts';
    case ResolutionStrategy.ASK_USER:
      return 'Pending decision';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// Timeline Entry Component
// =============================================================================

interface TimelineEntryProps {
  entry: ContradictionAuditEntry;
  onRevert?: (entry: ContradictionAuditEntry) => void;
  onViewDetails?: (entry: ContradictionAuditEntry) => void;
  isReverting?: boolean;
}

function TimelineEntry({ entry, onRevert, onViewDetails, isReverting }: TimelineEntryProps) {
  const isReverted = entry.revertedAt !== null;
  const canRevert = entry.canRevert && !isReverted;
  const confidencePercent = Math.round(entry.confidence * 100);

  return (
    <div
      className={cn(
        'relative pl-6 pb-6 border-l-2 border-muted last:pb-0',
        isReverted && 'opacity-60'
      )}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background',
          isReverted ? 'border-muted' : 'border-amber-500'
        )}
      >
        {isReverted && <X className="h-2 w-2 text-muted-foreground absolute top-0.5 left-0.5" />}
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={getCategoryBadgeClass(entry.category)}>
            {getCategoryLabel(entry.category)}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {getStrategyIcon(entry.strategy)}
            {getStrategyLabel(entry.strategy)}
          </span>
          <span className="text-xs text-muted-foreground">({confidencePercent}%)</span>
        </div>

        {/* Facts */}
        <div className="text-sm space-y-1">
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-10 flex-shrink-0">OLD:</span>
            <span className="line-through opacity-60">
              {entry.invalidatedFacts[0]?.fact || 'N/A'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-muted-foreground w-10 flex-shrink-0">NEW:</span>
            <span>{entry.newFact}</span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
          </span>
          {entry.userName && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {entry.userName}
            </span>
          )}
          {entry.wikiPageTitle && (
            <span className="truncate max-w-[200px]">in "{entry.wikiPageTitle}"</span>
          )}
        </div>

        {/* Reverted status */}
        {isReverted && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Reverted {entry.revertedByName ? `by ${entry.revertedByName}` : ''}{' '}
            {entry.revertedAt && formatDistanceToNow(entry.revertedAt, { addSuffix: true })}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(entry)}
              className="h-7 text-xs"
            >
              View Details
            </Button>
          )}
          {canRevert && onRevert && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRevert(entry)}
              disabled={isReverting}
              className="h-7 text-xs"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Undo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ContradictionHistory({
  open,
  onOpenChange,
  entries,
  isLoading = false,
  onRevert,
  onViewDetails,
  wikiPages = [],
  users = [],
  title = 'Contradiction History',
  description = 'View and manage past contradiction resolutions',
}: ContradictionHistoryProps) {
  const [revertingId, setRevertingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [showReverted, setShowReverted] = useState(false);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesFact =
          entry.newFact.toLowerCase().includes(query) ||
          entry.invalidatedFacts.some((f) => f.fact.toLowerCase().includes(query));
        const matchesPage = entry.wikiPageTitle?.toLowerCase().includes(query);
        const matchesUser = entry.userName?.toLowerCase().includes(query);
        if (!matchesFact && !matchesPage && !matchesUser) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;

      // Page filter
      if (pageFilter !== 'all' && entry.wikiPageId !== parseInt(pageFilter)) return false;

      // User filter
      if (userFilter !== 'all' && entry.userId !== parseInt(userFilter)) return false;

      // Show reverted
      if (!showReverted && entry.revertedAt !== null) return false;

      return true;
    });
  }, [entries, searchQuery, categoryFilter, pageFilter, userFilter, showReverted]);

  const handleRevert = async (entry: ContradictionAuditEntry) => {
    if (!onRevert) return;
    setRevertingId(entry.id);
    try {
      await onRevert(entry);
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pb-2 border-b">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search facts, pages, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value={ContradictionCategory.FACTUAL}>Factual</SelectItem>
              <SelectItem value={ContradictionCategory.ATTRIBUTE}>Attribute</SelectItem>
              <SelectItem value={ContradictionCategory.TEMPORAL}>Temporal</SelectItem>
              <SelectItem value={ContradictionCategory.SEMANTIC}>Semantic</SelectItem>
            </SelectContent>
          </Select>

          {/* Page Filter */}
          {wikiPages.length > 0 && (
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Wiki Page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {wikiPages.map((page) => (
                  <SelectItem key={page.id} value={page.id.toString()}>
                    {page.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* User Filter */}
          {users.length > 0 && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <User className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Show Reverted Toggle */}
          <Button
            variant={showReverted ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowReverted(!showReverted)}
            className="h-9"
          >
            {showReverted ? 'Hide Reverted' : 'Show Reverted'}
          </Button>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading history...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p>No contradiction resolutions found</p>
              {(searchQuery ||
                categoryFilter !== 'all' ||
                pageFilter !== 'all' ||
                userFilter !== 'all') && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setPageFilter('all');
                    setUserFilter('all');
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-xs text-muted-foreground mb-4">
                {filteredEntries.length} resolution{filteredEntries.length !== 1 ? 's' : ''} found
              </p>
              {filteredEntries.map((entry) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  onRevert={onRevert ? handleRevert : undefined}
                  onViewDetails={onViewDetails}
                  isReverting={revertingId === entry.id}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
