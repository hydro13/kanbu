/**
 * Deduplicate Nodes Prompts
 *
 * Fase 22.4 - LLM-based entity deduplication
 *
 * These prompts help determine if extracted entities are duplicates
 * of existing entities in the knowledge graph.
 *
 * Based on Python Graphiti: dedupe_nodes.py, dedupe_edges.py
 */

import type { NodeResolutionsResponse, EdgeDuplicateResponse } from '../types';

// ===========================================================================
// Types
// ===========================================================================

export interface ExtractedNodeContext {
  /** ID from extraction (0-indexed) */
  id: number;
  /** Entity name */
  name: string;
  /** Entity type(s) */
  entity_type: string[];
  /** Type description */
  entity_type_description?: string;
}

export interface ExistingNodeContext {
  /** Index in existing nodes array */
  idx: number;
  /** Entity name */
  name: string;
  /** Entity type(s) */
  entity_types: string[];
  /** Summary/description */
  summary?: string;
}

export interface DeduplicateNodesContext {
  /** Extracted entities to check */
  extractedNodes: ExtractedNodeContext[];
  /** Existing entities to compare against */
  existingNodes: ExistingNodeContext[];
  /** Current episode/page content */
  episodeContent: string;
  /** Previous episodes for context */
  previousEpisodes?: string[];
}

export interface ExistingEdgeContext {
  /** Index in existing edges array */
  idx: number;
  /** The fact/relationship */
  fact: string;
  /** Source entity UUID */
  sourceUuid: string;
  /** Target entity UUID */
  targetUuid: string;
}

export interface DeduplicateEdgeContext {
  /** Existing edges to compare against */
  existingEdges: ExistingEdgeContext[];
  /** New edge to check */
  newEdge: {
    fact: string;
    sourceUuid: string;
    targetUuid: string;
  };
}

// ===========================================================================
// Node Deduplication Prompts
// ===========================================================================

/**
 * System prompt for batch node deduplication
 */
export function getDeduplicateNodesSystemPrompt(): string {
  return `You are a helpful assistant that determines whether or not ENTITIES extracted from a conversation are duplicates of existing entities.

Your task is to compare NEW ENTITIES against EXISTING ENTITIES and identify which ones refer to the same real-world object or concept.

IMPORTANT GUIDELINES:

1. SAME ENTITY: Entities should only be considered duplicates if they refer to the EXACT SAME real-world object, person, concept, or thing.

2. SEMANTIC EQUIVALENCE: A descriptive label in existing entities that clearly refers to a named entity in context should be treated as a duplicate.
   Example: "The CEO" and "John Smith" are duplicates if context shows John Smith is the CEO.

3. DO NOT MARK AS DUPLICATES:
   - Related but distinct entities (e.g., "Microsoft" and "Microsoft Teams")
   - Similar names that refer to different people/things
   - Generic vs specific versions (e.g., "database" vs "PostgreSQL database")
   - Parent/child relationships (e.g., "Company" vs "Company's HR Department")

4. BEST NAME: Return the most complete, canonical name for the entity.
   - Prefer full names over nicknames: "John Smith" over "John"
   - Prefer official names over informal: "Microsoft Corporation" over "MS"

5. MULTIPLE DUPLICATES: If an entity matches multiple existing entities, include all indices in the duplicates array.

RESPONSE FORMAT:
Return a JSON object with exactly this structure:
{
  "entityResolutions": [
    {
      "id": 0,
      "name": "Best canonical name for entity",
      "duplicateIdx": -1 or index of best match in EXISTING ENTITIES,
      "duplicates": [] or [list of all matching indices]
    }
  ]
}

IMPORTANT: Your response MUST include exactly one resolution for each entity in the input.`;
}

/**
 * User prompt for batch node deduplication
 */
export function getDeduplicateNodesUserPrompt(context: DeduplicateNodesContext): string {
  const previousEpisodesText =
    context.previousEpisodes && context.previousEpisodes.length > 0
      ? context.previousEpisodes.join('\n---\n')
      : 'No previous messages';

  return `<PREVIOUS MESSAGES>
${previousEpisodesText}
</PREVIOUS MESSAGES>

<CURRENT MESSAGE>
${context.episodeContent}
</CURRENT MESSAGE>

<NEW ENTITIES>
${JSON.stringify(context.extractedNodes, null, 2)}
</NEW ENTITIES>

<EXISTING ENTITIES>
${JSON.stringify(context.existingNodes, null, 2)}
</EXISTING ENTITIES>

For each entity in NEW ENTITIES (IDs 0 through ${context.extractedNodes.length - 1}), determine if it is a duplicate of any entity in EXISTING ENTITIES.

Return a JSON response with entityResolutions for all ${context.extractedNodes.length} entities.`;
}

/**
 * Parse LLM response for node deduplication
 */
