/*
 * Editor Minimap Component
 * Version: 2.3.0
 *
 * VSCode-style minimap for Lexical editor with hybrid scrolling.
 * - For shorter documents: shows entire document scaled to fit (fill mode)
 * - For very long documents: minimap also scrolls, but slower than editor
 * - Uses sticky positioning to stay in view while content scrolls
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-13
 * Change: Initial implementation - CSS transform approach
 * Modified: 2026-01-13
 * Change: Rewrite with line-based rendering, only show when needed
 * Modified: 2026-01-13
 * Change: VSCode "fill" mode - minimap shows entire document, only slider moves
 * Modified: 2026-01-13
 * Change: Hybrid mode - minimap scrolls for very long documents
 * Modified: 2026-01-13
 * Change: Reverted to simple positioning - removed broken fixed positioning
 * ===================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { cn } from '@/lib/utils'

// =============================================================================
// Constants
// =============================================================================

/** Minimum pixels per line in the minimap - below this, minimap starts scrolling */
const MIN_PIXELS_PER_LINE = 1.5

/** Estimated pixels per line of text in the editor */
const EDITOR_LINE_HEIGHT = 24

// =============================================================================
// Types
// =============================================================================

interface EditorMinimapProps {
  /** Width of the minimap in pixels */
  width?: number
  /** Minimum content-to-viewport ratio to show minimap */
  minRatio?: number
  /** Additional CSS class */
  className?: string
}

interface ContentLine {
  type: 'heading' | 'text' | 'code' | 'list' | 'quote'
  /** Absolute position in pixels from top of document */
  absoluteTop: number
  width: number
}

// =============================================================================
// Main Component
// =============================================================================

