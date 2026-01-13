/*
 * Wiki Components
 * Version: 1.4.0
 *
 * Exports all wiki-related components.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Modified: 2026-01-12
 * Change: Fase 15.3 - Added AskWikiDialog and AskWikiFab components
 * ===================================================================
 */

export { WikiSidebar } from './WikiSidebar'
export type { WikiPageNode, WikiPageStatus } from './WikiSidebar'

export { WikiPageView } from './WikiPageView'
export type { WikiPage, WikiBreadcrumb } from './WikiPageView'

export { WikiVersionHistory } from './WikiVersionHistory'

export { WikiSearchDialog } from './WikiSearchDialog'
export type { WikiPageForSearch, SearchMode } from './WikiSearchDialog'

export { WikiGraphView } from './WikiGraphView'

export { WikiTemporalSearch } from './WikiTemporalSearch'

export { AskWikiDialog, AskWikiFab } from './AskWikiDialog'

// Fase 17.4 - Contradiction UI
export { showContradictionToast, showBatchContradictionToasts } from './ContradictionToast'
export type {
  ContradictionData,
  ContradictionToastProps,
  ContradictionCategory,
  ResolutionStrategy,
} from './ContradictionToast'

export { ContradictionDialog } from './ContradictionDialog'
export type { ContradictionDetailData, ContradictionDialogProps } from './ContradictionDialog'

export { ContradictionHistory } from './ContradictionHistory'
export type { ContradictionAuditEntry, ContradictionHistoryProps } from './ContradictionHistory'

// Fase 17.5 - User-Triggered Fact Check
export { FactCheckDialog } from './FactCheckDialog'
export type {
  FactCheckEntity,
  RelatedFact,
  FactCheckResult,
  FactCheckDialogProps,
} from './FactCheckDialog'
