/**
 * Contradiction Toast Component
 *
 * Fase 17.4 - UI Notifications & User Feedback
 *
 * Shows toast notifications when contradictions are detected and auto-resolved.
 * Provides quick actions: View Details, Undo, OK
 */

import { toast } from 'sonner';
import { AlertTriangle, Eye, Undo2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

/**
 * Contradiction category enum (mirrors API)
 */
export enum ContradictionCategory {
  SEMANTIC = 'SEMANTIC',
  TEMPORAL = 'TEMPORAL',
  FACTUAL = 'FACTUAL',
  ATTRIBUTE = 'ATTRIBUTE',
}

/**
 * Resolution strategy enum (mirrors API)
 */
export enum ResolutionStrategy {
  INVALIDATE_OLD = 'INVALIDATE_OLD',
  INVALIDATE_NEW = 'INVALIDATE_NEW',
  KEEP_BOTH = 'KEEP_BOTH',
  MERGE = 'MERGE',
  ASK_USER = 'ASK_USER',
}

/**
 * Contradiction data for the toast
 */
export interface ContradictionData {
  /** The new fact that was added */
  newFact: string;
  /** The invalidated old fact */
  invalidatedFact: string;
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
  /** Type of contradiction */
  category: ContradictionCategory;
  /** Resolution strategy that was applied */
  strategy: ResolutionStrategy;
  /** Audit entry ID for undo functionality */
  auditId?: number;
}

export interface ContradictionToastProps {
  /** The contradiction data to display */
  contradiction: ContradictionData;
  /** Callback when "View Details" is clicked */
  onViewDetails?: () => void;
  /** Callback when "Undo" is clicked */
  onUndo?: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get human-readable category label
 */
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

/**
 * Get category badge variant
 */
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

/**
 * Get resolution strategy label
 */
function getStrategyLabel(strategy: ResolutionStrategy): string {
  switch (strategy) {
    case ResolutionStrategy.INVALIDATE_OLD:
      return 'Old fact invalidated';
    case ResolutionStrategy.INVALIDATE_NEW:
      return 'New fact rejected';
    case ResolutionStrategy.KEEP_BOTH:
      return 'Both facts kept';
    case ResolutionStrategy.MERGE:
      return 'Facts merged';
    case ResolutionStrategy.ASK_USER:
      return 'Awaiting your decision';
    default:
      return 'Resolved';
  }
}

// =============================================================================
// Toast Content Component
// =============================================================================

interface ToastContentProps {
  contradiction: ContradictionData;
  onViewDetails?: () => void;
  onUndo?: () => void;
  toastId: string | number;
}

function ToastContent({ contradiction, onViewDetails, onUndo, toastId }: ToastContentProps) {
  const confidencePercent = Math.round(contradiction.confidence * 100);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <span className="font-semibold text-foreground">Conflict Detected</span>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground">New fact conflicts with existing information:</p>

      {/* Fact Comparison */}
      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="font-medium text-muted-foreground w-10">OLD:</span>
          <span className="text-foreground line-through opacity-70">
            {contradiction.invalidatedFact}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="font-medium text-muted-foreground w-10">NEW:</span>
          <span className="text-foreground">{contradiction.newFact}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Confidence: {confidencePercent}%</span>
        <span className="text-muted-foreground">|</span>
        <Badge variant="outline" className={getCategoryBadgeClass(contradiction.category)}>
          {getCategoryLabel(contradiction.category)}
        </Badge>
      </div>

      {/* Resolution Status */}
      <p className="text-sm text-muted-foreground italic">
        {getStrategyLabel(contradiction.strategy)}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-1">
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onViewDetails();
              toast.dismiss(toastId);
            }}
            className="h-8"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View Details
          </Button>
        )}
        {onUndo && contradiction.auditId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onUndo();
              toast.dismiss(toastId);
            }}
            className="h-8"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Undo
          </Button>
        )}
        <Button variant="default" size="sm" onClick={() => toast.dismiss(toastId)} className="h-8">
          <Check className="h-3.5 w-3.5 mr-1" />
          OK
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Function: Show Contradiction Toast
// =============================================================================

/**
 * Show a contradiction notification toast
 *
 * @example
 * ```tsx
 * showContradictionToast({
 *   contradiction: {
 *     newFact: 'Jan works at TechStart',
 *     invalidatedFact: 'Jan works at Acme Corp',
 *     confidence: 0.95,
 *     category: ContradictionCategory.FACTUAL,
 *     strategy: ResolutionStrategy.INVALIDATE_OLD,
 *     auditId: 123,
 *   },
 *   onViewDetails: () => setShowDialog(true),
 *   onUndo: () => handleUndo(123),
 * })
 * ```
 */
export function showContradictionToast({
  contradiction,
  onViewDetails,
  onUndo,
}: ContradictionToastProps): string | number {
  // High confidence contradictions get persistent toast
  const isPersistent = contradiction.confidence >= 0.8;

  return toast.custom(
    (toastId) => (
      <ToastContent
        contradiction={contradiction}
        onViewDetails={onViewDetails}
        onUndo={onUndo}
        toastId={toastId}
      />
    ),
    {
      duration: isPersistent ? Infinity : 10000,
      className: 'w-[400px] max-w-[90vw] bg-background border rounded-lg p-4 shadow-lg',
    }
  );
}

/**
 * Show multiple contradiction toasts for batch resolution
 *
 * @param contradictions Array of contradiction data
 * @param handlers Common handlers for all toasts
 */
export function showBatchContradictionToasts(
  contradictions: ContradictionData[],
  handlers: {
    onViewDetails?: (index: number) => void;
    onUndo?: (auditId: number) => void;
  }
): void {
  if (contradictions.length === 0) return;

  if (contradictions.length === 1) {
    const firstContradiction = contradictions[0]!;
    showContradictionToast({
      contradiction: firstContradiction,
      onViewDetails: handlers.onViewDetails ? () => handlers.onViewDetails!(0) : undefined,
      onUndo:
        handlers.onUndo && firstContradiction.auditId
          ? () => handlers.onUndo!(firstContradiction.auditId!)
          : undefined,
    });
    return;
  }

  // For multiple contradictions, show a summary toast
  toast.warning(`${contradictions.length} conflicts detected and resolved`, {
    description: 'Click to view details',
    duration: Infinity,
    action: handlers.onViewDetails
      ? {
          label: 'View All',
          onClick: () => handlers.onViewDetails!(0),
        }
      : undefined,
  });
}
