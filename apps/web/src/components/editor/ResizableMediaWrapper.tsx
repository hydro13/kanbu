/**
 * Resizable Media Wrapper Component
 *
 * A wrapper component that adds resize handles and alignment controls to media nodes.
 * Supports drag-to-resize and text wrapping (float left/right).
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import type { NodeKey } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey } from 'lexical';

// =============================================================================
// Types
// =============================================================================

export type MediaAlignment = 'default' | 'left' | 'center' | 'right';

export interface ResizableMediaWrapperProps {
  children: React.ReactNode;
  nodeKey: NodeKey;
  width: number | undefined;
  height: number | undefined;
  alignment: MediaAlignment;
  onResize: (width: number, height: number) => void;
  onAlignmentChange: (alignment: MediaAlignment) => void;
  /** Maintain aspect ratio while resizing */
  maintainAspectRatio?: boolean;
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Whether the editor is in read-only mode */
  readOnly?: boolean;
}

type ResizeDirection = 'e' | 'w' | 'se' | 'sw' | 'ne' | 'nw';

// =============================================================================
// Alignment Icons
// =============================================================================

function AlignDefaultIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="8" height="8" rx="1" />
      <line x1="14" y1="6" x2="21" y2="6" />
      <line x1="14" y1="10" x2="21" y2="10" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="6" y="3" width="12" height="10" rx="1" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="13" y="5" width="8" height="8" rx="1" />
      <line x1="3" y1="6" x2="10" y2="6" />
      <line x1="3" y1="10" x2="10" y2="10" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="5" r="1.5" fill="currentColor" />
      <circle cx="15" cy="5" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="19" r="1.5" fill="currentColor" />
      <circle cx="15" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ResizableMediaWrapper({
  children,
  nodeKey,
  width,
  height,
  alignment,
  onResize,
  onAlignmentChange,
  maintainAspectRatio = true,
  minWidth = 100,
  maxWidth = 800,
  readOnly = false,
}: ResizableMediaWrapperProps) {
  const [editor] = useLexicalComposerContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelected, setIsSelected] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width);
  const [currentHeight, setCurrentHeight] = useState(height);
  const aspectRatio = useRef<number>(width && height ? width / height : 16 / 9);

  // Update aspect ratio when width/height props change
  useEffect(() => {
    if (width && height) {
      aspectRatio.current = width / height;
    }
  }, [width, height]);

  // Update current dimensions when props change
  useEffect(() => {
    setCurrentWidth(width);
    setCurrentHeight(height);
  }, [width, height]);

  // Selection handling
  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const node = $getNodeByKey(nodeKey);
        if (node) {
          const selection = editorState._selection;
          if (selection && 'getNodes' in selection) {
            const nodes = selection.getNodes();
            setIsSelected(nodes.some((n) => n.getKey() === nodeKey));
          } else {
            setIsSelected(false);
          }
        }
      });
    });
    return unregister;
  }, [editor, nodeKey]);

  // Handle resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      if (readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = currentWidth || 400;
      const startHeight = currentHeight || Math.round(startWidth / aspectRatio.current);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        // Calculate new dimensions based on direction
        if (direction.includes('e')) {
          newWidth = startWidth + deltaX;
        } else if (direction.includes('w')) {
          newWidth = startWidth - deltaX;
        }

        if (!maintainAspectRatio) {
          if (direction.includes('s')) {
            newHeight = startHeight + deltaY;
          } else if (direction.includes('n')) {
            newHeight = startHeight - deltaY;
          }
        }

        // Apply constraints
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

        // Maintain aspect ratio if enabled
        if (maintainAspectRatio) {
          newHeight = Math.round(newWidth / aspectRatio.current);
        }

        setCurrentWidth(newWidth);
        setCurrentHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // Apply the final dimensions
        if (currentWidth !== undefined && currentHeight !== undefined) {
          onResize(currentWidth, currentHeight);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [currentWidth, currentHeight, maintainAspectRatio, minWidth, maxWidth, onResize, readOnly]
  );

  // Get container class based on alignment
  const getContainerClass = () => {
    const baseClass = 'lexical-media-wrapper';
    const selectedClass = isSelected && !readOnly ? 'lexical-media-selected' : '';
    const resizingClass = isResizing ? 'lexical-media-resizing' : '';

    let alignmentClass = '';
    switch (alignment) {
      case 'left':
        alignmentClass = 'lexical-media-float-left';
        break;
      case 'right':
        alignmentClass = 'lexical-media-float-right';
        break;
      case 'center':
        alignmentClass = 'lexical-media-center';
        break;
      default:
        alignmentClass = 'lexical-media-default';
    }

    return `${baseClass} ${alignmentClass} ${selectedClass} ${resizingClass}`.trim();
  };

  return (
    <div
      ref={containerRef}
      className={getContainerClass()}
      style={{
        width: currentWidth ? `${currentWidth}px` : undefined,
        maxWidth: '100%',
      }}
      onClick={() => !readOnly && setIsSelected(true)}
      data-lexical-media-key={nodeKey}
    >
      {/* Media content */}
      <div className="lexical-media-content">{children}</div>

      {/* Alignment toolbar - always visible (not read-only) */}
      {!readOnly && (
        <div className="lexical-media-toolbar">
          {/* Drag handle */}
          <div
            className="lexical-media-toolbar-btn lexical-media-drag-handle"
            title="Drag to reposition"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DragHandleIcon />
          </div>

          <div className="lexical-media-toolbar-divider" />

          <button
            type="button"
            className={`lexical-media-toolbar-btn ${alignment === 'default' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('default');
            }}
            title="Inline (default)"
          >
            <AlignDefaultIcon />
          </button>
          <button
            type="button"
            className={`lexical-media-toolbar-btn ${alignment === 'left' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('left');
            }}
            title="Float left (text wraps right)"
          >
            <AlignLeftIcon />
          </button>
          <button
            type="button"
            className={`lexical-media-toolbar-btn ${alignment === 'center' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('center');
            }}
            title="Center"
          >
            <AlignCenterIcon />
          </button>
          <button
            type="button"
            className={`lexical-media-toolbar-btn ${alignment === 'right' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onAlignmentChange('right');
            }}
            title="Float right (text wraps left)"
          >
            <AlignRightIcon />
          </button>
        </div>
      )}

      {/* Resize handles - only show when selected and not read-only */}
      {isSelected && !readOnly && (
        <>
          {/* Corner handles */}
          <div
            className="lexical-resize-handle lexical-resize-handle-se"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
          />
          <div
            className="lexical-resize-handle lexical-resize-handle-sw"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div
            className="lexical-resize-handle lexical-resize-handle-ne"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div
            className="lexical-resize-handle lexical-resize-handle-nw"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
          />

          {/* Edge handles */}
          <div
            className="lexical-resize-handle lexical-resize-handle-e"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
          />
          <div
            className="lexical-resize-handle lexical-resize-handle-w"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
          />

          {/* Size indicator */}
          {isResizing && currentWidth && currentHeight && (
            <div className="lexical-media-size-indicator">
              {Math.round(currentWidth)} × {Math.round(currentHeight)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ResizableMediaWrapper;