export function EditorMinimap({
  width = 100,
  minRatio = 1.2,
  className,
}: EditorMinimapProps) {
  const [editor] = useLexicalComposerContext()
  const minimapRef = useRef<HTMLDivElement>(null)
  const [lines, setLines] = useState<ContentLine[]>([])
  const [scrollInfo, setScrollInfo] = useState({
    scrollTop: 0,
    scrollHeight: 1,
    clientHeight: 1,
  })
  const [minimapHeight, setMinimapHeight] = useState(400)
  // Use state instead of ref so changes trigger re-renders
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)
  const isDragging = useRef(false)

  // Find the scrollable container (the WikiPageView content area)
  useEffect(() => {
    const rootElement = editor.getRootElement()
    if (!rootElement) return

    // Find the closest scrollable parent
    let container: HTMLElement | null = rootElement.parentElement
    while (container) {
      const style = getComputedStyle(container)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        break
      }
      container = container.parentElement
    }

    setScrollContainer(container || document.documentElement)
  }, [editor])

  // Update minimap height to match scroll container
  useEffect(() => {
    if (!scrollContainer) return

    const updateHeight = () => {
      setMinimapHeight(scrollContainer.clientHeight || 400)
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => {
      window.removeEventListener('resize', updateHeight)
    }
  }, [scrollContainer])

  // Extract content lines from editor - store absolute positions
  useEffect(() => {
    if (!scrollContainer) return

    const updateLines = () => {
      const rootElement = editor.getRootElement()
      if (!rootElement) return

      const newLines: ContentLine[] = []
      const children = rootElement.children

      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement
        const tagName = child.tagName.toLowerCase()
        const rect = child.getBoundingClientRect()
        const rootRect = rootElement.getBoundingClientRect()

        // Calculate absolute position in document
        const topOffset = rect.top - rootRect.top + scrollContainer.scrollTop

        // Determine type
        let type: ContentLine['type'] = 'text'
        if (tagName.match(/^h[1-6]$/)) type = 'heading'
        else if (tagName === 'pre' || child.classList.contains('code')) type = 'code'
        else if (tagName === 'ul' || tagName === 'ol') type = 'list'
        else if (tagName === 'blockquote') type = 'quote'

        // Estimate number of lines based on element height
        const elementHeight = rect.height
        const estimatedLines = Math.max(1, Math.round(elementHeight / EDITOR_LINE_HEIGHT))

        // Create multiple thin lines for this element
        for (let j = 0; j < estimatedLines; j++) {
          const lineTop = topOffset + (j * (elementHeight / estimatedLines))
          // Vary width for visual interest
          const lineWidth = type === 'heading' ? 90 : 40 + Math.random() * 40

          newLines.push({
            type,
            absoluteTop: lineTop,
            width: lineWidth,
          })
        }
      }

      setLines(newLines)
    }

    updateLines()
    return editor.registerUpdateListener(() => {
      requestAnimationFrame(updateLines)
    })
  }, [editor, scrollContainer])

  // Track scroll position
  useEffect(() => {
    if (!scrollContainer) return

    const updateScroll = () => {
      if (isDragging.current) return

      setScrollInfo({
        scrollTop: scrollContainer.scrollTop,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight,
      })
    }

    updateScroll()
    scrollContainer.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll)

    return () => {
      scrollContainer.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [scrollContainer])

  // Calculate if minimap should be shown
  const contentRatio = scrollInfo.scrollHeight / scrollInfo.clientHeight
  const shouldShow = contentRatio > minRatio

  // === Hybrid mode calculations ===
  // Estimate total lines in document
  const estimatedTotalLines = Math.max(1, lines.length)

  // Calculate if we need hybrid scrolling
  // If all lines fit with MIN_PIXELS_PER_LINE, use fill mode
  // Otherwise, use hybrid mode where minimap scrolls slower
  const idealMinimapContentHeight = estimatedTotalLines * MIN_PIXELS_PER_LINE
  const needsHybridScroll = idealMinimapContentHeight > minimapHeight

  // In hybrid mode: minimap content is larger than minimap viewport
  // In fill mode: minimap content fits entirely in minimap viewport
  const minimapContentHeight = needsHybridScroll
    ? idealMinimapContentHeight
    : minimapHeight

  // Scale factor: how much to scale document positions to minimap positions
  const scale = minimapContentHeight / scrollInfo.scrollHeight

  // Viewport slider size (how much of the minimap represents visible area)
  const viewportHeight = Math.max(20, scrollInfo.clientHeight * scale)

  // Calculate minimap scroll position (for hybrid mode)
  // The minimap needs to scroll so the viewport stays visible
  const totalEditorScroll = scrollInfo.scrollHeight - scrollInfo.clientHeight
  const totalMinimapScroll = minimapContentHeight - minimapHeight

  // Editor scroll progress (0 to 1)
  const editorScrollProgress = totalEditorScroll > 0
    ? scrollInfo.scrollTop / totalEditorScroll
    : 0

  // Minimap content offset (how much to shift the content up)
  const minimapContentOffset = needsHybridScroll
    ? editorScrollProgress * totalMinimapScroll
    : 0

  // Viewport slider position within the visible minimap
  // In fill mode: slider travels the full minimap height
  // In hybrid mode: slider position is relative to visible minimap area
  const viewportTopInContent = scrollInfo.scrollTop * scale
  const viewportTop = viewportTopInContent - minimapContentOffset

  // Clamp viewport to minimap bounds
  const clampedViewportTop = Math.max(0, Math.min(minimapHeight - viewportHeight, viewportTop))

  // Handle click on minimap - jump to that position in document
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!scrollContainer || !minimapRef.current) return

    const rect = minimapRef.current.getBoundingClientRect()
    const clickY = e.clientY - rect.top

    // Convert click position to document position
    // Account for minimap content offset in hybrid mode
    const clickInContent = clickY + minimapContentOffset
    const targetDocPosition = clickInContent / scale
    const targetScrollTop = targetDocPosition - scrollInfo.clientHeight / 2

    scrollContainer.scrollTo({
      top: Math.max(0, Math.min(totalEditorScroll, targetScrollTop)),
      behavior: 'smooth',
    })
  }, [scrollContainer, minimapContentOffset, scale, scrollInfo.clientHeight, totalEditorScroll])

  // Handle viewport drag
  const handleViewportDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!scrollContainer || !minimapRef.current) return

    isDragging.current = true
    const startY = e.clientY
    const startScrollTop = scrollContainer.scrollTop

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      // Convert minimap movement to document scroll
      // Account for hybrid mode: minimap moves slower than 1:1 with viewport
      const scrollDelta = deltaY / scale

      const newScrollTop = Math.max(0, Math.min(totalEditorScroll, startScrollTop + scrollDelta))
      scrollContainer.scrollTop = newScrollTop

      setScrollInfo({
        scrollTop: scrollContainer.scrollTop,
        scrollHeight: scrollContainer.scrollHeight,
        clientHeight: scrollContainer.clientHeight,
      })
    }

    const handleUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [scrollContainer, scale, totalEditorScroll])

  // Get line color based on type
  const getLineColor = (type: ContentLine['type']) => {
    switch (type) {
      case 'heading': return 'bg-foreground/50'
      case 'code': return 'bg-amber-500/50'
      case 'quote': return 'bg-blue-500/40'
      case 'list': return 'bg-foreground/25'
      default: return 'bg-foreground/20'
    }
  }

  // Don't render if content isn't long enough
  if (!shouldShow) {
    return null
  }

  return (
    <div
      ref={minimapRef}
      className={cn(
        'bg-muted/10 border-l select-none cursor-pointer flex-shrink-0',
        className
      )}
      style={{
        width,
        height: minimapHeight,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
      }}
      onClick={handleClick}
    >
      {/* Content lines - positioned using scale and offset for hybrid scrolling */}
      <div className="absolute inset-0 overflow-hidden">
        {lines.map((line, i) => {
          // Calculate line position in minimap, accounting for content offset
          const lineTop = (line.absoluteTop * scale) - minimapContentOffset
          // Only render lines that are visible in the minimap viewport
          if (lineTop < -10 || lineTop > minimapHeight + 10) return null
          return (
            <div
              key={i}
              className={cn('absolute h-[2px] rounded-full', getLineColor(line.type))}
              style={{
                top: lineTop,
                left: line.type === 'quote' ? 12 : 4,
                width: `${line.width * 0.9}%`,
              }}
            />
          )
        })}
      </div>

      {/* Viewport indicator - green like Published badge */}
      <div
        className="absolute left-0 right-0 bg-green-500/20 border-y border-green-500/40 cursor-grab active:cursor-grabbing hover:bg-green-500/30 transition-colors"
        style={{
          top: clampedViewportTop,
          height: viewportHeight,
        }}
        onMouseDown={handleViewportDrag}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Left edge accent */}
      <div
        className="absolute left-0 w-0.5 bg-green-500/70"
        style={{
          top: clampedViewportTop,
          height: viewportHeight,
        }}
      />
    </div>
  )
}

export default EditorMinimap
