/**
 * Markdown Paste Plugin for Lexical Editor
 *
 * Automatically converts pasted markdown content into formatted Lexical nodes.
 * Uses Showdown for robust markdown-to-HTML conversion, then Lexical's HTML import.
 * Supports headings, lists, bold, italic, code, links, tables, and more.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * Change: Rewrote to use Showdown + $generateNodesFromDOM for better table/code support (2026-01-12)
 * Reference: https://github.com/facebook/lexical/discussions/5967
 * ===================================================================
 */

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $getRoot,
  $insertNodes,
} from 'lexical'
import { $generateNodesFromDOM } from '@lexical/html'
import Showdown from 'showdown'

// =============================================================================
// Showdown Converter Configuration
// =============================================================================

/**
 * Create a Showdown converter with optimal settings for wiki/documentation
 */
function createMarkdownConverter(): Showdown.Converter {
  return new Showdown.Converter({
    tables: true,                    // Enable markdown tables
    strikethrough: true,             // Enable ~~strikethrough~~
    tasklists: true,                 // Enable [ ] and [x] task lists
    ghCodeBlocks: true,              // Enable GitHub-style ``` code blocks
    simpleLineBreaks: false,         // Don't convert single line breaks to <br>
    openLinksInNewWindow: false,     // Don't add target="_blank" to links
    backslashEscapesHTMLTags: true,  // Allow escaping HTML tags
    emoji: false,                    // Disable emoji conversion (keep :emoji: as-is)
    underline: true,                 // Enable __underline__
    ghMentions: false,               // Don't convert @mentions to GitHub links
    encodeEmails: false,             // Don't encode emails
    headerLevelStart: 1,             // Start headers at h1
    parseImgDimensions: true,        // Parse image dimensions from markdown
    splitAdjacentBlockquotes: true,  // Split adjacent blockquotes
  })
}

// Singleton converter instance
let converter: Showdown.Converter | null = null

function getConverter(): Showdown.Converter {
  if (!converter) {
    converter = createMarkdownConverter()
  }
  return converter
}

// =============================================================================
// Markdown Detection
// =============================================================================

/**
 * Detect if text looks like markdown content
 * We check for common markdown patterns to avoid converting plain text
 */
function isMarkdownContent(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headings: # ## ### etc
    /^\s*[-*+]\s/m,         // Unordered lists: - * +
    /^\s*\d+\.\s/m,         // Ordered lists: 1. 2. 3.
    /^\s*>/m,               // Blockquotes: >
    /\*\*[^*]+\*\*/,        // Bold: **text**
    /\*[^*]+\*/,            // Italic: *text*
    /__[^_]+__/,            // Bold/underline: __text__
    /_[^_]+_/,              // Italic: _text_
    /`[^`]+`/,              // Inline code: `code`
    /```[\s\S]*```/,        // Code blocks: ```code```
    /\[.+\]\(.+\)/,         // Links: [text](url)
    /!\[.+\]\(.+\)/,        // Images: ![alt](url)
    /^\s*[-*_]{3,}\s*$/m,   // Horizontal rules: --- *** ___
    /~~[^~]+~~/,            // Strikethrough: ~~text~~
    /^\s*\[[ x]\]/mi,       // Checkboxes: [ ] [x]
    /^\|.+\|$/m,            // Tables: |...|
  ]

  return markdownPatterns.some(pattern => pattern.test(text))
}

// =============================================================================
// Plugin Component
// =============================================================================

/**
 * Plugin that intercepts paste events and converts markdown to Lexical nodes
 * using Showdown for markdown-to-HTML and Lexical's $generateNodesFromDOM
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

          // Convert markdown to HTML using Showdown
          const mdConverter = getConverter()
          const convertedHtml = mdConverter.makeHtml(text)

          // Parse HTML to DOM
          const parser = new DOMParser()
          const dom = parser.parseFromString(convertedHtml, 'text/html')

          // Convert DOM to Lexical nodes and insert
          editor.update(
            () => {
              const nodes = $generateNodesFromDOM(editor, dom)

              // Clear root and insert new content
              const root = $getRoot()
              root.clear()

              // Filter out empty/whitespace-only nodes
              const filteredNodes = nodes.filter(node => {
                // Keep all non-text nodes
                if (node.getType() !== 'text') return true
                // For text nodes, check if they have meaningful content
                const textContent = node.getTextContent()
                return textContent.trim().length > 0
              })

              if (filteredNodes.length > 0) {
                $insertNodes(filteredNodes)
              }
            },
            { discrete: true }
          )

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
