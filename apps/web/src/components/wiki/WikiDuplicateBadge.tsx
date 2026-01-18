/**
 * Wiki Duplicate Badge Component
 *
 * Fase 22 - Entity Deduplication UI
 *
 * Shows a badge indicating duplicate status for wiki entities.
 * - Shows count of duplicates
 * - Indicates if entity is a duplicate of another
 * - Click to open duplicate manager
 */

import { Copy, GitMerge, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface WikiDuplicateBadgeProps {
  /** UUID of the entity node */
  nodeUuid: string;
  /** Optional: show compact version */
  compact?: boolean;
  /** Callback when badge is clicked */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

export interface DuplicateInfo {
  uuid: string;
  name: string;
  type: string;
  direction: 'incoming' | 'outgoing';
}

// =============================================================================
// Component
// =============================================================================

export function WikiDuplicateBadge({
  nodeUuid,
  compact = false,
  onClick,
  className,
}: WikiDuplicateBadgeProps) {
  // Fetch duplicate information
  const { data, isLoading } = trpc.graphiti.getDuplicatesOf.useQuery(
    { nodeUuid },
    { enabled: !!nodeUuid }
  );

  // Don't render if no duplicates and not loading
  if (!isLoading && (!data || data.count === 0)) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Badge variant="outline" className={cn('animate-pulse', className)}>
        <Copy className="h-3 w-3 mr-1" />
        ...
      </Badge>
    );
  }

  const duplicates = data?.duplicates ?? [];

  // Count incoming (this is a duplicate of others) vs outgoing (others are duplicates of this)
  const incoming = duplicates.filter((d) => d.direction === 'incoming');
  const outgoing = duplicates.filter((d) => d.direction === 'outgoing');
  const totalCount = data?.count ?? 0;

  // Determine badge type
  const isDuplicateOfOther = incoming.length > 0;

  // Badge styling based on status
  const badgeClass = isDuplicateOfOther
    ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';

  // Compact version - just icon and count
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-6 px-2', className)}
              onClick={onClick}
            >
              {isDuplicateOfOther ? (
                <AlertCircle className="h-3 w-3 text-amber-500" />
              ) : (
                <Copy className="h-3 w-3 text-blue-500" />
              )}
              <span className="ml-1 text-xs">{totalCount}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDuplicateOfOther ? (
              <p>This entity is a duplicate of {incoming[0]?.name ?? 'another entity'}</p>
            ) : (
              <p>
                {outgoing.length} duplicate{outgoing.length !== 1 ? 's' : ''} found
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full badge with label
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('cursor-pointer', badgeClass, className)}
            onClick={onClick}
          >
            {isDuplicateOfOther ? (
              <>
                <GitMerge className="h-3 w-3 mr-1" />
                Duplicate
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                {totalCount} duplicate{totalCount !== 1 ? 's' : ''}
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {isDuplicateOfOther ? (
            <div className="space-y-1">
              <p className="font-medium">This is a duplicate of:</p>
              {incoming.map((dup) => (
                <p key={dup.uuid} className="text-sm text-muted-foreground">
                  {dup.name}
                </p>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">Duplicates of this entity:</p>
              {outgoing.slice(0, 3).map((dup) => (
                <p key={dup.uuid} className="text-sm text-muted-foreground">
                  {dup.name}
                </p>
              ))}
              {outgoing.length > 3 && (
                <p className="text-sm text-muted-foreground">+{outgoing.length - 3} more...</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">Click to manage</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
