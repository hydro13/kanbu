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

import { useCallback, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TRANSFORMERS } from '@lexical/markdown';
import { $getRoot, $insertNodes, type EditorState, type LexicalEditor } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';
import Showdown from 'showdown';

// Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';

// Table plugin
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

// Local imports
import { editorTheme } from './theme';
import { ToolbarPlugin } from './ToolbarPlugin';
import { MarkdownPastePlugin } from './MarkdownPastePlugin';
import { MediaPlugin } from './MediaPlugin';
import { DraggableMediaPlugin } from './DraggableMediaPlugin';
import { WikiLinkPlugin, type WikiPage } from './WikiLinkPlugin';
import { TaskRefPlugin, type TaskResult } from './TaskRefPlugin';
import { TaskRefCleanupPlugin } from './TaskRefCleanupPlugin';
import { MentionPlugin, type MentionResult } from './MentionPlugin';
import { SignaturePlugin, type SignatureUser } from './SignaturePlugin';
import { EditorMinimap } from './EditorMinimap';
import {
  ImageNode,
  VideoNode,
  EmbedNode,
  WikiLinkNode,
  TaskRefNode,
  MentionNode,
  SignatureNode,
} from './nodes';
import './editor.css';

// =============================================================================
// Types
// =============================================================================

export interface RichTextEditorProps {
  /** Initial content as Lexical JSON state */
  initialContent?: string;
  /** Initial content as markdown (will be converted to Lexical nodes) */
  initialMarkdown?: string;
  /** Callback when content changes */
  onChange?: (editorState: EditorState, editor: LexicalEditor, jsonString: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether to show the toolbar */
  showToolbar?: boolean;
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
  /** Minimum height of the editor */
  minHeight?: string;
  /** Maximum height of the editor */
  maxHeight?: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Namespace for the editor (should be unique per editor instance) */
  namespace?: string;
  /** Enable wiki link detection with [[ syntax */
  enableWikiLinks?: boolean;
  /** Function to search for wiki pages (for wiki link autocomplete) */
  searchWikiPages?: (query: string) => Promise<WikiPage[]>;
  /** Static list of wiki pages (alternative to searchWikiPages) */
  wikiPages?: WikiPage[];
  /** Base path for wiki links (e.g., /workspace/slug/wiki) */
  wikiBasePath?: string;
  /** Enable task reference detection with # syntax */
  enableTaskRefs?: boolean;
  /** Function to search for tasks (for task ref autocomplete) */
  searchTasks?: (query: string) => Promise<TaskResult[]>;
  /** Enable @mention detection */
  enableMentions?: boolean;
  /** Function to search for users (for mention autocomplete) */
  searchUsers?: (query: string) => Promise<MentionResult[]>;
  /** Enable &signature insertion */
  enableSignatures?: boolean;
  /** Current user for &Sign shortcut */
  currentUser?: SignatureUser;
  /** Function to search for users (for signature autocomplete) */
  searchUsersForSignature?: (query: string) => Promise<SignatureUser[]>;
  /** Show VSCode-style minimap on the right side */
  showMinimap?: boolean;
  /** Width of the minimap in pixels */
  minimapWidth?: number;
}

// =============================================================================
// Error Handler
// =============================================================================

function onError(error: Error): void {
  console.error('Lexical error:', error);
}

// =============================================================================
// Placeholder Component
// =============================================================================

function PlaceholderElement({ text }: { text: string }) {
  return <div className="lexical-placeholder">{text}</div>;
}

// =============================================================================
// Initial State Plugin
// =============================================================================

interface InitialStatePluginProps {
  initialContent?: string;
}

function InitialStatePlugin({ initialContent }: InitialStatePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (initialContent) {
      try {
        const parsedState = editor.parseEditorState(initialContent);
        editor.setEditorState(parsedState);
      } catch (error) {
        console.error('Failed to parse initial content:', error);
      }
    }
  }, []); // Only run once on mount

  return null;
}

// =============================================================================
// Markdown Init Plugin
// =============================================================================

/**
 * Create a Showdown converter with optimal settings for wiki/documentation
 */
function createMarkdownConverter(): Showdown.Converter {
  return new Showdown.Converter({
    tables: true,
    strikethrough: true,
    tasklists: true,
    ghCodeBlocks: true,
    simpleLineBreaks: false,
    openLinksInNewWindow: false,
    backslashEscapesHTMLTags: true,
    emoji: false,
    underline: true,
    ghMentions: false,
    encodeEmails: false,
    headerLevelStart: 1,
    parseImgDimensions: true,
    splitAdjacentBlockquotes: true,
  });
}

let markdownConverter: Showdown.Converter | null = null;

