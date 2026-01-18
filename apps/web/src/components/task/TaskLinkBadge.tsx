/*
 * TaskLinkBadge Component
 * Version: 1.0.0
 *
 * Blocked indicator and link count badge for TaskCard.
 * Shows visual feedback when a task is blocked by other tasks.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 91ee674b-91f8-407e-950b-e02721eb0de6
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T18:42 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { Ban, Link2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

// =============================================================================
// Types
// =============================================================================

export interface TaskLinkBadgeProps {
  taskId: number;
  showBlockedOnly?: boolean;
  size?: 'sm' | 'md';
}

export interface BlockedBadgeProps {
  isBlocked: boolean;
  blockingCount: number;
  size?: 'sm' | 'md';
}

export interface LinkCountBadgeProps {
  outgoingCount: number;
  incomingCount: number;
  size?: 'sm' | 'md';
}

// =============================================================================
// BlockedBadge Component
// =============================================================================

export function BlockedBadge({ isBlocked, blockingCount, size = 'sm' }: BlockedBadgeProps) {
  if (!isBlocked) return null;

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ${sizeClasses}`}
      title={`Blocked by ${blockingCount} task${blockingCount !== 1 ? 's' : ''}`}
    >
      <Ban className={iconSize} />
      <span>{blockingCount}</span>
    </div>
  );
}

// =============================================================================
// LinkCountBadge Component
// =============================================================================

export function LinkCountBadge({ outgoingCount, incomingCount, size = 'sm' }: LinkCountBadgeProps) {
  const totalCount = outgoingCount + incomingCount;

  if (totalCount === 0) return null;

  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ${sizeClasses}`}
      title={`${totalCount} link${totalCount !== 1 ? 's' : ''}`}
    >
      <Link2 className={iconSize} />
      <span>{totalCount}</span>
    </div>
  );
}

// =============================================================================
// TaskLinkBadge Component (with data fetching)
// =============================================================================

export function TaskLinkBadge({
  taskId,
  showBlockedOnly = false,
  size = 'sm',
}: TaskLinkBadgeProps) {
  // Fetch blocking info
  const blockingQuery = trpc.taskLink.getBlocking.useQuery(
    { taskId },
    { staleTime: 30000 } // Cache for 30 seconds
  );

  // Fetch link counts
  const linksQuery = trpc.taskLink.list.useQuery(
    { taskId },
    {
      staleTime: 30000,
      enabled: !showBlockedOnly,
    }
  );

  if (blockingQuery.isLoading) {
    return null;
  }

  const isBlocked = blockingQuery.data?.isBlocked ?? false;
  const blockingCount = blockingQuery.data?.blockingCount ?? 0;

  if (showBlockedOnly) {
    return <BlockedBadge isBlocked={isBlocked} blockingCount={blockingCount} size={size} />;
  }

  const outgoingCount = linksQuery.data?.outgoing?.length ?? 0;
  const incomingCount = linksQuery.data?.incoming?.length ?? 0;

  return (
    <div className="inline-flex items-center gap-1">
      <BlockedBadge isBlocked={isBlocked} blockingCount={blockingCount} size={size} />
      <LinkCountBadge outgoingCount={outgoingCount} incomingCount={incomingCount} size={size} />
    </div>
  );
}

// =============================================================================
// Lightweight version (no data fetching, pass data as props)
// =============================================================================

export interface TaskLinkBadgeLightProps {
  isBlocked?: boolean;
  blockingCount?: number;
  linkCount?: number;
  size?: 'sm' | 'md';
}

export function TaskLinkBadgeLight({
  isBlocked = false,
  blockingCount = 0,
  linkCount = 0,
  size = 'sm',
}: TaskLinkBadgeLightProps) {
  if (!isBlocked && linkCount === 0) return null;

  return (
    <div className="inline-flex items-center gap-1">
      <BlockedBadge isBlocked={isBlocked} blockingCount={blockingCount} size={size} />
      {linkCount > 0 && <LinkCountBadge outgoingCount={linkCount} incomingCount={0} size={size} />}
    </div>
  );
}

export default TaskLinkBadge;
