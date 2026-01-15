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
 * Fase 22 - Entity Deduplication & Graph Cleanup
 * Fase 23 - Reflexion Extraction (Multi-Pass)
 * Fase 24 - Community Detection (Label Propagation)
 * Fase 25 - Text Chunking (Large Content Support)
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
  // Fase 25 - Text Chunking
  type ChunkedExtractionOptions,
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

// Fase 23.3 - Reflexion Extraction Prompts
export {
  getReflexionNodesSystemPrompt,
  getReflexionNodesUserPrompt,
  parseReflexionNodesResponse,
  getReflexionEdgesSystemPrompt,
  getReflexionEdgesUserPrompt,
  parseReflexionEdgesResponse,
  type ReflexionNodesContext,
  type ReflexionNodesResponse,
  type ExtractedFact,
  type ReflexionEdgesContext,
  type ReflexionEdgesResponse,
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

// Fase 22 - Entity Deduplication Types
export {
  // Core types
  type EntityNodeInfo,
  type DuplicateMatchType,
  type DuplicateCandidate,
  type DuplicateResolution,
  // Index types
  type DedupCandidateIndexes,
  type DedupResolutionState,
  // LLM response types
  type NodeDuplicateResponse,
  type NodeResolutionsResponse,
  type EdgeDuplicateResponse,
  // Edge types
  type DuplicateOfEdgeProps,
  // Service options
  type DeduplicationOptions,
  type DeduplicationResult,
  type BatchDeduplicationOptions,
  type BatchDeduplicationResult,
  // Constants
  DEDUP_CONSTANTS,
} from './types'

// Fase 23 - Reflexion Extraction Types
export {
  type MissedEntity,
  type NodeReflexionResult,
  type MissedFact,
  type EdgeReflexionResult,
  type ReflexionConfig,
  type ReflexionSyncResult,
  DEFAULT_REFLEXION_CONFIG,
} from './types'

// Fase 22.3 - Entity Deduplication Service
export {
  WikiDeduplicationService,
  getWikiDeduplicationService,
  resetWikiDeduplicationService,
} from './WikiDeduplicationService'

// Fase 24.2 - Community Detection Types
export {
  // Core types
  type CommunityNode,
  type CommunityMembership,
  // Algorithm types
  type LPNeighbor,
  type LPProjectionMap,
  type LPClusterResult,
  type LPConfig,
  DEFAULT_LP_CONFIG,
  // Service I/O types
  type DetectCommunitiesInput,
  type DetectCommunitiesOutput,
  type UpdateCommunitiesInput,
  type UpdateCommunitiesOutput,
  type GetCommunitiesInput,
  type GetCommunitiesOutput,
  type CommunityWithMembers,
  // LLM types
  type SummarizePairInput,
  type SummarizePairOutput,
  type GenerateCommunityNameInput,
  type GenerateCommunityNameOutput,
  type EntitySummary,
  // Cache types
  type CommunityCacheEntry,
  type CommunityCacheConfig,
  DEFAULT_CACHE_CONFIG,
  // FalkorDB types
  type FalkorCommunityNode,
  type FalkorHasMemberEdge,
  // UI types
  type CommunityDisplayData,
  type CommunityDetectionStatus,
  type CommunityDetectionProgress,
} from './types'

// Fase 24.3 - Label Propagation Algorithm
export {
  labelPropagation,
  buildProjectionFromEdges,
  getClusterStats,
  mergeSmallClusters,
} from './algorithms'

// Fase 24.4 - Community Summarization Prompts
export {
  getSummarizePairSystemPrompt,
  getSummarizePairUserPrompt,
  parseSummarizePairResponse,
  getGenerateCommunityNameSystemPrompt,
  getGenerateCommunityNameUserPrompt,
  parseGenerateCommunityNameResponse,
} from './prompts'

// Fase 24.5 - WikiClusterService
export {
  WikiClusterService,
  getWikiClusterService,
  resetWikiClusterService,
} from './WikiClusterService'

// Fase 25.1 - Text Chunking Service
export {
  ChunkingService,
  getChunkingService,
  resetChunkingService,
  CHUNK_CONFIG,
  type ChunkingConfig,
  type ContentChunk,
  type ChunkContext,
  type ChunkingResult,
} from './ChunkingService'
