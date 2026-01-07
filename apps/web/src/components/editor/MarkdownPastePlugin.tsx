/**
 * Markdown Paste Plugin for Lexical Editor
 *
 * Automatically converts pasted markdown content into formatted Lexical nodes.
 * Supports headings, lists, bold, italic, code, links, and more.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { PASTE_COMMAND, COMMAND_PRIORITY_HIGH } from 'lexical'
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown'

/**
 * Detect if text looks like markdown content
 */
function isMarkdownContent(text: string): boolean {
  // Common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headings: # ## ### etc
    /^\s*[-*+]\s/m,         // Unordered lists: - * +
    /^\s*\d+\.\s/m,         // Ordered lists: 1. 2. 3.
    /^\s*>/m,               // Blockquotes: >
    /\*\*[^*]+\*\*/,        // Bold: **text**
    /\*[^*]+\*/,            // Italic: *text*
    /__[^_]+__/,            // Bold: __text__
    /_[^_]+_/,              // Italic: _text_
    /`[^`]+`/,              // Inline code: `code`
    /```[\s\S]*```/,        // Code blocks: ```code```
    /\[.+\]\(.+\)/,         // Links: [text](url)
    /!\[.+\]\(.+\)/,        // Images: ![alt](url)
    /^\s*[-*_]{3,}\s*$/m,   // Horizontal rules: --- *** ___
    /~~[^~]+~~/,            // Strikethrough: ~~text~~
    /^\s*\[[ x]\]/mi,       // Checkboxes: [ ] [x]
  ]

  // Check if any markdown pattern matches
  return markdownPatterns.some(pattern => pattern.test(text))
}

/**
 * Plugin that intercepts paste events and converts markdown to Lexical nodes
 */
export function MarkdownPastePlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false

        // Get plain text from clipboard
        const text = clipboardData.getData('text/plain')

        // Check if we have HTML version (rich paste from browser)
        const html = clipboardData.getData('text/html')

        // If it's rich content (has HTML), let Lexical handle it normally
        // Only intercept plain text that looks like markdown
        if (html && html.trim()) {
          return false // Let default handler process HTML
        }

        // Check if the plain text looks like markdown
        if (text && isMarkdownContent(text)) {
          // Prevent default paste
          event.preventDefault()

          // Convert markdown to Lexical nodes
          editor.update(() => {
            $convertFromMarkdownString(text, TRANSFORMERS)
          })

          return true // We handled the paste
        }

        // Not markdown, let default handler process it
        return false
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor])

  return null
}

export default MarkdownPastePlugin