export function parseDeduplicateNodesResponse(
  response: string,
  expectedCount: number
): NodeResolutionsResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*"entityResolutions"[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[parseDeduplicateNodesResponse] No JSON found in response');
      return { entityResolutions: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as NodeResolutionsResponse;

    // Validate response
    if (!parsed.entityResolutions || !Array.isArray(parsed.entityResolutions)) {
      console.warn('[parseDeduplicateNodesResponse] Invalid response structure');
      return { entityResolutions: [] };
    }

    // Validate each resolution
    const validResolutions = parsed.entityResolutions.filter((r) => {
      return (
        typeof r.id === 'number' &&
        r.id >= 0 &&
        r.id < expectedCount &&
        typeof r.name === 'string' &&
        typeof r.duplicateIdx === 'number' &&
        Array.isArray(r.duplicates)
      );
    });

    if (validResolutions.length !== expectedCount) {
      console.warn(
        `[parseDeduplicateNodesResponse] Expected ${expectedCount} resolutions, got ${validResolutions.length}`
      );
    }

    return { entityResolutions: validResolutions };
  } catch (error) {
    console.error('[parseDeduplicateNodesResponse] Failed to parse response:', error);
    return { entityResolutions: [] };
  }
}

// ===========================================================================
// Edge Deduplication Prompts
// ===========================================================================

/**
 * System prompt for edge deduplication
 */
export function getDeduplicateEdgeSystemPrompt(): string {
  return `You are a helpful assistant that de-duplicates facts and determines which existing facts are contradicted by new facts.

Your task is to:
1. Identify if a NEW FACT is a duplicate of any EXISTING FACTS
2. Identify if the NEW FACT contradicts any EXISTING FACTS

IMPORTANT GUIDELINES:

1. DUPLICATE DETECTION:
   - Facts are duplicates if they represent IDENTICAL factual information
   - Minor wording differences are still duplicates if meaning is same
   - Facts with similar information but KEY DIFFERENCES (especially numeric values) are NOT duplicates

   Example duplicates:
   - "John works at Acme" and "John is employed at Acme Corp"
   - "The project started in 2020" and "Project began in 2020"

   Example NOT duplicates:
   - "Revenue was $1M" and "Revenue was $2M" (different values)
   - "John manages 5 people" and "John manages 10 people" (different numbers)

2. CONTRADICTION DETECTION:
   - A contradiction occurs when the NEW FACT makes an EXISTING FACT false
   - Only mark as contradicted if the facts are mutually exclusive

   Example contradictions:
   - Existing: "John is the CEO" vs New: "Sarah is the CEO" (if only one CEO)
   - Existing: "Project status: Active" vs New: "Project status: Cancelled"

   Example NOT contradictions:
   - Existing: "John works at Acme" vs New: "John also works at Beta" (both can be true)
   - Existing: "Revenue Q1: $1M" vs New: "Revenue Q2: $2M" (different periods)

3. FACT TYPE: Classify the fact type for better categorization.
   Common types: DEFAULT, STATUS_UPDATE, ATTRIBUTE_CHANGE, RELATIONSHIP

RESPONSE FORMAT:
Return a JSON object:
{
  "duplicateFacts": [indices of duplicate facts in EXISTING FACTS],
  "contradictedFacts": [indices of contradicted facts in EXISTING FACTS],
  "factType": "DEFAULT" or specific type
}`;
}

/**
 * User prompt for edge deduplication
 */
export function getDeduplicateEdgeUserPrompt(context: DeduplicateEdgeContext): string {
  return `<EXISTING FACTS>
${JSON.stringify(context.existingEdges, null, 2)}
</EXISTING FACTS>

<NEW FACT>
${JSON.stringify(context.newEdge, null, 2)}
</NEW FACT>

Analyze the NEW FACT and determine:
1. Which EXISTING FACTS (if any) are duplicates of the NEW FACT
2. Which EXISTING FACTS (if any) are contradicted by the NEW FACT
3. The type/category of this fact

Return a JSON response with duplicateFacts, contradictedFacts, and factType.`;
}

/**
 * Parse LLM response for edge deduplication
 */
export function parseDeduplicateEdgeResponse(
  response: string,
  existingCount: number
): EdgeDuplicateResponse {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[parseDeduplicateEdgeResponse] No JSON found in response');
      return { duplicateFacts: [], contradictedFacts: [], factType: 'DEFAULT' };
    }

    const parsed = JSON.parse(jsonMatch[0]) as EdgeDuplicateResponse;

    // Validate and filter indices
    const validDuplicates = (parsed.duplicateFacts || []).filter(
      (idx) => typeof idx === 'number' && idx >= 0 && idx < existingCount
    );

    const validContradicted = (parsed.contradictedFacts || []).filter(
      (idx) => typeof idx === 'number' && idx >= 0 && idx < existingCount
    );

    return {
      duplicateFacts: validDuplicates,
      contradictedFacts: validContradicted,
      factType: parsed.factType || 'DEFAULT',
    };
  } catch (error) {
    console.error('[parseDeduplicateEdgeResponse] Failed to parse response:', error);
    return { duplicateFacts: [], contradictedFacts: [], factType: 'DEFAULT' };
  }
}
