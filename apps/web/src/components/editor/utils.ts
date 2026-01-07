/**
 * Editor Utility Functions
 *
 * Helper functions for content detection and conversion.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

/**
 * Check if content is Lexical JSON format
 * Lexical JSON always starts with {"root":
 */
export function isLexicalContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return false

  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' && 'root' in parsed
  } catch {
    return false
  }
}

/**
 * Convert plain text to Lexical JSON format
 * Creates a simple document with paragraphs for each line
 */
export function plainTextToLexical(text: string): string {
  const lines = text.split('\n')
  const children = lines.map((line) => ({
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: line ? [
      {
        type: 'text',
        version: 1,
        format: 0,
        mode: 'normal',
        style: '',
        detail: 0,
        text: line,
      },
    ] : [],
  }))

  const lexicalState = {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children,
    },
  }

  return JSON.stringify(lexicalState)
}

/**
 * Extract plain text from Lexical JSON
 * Used for preview/truncation purposes
 */
export function lexicalToPlainText(content: string): string {
  if (!isLexicalContent(content)) {
    return content // Already plain text
  }

  try {
    const parsed = JSON.parse(content)
    return extractTextFromNode(parsed.root)
  } catch {
    return content
  }
}

/**
 * Recursively extract text from a Lexical node
 */
function extractTextFromNode(node: unknown): string {
  if (!node || typeof node !== 'object') return ''

  const n = node as Record<string, unknown>

  // Text node
  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text
  }

  // Node with children
  if (Array.isArray(n.children)) {
    const texts = n.children.map(extractTextFromNode)
    // Add newline after block elements
    if (['paragraph', 'heading', 'quote', 'listitem'].includes(n.type as string)) {
      return texts.join('') + '\n'
    }
    return texts.join('')
  }

  return ''
}

/**
 * Normalize content for storage
 * - If already Lexical JSON, return as-is
 * - If plain text, convert to Lexical JSON
 */
export function normalizeContent(content: string): string {
  if (!content) return plainTextToLexical('')
  if (isLexicalContent(content)) return content
  return plainTextToLexical(content)
}

/**
 * Get content for display
 * - Returns Lexical JSON for the editor
 * - Handles legacy plain text by converting it
 */
export function getDisplayContent(content: string): string {
  if (!content) return plainTextToLexical('')
  if (isLexicalContent(content)) return content
  return plainTextToLexical(content)
}
