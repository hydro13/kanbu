/**
 * Image Node for Lexical Editor
 *
 * A DecoratorNode that renders images in the editor.
 * Supports both uploaded images and URL-based images.
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
import React, { Suspense, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ResizableMediaWrapper, type MediaAlignment } from '../ResizableMediaWrapper'

// =============================================================================
// Types
// =============================================================================

export interface ImagePayload {
  src: string
  altText: string
  width?: number
  height?: number
  alignment?: MediaAlignment
  key?: NodeKey
}

export type SerializedImageNode = Spread<
  {
    src: string
    altText: string
    width?: number
    height?: number
    alignment?: MediaAlignment
  },
  SerializedLexicalNode
>

// =============================================================================
// GitHub Image URL Detection
// =============================================================================

const GITHUB_IMAGE_DOMAINS = [
  'user-images.githubusercontent.com',
  'raw.githubusercontent.com',
  'avatars.githubusercontent.com',
  'camo.githubusercontent.com',
  'private-user-images.githubusercontent.com',
  'github.com', // For user-attachments/assets URLs
]

/**
 * Check if a URL is a GitHub image that should be proxied
 */
function isGitHubImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return GITHUB_IMAGE_DOMAINS.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    )
  } catch {
    return false
  }
}

/**
 * Get the proxied URL for a GitHub image
 */
function getProxiedImageUrl(src: string): string {
  if (!isGitHubImageUrl(src)) {
    return src
  }
  // Route through our backend proxy
  return `/api/github/image-proxy?url=${encodeURIComponent(src)}`
}

// =============================================================================
// Image Component
// =============================================================================

function ImageComponent({
  src,
  altText,
  width,
  height,
  alignment,
  nodeKey,
  readOnly,
}: {
  src: string
  altText: string
  width: number | undefined
  height: number | undefined
  alignment: MediaAlignment
  nodeKey: NodeKey
  readOnly: boolean
}) {
  const [editor] = useLexicalComposerContext()
  const [hasError, setHasError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Use proxied URL for GitHub images
  const imageSrc = getProxiedImageUrl(src)

  const handleResize = useCallback(
    (newWidth: number, newHeight: number) => {
      editor.update(() => {
        const node = editor.getEditorState().read(() => {
          const nodes = editor.getEditorState()._nodeMap
          for (const [, n] of nodes) {
            if ($isImageNode(n) && n.getKey() === nodeKey) {
              return n
            }
          }
          return null
        })
        if (node && $isImageNode(node)) {
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
            if ($isImageNode(n) && n.getKey() === nodeKey) {
              return n
            }
          }
          return null
        })
        if (node && $isImageNode(node)) {
          const writable = node.getWritable()
          writable.__alignment = newAlignment
        }
      })
    },
    [editor, nodeKey]
  )

  // Show error state with clickable link to image URL
  if (hasError) {
    return (
      <ResizableMediaWrapper
        nodeKey={nodeKey}
        width={width || 300}
        height={height || 100}
        alignment={alignment}
        onResize={handleResize}
        onAlignmentChange={handleAlignmentChange}
        maintainAspectRatio={false}
        minWidth={50}
        maxWidth={1200}
        readOnly={readOnly}
      >
        <div
          className="lexical-image-error"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '1rem',
            backgroundColor: 'hsl(var(--muted) / 0.3)',
            border: '1px dashed hsl(var(--destructive) / 0.5)',
            borderRadius: '0.5rem',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '0.875rem',
            width: '100%',
            height: '100%',
            minHeight: '80px',
          }}
        >
          <span>⚠️ Image could not be loaded</span>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'hsl(var(--primary))',
              textDecoration: 'underline',
              fontSize: '0.75rem',
              wordBreak: 'break-all',
              maxWidth: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Open image in new tab →
          </a>
        </div>
      </ResizableMediaWrapper>
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
      minWidth={50}
      maxWidth={1200}
      readOnly={readOnly}
    >
      {isLoading && (
        <div
          className="lexical-image-loading"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'hsl(var(--muted) / 0.3)',
            borderRadius: '0.5rem',
          }}
        >
          Loading...
        </div>
      )}
      <img
        src={imageSrc}
        alt={altText}
        className="lexical-image"
        draggable={false}
        referrerPolicy="no-referrer"
        style={{
          width: '100%',
          height: 'auto',
          display: isLoading ? 'none' : 'block',
        }}
        onLoad={() => {
          setIsLoading(false)
        }}
        onError={(e) => {
          console.error('[ImageNode] Failed to load image:', src)
          console.error('[ImageNode] Attempted URL:', imageSrc)
          console.error('[ImageNode] Error event:', e)
          setHasError(true)
          setIsLoading(false)
        }}
      />
    </ResizableMediaWrapper>
  )
}

// =============================================================================
// DOM Conversion
// =============================================================================

function $convertImageElement(domNode: Node): null | DOMConversionOutput {
  const img = domNode as HTMLImageElement
  const src = img.getAttribute('src')

  // Skip invalid sources
  if (!src || src.startsWith('file:///')) {
    return null
  }

  const { alt: altText, width, height } = img

  // Try to determine alignment from styles
  let alignment: MediaAlignment = 'default'
  const style = img.getAttribute('style') || ''
  const cssFloat = img.style?.cssFloat || ''

  if (cssFloat === 'left' || style.includes('float: left')) {
    alignment = 'left'
  } else if (cssFloat === 'right' || style.includes('float: right')) {
    alignment = 'right'
  } else if (style.includes('margin-left: auto') && style.includes('margin-right: auto')) {
    alignment = 'center'
  }

  const node = $createImageNode({
    src,
    altText: altText || '',
    width: width || undefined,
    height: height || undefined,
    alignment,
  })

  return { node }
}

// =============================================================================
// Image Node
// =============================================================================

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __width: number | undefined
  __height: number | undefined
  __alignment: MediaAlignment

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__alignment,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText, width, height, alignment } = serializedNode
    return $createImageNode({
      src,
      altText,
      width,
      height,
      alignment: alignment || 'default',
    })
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    alignment?: MediaAlignment,
    key?: NodeKey
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__width = width
    this.__height = height
    this.__alignment = alignment || 'default'
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      alignment: this.__alignment,
      type: 'image',
      version: 1,
    }
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img')
    img.setAttribute('src', this.__src)
    img.setAttribute('alt', this.__altText)
    if (this.__width) {
      img.setAttribute('width', this.__width.toString())
    }
    if (this.__height) {
      img.setAttribute('height', this.__height.toString())
    }

    // Apply alignment styles
    switch (this.__alignment) {
      case 'left':
        img.style.cssFloat = 'left'
        img.style.marginRight = '1rem'
        img.style.marginBottom = '0.5rem'
        break
      case 'right':
        img.style.cssFloat = 'right'
        img.style.marginLeft = '1rem'
        img.style.marginBottom = '0.5rem'
        break
      case 'center':
        img.style.display = 'block'
        img.style.marginLeft = 'auto'
        img.style.marginRight = 'auto'
        break
    }

    return { element: img }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    const theme = config.theme
    const className = theme.image
    if (className) {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  isInline(): boolean {
    return true
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
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
      <Suspense fallback={<div className="lexical-image-loading">Loading...</div>}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
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

export function $createImageNode({
  src,
  altText,
  width,
  height,
  alignment,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(src, altText, width, height, alignment, key)
  )
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}
