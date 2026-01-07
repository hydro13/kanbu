/**
 * Draggable Media Plugin for Lexical Editor
 *
 * Enables drag-and-drop repositioning of media nodes (images, videos, embeds)
 * within the editor content.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useEffect, useRef } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  COMMAND_PRIORITY_HIGH,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalNode,
} from 'lexical'
import { $isImageNode, ImageNode } from './nodes/ImageNode'
import { $isVideoNode, VideoNode } from './nodes/VideoNode'
import { $isEmbedNode, EmbedNode } from './nodes/EmbedNode'

// =============================================================================
// Types
// =============================================================================

type MediaNode = ImageNode | VideoNode | EmbedNode

// =============================================================================
// Utilities
// =============================================================================

function isMediaNode(node: LexicalNode | null | undefined): node is MediaNode {
  return $isImageNode(node) || $isVideoNode(node) || $isEmbedNode(node)
}

// =============================================================================
// Plugin Component
// =============================================================================

export function DraggableMediaPlugin() {
  const [editor] = useLexicalComposerContext()
  const draggedNodeKey = useRef<string | null>(null)
  const dropLineRef = useRef<HTMLDivElement | null>(null)

  // Create drop line indicator
  useEffect(() => {
    const dropLine = document.createElement('div')
    dropLine.className = 'lexical-media-drop-line'
    dropLine.style.display = 'none'
    document.body.appendChild(dropLine)
    dropLineRef.current = dropLine

    return () => {
      dropLine.remove()
    }
  }, [])

  // Handle drag start on media elements
  useEffect(() => {
    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement
      if (!target) return

      // Find the media wrapper
      const mediaWrapper = target.closest('[data-lexical-media-key]') as HTMLElement
      if (!mediaWrapper) return

      const nodeKey = mediaWrapper.getAttribute('data-lexical-media-key')
      if (!nodeKey) return

      // Store the dragged node key
      draggedNodeKey.current = nodeKey

      // Set drag data
      event.dataTransfer?.setData('text/plain', nodeKey)
      event.dataTransfer?.setData('application/x-lexical-media', nodeKey)

      // Set drag effect
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
      }

      // Add dragging class
      mediaWrapper.classList.add('lexical-media-dragging')
    }

    const handleDragEnd = (event: DragEvent) => {
      const target = event.target as HTMLElement
      if (!target) return

      const mediaWrapper = target.closest('[data-lexical-media-key]') as HTMLElement
      if (mediaWrapper) {
        mediaWrapper.classList.remove('lexical-media-dragging')
      }

      draggedNodeKey.current = null

      // Hide drop line
      if (dropLineRef.current) {
        dropLineRef.current.style.display = 'none'
      }
    }

    // Add event listeners to the editor root
    const rootElement = editor.getRootElement()
    if (rootElement) {
      rootElement.addEventListener('dragstart', handleDragStart)
      rootElement.addEventListener('dragend', handleDragEnd)
    }

    return () => {
      if (rootElement) {
        rootElement.removeEventListener('dragstart', handleDragStart)
        rootElement.removeEventListener('dragend', handleDragEnd)
      }
    }
  }, [editor])

  // Handle drag over command
  useEffect(() => {
    return editor.registerCommand(
      DRAGOVER_COMMAND,
      (event: DragEvent) => {
        // Check if we're dragging a media node
        const mediaKey = event.dataTransfer?.types.includes('application/x-lexical-media')
        if (!mediaKey) return false

        event.preventDefault()

        // Show drop indicator
        const target = event.target as HTMLElement
        if (target && dropLineRef.current) {
          const rect = target.getBoundingClientRect()
          const mouseY = event.clientY
          const isAbove = mouseY < rect.top + rect.height / 2

          dropLineRef.current.style.display = 'block'
          dropLineRef.current.style.left = `${rect.left}px`
          dropLineRef.current.style.width = `${rect.width}px`
          dropLineRef.current.style.top = isAbove
            ? `${rect.top - 2}px`
            : `${rect.bottom - 2}px`
        }

        return true
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor])

  // Handle drop command
  useEffect(() => {
    return editor.registerCommand(
      DROP_COMMAND,
      (event: DragEvent) => {
        // Hide drop line
        if (dropLineRef.current) {
          dropLineRef.current.style.display = 'none'
        }

        // Check if we're dropping a media node
        const nodeKey = event.dataTransfer?.getData('application/x-lexical-media')
        if (!nodeKey || nodeKey !== draggedNodeKey.current) return false

        event.preventDefault()

        const target = event.target as HTMLElement
        if (!target) return false

        editor.update(() => {
          const draggedNode = $getNodeByKey(nodeKey)
          if (!draggedNode || !isMediaNode(draggedNode)) return

          // Find the target node
          const targetNode = $getNearestNodeFromDOMNode(target)
          if (!targetNode) return

          // Don't drop on self
          if (targetNode.getKey() === nodeKey) return

          // Determine insert position
          const rect = target.getBoundingClientRect()
          const mouseY = event.clientY
          const insertBefore = mouseY < rect.top + rect.height / 2

          // Remove from current position
          draggedNode.remove()

          // Insert at new position
          if (insertBefore) {
            targetNode.insertBefore(draggedNode)
          } else {
            targetNode.insertAfter(draggedNode)
          }
        })

        draggedNodeKey.current = null
        return true
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor])

  // Make media elements draggable
  useEffect(() => {
    const setDraggable = () => {
      const rootElement = editor.getRootElement()
      if (!rootElement) return

      const mediaWrappers = rootElement.querySelectorAll('[data-lexical-media-key]')
      mediaWrappers.forEach((wrapper) => {
        if (wrapper instanceof HTMLElement) {
          wrapper.setAttribute('draggable', 'true')
        }
      })
    }

    // Set initially and on updates
    setDraggable()
    return editor.registerUpdateListener(() => {
      // Use setTimeout to ensure DOM is updated
      setTimeout(setDraggable, 0)
    })
  }, [editor])

  return null
}

export default DraggableMediaPlugin
