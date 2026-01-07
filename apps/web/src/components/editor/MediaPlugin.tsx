/**
 * Media Plugin for Lexical Editor
 *
 * Provides commands and utilities for inserting images, videos, and embeds.
 * Handles file uploads and URL-based media insertion.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
} from 'lexical'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import {
  $createImageNode,
  $createVideoNode,
  $createEmbedNodeFromUrl,
  ImagePayload,
  VideoPayload,
} from './nodes'

// =============================================================================
// Commands
// =============================================================================

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
  'INSERT_IMAGE_COMMAND'
)

export const INSERT_VIDEO_COMMAND: LexicalCommand<VideoPayload> = createCommand(
  'INSERT_VIDEO_COMMAND'
)

export const INSERT_EMBED_COMMAND: LexicalCommand<string> = createCommand(
  'INSERT_EMBED_COMMAND'
)

// =============================================================================
// Props
// =============================================================================

export interface MediaPluginProps {
  /** Callback when a file is selected for upload */
  onUpload?: (file: File, type: 'image' | 'video') => Promise<string>
}

// =============================================================================
// Plugin Component
// =============================================================================

export function MediaPlugin({ onUpload: _onUpload }: MediaPluginProps = {}) {
  // onUpload is reserved for future server-side upload implementation
  void _onUpload
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Register INSERT_IMAGE_COMMAND
    const removeImageCommand = editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload: ImagePayload) => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          const imageNode = $createImageNode(payload)
          $insertNodeToNearestRoot(imageNode)
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )

    // Register INSERT_VIDEO_COMMAND
    const removeVideoCommand = editor.registerCommand(
      INSERT_VIDEO_COMMAND,
      (payload: VideoPayload) => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          const videoNode = $createVideoNode(payload)
          $insertNodeToNearestRoot(videoNode)
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )

    // Register INSERT_EMBED_COMMAND
    const removeEmbedCommand = editor.registerCommand(
      INSERT_EMBED_COMMAND,
      (url: string) => {
        const selection = $getSelection()

        if ($isRangeSelection(selection)) {
          const embedNode = $createEmbedNodeFromUrl(url)
          if (embedNode) {
            $insertNodeToNearestRoot(embedNode)
          } else {
            // If not a recognized embed URL, could show error or handle differently
            console.warn('Unrecognized embed URL:', url)
            return false
          }
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR
    )

    return () => {
      removeImageCommand()
      removeVideoCommand()
      removeEmbedCommand()
    }
  }, [editor])

  return null
}

// =============================================================================
// Utility Functions for External Use
// =============================================================================

/**
 * Convert a file to a data URL for preview purposes
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if a file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

/**
 * Get accepted file types for images
 */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

/**
 * Get accepted file types for videos
 */
export const ACCEPTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]

export default MediaPlugin
