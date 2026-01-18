/**
 * ClusterLegend Component (Fase 24.7)
 *
 * Shows detected communities with AI-generated names
 *
 * Features:
 * - Color-coded legend matching graph visualization
 * - Clickable items to highlight community in graph
 * - Member count per community
 */

import { useCommunities } from '@/hooks/wiki';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ClusterLegendProps {
  /** Workspace ID for scoping */
  workspaceId: number;
  /** Optional project ID for project-level communities */
  projectId?: number;
  /** Callback when community is clicked */
  onCommunityClick?: (communityUuid: string) => void;
  /** Currently selected community UUID */
  selectedCommunityUuid?: string;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ClusterLegend({
  workspaceId,
  projectId,
  onCommunityClick,
  selectedCommunityUuid,
  className,
}: ClusterLegendProps) {
  const { data, isLoading } = useCommunities({
    workspaceId,
    projectId,
    includeMembers: false,
    minMembers: 2,
  });

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="animate-pulse text-muted-foreground">Loading clusters...</div>
      </div>
    );
  }

  if (!data || data.communities.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-muted-foreground text-sm">No communities detected</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 p-4', className)}>
      <h4 className="font-medium text-sm">Communities ({data.totalCount})</h4>
      <ul className="space-y-1 max-h-[400px] overflow-y-auto">
        {data.communities.map((community, index) => (
          <li
            key={community.uuid}
            className={cn(
              'flex items-center gap-2 p-2 rounded cursor-pointer',
              'hover:bg-muted transition-colors',
              selectedCommunityUuid === community.uuid && 'bg-muted'
            )}
            onClick={() => onCommunityClick?.(community.uuid)}
            title={community.name}
          >
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: getCommunityColor(index) }}
            />
            <span className="flex-1 text-sm truncate">{community.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{community.memberCount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get color for community by index
 * Uses a fixed palette that cycles
 */
function getCommunityColor(index: number): string {
  const colors = [
    '#4f46e5', // indigo
    '#0891b2', // cyan
    '#059669', // emerald
    '#d97706', // amber
    '#dc2626', // red
    '#7c3aed', // violet
    '#db2777', // pink
    '#2563eb', // blue
    '#16a34a', // green
    '#ea580c', // orange
  ];
  return colors[index % colors.length] || '#4f46e5';
}
