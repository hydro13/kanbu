/**
 * Wiki AI Module
 *
 * Exports for Wiki AI functionality.
 *
 * Fase 15.1 - Provider Koppeling
 * Fase 15.2 - Semantic Search (WikiEmbeddingService)
 * Fase 15.3 - Ask the Wiki (WikiRagService)
 */

export {
  WikiAiService,
  WikiAiError,
  getWikiAiService,
  resetWikiAiService,
  type WikiContext,
  type EmbeddingResult,
  type EntityExtractionResult,
  type SummarizeResult,
  type WikiAiCapabilities,
} from './WikiAiService'

export {
  WikiEmbeddingService,
  getWikiEmbeddingService,
  resetWikiEmbeddingService,
  type WikiEmbeddingConfig,
  type WikiPageEmbedding,
  type SemanticSearchResult,
  type SemanticSearchOptions,
} from './WikiEmbeddingService'

export {
  WikiRagService,
  getWikiRagService,
  resetWikiRagService,
  type RagContext,
  type RagSource,
  type RagAnswer,
  type ConversationMessage,
  type Conversation,
  type AskWikiOptions,
} from './WikiRagService'
