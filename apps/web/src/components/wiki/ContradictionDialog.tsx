/**
 * Contradiction Dialog Component
 *
 * Fase 17.4 - UI Notifications & User Feedback
 *
 * Modal dialog showing detailed contradiction information with resolution options.
 * Used for:
 * - Viewing full details of a detected contradiction
 * - Manual resolution when strategy is ASK_USER
 * - Reviewing auto-resolved contradictions before confirming
 */

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  GitCompare,
  History,
  Undo2,
  X,
  Merge,
  Clock,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ContradictionCategory,
  ResolutionStrategy,
  type ContradictionData,
} from './ContradictionToast'

// =============================================================================
// Types
// =============================================================================

/**
 * Extended contradiction data with audit information
 */
export interface ContradictionDetailData extends ContradictionData {
  /** Unique identifier for the contradiction */
  id?: number
  /** When the contradiction was detected */
  detectedAt?: Date
  /** User who triggered the contradiction */
  triggeredBy?: {
    id: number
    name: string
  }
  /** Reasoning for the contradiction */
  reasoning?: string
  /** Whether the contradiction can still be reverted */
  canRevert?: boolean
  /** When the revert window expires */
  revertExpiresAt?: Date
}

export interface ContradictionDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog is closed */
  onOpenChange: (open: boolean) => void
  /** The contradiction to display */
  contradiction: ContradictionDetailData | null
  /** Whether resolution options should be shown (for ASK_USER strategy) */
  showResolutionOptions?: boolean
  /** Callback when user selects a resolution */
  onResolve?: (strategy: ResolutionStrategy) => Promise<void>
  /** Callback when user reverts a resolution */
  onRevert?: () => Promise<void>
  /** Callback to view full audit history */
  onViewHistory?: () => void
  /** Whether an action is in progress */
  isLoading?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get human-readable category label with icon
 */
function getCategoryInfo(category: ContradictionCategory): { label: string; description: string } {
  switch (category) {
    case ContradictionCategory.FACTUAL:
      return {
        label: 'Factual',
        description: 'Two mutually exclusive facts about the same subject',
      }
    case ContradictionCategory.ATTRIBUTE:
      return {
        label: 'Attribute',
        description: 'Different values for the same attribute',
      }
    case ContradictionCategory.TEMPORAL:
      return {
        label: 'Temporal',
        description: 'Overlapping time periods for exclusive facts',
      }
    case ContradictionCategory.SEMANTIC:
      return {
        label: 'Semantic',
        description: 'Meaning contradiction between statements',
      }
    default:
      return { label: 'Unknown', description: '' }
  }
}

/**
 * Get category badge styling
 */
function getCategoryBadgeClass(category: ContradictionCategory): string {
  switch (category) {
    case ContradictionCategory.FACTUAL:
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    case ContradictionCategory.ATTRIBUTE:
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
    case ContradictionCategory.TEMPORAL:
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    case ContradictionCategory.SEMANTIC:
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
    default:
      return ''
  }
}

/**
 * Get confidence level styling
 */
function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-600 dark:text-green-400'
  if (confidence >= 0.7) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// =============================================================================
// Sub-Components
// =============================================================================

interface FactCardProps {
  title: string
  fact: string
  isInvalidated?: boolean
  isNew?: boolean
}

