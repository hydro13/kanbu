/**
 * Wiki AI Module
 *
 * Exports for Wiki AI functionality.
 *
 * Fase 15.1 - Provider Koppeling
 * Fase 15.2 - Semantic Search (WikiEmbeddingService)
 * Fase 15.3 - Ask the Wiki (WikiRagService)
 * Fase 16.2 - Bi-temporal Date Extraction
 * Fase 16.3 - Contradiction Detection
 * Fase 17.2 - Enhanced Contradiction Detection
 * Fase 17.3 - Conflict Resolution & Audit Trail
 * Fase 19.2 - Edge Embeddings (WikiEdgeEmbeddingService)
 * Fase 21.3 - Node Embeddings (WikiNodeEmbeddingService)
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
  type EdgeDateExtractionResult,
  type ContradictionDetectionResult,
  // Fase 17.2 - Enhanced Detection
  type EnhancedContradictionDetectionResult,
  ContradictionCategory,
  type ContradictionDetail,
  // Fase 17.2 - Batch Detection
  type BatchContradictionDetectionResult,
  type BatchNewFact,
  type FilteredContradictions,
  // Fase 17.2 - Category Handling
  ResolutionAction,
  type CategoryHandlingConfig,
} from './WikiAiService'

// Fase 16.2 - Date Extraction Prompts
export {
  getExtractEdgeDatesSystemPrompt,
  getExtractEdgeDatesUserPrompt,
  parseExtractEdgeDatesResponse,
  calculateRelativeDate,
  type ExtractEdgeDatesContext,
  type ExtractedEdgeDates,
} from './prompts'

// Fase 16.3 - Contradiction Detection Prompts
export {
  getDetectContradictionsSystemPrompt,
  getDetectContradictionsUserPrompt,
  parseDetectContradictionsResponse,
  type ExistingFact,
  type DetectContradictionsContext,
  type ContradictionResult,
} from './prompts'

// Fase 17.2 - Enhanced Contradiction Detection Prompts
export {
  getEnhancedDetectContradictionsSystemPrompt,
  getEnhancedDetectContradictionsUserPrompt,
  parseEnhancedDetectContradictionsResponse,
  toBasicContradictionResult,
  type EnhancedContradictionResult,
} from './prompts'

// Fase 17.2 - Batch Contradiction Detection Prompts
export {
  MAX_BATCH_SIZE,
  getBatchDetectContradictionsSystemPrompt,
  getBatchDetectContradictionsUserPrompt,
  parseBatchDetectContradictionsResponse,
  type BatchFactResult,
  type BatchContradictionResult,
} from './prompts'

// Fase 17.2 - Category-Specific Handling
export {
  DEFAULT_CATEGORY_HANDLING,
  getResolutionAction,
  filterContradictionsByCategory,
  getContradictionNotification,
} from './prompts'

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

// Fase 17.3 - Conflict Resolution & Audit Trail
export {
  ContradictionAuditService,
  getContradictionAuditService,
  resetContradictionAuditService,
  ResolutionStrategy,
  DEFAULT_RESOLUTION_STRATEGIES,
  DEFAULT_WORKSPACE_RESOLUTION_CONFIG,
  type WorkspaceResolutionConfig,
  type ContradictionAuditEntry,
  type LogContradictionInput,
  type RevertResult,
} from './contradictionAudit'

// Fase 19.2 - Edge Embeddings
// Fase 19.4 - Search Integration (hybridSemanticSearch)
export {
  WikiEdgeEmbeddingService,
  getWikiEdgeEmbeddingService,
  resetWikiEdgeEmbeddingService,
  type WikiEdgeEmbeddingConfig,
  type EdgeEmbeddingPoint,
  type EdgeEmbeddingPayload,
  type EdgeSearchResult,
  type HybridSearchResult,
  type EdgeForEmbedding,
  type EdgeSearchOptions,
  type HybridSearchOptions,
  type BatchEmbeddingResult,
} from './WikiEdgeEmbeddingService'

// Fase 21.3 - Node Embeddings (Entity Resolution)
export {
  WikiNodeEmbeddingService,
  getWikiNodeEmbeddingService,
  resetWikiNodeEmbeddingService,
  type WikiNodeEmbeddingConfig,
  type EmbeddableNodeType,
  type NodeForEmbedding,
  type NodeEmbeddingPayload,
  type SimilarNodeResult,
  type SimilarNodeSearchOptions,
  type BatchNodeEmbeddingResult,
} from './WikiNodeEmbeddingService'
