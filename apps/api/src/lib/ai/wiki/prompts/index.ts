/**
 * Wiki AI Prompts
 *
 * Centralized prompts for Wiki AI features
 *
 * Fase 16.2 - Date Extraction
 * Fase 16.3 - Contradiction Detection
 */

// Fase 16.2 - Date Extraction
export {
  getExtractEdgeDatesSystemPrompt,
  getExtractEdgeDatesUserPrompt,
  parseExtractEdgeDatesResponse,
  calculateRelativeDate,
  type ExtractEdgeDatesContext,
  type ExtractedEdgeDates,
} from './extractEdgeDates'

// Fase 16.3 - Contradiction Detection
export {
  getDetectContradictionsSystemPrompt,
  getDetectContradictionsUserPrompt,
  parseDetectContradictionsResponse,
  type ExistingFact,
  type DetectContradictionsContext,
  type ContradictionResult,
} from './detectContradictions'

// Fase 17.2 - Enhanced Contradiction Detection
export {
  ContradictionCategory,
  getEnhancedDetectContradictionsSystemPrompt,
  getEnhancedDetectContradictionsUserPrompt,
  parseEnhancedDetectContradictionsResponse,
  toBasicContradictionResult,
  type ContradictionDetail,
  type EnhancedContradictionResult,
} from './detectContradictions'

// Fase 17.2 - Batch Contradiction Detection
export {
  MAX_BATCH_SIZE,
  getBatchDetectContradictionsSystemPrompt,
  getBatchDetectContradictionsUserPrompt,
  parseBatchDetectContradictionsResponse,
  type BatchNewFact,
  type BatchFactResult,
  type BatchContradictionResult,
} from './detectContradictions'

// Fase 17.2 - Category-Specific Handling
export {
  ResolutionAction,
  DEFAULT_CATEGORY_HANDLING,
  getResolutionAction,
  filterContradictionsByCategory,
  getContradictionNotification,
  type CategoryHandlingConfig,
} from './detectContradictions'

// Fase 22.4 - Entity Deduplication
export {
  getDeduplicateNodesSystemPrompt,
  getDeduplicateNodesUserPrompt,
  parseDeduplicateNodesResponse,
  getDeduplicateEdgeSystemPrompt,
  getDeduplicateEdgeUserPrompt,
  parseDeduplicateEdgeResponse,
  type ExtractedNodeContext,
  type ExistingNodeContext,
  type DeduplicateNodesContext,
  type ExistingEdgeContext,
  type DeduplicateEdgeContext,
} from './deduplicateNodes'

// Fase 23.3 - Reflexion Extraction
export {
  getReflexionNodesSystemPrompt,
  getReflexionNodesUserPrompt,
  parseReflexionNodesResponse,
  type ReflexionNodesContext,
  type ReflexionNodesResponse,
} from './reflexionNodes'

export {
  getReflexionEdgesSystemPrompt,
  getReflexionEdgesUserPrompt,
  parseReflexionEdgesResponse,
  type ExtractedFact,
  type ReflexionEdgesContext,
  type ReflexionEdgesResponse,
} from './reflexionEdges'