function FactCard({ title, fact, isInvalidated, isNew }: FactCardProps) {
  return (
    <Card
      className={cn(
        'flex-1',
        isInvalidated && 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10',
        isNew && 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {isInvalidated && <X className="h-4 w-4 text-red-500" />}
          {isNew && <Check className="h-4 w-4 text-green-500" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'text-sm',
            isInvalidated && 'line-through opacity-60'
          )}
        >
          {fact}
        </p>
      </CardContent>
    </Card>
  )
}

interface ResolutionButtonProps {
  strategy: ResolutionStrategy
  label: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'outline' | 'destructive'
}

function ResolutionButton({
  label,
  description,
  icon,
  onClick,
  disabled,
  variant = 'outline',
}: ResolutionButtonProps) {
  return (
    <Button
      variant={variant}
      className="h-auto py-3 px-4 flex flex-col items-start gap-1 w-full"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="flex items-center gap-2 font-medium">
        {icon}
        {label}
      </span>
      <span className="text-xs font-normal text-muted-foreground text-left">
        {description}
      </span>
    </Button>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function ContradictionDialog({
  open,
  onOpenChange,
  contradiction,
  showResolutionOptions = false,
  onResolve,
  onRevert,
  onViewHistory,
  isLoading = false,
}: ContradictionDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy | null>(null)

  if (!contradiction) return null

  const categoryInfo = getCategoryInfo(contradiction.category)
  const confidencePercent = Math.round(contradiction.confidence * 100)
  const isAutoResolved = contradiction.strategy !== ResolutionStrategy.ASK_USER
  const canRevert = contradiction.canRevert ?? (contradiction.auditId !== undefined)

  const handleResolve = async (strategy: ResolutionStrategy) => {
    if (!onResolve) return
    setSelectedStrategy(strategy)
    await onResolve(strategy)
    setSelectedStrategy(null)
    onOpenChange(false)
  }

  const handleRevert = async () => {
    if (!onRevert) return
    await onRevert()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Contradiction {showResolutionOptions ? 'Detected' : 'Details'}
          </DialogTitle>
          <DialogDescription>
            {showResolutionOptions
              ? 'Choose how to resolve this conflict between facts.'
              : 'Review the details of this contradiction resolution.'}
          </DialogDescription>
        </DialogHeader>

        {/* Metadata Section */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className={getCategoryBadgeClass(contradiction.category)}>
            {categoryInfo.label}
          </Badge>
          <span className={cn('font-medium', getConfidenceClass(contradiction.confidence))}>
            {confidencePercent}% Confidence
          </span>
          {contradiction.detectedAt && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {format(contradiction.detectedAt, 'PPp')}
            </span>
          )}
          {contradiction.triggeredBy && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {contradiction.triggeredBy.name}
            </span>
          )}
        </div>

        {/* Category Description */}
        <p className="text-sm text-muted-foreground">
          {categoryInfo.description}
        </p>

        {/* Fact Comparison */}
        <div className="flex flex-col sm:flex-row gap-4">
          <FactCard
            title="Old Fact"
            fact={contradiction.invalidatedFact}
            isInvalidated={isAutoResolved && contradiction.strategy === ResolutionStrategy.INVALIDATE_OLD}
          />
          <div className="flex items-center justify-center">
            <GitCompare className="h-6 w-6 text-muted-foreground rotate-90 sm:rotate-0" />
          </div>
          <FactCard
            title="New Fact"
            fact={contradiction.newFact}
            isNew={isAutoResolved && contradiction.strategy === ResolutionStrategy.INVALIDATE_OLD}
            isInvalidated={isAutoResolved && contradiction.strategy === ResolutionStrategy.INVALIDATE_NEW}
          />
        </div>

        {/* Reasoning */}
        {contradiction.reasoning && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium mb-1">Analysis</p>
            <p className="text-sm text-muted-foreground">{contradiction.reasoning}</p>
          </div>
        )}

        {/* Resolution Options (for ASK_USER strategy) */}
        {showResolutionOptions && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Choose Resolution:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ResolutionButton
                strategy={ResolutionStrategy.INVALIDATE_OLD}
                label="Keep New Fact"
                description="Invalidate the old fact, keep the new one"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => handleResolve(ResolutionStrategy.INVALIDATE_OLD)}
                disabled={isLoading || selectedStrategy !== null}
                variant="default"
              />
              <ResolutionButton
                strategy={ResolutionStrategy.INVALIDATE_NEW}
                label="Keep Old Fact"
                description="Reject the new fact, keep the old one"
                icon={<Undo2 className="h-4 w-4" />}
                onClick={() => handleResolve(ResolutionStrategy.INVALIDATE_NEW)}
                disabled={isLoading || selectedStrategy !== null}
              />
              <ResolutionButton
                strategy={ResolutionStrategy.KEEP_BOTH}
                label="Keep Both"
                description="Mark as non-contradictory, keep both facts"
                icon={<Check className="h-4 w-4" />}
                onClick={() => handleResolve(ResolutionStrategy.KEEP_BOTH)}
                disabled={isLoading || selectedStrategy !== null}
              />
              <ResolutionButton
                strategy={ResolutionStrategy.MERGE}
                label="Merge Facts"
                description="Combine into a single, updated fact"
                icon={<Merge className="h-4 w-4" />}
                onClick={() => handleResolve(ResolutionStrategy.MERGE)}
                disabled={isLoading || selectedStrategy !== null}
              />
            </div>
          </div>
        )}

        {/* Auto-Resolution Status */}
        {!showResolutionOptions && isAutoResolved && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm">
              <span className="font-medium">Auto-resolved: </span>
              {contradiction.strategy === ResolutionStrategy.INVALIDATE_OLD && (
                <>The old fact was automatically invalidated based on high confidence.</>
              )}
              {contradiction.strategy === ResolutionStrategy.INVALIDATE_NEW && (
                <>The new fact was automatically rejected.</>
              )}
              {contradiction.strategy === ResolutionStrategy.KEEP_BOTH && (
                <>Both facts were kept as non-contradictory.</>
              )}
              {contradiction.strategy === ResolutionStrategy.MERGE && (
                <>The facts were merged.</>
              )}
            </p>
            {contradiction.revertExpiresAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Can be reverted until {format(contradiction.revertExpiresAt, 'PPp')}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onViewHistory && (
            <Button
              variant="outline"
              onClick={onViewHistory}
              disabled={isLoading}
            >
              <History className="h-4 w-4 mr-2" />
              View History
            </Button>
          )}
          {!showResolutionOptions && canRevert && onRevert && (
            <Button
              variant="outline"
              onClick={handleRevert}
              disabled={isLoading}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Undo Resolution
            </Button>
          )}
          <Button
            variant={showResolutionOptions ? 'outline' : 'default'}
            onClick={() => onOpenChange(false)}
            disabled={isLoading && showResolutionOptions}
          >
            {showResolutionOptions ? 'Decide Later' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
