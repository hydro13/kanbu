/**
 * Extract Edge Dates Prompt
 *
 * Fase 16.2 - Bi-temporal date extraction using LLM
 *
 * This prompt extracts valid_at and invalid_at dates from wiki content
 * for knowledge graph edges.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-13
 */

export interface ExtractEdgeDatesContext {
  /** The fact/relationship to extract dates for */
  fact: string
  /** The reference timestamp (episode creation time) */
  referenceTimestamp: string
  /** The full episode/wiki page content */
  episodeContent: string
}

export interface ExtractedEdgeDates {
  /** When the fact became true in the real world (ISO 8601) */
  valid_at: string | null
  /** When the fact stopped being true (ISO 8601), null if still true */
  invalid_at: string | null
  /** Brief explanation of how dates were determined */
  reasoning: string
}

/**
 * Generate the system prompt for edge date extraction
 */
export function getExtractEdgeDatesSystemPrompt(): string {
  return `You are an AI assistant that extracts datetime information for knowledge graph edges.

Your task is to determine when facts became true (valid_at) and when they stopped being true (invalid_at).

IMPORTANT GUIDELINES:

1. DATE FORMAT: Always use ISO 8601 format: YYYY-MM-DDTHH:MM:SS.SSSZ
   Example: "2024-01-15T00:00:00.000Z"

2. PRESENT TENSE: If the fact is written in present tense without specific dates,
   use the reference timestamp as valid_at.
   Example: "Jan works at Acme" → valid_at = reference timestamp

3. RELATIVE TIME: Handle relative time expressions based on reference timestamp:
   - "10 years ago" → subtract 10 years from reference
   - "last month" → subtract 1 month from reference
   - "yesterday" → subtract 1 day from reference

4. PARTIAL DATES:
   - Only year mentioned (e.g., "in 2020") → use January 1st: "2020-01-01T00:00:00.000Z"
   - Only month/year (e.g., "March 2020") → use 1st of month: "2020-03-01T00:00:00.000Z"

5. INVALID_AT: Only set if the text EXPLICITLY indicates the fact is no longer true:
   - "Jan used to work at Acme" → invalid_at = reference timestamp (he no longer works there)
   - "Jan worked at Acme until 2023" → invalid_at = "2023-12-31T23:59:59.999Z"
   - "Jan works at Acme" → invalid_at = null (still true)

6. UNCERTAINTY: If dates cannot be determined from the text, return null.

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "valid_at": "2024-01-15T00:00:00.000Z" | null,
  "invalid_at": "2024-06-01T00:00:00.000Z" | null,
  "reasoning": "Brief explanation of how dates were determined"
}`
}

/**
 * Generate the user prompt for edge date extraction
 */
export function getExtractEdgeDatesUserPrompt(context: ExtractEdgeDatesContext): string {
  return `<FACT>
${context.fact}
</FACT>

<REFERENCE_TIMESTAMP>
${context.referenceTimestamp}
</REFERENCE_TIMESTAMP>

<EPISODE_CONTENT>
${context.episodeContent}
</EPISODE_CONTENT>

Extract the valid_at and invalid_at dates for this fact. Return only the JSON object.`
}

/**
 * Parse the LLM response into ExtractedEdgeDates
 * Handles JSON extraction from potentially wrapped responses
 */
export function parseExtractEdgeDatesResponse(response: string): ExtractedEdgeDates {
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

    return {
      valid_at: validateIsoDate(parsed.valid_at as string | null | undefined),
      invalid_at: validateIsoDate(parsed.invalid_at as string | null | undefined),
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided',
    }
  } catch {
    // If parsing fails, return null dates with error reasoning
    return {
      valid_at: null,
      invalid_at: null,
      reasoning: `Failed to parse LLM response: ${response.substring(0, 100)}...`,
    }
  }
}

/**
 * Validate and normalize an ISO date string
 */
function validateIsoDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  // Try to parse as date
  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return null
  }

  // Return normalized ISO string
  return date.toISOString()
}

/**
 * Calculate a date from a relative expression
 * Used as fallback when LLM doesn't handle relative time correctly
 */
export function calculateRelativeDate(
  expression: string,
  referenceDate: Date
): Date | null {
  const lowerExpr = expression.toLowerCase()

  // Handle "X years ago"
  const yearsMatch = lowerExpr.match(/(\d+)\s*(?:jaar|jaren|years?)\s*(?:geleden|ago)/i)
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1] ?? '0', 10)
    const result = new Date(referenceDate)
    result.setFullYear(result.getFullYear() - years)
    return result
  }

  // Handle "X months ago"
  const monthsMatch = lowerExpr.match(/(\d+)\s*(?:maand|maanden|months?)\s*(?:geleden|ago)/i)
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1] ?? '0', 10)
    const result = new Date(referenceDate)
    result.setMonth(result.getMonth() - months)
    return result
  }

  // Handle "X days ago"
  const daysMatch = lowerExpr.match(/(\d+)\s*(?:dag|dagen|days?)\s*(?:geleden|ago)/i)
  if (daysMatch) {
    const days = parseInt(daysMatch[1] ?? '0', 10)
    const result = new Date(referenceDate)
    result.setDate(result.getDate() - days)
    return result
  }

  // Handle "last month/year"
  if (lowerExpr.includes('vorige maand') || lowerExpr.includes('last month')) {
    const result = new Date(referenceDate)
    result.setMonth(result.getMonth() - 1)
    return result
  }

  if (lowerExpr.includes('vorig jaar') || lowerExpr.includes('last year')) {
    const result = new Date(referenceDate)
    result.setFullYear(result.getFullYear() - 1)
    return result
  }

  // Handle "yesterday"
  if (lowerExpr.includes('gisteren') || lowerExpr.includes('yesterday')) {
    const result = new Date(referenceDate)
    result.setDate(result.getDate() - 1)
    return result
  }

  return null
}
