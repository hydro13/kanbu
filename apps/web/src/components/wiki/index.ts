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
