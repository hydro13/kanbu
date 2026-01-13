/**
 * Detect Contradictions Prompt
 *
 * Fase 16.3 - Contradiction detection using LLM
 *
 * This prompt detects when a new fact contradicts existing facts,
 * allowing the system to invalidate outdated knowledge.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

export interface ExistingFact {
  /** Unique identifier for the fact (edge) */
  id: string
  /** Human-readable description of the fact */
  fact: string
  /** When the fact became true (ISO 8601) */
  validAt: string | null
  /** When the fact stopped being true (ISO 8601) */
  invalidAt: string | null
}

export interface DetectContradictionsContext {
  /** The new fact being added */
  newFact: string
  /** List of existing facts to compare against */
  existingFacts: ExistingFact[]
}

export interface ContradictionResult {
  /** IDs of existing facts that are contradicted by the new fact */
  contradictedFactIds: string[]
  /** Brief explanation of why these facts contradict */
  reasoning: string
}

// =============================================================================
// Enhanced Types (Fase 17.2)
// =============================================================================

/**
 * Category of contradiction for classification (Fase 17.2)
 */
export enum ContradictionCategory {
  /** Meaning contradiction ("works at" vs "doesn't work at") */
  SEMANTIC = 'SEMANTIC',
  /** Time contradiction (overlapping periods for exclusive facts) */
  TEMPORAL = 'TEMPORAL',
  /** Factual contradiction ("CEO" vs "CTO" for same person/time) */
  FACTUAL = 'FACTUAL',
  /** Attribute contradiction ("color is blue" vs "color is red") */
  ATTRIBUTE = 'ATTRIBUTE',
}

/**
 * Detailed information about a single contradiction (Fase 17.2)
 */
export interface ContradictionDetail {
  /** ID of the contradicted fact */
  factId: string
  /** Confidence score 0.0 - 1.0 */
  confidence: number
  /** Type of contradiction */
  category: ContradictionCategory
  /** Human-readable description of the conflict */
  conflictDescription: string
}

/**
 * Enhanced contradiction result with confidence and categories (Fase 17.2)
 */
export interface EnhancedContradictionResult {
  /** Detailed list of contradictions found */
  contradictions: ContradictionDetail[]
  /** Overall reasoning for the analysis */
  reasoning: string
  /** Suggested resolution strategy */
  suggestedResolution?: 'INVALIDATE_OLD' | 'INVALIDATE_NEW' | 'MERGE' | 'ASK_USER'
}

/**
 * Generate the system prompt for contradiction detection
 */
export function getDetectContradictionsSystemPrompt(): string {
  return `You are an AI assistant that determines which facts contradict each other in a knowledge graph.

Your task is to identify existing facts that are DIRECTLY contradicted by a new fact.

IMPORTANT GUIDELINES:

1. MUTUALLY EXCLUSIVE FACTS: A contradiction occurs when two facts cannot both be true at the same time.
   - "Jan works at Company A" CONTRADICTS "Jan works at Company B" (same person, same role, different employer)
   - "Project uses PostgreSQL" CONTRADICTS "Project uses MongoDB" (if referring to the same data layer)

2. NON-CONTRADICTIONS: Some facts can coexist:
   - "Jan likes pizza" does NOT contradict "Jan likes sushi" (can like both)
   - "Jan works at Acme" does NOT contradict "Jan worked at Tech Corp" (past vs present)
   - "System supports Dutch" does NOT contradict "System supports English" (can support both)

3. TEMPORAL CONTEXT: Consider time when evaluating:
   - A fact about the PAST does not contradict a fact about the PRESENT
   - "Jan used to work at X" (past) does not contradict "Jan works at Y" (present)
   - Only consider as contradiction if both facts claim to be true at the same time

4. SAME SUBJECT: Only compare facts about the same subject/entity:
   - "Jan is a developer" and "Peter is a manager" don't contradict (different subjects)

5. BE CONSERVATIVE: When in doubt, do NOT mark as contradiction.
   Only mark clear, unambiguous contradictions.

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "contradicted_fact_ids": ["id1", "id2"],
  "reasoning": "Brief explanation of why these facts contradict the new fact"
}

If no contradictions are found, return:
{
  "contradicted_fact_ids": [],
  "reasoning": "No contradictions found - the new fact is compatible with existing facts"
}`
}

