/**
 * Community Summarization Prompts (Fase 24.4)
 *
 * Ported from Python Graphiti: graphiti_core/llm_client/prompts.py
 * - build_community_summary_prompt()
 * - build_community_name_prompt()
 *
 * Hierarchical Summarization:
 * 1. Each entity gets a base summary
 * 2. Summaries are combined pairwise (tournament style)
 * 3. Final summary represents the entire community
 * 4. LLM generates name + description from summary
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import type {
  SummarizePairInput,
  SummarizePairOutput,
  GenerateCommunityNameInput,
  GenerateCommunityNameOutput,
} from '../types/community'

// ============================================================================
// Pair-wise Summarization (Hierarchical)
// ============================================================================

/**
 * Get system prompt for pair-wise summary combination
 */
export function getSummarizePairSystemPrompt(): string {
  return `You are an AI assistant that combines two entity summaries into a single coherent summary.

Your task is to merge information from both summaries while:
1. Preserving all important facts and relationships
2. Eliminating redundancy and overlap
3. Maintaining a clear, concise writing style
4. Focusing on the most relevant information
5. Keeping the combined summary roughly the same length as the inputs

Guidelines:
- Do NOT lose important details during combination
- Do NOT introduce new information not present in the inputs
- Combine overlapping concepts naturally
- Maintain factual accuracy
- Use clear, professional language`
}

/**
 * Get user prompt for combining two summaries
 */
export function getSummarizePairUserPrompt(input: SummarizePairInput): string {
  const [summary1, summary2] = input.summaries

  return `<SUMMARY 1>
${summary1}
</SUMMARY 1>

<SUMMARY 2>
${summary2}
</SUMMARY 2>

Combine these two summaries into a single, coherent summary that preserves all important information from both.

Respond with a JSON object:
{
  "summary": "The combined summary text"
}

Keep the combined summary concise but comprehensive.`
}

/**
 * Parse LLM response for pair-wise summarization
 */
export function parseSummarizePairResponse(response: string): SummarizePairOutput {
  // First check if response is empty
  const trimmedResponse = response.trim()
  if (!trimmedResponse) {
    throw new Error('Failed to parse summarization response: empty result')
  }

  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = trimmedResponse

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    const summary = String(parsed.summary || '').trim()

    if (!summary) {
      throw new Error('Empty summary in response')
    }

    return { summary }
  } catch (error) {
    // If it's an "empty summary" error, re-throw it
    if (error instanceof Error && error.message.includes('Empty summary')) {
      throw error
    }

    // Fallback: treat entire response as summary
    return { summary: trimmedResponse }
  }
}

// ============================================================================
// Community Name Generation
// ============================================================================

/**
 * Get system prompt for community name generation
 */
export function getGenerateCommunityNameSystemPrompt(): string {
  return `You are an AI assistant that generates descriptive names for entity clusters (communities).

Your task is to analyze a summary of community members and create:
1. A short, memorable name (max 100 characters)
2. An optional longer description if needed

Guidelines for naming:
- Be specific and descriptive
- Capture the main theme or topic
- Use clear, professional language
- Avoid generic names like "Group 1" or "Cluster A"
- Consider the top entities when choosing a name
- Make it meaningful to someone unfamiliar with the details

Good examples:
- "Frontend Development Team" (for: React developers, UI designers)
- "Authentication & Security" (for: OAuth, JWT, encryption concepts)
- "Q4 Marketing Campaign" (for: campaign tasks, marketing materials, social media)

Bad examples:
- "Community 1" (too generic)
- "Important Stuff" (not specific)
- "The Group With People And Things" (too vague)`
}

/**
 * Get user prompt for community name generation
 */
export function getGenerateCommunityNameUserPrompt(
  input: GenerateCommunityNameInput
): string {
  const { summary, topEntityNames } = input

  const topEntitiesSection =
    topEntityNames.length > 0
      ? `<TOP ENTITIES>
${topEntityNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}
</TOP ENTITIES>

`
      : ''

  return `${topEntitiesSection}<COMMUNITY SUMMARY>
${summary}
</COMMUNITY SUMMARY>

Based on the summary${topEntityNames.length > 0 ? ' and top entities' : ''}, generate a descriptive name for this community.

Respond with a JSON object:
{
  "name": "Short descriptive name (max 100 chars)",
  "description": "Optional longer description if the name alone is not sufficient"
}

The name should be specific, memorable, and capture the essence of this community.`
}

/**
 * Parse LLM response for community name generation
 */
export function parseGenerateCommunityNameResponse(
  response: string
): GenerateCommunityNameOutput {
  // First check if response is empty
  const trimmedResponse = response.trim()
  if (!trimmedResponse) {
    throw new Error('Failed to parse community name response: empty result')
  }

  try {
    // Try to extract JSON from response (handle markdown code blocks)
    let jsonStr = trimmedResponse

    // Remove markdown code block if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    let name = String(parsed.name || '').trim()

    // Validate max length
    if (name.length > 100) {
      name = name.substring(0, 97) + '...'
    }

    if (!name) {
      throw new Error('Empty name in response')
    }

    const description = parsed.description ? String(parsed.description).trim() : undefined

    return {
      name,
      description: description || undefined,
    }
  } catch (error) {
    // If it's an "empty name" error, re-throw it
    if (error instanceof Error && error.message.includes('Empty name')) {
      throw error
    }

    // Fallback: extract first line as name
    const lines = trimmedResponse.split('\n')
    let name = lines[0].trim()

    // Remove common prefixes (match "Name:", "Community Name:", etc.)
    name = name.replace(/^(Name|Community\s*Name|Community|Title)\s*:\s*/i, '')

    // Validate max length
    if (name.length > 100) {
      name = name.substring(0, 97) + '...'
    }

    if (!name) {
      throw new Error('Failed to parse community name response: empty result')
    }

    return { name }
  }
}
