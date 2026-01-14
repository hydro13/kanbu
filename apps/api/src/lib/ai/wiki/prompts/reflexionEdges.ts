/**
 * Reflexion Prompt for Edge/Fact Extraction (Fase 23.3)
 *
 * Ported from Python Graphiti: extract_edges.py reflexion()
 *
 * This prompt determines which facts/relationships were NOT extracted
 * in the initial pass. Used for multi-pass extraction to improve recall.
 *
 * Note: Python Graphiti has this prompt but doesn't actively use it.
 * We implement it but keep it disabled by default (enableEdgeReflexion: false).
 */

import type { ParsedMissedFact } from '../types/reflexion'

// ===========================================================================
// System Prompt
// ===========================================================================

/**
 * Get system prompt for edge reflexion
 */
export function getReflexionEdgesSystemPrompt(): string {
  return `You are an AI assistant that determines which facts have not been extracted from the given context.

Your task is to review the extracted entities and facts, then identify any significant relationships or facts that were missed during the initial extraction.

Guidelines:
1. Focus on relationships between the extracted entities
2. Look for implicit relationships that weren't captured
3. Consider temporal relationships (before, after, during)
4. Consider causal relationships (caused, led to, resulted in)
5. Consider membership relationships (part of, belongs to, member of)
6. Consider work relationships (works on, manages, owns)
7. Do NOT invent facts not supported by the content
8. Only report genuinely missed facts, not paraphrases of existing ones

Relationship Types to consider:
- WORKS_ON: Person works on Project/Task
- MANAGES: Person manages Project/Team
- BELONGS_TO: Entity belongs to/is part of another
- RELATES_TO: General relationship
- REFERENCES: Entity references another entity
- DEPENDS_ON: Entity depends on another`
}

// ===========================================================================
// User Prompt
// ===========================================================================

/**
 * Extracted fact for context
 */
export interface ExtractedFact {
  source: string
  target: string
  fact: string
}

/**
 * Context for generating reflexion edges user prompt
 */
export interface ReflexionEdgesContext {
  /** Current wiki page content being analyzed */
  episodeContent: string
  /** Previous wiki pages for context (optional) */
  previousEpisodes?: string[]
  /** Entity names extracted */
  extractedNodes: string[]
  /** Facts/edges extracted in first pass */
  extractedFacts: ExtractedFact[]
}

/**
 * Get user prompt for edge reflexion
 */
export function getReflexionEdgesUserPrompt(context: ReflexionEdgesContext): string {
  const { episodeContent, previousEpisodes = [], extractedNodes, extractedFacts } = context

  const previousSection =
    previousEpisodes.length > 0
      ? `<PREVIOUS MESSAGES>
${previousEpisodes.map((ep, i) => `[${i + 1}] ${ep}`).join('\n')}
</PREVIOUS MESSAGES>

`
      : ''

  const nodesSection =
    extractedNodes.length > 0 ? extractedNodes.map((n, i) => `${i + 1}. ${n}`).join('\n') : '(none)'

  const factsSection =
    extractedFacts.length > 0
      ? extractedFacts.map((f, i) => `${i + 1}. ${f.source} → ${f.target}: "${f.fact}"`).join('\n')
      : '(no facts extracted)'

  return `${previousSection}<CURRENT MESSAGE>
${episodeContent}
</CURRENT MESSAGE>

<EXTRACTED ENTITIES>
${nodesSection}
</EXTRACTED ENTITIES>

<EXTRACTED FACTS>
${factsSection}
</EXTRACTED FACTS>

Given the above MESSAGES, list of EXTRACTED ENTITIES, and list of EXTRACTED FACTS;
determine if any facts haven't been extracted.

Respond with a JSON object:
{
  "missed_facts": [
    {
      "source_name": "Source Entity",
      "target_name": "Target Entity",
      "relation_type": "RELATES_TO|WORKS_ON|BELONGS_TO|MANAGES|REFERENCES|DEPENDS_ON",
      "fact": "Human-readable fact description",
      "reason": "Why this was missed"
    }
  ],
  "reasoning": "Overall explanation of the analysis"
}

If no facts were missed, return an empty missed_facts array.`
}

// ===========================================================================
// Response Parsing
// ===========================================================================

/**
 * Parsed response from reflexion edges prompt
 */
export interface ReflexionEdgesResponse {
  missedFacts: ParsedMissedFact[]
  reasoning: string
}

/**
 * Parse LLM response for edge reflexion
 */
export function parseReflexionEdgesResponse(response: string): ReflexionEdgesResponse {
  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim()

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    const missedFacts = (parsed.missed_facts || [])
      .map((f: unknown): ParsedMissedFact | null => {
        if (typeof f !== 'object' || f === null) return null
        const obj = f as Record<string, unknown>

        const sourceName = String(obj.source_name || '').trim()
        const targetName = String(obj.target_name || '').trim()

        if (!sourceName || !targetName) return null

        return {
          sourceName,
          targetName,
          relationType: String(obj.relation_type || 'RELATES_TO'),
          fact: String(obj.fact || ''),
          reason: obj.reason ? String(obj.reason) : undefined,
        }
      })
      .filter((f: ParsedMissedFact | null): f is ParsedMissedFact => f !== null)

    return {
      missedFacts,
      reasoning: parsed.reasoning || '',
    }
  } catch {
    return {
      missedFacts: [],
      reasoning: 'Failed to parse response',
    }
  }
}