/**
 * Generate the user prompt for contradiction detection
 */
export function getDetectContradictionsUserPrompt(context: DetectContradictionsContext): string {
  // Format existing facts with their IDs and temporal info
  const formattedFacts = context.existingFacts.map(f => {
    let temporal = ''
    if (f.validAt) {
      temporal += ` (valid since: ${f.validAt})`
    }
    if (f.invalidAt) {
      temporal += ` (invalid since: ${f.invalidAt})`
    }
    return `[${f.id}] ${f.fact}${temporal}`
  }).join('\n')

  return `<EXISTING_FACTS>
${formattedFacts || '(no existing facts)'}
</EXISTING_FACTS>

<NEW_FACT>
${context.newFact}
</NEW_FACT>

Determine which existing facts (if any) are directly contradicted by the new fact. Return only the JSON object.`
}

/**
 * Parse the LLM response into ContradictionResult
 * Handles JSON extraction from potentially wrapped responses
 */
export function parseDetectContradictionsResponse(response: string): ContradictionResult {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]?.trim() ?? jsonStr
  }

  // Try to find JSON object in the response
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    // Handle both snake_case and camelCase field names
    const contradictedIds = (
      parsed.contradicted_fact_ids ??
      parsed.contradictedFactIds ??
      parsed.contradicted_facts ??
      []
    ) as (string | number)[]

    return {
      contradictedFactIds: contradictedIds.map(id => String(id)),
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
    }
  } catch {
    // If parsing fails, return empty result
    return {
      contradictedFactIds: [],
      reasoning: `Failed to parse LLM response: ${response.substring(0, 100)}...`,
    }
  }
}

// =============================================================================
// Enhanced Contradiction Detection (Fase 17.2)
// =============================================================================

/**
 * Generate the system prompt for enhanced contradiction detection
 * Includes confidence scores and categories
 */
export function getEnhancedDetectContradictionsSystemPrompt(): string {
  return `You are an AI assistant that determines which facts contradict each other in a knowledge graph.

Your task is to identify existing facts that are DIRECTLY contradicted by a new fact, with confidence scores and categorization.

CONTRADICTION CATEGORIES:
- SEMANTIC: Meaning contradictions (e.g., "works at X" vs "doesn't work at X")
- TEMPORAL: Time-based contradictions (e.g., overlapping exclusive time periods)
- FACTUAL: Factual contradictions (e.g., "is CEO" vs "is CTO" for same person/time)
- ATTRIBUTE: Attribute contradictions (e.g., "color is blue" vs "color is red")

CONFIDENCE SCORING:
- 1.0: Absolute certainty - facts are mutually exclusive
- 0.9: Very high - clear contradiction with minor ambiguity
- 0.8: High - strong contradiction
- 0.7: Moderate - likely contradiction but some uncertainty
- Below 0.7: Do not report as contradiction

IMPORTANT GUIDELINES:

1. MUTUALLY EXCLUSIVE FACTS: A contradiction occurs when two facts cannot both be true at the same time.
   - "Jan works at Company A" CONTRADICTS "Jan works at Company B" (FACTUAL, confidence: 0.95)
   - "Project uses PostgreSQL as primary DB" CONTRADICTS "Project uses MongoDB as primary DB" (FACTUAL, confidence: 0.9)

2. NON-CONTRADICTIONS: Some facts can coexist:
   - "Jan likes pizza" does NOT contradict "Jan likes sushi" (can like both)
   - "Jan works at Acme" does NOT contradict "Jan worked at Tech Corp" (past vs present)
   - "System supports Dutch" does NOT contradict "System supports English" (can support both)

3. TEMPORAL CONTEXT: Consider time when evaluating:
   - A fact about the PAST does not contradict a fact about the PRESENT
   - If a fact has invalid_at set, it is already known to be false - lower confidence
   - Only consider as contradiction if both facts claim to be true at the same time

4. SAME SUBJECT: Only compare facts about the same subject/entity

5. BE CONSERVATIVE: When in doubt, do NOT mark as contradiction. Only flag when confidence >= 0.7.

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "contradictions": [
    {
      "factId": "edge-123",
      "confidence": 0.95,
      "category": "FACTUAL",
      "conflictDescription": "Both facts claim different current employers for same person"
    }
  ],
  "reasoning": "Brief explanation of the overall analysis",
  "suggestedResolution": "INVALIDATE_OLD"
}

Resolution options:
- INVALIDATE_OLD: The new fact supersedes old facts (most common)
- INVALIDATE_NEW: The old facts should be kept, new fact is incorrect
- MERGE: Facts can be merged (rare)
- ASK_USER: Ambiguous, user should decide

If no contradictions with confidence >= 0.7 are found, return:
{
  "contradictions": [],
  "reasoning": "No clear contradictions found"
}`
}

