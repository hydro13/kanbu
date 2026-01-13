/**
 * Editor Components Index
 *
 * Export all editor-related components.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

export { RichTextEditor } from './RichTextEditor'
export type { RichTextEditorProps } from './RichTextEditor'

export { ToolbarPlugin } from './ToolbarPlugin'

export { MarkdownPastePlugin } from './MarkdownPastePlugin'

export { SpeechToTextPlugin, useSpeechRecognition } from './SpeechToTextPlugin'
export type { SpeechToTextPluginProps } from './SpeechToTextPlugin'

export { ResizableMediaWrapper } from './ResizableMediaWrapper'
export type { ResizableMediaWrapperProps, MediaAlignment } from './ResizableMediaWrapper'

export {
  MediaPlugin,
  INSERT_IMAGE_COMMAND,
  INSERT_VIDEO_COMMAND,
  INSERT_EMBED_COMMAND,
  fileToDataUrl,
  isImageFile,
  isVideoFile,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from './MediaPlugin'
export type { MediaPluginProps } from './MediaPlugin'

export { DraggableMediaPlugin } from './DraggableMediaPlugin'

export { WikiLinkPlugin } from './WikiLinkPlugin'
export type { WikiPage, WikiLinkPluginProps } from './WikiLinkPlugin'

export { TaskRefPlugin } from './TaskRefPlugin'
export type { TaskResult, TaskRefPluginProps } from './TaskRefPlugin'

export { TaskRefCleanupPlugin } from './TaskRefCleanupPlugin'

export { MentionPlugin } from './MentionPlugin'
export type { MentionResult, MentionPluginProps } from './MentionPlugin'

export { SignaturePlugin } from './SignaturePlugin'
export type { SignatureUser, SignaturePluginProps } from './SignaturePlugin'

export { EditorMinimap } from './EditorMinimap'

// Nodes
export {
  ImageNode,
  $createImageNode,
  $isImageNode,
  VideoNode,
  $createVideoNode,
  $isVideoNode,
  EmbedNode,
  $createEmbedNode,
  $isEmbedNode,
  $createEmbedNodeFromUrl,
  parseVideoUrl,
  getEmbedUrl,
  WikiLinkNode,
  $createWikiLinkNode,
  $isWikiLinkNode,
  TaskRefNode,
  $createTaskRefNode,
  $isTaskRefNode,
  MentionNode,
  $createMentionNode,
  $isMentionNode,
  SignatureNode,
  $createSignatureNode,
  $isSignatureNode,
} from './nodes'
export type {
  ImagePayload,
  SerializedImageNode,
  VideoPayload,
  SerializedVideoNode,
  EmbedPayload,
  SerializedEmbedNode,
  EmbedProvider,
  WikiLinkPayload,
  SerializedWikiLinkNode,
  TaskRefPayload,
  SerializedTaskRefNode,
  MentionPayload,
  SerializedMentionNode,
  SignaturePayload,
  SerializedSignatureNode,
} from './nodes'

export { editorTheme } from './theme'

// Utilities
export {
  isLexicalContent,
  plainTextToLexical,
  lexicalToPlainText,
  normalizeContent,
  getDisplayContent,
  isMarkdownOrHtml,
  markdownToLexical,
} from './utils'
