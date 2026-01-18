/*
 * WorkflowStatusBadge Component
 * Version: 1.0.0
 *
 * Displays CI/CD workflow status on task cards.
 * Shows the latest workflow run status for a task.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 10 - CI/CD Integratie
 * =============================================================================
 */

import { trpc } from '@/lib/trpc';
import { CheckCircle2, XCircle, Loader2, GitBranch, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface WorkflowStatusBadgeProps {
  taskId: number;
  className?: string;
}

// =============================================================================
// Status Icon Component
// =============================================================================

function StatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  const iconClass = 'w-3.5 h-3.5';

  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return <CheckCircle2 className={cn(iconClass, 'text-green-500')} />;
      case 'failure':
        return <XCircle className={cn(iconClass, 'text-red-500')} />;
      case 'cancelled':
        return <AlertCircle className={cn(iconClass, 'text-gray-400')} />;
      default:
        return <AlertCircle className={cn(iconClass, 'text-gray-400')} />;
    }
  }

  if (status === 'in_progress') {
    return <Loader2 className={cn(iconClass, 'text-yellow-500 animate-spin')} />;
  }

  if (status === 'queued' || status === 'waiting') {
    return <Loader2 className={cn(iconClass, 'text-blue-400')} />;
  }

  return null;
}

// =============================================================================
// Main Component
// =============================================================================

export function WorkflowStatusBadge({ taskId, className }: WorkflowStatusBadgeProps) {
  const { data, isLoading } = trpc.github.getTaskWorkflowRuns.useQuery(
    { taskId, limit: 1 },
    {
      staleTime: 60000, // Cache for 1 minute
      refetchInterval: false, // Don't auto-refresh on cards
    }
  );

  // No workflow runs
  if (!isLoading && (!data?.runs || data.runs.length === 0)) {
    return null;
  }

  // Loading state - show nothing to avoid layout shift
  if (isLoading) {
    return null;
  }

  const latestRun = data?.runs[0];

  if (!latestRun) {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400',
        className
      )}
      title={`${latestRun.workflowName} #${latestRun.runNumber}: ${latestRun.conclusion || latestRun.status}`}
    >
      <GitBranch className="w-3 h-3" />
      <StatusIcon status={latestRun.status} conclusion={latestRun.conclusion} />
    </div>
  );
}

// =============================================================================
// Simple Git Branch Indicator (no API call)
// =============================================================================

interface GitBranchIndicatorProps {
  branchName: string | null;
  className?: string;
}

export function GitBranchIndicator({ branchName, className }: GitBranchIndicatorProps) {
  if (!branchName) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400',
        className
      )}
      title={`Branch: ${branchName}`}
    >
      <GitBranch className="w-3 h-3" />
    </div>
  );
}

export default WorkflowStatusBadge;
