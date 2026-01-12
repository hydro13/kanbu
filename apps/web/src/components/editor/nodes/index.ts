/**
 * Editor Nodes Index
 *
 * Export all custom Lexical nodes.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

export { ImageNode, $createImageNode, $isImageNode } from './ImageNode'
export type { ImagePayload, SerializedImageNode } from './ImageNode'

export { VideoNode, $createVideoNode, $isVideoNode } from './VideoNode'
export type { VideoPayload, SerializedVideoNode } from './VideoNode'

export {
  EmbedNode,
  $createEmbedNode,
  $isEmbedNode,
  $createEmbedNodeFromUrl,
  parseVideoUrl,
  getEmbedUrl,
} from './EmbedNode'
export type { EmbedPayload, SerializedEmbedNode, EmbedProvider, EmbedMetadata } from './EmbedNode'

export { WikiLinkNode, $createWikiLinkNode, $isWikiLinkNode } from './WikiLinkNode'
export type { WikiLinkPayload, SerializedWikiLinkNode } from './WikiLinkNode'
