/**
 * Video Node for Lexical Editor
 *
 * A DecoratorNode that renders local videos in the editor.
 * Supports uploaded video files with HTML5 video player.
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
} from 'lexical';
import type { JSX } from 'react';
import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import { Suspense, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ResizableMediaWrapper, type MediaAlignment } from '../ResizableMediaWrapper';

// =============================================================================
// Types
// =============================================================================

export interface VideoPayload {
  src: string;
  width?: number;
  height?: number;
  poster?: string;
  alignment?: MediaAlignment;
  key?: NodeKey;
}

export type SerializedVideoNode = Spread<
  {
    src: string;
    width?: number;
    height?: number;
    poster?: string;
    alignment?: MediaAlignment;
  },
  SerializedLexicalNode
>;

// =============================================================================
// Video Component
// =============================================================================

function VideoComponent({
  src,
  width,
  height,
  poster,
  alignment,
  nodeKey,
  readOnly,
}: {
  src: string;
  width: number | undefined;
  height: number | undefined;
  poster: string | undefined;
  alignment: MediaAlignment;
  nodeKey: NodeKey;
  readOnly: boolean;
}) {
  const [editor] = useLexicalComposerContext();

  const handleResize = useCallback(
    (newWidth: number, newHeight: number) => {
      editor.update(() => {
        const node = editor.getEditorState().read(() => {
          const nodes = editor.getEditorState()._nodeMap;
          for (const [, n] of nodes) {
            if ($isVideoNode(n) && n.getKey() === nodeKey) {
              return n;
            }
          }
          return null;
        });
        if (node && $isVideoNode(node)) {
          const writable = node.getWritable();
          writable.__width = newWidth;
          writable.__height = newHeight;
        }
      });
    },
    [editor, nodeKey]
  );

  const handleAlignmentChange = useCallback(
    (newAlignment: MediaAlignment) => {
      editor.update(() => {
        const node = editor.getEditorState().read(() => {
          const nodes = editor.getEditorState()._nodeMap;
          for (const [, n] of nodes) {
            if ($isVideoNode(n) && n.getKey() === nodeKey) {
              return n;
            }
          }
          return null;
        });
        if (node && $isVideoNode(node)) {
          const writable = node.getWritable();
          writable.__alignment = newAlignment;
        }
      });
    },
    [editor, nodeKey]
  );

  return (
    <ResizableMediaWrapper
      nodeKey={nodeKey}
      width={width}
      height={height}
      alignment={alignment}
      onResize={handleResize}
      onAlignmentChange={handleAlignmentChange}
      maintainAspectRatio={true}
      minWidth={100}
      maxWidth={1200}
      readOnly={readOnly}
    >
      <video
        src={src}
        poster={poster}
        controls
        className="lexical-video"
        draggable={false}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
    </ResizableMediaWrapper>
  );
}

// =============================================================================
// DOM Conversion
// =============================================================================

function $convertVideoElement(domNode: Node): null | DOMConversionOutput {
  const video = domNode as HTMLVideoElement;
  const src = video.getAttribute('src');

  if (!src || src.startsWith('file:///')) {
    return null;
  }

  const width = video.width || undefined;
  const height = video.height || undefined;
  const poster = video.poster || undefined;

  // Try to determine alignment from styles
  let alignment: MediaAlignment = 'default';
  const style = video.getAttribute('style') || '';
  const cssFloat = video.style?.cssFloat || '';

  if (cssFloat === 'left' || style.includes('float: left')) {
    alignment = 'left';
  } else if (cssFloat === 'right' || style.includes('float: right')) {
    alignment = 'right';
  } else if (style.includes('margin-left: auto') && style.includes('margin-right: auto')) {
    alignment = 'center';
  }

  const node = $createVideoNode({
    src,
    width,
    height,
    poster,
    alignment,
  });

  return { node };
}

// =============================================================================
// Video Node
// =============================================================================

export class VideoNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __width: number | undefined;
  __height: number | undefined;
  __poster: string | undefined;
  __alignment: MediaAlignment;

  static getType(): string {
    return 'video';
  }

  static clone(node: VideoNode): VideoNode {
    return new VideoNode(
      node.__src,
      node.__width,
      node.__height,
      node.__poster,
      node.__alignment,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedVideoNode): VideoNode {
    const { src, width, height, poster, alignment } = serializedNode;
    return $createVideoNode({
      src,
      width,
      height,
      poster,
      alignment: alignment || 'default',
    });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      video: () => ({
        conversion: $convertVideoElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    width?: number,
    height?: number,
    poster?: string,
    alignment?: MediaAlignment,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__width = width;
    this.__height = height;
    this.__poster = poster;
    this.__alignment = alignment || 'default';
  }

  exportJSON(): SerializedVideoNode {
    return {
      ...super.exportJSON(),
      src: this.__src,
      width: this.__width,
      height: this.__height,
      poster: this.__poster,
      alignment: this.__alignment,
      type: 'video',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const video = document.createElement('video');
    video.setAttribute('src', this.__src);
    video.setAttribute('controls', 'true');
    if (this.__width) {
      video.setAttribute('width', this.__width.toString());
    }
    if (this.__height) {
      video.setAttribute('height', this.__height.toString());
    }
    if (this.__poster) {
      video.setAttribute('poster', this.__poster);
    }

    // Apply alignment styles
    switch (this.__alignment) {
      case 'left':
        video.style.cssFloat = 'left';
        video.style.marginRight = '1rem';
        video.style.marginBottom = '0.5rem';
        break;
      case 'right':
        video.style.cssFloat = 'right';
        video.style.marginLeft = '1rem';
        video.style.marginBottom = '0.5rem';
        break;
      case 'center':
        video.style.display = 'block';
        video.style.marginLeft = 'auto';
        video.style.marginRight = 'auto';
        break;
    }

    return { element: video };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.video;
    if (className) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): boolean {
    return true;
  }

  getSrc(): string {
    return this.__src;
  }

  getAlignment(): MediaAlignment {
    return this.__alignment;
  }

  setWidthAndHeight(width: number | undefined, height: number | undefined): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setAlignment(alignment: MediaAlignment): void {
    const writable = this.getWritable();
    writable.__alignment = alignment;
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    const isEditable = _editor.isEditable();
    return (
      <Suspense fallback={<div className="lexical-video-loading">Loading...</div>}>
        <VideoComponent
          src={this.__src}
          width={this.__width}
          height={this.__height}
          poster={this.__poster}
          alignment={this.__alignment}
          nodeKey={this.getKey()}
          readOnly={!isEditable}
        />
      </Suspense>
    );
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

export function $createVideoNode({
  src,
  width,
  height,
  poster,
  alignment,
  key,
}: VideoPayload): VideoNode {
  return $applyNodeReplacement(new VideoNode(src, width, height, poster, alignment, key));
}

export function $isVideoNode(node: LexicalNode | null | undefined): node is VideoNode {
  return node instanceof VideoNode;
}