function getMarkdownConverter(): Showdown.Converter {
  if (!markdownConverter) {
    markdownConverter = createMarkdownConverter();
  }
  return markdownConverter;
}

interface MarkdownInitPluginProps {
  markdown: string;
}

/**
 * Plugin that converts markdown content to Lexical nodes on mount.
 * Uses Showdown for markdown-to-HTML conversion, then Lexical's $generateNodesFromDOM.
 */
function MarkdownInitPlugin({ markdown }: MarkdownInitPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!markdown) return;

    // Convert markdown to HTML using Showdown
    const converter = getMarkdownConverter();
    const html = converter.makeHtml(markdown);

    // Parse HTML to DOM
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');

    // Convert DOM to Lexical nodes and insert
    editor.update(
      () => {
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear();

        // Filter out empty/whitespace-only nodes
        const filteredNodes = nodes.filter((node) => {
          if (node.getType() !== 'text') return true;
          const textContent = node.getTextContent();
          return textContent.trim().length > 0;
        });

        if (filteredNodes.length > 0) {
          $insertNodes(filteredNodes);
        }
      },
      { discrete: true }
    );
  }, []); // Only run once on mount

  return null;
}

// =============================================================================
// Main Component
// =============================================================================

export function RichTextEditor({
  initialContent,
  initialMarkdown,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  showToolbar = true,
  autoFocus = false,
  minHeight = '150px',
  maxHeight = '500px',
  className = '',
  namespace = 'KanbuEditor',
  enableWikiLinks = false,
  searchWikiPages,
  wikiPages,
  wikiBasePath,
  enableTaskRefs = false,
  searchTasks,
  enableMentions = false,
  searchUsers,
  enableSignatures = false,
  currentUser,
  searchUsersForSignature,
  showMinimap = false,
  minimapWidth = 100,
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
      // Table nodes
      TableNode,
      TableCellNode,
      TableRowNode,
      // Media nodes
      ImageNode,
      VideoNode,
      EmbedNode,
      // Wiki nodes
      WikiLinkNode,
      // Task ref nodes
      TaskRefNode,
      // Mention nodes
      MentionNode,
      // Signature nodes
      SignatureNode,
    ],
  };

  // Handle content changes
  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      if (onChange) {
        const jsonString = JSON.stringify(editorState.toJSON());
        onChange(editorState, editor, jsonString);
      }
    },
    [onChange]
  );

  // Custom styles for content editable
  const contentEditableStyle = {
    minHeight,
    maxHeight,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`lexical-editor-container ${className}`}>
        {/* Toolbar */}
        {showToolbar && !readOnly && <ToolbarPlugin />}

        {/* Editor Area with optional Minimap */}
        <div className="lexical-editor-wrapper" style={{ display: 'flex' }}>
          {/* Main Editor */}
          <div className="lexical-editor-inner" style={{ position: 'relative', flex: 1 }}>
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
            <TablePlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <MarkdownPastePlugin />
            <MediaPlugin />
            {!readOnly && <DraggableMediaPlugin />}

            {/* Wiki Link Plugin - only in edit mode with enableWikiLinks */}
            {enableWikiLinks && !readOnly && (
              <WikiLinkPlugin
                searchPages={searchWikiPages}
                pages={wikiPages}
                basePath={wikiBasePath}
              />
            )}

            {/* Task Ref Plugin - only in edit mode with enableTaskRefs */}
            {enableTaskRefs && !readOnly && searchTasks && (
              <TaskRefPlugin searchTasks={searchTasks} />
            )}

            {/* Task Ref Cleanup Plugin - cleans up duplicate children from earlier bug */}
            {enableTaskRefs && <TaskRefCleanupPlugin />}

            {/* Mention Plugin - only in edit mode with enableMentions */}
            {enableMentions && !readOnly && searchUsers && (
              <MentionPlugin searchUsers={searchUsers} />
            )}

            {/* Signature Plugin - only in edit mode with enableSignatures */}
            {enableSignatures && !readOnly && (currentUser || searchUsersForSignature) && (
              <SignaturePlugin currentUser={currentUser} searchUsers={searchUsersForSignature} />
            )}

            {/* Change handler */}
            {onChange && <OnChangePlugin onChange={handleChange} ignoreSelectionChange />}

            {/* Auto focus */}
            {autoFocus && <AutoFocusPlugin />}

            {/* Initial content - Lexical JSON takes priority, fallback to markdown */}
            {initialContent && <InitialStatePlugin initialContent={initialContent} />}
            {!initialContent && initialMarkdown && (
              <MarkdownInitPlugin markdown={initialMarkdown} />
            )}
          </div>

          {/* Minimap */}
          {showMinimap && <EditorMinimap width={minimapWidth} />}
        </div>
      </div>
    </LexicalComposer>
  );
}

export default RichTextEditor;
