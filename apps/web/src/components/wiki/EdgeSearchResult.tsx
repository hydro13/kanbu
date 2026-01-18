/*
 * Edge Search Result Component
 * Version: 1.0.0
 *
 * Displays edge (relationship) results from semantic search.
 * Shows the fact, source/target nodes, and edge type with
 * appropriate styling to distinguish from page results.
 *
 * Fase 19.4 - Search Integration
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Date: 2026-01-13
 * ===================================================================
 */

import { ArrowRight, Link2, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface EdgeSearchResultData {
  edgeId: string;
  score: number;
  fact: string;
  edgeType: string;
  sourceNodeId: string;
  targetNodeId: string;
  pageId: number;
  validAt?: string;
  invalidAt?: string;
}

interface EdgeSearchResultProps {
  result: EdgeSearchResultData;
  isSelected: boolean;
  onClick: () => void;
  onShowInGraph?: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getEdgeTypeInfo(edgeType: string): {
  label: string;
  icon: React.ReactNode;
  className: string;
} {
  switch (edgeType.toUpperCase()) {
    case 'MENTIONS':
      return {
        label: 'Mentions',
        icon: <Network className="h-3 w-3" />,
        className:
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      };
    case 'LINKS_TO':
      return {
        label: 'Links To',
        icon: <Link2 className="h-3 w-3" />,
        className:
          'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
      };
    default:
      return {
        label: edgeType,
        icon: <Network className="h-3 w-3" />,
        className:
          'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800',
      };
  }
}

function formatDate(isoString?: string): string | null {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

// =============================================================================
// Component
// =============================================================================

export function EdgeSearchResult({
  result,
  isSelected,
  onClick,
  onShowInGraph,
}: EdgeSearchResultProps) {
  const edgeTypeInfo = getEdgeTypeInfo(result.edgeType);
  const validFrom = formatDate(result.validAt);
  const validUntil = formatDate(result.invalidAt);

  return (
    <div
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2 rounded-md text-left transition-colors group',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      )}
    >
      <button onClick={onClick} className="flex items-start gap-3 flex-1 min-w-0">
        {/* Edge type badge */}
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1 text-[10px] px-1.5 py-0.5 flex-shrink-0 mt-0.5',
            edgeTypeInfo.className
          )}
        >
          {edgeTypeInfo.icon}
          {edgeTypeInfo.label}
        </Badge>

        <div className="flex-1 min-w-0">
          {/* Source → Target */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
            <span className="truncate max-w-[120px]" title={result.sourceNodeId}>
              {result.sourceNodeId}
            </span>
            <ArrowRight className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]" title={result.targetNodeId}>
              {result.targetNodeId}
            </span>
            {/* Score */}
            <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
              {Math.round(result.score * 100)}%
            </span>
          </div>

          {/* Fact description */}
          <p className="text-sm font-medium line-clamp-2">{result.fact}</p>

          {/* Temporal info */}
          {(validFrom || validUntil) && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {validFrom && !validUntil && `Valid since ${validFrom}`}
              {validFrom && validUntil && `${validFrom} - ${validUntil}`}
              {!validFrom && validUntil && `Until ${validUntil}`}
            </p>
          )}
        </div>
      </button>

      {/* Show in graph button */}
      {onShowInGraph && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowInGraph();
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-opacity flex-shrink-0"
          title="Show in graph"
        >
          <Network className="h-3.5 w-3.5 text-blue-500" />
        </button>
      )}
    </div>
  );
}

export default EdgeSearchResult;
