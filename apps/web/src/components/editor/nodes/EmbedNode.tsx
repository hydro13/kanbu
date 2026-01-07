/**
 * Embed Node for Lexical Editor
 *
 * A DecoratorNode that renders video embeds from YouTube, Vimeo, etc.
 * Handles URL parsing and iframe generation.
 * Includes resizing, alignment, and text wrapping capabilities.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import type { JSX } from 'react'
import { $applyNodeReplacement, DecoratorNode } from 'lexical'
import { Suspense, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ResizableMediaWrapper, type MediaAlignment } from '../ResizableMediaWrapper'

// =============================================================================
// Types
// =============================================================================

export type EmbedProvider = 'youtube' | 'vimeo' | 'unknown'

export interface EmbedPayload {
  url: string
  provider: EmbedProvider
  videoId: string
  width?: number
  height?: number
  alignment?: MediaAlignment
  key?: NodeKey
}

export type SerializedEmbedNode = Spread<
  {
    url: string
    provider: EmbedProvider
    videoId: string
    width?: number
    height?: number
    alignment?: MediaAlignment
  },
  SerializedLexicalNode
>

// =============================================================================
// URL Parsing Utilities
// =============================================================================

const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
const VIMEO_REGEX = /(?:vimeo\.com\/)(\d+)/

export function parseVideoUrl(url: string): { provider: EmbedProvider; videoId: string } | null {
  // YouTube
  const youtubeMatch = url.match(YOUTUBE_REGEX)
  if (youtubeMatch && youtubeMatch[1]) {
    return { provider: 'youtube', videoId: youtubeMatch[1] }
  }

  // Vimeo
  const vimeoMatch = url.match(VIMEO_REGEX)
  if (vimeoMatch && vimeoMatch[1]) {
    return { provider: 'vimeo', videoId: vimeoMatch[1] }
  }

  return null
}

export function getEmbedUrl(provider: EmbedProvider, videoId: string): string {
  switch (provider) {
    case 'youtube':
      return `https://www.youtube.com/embed/${videoId}`
    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}`
    default:
      return ''
  }
}

// =============================================================================
// Embed Component
// =============================================================================

function EmbedComponent({
  url,
  provider,
  videoId,
  width,
  height,
  alignment,
  nodeKey,
  readOnly,
}: {
  url: string
  provider: EmbedProvider
  videoId: string
  width: number | undefined
  height: number | undefined
  alignment: MediaAlignment
  nodeKey: NodeKey
  readOnly: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const embedUrl = getEmbedUrl(provider, videoId)

  const handleResize = useCallback(
    (newWidth: number, newHeight: number) => {
      editor.update(() => {
        const node = editor.getEditorState().read(() => {
          const nodes = editor.getEditorState()._nodeMap
          for (const [, n] of nodes) {
            if ($isEmbedNode(n) && n.getKey() === nodeKey) {
              return n
            }
          }
          return null
        })
        if (node && $isEmbedNode(node)) {
          const writable = node.getWritable()
          writable.__width = newWidth
          writable.__height = newHeight
        }
      })
    },
    [editor, nodeKey]
  )

  const handleAlignmentChange = useCallback(
    (newAlignment: MediaAlignment) => {
      editor.update(() => {
        const node = editor.getEditorState().read(() => {
          const nodes = editor.getEditorState()._nodeMap
          for (const [, n] of nodes) {
            if ($isEmbedNode(n) && n.getKey() === nodeKey) {
              return n
            }
          }
          return null
        })
        if (node && $isEmbedNode(node)) {
          const writable = node.getWritable()
          writable.__alignment = newAlignment
        }
      })
    },
    [editor, nodeKey]
  )

  if (!embedUrl) {
    return (
      <div className="lexical-embed-error" data-lexical-embed={nodeKey}>
        <p>Unable to embed video from: {url}</p>
      </div>
    )
  }

  return (
    <ResizableMediaWrapper
      nodeKey={nodeKey}
      width={width}
      height={height}
      alignment={alignment}
      onResize={handleResize}
      onAlignmentChange={handleAlignmentChange}
      maintainAspectRatio={true}
      minWidth={200}
      maxWidth={1200}
      readOnly={readOnly}
    >
      <div className="lexical-embed-wrapper">
        <iframe
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`${provider} video embed`}
          className="lexical-embed-iframe"
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            display: 'block',
          }}
        />
      </div>
      <div className="lexical-embed-info">
        <span className="lexical-embed-provider">{provider}</span>
      </div>
    </ResizableMediaWrapper>
  )
}

// =============================================================================
// DOM Conversion
// =============================================================================

function $convertIframeElement(domNode: Node): null | DOMConversionOutput {
  const iframe = domNode as HTMLIFrameElement
  const src = iframe.getAttribute('src')

  if (!src) {
    return null
  }

  const parsed = parseVideoUrl(src)
  if (!parsed) {
    return null
  }

  // Try to determine alignment from parent styles
  let alignment: MediaAlignment = 'default'
  const parent = iframe.parentElement
  if (parent) {
    const style = parent.getAttribute('style') || ''
    const cssFloat = parent.style?.cssFloat || ''

    if (cssFloat === 'left' || style.includes('float: left')) {
      alignment = 'left'
    } else if (cssFloat === 'right' || style.includes('float: right')) {
      alignment = 'right'
    } else if (style.includes('margin-left: auto') && style.includes('margin-right: auto')) {
      alignment = 'center'
    }
  }

  const node = $createEmbedNode({
    url: src,
    provider: parsed.provider,
    videoId: parsed.videoId,
    width: iframe.width ? parseInt(iframe.width, 10) : undefined,
    height: iframe.height ? parseInt(iframe.height, 10) : undefined,
    alignment,
  })

  return { node }
}

// =============================================================================
// Embed Node
// =============================================================================

export class EmbedNode extends DecoratorNode<JSX.Element> {
  __url: string
  __provider: EmbedProvider
  __videoId: string
  __width: number | undefined
  __height: number | undefined
  __alignment: MediaAlignment

  static getType(): string {
    return 'embed'
  }

  static clone(node: EmbedNode): EmbedNode {
    return new EmbedNode(
      node.__url,
      node.__provider,
      node.__videoId,
      node.__width,
      node.__height,
      node.__alignment,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedEmbedNode): EmbedNode {
    const { url, provider, videoId, width, height, alignment } = serializedNode
    return $createEmbedNode({
      url,
      provider,
      videoId,
      width,
      height,
      alignment: alignment || 'default',
    })
  }

  static importDOM(): DOMConversionMap | null {
    return {
      iframe: () => ({
        conversion: $convertIframeElement,
        priority: 0,
      }),
    }
  }

  constructor(
    url: string,
    provider: EmbedProvider,
    videoId: string,
    width?: number,
    height?: number,
    alignment?: MediaAlignment,
    key?: NodeKey
  ) {
    super(key)
    this.__url = url
    this.__provider = provider
    this.__videoId = videoId
    this.__width = width
    this.__height = height
    this.__alignment = alignment || 'default'
  }

  exportJSON(): SerializedEmbedNode {
    return {
      ...super.exportJSON(),
      url: this.__url,
      provider: this.__provider,
      videoId: this.__videoId,
      width: this.__width,
      height: this.__height,
      alignment: this.__alignment,
      type: 'embed',
      version: 1,
    }
  }

  exportDOM(): DOMExportOutput {
    const embedUrl = getEmbedUrl(this.__provider, this.__videoId)

    // Create a wrapper div for alignment
    const wrapper = document.createElement('div')

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', embedUrl)
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('allowfullscreen', 'true')
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    )
    if (this.__width) {
      iframe.setAttribute('width', this.__width.toString())
    }
    if (this.__height) {
      iframe.setAttribute('height', this.__height.toString())
    }

    wrapper.appendChild(iframe)

    // Apply alignment styles to wrapper
    switch (this.__alignment) {
      case 'left':
        wrapper.style.cssFloat = 'left'
        wrapper.style.marginRight = '1rem'
        wrapper.style.marginBottom = '0.5rem'
        break
      case 'right':
        wrapper.style.cssFloat = 'right'
        wrapper.style.marginLeft = '1rem'
        wrapper.style.marginBottom = '0.5rem'
        break
      case 'center':
        wrapper.style.display = 'block'
        wrapper.style.marginLeft = 'auto'
        wrapper.style.marginRight = 'auto'
        break
    }

    return { element: wrapper }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    const theme = config.theme
    const className = theme.embed
    if (className) {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  getUrl(): string {
    return this.__url
  }

  getProvider(): EmbedProvider {
    return this.__provider
  }

  getVideoId(): string {
    return this.__videoId
  }

  getAlignment(): MediaAlignment {
    return this.__alignment
  }

  setWidthAndHeight(width: number | undefined, height: number | undefined): void {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }

  setAlignment(alignment: MediaAlignment): void {
    const writable = this.getWritable()
    writable.__alignment = alignment
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    const isEditable = _editor.isEditable()
    return (
      <Suspense fallback={<div className="lexical-embed-loading">Loading embed...</div>}>
        <EmbedComponent
          url={this.__url}
          provider={this.__provider}
          videoId={this.__videoId}
          width={this.__width}
          height={this.__height}
          alignment={this.__alignment}
          nodeKey={this.getKey()}
          readOnly={!isEditable}
        />
      </Suspense>
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

export function $createEmbedNode({
  url,
  provider,
  videoId,
  width,
  height,
  alignment,
  key,
}: EmbedPayload): EmbedNode {
  return $applyNodeReplacement(
    new EmbedNode(url, provider, videoId, width, height, alignment, key)
  )
}

export function $isEmbedNode(
  node: LexicalNode | null | undefined
): node is EmbedNode {
  return node instanceof EmbedNode
}

/**
 * Create an embed node from a URL string
 * Returns null if the URL is not a supported embed provider
 */
export function $createEmbedNodeFromUrl(url: string): EmbedNode | null {
  const parsed = parseVideoUrl(url)
  if (!parsed) {
    return null
  }
  return $createEmbedNode({
    url,
    provider: parsed.provider,
    videoId: parsed.videoId,
  })
}
