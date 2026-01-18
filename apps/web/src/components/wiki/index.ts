/*
 * Wiki Components
 * Version: 1.6.0
 *
 * Exports all wiki-related components.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Modified: 2026-01-14
 * Change: Fase 15.3 - Added AskWikiDialog and AskWikiFab components
 * Change: Fase 22 - Added WikiDuplicateBadge and WikiDuplicateManager components
 * Modified: 2026-01-15
 * Change: Fase 24.7 - Added ClusterLegend and ClusterDetailPanel components
 * ===================================================================
 */

export { WikiSidebar } from './WikiSidebar';
export type { WikiPageNode, WikiPageStatus } from './WikiSidebar';

export { WikiPageView } from './WikiPageView';
export type { WikiPage, WikiBreadcrumb } from './WikiPageView';

export { WikiVersionHistory } from './WikiVersionHistory';

export { WikiSearchDialog } from './WikiSearchDialog';
export type { WikiPageForSearch, SearchMode } from './WikiSearchDialog';

export { WikiGraphView } from './WikiGraphView';

export { WikiTemporalSearch } from './WikiTemporalSearch';

export { AskWikiDialog, AskWikiFab } from './AskWikiDialog';

// Fase 17.4 - Contradiction UI
export { showContradictionToast, showBatchContradictionToasts } from './ContradictionToast';
export type {
  ContradictionData,
  ContradictionToastProps,
  ContradictionCategory,
  ResolutionStrategy,
} from './ContradictionToast';

export { ContradictionDialog } from './ContradictionDialog';
export type { ContradictionDetailData, ContradictionDialogProps } from './ContradictionDialog';

export { ContradictionHistory } from './ContradictionHistory';
export type { ContradictionAuditEntry, ContradictionHistoryProps } from './ContradictionHistory';

// Fase 17.5 - User-Triggered Fact Check
export { FactCheckDialog } from './FactCheckDialog';
export type {
  FactCheckEntity,
  RelatedFact,
  FactCheckResult,
  FactCheckDialogProps,
} from './FactCheckDialog';

// Fase 22 - Entity Deduplication UI
export { WikiDuplicateBadge } from './WikiDuplicateBadge';
export type { WikiDuplicateBadgeProps, DuplicateInfo } from './WikiDuplicateBadge';

export { WikiDuplicateManager } from './WikiDuplicateManager';
export type { WikiDuplicateManagerProps } from './WikiDuplicateManager';

// Fase 24.7 - Community Detection UI
export { ClusterLegend } from './ClusterLegend';
export type { ClusterLegendProps } from './ClusterLegend';

export { ClusterDetailPanel } from './ClusterDetailPanel';
export type { ClusterDetailPanelProps } from './ClusterDetailPanel';
