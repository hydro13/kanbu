/**
 * Editor Demo Page
 *
 * Test page for the Lexical RichTextEditor component.
 * Access at /demo/editor
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useState } from 'react'
import { RichTextEditor } from '@/components/editor'
import type { EditorState, LexicalEditor } from 'lexical'

export function EditorDemoPage() {
  const [editorContent, setEditorContent] = useState<string>('')
  const [jsonOutput, setJsonOutput] = useState<string>('')

  const handleChange = (
    _editorState: EditorState,
    _editor: LexicalEditor,
    jsonString: string
  ) => {
    setEditorContent(jsonString)
    // Pretty print for display
    try {
      setJsonOutput(JSON.stringify(JSON.parse(jsonString), null, 2))
    } catch {
      setJsonOutput(jsonString)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rich Text Editor Demo</h1>
          <p className="text-muted-foreground mt-2">
            Test the Lexical-based rich text editor. Try formatting, lists, and markdown shortcuts.
          </p>
        </div>

        {/* Features List */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h2 className="font-semibold mb-2">Supported Features:</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <li>Bold (Ctrl+B)</li>
            <li>Italic (Ctrl+I)</li>
            <li>Underline (Ctrl+U)</li>
            <li>Strikethrough</li>
            <li>Inline Code</li>
            <li>Headings (H1-H3)</li>
            <li>Bullet Lists</li>
            <li>Numbered Lists</li>
            <li>Check Lists</li>
            <li>Block Quotes</li>
            <li>Links (Ctrl+K)</li>
            <li>Undo/Redo</li>
            <li className="text-green-600 font-medium">Markdown Paste</li>
            <li className="text-green-600 font-medium">Voice Input (Chrome/Edge/Safari)</li>
          </ul>
        </div>

        {/* New Features */}
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <h2 className="font-semibold mb-2 text-green-700 dark:text-green-400">New Features:</h2>
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-medium">Markdown Paste</h3>
              <p className="text-muted-foreground">
                Paste markdown text from external documents and it will automatically be converted to rich text.
                Try copying markdown from GitHub, documentation, or any .md file.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Voice-to-Text</h3>
              <p className="text-muted-foreground">
                Click the microphone button in the toolbar to start voice input.
                Speak and your words will be transcribed directly into the editor.
                Works in Chrome, Edge, and Safari.
              </p>
            </div>
          </div>
        </div>

        {/* Markdown Shortcuts */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h2 className="font-semibold mb-2">Markdown Shortcuts:</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground font-mono">
            <li># Heading 1</li>
            <li>## Heading 2</li>
            <li>### Heading 3</li>
            <li>* Bullet item</li>
            <li>- Bullet item</li>
            <li>1. Numbered item</li>
            <li>&gt; Quote</li>
            <li>**bold**</li>
            <li>*italic*</li>
            <li>`code`</li>
            <li>~~strikethrough~~</li>
            <li>[text](url)</li>
          </ul>
        </div>

        {/* Editor */}
        <div>
          <h2 className="font-semibold mb-3">Editor:</h2>
          <RichTextEditor
            placeholder="Start typing here... Try # for headings, * for lists, **bold**, etc."
            onChange={handleChange}
            autoFocus
            minHeight="200px"
            maxHeight="400px"
          />
        </div>

        {/* Read-only Editor */}
        {editorContent && (
          <div>
            <h2 className="font-semibold mb-3">Preview (Read-only):</h2>
            <RichTextEditor
              initialContent={editorContent}
              readOnly
              showToolbar={false}
              minHeight="100px"
              maxHeight="300px"
            />
          </div>
        )}

        {/* JSON Output */}
        <div>
          <h2 className="font-semibold mb-3">JSON Output (for database storage):</h2>
          <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs font-mono">
            {jsonOutput || '// Start typing to see the JSON output...'}
          </pre>
        </div>

        {/* Back link */}
        <div className="pt-4 border-t">
          <a
            href="/dashboard"
            className="text-primary hover:underline"
          >
            &larr; Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

export default EditorDemoPage
