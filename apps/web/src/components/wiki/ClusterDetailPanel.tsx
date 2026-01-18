/**
 * ClusterDetailPanel Component (Fase 24.7)
 *
 * Detail view for a community
 *
 * Features:
 * - Full community summary
 * - List of member entities
 * - Update communities button (regenerates clusters)
 */

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunityDetails, useUpdateCommunities } from '@/hooks/wiki';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ClusterDetailPanelProps {
  /** Community UUID to display */
  communityUuid: string | null;
  /** Optional workspace ID for update operation */
  workspaceId?: number;
  /** Optional project ID for update operation */
  projectId?: number;
  /** Callback when a member entity is clicked */
  onMemberClick?: (entityUuid: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ClusterDetailPanel({
  communityUuid,
  workspaceId,
  projectId,
  onMemberClick,
  className,
}: ClusterDetailPanelProps) {
  const { data, isLoading } = useCommunityDetails(communityUuid);
  const updateMutation = useUpdateCommunities();

  const handleUpdate = () => {
    if (!workspaceId) {
      console.warn('Cannot update communities without workspaceId');
      return;
    }

    updateMutation.mutate({
      workspaceId,
      projectId,
      forceRecalculate: true,
    });
  };

  if (!communityUuid) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-muted-foreground text-sm">Select a community to view details</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <div className="animate-pulse text-muted-foreground">Loading community details...</div>
      </div>
    );
  }

  if (!data?.community) {
    return (
      <div className={cn('p-4', className)}>
        <div className="text-muted-foreground text-sm">Community not found</div>
      </div>
    );
  }

  const { community, members } = data;

  return (
    <div className={cn('space-y-4 p-4', className)}>
      {/* Community Info */}
      <div>
        <h3 className="font-semibold text-lg mb-1">{community.name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{community.summary}</p>
      </div>

      {/* Actions */}
      {workspaceId && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', updateMutation.isPending && 'animate-spin')} />
            {updateMutation.isPending ? 'Updating...' : 'Update Communities'}
          </Button>
        </div>
      )}

      {/* Members List */}
      <div>
        <h4 className="font-medium text-sm mb-2">Members ({members.length})</h4>
        <ul className="space-y-1 max-h-[300px] overflow-y-auto">
          {members.map((member) => (
            <li
              key={member.uuid}
              className={cn(
                'p-2 rounded text-sm',
                onMemberClick && 'hover:bg-muted cursor-pointer transition-colors'
              )}
              onClick={() => onMemberClick?.(member.uuid)}
            >
              <div className="font-medium">{member.name}</div>
              <div className="text-xs text-muted-foreground">{member.type}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Metadata */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        <div>Created: {new Date(community.createdAt).toLocaleDateString()}</div>
        <div>Updated: {new Date(community.updatedAt).toLocaleDateString()}</div>
      </div>
    </div>
  );
}