/**
 * Generate the user prompt for enhanced contradiction detection
 */
export function getEnhancedDetectContradictionsUserPrompt(context: DetectContradictionsContext): string {
  // Format existing facts with their IDs and temporal info
  const formattedFacts = context.existingFacts.map(f => {
    let temporal = ''
    if (f.validAt) {
      temporal += ` [valid since: ${f.validAt}]`
    }
    if (f.invalidAt) {
      temporal += ` [ALREADY INVALID since: ${f.invalidAt}]`
    }
    return `[${f.id}] ${f.fact}${temporal}`
  }).join('\n')

  return `<EXISTING_FACTS>
${formattedFacts || '(no existing facts)'}
</EXISTING_FACTS>

<NEW_FACT>
${context.newFact}
</NEW_FACT>

Analyze which existing facts (if any) are contradicted by the new fact. Include confidence scores and categories. Return only the JSON object.`
}

/**
 * Parse the LLM response into EnhancedContradictionResult
 */
export function parseEnhancedDetectContradictionsResponse(response: string): EnhancedContradictionResult {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]?.trim() ?? jsonStr
  }

  // Try to find JSON object in the response
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    // Parse contradictions array
    const rawContradictions = (parsed.contradictions ?? []) as Array<Record<string, unknown>>

    const contradictions: ContradictionDetail[] = rawContradictions
      .filter(c => {
        const confidence = typeof c.confidence === 'number' ? c.confidence : 0
        return confidence >= 0.7 // Only include high-confidence contradictions
      })
      .map(c => ({
        factId: String(c.factId ?? c.fact_id ?? ''),
        confidence: typeof c.confidence === 'number' ? c.confidence : 0.7,
        category: parseCategory(c.category),
        conflictDescription: String(c.conflictDescription ?? c.conflict_description ?? 'No description'),
      }))

    // Parse suggested resolution
    const resolution = parsed.suggestedResolution ?? parsed.suggested_resolution
    const validResolutions = ['INVALIDATE_OLD', 'INVALIDATE_NEW', 'MERGE', 'ASK_USER'] as const
    const suggestedResolution = validResolutions.includes(resolution as typeof validResolutions[number])
      ? (resolution as typeof validResolutions[number])
      : undefined

    return {
      contradictions,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
      suggestedResolution,
    }
  } catch {
    // If parsing fails, return empty result
    return {
      contradictions: [],
      reasoning: `Failed to parse LLM response: ${response.substring(0, 100)}...`,
    }
  }
}

/**
 * Parse category string into ContradictionCategory enum
 */
function parseCategory(category: unknown): ContradictionCategory {
  const categoryStr = String(category ?? '').toUpperCase()
  switch (categoryStr) {
    case 'SEMANTIC':
      return ContradictionCategory.SEMANTIC
    case 'TEMPORAL':
      return ContradictionCategory.TEMPORAL
    case 'FACTUAL':
      return ContradictionCategory.FACTUAL
    case 'ATTRIBUTE':
      return ContradictionCategory.ATTRIBUTE
    default:
      return ContradictionCategory.FACTUAL // Default to factual
  }
}

