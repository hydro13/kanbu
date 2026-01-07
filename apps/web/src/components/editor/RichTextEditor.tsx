/**
 * RichTextEditor Component
 *
 * A reusable rich text editor built on Lexical.
 * Used for workspace/project descriptions, task context, sticky notes, and wiki pages.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useCallback, useEffect } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { TRANSFORMERS } from '@lexical/markdown'
import type { EditorState, LexicalEditor } from 'lexical'

// Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { LinkNode, AutoLinkNode } from '@lexical/link'
import { CodeNode, CodeHighlightNode } from '@lexical/code'

// Local imports
import { editorTheme } from './theme'
import { ToolbarPlugin } from './ToolbarPlugin'
import { MarkdownPastePlugin } from './MarkdownPastePlugin'
import { MediaPlugin } from './MediaPlugin'
import { ImageNode, VideoNode, EmbedNode } from './nodes'
import './editor.css'

// =============================================================================
// Types
// =============================================================================

export interface RichTextEditorProps {
  /** Initial content as Lexical JSON state */
  initialContent?: string
  /** Callback when content changes */
  onChange?: (editorState: EditorState, editor: LexicalEditor, jsonString: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Whether to show the toolbar */
  showToolbar?: boolean
  /** Whether to auto-focus on mount */
  autoFocus?: boolean
  /** Minimum height of the editor */
  minHeight?: string
  /** Maximum height of the editor */
  maxHeight?: string
  /** Additional CSS class for the container */
  className?: string
  /** Namespace for the editor (should be unique per editor instance) */
  namespace?: string
}

// =============================================================================
// Error Handler
// =============================================================================

function onError(error: Error): void {
  console.error('Lexical error:', error)
}

// =============================================================================
// Placeholder Component
// =============================================================================

function PlaceholderElement({ text }: { text: string }) {
  return <div className="lexical-placeholder">{text}</div>
}

// =============================================================================
// Initial State Plugin
// =============================================================================

interface InitialStatePluginProps {
  initialContent?: string
}

function InitialStatePlugin({ initialContent }: InitialStatePluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (initialContent) {
      try {
        const parsedState = editor.parseEditorState(initialContent)
        editor.setEditorState(parsedState)
      } catch (error) {
        console.error('Failed to parse initial content:', error)
      }
    }
  }, []) // Only run once on mount

  return null
}

// =============================================================================
// Main Component
// =============================================================================

export function RichTextEditor({
  initialContent,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  showToolbar = true,
  autoFocus = false,
  minHeight = '150px',
  maxHeight = '500px',
  className = '',
  namespace = 'KanbuEditor',
}: RichTextEditorProps) {
  // Editor configuration
  const initialConfig = {
    namespace,
    theme: editorTheme,
    editable: !readOnly,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      CodeNode,
      CodeHighlightNode,
      // Media nodes
      ImageNode,
      VideoNode,
      EmbedNode,
    ],
  }

  // Handle content changes
  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      if (onChange) {
        const jsonString = JSON.stringify(editorState.toJSON())
        onChange(editorState, editor, jsonString)
      }
    },
    [onChange]
  )

  // Custom styles for content editable
  const contentEditableStyle = {
    minHeight,
    maxHeight,
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`lexical-editor-container ${className}`}>
        {/* Toolbar */}
        {showToolbar && !readOnly && <ToolbarPlugin />}

        {/* Editor Area */}
        <div className="lexical-editor-inner" style={{ position: 'relative' }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="lexical-content-editable"
                style={contentEditableStyle}
                aria-placeholder={placeholder}
                placeholder={<PlaceholderElement text={placeholder} />}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          {/* Plugins */}
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <CheckListPlugin />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <MarkdownPastePlugin />
          <MediaPlugin />

          {/* Change handler */}
          {onChange && <OnChangePlugin onChange={handleChange} ignoreSelectionChange />}

          {/* Auto focus */}
          {autoFocus && <AutoFocusPlugin />}

          {/* Initial content */}
          {initialContent && <InitialStatePlugin initialContent={initialContent} />}
        </div>
      </div>
    </LexicalComposer>
  )
}

export default RichTextEditor
