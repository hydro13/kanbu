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
import { Suspense, useCallback, useState, useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ResizableMediaWrapper, type MediaAlignment } from '../ResizableMediaWrapper'
import { trpc } from '@/lib/trpc'

// =============================================================================
// Types
// =============================================================================

export type EmbedProvider = 'youtube' | 'vimeo' | 'unknown'

export interface EmbedMetadata {
  title: string
  description: string
  channelTitle: string
  channelId: string
  publishedAt: string
  thumbnails: {
    default?: string
    medium?: string
    high?: string
    maxres?: string
  }
  duration: string
  viewCount: string
  likeCount: string
  tags: string[]
}

export interface EmbedPayload {
  url: string
  provider: EmbedProvider
  videoId: string
  width?: number
  height?: number
  alignment?: MediaAlignment
  metadata?: EmbedMetadata
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
    metadata?: EmbedMetadata
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
// Info Icon Component
// =============================================================================

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// =============================================================================
// Metadata Info Panel Component
// =============================================================================

function MetadataInfoPanel({
  metadata,
}: {
  metadata: EmbedMetadata | undefined
}) {
  const [expanded, setExpanded] = useState(false)

  if (!metadata) {
    return null
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Parse description for timestamps (format: 00:00:00 or 00:00)
  const parseTimestamps = (description: string) => {
    const timestampRegex = /^(\d{1,2}:)?(\d{1,2}):(\d{2})\s+(.+)$/gm
    const timestamps: Array<{ time: string; label: string }> = []
    let match

    while ((match = timestampRegex.exec(description)) !== null) {
      const time = match[0].split(/\s+/)[0] || ''
      const label = match[4] || ''
      timestamps.push({ time, label })
    }

    return timestamps
  }

  const timestamps = parseTimestamps(metadata.description)
  const hasTimestamps = timestamps.length > 0

  return (
    <div className="lexical-embed-metadata">
      <button
        type="button"
        className="lexical-embed-metadata-toggle"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
      >
        <InfoIcon className="lexical-embed-metadata-icon" />
        <span className="lexical-embed-metadata-title">{metadata.title}</span>
        <span className="lexical-embed-metadata-stats">
          {metadata.viewCount} views • {metadata.duration}
        </span>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className="lexical-embed-metadata-content">
          {/* Channel and date info */}
          <div className="lexical-embed-metadata-header">
            <span className="lexical-embed-metadata-channel">{metadata.channelTitle}</span>
            <span className="lexical-embed-metadata-date">
              {formatDate(metadata.publishedAt)}
            </span>
            <span className="lexical-embed-metadata-likes">{metadata.likeCount} likes</span>
          </div>

          {/* Timestamps section */}
          {hasTimestamps && (
            <div className="lexical-embed-metadata-timestamps">
              <h4>Chapters</h4>
              <ul>
                {timestamps.slice(0, 15).map((ts, i) => (
                  <li key={i}>
                    <span className="timestamp-time">{ts.time}</span>
                    <span className="timestamp-label">{ts.label}</span>
                  </li>
                ))}
                {timestamps.length > 15 && (
                  <li className="timestamp-more">
                    +{timestamps.length - 15} more chapters
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Description */}
          <div className="lexical-embed-metadata-description">
            <h4>Description</h4>
            <p>{metadata.description.slice(0, 1000)}{metadata.description.length > 1000 ? '...' : ''}</p>
          </div>

          {/* Tags */}
          {metadata.tags.length > 0 && (
            <div className="lexical-embed-metadata-tags">
              {metadata.tags.slice(0, 10).map((tag, i) => (
                <span key={i} className="lexical-embed-tag">
                  {tag}
                </span>
              ))}
              {metadata.tags.length > 10 && (
                <span className="lexical-embed-tag-more">+{metadata.tags.length - 10}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  initialMetadata,
}: {
  url: string
  provider: EmbedProvider
  videoId: string
  width: number | undefined
  height: number | undefined
  alignment: MediaAlignment
  nodeKey: NodeKey
  readOnly: boolean
  initialMetadata?: EmbedMetadata
}) {
  const [editor] = useLexicalComposerContext()
  const embedUrl = getEmbedUrl(provider, videoId)
  const [metadata, setMetadata] = useState<EmbedMetadata | undefined>(initialMetadata)

  // Fetch metadata if not provided and provider is YouTube
  const { data: fetchedMetadata } = trpc.youtube.getMetadata.useQuery(
    { url },
    {
      enabled: provider === 'youtube' && !initialMetadata,
      staleTime: Infinity, // Cache forever - metadata doesn't change
      refetchOnWindowFocus: false,
    }
  )

  // Update local state and node when metadata is fetched
  useEffect(() => {
    if (fetchedMetadata && !initialMetadata) {
      setMetadata(fetchedMetadata)

      // Store metadata in the node for persistence
      editor.update(() => {
        const nodes = editor.getEditorState()._nodeMap
        for (const [, n] of nodes) {
          if ($isEmbedNode(n) && n.getKey() === nodeKey) {
            const writable = n.getWritable()
            writable.__metadata = fetchedMetadata
            break
          }
        }
      })
    }
  }, [fetchedMetadata, initialMetadata, editor, nodeKey])

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
          title={metadata?.title || `${provider} video embed`}
          className="lexical-embed-iframe"
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            display: 'block',
          }}
        />
      </div>
      {provider === 'youtube' && (
        <MetadataInfoPanel metadata={metadata} />
      )}
      {provider !== 'youtube' && (
        <div className="lexical-embed-info">
          <span className="lexical-embed-provider">{provider}</span>
        </div>
      )}
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
  __metadata: EmbedMetadata | undefined

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
      node.__metadata,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedEmbedNode): EmbedNode {
    const { url, provider, videoId, width, height, alignment, metadata } = serializedNode
    return $createEmbedNode({
      url,
      provider,
      videoId,
      width,
      height,
      alignment: alignment || 'default',
      metadata,
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
    metadata?: EmbedMetadata,
    key?: NodeKey
  ) {
    super(key)
    this.__url = url
    this.__provider = provider
    this.__videoId = videoId
    this.__width = width
    this.__height = height
    this.__alignment = alignment || 'default'
    this.__metadata = metadata
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
      metadata: this.__metadata,
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

  getMetadata(): EmbedMetadata | undefined {
    return this.__metadata
  }

  setMetadata(metadata: EmbedMetadata): void {
    const writable = this.getWritable()
    writable.__metadata = metadata
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
          initialMetadata={this.__metadata}
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
  metadata,
  key,
}: EmbedPayload): EmbedNode {
  return $applyNodeReplacement(
    new EmbedNode(url, provider, videoId, width, height, alignment, metadata, key)
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