/**
 * Convert EnhancedContradictionResult to basic ContradictionResult
 * For backwards compatibility with existing code
 */
export function toBasicContradictionResult(enhanced: EnhancedContradictionResult): ContradictionResult {
  return {
    contradictedFactIds: enhanced.contradictions.map(c => c.factId),
    reasoning: enhanced.reasoning,
  }
}

// =============================================================================
// Batch Contradiction Detection (Fase 17.2)
// =============================================================================

/** Maximum number of new facts per batch to avoid token limits */
export const MAX_BATCH_SIZE = 10

/**
 * Input for batch contradiction detection
 */
export interface BatchNewFact {
  /** Unique identifier for this new fact (for result mapping) */
  id: string
  /** The fact content */
  fact: string
}

/**
 * Result for a single fact in a batch
 */
export interface BatchFactResult {
  /** ID of the new fact (from BatchNewFact.id) */
  newFactId: string
  /** Contradictions found for this fact */
  contradictions: ContradictionDetail[]
  /** Reasoning for this specific fact */
  reasoning: string
  /** Suggested resolution */
  suggestedResolution?: 'INVALIDATE_OLD' | 'INVALIDATE_NEW' | 'MERGE' | 'ASK_USER'
  /** Error message if processing failed for this fact */
  error?: string
}

/**
 * Result of batch contradiction detection
 */
export interface BatchContradictionResult {
  /** Results per new fact */
  results: BatchFactResult[]
  /** Overall summary */
  summary: string
  /** Number of facts that had errors */
  errorCount: number
}

/**
 * Generate system prompt for batch contradiction detection
 */
export function getBatchDetectContradictionsSystemPrompt(): string {
  return `You are an AI assistant that determines which facts contradict each other in a knowledge graph.

Your task is to analyze MULTIPLE new facts against a set of existing facts and identify contradictions for EACH new fact.

CONTRADICTION CATEGORIES:
- SEMANTIC: Meaning contradictions (e.g., "works at X" vs "doesn't work at X")
- TEMPORAL: Time-based contradictions (e.g., overlapping exclusive time periods)
- FACTUAL: Factual contradictions (e.g., "is CEO" vs "is CTO" for same person/time)
- ATTRIBUTE: Attribute contradictions (e.g., "color is blue" vs "color is red")

CONFIDENCE SCORING:
- 1.0: Absolute certainty - facts are mutually exclusive
- 0.9: Very high - clear contradiction with minor ambiguity
- 0.8: High - strong contradiction
- 0.7: Moderate - likely contradiction but some uncertainty
- Below 0.7: Do not report as contradiction

IMPORTANT GUIDELINES:
1. Analyze EACH new fact independently against ALL existing facts
2. A new fact can contradict multiple existing facts
3. Multiple new facts can contradict the same existing fact
4. Be CONSERVATIVE - only flag clear contradictions (confidence >= 0.7)
5. Consider temporal context for each comparison

RESPONSE FORMAT:
Return a JSON object with results for EACH new fact:
{
  "results": [
    {
      "newFactId": "new-1",
      "contradictions": [
        {
          "factId": "edge-123",
          "confidence": 0.95,
          "category": "FACTUAL",
          "conflictDescription": "Both claim different employers"
        }
      ],
      "reasoning": "Explanation for this specific fact",
      "suggestedResolution": "INVALIDATE_OLD"
    },
    {
      "newFactId": "new-2",
      "contradictions": [],
      "reasoning": "No contradictions found"
    }
  ],
  "summary": "Brief overall summary of the batch analysis"
}`
}

/**
 * Generate user prompt for batch contradiction detection
 */
