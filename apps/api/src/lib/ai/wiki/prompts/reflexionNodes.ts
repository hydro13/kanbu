/**
 * Reflexion Prompt for Node Extraction (Fase 23.3)
 *
 * Ported from Python Graphiti: extract_nodes.py reflexion()
 *
 * This prompt determines which entities were NOT extracted in the initial pass.
 * Used for multi-pass extraction to improve entity recall.
 */

import type { ParsedMissedEntity } from '../types/reflexion'

// ===========================================================================
// System Prompt
// ===========================================================================

/**
 * Get system prompt for node reflexion
 */
export function getReflexionNodesSystemPrompt(): string {
  return `You are an AI assistant that determines which entities have not been extracted from the given context.

Your task is to review the extracted entities and identify any significant entities, concepts, or actors that were missed during the initial extraction.

Guidelines:
1. Focus on entities explicitly or implicitly mentioned in the CURRENT MESSAGE
2. Do NOT include entities only mentioned in PREVIOUS MESSAGES (context only)
3. Do NOT include relationships or actions as entities
4. Do NOT include temporal information (dates, times) as entities
5. Be specific - use full names when available
6. Only report genuinely missed entities, not variations of already extracted ones
7. Prefer concrete entities over abstract concepts

Entity Types to consider:
- Person: Named individuals (users, team members, contacts)
- Concept: Abstract ideas, technologies, methodologies
- WikiPage: Referenced wiki pages or documents
- Task: Named tasks, issues, or work items
- Project: Named projects or initiatives`
}

// ===========================================================================
// User Prompt
// ===========================================================================

/**
 * Context for generating reflexion user prompt
 */
export interface ReflexionNodesContext {
  /** Current wiki page content being analyzed */
  episodeContent: string
  /** Previous wiki pages for context (optional) */
  previousEpisodes?: string[]
  /** Entities already extracted in first pass */
  extractedEntities: string[]
}

/**
 * Get user prompt for node reflexion
 */
export function getReflexionNodesUserPrompt(context: ReflexionNodesContext): string {
  const { episodeContent, previousEpisodes = [], extractedEntities } = context

  const previousSection =
    previousEpisodes.length > 0
      ? `<PREVIOUS MESSAGES>
${previousEpisodes.map((ep, i) => `[${i + 1}] ${ep}`).join('\n')}
</PREVIOUS MESSAGES>

`
      : ''

  const entitiesSection =
    extractedEntities.length > 0
      ? extractedEntities.map((e, i) => `${i + 1}. ${e}`).join('\n')
      : '(none extracted)'

  return `${previousSection}<CURRENT MESSAGE>
${episodeContent}
</CURRENT MESSAGE>

<EXTRACTED ENTITIES>
${entitiesSection}
</EXTRACTED ENTITIES>

Given the above previous messages, current message, and list of extracted entities; determine if any entities haven't been extracted.

Respond with a JSON object:
{
  "missed_entities": [
    {
      "name": "Entity Name",
      "reason": "Why this was missed",
      "suggested_type": "Person|Concept|WikiPage|Task|Project"
    }
  ],
  "reasoning": "Overall explanation of the analysis"
}

If no entities were missed, return an empty missed_entities array.`
}

// ===========================================================================
// Response Parsing
// ===========================================================================

/**
 * Parsed response from reflexion nodes prompt
 */
export interface ReflexionNodesResponse {
  missedEntities: ParsedMissedEntity[]
  reasoning: string
}

/**
 * Parse LLM response for node reflexion
 */
export function parseReflexionNodesResponse(response: string): ReflexionNodesResponse {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim()

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    const missedEntities = (parsed.missed_entities || [])
      .map((e: unknown): ParsedMissedEntity | null => {
        if (typeof e === 'string') {
          return { name: e }
        }
        if (typeof e === 'object' && e !== null) {
          const obj = e as Record<string, unknown>
          const name = String(obj.name || '').trim()
          if (!name) return null
          return {
            name,
            reason: obj.reason ? String(obj.reason) : undefined,
            suggestedType: obj.suggested_type ? String(obj.suggested_type) : undefined,
          }
        }
        return null
      })
      .filter((e: ParsedMissedEntity | null): e is ParsedMissedEntity => e !== null && e.name !== '')

    return {
      missedEntities,
      reasoning: parsed.reasoning || '',
    }
  } catch {
    // If JSON parsing fails, try to extract entity names from text
    const lines = response.split('\n').filter((line) => line.trim())
    const missedEntities = lines
      .filter((line) => /^[-*•]\s*/.test(line) || /^\d+\.\s*/.test(line))
      .map((line) => ({
        // Remove bullet points (-, *, •) or numbered list prefixes (1., 2., etc.)
        name: line.replace(/^(?:[-*•]|\d+\.)\s*/, '').trim(),
      }))
      .filter((e) => e.name !== '' && e.name.length < 100) // Sanity check

    return {
      missedEntities,
      reasoning: 'Parsed from unstructured response',
    }
  }
}