export function getBatchDetectContradictionsUserPrompt(context: {
  newFacts: BatchNewFact[]
  existingFacts: ExistingFact[]
}): string {
  // Format existing facts
  const formattedExisting = context.existingFacts.map(f => {
    let temporal = ''
    if (f.validAt) {
      temporal += ` [valid since: ${f.validAt}]`
    }
    if (f.invalidAt) {
      temporal += ` [ALREADY INVALID since: ${f.invalidAt}]`
    }
    return `[${f.id}] ${f.fact}${temporal}`
  }).join('\n')

  // Format new facts
  const formattedNew = context.newFacts.map(f =>
    `[${f.id}] ${f.fact}`
  ).join('\n')

  return `<EXISTING_FACTS>
${formattedExisting || '(no existing facts)'}
</EXISTING_FACTS>

<NEW_FACTS>
${formattedNew}
</NEW_FACTS>

Analyze which existing facts (if any) are contradicted by EACH new fact. Return results for ALL new facts in a single JSON response.`
}

/**
 * Parse the LLM response for batch contradiction detection
 */
export function parseBatchDetectContradictionsResponse(
  response: string,
  newFactIds: string[]
): BatchContradictionResult {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Handle markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]?.trim() ?? jsonStr
  }

  // Try to find JSON object in the response
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const rawResults = (parsed.results ?? []) as Array<Record<string, unknown>>

    // Create a map of results by newFactId
    const resultMap = new Map<string, BatchFactResult>()

    for (const raw of rawResults) {
      const newFactId = String(raw.newFactId ?? raw.new_fact_id ?? '')
      if (!newFactId) continue

      const rawContradictions = (raw.contradictions ?? []) as Array<Record<string, unknown>>
      const contradictions: ContradictionDetail[] = rawContradictions
        .filter(c => {
          const confidence = typeof c.confidence === 'number' ? c.confidence : 0
          return confidence >= 0.7
        })
        .map(c => ({
          factId: String(c.factId ?? c.fact_id ?? ''),
          confidence: typeof c.confidence === 'number' ? c.confidence : 0.7,
          category: parseCategory(c.category),
          conflictDescription: String(c.conflictDescription ?? c.conflict_description ?? 'No description'),
        }))

      const resolution = raw.suggestedResolution ?? raw.suggested_resolution
      const validResolutions = ['INVALIDATE_OLD', 'INVALIDATE_NEW', 'MERGE', 'ASK_USER'] as const
      const suggestedResolution = validResolutions.includes(resolution as typeof validResolutions[number])
        ? (resolution as typeof validResolutions[number])
        : undefined

      resultMap.set(newFactId, {
        newFactId,
        contradictions,
        reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : 'No reasoning provided',
        suggestedResolution,
      })
    }

    // Ensure all newFactIds have a result (even if LLM missed some)
    const results: BatchFactResult[] = []
    let errorCount = 0

    for (const id of newFactIds) {
      const result = resultMap.get(id)
      if (result) {
        results.push(result)
      } else {
        // LLM missed this fact - mark as error
        results.push({
          newFactId: id,
          contradictions: [],
          reasoning: 'No result returned by LLM for this fact',
          error: 'Missing from LLM response',
        })
        errorCount++
      }
    }

    return {
      results,
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Batch analysis completed',
      errorCount,
    }
  } catch {
    // If parsing fails, return error results for all facts
    return {
      results: newFactIds.map(id => ({
        newFactId: id,
        contradictions: [],
        reasoning: 'Failed to parse LLM response',
        error: `Parse error: ${response.substring(0, 100)}...`,
      })),
      summary: 'Failed to parse batch response',
      errorCount: newFactIds.length,
    }
  }
}

// =============================================================================
// Category-Specific Handling (Fase 17.2)
// =============================================================================

/**
 * Resolution action to take for a contradiction
 */
export enum ResolutionAction {
  /** Automatically invalidate the old fact */
  AUTO_INVALIDATE = 'AUTO_INVALIDATE',
  /** Require user confirmation before invalidating */
  REQUIRE_CONFIRMATION = 'REQUIRE_CONFIRMATION',
  /** Log warning but don't invalidate */
  WARN_ONLY = 'WARN_ONLY',
  /** Skip - don't process this contradiction */
  SKIP = 'SKIP',
}

/**
 * Configuration for category-specific handling
 */
export interface CategoryHandlingConfig {
  /** Action to take for this category */
  action: ResolutionAction
  /** Minimum confidence threshold for this category (overrides global) */
  minConfidence?: number
  /** Whether to notify user about contradictions of this category */
  notifyUser: boolean
  /** Custom message template for notifications */
  notificationTemplate?: string
}

/**
 * Default category handling configuration
 */
export const DEFAULT_CATEGORY_HANDLING: Record<ContradictionCategory, CategoryHandlingConfig> = {
  [ContradictionCategory.FACTUAL]: {
    action: ResolutionAction.AUTO_INVALIDATE,
    minConfidence: 0.8,
    notifyUser: true,
    notificationTemplate: 'Factual contradiction detected: {description}',
  },
  [ContradictionCategory.ATTRIBUTE]: {
    action: ResolutionAction.AUTO_INVALIDATE,
    minConfidence: 0.7,
    notifyUser: true,
    notificationTemplate: 'Attribute changed: {description}',
  },
  [ContradictionCategory.TEMPORAL]: {
    action: ResolutionAction.REQUIRE_CONFIRMATION,
    minConfidence: 0.8,
    notifyUser: true,
    notificationTemplate: 'Temporal conflict detected: {description}',
  },
  [ContradictionCategory.SEMANTIC]: {
    action: ResolutionAction.REQUIRE_CONFIRMATION,
    minConfidence: 0.85,
    notifyUser: true,
    notificationTemplate: 'Semantic contradiction: {description}',
  },
}

/**
 * Determine the resolution action for a contradiction based on its category
 */
export function getResolutionAction(
  contradiction: ContradictionDetail,
  config: Record<ContradictionCategory, CategoryHandlingConfig> = DEFAULT_CATEGORY_HANDLING
): ResolutionAction {
  const categoryConfig = config[contradiction.category]

  // Check if confidence meets category-specific threshold
  const minConfidence = categoryConfig.minConfidence ?? 0.7
  if (contradiction.confidence < minConfidence) {
    return ResolutionAction.WARN_ONLY
  }

  return categoryConfig.action
}

/**
 * Filter contradictions based on category-specific handling
 * Returns only contradictions that should be processed
 */
export function filterContradictionsByCategory(
  contradictions: ContradictionDetail[],
  config: Record<ContradictionCategory, CategoryHandlingConfig> = DEFAULT_CATEGORY_HANDLING
): {
  toAutoInvalidate: ContradictionDetail[]
  toConfirm: ContradictionDetail[]
  toWarn: ContradictionDetail[]
  toSkip: ContradictionDetail[]
} {
  const toAutoInvalidate: ContradictionDetail[] = []
  const toConfirm: ContradictionDetail[] = []
  const toWarn: ContradictionDetail[] = []
  const toSkip: ContradictionDetail[] = []

  for (const contradiction of contradictions) {
    const action = getResolutionAction(contradiction, config)

    switch (action) {
      case ResolutionAction.AUTO_INVALIDATE:
        toAutoInvalidate.push(contradiction)
        break
      case ResolutionAction.REQUIRE_CONFIRMATION:
        toConfirm.push(contradiction)
        break
      case ResolutionAction.WARN_ONLY:
        toWarn.push(contradiction)
        break
      case ResolutionAction.SKIP:
        toSkip.push(contradiction)
        break
    }
  }

  return { toAutoInvalidate, toConfirm, toWarn, toSkip }
}

/**
 * Generate notification message for a contradiction
 */
export function getContradictionNotification(
  contradiction: ContradictionDetail,
  config: Record<ContradictionCategory, CategoryHandlingConfig> = DEFAULT_CATEGORY_HANDLING
): string {
  const categoryConfig = config[contradiction.category]
  const template = categoryConfig.notificationTemplate ?? 'Contradiction detected: {description}'

  return template
    .replace('{description}', contradiction.conflictDescription)
    .replace('{category}', contradiction.category)
    .replace('{confidence}', (contradiction.confidence * 100).toFixed(0) + '%')
    .replace('{factId}', contradiction.factId)
}
